-- TP-02 clean-migration verification queries.
-- Run only against the isolated connect_tutors_bd_tp02_verify database.

SELECT 'migration_ledger' AS verification_section;
SELECT COUNT(*) AS applied_migration_count FROM __drizzle_migrations;

SELECT 'tp02_tables' AS verification_section;
SELECT table_name
FROM information_schema.tables
WHERE table_schema = DATABASE()
  AND table_name IN (
    'class_levels',
    'curricula',
    'degree_majors',
    'faculty_departments',
    'languages_catalog',
    'student_types',
    'subjects_catalog',
    'tutor_academic_profiles',
    'tutor_class_levels',
    'tutor_communication_preferences',
    'tutor_curricula',
    'tutor_preferred_class_sizes',
    'tutor_preferred_teaching_days',
    'tutor_preferred_time_slots',
    'tutor_student_types',
    'tutor_subjects',
    'tutor_teaching_areas',
    'tutor_teaching_languages',
    'universities'
  )
ORDER BY table_name;

SELECT 'tutor_profile_columns' AS verification_section;
SELECT column_name, column_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = DATABASE()
  AND table_name = 'tutors'
  AND column_name IN (
    'profilePhotoKey',
    'dateOfBirth',
    'nationwideAvailability',
    'teachingExperienceYears',
    'priorTeachingExperience',
    'specialExpertise',
    'academicAchievement',
    'monthlyFeeMin',
    'monthlyFeeMax',
    'travelDistanceKm',
    'preferredStudentGender',
    'teachingApproach',
    'whyChooseMe',
    'additionalNotes'
  )
ORDER BY column_name;

SELECT 'tp02_constraints' AS verification_section;
SELECT table_name, constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_schema = DATABASE()
  AND table_name IN (
    'degree_majors',
    'faculty_departments',
    'tutor_academic_profiles',
    'tutor_class_levels',
    'tutor_curricula',
    'tutor_student_types',
    'tutor_subjects',
    'tutor_teaching_areas',
    'tutor_teaching_languages'
  )
  AND constraint_type IN ('PRIMARY KEY', 'UNIQUE', 'FOREIGN KEY')
ORDER BY table_name, constraint_type, constraint_name;

SELECT 'tp02_lookup_indexes' AS verification_section;
SELECT table_name, index_name, GROUP_CONCAT(column_name ORDER BY seq_in_index) AS index_columns
FROM information_schema.statistics
WHERE table_schema = DATABASE()
  AND table_name IN (
    'class_levels',
    'curricula',
    'degree_majors',
    'faculty_departments',
    'languages_catalog',
    'student_types',
    'subjects_catalog',
    'tutor_academic_profiles',
    'tutor_class_levels',
    'tutor_curricula',
    'tutor_student_types',
    'tutor_subjects',
    'tutor_teaching_areas',
    'tutor_teaching_languages'
  )
GROUP BY table_name, index_name
ORDER BY table_name, index_name;
