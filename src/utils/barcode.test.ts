import { describe, expect, it } from 'vitest';
import { encodeCode128B } from './barcode';

describe('encodeCode128B', () => {
  it('starts with the Start-B pattern and ends with the Stop pattern', () => {
    const bars = encodeCode128B('A');
    // Start B "211214" (6) + data symbol "A" (6) + checksum symbol (6) + Stop "2331112" (7)
    expect(bars).toHaveLength(6 + 6 + 6 + 7);
    expect(bars.slice(0, 6).map((bar) => bar.width)).toEqual([2, 1, 1, 2, 1, 4]);
    expect(bars.slice(0, 6).map((bar) => bar.isBar)).toEqual([true, false, true, false, true, false]);
  });

  it('computes the correct mod-103 checksum symbol for a known value', () => {
    // value('A') = 65 - 32 = 33; checksum = (104 + 33*1) % 103 = 34 -> pattern "131123"
    const bars = encodeCode128B('A');
    expect(bars.slice(12, 18).map((bar) => bar.width)).toEqual([1, 3, 1, 1, 2, 3]);
  });

  it('is deterministic for the same input', () => {
    expect(encodeCode128B('CGS-2026-00001')).toEqual(encodeCode128B('CGS-2026-00001'));
  });

  it('rejects characters outside the printable ASCII range supported by Code Set B', () => {
    expect(() => encodeCode128B('café')).toThrow();
  });

  it('rejects an empty value', () => {
    expect(() => encodeCode128B('')).toThrow();
  });
});
