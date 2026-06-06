-- Migration: Lagerorte für Brenn- und Abholverwaltung
-- Reihenfolge: 1/8

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

-- Standard-Lagerorte
INSERT INTO storage_locations (code, label, area_type, sort_order) VALUES
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
