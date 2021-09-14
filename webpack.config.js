const CopyWebpackPlugin = require('copy-webpack-plugin');
const webpack = require('webpack');
const path = require('path');

module.exports = {
    mode: 'development',
    entry: './src/js/index.js',
    output: {
        filename: '[name].bundle.js',
        path: path.resolve(__dirname, 'dist')
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/
            },
            {
                test: /\.glsl$/,
                loader: 'webpack-glsl-loader'
            }
        ]
    },
    devServer: {
        contentBase: './dist',
        overlay: true,
        disableHostCheck: true,
        hot: true,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
            "Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization"
        }
    },
    plugins: [
        new CopyWebpackPlugin(
            {
                patterns: [
                    {
                        from: 'src/html/',
                        to: './'
                    },
                    // {
                    //     from: 'assets/*',
                    //     to: './'
                    // }
                ]
            }
        ),
        new webpack.HotModuleReplacementPlugin()
    ]
};
