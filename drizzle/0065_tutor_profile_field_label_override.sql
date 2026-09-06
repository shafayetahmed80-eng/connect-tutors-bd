-- Owner-set label wording for individual Tutor Profile fields, on top of the
-- shipped defaults in shared/tutor-profile-field-registry.ts. NULL keeps the
-- registry label - the same sparse-overrides shape as the section/order/
-- enabled/required columns already on this table.
ALTER TABLE `tutor_profile_field_overrides` ADD COLUMN `label` varchar(120);
