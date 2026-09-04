{
  colorshell,
  pkgs,
}:
let
  runtimeClosure = pkgs.closureInfo {
    rootPaths = [ colorshell ];
  };
  program = "${colorshell}/libexec/colorshell/colorshell.js";
  launcher = "${colorshell}/bin/.colorshell-wrapped";
in
pkgs.runCommand "colorshell-runtime-package" { } ''
  set -eu

  test -f '${program}'
  test "$(head -n 1 '${program}')" = '#!${pkgs.lib.getExe pkgs.gjs} -m'
  grep -Fx '${pkgs.gjs}' '${runtimeClosure}/store-paths'
  grep -Fq 'exec gjs -m "$file" "$@"' '${launcher}'

  if grep -RFq 'base64 --decode' '${colorshell}/bin'; then
    echo "Colorshell launcher still embeds its executable" >&2
    exit 1
  fi

  set +e
  PATH='${
    pkgs.lib.makeBinPath [
      pkgs.coreutils
      pkgs.gjs
    ]
  }' \
    XDG_RUNTIME_DIR="$TMPDIR/runtime" \
    COLORSHELL_EXECUTABLE="$TMPDIR/missing" \
    '${launcher}'
  status=$?
  set -e

  if [ "$status" -eq 0 ]; then
    echo "Colorshell launcher masked an executable failure" >&2
    exit 1
  fi

  touch "$out"
''
