{
  astal,
  lib,
  stdenv,
  stdenvNoCC,
  moreutils,
  pnpmConfigHook,
  fetchPnpmDeps,
  pnpm_10,
  buildNpmPackage,
  wrapGAppsHook4,
  bash,
  bluez,
  brightnessctl,
  cliphist,
  coreutils,
  gobject-introspection,
  glib,
  grim,
  gtk4-layer-shell,
  gjs,
  hyprland,
  hyprlock,
  hyprpaper,
  hyprpicker,
  hyprsunset,
  libadwaita,
  libnotify,
  networkmanager,
  networkmanagerapplet,
  polkit,
  procps,
  pywal,
  socat,
  slurp,
  systemd,
  uwsm,
  wf-recorder,
  wl-clipboard,
  xdg-utils,
  zenity,
  libglycin-gtk4,
  glycin-loaders,
  jq,
}:
let
  packageJSON = lib.importJSON ../package.json;
  appid = "io.github.retrozinndev.Colorshell";
  pname = packageJSON.name;
  version = packageJSON.version;
  # Cleaned sources from this repository
  src = lib.fileset.toSource {
    root = ../.;
    fileset = lib.fileset.difference ../. (
      lib.fileset.unions [
        (lib.fileset.maybeMissing ../build)
        ../flake.nix
        ../flake.lock
        (lib.fileset.maybeMissing ../node_modules)
        (lib.fileset.maybeMissing ../result)
        ./.
      ]
    );
  };

  # Derivation building just the gresources file
  colorshellResources = stdenv.mkDerivation {
    pname = "${pname}-resources.gresource";
    inherit version;

    inherit src;

    buildInputs = [
      glib
    ];

    buildPhase = ''
      runHook preBuild

      glib-compile-resources data/${appid}.gresource.xml \
        --sourcedir ./data \
        --target resources.gresource

      runHook postBuild
    '';

    installPhase = ''
      runHook preInstall

      cp resources.gresource $out

      runHook postInstall
    '';
  };

  # Cleaned sources, with FHS paths patched out.
  colorshellSrc = stdenvNoCC.mkDerivation {
    pname = "${pname}-src";
    inherit version;

    inherit src;

    postPatch = ''
      substituteInPlace scripts/build.sh \
        --replace-fail '#!/usr/bin/env bash' '#!${lib.getExe bash}' \
        --replace-fail '#!/usr/bin/env -S gjs -m' '#!${lib.getExe gjs} -m' \
        --replace-fail \
          'export LD_PRELOAD=\"/usr/lib/libgtk4-layer-shell.so\"' \
          'export LD_PRELOAD=\"${gtk4-layer-shell}/lib/libgtk4-layer-shell.so\"'
      substituteInPlace src/modules/wallpaper.ts \
        --replace-fail '/usr/share/hypr/wall2.png' '${hyprland}/share/hypr/wall2.png'
    '';

    installPhase = ''
      mkdir $out
      cp -rp * $out
    '';
  };
in
buildNpmPackage (finalAttrs: {
  inherit pname version;

  src = colorshellSrc;
  sourceRoot = "${finalAttrs.src.name}";

  npmConfigHook = pnpmConfigHook;
  npmDeps = finalAttrs.pnpmDeps;
  pnpmDeps = fetchPnpmDeps {
    inherit (finalAttrs)
      pname
      version
      src
      sourceRoot
      ;

    nativeBuildInputs = [ pnpm_10 ];
    pnpm = pnpm_10;

    fetcherVersion = 3;
    hash = "sha256-o2ZYl2FTQCnq9haPFMSx9VXIjA8E0Sc45CUfIIw3GwM=";

    # The pnpm store has no executable entries, but the fetcher still expects at
    # least one *-exec file while normalizing permissions.
    preFixup = ''
      touch "$storePath/.dummy-exec"
    '';
  };

  nativeBuildInputs = [
    pnpm_10
    wrapGAppsHook4
    gobject-introspection
    moreutils
    jq
  ];

  buildInputs = [
    glib
    gjs
    libadwaita
    libglycin-gtk4
    glycin-loaders
    networkmanager
    astal.astal4
    astal.apps
    astal.auth
    astal.battery
    astal.bluetooth
    astal.hyprland
    astal.io
    astal.mpris
    astal.network
    astal.notifd
    astal.tray
    astal.wireplumber
  ];

  buildPhase = ''
    runHook preBuild

    mkdir build
    outPath=./build/${packageJSON.name}
    pnpm build -rjg \$COLORSHELL_GRESOURCE -o ./build

    runHook postBuild
  '';

  installPhase = ''
    runHook preInstall

      install -Dm755 build/${packageJSON.name} $out/bin/${packageJSON.name}
      install -Dm644 \
        build/${packageJSON.name}.js \
        $out/libexec/${pname}/${pname}.js
      install -Dm644 \
        ${colorshellResources} \
        $out/share/${pname}/resources.gresource

    runHook postInstall
  '';

  preFixup = ''
    gappsWrapperArgs+=(
      --set COLORSHELL_GRESOURCE "$out/share/${pname}/resources.gresource"
      --set COLORSHELL_EXECUTABLE "$out/libexec/${pname}/${pname}.js"
      --prefix PATH : ${
        lib.makeBinPath [
          # runtime executables
          bash
          bluez
          brightnessctl
          cliphist
          coreutils
          glib
          gjs
          grim
          gtk4-layer-shell
          hyprland
          hyprlock
          hyprpaper
          hyprpicker
          hyprsunset
          libnotify
          networkmanager
          networkmanagerapplet
          polkit
          procps
          pywal
          socat
          slurp
          systemd
          uwsm
          wf-recorder
          wl-clipboard
          xdg-utils
          zenity
        ]
      }
    )
  '';

  meta.mainProgram = "colorshell";

  passthru = {
    resources = colorshellResources;
  };
})
