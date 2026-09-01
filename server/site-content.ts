import { z } from "zod";
import {
  MAX_SITE_CONTENT_TEXT_LENGTH,
  findSiteContentSlot,
  findSiteContentSpacingSlot,
  siteContentPageIds,
  siteContentSpacings,
  siteContentTextSizes,
} from "@shared/site-content";

export const siteContentPageSchema = z.enum(siteContentPageIds);

/**
 * A slot may carry text and a size, or a spacing choice, never both: the two
 * come from separate registries. `null` clears that part of the override, which
 * is how "reset to default" is expressed.
 */
export const siteContentOverrideInputSchema = z.object({
  slotId: z.string().trim().min(1).max(120),
  text: z.string().trim().max(MAX_SITE_CONTENT_TEXT_LENGTH).nullish(),
  textSize: z.enum(siteContentTextSizes).nullish(),
  spacing: z.enum(siteContentSpacings).nullish(),
}).superRefine((value, ctx) => {
  const textSlot = findSiteContentSlot(value.slotId);
  const spacingSlot = findSiteContentSpacingSlot(value.slotId);

  if (!textSlot && !spacingSlot) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["slotId"], message: "Unknown content slot." });
    return;
  }

  // Reject a payload aimed at the wrong kind of slot rather than silently
  // storing a value nothing will ever read.
  if (spacingSlot && (value.text !== undefined || value.textSize !== undefined)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["slotId"], message: "This slot only accepts a spacing value." });
  }
  if (textSlot && value.spacing !== undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["slotId"], message: "This slot does not accept a spacing value." });
  }
});

export type SiteContentOverrideInput = z.infer<typeof siteContentOverrideInputSchema>;

/** The page a slot belongs to, taken from the registry rather than the caller. */
export function resolveSiteContentSlotPage(slotId: string) {
  return (findSiteContentSlot(slotId) ?? findSiteContentSpacingSlot(slotId))?.page;
}

/**
 * An override whose every field is empty carries no information, so it is
 * deleted instead of stored - keeping "no row" the single meaning of default.
 */
export function isEmptySiteContentOverride(input: SiteContentOverrideInput) {
  const text = input.text?.trim();
  return !text && !input.textSize && !input.spacing;
}
