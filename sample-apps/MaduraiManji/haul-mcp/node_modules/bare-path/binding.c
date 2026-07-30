#include <assert.h>
#include <bare.h>
#include <js.h>
#include <stddef.h>
#include <utf.h>
#include <uv.h>

static js_value_t *
bare_path_cwd(js_env_t *env, js_callback_info_t *info) {
  int err;

  size_t argc = 1;
  js_value_t *argv[1];

  err = js_get_callback_info(env, info, &argc, argv, NULL, NULL);
  assert(err == 0);

  // An optional drive specifier, such as "C:", requests the current working
  // directory of that specific drive rather than of the process. On Windows
  // this is stored in the magic "=C:" environment variable. The variable name
  // is constructed here from a validated drive letter so that only these
  // per-drive current-directory variables can ever be read, never arbitrary
  // environment variables.
  if (argc >= 1) {
    utf8_t device[8];
    size_t device_len;

    err = js_get_value_string_utf8(env, argv[0], device, sizeof(device), &device_len);

    if (
      err == 0 &&
      device_len == 2 &&
      device[1] == ':' &&
      ((device[0] >= 'A' && device[0] <= 'Z') || (device[0] >= 'a' && device[0] <= 'z'))
    ) {
      char name[4] = {'=', (char) device[0], ':', '\0'};

      char value[4096];
      size_t value_len = sizeof(value);

      err = uv_os_getenv(name, value, &value_len);

      // Fall through to the process working directory when the variable is
      // unset or otherwise cannot be read.
      if (err == 0) {
        js_value_t *result;
        err = js_create_string_utf8(env, (utf8_t *) value, value_len, &result);
        assert(err == 0);

        return result;
      }
    }
  }

  char cwd[4096];
  size_t cwd_len = sizeof(cwd);

  err = uv_cwd(cwd, &cwd_len);

  if (err < 0) {
    err = js_throw_error(env, uv_err_name(err), uv_strerror(err));
    assert(err == 0);

    return NULL;
  }

  js_value_t *result;
  err = js_create_string_utf8(env, (utf8_t *) cwd, cwd_len, &result);
  assert(err == 0);

  return result;
}

static js_value_t *
bare_path_exports(js_env_t *env, js_value_t *exports) {
  int err;

#define V(name, fn) \
  { \
    js_value_t *val; \
    err = js_create_function(env, name, -1, fn, NULL, &val); \
    assert(err == 0); \
    err = js_set_named_property(env, exports, name, val); \
    assert(err == 0); \
  }

  V("cwd", bare_path_cwd)
#undef V

  return exports;
}

BARE_MODULE(bare_path, bare_path_exports)
