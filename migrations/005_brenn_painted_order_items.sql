-- Migration: Werkstücke (Items) für Brenn- und Abholverwaltung
-- Reihenfolge: 5/8

CREATE TABLE IF NOT EXISTS painted_order_items (
    id                   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    painted_order_id     INT UNSIGNED NOT NULL,
    item_type            VARCHAR(80) NOT NULL COMMENT 'Werkstücktyp aus item_types',
    description          VARCHAR(255) DEFAULT NULL COMMENT 'Optionale Kurzbeschreibung',
    quantity             SMALLINT UNSIGNED NOT NULL DEFAULT 1,
    status               ENUM('ERFASST','WARTET_AUF_BRENNEN','IM_BRENNOFEN','GEBRANNT','ABHOLBEREIT','ABGEHOLT','PROBLEM') NOT NULL DEFAULT 'ERFASST',
    previous_status      ENUM('ERFASST','WARTET_AUF_BRENNEN','IM_BRENNOFEN','GEBRANNT','ABHOLBEREIT','ABGEHOLT') DEFAULT NULL,
    storage_location_id  INT UNSIGNED DEFAULT NULL,
    notes                TEXT DEFAULT NULL,
    created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_item_order FOREIGN KEY (painted_order_id) REFERENCES painted_orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_item_storage FOREIGN KEY (storage_location_id) REFERENCES storage_locations(id) ON DELETE SET NULL,
    INDEX idx_order (painted_order_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
