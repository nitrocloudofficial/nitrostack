import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const exportDashboardToPDF = async (dashboardElementId = 'dashboard-container', filename = 'Battery_Analysis_Report.pdf') => {
  const element = document.getElementById(dashboardElementId);
  if (!element) {
    console.error(`Element with id ${dashboardElementId} not found`);
    return;
  }

  try {
    // Add a class temporarily if we need specific print styling
    element.classList.add('pdf-export-mode');

    const canvas = await html2canvas(element, {
      scale: 2, // Higher resolution
      useCORS: true,
      logging: false,
      backgroundColor: '#0B0C10', // Match our dark theme background
    });
    
    element.classList.remove('pdf-export-mode');

    const imgData = canvas.toDataURL('image/png');
    
    // Calculate PDF dimensions (A4 format)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    // Add title page or header if we wanted to
    pdf.setFillColor(11, 12, 16);
    pdf.rect(0, 0, pdfWidth, pdf.internal.pageSize.getHeight(), 'F');
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    
    // Add additional pages if the content is too long
    let heightLeft = pdfHeight - pdf.internal.pageSize.getHeight();
    let position = -pdf.internal.pageSize.getHeight();
    
    while (heightLeft >= 0) {
      pdf.addPage();
      pdf.setFillColor(11, 12, 16);
      pdf.rect(0, 0, pdfWidth, pdf.internal.pageSize.getHeight(), 'F');
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pdf.internal.pageSize.getHeight();
      position -= pdf.internal.pageSize.getHeight();
    }

    pdf.save(filename);
    return true;
  } catch (error) {
    console.error("Failed to export PDF", error);
    return false;
  }
};
