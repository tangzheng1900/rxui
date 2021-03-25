const webpack = require('webpack')

module.exports = {
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    alias: {
      '@mybricks/rxui': require('path').resolve(__dirname, '../src/')
    },
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        //include: [pathSrc, testSrc],
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [
                '@babel/preset-react'  // jsx支持
                //['@babel/preset-env', { useBuiltIns: 'usage', corejs: 2 }] // 按需使用polyfill
              ],
              plugins: [
                ['@babel/plugin-proposal-class-properties', { 'loose': true }] // class中的箭头函数中的this指向组件
              ],
              cacheDirectory: true // 加快编译速度
            }
          }
        ]
      },
      {
        test: /\.tsx?$/,
        //include: [pathSrc, testSrc],
        use: [
          // {
          //   loader: './config/test-loader'
          // },
          {
            loader: 'babel-loader',
            options: {
              presets: [
                '@babel/preset-react'  // jsx支持
                //['@babel/preset-env', { useBuiltIns: 'usage', corejs: 2 }] // 按需使用polyfill
              ],
              plugins: [
                ['@babel/plugin-proposal-class-properties', { 'loose': true }] // class中的箭头函数中的this指向组件
              ],
              cacheDirectory: true // 加快编译速度
            }
          },
          {
            loader: 'ts-loader',
            options: {
              silent: true,
              transpileOnly: true
            }
          }
        ]
      }
    ]
  },
  plugins: [
    // new webpack.DefinePlugin({
    //   'process.env': {
    //     NODE_ENV: JSON.stringify('development')
    //   }
    // }),
    new webpack.ProvidePlugin({
      'React': 'react'
    }),

    //new BundleAnalyzerPlugin()
  ]
}
