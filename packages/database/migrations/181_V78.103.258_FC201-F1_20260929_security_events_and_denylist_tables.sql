-- ============================================================
-- Migration 181: registro de eventos de seguridad y lista de bloqueo manual — FC201 F1 · 2026-09-29
--   (Deception_Layer_Honeypots_And_Security_Events_Telemetry)
-- Context: capa de detección con carnadas (442_AN Charlie · O 443/445/448/450/453_AN · R 444/446/
--          447/451/454_AN). Hoy Archon no registra ataques: system_access_logs exige user_id y no
--          sirve para visitantes anónimos. Esta migración solo crea tablas; no toca datos.
--
-- 1) security_events: un evento AGREGADO por (tipo, ip_hash, hora, carnada). target_pattern es la
--    entrada del catálogo (p. ej. '/wp-admin/*'), no la ruta pedida: miles de rutas distintas bajo
--    el mismo comodín caen en UNA fila por hora (Inv-2, B1 de 452_AN). sample_path guarda la última
--    ruta vista y queda fuera de la llave. ip_hash = HMAC-SHA256 (la app lo calcula); ip_address es
--    la IP en claro que Ω ve 15 días y que el programador por tráfico pone en NULL después (P3).
-- 2) security_manual_denylist: bloqueos que Ω pone a mano. Tabla propia: el barrido de 24 h de
--    auth_throttle_counters no la toca (P4). Con vencimiento y revocación.
--
-- MariaDB 10.4 (local, explicit_defaults_for_timestamp=0) vs 11.8 (prod, =1): todo TIMESTAMP con
-- NOT NULL y DEFAULT explícitos y 0 ON UPDATE; las demás fechas son DATETIME (Regla 23).
-- Idempotente: CREATE TABLE IF NOT EXISTS. Orden: PRIMERO local, huella, y DESPUÉS prod.
-- ============================================================

CREATE TABLE IF NOT EXISTS security_events (
  id INT NOT NULL AUTO_INCREMENT,
  event_type VARCHAR(64) NOT NULL,
  ip_hash CHAR(64) NOT NULL,
  ip_address VARCHAR(45) NULL,
  target_pattern VARCHAR(64) NOT NULL,
  sample_path VARCHAR(255) NULL,
  window_hour DATETIME NOT NULL,
  hit_count INT UNSIGNED NOT NULL DEFAULT 1,
  first_seen_at DATETIME NOT NULL,
  last_seen_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_threat_bucket (event_type, ip_hash, window_hour, target_pattern),
  INDEX idx_retention_clear (created_at, ip_address),
  INDEX idx_retention_purge (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS security_manual_denylist (
  ip_hash CHAR(64) NOT NULL,
  ip_address VARCHAR(45) NULL,
  reason VARCHAR(255) NULL,
  expires_at DATETIME NOT NULL,
  created_by INT NOT NULL,
  revoked_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (ip_hash),
  INDEX idx_denylist_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verificación: 2 tablas nuevas.
SELECT COUNT(*) AS new_tables
  FROM information_schema.tables
 WHERE table_schema = DATABASE()
   AND table_name IN ('security_events', 'security_manual_denylist');
