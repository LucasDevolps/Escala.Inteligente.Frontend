import { Component, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ApiErrorService } from '../../core/services/api-error.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <main class="auth-layout" id="main-content">
      <section class="auth-hero" aria-hidden="true">
        <div class="auth-hero__brand"><span>EC</span> Escala Certa</div>
        <div class="auth-hero__content">
          <p class="eyebrow eyebrow--light">Organização sem complicação</p>
          <h1>Escalas claras.<br />Equipes em sintonia.</h1>
          <p>
            Planeje o mês, acompanhe solicitações e mantenha toda a equipe atualizada em um só
            lugar.
          </p>
          <div class="auth-hero__illustration">
            <div class="mini-calendar">
              @for (day of miniDays; track $index) {
                <span [class.mini-calendar__active]="day">{{ $index + 1 }}</span>
              }
            </div>
            <span class="floating-chip floating-chip--one">✓ Escala publicada</span>
            <span class="floating-chip floating-chip--two">◇ Tudo atualizado</span>
          </div>
        </div>
        <small>Seguro · Privado · Feito para equipes</small>
      </section>

      <section class="auth-panel">
        <div class="auth-panel__inner">
          <div class="auth-mobile-brand"><span>EC</span> Escala Certa</div>
          <p class="eyebrow">Boas-vindas</p>
          <h1>Acesse sua conta</h1>
          <p class="auth-subtitle">Entre com os dados fornecidos pela sua organização.</p>

          @if (notice()) {
            <div class="alert alert--info" role="status">
              <span aria-hidden="true">i</span><span>{{ notice() }}</span>
            </div>
          }
          @if (errorMessage()) {
            <div class="alert alert--danger" role="alert">
              <span aria-hidden="true">!</span><span>{{ errorMessage() }}</span>
            </div>
          }

          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <div class="field">
              <label for="email">E-mail</label>
              <input
                id="email"
                type="email"
                formControlName="email"
                autocomplete="username"
                inputmode="email"
                placeholder="voce@empresa.com"
              />
              @if (form.controls.email.touched && form.controls.email.invalid) {
                <small class="field-error">Informe um e-mail válido.</small>
              }
            </div>
            <div class="field">
              <label for="password">Senha</label>
              <div class="password-field">
                <input
                  id="password"
                  [type]="showPassword() ? 'text' : 'password'"
                  formControlName="password"
                  autocomplete="current-password"
                  placeholder="Sua senha"
                />
                <button
                  type="button"
                  class="password-toggle"
                  (click)="showPassword.set(!showPassword())"
                  [attr.aria-label]="showPassword() ? 'Ocultar senha' : 'Mostrar senha'"
                >
                  {{ showPassword() ? 'Ocultar' : 'Mostrar' }}
                </button>
              </div>
              @if (form.controls.password.touched && form.controls.password.invalid) {
                <small class="field-error">Informe sua senha.</small>
              }
            </div>

            <button
              type="submit"
              class="button button--primary button--full button--large"
              [disabled]="loading()"
            >
              @if (loading()) {
                <span class="spinner spinner--light" aria-hidden="true"></span> Entrando…
              } @else {
                Entrar <span aria-hidden="true">→</span>
              }
            </button>
          </form>

          <p class="auth-help">
            Primeiro acesso? <a routerLink="/activate">Ative sua conta com o código recebido</a>.
          </p>
          <p class="privacy-note">
            <span aria-hidden="true">◈</span> Seu acesso é protegido e os dados da sua organização
            permanecem isolados.
          </p>
        </div>
      </section>
    </main>
  `,
  styleUrl: './auth.pages.scss',
})
export class LoginPage {
  readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email, Validators.maxLength(320)],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(128)],
    }),
  });
  readonly loading = signal(false);
  readonly showPassword = signal(false);
  readonly errorMessage = signal('');
  readonly miniDays = [
    true,
    false,
    true,
    true,
    false,
    true,
    false,
    true,
    true,
    false,
    true,
    true,
    false,
    false,
  ];
  readonly notice = signal('');

  constructor(
    private readonly auth: AuthService,
    private readonly errors: ApiErrorService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {
    this.notice.set(this.resolveNotice());
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMessage.set('');
    const { email, password } = this.form.getRawValue();
    this.auth
      .login(email.trim(), password)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          const requested = this.route.snapshot.queryParamMap.get('returnUrl');
          const destination =
            requested?.startsWith('/') && !requested.startsWith('//') ? requested : '/dashboard';
          void this.router.navigateByUrl(destination);
        },
        error: (error: unknown) =>
          this.errorMessage.set(
            this.errors.message(error, 'Não foi possível entrar. Tente novamente.'),
          ),
      });
  }

  private resolveNotice(): string {
    if (this.route.snapshot.queryParamMap.get('activated') === 'true')
      return 'Conta ativada. Agora você já pode entrar.';
    const reason = this.route.snapshot.queryParamMap.get('reason');
    if (reason === 'revoked') return 'Sua sessão foi encerrada porque um novo login foi realizado.';
    if (reason === 'expired') return 'Sua sessão expirou por inatividade. Entre novamente.';
    if (reason === 'invalid') return 'Não foi possível validar sua sessão. Entre novamente.';
    return '';
  }
}
