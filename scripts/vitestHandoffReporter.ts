/* eslint-disable no-console, class-methods-use-this */
import { Reporter, File } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

interface VitestTask {
  type: string;
  name: string;
  tasks?: VitestTask[];
  result?: {
    state: string;
    errors?: Array<{ name: string; message: string }>;
  };
  state?: string;
}

export default class HandoffReporter implements Reporter {
  onFinished(files: File[] = []): void {
    // Layer 1: Environmental Hard Guard - Disable in CI
    if (process.env.GITHUB_ACTIONS || process.env.CI) {
      return;
    }

    const failures: Array<{ testName: string; filepath: string; errorMessage: string }> = [];

    // Helper to recursively collect failed tests from nested suites
    const collectFailures = (tasks: VitestTask[], filepath: string): void => {
      tasks.forEach((task) => {
        if (task.type === 'suite') {
          collectFailures(task.tasks || [], filepath);
        } else if (task.result?.state === 'fail' || task.state === 'fail') {
          const rawError = task.result?.errors?.[0];
          const errorMessage = rawError
            ? `${rawError.name}: ${rawError.message}`
            : 'Error desconocido';
          failures.push({
            testName: task.name,
            filepath,
            errorMessage,
          });
        }
      });
    };

    // Recorrer los resultados buscando tareas fallidas
    files.forEach((file) => {
      const filepath = path.relative(process.cwd(), file.filepath).replace(/\\/g, '/');
      collectFailures(file.tasks || [], filepath);
    });

    // Layer 2: Physical Filesystem Guard
    if (failures.length > 0) {
      // Find workspace root (both api and web are inside /apps subfolders, process.cwd() will be that subfolder)
      // So we resolve the path relative to the active workspace root
      const workspaceRoot = process.cwd().includes('apps')
        ? path.join(process.cwd(), '../..')
        : process.cwd();
      const handoffPath = path.join(workspaceRoot, 'Protocolos', 'HANDOFF_CC_TO_AG.md');

      if (fs.existsSync(handoffPath)) {
        const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

        // Formatear mensaje de falla
        let messageBlock = `\n---\n\n`;
        messageBlock += `**Archon → CC/AG** · ${timestamp}\n`;
        messageBlock += `[REPORTE] Se detectaron ${failures.length} pruebas fallidas en la terminal.\n`;

        failures.forEach((fail, index) => {
          messageBlock += `${index + 1}. [${fail.filepath}] ${fail.testName}\n`;
          messageBlock += `   ↳ ${fail.errorMessage}\n`;
        });
        messageBlock += `[ESTADO] Tests rotos en local. Detener ejecuciones hasta solucionar.\n`;

        try {
          // Leer y actualizar la metadata en la cabecera
          let content = fs.readFileSync(handoffPath, 'utf8');

          // Compactor Layer: Remove any existing Archon block at the end of the file to maintain 1 single message per interaction
          const archonBlockRegex =
            /\r?\n---\r?\n\s*(?:\*\*)?Archon\s*→\s*CC\/AG(?:\*\*)?\s*·[\s\S]*$/i;
          content = content.replace(archonBlockRegex, '');

          // Actualizar Último mensaje
          content = content.replace(
            /Último mensaje\s*:\s*(?:\*\*)?.*?(?:\*\*)?\s*·\s*\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/,
            `Último mensaje  : **Archon → CC/AG** · ${timestamp}`
          );

          // Actualizar título si es necesario
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

          // Escribir archivo consolidado
          fs.writeFileSync(handoffPath, content + messageBlock, 'utf8');
          console.log(
            `\n📡 [SYSTEM_DOCTOR] Reportadas ${failures.length} fallas de tests en HANDOFF_CC_TO_AG.md`
          );
        } catch (err) {
          // Silent catch to prevent Vitest from hanging or failing if filesystem write has issues
        }
      }
    }
  }
}
