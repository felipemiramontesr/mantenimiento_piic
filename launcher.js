/**
 * Archon Master Launcher for Hostinger
 * This script ensures the API is built and the Fastify server starts correctly
 * even in restricted environments.
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 [Archon Launcher] Initializing deployment sequence...');

try {
  // 1. Install dependencies if node_modules is missing
  if (!fs.existsSync(path.join(__dirname, 'node_modules'))) {
    console.log('📦 [Archon Launcher] Installing dependencies...');
    execSync('npm install --production', { stdio: 'inherit' });
  }

  // 2. Build the API
  console.log('🏗️ [Archon Launcher] Building TypeScript API...');
  execSync('npm run build --workspace=@mantenimiento/api', { stdio: 'inherit' });

  // 3. Verify build output
  const entryPoint = path.join(__dirname, 'apps/api/dist/index.js');
  if (!fs.existsSync(entryPoint)) {
    throw new Error('Build output (dist/index.js) not found after compilation.');
  }

  console.log('✨ [Archon Launcher] Build successful. Launching Fastify server...');
  
  // 4. Require and run the compiled server
  require(entryPoint);

} catch (error) {
  console.error('❌ [Archon Launcher] CRITICAL FAILURE during launch:');
  console.error(error);
  process.exit(1);
}
