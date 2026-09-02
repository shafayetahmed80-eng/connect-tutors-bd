import type { CookieOptions, Request } from "express";
import { ONE_YEAR_MS } from "@shared/const";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

/**
 * How long the browser keeps the session cookie.
 *
 * Without this the cookie has no expiry, which makes it a *browser-session*
 * cookie: the token inside is good for a year, but closing the browser throws
 * it away and every panel asks for a password again. Nobody had signed out, so
 * the cookie now lasts as long as the token it carries and only an explicit
 * sign-out ends a session.
 */
const SESSION_COOKIE_MAX_AGE_MS = ONE_YEAR_MS;

function isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

function isSecureRequest(req: Request) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "maxAge" | "path" | "sameSite" | "secure"> {
  // const hostname = req.hostname;
  // const shouldSetDomain =
  //   hostname &&
  //   !LOCAL_HOSTS.has(hostname) &&
  //   !isIpAddress(hostname) &&
  //   hostname !== "127.0.0.1" &&
  //   hostname !== "::1";

  // const domain =
  //   shouldSetDomain && !hostname.startsWith(".")
  //     ? `.${hostname}`
  //     : shouldSetDomain
  //       ? hostname
  //       : undefined;

  // `SameSite=None` requires `Secure`, which browsers refuse over plain http
  // (local development). Fall back to `Lax` there — it is same-origin on
  // localhost so the session cookie still rides along. HTTPS requests keep
  // `None; Secure` for the cross-site preview/iframe scenario.
  if (!isSecureRequest(req)) {
    return { httpOnly: true, maxAge: SESSION_COOKIE_MAX_AGE_MS, path: "/", sameSite: "lax", secure: false };
  }

  return {
    httpOnly: true,
    maxAge: SESSION_COOKIE_MAX_AGE_MS,
    path: "/",
    sameSite: "none",
    secure: true,
  };
}
