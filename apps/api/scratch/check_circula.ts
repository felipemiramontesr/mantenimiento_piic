// Quick check: which units would be restricted today (Friday)?
// Friday restricts: last digit 9, 0
// Only applies to hologram 1 and 2 (00, 0, Exento are exempt)
const units = [
  { id: 'ASM-002', placas: 'ZH-3153-B', hologram: '2' },
  { id: 'ASM-006', placas: 'ZH-3161-B', hologram: '1' },
  { id: 'ASM-007', placas: 'ZH-3160-B', hologram: '1' },
  { id: 'ASM-019', placas: 'TJ-7355-F', hologram: '1' },
  { id: 'ASM-023', placas: 'UYM-047-C', hologram: '1' },
];

const today = new Date();
console.log('Today:', today.toLocaleDateString(), 'Day:', today.getDay(), '(5=Friday)');
console.log('Friday restricts digits: 9, 0\n');

for (const u of units) {
  const lastDigitMatch = u.placas.match(/\d(?=[^\d]*$)/);
  const lastDigit = lastDigitMatch ? parseInt(lastDigitMatch[0], 10) : -1;
  const restricted = today.getDay() === 5 && [9, 0].includes(lastDigit);
  console.log(`${u.id} | ${u.placas} | H-${u.hologram} | Last digit: ${lastDigit} | ${restricted ? '🚫 NO CIRCULA' : '✅ Circula'}`);
}

process.exit(0);
