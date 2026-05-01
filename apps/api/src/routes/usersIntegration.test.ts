import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import fs from 'node:fs';
import { PassThrough } from 'node:stream';
import { pipeline as pipelinePromise } from 'node:stream/promises';
import buildApp from '../index';
import db from '../services/db';

/**
 * 🔱 Archon Integration Test: User Routes
 * Implementation: 100% Path Coverage (Sovereign Quality)
 */

vi.mock('../services/db', () => ({
  default: {
    execute: vi.fn(),
  },
}));

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
  return {
    ...actual,
    default: {
      ...actual.default,
      createWriteStream: vi.fn(),
      createReadStream: vi.fn(),
      existsSync: vi.fn(),
    },
    createWriteStream: vi.fn(),
    createReadStream: vi.fn(),
    existsSync: vi.fn(),
  };
});

vi.mock('node:stream/promises', () => ({
  pipeline: vi.fn(),
}));

describe('User Integration Endpoints', () => {
  const app = buildApp();
  let token: string;

  beforeEach(async () => {
    await app.ready();
    token = app.jwt.sign({ id: 1, username: 'admin', roleId: 1 });
    vi.resetAllMocks();
  });

  describe('POST /v1/users/:id/upload-profile', () => {
    it('should return 401 if no session is provided', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/users/1/upload-profile',
      });
      expect(response.statusCode).toBe(401);
    });

    it('should return 403 if trying to upload to another user (Identity Lock)', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/users/2/upload-profile', // Token is for ID 1
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(403);
      expect(JSON.parse(response.body).error).toContain('Unauthorized Identity Access');
    });

    it('should return 404 if identity is not found', async () => {
      // Identity Lock passed (ID match), but DB check fails
      const customToken = app.jwt.sign({ id: 999, username: 'ghost', roleId: 2 });
      (db.execute as Mock).mockResolvedValueOnce([[]]);

      const response = await app.inject({
        method: 'POST',
        url: '/v1/users/999/upload-profile',
        headers: { authorization: `Bearer ${customToken}` },
      });

      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.body).error).toContain('Identity not found');
    });

    it('should return 400 if no file is received', async () => {
      (db.execute as Mock).mockResolvedValueOnce([[{ id: 1 }]]);

      const response = await app.inject({
        method: 'POST',
        url: '/v1/users/1/upload-profile',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'multipart/form-data; boundary=---',
        },
        payload: '-----', // Invalid empty multipart
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for invalid mime-types', async () => {
      (db.execute as Mock).mockResolvedValueOnce([[{ id: 1 }]]);

      // Using a trick to simulate multipart with specific mimetype
      const response = await app.inject({
        method: 'POST',
        url: '/v1/users/1/upload-profile',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'multipart/form-data; boundary=boundary',
        },
        payload:
          '--boundary\r\nContent-Disposition: form-data; name="file"; filename="test.txt"\r\nContent-Type: text/plain\r\n\r\ncontent\r\n--boundary--',
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).error).toContain('Only JPG and PNG');
    });

    it('should handle extensionless PNG files', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ id: 1 }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }]);

      (pipelinePromise as Mock).mockResolvedValueOnce(undefined);
      (fs.createWriteStream as Mock).mockReturnValue(new PassThrough());

      const response = await app.inject({
        method: 'POST',
        url: '/v1/users/1/upload-profile',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'multipart/form-data; boundary=boundary',
        },
        payload:
          '--boundary\r\nContent-Disposition: form-data; name="file"; filename="test"\r\nContent-Type: image/png\r\n\r\nfake-binary-data\r\n--boundary--',
      });

      expect(response.statusCode).toBe(200);
    });

    it('should handle extensionless JPG files', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ id: 1 }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }]);

      (pipelinePromise as Mock).mockResolvedValueOnce(undefined);
      (fs.createWriteStream as Mock).mockReturnValue(new PassThrough());

      const response = await app.inject({
        method: 'POST',
        url: '/v1/users/1/upload-profile',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'multipart/form-data; boundary=boundary',
        },
        payload:
          '--boundary\r\nContent-Disposition: form-data; name="file"; filename="test"\r\nContent-Type: image/jpeg\r\n\r\nfake-binary-data\r\n--boundary--',
      });

      expect(response.statusCode).toBe(200);
    });

    it('should successfully upload and persist profile picture', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ id: 1 }]]) // Check existence
        .mockResolvedValueOnce([{ affectedRows: 1 }]); // Update DB

      (pipelinePromise as Mock).mockResolvedValueOnce(undefined);
      (fs.createWriteStream as Mock).mockReturnValue(new PassThrough());

      const response = await app.inject({
        method: 'POST',
        url: '/v1/users/1/upload-profile',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'multipart/form-data; boundary=boundary',
        },
        payload:
          '--boundary\r\nContent-Disposition: form-data; name="file"; filename="test.jpg"\r\nContent-Type: image/jpeg\r\n\r\nfake-binary-data\r\n--boundary--',
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).success).toBe(true);
      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET profile_picture_url'),
        expect.any(Array)
      );
    });

    it('should handle infrastructure failure during persistence', async () => {
      (db.execute as Mock).mockResolvedValueOnce([[{ id: 1 }]]);
      (pipelinePromise as Mock).mockRejectedValueOnce(new Error('DISK_FULL'));

      const response = await app.inject({
        method: 'POST',
        url: '/v1/users/1/upload-profile',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'multipart/form-data; boundary=boundary',
        },
        payload:
          '--boundary\r\nContent-Disposition: form-data; name="file"; filename="test.jpg"\r\nContent-Type: image/jpeg\r\n\r\nfake-binary-data\r\n--boundary--',
      });

      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.body).error).toContain('Infrastructure failure');
    });
  });

  describe('GET /v1/users/:id/profile-image', () => {
    it('should return 401 if no session is provided', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/users/1/profile-image',
      });
      expect(response.statusCode).toBe(401);
    });

    it('should return 404 if image is not found in registry', async () => {
      (db.execute as Mock).mockResolvedValueOnce([[]]);

      const response = await app.inject({
        method: 'GET',
        url: '/v1/users/1/profile-image',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.body).error).toContain('Image not found');
    });

    it('should return 404 if physical asset is missing on disk', async () => {
      (db.execute as Mock).mockResolvedValueOnce([[{ profile_picture_url: 'missing.jpg' }]]);
      (fs.existsSync as Mock).mockReturnValue(false);

      const response = await app.inject({
        method: 'GET',
        url: '/v1/users/1/profile-image',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.body).error).toContain('Physical asset missing');
    });

    it('should serve the image with correct content type', async () => {
      (db.execute as Mock).mockResolvedValueOnce([[{ profile_picture_url: 'user1.png' }]]);
      (fs.existsSync as Mock).mockReturnValue(true);

      const mockStream = new PassThrough();
      (fs.createReadStream as Mock).mockReturnValue(mockStream);

      // We need to end the stream so inject can complete
      setTimeout(() => {
        mockStream.end('fake-image-data');
      }, 0);

      const response = await app.inject({
        method: 'GET',
        url: '/v1/users/1/profile-image',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toBe('image/png');
    });

    it('should serve JPG images with correct content type', async () => {
      (db.execute as Mock).mockResolvedValueOnce([[{ profile_picture_url: 'user1.jpg' }]]);
      (fs.existsSync as Mock).mockReturnValue(true);

      const mockStream = new PassThrough();
      (fs.createReadStream as Mock).mockReturnValue(mockStream);

      setTimeout(() => {
        mockStream.end('fake-image-data');
      }, 0);

      const response = await app.inject({
        method: 'GET',
        url: '/v1/users/1/profile-image',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toBe('image/jpeg');
    });

    it('should handle storage access exception', async () => {
      (db.execute as Mock).mockRejectedValueOnce(new Error('PERM_DENIED'));

      const response = await app.inject({
        method: 'GET',
        url: '/v1/users/1/profile-image',
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.body).error).toContain('Storage access exception');
    });
  });
});
