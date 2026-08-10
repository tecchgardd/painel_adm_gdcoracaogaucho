import { describe, expect, it } from 'vitest';

import { buttonTones, statusTones } from './tones';

describe('buttonTones', () => {
  it('renderiza o tom primário preenchido com a cor de marca', () => {
    expect(buttonTones.red.bg).toBe(buttonTones.red.border);
    expect(buttonTones.red.text).toBe('#FFFFFF');
  });

  it('renderiza o tom secundário como contorno (sem preenchimento)', () => {
    expect(buttonTones.dark.bg).toBe('transparent');
    expect(buttonTones.dark.border).not.toBe('transparent');
  });

  it('renderiza o tom suave com preenchimento sutil', () => {
    expect(buttonTones.soft.bg).not.toBe('transparent');
    expect(buttonTones.soft.bg).not.toBe(buttonTones.red.bg);
  });
});

describe('statusTones', () => {
  it('usa verde para status pagos/confirmados', () => {
    expect(statusTones.PAGO).toBe(statusTones.CONFIRMADO);
    expect(statusTones.ATIVO).toBe(statusTones.PAGO);
  });

  it('usa a mesma cor para pendente e futuro', () => {
    expect(statusTones.PENDENTE).toBe(statusTones.FUTURO);
  });

  it('define uma cor para cortesia', () => {
    expect(statusTones.CORTESIA).toBeDefined();
  });
});
