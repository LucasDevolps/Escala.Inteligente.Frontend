import { HttpErrorResponse } from '@angular/common/http';
import { ApiErrorService } from './api-error.service';

describe('ApiErrorService', () => {
  const service = new ApiErrorService();

  it('uses stable ProblemDetails codes instead of exception text', () => {
    const error = new HttpErrorResponse({
      status: 409,
      error: { code: 'CONCURRENCY_CONFLICT', detail: 'backend text that can change' },
    });

    expect(service.code(error)).toBe('CONCURRENCY_CONFLICT');
    expect(service.message(error)).toContain('alterado por outra pessoa');
  });

  it('returns validation fields without exposing unknown payloads', () => {
    const error = new HttpErrorResponse({
      status: 422,
      error: { code: 'VALIDATION_ERROR', errors: { email: ['E-mail inválido.'] } },
    });

    expect(service.fieldErrors(error)['email']).toEqual(['E-mail inválido.']);
    expect(service.fieldErrors(new Error('internal'))).toEqual({});
  });
});
