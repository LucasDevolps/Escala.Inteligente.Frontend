import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AppNotification, PagedResponse } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly endpoint = `${environment.apiBaseUrl}/notifications`;

  constructor(private readonly http: HttpClient) {}

  list(page = 1, pageSize = 20): Observable<PagedResponse<AppNotification>> {
    const params = new HttpParams().set('page', page).set('pageSize', pageSize);
    return this.http.get<PagedResponse<AppNotification>>(this.endpoint, { params });
  }

  get(id: string): Observable<AppNotification> {
    return this.http.get<AppNotification>(`${this.endpoint}/${encodeURIComponent(id)}`);
  }

  markRead(id: string): Observable<void> {
    return this.http.post<void>(`${this.endpoint}/${encodeURIComponent(id)}/read`, {});
  }
}
