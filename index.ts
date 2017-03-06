import * as path from "path";
import * as fs from "fs";
import { execSync } from "child_process";
const DllPlugin = require("webpack/lib/DllPlugin");
const { green, yellow, red } = require("chalk");

type Options = { dllConfigPath: string, forceBuild?: boolean };

const rootPath = process.cwd();
const cacheFile = path.join(__dirname, "_cache.json");
const cacheData: { entry?: any, dependencies?: any } = {
	entry: {},
	dependencies: {}
};
const packageFile = path.join(__dirname, "../../package.json");
let packageData: any = {};
let dllConfigPath: string;

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

	const dllConfig: any = require(dllConfigPath);
	const configKeys = ["entry", "output", "plugins"];
	for (const configKey of configKeys) {
		if (!(configKey in dllConfig)) {
			throw Error(`DllReference config is required: ${configKey}`);
		}
	}

	const { entry, output, plugins } = dllConfig;
	if (Array.isArray(entry)) {
		throw new Error("DllPlugin: supply an Array as entry");
	}

	let dllPlugin;
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
		const entryNames = Object.keys(entry);
		const buildJSFiles = [];
		const manifestFiles = [];

		for (const entryName of entryNames) {
			buildJSFiles.push(
				getJoinPaths(rootPath, output.path, output.filename.replace("[name]", entryName) )
			);
			manifestFiles.push(
				getJoinPaths(rootPath, dllPlugin.options.path.replace("[name]", entryName))
			);
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
}

function getJoinPaths(rootPath: string, ...joinPaths: string[]) {
	return path.join(rootPath, ...joinPaths.map(joinPath => (
		path.isAbsolute(joinPath) ? path.relative(joinPath, rootPath) : joinPath
	)));
}

function buildDllReferenceFiles() {
	console.log(green(
		execSync(`webpack --config ${dllConfigPath}`)
	));
	console.log(yellow("[webpack-build-dll-plugin] DllReference is builded.\n"));
	fs.writeFile(cacheFile, JSON.stringify(cacheData, null, 2));
}

function checkEntryModules(entry: any) {
	console.log(yellow("[webpack-build-dll-plugin] DllReference files is already builded.\n"));
	console.log(yellow("[webpack-build-dll-plugin] now checking entry modules & dependencies different...\n"));

	const existPackageFile = fs.existsSync(packageFile);
	const existCacheFile = fs.existsSync(cacheFile);

	if (!existPackageFile) {
		console.error(red("[webpack-build-dll-plugin] cannot find your package.json file in project...\n"));
	}

	if (!existCacheFile) {
		console.log(yellow("[webpack-build-dll-plugin] cannot find old cache data, will rebuild new DllReference & new entry modules & dependencies cache data...\n"));
		buildDllReferenceFiles();
	}

	if (existPackageFile && existCacheFile) {
		try {
			packageData = JSON.parse(fs.readFileSync(packageFile, "utf8"));
		} catch (error) { console.error(red(error)); }
		const entryClone = { ...entry };
		for (let entryName in entryClone) {
			entryClone[entryName] = entryClone[entryName].map((moduleName: string) => ({
				[moduleName]: packageData.dependencies[moduleName] || ""
			})).reduce((prevObj: any, currObj: any) => ({ ...prevObj, ...currObj }), {});
		}
		cacheData.entry = entryClone;
		cacheData.dependencies = packageData.dependencies;

		let oldCacheData: any = {};
		let isSameEntry = true;
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

		if (oldEntryNames.length === entryNames.length) {
			for (const entryName of entryNames) {
				if (oldEntryNames.indexOf(entryName) === -1) {
					isSameEntry = false;
					break;
				}
			}
		} else {
			isSameEntry = false;
		}

		if (isSameEntry) {
			for (const entryName of entryNames) {
				const entryModules = cacheData.entry[entryName];
				const oldEntryModules = oldCacheData.entry[entryName];
				const moduleNames = Object.keys(entryModules);
				const oldModuleNames = Object.keys(oldEntryModules);

				if (moduleNames.length === oldModuleNames.length) {
					for (const moduleName of moduleNames) {
						if (entryModules[moduleName] !== oldEntryModules[moduleName]) {
							console.log(moduleName, entryModules[moduleName], oldEntryModules[moduleName])
							isSameModule = false;
							break;
						}
					}
				} else {
					isSameModule = false;
				}
				if (!isSameModule) {
					console.log(yellow(`[webpack-build-dll-plugin] your dllConfig entry ${entryName} modules version is look changed, wil rebuild DllReferenceFiles...`));
					buildDllReferenceFiles();
				}
			}
		} else {
			console.error(red(`now entryNames is: ${entryNames.join(" ")},old entryNames is: ${oldEntryNames.join(" ")}.`));
			console.log(yellow(`[webpack-build-dll-plugin] your dllConfig entryNames is look changed, wil rebuild DllReferenceFiles...`));
			buildDllReferenceFiles();
		}

		if (isSameEntry && isSameModule) {
			console.log(green("[webpack-build-dll-plugin] your entry & modules is look the same, DllReference will not rebuild.\n"));
		}
	}
}

WebpackBuildDllPlugin.prototype.apply = function(compiler: any) {};

module.exports = WebpackBuildDllPlugin;
