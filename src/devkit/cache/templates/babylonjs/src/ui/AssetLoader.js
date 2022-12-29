var namespace = 'AssetLoader';
//-------------------------------------------------------------------------------------
jsio('import lib.Callback');
jsio('import lib.PubSub as Emitter');
//-------------------------------------------------------------------------------------
jsio('import src.ui.AudioLoader as AudioLoader');
//-------------------------------------------------------------------------------------
var _cache = {};
var MIME = {
  '.png': 'image',
  '.jpg': 'image',
  '.bmp': 'image',

  '.glb': 'image',
  '.gltf': 'image',

  '.css': 'css',
  '.html': 'html',
  '.mp3': 'audio',
  '.ogg': 'audio',
  '.mp4': 'audio',
  '.3gp': 'audio',
  '.m4a': 'audio',
  '.aac': 'audio',
  '.flac': 'audio',
  '.mkv': 'audio',
  '.wav': 'audio'
};
var Loader = Class(Emitter, function() {

  this.setCanvas = function(canvas) {
    var canvas = this.canvas = canvas;
    canvas.style.zIndex = -1;
    canvas.style.position = "absolute";
    canvas.style.overflow = 'hidden';
    this.ctx = canvas.getContext("2d");
    this.quality = 1.0;
  };
  
  this.destroyCanvas = function(){
    if(this.canvas){
      document.getElementById(this.canvas.id) && document.getElementById(this.canvas.id).remove();
    }
  };

  var globalItemsToLoad = 0;
  var globalItemsLoaded = 0;

  this._map = {};

  // save original map
  this._originalMap = {};

  this._audioMap = {};

  Object.defineProperty(this, "progress", {
    get: function() {
      return globalItemsToLoad > 0 ? globalItemsLoaded / globalItemsToLoad : 1
    }
  });

  this.has = function(src) {
    return this._map[src];
  };

  this.restoreMap = function() {
    this._map = this._originalMap;
  };

  this.getMap = function() {
    return this._map;
  };

  this.getFilePath = function(file) {
    return 'resources/images/' + file;
  };

  /**
   * Adds spritesheets to the image map
   *
   * @param {Object[]} sheets          an array of spritesheet definitions
   * @param {string}   sheets[].f      sprite filename
   * @param {number}   sheets[].x      sprite position x-coordinate (integer)
   * @param {number}   sheets[].y      sprite position y-coordinate (integer)
   * @param {number}   sheets[].w      sprite content width (without margin) (integer)
   * @param {number}   sheets[].h      sprite content height (without margin) (integer)
   * @param {number}   [sheets[].t=0]  sprite transparent margin top
   * @param {number}   [sheets[].r=0]  sprite transparent margin right
   * @param {number}   [sheets[].b=0]  sprite transparent margin bottom
   * @param {number}   [sheets[].l=0]  sprite transparent margin left
   */
  this.addSheets = function(sheets) {
    Object.keys(sheets).forEach(function(name) {
      var sheet = sheets[name];
      sheet.forEach(function(info) {
        this._map[info.f] = {
          sheet: name,
          x: info.x || 0,
          y: info.y || 0,
          w: info.w || 0,
          h: info.h || 0,
          scale: info.s || 1,
          marginTop: info.t || 0,
          marginRight: info.r || 0,
          marginBottom: info.b || 0,
          marginLeft: info.l || 0
        };
      }, this);
    }, this);
    this._originalMap = this._map;
    this._originalSheets = sheets;
  };


  this.addAudioMap = function(map) {
    Object.keys(map).forEach(function(name) {
      this._audioMap[name] = true;
    }, this);
  };

  /**
   * Preload a given resource or array of resources.
   * You can specify a folder name, or even a partial filename,
   * to preload all resources that begin with that prefix.
   * For instance, in a tree like so:
   *
   * resources
   * └── images
   *     ├── boss
   *     │   ├── enemy1.png
   *     │   └── enemy2.png
   *     └── hero
   *         ├── shield.png
   *         └── sword.png
   *
   * You could preload both enemy images in either of the following
   * ways:
   *
   *     ui.resource.loader.preload("resources/images/boss/");
   *     ui.resource.loader.preload("resources/images/boss/enemy");
   *
   * Pass an array of paths to preload all at once. The callback
   * will be called when all resources have finished loading.
   *
   * This works for both images and sounds.
   */
  this.preload = function(pathPrefix, opts, cb) {
    if (typeof opts == 'function') {
      cb = opts;
      opts = undefined;
    }

    // process an array of items, where cb is run at completion of the final one
    if (isArray(pathPrefix)) {
      var chainCb = new lib.Callback();
      pathPrefix.forEach(function(prefix) {
        if (prefix) {
          this.preload(prefix, opts, chainCb.chain());
        }
      }, this);
      cb && chainCb.run(cb);
      return chainCb;
    } else {
      pathPrefix = pathPrefix.replace(/^\//, ''); // remove leading slash
      // if an item is found in the map, add that item's sheet to the group.
      // If there is no sheet in the map (i.e. for sounds), load that file directly.
      var preloadSheets = {};
      var map = this._map;
      for (var uri in map) {
        if (uri.indexOf(pathPrefix) === 0) {
          // sprites have sheet; sounds are just by the filename key itself
          preloadSheets[map[uri] && map[uri].sheet || uri] = true;
        }
      }

      var audioMap = this._audioMap;
      var audioToLoad = {};
      for (var uri in audioMap) {
        if (uri.indexOf(pathPrefix) === 0) {
          audioToLoad[uri] = true;
        }
      }
      var files = Object.keys(preloadSheets);
      files = files.concat(Object.keys(audioToLoad));
      // If no files were specified by the preload command,
      if (files.length == 0) {
        files = [pathPrefix];
      }

      var callback = this._loadGroup(merge({
        resources: files
      }, opts));
      cb && callback.run(cb);
      return callback;
    }
  };

  var _soundLoader = null;
  this.getSound = function(src) {
    if (!_soundLoader) {
      _soundLoader = new AudioLoader();
    }

    if (GLOBAL.NATIVE && GLOBAL.NATIVE.sound && GLOBAL.NATIVE.sound.preloadSound) {
      return NATIVE.sound.preloadSound(src);
    } else {
      return {
        complete: true,
        loader: _soundLoader
      };
    }
  };

  this.getImagePaths = function(prefix) {
    prefix = prefix.replace(/^\//, ''); // remove leading slash
    var images = [];
    var map = this._map;
    for (var uri in map) {
      if (uri.indexOf(prefix) == 0) {
        images.push(uri);
      }
    }
    return images;
  };

  this.getImage = function(src, noWarn) {
    // create the image
    var img = new Image();

    //img.crossOrigin = 'anonymous';

    // find the base64 image if it exists
    if (Image.get) {
      var b64 = Image.get(src);
      if (b64 instanceof Image) {
        return b64;
      }
    }

    if (b64) {
      img.src = b64;
      Image.set(src, img);
    } else {
      if (!noWarn) {
        logger.warn("Preload Warning:", src, "not properly cached!");
      }
      img.src = src;
    }

    return img;
  };

  /**
   * used internally by timestep.Image to seamlessly convert
   * non-sprited image URLs to sprited images. This is here (rather
   * than in timestep.Image) to keep sprite formats in one consistent place.
   */
  this._updateImageMap = function(map, url, x, y, w, h) {
    x = x || 0;
    y = y || 0;
    w = w == undefined ? -1 : w;
    h = h == undefined ? -1 : h;

    var info = this._map[url];
    if (!info || !info.sheet) {
      map.x = x;
      map.y = y;
      map.width = w;
      map.height = h;
      map.scale = 1;
      map.url = url;
      return;
    }

    var scale = info.scale || 1;

    // calculate the source rectangle, with margins added to the edges
    // (disregarding the fact that they may fall off the edge of the sheet)
    map.x = info.x - info.marginLeft;
    map.y = info.y - info.marginTop;
    map.width = info.w + info.marginLeft + info.marginRight;
    map.height = info.h + info.marginTop + info.marginBottom;

    // Add in any source map options passed in to get the actual offsets
    map.x += x * scale;
    map.y += y * scale;
    if (w > 0) {
      map.width = w * scale;
    }
    if (h > 0) {
      map.height = h * scale;
    }

    // now updatea the margins to account for the new source map
    map.marginLeft = Math.max(0, info.x - map.x);
    map.marginTop = Math.max(0, info.y - map.y);
    map.marginRight = Math.max(0, (map.x + map.width) - (info.x + info.w));
    map.marginBottom = Math.max(0, (map.y + map.height) - (info.y + info.h));

    // and re-offset the source map to exclude margins
    map.x += map.marginLeft;
    map.y += map.marginTop;
    map.width -= (map.marginLeft + map.marginRight);
    map.height -= (map.marginTop + map.marginBottom);

    // the scale of the source image, if scaled in a spritesheet
    map.scale = scale;
    map.url = info.sheet;
    return map;
  };

  this._getRaw = function(type, src, copy, noWarn) {
    // always return the cached copy unless specifically requested not to
    if (!copy && _cache[src]) {
      return _cache[src];
    }
    var res = null;
    switch (type) {
      case 'audio':
        res = this.getSound(src);
        break;
      case 'image':
        res = this.getImage(src, noWarn);
        break;
      default:
        //logger.error("Preload Error: Unknown Type", type);
    }
    return (_cache[src] = res);
  };

  // The callback is called for each image in the group with the image
  // source that loaded and whether there was an error.
  //
  // function callback(lastSrc, error, isComplete, numCompleted, numTotal)
  //    where error is true or false and isComplete is true when numCompleted == numTotal

  this._requestedResources = [];

  this.cachedB64URLS = {};
  // default loaded images
  this.cachedB64URLS[this.getFilePath('babylonjs')] = 'data:image/png;base64,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';
  this.cachedB64URLS[this.getFilePath('loader')] = 'data:image/png;base64,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';
  
  this.getCachedImage = function(imageName){
    return this.cachedB64URLS[this.getFilePath(imageName)];
  };

  this._loadGroup = function(opts, cb) {
    var timeout = opts.timeout;
    var callback = new lib.Callback();
    var that = this;

    // compute a list of images using file extensions
    var resources = opts.resources || [];
    var n = resources.length || 0;
    var loadableResources = [];

    for (var i = 0; i < n; ++i) {
      var ext = resources[i].substring(resources[i].lastIndexOf('.')).split('|')[0];
      var type = MIME[ext];
      var found = false;
      var foundCount = 0;

      var requested;

      for (var j = 0; j < this._requestedResources.length; j++) {
        requested = this._requestedResources[j];

        if (requested.type === type && requested.resource === resources[i]) {
          found = true;

          foundCount++;

          break;
        }
      }

      if (!found) {
        if (type === 'image' || type === 'audio') {
          requested = {
            type: type,
            resource: resources[i]
          };

          loadableResources.push(requested);

          this._requestedResources.push(requested);
        }
      }
    }

    // If no resources were loadable...

    if (!loadableResources.length) {
      if (!foundCount) {
        //logger.warn("Preload Fail: No Loadable Resources Found");
      }

      if (cb) {
        callback.run(cb);
      }

      callback.fire();

      return callback;
    }

    // do the preload asynchronously (note that base64 is synchronous, only downloads are asynchronous)
    var nextIndexToLoad = 0;
    var numResources = loadableResources.length;
    globalItemsToLoad += numResources;
    var parallel = Math.min(numResources, opts.parallel || 5); // how many should we try to download at a time?
    var numLoaded = 0;

    var loadResource = bind(this, function() {
      var currentIndex = nextIndexToLoad++;
      var src = loadableResources[currentIndex];
      var res;
      if (src) {
        res = this._getRaw(src.type, src.resource, false, true);
      } else {
        // End of resource list, done!
        return;
      }

      var next = function(failed) {
        // If already complete, stub this out
        if (numLoaded >= numResources) {
          return;
        }

        // Set stubs for the reload and load events so that code
        // elsewhere can blindly call these without causing problems.
        // An alternative would be to set these to null but not every
        // piece of code that uses this does the right checks.
        res.onreload = res.onload = res.onerror = function() {};

        // The number of loads (success or failure) has increased.
        ++numLoaded;
        ++globalItemsLoaded;

        // REALLY hacky progress tracker
        if (globalItemsLoaded === globalItemsToLoad) {
          globalItemsLoaded = globalItemsToLoad = 0;
        }

        // If we have loaded all of the resources,
        if (numLoaded >= numResources) {
          // Call the progress callback with isComplete == true
          cb && cb(src, failed, true, numLoaded, numResources);

          // If a timeout was set, clear it
          if (_timeout) {
            clearTimeout(_timeout);
          }

          // Fire the completion callback chain
          //logger.log("Preload Complete:", src.resource);
          callback.fire();
        } else {
          // Call the progress callback with the current progress
          cb && cb(src, failed, false, numLoaded, numResources);

          // Restart on next image in list
          setTimeout(loadResource, 0);
        }
      };

      // IF this is the type of resource that has a reload method,
      if (res.reload && res.complete) {
        // Use the magic of closures to create a chain of onreload
        // completion callbacks.  This is really important because
        // we can be be preloading the same resource twice, and we can
        // also be simultaneously preloading two groups at once.
        var prevOnLoad = res.onreload;
        var prevOnError = res.onerror;

        // When the resource completes loading, either with success
        // or failure:

        res.onreload = function() {
          // If previous callback exists, run it first in a chain
          prevOnLoad && prevOnLoad();

          // React to successful load of this resource
          next(false);
        };

        res.onerror = function() {
          // If previous callback exists, run it first in a chain
          prevOnError && prevOnError();

          // React to failed load of this resource
          next(true);
        };

        // Start it reloading
        res.reload();
      } else if (res.complete) {
        if (res.loader) {
          // real sound loading with AudioContext ...
          res.loader.load([src.resource], next);
        } else {
          // Since the resource has already completed loading, go
          // ahead and invoke the next callback indicating the previous
          // success or failure.
          next(res.failed === true);
        }
      } else {
        // The comments above about onreload callback chaining equally
        // apply here.  See above.
        var prevOnLoad = res.onload;
        var prevOnError = res.onerror;

        // When the resource completes loading, either with success
        // or failure:

        res.onload = function() {
          // If previous callback exists, run it first in a chain
          prevOnLoad && prevOnLoad();

          // Reset fail flag
          res.failed = false;

          // Let subscribers know an image was loaded
          if (src.type === "image") {
            that.emit(Loader.IMAGE_LOADED, res, src);

            // cache b64 images to be used in app
            var path = src.resource;
            var files = that._originalSheets[path];
            for (var t in files) {
              var name = files[t].f;

              that.canvas.width = files[t].w * that.quality;
              that.canvas.height = files[t].h * that.quality;


              var srcX = files[t].x || 0;
              var srcY = files[t].y || 0;
              var srcW = files[t].w;
              var srcH = files[t].h;

              var destX = 0;
              var destY = 0;
              var destW = files[t].w * that.quality;
              var destH = files[t].h * that.quality;

              that.ctx.drawImage(res, srcX, srcY, srcW, srcH, destX, destY, destW, destH);
              
              // cache this stuff
              that.cachedB64URLS[name.split('.').splice(0,name.split('.').length-1).join('.')] = that.canvas.toDataURL('image/png', that.quality);
            }
          }

          // React to successful load of this resource
          next(false);
        };

        res.onerror = function() {
          // If previous callback exists, run it first in a chain
          prevOnError && prevOnError();

          // Set fail flag
          res.failed = true;

          // React to failed load of this resource
          next(true);
        };
      }
    });

    var _timeout = null;
    setTimeout(function() {
      // spin up n simultaneous loaders!
      for (var i = 0; i < parallel; ++i) {
        loadResource();
      }

      // register timeout call
      if (timeout) {
        _timeout = setTimeout(function() {
          //logger.warn("Preload Timeout: Something Failed to Load");
          callback.fire();
          numLoaded = numResources;
        }, timeout);
      }
    }, 0);
    return callback;
  };

});
Loader.IMAGE_LOADED = "imageLoaded";
//-------------------------------------------------------------------------------------
exports = new Loader();
exports.IMAGE_LOADED = Loader.IMAGE_LOADED;
//-----------------------------------------------------------------------------------EOF