import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-pagination',
  template: `
    @if (totalPages > 1) {
      <nav class="pagination" aria-label="Paginação">
        <button
          type="button"
          class="button button--ghost"
          [disabled]="page <= 1"
          (click)="change.emit(page - 1)"
        >
          ← Anterior
        </button>
        <span
          >Página <strong>{{ page }}</strong> de {{ totalPages }}</span
        >
        <button
          type="button"
          class="button button--ghost"
          [disabled]="page >= totalPages"
          (click)="change.emit(page + 1)"
        >
          Próxima →
        </button>
      </nav>
    }
  `,
})
export class PaginationComponent {
  @Input({ required: true }) page = 1;
  @Input({ required: true }) totalPages = 0;
  @Output() readonly change = new EventEmitter<number>();
}
