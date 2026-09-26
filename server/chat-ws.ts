import type { IncomingMessage, Server as HttpServer } from "http";
import type { Duplex } from "stream";
import { WebSocket, WebSocketServer } from "ws";
import { sdk } from "./_core/sdk";
import { createTutorPortalExpiry, hashTutorPortalToken } from "./tutor-portal-session";

export const CHAT_WEBSOCKET_PATH = "/ws/chat";

/**
 * A push channel on top of the same tRPC session identity, kept deliberately
 * dumb: it carries no chat state of its own, only "something changed" pokes
 * that the client answers by re-asking tRPC (the source of truth) for the
 * thread or the list. A dropped or blocked connection costs nothing but
 * timeliness - the client's own slow poll is still there underneath.
 */
type ChatSocket = WebSocket;

const tutorSockets = new Map<string, Set<ChatSocket>>();
const adminSockets = new Set<ChatSocket>();

function registerTutorSocket(tutorId: string, socket: ChatSocket) {
  let set = tutorSockets.get(tutorId);
  if (!set) {
    set = new Set();
    tutorSockets.set(tutorId, set);
  }
  set.add(socket);
  socket.on("close", () => {
    set?.delete(socket);
    if (set && set.size === 0) tutorSockets.delete(tutorId);
  });
}

function registerAdminSocket(socket: ChatSocket) {
  adminSockets.add(socket);
  socket.on("close", () => adminSockets.delete(socket));
}

function send(socket: ChatSocket, payload: unknown) {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(payload));
}

/** After a Tutor's own message lands - only the Admin side needs telling. */
export function notifyAdminsOfChatMessage(tutorId: string) {
  for (const socket of Array.from(adminSockets)) send(socket, { type: "message", tutorId });
}

/** After an Admin's reply lands - the Tutor's own tab(s), plus every other Admin's list. */
export function notifyTutorOfChatMessage(tutorId: string) {
  for (const socket of Array.from(tutorSockets.get(tutorId) ?? [])) send(socket, { type: "message" });
  notifyAdminsOfChatMessage(tutorId);
}

/**
 * The one piece of this module that needs `server/db.ts` - passed in rather
 * than imported, so this file (which `db.ts` itself calls into to push a
 * just-sent message) never imports `db.ts` back.
 */
export type ChatSocketAuthDeps = {
  renewTutorPortalSession: (input: { userId: number; tokenHash: string; now: Date; nextExpiry: Date }) => Promise<boolean>;
  getTutorAccountStatusByUserId: (userId: number) => Promise<string | null | undefined>;
  getTutorProfileByUserId: (userId: number) => Promise<{ tutorId?: string | null } | null | undefined>;
};

async function authenticateTutorSocket(request: IncomingMessage, token: string | null, deps: ChatSocketAuthDeps) {
  if (!token) return null;
  const user = await sdk.authenticateRequest(request as never).catch(() => null);
  if (!user || user.role !== "tutor") return null;
  const now = new Date();
  const isActive = await deps.renewTutorPortalSession({
    userId: user.id,
    tokenHash: hashTutorPortalToken(token),
    now,
    nextExpiry: createTutorPortalExpiry(now),
  });
  if (!isActive) return null;
  const status = await deps.getTutorAccountStatusByUserId(user.id);
  if (status !== "active") return null;
  const profile = await deps.getTutorProfileByUserId(user.id);
  return profile?.tutorId ?? null;
}

async function authenticateAdminSocket(request: IncomingMessage) {
  const user = await sdk.authenticateRequest(request as never).catch(() => null);
  return user?.role === "admin";
}

/** Wires the chat push channel onto the same `http.Server` Express already listens with - no separate port, no separate origin. */
export function attachChatWebSocketServer(server: HttpServer, deps: ChatSocketAuthDeps) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request: IncomingMessage, socket: Duplex, head: Buffer) => {
    const url = new URL(request.url ?? "", "http://internal");
    if (url.pathname !== CHAT_WEBSOCKET_PATH) return;

    void (async () => {
      const token = url.searchParams.get("token");
      const tutorId = await authenticateTutorSocket(request, token, deps);
      if (tutorId) {
        wss.handleUpgrade(request, socket, head, ws => registerTutorSocket(tutorId, ws));
        return;
      }
      const isAdmin = await authenticateAdminSocket(request);
      if (isAdmin) {
        wss.handleUpgrade(request, socket, head, ws => registerAdminSocket(ws));
        return;
      }
      socket.destroy();
    })().catch(() => socket.destroy());
  });
}
