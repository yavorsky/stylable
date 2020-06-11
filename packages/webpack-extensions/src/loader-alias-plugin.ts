import { Plugin, Compiler, ResolveLoader } from 'webpack';

export class LoaderAliasPlugin implements Plugin {
    constructor(private aliasLoaders: Pick<ResolveLoader, 'alias'> = {}) {}
    apply(compiler: Compiler) {
        compiler.hooks.afterPlugins.tap(this.constructor.name, (compiler) => {
            const resolveLoader = {
                ...compiler.options?.resolveLoader,
                alias: {
                    ...compiler.options?.resolveLoader?.alias,
                    ...this.aliasLoaders.alias,
                },
            };

            compiler.options.resolveLoader = resolveLoader;
        });
    }
}
