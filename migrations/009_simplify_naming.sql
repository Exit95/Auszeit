-- Migration: Vereinfachte Benennung
-- Aufträge: AZ-YYMMDD-NNN → #N (fortlaufend)
-- Lagerplätze: PRE-A-01 → Fach A, Bereiche: Abholen / Nicht Abgeholt

-- 0. Schema ändern: area_type ENUM → VARCHAR
ALTER TABLE storage_locations MODIFY COLUMN area_type VARCHAR(30) NOT NULL;

-- 1. Auftrags-Codes vereinfachen
SET @row_number = 0;
UPDATE painted_orders
SET reference_code = CONCAT('#', (@row_number := @row_number + 1))
ORDER BY id ASC;

-- 2. Lagerplatz-Codes vereinfachen
UPDATE storage_locations SET code = 'Fach A', label = 'Fach A', area_type = 'Abholen' WHERE code = 'PRE-A-01';
UPDATE storage_locations SET code = 'Fach B', label = 'Fach B', area_type = 'Abholen' WHERE code = 'PRE-A-02';
UPDATE storage_locations SET code = 'Fach C', label = 'Fach C', area_type = 'Abholen' WHERE code = 'PRE-A-03';
UPDATE storage_locations SET code = 'Fach D', label = 'Fach D', area_type = 'Abholen' WHERE code = 'PRE-B-01';
UPDATE storage_locations SET code = 'Fach E', label = 'Fach E', area_type = 'Abholen' WHERE code = 'PRE-B-02';
UPDATE storage_locations SET code = 'Fach F', label = 'Fach F', area_type = 'Abholen' WHERE code = 'PRE-B-03';
UPDATE storage_locations SET code = 'Fach G', label = 'Fach G', area_type = 'Abholen' WHERE code = 'POST-A-01';
UPDATE storage_locations SET code = 'Fach H', label = 'Fach H', area_type = 'Abholen' WHERE code = 'POST-A-02';
UPDATE storage_locations SET code = 'Fach I', label = 'Fach I', area_type = 'Abholen' WHERE code = 'POST-A-03';
UPDATE storage_locations SET code = 'Fach J', label = 'Fach J', area_type = 'Abholen' WHERE code = 'POST-B-01';
UPDATE storage_locations SET code = 'Fach K', label = 'Fach K', area_type = 'Abholen' WHERE code = 'POST-B-02';
UPDATE storage_locations SET code = 'Fach L', label = 'Fach L', area_type = 'Abholen' WHERE code = 'POST-B-03';

-- Alle verbleibenden alten Typen
UPDATE storage_locations SET area_type = 'Abholen' WHERE area_type IN ('PRE', 'POST', 'KILN', 'PICKUP');
UPDATE storage_locations SET area_type = 'Nicht Abgeholt' WHERE area_type = 'HOLD';

-- Test-Einträge deaktivieren
UPDATE storage_locations SET is_active = 0 WHERE label = 'Test';
