const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const path = require('path');
const WorkboxWebpackPlugin = require('workbox-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');

module.exports = {
  mode: 'production',
  entry: {
    main: './src/index.js'
  },
  output: {
    filename: '[name].[chunkhash].js',
    chunkFilename: '[name].[chunkhash].bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  // sql.js's glue (Anki export) has a Node branch that require()s fs;
  // it never runs in a browser, so it's stubbed rather than shimmed.
  node: {
    fs: 'empty',
    path: 'empty',
    crypto: 'empty'
  },
  resolve: {
    extensions: ['.js', '.jsx']
  },
  plugins: [
    new webpack.HashedModuleIdsPlugin(),
    // Real .css files instead of style-loader's runtime injection: the
    // browser parses CSS in parallel with the (smaller) JS bundle, and the
    // stylesheet text no longer lives on the JS heap.
    new MiniCssExtractPlugin({
      filename: '[name].[contenthash].css'
    }),
    new HtmlWebpackPlugin({
      template: './index.html',
      minify: { collapseWhitespace: true, removeCommecnts: true },
      inject: false
    }),
    new WorkboxWebpackPlugin.InjectManifest({
      swSrc: './src/src-sw.js',
      swDest: 'sw.js',
      // Keep the ~2.5MB of sound samples out of the install-time precache;
      // they're fetched on demand and land in the regular HTTP cache.
      //
      // The whole Anki-export path is excluded for the same reason: its
      // wasm alone is 599KB. Excluding the wasm but precaching its JS
      // chunks would be the worst of both - you'd pay ~170KB at install
      // AND the export would still fail offline for want of the wasm. So
      // it's all on demand, and the picker says as much if it fails.
      exclude: [/\.(wav|ogg|mp3)$/, /\.map$/, /\.wasm$/, /anki.*\.bundle\.js$/]
    })
  ],
  devtool: "source-map",
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader'
        }
      },
      {
        test: /\.scss$/,
        use: [
          MiniCssExtractPlugin.loader,
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1
            }
          },
          {
            loader: 'postcss-loader'
          }
        ]
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader']
      },
      {
        test: /\.(png|jpg|svg|woff|woff2)?(\?v=\d+.\d+.\d+)?$/,
        loader: 'url-loader?limit=25000'
      }, 
      {
        test: /\.(eot|ttf)$/,
        loader: 'file-loader'
      },
      {
        test: /\.(ogg|mp3|wav)$/,
        loader: 'file-loader'
      },
      {
        // sql.js's wasm, pulled in only by the Anki .apkg export. `type:
        // 'javascript/auto'` opts out of webpack's own WebAssembly handling
        // so file-loader can just emit the file and hand back its URL,
        // which is what sql.js's locateFile() wants.
        test: /\.wasm$/,
        type: 'javascript/auto',
        loader: 'file-loader'
      }
    ]
  }
};
