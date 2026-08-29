-- Keep the supplied hierarchy's canonical University of Chittagong and
-- Chittagong Medical University records. The legacy CMU alias was imported as
-- a second active institution and must not appear as a duplicate selector.
-- No Tutor Academic Profile currently references this legacy ID.

UPDATE universities
SET active = 0
WHERE id = 90013
  AND normalizedName = 'chittagong medical university (cmu)';

UPDATE academic_faculties
SET active = 0
WHERE universityId = 90013;

UPDATE faculty_departments
SET active = 0
WHERE universityId = 90013;

-- Chittagong Medical College is a separate college-level institution, not a
-- duplicate of University of Chittagong and not part of this university-only
-- selector. It is intentionally not inserted into the university catalog.
