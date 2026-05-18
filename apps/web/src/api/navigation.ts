/* eslint-disable */
// 🔱 Archon Navigation Bridge (VM and JSDOM Safe Redirection)
export function redirectUserToLogin(): void {
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
}
