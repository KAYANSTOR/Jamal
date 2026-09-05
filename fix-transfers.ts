import fs from 'fs';

// Fix FormDialog
let dialogContent = fs.readFileSync('src/components/stock-transfers/StockTransferFormDialog.tsx', 'utf8');

dialogContent = dialogContent.replace(
  'await StockTransferRepository.sendTransfer(draft?.id || \'\', getTransferData());',
  'await StockTransferRepository.sendTransfer(draft?.id || \'\', { id: draft?.id || \'\', ...getTransferData() });'
);

fs.writeFileSync('src/components/stock-transfers/StockTransferFormDialog.tsx', dialogContent);

// Fix StockTransfers.tsx
let pageContent = fs.readFileSync('src/pages/StockTransfers.tsx', 'utf8');

pageContent = pageContent.replace(
  "import { Button } from '../ui/button';",
  "import { Button } from '../components/ui/button';"
);

pageContent = pageContent.replace(
  "import { Input } from '../ui/input';",
  "import { Input } from '../components/ui/input';"
);

pageContent = pageContent.replace(
  "import { Select } from '../ui/select';",
  "import { Select } from '../components/ui/select';"
);

fs.writeFileSync('src/pages/StockTransfers.tsx', pageContent);

