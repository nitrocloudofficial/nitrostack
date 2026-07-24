/*! THIS FILE IS AUTO-GENERATED */
import { AuthPlus } from 'googleapis-common';
import { gmailpostmastertools_v1 } from './v1';
import { gmailpostmastertools_v1beta1 } from './v1beta1';
import { gmailpostmastertools_v2 } from './v2';
export declare const VERSIONS: {
    v1: typeof gmailpostmastertools_v1.Gmailpostmastertools;
    v1beta1: typeof gmailpostmastertools_v1beta1.Gmailpostmastertools;
    v2: typeof gmailpostmastertools_v2.Gmailpostmastertools;
};
export declare function gmailpostmastertools(version: 'v1'): gmailpostmastertools_v1.Gmailpostmastertools;
export declare function gmailpostmastertools(options: gmailpostmastertools_v1.Options): gmailpostmastertools_v1.Gmailpostmastertools;
export declare function gmailpostmastertools(version: 'v1beta1'): gmailpostmastertools_v1beta1.Gmailpostmastertools;
export declare function gmailpostmastertools(options: gmailpostmastertools_v1beta1.Options): gmailpostmastertools_v1beta1.Gmailpostmastertools;
export declare function gmailpostmastertools(version: 'v2'): gmailpostmastertools_v2.Gmailpostmastertools;
export declare function gmailpostmastertools(options: gmailpostmastertools_v2.Options): gmailpostmastertools_v2.Gmailpostmastertools;
declare const auth: AuthPlus;
export { auth };
export { gmailpostmastertools_v1 };
export { gmailpostmastertools_v1beta1 };
export { gmailpostmastertools_v2 };
export { AuthPlus, GlobalOptions, APIRequestContext, GoogleConfigurable, StreamMethodOptions, MethodOptions, BodyResponseCallback, } from 'googleapis-common';
