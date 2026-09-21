/*! THIS FILE IS AUTO-GENERATED */
import { AuthPlus } from 'googleapis-common';
import { ces_v1 } from './v1';
import { ces_v1beta } from './v1beta';
export declare const VERSIONS: {
    v1: typeof ces_v1.Ces;
    v1beta: typeof ces_v1beta.Ces;
};
export declare function ces(version: 'v1'): ces_v1.Ces;
export declare function ces(options: ces_v1.Options): ces_v1.Ces;
export declare function ces(version: 'v1beta'): ces_v1beta.Ces;
export declare function ces(options: ces_v1beta.Options): ces_v1beta.Ces;
declare const auth: AuthPlus;
export { auth };
export { ces_v1 };
export { ces_v1beta };
export { AuthPlus, GlobalOptions, APIRequestContext, GoogleConfigurable, StreamMethodOptions, MethodOptions, BodyResponseCallback, } from 'googleapis-common';
