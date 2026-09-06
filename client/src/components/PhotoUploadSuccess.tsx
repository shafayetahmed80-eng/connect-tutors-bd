import { Check } from "lucide-react";

/**
 * A brief "Upload Successful" confirmation with a calm check-and-fade entrance.
 * The caller mounts it (keyed on the upload time, so a repeat upload replays the
 * motion) right after a profile-photo upload succeeds and unmounts it a couple
 * of seconds later. `motion-reduce:animate-none` follows the same opt-out the
 * shared modal uses.
 */
export function PhotoUploadSuccess({ className = "" }: { className?: string }) {
  return (
    <div
      role="status"
      className={`pointer-events-none inline-flex items-center gap-2 rounded-full bg-j-ok px-3.5 py-1.5 text-sm font-bold text-white shadow-lg animate-in fade-in zoom-in-95 duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:animate-none ${className}`}
    >
      <span className="grid size-5 place-items-center rounded-full bg-white/25 animate-in zoom-in-50 duration-700 motion-reduce:animate-none">
        <Check size={13} strokeWidth={3} aria-hidden={true} />
      </span>
      Upload Successful
    </div>
  );
}
