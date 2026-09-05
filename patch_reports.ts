import fs from 'fs';

let content = fs.readFileSync('src/pages/Reports.tsx', 'utf8');

// 1. Add import for exportElementToPDF
if (!content.includes('exportElementToPDF')) {
  content = content.replace(
    "import { format } from 'date-fns';",
    "import { format } from 'date-fns';\nimport { exportElementToPDF } from '../lib/pdfExport';"
  );
}

// 2. Add handleExportPDF
const handleExportCode = `
  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    await exportElementToPDF('report-container', {
      filename: \`Report-\${activeTab}-\${format(new Date(), 'yyyy-MM-dd')}.pdf\`,
      margin: 15
    });
  };
`;

content = content.replace(
  "const handlePrint = () => {\n    window.print();\n  };",
  handleExportCode
);

// 3. Update the page actions
const oldActions = `<Button variant="outline" onClick={handlePrint}>
          <Printer size={18} className="me-2" />
          طباعة التقرير
        </Button>`;

const newActions = `<Button variant="outline" onClick={handlePrint}>
          <Printer size={18} className="me-2" />
          طباعة
        </Button>
        <Button variant="default" onClick={handleExportPDF}>
          <Download size={18} className="me-2" />
          تصدير PDF
        </Button>`;

content = content.replace(oldActions, newActions);

// 4. Add id="report-container" to the Card
content = content.replace(
  "<Card className=\"shadow-[var(--shadow-soft)] border-0 ring-1 ring-[var(--color-border)] mb-8\">",
  "<Card id=\"report-container\" className=\"shadow-[var(--shadow-soft)] border-0 ring-1 ring-[var(--color-border)] mb-8 bg-[var(--color-background)]\">"
);

// 5. Add data-html2canvas-ignore to the filters
content = content.replace(
  '<div className="flex items-center gap-3 print:hidden">',
  '<div className="flex items-center gap-3 print:hidden" data-html2canvas-ignore="true">'
);

fs.writeFileSync('src/pages/Reports.tsx', content);
