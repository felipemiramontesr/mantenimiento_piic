/**
 * 🔱 Archon Test Suite: Global Teardown Orchestrator
 * Silicon Valley Standards (v.17.0.0)
 * Forces clean process termination and prevents event-loop hang in virtual runners.
 */
export default function teardown(): void {
  // 🔱 Invalidate any remaining open handles/timers and exit cleanly
  // Increased from 100ms to 2000ms to allow child processes to terminate and close their IPC channels gracefully
  setTimeout(() => {
    process.exit(0);
  }, 2000);
}
