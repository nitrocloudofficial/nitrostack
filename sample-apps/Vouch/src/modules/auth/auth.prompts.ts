import { PromptDecorator as Prompt, ExecutionContext } from '@nitrostack/core';

/**
 * Auth Prompts
 * Guides AI agents through authentication flows.
 */
export class AuthPrompts {
  @Prompt({
    name: 'auth-signup-guide',
    description: 'Guide a user through creating a Vouch account',
  })
  async signupGuide(args: Record<string, unknown>, context: ExecutionContext) {
    return [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Help me create a Vouch account. I need to:
1. Choose between a consumer account (to write reviews) or a business account (to manage a business profile)
2. Provide my email and a secure password (minimum 8 characters)
3. Verify my email after signup to earn +10 reputation points

Use the auth_signup tool to create the account, then guide me through email verification with auth_verify_email.`,
        },
      },
    ];
  }

  @Prompt({
    name: 'auth-login-guide',
    description: 'Guide a user through logging into Vouch',
  })
  async loginGuide(args: Record<string, unknown>, context: ExecutionContext) {
    return [
      {
        role: 'user' as const,
        content: {
          type: 'text' as const,
          text: `Help me log into my Vouch account using auth_login. I'll provide my email and password.
After login, use auth_get_user to show my profile information including my role and verification status.
If I need to verify my email, use auth_verify_email with my user ID and verification token.`,
        },
      },
    ];
  }
}
