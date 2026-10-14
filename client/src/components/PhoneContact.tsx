import { useEffect, useRef, useState } from "react";
import { Phone } from "lucide-react";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { contactNumberLinks } from "@/lib/contactNumber";
import { cn } from "@/lib/utils";

/**
 * A mobile number that can be used: the number itself rings it when pressed,
 * and a WhatsApp mark beside it opens a chat. Same two links on a laptop and a
 * phone; only the size of what is pressed changes.
 *
 * Neither is drawn as a button - no fill, no border. The number is the Job ID's
 * blue, the WhatsApp mark is green; the area each can be pressed in is larger
 * than what is drawn, so a thumb still finds it.
 *
 * Direct call triggers a tactile micro-bounce, soft glow halo, and phone ringing
 * animation with a smooth short delay before dialling. WhatsApp triggers a bouncy
 * pulse pop and icon wiggle.
 *
 * A number that is not a Bangladesh mobile is written as it came, with no
 * links, rather than point at one that would not connect.
 */
export function PhoneContact({ phone, size = "table", className }: {
  phone: string;
  /** `table` for a row; `card` for a phone card, where each link is at least thumb-sized. */
  size?: "table" | "card";
  className?: string;
}) {
  const [isCalling, setIsCalling] = useState(false);
  const [isMessaging, setIsMessaging] = useState(false);
  const callTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const waTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const waResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (callTimerRef.current) clearTimeout(callTimerRef.current);
      if (callResetRef.current) clearTimeout(callResetRef.current);
      if (waTimerRef.current) clearTimeout(waTimerRef.current);
      if (waResetRef.current) clearTimeout(waResetRef.current);
    };
  }, []);

  const links = contactNumberLinks(phone);
  if (!links) return <span className="tabular-nums text-j-ink-strong">{phone}</span>;

  const card = size === "card";

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
    }, 900);
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
    }, 900);
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
      <Phone
        aria-hidden="true"
        size={card ? 13 : 13}
        className="phone-contact-icon shrink-0 text-[#8fb4d0] transition-all duration-200 group-hover:text-[#1680c2] group-hover:-rotate-12"
      />
      {links.display}
    </a>
    <a
      href={links.whatsapp}
      onClick={handleWhatsAppClick}
      data-messaging={isMessaging ? "true" : undefined}
      target="_blank"
      rel="noreferrer"
      aria-label={`Message ${links.display} on WhatsApp`}
      title="Message on WhatsApp"
      className={cn(
        "phone-contact-wa inline-flex shrink-0 items-center justify-center rounded-full text-j-ok transition-all duration-200 hover:scale-110 hover:bg-j-ok-wash active:scale-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-j-ok",
        card ? "size-10" : "size-8",
      )}
    >
      <WhatsAppIcon size={card ? 16 : 16} />
    </a>
  </span>;
}

