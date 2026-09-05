import fs from 'fs';

const content = fs.readFileSync('tsconfig.json', 'utf8');
const parsed = JSON.parse(content);
parsed.compilerOptions.types = ["vite/client", "vite-plugin-pwa/client"];

fs.writeFileSync('tsconfig.json', JSON.stringify(parsed, null, 2));
