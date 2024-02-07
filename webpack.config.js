const path = require('path');

module.exports = {
  entry: './src/entry.js',
  output: {
    filename: 'dist/mimir.js',
    path: path.resolve(__dirname, 'dist'),
  },
  module: {
    rules: [
      { 
        test: /\.svg$/, 
        loader: 'svg-inline-loader' 
      }
    ]
  }
};