export async function runPlugins(plugins, ctx) {
    const issues = [];
    for (const plugin of plugins) {
        if (!plugin.enabled(ctx.config))
            continue;
        issues.push(...(await plugin.run(ctx)));
    }
    return issues;
}
//# sourceMappingURL=plugins.js.map