require('dotenv').config();
const pool = require('./config/db');
const bcrypt = require('bcryptjs');

async function migrate() {
  let conn;
  try {
    conn = await pool.getConnection();
    console.log('Connected to MySQL. Running migrations...');

    // 1. users
    await conn.query(`CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      phone VARCHAR(20),
      password VARCHAR(255) NOT NULL,
      role ENUM('admin','manager','sales','accounts','operations') DEFAULT 'sales',
      status ENUM('active','inactive') DEFAULT 'active',
      avatar VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    // 2. leads
    await conn.query(`CREATE TABLE IF NOT EXISTS leads (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100),
      phone VARCHAR(20) NOT NULL,
      destination VARCHAR(200),
      travel_date DATE,
      travelers INT DEFAULT 1,
      budget DECIMAL(12,2),
      requirements TEXT,
      lead_source ENUM('facebook','instagram','google','whatsapp','referral','walkin','website','other') DEFAULT 'other',
      status ENUM('new','quotation','followup','confirmed','lost') DEFAULT 'new',
      assigned_to INT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    // 3. followups
    await conn.query(`CREATE TABLE IF NOT EXISTS followups (
      id INT AUTO_INCREMENT PRIMARY KEY,
      lead_id INT NOT NULL,
      user_id INT,
      followup_date DATE NOT NULL,
      followup_time TIME,
      notes TEXT,
      status ENUM('pending','done','missed') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    // 4. customers
    await conn.query(`CREATE TABLE IF NOT EXISTS customers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      lead_id INT,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100),
      phone VARCHAR(20) NOT NULL,
      address TEXT,
      city VARCHAR(100),
      state VARCHAR(100),
      country VARCHAR(100),
      id_proof_type VARCHAR(50),
      id_proof_number VARCHAR(100),
      date_of_birth DATE,
      nationality VARCHAR(50),
      emergency_contact_name VARCHAR(100),
      emergency_contact_phone VARCHAR(20),
      notes TEXT,
      total_bookings INT DEFAULT 0,
      total_spent DECIMAL(14,2) DEFAULT 0,
      outstanding_amount DECIMAL(14,2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    // 5. tour_packages
    await conn.query(`CREATE TABLE IF NOT EXISTS tour_packages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      destination VARCHAR(200) NOT NULL,
      country VARCHAR(100),
      duration_days INT NOT NULL DEFAULT 1,
      duration_nights INT DEFAULT 0,
      description TEXT,
      highlights TEXT,
      inclusions TEXT,
      exclusions TEXT,
      terms_conditions TEXT,
      cost DECIMAL(12,2) DEFAULT 0,
      selling_price DECIMAL(12,2) DEFAULT 0,
      image_url VARCHAR(500),
      status ENUM('active','inactive') DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    // 6. itinerary_days
    await conn.query(`CREATE TABLE IF NOT EXISTS itinerary_days (
      id INT AUTO_INCREMENT PRIMARY KEY,
      package_id INT NOT NULL,
      day_number INT NOT NULL,
      title VARCHAR(200),
      description TEXT,
      places_to_visit TEXT,
      activities TEXT,
      hotel_name VARCHAR(200),
      hotel_details TEXT,
      transport_name VARCHAR(200),
      transport_details TEXT,
      meals VARCHAR(200),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (package_id) REFERENCES tour_packages(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    // 7. suppliers
    await conn.query(`CREATE TABLE IF NOT EXISTS suppliers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      type ENUM('hotel','transport','guide','activity','airline','other') NOT NULL,
      contact_person VARCHAR(100),
      email VARCHAR(100),
      phone VARCHAR(20),
      address TEXT,
      city VARCHAR(100),
      country VARCHAR(100),
      rates TEXT,
      bank_details TEXT,
      notes TEXT,
      status ENUM('active','inactive') DEFAULT 'active',
      total_paid DECIMAL(14,2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    // 8. quotations
    await conn.query(`CREATE TABLE IF NOT EXISTS quotations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      quotation_number VARCHAR(50) UNIQUE NOT NULL,
      lead_id INT,
      customer_id INT,
      package_id INT,
      destination VARCHAR(200),
      travel_date DATE,
      travelers INT DEFAULT 1,
      duration_days INT,
      subtotal DECIMAL(12,2) DEFAULT 0,
      discount_percent DECIMAL(5,2) DEFAULT 0,
      discount_amount DECIMAL(12,2) DEFAULT 0,
      tax_percent DECIMAL(5,2) DEFAULT 0,
      tax_amount DECIMAL(12,2) DEFAULT 0,
      total DECIMAL(12,2) DEFAULT 0,
      inclusions TEXT,
      exclusions TEXT,
      terms_conditions TEXT,
      validity_days INT DEFAULT 15,
      status ENUM('draft','sent','accepted','rejected') DEFAULT 'draft',
      created_by INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
      FOREIGN KEY (package_id) REFERENCES tour_packages(id) ON DELETE SET NULL,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    // 9. bookings
    await conn.query(`CREATE TABLE IF NOT EXISTS bookings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      booking_id VARCHAR(30) UNIQUE NOT NULL,
      quotation_id INT,
      customer_id INT,
      package_id INT,
      tour_name VARCHAR(200),
      destination VARCHAR(200),
      travel_start_date DATE,
      travel_end_date DATE,
      travelers INT DEFAULT 1,
      adult_count INT DEFAULT 1,
      child_count INT DEFAULT 0,
      infant_count INT DEFAULT 0,
      total_amount DECIMAL(14,2) DEFAULT 0,
      advance_amount DECIMAL(14,2) DEFAULT 0,
      balance_amount DECIMAL(14,2) DEFAULT 0,
      paid_amount DECIMAL(14,2) DEFAULT 0,
      status ENUM('pending','confirmed','cancelled','completed') DEFAULT 'pending',
      special_requests TEXT,
      created_by INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE SET NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
      FOREIGN KEY (package_id) REFERENCES tour_packages(id) ON DELETE SET NULL,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    // 10. payments
    await conn.query(`CREATE TABLE IF NOT EXISTS payments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      booking_id INT,
      customer_id INT,
      amount DECIMAL(14,2) NOT NULL,
      payment_type ENUM('advance','installment','final','refund','other') DEFAULT 'advance',
      payment_method ENUM('cash','bank_transfer','upi','cheque','card','online') DEFAULT 'bank_transfer',
      payment_date DATE NOT NULL,
      transaction_id VARCHAR(100),
      receipt_number VARCHAR(50),
      status ENUM('completed','pending','failed') DEFAULT 'completed',
      notes TEXT,
      created_by INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    try {
      await conn.query(`ALTER TABLE payments ADD COLUMN status ENUM('completed','pending','failed') DEFAULT 'completed' AFTER receipt_number`);
      console.log('  Added status column to payments table');
    } catch (err) {
      if (err.code !== 'ER_DUP_FIELDNAME') {
        throw err;
      }
    }

    // 11. expenses
    await conn.query(`CREATE TABLE IF NOT EXISTS expenses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      booking_id INT,
      supplier_id INT,
      category ENUM('hotel','transport','tickets','food','guide','activities','staff','marketing','misc') NOT NULL,
      description TEXT,
      amount DECIMAL(14,2) NOT NULL,
      expense_date DATE NOT NULL,
      payment_status ENUM('pending','paid') DEFAULT 'pending',
      notes TEXT,
      created_by INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    // 12. documents
    await conn.query(`CREATE TABLE IF NOT EXISTS documents (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_id INT,
      booking_id INT,
      document_type ENUM('passport','visa','ticket','hotel_voucher','insurance','receipt','booking_doc','customer_doc','other') NOT NULL,
      title VARCHAR(200),
      file_path VARCHAR(500) NOT NULL,
      file_name VARCHAR(255),
      file_size INT,
      mime_type VARCHAR(100),
      notes TEXT,
      uploaded_by INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
      FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    // 13. marketing_leads
    await conn.query(`CREATE TABLE IF NOT EXISTS marketing_leads (
      id INT AUTO_INCREMENT PRIMARY KEY,
      source ENUM('facebook','instagram','google','whatsapp','other') NOT NULL,
      campaign_name VARCHAR(200),
      lead_name VARCHAR(100),
      lead_phone VARCHAR(20),
      lead_email VARCHAR(100),
      ad_spend DECIMAL(12,2) DEFAULT 0,
      impressions INT DEFAULT 0,
      clicks INT DEFAULT 0,
      converted_to_lead INT,
      converted_at TIMESTAMP NULL,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (converted_to_lead) REFERENCES leads(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    // 14. reminders
    await conn.query(`CREATE TABLE IF NOT EXISTS reminders (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT,
      reminder_type ENUM('followup','payment','document','travel','hotel_confirmation','supplier_payment','feedback') NOT NULL,
      reference_type VARCHAR(50) NOT NULL,
      reference_id INT NOT NULL,
      reminder_date DATETIME NOT NULL,
      message TEXT,
      status ENUM('pending','sent','done') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    // 15. alerts
    await conn.query(`CREATE TABLE IF NOT EXISTS alerts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT,
      title VARCHAR(200) NOT NULL,
      message TEXT,
      alert_type ENUM('info','warning','urgent','success') DEFAULT 'info',
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    // 16. tour_transport
    await conn.query(`CREATE TABLE IF NOT EXISTS tour_transport (
      id INT AUTO_INCREMENT PRIMARY KEY,
      package_id INT NOT NULL,
      transport_type ENUM('flight','train','bus','car','cruise','other') DEFAULT 'other',
      from_location VARCHAR(200),
      to_location VARCHAR(200),
      provider VARCHAR(200),
      details TEXT,
      cost DECIMAL(12,2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (package_id) REFERENCES tour_packages(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    // 17. tour_hotels
    await conn.query(`CREATE TABLE IF NOT EXISTS tour_hotels (
      id INT AUTO_INCREMENT PRIMARY KEY,
      package_id INT NOT NULL,
      hotel_name VARCHAR(200),
      room_type VARCHAR(100),
      check_in DATE,
      check_out DATE,
      nights INT DEFAULT 1,
      cost_per_night DECIMAL(12,2) DEFAULT 0,
      total_cost DECIMAL(12,2) DEFAULT 0,
      supplier_id INT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (package_id) REFERENCES tour_packages(id) ON DELETE CASCADE,
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    // Insert default admin user
    const [existing] = await conn.query("SELECT COUNT(*) AS cnt FROM users WHERE email = ?", ['admin@touroperator.com']);
    if (existing[0].cnt === 0) {
      const hash = await bcrypt.hash('admin123', 10);
      await conn.query(
        "INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)",
        ['System Admin', 'admin@touroperator.com', '9999999999', hash, 'admin']
      );
      
      // Insert sample staff users
      const managerHash = await bcrypt.hash('manager123', 10);
      await conn.query(
        "INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)",
        ['Rajesh Kumar', 'manager@touroperator.com', '8888888881', managerHash, 'manager']
      );
      
      const salesHash = await bcrypt.hash('sales123', 10);
      await conn.query(
        "INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)",
        ['Priya Sharma', 'sales@touroperator.com', '8888888882', salesHash, 'sales']
      );

      const accountsHash = await bcrypt.hash('accounts123', 10);
      await conn.query(
        "INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)",
        ['Amit Patel', 'accounts@touroperator.com', '8888888883', accountsHash, 'accounts']
      );

      const opsHash = await bcrypt.hash('operations123', 10);
      await conn.query(
        "INSERT INTO users (name, email, phone, password, role) VALUES (?, ?, ?, ?, ?)",
        ['Sunita Verma', 'operations@touroperator.com', '8888888884', opsHash, 'operations']
      );

      console.log('Default users created:');
      console.log('  admin@touroperator.com / admin123 (Admin)');
      console.log('  manager@touroperator.com / manager123 (Manager)');
      console.log('  sales@touroperator.com / sales123 (Sales)');
      console.log('  accounts@touroperator.com / accounts123 (Accounts)');
      console.log('  operations@touroperator.com / operations123 (Operations)');
    }

    // Insert sample tour packages if none exist
    const [packages] = await conn.query('SELECT COUNT(*) AS cnt FROM tour_packages');
    if (packages[0].cnt === 0) {
      const sampleTours = [
        ['Kerala Backwaters & Beaches', 'Kerala', 'India', 7, 6, 'Experience the serene backwaters of Alleppey, explore Munnar tea gardens, and relax on Kovalam beaches.', 'Houseboat stay, Tea gardens, Beach activities, Spice plantations', 'Accommodation, Daily breakfast & dinner, All transfers, Sightseeing, Guide', 'Airfare, Personal expenses, Tips, Travel insurance', 'Payment: 50% advance, balance 15 days before travel.', 25000.00, 35000.00],
        ['Rajasthan Royal Heritage Tour', 'Rajasthan', 'India', 10, 9, 'Explore the royal heritage of Rajasthan covering Jaipur, Jodhpur, Udaipur, and Jaisalmer.', 'Palace visits, Desert safari, Folk performances, Fort exploration', 'Accommodation, All meals, AC transport, Guide, Entry fees', 'Airfare, Personal expenses, Camera fees, Tips', 'Payment: 40% advance, balance 20 days before travel.', 45000.00, 62000.00],
        ['Goa Beach Holiday Package', 'Goa', 'India', 5, 4, 'Enjoy the sun, sand, and sea in Goa with water sports and nightlife.', 'Beach activities, Water sports, Night markets, Church visits', 'Accommodation, Breakfast, Airport transfers, 1 water sport', 'Airfare, Lunch & dinner, Personal expenses, Additional activities', 'Payment: Full advance payment required.', 12000.00, 18000.00],
        ['Himachal Adventure Tour', 'Himachal Pradesh', 'India', 8, 7, 'Adventure tour covering Manali, Solang Valley, and Dharamshala with trekking and paragliding.', 'Trekking, Paragliding, River rafting, Temple visits', 'Accommodation, All meals, Transport, Guide, Activity costs', 'Airfare, Personal expenses, Tips, Travel insurance', 'Payment: 50% advance, balance on arrival.', 30000.00, 42000.00],
        ['Golden Triangle Classic', 'Delhi-Agra-Jaipur', 'India', 6, 5, 'Classic Golden Triangle tour covering Delhi, Agra (Taj Mahal), and Jaipur.', 'Taj Mahal visit, Palace tours, Cultural shows, Shopping', 'Accommodation, Breakfast, AC transport, Guide, Entry fees', 'Airfare, Lunch & dinner, Personal expenses, Tips', 'Payment: 40% advance, balance 10 days before travel.', 20000.00, 28000.00]
      ];
      for (const t of sampleTours) {
        await conn.query(
          'INSERT INTO tour_packages (name, destination, country, duration_days, duration_nights, description, highlights, inclusions, exclusions, terms_conditions, cost, selling_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          t
        );
      }

      // Sample suppliers
      await conn.query(`INSERT INTO suppliers (name, type, contact_person, email, phone, city, rates, notes) VALUES 
        ('Grand Palace Hotel', 'hotel', 'Mohan Singh', 'mohan@grandpalace.com', '9876543210', 'Jaipur', 'Standard:3000,Deluxe:5000,Suite:8000', 'Preferred hotel partner in Jaipur'),
        ('Green Valley Resort', 'hotel', 'Anita Das', 'anita@greenvalley.com', '9876543211', 'Munnar', 'Standard:2500,Deluxe:4500,Suite:7000', 'Munnar resort partner'),
        ('Desert Safari Transports', 'transport', 'Vikram Rao', 'vikram@desertsafari.com', '9876543212', 'Jaisalmer', 'Tempo:15/km,Bus:25/km,Innova:18/km', 'Transport partner for Rajasthan tours'),
        ('Ocean Adventures', 'activity', 'Carlos Menezes', 'carlos@oceanadventures.com', '9876543213', 'Goa', 'Scuba:2000,Parasail:1500,Jetski:2500', 'Water sports partner in Goa'),
        ('Himalayan Treks & Guides', 'guide', 'Tenzing Dorje', 'tenzing@himalayanguides.com', '9876543214', 'Manali', 'Full Day:2000,Half Day:1200,Multi-day:1500/day', 'Certified mountain guides'),
        ('AirConnect Travels', 'airline', 'Ramesh Iyer', 'ramesh@airconnect.com', '9876543215', 'Delhi', 'Commission:5% on domestic, 8% on international', 'Airline ticketing partner')`
      );
      console.log('Sample data created: 5 tour packages, 6 suppliers');
    }

    console.log('All migrations completed successfully.');
  } catch (err) {
    console.error('Migration error:', err.message || err.code || 'Unknown error');
    throw err;
  } finally {
    if (conn) conn.release();
  }
}

module.exports = { migrate };

if (require.main === module) {
  migrate()
    .then(() => {
      console.log('Migration finished.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
