/*! THIS FILE IS AUTO-GENERATED */
import { AuthPlus } from 'googleapis-common';
import { health_v4 } from './v4';
export declare const VERSIONS: {
    v4: typeof health_v4.Health;
};
export declare function health(version: 'v4'): health_v4.Health;
export declare function health(options: health_v4.Options): health_v4.Health;
declare const auth: AuthPlus;
export { auth };
export { health_v4 };
export { AuthPlus, GlobalOptions, APIRequestContext, GoogleConfigurable, StreamMethodOptions, MethodOptions, BodyResponseCallback, } from 'googleapis-common';
