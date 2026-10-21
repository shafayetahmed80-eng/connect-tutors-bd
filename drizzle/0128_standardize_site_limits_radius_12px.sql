-- Standardize dynamic site limits for corner radius to unified 12px
UPDATE `site_limits`
SET `value` = 12
WHERE `limitId` IN (
  'modal.radius',
  'nav.tabRadius',
  'nav.pillTabRadius',
  'nav.itemRadius',
  'nav.sectionRadius',
  'inputRadius.profile',
  'inputRadius.journey'
);
