-- ============================================
-- MIGRATION: Criar tabela de relatórios
-- ============================================
-- Tabela para armazenar relatórios customizados
-- Permite criar relatórios escolhendo paciente e preenchendo informações
-- ============================================

-- Criar tabela reports
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  professional_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  report_date date NOT NULL DEFAULT CURRENT_DATE,
  report_type text DEFAULT 'geral' CHECK (report_type IN ('geral', 'avaliacao', 'evolucao', 'alta', 'outro')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_reports_patient_id ON reports(patient_id);
CREATE INDEX IF NOT EXISTS idx_reports_professional_id ON reports(professional_id);
CREATE INDEX IF NOT EXISTS idx_reports_report_date ON reports(report_date);

-- Criar trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_reports_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION update_reports_updated_at();

-- Habilitar RLS (Row Level Security)
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Política: Profissionais podem ver apenas seus próprios relatórios
CREATE POLICY "Profissionais podem ver seus próprios relatórios"
  ON reports
  FOR SELECT
  USING (auth.uid() = professional_id);

-- Política: Profissionais podem criar relatórios
CREATE POLICY "Profissionais podem criar relatórios"
  ON reports
  FOR INSERT
  WITH CHECK (auth.uid() = professional_id);

-- Política: Profissionais podem atualizar seus próprios relatórios
CREATE POLICY "Profissionais podem atualizar seus próprios relatórios"
  ON reports
  FOR UPDATE
  USING (auth.uid() = professional_id)
  WITH CHECK (auth.uid() = professional_id);

-- Política: Profissionais podem deletar seus próprios relatórios
CREATE POLICY "Profissionais podem deletar seus próprios relatórios"
  ON reports
  FOR DELETE
  USING (auth.uid() = professional_id);

