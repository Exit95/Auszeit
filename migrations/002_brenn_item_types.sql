-- Migration: Werkstücktypen für Brenn- und Abholverwaltung
-- Reihenfolge: 2/8

CREATE TABLE IF NOT EXISTS item_types (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(80) NOT NULL UNIQUE,
    is_active   TINYINT(1) NOT NULL DEFAULT 1,
    sort_order  INT UNSIGNED NOT NULL DEFAULT 0,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO item_types (name, sort_order) VALUES
('Tasse', 10), ('Becher', 20), ('Teller', 30), ('Schale', 40),
('Vase', 50), ('Figur', 60), ('Dose', 70), ('Untersetzer', 80),
('Spardose', 90), ('Sonstiges', 999);
