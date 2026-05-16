const fs = require('fs');
const path = require('path');

const files = [
  'apps/web/src/hooks/useFleetForm.ts',
  'apps/web/src/api/client.ts'
];

files.forEach(file => {
  const fullPath = path.resolve(__dirname, file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    content = content.replace(/[ \t]*\/\/[ \t]*eslint-disable-next-line[^\n]*\n/g, '');
    content = content.replace(/[ \t]*\/\*[ \t]*eslint-disable-next-line[^\n]*\*\/\n/g, '');
    fs.writeFileSync(fullPath, content);
  }
});
console.log('Fixed inline directives');
