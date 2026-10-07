import { useEffect, useRef } from "react";

/** The shape of the WebOTP answer; TypeScript's DOM types do not carry it yet. */
type OtpCredential = { code?: string };

/** Whether this browser can read a code SMS for the page by itself (Android Chrome and relatives). */
export function supportsWebOtp() {
  return typeof window !== "undefined" && "OTPCredential" in window && typeof navigator !== "undefined" && Boolean(navigator.credentials);
}

/**
 * Waits for the code SMS and hands its digits to `onCode` the moment it lands.
 *
 * The browser only does this for an SMS whose last line is `@host #1234` for
 * this very host (see `phoneCodeMessage` on the server), and asks the person
 * once before it passes the code on. Everywhere else - a computer, an iPhone
 * (which offers the code above its own keyboard instead), a message without
 * that line - nothing happens and the code box works as it always did.
 *
 * `listenKey` is anything that changes when a new code has just been sent, so a
 * resend starts a fresh wait; the old one ends with the old key.
 */
export function useWebOtp(active: boolean, onCode: (code: string) => void, listenKey?: unknown, length = 4) {
  const latest = useRef(onCode);
  latest.current = onCode;

  useEffect(() => {
    if (!active || !supportsWebOtp()) return;
    const controller = new AbortController();
    const request = { otp: { transport: ["sms"] }, signal: controller.signal } as CredentialRequestOptions;
    navigator.credentials.get(request)
      .then(credential => {
        const code = (credential as OtpCredential | null)?.code;
        if (code && new RegExp(`^\\d{${length}}$`).test(code)) latest.current(code);
      })
      .catch(() => {
        // Refused, timed out or not offered: the person types the code, as before.
      });
    return () => controller.abort();
  }, [active, listenKey, length]);
}
