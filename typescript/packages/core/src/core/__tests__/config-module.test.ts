import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { ConfigService, ConfigModule } from '../config-module.js';

describe('ConfigModule', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('ConfigService', () => {
        it('should use defaults when no env vars set', () => {
            const service = new ConfigService({
                ignoreEnvFile: true,
                defaults: { MY_VAR: 'default-value' }
            });

            expect(service.get('MY_VAR')).toBe('default-value');
        });

        it('should return undefined for missing key without default', () => {
            const service = new ConfigService({ ignoreEnvFile: true });

            expect(service.get('MISSING_KEY')).toBeUndefined();
        });

        it('should return default value for missing key', () => {
            const service = new ConfigService({ ignoreEnvFile: true });

            expect(service.get('MISSING_KEY', 'fallback')).toBe('fallback');
        });

        it('should use process.env values', () => {
            process.env.TEST_VAR = 'from-env';

            const service = new ConfigService({ ignoreEnvFile: true });

            expect(service.get('TEST_VAR')).toBe('from-env');
        });

        it('should override defaults with process.env', () => {
            process.env.MY_VAR = 'env-value';

            const service = new ConfigService({
                ignoreEnvFile: true,
                defaults: { MY_VAR: 'default-value' }
            });

            expect(service.get('MY_VAR')).toBe('env-value');
        });

        describe('getOrThrow', () => {
            it('should return value if exists', () => {
                process.env.REQUIRED_VAR = 'required-value';
                const service = new ConfigService({ ignoreEnvFile: true });

                expect(service.getOrThrow('REQUIRED_VAR')).toBe('required-value');
            });

            it('should throw if value missing', () => {
                const service = new ConfigService({ ignoreEnvFile: true });

                expect(() => service.getOrThrow('MISSING_KEY')).toThrow(
                    'Configuration key "MISSING_KEY" is required but not found'
                );
            });
        });

        describe('getAll', () => {
            it('should return all config values', () => {
                const service = new ConfigService({
                    ignoreEnvFile: true,
                    defaults: { FOO: 'bar', BAZ: 'qux' }
                });

                const all = service.getAll();
                expect(all.FOO).toBe('bar');
                expect(all.BAZ).toBe('qux');
            });

            it('should not leak undeclared process.env variables in getAll()', () => {
                process.env.AWS_SECRET_ACCESS_KEY = 'super-secret';
                const service = new ConfigService({
                    ignoreEnvFile: true,
                    defaults: { APP_NAME: 'test' }
                });

                const all = service.getAll();
                expect(all.APP_NAME).toBe('test');
                expect(all.AWS_SECRET_ACCESS_KEY).toBeUndefined();
                // But direct get('AWS_SECRET_ACCESS_KEY') still accesses process.env when specifically queried
                expect(service.get('AWS_SECRET_ACCESS_KEY')).toBe('super-secret');
            });
        });

        describe('validation', () => {
            it('should throw if validation fails', () => {
                expect(() => new ConfigService({
                    ignoreEnvFile: true,
                    validate: () => false
                })).toThrow('Environment variable validation failed');
            });

            it('should pass if validation succeeds', () => {
                expect(() => new ConfigService({
                    ignoreEnvFile: true,
                    validate: () => true
                })).not.toThrow();
            });
        });
    });

    describe('ConfigModule.forRoot', () => {
        it('should return providers with ConfigService', () => {
            const result = ConfigModule.forRoot({ ignoreEnvFile: true });

            expect(result.providers).toHaveLength(1);
            expect(result.providers[0].provide).toBe(ConfigService);
            expect(result.providers[0].useValue).toBeInstanceOf(ConfigService);
        });

        it('should export ConfigService', () => {
            const result = ConfigModule.forRoot({ ignoreEnvFile: true });

            expect(result.exports).toContain(ConfigService);
        });
    });
});
