/*! THIS FILE IS AUTO-GENERATED */
import { AuthPlus } from 'googleapis-common';
import { authorizedbuyersmarketplace_v1 } from './v1';
import { authorizedbuyersmarketplace_v1alpha } from './v1alpha';
import { authorizedbuyersmarketplace_v1beta } from './v1beta';
export declare const VERSIONS: {
    v1: typeof authorizedbuyersmarketplace_v1.Authorizedbuyersmarketplace;
    v1alpha: typeof authorizedbuyersmarketplace_v1alpha.Authorizedbuyersmarketplace;
    v1beta: typeof authorizedbuyersmarketplace_v1beta.Authorizedbuyersmarketplace;
};
export declare function authorizedbuyersmarketplace(version: 'v1'): authorizedbuyersmarketplace_v1.Authorizedbuyersmarketplace;
export declare function authorizedbuyersmarketplace(options: authorizedbuyersmarketplace_v1.Options): authorizedbuyersmarketplace_v1.Authorizedbuyersmarketplace;
export declare function authorizedbuyersmarketplace(version: 'v1alpha'): authorizedbuyersmarketplace_v1alpha.Authorizedbuyersmarketplace;
export declare function authorizedbuyersmarketplace(options: authorizedbuyersmarketplace_v1alpha.Options): authorizedbuyersmarketplace_v1alpha.Authorizedbuyersmarketplace;
export declare function authorizedbuyersmarketplace(version: 'v1beta'): authorizedbuyersmarketplace_v1beta.Authorizedbuyersmarketplace;
export declare function authorizedbuyersmarketplace(options: authorizedbuyersmarketplace_v1beta.Options): authorizedbuyersmarketplace_v1beta.Authorizedbuyersmarketplace;
declare const auth: AuthPlus;
export { auth };
export { authorizedbuyersmarketplace_v1 };
export { authorizedbuyersmarketplace_v1alpha };
export { authorizedbuyersmarketplace_v1beta };
export { AuthPlus, GlobalOptions, APIRequestContext, GoogleConfigurable, StreamMethodOptions, MethodOptions, BodyResponseCallback, } from 'googleapis-common';
