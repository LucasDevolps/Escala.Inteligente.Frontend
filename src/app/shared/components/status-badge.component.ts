import { Component, Input } from '@angular/core';

const LABELS: Readonly<Record<string, string>> = {
  ACTIVE: 'Ativo',
  INACTIVE: 'Inativo',
  DRAFT: 'Rascunho',
  SUGGESTED: 'Sugestão',
  IN_REVIEW: 'Em revisão',
  PUBLISHED: 'Publicada',
  CLOSED: 'Encerrada',
  PENDING: 'Pendente',
  APPROVED: 'Aprovada',
  ACCEPTED: 'Aceita',
  REJECTED: 'Recusada',
  CANCELLED: 'Cancelada',
  EXPIRED: 'Expirada',
};

@Component({
  selector: 'app-status-badge',
  template: `<span class="status-badge status-badge--{{ tone }}"
    ><span aria-hidden="true">{{ icon }}</span> {{ label }}</span
  >`,
})
export class StatusBadgeComponent {
  @Input({ required: true }) status = '';

  get label(): string {
    return LABELS[this.status] ?? this.status;
  }

  get tone(): string {
    if (['PUBLISHED', 'APPROVED', 'ACCEPTED', 'ACTIVE'].includes(this.status)) return 'success';
    if (['REJECTED', 'INACTIVE', 'EXPIRED'].includes(this.status)) return 'danger';
    if (['PENDING', 'SUGGESTED', 'IN_REVIEW'].includes(this.status)) return 'warning';
    return 'neutral';
  }

  get icon(): string {
    if (this.tone === 'success') return '✓';
    if (this.tone === 'danger') return '×';
    if (this.tone === 'warning') return '!';
    return '•';
  }
}
