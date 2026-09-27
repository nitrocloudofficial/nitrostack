/*! THIS FILE IS AUTO-GENERATED */
import { AuthPlus } from 'googleapis-common';
import { dataform_v1 } from './v1';
import { dataform_v1beta1 } from './v1beta1';
export declare const VERSIONS: {
    v1: typeof dataform_v1.Dataform;
    v1beta1: typeof dataform_v1beta1.Dataform;
};
export declare function dataform(version: 'v1'): dataform_v1.Dataform;
export declare function dataform(options: dataform_v1.Options): dataform_v1.Dataform;
export declare function dataform(version: 'v1beta1'): dataform_v1beta1.Dataform;
export declare function dataform(options: dataform_v1beta1.Options): dataform_v1beta1.Dataform;
declare const auth: AuthPlus;
export { auth };
export { dataform_v1 };
export { dataform_v1beta1 };
export { AuthPlus, GlobalOptions, APIRequestContext, GoogleConfigurable, StreamMethodOptions, MethodOptions, BodyResponseCallback, } from 'googleapis-common';
