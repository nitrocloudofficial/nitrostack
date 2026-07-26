import type { ReactNode } from 'react';
import type { FieldValues, UseFormStateProps, UseFormStateReturn } from './types';
export type FormStateSubscribeProps<TFieldValues extends FieldValues, TTransformedValues = TFieldValues> = UseFormStateProps<TFieldValues, TTransformedValues> & {
    render: (values: UseFormStateReturn<TFieldValues>) => ReactNode;
};
export declare const FormStateSubscribe: <TFieldValues extends FieldValues, TTransformedValues = TFieldValues>({ control, disabled, exact, name, render, }: FormStateSubscribeProps<TFieldValues, TTransformedValues>) => ReactNode;
//# sourceMappingURL=formStateSubscribe.d.ts.map