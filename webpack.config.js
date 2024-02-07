const path = require('path');

module.exports = {
  entry: './src/mimir.js',
  output: {
    filename: 'dist/mimir.js',
    path: path.resolve(__dirname, 'dist'),
  },
};