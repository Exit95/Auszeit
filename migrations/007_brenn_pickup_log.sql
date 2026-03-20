-- Migration: Abhol-Protokoll für Brenn- und Abholverwaltung
-- Reihenfolge: 7/8

CREATE TABLE IF NOT EXISTS pickup_log (
    id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    painted_order_id  INT UNSIGNED NOT NULL,
    picked_up_by      VARCHAR(200) NOT NULL COMMENT 'Name der abholenden Person',
    pickup_note       TEXT DEFAULT NULL,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pickup_order FOREIGN KEY (painted_order_id) REFERENCES painted_orders(id) ON DELETE RESTRICT,
    INDEX idx_order (painted_order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
