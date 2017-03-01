Installation
------------
Install the plugin with npm:
```shell
$ npm i webpack-build-dll-plugin -D
```
Basic Usage
-----------

The plugin will generate an HTML5 file for you that includes all your webpack
bundles in the body using `script` tags. Just add the plugin to your webpack
config as follows:

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
    })
  ]
};
```
