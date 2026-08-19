import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ProblemDetails } from '../models/api.models';

const ERROR_MESSAGES: Readonly<Record<string, string>> = {
  VALIDATION_ERROR: 'Revise os campos informados.',
  INVALID_CREDENTIALS: 'E-mail ou senha inválidos.',
  INVALID_ACTIVATION_TOKEN: 'O código de ativação é inválido ou expirou.',
  RATE_LIMIT_EXCEEDED: 'Muitas tentativas. Aguarde um momento e tente novamente.',
  SESSION_EXPIRED: 'Sua sessão expirou. Entre novamente.',
  SESSION_REVOKED: 'Sua sessão foi encerrada porque um novo login foi realizado.',
  INVALID_REFRESH_TOKEN: 'Não foi possível renovar a sessão. Entre novamente.',
  REFRESH_TOKEN_REUSE: 'Sua sessão foi encerrada por segurança. Entre novamente.',
  ACCESS_DENIED: 'Você não tem permissão para realizar esta ação.',
  EMPLOYEE_NOT_FOUND: 'Colaborador não encontrado.',
  EMAIL_ALREADY_EXISTS: 'Já existe uma conta com este e-mail.',
  EMPLOYEE_NUMBER_ALREADY_EXISTS: 'Já existe um colaborador com esta matrícula.',
  SCHEDULE_NOT_FOUND: 'A escala deste mês ainda não foi criada.',
  SCHEDULE_ALREADY_EXISTS: 'Já existe uma escala para este mês.',
  SCHEDULE_ALREADY_PUBLISHED: 'Esta escala já foi publicada.',
  SCHEDULE_NOT_PUBLISHED: 'A escala precisa estar publicada para esta ação.',
  CONCURRENCY_CONFLICT:
    'Este conteúdo foi alterado por outra pessoa. Atualize a página e tente novamente.',
  COVERAGE_RISK: 'A aprovação deixará o dia abaixo da cobertura mínima.',
  MAXIMUM_COVERAGE_EXCEEDED: 'A quantidade excede a cobertura máxima do dia.',
  EMPLOYEE_UNAVAILABLE: 'Um dos colaboradores selecionados não está disponível.',
  TIME_OFF_ALREADY_EXISTS: 'Já existe uma solicitação ativa para esta data.',
  TIME_OFF_NOT_FOUND: 'Solicitação de folga não encontrada.',
  TIME_OFF_ALREADY_PROCESSED: 'Esta solicitação já foi analisada.',
  SHIFT_SWAP_NOT_FOUND: 'Solicitação de troca não encontrada.',
  SHIFT_SWAP_ALREADY_PROCESSED: 'Esta troca já foi respondida.',
  SHIFT_SWAP_TARGET_UNAVAILABLE: 'O colaborador escolhido não está mais disponível.',
  SHIFT_SWAP_NOT_ALLOWED: 'Esta troca não pode ser realizada.',
  NOTIFICATION_NOT_FOUND: 'Notificação não encontrada.',
};

@Injectable({ providedIn: 'root' })
export class ApiErrorService {
  problem(error: unknown): ProblemDetails | null {
    if (!(error instanceof HttpErrorResponse) || !error.error || typeof error.error !== 'object') {
      return null;
    }
    return error.error as ProblemDetails;
  }

  code(error: unknown): string | null {
    return this.problem(error)?.code ?? null;
  }

  message(
    error: unknown,
    fallback = 'Não foi possível concluir a operação. Tente novamente.',
  ): string {
    const problem = this.problem(error);
    if (problem?.code && ERROR_MESSAGES[problem.code]) {
      return ERROR_MESSAGES[problem.code];
    }
    if (problem?.detail) {
      return problem.detail;
    }
    if (error instanceof HttpErrorResponse && error.status === 0) {
      return 'Não foi possível conectar ao servidor. Verifique se a API está em execução.';
    }
    return fallback;
  }

  fieldErrors(error: unknown): Readonly<Record<string, readonly string[]>> {
    return this.problem(error)?.errors ?? {};
  }
}
