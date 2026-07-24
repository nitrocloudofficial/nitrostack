/*! THIS FILE IS AUTO-GENERATED */
import { AuthPlus } from 'googleapis-common';
import { developerknowledge_v1 } from './v1';
import { developerknowledge_v1alpha } from './v1alpha';
export declare const VERSIONS: {
    v1: typeof developerknowledge_v1.Developerknowledge;
    v1alpha: typeof developerknowledge_v1alpha.Developerknowledge;
};
export declare function developerknowledge(version: 'v1'): developerknowledge_v1.Developerknowledge;
export declare function developerknowledge(options: developerknowledge_v1.Options): developerknowledge_v1.Developerknowledge;
export declare function developerknowledge(version: 'v1alpha'): developerknowledge_v1alpha.Developerknowledge;
export declare function developerknowledge(options: developerknowledge_v1alpha.Options): developerknowledge_v1alpha.Developerknowledge;
declare const auth: AuthPlus;
export { auth };
export { developerknowledge_v1 };
export { developerknowledge_v1alpha };
export { AuthPlus, GlobalOptions, APIRequestContext, GoogleConfigurable, StreamMethodOptions, MethodOptions, BodyResponseCallback, } from 'googleapis-common';
