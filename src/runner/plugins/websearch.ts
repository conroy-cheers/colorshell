import { Runner } from "..";
import { dispatchExec } from "../../modules/hyprland-dispatch";


const searchEngines = {
    duckduckgo: "https://duckduckgo.com/?q=",
    google: "https://google.com/search?q=",
    yahoo: "https://search.yahoo.com/search?p="
};

let engine: string = searchEngines.google;

export const PluginWebSearch = {
    prefix: '?',
    name: "Web Search",
    prioritize: true,

    handle: (search) => ({
        icon: "system-search-symbolic",
        title: search || "Type your search...",
        description: `Search the Web`,
        actionClick: () => dispatchExec(`xdg-open \"${engine + search}\"`)
    })
} as Runner.Plugin;
