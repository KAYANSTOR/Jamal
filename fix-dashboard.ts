import fs from 'fs';

let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

// The broken leftover code is:
//     return map[type] || type;
//   };
//
//   const isNegativeMovement = (type: string) => ['ISSUE', 'TRANSFER_OUT', 'DAMAGE', 'ADJUSTMENT_OUT', 'INTERNAL_ISSUE', 'INTERNAL_ISSUE_EXCHANGE_OUT'].includes(type);

content = content.replace(/return map\[type\] \|\| type;\s*};\s*/g, '');
content = content.replace(/const isNegativeMovement = \(type: string\) => \['ISSUE', 'TRANSFER_OUT', 'DAMAGE', 'ADJUSTMENT_OUT', 'INTERNAL_ISSUE', 'INTERNAL_ISSUE_EXCHANGE_OUT'\]\.includes\(type\);\s*/g, '');

fs.writeFileSync('src/pages/Dashboard.tsx', content);
