-- Migration: Ofenchargen (Phase 2 – Tabelle jetzt anlegen)
-- Reihenfolge: 8/8

CREATE TABLE IF NOT EXISTS kiln_batches (
    id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    batch_code       VARCHAR(30) NOT NULL UNIQUE,
    kiln_location_id INT UNSIGNED DEFAULT NULL,
    started_at       DATETIME DEFAULT NULL,
    finished_at      DATETIME DEFAULT NULL,
    notes            TEXT DEFAULT NULL,
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_batch_kiln FOREIGN KEY (kiln_location_id) REFERENCES storage_locations(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
