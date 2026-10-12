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
 * blue with a pale handset in front, the WhatsApp mark is green; the area each
 * can be pressed in is larger than what is drawn, so a thumb still finds it.
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
  const links = contactNumberLinks(phone);
  if (!links) return <span className="tabular-nums text-j-ink-strong">{phone}</span>;

  const card = size === "card";
  return <span className={cn("inline-flex items-center gap-1", className)}>
    <a
      href={links.tel}
      aria-label={`Call ${links.display}`}
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md font-heading font-bold tabular-nums text-[#1680c2] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1680c2]",
        card ? "min-h-10 text-[15px]" : "min-h-8 text-sm",
      )}
    >
      <Phone aria-hidden="true" size={card ? 15 : 13} className="shrink-0 text-[#8fb4d0]" />
      {links.display}
    </a>
    <a
      href={links.whatsapp}
      target="_blank"
      rel="noreferrer"
      aria-label={`Message ${links.display} on WhatsApp`}
      title="Message on WhatsApp"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full text-j-ok transition-colors hover:bg-j-ok-wash focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-j-ok",
        card ? "size-10" : "size-8",
      )}
    >
      <WhatsAppIcon size={card ? 24 : 20} />
    </a>
  </span>;
}
