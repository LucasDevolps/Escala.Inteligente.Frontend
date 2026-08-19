import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ScheduleService } from './schedule.service';

describe('ScheduleService', () => {
  let service: ScheduleService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ScheduleService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends the complete manual-day concurrency contract', () => {
    service
      .updateDay('schedule-id', '2026-09-15', ['employee-a', 'employee-b'], 'AQIDBA==')
      .subscribe();
    const request = http.expectOne('/api/v1/schedules/schedule-id/days/2026-09-15');

    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({
      employeeIds: ['employee-a', 'employee-b'],
      rowVersion: 'AQIDBA==',
    });
    request.flush({
      id: 'schedule-id',
      year: 2026,
      month: 9,
      status: 'IN_REVIEW',
      revision: 0,
      rowVersion: 'BQYHCA==',
      assignments: [],
      warnings: [],
    });
  });
});
