const path = require('path')
const webpack = require('webpack')

module.exports = {
  entry: './src/index.js',
  output: {
      path: path.resolve(__dirname, './dist'),
      filename: 'nemChat.js',
      library: 'nemChat',
      libraryTarget: 'umd'
  },
  node: {
    fs: 'empty'
  },
  target: 'node',
  module: {
    rules: [ { test: /\.(js|jsx)$/, use: 'babel-loader' } ]
  }
}
