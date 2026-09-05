import fs from 'fs';
const path = '/app/applet/vite.config.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace("name: 'نظام إدارة المخزون'", "name: 'إدارة المؤسسة'");
content = content.replace("short_name: 'المخزون'", "short_name: 'إدارة المؤسسة'");
content = content.replace("description: 'نظام متقدم لإدارة المخزون يدعم العمل دون اتصال.'", "description: 'نظام مخزون متكامل متعدد المخازن يعمل بخاصية Offline-First'");

fs.writeFileSync(path, content);
