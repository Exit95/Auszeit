-- Migration: Zeitstempel für Brennofen-Start
-- Ermöglicht den automatischen 24h-Timer: Aufträge im Status IM_BRENNOFEN
-- werden 24 Stunden nach brenn_started_at automatisch auf ABHOLBEREIT gesetzt.
-- Reihenfolge: 10

ALTER TABLE painted_orders
  ADD COLUMN brenn_started_at DATETIME DEFAULT NULL
  COMMENT 'Zeitpunkt des Wechsels nach IM_BRENNOFEN, Basis für 24h-Auto-Timer'
  AFTER pickup_notified_at;

-- Index für den Timer-Scan (sucht IM_BRENNOFEN-Aufträge mit altem brenn_started_at)
CREATE INDEX idx_brenn_started ON painted_orders (overall_status, brenn_started_at);
