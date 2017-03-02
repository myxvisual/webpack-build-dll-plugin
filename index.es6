const path = require('path')
const fs = require('fs')
const async = require('async')
const DllPlugin = require('webpack/lib/DllPlugin')

const { execSync } = require('child_process')
const { green, yellow } = require('chalk')

function WebpackBuildDllPlugin(options) {
	const defaultOptions = {
		dllConfigPath: '',
		forceBuild: false
	}
	this.options = Object.assign(defaultOptions, options)
	options = this.options
	const rootPath = process.cwd()
	let dllConfigPath = options.dllConfigPath
	if (dllConfigPath) {
		dllConfigPath = path.isAbsolute(options.dllConfigPath) ? options.dllConfigPath : path.join(rootPath, options.dllConfigPath)
		if (!fs.existsSync(dllConfigPath)) {
			throw Error('[webpack-build-dll-plugin] Not Found DllConfigPath.\n')
		}
	} else {
		throw Error('[webpack-build-dll-plugin] Please set DllConfigPath.\n')
	}

	const dllConfig = require(dllConfigPath)

	const { entry, output, plugins } = dllConfig
	let dllPlugin
	for (const plugin of plugins) {
		if (plugin instanceof DllPlugin) dllPlugin = plugin
	}
	if (dllPlugin === void 0) {
		throw Error('Not Found DllReference Plugin.')
	}
	const entryNames = Object.keys(entry)
	const buildJSFiles = []
	const manifestFiles = []
	for (const entryName of entryNames) {
		buildJSFiles.push(
			getAbsolutePath(output.filename.replace('[name]', entryName), output.path, rootPath)
		)
		manifestFiles.push(
			getAbsolutePath(dllPlugin.options.path.replace('[name]', entryName), '', rootPath)
		)
	}
	const allBuildFiles = [...buildJSFiles, ...manifestFiles]
	if (options.forceBuild || !allBuildFiles.every(buildFile => fs.existsSync(buildFile))) {
		console.log(green(
			execSync(`cross-env NODE_ENV=${process.env.NODE_ENV || 'development'} webpack --config ${dllConfigPath}`)
		))
		console.log(yellow('[webpack-build-dll-plugin] DllReference is builded.\n'))
	} else {
		checkLibManifest(dllPlugin, dllConfig)
	}
}

function getAbsolutePath(filePath, joinPath, rootPath) {
	return path.join(rootPath, ...(path.isAbsolute(filePath) ? (
		[path.relative(filePath, rootPath)]
	) : [joinPath, filePath]))
}

WebpackBuildDllPlugin.prototype.apply = function(compiler) {}

function checkLibManifest(dllPlugin, dllConfig) {
	console.log(yellow('[webpack-build-dll-plugin] DllReference Files is already builded.\n'))
	// console.log(yellow('Now Checking Manifest Files Different...\n'))
}

module.exports = WebpackBuildDllPlugin
