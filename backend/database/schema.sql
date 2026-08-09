-- Run this in pgAdmin Query Tool after connecting to PostgreSQL.
-- 1) Create the database if needed:
-- CREATE DATABASE finsight_db;

-- 2) Connect to finsight_db and run the rest:

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
  id SERIAL PRIMARY KEY,
  user_id INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  city VARCHAR(100),
  country VARCHAR(100),
  monthly_salary NUMERIC(12, 2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'INR',
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense')),
  category VARCHAR(100) NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  description TEXT,
  transaction_date TIMESTAMP DEFAULT NOW(),
  source VARCHAR(100),
  recurring BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense'))
);

CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  user_id INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  theme VARCHAR(20) DEFAULT 'light',
  notification_email BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO categories (name, type) VALUES
  ('Salary', 'income'),
  ('Bonus', 'income'),
  ('Freelance', 'income'),
  ('Investment', 'income'),
  ('Rent', 'expense'),
  ('Groceries', 'expense'),
  ('Utilities', 'expense'),
  ('Entertainment', 'expense'),
  ('Travel', 'expense'),
  ('Healthcare', 'expense')
ON CONFLICT (name) DO NOTHING;



-- Seed default transactions
INSERT INTO transactions (id, user_id, type, category, amount, description, transaction_date, source, recurring) VALUES
  (1, 1, 'income', 'Salary', 50000.00, 'Monthly Salary from TechCorp', '2026-06-01 09:00:00', 'TechCorp', TRUE),
  (2, 1, 'income', 'Freelance', 5000.00, 'Website development freelance work', '2026-06-10 14:00:00', 'Upwork', FALSE),
  (3, 1, 'expense', 'Rent', 15000.00, 'Monthly apartment rent', '2026-06-02 10:00:00', 'Landlord', TRUE),
  (4, 1, 'expense', 'Groceries', 3500.00, 'Weekly groceries at Whole Foods', '2026-06-05 18:00:00', 'Whole Foods', FALSE),
  (5, 1, 'expense', 'Utilities', 2000.00, 'Electricity and internet bill', '2026-06-06 11:30:00', 'Power Grid', TRUE),
  (6, 1, 'expense', 'Entertainment', 1500.00, 'Netflix subscription and movies', '2026-06-12 20:00:00', 'Netflix', TRUE),
  (7, 1, 'expense', 'Travel', 2500.00, 'Uber rides and fuel', '2026-06-15 08:30:00', 'Uber', FALSE)
ON CONFLICT (id) DO NOTHING;

-- Reset sequences
SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 1) FROM users));
SELECT setval('profiles_id_seq', (SELECT COALESCE(MAX(id), 1) FROM profiles));
SELECT setval('transactions_id_seq', (SELECT COALESCE(MAX(id), 1) FROM transactions));
