import {
  formatDate,
  formatDurationMinutes,
  formatKm,
  formatSizeKb,
} from '../src/core/utils/format.jsx';

describe('format utilities', () => {
  test('formats distances for meters and kilometers', () => {
    expect(formatKm(0.42)).toBe('420 m');
    expect(formatKm(2.35)).toBe('2.4 km');
    expect(formatKm(12.4)).toBe('12 km');
  });

  test('formats trip durations', () => {
    expect(formatDurationMinutes(45)).toBe('45 min');
    expect(formatDurationMinutes(60)).toBe('1 h');
    expect(formatDurationMinutes(135)).toBe('2 h 15 min');
  });

  test('formats bundled pack sizes', () => {
    expect(formatSizeKb(null)).toBe('—');
    expect(formatSizeKb(800)).toBe('800 KB');
    expect(formatSizeKb(1536)).toBe('1.5 MB');
  });

  test('formats ISO travel dates without timezone drift', () => {
    expect(formatDate('2026-09-27')).toBe('Sep 27, 2026');
  });
});
