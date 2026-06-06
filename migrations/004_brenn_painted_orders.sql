-- Migration: Aufträge für Brenn- und Abholverwaltung
-- Reihenfolge: 4/8

CREATE TABLE IF NOT EXISTS painted_orders (
    id                   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    reference_code       VARCHAR(20) NOT NULL UNIQUE,
    customer_id          INT UNSIGNED NOT NULL,
    visit_date           DATE NOT NULL,
    overall_status       ENUM('ERFASST','WARTET_AUF_BRENNEN','IM_BRENNOFEN','GEBRANNT','ABHOLBEREIT','ABGEHOLT','PROBLEM') NOT NULL DEFAULT 'ERFASST',
    previous_status      ENUM('ERFASST','WARTET_AUF_BRENNEN','IM_BRENNOFEN','GEBRANNT','ABHOLBEREIT','ABGEHOLT') DEFAULT NULL COMMENT 'Status vor PROBLEM, für Rücksprung',
    storage_location_id  INT UNSIGNED DEFAULT NULL,
    pickup_notified_at   DATETIME DEFAULT NULL COMMENT 'Zeitpunkt der Abholbenachrichtigung',
    notes                TEXT DEFAULT NULL,
    created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_order_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_order_storage FOREIGN KEY (storage_location_id) REFERENCES storage_locations(id) ON DELETE SET NULL,
    INDEX idx_reference (reference_code),
    INDEX idx_customer (customer_id),
    INDEX idx_status (overall_status),
    INDEX idx_visit_date (visit_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
