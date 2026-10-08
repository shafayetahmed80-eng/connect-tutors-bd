import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  handlers: {} as Record<string, (connection: { query: (sql: string, done: (error: Error | null) => void) => void }) => void>,
  createPool: vi.fn(),
}));

vi.mock("mysql2", () => ({
  createPool: (...args: unknown[]) => {
    mocks.createPool(...args);
    return { on: (event: string, handler: (typeof mocks.handlers)[string]) => { mocks.handlers[event] = handler; } };
  },
}));
vi.mock("drizzle-orm/mysql2", () => ({ drizzle: (client: unknown) => ({ $client: client }) }));

import { createDatabase, createDatabasePool, DATABASE_SESSION_TIME_ZONE } from "./database-connection";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.handlers = {};
});

describe("the database connection", () => {
  it("opens a pool on the configured address", () => {
    createDatabasePool("mysql://user:pass@localhost:3306/app");

    expect(mocks.createPool).toHaveBeenCalledWith({ uri: "mysql://user:pass@localhost:3306/app" });
  });

  it("puts every new connection in UTC before anything else runs on it", () => {
    createDatabasePool("mysql://localhost/app");
    const query = vi.fn();

    mocks.handlers.connection({ query });

    expect(DATABASE_SESSION_TIME_ZONE).toBe("+00:00");
    expect(query).toHaveBeenCalledWith("SET time_zone = '+00:00'", expect.any(Function));
  });

  it("says so, and carries on, when the server refuses the setting", () => {
    createDatabasePool("mysql://localhost/app");
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    mocks.handlers.connection({ query: (_sql: string, done: (error: Error | null) => void) => done(new Error("Unknown time zone")) });

    expect(String(error.mock.calls[0][0])).toContain("time zone");
    error.mockRestore();
  });

  it("hands drizzle that same pool", () => {
    const database = createDatabase("mysql://localhost/app") as unknown as { $client: { on: unknown } };

    expect(typeof database.$client.on).toBe("function");
  });
});
