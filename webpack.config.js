const path = require('path');
const webpack = require('webpack');

module.exports = {
    entry: './src/app.ts',
    output: {
        path: path.join(__dirname, '/dist'),
        filename: 'bundle.js',
        publicPath: 'dist',
    },
    devtool: "inline-source-map",
    module: {
        rules: [

            /**
             * Convert our ES6/7 mangle intro ES5 for browser consumption.
             * Configuration for babel happens in `.babelrc`.
             */
            { test: /\.js$/, loader: 'babel-loader', exclude: /node_modules/ },

            /**
             * Typescript compilation.
             */
            { test: /\.ts$/, loader: 'ts-loader', exclude: /node_modules/ },

            /**
             * I wanted to use HTML imports to import HTML for my various
             * plugins but currently browsers don't agree on what these should
             * look like and therefore don't support them. For now we'll just
             * use the HTML loader to essentially load them in as strings. Ew.
             */
            { test: /\.html$/, loader: 'html-loader', exclude: /node_modules/ },

        ],
    },
    resolve: {
        // This means we don't have to specify the extension when importing
        // files with these extensions. Explicit to add TypeScript files.
        extensions: [ '.js', '.ts' ],
    },
    plugins: [
        /**
         * When doing testing on the server side we use JSDOM to fake a DOM.
         * But if we're bundling with Webpack we don't want to do that, obviously.
         */
        new webpack.IgnorePlugin(/^jsdom$/),
    ],
};
