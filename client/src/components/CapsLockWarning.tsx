import { AlertTriangle } from "lucide-react";
import React, { type KeyboardEvent, useCallback, useState } from "react";

export function useCapsLockWarning() {
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);

  const updateCapsLockState = useCallback((event: Pick<KeyboardEvent<HTMLInputElement>, "getModifierState">) => {
    setIsCapsLockOn(event.getModifierState("CapsLock"));
  }, []);

  const clearCapsLockWarning = useCallback(() => {
    setIsCapsLockOn(false);
  }, []);

  return { clearCapsLockWarning, isCapsLockOn, updateCapsLockState };
}

export function CapsLockWarning({ isCapsLockOn }: { isCapsLockOn: boolean }) {
  if (!isCapsLockOn) return null;

  return <p role="status" aria-live="polite" aria-atomic="true" className="mt-2 flex items-center gap-2 text-xs font-semibold leading-5 text-[#a65b13]">
    <AlertTriangle size={15} aria-hidden="true" className="shrink-0" />
    <span>Caps Lock is on. Passwords are case-sensitive.</span>
  </p>;
}
