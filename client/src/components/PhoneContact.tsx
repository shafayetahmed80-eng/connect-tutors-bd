import { useEffect, useRef, useState } from "react";
import { Check, Copy, Phone } from "lucide-react";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { contactNumberLinks } from "@/lib/contactNumber";
import { copyToClipboard } from "@/lib/copyToClipboard";
import { cn } from "@/lib/utils";

/**
 * A mobile number that can be used: the number itself rings it when pressed,
 * a WhatsApp mark beside it opens a chat, and a copy icon copies the number
 * with a tactile spring-bounce and tooltip. Same links on a laptop and a
 * phone; only the size of what is pressed changes.
 *
 * Neither is drawn as a button - no fill, no border. The number is the Job ID's
 * blue, the WhatsApp mark is green; the area each can be pressed in is larger
 * than what is drawn, so a thumb still finds it.
 *
 * Direct call triggers a tactile micro-bounce, soft glow halo, and phone ringing
 * animation with a smooth short delay before dialling. WhatsApp triggers a bouncy
 * pulse pop and icon wiggle. Copy triggers a tactile spring-pop and checkmark.
 *
 * A number that is not a Bangladesh mobile is written as it came, with no
 * links, rather than point at one that would not connect.
 */
export function PhoneContact({ phone, size = "table", className, showCopy = true, formatDisplay = true }: {
  phone: string;
  /** `table` for a row; `card` for a phone card, where each link is at least thumb-sized. */
  size?: "table" | "card";
  className?: string;
  /** Whether to render the copy-to-clipboard button. Defaults to true. */
  showCopy?: boolean;
  /** Whether to format display with spaces (+880 1XXX XXXXXX) or keep original raw text. Defaults to true. */
  formatDisplay?: boolean;
}) {
  const [isCalling, setIsCalling] = useState(false);
  const [isMessaging, setIsMessaging] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const callTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const waTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const waResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (callTimerRef.current) clearTimeout(callTimerRef.current);
      if (callResetRef.current) clearTimeout(callResetRef.current);
      if (waTimerRef.current) clearTimeout(waTimerRef.current);
      if (waResetRef.current) clearTimeout(waResetRef.current);
      if (copyResetRef.current) clearTimeout(copyResetRef.current);
    };
  }, []);

  const links = contactNumberLinks(phone);
  if (!links) return <span className="tabular-nums text-j-ink-strong">{phone}</span>;

  const card = size === "card";
  const cleanNumber = links.tel.replace("tel:+880", "0");

  const handleCallClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    setIsCalling(true);
    if (callTimerRef.current) clearTimeout(callTimerRef.current);
    if (callResetRef.current) clearTimeout(callResetRef.current);

    callTimerRef.current = setTimeout(() => {
      try {
        window.location.href = links.tel;
      } catch {
        // Fallback for restricted or test environments
      }
    }, 220);

    callResetRef.current = setTimeout(() => {
      setIsCalling(false);
    }, 700);
  };

  const handleWhatsAppClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    setIsMessaging(true);
    if (waTimerRef.current) clearTimeout(waTimerRef.current);
    if (waResetRef.current) clearTimeout(waResetRef.current);

    waTimerRef.current = setTimeout(() => {
      window.open(links.whatsapp, "_blank", "noopener,noreferrer");
    }, 220);

    waResetRef.current = setTimeout(() => {
      setIsMessaging(false);
    }, 700);
  };

  const handleCopyClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    e.stopPropagation();

    void copyToClipboard(cleanNumber);
    setIsCopied(true);
    if (copyResetRef.current) clearTimeout(copyResetRef.current);
    copyResetRef.current = setTimeout(() => {
      setIsCopied(false);
    }, 2000);
  };

  return <span className={cn("inline-flex items-center gap-1", className)}>
    <a
      href={links.tel}
      onClick={handleCallClick}
      data-calling={isCalling ? "true" : undefined}
      aria-label={`Call ${links.display}`}
      className={cn(
        "group phone-contact-call relative inline-flex items-center gap-1.5 whitespace-nowrap rounded-md font-heading font-bold tabular-nums text-[#1680c2] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1680c2] transition-transform duration-200 active:scale-95",
        card ? "min-h-10 text-[13px]" : "min-h-8 text-sm",
      )}
    >
      {isCalling ? (
        <Check
          aria-hidden="true"
          size={13}
          className="phone-contact-icon shrink-0 text-j-ok transition-all duration-200"
        />
      ) : (
        <Phone
          aria-hidden="true"
          size={13}
          className="phone-contact-icon shrink-0 text-[#8fb4d0] transition-all duration-200 group-hover:text-[#1680c2] group-hover:-rotate-12"
        />
      )}
      {formatDisplay ? links.display : phone}
    </a>
    <a
      href={links.whatsapp}
      onClick={handleWhatsAppClick}
      data-messaging={isMessaging ? "true" : undefined}
      target="_blank"
      rel="noreferrer"
      title="Message on WhatsApp"
      className={cn(
        "phone-contact-wa inline-flex shrink-0 items-center justify-center rounded-full text-j-ok transition-all duration-200 hover:scale-110 hover:bg-j-ok-wash active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-j-ok",
        card ? "size-10" : "size-8",
      )}
    >
      {isMessaging ? (
        <Check aria-hidden="true" size={card ? 16 : 16} className="shrink-0 text-j-ok transition-all duration-200" />
      ) : (
        <WhatsAppIcon size={card ? 16 : 16} />
      )}
      <span className="sr-only">{`Message ${links.display} on WhatsApp`}</span>
    </a>
    {showCopy ? (
      <button
        type="button"
        onClick={handleCopyClick}
        data-copied={isCopied ? "true" : undefined}
        aria-label={`Copy ${links.display}`}
        title="নম্বর কপি করুন"
        className={cn(
          "phone-contact-copy relative inline-flex shrink-0 items-center justify-center rounded-full text-[#8fb4d0] transition-all duration-200 hover:scale-110 hover:text-[#1680c2] hover:bg-[#eef6fc] active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1680c2]",
          isCopied && "text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-50",
          card ? "size-10" : "size-8",
        )}
      >
        {isCopied ? (
          <Check size={card ? 15 : 13} aria-hidden="true" className="phone-contact-copy-check animate-in zoom-in-75 duration-200 text-emerald-600" />
        ) : (
          <Copy size={card ? 14 : 12} aria-hidden="true" className="phone-contact-copy-icon" />
        )}
        {isCopied ? (
          <span
            aria-hidden="true"
            className="phone-contact-tooltip absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#173d60] px-2 py-0.5 text-[10px] font-semibold text-white shadow-md z-30 pointer-events-none"
          >
            কপি হয়েছে!
          </span>
        ) : null}
      </button>
    ) : null}
  </span>;
}

