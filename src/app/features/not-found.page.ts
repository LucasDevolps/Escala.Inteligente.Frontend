import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  imports: [RouterLink],
  template: `
    <main class="centered-page" id="main-content">
      <section class="empty-state">
        <span class="empty-state__icon" aria-hidden="true">404</span>
        <h1>Página não encontrada</h1>
        <p>O endereço pode ter mudado ou não estar disponível.</p>
        <a class="button button--primary" routerLink="/dashboard">Voltar para o início</a>
      </section>
    </main>
  `,
})
export class NotFoundPage {}
