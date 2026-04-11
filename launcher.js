/**
 * Archon Survival Launcher for Hostinger
 * If the main API fails to start, this script starts a basic HTTP server
 * to display the diagnostics in the browser, bypassing the 503 error.
 */
const http = require('http');
const path = require('path');
const fs = require('fs');

const PORT = Number(process.env.PORT) || 3001;
const entryPoint = path.join(__dirname, 'apps/api/dist/index.js');

console.log('🚀 [Archon Launcher] Booting Survival Sequence...');

function startSurvivalServer(errorInfo) {
  console.error('🆘 [Archon Launcher] Entering SURVIVAL MODE...');
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <body style="background:#111;color:#eee;font-family:sans-serif;padding:40px;">
        <h1 style="color:#ff4d4d">⚠️ Archon System Exception</h1>
        <p>El servidor principal no pudo iniciar. Aquí están los detalles del fallo:</p>
        <pre style="background:#222;padding:20px;border-radius:8px;border:1px solid #333;overflow:auto;">${errorInfo}</pre>
        <hr style="border:0;border-top:1px solid #333;margin:40px 0;">
        <p style="font-size:0.8em;color:#888;">Hostinger Node Environment | Entry: ${entryPoint}</p>
      </body>
    `);
  });
  server.listen(PORT, () => {
    console.log(`📡 [Archon Launcher] Survival Server online on port ${PORT}`);
  });
}

try {
  if (fs.existsSync(entryPoint)) {
    console.log('✨ [Archon Launcher] Production files present. Igniting Fastify...');
    // Clear cache to ensure fresh start
    delete require.cache[require.resolve(entryPoint)];
    require(entryPoint);
  } else {
    throw new Error(`MISSING_BUILD: El archivo ${entryPoint} no existe. Hostinger no ejecutó la compilación correctamente.`);
  }
} catch (err) {
  startSurvivalServer(err.stack || err.toString());
}
