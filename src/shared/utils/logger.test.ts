import { afterEach, describe, expect, it, vi } from 'vitest';

import { logger } from './logger';

function setDev(value: boolean) {
  (globalThis as { __DEV__?: boolean }).__DEV__ = value;
}

describe('logger', () => {
  afterEach(() => {
    setDev(false);
    vi.restoreAllMocks();
  });

  it('silencia debug e info fora de __DEV__', () => {
    setDev(false);
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    logger.debug('x');
    logger.info('y');

    expect(debugSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
  });

  it('emite debug e info em __DEV__', () => {
    setDev(true);
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    logger.debug('x');
    logger.info('y');

    expect(debugSpy).toHaveBeenCalledWith('x', '');
    expect(infoSpy).toHaveBeenCalledWith('y', '');
  });

  it('sempre emite warn e error, independente de __DEV__', () => {
    setDev(false);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const boom = new Error('boom');

    logger.warn('aviso');
    logger.error('falhou', boom);

    expect(warnSpy).toHaveBeenCalledWith('aviso', '');
    expect(errorSpy).toHaveBeenCalledWith('falhou', boom, '');
  });
});
