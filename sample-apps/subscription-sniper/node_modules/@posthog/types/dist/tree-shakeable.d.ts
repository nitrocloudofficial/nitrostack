/**
 * Augmented by the slim bundle entry point to mark tree-shakeable extensions
 * as optional. Empty by default (full bundle), meaning extensions are guaranteed.
 */
export interface TreeShakeableConfig {
}
/**
 * For the full bundle (default), resolves to T (extensions guaranteed present).
 * For the slim bundle (augmented with { optional: true }), resolves to T | undefined.
 */
export type TreeShakeable<T> = 'optional' extends keyof TreeShakeableConfig ? T | undefined : T;
//# sourceMappingURL=tree-shakeable.d.ts.map