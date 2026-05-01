const fs = require('fs');
['app/page.tsx', 'app/dashboard/student/page.tsx', 'app/dashboard/teacher/page.tsx', 'app/login/page.tsx', 'app/register/page.tsx'].forEach(file => {
   if (fs.existsSync(file)) {
      let content = fs.readFileSync(file, 'utf8');
      content = content.replaceAll('type: "spring"', 'type: "spring" as any');
      content = content.replaceAll("type: 'spring'", 'type: "spring" as any');
      fs.writeFileSync(file, content);
   }
});
