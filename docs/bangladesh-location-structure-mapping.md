# Bangladesh Location Structure Mapping

## Source

The product owner supplied `BangladeshLocationLists—AllDivisionalCities+Tangail&Sirajganj(Website-Ready).md` on 19 August 2026. It defines a Bangladesh-focused hierarchy for the eight divisional cities—Dhaka, Chattogram, Rajshahi, Khulna, Barishal, Sylhet, Rangpur, and Mymensingh—plus Cumilla, Gazipur, Narayanganj, Tangail, and Sirajganj. Its entries include city thanas, district upazilas, popular localities, and special subdivisions such as Uttara sectors, Mirpur sections, and Halishahar blocks.

## Current Platform Mapping

| Supplied hierarchy | Current data model | Required treatment |
|---|---|---|
| Divisional city or district | `locations` record with `type` of `city` or `district` | Retain stable IDs and parent relationships. |
| City thana | Not separately represented | Add as a searchable child location without invalidating existing city or area selections. |
| District upazila | Not separately represented | Add as a searchable child location scoped to its district/city. |
| Popular locality | Existing `area` record | Expand and normalise under the closest thana, upazila, or city parent. |
| Sector, section, or block | Not separately represented | Add as an `area` child of its parent locality, preserving the visible hierarchy in search labels. |

The active schema currently permits only `country`, `division`, `district`, `city`, and `area` types, and the existing Tutor Profile stores a single current-location ID plus up to fifteen teaching-area IDs. Any implementation must preserve valid existing IDs, keep public/private profile boundaries unchanged, and avoid exposing raw storage or private contact data.

## Implementation Constraint

The supplied file is the product owner's requested catalog source. The update should be additive and idempotent: existing Tutor Profile selections must remain valid, while new selector search results expose an intelligible Bangladesh hierarchy.
