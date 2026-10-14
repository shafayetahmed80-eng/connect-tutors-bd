import { isSiteContactNumber, normalizeSiteContactNumber, telHref, whatsappHref } from "@shared/site-content";

/**
 * What a stored Bangladesh mobile number needs to be usable on a screen: the
 * link that rings it, the link that opens a WhatsApp chat with it, and a way
 * to write it that can be read at a glance ("+880 1712 345678").
 *
 * Whatever the number was typed or stored as - "+8801712345678",
 * "01712-345678" - the links are built from the same 880 form, so a number that
 * works is never turned into a link that does not. Anything that is not a
 * Bangladesh mobile gets no links at all (null): the caller writes it as it is
 * rather than point at a number that would not connect.
 */
export function contactNumberLinks(phone: string) {
  const number = normalizeSiteContactNumber(phone);
  if (!isSiteContactNumber(number)) return null;
  return {
    display: `+${number.slice(0, 3)} ${number.slice(3, 7)} ${number.slice(7)}`,
    tel: telHref(number),
    whatsapp: whatsappHref(number),
  };
}
