import type { SeedFixtureDefinition } from './index.js';

/**
 * 10 stable-ID general/environment fixtures — shell-portability and
 * environment-configuration bugs that don't belong to any single language
 * runtime. Every pattern was empirically confirmed against this machine's
 * real Alpine/busybox ash before being written; several assumptions (e.g.
 * that `[[ ]]` fails in ash) turned out wrong on this exact image, so
 * nothing here is guessed.
 */

const ENV = { language: 'general' };
const TEST_COMMAND = 'sh main.sh';
const EXT = 'sh';
const EXEC_TEST_COMMAND = 'cp main.sh /tmp/main.sh && chmod +x /tmp/main.sh && /tmp/main.sh';

export const GENERAL_SEED_FIXTURES: SeedFixtureDefinition[] = [
  {
    id: 'fix_general_array_syntax_in_posix_sh',
    problem: 'A bash-style array declaration used in a script run by POSIX sh raises a syntax error',
    errorType: 'ShellSyntaxError',
    category: 'general',
    environment: ENV,
    testCommand: TEST_COMMAND,
    fileExtension: EXT,
    brokenCode: `items=(apple banana cherry)\necho "\${items[0]}"\n`,
    fixedCode: `items="apple banana cherry"\nfor item in $items; do\n  echo "$item"\n  break\ndone\n`,
  },
  {
    id: 'fix_general_source_missing_file',
    problem: 'Sourcing an environment file that does not exist fails the script',
    errorType: 'ShellSourceError',
    category: 'general',
    environment: ENV,
    testCommand: TEST_COMMAND,
    fileExtension: EXT,
    brokenCode: `. /workspace/nonexistent-env.sh\necho "loaded"\n`,
    fixedCode: `if [ -f /workspace/nonexistent-env.sh ]; then\n  . /workspace/nonexistent-env.sh\nfi\necho "loaded"\n`,
  },
  {
    id: 'fix_general_crlf_line_endings',
    problem: 'A script saved with CRLF line endings corrupts the shebang interpreter path, so it cannot be executed',
    errorType: 'BadInterpreter',
    category: 'general',
    environment: ENV,
    testCommand: EXEC_TEST_COMMAND,
    fileExtension: EXT,
    brokenCode: `#!/bin/sh\r\necho hello\r\n`,
    fixedCode: `#!/bin/sh\necho hello\n`,
  },
  {
    id: 'fix_general_env_case_sensitivity',
    problem: 'Comparing an environment variable value against an expected string without normalizing case rejects a valid value',
    errorType: 'EnvironmentMismatch',
    category: 'general',
    environment: ENV,
    testCommand: TEST_COMMAND,
    fileExtension: EXT,
    brokenCode: `ENVIRONMENT="Production"\nif [ "$ENVIRONMENT" != "production" ]; then\n  echo "not recognized as production, exiting"\n  exit 1\nfi\necho "running in production mode"\n`,
    fixedCode: `ENVIRONMENT="Production"\nNORMALIZED=$(echo "$ENVIRONMENT" | tr '[:upper:]' '[:lower:]')\nif [ "$NORMALIZED" != "production" ]; then\n  echo "not recognized as production, exiting"\n  exit 1\nfi\necho "running in production mode"\n`,
  },
  {
    id: 'fix_general_path_override_breaks_lookup',
    problem: 'Overwriting PATH instead of extending it makes previously-available commands unresolvable',
    errorType: 'CommandNotFound',
    category: 'general',
    environment: ENV,
    testCommand: TEST_COMMAND,
    fileExtension: EXT,
    brokenCode: `PATH=/nonexistent-only\necho "needle" | grep "needle"\n`,
    fixedCode: `PATH="/usr/bin:/bin:$PATH"\necho "needle" | grep "needle"\n`,
  },
  {
    id: 'fix_general_home_relative_path_unset',
    problem: 'Building a path from $HOME without checking it is set reads from the filesystem root instead',
    errorType: 'FileNotFoundError',
    category: 'general',
    environment: ENV,
    testCommand: TEST_COMMAND,
    fileExtension: EXT,
    brokenCode: `unset HOME\ncat "$HOME/.myconfig"\n`,
    fixedCode: `unset HOME\nHOME="\${HOME:-/tmp}"\nmkdir -p "$HOME"\necho "example config" > "$HOME/.myconfig"\ncat "$HOME/.myconfig"\n`,
  },
  {
    id: 'fix_general_bad_shebang_interpreter',
    problem: 'A typo in the shebang interpreter path makes the script unexecutable',
    errorType: 'BadInterpreter',
    category: 'general',
    environment: ENV,
    testCommand: EXEC_TEST_COMMAND,
    fileExtension: EXT,
    brokenCode: `#!/bin/shh\necho hello\n`,
    fixedCode: `#!/bin/sh\necho hello\n`,
  },
  {
    id: 'fix_general_octal_like_shell_arithmetic',
    problem: 'A zero-padded number in shell arithmetic is parsed as invalid octal, raising an arithmetic syntax error',
    errorType: 'ShellArithmeticError',
    category: 'general',
    environment: ENV,
    testCommand: TEST_COMMAND,
    fileExtension: EXT,
    brokenCode: `COUNT="08"\nRESULT=$((COUNT + 1))\necho "$RESULT"\n`,
    fixedCode: `COUNT="08"\nCOUNT=$((10#$COUNT))\nRESULT=$((COUNT + 1))\necho "$RESULT"\n`,
  },
  {
    id: 'fix_general_subshell_pipe_variable_scoping',
    problem: 'Piping into a while-read loop runs it in a subshell, so variables it sets are lost once the pipeline ends',
    errorType: 'VariableScopingError',
    category: 'general',
    environment: ENV,
    testCommand: TEST_COMMAND,
    fileExtension: EXT,
    brokenCode: `COUNT=0\nprintf "a\\nb\\nc\\n" | while read -r line; do\n  COUNT=$((COUNT + 1))\ndone\necho "count=$COUNT"\nif [ "$COUNT" -ne 3 ]; then\n  echo "expected 3, got $COUNT"\n  exit 1\nfi\n`,
    fixedCode: `COUNT=0\nwhile read -r line; do\n  COUNT=$((COUNT + 1))\ndone <<EOF\na\nb\nc\nEOF\necho "count=$COUNT"\nif [ "$COUNT" -ne 3 ]; then\n  echo "expected 3, got $COUNT"\n  exit 1\nfi\n`,
  },
  {
    id: 'fix_general_set_u_unbound_variable',
    problem: 'Running with `set -u` and referencing an unset environment variable aborts the script',
    errorType: 'UnboundVariableError',
    category: 'general',
    environment: ENV,
    testCommand: TEST_COMMAND,
    fileExtension: EXT,
    brokenCode: `set -u\necho "Deploying to: $DEPLOY_TARGET"\n`,
    fixedCode: `set -u\nDEPLOY_TARGET="\${DEPLOY_TARGET:-staging}"\necho "Deploying to: $DEPLOY_TARGET"\n`,
  },
];
