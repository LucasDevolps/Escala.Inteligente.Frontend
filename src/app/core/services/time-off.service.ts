import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { EMPTY, Observable, expand, reduce } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  PagedResponse,
  TimeOffReasonCategory,
  TimeOffRequest,
  TimeOffStatus,
} from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class TimeOffService {
  private readonly endpoint = `${environment.apiBaseUrl}/time-off-requests`;

  constructor(private readonly http: HttpClient) {}

  list(page = 1, pageSize = 20, status?: TimeOffStatus): Observable<PagedResponse<TimeOffRequest>> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<PagedResponse<TimeOffRequest>>(this.endpoint, { params });
  }

  listAll(status?: TimeOffStatus, pageSize = 100): Observable<readonly TimeOffRequest[]> {
    return this.list(1, pageSize, status).pipe(
      expand((response) =>
        response.page < response.totalPages
          ? this.list(response.page + 1, pageSize, status)
          : EMPTY,
      ),
      reduce(
        (requests, response) => [...requests, ...response.items],
        [] as readonly TimeOffRequest[],
      ),
    );
  }

  create(
    date: string,
    reasonCategory: TimeOffReasonCategory,
    reasonDescription?: string,
  ): Observable<TimeOffRequest> {
    return this.http.post<TimeOffRequest>(this.endpoint, {
      date,
      reasonCategory,
      reasonDescription: reasonDescription?.trim() || null,
    });
  }

  approve(id: string, acknowledgeCoverageRisk: boolean): Observable<TimeOffRequest> {
    return this.http.post<TimeOffRequest>(`${this.endpoint}/${encodeURIComponent(id)}/approve`, {
      acknowledgeCoverageRisk,
    });
  }

  reject(id: string, reason: string): Observable<TimeOffRequest> {
    return this.http.post<TimeOffRequest>(`${this.endpoint}/${encodeURIComponent(id)}/reject`, {
      reason,
    });
  }
}
