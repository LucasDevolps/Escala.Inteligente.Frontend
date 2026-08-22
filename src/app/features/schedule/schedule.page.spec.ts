import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Schedule } from '../../core/models/api.models';
import { ApiErrorService } from '../../core/services/api-error.service';
import { AuthService } from '../../core/services/auth.service';
import { EmployeeService } from '../../core/services/employee.service';
import { ScheduleService } from '../../core/services/schedule.service';
import { ShiftSwapService } from '../../core/services/shift-swap.service';
import { TimeOffService } from '../../core/services/time-off.service';
import { ToastService } from '../../core/services/toast.service';
import { Router } from '@angular/router';
import { SchedulePage } from './schedule.page';

const JULY_SCHEDULE: Schedule = {
  id: 'july-schedule',
  year: 2026,
  month: 7,
  status: 'PUBLISHED',
  revision: 1,
  rowVersion: 'AQIDBA==',
  assignments: [
    {
      employeeId: 'miriam-id',
      employeeName: 'Miriam',
      workDate: '2026-07-04',
      source: 'MANUAL',
    },
    {
      employeeId: 'eli-id',
      employeeName: 'Eli',
      workDate: '2026-07-05',
      source: 'MANUAL',
    },
  ],
  warnings: [],
};

function schedule(year: number, month: number): Schedule {
  return {
    id: `${year}-${month}`,
    year,
    month,
    status: 'IN_REVIEW',
    revision: 0,
    rowVersion: 'AQIDBA==',
    assignments: [
      {
        employeeId: 'miriam-id',
        employeeName: 'Miriam',
        workDate: `${year}-${String(month).padStart(2, '0')}-03`,
        source: 'MANUAL',
      },
    ],
    warnings: [],
  };
}

describe('SchedulePage', () => {
  let fixture: ComponentFixture<SchedulePage>;
  let schedules: { get: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    const user = signal({
      id: 'manager-id',
      name: 'Gestor',
      role: 'MANAGER' as const,
      organizationId: 'organization-id',
    });
    schedules = {
      get: vi.fn((year: number, month: number) =>
        of(year === 2026 && month === 7 ? JULY_SCHEDULE : schedule(year, month)),
      ),
    };

    await TestBed.configureTestingModule({
      imports: [SchedulePage],
      providers: [
        { provide: AuthService, useValue: { user, isManager: signal(true) } },
        { provide: ScheduleService, useValue: schedules },
        { provide: EmployeeService, useValue: { listAll: () => of([]) } },
        { provide: TimeOffService, useValue: { listAll: () => of([]) } },
        { provide: ShiftSwapService, useValue: { listAll: () => of([]) } },
        {
          provide: ApiErrorService,
          useValue: { code: () => undefined, message: () => 'Falha ao carregar.' },
        },
        { provide: ToastService, useValue: { show: vi.fn() } },
        { provide: Router, useValue: { navigate: vi.fn().mockResolvedValue(true) } },
      ],
    }).compileComponents();
  });

  function render(year = 2026, month = 8): SchedulePage {
    fixture = TestBed.createComponent(SchedulePage);
    fixture.componentRef.setInput('year', String(year));
    fixture.componentRef.setInput('month', String(month));
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('starts with every day visible and filters only Saturdays and Sundays', () => {
    const component = render();

    expect(component.weekendsOnly()).toBe(false);
    expect(component.displayedCalendar().filter((cell) => cell.isoDate)).toHaveLength(31);

    const filter = fixture.nativeElement.querySelector('.weekend-filter') as HTMLButtonElement;
    filter.click();
    fixture.detectChanges();

    expect(component.displayedCalendar()).toHaveLength(10);
    expect(component.displayedCalendar().every((cell) => /sábado|domingo/.test(cell.weekday))).toBe(
      true,
    );
  });

  it('keeps the current editing state when changing the filter and tabs', () => {
    const component = render();
    component.toggleWeekendsOnly();
    component.toggleWeekendsOnly();
    component.openDay('2026-08-03');
    component.toggleEmployee('eli-id');
    fixture.detectChanges();

    const previousFromEditor = fixture.nativeElement.querySelector(
      '.modal-panel__footer .button--secondary',
    ) as HTMLButtonElement;
    previousFromEditor.click();
    fixture.detectChanges();
    const currentTab = fixture.nativeElement.querySelector(
      '.schedule-tabs__tab',
    ) as HTMLButtonElement;
    currentTab.click();
    fixture.detectChanges();

    expect(component.selectedDate()).toBe('2026-08-03');
    expect(component.selectedEmployees()).toEqual(new Set(['miriam-id', 'eli-id']));
    expect(component.displayedCalendar().filter((cell) => cell.isoDate)).toHaveLength(31);
  });

  it('calculates July as the previous month of August and exposes its schedule read-only', () => {
    const component = render();

    expect(component.previousMonth()).toEqual({ year: 2026, month: 7 });
    expect(component.previousTitle()).toBe('Julho de 2026');

    component.showPreviousSchedule();
    fixture.detectChanges();

    expect(component.canEdit()).toBe(false);
    expect(component.displayedSchedule()).toBe(JULY_SCHEDULE);
    expect(fixture.nativeElement.textContent).toContain('Miriam');
    expect(fixture.nativeElement.textContent).toContain('Eli');
  });

  it('calculates December of the prior year when January is selected', () => {
    const component = render(2027, 1);

    expect(component.previousMonth()).toEqual({ year: 2026, month: 12 });
    expect(component.previousTitle()).toBe('Dezembro de 2026');
    expect(schedules.get).toHaveBeenCalledWith(2026, 12);
  });

  it('opens the correct previous month URL in a new tab in read-only mode', () => {
    const component = render();
    component.showPreviousSchedule();
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('.schedule-tabs__open') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/schedule/2026/7?view=readonly');
    expect(link.target).toBe('_blank');
    expect(link.rel).toContain('noopener');
  });

  it('disables editing when a monthly URL is opened in read-only mode', () => {
    const component = render();
    fixture.componentRef.setInput('view', 'readonly');
    fixture.detectChanges();

    component.openDay('2026-08-03');

    expect(component.canEdit()).toBe(false);
    expect(component.selectedDate()).toBeNull();
  });
});
