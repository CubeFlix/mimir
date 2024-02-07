const path = require('path');

module.exports = {
  entry: './src/mimir.js',
  output: {
    filename: 'mimir.js',
    library: 'Mimir',
    libraryTarget: 'umd',
    umdNamedDefine: true,
    globalObject: 'this',
    path: path.resolve(__dirname, 'dist'),
  },
  resolve: {
    extensions: ['.js', '.css']
  },
  module: {
    rules: [
      { 
        test: /\.svg$/, 
        loader: 'svg-inline-loader' 
      },
      { 
        test: /\.css$/, 
        use: ["style-loader", "css-loader"] 
      }
    ]
  }
};