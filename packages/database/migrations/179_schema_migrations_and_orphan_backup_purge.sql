-- ============================================================
-- Migration 179: schema_migrations + purga de respaldos zz_ — FC197 F1
--   (Database_Parity_Verification_And_Schema_Migrations)
-- Context: directiva de Ω (2026-09-24): el esquema local y el de producción deben ser espejo
--          perfecto y toda migración va PRIMERO a local y DESPUÉS a prod. Hasta hoy no había
--          registro de qué migraciones tiene cada base: la paridad solo se probaba con un diff
--          manual. Dictámenes O 396/401/403/405/407_AN · R 402/404/406/408_AN.
--
-- 1) schema_migrations: una fila por ARCHIVO aplicado. La llave es el nombre completo porque hay
--    números repetidos (012, 059, 062, 125, 126, 127) y sufijos con letra (125z_, 127z_).
--    checksum_sha256 = SHA-256 del contenido SIN ningún '\r' (idéntico a `tr -d '\r' | sha256sum`):
--    con core.autocrlf la misma migración tiene CRLF en Windows y LF en git/Linux.
-- 2) Purga de las 28 tablas zz_ (decisión de Ω, 3b): 27 respaldos zz_fc062_* / zz_fc062f6_* de
--    las migraciones 156/157 (julio, FC062; entre ellos una copia de users) y
--    zz_fc067_orphan_universe_superclusters_bak (creada a mano en prod en FC067, 20 filas de los
--    tenants de prueba 9042–9045). Respaldo: el volcado completo de producción que Ω custodia.
--    Nombres EXPLÍCITOS (lista cerrada de 408_AN): 0 DROP de tablas operativas, 0 SQL dinámico.
-- 3) Línea base: las 173 migraciones anteriores a esta, generadas por
--    `bun scripts/dbBaselineMigrations.ts` (la prueba scripts/dbBaselineMigrations.test.ts verifica
--    que este bloque coincide con los archivos en disco). INSERT IGNORE: re-aplicar no duplica.
--    Esta misma 179 no puede llevar su propio checksum: la registra F2 (workflow / runner local).
--
-- Idempotente: CREATE TABLE IF NOT EXISTS, DROP TABLE IF EXISTS, INSERT IGNORE.
-- Orden (R-DB-PARITY): PRIMERO local, verificar, y DESPUÉS prod vía db-migrations.yml.
-- ============================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS schema_migrations (
  filename         VARCHAR(255) NOT NULL,
  checksum_sha256  VARCHAR(64)  NOT NULL,
  executed_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  executed_by      VARCHAR(100) NOT NULL,
  environment      VARCHAR(32)  NOT NULL,
  PRIMARY KEY (filename)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── Purga de respaldos zz_ (28, lista cerrada) ─────────────────────────────
DROP TABLE IF EXISTS zz_fc062_bak_financial_transactions;
DROP TABLE IF EXISTS zz_fc062_bak_fleet_movements;
DROP TABLE IF EXISTS zz_fc062_bak_fleet_units;
DROP TABLE IF EXISTS zz_fc062_bak_maintenance_details;
DROP TABLE IF EXISTS zz_fc062_bak_maintenance_extensions;
DROP TABLE IF EXISTS zz_fc062_bak_route_checkpoints;
DROP TABLE IF EXISTS zz_fc062_bak_route_extensions;
DROP TABLE IF EXISTS zz_fc062_bak_route_incidents;
DROP TABLE IF EXISTS zz_fc062_bak_unit_activity_logs;
DROP TABLE IF EXISTS zz_fc062_bak_upa_work_order_tasks;
DROP TABLE IF EXISTS zz_fc062_bak_upa_work_orders;
DROP TABLE IF EXISTS zz_fc062f6_bak_areas;
DROP TABLE IF EXISTS zz_fc062f6_bak_financial_transactions;
DROP TABLE IF EXISTS zz_fc062f6_bak_fleet_movements;
DROP TABLE IF EXISTS zz_fc062f6_bak_fleet_units;
DROP TABLE IF EXISTS zz_fc062f6_bak_notifications_outbox;
DROP TABLE IF EXISTS zz_fc062f6_bak_owner_specialties;
DROP TABLE IF EXISTS zz_fc062f6_bak_route_checkpoints;
DROP TABLE IF EXISTS zz_fc062f6_bak_route_extensions;
DROP TABLE IF EXISTS zz_fc062f6_bak_route_incidents;
DROP TABLE IF EXISTS zz_fc062f6_bak_tenant_profiles;
DROP TABLE IF EXISTS zz_fc062f6_bak_tenant_service_links;
DROP TABLE IF EXISTS zz_fc062f6_bak_tenant_user_memberships;
DROP TABLE IF EXISTS zz_fc062f6_bak_tenants;
DROP TABLE IF EXISTS zz_fc062f6_bak_upa_work_order_tasks;
DROP TABLE IF EXISTS zz_fc062f6_bak_upa_work_orders;
DROP TABLE IF EXISTS zz_fc062f6_bak_users;
DROP TABLE IF EXISTS zz_fc067_orphan_universe_superclusters_bak;

-- ─── Línea base (173) — generada, no editar a mano ──────────────────────────
-- BEGIN BASELINE
INSERT IGNORE INTO schema_migrations (filename, checksum_sha256, executed_by, environment) VALUES
  ('001_initial_auth_schema.sql', 'ddf7b53c55d0d5fefc38a8755444e5e52bc1e06d9ddd1773740d80e26ee809b0', 'FC197-baseline', 'baseline'),
  ('002_fleet_schema.sql', 'e54db0270459db3684327280d7e4cedb4e00442d17a6672aed7baeaa6163992e', 'FC197-baseline', 'baseline'),
  ('003_advanced_fleet_schema.sql', '6ecdb9be151ea6d30b778a0f7a7110e71d9ac45b674893d51a46faf0db1a8f16', 'FC197-baseline', 'baseline'),
  ('004_fleet_expansion.sql', 'ee91417757e204485179cf9f96cc456b430f3aa0a9f968498c0fa22c402359bc', 'FC197-baseline', 'baseline'),
  ('005_add_tool_asset_type.sql', '60412075a0ace3fa723818eb53be5a8b485e305aa6fb95af9293e8d7d9692c5b', 'FC197-baseline', 'baseline'),
  ('006_fleet_blind_index.sql', '621178cc542630db699dfe89ccfc23934d399747246301ffbb76a9b61fab51ce', 'FC197-baseline', 'baseline'),
  ('007_sovereign_catalog_system.sql', '830c1ddbf58c2f14a6783cc15f9d105bee8bc6e6ff4ad24c0b1b95c87948833f', 'FC197-baseline', 'baseline'),
  ('008_mexican_industrial_infinity.sql', 'b0689a0a6fcde410f37c6bb6e578d72891d2c9af80ef04f291ae6b18f0f4c4ab', 'FC197-baseline', 'baseline'),
  ('009_fleet_predictive_mock.sql', '9e5a6aa27dfa82f25700ade4a677c2144afe79f33259ee23796316e5b27ae491', 'FC197-baseline', 'baseline'),
  ('010_fleet_id_consolidation.sql', '8fd462d2dc6c572064a3be425016d7199ad899c9645eb8779357e0ab83a32b39', 'FC197-baseline', 'baseline'),
  ('011_fleet_analytical_kpis.sql', 'f7e06d30cde87ed9bb15b6ec3351d1c7bf400cd245ff45dcbce87bde9cd84831', 'FC197-baseline', 'baseline'),
  ('012_fix_fleet_status_integrity.sql', '0b6b7aa344bd9958be1108dc2176830bc0376424c27fd536dbd71867b5ac99c3', 'FC197-baseline', 'baseline'),
  ('012_fleet_master_mock.sql', 'caac49002ba9b4c4a32469711cf36f6b7d67f3b6c5b2bf8230048572a2f29d29', 'FC197-baseline', 'baseline'),
  ('013_dynamic_spec_catalogs.sql', '5f2cf18b7b2aa0e13f4083ab86f8a6830a0f6d2f6e35d628e8cf51642ab59557', 'FC197-baseline', 'baseline'),
  ('014_fleet_predictive_strategy.sql', '76475234e437c1eed3dd5ea24d6c8147fd1feb5a9daf0da2b454c367a28deeb7', 'FC197-baseline', 'baseline'),
  ('015_fleet_routes_workflow.sql', '086e51b4ae643f11e2e1a8c0af359a57e9e2f9b346627b2f5a8816bb23032e55', 'FC197-baseline', 'baseline'),
  ('016_archon_identity_v1.sql', '06dee78491351e6cd0685dcfc2977b36f02c5b83e57cff6cba63238f9355940f', 'FC197-baseline', 'baseline'),
  ('017_common_department_catalog.sql', 'ca59ff9afcfcedf3869cb30a6b33237ecd4e8e9453c9cbe7aaa2285a66eda31a', 'FC197-baseline', 'baseline'),
  ('018_master_universal_catalog.sql', 'a417af921e81c519540524e40c6d189c11f174a0df49c808f33eb568eb5d7f1d', 'FC197-baseline', 'baseline'),
  ('019_catalog_reconciliation_v2.sql', 'ec06509913b2cfdf2e9e0abd4bfad8e9761804ddd9fbc9e9cbcbee0427e1682d', 'FC197-baseline', 'baseline'),
  ('020_catalog_normalization_v21.sql', '6bbaa56ada9114c74f76dcaa4a666ad5c077022b9a32b415fb04e13f319d4b08', 'FC197-baseline', 'baseline'),
  ('021_master_normalization_pro.sql', 'eb566661d3f24bd84397b3524e5f8bfa794f80a7d7aa4919f70cebd901299879', 'FC197-baseline', 'baseline'),
  ('022_hierarchical_restoration.sql', '33f70dee8b2243f58ea5670ee05e15fb5227d4a05c3d123b91e6923063ba2d21', 'FC197-baseline', 'baseline'),
  ('024_add_daily_usage_metric.sql', '061553672931f6005e0ead01fe5e474f8983c42ea27b169574cae6934dc412b9', 'FC197-baseline', 'baseline'),
  ('025_seed_client_day_zero_lifecycle.sql', '131f98a018ad4ad207a7f79942ca3232a36a9ad8b899fb5dbf8d48946bce0ad1', 'FC197-baseline', 'baseline'),
  ('026_trimestral_enum_patch.sql', '0db9e4619ddf4d3acb506b4f03831272cf9b27d3f6d5b394460fc394ba031a94', 'FC197-baseline', 'baseline'),
  ('027_purge_maintenance_frequency.sql', '04f65c7cfb30494c549babde61f654ec8b93624404260f71d98e3fdfdc735910', 'FC197-baseline', 'baseline'),
  ('028_master_catalog_normalization.sql', '2f21a0a9a92f7375f053f3baa88e3107edba5b7990e4cfdd34084b93149201b3', 'FC197-baseline', 'baseline'),
  ('029_seed_fleet_registration_folios.sql', '1080eb7b326f442ca6175d18c3cb1117da7c8a5c2ec73690febd01892da33f1d', 'FC197-baseline', 'baseline'),
  ('030_sovereign_asset_management_v39.sql', 'fb0316a10e4a33ef1d9c296b34e31e3a11ad27b04c13f8331ad002634e504ac7', 'FC197-baseline', 'baseline'),
  ('031_machinery_tool_models_v39.sql', '6f1ef50648d744f9027d944d555b6df06797659421292b97052d59eed289f478', 'FC197-baseline', 'baseline'),
  ('032_sovereign_catalog_massive_expansion_v39.sql', 'b005dc13d35aec7b56156561aec5e4bb716ea1b8e43be7ad4d345f1f556c3755', 'FC197-baseline', 'baseline'),
  ('033_machinery_minor_tools_v39.sql', '3cf12e423313295367989b6c787d68b037df7e5aabbe52f1168eed639ae7422b', 'FC197-baseline', 'baseline'),
  ('034_sovereign_master_catalog_apex_expansion_v39.sql', 'bd22fb692381a3707a6943fdf4585b50b02727268dca7c93f9c998ea4160138f', 'FC197-baseline', 'baseline'),
  ('035_consolidated_apex_catalog_v39.sql', '7c395785d8e1d2a138fde3e5de70f947b7787c82d37cc1d23d1813017a9931f0', 'FC197-baseline', 'baseline'),
  ('036_sovereign_industrial_master_catalog_zenith_v39.sql', 'ff4e5e34bdfa0115b4097a38689695ff32b02b75b759caa928910cf39e5e54da', 'FC197-baseline', 'baseline'),
  ('037_sovereign_master_catalog_zenith_consolidated_v39.sql', 'a44cdee7f841149fd433c9ceb576bfd71a07d45ad3d0138c192af94e457f47cc', 'FC197-baseline', 'baseline'),
  ('038_catalog_sanitizer_and_duplicate_fix_v39.sql', 'cb0038d4ef3d272705f7af418c0e8e4c3923287cab31ec62c28d66ce54e2597e', 'FC197-baseline', 'baseline'),
  ('039_sovereign_apex_expansion_phase2_v39.sql', '3db8cdf8a11730de68520efaaf5d3823a9cb12a7bd576830b4b49942630a521a', 'FC197-baseline', 'baseline'),
  ('040_catalog_normalization_v39.sql', 'f9a01811585670f06e9385965cb5ea397f1acd6cdb60e9af75a0a8fe8e945200', 'FC197-baseline', 'baseline'),
  ('041_sovereign_audit_fix_v39.sql', '6efc82ce3b2007591d7dff9c32825ff91347bf27c2a1d50003abc8235a58bef2', 'FC197-baseline', 'baseline'),
  ('042_chevrolet_heavy_metal_expansion_v39.sql', '24861bd87994ce84f9740d6e8a040a4b24bb88ac172c8560b9110d91e3e875d2', 'FC197-baseline', 'baseline'),
  ('043_next_gen_catalog_expansion_v39.sql', '0299449738bae29331029d357d09f949f1d063333693e7a75d047a3fe3fdc12e', 'FC197-baseline', 'baseline'),
  ('045_maintenance_usage_intervals_v39.sql', '1b5f9f40d7135c12a6468d060691b3eb71b999f7567f884d911c576f8d9dce25', 'FC197-baseline', 'baseline'),
  ('046_catalog_sanitization_mastery_v39.sql', '9c343500d2a858b9a6ced61c84d2d371e8be8f7b9b6138f5db32e4a294941cd5', 'FC197-baseline', 'baseline'),
  ('047_sovereign_compliance_expansion_v39.sql', 'f6ece4e79f421bc4666939c4acea506d0eff36f429289a3061cd1329221d7c0d', 'FC197-baseline', 'baseline'),
  ('048_sovereign_identity_unification_v39.sql', '1d02493a76facbb82f148f4d68d6b5026746dfe0099311baae67e470e5b9c970', 'FC197-baseline', 'baseline'),
  ('049_sovereign_catalog_zenith_v39.sql', '1c8477e6abbf190a1fbadd9bbd6687af58b5261dc6140ddd9b9415682a287934', 'FC197-baseline', 'baseline'),
  ('051_convert_capacidad_carga_to_decimal.sql', 'cf65ffb62bf928477b3dcfdd726536456f7f8bb699783e4fa6477cdd53df1730', 'FC197-baseline', 'baseline'),
  ('052_fleet_master_consolidation_v39_9_7.sql', '7799ef289b28b408d2dab11a003360b638cb2cf2afff7dd0accdc56ed4d2a619', 'FC197-baseline', 'baseline'),
  ('053_add_fuel_tank_capacity_v39_9_8.sql', '2cb35967403c63909394a034a8918db59fdf2107de835e1be114f7a7cc0b953b', 'FC197-baseline', 'baseline'),
  ('054_normalize_maintenance_intervals_v2_0.sql', '8393505b9526ab159b2e2e96c92c369543f5a418fb405268a2d5b8db43bacbf8', 'FC197-baseline', 'baseline'),
  ('055_seed_robust_engine_catalog.sql', 'd81e127b3a03d51fe3efadc72ebc084e9e6a89b6b457d90e74f868b59bd60f77', 'FC197-baseline', 'baseline'),
  ('056_seed_client_fleet_v2_0.sql', '968f707d5efc2f8923b98d6fbf4cba3774fd228ebe00be5eac48cd27df56e2ea', 'FC197-baseline', 'baseline'),
  ('057_purge_legacy_fleet_columns.sql', '9b737ccd3431027129d96e5acd0e28ae9c589e81b5ba507ae33d7bbb31b88f62', 'FC197-baseline', 'baseline'),
  ('058_relational_alignment_v2.sql', 'ac7bc62bd86719d4efa2208d397c7e6db30ada1e51a73fedd0242862b83b53cd', 'FC197-baseline', 'baseline'),
  ('059_expand_fuel_catalog.sql', '9cf0856408edd8e07de8f0c2d970de5150ade490c3d78b802c6f2459ccad4953', 'FC197-baseline', 'baseline'),
  ('059_fleet_realism_infusion.sql', 'c76581840d87fff885584141d9fb294229c8c97573b62215f82c17d4c0900faa', 'FC197-baseline', 'baseline'),
  ('060_fleet_units_purification_final.sql', '2174d5c55bc59493199a6293b3a8dffa43ae465f8507c723cda08a5b3694089d', 'FC197-baseline', 'baseline'),
  ('061_total_symmetry_alignment.sql', '815e8e2240780ac67f170b21893630fc213fa95cf1ac3cf9948a43f4bab4d3e3', 'FC197-baseline', 'baseline'),
  ('062_sovereign_alignment_v44_1.sql', '278ae6667778aac9930f6484ccc2032da6cd4945801a25ab511c9aedc5e39bc6', 'FC197-baseline', 'baseline'),
  ('062_sovereign_rebuild.sql', 'a640d6ab2b88096a4bf845a9b8ac1cd121565619b6d7cb104c60ee466eb8fa9e', 'FC197-baseline', 'baseline'),
  ('070_fleet_normalization_sovereign_final.sql', '43a158696985759d5518a13716d6a22cba17baaf2db4e26d2d9a81817cd0be50', 'FC197-baseline', 'baseline'),
  ('071_sovereign_rbac_fortress.sql', '031ed1d758d357427b9969779aca3e795a9b0dfab6aaa6ec619a42f2c274eae9', 'FC197-baseline', 'baseline'),
  ('072_sovereign_catalog_purge.sql', 'a3f0ff78f736285509fc07af74cefa68a2aa3b86b35d25ce88888205375ab0dc', 'FC197-baseline', 'baseline'),
  ('073_sovereign_administrative_audit_vault.sql', 'fefa1b16642367ebfad1c345f25e63fc27789b80fefe5e51483843e23f48eef1', 'FC197-baseline', 'baseline'),
  ('075_forensic_logistics_checklist.sql', 'f7463a2ac41541ea02245b63004f8d60e55a0fbf77581880243a7e07b9ae9600', 'FC197-baseline', 'baseline'),
  ('076_unit_activity_logs_uuid.sql', '553d267fdff70490dc45cb3b7a31768ee5e51a39df5a93e09378317741f744d2', 'FC197-baseline', 'baseline'),
  ('077_normalize_fleet_odometer.sql', '11b0d1f7bad923c8f9aab2c3b3696718de65af2efc6c5a050d3a0411b2b413d8', 'FC197-baseline', 'baseline'),
  ('080_forensic_restoration_recovery.sql', 'de86b57c5fe87ce147c4261876498cc024bfd44489162fba008346cd23c06e0c', 'FC197-baseline', 'baseline'),
  ('081_add_initial_fuel_level.sql', '79fa771a93139d9ad692210729c72771e199128e3dceb69cd13c688d1ff72150', 'FC197-baseline', 'baseline'),
  ('082_maintenance_hybrid_schema.sql', '7fddc4b330a2dca8e67190ba1268fd7b0f3f27ae48f916dfc247b02f8ec3d302', 'FC197-baseline', 'baseline'),
  ('083_kpi_performance_indexes.sql', '8f53ec29eae1444714858b806ee0e8d470b156f00b15787e3274cd5f337b01a1', 'FC197-baseline', 'baseline'),
  ('084_extend_service_mode_enum.sql', '6c5b8f657fd8a2aac55b04d62ca6224f158320d2387d8e0418a4774eec041b51', 'FC197-baseline', 'baseline'),
  ('085_finance_module_tables.sql', '04f2bc032295c449777a625cdc85e68666d77acf1d97caa73569b382a6922603', 'FC197-baseline', 'baseline'),
  ('086_finance_permissions.sql', 'f4ceb3eeac64a8e29d70fdf810a104fa35bfe1129908c681aa7f76b379b13f0d', 'FC197-baseline', 'baseline'),
  ('087_backfill_finance_from_routes.sql', '228fbf5ba9391b932beb0e4756e6afe255b4296c902998a143ee8527395e831f', 'FC197-baseline', 'baseline'),
  ('088_rbac_gaps_route_and_view_permissions.sql', 'cf70d95b12968e1e6ea9f7505df7d576a0933430e0f4b68b411fe6f12b819d11', 'FC197-baseline', 'baseline'),
  ('089_prod_schema_sync.sql', '2fb28670296bca00eda42a7ce40ff47cf4d5d62a80098398f68fdb1ad42eec99', 'FC197-baseline', 'baseline'),
  ('090_add_uuid_to_users.sql', '885a9ef9c87b782e023d55614ba34d55eba61b0d61743456c842bac484c005b0', 'FC197-baseline', 'baseline'),
  ('091_upa_work_orders.sql', 'd563ac03d74198e0c87e1c7335ac90ac65ffb1b4ed553cf04fe527e61a47db67', 'FC197-baseline', 'baseline'),
  ('092_maintenance_upa_link.sql', 'b2e097808b1a1579f132c224a8455f579ef638a7a81f4e955d1c2ee149ee3a8f', 'FC197-baseline', 'baseline'),
  ('093_upa_task_catalog.sql', 'bd0736617e07e7d7a5ba6bc3003f1e1a843741023afda5213d7f4cf94d9c662e', 'FC197-baseline', 'baseline'),
  ('094_rbac_user_roles.sql', '22912d6f6e669a95d4e5221462a99ee87bb0bddf810998dc9d08a4bc296b23d7', 'FC197-baseline', 'baseline'),
  ('095_roles_business_restructure.sql', '53fd358c7308877e9481e61cda5891a08895df3c2c64dacccdd45e6eb1df68dd', 'FC197-baseline', 'baseline'),
  ('096_push_notifications_tokens.sql', 'dbfed30a26922a0280dc45b2f6189087e3f6044986aabdeae9473c2daf4df75a', 'FC197-baseline', 'baseline'),
  ('097_notifications_outbox.sql', '3730103a6a153f638b8bb98c548f7e5aff62728b7e92d0a5ea9c06da3b6dbe57', 'FC197-baseline', 'baseline'),
  ('098_financial_alerts_index.sql', 'de5bd202fe2679952b3a48921fa7ccee9f24190381cdec6ff21bcc11e318fc87', 'FC197-baseline', 'baseline'),
  ('099_drop_duplicate_financial_index.sql', 'fa19d54781b7966d4a156b62b63191663256b5bffac881f7df8b612403eea042', 'FC197-baseline', 'baseline'),
  ('100_backfill_finance_from_maintenance.sql', 'd2adace2c250bbc385112422ab3adce15d08755af5da9b762b74ac16ef421007', 'FC197-baseline', 'baseline'),
  ('101_owner_scoped_fleet_access.sql', '744f00b51331c1e51fd8967bb1a2d3760a46daf11b8359fff884515de4a18aeb', 'FC197-baseline', 'baseline'),
  ('102_external_client_write_scoped.sql', '8a24d0b19653e637fa0946ee81bf58cabc03c060236dda21a41d6463438988f3', 'FC197-baseline', 'baseline'),
  ('103_fleet_images_longtext.sql', '53b60c48f6627182f2293947fa20974cfd9455666f26d72fa50bd2350176a1be', 'FC197-baseline', 'baseline'),
  ('104_external_client_maint_permissions.sql', '3657cff233cfea34a997f7f14462de68b4756d08803657db06e1c433ff4361af', 'FC197-baseline', 'baseline'),
  ('105_three_role_architecture.sql', 'b3cddf486630585ac46b102c43bdf11561f8b96304e252e67202f4cd6247830f', 'FC197-baseline', 'baseline'),
  ('106_clean_test_users.sql', '9ee441fa6a5d1be82d3680fbb622ef4d5b069dff654e689732c8d4a94b72984f', 'FC197-baseline', 'baseline'),
  ('107_archon_master_owners.sql', 'fc4881fb8972489e337b12cf94e79237a549be5e44e2025a33e32b3f4b4f5780', 'FC197-baseline', 'baseline'),
  ('108_archon_master_areas.sql', '061bb598c8dbdee772af0f7ffc1784a9a2e048e58684ca9d13753163b022047e', 'FC197-baseline', 'baseline'),
  ('109_archon_master_membership.sql', '0a5b69288eb412835e339711fd11872a7b546999e36476a7b139eaa4fa72aea9', 'FC197-baseline', 'baseline'),
  ('110_archon_master_fleet_units_owner_index.sql', '58e841ef1e92c835355e932a55cfc95ee8459eba0c65312817f7fbf0004b3242', 'FC197-baseline', 'baseline'),
  ('111_archon_master_role_familiar.sql', 'f5825d4b0ee7c103a32e100d06dc5300e1d1d8bf24c0eca42aaac82340332362', 'FC197-baseline', 'baseline'),
  ('112_archon_master_role_restructure.sql', '2cc3d6c756e3cdc667afbb0582e3fd0706fe09eaa3d0fd38b02ce53968776546', 'FC197-baseline', 'baseline'),
  ('113_archon_master_fase3_owner_profiles_service_links.sql', '2510ff0aaaf881df75b8132cf21535f586553e2354330404239331603d1ef6f2', 'FC197-baseline', 'baseline'),
  ('114_archon_master_fase6_owner_profile_multifield_address.sql', '2b4598a6abef394853ced456ddb3097817cc8160a092ad203463a7d12382be37', 'FC197-baseline', 'baseline'),
  ('115_archon_master_flotilla_permissions.sql', 'bcf9ad397b8a9ee4e97dddbc8fb482c96437d2d545b62bbc7f890c178dea4a02', 'FC197-baseline', 'baseline'),
  ('116_archon_master_center_permissions.sql', '7ec5a6320956cdf1748fe8e00af30b1e2b17ae5f32394acdc82e73d64dccb112', 'FC197-baseline', 'baseline'),
  ('117_purge_seed_data.sql', '5319c9df54a1792c64cadf8e0d062192f22277b9059a64a3781ecdee32776e7d', 'FC197-baseline', 'baseline'),
  ('118_owners_suite_column.sql', 'ea1de315a29c19af978fcc7d4c9847105c5feec87148220b09422941b48ecab0', 'FC197-baseline', 'baseline'),
  ('119_centro_specialties.sql', '580719dff2b211f258eafca650856a05bfb63b1a07b592bbc9b0f08f5e89c98b', 'FC197-baseline', 'baseline'),
  ('120_fix_charset.sql', 'ea665d98d7dcb3349db5fe9b2cec9974f9e909424535520f47192778ed7a0342', 'FC197-baseline', 'baseline'),
  ('121_fleet_area_catalog.sql', '129c8ae0f12393379f98ccbe55746338d8cbfea53337a5f5953df6a38c9a06ae', 'FC197-baseline', 'baseline'),
  ('122_audit_log_owner_scope.sql', '9144c3ba830abbd4a14e6502ad946d59d7566b16371cfd04d5e59ffb070b5044', 'FC197-baseline', 'baseline'),
  ('123_owner_handle_rfc_derivado.sql', 'fb1ade3b58ec389a2551fadca46db0f04d3d032d7be31965fb14ec4fa34d87ed', 'FC197-baseline', 'baseline'),
  ('124_owner_handle_backfill.sql', 'd7a16bc8481c2cffcfb1ba85011b59e48dc7a20f879c45099423b04be3ced339', 'FC197-baseline', 'baseline'),
  ('125_seeding_A_movements.sql', 'cf5e7813346aae3a5f29e845e16a73e975d09e1deb5f05b8fb384129409b150c', 'FC197-baseline', 'baseline'),
  ('125_suite_catalog_mappings.sql', '340082213aa337f0ee29c15f769341149814ffb739f1bd9d0962ed65d470e5cd', 'FC197-baseline', 'baseline'),
  ('125z_stress_test_prod.sql', '21c485025d57d5ae9d54ea16321013ced52a750d0bcbd79e7370ee3861008f34', 'FC197-baseline', 'baseline'),
  ('126_fleet_units_warranty.sql', 'd175b7a7a90f27df853629ba98b4848cd2c16fd9b24d8258b971c402291e8fe6', 'FC197-baseline', 'baseline'),
  ('126_seeding_B_financial_incidents.sql', 'fc025186a1d586ceec25f1b9e728e418134ed0c928ba33eddc7375dbbcf5daa8', 'FC197-baseline', 'baseline'),
  ('127_financial_transactions_vim_categories.sql', '14deece050d98e7f1d39a17add790152e35ae503f0262e789696d0fda1c31f31', 'FC197-baseline', 'baseline'),
  ('127_seeding_C_recalls_compliance.sql', '8462549db0a0030a0c1ac721fe5b541422bac245be055f5254b7f99fe9c8611f', 'FC197-baseline', 'baseline'),
  ('127z_seeding_CLEANUP.sql', '6fbd3d81a51c91d0b373cf7eb351e904d4b9858216471f90705c79f70ad7c220', 'FC197-baseline', 'baseline'),
  ('128_recalls_and_tco_view.sql', '8ea95b72e12ec51af1a31650c1eeef4dff766ef38b8608aef8a68a3cb6cd2dbe', 'FC197-baseline', 'baseline'),
  ('129_route_checkpoints.sql', '21f6b20a336485fad5c2247099813f1be794a0df8c6cc2ce282a3c7d6e1f8c41', 'FC197-baseline', 'baseline'),
  ('130_intelligence_views.sql', '9bb150e9a52a65c79ab9f691b88d9e02b872a20988bf1d431b40ced0ee7dea06', 'FC197-baseline', 'baseline'),
  ('131_vim_failure_patterns_view.sql', '33064453df44868e2af8e715e080392a2ddb2ddf92efc7859eea80c0905f1f1f', 'FC197-baseline', 'baseline'),
  ('132_catalog_asset_types.sql', '62bf9d36fcbce0499c1a875b4e810c77fa026bc3bc5cfd635312d89faf374c8a', 'FC197-baseline', 'baseline'),
  ('133_asset_type_fields.sql', '79163900d3395c5418cfefc1571aee5b631fce1b5194150c16cdd3cc74b487ec', 'FC197-baseline', 'baseline'),
  ('134_collation_unification.sql', 'e1d745e227f3a8ec910bfd64ff2d616f16e2f57339157e37b542d421626f8737', 'FC197-baseline', 'baseline'),
  ('135_piic_304_305_asset_type.sql', '870d9f71388dc9715ae19dc5e2c9c6104b03d062584a749e8d2806a7b61ff7f6', 'FC197-baseline', 'baseline'),
  ('136_notifications_outbox_user_id.sql', 'ab930620844bf4348db55b49e04dc7440e867909d487411ea78fdc5a6b4dd837', 'FC197-baseline', 'baseline'),
  ('137_fleet_movements_indexes.sql', '0d80365009ac8c89c3b44e9d72354f177948314965a3f5b2b7b1e50b45439b11', 'FC197-baseline', 'baseline'),
  ('138_realtime_telemetry.sql', 'd6f0a235e954621f4887a11b0ca8dffd6a1ce17cc68f541430b0a9ef7e49e64c', 'FC197-baseline', 'baseline'),
  ('139_crm_contacts.sql', '6d200de5efa1d3d635b701ad33a50ec94ff27799781e92bcae28fb48113b9b4d', 'FC197-baseline', 'baseline'),
  ('140_piic304_complete_hydration.sql', '9503906ba788bcd38402a2446d982ffd71769a6d34725546c84dd025b0e382cb', 'FC197-baseline', 'baseline'),
  ('141_crm_contracts.sql', '86f8cb292f89bc6ae5248d9d0eaf94874721c9e5ec99d4c31761197c04fd2f93', 'FC197-baseline', 'baseline'),
  ('142_crm_pipeline.sql', '011a18fa615d4c014cd8c0496f6229cd2ad7a2647accf5035ec763e422ea59d0', 'FC197-baseline', 'baseline'),
  ('143_crm_interactions.sql', '7d0dd0805ce34242b95947d1d68b97000685f00a35a0a84eb28f3271e44574cd', 'FC197-baseline', 'baseline'),
  ('144_campaign_templates.sql', '14aa59193df6032842e47c153f81418916cfa2bfcd4b4ef397f3540589ff9019', 'FC197-baseline', 'baseline'),
  ('145_social_posts.sql', '471d6304c83c3968b43ae256d267788306bb01225b2d9bd366bce88204899483', 'FC197-baseline', 'baseline'),
  ('146_social_reactions_comments.sql', 'b0ec29221c3c80be70f14753abcfc7968e195d11f7b6cf453c54b1800efb306d', 'FC197-baseline', 'baseline'),
  ('147_social_reviews.sql', 'c3d7ad424c0c8390036f0ff4bd86c260d93effe46bbed4ff2d8be1a7fb80baf3', 'FC197-baseline', 'baseline'),
  ('148_fix_crm_interactions_contact_unsigned.sql', '37be74ee7a7759cc3420947a8c75f0878d49dd4d613dfcd7d108c80e4973cad6', 'FC197-baseline', 'baseline'),
  ('149_tenancy_nomenclature_migration.sql', '8a7347b40a444a7ea623bb6e23641063e8818710d91b28e201a95c418ca7261f', 'FC197-baseline', 'baseline'),
  ('150_granular_permission_engine.sql', '90fab415bae46891fb98ca595dc62b6e5abcefb2dc3bfb1bad25871929ab61d0', 'FC197-baseline', 'baseline'),
  ('151_cosmological_catalogs.sql', '397a0746761a19064e58c74ffb347148691a9086c154ab4028bd3390390ddd8f', 'FC197-baseline', 'baseline'),
  ('152_universe_superclusters.sql', '8b6a99ef4efacdfe4d40723a7816591643bd0106a92282d54f6d8ca6ff4338db', 'FC197-baseline', 'baseline'),
  ('153_universe_lattices.sql', 'b996085025ecfc7e10a63763c9540145719b75c85b0b17f97594afbd8483e5d0', 'FC197-baseline', 'baseline'),
  ('154_cosmonaut_type.sql', 'de8eed9786af924d790a49004479e52221f01319a4c4eded735f2f307dcdc3e9', 'FC197-baseline', 'baseline'),
  ('155_cosmonaut_roles.sql', 'b0e300916e31f13d6263f5fbd8b3c5b8ae0730fe7359ea47eeb60667e2d39ab4', 'FC197-baseline', 'baseline'),
  ('156_legacy_purge.sql', '9ffef3f803c82e17c3e4233fe06c3b5a5d00c6f169597080bfba9ccaa2569d49', 'FC197-baseline', 'baseline'),
  ('157_zero_state.sql', '8755f7c3f18f993d816e5617c1b24dc0dc36f9a67294bf0fe263e7dddf5c28ef', 'FC197-baseline', 'baseline'),
  ('158_prod_schema_completion.sql', '3f5c76da543753aea9280c55d1dadb8d6557d0edf69459654c6a721f9bb5b63f', 'FC197-baseline', 'baseline'),
  ('159_owner_type_catalog.sql', '1e524c7b172f4dbb0c2041477c98660d2570589b752aabe8a4600d8e44396ca6', 'FC197-baseline', 'baseline'),
  ('160_seed_5_base_universe_types.sql', 'ca1c5fe3727cd39f1ee5b89fdaa5e6580e79a2fa129583459a30eb107d30a509', 'FC197-baseline', 'baseline'),
  ('161_clusters_catalog.sql', '13baa9b18970cd1f0bebfc8ac777727dcb5de4f0f79372c67a73a5173a2466f6', 'FC197-baseline', 'baseline'),
  ('162_seed_grayman_master_prod.sql', '964bc32c3a929d2ccd9a2cde14aa0d870878cb3ca362057b2123c7af655c6df5', 'FC197-baseline', 'baseline'),
  ('163_fix_grayman_credentials_prod.sql', '062dbb37241b822de3ed3e0eff178e8014b707db1563a8d233c9a7a280770763', 'FC197-baseline', 'baseline'),
  ('164_identity_cosmology_clean_slate.sql', '997a51914619d1b3e28b4e81e36335b0008169689f1a19b7a8778e74e5fba829', 'FC197-baseline', 'baseline'),
  ('165_e3_finance_maint_incident_catalogs.sql', '6f5b4b005d2d8378cb8abd433869c8b410528669ca2bbee5a9b213ad22394a70', 'FC197-baseline', 'baseline'),
  ('166_f2a_finance_maint_incident_fk_columns.sql', '45ae27f53a7c59c26dcd70d73b67331dc419116b2f22499e6cf8648254fba679', 'FC197-baseline', 'baseline'),
  ('167_f2b1_backfill_delta_dual_write.sql', '0cb1699e078f6fdb6a0dc6a59d517122985676b8d1d1cce643a2a8514b0d23c7', 'FC197-baseline', 'baseline'),
  ('168_f2b3a_pre_enum_columns_nullable.sql', 'df4d9fc486111f937ff598514e547c09fbbc61ca7f0970fe20efa7d2294bacc6', 'FC197-baseline', 'baseline'),
  ('169_f2b3b_drop_enum_columns.sql', 'be80bc3d11157f2e762a8f2b6b261eaae8de3004f4bb69ee9a4a20bdded250d0', 'FC197-baseline', 'baseline'),
  ('170_f3a_cosmonaut_chassis_seed.sql', '6ae3335f625d02511630b02b290534b3e3a908055a32ec1308bce2faab9049d2', 'FC197-baseline', 'baseline'),
  ('171_db1045_view_security_invoker.sql', '08f261462cfb656f3914cd520deb9059f28c89378cc51961b502fca60ab1c408', 'FC197-baseline', 'baseline'),
  ('172_f3c3_drop_legacy_roles_tables.sql', 'aca28b8f65b082c7bf524ea698f03cfacf5c04d0b7fcb7155ff72a28a176d002', 'FC197-baseline', 'baseline'),
  ('173_reset_grayman_password_prod.sql', '437c7184e7d47bb09a2769ac337c514fcc665384a5df406bd52315e14737e29b', 'FC197-baseline', 'baseline'),
  ('174_user_billing_profiles.sql', '437a61461573e3a2a2826ce353e54837cdbe34ee731925bce818d6d6e6acb9ab', 'FC197-baseline', 'baseline'),
  ('175_tenant_profiles_fiscal_fields.sql', 'e1ba7bb5e5b947c307b74e2d4910690a0c7ac2741988ccc94c25ec6a0532efd4', 'FC197-baseline', 'baseline'),
  ('176_user_mfa_schema.sql', '76a11e497bca8f9d0d936de8e60034cea72f5fd3c6e7e04e23c0a29920bee618', 'FC197-baseline', 'baseline'),
  ('177_mfa_challenges.sql', 'a01643a7b9314b8e73703201cd3ac14b123f2c1584e2dbae6c4a14339315617e', 'FC197-baseline', 'baseline'),
  ('178_email_mfa_schema_and_verification.sql', '5e272ac16c971651d5725253c412d9172573e7d7079affc73d2bf01b3923b0c8', 'FC197-baseline', 'baseline');
-- END BASELINE

-- ─── Verification (solo contadores, 0 filas de datos) ───────────────────────
SELECT
  (SELECT COUNT(*) FROM schema_migrations WHERE environment = 'baseline') AS baseline_rows,
  (SELECT COUNT(*) FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME LIKE 'zz\_%') AS zz_tables_left;
-- Esperado: baseline_rows = 173, zz_tables_left = 0
