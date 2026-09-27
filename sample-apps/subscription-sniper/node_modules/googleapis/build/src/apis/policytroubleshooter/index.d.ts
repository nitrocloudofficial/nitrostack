/*! THIS FILE IS AUTO-GENERATED */
import { AuthPlus } from 'googleapis-common';
import { policytroubleshooter_v1 } from './v1';
import { policytroubleshooter_v1beta } from './v1beta';
import { policytroubleshooter_v3 } from './v3';
import { policytroubleshooter_v3beta } from './v3beta';
export declare const VERSIONS: {
    v1: typeof policytroubleshooter_v1.Policytroubleshooter;
    v1beta: typeof policytroubleshooter_v1beta.Policytroubleshooter;
    v3: typeof policytroubleshooter_v3.Policytroubleshooter;
    v3beta: typeof policytroubleshooter_v3beta.Policytroubleshooter;
};
export declare function policytroubleshooter(version: 'v1'): policytroubleshooter_v1.Policytroubleshooter;
export declare function policytroubleshooter(options: policytroubleshooter_v1.Options): policytroubleshooter_v1.Policytroubleshooter;
export declare function policytroubleshooter(version: 'v1beta'): policytroubleshooter_v1beta.Policytroubleshooter;
export declare function policytroubleshooter(options: policytroubleshooter_v1beta.Options): policytroubleshooter_v1beta.Policytroubleshooter;
export declare function policytroubleshooter(version: 'v3'): policytroubleshooter_v3.Policytroubleshooter;
export declare function policytroubleshooter(options: policytroubleshooter_v3.Options): policytroubleshooter_v3.Policytroubleshooter;
export declare function policytroubleshooter(version: 'v3beta'): policytroubleshooter_v3beta.Policytroubleshooter;
export declare function policytroubleshooter(options: policytroubleshooter_v3beta.Options): policytroubleshooter_v3beta.Policytroubleshooter;
declare const auth: AuthPlus;
export { auth };
export { policytroubleshooter_v1 };
export { policytroubleshooter_v1beta };
export { policytroubleshooter_v3 };
export { policytroubleshooter_v3beta };
export { AuthPlus, GlobalOptions, APIRequestContext, GoogleConfigurable, StreamMethodOptions, MethodOptions, BodyResponseCallback, } from 'googleapis-common';
