/*! THIS FILE IS AUTO-GENERATED */
import { AuthPlus } from 'googleapis-common';
import { saasservicemgmt_v1 } from './v1';
import { saasservicemgmt_v1beta1 } from './v1beta1';
export declare const VERSIONS: {
    v1: typeof saasservicemgmt_v1.Saasservicemgmt;
    v1beta1: typeof saasservicemgmt_v1beta1.Saasservicemgmt;
};
export declare function saasservicemgmt(version: 'v1'): saasservicemgmt_v1.Saasservicemgmt;
export declare function saasservicemgmt(options: saasservicemgmt_v1.Options): saasservicemgmt_v1.Saasservicemgmt;
export declare function saasservicemgmt(version: 'v1beta1'): saasservicemgmt_v1beta1.Saasservicemgmt;
export declare function saasservicemgmt(options: saasservicemgmt_v1beta1.Options): saasservicemgmt_v1beta1.Saasservicemgmt;
declare const auth: AuthPlus;
export { auth };
export { saasservicemgmt_v1 };
export { saasservicemgmt_v1beta1 };
export { AuthPlus, GlobalOptions, APIRequestContext, GoogleConfigurable, StreamMethodOptions, MethodOptions, BodyResponseCallback, } from 'googleapis-common';
