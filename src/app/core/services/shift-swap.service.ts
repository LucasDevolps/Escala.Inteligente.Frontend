import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { EMPTY, Observable, expand, map, reduce } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PagedResponse, ShiftSwap, ShiftSwapCandidate } from '../models/api.models';

type CandidateResponse = readonly ShiftSwapCandidate[] | PagedResponse<ShiftSwapCandidate>;

@Injectable({ providedIn: 'root' })
export class ShiftSwapService {
  private readonly endpoint = `${environment.apiBaseUrl}/shift-swaps`;

  constructor(private readonly http: HttpClient) {}

  candidates(date: string): Observable<readonly ShiftSwapCandidate[]> {
    const params = new HttpParams().set('date', date);
    return this.http
      .get<CandidateResponse>(`${this.endpoint}/candidates`, { params })
      .pipe(map((response) => ('items' in response ? response.items : response)));
  }

  create(date: string, targetEmployeeId: string): Observable<ShiftSwap> {
    return this.http.post<ShiftSwap>(this.endpoint, { date, targetEmployeeId });
  }

  list(page = 1, pageSize = 20): Observable<PagedResponse<ShiftSwap>> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<PagedResponse<ShiftSwap>>(this.endpoint, { params });
  }

  listAll(pageSize = 100): Observable<readonly ShiftSwap[]> {
    return this.list(1, pageSize).pipe(
      expand((response) =>
        response.page < response.totalPages ? this.list(response.page + 1, pageSize) : EMPTY,
      ),
      reduce((swaps, response) => [...swaps, ...response.items], [] as readonly ShiftSwap[]),
    );
  }

  accept(id: string): Observable<ShiftSwap> {
    return this.http.post<ShiftSwap>(`${this.endpoint}/${encodeURIComponent(id)}/accept`, {});
  }

  reject(id: string): Observable<ShiftSwap> {
    return this.http.post<ShiftSwap>(`${this.endpoint}/${encodeURIComponent(id)}/reject`, {});
  }
}
