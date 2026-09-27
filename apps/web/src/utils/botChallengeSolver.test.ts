import { describe, it, expect } from 'vitest';
import { BotChallenge, encodeSolution, findSolution, webCryptoSha256 } from './botChallengeSolver';

/** FC199 F3 — solucionador PoW con Web Crypto real (formato ALTCHA). */

describe('webCryptoSha256', () => {
  it('SHA-256 en hex, igual al vector conocido de "abc"', async () => {
    expect(await webCryptoSha256('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
    );
  });
});

describe('findSolution', () => {
  it('encuentra el número cuyo hash coincide con el reto', async () => {
    const salt = 'sal?expires=1&issued=1';
    const challenge = await webCryptoSha256(`${salt}37`);

    expect(await findSolution(salt, challenge, 100)).toBe(37);
  });

  it('fuera de rango: null (reto inválido)', async () => {
    const challenge = await webCryptoSha256('otra-sal5');

    expect(await findSolution('sal', challenge, 10)).toBeNull();
  });
});

describe('encodeSolution', () => {
  it('JSON en base64 con los campos que verifica la API', () => {
    const challenge: BotChallenge = {
      algorithm: 'SHA-256',
      challenge: 'c'.repeat(64),
      maxnumber: 100,
      salt: 'sal',
      signature: 's'.repeat(64),
    };

    expect(JSON.parse(atob(encodeSolution(challenge, 7)))).toEqual({
      algorithm: 'SHA-256',
      challenge: 'c'.repeat(64),
      number: 7,
      salt: 'sal',
      signature: 's'.repeat(64),
    });
  });
});
