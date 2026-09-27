/**
 * FC199 F3 — solucionador del reto anti-bot (prueba de trabajo, formato ALTCHA). Es código propio,
 * empaquetado con la app: 0 scripts, iframes ni orígenes de terceros (Inv-2). El navegador prueba
 * números hasta que SHA-256(sal + número) coincide con el reto del servidor.
 */

export interface BotChallenge {
  algorithm: 'SHA-256';
  challenge: string;
  maxnumber: number;
  salt: string;
  signature: string;
}

/** Digest SHA-256 en hex (inyectable para pruebas). */
export type Sha256Hex = (value: string) => Promise<string>;

/** SHA-256 con Web Crypto (`crypto.subtle`), disponible en el hilo principal y en workers. */
export const webCryptoSha256: Sha256Hex = async (value) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
};

/** Busca el número secreto; `null` si no está en el rango (reto inválido). */
export async function findSolution(
  salt: string,
  challenge: string,
  maxnumber: number,
  sha256: Sha256Hex = webCryptoSha256
): Promise<number | null> {
  for (let n = 0; n <= maxnumber; n += 1) {
    // eslint-disable-next-line no-await-in-loop -- búsqueda secuencial: cada intento depende del anterior
    if ((await sha256(`${salt}${n}`)) === challenge) return n;
  }
  return null;
}

/** Payload que espera la API (`altcha_payload`): JSON de la solución en base64. */
export function encodeSolution(challenge: BotChallenge, number: number): string {
  return btoa(
    JSON.stringify({
      algorithm: challenge.algorithm,
      challenge: challenge.challenge,
      number,
      salt: challenge.salt,
      signature: challenge.signature,
    })
  );
}
