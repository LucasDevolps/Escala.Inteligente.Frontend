import { Component, Input } from '@angular/core';
import { IconComponent, IconName } from './icon.component';

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
  imports: [IconComponent],
  template: `<span class="status-badge status-badge--{{ tone }}"
    ><app-icon [name]="icon" /> {{ label }}</span
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

  get icon(): IconName {
    if (this.tone === 'success') return 'check';
    if (this.tone === 'danger' || this.tone === 'warning') return 'alert';
    return 'info';
  }
}
