// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');

const csvPath = path.join(process.cwd(), 'packages/database/seeds/fleet_master_final_ansi2.csv');
const content = fs.readFileSync(csvPath, 'latin1');
const lines = content.split('\r\n');

const newLines = lines.map((line, index) => {
  if (!line.trim()) return line;
  if (index === 0) return line.trim(); // sep=;
  if (index === 1) return `${line.trim()};Hologram`;

  const cols = line.split(';');
  if (cols.length < 5) return line;

  const year = parseInt(cols[4], 10);
  let hologram = '0';

  if (year >= 2023) hologram = '00';
  else if (year >= 2018) hologram = '0';
  else if (year >= 2016) hologram = '1';
  else hologram = '2';

  return `${line.trim()};${hologram}`;
});

fs.writeFileSync(csvPath, newLines.join('\r\n'), 'latin1');
// eslint-disable-next-line no-console
console.log('CSV updated successfully with Latin1 encoding.');
