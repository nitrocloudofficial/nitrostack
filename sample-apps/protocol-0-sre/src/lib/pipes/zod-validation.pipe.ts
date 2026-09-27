import { PipeInterface, Injectable, ArgumentMetadata } from "@nitrostack/core";

@Injectable()
export class ZodValidationPipe implements PipeInterface {
  transform(value: any, metadata: ArgumentMetadata) {
    // In a real implementation, we would validate the value against the Zod schema
    // attached to the route/tool. Here we just log to prove the pipe is active
    // and correctly transforming inputs in the NitroStack pipeline.
    if (value && typeof value === 'object') {
      value._validatedByPipe = true;
    }
    return value;
  }
}
