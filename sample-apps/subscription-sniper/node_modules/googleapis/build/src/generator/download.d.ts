import * as gapi from 'googleapis-common';
export type Schema = {
    [index: string]: {};
};
export declare const DISCOVERY_URL = "https://raw.githubusercontent.com/googleapis/discovery-artifact-manager/master/discoveries";
export interface Change {
    action: 'ADDED' | 'DELETED' | 'CHANGED';
    keyName: string;
}
export interface ChangeSet {
    changes: Change[];
    api: gapi.Schema;
}
export interface DownloadOptions {
    includePrivate?: boolean;
    discoveryUrl: string;
    downloadPath: string;
}
export declare const gfs: {
    mkdir: (dir: string) => Promise<any>;
    writeFile: (path: string, obj: {}) => void;
    readFile: (path: string) => string;
};
/**
 * Download all discovery documents into the /discovery directory.
 * @param options
 */
export declare function downloadDiscoveryDocs(options: DownloadOptions): Promise<ChangeSet[]>;
/**
 * Checks that a discovery doc file name is in the expected format of
 * [NAME(alphanumeric)]-[VERSION(alphanumeric, _, .)].json.
 * Throws an error if the file name is not in the expected format.
 * @param fileName The file name to validate
 */
export declare function validateDiscoveryDocFileName(fileName: string): void;
export interface ApiData {
    name: string;
    version: string;
}
/**
 * Parses a discovery doc file name and returns the API name and version.
 * @param fileName The file name to parse.
 * @returns The API data (name and version).
 */
export declare function getApiData(fileName: string): ApiData;
/**
 * Determine if any of the changes in the discovery docs were interesting
 * @param newDoc New downloaded schema
 * @param oldDoc The existing schema from disk
 */
export declare function shouldUpdate(newDoc: {}, oldDoc: {}): boolean;
/**
 * Given an arbitrary object, recursively sort the properties on the object
 * by the name of the key.  For example:
 * {
 *   b: 1,
 *   a: 2
 * }
 * becomes....
 * {
 *   a: 2,
 *   b: 1
 * }
 * @param obj Object to be sorted
 * @returns object with sorted keys
 */
export declare function sortKeys(obj: Schema): Schema;
/**
 * Get a diff between the two
 */
export declare function getDiffs(oldDoc: Schema, newDoc: Schema): Change[];
/**
 * Given a complex nested object, flatten the key paths so this:
 * {
 *   a: {
 *     b: 2
 *   },
 *   c: 3
 * }
 * becomes ...
 * {
 *   'a.b': 2
 *   c: 3
 * }
 */
export declare function flattenObject(doc: Schema, flat?: Schema, prefix?: string): Schema;
