import { Injectable } from '@nitrostack/core';

@Injectable()
export class AccountAggregatorAuthService {
  async authenticate(): Promise<string> {
    return 'aa-token-12345';
  }
}
