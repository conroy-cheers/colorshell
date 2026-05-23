-- colorshell runtime configuration for Hyprland's Lua config manager.

hl.env("XDG_CONFIG_HOME", "$HOME/.config")
hl.env("XDG_CACHE_HOME", "$HOME/.cache")
hl.env("XDG_DATA_HOME", "$HOME/.local/share")
hl.env("XDG_STATE_HOME", "$HOME/.local/state")

hl.env("QT_IM_MODULE", "fcitx")
hl.env("QT_IM_MODULES", "wayland;fcitx")
hl.env("SDL_IM_MODULE", "fcitx")
hl.env("XMODIFIERS", "@im=fcitx")

hl.config({
    decoration = {
        blur = {
            new_optimizations = true,
            size = 0,
            passes = 6,
            vibrancy = 6,
        },
    },
})

hl.window_rule({
    name = "colorshell-hyprpolkitagent-animation",
    match = { class = "hyprpolkitagent" },
    animation = "gnomed",
})

hl.window_rule({
    name = "colorshell-xdg-desktop-portal-animation",
    match = { class = "xdg-desktop-portal.*" },
    animation = "gnomed",
})

hl.window_rule({
    name = "colorshell-fix-chromium-xwayland-popup-blur",
    match = { class = "^()$", title = "^()$" },
    no_blur = true,
})

hl.window_rule({
    name = "colorshell-kdeconnect-no-blur",
    match = { class = "^(org.kde.kdeconnect..*)$" },
    no_blur = true,
})

local function layer_rule(name, namespace, effects)
    effects.name = name
    effects.match = { namespace = namespace }
    hl.layer_rule(effects)
end

layer_rule("colorshell-selection-animation", "selection", { animation = "fade" })
layer_rule("colorshell-hyprpicker-animation", "hyprpicker", { animation = "fade" })
layer_rule("colorshell-hyprpaper-animation", "hyprpaper", { animation = "fade" })
layer_rule("colorshell-apps-window-animation", "apps-window", { animation = "slide bottom" })
layer_rule("colorshell-control-center-animation", "control-center", { animation = "fade" })
layer_rule("colorshell-center-window-animation", "center-window", { animation = "fade" })
layer_rule("colorshell-logout-menu-animation", "logout-menu", { animation = "fade" })
layer_rule("colorshell-runner-animation", "runner", { animation = "fade" })
layer_rule("colorshell-background-window-animation", "background-window", { animation = "fade" })
layer_rule("colorshell-background-window-blur-animation", "background-window-blur", { animation = "fade" })
layer_rule("colorshell-popup-animation", ".*-popup", { animation = "fade" })
layer_rule("colorshell-floating-notifications-no-anim", "floating-notifications", { no_anim = true })

layer_rule("colorshell-top-bar-widget", "top-bar", {
    blur = true,
    ignore_alpha = 0.55,
})

layer_rule("colorshell-popup-widgets-1", "control-center|center-window|runner|floating-notifications", {
    blur = true,
    ignore_alpha = 0.7,
})

layer_rule("colorshell-popup-widgets-2", ".*-popup", {
    blur = true,
    ignore_alpha = 0.6,
})

layer_rule("colorshell-osd-blur", "osd", { blur = true })
layer_rule("colorshell-apps-window-blur", "apps-window", { blur = true })
layer_rule("colorshell-logout-menu-blur", "logout-menu", { blur = true })

layer_rule("colorshell-osd-alpha", "osd", { ignore_alpha = 0.4 })
layer_rule("colorshell-apps-window-alpha", "apps-window", { ignore_alpha = 0.5 })
layer_rule("colorshell-logout-menu-alpha", "logout-menu", { ignore_alpha = 0 })
