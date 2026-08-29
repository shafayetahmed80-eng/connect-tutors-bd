-- Additive, idempotent sub-area catalog correction.
-- Existing location IDs are retained so saved Tutor Profile selections remain valid.

INSERT INTO locations (id, label, type, country, parentId, enabled) VALUES
  ('dhaka-mirpur-section-1', 'Mirpur 1', 'subdivision', 'Bangladesh', 'dhaka-thana-mirpur', 1),
  ('dhaka-mirpur-section-2', 'Mirpur 2', 'subdivision', 'Bangladesh', 'dhaka-thana-mirpur', 1),
  ('dhaka-mirpur-section-6', 'Mirpur 6', 'subdivision', 'Bangladesh', 'dhaka-thana-mirpur', 1),
  ('dhaka-mirpur-section-10', 'Mirpur 10', 'subdivision', 'Bangladesh', 'dhaka-thana-mirpur', 1),
  ('dhaka-mirpur-section-11', 'Mirpur 11', 'subdivision', 'Bangladesh', 'dhaka-thana-mirpur', 1),
  ('dhaka-mirpur-section-12', 'Mirpur 12', 'subdivision', 'Bangladesh', 'dhaka-thana-mirpur', 1),
  ('dhaka-mirpur-section-13', 'Mirpur 13', 'subdivision', 'Bangladesh', 'dhaka-thana-mirpur', 1),
  ('dhaka-mirpur-section-14', 'Mirpur 14', 'subdivision', 'Bangladesh', 'dhaka-thana-mirpur', 1),
  ('dhaka-uttara-sector-1', 'Uttara Sector 1', 'subdivision', 'Bangladesh', 'dhaka-thana-uttara', 1),
  ('dhaka-uttara-sector-2', 'Uttara Sector 2', 'subdivision', 'Bangladesh', 'dhaka-thana-uttara', 1),
  ('dhaka-uttara-sector-3', 'Uttara Sector 3', 'subdivision', 'Bangladesh', 'dhaka-thana-uttara', 1),
  ('dhaka-uttara-sector-4', 'Uttara Sector 4', 'subdivision', 'Bangladesh', 'dhaka-thana-uttara', 1),
  ('dhaka-uttara-sector-5', 'Uttara Sector 5', 'subdivision', 'Bangladesh', 'dhaka-thana-uttara', 1),
  ('dhaka-uttara-sector-6', 'Uttara Sector 6', 'subdivision', 'Bangladesh', 'dhaka-thana-uttara', 1),
  ('dhaka-uttara-sector-7', 'Uttara Sector 7', 'subdivision', 'Bangladesh', 'dhaka-thana-uttara', 1),
  ('dhaka-uttara-sector-8', 'Uttara Sector 8', 'subdivision', 'Bangladesh', 'dhaka-thana-uttara', 1),
  ('dhaka-uttara-sector-9', 'Uttara Sector 9', 'subdivision', 'Bangladesh', 'dhaka-thana-uttara', 1),
  ('dhaka-uttara-sector-10', 'Uttara Sector 10', 'subdivision', 'Bangladesh', 'dhaka-thana-uttara', 1),
  ('dhaka-uttara-sector-11', 'Uttara Sector 11', 'subdivision', 'Bangladesh', 'dhaka-thana-uttara', 1),
  ('dhaka-uttara-sector-12', 'Uttara Sector 12', 'subdivision', 'Bangladesh', 'dhaka-thana-uttara', 1),
  ('dhaka-uttara-sector-13', 'Uttara Sector 13', 'subdivision', 'Bangladesh', 'dhaka-thana-uttara', 1),
  ('dhaka-uttara-sector-14', 'Uttara Sector 14', 'subdivision', 'Bangladesh', 'dhaka-thana-uttara', 1),
  ('dhaka-uttara-sector-15', 'Uttara Sector 15', 'subdivision', 'Bangladesh', 'dhaka-thana-uttara', 1),
  ('dhaka-uttara-sector-16', 'Uttara Sector 16', 'subdivision', 'Bangladesh', 'dhaka-thana-uttara', 1),
  ('dhaka-uttara-sector-17', 'Uttara Sector 17', 'subdivision', 'Bangladesh', 'dhaka-thana-uttara', 1),
  ('dhaka-uttara-sector-18', 'Uttara Sector 18', 'subdivision', 'Bangladesh', 'dhaka-thana-uttara', 1),
  ('chattogram-halishahar-block-a', 'Halishahar Block A', 'subdivision', 'Bangladesh', 'chattogram-thana-halishahar', 1),
  ('chattogram-halishahar-block-b', 'Halishahar Block B', 'subdivision', 'Bangladesh', 'chattogram-thana-halishahar', 1),
  ('chattogram-halishahar-block-c', 'Halishahar Block C', 'subdivision', 'Bangladesh', 'chattogram-thana-halishahar', 1),
  ('chattogram-halishahar-block-d', 'Halishahar Block D', 'subdivision', 'Bangladesh', 'chattogram-thana-halishahar', 1),
  ('chattogram-halishahar-block-e', 'Halishahar Block E', 'subdivision', 'Bangladesh', 'chattogram-thana-halishahar', 1),
  ('chattogram-halishahar-block-f', 'Halishahar Block F', 'subdivision', 'Bangladesh', 'chattogram-thana-halishahar', 1),
  ('chattogram-halishahar-block-g', 'Halishahar Block G', 'subdivision', 'Bangladesh', 'chattogram-thana-halishahar', 1),
  ('chattogram-halishahar-block-h', 'Halishahar Block H', 'subdivision', 'Bangladesh', 'chattogram-thana-halishahar', 1)
ON DUPLICATE KEY UPDATE
  label = VALUES(label),
  type = VALUES(type),
  country = VALUES(country),
  parentId = VALUES(parentId),
  enabled = VALUES(enabled);

-- Canonical spelling used by the product and supplied hierarchy.
UPDATE locations SET label = 'Chattogram' WHERE id = 'chattogram-city';
UPDATE locations SET label = 'Sirajganj' WHERE id = 'sirajganj-city';
UPDATE locations SET label = 'Chittagong' WHERE id = 'chittagong-city';

-- Keep city-scoped search deterministic while retaining legacy IDs for hydration.
-- The application search contract deduplicates same-parent labels and supports parentId filtering.
