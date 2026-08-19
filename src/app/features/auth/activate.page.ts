import { Component, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ApiErrorService } from '../../core/services/api-error.service';
import { AuthService } from '../../core/services/auth.service';

const passwordsMatch: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const password = control.get('newPassword')?.value as string | undefined;
  const confirmation = control.get('confirmation')?.value as string | undefined;
  return password === confirmation ? null : { passwordMismatch: true };
};

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <main class="auth-layout" id="main-content">
      <section class="auth-hero auth-hero--activation" aria-hidden="true">
        <div class="auth-hero__brand"><span>EC</span> Escala Certa</div>
        <div class="auth-hero__content">
          <p class="eyebrow eyebrow--light">Seu primeiro acesso</p>
          <h1>Você define a sua senha.</h1>
          <p>
            O código recebido é temporário e só pode ser usado uma vez. Seu gestor nunca terá acesso
            à sua senha definitiva.
          </p>
          <ol class="activation-steps">
            <li><span>1</span> Informe seu e-mail</li>
            <li><span>2</span> Digite o código de ativação</li>
            <li><span>3</span> Crie uma senha segura</li>
          </ol>
        </div>
        <small>Códigos expiram em 24 horas</small>
      </section>

      <section class="auth-panel">
        <div class="auth-panel__inner">
          <div class="auth-mobile-brand"><span>EC</span> Escala Certa</div>
          <p class="eyebrow">Ativação</p>
          <h1>Crie seu acesso</h1>
          <p class="auth-subtitle">Use o código compartilhado pelo gestor da sua organização.</p>

          @if (errorMessage()) {
            <div class="alert alert--danger" role="alert">
              <span aria-hidden="true">!</span><span>{{ errorMessage() }}</span>
            </div>
          }

          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <div class="field">
              <label for="activation-email">E-mail</label>
              <input
                id="activation-email"
                type="email"
                formControlName="email"
                autocomplete="username"
                inputmode="email"
              />
              @if (form.controls.email.touched && form.controls.email.invalid) {
                <small class="field-error">Informe um e-mail válido.</small>
              }
            </div>
            <div class="field">
              <label for="activation-code">Código de ativação</label>
              <input
                id="activation-code"
                type="text"
                formControlName="activationCode"
                autocomplete="one-time-code"
                spellcheck="false"
              />
              @if (form.controls.activationCode.touched && form.controls.activationCode.invalid) {
                <small class="field-error">Informe o código recebido.</small>
              }
            </div>
            <div class="field">
              <label for="new-password">Nova senha</label>
              <input
                id="new-password"
                type="password"
                formControlName="newPassword"
                autocomplete="new-password"
                aria-describedby="password-help"
              />
              <small id="password-help" class="field-help"
                >Use de 12 a 128 caracteres. Frases-senha são bem-vindas.</small
              >
            </div>
            <div class="field">
              <label for="confirmation">Confirme a nova senha</label>
              <input
                id="confirmation"
                type="password"
                formControlName="confirmation"
                autocomplete="new-password"
              />
              @if (form.controls.confirmation.touched && form.hasError('passwordMismatch')) {
                <small class="field-error">As senhas não coincidem.</small>
              }
            </div>
            <button
              type="submit"
              class="button button--primary button--full button--large"
              [disabled]="loading()"
            >
              @if (loading()) {
                <span class="spinner spinner--light" aria-hidden="true"></span> Ativando…
              } @else {
                Ativar minha conta
              }
            </button>
          </form>
          <p class="auth-help"><a routerLink="/login">← Voltar para o login</a></p>
        </div>
      </section>
    </main>
  `,
  styleUrl: './auth.pages.scss',
})
export class ActivatePage {
  readonly form = new FormGroup(
    {
      email: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.email, Validators.maxLength(320)],
      }),
      activationCode: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.maxLength(512)],
      }),
      newPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(12), Validators.maxLength(128)],
      }),
      confirmation: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    },
    { validators: passwordsMatch },
  );
  readonly loading = signal(false);
  readonly errorMessage = signal('');

  constructor(
    private readonly auth: AuthService,
    private readonly errors: ApiErrorService,
    private readonly router: Router,
  ) {}

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMessage.set('');
    const { email, activationCode, newPassword } = this.form.getRawValue();
    this.auth
      .activate(email.trim(), activationCode.trim(), newPassword)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () =>
          void this.router.navigate(['/login'], {
            queryParams: { activated: 'true' },
            replaceUrl: true,
          }),
        error: (error: unknown) =>
          this.errorMessage.set(
            this.errors.message(
              error,
              'Não foi possível ativar a conta. Confira o código e tente novamente.',
            ),
          ),
      });
  }
}
