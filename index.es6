const path = require('path')
const fs = require('fs')
const async = require('async')
const DllPlugin = require('webpack/lib/DllPlugin')
const { execSync } = require('child_process')
const { green, yellow, red } = require('chalk')

const rootPath = process.cwd()
const cacheDependenciesFile = path.join(__dirname, '_dependencies_cache.json')
const packageJSONFile = path.join(__dirname, '../../package.json')

function WebpackBuildDllPlugin(newOptions) {
	const defaultOptions = { dllConfigPath: '', forceBuild: false }
	const options = { ...defaultOptions, ...newOptions }
	this.options = options

	let { dllConfigPath } = options
	if (dllConfigPath) {
		dllConfigPath = path.isAbsolute(dllConfigPath) ? dllConfigPath : path.join(rootPath, dllConfigPath)
		if (!fs.existsSync(dllConfigPath)) {
			throw Error('[webpack-build-dll-plugin] Not Found DllConfigPath.\n')
		}
	} else {
		throw Error('[webpack-build-dll-plugin] Please set DllConfigPath.\n')
	}

	const dllConfig = require(dllConfigPath)
	const configKeys = ['entry', 'output', 'plugins']
	for (const configKey of configKeys) {
		if (!configKey in dllConfig) {
			throw Error(`DllReference config is required: ${configKey}`)
		}
	}

	const { entry, output, plugins } = dllConfig
	let dllPlugin
	for (const plugin of plugins) {
		if (plugin instanceof DllPlugin) {
			dllPlugin = plugin
			break
		}
	}

	if (dllPlugin === void 0) {
		throw Error('Not Found DllReference Plugin.')
	}

	const entryNames = Object.keys(entry)
	const buildJSFiles = []
	const manifestFiles = []
	for (const entryName of entryNames) {
		buildJSFiles.push(
			getJoinPaths(rootPath, output.path, output.filename.replace('[name]', entryName) )
		)
		manifestFiles.push(
			getJoinPaths(rootPath, dllPlugin.options.path.replace('[name]', entryName))
		)
	}
	const allBuildFiles = [...buildJSFiles, ...manifestFiles]
	if (options.forceBuild || !allBuildFiles.every(buildFile => fs.existsSync(buildFile))) {
		buildDllReferenceFiles(dllConfigPath)
	} else {
		checkDependencies(dllConfigPath)
	}
}

function buildDllReferenceFiles(dllConfigPath) {
	console.log(green(
		execSync(`cross-env NODE_ENV=${process.env.NODE_ENV || 'development'} webpack --config ${dllConfigPath}`)
	))
	fs.readFile(packageJSONFile, 'utf8', (err, data) => {
		if (!err) {
			fs.writeFile(cacheDependenciesFile, JSON.stringify(JSON.parse(data).dependencies || {}))
		}
	})
	console.log(yellow('[webpack-build-dll-plugin] DllReference is builded.\n'))
}

function getJoinPaths(rootPath, ...joinPaths) {
	return path.join(rootPath, ...joinPaths.map(joinPath => (
		path.isAbsolute(joinPath) ? path.relative(joinPath, rootPath) : joinPath
	)))
}

function checkDependencies(dllConfigPath) {
	console.log(yellow('[webpack-build-dll-plugin] DllReference Files is already builded.\n'))
	console.log(yellow('[webpack-build-dll-plugin] Now Checking Manifest Files Different...\n'))
	const existPackageJSONFile = fs.existsSync(packageJSONFile)
	const existCacheDependenciesFile = fs.existsSync(cacheDependenciesFile)

	if (existPackageJSONFile && existCacheDependenciesFile) {
		const dependencies = JSON.parse(fs.readFileSync(packageJSONFile)).dependencies
		const oldDependencies = JSON.parse(fs.readFileSync(cacheDependenciesFile))
		const dependenciesNames = Object.keys(dependencies)
		const oldDependenciesNames = Object.keys(oldDependencies)
		if (dependenciesNames.length !== oldDependenciesNames.length) {
			buildDllReferenceFiles(dllConfigPath)
		} else {
			let isSameDependencies = true
			for (const name of dependenciesNames) {
				if (dependencies[name] !== oldDependencies[name]) {
					console.log(green('[webpack-build-dll-plugin] your package.json dependencies is changed, will rebuild DllReference.\n'))
					buildDllReferenceFiles(dllConfigPath)
					isSameDependencies = false
					break
				}
			}
			if (isSameDependencies) {
				console.log(green('[webpack-build-dll-plugin] your package.json dependencies is look the same, DllReference will not rebuild.\n'))
			}
		}
	} else {
		if (!existPackageJSONFile) {
			console.error(red('[webpack-build-dll-plugin] Cannot find package.json file...\n'))
		}
		if (!existCacheDependenciesFile) {
			console.log(yellow('[webpack-build-dll-plugin] Cannot find oldDependencies data, will rebuild DllReference & dependencies cache data...\n'))
			buildDllReferenceFiles(dllConfigPath)
		}
	}
}

WebpackBuildDllPlugin.prototype.apply = function(compiler) {}

module.exports = WebpackBuildDllPlugin
