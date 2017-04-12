import * as path from "path";
import * as fs from "fs";
import { execSync } from "child_process";
const DllPlugin = require("webpack/lib/DllPlugin");
const { green, yellow, red } = require("chalk");

type Options = { dllConfigPath: string, forceBuild?: boolean };

const propOrIdentity = function(prop: string, input: any): any {
  reutrn input[prop] || input
}

const rootPath = process.cwd();
const cacheFile = path.join(__dirname, "_cache.json");
const cacheData: { entry?: any, dependencies?: any } = {
	entry: {},
	dependencies: {}
};
const packageFile = path.join(__dirname, "../../package.json");

let packageData: any = {};
const outputEntryNames: any[] = [];

let existPackageFile: boolean;
let existCacheFile: boolean;
let oldCacheData: any = {};
let dllConfigPath: string;
let dllPlugin: any;

function WebpackBuildDllPlugin(newOptions: any) {
	const defaultOptions: Options = { dllConfigPath: "", forceBuild: false };
	const options: Options = { ...defaultOptions, ...newOptions };
	this.options = options;
	dllConfigPath = options.dllConfigPath;

	if (dllConfigPath) {
		dllConfigPath = path.isAbsolute(dllConfigPath) ? dllConfigPath : path.join(rootPath, dllConfigPath);
		if (!fs.existsSync(dllConfigPath)) {
			throw Error("[webpack-build-dll-plugin] not found DllConfigPath.\n");
		}
	} else {
		throw Error("[webpack-build-dll-plugin] please set DllConfigPath.\n");
	}

	const dllConfig: any = propOrIdentity('default', require(dllConfigPath));
	const configKeys = ["entry", "output", "plugins"];

	for (const configKey of configKeys) {
		if (!(configKey in dllConfig)) {
			throw Error(`DllReference config is required: ${configKey}`);
		}
	}

	const { entry, plugins } = dllConfig;

	if (Array.isArray(entry)) {
		throw new Error("DllPlugin: supply an Array as entry");
	}

	for (const plugin of plugins) {
		if (plugin instanceof DllPlugin) {
			dllPlugin = plugin;
			break;
		}
	}

	if (dllPlugin === void 0) {
		throw Error("Not Found DllReference Plugin.");
	}

	if (options.forceBuild) {
		console.log(yellow("[webpack-build-dll-plugin] config forceBuild: true, will rebuild DllReference files in starting."));
		buildDllReferenceFiles();
	} else {
		checkFilesBuilded(dllConfig);
	}
}

function checkFilesBuilded(dllConfig: any) {
	const { entry, output } = dllConfig;
	const entryNames = Object.keys(entry);
	const buildJSFiles = [];
	const manifestFiles = [];

	try {
		packageData = JSON.parse(fs.readFileSync(packageFile, "utf8"));
	} catch (error) { console.error(red(error)); }

	const getModuleVersion = (moduleName: string) => {
		const moduleVersion = packageData.dependencies[moduleName];
		if (moduleVersion === void 0) {
			console.error(red(`[webpack-build-dll-plugin] missing ${moduleName} version in your package.json file.\n`));
			return "";
		} else {
			return moduleVersion;
		}
	};

	for (const entryName of entryNames) {
		const outputEntryName = output.filename.replace("[name]", entryName);

		outputEntryNames.push(outputEntryName);

		buildJSFiles.push(
			path.join(...[
				...(path.isAbsolute(output.path) ? [] : [dllConfigPath, "../"]),
				output.path,
				outputEntryName
			])
		);

		const manifestFileName = dllPlugin.options.path.replace("[name]", entryName);
		manifestFiles.push(
			path.isAbsolute(manifestFileName) ? manifestFileName : path.join(dllConfigPath, "../", manifestFileName)
		);

		cacheData.entry[outputEntryName] = entry[entryName].map((moduleName: string) => ({
			[moduleName]: getModuleVersion(moduleName)
		})).reduce((prevObj: any, currObj: any) => ({ ...prevObj, ...currObj }), {});
	}

	const allBuildFiles = [...buildJSFiles, ...manifestFiles];
	let allFileBuilded = true;

	for (const buildFile of allBuildFiles) {
		if (!fs.existsSync(buildFile)) {
			console.error(red(`[webpack-build-dll-plugin] missing build file: ${buildFile}, will rebuild DllReference files.`));
			buildDllReferenceFiles();
			allFileBuilded = false;
			break;
		}
	}
	if (allFileBuilded) {
		checkEntryModules(entry);
	}
}

function checkEntryModules(entry: any) {
	console.log(yellow("[webpack-build-dll-plugin] DllReference files is already builded.\n"));
	console.log(yellow("[webpack-build-dll-plugin] now checking entry modules & dependencies different...\n"));
	existPackageFile = fs.existsSync(packageFile);
	existCacheFile = fs.existsSync(cacheFile);

	if (!existPackageFile) {
		console.error(red("[webpack-build-dll-plugin] cannot find your package.json file in project...\n"));
		return;
	}

	if (!existCacheFile) {
		console.log(yellow("[webpack-build-dll-plugin] cannot find old cache data, will rebuild new DllReference & new entry modules & dependencies cache data...\n"));
		buildDllReferenceFiles();
		return;
	}

	if (existPackageFile && existCacheFile) {
		let isSameModule = true;

		try {
			oldCacheData = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
		} catch (error) { console.error(red(error)); }

		if (!("entry" in oldCacheData && "dependencies" in oldCacheData)) {
			console.log(yellow("[webpack-build-dll-plugin] entry & dependencies is not in cache data, will rebuild DllReferenceFiles...\n"));
			buildDllReferenceFiles();
			return;
		}

		const entryNames = Object.keys(cacheData.entry);
		const oldEntryNames = Object.keys(oldCacheData.entry);

		for (const entryName of entryNames) {
			const entryModules = cacheData.entry[entryName];
			const oldEntryModules = oldCacheData.entry[entryName];

			if (oldEntryNames.indexOf(entryName) > -1) {
				const moduleNames = Object.keys(entryModules);
				const oldModuleNames = Object.keys(oldEntryModules);

				if (moduleNames.length === oldModuleNames.length) {
					for (const moduleName of moduleNames) {
						if (entryModules[moduleName] !== oldEntryModules[moduleName]) {
							isSameModule = false;
							break;
						}
					}
				} else {
					isSameModule = false;
				}
			} else {
				oldCacheData.entry[entryName] = cacheData.entry[entryName];
				cacheData.entry = oldCacheData.entry;
				isSameModule = false;
			}
			if (!isSameModule) {
				console.log(yellow(`[webpack-build-dll-plugin] your dllConfig entry ${entryName} modules version is look changed, wil rebuild DllReferenceFiles...`));
				buildDllReferenceFiles();
			}
		}

		if (isSameModule) {
			console.log(green("[webpack-build-dll-plugin] your entry & modules is look the same, DllReference will not rebuild.\n"));
		}
	}
}

function buildDllReferenceFiles() {
	console.log(green(
		execSync(`webpack --config ${dllConfigPath}`)
	));
	console.log(yellow("[webpack-build-dll-plugin] DllReference is builded.\n"));
	fs.writeFile(cacheFile, JSON.stringify(cacheData, null, 2));
}

WebpackBuildDllPlugin.prototype.apply = function(compiler: any) {};

module.exports = WebpackBuildDllPlugin;
