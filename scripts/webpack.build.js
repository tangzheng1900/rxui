const path = require('path')

const baseCfg = require('./webpack.base')

module.exports = Object.assign({
  entry: {
    index: path.resolve(__dirname, '../src/index.ts')
  },
  // optimization: {
  //   splitChunks: {
  //     chunks: "all",
  //     //minSize: 100,
  //     cacheGroups: {
  //       vendors: {
  //         test: /[\\/]node_modules[\\/]/,  // 匹配node_modules目录下的文件
  //         priority: -10   // 优先级配置项
  //       },
  //       default: {
  //         minChunks: 2,
  //         priority: -20,   // 优先级配置项
  //         reuseExistingChunk: true
  //       }
  //     }
  //   }
  // },
  output: {
    path: path.resolve(__dirname, '..'),
    filename: './index.js',
    libraryTarget: 'umd',
    library: '@mybricks/rxui'
  },
  externals: [{
    'react': 'React',
    'react-dom': 'ReactDOM'
  }],
  //devtool: 'cheap-module-eval-source-map',//devtool: 'cheap-source-map',
}, baseCfg)