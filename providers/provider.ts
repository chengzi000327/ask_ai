import type { ChatOptions, Provider } from '../shared/types';

export type { ChatOptions, Provider };

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export type Fetcher = typeof fetch;
