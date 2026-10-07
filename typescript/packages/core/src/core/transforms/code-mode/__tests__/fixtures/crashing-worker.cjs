// Fixture: a sandbox worker that fails on every start, used to verify the pool
// stops respawning instead of spinning. Deliberately not a valid worker.
throw new Error('crashing-worker fixture: failed to initialize');
