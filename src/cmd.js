'use strict';
/***
 ***  jshint -W020
 ***/
require = require('jsio');
/* jshint +W020 */
require('./devkit/core/src/globals');

var optimist = require('optimist');
var pckg = require('../package.json');

const Loki = require('lokijs');
const fs = require('fs');
const path = require('path');
const apps = require('./devkit/core/src/apps');
// ---------------------------------------------------------------------------------------------------------------------
const ff = require('ff');
const builder = require('./devkit/core/src/build');
const express = require('express');
var color = require('cli-color');
// ---------------------------------------------------------------------------------------------------------------------
if (!fs.existsSync('local-fs.db')) {
    console.log('Creating file local-fs.db');
    fs.writeFileSync('local-fs.db', '{}');
}

// ---------------------------------------------------------------------------------------------------------------------
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// ---------------------------------------------------------------------------------------------------------------------
var fileMapper;
var localFileSystem;
var db;
var AVAILABLE_TEMPLATES = {
    DEFAULT: 'default',
    BABYLONJS: 'babylonjs',
    FLUX: 'flux',
    EMPTY: 'empty'
};
var LocalFileSystem = function () {
    this.localWorkspacesPath = path.join(__dirname, '..', 'workspaces');
    this.localDevkitPath = path.join(__dirname, 'devkit');
    this.workspaceMapper = {};
    this.workspaceMapperByPid = {};
    this.defaultProjectRootFolderName = 'root';
};
LocalFileSystem.prototype.createWokspaceFolderSync = function (folderName, uid) {
    // save mapper
    localFileSystem.workspaceMapper[uid] = folderName;
    fileMapper.insert({
        uid: uid,
        workspace: folderName,
        projects: []
    });
    db.saveDatabase();

    var appPath = path.join(this.localWorkspacesPath, folderName);
    if (!fs.existsSync(appPath)) {
        fs.mkdirSync(appPath);
        fs.mkdirSync(path.join(appPath, 'builds'));
        return true;
    } else {
        return false;
    }
};
LocalFileSystem.prototype.createProjectFolderSync = function (workspaceFolder, folderName) {
    var appPath = path.join(this.localWorkspacesPath, workspaceFolder, folderName);
    if (!fs.existsSync(appPath)) {
        fs.mkdirSync(appPath);
        this.workspaceMapperByPid[folderName] = workspaceFolder;
        // save mapper
        var workspaceMapper = fileMapper.findOne({workspace: workspaceFolder});
        if (!!workspaceMapper) {
            workspaceMapper.projects.push(folderName);
            fileMapper.update(workspaceMapper);
            db.saveDatabase();
        }
        return appPath;
    } else {
        return false;
    }
};
LocalFileSystem.prototype.getDevkitTemplatePath = function (template) {
    var templateName;
    switch (template) {
        case AVAILABLE_TEMPLATES.BABYLONJS:
            templateName = 'babylonjs';
            break;
        case AVAILABLE_TEMPLATES.EMPTY:
            templateName = 'ofs-empty';
            break;
        case AVAILABLE_TEMPLATES.FLUX:
            templateName = 'ofs-flux';
            break;
        default: // AVAILABLE_TEMPLATES.DEFAULT
            templateName = 'ofs';
            break;
    }

    return path.join(this.localDevkitPath, 'cache', 'templates', templateName);
};
LocalFileSystem.prototype.getNewProjectPath = function (basePath) {
    return path.join(basePath, this.defaultProjectRootFolderName);
};
LocalFileSystem.prototype.getProjectPath = function (workspaceFolder, projectFolder) {
    var basePath = path.join(this.localWorkspacesPath, workspaceFolder, projectFolder);
    return path.join(basePath, this.defaultProjectRootFolderName);
};
// ---------------------------------------------------------------------------------------------------------------------
var portMap = {};
var mountApp = function (baseApp, appPath, outputPath, cb) {
    if (appPath in portMap) {
        return cb(null, portMap[appPath].res);
    }
    var simulatorApp = express();
    // no cache for simulator
    simulatorApp.use(function (req, res, next) {
        res.header('Cache-Control', 'no-cache');
        next();
    });

    simulatorApp.use('/', express.static(outputPath));

    var route = '/apps' + generateRoute(appPath);
    baseApp.use(route, simulatorApp);
    portMap[appPath] = {
        res: {url: route},
        middleware: simulatorApp
    };
    cb && cb(null, portMap[appPath].res);
};
// tracks used route uuids
var _routes = {};
var _routeMap = {};

// create a unique route hash from the app path
function generateRoute(appPath) {
    if (appPath in _routeMap) {
        return _routeMap[appPath];
    }

    // compute a hash
    var hash = 5381;
    var i = appPath.length;
    while (i) {
        hash = (hash * 33) ^ appPath.charCodeAt(--i);
    }
    hash >>> 0;

    // get a unique route
    var route;
    do {
        route = '/' + hash.toString(36) + '/';
    } while ((route in _routes) && ++hash);
    _routes[route] = true;
    _routeMap[appPath] = route;
    return route;
}

// ---------------------------------------------------------------------------------------------------------------------
function deleteFile(dir, file) {
    return new Promise(function (resolve, reject) {
        var filePath = path.join(dir, file);
        fs.lstat(filePath, function (err, stats) {
            if (err) {
                return reject(err);
            }
            if (stats.isDirectory()) {
                resolve(deleteDirectory(filePath));
            } else {
                fs.unlink(filePath, function (err) {
                    if (err) {
                        return reject(err);
                    }
                    resolve();
                });
            }
        });
    });
};

function deleteDirectory(dir) {
    return new Promise(function (resolve, reject) {
        fs.access(dir, function (err) {
            if (err) {
                return reject(err);
            }
            fs.readdir(dir, function (err, files) {
                if (err) {
                    return reject(err);
                }
                Promise.all(files.map(function (file) {
                    return deleteFile(dir, file);
                })).then(function () {
                    fs.rmdir(dir, function (err) {
                        if (err) {
                            return reject(err);
                        }
                        resolve();
                    });
                }).catch(reject);
            });
        });
    });
};

function copyFileSync(source, target) {

    var targetFile = target;

    //if target is a directory a new file with the same name will be created
    if (fs.existsSync(target)) {
        if (fs.lstatSync(target).isDirectory()) {
            targetFile = path.join(target, path.basename(source));
        }
    }

    fs.writeFileSync(targetFile, fs.readFileSync(source));
}

function copyFolderRecursiveSync(source, target) {
    var files = [];

    //check if folder needs to be created or integrated
    var targetFolder = path.join(target, path.basename(source));
    if (!fs.existsSync(targetFolder)) {
        fs.mkdirSync(targetFolder);
    }

    //copy
    if (fs.lstatSync(source).isDirectory()) {
        files = fs.readdirSync(source);
        files.forEach(function (file) {
            var curSource = path.join(source, file);
            if (fs.lstatSync(curSource).isDirectory()) {
                copyFolderRecursiveSync(curSource, targetFolder);
            } else {
                copyFileSync(curSource, targetFolder);
            }
        });
    }
}

var onAfterBuildExtend = function (opts, cb) {
    opts.manifest = JSON.parse(fs.readFileSync(path.join(localFileSystem.getProjectPath(localFileSystem.workspaceMapperByPid[opts.pid], opts.pid), 'manifest.json'), 'utf8'));
    // - copy workers into root folder
    var workersPath = path.join(localFileSystem.getProjectPath(localFileSystem.workspaceMapperByPid[opts.pid], opts.pid), 'src', 'workers');
    if (!!fs.existsSync(workersPath)) {
        copyFolderRecursiveSync(workersPath, opts.output);
    }
    // - icons
    var devkitBuildTemplate = path.join(localFileSystem.getDevkitTemplatePath(), '../', '../', 'build-template');
    copyFolderRecursiveSync(path.join(devkitBuildTemplate, 'icons'), opts.output);
    // - splash
    copyFolderRecursiveSync(path.join(devkitBuildTemplate, 'splash'), opts.output);
    // - bootstrap.js
    copyFileSync(path.join(devkitBuildTemplate, 'bootstrap.js'), opts.output);
    // - index.html
    copyFileSync(path.join(devkitBuildTemplate, 'index.html'), opts.output);
    var source = path.join(opts.output, 'index.html');
    var content = fs.readFileSync(source, 'utf8');
    content = content.replace('GAME_TITLE', opts.manifest.title);
    content = content.replace('GAME_TITLE_METADATA', opts.manifest.title);
    fs.writeFileSync(source, content);


    // - manifest PWA
    copyFileSync(path.join(devkitBuildTemplate, 'manifest.json'), opts.output);
    source = path.join(opts.output, 'manifest.json');
    content = fs.readFileSync(source, 'utf8');
    content = content.replace('TEMPLATE_NAME', opts.manifest.title);
    content = content.replace('TEMPLATE_SHORT_NAME', opts.manifest.shortName);
    content = JSON.parse(content);

    var extraManifest = (opts.extendedConfig || {}).manifestData;
    for (var prop in extraManifest) {
        content[prop] = extraManifest[prop];
    }

    fs.writeFileSync(source, JSON.stringify(content));
    // - config.json
    copyFileSync(path.join(devkitBuildTemplate, 'config.json'), opts.output);
    source = path.join(opts.output, 'config.json');
    var config = JSON.parse(fs.readFileSync(source, 'utf8'));
    config.appID = opts.manifest.appID;
    // config.supportedOrientations = opts.manifest.supportedOrientations;
    config.shortName = opts.manifest.shortName;
    config.title = opts.manifest.title;
    config.modules = {
        'fixedAspectRatio': opts.manifest.addons.fixedAspectRatio,
        'aspectRatio': opts.manifest.addons.aspectRatio,
        'dpi': null,
        'canvasBackgroundColor': opts.manifest.addons.canvasBackgroundColor || 'transparent',
        'engineOpts': opts.manifest.addons.engineOpts,
        'plugins': opts.manifest.addons.plugins,
        'piggyBank': opts.manifest.addons.piggyBank,
        'build': opts.version + '(' + Date.now() + ')',
        'preload': opts.manifest.addons.preload,
        'scripts': opts.manifest.addons.scripts || [],
        'spritesheetsVersion': opts.version || '0.0.1',
        'fonts': opts.manifest.addons.fonts || [],
        'extended': (opts.extendedConfig || {}).config || (opts.manifest.addons.extended || {}),
        'sounds': opts.manifest.addons.sounds,
        'i18n': opts.manifest.addons.i18n,
        'wait4It': opts.manifest.addons.wait4It
    };
    var spritesPath = path.join(opts.output, 'spritesheets' + '.' + (opts.version));
    if (!!fs.existsSync(spritesPath)) {
        deleteDirectory(spritesPath).then(function () {
            fs.renameSync(path.join(opts.output, 'spritesheets'), path.join(opts.output, 'spritesheets' + '.' + (opts.version)));

            fs.writeFileSync(source, JSON.stringify(config));
            // -- remove game.html
            if (fs.existsSync(path.join(opts.output, 'game.html'))) {
                fs.unlinkSync(path.join(opts.output, 'game.html'));
            }
            // -- remove web-app-manifest.json
            if (fs.existsSync(path.join(opts.output, 'web-app-manifest.json'))) {
                fs.unlinkSync(path.join(opts.output, 'web-app-manifest.json'));
            }
            cb && cb(opts);
        });
    } else {
        if (!!fs.existsSync(path.join(opts.output, 'spritesheets'))) {
            fs.renameSync(path.join(opts.output, 'spritesheets'), path.join(opts.output, 'spritesheets' + '.' + (opts.version)));
        }
        fs.writeFileSync(source, JSON.stringify(config));
        // -- remove game.html
        if (fs.existsSync(path.join(opts.output, 'game.html'))) {
            fs.unlinkSync(path.join(opts.output, 'game.html'));
        }
        // -- remove web-app-manifest.json
        if (fs.existsSync(path.join(opts.output, 'web-app-manifest.json'))) {
            fs.unlinkSync(path.join(opts.output, 'web-app-manifest.json'));
        }
        cb && cb(opts);

    }
};
// ---------------------------------------------------------------------------------------------------------------------
// Command line invocation.
var COMMANDS = {
    VERSION: 'version',
    INIT: 'init',
    CREATE: 'create',
    LIST: 'list',
    DEV: 'dev',
    BUILD: 'build',
    HELP: 'help'

};
var luid = '_stdln';
if (require.main === module) {
    new (function () {

        localFileSystem = new LocalFileSystem();
        const __onLoad = function (cb) {
            fileMapper = db.getCollection('fileMapper');
            if (fileMapper === null) {
                fileMapper = db.addCollection('fileMapper');
            }
            var entryCount = fileMapper.count();
            if (entryCount > 0) {
                // populate filesystem mapper
                var maps = fileMapper.find({timestamp: {$lte: Date.now()}});
                var data;
                var uid;
                var workspace;
                for (var i in maps) {
                    data = maps[i];
                    uid = data.uid || data.pid;
                    workspace = data.workspace;
                    localFileSystem.workspaceMapper[uid] = workspace;
                    for (var t in data.projects) {
                        localFileSystem.workspaceMapperByPid['' + data.projects[t]] = workspace;
                    }
                }
                if (!fs.existsSync(localFileSystem.localWorkspacesPath)) {
                    console.info('Workspace folder not found... creating!');
                    fs.mkdirSync(localFileSystem.localWorkspacesPath);
                }
            } else {
                if (!fs.existsSync(localFileSystem.localWorkspacesPath)) {
                    console.info('Workspace folder not found... creating!');
                    fs.mkdirSync(localFileSystem.localWorkspacesPath);
                }
            }
            cb && cb();
        };
        this.exec = function () {
            const usageStr = 'usage: npm run cmd <command> [<args>]';
            var __args = optimist.argv._;
            const cmd = (__args[0]);
            switch (cmd) {
                case COMMANDS.VERSION:
                    console.log('[OFS-DEVKIT-LEAF]', 'ver.', pckg.version || '0.0.0 -a', '\n\n');
                    break;
                case COMMANDS.INIT:
                    db = new Loki('local-fs.db', {
                        autoload: true,
                        autoloadCallback: function () {
                            __onLoad(function () {
                                // start standalone account if not yet started
                                var workspaceUUID = uuidv4() + '_lcl';
                                if (localFileSystem.workspaceMapper[luid] !== void 0) {
                                    workspaceUUID = localFileSystem.workspaceMapper[luid];
                                }
                                localFileSystem.createWokspaceFolderSync(workspaceUUID, luid);
                            });
                        },
                        autosave: false
                    });
                    break;
                case COMMANDS.CREATE:
                    db = new Loki('local-fs.db', {
                        autoload: true,
                        autosave: false,
                        autoloadCallback: function () {
                            __onLoad(function () {
                                if (localFileSystem.workspaceMapper[luid] !== void 0) {
                                    var title = (__args[1] || 'untitled').toLowerCase().trim().split(' ').join('-');
                                    var pid = title;
                                    var availableTemplates = [];
                                    for (var KEY in AVAILABLE_TEMPLATES) {
                                        availableTemplates.push(AVAILABLE_TEMPLATES[KEY]);
                                    }
                                    console.error.apply(console, [color.green('[Creating new  project... '), '[', title, ']']);
                                    var exists = (availableTemplates.indexOf(__args[2]) > -1);
                                    if (exists || __args[2] === void 0) {
                                        console.error.apply(console, [color.green('[TEMPLATE] '), __args[2] || AVAILABLE_TEMPLATES.BABYLONJS]);
                                    } else {
                                        console.error.apply(console, [color.red('[TEMPLATE] '), '--template not found']);
                                        console.error.apply(console, [color.yellow('[TEMPLATES_LIST] '), availableTemplates], '\n\n');
                                        console.log('\n');
                                        return;
                                    }
                                    var templateName = exists ? __args[2] : AVAILABLE_TEMPLATES.DEFAULT;
                                    var appPath = localFileSystem.createProjectFolderSync(localFileSystem.workspaceMapper[luid], pid);
                                    if (appPath) {
                                        return Promise.bind(this).then(function () {
                                            return apps.create(localFileSystem.getNewProjectPath(appPath), {
                                                type: 'local',
                                                path: localFileSystem.getDevkitTemplatePath(templateName)
                                            });
                                        }).then(function () {
                                            var appPath = localFileSystem.getProjectPath(localFileSystem.workspaceMapperByPid[pid], pid);

                                            var filename = 'manifest.json';
                                            var filePath = path.join(appPath, filename);
                                            var template = JSON.parse(fs.readFileSync(path.join(localFileSystem.getDevkitTemplatePath(templateName), filename), 'utf8'));

                                            var projectManifest = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                                            template.appID = projectManifest.appID;
                                            template.studio = projectManifest.studio;
                                            template.supportedOrientations = projectManifest.supportedOrientations;
                                            template.title = title;
                                            template.shortName = title.trim() || 'untitled';
                                            template.addons.piggyBank = {
                                                'prefix': uuidv4(),
                                                'storageKey': uuidv4()
                                            };

                                            fs.writeFileSync(filePath, JSON.stringify(template));
                                            return new Promise(function () {
                                                console.log({
                                                    description: 'New project created in folder: ' + appPath
                                                });
                                            });
                                        }).catch(function (err) {
                                            console.error({
                                                message: 'Internal Error',
                                                description: err
                                            });
                                        });
                                    } else {
                                        console.log({
                                            message: 'Err',
                                            description: 'The folder your are trying to create already exists'
                                        });
                                    }
                                } else {
                                    console.log({
                                        status: 'Err',
                                        message: 'No workspace found',
                                        description: 'Workspace not found - Run \'npm run init\' before creating a project'
                                    });
                                }
                            });
                        }
                    });
                    break;
                case COMMANDS.LIST:
                    db = new Loki('local-fs.db', {
                        autoload: true,
                        autosave: false,
                        autoloadCallback: function () {
                            __onLoad(function () {
                                var projects = [];
                                for (var folderName in localFileSystem.workspaceMapperByPid) {
                                    projects.push({
                                        name: folderName,
                                        path: localFileSystem.getProjectPath(localFileSystem.workspaceMapperByPid[folderName], folderName)
                                    });
                                }
                                if (projects.length > 0) {
                                    console.info(projects);
                                } else {
                                    console.info('No projects found. \nRun \'npm run create <your-app-name>\' to start\n\n');
                                }
                            });
                        }
                    });
                    break;
                case COMMANDS.DEV:
                    db = new Loki('local-fs.db', {
                        autoload: true,
                        autosave: false,
                        autoloadCallback: function () {
                            __onLoad(function () {
                                var pid = __args[1]; // app name
                                var workspace = localFileSystem.workspaceMapperByPid[pid];
                                if (workspace === void 0) {
                                    console.error.apply(console, [color.red('[ERR] '), 'App not found or missing app name\n\n']);
                                    return;
                                }
                                var __path = localFileSystem.getProjectPath(workspace, pid);
                                var filename = 'manifest.json';
                                var filePath = path.join(__path, filename);
                                var projectManifest = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                                var args = {
                                    appPath: __path,
                                    buildOpts: {
                                        target: 'browser-desktop',
                                        scheme: 'debug',
                                        debug: true,
                                        simulated: true,
                                        initialImport: projectManifest.initialImport
                                    }
                                };
                                var f = ff(this,
                                    function () {
                                        builder.build(args.appPath, args.buildOpts, f());
                                    },
                                    function (build) {
                                        var app = express();
                                        var server = require('http').createServer(app);
                                        args.PORT = process.env.PORT || 3400;
                                        server.listen(args.PORT);
                                        mountApp(app, args.appPath, build.config.outputPath, f());
                                    })
                                    .error(function (err) {
                                        console.error(err);
                                    }).success(function () {
                                        var res = {
                                            localPath: args.appPath,
                                            running: 'http://localhost:' + args.PORT + portMap[args.appPath].res.url + 'game.html'
                                        };

                                        const open = require('open');
                                        console.error.apply(console, [color.green('[ONLINE] '), res]);
                                        console.error.apply(console, [color.green('Opening default browser...')]);
                                        open(res.running);

                                        var chokidar = require('chokidar');
                                        var locked = false;
                                        chokidar.watch('.', {
                                            cwd: args.appPath,
                                            ignored: ['build/*', 'debug/*/*', '.buildInfo']
                                        }).on('change', (filePath) => {
                                            if (!locked
                                                && !filePath.includes('debug')
                                                && !filePath.includes('build')
                                                && !filePath.includes('.build')) {
                                                console.log('   !! File ' + filePath + ' was modified.');
                                                locked = true;
                                                builder.build(args.appPath, args.buildOpts, () => {
                                                    locked = false;
                                                });
                                            }
                                        });

                                    });
                            });
                        }
                    });
                    break;
                case COMMANDS.BUILD:
                    db = new Loki('local-fs.db', {
                        autoload: true,
                        autosave: false,
                        autoloadCallback: function () {
                            __onLoad(function () {
                                var pid = __args[1]; // app name
                                var workspace = localFileSystem.workspaceMapperByPid[pid];
                                if (workspace === void 0) {
                                    console.error.apply(console, [color.red('[ERR] '), 'App not found or missing app name\n\n']);
                                    return;
                                }

                                var appPath = localFileSystem.getProjectPath(workspace, pid);

                                var filename = 'manifest.json';
                                var filePath = path.join(appPath, filename);
                                var projectManifest = JSON.parse(fs.readFileSync(filePath, 'utf8'));

                                var args = {
                                    appPath: appPath,
                                    buildOpts: {
                                        target: 'browser-desktop',
                                        scheme: 'release',
                                        debug: false,
                                        simulated: false,
                                        createSpritesheets: true,
                                        compressImages: false,
                                        initialImport: projectManifest.initialImport
                                    }
                                };
                                builder.build(args.appPath, args.buildOpts, function (err, build) {
                                    if (err) {
                                        console.error(err);
                                        process.exit(500);
                                    } else {
                                        onAfterBuildExtend({
                                            pid: pid,
                                            version: '0.0.1',
                                            output: build.config.outputPath,
                                            extendedConfig: {}
                                        }, function () {
                                            console.info('\n\n', 'Output location:',build.config.outputPath, '\n');
                                            process.exit(200);
                                        });
                                    }
                                });
                            });
                        }
                    });
                    break;
                case COMMANDS.HELP:
                default:
                    console.log(optimist.usage(usageStr).help());
                    break;
            }
        };
    })().exec();
}
// ---------------------------------------------------------------------------------------------------------------------
