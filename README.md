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
    new WebpackBuildDllPlugin({
        dllConfigPath: './webpack.dll.config.js', // Your Dll Config Path, Support Absolute Path
        forceBuild: false // default is false, if {true} it will build DllReference in once upon starting Webpack
    }), // Add Plugin BuildPlugin Before your DllReference Plugin
    new webpack.DllReferencePlugin({
      context: `./${outputPath}`,
      manifest: require(`./${outputPath}/${publicPath}/vendors-manifest${__DEV__ ? '.dev' : '.prod'}.json`)
    })
  ]
};
```
