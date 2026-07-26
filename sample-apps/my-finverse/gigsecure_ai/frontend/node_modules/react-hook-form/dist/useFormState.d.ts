import type { FieldValues, UseFormStateProps, UseFormStateReturn } from './types';
/**
 * Subscribes to each form state and isolates re-renders at the custom hook level. It has its own scope for form state subscriptions, so it will not affect other useFormState or useForm instances. Using this hook can reduce the re-render impact on large and complex form applications.
 *
 * @remarks
 * [API](https://react-hook-form.com/docs/useformstate) • [Demo](https://codesandbox.io/s/useformstate-75xly)
 *
 * @param props - Include options to specify fields to subscribe to. {@link UseFormStateReturn}
 *
 * @example
 * ```tsx
 * function App() {
 *   const { register, handleSubmit, control } = useForm({
 *     defaultValues: {
 *     firstName: "firstName"
 *   }});
 *   const { dirtyFields } = useFormState({
 *     control
 *   });
 *   const onSubmit = (data) => console.log(data);
 *
 *   return (
 *     <form onSubmit={handleSubmit(onSubmit)}>
 *       <input {...register("firstName")} placeholder="First Name" />
 *       {dirtyFields.firstName && <p>Field is dirty.</p>}
 *       <input type="submit" />
 *     </form>
 *   );
 * }
 * ```
 */
export declare function useFormState<TFieldValues extends FieldValues = FieldValues, TTransformedValues = TFieldValues>(props?: UseFormStateProps<TFieldValues, TTransformedValues>): UseFormStateReturn<TFieldValues>;
//# sourceMappingURL=useFormState.d.ts.map