import { findFiles } from '@stylable/node';
import { dirname, join } from 'path';
import webpack from 'webpack';
import { RawSource } from 'webpack-sources';
import { compileAsEntry, exec } from './compile-as-entry';
import { ComponentConfig, ComponentMetadataBuilder } from './component-metadata-builder';

import {
    getCSSComponentLogicModule,
    StylableModule,
    StylableWebpackPlugin,
} from '@stylable/webpack-plugin';
import { hashContent } from './hash-content-util';

export interface MetadataOptions {
    name: string;
    useContentHashFileName?: boolean;
    contentHashLength?: number;
    version: string;
    configExtension?: string;
    context?: string;
    renderSnapshot?: (
        moduleExports: any,
        component: any,
        componentConfig: ComponentConfig
    ) => string;
    onlyIncludeEditableComponents?: boolean;
    mode?: 'json' | 'cjs' | 'amd:static' | 'amd:factory';
}

import { collectDependenciesDeep } from './collect-st-css-dependencies';
import { Stylable, StylableMeta } from '@stylable/core';

export class StylableMetadataPlugin {
    constructor(private options: MetadataOptions) {}
    public apply(compiler: webpack.Compiler) {
        compiler.hooks.thisCompilation.tap('StylableMetadataPlugin', (compilation) => {
            compilation.hooks.additionalAssets.tapPromise('StylableMetadataPlugin', async () => {
                await this.createMetadataAssets(compilation);
            });
        });
    }
    public loadComponentConfig(compilation: webpack.compilation.Compilation, component: any) {
        return this.loadJSON<ComponentConfig>(
            compilation.inputFileSystem,
            component.resource.replace(
                /\.[^.]+$/,
                this.options.configExtension || '.component.json'
            )
        );
    }
    private loadJSON<T>(fs: { readFileSync(path: string): Buffer }, resource: string): T | null {
        try {
            return JSON.parse(fs.readFileSync(resource).toString());
        } catch (e) {
            if (e instanceof SyntaxError) {
                throw new SyntaxError(`${e.message} in ${resource}`);
            }
            return null;
        }
    }
    private async createMetadataAssets(compilation: webpack.compilation.Compilation) {
        const stylableModules: StylableModule[] = compilation.modules.filter(
            (m) => m.type === 'stylable'
        );

        const stylable = getStylableFromWebpack(compilation);

        const builder = new ComponentMetadataBuilder(
            this.options.context || compilation.compiler.options.context || process.cwd(),
            this.options.name,
            this.options.version
        );

        for (const module of stylableModules) {
            const meta = module.buildInfo.stylableMeta;
            const namespace = meta.namespace;
            const depth = module.buildInfo.runtimeInfo.depth;

            if (!this.options.onlyIncludeEditableComponents) {
                builder.addSource(
                    module.resource,
                    compilation.inputFileSystem.readFileSync(module.resource).toString(),
                    { namespace, depth }
                );
            }

            const component = getCSSComponentLogicModule(module);
            if (!component) {
                continue;
            }

            const componentConfig = this.loadComponentConfig(compilation, component);

            if (!componentConfig) {
                continue;
            }

            builder.addComponent(module.resource, componentConfig, namespace);

            if (this.options.onlyIncludeEditableComponents) {
                if (!stylable) {
                    throw new Error('Could not find Stylable instance in webpack compiler');
                }
                const usedImports = collectDependenciesDeep(stylable, meta);
                for (const usedMeta of usedImports.keys()) {
                    const builtModule = stylableModules.find(
                        ({ resource }) => resource === usedMeta.source
                    );
                    if (!builtModule) {
                        throw new Error(`Could not find webpack module for ${usedMeta.source}`);
                    }
                    const depth = builtModule.buildInfo.runtimeInfo.depth;
                    const namespace = builtModule.buildInfo.stylableMeta.namespace;
                    builder.addSource(
                        usedMeta.source,
                        compilation.inputFileSystem.readFileSync(usedMeta.source).toString(),
                        { namespace, depth }
                    );
                }
            }

            this.handleVariants(
                componentConfig,
                dirname(module.resource),
                compilation,
                builder,
                namespace,
                depth
            );

            if (this.options.renderSnapshot) {
                const source = await compileAsEntry(
                    compilation,
                    component.context,
                    component.resource
                );

                const componentModule = exec(source, component.resource, component.context);

                const html = this.options.renderSnapshot(
                    componentModule,
                    component,
                    componentConfig
                );
                builder.addComponentSnapshot(componentConfig.id, html);
            }
        }

        if (builder.hasPackages()) {
            // if (this.options.onlyIncludeEditableComponents) {
            //     if (!stylable) {
            //         throw new Error('Could not find Stylable instance in webpack compiler');
            //     }
            //     const allUsedSources = new Set<string>();
            //     for (const compDef of Object.values(builder.output.components)) {
            //         const meta = stylable.fileProcessor.cache[compDef.stylesheetPath];

            //         const usedImports = collectDependenciesDeep(stylable, meta.value).keys();
            //         for (const m of usedImports) {
            //             allUsedSources.add(m.source);
            //         }
            //     }

            //     for (const k in builder.output.fs) {
            //         if (!allUsedSources.has(k)) {
            //             delete builder.output.fs[k];
            //         }
            //     }
            // }

            builder.createIndex();
            const jsonMode = !this.options.mode || this.options.mode === 'json';
            const jsonSource = JSON.stringify(builder.build(), null, 2);

            let fileContent = jsonSource;
            switch (this.options.mode) {
                case 'cjs':
                    fileContent = `module.exports = ${fileContent}`;
                    break;
                case 'amd:static':
                    fileContent = `define(${fileContent});`;
                    break;
                case 'amd:factory':
                    fileContent = `define(() => { return ${fileContent}; });`;
                    break;
            }
            const fileName = `${this.options.name}${
                this.options.useContentHashFileName
                    ? `.${hashContent(fileContent, this.options.contentHashLength)}`
                    : ''
            }.metadata.json${!jsonMode ? '.js' : ''}`;
            compilation.assets[fileName] = new RawSource(fileContent);
        }
    }

    private handleVariants(
        componentConfig: ComponentConfig,
        componentDir: string,
        compilation: webpack.compilation.Compilation,
        builder: ComponentMetadataBuilder,
        namespace: any,
        depth: any
    ) {
        if (componentConfig.variantsPath) {
            const variantsDir = join(componentDir, componentConfig.variantsPath);

            const { result: variants, errors } = findFiles(
                compilation.inputFileSystem,
                variantsDir,
                '.st.css',
                new Set(),
                true
            );
            if (errors.length) {
                throw new Error(
                    `Error while reading variants for: ${componentConfig.id} in ${variantsDir}\nOriginal Errors:\n${errors}`
                );
            }

            variants.forEach((name: string) => {
                if (!name.match(/\.st\.css/)) {
                    return;
                }
                const variantPath = join(variantsDir, name);
                let content;
                try {
                    content = compilation.inputFileSystem.readFileSync(variantPath).toString();
                } catch (e) {
                    throw new Error(
                        `Error while reading variant: ${variantPath}\nOriginal Error:\n${e}`
                    );
                }
                if (name.includes('_')) {
                    throw new Error(
                        `Error variant name or folder cannot contain "_" found in: ${name}`
                    );
                }
                builder.addSource(variantPath, content, {
                    namespace:
                        name.replace(/\\/g, '/').replace(/\//g, '_').replace('.st.css', '') +
                        '-' +
                        namespace,
                    variant: true,
                    depth,
                });
            });
        }
    }
}

function getStylableFromWebpack(compilation: webpack.compilation.Compilation) {
    const plugin = compilation.compiler.options.plugins?.find((plugin) => {
        return plugin.constructor.name === StylableWebpackPlugin.name;
    });
    if (plugin) {
        return (plugin as any).stylable as Stylable;
    }
}
