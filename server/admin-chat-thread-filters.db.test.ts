import { randomBytes } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { locations, tutorAdminChatMessages, tutorAdminChatThreads, tutors, users } from "../drizzle/schema";
import type { AdminTutorChatThreadFilters } from "./db";
import { getDb, getTutorAdminChatUnreadThreadCountForAdmin, listTutorAdminChatThreadsForAdmin } from "./db";

// Four conversations made here, found again by a random tag in the Tutors'
// names, so whatever else the database holds does not change what is read.
// Everything is removed afterwards, by id.
const tag = randomBytes(3).toString("hex");
const hour = 60 * 60 * 1000;
const ago = (hours: number) => new Date(Date.now() - hours * hour);

const userIds: number[] = [];
const tutorIds: string[] = [];
const threadIds: number[] = [];
const nameOf = new Map<string, string>();
let me = 0;
let anotherAdmin = 0;

async function database() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db;
}

async function makeUser(suffix: string, role: "tutor" | "admin") {
  const db = await database();
  const [made] = await db.insert(users).values({ openId: `test-chatf-${tag}-${suffix}`, name: `Chat ${suffix} ${tag}`, role });
  const id = Number(made.insertId);
  userIds.push(id);
  return id;
}

/** One Tutor's conversation: the Tutor's last message `messageHoursAgo`, and an Admin's read cursor where the test puts it. */
async function makeConversation(name: string, area: string, over: { messageHoursAgo: number; readHoursAgo: number | null; claimedBy: number | null }) {
  const db = await database();
  const userId = await makeUser(name, "tutor");
  const tutorId = `chatf-${tag}-${name}`;
  await db.insert(tutors).values({ id: tutorId, userId, name: `Chat ${name} ${tag}`, profileStatus: "approved", gender: "female", locationId: area });
  tutorIds.push(tutorId);
  nameOf.set(tutorId, name);
  const [thread] = await db.insert(tutorAdminChatThreads).values({
    tutorId,
    lastMessageAt: ago(over.messageHoursAgo),
    lastMessagePreview: "Need help",
    adminLastReadAt: over.readHoursAgo === null ? null : ago(over.readHoursAgo),
    claimedByAdminId: over.claimedBy,
  });
  const threadId = Number(thread.insertId);
  threadIds.push(threadId);
  await db.insert(tutorAdminChatMessages).values({ threadId, senderRole: "tutor", body: "Need help", createdAt: ago(over.messageHoursAgo) });
}

beforeAll(async () => {
  const db = await database();
  const [area] = await db.select({ id: locations.id }).from(locations).where(eq(locations.type, "area")).limit(1);
  if (!area) throw new Error("These tests need an area in the locations table");
  me = await makeUser("me", "admin");
  anotherAdmin = await makeUser("other", "admin");

  // c1: unread 30 hours, mine. c2: unread 2 hours, nobody's. c3: read, another Admin's, last heard 10 days ago.
  // c4: unread 5 days (the Admin read it a day before it came), nobody's.
  await makeConversation("c1", area.id, { messageHoursAgo: 30, readHoursAgo: null, claimedBy: me });
  await makeConversation("c2", area.id, { messageHoursAgo: 2, readHoursAgo: null, claimedBy: null });
  await makeConversation("c3", area.id, { messageHoursAgo: 240, readHoursAgo: 216, claimedBy: anotherAdmin });
  await makeConversation("c4", area.id, { messageHoursAgo: 120, readHoursAgo: 144, claimedBy: null });
});

afterAll(async () => {
  const db = await getDb();
  if (!db) return;
  if (threadIds.length) {
    await db.delete(tutorAdminChatMessages).where(inArray(tutorAdminChatMessages.threadId, threadIds));
    await db.delete(tutorAdminChatThreads).where(inArray(tutorAdminChatThreads.id, threadIds));
  }
  if (tutorIds.length) await db.delete(tutors).where(inArray(tutors.id, tutorIds));
  if (userIds.length) await db.delete(users).where(inArray(users.id, userIds));
});

/** Which of this test's conversations the list returns for these choices, by name. */
async function read(over: AdminTutorChatThreadFilters = {}) {
  const page = await listTutorAdminChatThreadsForAdmin({ query: tag, page: 1, pageSize: 50, archived: false, adminUserId: me, ...over });
  return { names: page.items.map(item => nameOf.get(item.tutorId)).filter(Boolean).sort(), total: page.total };
}

describe("the Tutor Chats filters", () => {
  it("lists all four conversations when nothing narrows them", async () => {
    expect((await read()).names).toEqual(["c1", "c2", "c3", "c4"]);
  });

  it("tells a conversation with a message nobody has read from one that is up to date", async () => {
    expect((await read({ unread: "unread" })).names).toEqual(["c1", "c2", "c4"]);
    expect((await read({ unread: "read" })).names).toEqual(["c3"]);
  });

  it("reads who has claimed it: the Admin looking, no one, or another Admin", async () => {
    expect((await read({ claim: "mine" })).names).toEqual(["c1"]);
    expect((await read({ claim: "unclaimed" })).names).toEqual(["c2", "c4"]);
    expect((await read({ claim: "others" })).names).toEqual(["c3"]);
    // Seen from the other Admin, the two swap.
    expect((await read({ claim: "mine", adminUserId: anotherAdmin })).names).toEqual(["c3"]);
    expect((await read({ claim: "others", adminUserId: anotherAdmin })).names).toEqual(["c1"]);
  });

  it("finds a Tutor who has waited at least so long, by the oldest message still unread", async () => {
    expect((await read({ waitingHours: 1 })).names).toEqual(["c1", "c2", "c4"]);
    expect((await read({ waitingHours: 6 })).names).toEqual(["c1", "c4"]);
    expect((await read({ waitingHours: 24 })).names).toEqual(["c1", "c4"]);
    expect((await read({ waitingHours: 72 })).names).toEqual(["c4"]);
    // A conversation that is up to date is not waiting, however old its last message.
    expect((await read({ waitingHours: 1, unread: "read" })).names).toEqual([]);
  });

  it("takes a last-message date range, the last day included", async () => {
    expect((await read({ lastMessageFrom: ago(72) })).names).toEqual(["c1", "c2"]);
    expect((await read({ lastMessageTo: ago(72) })).names).toEqual(["c3", "c4"]);
    expect((await read({ lastMessageFrom: ago(200), lastMessageTo: ago(100) })).names).toEqual(["c4"]);
  });

  it("narrows by several choices at once, and by the search beside them", async () => {
    expect((await read({ claim: "unclaimed", waitingHours: 24 })).names).toEqual(["c4"]);
    expect((await read({ unread: "unread", claim: "mine", lastMessageFrom: ago(48) })).names).toEqual(["c1"]);
    const page = await listTutorAdminChatThreadsForAdmin({ query: `c2 ${tag}`, page: 1, pageSize: 50, archived: false, adminUserId: me, unread: "unread" });
    expect(page.items.map(item => nameOf.get(item.tutorId))).toEqual(["c2"]);
  });

  it("counts a total that follows the choices, not only the page", async () => {
    expect((await read({ unread: "unread" })).total).toBe(3);
    expect((await read({ claim: "others" })).total).toBe(1);
  });

  it("finds nothing, rather than failing, for dates the wrong way round", async () => {
    expect((await read({ lastMessageFrom: ago(1), lastMessageTo: ago(100) })).names).toEqual([]);
  });

  it("reads unread the same way the sidebar's count of unread conversations does", async () => {
    const { unreadThreadCount } = await getTutorAdminChatUnreadThreadCountForAdmin();
    // Every conversation this test holds that is unread is in that count; the rest of the database only adds to it.
    expect(unreadThreadCount).toBeGreaterThanOrEqual(3);
  });
});
