-- Migration: Adicionar campos de agendamento recorrente na tabela patients
-- Data: 2024-12-19

-- Adicionar campos para agendamento recorrente
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS appointment_frequency text CHECK (appointment_frequency IN ('semanal', 'quinzenal', NULL)),
ADD COLUMN IF NOT EXISTS appointment_day_of_week integer CHECK (appointment_day_of_week >= 0 AND appointment_day_of_week <= 6),
ADD COLUMN IF NOT EXISTS appointment_time time;

-- Comentários para documentação
COMMENT ON COLUMN patients.appointment_frequency IS 'Frequência do agendamento: semanal ou quinzenal';
COMMENT ON COLUMN patients.appointment_day_of_week IS 'Dia da semana (0=Domingo, 1=Segunda, 2=Terça, 3=Quarta, 4=Quinta, 5=Sexta, 6=Sábado)';
COMMENT ON COLUMN patients.appointment_time IS 'Horário fixo da consulta';

