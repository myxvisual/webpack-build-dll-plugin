const path = require('path')
const fs = require('fs')
const { exec } = require('child_process')

function WebpackBuildDllPlugin(options) {
	const defaultOptions = {
		dllConfigPath: '',
		forceBuild: false
	}
	this.options = { ...defaultOptions, ...options }
}

function logger(error, stdout, stderr) {
	console.log(stdout)
}

WebpackBuildDllPlugin.prototype.apply = function(compiler) {
	const options = this.options
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
				exec(`cross-env NODE_ENV=${process.env.NODE_ENV || 'development'} webpack --config ${dllConfigPath}`, logger)
			} else {
				console.log('[webpack-build-dll-plugin] DllReference is already builded.')
			}
		} else {
			throw Error('[webpack-build-dll-plugin] Not Found dllConfigPath.')
		}
	}
}

module.exports = WebpackBuildDllPlugin
