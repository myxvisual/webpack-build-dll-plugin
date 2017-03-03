[![Open Source Love](https://badges.frapsoft.com/os/v2/open-source.svg?v=103)](https://github.com/ellerbrock/open-source-badges/)
[![TypeScript](https://badges.frapsoft.com/typescript/code/typescript.svg?v=101)](https://github.com/ellerbrock/typescript-badges/)
[![MIT Licence](https://badges.frapsoft.com/os/mit/mit.svg?v=103)](https://opensource.org/licenses/mit-license.php) 
[![npm](https://img.shields.io/badge/webpack--build--dllplugin-1.2.0-green.svg?style=flat)](https://www.npmjs.com/package/webpack-build-dll-plugin)
[![npm](https://img.shields.io/badge/dowloads-300%2B-blue.svg)](https://www.npmjs.com/package/webpack-build-dll-plugin)
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
