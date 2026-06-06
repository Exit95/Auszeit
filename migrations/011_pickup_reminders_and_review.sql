-- Migration 011: Überfällige-Abholung-Erinnerungen + Bewertungs-E-Mail nach Abholung
-- Feature 8:  reminder_1_sent_at / reminder_2_sent_at für 14-/35-Tage-Erinnerungen
-- Feature 12: review_email_sent_at — verhindert doppelten Versand der Bewertungs-Mail
-- Reihenfolge: 11

-- ─── Feature 8: Erinnerungs-Zeitstempel ──────────────────────────────────────
-- reminder_1_sent_at: erste Erinnerung (nach 14 Tagen ohne Abholung)
-- reminder_2_sent_at: zweite/letzte Erinnerung ("letzte Chance", nach 35 Tagen)

SET @col1 := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'painted_orders'
      AND COLUMN_NAME  = 'reminder_1_sent_at'
);
SET @ddl1 := IF(@col1 = 0,
    'ALTER TABLE painted_orders ADD COLUMN reminder_1_sent_at DATETIME DEFAULT NULL COMMENT ''Erste Abholungs-Erinnerung (14 Tage nach pickup_notified_at)'' AFTER brenn_started_at',
    'SELECT 1'
);
PREPARE stmt1 FROM @ddl1;
EXECUTE stmt1;
DEALLOCATE PREPARE stmt1;

SET @col2 := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'painted_orders'
      AND COLUMN_NAME  = 'reminder_2_sent_at'
);
SET @ddl2 := IF(@col2 = 0,
    'ALTER TABLE painted_orders ADD COLUMN reminder_2_sent_at DATETIME DEFAULT NULL COMMENT ''Zweite/letzte Erinnerung (35 Tage nach pickup_notified_at)'' AFTER reminder_1_sent_at',
    'SELECT 1'
);
PREPARE stmt2 FROM @ddl2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- ─── Feature 12: Bewertungs-Mail-Zeitstempel ─────────────────────────────────
-- review_email_sent_at: Zeitpunkt des Bewertungs-Mailversands nach Abholung

SET @col3 := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'painted_orders'
      AND COLUMN_NAME  = 'review_email_sent_at'
);
SET @ddl3 := IF(@col3 = 0,
    'ALTER TABLE painted_orders ADD COLUMN review_email_sent_at DATETIME DEFAULT NULL COMMENT ''Zeitpunkt des Bewertungs-Mail-Versands nach Abholung'' AFTER reminder_2_sent_at',
    'SELECT 1'
);
PREPARE stmt3 FROM @ddl3;
EXECUTE stmt3;
DEALLOCATE PREPARE stmt3;

-- Index für den Erinnerungs-Scan (sucht ABHOLBEREIT-Aufträge mit altem pickup_notified_at)
SET @idx := (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'painted_orders'
      AND INDEX_NAME   = 'idx_reminder_scan'
);
SET @ddl_idx := IF(@idx = 0,
    'CREATE INDEX idx_reminder_scan ON painted_orders (overall_status, pickup_notified_at, reminder_1_sent_at, reminder_2_sent_at)',
    'SELECT 1'
);
PREPARE stmt_idx FROM @ddl_idx;
EXECUTE stmt_idx;
DEALLOCATE PREPARE stmt_idx;
