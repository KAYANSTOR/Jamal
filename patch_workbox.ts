import fs from 'fs';
const path = '/app/applet/vite.config.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace("workbox: {", "workbox: {\n          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,");

fs.writeFileSync(path, content);
