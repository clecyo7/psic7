-- PARTE 2: POLÍTICAS E ÍNDICES
-- Execute esta parte após a parte 1 (aguarde alguns segundos)

-- Patients policies
CREATE POLICY "Authenticated users can view patients"
  ON patients FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create patients"
  ON patients FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update patients"
  ON patients FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete patients"
  ON patients FOR DELETE
  TO authenticated
  USING (true);

-- Appointments policies
CREATE POLICY "Patients can view their own appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = appointments.patient_id
      AND patients.user_id = auth.uid()
    )
  );

CREATE POLICY "Professionals can view their appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (professional_id = auth.uid());

CREATE POLICY "Professionals can create appointments"
  ON appointments FOR INSERT
  TO authenticated
  WITH CHECK (professional_id = auth.uid());

CREATE POLICY "Professionals can update their appointments"
  ON appointments FOR UPDATE
  TO authenticated
  USING (professional_id = auth.uid())
  WITH CHECK (professional_id = auth.uid());

CREATE POLICY "Professionals can delete their appointments"
  ON appointments FOR DELETE
  TO authenticated
  USING (professional_id = auth.uid());

-- Appointment confirmations policies
CREATE POLICY "Patients can view confirmations for their appointments"
  ON appointment_confirmations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM appointments
      JOIN patients ON patients.id = appointments.patient_id
      WHERE appointments.id = appointment_confirmations.appointment_id
      AND patients.user_id = auth.uid()
    )
  );

CREATE POLICY "Professionals can view confirmations for their appointments"
  ON appointment_confirmations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM appointments
      WHERE appointments.id = appointment_confirmations.appointment_id
      AND appointments.professional_id = auth.uid()
    )
  );

CREATE POLICY "Professionals can create confirmations"
  ON appointment_confirmations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM appointments
      WHERE appointments.id = appointment_confirmations.appointment_id
      AND appointments.professional_id = auth.uid()
    )
  );

CREATE POLICY "Users can update confirmations for their appointments"
  ON appointment_confirmations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM appointments
      JOIN patients ON patients.id = appointments.patient_id
      WHERE appointments.id = appointment_confirmations.appointment_id
      AND (patients.user_id = auth.uid() OR appointments.professional_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM appointments
      JOIN patients ON patients.id = appointments.patient_id
      WHERE appointments.id = appointment_confirmations.appointment_id
      AND (patients.user_id = auth.uid() OR appointments.professional_id = auth.uid())
    )
  );

-- Medical records policies
CREATE POLICY "Patients can view their own medical records"
  ON medical_records FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = medical_records.patient_id
      AND patients.user_id = auth.uid()
    )
  );

CREATE POLICY "Professionals can view medical records of their patients"
  ON medical_records FOR SELECT
  TO authenticated
  USING (professional_id = auth.uid());

CREATE POLICY "Professionals can create medical records"
  ON medical_records FOR INSERT
  TO authenticated
  WITH CHECK (professional_id = auth.uid());

CREATE POLICY "Professionals can update their medical records"
  ON medical_records FOR UPDATE
  TO authenticated
  USING (professional_id = auth.uid())
  WITH CHECK (professional_id = auth.uid());

-- Consultation prices policies
CREATE POLICY "Professionals can view their own prices"
  ON consultation_prices FOR SELECT
  TO authenticated
  USING (professional_id = auth.uid());

CREATE POLICY "Professionals can create their own prices"
  ON consultation_prices FOR INSERT
  TO authenticated
  WITH CHECK (professional_id = auth.uid());

CREATE POLICY "Professionals can update their own prices"
  ON consultation_prices FOR UPDATE
  TO authenticated
  USING (professional_id = auth.uid())
  WITH CHECK (professional_id = auth.uid());

CREATE POLICY "Professionals can delete their own prices"
  ON consultation_prices FOR DELETE
  TO authenticated
  USING (professional_id = auth.uid());

-- Financial transactions policies
CREATE POLICY "Patients can view their own transactions"
  ON financial_transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM patients
      WHERE patients.id = financial_transactions.patient_id
      AND patients.user_id = auth.uid()
    )
  );

CREATE POLICY "Professionals can view their transactions"
  ON financial_transactions FOR SELECT
  TO authenticated
  USING (professional_id = auth.uid());

CREATE POLICY "Professionals can create transactions"
  ON financial_transactions FOR INSERT
  TO authenticated
  WITH CHECK (professional_id = auth.uid());

CREATE POLICY "Professionals can update their transactions"
  ON financial_transactions FOR UPDATE
  TO authenticated
  USING (professional_id = auth.uid())
  WITH CHECK (professional_id = auth.uid());

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_patients_user_id ON patients(user_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_professional_id ON appointments(professional_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_medical_records_patient_id ON medical_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_medical_records_professional_id ON medical_records(professional_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_professional_id ON financial_transactions(professional_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_status ON financial_transactions(status);

