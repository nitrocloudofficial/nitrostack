import { Guard, ExecutionContext, Injectable } from "@nitrostack/core";

@Injectable()
export class ZeroTrustGuard implements Guard {
  canActivate(context: ExecutionContext): boolean {
    const secret = process.env.ZERO_TRUST_SECRET;
    
    if (!secret) {
      context.logger.error(
        "ZERO_TRUST_VIOLATION: Execution blocked. Server missing ZERO_TRUST_SECRET configuration."
      );
      return false;
    }

    // In MCP, Guards perform coarse-grained environment authorization.
    // Fine-grained cryptographic HMAC validation of the payload happens in the ActionTools handler 
    // because MCP Guards do not receive the execution payload (ExecutionContext only).
    context.logger.info("Zero-Trust Execution Gate: Environment authorized.");
    return true;
  }
}
