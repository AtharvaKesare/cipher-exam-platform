const fs = require('fs');
const file = 'c:/AI-Powered Proctored Coding Exam Platform/frontend/app/exam/[examId]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/bg-\[#111827\]/g, 'bg-card');
content = content.replace(/bg-\[#0B0F14\]/g, 'bg-background');
content = content.replace(/border-white\/5/g, 'border-border/50');
content = content.replace(/border-white\/10/g, 'border-border');
content = content.replace(/text-white/g, 'text-foreground');
content = content.replace(/bg-\[#1E1E1E\]/g, 'dark:bg-[#1E1E1E] bg-[#FAFAFA]');
content = content.replace(/bg-\[#252526\]/g, 'dark:bg-[#252526] bg-[#F1F5F9]');
content = content.replace(/bg-\[#374151\]/g, 'bg-muted text-foreground');
content = content.replace(/bg-\[#1F2937\]/g, 'bg-card text-foreground');
content = content.replace(/border-white\/20/g, 'border-border');
content = content.replace(/text-\[#CCCCCC\]/g, 'text-muted-foreground');
content = content.replace(/hover:bg-\[#374151\]/g, 'hover:bg-muted');
content = content.replace(/hover:bg-\[#4B5563\]/g, 'hover:bg-muted-foreground/20');
content = content.replace(/hover:bg-\[#4F46E5\]/g, 'hover:bg-primary/90');
content = content.replace(/bg-black\/60/g, 'bg-black/40 backdrop-blur-md');
content = content.replace(/bg-black/g, 'bg-card');

// Add next-themes hook
content = content.replace(
  "import { AlertCircle, AlertTriangle, Maximize, Play, CheckCircle, VideoOff, TerminalSquare, ShieldAlert, ShieldCheck } from 'lucide-react';",
  "import { AlertCircle, AlertTriangle, Maximize, Play, CheckCircle, VideoOff, TerminalSquare, ShieldAlert, ShieldCheck } from 'lucide-react';\nimport { useTheme } from 'next-themes';"
);

content = content.replace(
  "const router = useRouter();",
  "const router = useRouter();\n  const { resolvedTheme } = useTheme();"
);

content = content.replace(
  'theme="dark"',
  'theme={resolvedTheme === "light" ? "light" : "dark"}'
);

fs.writeFileSync(file, content, 'utf8');
console.log('File updated successfully.');
