const HtmlWebPackPlugin = require('html-webpack-plugin');

module.exports = {
  mode: 'development',
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
    new HtmlWebPackPlugin({
      template: './index.html'
    })
  ],
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
          {
            loader: 'style-loader'
          },
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
        use: ['style-loader', 'css-loader']
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
