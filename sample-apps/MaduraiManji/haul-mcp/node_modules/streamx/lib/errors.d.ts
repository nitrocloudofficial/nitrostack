declare class StreamError extends Error {
  readonly code: string

  static isStreamDestroyed(err: Error | null): boolean
  static isPrematureClose(err: Error | null): boolean
  static isAborted(err: Error | null): boolean

  static STREAM_DESTROYED(): StreamError
  static PREMATURE_CLOSE(): StreamError
  static ABORTED(): StreamError
}

export = StreamError
