import jsPDF from 'jspdf';

interface Report {
  id: string;
  title: string;
  content: string;
  report_date: string;
  report_type: string;
  created_at: string;
  updated_at: string;
  patient: {
    id: string;
    name: string;
  };
}

interface PatientInfo {
  name: string;
  birth_date?: string;
  document?: string;
  email?: string;
  professional_id?: string;
}

interface ProfessionalInfo {
  name: string;
}

// Função auxiliar para converter SVG em imagem com alta resolução
const svgToImage = (svgString: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // Aumentar a resolução para melhor qualidade (2x ou 3x)
      const scale = 3;
      canvas.width = 150 * scale;
      canvas.height = 112 * scale;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Melhorar a qualidade de renderização
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

export const generateReportPDF = async (report: Report, patientInfo?: PatientInfo, professionalInfo?: ProfessionalInfo) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 15;

  // Logo no topo - tentar carregar o SVG
  try {
    // Tentar carregar o SVG do arquivo
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
    // Dois pontos decorativos
    doc.setFillColor(189, 119, 118);
    doc.circle(pageWidth / 2 - 2, yPosition + 2, 1, 'F');
    doc.circle(pageWidth / 2 + 2, yPosition + 2, 1, 'F');
    
    yPosition += 8;
    
    // Nome da psicóloga
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(189, 119, 118);
    doc.text('Jéssika Beatriz', pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 6;
    
    // Profissão
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
  doc.roundedRect(15, yPosition - 5, pageWidth - 30, 35, 3, 3, 'F');
  
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 41, 55); // Cinza escuro
  doc.text('DADOS DO PACIENTE', 20, yPosition + 2);

  yPosition += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(`Nome: ${report.patient.name}`, 20, yPosition);

  if (patientInfo?.birth_date) {
    yPosition += 5;
    doc.text(
      `Data de Nascimento: ${new Date(patientInfo.birth_date).toLocaleDateString('pt-BR')}`,
      20,
      yPosition
    );
  }

  if (patientInfo?.document) {
    yPosition += 5;
    doc.text(`Documento: ${patientInfo.document}`, 20, yPosition);
  }

  yPosition += 20;

  // Conteúdo do Relatório
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(31, 41, 55);
  doc.text('RELATÓRIO', 15, yPosition);

  yPosition += 8;
  doc.setDrawColor(229, 231, 235); // Linha cinza clara
  doc.setLineWidth(0.5);
  doc.line(15, yPosition, pageWidth - 15, yPosition);
  yPosition += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.setLineHeightFactor(1.5);

  // Quebrar o conteúdo em linhas que cabem na página
  const contentLines = doc.splitTextToSize(report.content || 'Sem conteúdo', pageWidth - 40);
  contentLines.forEach((line: string) => {
    if (yPosition > pageHeight - 50) {
      doc.addPage();
      yPosition = 20;
    }
    doc.text(line, 20, yPosition);
    yPosition += 6;
  });

  // Adicionar data do relatório e assinatura do profissional no final, antes do rodapé
  yPosition += 15;
  
  // Verificar se precisa de nova página para a data e assinatura
  if (yPosition > pageHeight - 50) {
    doc.addPage();
    yPosition = 20;
  }
  
  // Data do relatório
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);
  doc.text(
    `Data do Relatório: ${new Date(report.report_date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })}`,
    pageWidth / 2,
    yPosition,
    { align: 'center' }
  );

  // Assinatura do profissional
  if (professionalInfo) {
    yPosition += 20;
    
    // Linha para assinatura
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.5);
    doc.line(pageWidth / 2 - 40, yPosition, pageWidth / 2 + 40, yPosition);
    
    yPosition += 8;
    
    // Nome do profissional
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(
      professionalInfo.name,
      pageWidth / 2,
      yPosition,
      { align: 'center' }
    );
  }

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

  // Nome do arquivo
  const fileName = `Relatorio_${report.title.replace(/\s+/g, '_')}_${report.patient.name.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`;
  doc.save(fileName);
};

