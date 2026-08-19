import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Schedule } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class ScheduleService {
  private readonly endpoint = `${environment.apiBaseUrl}/schedules`;

  constructor(private readonly http: HttpClient) {}

  create(year: number, month: number): Observable<Schedule> {
    return this.http.post<Schedule>(this.endpoint, { year, month });
  }

  get(year: number, month: number): Observable<Schedule> {
    return this.http.get<Schedule>(`${this.endpoint}/${year}/${month}`);
  }

  generate(scheduleId: string): Observable<Schedule> {
    return this.http.post<Schedule>(
      `${this.endpoint}/${encodeURIComponent(scheduleId)}/generate`,
      {},
    );
  }

  updateDay(
    scheduleId: string,
    date: string,
    employeeIds: readonly string[],
    rowVersion: string,
  ): Observable<Schedule> {
    return this.http.put<Schedule>(
      `${this.endpoint}/${encodeURIComponent(scheduleId)}/days/${encodeURIComponent(date)}`,
      { employeeIds, rowVersion },
    );
  }

  publish(scheduleId: string, rowVersion: string): Observable<Schedule> {
    return this.http.post<Schedule>(`${this.endpoint}/${encodeURIComponent(scheduleId)}/publish`, {
      rowVersion,
    });
  }
}
