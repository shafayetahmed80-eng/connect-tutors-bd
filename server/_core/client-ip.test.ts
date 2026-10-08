import { describe, expect, it } from "vitest";
import { resolveClientIp } from "./client-ip";

describe("resolveClientIp", () => {
  it("takes the address our own web server appended, not the one the visitor wrote", () => {
    expect(resolveClientIp({ forwardedFor: "1.2.3.4, 203.0.113.9", socketIp: "10.0.0.1", trustedProxyHops: 1 })).toBe("203.0.113.9");
  });

  it("cannot be talked into a new address by a made-up header", () => {
    const first = resolveClientIp({ forwardedFor: "9.9.9.1, 203.0.113.9", socketIp: "10.0.0.1", trustedProxyHops: 1 });
    const second = resolveClientIp({ forwardedFor: "9.9.9.2, 203.0.113.9", socketIp: "10.0.0.1", trustedProxyHops: 1 });
    expect(first).toBe(second);
  });

  it("skips one more entry for each extra server of ours in front", () => {
    expect(resolveClientIp({ forwardedFor: "198.51.100.7, 172.70.1.1", socketIp: "10.0.0.1", trustedProxyHops: 2 })).toBe("198.51.100.7");
  });

  it("uses the socket address when no server added an entry", () => {
    expect(resolveClientIp({ forwardedFor: undefined, socketIp: "10.0.0.1", trustedProxyHops: 1 })).toBe("10.0.0.1");
    expect(resolveClientIp({ forwardedFor: "", socketIp: "10.0.0.1", trustedProxyHops: 1 })).toBe("10.0.0.1");
    expect(resolveClientIp({ forwardedFor: "198.51.100.7", socketIp: "10.0.0.1", trustedProxyHops: 2 })).toBe("10.0.0.1");
  });

  it("ignores the header completely when told no server of ours is in front", () => {
    expect(resolveClientIp({ forwardedFor: "1.2.3.4", socketIp: "10.0.0.1", trustedProxyHops: 0 })).toBe("10.0.0.1");
  });

  it("reads a header that arrived as a list", () => {
    expect(resolveClientIp({ forwardedFor: ["1.2.3.4", "203.0.113.9"], socketIp: undefined, trustedProxyHops: 1 })).toBe("203.0.113.9");
  });

  it("will not pass off text that is not an address, since it is printed in logs and phone alerts", () => {
    expect(resolveClientIp({ forwardedFor: "1.2.3.4, call 0123456789 now", socketIp: "10.0.0.1", trustedProxyHops: 1 })).toBe("10.0.0.1");
    expect(resolveClientIp({ forwardedFor: "2001:db8::8a2e:370:7334", socketIp: "10.0.0.1", trustedProxyHops: 1 })).toBe("2001:db8::8a2e:370:7334");
  });

  it("never returns an empty address", () => {
    expect(resolveClientIp({ forwardedFor: undefined, socketIp: undefined, trustedProxyHops: 1 })).toBe("unknown");
  });
});
