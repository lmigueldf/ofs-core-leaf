var fs = require('fs');
var path = require('path');
var copy = require('../util/copy');

var Module = require('./Module');

var lockFile = require('../util/lockfile');
var rimraf = require('../util/rimraf');
var logger = require('../util/logging').get('apps');
var stringify = require('../util/stringify');

var ApplicationNotFoundError = require('./errors').ApplicationNotFoundError;
var InvalidManifestError = require('./errors').InvalidManifestError;

var LOCK_FILE = 'devkit.lock';

var APP_TEMPLATE_ROOT = path.join(__dirname, 'templates');
var DEFAULT_TEMPLATE = 'default';

var appFunctions = require('./functions');
var resolveAppPath = appFunctions.resolveAppPath;

var createUUID = function createUUID (a) {
  return a ?
    (a ^ Math.random() * 16 >> a / 4).toString(16) :
    ([1e7]+1e3+4e3+8e3+1e11).replace(/[018]/g, createUUID);
}

var MANIFEST = 'manifest.json';
var App = module.exports = Class(function () {

  this.init = function (root, manifest, lastOpened) {
    trace('Instantiating App with root path:', root);
    this.paths = {
      root: root,
      build: path.join(root, 'build'),
      shared: path.join(root, 'shared'),
      src: path.join(root, 'src'),
      modules: path.join(root, 'modules'),
      resources: path.join(root, 'resources'),
      icons: path.join(root, 'resources', 'icons'),
      lang: path.join(root, 'resources', 'lang'),
      manifest: path.join(root, 'manifest.json')
    };

    if (manifest && manifest.toString() === '[object Object]') {
      this.manifest = manifest;
    } else {
      this.manifest = {};
    }

    this._dependencies = this._parseDeps();
    this.lastOpened = lastOpened || Date.now();
  };

  this.getModules = function () {
    if (!this._modules) {
      this._loadModules();
    }

    return this._modules;
  };

  this.removeModules = function (toRemove) {
    toRemove.forEach(function (moduleName) {
      delete this._modules[moduleName];
    }, this);
  };

  this.getClientPaths = function () {
    var appPath = this.paths.root;
    var paths = {'*': []};
    Object.keys(this.getModules()).forEach(function (moduleName) {
      var module = this._modules[moduleName];
      var clientPaths = module.getClientPaths();
      for (var key in clientPaths) {
        var p = path.relative(
          appPath, path.resolve(module.path, clientPaths[key])
        );
        if (key === '*') {
          paths[key] = paths[key].concat(p);
        } else {
          paths[key] = p;
        }
      }
    }, this);

    return paths;
  };

  // assuming app is loaded, reload the manifest and modules synchronously
  this.reloadSync = function () {
    if (!fs.existsSync(this.paths.manifest)) {
      // app does not exist anymore?
      require('./index').unload(this.paths.root);
    } else {
      logger.log(this.paths.manifest);
      try {
        this.manifest = JSON.parse(
          fs.readFileSync(this.paths.manifest, 'utf8')
        );
      } catch (e) {
        logger.error('Error loading and parsing manifest at',
                     this.paths.manifest);
        throw e;
      }
      if (this._modules) {
        this.reloadModules();
      }
    }
  };

  this.reloadModules = function () {
    this._modules = {};
    this._loadModules();
  };

  this._loadModules = function () {
      var _this = this;
      if (!_this._modules) {
          _this._modules = {};
      }

      var _queue = [];

      function addToQueue(parentPath) {
          function scanDir(basePath) {
              try {
                  return fs.readdirSync(basePath)
                      .map(function (item) {
                          return {
                              path: path.join(basePath, item),
                              parent: parentPath
                          };
                      });

              } catch (e) {
                  // console.error(e);
              }
          }

          _queue.push.apply(_queue, scanDir(path.join(parentPath, 'modules')));
          _queue.push.apply(_queue, scanDir(path.join(parentPath, 'node_modules')));
      }

      /**
       * @One_Flag_Studio
       * Change modules loading rules to use devkit base cached core and
       * cloud available modules for devkit.
       *
       *    - addToQueue(_this.paths.root); // replaced
       */
      var addons = require(path.resolve(_this.paths.root, 'manifest.json')).addons;
      var toLoadModules  =  addons && addons.plugins || [];
      toLoadModules.push('core');

      for(var index in toLoadModules){
          addToQueue(path.join(__dirname, '..', '..', '..', 'devkit_modules', toLoadModules[index]));
      }

      while (_queue[0]) {
          var item = _queue.shift();
          var modulePath = path.resolve(_this.paths.root, item.path);
          var parentPath = path.resolve(_this.paths.root, item.parent);
          var packageFile = path.join(modulePath, 'package.json');

          if (!fs.existsSync(packageFile)) { continue; }

          var packageContents;
          try {
              packageContents = require(packageFile);
          } catch (e) {
              return logger.warn('Module', item.path, 'failed to load');
          }

          if (!packageContents.devkit) { continue; }

          var existingModule = _this._modules[packageContents.name];
          if (existingModule) {
              if (existingModule.version !== packageContents.version) {
                  throw new Error(
                      packageContents.name +
                      ' included twice with different versions:\n' +
                      existingModule.version + ': ' + existingModule.path + '\n' +
                      packageContents.version + ': ' + modulePath);
              }
          } else {
              var name = path.basename(modulePath);
              var version = null;
              var isDependency = (_this.paths.root === parentPath);
              if (isDependency && _this._dependencies[name]) {
                  version = _this._dependencies[name].version;
              }

              _this._modules[name] = new Module({
                  name: name,
                  path: modulePath,
                  parent: parentPath,
                  isDependency: isDependency,
                  version: version,
                  packageContents: packageContents
              });
          }

          addToQueue(modulePath);
      }
  };

  this.getDependency = function (name) {
    return this._dependencies[name];
  };

  this._parseDeps = function () {
    var deps = {};
    var src = this.manifest.dependencies;
    for (var name in src) {
      var url = src[name];
      var pieces = url.split('#', 2);
      deps[name] = {
        url: pieces[0],
        version: pieces[1]
      };
    }

    return deps;
  };

  this._stringifyDeps = function () {
    var deps = this.manifest.dependencies = {};
    Object.keys(this._dependencies).forEach(function (name) {
      var dep = this._dependencies[name];
      deps[name] = (dep.url || '') + '#' + (dep.version || '');
    }, this);
  };

  /* Manifest */

  var DEFAULT_PROTOCOL = 'https';
  var REQUIRED_DEPS = [
    {
      name: 'devkit-core',
      ssh: 'git@github.com:',
      https: 'https://github.com/',
      repo: 'gameclosure/devkit-core',
      tag: ''
    }
  ];

  function getRequiredDeps(protocol) {
    protocol = protocol === 'ssh' ? 'ssh' : 'https';

    var out = {};
    REQUIRED_DEPS.forEach(function (dep) {
      out[dep.name] = dep[protocol] + dep.repo + (dep.tag ? '#' + dep.tag : '');
    });
    return out;
  }

  this.validate = function (opts, cb) {
    trace('validating application');
    if (typeof opts === 'function') {
      cb = opts;
      opts = {};
    }

    if (!opts) { opts = {}; }

    var defaults = {
      appID: createUUID(),
      shortName: opts.shortName || '',
      title: opts.title || opts.shortName || ''
    };

    var changed = false;
    var key;

    // create defaults for anything missing
    for (key in defaults) {
      if (!this.manifest.hasOwnProperty(key)) {
        this.manifest[key] = defaults[key];
        changed = true;
      }
    }

    // ensure required dependencies are set
    var requiredDeps = getRequiredDeps(opts.protocol || 'https');
    if (this.manifest.dependencies) {
      for (key in requiredDeps) {
        if (!this.manifest.dependencies.hasOwnProperty(key)) {
          this.manifest.dependencies[key] = requiredDeps[key];
          changed = true;
        }
      }
    } else {
      this.manifest.dependencies = requiredDeps;
    }

    // if manifest has been changed, save it and update dependencies
    if (changed) {
      this._dependencies = this._parseDeps();
      this._stringifyDeps();
      return this.saveManifest(cb);
    } else {
      return Promise.delay(0).nodeify(cb);
    }
  };

  this.setModuleVersion = function (moduleName, version, cb) {
    return this.validate(null).bind(this).then(function () {
      var dep = this._dependencies[moduleName];
      if (dep && dep.version !== version) {
        dep.version = version;
      }
    }).nodeify(cb);
  };

  this.saveManifest = function (cb) {
    trace('App#saveManifest');
    var writeFile = Promise.promisify(fs.writeFile);
    var data = stringify(this.manifest);
    return writeFile(path.join(this.paths.manifest), data).nodeify(cb);
  };

  this.getPackageName = function() {
    var studio = this.manifest.studio;
    if (studio && studio.domain && this.manifest.shortName) {
      return printf('%(reversedDomain)s.%(shortName)s', {
        reversedDomain: studio.domain.split(/\./g).reverse().join('.'),
        shortName: this.manifest.shortName
      });
    }
    return '';
  };

  this.getId = function () {
    return this.manifest.appID.toLowerCase();
  };

  this.getIcon = function (targetSize) {
    return this.manifest.icon
      || getIcon(this.manifest.android && this.manifest.android.icons,
                 targetSize)
      || getIcon(this.manifest.ios && this.manifest.ios.icons, targetSize)
      || '/resources/icons/defaultIcon.png';

    function getIcon(iconList, targetSize) {
      var sizes = [], closest = null;

      if (iconList) {
        for (var size in iconList) {
          var numSize = parseInt(size);
          if (!Number.isNaN(numSize) && numSize.toString() === size) {
            sizes.push(numSize);
          } else {
            logger.warn('Non integer icon size encountered:', size);
          }
        }

        sizes.sort(function (a, b) { return a < b ? -1 : 1; });

        for (var i = sizes.length - 1; i >= 0; i--) {
          if (sizes[i] <= targetSize) {
            return iconList[sizes[i]];
          }
        }

        if (sizes.length) {
          return iconList[sizes.pop()];
        }
      }

      return null;
    }
  };

  this.createFromTemplate = function (template) {
    // if template is local file, copy it
    if (template.type === 'local') {
      var templatePath = path.normalize(template.path);
      if (fs.existsSync(templatePath) &&
          fs.lstatSync(templatePath).isDirectory()) {
        logger.log('Creating app using local template ' + templatePath);
        return this._copyLocalTemplate(templatePath);
      } else {
        logger.warn('Failed to find template ' + templatePath);
        return this.createFromDefaultTemplate();
      }
    }
  };

  this.createFromDefaultTemplate = function () {
    logger.log('Creating app using default application template');
    var templatePath = path.join(APP_TEMPLATE_ROOT, DEFAULT_TEMPLATE);
    return this._copyLocalTemplate(templatePath);
  };

  this._copyLocalTemplate = function (templatePath) {
    trace('_copyLocalTemplate');

    // read every file/folder in the template
    var projectRoot = this.paths.root;
    var templateFileList = fs.readdirSync(templatePath);
    return copy.path(templatePath, projectRoot);
  };

  this.acquireLock = function (cb) {
    return lockFile.lock(path.join(this.paths.root, LOCK_FILE)).nodeify(cb);
  };

  this.releaseLock = function (cb) {
    return lockFile.unlock(path.join(this.paths.root, LOCK_FILE)).nodeify(cb);
  };

  // defines the public JSON API for DevKit extensions
  this.toJSON = function () {
    var modules = {};
    Object.keys(this.getModules()).forEach(function (moduleName) {
      modules[moduleName] = this._modules[moduleName].toJSON();
    }, this);

    return {
        'id': this.paths.root,
        'lastOpened': this.lastOpened,
        'appId': this.getId(),
        'modules': modules,
        'clientPaths': this.getClientPaths(),
        'paths': merge({}, this.paths),
        'manifest': this.manifest,
        'title': this.manifest.title
      };
  };
});

App.loadFromPath = function loadAppFromPath (appPath, lastOpened) {
  trace('loadAppFromPath');
  trace('\tappPath', appPath);

  if (!appPath) {
    trace('returning early');
    return Promise.reject(new ApplicationNotFoundError());
  }

  appPath = resolveAppPath(appPath);
  var manifestPath = path.join(appPath, MANIFEST);

  return Promise.bind(this).then(function () {
    trace('trying to read manifest from', manifestPath);

    return new Promise(function (resolve, reject) {
      fs.readFile(manifestPath, 'utf8', function (err, res) {
        if (err) { return reject(err); }
        return resolve(res);
      });
    });

  }).catch(function (err) {
    if (err.code === 'ENOENT') {
      trace('returning ApplicationNotFoundError');
      return Promise.reject(new ApplicationNotFoundError(appPath));
    }

    trace('forwarding unexpected error');
    return Promise.reject(err);
  }).then(function (contents) {
    trace('opened manifest');
    var manifest = JSON.parse(contents);
    return manifest;
  }).catch(SyntaxError, function (err) {
    trace('Error parsing manifest in appPath', appPath);
    return Promise.reject(new InvalidManifestError(appPath));
  }).then(function (manifest) {

    // if manifest has no appID, assume this isn't a devkit app
    if ('appID' in manifest === false) {
      return Promise.reject(new ApplicationNotFoundError(appPath));
    } else if (manifest.appID) {
      return Promise.resolve(manifest);
    } else {

      // if manifest has a blank/false/0 appID, generate one and save manifest
      manifest.appID = createUUID();
      var writeFile = Promise.promisify(fs.writeFile);
      var data = stringify(manifest);

      return new Promise(function (resolve, reject) {
        fs.writeFile(path.join(manifestPath), data, function (err, res) {
          if (err) { return reject(err); }
          return resolve(manifest);
        });
      });
    }

  }).then(function (manifest) {
    trace('returning App for appPath', appPath);
    return Promise.resolve(new App(appPath, manifest, lastOpened));
  });
};
