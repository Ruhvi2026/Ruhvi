import { Logger, createScopedLogger } from '../logger';
import * as Sentry from '@sentry/nextjs';

jest.mock('@sentry/nextjs', () => ({
  addBreadcrumb: jest.fn(),
}));

describe('Logger', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;
  let consoleInfoSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleInfoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleInfoSpy.mockRestore();
  });

  it('logs info messages and registers Sentry breadcrumb', () => {
    const logger = new Logger('TestModule', 'corr-123');
    logger.info('System initiated', { orderCount: 5 });

    expect(consoleInfoSpy).toHaveBeenCalledWith(
      expect.stringContaining('[INFO] [TestModule] [corr-123]:'),
      'System initiated',
      { orderCount: 5 }
    );

    expect(Sentry.addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'TestModule',
        message: 'System initiated',
        level: 'info',
        data: expect.objectContaining({
          correlationId: 'corr-123',
          orderCount: 5,
        }),
      })
    );
  });

  it('logs warning messages', () => {
    const logger = new Logger('Payment');
    logger.warn('Payment delayed', { gateway: 'PhonePe' });

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[WARN] [Payment]:'),
      'Payment delayed',
      { gateway: 'PhonePe' }
    );
  });

  it('formats error objects and logs them cleanly', () => {
    const logger = new Logger('Auth');
    const testError = new Error('Token expired');
    logger.error('Authentication failure', testError, { attempt: 3 });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[ERROR] [Auth]:'),
      'Authentication failure',
      { attempt: 3 },
      expect.objectContaining({
        name: 'Error',
        message: 'Token expired',
      })
    );
  });

  it('creates scoped child loggers with merged context', () => {
    const parentLogger = createScopedLogger('Store', 'trace-999');
    const childLogger = parentLogger.child('Checkout');

    childLogger.info('Cart checkout loaded');

    expect(consoleInfoSpy).toHaveBeenCalledWith(
      expect.stringContaining('[INFO] [Store:Checkout] [trace-999]:'),
      'Cart checkout loaded',
      ''
    );
  });
});
