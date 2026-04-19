{ withSystem }:
{ config, lib, pkgs, ... }:
let
  cfg = config.programs.colorshell;
  jsonFormat = pkgs.formats.json { };
  defaultHyprlockSource = ../resources/config/hyprlock.conf;
  defaultPackage = withSystem pkgs.stdenv.hostPlatform.system ({ config, ... }: config.packages.colorshell);
in
{
  options.programs.colorshell = {
    enable = lib.mkEnableOption "colorshell desktop shell";

    package = lib.mkOption {
      type = lib.types.package;
      default = defaultPackage;
      defaultText = lib.literalExpression "inputs.colorshell.packages.\${pkgs.stdenv.hostPlatform.system}.colorshell";
      description = "The Colorshell package to install and run.";
    };

    settings = lib.mkOption {
      type = jsonFormat.type;
      default = { };
      example = {
        wallpaper.default_path = "/path/to/wallpaper.jpg";
        idle.lock_timeout = 900;
      };
      description = ''
        Colorshell configuration overrides written to
        `~/.config/colorshell/config.overrides.json`.
      '';
    };

    hyprlock = {
      source = lib.mkOption {
        type = lib.types.nullOr lib.types.path;
        default = null;
        description = ''
          Source file to install as `~/.config/colorshell/hyprlock.conf`.
          When unset, Colorshell's bundled default hyprlock config is used.
        '';
      };

      text = lib.mkOption {
        type = lib.types.nullOr lib.types.lines;
        default = null;
        description = ''
          Inline hyprlock configuration to install as
          `~/.config/colorshell/hyprlock.conf`.
        '';
      };
    };
  };

  config = lib.mkIf cfg.enable {
    assertions = [
      {
        assertion = cfg.hyprlock.source == null || cfg.hyprlock.text == null;
        message = "programs.colorshell.hyprlock.source and .text are mutually exclusive";
      }
    ];

    services.hyprpaper.enable = lib.mkForce false;
    services.hypridle.enable = lib.mkForce false;
    services.hyprsunset.enable = lib.mkForce false;

    home.packages = [ cfg.package ];

    xdg.configFile."colorshell/config.overrides.json".source =
      jsonFormat.generate "colorshell-config-overrides.json" cfg.settings;

    xdg.configFile."colorshell/hyprlock.conf" =
      if cfg.hyprlock.text != null then
        {
          text = cfg.hyprlock.text;
        }
      else
        {
          source =
            if cfg.hyprlock.source != null then
              cfg.hyprlock.source
            else
              defaultHyprlockSource;
        };

    systemd.user.services.colorshell = {
      Unit = {
        Description = "colorshell";
        PartOf = [ "graphical-session.target" ];
        After = [ "graphical-session.target" ];
      };

      Service = {
        ExecStart = "${cfg.package}/bin/colorshell";
        Restart = "on-failure";
      };

      Install = {
        WantedBy = [ "graphical-session.target" ];
      };
    };
  };
}
