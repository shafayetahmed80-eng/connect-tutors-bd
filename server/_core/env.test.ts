import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("the app id sessions are signed with", () => {
  it("is never empty, because the session verifier turns an empty one away", async () => {
    vi.stubEnv("VITE_APP_ID", "");
    vi.resetModules();
    expect((await import("./env")).ENV.appId).not.toBe("");

    vi.stubEnv("VITE_APP_ID", "   ");
    vi.resetModules();
    expect((await import("./env")).ENV.appId).not.toBe("");
  });

  it("keeps a value that is set", async () => {
    vi.stubEnv("VITE_APP_ID", "my-app");
    vi.resetModules();
    expect((await import("./env")).ENV.appId).toBe("my-app");
  });
});
