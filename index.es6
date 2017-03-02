const path = require('path')
const fs = require('fs')
const { execSync } = require('child_process')
const { green, yellow } = require('chalk')

function WebpackBuildDllPlugin(options) {
	const defaultOptions = {
		dllConfigPath: '',
		forceBuild: false
	}
	options = { ...defaultOptions, ...options }

	this.options = options
	if (options.dllConfigPath) {
		const rootPath = process.cwd()
		const dllConfigPath = path.isAbsolute(options.dllConfigPath) ? options.dllConfigPath : path.join(rootPath, options.dllConfigPath)
		if (fs.existsSync(dllConfigPath)) {
			const dllConfig = require(dllConfigPath)
			const { entry, output } = dllConfig
			let outputPath = output.path
			if (path.isAbsolute(outputPath)) {
				outputPath = path.relative(rootPath, outputPath)
			}
			const firstEntryName = Object.keys(entry)[0]
			const filename = output.filename.replace('[name]', firstEntryName)
			const absolutePath = path.join(rootPath, outputPath, filename)
			if (options.forceBuild || !fs.existsSync(absolutePath)) {
				console.log(green(execSync(`cross-env NODE_ENV=${process.env.NODE_ENV || 'development'} webpack --config ${dllConfigPath}`)))
				console.log(yellow('[webpack-build-dll-plugin] DllReference is builded.\n'))
				return 0
			} else {
				console.log(yellow('[webpack-build-dll-plugin] DllReference is already builded.\n'))
				return 0
			}
		} else {
			throw Error('[webpack-build-dll-plugin] Not Found dllConfigPath.\n')
		}
	}
}

WebpackBuildDllPlugin.prototype.apply = function(compiler) {}

module.exports = WebpackBuildDllPlugin
