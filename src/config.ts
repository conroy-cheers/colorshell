import { Config } from "./modules/config";
import { Idle } from "./modules/idle";
import { NightLight } from "./modules/nightlight";
import { WallpaperPositioning, WalMode } from "./modules/wallpaper";
import { readFile } from "ags/file";

import Gio from "gi://Gio?version=2.0";
import GLib from "gi://GLib?version=2.0";

type JSONObject = Record<string, unknown>;

function mergeObjects<T extends JSONObject>(base: T, override: JSONObject): T {
    const result = { ...base } as JSONObject;

    Object.entries(override).forEach(([key, value]) => {
        const current = result[key];

        if(value != null &&
           typeof value === "object" &&
           !Array.isArray(value) &&
           current != null &&
           typeof current === "object" &&
           !Array.isArray(current)) {

            result[key] = mergeObjects(current as JSONObject, value as JSONObject);
            return;
        }

        result[key] = value;
    });

    return result as T;
}

function loadRepoConfigOverrides(): JSONObject {
    const filePath = `${GLib.get_user_config_dir()}/colorshell/config.overrides.json`,
        file = Gio.File.new_for_path(filePath);

    if(!file.query_exists(null))
        return {};

    try {
        return JSON.parse(readFile(filePath)) as JSONObject;
    } catch(error) {
        console.error("Config: Couldn't load repo-provided config overrides", error);
        return {};
    }
}


const generalConfigDefaults = {
    notifications: {
        /** low-priority notification timeout 
          * @default 4000 */
        timeout_low: 4000,
        /** regular notification timeout 
          * @default 6000 */
        timeout_normal: 6000,
        /** critical/very important notification timeout 
          * @default 0 */
        timeout_critical: 0,
        /** notification popup horizontal position. can be "left" or "right" 
          * @default "right" */
        position_h: "right",
        /** vertical notification popup position. can be "top" or "bottom" 
          * @default "top" */
        position_v: "top",
        /** dismiss notification popup when it gets unhovered.
          * breaks hold_on_hover a bit, notification will instantly be dismissed after unhover
          * @default false */
        dismiss_on_unhover: false,
        /** hold the notification popup while hovering it.
          * @default true */
        hold_on_hover: true
    },

    night_light: {
        /** whether to save night light/gamma filter values to disk when clicking 
          * on power/session actions(suspend, log out, power off, reboot)
          * @default true */
        save_on_shutdown: true
    },

    /** mostly the same properties as hypridle, just reach the wiki */
    idle: {
        /** screen lock timeout in seconds. @default 3600 (1 hour) */
        lock_timeout: 3600,

        ignore_dbus_inhibit: false,
        ignore_systemd_inhibit: false,
        ignore_wayland_inhibit: false,
        inhibit_sleep: 2,

        /** idle listeners. these also work the same as in hypridle */
        listeners: {}
    } satisfies Idle.Config,

    screen_recording: {
        /** include desktop audio output when screen-recording */
        include_audio: true
    },

    wallpaper: {
        /** default wallpaper path used on first start when there is no existing
         * hyprpaper configuration or wal cache. @default "" */
        default_path: "",
        /** directory searched by the wallpaper runner plugin.
         * when empty, colorshell falls back to `$WALLPAPERS` or `~/wallpapers`.
         * @default "" */
        directory: "",
        /** wallpaper positioning mode (hyprpaper) */
        positioning: "cover" satisfies WallpaperPositioning,
        /** color generation mode. 
          * darken: picks darker colors; lighten: picks brighter colors */
        color_mode: "darken" satisfies WalMode,
        /** whether to enable Hyprland's random splash text pn the wallpaper.
         * only takes effect after a hyprpaper restart. (`colorshell reload`) */
        splash: true
    },

    theming: {
        /** command invoked after pywal finishes regenerating colors.
         * when empty, no external runtime theming bridge is triggered.
         * @default "" */
        apply_command: ""
    },

    workspaces: {
        /** breaks `enable_helper`, makes all workspaces show their respective ID 
          * by default */
        always_show_id: false,
        /** this is the function that shows the Workspace's IDs 
          * around the current workspace if one breaks the crescent order.
          * It basically helps keyboard navigation between workspaces.
          * ---
          * Example: 1(empty, current, shows ID), 2(empty, does not appear(makes 
          * the previous not to be in a crescent order)), 3(not empty, shows ID) */
        enable_helper: true,
        /** hide workspace indicator if there's only one active workspace */
        hide_if_single: false
    },

    aliases: {
        terminal: "kitty",
        file_manager: "nautilus",
        media: "amberol"
    },

    clock: {
        /** use the same format as gnu's `date` command 
          * @default "%A %d, %H:%M" // -> "tuesday, 11, 15:44" */
        date_format: "%A %d, %H:%M"
    },

    misc: {
        /** plays a system-bell sound effect using canberra-gtk-play on volume change 
          * @default true */
        play_bell_on_volume_change: true
    }
};

const mergedGeneralConfigDefaults = mergeObjects(
    generalConfigDefaults as JSONObject,
    loadRepoConfigOverrides()
) as typeof generalConfigDefaults;

const userDataDefaults = {
    /** last default adapter */
    bluetooth_default_adapter: undefined as unknown as string,

    control_center: {
        /** last default backlight */
        default_backlight: undefined as unknown as string
    },

    night_light: {
        /** last blue light filter temperature */
        temperature: NightLight.identityTemperature,
        /** last gamma filter value */
        gamma: NightLight.maxGamma,
        /** wheter to enable identity filters("disables" the filters) */
        identity: true
    }
};

export const userData = new Config<
    keyof typeof userDataDefaults, 
    (typeof userDataDefaults)[keyof typeof userDataDefaults]
>(
    `${GLib.get_user_data_dir()}/colorshell/data.json`,
    userDataDefaults,
    false
);

export const generalConfig = new Config<
    keyof typeof generalConfigDefaults, 
    typeof generalConfigDefaults[keyof typeof generalConfigDefaults]
>(
    `${GLib.get_user_config_dir()}/colorshell/config.json`, 
    mergedGeneralConfigDefaults
);
