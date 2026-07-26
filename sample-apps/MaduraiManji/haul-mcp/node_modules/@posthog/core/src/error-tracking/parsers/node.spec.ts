import { nodeStackLineParser } from './node'

describe('nodeStackLineParser', () => {
  it.each([
    ['at async Promise.all (index 3)', 'Promise.all'],
    ['at async Promise.all (index 472)', 'Promise.all'],
    ['at async Promise.any (index 11)', 'Promise.any'],
  ])('canonicalizes the V8 Promise index in %s', (line, functionName) => {
    expect(nodeStackLineParser(line, 'node:javascript')).toEqual({
      filename: 'node:internal/promise',
      module: undefined,
      function: functionName,
      lineno: undefined,
      colno: undefined,
      in_app: false,
      platform: 'node:javascript',
    })
  })
})
