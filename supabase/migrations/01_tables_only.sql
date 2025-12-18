-- PARTE 1: APENAS CRIAÇÃO DE TABELAS (sem políticas)
-- Execute esta parte primeiro, aguarde alguns segundos, depois execute a parte 2

-- Create patients table
CREATE TABLE IF NOT EXISTS patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  birth_date date NOT NULL,
  document text UNIQUE NOT NULL,
  address text NOT NULL,
  emergency_contact text NOT NULL,
  email text NOT NULL,
  education_level text NOT NULL,
  service_type text NOT NULL CHECK (service_type IN ('online', 'presencial', 'ambos')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  professional_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  appointment_date timestamptz NOT NULL,
  service_type text NOT NULL CHECK (service_type IN ('online', 'presencial')),
  status text DEFAULT 'pending_confirmation' CHECK (status IN ('pending_confirmation', 'confirmed', 'completed', 'cancelled')),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create appointment_confirmations table
CREATE TABLE IF NOT EXISTS appointment_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES appointments(id) ON DELETE CASCADE NOT NULL,
  confirmation_sent_at timestamptz DEFAULT now(),
  confirmed_at timestamptz,
  confirmed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create medical_records table
CREATE TABLE IF NOT EXISTS medical_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  professional_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  record_date timestamptz DEFAULT now(),
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create consultation_prices table
CREATE TABLE IF NOT EXISTS consultation_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  service_type text NOT NULL CHECK (service_type IN ('online', 'presencial')),
  price decimal(10,2) NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create financial_transactions table
CREATE TABLE IF NOT EXISTS financial_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  professional_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount decimal(10,2) NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'cancelled')),
  due_date date NOT NULL,
  paid_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;

