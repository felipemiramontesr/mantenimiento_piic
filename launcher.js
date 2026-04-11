/**
 * Archon Master Launcher for Hostinger (Light Version)
 * Optimized to avoid 503 timeouts by skipping build if already present.
 */
const path = require('path');
const fs = require('fs');

console.log('🚀 [Archon Launcher] Starting production boot sequence...');

// Check for the compiled entry point
const entryPoint = path.join(__dirname, 'apps/api/dist/index.js');

if (fs.existsSync(entryPoint)) {
  console.log('✨ [Archon Launcher] Compiled files found. Launching server...');
  try {
    require(entryPoint);
  } catch (error) {
    console.error('❌ [Archon Launcher] Server failed to start:', error);
    process.exit(1);
  }
} else {
  console.log('🏗️ [Archon Launcher] dist/index.js not found. Attempting emergency build...');
  try {
    const { execSync } = require('child_process');
    // We only build if we absolutely have to, as this takes time and memory
    execSync('npm run build --workspace=@mantenimiento/api', { stdio: 'inherit' });
    
    if (fs.existsSync(entryPoint)) {
      console.log('✅ [Archon Launcher] Emergency build successful. Launching...');
      require(entryPoint);
    } else {
      throw new Error('Build finished but entry point still missing.');
    }
  } catch (error) {
    console.error('❌ [Archon Launcher] Emergency build/launch failed:');
    console.error(error);
    process.exit(1);
  }
}
