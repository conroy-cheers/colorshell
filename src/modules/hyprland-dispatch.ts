import AstalHyprland from "gi://AstalHyprland";


function luaString(value: string): string {
    return `"${value
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"')
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "\\r")
        .replace(/\t/g, "\\t")}"`;
}

export function dispatchLua(expression: string): void {
    AstalHyprland.get_default().dispatch(expression, "");
}

export function dispatchExec(command: string, dispatchExecArgs?: string): void {
    dispatchLua(
        `hl.dsp.exec_cmd(${
            luaString(`${dispatchExecArgs ? `${dispatchExecArgs} ` : ""}${command}`)
        })`
    );
}

export function dispatchExit(): void {
    dispatchLua("hl.dsp.exit()");
}

export function dispatchToggleSpecialWorkspace(workspace: string): void {
    dispatchLua(`hl.dsp.workspace.toggle_special(${luaString(workspace)})`);
}

export function dispatchWorkspace(workspace: string|number): void {
    dispatchLua(`hl.dsp.focus({ workspace = ${
        typeof workspace === "number" ? workspace : luaString(workspace)
    } })`);
}
