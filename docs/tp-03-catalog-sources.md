# TP-03 — Academic Catalog Source Register

## Authoritative university source

The Bangladesh **University Grants Commission (UGC)** university directory is the source of record for the initial `universities` catalog. The public and private university lists were reviewed on 18 August 2026.

| Catalog subset | Authoritative URL | Use in TP-03 |
|---|---|---|
| Public universities | <http://www.ugc-universities.gov.bd/> | Seed the current UGC-listed public institutions. |
| Private universities | <http://www.ugc-universities.gov.bd/private-universities> | Seed the current UGC-listed private institutions, preserving the institution name as published. |

The public page listed 59 institutions at review time. The private page is longer and contains current regulatory notices for particular institutions. A university appearing in the UGC directory is not automatically treated as a statement about current admissions, quality, ranking, or programme availability.

## TP-03 seed-data boundary

TP-03 creates a **stable selector catalog**, not a claim that every programme at every institution is current. The dataset is therefore divided as follows:

| Entity | Initial source and coverage | Boundary |
|---|---|---|
| Universities | UGC public/private directory | Institution names from the public and private directory sections; the current schema does not persist a public/private category. The catalog can later receive status and source-refresh metadata. |
| Faculties/departments | Curated common Bangladesh higher-education disciplines | Only options linked to universities where they are widely established and manually curated; not an inferred complete programme inventory. |
| Degree/major options | Curated common degree and major options | Linked to the relevant faculty/department; does not represent an official programme catalogue. |
| Teaching subjects | Curated Bangladesh school, college, admission-test, language and skills subjects | Independent from university programmes because they represent what a Tutor can teach. |

## Data handling rules

1. Preserve the display name used by the source, while generating a deterministic lower-case normalized name for uniqueness and search.
2. Use a non-destructive, idempotent upsert: re-running the seed must not create duplicate catalog rows or alter Tutor selections.
3. Keep `active` and `sortOrder` explicit on every seed row.
4. Do not auto-scrape or infer department and programme availability from university names.
5. Preserve source caveats separately from the user-facing selector until a future catalog-governance workflow is approved.

## 2026-09-01 expansion — medical/dental colleges, DU seven colleges, "Others"

The Institute selector was limited to universities, which excluded the many
tutors who studied MBBS/BDS or Honours at a college. Added, from UGC / BMDC
(bmdc.org.bd) / DGHS (dghs.gov.bd) sourced compilations, cross-checked against
the consolidated Wikipedia lists:

| New `bangladesh-universities.json` key | Count | Notes |
|---|---|---|
| `government_medical_colleges` | 37 | DGHS list |
| `army_medical_colleges` | 7 | incl. Navy Medical College, Chattogram (2024) |
| `private_medical_colleges` | 68 | BMDC-recognised |
| `dental_colleges` | 13 | Dhaka Dental College (govt) + 12 standalone private; in-medical-college dental *units* are represented by their parent college, not listed separately |
| `affiliated_colleges` | 7 | the former Dhaka-University "seven colleges", now under Dhaka Central University: Dhaka College, Govt Bangla College, Govt Titumir College, Eden Mohila College, Kabi Nazrul Govt College, Govt Shaheed Suhrawardy College, Begum Badrunnessa Govt Girls' College |
| `other` | 1 | `Others` — catch-all; spread first so it sorts to the top of Institute search |

Every medical/dental entry carries a minimal `Faculty of Medicine` / `Faculty of
Dentistry` with `MBBS` / `BDS` / `Others` departments so the required
Institute → Faculty → Department chain is completable. The seven colleges carry a
four-faculty Arts/Social Science/Science/Business block.

Name corrections applied in the same pass: `Bogura Science and Technology
University` → `University of Bogura`; `Rabindra Paitar University (RP Shaha
University)` → `Ranada Prasad Shaha University (RP Shaha University)` (district
Kushtia → Narayanganj); merged the duplicate Gopalganj Science and Technology
University rows; added the missing public `Rabindra University, Bangladesh`
(Shahjadpur, Sirajganj) and nine missing private universities (Central Women's
University, East Delta University, Chittagong Independent University, Southern
University Bangladesh, Metropolitan University, Prime University, Ishakha
International University, ZH Sikder University of Science & Technology, Bangladesh
University of Health Sciences).

The seed now also **deactivates** any Institute row whose normalized name is no
longer in the directory (renames / removed duplicates), so stale options stop
being offered while existing tutor selections still resolve.

**Deploy:** run `node scripts/seed-tutor-profile-catalog.mjs` (or
`scripts/apply-bd-university-hierarchy.mjs`) against each environment after
deploy — no schema migration is required.

## 2026-09-10 expansion — the institutes UGC's list never had, and Master's fields

A Tutor reported Islamic University of Technology missing. The cause was
structural, not a typo: the 2026-09-01 pass was built from UGC's registers, and
IUT is not on them — it is run by the Organisation of Islamic Cooperation under
its own charter. Cross-checking the consolidated Wikipedia list of universities
in Bangladesh showed it names a third category, "International universities",
holding exactly two institutions, and both were absent here.

| New `bangladesh-universities.json` key | Count | Source |
|---|---|---|
| `international_universities` | 2 | Islamic University of Technology (OIC, Gazipur); Asian University for Women (own Act, Chattogram) |
| `textile_engineering_colleges` | 12 | The 9 BUTEX-affiliated colleges plus Tangail and Narsingdi (BUTEX academic supervision), and the DU-affiliated NITER, Savar |
| `alternative_medicine_colleges` | 2 | The two government degree colleges at Mirpur, Dhaka |

Institutes: **311 → 327** (295 → 311 selectable; the 16 non-Active entries are
unchanged). The 37 government / 68 private / 7 military medical colleges and 13
dental colleges were re-checked against the same Wikipedia list and match
exactly, so nothing was missing there.

**Not added, deliberately.** Nursing colleges and the private homeopathic /
Unani / Ayurvedic colleges run to several hundred, and no list of them could be
verified against a source. A college name invented here is worse than one
absent: a Tutor cannot find their own and cannot tell why. They reach "Others"
until an authoritative list (BNMC; the Board of Homoeopathic and Ayurvedic
Systems of Medicine) can be worked through.

### Department/Subject: Honours only → Honours and Master's

The vocabulary's own metadata said it covered "Honours/Bachelor/Undergraduate
fields", and it did — which meant every postgraduate-only discipline was
missing. Checking it against the departments the large universities actually
run also turned up Honours-level gaps, the worst being **Psychology**: the list
had "Educational Psychology and Guidance" and nothing else, while Dhaka,
Rajshahi, Chattogram and Jahangirnagar all run a Psychology department and
Dhaka runs Clinical and Educational & Counselling Psychology besides.

**267 → 356** (89 added, none duplicating an existing name):

| Block | Count | Examples |
|---|---|---|
| Honours-level gaps | 17 | Psychology, Clinical Psychology, Museology, Printing and Publication Studies, Meteorology, Glass and Ceramic Engineering, Forestry and Wood Technology, Government and Politics, Al-Fiqh and Legal Studies |
| Medical specialities (MD/MS/MPhil) | 36 | Medicine, Surgery, Cardiology, Neurology, Anaesthesiology, Pathology, Community Medicine, Forensic Medicine |
| Dental specialities | 8 | Oral and Maxillofacial Surgery, Orthodontics, Prosthodontics, Periodontology |
| Public health and health sciences | 8 | Epidemiology, Biostatistics, Health Informatics, Hospital Management |
| Engineering specialisations (MSc) | 12 | Structural, Geotechnical, Transportation, Power Systems, Water Resources Development |
| Social science, education and other | 8 | Counselling Psychology, Security Studies, Diplomacy and International Affairs, Educational Administration |

"Others" stays last in the department list — the seed derives `sortOrder` from
array index, so anything appended after it would sort below the catch-all.

**Deploy per environment:** `npm run db:seed:tutor-profile-catalog`. No
migration; the seed is an idempotent upsert and deactivates rather than deletes.
