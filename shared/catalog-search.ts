/**
 * Ceiling for a single catalog search request, shared by the server schema and
 * the client queries so the two cannot drift.
 *
 * Sized to clear the largest catalogs outright - 311 institutes and 267
 * departments - rather than merely most searches. A truncated page is not just
 * a missing search result: the profile editor seeds its box from the option
 * matching the saved id, so an institute that fell off the page rendered as an
 * empty field on a profile that actually had one selected.
 *
 * It stays a ceiling rather than "everything" so one request can never be made
 * to pull an unbounded table.
 */
export const CATALOG_SEARCH_LIMIT = 400;
