import { createServer, type Server } from "http";
import { WebSocket } from "ws";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sdkMocks = vi.hoisted(() => ({ authenticateRequest: vi.fn() }));

vi.mock("./_core/sdk", () => ({ sdk: { authenticateRequest: sdkMocks.authenticateRequest } }));

import { attachChatWebSocketServer, notifyAdminsOfChatMessage, notifyTutorOfChatMessage } from "./chat-ws";

const deps = {
  renewTutorPortalSession: vi.fn(),
  getTutorAccountStatusByUserId: vi.fn(),
  getTutorProfileByUserId: vi.fn(),
};

let server: Server;
let port: number;

function socketUrl(query = "") {
  return `ws://127.0.0.1:${port}/ws/chat${query}`;
}

function waitFor(socket: WebSocket, event: "open" | "close" | "message") {
  return new Promise<any>((resolve, reject) => {
    socket.once(event, (data?: unknown) => resolve(data));
    socket.once("error", reject);
  });
}

/** A destroyed handshake socket surfaces as a client-side "error" (ECONNRESET) rather than a clean close - either counts as refused. */
function waitForRefusal(socket: WebSocket) {
  return new Promise<void>(resolve => {
    socket.once("close", () => resolve());
    socket.once("error", () => resolve());
  });
}

beforeEach(async () => {
  vi.clearAllMocks();
  server = createServer();
  attachChatWebSocketServer(server, deps);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  port = (server.address() as { port: number }).port;
});

afterEach(async () => {
  await new Promise<void>(resolve => server.close(() => resolve()));
});

describe("the chat WebSocket handshake", () => {
  it("refuses a connection with no Tutor token and no Admin session", async () => {
    sdkMocks.authenticateRequest.mockResolvedValue(null);
    const socket = new WebSocket(socketUrl());
    await waitForRefusal(socket);
  });

  it("accepts a Tutor whose portal token is still active and account is active", async () => {
    sdkMocks.authenticateRequest.mockResolvedValue({ id: 101, role: "tutor" });
    deps.renewTutorPortalSession.mockResolvedValue(true);
    deps.getTutorAccountStatusByUserId.mockResolvedValue("active");
    deps.getTutorProfileByUserId.mockResolvedValue({ tutorId: "tutor-1503" });

    const socket = new WebSocket(socketUrl("?token=proof"));
    await expect(waitFor(socket, "open")).resolves.toBeUndefined();
    socket.close();
  });

  it("refuses a Tutor whose account is no longer active", async () => {
    sdkMocks.authenticateRequest.mockResolvedValue({ id: 101, role: "tutor" });
    deps.renewTutorPortalSession.mockResolvedValue(true);
    deps.getTutorAccountStatusByUserId.mockResolvedValue("suspended");

    const socket = new WebSocket(socketUrl("?token=proof"));
    await waitForRefusal(socket);
  });

  it("accepts an Admin's own session cookie with no token at all", async () => {
    sdkMocks.authenticateRequest.mockResolvedValue({ id: 42, role: "admin" });
    const socket = new WebSocket(socketUrl());
    await expect(waitFor(socket, "open")).resolves.toBeUndefined();
    socket.close();
  });
});

describe("pushing a chat event", () => {
  it("tells every connected Admin when a Tutor writes in", async () => {
    sdkMocks.authenticateRequest.mockResolvedValue({ id: 42, role: "admin" });
    const socket = new WebSocket(socketUrl());
    await waitFor(socket, "open");

    const message = waitFor(socket, "message");
    notifyAdminsOfChatMessage("tutor-1503");
    const raw = await message;
    expect(JSON.parse(raw.toString())).toEqual({ type: "message", tutorId: "tutor-1503" });
    socket.close();
  });

  it("tells that Tutor's own socket, and every Admin, when an Admin replies", async () => {
    sdkMocks.authenticateRequest.mockResolvedValueOnce({ id: 101, role: "tutor" }).mockResolvedValueOnce({ id: 42, role: "admin" });
    deps.renewTutorPortalSession.mockResolvedValue(true);
    deps.getTutorAccountStatusByUserId.mockResolvedValue("active");
    deps.getTutorProfileByUserId.mockResolvedValue({ tutorId: "tutor-1503" });

    const tutorSocket = new WebSocket(socketUrl("?token=proof"));
    await waitFor(tutorSocket, "open");
    const adminSocket = new WebSocket(socketUrl());
    await waitFor(adminSocket, "open");

    const tutorMessage = waitFor(tutorSocket, "message");
    const adminMessage = waitFor(adminSocket, "message");
    notifyTutorOfChatMessage("tutor-1503");

    expect(JSON.parse((await tutorMessage).toString())).toEqual({ type: "message" });
    expect(JSON.parse((await adminMessage).toString())).toEqual({ type: "message", tutorId: "tutor-1503" });
    tutorSocket.close();
    adminSocket.close();
  });

  it("never crosses a message into a different Tutor's own socket", async () => {
    sdkMocks.authenticateRequest.mockResolvedValue({ id: 101, role: "tutor" });
    deps.renewTutorPortalSession.mockResolvedValue(true);
    deps.getTutorAccountStatusByUserId.mockResolvedValue("active");
    deps.getTutorProfileByUserId.mockResolvedValue({ tutorId: "tutor-other" });

    const socket = new WebSocket(socketUrl("?token=proof"));
    await waitFor(socket, "open");

    let received = false;
    socket.on("message", () => { received = true; });
    notifyTutorOfChatMessage("tutor-1503");
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(received).toBe(false);
    socket.close();
  });
});
