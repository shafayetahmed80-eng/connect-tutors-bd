/**
 * Which version of the Terms of Use and Privacy Policy someone agreed to.
 *
 * One constant, because there is one pair of documents: a Tutor and a Guardian
 * tick the same box and follow the same two links. Two constants would drift,
 * and then a consent record would say which version somebody agreed to without
 * that meaning the same thing on both sides.
 *
 * Raise this when the documents change. Rows keep the version they were signed
 * under, which is the entire point of storing it rather than a boolean.
 */
export const TERMS_VERSION = "draft-2026-08-20";
