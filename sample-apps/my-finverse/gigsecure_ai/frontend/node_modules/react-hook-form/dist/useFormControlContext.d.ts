import React from 'react';
import type { Control, FieldValues } from './types';
/**
 * Separate context for `control` to prevent unnecessary rerenders.
 * Internal hooks that only need control use this instead of full form context.
 */
export declare const HookFormControlContext: React.Context<Control | null>;
/**
 * @internal Internal hook to access only control from context.
 */
export declare const useFormControlContext: <TFieldValues extends FieldValues, TContext = any, TTransformedValues = TFieldValues>() => Control<TFieldValues, TContext, TTransformedValues>;
//# sourceMappingURL=useFormControlContext.d.ts.map