const path = require('path')
const fs = require('fs')
const async = require('async')
const DllPlugin = require('webpack/lib/DllPlugin')
const { execSync } = require('child_process')
const { green, yellow } = require('chalk')

const cacheDependenciesFile = path.join(__dirname, '_dependencies_cache.json')
const rootPath = process.cwd()


function WebpackBuildDllPlugin(options) {
	const defaultOptions = {
		dllConfigPath: '',
		forceBuild: false
	}
	this.options = Object.assign(defaultOptions, options)
	options = this.options
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
		runWebpackBuildDll(dllConfigPath)
		fs.readFile(path.join(rootPath, './package.json'), 'utf8', (err, data) => {
			if (!err) {
				fs.writeFile(cacheDependenciesFile, JSON.stringify(JSON.parse(data).dependencies || {}))
			}
		})
	} else {
		checkLibManifest(dllPlugin, dllConfigPath)
	}
}

function runWebpackBuildDll(dllConfigPath) {
	console.log(green(
		execSync(`cross-env NODE_ENV=${process.env.NODE_ENV || 'development'} webpack --config ${dllConfigPath}`)
	))
	console.log(yellow('[webpack-build-dll-plugin] DllReference is builded.\n'))
}

function getAbsolutePath(filePath, joinPath, rootPath) {
	return path.join(rootPath, ...(path.isAbsolute(filePath) ? (
		[path.relative(filePath, rootPath)]
	) : [joinPath, filePath]))
}

WebpackBuildDllPlugin.prototype.apply = function(compiler) {}

function checkLibManifest(dllPlugin, dllConfigPath) {
	console.log(yellow('[webpack-build-dll-plugin] DllReference Files is already builded.\n'))
	console.log(yellow('Now Checking Manifest Files Different...\n'))
	if (fs.existsSync(cacheDependenciesFile)) {
		const dependencies = JSON.parse(fs.readFileSync(path.join(rootPath, './package.json'))).dependencies
		const oldDependencies = JSON.parse(fs.readFileSync(cacheDependenciesFile))
		const dependenciesNames = Object.keys(dependencies)
		const oldDependenciesNames = Object.keys(oldDependencies)
		if (dependenciesNames.length !== oldDependenciesNames.length) {
			runWebpackBuildDll(dllConfigPath)
		} else {
			let isSameDependencies = true
			for (const name of dependenciesNames) {
				if (dependencies[name] !== oldDependencies[name]) {
					console.log(green('[webpack-build-dll-plugin] your package.json is changed, will rebuild DllReference.'))
					runWebpackBuildDll(dllConfigPath)
					isSameDependencies = false
					break
				}
			}
			if (isSameDependencies) {
				console.log(green('[webpack-build-dll-plugin] your package.json dependencies is look the same, DllReference will not build.'))
			}
		}
	}
}

module.exports = WebpackBuildDllPlugin
