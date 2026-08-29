# Tutor Profile Field Decisions

This document records approved field-level decisions from the Tutor Profile discovery session. It intentionally excludes visibility, approval, and verification rules, which will be decided later.

## Confirmed Profile Sections

The Tutor Profile will include all eight sections: Profile Identity; Contact & Location; Academic Information; Teaching Expertise; Tuition Preferences; Language & Communication; About the Tutor; and Profile System Information.

## Confirmed Field Decisions — Batch 1

| Area | Decision |
|---|---|
| Profile photo | Required |
| Date of birth | Required; store the Tutor's exact birth date rather than an age or age range |
| Short headline | Required; for example, “Experienced Mathematics Tutor for SSC Students” |
| Additional teaching areas | A Tutor can select multiple teaching areas |
| Teaching-area selector | Use the current Bangladesh location catalog as a searchable multi-select dropdown |
| Online availability nationwide | Required |
| Institution location | Excluded |
| Current study status | Include Studying, Graduated, and Professional |
| Graduation year | Optional |

## Discovery Scope

This document now records all confirmed Tutor Profile information fields. Public/private visibility, Admin approval, verification documents, and profile-completion rules remain deliberately outside this field-first discovery scope.

## Confirmed Field Decisions — Academic Information and Teaching Expertise

| Area | Decision |
|---|---|
| Highest education | Optional |
| Institution name | Required; select from a searchable dropdown that contains Bangladesh public and private universities |
| Faculty / department | Required; after selecting an institution, display that institution's faculty and department options in a searchable dependent dropdown |
| Degree / major subject | Required; after selecting a faculty or department, display its degree or major subjects in a searchable dependent dropdown |
| Primary subjects | Tutor can select one or more subjects they want to teach |
| Additional subjects | Tutor can select one or more subjects they want to teach |
| Class / level | Tutor can select multiple available classes or levels they want to teach |
| Curriculum | Include the available curriculum catalog and allow one or more selections |
| Teaching experience | Required; collect a duration in years |
| Prior teaching experience | Optional detailed written description |
| Special expertise | Optional |
| Student types | Tutor can select multiple student types |
| Academic achievement | Optional |

## Academic Selector Catalog Data Model

The Tutor Profile academic selector will use a three-level dependent catalog. A Tutor first selects a university, then a faculty or department that belongs to that university, and finally a degree or major subject that belongs to that faculty or department. Each selector must support case-insensitive search by its display name.

| Entity | Required fields | Relationship rule |
|---|---|---|
| University | `id`, `name`, `type`, `countryCode`, `isActive` | Contains zero or more Faculty/Department records. `type` is Public or Private; the initial catalog scope is Bangladesh. |
| Faculty / Department | `id`, `universityId`, `name`, `isActive` | Belongs to one University and contains zero or more Degree/Major records. Only records matching the selected `universityId` are shown. |
| Degree / Major | `id`, `facultyDepartmentId`, `name`, `degreeLevel`, `isActive` | Belongs to one Faculty/Department. Only records matching the selected `facultyDepartmentId` are shown. |
| Tutor academic profile selection | `tutorId`, `universityId`, `facultyDepartmentId`, `degreeMajorId` | Stores one valid selection chain. The selected Faculty/Department must belong to the stored University, and the selected Degree/Major must belong to the stored Faculty/Department. |

The client flow is University → Faculty/Department → Degree/Major. Changing a parent selection clears its dependent child selections to prevent invalid combinations. The catalog should return only active records, while Admin management can retain inactive historical records for existing Tutor profiles.

## Confirmed Field Decisions — Tuition, Language, Communication, and Biography

| Area | Decision |
|---|---|
| Tuition type | Include Home Tuition, Online Tuition, and Both |
| Preferred student gender | Include Male, Female, and Both |
| Preferred class size | Include One-to-one, Small group, and Group; allow one or more selections |
| Preferred teaching days | Allow multiple weekday selections |
| Preferred time slots | Include Morning, Afternoon, Evening, and Flexible; allow one or more selections |
| Monthly fee | Collect a fee range rather than an exact fee |
| Minimum monthly fee | Excluded |
| Fee negotiable | Excluded |
| Travel distance | Optional |
| Teaching languages | Allow one or more selections |
| Communication preference | Include Phone, WhatsApp, and Platform message; allow one or more selections |
| Response time | Excluded |
| About me | Optional |
| Teaching approach | Optional |
| Why choose me | Optional |
| Additional notes | Optional |

## Consolidated Approved Field Inventory

### A. Profile Identity

| Field | Requirement |
|---|---|
| Tutor ID | System-generated identity already used in the Tutor Dashboard |
| Registration date | System-generated “Since” date already used in the Tutor Dashboard |
| Full name | Existing registration field |
| Profile photo | Required |
| Gender | Existing registration field |
| Exact birth date | Required |
| Short headline | Required |

### B. Contact and Location

| Field | Requirement |
|---|---|
| Phone number | Existing registration field |
| Email address | Existing registration field |
| Current city and area | Existing Bangladesh registration location fields |
| Teaching areas | Required searchable multi-select using the Bangladesh location catalog |
| Nationwide availability | Required for online coverage |

### C. Academic Information

| Field | Requirement |
|---|---|
| Highest education | Optional |
| Institution name | Required searchable Bangladesh public/private university selector |
| Faculty / department | Required searchable dependent selector |
| Degree / major subject | Required searchable dependent selector |
| Current study status | Required: Studying, Graduated, or Professional |
| Graduation year | Optional |
| Institution location | Excluded |

### D. Teaching Expertise

| Field | Requirement |
|---|---|
| Primary subjects | Required multi-select |
| Additional subjects | Multi-select |
| Class / level | Multi-select from available classes/levels |
| Curriculum | Multi-select from the available curriculum catalog |
| Teaching experience | Required duration in years |
| Prior teaching experience | Optional detailed written description |
| Special expertise | Optional |
| Student types | Multi-select |
| Academic achievement | Optional |

### E. Tuition Preferences

| Field | Requirement |
|---|---|
| Tuition type | Home Tuition, Online Tuition, or Both |
| Preferred student gender | Male, Female, or Both |
| Preferred class size | One-to-one, Small group, and Group; multi-select |
| Preferred teaching days | Multi-select weekdays |
| Preferred time slots | Morning, Afternoon, Evening, Flexible; multi-select |
| Monthly fee | Fee range |
| Minimum monthly fee | Excluded |
| Fee negotiable | Excluded |
| Travel distance | Optional |

### F. Language and Communication

| Field | Requirement |
|---|---|
| Teaching languages | Multi-select |
| Communication preference | Phone, WhatsApp, and Platform message; multi-select |
| Response time | Excluded |

### G. About the Tutor

| Field | Requirement |
|---|---|
| About me | Optional |
| Teaching approach | Optional |
| Why choose me | Optional |
| Additional notes | Optional |

### H. Profile System Information

| Field | Requirement |
|---|---|
| Profile completion percentage | Included; system-generated, visible to the Tutor, and not Tutor-editable |
| Last updated date | Included; system-generated, visible to the Tutor, and not Tutor-editable |
| Profile status | Included; system-managed, visible to the Tutor, and not Tutor-editable |
| Account status | Included; system-managed, visible to the Tutor, and not Tutor-editable |
| Assigned request count | Included; system-generated, visible to the Tutor, and not Tutor-editable |

## Handoff to Technical Specification

The complete field-first Tutor Profile inventory is approved. The next stage is to define technical behavior, validation, data ownership, public/private visibility, Admin approval, verification documents, profile-completion rules, and acceptance criteria. Those workstreams were intentionally excluded from this field-first discovery stage.
