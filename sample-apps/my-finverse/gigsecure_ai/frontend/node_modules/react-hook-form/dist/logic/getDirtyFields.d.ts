import type { FieldRefs } from '../types';
declare function markFieldsDirty<T>(data: T, fields?: Record<string, any>, fieldRefs?: Record<string, any>): Record<string, any>;
export default function getDirtyFields<T>(data: T, formValues: T, dirtyFieldsFromValues?: Record<Extract<keyof T, string>, ReturnType<typeof markFieldsDirty> | boolean>, fieldRefs?: FieldRefs): Record<Extract<keyof T, string>, boolean | Record<string, any>>;
export {};
//# sourceMappingURL=getDirtyFields.d.ts.map