import fs from 'fs';

let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

if (!content.includes('import { useNavigate }')) {
  content = content.replace("import React, { useState } from 'react';", "import React, { useState } from 'react';\nimport { useNavigate } from 'react-router';");
}

if (!content.includes('const navigate = useNavigate();')) {
  content = content.replace("const [theme, setTheme] = useState<'light' | 'dark'>('light');", "const navigate = useNavigate();\n  const [theme, setTheme] = useState<'light' | 'dark'>('light');");
}

content = content.replace(
  '<Button variant="default">',
  '<Button variant="default" onClick={() => navigate("/issues")}>'
);

fs.writeFileSync('src/pages/Dashboard.tsx', content);
