[![MIT Licence](https://img.shields.io/badge/licence-MIT-blue.svg)](https://opensource.org/licenses/mit-license.php) 
[![TypeScript](https://img.shields.io/badge/soucre-TypeScript-blue.svg)](https://github.com/myxvisual/webpack-build-dll-plugin)
[![npm](https://img.shields.io/badge/webpack--build--dllplugin-1.2.3-green.svg?style=flat)](https://www.npmjs.com/package/webpack-build-dll-plugin)
[![npm](https://img.shields.io/badge/dowloads-400%2B-brightgreen.svg)](https://www.npmjs.com/package/webpack-build-dll-plugin)
[![npm](https://img.shields.io/badge/denpendencies-up--to--date-brightgreen.svg)](https://www.npmjs.com/package/webpack-build-dll-plugin)

Installation
------------
Install the plugin with npm:
```shell
$ npm i webpack-build-dll-plugin -D
```
Basic Usage
-----------

```javascript
var WebpackBuildDllPlugin = require('webpack-build-dll-plugin');
var webpackConfig = {
  entry: 'index.js',
  output: {
    path: 'dist',
    filename: 'index_bundle.js'
  },
  plugins: [
    // Add plugin BuildPlugin before your DllReference plugin.
    new WebpackBuildDllPlugin({
      // dllConfigPath: required, your Dll Config Path, support absolute path.
      dllConfigPath: './webpack.dll.config.js',
      // forceBuild: default is {false}, when dependencies change, will rebuild DllReference files
      // if {true} it will build DllReference in once upon starting Webpack.
      forceBuild: false
    }),
    new webpack.DllReferencePlugin({
      context: `./${outputPath}`,
      manifest: require(`./${outputPath}/${publicPath}/vendors-manifest${__DEV__ ? '.dev' : '.prod'}.json`)
    })
  ]
};
```
