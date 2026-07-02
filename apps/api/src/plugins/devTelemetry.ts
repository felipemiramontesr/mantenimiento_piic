/* eslint-disable no-console */
import { FastifyInstance, FastifyError } from 'fastify';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

/* eslint-disable no-underscore-dangle */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
/* eslint-enable no-underscore-dangle */

export default async function devTelemetryPlugin(fastify: FastifyInstance): Promise<void> {
  // Layer 1: Environmental Hard Guard (Double confirmation)
  if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test') {
    return;
  }

  fastify.setErrorHandler(async (error: FastifyError, request, reply) => {
    // 1. Log error to standard output
    fastify.log.error(error);

    // 2. Report to handoff file H
    try {
      // Resolve path relative to this plugin's location (EAL6+ robust resolution)
      const handoffPath = path.resolve(
        __dirname,
        '../../../../Protocolos/North_Star/002_NS_HandoffCcToAg.md'
      );

      // Layer 2: Physical Filesystem Guard
      if (fs.existsSync(handoffPath)) {
        const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

        // Sanitize path names inside stack trace
        let cleanStack = error.stack || error.toString();
        const absoluteWorkspacePrefix = path.resolve(__dirname, '../../../../').replace(/\\/g, '/');
        cleanStack = cleanStack.replace(
          new RegExp(absoluteWorkspacePrefix.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi'),
          '.'
        );

        // Formulate Diagnostics block
        let entryBlock = `[DIAGNÓSTICO] API_RUNTIME_ERROR (${error.code || 'UNKNOWN'})\n`;
        entryBlock += `[ROUTE] ${request.method} ${request.url}\n`;
        entryBlock += `[MENSAJE] ${error.message}\n`;
        entryBlock += `[STACK]\n\`\`\`\n${cleanStack.split('\n').slice(0, 5).join('\n')}\n\`\`\`\n`;
        entryBlock += `[ESTADO] Error de ejecución detectado en la API.\n`;

        // Read and update handoff metadata and title
        let content = fs.readFileSync(handoffPath, 'utf8');

        // Compactor Layer: Check if an Archon block already exists at the end of the file
        const archonBlockRegex =
          /\r?\n---\r?\n\s*(?:\*\*)?Archon\s*→\s*CC\/AG(?:\*\*)?\s*·\s*\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\r?\n([\s\S]*)$/i;
        const match = content.match(archonBlockRegex);

        let finalMessageBlock = '';
        if (match) {
          // If it exists, we preserve its existing body content, remove it from the file, and rebuild it with the new entry appended
          const existingBody = match[1].trim();
          content = content.replace(archonBlockRegex, '');

          finalMessageBlock = `\n---\n\n`;
          finalMessageBlock += `**Archon → CC/AG** · ${timestamp}\n`;
          finalMessageBlock += `${existingBody}\n\n---\n\n${entryBlock}`;
        } else {
          // If it doesn't exist, we create a new one
          finalMessageBlock = `\n---\n\n`;
          finalMessageBlock += `**Archon → CC/AG** · ${timestamp}\n`;
          finalMessageBlock += `${entryBlock}`;
        }

        // Update Último mensaje
        content = content.replace(
          /Último mensaje\s*:\s*(?:\*\*)?.*?(?:\*\*)?\s*·\s*\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/,
          `Último mensaje  : **Archon → CC/AG** · ${timestamp}`
        );

        // Update title format if old exists
        if (content.includes('# HANDOFF CC → AG — Archon ERP')) {
          content = content.replace('# HANDOFF CC → AG — Archon ERP', '# HANDOFF Archon → CC/AG');
        }
        if (
          content.includes(
            'HANDOFF CC → AG\n═══════════════════════════════════════════════════════════════'
          )
        ) {
          content = content.replace(
            'HANDOFF CC → AG\n═══════════════════════════════════════════════════════════════',
            'HANDOFF Archon → CC/AG\n═══════════════════════════════════════════════════════════════'
          );
        }

        fs.writeFileSync(handoffPath, content + finalMessageBlock, 'utf8');
        console.log(`\n📡 [SYSTEM_DOCTOR] Reportada excepción de API en HANDOFF_CC_TO_AG.md`);
      }
    } catch (writeErr) {
      // Fail silently to avoid crashing server if filesystem has issues
    }

    // 3. Respond with standard JSON error response under Section 2.5
    const statusCode = error.statusCode || 500;
    const errorCode = statusCode === 400 ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR';

    return reply.code(statusCode).send({
      success: false,
      code: errorCode,
      message: error.message,
    });
  });
}

// Skip encapsulation so that setErrorHandler applies globally to all routes registered on parent context
(devTelemetryPlugin as unknown as Record<symbol, boolean>)[Symbol.for('skip-override')] = true;
