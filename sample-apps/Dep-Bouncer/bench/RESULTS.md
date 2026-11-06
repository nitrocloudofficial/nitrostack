# Benchmark results

5/5 replayed hijacks blocked; 200 popular releases: 199 ALLOW, 1 REVIEW, 0 BLOCK

Generated: 2026-10-17T03:36:24.018Z. Popular checks request the current npm latest tag; resolved versions and per-call timestamps are in results.json.

Replays use labelled reconstructions. Popular packages are a presumed-healthy sample, not independently verified ground truth; REVIEW and BLOCK counts are candidate false positives. Errors are excluded from verdict counts. Durations include any rate-limit wait and retry.

## Replayed hijacks

| ID / package | Version | Verdict | Score | Top 3 findings / error | Duration (ms) |
|---|---|---|---:|---|---:|
| axios | 1.14.1 | BLOCK | 100 | New dependency plain-crypto-js looks like a malware drop; Provenance dropped: previous release 1.14.0 was built and signed by CI, this one was not; Published by the personal account "jasonsaayman" instead of the package's CI (trusted publishing) | 65 |
| keyv | 6.0.0 | BLOCK | 100 | Suspicious exec in release code; Suspicious ai-agent-abuse in release code; Suspicious obfuscation in release code | 101 |
| chalk | 5.6.1 | BLOCK | 100 | Suspicious wallet in release code; Suspicious obfuscation in release code; New publisher "qix" has never released this package before | 7 |
| nx | 21.5.0 | BLOCK | 100 | Suspicious credentials in release code; Suspicious exfil in release code; Suspicious ai-agent-abuse in release code | 22 |
| tinycolor | 4.1.1 | BLOCK | 100 | Suspicious credentials in release code; Suspicious exfil in release code; Suspicious persistence in release code | 80 |

## Non-ALLOW popular releases

| ID / package | Version | Verdict | Score | Top 3 findings / error | Duration (ms) |
|---|---|---|---:|---|---:|
| typescript | 7.0.2 | REVIEW | 45 | New publisher "microsoft1es" has never released this package before; Suspicious exec in release code; Suspicious obfuscation in release code | 11750 |

## ALLOW popular releases

- semver@7.8.5
- minimatch@10.2.6
- debug@4.4.3
- brace-expansion@5.0.12
- lru-cache@11.5.3
- ms@2.1.3
- commander@15.0.0
- strip-ansi@7.2.0
- string-width@8.3.0
- picomatch@4.0.7
- ansi-regex@6.4.0
- supports-color@11.0.0
- chalk@6.0.1
- wrap-ansi@10.0.2
- emoji-regex@11.0.0
- tslib@2.8.1
- balanced-match@5.0.0
- glob@13.0.6
- type-fest@5.10.0
- ajv@8.20.0
- source-map@0.8.0
- which@7.0.0
- react-is@19.3.1
- escape-string-regexp@5.0.0
- readable-stream@4.8.0
- undici-types@8.12.2
- color-name@2.1.1
- zod@4.6.7
- p-limit@7.3.3
- color-convert@3.1.3
- json-schema-traverse@1.0.0
- find-up@8.0.0
- glob-parent@6.0.2
- ignore@7.0.12
- safe-buffer@5.2.1
- yallist@5.0.0
- locate-path@8.0.0
- isexe@4.0.0
- path-key@4.0.0
- p-locate@7.0.0
- has-flag@5.0.1
- iconv-lite@0.7.3
- postcss@8.5.30
- signal-exit@4.1.0
- js-yaml@5.5.0
- mime-db@1.54.0
- ws@8.22.0
- mime-types@3.0.2
- cross-spawn@7.0.6
- https-proxy-agent@9.1.0
- yargs@18.2.0
- nanoid@6.0.2
- is-fullwidth-code-point@5.1.0
- js-tokens@10.0.0
- argparse@3.0.3
- string_decoder@1.3.0
- shebang-command@2.0.0
- isarray@2.0.5
- globals@17.13.0
- acorn@8.19.0
- cliui@9.0.1
- whatwg-url@17.3.0
- content-type@3.1.1
- minipass@7.1.3
- picocolors@1.1.1
- yaml@2.9.1
- resolve-from@5.0.0
- json5@2.2.3
- hasown@2.0.4
- resolve@1.22.13
- path-to-regexp@8.4.2
- path-exists@5.0.0
- cookie@2.0.1
- pretty-format@30.5.1
- estraverse@5.3.0
- convert-source-map@2.0.0
- punycode@2.3.1
- negotiator@1.1.0
- undici@8.12.2
- fast-deep-equal@3.1.3
- function-bind@1.1.2
- chokidar@5.0.0
- get-stream@9.0.1
- strip-json-comments@5.0.3
- graceful-fs@4.2.11
- inherits@2.0.4
- source-map-js@1.2.2
- readdirp@5.1.1
- node-fetch@3.3.2
- eslint-scope@9.1.2
- is-stream@4.0.1
- escalade@3.2.0
- get-intrinsic@1.3.0
- es-errors@1.3.0
- yocto-queue@1.2.2
- @babel/runtime@8.0.7
- statuses@2.0.2
- browserslist@4.29.3
- electron-to-chromium@1.5.458
- vite@8.3.4
- is-glob@4.0.3
- scheduler@0.28.0
- y18n@5.0.8
- jiti@2.7.0
- dotenv@18.0.8
- path-scurry@2.0.2
- @babel/core@8.0.7
- react@19.3.1
- camelcase@10.0.0
- is-extglob@2.1.1
- jsesc@3.1.0
- lightningcss@1.33.0
- side-channel@1.1.1
- baseline-browser-mapping@2.11.29
- ini@7.0.0
- http-errors@2.0.1
- form-data@4.0.6
- react-dom@19.3.1
- is-number@7.0.0
- csstype@3.2.3
- buffer@6.0.3
- object-assign@4.1.1
- object-inspect@1.13.4
- minimist@1.2.8
- universalify@2.0.1
- braces@3.0.3
- espree@11.2.0
- fill-range@7.1.1
- once@1.4.0
- rimraf@6.1.3
- to-regex-range@5.0.1
- micromatch@4.0.8
- wrappy@1.0.2
- lodash@4.18.1
- open@11.0.4
- accepts@1.3.8
- esutils@2.0.3
- base64-js@1.5.1
- is-core-module@2.17.0
- finalhandler@2.1.1
- fast-json-stable-stringify@2.1.0
- encodeurl@2.0.0
- npm-run-path@6.0.0
- eslint@10.13.0
- strip-bom@5.0.0
- mime@4.1.1
- type-is@3.0.0
- content-disposition@3.0.0
- flatted@3.4.4
- eventemitter3@5.0.4
- util-deprecate@1.0.2
- uri-js@4.4.1
- raw-body@4.0.0
- jose@6.2.12
- file-entry-cache@11.1.5
- send@1.2.1
- require-from-string@2.0.2
- http-proxy-agent@9.1.0
- gensync@1.0.0-beta.2
- concat-map@0.0.2
- get-caller-file@2.0.5
- pathe@2.0.3
- serve-static@2.2.1
- enhanced-resolve@5.26.0
- body-parser@2.3.0
- fresh@0.5.2
- levn@0.4.1
- on-finished@2.4.1
- esquery@1.7.0
- ipaddr.js@2.5.0
- express@5.3.0
- ajv-formats@3.0.1
- ci-info@4.4.0
- chai@6.3.0
- path-parse@1.0.7
- bytes@3.1.2
- setprototypeof@1.2.0
- jsonfile@6.2.1
- parent-module@3.2.0
- normalize-path@3.0.0
- fastq@1.20.3
- parse-json@8.3.0
- supports-preserve-symlinks-flag@1.0.0
- make-dir@5.1.0
- range-parser@1.3.0
- word-wrap@1.2.5
- tailwindcss@4.3.3
- strip-final-newline@4.0.0
- slash@5.1.0
- cosmiconfig@10.0.1
- mdn-data@2.37.2
- json-buffer@3.0.1
- toidentifier@1.0.1
- css-tree@3.2.1
- restore-cursor@5.1.0
- cli-cursor@5.0.0
- is-arrayish@0.3.4
- escape-html@1.0.3
- pako@3.0.2
