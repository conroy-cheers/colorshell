import { execApp, updateApps } from "../../modules/apps";
import { searchApps } from "../../modules/app-search";
import { Runner } from "..";

export const PluginApps = {
    // Do not provide prefix, so it always runs.
    name: "Apps",
    // asynchronously-refresh apps list on init
    init: async () => updateApps(),
    handle: (text: string, limit?: number) => {
        return searchApps(text, limit).map(({ app, icon }) => ({
                title: app.name,
                description: app.description,
                icon,
                actionClick: () => execApp(app)
            })
        );
    }
} as Runner.Plugin;
