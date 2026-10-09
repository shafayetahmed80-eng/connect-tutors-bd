import { useSyncExternalStore } from "react";

/** The browser's install prompt, kept from the event that offered it. Chromium browsers only; Safari on iPhone has no such event. */
type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type InstallTarget = Pick<Window, "addEventListener" | "removeEventListener">;

export type InstallOutcome = "accepted" | "dismissed" | "unavailable";

/**
 * Whether this page is already running as the installed app. An installed app
 * is never offered the install again.
 */
export function isRunningAsInstalledApp(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia?.("(display-mode: standalone)").matches === true || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  } catch {
    return false;
  }
}

/**
 * Holds the browser's one-shot install prompt and tells subscribers when one is
 * on offer.
 *
 * The event fires once, soon after load and often before any component has
 * mounted, so this is started from `main.tsx` and keeps the event until a
 * button asks for it. A prompt can be used once: after it is shown (accepted or
 * not) there is nothing to offer until the browser offers again.
 */
export function createInstallApp(target: InstallTarget, runningAsInstalledApp: () => boolean = isRunningAsInstalledApp) {
  let offered: InstallPromptEvent | null = null;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach(listener => listener());

  const onBeforeInstallPrompt = (event: Event) => {
    // Without this the browser shows its own bar and the event is no longer ours to use.
    event.preventDefault();
    offered = event as InstallPromptEvent;
    notify();
  };
  const onInstalled = () => {
    offered = null;
    notify();
  };

  return {
    start() {
      target.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      target.addEventListener("appinstalled", onInstalled);
      return () => {
        target.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
        target.removeEventListener("appinstalled", onInstalled);
      };
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    canInstall: () => offered !== null && !runningAsInstalledApp(),
    async prompt(): Promise<InstallOutcome> {
      const event = offered;
      if (!event) return "unavailable";
      offered = null;
      notify();
      try {
        await event.prompt();
        return (await event.userChoice).outcome;
      } catch {
        return "dismissed";
      }
    },
  };
}

const installApp = createInstallApp(typeof window === "undefined" ? { addEventListener() {}, removeEventListener() {} } : window);

/** Begins listening for the browser's offer to install. Call once, before the app renders. */
export const startListeningForInstallPrompt = installApp.start;

/** Shows the browser's install prompt, if it has offered one. */
export const promptToInstallApp = installApp.prompt;

/** True only while the browser has offered to install and the app is not installed yet. */
export function useCanInstallApp(): boolean {
  return useSyncExternalStore(installApp.subscribe, installApp.canInstall, () => false);
}
