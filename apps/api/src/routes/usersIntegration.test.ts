import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import buildApp from '../index';
import db from '../services/db';

/**
 * 🔱 Archon Integration Test: User Routes — Plan Omega
 * Implementation: 100% Path Coverage (Sovereign Quality)
 * v.4.0.0 - MySQL Base64 Storage (Zero Filesystem Dependency)
 */

vi.mock('../services/db', () => ({
  default: {
    execute: vi.fn(),
  },
}));

// Minimal 1x1 white JPEG in Base64
const VALID_BASE64_JPEG =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAFBABAAAAAAAAAAAAAAAAAAAACf/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AKkA/9k=';

// Clean base64 (no prefix)
const CLEAN_JPEG_BASE64 =
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAFBABAAAAAAAAAAAAAAAAAAAACf/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AKkA/9k=';

// Minimal 1x1 white PNG in Base64
const VALID_BASE64_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

const CLEAN_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

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
      const customToken = app.jwt.sign({ id: 999, username: 'ghost', roleId: 2 });
      (db.execute as Mock).mockResolvedValueOnce([[]]);

      const response = await app.inject({
        method: 'POST',
        url: '/v1/users/999/upload-profile',
        headers: {
          authorization: `Bearer ${customToken}`,
          'content-type': 'application/json',
        },
        payload: JSON.stringify({ image: VALID_BASE64_JPEG, mime: 'image/jpeg' }),
      });

      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.body).error).toContain('Identity not found');
    });

    it('should return 400 if no image data is received', async () => {
      (db.execute as Mock).mockResolvedValueOnce([[{ id: 1 }]]);

      const response = await app.inject({
        method: 'POST',
        url: '/v1/users/1/upload-profile',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        payload: JSON.stringify({}),
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).error).toContain('No image data received');
    });

    it('should return 400 for invalid mime-types', async () => {
      (db.execute as Mock).mockResolvedValueOnce([[{ id: 1 }]]);

      const response = await app.inject({
        method: 'POST',
        url: '/v1/users/1/upload-profile',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        payload: JSON.stringify({ image: 'data:text/plain;base64,aGVsbG8=', mime: 'text/plain' }),
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).error).toContain('Only JPG and PNG');
    });

    it('should return 400 if image exceeds 2MB', async () => {
      (db.execute as Mock).mockResolvedValueOnce([[{ id: 1 }]]);

      const bigBuffer = Buffer.alloc(2.1 * 1024 * 1024, 'A');
      const bigBase64 = bigBuffer.toString('base64');

      const response = await app.inject({
        method: 'POST',
        url: '/v1/users/1/upload-profile',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        payload: JSON.stringify({ image: bigBase64, mime: 'image/jpeg' }),
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).error).toContain('2MB');
    });

    it('should successfully upload JPEG and store data URI in MySQL', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ id: 1 }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }]);

      const response = await app.inject({
        method: 'POST',
        url: '/v1/users/1/upload-profile',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        payload: JSON.stringify({ image: VALID_BASE64_JPEG, mime: 'image/jpeg' }),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.url).toContain('data:image/jpeg;base64,');
      expect(db.execute).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET profile_picture_url'),
        expect.arrayContaining([expect.stringContaining('data:image/jpeg;base64,')])
      );
    });

    it('should successfully upload PNG and return data URI', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ id: 1 }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }]);

      const response = await app.inject({
        method: 'POST',
        url: '/v1/users/1/upload-profile',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        payload: JSON.stringify({ image: VALID_BASE64_PNG, mime: 'image/png' }),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.url).toContain('data:image/png;base64,');
    });

    it('should default to image/jpeg if no mime is provided', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ id: 1 }]])
        .mockResolvedValueOnce([{ affectedRows: 1 }]);

      const response = await app.inject({
        method: 'POST',
        url: '/v1/users/1/upload-profile',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        payload: JSON.stringify({ image: VALID_BASE64_JPEG }),
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body).url).toContain('data:image/jpeg;base64,');
    });

    it('should handle database failure during persistence', async () => {
      (db.execute as Mock)
        .mockResolvedValueOnce([[{ id: 1 }]])
        .mockRejectedValueOnce(new Error('DB_WRITE_FAIL'));

      const response = await app.inject({
        method: 'POST',
        url: '/v1/users/1/upload-profile',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': 'application/json',
        },
        payload: JSON.stringify({ image: VALID_BASE64_JPEG, mime: 'image/jpeg' }),
      });

      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.body).error).toContain('Infrastructure failure');
    });
  });

  describe('GET /v1/users/:id/profile-image', () => {
    it('should return 404 if no image is registered (No Token Required)', async () => {
      (db.execute as Mock).mockResolvedValueOnce([[]]);

      const response = await app.inject({
        method: 'GET',
        url: '/v1/users/1/profile-image',
      });

      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.body).error).toContain('Image not found');
    });

    it('should return 404 if user exists but profile_picture_url is null', async () => {
      (db.execute as Mock).mockResolvedValueOnce([[{ profile_picture_url: null }]]);

      const response = await app.inject({
        method: 'GET',
        url: '/v1/users/1/profile-image',
      });

      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.body).error).toContain('Image not found');
    });

    it('should decode and serve JPEG data URI as binary image', async () => {
      const storedDataUri = `data:image/jpeg;base64,${CLEAN_JPEG_BASE64}`;
      (db.execute as Mock).mockResolvedValueOnce([[{ profile_picture_url: storedDataUri }]]);

      const response = await app.inject({
        method: 'GET',
        url: '/v1/users/1/profile-image',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toBe('image/jpeg');
      expect(response.rawPayload.length).toBeGreaterThan(0);
    });

    it('should decode and serve PNG data URI as binary image', async () => {
      const storedDataUri = `data:image/png;base64,${CLEAN_PNG_BASE64}`;
      (db.execute as Mock).mockResolvedValueOnce([[{ profile_picture_url: storedDataUri }]]);

      const response = await app.inject({
        method: 'GET',
        url: '/v1/users/1/profile-image',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toBe('image/png');
    });

    it('should return 404 for malformed data URI', async () => {
      (db.execute as Mock).mockResolvedValueOnce([[{ profile_picture_url: 'data:broken' }]]);

      const response = await app.inject({
        method: 'GET',
        url: '/v1/users/1/profile-image',
      });

      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.body).error).toContain('Invalid image data format');
    });

    it('should return 404 for legacy filename references', async () => {
      (db.execute as Mock).mockResolvedValueOnce([
        [{ profile_picture_url: 'profile_user_1_old.jpg' }],
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/v1/users/1/profile-image',
      });

      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.body).error).toContain('Legacy image reference');
    });

    it('should handle storage access exception', async () => {
      (db.execute as Mock).mockRejectedValueOnce(new Error('PERM_DENIED'));

      const response = await app.inject({
        method: 'GET',
        url: '/v1/users/1/profile-image',
      });

      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.body).error).toContain('Storage access exception');
    });
  });
});
