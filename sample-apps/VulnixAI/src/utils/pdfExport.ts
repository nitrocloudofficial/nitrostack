import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PDFExportOptions {
  title: string;
  subtitle?: string;
  sections: Array<{
    title: string;
    content?: string;
    table?: {
      headers: string[];
      rows: (string | number)[][];
    };
    list?: string[];
  }>;
  metadata?: {
    date: string;
    url?: string;
    score?: number;
  };
}

export const exportToPDF = (options: PDFExportOptions) => {
  const doc = new jsPDF();
  let yPosition = 20;

  // Helper function to clean text from emojis and special characters
  const cleanText = (text: string): string => {
    return text
      .replace(/[🔴🟠🟡🔵ℹ️⚠️✅🔍💉🔧🔐📊🚨📋📈🎯✓•═]/gu, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Header with emphasis
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(220, 38, 38); // Red color for emphasis
  doc.text(cleanText(options.title), 20, yPosition);
  yPosition += 12;

  if (options.subtitle) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text(options.subtitle, 20, yPosition);
    yPosition += 10;
  }

  // Metadata
  if (options.metadata) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    
    if (options.metadata.date) {
      doc.text(`Date: ${options.metadata.date}`, 20, yPosition);
      yPosition += 6;
    }
    
    if (options.metadata.url) {
      doc.text(`URL: ${options.metadata.url}`, 20, yPosition);
      yPosition += 6;
    }
    
    if (options.metadata.score !== undefined) {
      // Color code the score
      const score = options.metadata.score;
      if (score >= 80) {
        doc.setTextColor(34, 197, 94); // Green
      } else if (score >= 60) {
        doc.setTextColor(234, 179, 8); // Yellow
      } else {
        doc.setTextColor(239, 68, 68); // Red
      }
      doc.setFont('helvetica', 'bold');
      doc.text(`Risk Score: ${options.metadata.score}`, 20, yPosition);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      yPosition += 6;
    }
    
    yPosition += 5;
  }

  // Line separator
  doc.setDrawColor(200, 200, 200);
  doc.line(20, yPosition, 190, yPosition);
  yPosition += 10;

  // Sections
  options.sections.forEach((section) => {
    // Check if we need a new page
    if (yPosition > 270) {
      doc.addPage();
      yPosition = 20;
    }

    const cleanTitle = cleanText(section.title);
    
    // Section title with special formatting for vulnerabilities
    const isVulnerability = section.title.includes('VULNERABILITY') || section.title.includes('CRITICAL');
    const isSeparator = section.title.includes('═══');
    
    if (isSeparator) {
      // Draw separator line
      doc.setDrawColor(220, 38, 38);
      doc.setLineWidth(0.5);
      doc.line(20, yPosition, 190, yPosition);
      yPosition += 5;
      return;
    }

    doc.setFontSize(isVulnerability ? 13 : 14);
    doc.setFont('helvetica', 'bold');
    
    if (isVulnerability) {
      // Red background for vulnerability titles
      doc.setFillColor(254, 226, 226);
      doc.rect(18, yPosition - 5, 174, 8, 'F');
      doc.setTextColor(220, 38, 38);
    } else if (section.title.includes('SECURE') || section.title.includes('Passed')) {
      doc.setTextColor(34, 197, 94); // Green for secure
    } else if (section.title.includes('WARNING') || section.title.includes('DETECTED')) {
      doc.setTextColor(234, 179, 8); // Yellow for warnings
    } else {
      doc.setTextColor(0, 0, 0);
    }
    
    doc.text(cleanTitle, 20, yPosition);
    yPosition += 8;

    // Reset colors
    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'normal');

    // Section content
    if (section.content) {
      doc.setFontSize(10);
      
      const cleanContent = cleanText(section.content);
      const lines = doc.splitTextToSize(cleanContent, 170);
      
      lines.forEach((line: string) => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }
        
        // Color code based on content
        if (line.includes('VULNERABLE') || line.includes('CRITICAL') || line.includes('HIGH')) {
          doc.setTextColor(220, 38, 38);
          doc.setFont('helvetica', 'bold');
        } else if (line.includes('MEDIUM')) {
          doc.setTextColor(234, 179, 8);
          doc.setFont('helvetica', 'bold');
        } else if (line.includes('SEVERITY:') || line.includes('CATEGORY:') || line.includes('STATUS:')) {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(0, 0, 0);
        } else if (line.includes('DESCRIPTION:')) {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(60, 60, 60);
        } else {
          doc.setTextColor(60, 60, 60);
          doc.setFont('helvetica', 'normal');
        }
        
        doc.text(line, 20, yPosition);
        yPosition += 5;
      });
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(60, 60, 60);
      yPosition += 3;
    }

    // Section list
    if (section.list && section.list.length > 0) {
      doc.setFontSize(10);
      section.list.forEach((item) => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 20;
        }
        
        const cleanItem = cleanText(item);
        
        // Highlight important items
        if (item.includes('EVIDENCE') || item.includes('PAYLOAD')) {
          doc.setFillColor(255, 243, 205);
          doc.rect(23, yPosition - 4, 165, 6, 'F');
          doc.setTextColor(180, 83, 9);
          doc.setFont('helvetica', 'bold');
        } else if (item.includes('RECOMMENDATION')) {
          doc.setTextColor(22, 163, 74);
          doc.setFont('helvetica', 'bold');
        } else {
          doc.setTextColor(60, 60, 60);
          doc.setFont('helvetica', 'normal');
        }
        
        const lines = doc.splitTextToSize(`- ${cleanItem}`, 165);
        doc.text(lines, 25, yPosition);
        yPosition += lines.length * 5 + 2;
        
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);
      });
      yPosition += 5;
    }

    // Section table
    if (section.table) {
      const isVulnTable = section.title.includes('Vulnerability') || section.title.includes('Severity');
      
      // Clean table data
      const cleanHeaders = section.table.headers.map(h => cleanText(String(h)));
      const cleanRows = section.table.rows.map(row => 
        row.map(cell => cleanText(String(cell)))
      );
      
      autoTable(doc, {
        startY: yPosition,
        head: [cleanHeaders],
        body: cleanRows,
        theme: 'grid',
        headStyles: { 
          fillColor: isVulnTable ? [220, 38, 38] : [41, 128, 185],
          fontStyle: 'bold',
          textColor: [255, 255, 255],
        },
        bodyStyles: {
          fontSize: 10,
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
        margin: { left: 20, right: 20 },
        didParseCell: function(data) {
          // Highlight vulnerability rows
          if (data.section === 'body') {
            const cellText = data.cell.text.join('');
            if (cellText.includes('CRITICAL')) {
              data.cell.styles.textColor = [220, 38, 38];
              data.cell.styles.fontStyle = 'bold';
            } else if (cellText.includes('HIGH')) {
              data.cell.styles.textColor = [234, 88, 12];
              data.cell.styles.fontStyle = 'bold';
            } else if (cellText.includes('MEDIUM')) {
              data.cell.styles.textColor = [202, 138, 4];
            } else if (cellText.includes('VULNERABLE') || cellText.includes('ACTION REQUIRED')) {
              data.cell.styles.textColor = [220, 38, 38];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        },
      });
      yPosition = (doc as any).lastAutoTable.finalY + 10;
    }

    yPosition += 5;
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${pageCount} - Generated by VulnixAI - CONFIDENTIAL`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  return doc;
};

export const downloadPDF = (doc: jsPDF, filename: string) => {
  doc.save(filename);
};

export const sharePDF = async (doc: jsPDF, title: string) => {
  if (navigator.share) {
    const pdfBlob = doc.output('blob');
    const file = new File([pdfBlob], `${title}.pdf`, { type: 'application/pdf' });
    
    try {
      await navigator.share({
        title: title,
        files: [file],
      });
      return true;
    } catch (error) {
      console.error('Error sharing:', error);
      return false;
    }
  } else {
    // Fallback: just download
    downloadPDF(doc, `${title}.pdf`);
    return false;
  }
};
