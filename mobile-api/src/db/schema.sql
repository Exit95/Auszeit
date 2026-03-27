-- ============================================================
-- Brennsystem Mobile App - Datenbankschema
-- Keramik-Auszeit
-- ============================================================

-- Benutzer (Mitarbeiter der App)
CREATE TABLE IF NOT EXISTS brenn_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role ENUM('admin', 'mitarbeiter') NOT NULL DEFAULT 'mitarbeiter',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Kunden
CREATE TABLE IF NOT EXISTS brenn_customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (last_name, first_name),
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Brennöfen
CREATE TABLE IF NOT EXISTS brenn_kilns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  max_temp INT,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Brennaufträge
CREATE TABLE IF NOT EXISTS brenn_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  kiln_id INT,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  quantity INT NOT NULL DEFAULT 1,
  firing_type VARCHAR(100),
  temperature INT,
  firing_program VARCHAR(100),
  desired_date DATE,
  status ENUM('neu', 'geplant', 'im_ofen', 'gebrannt', 'abholbereit', 'abgeschlossen', 'storniert') NOT NULL DEFAULT 'neu',
  notes TEXT,
  price DECIMAL(10, 2),
  paid BOOLEAN NOT NULL DEFAULT FALSE,
  created_by INT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES brenn_customers(id) ON DELETE RESTRICT,
  FOREIGN KEY (kiln_id) REFERENCES brenn_kilns(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES brenn_users(id) ON DELETE SET NULL,
  INDEX idx_status (status),
  INDEX idx_customer (customer_id),
  INDEX idx_kiln (kiln_id),
  INDEX idx_desired_date (desired_date),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bilder zu Brennaufträgen
CREATE TABLE IF NOT EXISTS brenn_order_images (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES brenn_orders(id) ON DELETE CASCADE,
  INDEX idx_order (order_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Statusverlauf (Historie)
CREATE TABLE IF NOT EXISTS brenn_order_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  changed_by INT,
  note TEXT,
  changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES brenn_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES brenn_users(id) ON DELETE SET NULL,
  INDEX idx_order (order_id),
  INDEX idx_changed_at (changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initialer Admin-Benutzer (Passwort wird beim ersten Start gesetzt)
-- INSERT INTO brenn_users (email, password_hash, name, role)
-- VALUES ('admin@keramik-auszeit.de', '<hash>', 'Admin', 'admin');
