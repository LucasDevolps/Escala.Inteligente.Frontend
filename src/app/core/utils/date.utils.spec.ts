import { buildCalendar, formatDate, moveMonth, toIsoDate } from './date.utils';

describe('date utilities', () => {
  it('builds a leap-year calendar with leading placeholders', () => {
    const calendar = buildCalendar(2028, 2);
    const realDays = calendar.filter((cell) => cell.isoDate !== null);

    expect(calendar.length % 7).toBe(0);
    expect(realDays).toHaveLength(29);
    expect(realDays[0]?.isoDate).toBe('2028-02-01');
    expect(realDays[28]?.isoDate).toBe('2028-02-29');
  });

  it('moves between years when navigating months', () => {
    expect(moveMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
    expect(moveMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
  });

  it('formats schedule dates without a UTC day shift', () => {
    expect(toIsoDate(new Date(2026, 8, 5))).toBe('2026-09-05');
    expect(formatDate('2026-09-05')).toBe('05/09/2026');
  });
});
