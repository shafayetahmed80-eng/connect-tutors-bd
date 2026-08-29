import { useState } from "react";
import { useEffect } from "react";
import { useLocation } from "wouter";

export function getRequestSubmitState(isPending: boolean, submitted: boolean) {
  if (submitted) return { view: "success" as const, disabled: false, label: "Request submitted" };
  if (isPending) return { view: "form" as const, disabled: true, label: "Sending securely…" };
  return { view: "form" as const, disabled: false, label: "Send request" };
}

export default function TutorRequest() {
  const [, navigate] = useLocation();
  useEffect(() => {
    navigate("/request-tutor");
  }, [navigate]);

  return <main className="mx-auto max-w-xl px-5 py-20 text-center text-sm text-[#5f788a]" aria-live="polite">Redirecting to the Guardian Tutor Request form…</main>;
}
