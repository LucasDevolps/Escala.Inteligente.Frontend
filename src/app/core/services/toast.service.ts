import { Injectable, signal } from '@angular/core';

export type ToastKind = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  readonly id: number;
  readonly kind: ToastKind;
  readonly message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly nextId = signal(0);
  readonly messages = signal<readonly ToastMessage[]>([]);

  show(message: string, kind: ToastKind = 'info', durationMs = 5000): void {
    const id = this.nextId() + 1;
    this.nextId.set(id);
    this.messages.update((messages) => [...messages, { id, kind, message }]);
    window.setTimeout(() => this.dismiss(id), durationMs);
  }

  dismiss(id: number): void {
    this.messages.update((messages) => messages.filter((message) => message.id !== id));
  }
}
