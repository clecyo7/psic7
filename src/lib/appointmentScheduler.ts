// Utilitários para gerenciar agendamentos recorrentes e rotina diária

import { supabase } from './supabase';

/**
 * Executa a rotina diária para ativar pré-agendamentos em D-1
 * Esta função deve ser chamada diariamente (via cron job ou similar)
 */
export async function runDailyAppointmentScheduler() {
  try {
    const { data, error } = await supabase.rpc('activate_daily_appointments');
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * Expira pré-agendamentos não confirmados que passaram do prazo
 */
export async function expireUnconfirmedAppointments() {
  try {
    const { data, error } = await supabase.rpc('expire_unconfirmed_appointments');
    
    if (error) {
      throw error;
    }
    
    return data;
  } catch (error) {
    throw error;
  }
}

/**
 * Verifica conflitos de agenda antes de criar/atualizar agendamento
 */
export async function checkAppointmentConflict(
  professionalId: string,
  appointmentDate: string,
  appointmentId?: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('check_appointment_conflict', {
      p_professional_id: professionalId,
      p_appointment_date: appointmentDate,
      p_appointment_id: appointmentId || null,
    });
    
    if (error) {
      throw error;
    }
    
    return data as boolean;
  } catch (error) {
    throw error;
  }
}

/**
 * Envia notificação para pré-agendamento (placeholder - implementar integração real)
 */
export async function sendAppointmentNotification(appointmentId: string, _patientEmail: string) {
  // TODO: Implementar integração com serviço de email/notificação
  // Marcar como notificação enviada
  await supabase
    .from('appointments')
    .update({ notification_sent: true })
    .eq('id', appointmentId);
}

