-- Migration 103: Fix fleet_units.images column type
-- Problem: Local DB has `images TEXT` (65KB max). Base64 images exceed this limit,
-- causing silent truncation without STRICT_TRANS_TABLES, resulting in invalid JSON
-- that parseImages cannot parse, returning [] and showing the default fallback image.
-- Prod DB already has LONGTEXT (correct). This aligns local schema with prod.

ALTER TABLE fleet_units
  MODIFY COLUMN images LONGTEXT DEFAULT NULL;
