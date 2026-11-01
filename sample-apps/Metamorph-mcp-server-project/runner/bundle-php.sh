#!/bin/sh
# Build-time helper (runs inside a php:<ver>-cli stage, never in the final image).
# Packs the stage's php CLI binary, its extensions and every shared library they need (except glibc) into
# /bundle/<ver>, relocatable: RUNPATH is set to $ORIGIN so the bundle runs on the final image without LD_LIBRARY_PATH.
# Usage: bundle-php.sh <ver>
set -eu
V="$1"
D="/bundle/$V"
mkdir -p "$D/bin" "$D/lib" "$D/ext"

cp -L /usr/local/bin/php "$D/bin/php"
EXT_DIR="$(php -r 'echo ini_get("extension_dir");')"
cp -L "$EXT_DIR"/*.so "$D/ext/"

# php.ini next to the binary sets the extension dir; the ini files that enable the extensions go to conf.d, which the
# shim (shim/php) selects with PHP_INI_SCAN_DIR so the base image's own conf.d is not scanned for this version.
mkdir -p "$D/conf.d" "$D/shim"
echo "extension_dir=/opt/php/$V/ext" > "$D/bin/php.ini"
cp /usr/local/etc/php/conf.d/*.ini "$D/conf.d/" 2>/dev/null || true
printf '#!/bin/sh\nPHP_INI_SCAN_DIR=/opt/php/%s/conf.d exec /opt/php/%s/bin/php "$@"\n' "$V" "$V" > "$D/shim/php"
chmod +x "$D/shim/php"

# shared libraries: ldd closure of the binary and every extension, minus glibc (the final image's glibc is newer or equal)
for f in "$D/bin/php" "$D"/ext/*.so; do
  ldd "$f" | awk '/=> \//{print $3}'
done | sort -u | while read -r lib; do
  case "$(basename "$lib")" in
    libc.so.*|libm.so.*|libdl.so.*|libpthread.so.*|librt.so.*|libutil.so.*|libresolv.so.*|ld-linux*) ;;
    *) cp -L "$lib" "$D/lib/" ;;
  esac
done

patchelf --set-rpath '$ORIGIN/../lib' "$D/bin/php"
for f in "$D"/ext/*.so; do patchelf --set-rpath '$ORIGIN/../lib' "$f"; done
for f in "$D"/lib/*; do patchelf --set-rpath '$ORIGIN' "$f"; done
strip --strip-unneeded "$D/bin/php" "$D"/ext/*.so 2>/dev/null || true

# the bundled binary must start from its final path with the extensions loaded before we ship it
mkdir -p /opt/php
ln -sfn "$D" "/opt/php/$V"
MODS="$("/opt/php/$V/shim/php" -m 2>&1)"
for m in zip intl bcmath pdo_mysql pcntl exif mbstring openssl phar; do
  echo "$MODS" | grep -qix "$m" || { echo "bundled php $V is missing extension $m" >&2; exit 1; }
done
echo "bundled php $V: $(du -sk "$D" | cut -f1) KiB"
