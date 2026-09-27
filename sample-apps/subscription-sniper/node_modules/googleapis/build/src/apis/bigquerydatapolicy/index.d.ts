/*! THIS FILE IS AUTO-GENERATED */
import { AuthPlus } from 'googleapis-common';
import { bigquerydatapolicy_v1 } from './v1';
import { bigquerydatapolicy_v2 } from './v2';
export declare const VERSIONS: {
    v1: typeof bigquerydatapolicy_v1.Bigquerydatapolicy;
    v2: typeof bigquerydatapolicy_v2.Bigquerydatapolicy;
};
export declare function bigquerydatapolicy(version: 'v1'): bigquerydatapolicy_v1.Bigquerydatapolicy;
export declare function bigquerydatapolicy(options: bigquerydatapolicy_v1.Options): bigquerydatapolicy_v1.Bigquerydatapolicy;
export declare function bigquerydatapolicy(version: 'v2'): bigquerydatapolicy_v2.Bigquerydatapolicy;
export declare function bigquerydatapolicy(options: bigquerydatapolicy_v2.Options): bigquerydatapolicy_v2.Bigquerydatapolicy;
declare const auth: AuthPlus;
export { auth };
export { bigquerydatapolicy_v1 };
export { bigquerydatapolicy_v2 };
export { AuthPlus, GlobalOptions, APIRequestContext, GoogleConfigurable, StreamMethodOptions, MethodOptions, BodyResponseCallback, } from 'googleapis-common';
