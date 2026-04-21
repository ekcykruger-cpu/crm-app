-- =============================================================================
-- schema.sql  –  Database Setup Script
-- =============================================================================
-- Run this file ONCE to create all tables in your PostgreSQL database.
--
-- How to run it:
--   Option 1 (Railway console): Copy and paste the contents into the
--             Railway database query console.
--   Option 2 (local psql):      psql -U youruser -d yourdb -f schema.sql
-- =============================================================================


-- ─── Customers Table ─────────────────────────────────────────────────────────
-- Stores core contact information for each customer.

CREATE TABLE IF NOT EXISTS customers (
  id             SERIAL PRIMARY KEY,           -- Auto-incrementing unique ID
  first_name     VARCHAR(100) NOT NULL,
  last_name      VARCHAR(100) NOT NULL,
  phone          VARCHAR(30),                  -- Mobile phone number
  email          VARCHAR(255),
  fb_handle      VARCHAR(100),                 -- Facebook handle (without @)
  twitter_handle VARCHAR(100),                 -- Twitter/X handle (without @)
  custom_field_1 TEXT,                         -- 5 custom fields – label them via Settings
  custom_field_2 TEXT,
  custom_field_3 TEXT,
  custom_field_4 TEXT,
  custom_field_5 TEXT,
  created_at     TIMESTAMP DEFAULT NOW()       -- Automatically set when record is created
);


-- ─── Contact History Table ────────────────────────────────────────────────────
-- Stores every contact interaction with a customer.

CREATE TABLE IF NOT EXISTS contact_history (
  id               SERIAL PRIMARY KEY,
  customer_id      INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  -- ON DELETE CASCADE means if a customer is deleted, their history is also deleted
  contact_date     DATE NOT NULL,
  contact_time     TIME NOT NULL,
  agent            VARCHAR(100),               -- Name of the agent who handled the contact
  contact_to       VARCHAR(255),               -- Phone number or email the customer used
  duration         VARCHAR(20),                -- e.g. "5:30" (mm:ss) or "00:05:30" (hh:mm:ss)
  disposition_code VARCHAR(50),                -- e.g. "RESOLVED", "CALLBACK", "ESCALATED"
  notes            VARCHAR(500),               -- Note, max 500 characters
  created_at       TIMESTAMP DEFAULT NOW()
);


-- ─── Settings Table ───────────────────────────────────────────────────────────
-- Stores app-level settings as key/value pairs.
-- Used to store the labels for the 5 custom fields on customer records.

CREATE TABLE IF NOT EXISTS settings (
  key   VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL
);

-- Insert default labels for the 5 custom fields.
-- You can rename these any time via the Settings panel in the app.
INSERT INTO settings (key, value) VALUES
  ('custom_label_1', 'Custom Field 1'),
  ('custom_label_2', 'Custom Field 2'),
  ('custom_label_3', 'Custom Field 3'),
  ('custom_label_4', 'Custom Field 4'),
  ('custom_label_5', 'Custom Field 5')
ON CONFLICT (key) DO NOTHING;   -- Don't overwrite if labels have already been customised


-- ─── Optional: Sample Data ───────────────────────────────────────────────────
-- Uncomment the lines below to add a sample customer so you can test the app
-- immediately after setup. Delete or comment them out for production use.

/*
INSERT INTO customers (first_name, last_name, phone, email, fb_handle, twitter_handle)
VALUES ('Jane', 'Smith', '082 555 0100', 'jane@example.com', 'janesmith', 'janesmith');

INSERT INTO contact_history (customer_id, contact_date, contact_time, agent, contact_to, duration, disposition_code, notes)
VALUES (1, CURRENT_DATE, CURRENT_TIME, 'Ernst', '082 555 0100', '3:45', 'RESOLVED', 'Called about account query, resolved.');
*/
