import { jest, describe, it, expect, beforeEach } from '@jest/globals';

// Mock winston
const mockTransports = {
    Console: jest.fn().mockImplementation(() => ({})),
    File: jest.fn().mockImplementation(() => ({})),
};

const mockCreateLogger = jest.fn().mockReturnValue({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
});

const mockFormat = {
    combine: jest.fn().mockReturnValue({}),
    timestamp: jest.fn().mockReturnValue({}),
    json: jest.fn().mockReturnValue({}),
    colorize: jest.fn().mockReturnValue({}),
    printf: jest.fn().mockReturnValue({}),
};

jest.unstable_mockModule('winston', () => ({
    default: {
        createLogger: mockCreateLogger,
        transports: mockTransports,
        format: mockFormat,
    },
}));

// Mock EventEmitterTransport
jest.unstable_mockModule('../events/log-emitter.js', () => ({
    EventEmitterTransport: jest.fn().mockImplementation(() => ({})),
}));

const { createLogger, defaultLogger } = await import('../logger.js');

describe('Logger', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createLogger', () => {
        it('should create a logger with default options', () => {
            const logger = createLogger({});

            expect(logger).toBeDefined();
            expect(logger.debug).toBeDefined();
            expect(logger.info).toBeDefined();
            expect(logger.warn).toBeDefined();
            expect(logger.error).toBeDefined();
            expect(mockCreateLogger).toHaveBeenCalled();
        });

        it('should create logger with custom level', () => {
            const logger = createLogger({ level: 'debug' });

            expect(logger).toBeDefined();
            expect(mockCreateLogger).toHaveBeenCalledWith(
                expect.objectContaining({ level: 'debug' })
            );
        });

        it('should add file transport when file is specified', () => {
            createLogger({ file: '/tmp/test.log' });

            expect(mockTransports.File).toHaveBeenCalled();
        });

        it('should add console transport when enableConsole is true', () => {
            createLogger({ enableConsole: true });

            expect(mockTransports.Console).toHaveBeenCalled();
        });

        it('should not add console transport by default', () => {
            mockTransports.Console.mockClear();
            createLogger({});

            expect(mockTransports.Console).not.toHaveBeenCalled();
        });

        it('should log messages through winston', () => {
            const logger = createLogger({ level: 'info' });

            logger.debug('debug message', { key: 'value' });
            logger.info('info message');
            logger.warn('warn message');
            logger.error('error message');

            const mockLogger = mockCreateLogger.mock.results[0]?.value as any;
            expect(mockLogger.debug).toHaveBeenCalledWith('debug message', { key: 'value' });
            expect(mockLogger.info).toHaveBeenCalled();
            expect(mockLogger.warn).toHaveBeenCalled();
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });

    describe('defaultLogger', () => {
        it('should be defined', () => {
            expect(defaultLogger).toBeDefined();
        });
    });
});
