import fs from 'fs';

let content = fs.readFileSync('src/pages/Reports.tsx', 'utf8');

const badActions = `<Button variant="outline" onClick={handlePrint}>
          <Printer size={18} className="me-2" />
          طباعة
        </Button>
        <Button variant="default" onClick={handleExportPDF}>
          <Download size={18} className="me-2" />
          تصدير PDF
        </Button>`;

const goodActions = `<>
        <Button variant="outline" onClick={handlePrint}>
          <Printer size={18} className="me-2" />
          طباعة
        </Button>
        <Button variant="default" onClick={handleExportPDF}>
          <Download size={18} className="me-2" />
          تصدير PDF
        </Button>
        </>`;

content = content.replace(badActions, goodActions);
fs.writeFileSync('src/pages/Reports.tsx', content);
