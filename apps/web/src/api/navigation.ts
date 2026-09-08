// 🔱 Archon Navigation Bridge (VM and JSDOM Safe Redirection)
/** Redirige al login; no-op fuera de un entorno con `window` (VM/JSDOM). */
export default function redirectUserToLogin(): void {
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}
