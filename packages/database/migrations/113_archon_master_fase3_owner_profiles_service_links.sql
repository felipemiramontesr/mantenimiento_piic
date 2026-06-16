-- Migration 113: owner_profiles + owner_service_links
-- Feature: Archon_Master_Fase3_VIM_Hierarchy
-- Idempotent: safe to run multiple times (IF NOT EXISTS)

-- Tabla de perfil de empresa para owners de tipo CENTER
CREATE TABLE IF NOT EXISTS owner_profiles (
  id             INT(11)      NOT NULL AUTO_INCREMENT PRIMARY KEY,
  owner_id       INT(11)      NOT NULL,
  rfc            VARCHAR(13)  NOT NULL,
  razon_social   VARCHAR(255) DEFAULT NULL,
  direccion      VARCHAR(500) DEFAULT NULL,
  telefono       VARCHAR(20)  DEFAULT NULL,
  especialidades VARCHAR(500) DEFAULT NULL,
  created_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE  KEY uq_owner_profiles_owner (owner_id),
  CONSTRAINT fk_owner_profiles_owner
    FOREIGN KEY (owner_id) REFERENCES owners(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de vínculos operativos N:M entre P. Privado (4) y Centro Especializado (3)
CREATE TABLE IF NOT EXISTS owner_service_links (
  id               INT(11)  NOT NULL AUTO_INCREMENT PRIMARY KEY,
  privado_owner_id INT(11)  NOT NULL,
  centro_owner_id  INT(11)  NOT NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE  KEY uq_service_link (privado_owner_id, centro_owner_id),
  CONSTRAINT fk_osl_privado
    FOREIGN KEY (privado_owner_id) REFERENCES owners(id) ON DELETE CASCADE,
  CONSTRAINT fk_osl_centro
    FOREIGN KEY (centro_owner_id)  REFERENCES owners(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
