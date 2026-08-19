import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { EMPTY, Observable, expand, reduce } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CreateEmployeeResponse,
  Employee,
  EmployeeUpsertRequest,
  PagedResponse,
} from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class EmployeeService {
  private readonly endpoint = `${environment.apiBaseUrl}/employees`;

  constructor(private readonly http: HttpClient) {}

  list(page = 1, pageSize = 20): Observable<PagedResponse<Employee>> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<PagedResponse<Employee>>(this.endpoint, { params });
  }

  listAll(pageSize = 100): Observable<readonly Employee[]> {
    return this.list(1, pageSize).pipe(
      expand((response) =>
        response.page < response.totalPages ? this.list(response.page + 1, pageSize) : EMPTY,
      ),
      reduce((employees, response) => [...employees, ...response.items], [] as readonly Employee[]),
    );
  }

  get(id: string): Observable<Employee> {
    return this.http.get<Employee>(`${this.endpoint}/${encodeURIComponent(id)}`);
  }

  create(request: EmployeeUpsertRequest): Observable<CreateEmployeeResponse> {
    const { rowVersion: _rowVersion, ...payload } = request;
    return this.http.post<CreateEmployeeResponse>(this.endpoint, payload);
  }

  update(id: string, request: EmployeeUpsertRequest): Observable<Employee> {
    return this.http.put<Employee>(`${this.endpoint}/${encodeURIComponent(id)}`, request);
  }

  deactivate(id: string): Observable<void> {
    return this.http.post<void>(`${this.endpoint}/${encodeURIComponent(id)}/deactivate`, {});
  }
}
