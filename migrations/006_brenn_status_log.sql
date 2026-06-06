-- Migration: Status-Protokoll für Brenn- und Abholverwaltung
-- Reihenfolge: 6/8

CREATE TABLE IF NOT EXISTS status_log (
    id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    entity_type       ENUM('ORDER','ITEM') NOT NULL,
    entity_id         INT UNSIGNED NOT NULL,
    old_status        VARCHAR(30) DEFAULT NULL,
    new_status        VARCHAR(30) NOT NULL,
    changed_by        VARCHAR(100) DEFAULT NULL COMMENT 'Teammitglied',
    note              TEXT DEFAULT NULL,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
