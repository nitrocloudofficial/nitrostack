import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import crypto from 'crypto';

// Mock fs/promises
const mockMkdir = jest.fn();
const mockReadFile = jest.fn();
const mockWriteFile = jest.fn();
const mockChmod = jest.fn();

jest.unstable_mockModule('fs/promises', () => ({
    default: {
        mkdir: mockMkdir,
        readFile: mockReadFile,
        writeFile: mockWriteFile,
        chmod: mockChmod,
    }
}));

// Mock path
jest.unstable_mockModule('path', () => ({
    default: {
        dirname: (p: string) => p.split('/').slice(0, -1).join('/'),
        join: (...args: string[]) => args.join('/'),
    }
}));

const { MemoryTokenStore, FileTokenStore, isTokenExpired, calculateExpiration, tokenResponseToStored, createDefaultTokenStore } = await import('../token-store.js');

describe('Token Store', () => {
    const validToken = { access_token: 'v', token_type: 'Bearer' as const, expires_at: Date.now() + 3600000 };

    describe('MemoryTokenStore', () => {
        let store: any;

        beforeEach(() => {
            store = new MemoryTokenStore();
        });

        it('should save and get token', async () => {
            await store.saveToken('k', validToken);
            expect(await store.getToken('k')).toEqual(validToken);
        });

        it('should return null for missing token', async () => {
            expect(await store.getToken('missing')).toBeNull();
        });

        it('should return null for expired token', async () => {
            const expired = { ...validToken, expires_at: Date.now() - 1000 };
            await store.saveToken('k', expired);
            expect(await store.getToken('k')).toBeNull();
        });

        it('should delete token', async () => {
            await store.saveToken('k', validToken);
            await store.deleteToken('k');
            expect(await store.getToken('k')).toBeNull();
        });

        it('should list keys and clear', async () => {
            await store.saveToken('k1', { ...validToken, access_token: 'v1' });
            await store.saveToken('k2', { ...validToken, access_token: 'v2' });
            expect(await store.listKeys()).toEqual(expect.arrayContaining(['k1', 'k2']));
            await store.clear();
            expect(await store.listKeys()).toHaveLength(0);
        });
    });

    describe('FileTokenStore', () => {
        let store: any;
        const testPath = '/tmp/tokens.json';

        beforeEach(() => {
            jest.clearAllMocks();
            (mockMkdir as any).mockResolvedValue(undefined);
            (mockWriteFile as any).mockResolvedValue(undefined);
            (mockChmod as any).mockResolvedValue(undefined);
            store = new FileTokenStore(testPath);
        });

        const mockENOENT = () => {
            const error = new Error('ENOENT');
            (error as any).code = 'ENOENT';
            (mockReadFile as any).mockRejectedValue(error);
        };

        it('should load empty on ENOENT', async () => {
            mockENOENT();
            await store.saveToken('k', validToken);
            expect(mockWriteFile).toHaveBeenCalled();
        });

        it('should return null for missing token', async () => {
            (mockReadFile as any).mockResolvedValue('{}');
            expect(await store.getToken('missing')).toBeNull();
        });

        it('should handle encryption and decryption', async () => {
            const encStore = new FileTokenStore(testPath, 'password');

            mockENOENT();
            await encStore.saveToken('k', { ...validToken, access_token: 'secret' });

            const writeContent = (mockWriteFile as any).mock.calls[0][1];
            expect(writeContent).toContain(':');

            (mockReadFile as any).mockResolvedValue(writeContent);
            const token = await encStore.getToken('k');
            expect(token?.access_token).toBe('secret');
        });

        it('should handle decryption failure (invalid format)', async () => {
            const encStore = new FileTokenStore(testPath, 'password');
            (mockReadFile as any).mockResolvedValue('invalid-format');
            await expect(encStore.getToken('k')).rejects.toThrow();
        });

        it('should delete, list and clear', async () => {
            (mockReadFile as any).mockResolvedValue(JSON.stringify({
                k1: { ...validToken, access_token: 'v1' },
                k2: { ...validToken, access_token: 'v2' }
            }));

            await store.deleteToken('k1');
            expect(mockWriteFile).toHaveBeenCalledWith(testPath, expect.stringContaining('v2'), expect.anything());

            (mockReadFile as any).mockResolvedValue(JSON.stringify({ k2: { ...validToken, access_token: 'v2' } }));
            expect(await store.listKeys()).toEqual(['k2']);

            await store.clear();
            expect(mockWriteFile).toHaveBeenCalledWith(testPath, '{}', expect.anything());
        });

        it('should return null for expired tokens', async () => {
            (mockReadFile as any).mockResolvedValue(JSON.stringify({
                k: { ...validToken, expires_at: Date.now() - 1000 }
            }));
            expect(await store.getToken('k')).toBeNull();
            expect(mockWriteFile).toHaveBeenCalledWith(testPath, '{}', expect.anything());
        });

        it('should throw if mkdir fails', async () => {
            const error = new Error('FAIL');
            (error as any).code = 'FAIL';
            (mockMkdir as any).mockRejectedValue(error);
            (mockReadFile as any).mockResolvedValue('{}');
            await expect(store.saveToken('k', validToken)).rejects.toThrow('FAIL');
        });
    });

    describe('Utilities', () => {
        it('should check expiration', () => {
            expect(isTokenExpired({ ...validToken, expires_at: Date.now() - 1000 })).toBe(true);
            expect(isTokenExpired({ ...validToken, expires_at: Date.now() + 1000 })).toBe(false);
        });

        it('should calculate expiration', () => {
            const exp = calculateExpiration(3600);
            expect(exp).toBeGreaterThan(Date.now() + 3500000);
        });

        it('should convert response to stored', () => {
            const res = { access_token: 'at', token_type: 'Bearer' as const, expires_in: 3600, refresh_token: 'rt', scope: 's' };
            const stored = tokenResponseToStored(res, 'res');
            expect(stored.access_token).toBe('at');
            expect(stored.refresh_token).toBe('rt');
            expect(stored.resource).toBe('res');

            const stored2 = tokenResponseToStored({ access_token: 'at', token_type: 'Bearer' as const });
            expect(stored2.expires_at).toBeGreaterThan(Date.now());
        });
    });

    describe('Factory', () => {
        it('should create default store with and without encryption', () => {
            expect(createDefaultTokenStore('/tmp/tokens.json')).toBeInstanceOf(FileTokenStore);
            expect(createDefaultTokenStore('/tmp/tokens.json', 'pass')).toBeInstanceOf(FileTokenStore);
        });

        it('should use default path with USERPROFILE', () => {
            const originalHome = process.env.HOME;
            const originalUserProfile = process.env.USERPROFILE;
            delete process.env.HOME;
            process.env.USERPROFILE = '/user/profile';
            const store = createDefaultTokenStore();
            expect(store).toBeDefined();
            process.env.HOME = originalHome;
            process.env.USERPROFILE = originalUserProfile;
        });

        it('should use fallback path if no home', () => {
            const originalHome = process.env.HOME;
            const originalUserProfile = process.env.USERPROFILE;
            delete process.env.HOME;
            delete process.env.USERPROFILE;
            const store = createDefaultTokenStore();
            expect(store).toBeDefined();
            process.env.HOME = originalHome;
            process.env.USERPROFILE = originalUserProfile;
        });
    });
});
