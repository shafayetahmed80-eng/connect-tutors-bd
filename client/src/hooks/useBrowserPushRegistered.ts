import { useEffect, useRef, useState } from "react";

const REGISTRATION_CHANGED_EVENT = "connect-push-registration-changed";

/** Every screen showing "alerts on/off for this browser" asks the server again once one of them has turned it on or off. */
export function announcePushRegistrationChange() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(REGISTRATION_CHANGED_EVENT));
}

/**
 * Whether THIS browser is registered on the server to get alerts. The browser alone
 * cannot say: a subscription made for another switch (the account Notifications
 * switch, a Tutor or Guardian prompt) is still "a subscription" to it, yet the server
 * holds no row for it for this purpose - so a switch read "on" while nothing ever
 * arrived. `isRegistered` asks the server about the browser's own endpoint.
 *
 * Returns `[registered, setRegistered, checked]`; `checked` is false until the server
 * has actually answered, so a prompt or a warning dot never acts on a guess.
 */
export function useBrowserPushRegistered(supported: boolean, isRegistered: (endpoint: string) => Promise<boolean>) {
  const [registered, setRegistered] = useState(false);
  const [checked, setChecked] = useState(false);
  const ask = useRef(isRegistered);
  ask.current = isRegistered;

  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    const check = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        const existing = await registration?.pushManager.getSubscription();
        const answer = existing ? await ask.current(existing.endpoint) : false;
        if (cancelled) return;
        setRegistered(answer);
        setChecked(true);
      } catch {
        // Cannot tell: the switch stays off, nothing is prompted, and turning it on registers this browser properly.
      }
    };
    void check();
    window.addEventListener(REGISTRATION_CHANGED_EVENT, check);
    return () => {
      cancelled = true;
      window.removeEventListener(REGISTRATION_CHANGED_EVENT, check);
    };
  }, [supported]);

  return [registered, setRegistered, checked] as const;
}
