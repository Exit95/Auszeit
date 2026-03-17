-- =============================================================================
-- Auszeit: Datenbankschema für MariaDB/MySQL
-- Erstellt: 2026-03-16
-- Charset: utf8mb4 (volle Unicode-Unterstützung)
-- =============================================================================

CREATE DATABASE IF NOT EXISTS auszeit_prod
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE auszeit_prod;

-- -----------------------------------------------------------------------------
-- 1. migration_runs – Protokoll aller Import-Läufe
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS migration_runs (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  migration_name  VARCHAR(255) NOT NULL,
  started_at      DATETIME NOT NULL,
  finished_at     DATETIME NULL,
  status          VARCHAR(50) NOT NULL DEFAULT 'running',
  records_read    INT NOT NULL DEFAULT 0,
  records_imported INT NOT NULL DEFAULT 0,
  records_skipped INT NOT NULL DEFAULT 0,
  records_failed  INT NOT NULL DEFAULT 0,
  log_text        LONGTEXT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. time_slots – Verfügbare Termine
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS time_slots (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  legacy_id       VARCHAR(255) NULL,
  slot_date       DATE NOT NULL,
  start_time      TIME NOT NULL,
  end_time        TIME NULL,
  max_capacity    INT NOT NULL DEFAULT 15,
  available       INT NOT NULL DEFAULT 15,
  event_type      VARCHAR(50) NULL DEFAULT 'normal',
  event_duration  INT NULL,
  source_file     VARCHAR(255) NULL,
  metadata_json   JSON NULL,
  raw_json        JSON NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at      DATETIME NULL,
  UNIQUE KEY uniq_time_slots_legacy_id (legacy_id),
  KEY idx_time_slots_date (slot_date),
  KEY idx_time_slots_event_type (event_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. bookings – Buchungen für reguläre Termine
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookings (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  legacy_id       VARCHAR(255) NULL,
  slot_legacy_id  VARCHAR(255) NULL,
  time_slot_id    BIGINT UNSIGNED NULL,
  customer_name   VARCHAR(255) NOT NULL,
  email           VARCHAR(255) NULL,
  phone           VARCHAR(100) NULL,
  participants    INT NOT NULL DEFAULT 1,
  participant_names JSON NULL,
  notes           TEXT NULL,
  booking_status  VARCHAR(50) NOT NULL DEFAULT 'pending',
  source_file     VARCHAR(255) NULL,
  metadata_json   JSON NULL,
  raw_json        JSON NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at      DATETIME NULL,
  UNIQUE KEY uniq_bookings_legacy_id (legacy_id),
  KEY idx_bookings_slot (time_slot_id),
  KEY idx_bookings_email (email),
  KEY idx_bookings_status (booking_status),
  KEY idx_bookings_slot_legacy (slot_legacy_id),
  CONSTRAINT fk_bookings_time_slot FOREIGN KEY (time_slot_id) REFERENCES time_slots(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. workshops – Workshop-Definitionen
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workshops (
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  legacy_id             VARCHAR(255) NULL,
  title                 VARCHAR(255) NOT NULL,
  description           TEXT NULL,
  detailed_description  TEXT NULL,
  workshop_date         DATE NOT NULL,
  start_time            TIME NOT NULL,
  price                 VARCHAR(100) NULL,
  max_participants      INT NOT NULL DEFAULT 15,
  current_participants  INT NOT NULL DEFAULT 0,
  is_active             TINYINT(1) NOT NULL DEFAULT 1,
  image_filename        VARCHAR(255) NULL,
  source_file           VARCHAR(255) NULL,
  metadata_json         JSON NULL,
  raw_json              JSON NULL,
  created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at            DATETIME NULL,
  UNIQUE KEY uniq_workshops_legacy_id (legacy_id),
  KEY idx_workshops_date (workshop_date),
  KEY idx_workshops_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. workshop_bookings – Buchungen für Workshops
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workshop_bookings (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  legacy_id       VARCHAR(255) NULL,
  workshop_legacy_id VARCHAR(255) NULL,
  workshop_id     BIGINT UNSIGNED NULL,
  customer_name   VARCHAR(255) NOT NULL,
  email           VARCHAR(255) NULL,
  phone           VARCHAR(100) NULL,
  participants    INT NOT NULL DEFAULT 1,
  notes           TEXT NULL,
  booking_status  VARCHAR(50) NOT NULL DEFAULT 'pending',
  source_file     VARCHAR(255) NULL,
  metadata_json   JSON NULL,
  raw_json        JSON NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at      DATETIME NULL,
  UNIQUE KEY uniq_workshop_bookings_legacy_id (legacy_id),
  KEY idx_workshop_bookings_workshop (workshop_id),
  KEY idx_workshop_bookings_email (email),
  KEY idx_workshop_bookings_status (booking_status),
  CONSTRAINT fk_workshop_bookings_workshop FOREIGN KEY (workshop_id) REFERENCES workshops(id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. vouchers – Gutscheine
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vouchers (
  id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  legacy_id               VARCHAR(255) NULL,
  voucher_code            VARCHAR(100) NOT NULL,
  amount                  INT NOT NULL COMMENT 'Betrag in Cent',
  currency                VARCHAR(10) NOT NULL DEFAULT 'EUR',
  voucher_status          VARCHAR(50) NOT NULL DEFAULT 'active',
  customer_email          VARCHAR(255) NULL,
  customer_name           VARCHAR(255) NULL,
  stripe_session_id       VARCHAR(255) NULL,
  stripe_payment_intent_id VARCHAR(255) NULL,
  redeemed_at             DATETIME NULL,
  redeemed_by             VARCHAR(255) NULL,
  note                    TEXT NULL,
  source_file             VARCHAR(255) NULL,
  metadata_json           JSON NULL,
  raw_json                JSON NULL,
  created_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at              DATETIME NULL,
  UNIQUE KEY uniq_vouchers_legacy_id (legacy_id),
  UNIQUE KEY uniq_vouchers_code (voucher_code),
  KEY idx_vouchers_status (voucher_status),
  KEY idx_vouchers_email (customer_email),
  KEY idx_vouchers_stripe_session (stripe_session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. reviews – Kundenbewertungen
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reviews (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  legacy_id       VARCHAR(255) NULL,
  reviewer_name   VARCHAR(255) NOT NULL,
  rating          TINYINT NOT NULL DEFAULT 5,
  comment         TEXT NULL,
  is_approved     TINYINT(1) NOT NULL DEFAULT 0,
  review_date     DATETIME NULL,
  source_file     VARCHAR(255) NULL,
  metadata_json   JSON NULL,
  raw_json        JSON NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at      DATETIME NULL,
  UNIQUE KEY uniq_reviews_legacy_id (legacy_id),
  KEY idx_reviews_approved (is_approved),
  KEY idx_reviews_rating (rating)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 8. gallery_categories – Galerie-Kategorien
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gallery_categories (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  legacy_id       VARCHAR(255) NULL,
  category_name   VARCHAR(255) NOT NULL,
  source_file     VARCHAR(255) NULL,
  metadata_json   JSON NULL,
  raw_json        JSON NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_gallery_categories_legacy_id (legacy_id),
  UNIQUE KEY uniq_gallery_categories_name (category_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 9. image_metadata – Bild-Metadaten mit Kategorie-Zuordnung
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS image_metadata (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  legacy_id       VARCHAR(255) NULL,
  filename        VARCHAR(500) NOT NULL,
  categories_json JSON NULL COMMENT 'Array von Kategorie-IDs (Legacy)',
  uploaded_at     DATETIME NULL,
  source_file     VARCHAR(255) NULL,
  metadata_json   JSON NULL,
  raw_json        JSON NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_image_metadata_legacy_id (legacy_id),
  UNIQUE KEY uniq_image_metadata_filename (filename)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -----------------------------------------------------------------------------
-- 10. inquiries – Anfragen für besondere Anlässe
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inquiries (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_type      VARCHAR(100) NOT NULL,
  customer_name   VARCHAR(255) NOT NULL,
  email           VARCHAR(255) NOT NULL,
  phone           VARCHAR(100) NULL,
  preferred_date  DATE NULL,
  participants    INT NOT NULL DEFAULT 1,
  message         TEXT NULL,
  inquiry_status  VARCHAR(50) NOT NULL DEFAULT 'new',
  admin_notes     TEXT NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_inquiries_status (inquiry_status),
  KEY idx_inquiries_email (email),
  KEY idx_inquiries_event_type (event_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
