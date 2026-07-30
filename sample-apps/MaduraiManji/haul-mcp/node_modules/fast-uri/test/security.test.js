'use strict'

const test = require('tape')
const fastURI = require('..')

test('parse marks malformed authority and port inputs as errors', (t) => {
  const malformedCases = [
    {
      input: 'http://[::1]foo',
      expectedError: 'URI path must start with "/" when authority is present.'
    },
    {
      input: 'http://[::1]:80abc/path',
      expectedError: 'URI path must start with "/" when authority is present.'
    },
    {
      input: 'http://example.com:80abc/path',
      expectedError: 'URI path must start with "/" when authority is present.'
    },
    {
      input: 'http://[::1]:65536',
      expectedError: 'URI port is malformed.'
    }
  ]

  t.plan(malformedCases.length)

  malformedCases.forEach(({ input, expectedError }) => {
    t.equal(fastURI.parse(input).error, expectedError, input)
  })
})

test('normalize does not canonicalize malformed URLs into different valid URLs', (t) => {
  const malformedCases = [
    'http://[::1]foo',
    'http://[::1]:80abc/path',
    'http://example.com:80abc/path',
    'http://[::1]:65536'
  ]

  t.plan(malformedCases.length)

  malformedCases.forEach((input) => {
    t.equal(fastURI.normalize(input), input, input)
  })
})

test('equal returns false when either side is malformed', (t) => {
  const malformedPairs = [
    ['http://[::1]foo', 'http://[::1]/foo'],
    ['http://[::1]:80abc/path', 'http://[::1]/abc/path'],
    ['http://example.com:80abc/path', 'http://example.com/abc/path'],
    ['http://[::1]:65536', 'http://[::1]:65536/']
  ]

  t.plan(malformedPairs.length)

  malformedPairs.forEach(([left, right]) => {
    t.equal(fastURI.equal(left, right), false, `${left} != ${right}`)
  })
})

test('normalize preserves encoded authority delimiters in host', (t) => {
  const cases = [
    ['http://trusted.com%40evil.com/', 'http://trusted.com%40evil.com/'],
    ['http://example.com%3A8080/', 'http://example.com%3A8080/'],
    ['http://example.com%2Fevil.com/path', 'http://example.com%2Fevil.com/path'],
    ['http://example.com%23fragment/path', 'http://example.com%23fragment/path'],
    ['http://example.com%3Fq=evil/path', 'http://example.com%3Fq=evil/path'],
    ['http://user%3Apass%40evil.com/', 'http://user%3Apass%40evil.com/'],
    ['http://user@trusted.com%40evil.com/', 'http://user@trusted.com%40evil.com/'],
    ['https://trusted.com%40evil.com/', 'https://trusted.com%40evil.com/'],
    ['ws://trusted.com%40evil.com/chat', 'ws://trusted.com%40evil.com/chat'],
    ['wss://trusted.com%40evil.com/chat', 'wss://trusted.com%40evil.com/chat']
  ]

  t.plan(cases.length)

  cases.forEach(([input, expected]) => {
    t.equal(fastURI.normalize(input), expected, input)
  })
})

test('parse preserves encoded authority delimiters in host', (t) => {
  const cases = [
    ['http://trusted.com%40evil.com/', 'trusted.com%40evil.com'],
    ['http://example.com%3A8080/', 'example.com%3A8080'],
    ['http://user%3Apass%40evil.com/', 'user%3Apass%40evil.com']
  ]

  t.plan(cases.length)

  cases.forEach(([input, expectedHost]) => {
    t.equal(fastURI.parse(input).host, expectedHost, input)
  })
})

test('equal returns false when encoded delimiters differ from live delimiters', (t) => {
  const pairs = [
    ['http://trusted.com%40evil.com/', 'http://trusted.com@evil.com/'],
    ['http://example.com%3A8080/', 'http://example.com:8080/']
  ]

  t.plan(pairs.length)

  pairs.forEach(([left, right]) => {
    t.equal(fastURI.equal(left, right, {}), false, `${left} != ${right}`)
  })
})

test('resolve preserves encoded authority delimiters', (t) => {
  const result = fastURI.resolve('http://base.com/', '//trusted.com%40evil.com/path')
  const parsed = fastURI.parse(result)

  t.plan(1)
  t.notEqual(parsed.host, 'evil.com', '//trusted.com%40evil.com/path')
})

test('serialize escapes authority delimiters in host field', (t) => {
  const result = fastURI.serialize({ scheme: 'http', host: 'trusted.com@evil.com', path: '/' })
  const parsed = fastURI.parse(result)

  t.plan(1)
  t.notEqual(parsed.host, 'evil.com', 'host: trusted.com@evil.com')
})

test('normalize does not double-decode %2540 into a live @', (t) => {
  const result = fastURI.normalize('http://trusted.com%2540evil.com/')
  const parsed = fastURI.parse(result)

  t.plan(1)
  t.notEqual(parsed.host, 'trusted.com@evil.com', 'http://trusted.com%2540evil.com/')
})

test('parse canonicalises IDN / Unicode hosts to their ASCII form', (t) => {
  const cases = [
    {
      input: 'http://127。0。0。1/',
      expectedHost: '127.0.0.1',
      description: 'full-width ideographic stops as octet separators'
    },
    {
      input: 'http://ｅxample.com/',
      expectedHost: 'example.com',
      description: 'fullwidth e as first letter'
    },
    {
      input: 'http://納豆.example.org/',
      expectedHost: 'xn--99zt52a.example.org',
      description: 'CJK label requiring punycode'
    }
  ]

  t.plan(cases.length * 2)

  cases.forEach(({ input, expectedHost, description }) => {
    const parsed = fastURI.parse(input)
    t.notOk(parsed.error, `parse should not set error: ${description}`)
    t.equal(parsed.host, expectedHost, `host canonicalised to ASCII: ${description}`)
  })
})

test('parse rejects a literal backslash in the authority as malformed (RFC 3986)', (t) => {
  // Regression for the host-confusion bypass: a literal "\" is invalid RFC 3986
  // syntax and must be flagged malformed, not silently rewritten. Otherwise "\"
  // acts as a host delimiter here while Node's native URL parses a different
  // host, defeating a host-based SSRF/redirect/origin allowlist.
  const cases = [
    'http://evil.com\\@allowed.com',
    'https://169.254.169.254\\@trusted.example.com',
    'http://127.0.0.1\\@public.example.com',
    'https://attacker.com\\@api.internal',
    'http://a\\@b',
    'ws://evil.com\\@allowed.com/chat',
    'wss://evil.com\\@allowed.com/chat',
    'http://evil.com\\%40allowed.com',
    '//evil.com\\@allowed.com'
  ]

  t.plan(cases.length)

  cases.forEach((input) => {
    t.equal(
      fastURI.parse(input).error,
      'URI authority must not contain a literal backslash.',
      input
    )
  })
})

test('normalize does not canonicalize a literal-backslash URI into a different valid URL', (t) => {
  const cases = [
    'http://evil.com\\@allowed.com',
    'https://attacker.com\\@api.internal'
  ]

  t.plan(cases.length)

  cases.forEach((input) => {
    t.equal(fastURI.normalize(input), input, input)
  })
})

test('parse leaves percent-encoded %5C untouched as encoded data (not rejected)', (t) => {
  // Only the literal "\" byte is rejected; %5C stays valid encoded data and
  // does not diverge from the native URL parser, so it must not be flagged.
  const input = 'http://evil.com%5C@allowed.com'
  const parsed = fastURI.parse(input)

  t.plan(2)
  t.notOk(parsed.error, '%5C is valid encoded data, not malformed')
  t.equal(parsed.host, new URL(input).hostname, '%5C host matches native URL (no divergence)')
})

test('parse does not reject a literal backslash in the query or fragment', (t) => {
  // The rejection is scoped to the authority/path (the host-confusion surface);
  // a backslash after "?"/"#" is normalized as encoded data as before.
  const parsed = fastURI.parse('http://host.example.com/?x=\\y#z\\w')

  t.plan(2)
  t.notOk(parsed.error, 'backslash in query/fragment does not mark the URI malformed')
  t.equal(parsed.host, 'host.example.com', 'host parsed normally')
})
