import fs from 'fs';

const metadataPath = '/app/applet/metadata.json';
let metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
metadata.name = "إدارة المؤسسة";
fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

const indexHtmlPath = '/app/applet/index.html';
let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
indexHtml = indexHtml.replace(/<title>نظام إدارة المخزون<\/title>/g, "<title>إدارة المؤسسة</title>");
indexHtml = indexHtml.replace(/content="المخزون"/g, 'content="إدارة المؤسسة"');
indexHtml = indexHtml.replace(/content="نظام إدارة المخزون"/g, 'content="إدارة المؤسسة"');
fs.writeFileSync(indexHtmlPath, indexHtml);
