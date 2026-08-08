/**
 * FC 138 F1 — typed error thrown by `finance.service.ts`, caught in
 * `routes/finance.ts` and mapped to its pre-migration HTTP status/body (same
 * shape as before the Route→Service→Repository split — Inv-E). Single
 * discriminated class instead of a subclass per case (Gate 1 max-classes-per-file:1).
 */
export type FinanceErrorCode =
  | 'VALIDATION_ERROR'
  | 'CLUSTER_FORBIDDEN'
  | 'UNIT_NOT_FOUND'
  | 'OWNER_FORBIDDEN'
  | 'CATEGORY_FORBIDDEN';

/** Discriminated error thrown by `finance.service.ts` — see `FinanceErrorCode`. */
export class FinanceServiceError extends Error {
  constructor(
    public readonly code: FinanceErrorCode,
    message: string,
    public readonly field?: string
  ) {
    super(message);
    this.name = 'FinanceServiceError';
  }
}
