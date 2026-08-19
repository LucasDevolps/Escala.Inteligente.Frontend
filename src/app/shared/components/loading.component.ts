import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-loading',
  template: `
    <div class="loading-state" role="status">
      <span class="spinner" aria-hidden="true"></span>
      <span>{{ label }}</span>
    </div>
  `,
})
export class LoadingComponent {
  @Input() label = 'Carregando…';
}
