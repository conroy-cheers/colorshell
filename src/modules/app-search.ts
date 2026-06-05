import fuzzysort from "fuzzysort/fuzzysort.js";

import AstalApps from "gi://AstalApps";
import { getAppIcon, getApps } from "./apps";


export type AppSearchItem = {
    app: AstalApps.Application;
    icon: string;
    name: ReturnType<typeof fuzzysort.prepare>;
    entry: ReturnType<typeof fuzzysort.prepare>;
    executable: ReturnType<typeof fuzzysort.prepare>;
    keywords: ReturnType<typeof fuzzysort.prepare>;
    categories: ReturnType<typeof fuzzysort.prepare>;
    description: ReturnType<typeof fuzzysort.prepare>;
};

const SEARCH_KEYS = [
    "name",
    "entry",
    "executable",
    "keywords",
    "categories",
    "description"
] as const;

let indexedAppsSource: Array<AstalApps.Application>|undefined;
let indexedApps: Array<AppSearchItem> = [];

function asSearchText(value: string|string[]|null|undefined): string {
    if(Array.isArray(value))
        return value.filter(Boolean).join(" ");

    return value ?? "";
}

function buildSearchItem(app: AstalApps.Application): AppSearchItem {
    return {
        app,
        icon: getAppIcon(app) ?? "application-x-executable-symbolic",
        name: fuzzysort.prepare(app.name),
        entry: fuzzysort.prepare(app.entry),
        executable: fuzzysort.prepare(app.executable),
        keywords: fuzzysort.prepare(asSearchText(app.keywords)),
        categories: fuzzysort.prepare(asSearchText(app.categories)),
        description: fuzzysort.prepare(app.description)
    };
}

function ensureAppSearchIndex(): Array<AppSearchItem> {
    const apps = getApps();

    if(indexedAppsSource !== apps) {
        indexedAppsSource = apps;
        indexedApps = apps.map(buildSearchItem);
    }

    return indexedApps;
}

function score(result: Fuzzysort.KeysResult<AppSearchItem>): number {
    const name = result[0]?.score ?? 0;
    const entry = result[1]?.score ?? 0;
    const executable = result[2]?.score ?? 0;
    const keywords = result[3]?.score ?? 0;
    const categories = result[4]?.score ?? 0;
    const description = result[5]?.score ?? 0;
    const app = result.obj.app;

    const weighted = Math.max(
        name,
        entry * 0.82,
        executable * 0.72,
        keywords * 0.66,
        categories * 0.58,
        description * 0.42
    );

    const frequencyBoost = Math.min(app.frequency, 10) * 0.006;

    return Math.min(weighted + frequencyBoost, 1);
}

export function searchApps(search: string, limit?: number): Array<AppSearchItem> {
    const apps = ensureAppSearchIndex();
    const text = search.trim();

    if(text.length < 1)
        return apps.slice().sort((a, b) => b.app.frequency - a.app.frequency);

    return fuzzysort.go(text, apps, {
        keys: SEARCH_KEYS,
        scoreFn: score,
        threshold: 0.1,
        limit: limit !== undefined && limit > 0 && limit !== Infinity ? limit : undefined
    }).map(result => result.obj);
}
