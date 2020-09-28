/* eslint-disable @typescript-eslint/no-var-requires */
const os = require('os');
const path = require('path');
const slsw = require('serverless-webpack');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

const commonNodeModulesPath = path.resolve(
  __dirname,
  '../service/node_modules',
);

module.exports = {
  entry: slsw.lib.entries,
  target: 'node',
  mode: 'production',
  resolve: {
    alias: {},
    modules: ['node_modules', commonNodeModulesPath],
    extensions: ['.ts', '.js'],
    symlinks: true,
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'cache-loader',
          },
          {
            loader: 'thread-loader',
            options: {
              workers: os.cpus().length - 1,
            },
          },
          {
            loader: 'ts-loader',
            options: {
              happyPackMode: true,
              transpileOnly: true,
              compilerOptions: {
                module: 'es2015',
              },
            },
          },
        ],
      },
    ],
  },
  plugins: [
    /*
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
    }),
    */
  ],
  optimization: {
    sideEffects: true,
    usedExports: true,
    minimize: true, //false,
    concatenateModules: true, //false,
    innerGraph: true,
  },
  externals: [
    {
      'aws-sdk': 'commonjs aws-sdk',
    },
  ],
};
