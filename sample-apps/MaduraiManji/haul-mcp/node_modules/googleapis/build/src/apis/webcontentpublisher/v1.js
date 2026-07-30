"use strict";
// Copyright 2020 Google LLC
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.webcontentpublisher_v1 = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-empty-interface */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable no-irregular-whitespace */
const googleapis_common_1 = require("googleapis-common");
var webcontentpublisher_v1;
(function (webcontentpublisher_v1) {
    /**
     * Web Content Publisher API
     *
     * webcontentpublisher.googleapis.com API, a service for web content publishers.
     *
     * @example
     * ```js
     * const {google} = require('googleapis');
     * const webcontentpublisher = google.webcontentpublisher('v1');
     * ```
     */
    class Webcontentpublisher {
        context;
        publications;
        constructor(options, google) {
            this.context = {
                _options: options || {},
                google,
            };
            this.publications = new Resource$Publications(this.context);
        }
    }
    webcontentpublisher_v1.Webcontentpublisher = Webcontentpublisher;
    class Resource$Publications {
        context;
        constructor(context) {
            this.context = context;
        }
        checkFreeAccess(paramsOrCallback, optionsOrCallback, callback) {
            let params = (paramsOrCallback ||
                {});
            let options = (optionsOrCallback || {});
            if (typeof paramsOrCallback === 'function') {
                callback = paramsOrCallback;
                params = {};
                options = {};
            }
            if (typeof optionsOrCallback === 'function') {
                callback = optionsOrCallback;
                options = {};
            }
            const rootUrl = options.rootUrl || 'https://webcontentpublisher.googleapis.com/';
            const parameters = {
                options: Object.assign({
                    url: (rootUrl + '/v1/{+name}:checkFreeAccess').replace(/([^:]\/)\/+/g, '$1'),
                    method: 'GET',
                    apiVersion: '',
                }, options),
                params,
                requiredParams: ['name'],
                pathParams: ['name'],
                context: this.context,
            };
            if (callback) {
                (0, googleapis_common_1.createAPIRequest)(parameters, callback);
            }
            else {
                return (0, googleapis_common_1.createAPIRequest)(parameters);
            }
        }
    }
    webcontentpublisher_v1.Resource$Publications = Resource$Publications;
})(webcontentpublisher_v1 || (exports.webcontentpublisher_v1 = webcontentpublisher_v1 = {}));
