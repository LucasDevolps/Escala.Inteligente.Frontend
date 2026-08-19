import { Component, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { finalize } from 'rxjs';
import { PagedResponse, ShiftSwap, ShiftSwapCandidate } from '../../core/models/api.models';
import { ApiErrorService } from '../../core/services/api-error.service';
import { AuthService } from '../../core/services/auth.service';
import { ShiftSwapService } from '../../core/services/shift-swap.service';
import { ToastService } from '../../core/services/toast.service';
import { formatDate, formatDateTime, todayIso } from '../../core/utils/date.utils';
import { LoadingComponent } from '../../shared/components/loading.component';
import { PaginationComponent } from '../../shared/components/pagination.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';

const EMPTY_PAGE: PagedResponse<ShiftSwap> = {
  items: [],
  page: 1,
  pageSize: 20,
  totalItems: 0,
  totalPages: 0,
};
const notPast = (control: AbstractControl): ValidationErrors | null =>
  String(control.value ?? '') >= todayIso() ? null : { pastDate: true };

@Component({
  imports: [ReactiveFormsModule, LoadingComponent, PaginationComponent, StatusBadgeComponent],
  template: `
    <header class="page-header">
      <div>
        <p class="eyebrow">Flexibilidade com segurança</p>
        <h1>Trocas de dia</h1>
        <p>
          {{
            auth.isManager()
              ? 'Acompanhe as trocas da equipe. O aceite do colaborador atualiza a escala imediatamente.'
              : 'Solicite uma troca ou responda aos convites recebidos.'
          }}
        </p>
      </div>
    </header>

    @if (!auth.isManager()) {
      <section class="card swap-builder">
        <div class="swap-builder__intro">
          <span class="feature-icon" aria-hidden="true">⇄</span>
          <div>
            <p class="eyebrow">Nova solicitação</p>
            <h2>Com quem você quer trocar?</h2>
            <p>Escolha um dia em que você está escalado. Mostraremos apenas colegas disponíveis.</p>
          </div>
        </div>
        <form [formGroup]="form" (ngSubmit)="create()" novalidate>
          <div class="field">
            <label for="swap-date">Dia de trabalho</label>
            <div class="input-action">
              <input
                id="swap-date"
                type="date"
                formControlName="date"
                [min]="minimumDate"
                (change)="clearCandidates()"
              /><button
                type="button"
                class="button button--secondary"
                (click)="findCandidates()"
                [disabled]="!form.controls.date.value || candidateLoading()"
              >
                {{ candidateLoading() ? 'Buscando…' : 'Buscar disponíveis' }}
              </button>
            </div>
          </div>
          @if (candidateError()) {
            <div class="alert alert--danger" role="alert">
              <span aria-hidden="true">!</span><span>{{ candidateError() }}</span>
            </div>
          }
          @if (candidatesLoaded()) {
            <div class="field">
              <label for="target-employee">Colaborador disponível</label
              ><select id="target-employee" formControlName="targetEmployeeId">
                <option value="">Selecione uma pessoa</option>
                @for (candidate of candidates(); track candidate.employeeId) {
                  <option [value]="candidate.employeeId">
                    {{ candidate.name
                    }}{{ candidate.employeeNumber ? ' · ' + candidate.employeeNumber : '' }}
                  </option>
                }
              </select>
              @if (candidates().length === 0) {
                <small class="field-help">Nenhum colaborador está disponível para esta data.</small>
              }
            </div>
          }
          <button
            type="submit"
            class="button button--primary"
            [disabled]="form.invalid || !candidatesLoaded() || actionLoading()"
          >
            Enviar solicitação
          </button>
        </form>
      </section>
    }

    <section class="section-heading">
      <div>
        <p class="eyebrow">Histórico</p>
        <h2>{{ auth.isManager() ? 'Trocas da equipe' : 'Minhas trocas' }}</h2>
      </div>
    </section>
    @if (errorMessage()) {
      <div class="alert alert--danger" role="alert">
        <span aria-hidden="true">!</span><span>{{ errorMessage() }}</span>
      </div>
    }
    @if (loading()) {
      <app-loading label="Carregando trocas…" />
    } @else if (pageData().items.length === 0) {
      <section class="empty-state card">
        <span class="empty-state__icon" aria-hidden="true">⇄</span>
        <h2>Nenhuma troca por aqui</h2>
        <p>
          {{
            auth.isManager()
              ? 'As solicitações feitas pela equipe aparecerão nesta lista.'
              : 'Você ainda não enviou nem recebeu solicitações.'
          }}
        </p>
      </section>
    } @else {
      <section class="swap-list" aria-label="Solicitações de troca">
        @for (swap of pageData().items; track swap.id) {
          <article class="swap-card card">
            <div class="swap-card__date">
              <span aria-hidden="true">▦</span><strong>{{ formatDate(swap.date) }}</strong>
            </div>
            <div class="swap-card__people">
              <div>
                <small>De</small><strong>{{ swap.requesterName ?? 'Solicitante' }}</strong>
              </div>
              <span aria-hidden="true">→</span>
              <div>
                <small>Para</small><strong>{{ swap.targetName ?? 'Colaborador convidado' }}</strong>
              </div>
            </div>
            <div class="swap-card__meta">
              <app-status-badge [status]="swap.status" /><small
                >Solicitada em {{ formatDateTime(swap.requestedAt) }}</small
              >
            </div>
            @if (!auth.isManager() && swap.canRespond) {
              <div class="swap-card__actions">
                <button
                  type="button"
                  class="button button--success"
                  (click)="accept(swap)"
                  [disabled]="actionLoading()"
                >
                  ✓ Aceitar</button
                ><button
                  type="button"
                  class="button button--danger-ghost"
                  (click)="reject(swap)"
                  [disabled]="actionLoading()"
                >
                  Recusar
                </button>
              </div>
            }
          </article>
        }
      </section>
      <app-pagination
        [page]="pageData().page"
        [totalPages]="pageData().totalPages"
        (change)="load($event)"
      />
    }

    <div class="inline-note">
      <span aria-hidden="true">i</span>
      <p>
        <strong>Como funciona:</strong> a troca só pode ocorrer em escala publicada. Ao aceitar,
        todas as condições são validadas novamente e a alteração acontece de forma atômica.
      </p>
    </div>
  `,
})
export class SwapsPage {
  readonly minimumDate = todayIso();
  readonly form = new FormGroup({
    date: new FormControl('', { nonNullable: true, validators: [Validators.required, notPast] }),
    targetEmployeeId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  readonly candidates = signal<readonly ShiftSwapCandidate[]>([]);
  readonly candidatesLoaded = signal(false);
  readonly candidateLoading = signal(false);
  readonly candidateError = signal('');
  readonly pageData = signal<PagedResponse<ShiftSwap>>(EMPTY_PAGE);
  readonly loading = signal(true);
  readonly actionLoading = signal(false);
  readonly errorMessage = signal('');
  readonly formatDate = formatDate;
  readonly formatDateTime = formatDateTime;

  constructor(
    readonly auth: AuthService,
    private readonly swaps: ShiftSwapService,
    private readonly errors: ApiErrorService,
    private readonly toasts: ToastService,
  ) {
    this.load();
  }

  clearCandidates(): void {
    this.candidates.set([]);
    this.candidatesLoaded.set(false);
    this.form.controls.targetEmployeeId.reset();
  }

  findCandidates(): void {
    const date = this.form.controls.date.value;
    if (!date) return;
    this.candidateLoading.set(true);
    this.candidateError.set('');
    this.swaps
      .candidates(date)
      .pipe(finalize(() => this.candidateLoading.set(false)))
      .subscribe({
        next: (candidates) => {
          this.candidates.set(candidates);
          this.candidatesLoaded.set(true);
        },
        error: (error: unknown) => this.candidateError.set(this.errors.message(error)),
      });
  }

  create(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.actionLoading.set(true);
    this.swaps
      .create(value.date, value.targetEmployeeId)
      .pipe(finalize(() => this.actionLoading.set(false)))
      .subscribe({
        next: () => {
          this.toasts.show(
            'Solicitação enviada. O colaborador e o gestor foram notificados.',
            'success',
          );
          this.form.reset();
          this.clearCandidates();
          this.load();
        },
        error: (error: unknown) => this.toasts.show(this.errors.message(error), 'error'),
      });
  }

  accept(swap: ShiftSwap): void {
    if (
      !window.confirm(
        `Aceitar a troca do dia ${formatDate(swap.date)}? A escala será atualizada imediatamente.`,
      )
    )
      return;
    this.respond(swap, true);
  }

  reject(swap: ShiftSwap): void {
    if (!window.confirm(`Recusar a troca do dia ${formatDate(swap.date)}?`)) return;
    this.respond(swap, false);
  }

  load(page = 1): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.swaps
      .list(page)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => this.pageData.set(response),
        error: (error: unknown) => this.errorMessage.set(this.errors.message(error)),
      });
  }

  private respond(swap: ShiftSwap, accept: boolean): void {
    this.actionLoading.set(true);
    const operation = accept ? this.swaps.accept(swap.id) : this.swaps.reject(swap.id);
    operation.pipe(finalize(() => this.actionLoading.set(false))).subscribe({
      next: () => {
        this.toasts.show(
          accept ? 'Troca aceita e escala atualizada.' : 'Troca recusada.',
          'success',
        );
        this.load(this.pageData().page);
      },
      error: (error: unknown) => {
        this.toasts.show(this.errors.message(error), 'error');
        const code = this.errors.code(error);
        if (
          code === 'CONCURRENCY_CONFLICT' ||
          code === 'SHIFT_SWAP_ALREADY_PROCESSED' ||
          code === 'SHIFT_SWAP_TARGET_UNAVAILABLE'
        )
          this.load(this.pageData().page);
      },
    });
  }
}
