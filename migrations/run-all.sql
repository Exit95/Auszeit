-- ═══════════════════════════════════════════════════════════
-- Brenn- und Abholverwaltung – Alle Migrationen
-- Ausführen mit: mysql -u auszeit_user -p auszeit_prod < migrations/run-all.sql
-- ═══════════════════════════════════════════════════════════

-- 1/8: Lagerorte
CREATE TABLE IF NOT EXISTS storage_locations (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code        VARCHAR(20) NOT NULL UNIQUE,
    label       VARCHAR(100) NOT NULL,
    area_type   ENUM('PRE','KILN','POST','PICKUP','HOLD') NOT NULL,
    is_active   TINYINT(1) NOT NULL DEFAULT 1,
    sort_order  INT UNSIGNED NOT NULL DEFAULT 0,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO storage_locations (code, label, area_type, sort_order) VALUES
('PRE-A-01', 'Regal A Fach 1 (vor Brennen)', 'PRE', 10),
('PRE-A-02', 'Regal A Fach 2 (vor Brennen)', 'PRE', 20),
('PRE-A-03', 'Regal A Fach 3 (vor Brennen)', 'PRE', 30),
('PRE-B-01', 'Regal B Fach 1 (vor Brennen)', 'PRE', 40),
('PRE-B-02', 'Regal B Fach 2 (vor Brennen)', 'PRE', 50),
('KILN-01', 'Brennofen 1', 'KILN', 100),
('KILN-02', 'Brennofen 2', 'KILN', 110),
('POST-A-01', 'Regal A Fach 1 (nach Brennen)', 'POST', 200),
('POST-A-02', 'Regal A Fach 2 (nach Brennen)', 'POST', 210),
('POST-B-01', 'Regal B Fach 1 (nach Brennen)', 'POST', 220),
('PICKUP-A-01', 'Abholregal A Fach 1', 'PICKUP', 300),
('PICKUP-A-02', 'Abholregal A Fach 2', 'PICKUP', 310),
('PICKUP-A-03', 'Abholregal A Fach 3', 'PICKUP', 320),
('PICKUP-B-01', 'Abholregal B Fach 1', 'PICKUP', 330),
('HOLD-01', 'Sonderablage 1', 'HOLD', 400),
('HOLD-02', 'Sonderablage 2', 'HOLD', 410);

-- 2/8: Werkstücktypen
CREATE TABLE IF NOT EXISTS item_types (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(80) NOT NULL UNIQUE,
    is_active   TINYINT(1) NOT NULL DEFAULT 1,
    sort_order  INT UNSIGNED NOT NULL DEFAULT 0,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO item_types (name, sort_order) VALUES
('Tasse', 10), ('Becher', 20), ('Teller', 30), ('Schale', 40),
('Vase', 50), ('Figur', 60), ('Dose', 70), ('Untersetzer', 80),
('Spardose', 90), ('Sonstiges', 999);

-- 3/8: Kunden
CREATE TABLE IF NOT EXISTS customers (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    first_name  VARCHAR(100) NOT NULL,
    last_name   VARCHAR(100) NOT NULL,
    email       VARCHAR(255) DEFAULT NULL,
    phone       VARCHAR(50) DEFAULT NULL,
    notes       TEXT DEFAULT NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_name (last_name, first_name),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4/8: Aufträge
CREATE TABLE IF NOT EXISTS painted_orders (
    id                   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    reference_code       VARCHAR(20) NOT NULL UNIQUE,
    customer_id          INT UNSIGNED NOT NULL,
    visit_date           DATE NOT NULL,
    overall_status       ENUM('ERFASST','WARTET_AUF_BRENNEN','IM_BRENNOFEN','GEBRANNT','ABHOLBEREIT','ABGEHOLT','PROBLEM') NOT NULL DEFAULT 'ERFASST',
    previous_status      ENUM('ERFASST','WARTET_AUF_BRENNEN','IM_BRENNOFEN','GEBRANNT','ABHOLBEREIT','ABGEHOLT') DEFAULT NULL,
    storage_location_id  INT UNSIGNED DEFAULT NULL,
    pickup_notified_at   DATETIME DEFAULT NULL,
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

-- 5/8: Werkstücke
CREATE TABLE IF NOT EXISTS painted_order_items (
    id                   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    painted_order_id     INT UNSIGNED NOT NULL,
    item_type            VARCHAR(80) NOT NULL,
    description          VARCHAR(255) DEFAULT NULL,
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

-- 6/8: Status-Protokoll
CREATE TABLE IF NOT EXISTS status_log (
    id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    entity_type       ENUM('ORDER','ITEM') NOT NULL,
    entity_id         INT UNSIGNED NOT NULL,
    old_status        VARCHAR(30) DEFAULT NULL,
    new_status        VARCHAR(30) NOT NULL,
    changed_by        VARCHAR(100) DEFAULT NULL,
    note              TEXT DEFAULT NULL,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7/8: Abhol-Protokoll
CREATE TABLE IF NOT EXISTS pickup_log (
    id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    painted_order_id  INT UNSIGNED NOT NULL,
    picked_up_by      VARCHAR(200) NOT NULL,
    pickup_note       TEXT DEFAULT NULL,
    created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pickup_order FOREIGN KEY (painted_order_id) REFERENCES painted_orders(id) ON DELETE RESTRICT,
    INDEX idx_order (painted_order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8/8: Ofenchargen (Phase 2)
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
