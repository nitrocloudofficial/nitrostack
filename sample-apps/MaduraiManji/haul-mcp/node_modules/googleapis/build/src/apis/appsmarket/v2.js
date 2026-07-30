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
exports.appsmarket_v2 = void 0;
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-empty-interface */
/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable no-irregular-whitespace */
const googleapis_common_1 = require("googleapis-common");
var appsmarket_v2;
(function (appsmarket_v2) {
    /**
     * Google Workspace Marketplace API
     *
     * Lets your Google Workspace Marketplace applications integrate with Google&#39;s installtion and licensing services.
     *
     * @example
     * ```js
     * const {google} = require('googleapis');
     * const appsmarket = google.appsmarket('v2');
     * ```
     */
    class Appsmarket {
        context;
        customerLicense;
        userLicense;
        constructor(options, google) {
            this.context = {
                _options: options || {},
                google,
            };
            this.customerLicense = new Resource$Customerlicense(this.context);
            this.userLicense = new Resource$Userlicense(this.context);
        }
    }
    appsmarket_v2.Appsmarket = Appsmarket;
    class Resource$Customerlicense {
        context;
        constructor(context) {
            this.context = context;
        }
        get(paramsOrCallback, optionsOrCallback, callback) {
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
            const rootUrl = options.rootUrl || 'https://appsmarket.googleapis.com/';
            const parameters = {
                options: Object.assign({
                    url: (rootUrl +
                        '/appsmarket/v2/customerLicense/{applicationId}/{customerId}').replace(/([^:]\/)\/+/g, '$1'),
                    method: 'GET',
                    apiVersion: '',
                }, options),
                params,
                requiredParams: ['applicationId', 'customerId'],
                pathParams: ['applicationId', 'customerId'],
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
    appsmarket_v2.Resource$Customerlicense = Resource$Customerlicense;
    class Resource$Userlicense {
        context;
        constructor(context) {
            this.context = context;
        }
        get(paramsOrCallback, optionsOrCallback, callback) {
            let params = (paramsOrCallback || {});
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
            const rootUrl = options.rootUrl || 'https://appsmarket.googleapis.com/';
            const parameters = {
                options: Object.assign({
                    url: (rootUrl + '/appsmarket/v2/userLicense/{applicationId}/{userId}').replace(/([^:]\/)\/+/g, '$1'),
                    method: 'GET',
                    apiVersion: '',
                }, options),
                params,
                requiredParams: ['applicationId', 'userId'],
                pathParams: ['applicationId', 'userId'],
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
    appsmarket_v2.Resource$Userlicense = Resource$Userlicense;
})(appsmarket_v2 || (exports.appsmarket_v2 = appsmarket_v2 = {}));
