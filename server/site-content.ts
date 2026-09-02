import { z } from "zod";
import { MAX_LOCATION_ID_LENGTH, MAX_LOCATION_LABEL_LENGTH, locationTypes } from "@shared/location-catalog";
import { MAX_LARGE_CATALOG_NAME_LENGTH, MAX_OPTION_NAME_LENGTH, largeCatalogIds, optionCatalogIds } from "@shared/option-catalogs";
import {
  MAX_SITE_CONTENT_BLOCK_BODY,
  MAX_SITE_CONTENT_BLOCK_HEADING,
  MAX_SITE_CONTENT_TEXT_LENGTH,
  MAX_SITE_CONTENT_TEXT_PX,
  MIN_SITE_CONTENT_TEXT_PX,
  findSiteContentAnchor,
  isSiteContactNumber,
  normalizeSiteContactNumber,
  findSiteContentSizeSlot,
  siteContentSizeSlotMetric,
  findSiteContentSlot,
  findSiteContentSpacingSlot,
  siteContentBlockTones,
  siteContentPageIds,
  siteContentSpacings,
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
  textSizePx: z.number().int().min(MIN_SITE_CONTENT_TEXT_PX).max(MAX_SITE_CONTENT_TEXT_PX).nullish(),
  paddingPx: z.number().int().min(MIN_SITE_CONTENT_TEXT_PX).max(MAX_SITE_CONTENT_TEXT_PX).nullish(),
  spacing: z.enum(siteContentSpacings).nullish(),
}).superRefine((value, ctx) => {
  const textSlot = findSiteContentSlot(value.slotId);
  const spacingSlot = findSiteContentSpacingSlot(value.slotId);
  const sizeSlot = findSiteContentSizeSlot(value.slotId);

  if (textSlot?.kind === "phone" && value.text != null && value.text.trim() !== "" && !isSiteContactNumber(normalizeSiteContactNumber(value.text))) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["text"], message: "Enter a Bangladesh mobile number, for example 8801516131411." });
  }

  if (!textSlot && !spacingSlot && !sizeSlot) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["slotId"], message: "Unknown content slot." });
    return;
  }

  // Reject a payload aimed at the wrong kind of slot rather than silently
  // storing a value nothing will ever read.
  if (spacingSlot && (value.text !== undefined || value.textSizePx !== undefined || value.paddingPx !== undefined)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["slotId"], message: "This slot only accepts a spacing value." });
  }
  if (sizeSlot) {
    if (value.text !== undefined || value.spacing !== undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["slotId"], message: "This slot only accepts a size." });
    }
    // A size slot moves one measurement. Storing the other column would leave a
    // number nothing reads, and no way to tell later which one was meant.
    const wrongColumn = siteContentSizeSlotMetric(sizeSlot) === "padding" ? value.textSizePx : value.paddingPx;
    if (wrongColumn !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["slotId"],
        message: siteContentSizeSlotMetric(sizeSlot) === "padding"
          ? "This slot sets padding, not a text size."
          : "This slot sets a text size, not padding.",
      });
    }
  }
  if (textSlot && (value.spacing !== undefined || value.paddingPx !== undefined)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["slotId"], message: "This slot does not accept a spacing or padding value." });
  }
});

export type SiteContentOverrideInput = z.infer<typeof siteContentOverrideInputSchema>;

/** The page a slot belongs to, taken from the registry rather than the caller. */
export function resolveSiteContentSlotPage(slotId: string) {
  return (findSiteContentSlot(slotId) ?? findSiteContentSpacingSlot(slotId) ?? findSiteContentSizeSlot(slotId))?.page;
}

/**
 * An override whose every field is empty carries no information, so it is
 * deleted instead of stored - keeping "no row" the single meaning of default.
 */
export function isEmptySiteContentOverride(input: SiteContentOverrideInput) {
  const text = input.text?.trim();
  return !text && input.textSizePx == null && input.paddingPx == null && !input.spacing;
}

/**
 * A block always names an anchor the registry declares, so an Admin cannot
 * place content anywhere a page has not made room for it.
 */
export const siteContentBlockInputSchema = z.object({
  anchorId: z.string().trim().min(1).max(120),
  heading: z.string().trim().max(MAX_SITE_CONTENT_BLOCK_HEADING).nullish(),
  body: z.string().trim().max(MAX_SITE_CONTENT_BLOCK_BODY).nullish(),
  tone: z.enum(siteContentBlockTones).default("info"),
  active: z.boolean().default(true),
}).superRefine((value, ctx) => {
  if (!findSiteContentAnchor(value.anchorId)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["anchorId"], message: "Unknown anchor." });
  }
  // A block with no heading and no body would render as an empty box.
  if (!value.heading?.trim() && !value.body?.trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["heading"], message: "Add a heading or body text." });
  }
});

export type SiteContentBlockInput = z.infer<typeof siteContentBlockInputSchema>;

export function resolveSiteContentAnchorPage(anchorId: string) {
  return findSiteContentAnchor(anchorId)?.page;
}

/**
 * The option-catalog admin inputs. They live here beside the site-content
 * schemas because both power the same Dynamic Section of the Admin panel.
 */
export const optionCatalogSchema = z.enum(optionCatalogIds);

export const optionCatalogNameSchema = z
  .string()
  .trim()
  .min(1, "Enter a name.")
  .max(MAX_OPTION_NAME_LENGTH, `Keep the name under ${MAX_OPTION_NAME_LENGTH} characters.`);

/** The two large catalogs, searched and paged rather than listed whole. */
export const largeCatalogSchema = z.enum(largeCatalogIds);

export const largeCatalogNameSchema = z
  .string()
  .trim()
  .min(1, "Enter a name.")
  .max(MAX_LARGE_CATALOG_NAME_LENGTH, `Keep the name under ${MAX_LARGE_CATALOG_NAME_LENGTH} characters.`);

/**
 * City & Location. A tree rather than a list, so an id is a string the caller
 * read off a row, never something it composed.
 */
export const locationIdSchema = z.string().trim().min(1).max(MAX_LOCATION_ID_LENGTH);

export const locationTypeSchema = z.enum(locationTypes);

export const locationLabelSchema = z
  .string()
  .trim()
  .min(1, "Enter a name.")
  .max(MAX_LOCATION_LABEL_LENGTH, `Keep the name under ${MAX_LOCATION_LABEL_LENGTH} characters.`);
