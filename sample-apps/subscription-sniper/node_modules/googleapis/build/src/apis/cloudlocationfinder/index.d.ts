/*! THIS FILE IS AUTO-GENERATED */
import { AuthPlus } from 'googleapis-common';
import { cloudlocationfinder_v1 } from './v1';
import { cloudlocationfinder_v1alpha } from './v1alpha';
export declare const VERSIONS: {
    v1: typeof cloudlocationfinder_v1.Cloudlocationfinder;
    v1alpha: typeof cloudlocationfinder_v1alpha.Cloudlocationfinder;
};
export declare function cloudlocationfinder(version: 'v1'): cloudlocationfinder_v1.Cloudlocationfinder;
export declare function cloudlocationfinder(options: cloudlocationfinder_v1.Options): cloudlocationfinder_v1.Cloudlocationfinder;
export declare function cloudlocationfinder(version: 'v1alpha'): cloudlocationfinder_v1alpha.Cloudlocationfinder;
export declare function cloudlocationfinder(options: cloudlocationfinder_v1alpha.Options): cloudlocationfinder_v1alpha.Cloudlocationfinder;
declare const auth: AuthPlus;
export { auth };
export { cloudlocationfinder_v1 };
export { cloudlocationfinder_v1alpha };
export { AuthPlus, GlobalOptions, APIRequestContext, GoogleConfigurable, StreamMethodOptions, MethodOptions, BodyResponseCallback, } from 'googleapis-common';
