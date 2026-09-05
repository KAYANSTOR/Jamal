import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface PDFExportOptions {
  filename?: string;
  margin?: number;
  scale?: number;
}

/**
 * Exports an HTML element to a professional PDF document.
 * Captures the DOM as an image to perfectly preserve Tailwind styling, RTL layout, and fonts.
 */
export async function exportElementToPDF(
  elementId: string, 
  options: PDFExportOptions = {}
): Promise<void> {
  const { 
    filename = 'report.pdf', 
    margin = 10,
    scale = 2
  } = options;

  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id "${elementId}" not found for PDF export.`);
    return;
  }

  // Create an overlay to show loading (optional, but good for UX)
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
  overlay.style.zIndex = '9999';
  overlay.style.display = 'flex';
  overlay.style.alignItems = 'center';
  overlay.style.justifyContent = 'center';
  overlay.style.fontSize = '1.25rem';
  overlay.style.fontWeight = 'bold';
  overlay.style.color = 'var(--color-primary)';
  overlay.innerText = 'جاري تصدير الملف...';
  document.body.appendChild(overlay);

  try {
    // Preserve original inline styles
    const originalStyles = {
      width: element.style.width,
      height: element.style.height,
      maxHeight: element.style.maxHeight,
      overflow: element.style.overflow,
    };

    // Temporarily expand element so html2canvas captures full height, not just scrollable area
    element.style.width = '1000px'; 
    element.style.height = 'max-content';
    element.style.maxHeight = 'none';
    element.style.overflow = 'visible';

    // A class for any specific print overrides (e.g. hiding scrollbars)
    element.classList.add('pdf-export-mode');

    // Wait for any potential layout reflows
    await new Promise(resolve => setTimeout(resolve, 300));

    const canvas = await html2canvas(element, {
      scale, // Higher scale = better resolution
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 1000,
    });

    // Restore original styles
    element.style.width = originalStyles.width;
    element.style.height = originalStyles.height;
    element.style.maxHeight = originalStyles.maxHeight;
    element.style.overflow = originalStyles.overflow;
    element.classList.remove('pdf-export-mode');

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    
    // Initialize PDF (A4 format: 210 x 297 mm)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    // Calculate content dimensions inside margins
    const contentWidth = pdfWidth - (margin * 2);
    const contentHeight = (canvas.height * contentWidth) / canvas.width;
    
    let heightLeft = contentHeight;
    let position = margin; // Start from top margin

    // First page
    pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, contentHeight);
    heightLeft -= (pdfHeight - (margin * 2));

    // Additional pages for multi-page reports
    while (heightLeft > 0) {
      position = heightLeft - contentHeight + margin; // Offset for the next page
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', margin, position, contentWidth, contentHeight);
      heightLeft -= (pdfHeight - (margin * 2));
    }

    pdf.save(filename);
  } catch (error) {
    console.error('Error generating PDF:', error);
    alert('حدث خطأ أثناء تصدير التقرير.');
  } finally {
    document.body.removeChild(overlay);
  }
}
