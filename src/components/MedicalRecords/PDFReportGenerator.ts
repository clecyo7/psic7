import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface MedicalRecord {
  id: string;
  record_date: string;
  content: string;
  signed: boolean;
  signed_at: string | null;
  professional_name: string | null;
  professional_registration: string | null;
  patient: {
    name: string;
    id: string;
    birth_date?: string;
    document?: string;
  };
  appointment: {
    appointment_date: string;
    service_type: string;
  } | null;
}

export const generatePDFReport = (records: MedicalRecord[], patientName: string) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('RELATÓRIO DE PRONTUÁRIO MÉDICO', pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Emitido em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 15;
  doc.setDrawColor(0, 0, 0);
  doc.line(15, yPosition, pageWidth - 15, yPosition);

  yPosition += 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO PACIENTE', 15, yPosition);

  yPosition += 7;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nome: ${patientName}`, 15, yPosition);

  if (records[0]?.patient.birth_date) {
    yPosition += 5;
    doc.text(`Data de Nascimento: ${new Date(records[0].patient.birth_date).toLocaleDateString('pt-BR')}`, 15, yPosition);
  }

  if (records[0]?.patient.document) {
    yPosition += 5;
    doc.text(`Documento: ${records[0].patient.document}`, 15, yPosition);
  }

  yPosition += 10;
  doc.line(15, yPosition, pageWidth - 15, yPosition);

  yPosition += 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('HISTÓRICO DE CONSULTAS', 15, yPosition);

  yPosition += 10;

  records.forEach((record, index) => {
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Consulta ${index + 1}`, 15, yPosition);

    yPosition += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');

    const consultDate = record.appointment
      ? new Date(record.appointment.appointment_date).toLocaleString('pt-BR')
      : new Date(record.record_date).toLocaleString('pt-BR');

    doc.text(`Data: ${consultDate}`, 20, yPosition);

    if (record.appointment) {
      yPosition += 5;
      doc.text(`Tipo: ${record.appointment.service_type === 'online' ? 'Online' : 'Presencial'}`, 20, yPosition);
    }

    yPosition += 7;
    doc.setFont('helvetica', 'bold');
    doc.text('Evolução:', 20, yPosition);

    yPosition += 5;
    doc.setFont('helvetica', 'normal');

    const contentLines = doc.splitTextToSize(record.content || 'Não preenchido', pageWidth - 40);
    contentLines.forEach((line: string) => {
      if (yPosition > pageHeight - 40) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(line, 20, yPosition);
      yPosition += 5;
    });

    if (record.signed && record.professional_name) {
      yPosition += 5;

      if (yPosition > pageHeight - 30) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text('─────────────────────────────────────', 20, yPosition);
      yPosition += 4;
      doc.text(`Assinado digitalmente por: ${record.professional_name}`, 20, yPosition);

      if (record.professional_registration) {
        yPosition += 4;
        doc.text(`Registro: ${record.professional_registration}`, 20, yPosition);
      }

      if (record.signed_at) {
        yPosition += 4;
        doc.text(`Data da assinatura: ${new Date(record.signed_at).toLocaleString('pt-BR')}`, 20, yPosition);
      }
    }

    yPosition += 10;

    if (index < records.length - 1) {
      doc.setDrawColor(200, 200, 200);
      doc.line(15, yPosition, pageWidth - 15, yPosition);
      yPosition += 10;
    }
  });

  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Página ${i} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  const fileName = `Prontuario_${patientName.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`;
  doc.save(fileName);
};
