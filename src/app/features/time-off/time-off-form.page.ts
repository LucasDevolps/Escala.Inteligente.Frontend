import { Component, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { TimeOffReasonCategory } from '../../core/models/api.models';
import { ApiErrorService } from '../../core/services/api-error.service';
import { TimeOffService } from '../../core/services/time-off.service';
import { ToastService } from '../../core/services/toast.service';
import { todayIso } from '../../core/utils/date.utils';
import { IconComponent } from '../../shared/components/icon.component';

function notPast(control: AbstractControl): ValidationErrors | null {
  return String(control.value ?? '') >= todayIso() ? null : { pastDate: true };
}

@Component({
  imports: [ReactiveFormsModule, RouterLink, IconComponent],
  template: `
    <header class="page-header">
      <div>
        <a class="back-link" routerLink="/time-off"
          ><app-icon name="arrow-left" /> Voltar para solicitações</a
        >
        <p class="eyebrow">Planeje com antecedência</p>
        <h1>Solicitar folga</h1>
        <p>Escolha a data e informe somente o necessário para o gestor analisar.</p>
      </div>
    </header>
    <form
      class="form-card card form-card--narrow"
      [formGroup]="form"
      (ngSubmit)="submit()"
      novalidate
    >
      @if (errorMessage()) {
        <div class="alert alert--danger" role="alert">
          <span aria-hidden="true"><app-icon name="alert" /></span><span>{{ errorMessage() }}</span>
        </div>
      }
      <div class="field">
        <label for="time-off-date">Data da folga</label
        ><input id="time-off-date" type="date" formControlName="date" [min]="minimumDate" />
        @if (form.controls.date.touched && form.controls.date.invalid) {
          <small class="field-error">Escolha uma data de hoje em diante.</small>
        }
      </div>
      <fieldset class="choice-group">
        <legend>Motivo</legend>
        <p>Escolha a categoria mais adequada.</p>
        <label class="choice-card"
          ><input type="radio" formControlName="reasonCategory" value="PERSONAL" /><span
            aria-hidden="true"
            ><app-icon name="user" /></span
          ><span
            ><strong>Pessoal</strong><small>Compromissos e necessidades pessoais</small></span
          ></label
        >
        <label class="choice-card"
          ><input type="radio" formControlName="reasonCategory" value="APPOINTMENT" /><span
            aria-hidden="true"
            ><app-icon name="clock" /></span
          ><span
            ><strong>Compromisso</strong><small>Evento ou horário já agendado</small></span
          ></label
        >
        <label class="choice-card"
          ><input type="radio" formControlName="reasonCategory" value="OTHER" /><span
            aria-hidden="true"
            ><app-icon name="info" /></span
          ><span
            ><strong>Outro</strong><small>Quando as opções anteriores não se aplicam</small></span
          ></label
        >
      </fieldset>
      <div class="field">
        <label for="reason-description"
          >Descrição <span class="optional-label">opcional</span></label
        ><textarea
          id="reason-description"
          formControlName="reasonDescription"
          maxlength="500"
          rows="5"
          placeholder="Adicione apenas se ajudar na análise."
        ></textarea>
        <div class="field-meta">
          <small class="field-help"
            >{{ form.controls.reasonDescription.value.length }}/500 caracteres</small
          >
        </div>
      </div>
      <div class="privacy-banner">
        <span aria-hidden="true"><app-icon name="shield-check" /></span>
        <p>
          <strong>Proteja sua privacidade.</strong> Não informe dados médicos ou outras informações
          sensíveis desnecessárias.
        </p>
      </div>
      <footer class="form-actions">
        <a class="button button--ghost" routerLink="/time-off">Cancelar</a
        ><button class="button button--primary" type="submit" [disabled]="saving()">
          @if (saving()) {
            <span class="spinner spinner--light" aria-hidden="true"></span> Enviando…
          } @else {
            Enviar solicitação
          }
        </button>
      </footer>
    </form>
  `,
})
export class TimeOffFormPage {
  readonly minimumDate = todayIso();
  readonly form = new FormGroup({
    date: new FormControl('', { nonNullable: true, validators: [Validators.required, notPast] }),
    reasonCategory: new FormControl<TimeOffReasonCategory>('PERSONAL', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    reasonDescription: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(500)],
    }),
  });
  readonly saving = signal(false);
  readonly errorMessage = signal('');

  constructor(
    private readonly timeOff: TimeOffService,
    private readonly errors: ApiErrorService,
    private readonly toasts: ToastService,
    private readonly router: Router,
  ) {}

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.errorMessage.set('');
    const value = this.form.getRawValue();
    this.timeOff
      .create(value.date, value.reasonCategory, value.reasonDescription)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.toasts.show('Solicitação enviada ao gestor.', 'success');
          void this.router.navigate(['/time-off']);
        },
        error: (error: unknown) => this.errorMessage.set(this.errors.message(error)),
      });
  }
}
