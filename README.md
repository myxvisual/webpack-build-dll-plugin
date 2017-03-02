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
      // forceBuild: default is false, if {true} it will build DllReference in once upon starting Webpack.
      forceBuild: false
    }),
    new webpack.DllReferencePlugin({
      context: `./${outputPath}`,
      manifest: require(`./${outputPath}/${publicPath}/vendors-manifest${__DEV__ ? '.dev' : '.prod'}.json`)
    })
  ]
};
```
