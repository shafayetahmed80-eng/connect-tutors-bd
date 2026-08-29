# Catalog review evidence

## Location evidence

The Uttara reference identifies Uttara Model Town as administratively divided into sectors and states that the neighborhood has 18 sectors. Source: https://en.wikipedia.org/wiki/Uttara_(neighbourhood)

The Halishahar Thana reference lists special subdivisions including Block A, Block B, Block I, Block J, Block K, Block L, Block G, Block H, and Block Z, and separately describes Anandabazar and the Halishahar Housing Estate. Source: https://en.wikipedia.org/wiki/Halishahar_Thana

## Academic evidence

The official University of Chittagong Faculty/Department page uses the canonical institution name “University of Chittagong” and lists faculties such as Faculty of Arts and Humanities, Faculty of Science, Faculty of Business Administration, Faculty of Social Sciences, Faculty of Law, Faculty of Biological Sciences, Faculty of Engineering, Faculty of Education, Faculty of Marine Sciences and Fisheries, and Faculty of Medicine. It lists department names including Bangla, English, History, Physics, Chemistry, Mathematics, Accounting, Management, Finance, Marketing, Computer Science & Engineering, Electrical and Electronic Engineering, and others. Source: https://cu.ac.bd/faculty-dept-inst/

The official Chittagong Medical College site uses the canonical institution name “Chittagong Medical College” and identifies the institution at 57, K B Fazlul Quader Road, Chattogram. Source: https://cmc.gov.bd/

## Live database audit evidence

The current live location catalog contains true same-city, same-type duplicates such as duplicate area rows for Agrabad, GEC Circle, Jamal Khan, Lalkhan Bazar, Muradpur, Nasirabad, Pahartali, Patenga, and many Dhaka areas. It also contains intentional cross-city label reuse, such as Kotwali or College Road, which must remain distinct by stable ID and parent city.

The location hierarchy currently has many areas directly under the city rather than under their relevant thana. This prevents a selected thana from exposing its own child areas and explains the missing Mirpur/Uttara/Halishahar subdivision behavior.

The academic audit query must use deployed snake_case table names (`academic_faculties`, `faculty_departments`) rather than TypeScript property names. The schema has unique normalized-name constraints for universities, faculties, and departments, but the seed/import path still requires canonical-name and parent-scope verification.
