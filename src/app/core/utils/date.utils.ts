export interface CalendarCell {
  readonly isoDate: string | null;
  readonly day: number | null;
  readonly weekday: string;
  readonly isToday: boolean;
}

const WEEKDAYS = [
  'domingo',
  'segunda-feira',
  'terça-feira',
  'quarta-feira',
  'quinta-feira',
  'sexta-feira',
  'sábado',
] as const;

export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayIso(): string {
  return toIsoDate(new Date());
}

export function buildCalendar(year: number, month: number): readonly CalendarCell[] {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0).getDate();
  const cells: CalendarCell[] = [];

  for (let index = 0; index < firstDay.getDay(); index += 1) {
    cells.push({ isoDate: null, day: null, weekday: WEEKDAYS[index] ?? '', isToday: false });
  }

  for (let day = 1; day <= lastDay; day += 1) {
    const date = new Date(year, month - 1, day);
    const isoDate = toIsoDate(date);
    cells.push({
      isoDate,
      day,
      weekday: WEEKDAYS[date.getDay()] ?? '',
      isToday: isoDate === todayIso(),
    });
  }

  while (cells.length % 7 !== 0) {
    const index = cells.length % 7;
    cells.push({ isoDate: null, day: null, weekday: WEEKDAYS[index] ?? '', isToday: false });
  }

  return cells;
}

export function moveMonth(
  year: number,
  month: number,
  delta: number,
): { readonly year: number; readonly month: number } {
  const moved = new Date(year, month - 1 + delta, 1);
  return { year: moved.getFullYear(), month: moved.getMonth() + 1 };
}

export function monthTitle(year: number, month: number): string {
  const title = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(
    new Date(year, month - 1, 1),
  );
  return title.charAt(0).toLocaleUpperCase('pt-BR') + title.slice(1);
}

export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) {
    return isoDate;
  }
  return new Intl.DateTimeFormat('pt-BR').format(new Date(year, month - 1, day));
}

export function formatDateTime(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}
