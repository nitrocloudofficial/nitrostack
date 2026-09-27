/*! THIS FILE IS AUTO-GENERATED */
import { AuthPlus } from 'googleapis-common';
import { chromewebstore_v1_1 } from './v1.1';
import { chromewebstore_v2 } from './v2';
export declare const VERSIONS: {
    'v1.1': typeof chromewebstore_v1_1.Chromewebstore;
    v2: typeof chromewebstore_v2.Chromewebstore;
};
export declare function chromewebstore(version: 'v1.1'): chromewebstore_v1_1.Chromewebstore;
export declare function chromewebstore(options: chromewebstore_v1_1.Options): chromewebstore_v1_1.Chromewebstore;
export declare function chromewebstore(version: 'v2'): chromewebstore_v2.Chromewebstore;
export declare function chromewebstore(options: chromewebstore_v2.Options): chromewebstore_v2.Chromewebstore;
declare const auth: AuthPlus;
export { auth };
export { chromewebstore_v1_1 };
export { chromewebstore_v2 };
export { AuthPlus, GlobalOptions, APIRequestContext, GoogleConfigurable, StreamMethodOptions, MethodOptions, BodyResponseCallback, } from 'googleapis-common';
