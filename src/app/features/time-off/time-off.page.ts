import { Component, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { PagedResponse, TimeOffRequest, TimeOffStatus } from '../../core/models/api.models';
import { ApiErrorService } from '../../core/services/api-error.service';
import { AuthService } from '../../core/services/auth.service';
import { TimeOffService } from '../../core/services/time-off.service';
import { ToastService } from '../../core/services/toast.service';
import { formatDate, formatDateTime } from '../../core/utils/date.utils';
import { LoadingComponent } from '../../shared/components/loading.component';
import { PaginationComponent } from '../../shared/components/pagination.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';

const EMPTY_PAGE: PagedResponse<TimeOffRequest> = {
  items: [],
  page: 1,
  pageSize: 20,
  totalItems: 0,
  totalPages: 0,
};
const notBlank = (control: { readonly value: unknown }): { readonly blank: true } | null =>
  String(control.value ?? '').trim().length > 0 ? null : { blank: true };

@Component({
  imports: [
    RouterLink,
    ReactiveFormsModule,
    LoadingComponent,
    PaginationComponent,
    StatusBadgeComponent,
  ],
  template: `
    <header class="page-header">
      <div>
        <p class="eyebrow">Ausências planejadas</p>
        <h1>{{ auth.isManager() ? 'Solicitações de folga' : 'Minhas folgas' }}</h1>
        <p>
          {{
            auth.isManager()
              ? 'Analise pedidos considerando a cobertura da equipe.'
              : 'Acompanhe seus pedidos ou solicite uma nova data.'
          }}
        </p>
      </div>
      @if (!auth.isManager()) {
        <a class="button button--primary" routerLink="/time-off/new"
          ><span aria-hidden="true">＋</span> Solicitar folga</a
        >
      }
    </header>

    <section class="filter-tabs" aria-label="Filtrar por status">
      @for (filter of filters; track filter.value) {
        <button
          type="button"
          [class.filter-tabs__active]="selectedStatus() === filter.value"
          [attr.aria-pressed]="selectedStatus() === filter.value"
          (click)="setFilter(filter.value)"
        >
          {{ filter.label }}
        </button>
      }
    </section>

    @if (auth.isManager()) {
      <div class="privacy-banner">
        <span aria-hidden="true">◈</span>
        <p>
          <strong>Privacidade em primeiro lugar.</strong> Use as descrições apenas para analisar o
          pedido e não copie informações pessoais para outros sistemas.
        </p>
      </div>
    }

    @if (errorMessage()) {
      <div class="alert alert--danger" role="alert">
        <span aria-hidden="true">!</span><span>{{ errorMessage() }}</span>
      </div>
    }
    @if (loading()) {
      <app-loading label="Carregando solicitações…" />
    } @else if (pageData().items.length === 0) {
      <section class="empty-state card">
        <span class="empty-state__icon" aria-hidden="true">○</span>
        <h2>Nenhuma solicitação encontrada</h2>
        <p>
          {{
            auth.isManager()
              ? 'Quando alguém pedir folga, a solicitação aparecerá aqui.'
              : 'Você ainda não solicitou folgas com este status.'
          }}
        </p>
        @if (!auth.isManager()) {
          <a class="button button--primary" routerLink="/time-off/new">Solicitar folga</a>
        }
      </section>
    } @else {
      <section class="request-list" aria-label="Solicitações de folga">
        @for (request of pageData().items; track request.id) {
          <article class="request-card card">
            <div class="request-card__date">
              <strong>{{ day(request.date) }}</strong
              ><span>{{ month(request.date) }}</span
              ><small>{{ year(request.date) }}</small>
            </div>
            <div class="request-card__body">
              <div class="request-card__title">
                <div>
                  <h2>
                    {{
                      auth.isManager()
                        ? (request.employeeName ?? 'Colaborador')
                        : categoryLabel(request.reasonCategory)
                    }}
                  </h2>
                  <p>
                    {{
                      auth.isManager()
                        ? categoryLabel(request.reasonCategory)
                        : 'Solicitada em ' + formatDateTime(request.requestedAt)
                    }}
                  </p>
                </div>
                <app-status-badge [status]="request.status" />
              </div>
              @if (request.reasonDescription) {
                <p class="request-card__reason">“{{ request.reasonDescription }}”</p>
              }
              @if (request.rejectionReason) {
                <div class="inline-note inline-note--danger">
                  <strong>Motivo da recusa:</strong> {{ request.rejectionReason }}
                </div>
              }
              @if (auth.isManager() && request.status === 'PENDING') {
                <div class="request-card__actions">
                  <button
                    type="button"
                    class="button button--success"
                    (click)="approve(request)"
                    [disabled]="actionLoading()"
                  >
                    ✓ Aprovar</button
                  ><button
                    type="button"
                    class="button button--danger-ghost"
                    (click)="openReject(request)"
                  >
                    Recusar
                  </button>
                </div>
              }
            </div>
          </article>
        }
      </section>
      <app-pagination
        [page]="pageData().page"
        [totalPages]="pageData().totalPages"
        (change)="load($event)"
      />
    }

    @if (coverageRisk(); as request) {
      <div class="modal-backdrop" role="presentation" (click)="coverageRisk.set(null)">
        <section
          class="modal-panel modal-panel--small"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="coverage-risk-title"
          (click)="$event.stopPropagation()"
        >
          <header class="modal-panel__header">
            <div>
              <p class="eyebrow">Confirmação necessária</p>
              <h2 id="coverage-risk-title">Risco de cobertura</h2>
            </div>
            <button
              type="button"
              class="icon-button"
              (click)="coverageRisk.set(null)"
              aria-label="Fechar"
            >
              ×
            </button>
          </header>
          <div class="alert alert--warning">
            <span aria-hidden="true">!</span
            ><span
              >Aprovar a folga de {{ request.employeeName ?? 'este colaborador' }} em
              {{ formatDate(request.date) }} deixará a equipe abaixo da cobertura mínima.</span
            >
          </div>
          <p>Confirme apenas se você avaliou o risco e decidiu prosseguir.</p>
          <footer class="modal-panel__footer">
            <button type="button" class="button button--ghost" (click)="coverageRisk.set(null)">
              Voltar</button
            ><button
              type="button"
              class="button button--danger"
              (click)="approve(request, true)"
              [disabled]="actionLoading()"
            >
              Reconhecer risco e aprovar
            </button>
          </footer>
        </section>
      </div>
    }

    @if (rejecting(); as request) {
      <div class="modal-backdrop" role="presentation" (click)="closeReject()">
        <section
          class="modal-panel modal-panel--small"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reject-title"
          (click)="$event.stopPropagation()"
        >
          <header class="modal-panel__header">
            <div>
              <p class="eyebrow">Recusar solicitação</p>
              <h2 id="reject-title">Informe o motivo</h2>
              <p>Uma explicação objetiva será enviada ao colaborador.</p>
            </div>
            <button type="button" class="icon-button" (click)="closeReject()" aria-label="Fechar">
              ×
            </button>
          </header>
          <div class="field">
            <label for="rejection-reason">Motivo da recusa</label
            ><textarea
              id="rejection-reason"
              [formControl]="rejectionReason"
              maxlength="500"
              rows="5"
            ></textarea
            ><small class="field-help">{{ rejectionReason.value.length }}/500 caracteres</small>
            @if (rejectionReason.touched && rejectionReason.invalid) {
              <small class="field-error">Informe o motivo da recusa.</small>
            }
          </div>
          <footer class="modal-panel__footer">
            <button type="button" class="button button--ghost" (click)="closeReject()">
              Cancelar</button
            ><button
              type="button"
              class="button button--danger"
              (click)="reject(request)"
              [disabled]="actionLoading()"
            >
              Confirmar recusa
            </button>
          </footer>
        </section>
      </div>
    }
  `,
})
export class TimeOffPage {
  readonly filters: readonly { value: TimeOffStatus | null; label: string }[] = [
    { value: null, label: 'Todas' },
    { value: 'PENDING', label: 'Pendentes' },
    { value: 'APPROVED', label: 'Aprovadas' },
    { value: 'REJECTED', label: 'Recusadas' },
  ];
  readonly selectedStatus = signal<TimeOffStatus | null>(null);
  readonly pageData = signal<PagedResponse<TimeOffRequest>>(EMPTY_PAGE);
  readonly loading = signal(true);
  readonly actionLoading = signal(false);
  readonly errorMessage = signal('');
  readonly coverageRisk = signal<TimeOffRequest | null>(null);
  readonly rejecting = signal<TimeOffRequest | null>(null);
  readonly rejectionReason = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(500), notBlank],
  });
  readonly formatDate = formatDate;
  readonly formatDateTime = formatDateTime;

  constructor(
    readonly auth: AuthService,
    private readonly timeOff: TimeOffService,
    private readonly errors: ApiErrorService,
    private readonly toasts: ToastService,
  ) {
    this.load();
  }

  setFilter(status: TimeOffStatus | null): void {
    this.selectedStatus.set(status);
    this.load();
  }

  load(page = 1): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.timeOff
      .list(page, 20, this.selectedStatus() ?? undefined)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => this.pageData.set(response),
        error: (error: unknown) => this.errorMessage.set(this.errors.message(error)),
      });
  }

  approve(request: TimeOffRequest, acknowledgeCoverageRisk = false): void {
    this.actionLoading.set(true);
    this.timeOff
      .approve(request.id, acknowledgeCoverageRisk)
      .pipe(finalize(() => this.actionLoading.set(false)))
      .subscribe({
        next: () => {
          this.coverageRisk.set(null);
          this.toasts.show(
            'Folga aprovada. A escala e o colaborador foram atualizados.',
            'success',
          );
          this.load(this.pageData().page);
        },
        error: (error: unknown) => {
          const code = this.errors.code(error);
          if (code === 'COVERAGE_RISK' && !acknowledgeCoverageRisk) this.coverageRisk.set(request);
          else {
            this.toasts.show(this.errors.message(error), 'error');
            if (code === 'CONCURRENCY_CONFLICT' || code === 'TIME_OFF_ALREADY_PROCESSED') {
              this.coverageRisk.set(null);
              this.load(this.pageData().page);
            }
          }
        },
      });
  }

  openReject(request: TimeOffRequest): void {
    this.rejectionReason.reset();
    this.rejecting.set(request);
  }

  closeReject(): void {
    this.rejecting.set(null);
    this.rejectionReason.reset();
  }

  reject(request: TimeOffRequest): void {
    if (this.rejectionReason.invalid) {
      this.rejectionReason.markAsTouched();
      return;
    }
    this.actionLoading.set(true);
    this.timeOff
      .reject(request.id, this.rejectionReason.value.trim())
      .pipe(finalize(() => this.actionLoading.set(false)))
      .subscribe({
        next: () => {
          this.closeReject();
          this.toasts.show('Solicitação recusada.', 'success');
          this.load(this.pageData().page);
        },
        error: (error: unknown) => {
          const code = this.errors.code(error);
          this.toasts.show(this.errors.message(error), 'error');
          if (code === 'CONCURRENCY_CONFLICT' || code === 'TIME_OFF_ALREADY_PROCESSED') {
            this.closeReject();
            this.load(this.pageData().page);
          }
        },
      });
  }

  day(date: string): string {
    return date.slice(8, 10);
  }
  month(date: string): string {
    return new Intl.DateTimeFormat('pt-BR', { month: 'short' })
      .format(new Date(`${date}T12:00:00`))
      .replace('.', '')
      .toUpperCase();
  }
  year(date: string): string {
    return date.slice(0, 4);
  }
  categoryLabel(category: string): string {
    return (
      { PERSONAL: 'Assunto pessoal', APPOINTMENT: 'Compromisso', OTHER: 'Outro motivo' }[
        category
      ] ?? category
    );
  }
}
