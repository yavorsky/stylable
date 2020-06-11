import { StylableWebpackPlugin } from '@stylable/webpack-plugin';
import { metadataLoaderLocation } from '@stylable/webpack-extensions';
import { Configuration } from 'webpack';
import { LoaderAliasPlugin } from 'packages/webpack-extensions/src/loader-alias-plugin';
const config: Configuration = {
    mode: 'development',
    context: __dirname,
    devtool: 'source-map',
    entry: './index.ts',
    output: {
        library: 'metadata',
    },
    plugins: [
        new StylableWebpackPlugin(),
        new LoaderAliasPlugin({ alias: { 'stylable-metadata': metadataLoaderLocation } }),
    ],
    resolve: {
        extensions: ['.ts', '.tsx', '.mjs', '.js', '.json'],
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: '@ts-tools/webpack-loader',
            },
        ],
    },
};

module.exports = config;
