import jsPDF from 'jspdf';

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

// Função auxiliar para converter SVG em imagem com alta resolução
const svgToImage = (svgString: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = 3;
      canvas.width = 150 * scale;
      canvas.height = 112 * scale;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/png');
        URL.revokeObjectURL(url);
        resolve(dataUrl);
      } else {
        URL.revokeObjectURL(url);
        reject(new Error('Could not get canvas context'));
      }
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load SVG'));
    };
    
    img.src = url;
  });
};

export const generatePDFReport = async (records: MedicalRecord[], patientName: string) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 15;

  // Logo no topo - tentar carregar o SVG
  try {
    const response = await fetch('/src/assets/logo.svg');
    if (response.ok) {
      const svgString = await response.text();
      const logoDataUrl = await svgToImage(svgString);
      doc.addImage(logoDataUrl, 'PNG', pageWidth / 2 - 30, yPosition, 60, 45);
      yPosition += 50;
    } else {
      throw new Error('SVG not found');
    }
  } catch (error) {
    // Fallback: representação visual do logo
    doc.setFillColor(189, 119, 118);
    doc.circle(pageWidth / 2 - 2, yPosition + 2, 1, 'F');
    doc.circle(pageWidth / 2 + 2, yPosition + 2, 1, 'F');
    
    yPosition += 8;
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(189, 119, 118);
    doc.text('Jéssika Beatriz', pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 6;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(189, 119, 118);
    doc.text('PSICÓLOGA', pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 12;
  }
  
  // Linha decorativa
  doc.setDrawColor(189, 119, 118);
  doc.setLineWidth(0.5);
  doc.line(15, yPosition, pageWidth - 15, yPosition);
  
  yPosition += 15;

  // Dados do Paciente em box elegante
  doc.setFillColor(249, 250, 251); // Cinza claro
  doc.roundedRect(15, yPosition - 5, pageWidth - 30, 30, 3, 3, 'F');
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 41, 55); // Cinza escuro
  doc.text('DADOS DO PACIENTE', 20, yPosition + 2);

  yPosition += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(`Nome: ${patientName}`, 20, yPosition);

  if (records[0]?.patient.birth_date) {
    yPosition += 5;
    doc.text(
      `Data de Nascimento: ${new Date(records[0].patient.birth_date).toLocaleDateString('pt-BR')}`,
      20,
      yPosition
    );
  }

  if (records[0]?.patient.document) {
    yPosition += 5;
    doc.text(`Documento: ${records[0].patient.document}`, 20, yPosition);
  }

  yPosition += 20;

  // Histórico de Consultas
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 41, 55);
  doc.text('HISTÓRICO DE CONSULTAS', 15, yPosition);

  yPosition += 10;

  records.forEach((record, index) => {
    if (yPosition > pageHeight - 60) {
      doc.addPage();
      yPosition = 20;
    }

    // Box para cada consulta
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(15, yPosition - 5, pageWidth - 30, 5, 3, 3, 'F');
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(31, 41, 55);
    doc.text(`Consulta ${index + 1}`, 20, yPosition);

    yPosition += 8;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128);

    const consultDate = record.appointment
      ? new Date(record.appointment.appointment_date).toLocaleString('pt-BR')
      : new Date(record.record_date).toLocaleString('pt-BR');

    doc.text(`Data: ${consultDate}`, 20, yPosition);

    if (record.appointment) {
      yPosition += 5;
      doc.text(`Tipo: ${record.appointment.service_type === 'online' ? 'Online' : 'Presencial'}`, 20, yPosition);
    }

    yPosition += 8;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text('Evolução:', 20, yPosition);

    yPosition += 6;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.setLineHeightFactor(1.5);

    const contentLines = doc.splitTextToSize(record.content || 'Não preenchido', pageWidth - 40);
    contentLines.forEach((line: string) => {
      if (yPosition > pageHeight - 50) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(line, 20, yPosition);
      yPosition += 5;
    });

    // Assinatura do profissional
    if (record.signed && record.professional_name) {
      yPosition += 8;

      if (yPosition > pageHeight - 40) {
        doc.addPage();
        yPosition = 20;
      }

      // Linha para assinatura
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(20, yPosition, pageWidth - 40, yPosition);
      
      yPosition += 6;
      
      // Nome do profissional
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(record.professional_name, 20, yPosition);

      if (record.professional_registration) {
        yPosition += 4;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(107, 114, 128);
        doc.text(`Registro: ${record.professional_registration}`, 20, yPosition);
      }

      if (record.signed_at) {
        yPosition += 4;
        doc.text(
          `Data da assinatura: ${new Date(record.signed_at).toLocaleDateString('pt-BR')}`,
          20,
          yPosition
        );
      }
    }

    yPosition += 15;

    if (index < records.length - 1) {
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.5);
      doc.line(15, yPosition, pageWidth - 15, yPosition);
      yPosition += 10;
    }
  });

  // Rodapé elegante com numeração de páginas
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    
    // Linha decorativa no rodapé
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.5);
    doc.line(15, pageHeight - 20, pageWidth - 15, pageHeight - 20);
    
    // Numeração de páginas
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(107, 114, 128); // Cinza médio
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
