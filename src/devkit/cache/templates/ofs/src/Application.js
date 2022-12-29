jsio('import device');
jsio('import ui.resource.loader as loader');
jsio('import oneflag.Utils as utils');
jsio('import ui.StackView as StackView');
jsio('import oneflag.UiScreen as Scene');
jsio('import oneflag.Settings as Settings');

exports = Class(GC.Application, function(supr) {
    this.init = function(opts) {
        supr && supr(this, 'init', [opts]);
        this._settings.canvas = CONFIG.modules.extended.canvasId;
    };

    this.loadLocalizationStrings = function() {
        GLOBAL.STRINGS = {};
        try {
            GLOBAL.STRINGS = JSON.parse(CACHE['resources/lang/' + (CONFIG.modules.lang || 'en-en') + '.json'] || '{}');
        } catch (ex) {
            console.info('An error was found trying to load Localization Strings', ex);
        }
    };

    function preventDefault(e) {
        e.preventDefault();
    }

    function disableScroll() {
        document.body.style.overflow = 'hidden';

        document.body.addEventListener('touchmove', preventDefault, {
            passive: false
        });
        document.body.addEventListener('DOMMouseScroll', preventDefault, {
            passive: false
        });
        document.body.addEventListener('mousewheel', preventDefault, {
            passive: false
        });
        document.body.style.touchAction = 'none';
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
        document.body.style.height = '100%';
    }

    function enableScroll() {
        document.body.removeEventListener('touchmove', preventDefault, {
            passive: false
        });
        document.body.removeEventListener('mousewheel', preventDefault, {
            passive: false
        });
    }

    // Setup game resolution
    Settings.setupAppResolutionAndDPI();
    // Load current settings
    this._settings = Settings.loadEngineOpts();

    this.onAspectRatioFixed = function() {
        if (device.isMobileNative) {
            return;
        }
        this.show();
        //if (device.height > device.width) {
        var defaultAspectRatioWidth = !!CONFIG.modules.aspectRatio ? CONFIG.modules.aspectRatio : 1.8;
        var aspectRatio = device.height / device.width;
        var paddingX = 0;
        var paddingY = 0;
        var scale = 1;
        if (aspectRatio < (defaultAspectRatioWidth * .825)) {
            var maxWidth = device.height / defaultAspectRatioWidth;
            paddingX = (device.width - maxWidth) / 2;
            paddingY = 0;

            this.view.updateOpts({
                x: 0,
                y: 0,
                width: device.height / defaultAspectRatioWidth,
                height: device.height
            });
            device.screen.width = device.height / defaultAspectRatioWidth;
            //device.width = device.height / defaultAspectRatioWidth;
        } else if (aspectRatio > (defaultAspectRatioWidth * 1)) {
            var maxHeight = device.width * defaultAspectRatioWidth;
            paddingX = 0;
            paddingY = (device.height - maxHeight) / 2;

            this.view.updateOpts({
                x: 0,
                y: 0,
                width: device.width,
                height: device.width * defaultAspectRatioWidth
            });
            device.screen.height = device.width * defaultAspectRatioWidth;
            //device.height = device.width * defaultAspectRatioWidth;
        } else {

            this.view.updateOpts({
                x: 0,
                y: 0,
                width: device.width,
                height: device.height
            });
        }
        //}
    }

    this.preloadAssets = function(folders, cb) {
        var that = this;
        loader.preload(folders, function() {
            if (that.uiLoader.updateProgress) {
                that.uiLoader.updateProgress(1, function() {
                    !!that.uiLoader.stopAnimation && that.uiLoader.stopAnimation();
                    cb && cb();
                });
            } else {
                cb && cb();
            }
        });
        loader.subscribe('imageLoaded', function(i) {
            !!that.uiLoader.updateProgress && that.uiLoader.updateProgress(loader.progress);
        });
    };

    this.preloadScripts = function(url, cb) {
        if (device.isMobileNative) {
            cb && cb();
            return;
        }
        var script = document.createElement('script');
        script.setAttribute('src', url);
        script.onload = bind(this, function() {
            cb && cb();
        });
        script.onerror = function() {
            console.info('Error on loading  script...');
        };
        document.body.appendChild(script);
    };

    this.initUI = function() {
        if (!!device.isMobileBrowser || !!device.isIOS) {
            disableScroll();
        } else {
            enableScroll();
        }
        // set current engine instance
        Settings.setEngine(this.getEngine());

        var width = device.width;
        var height = device.height;

        utils.scaleRootView(this, width, height);

        !!CONFIG.modules.fixedAspectRatio && this.onAspectRatioFixed();
        //Add a new StackView to the root of the scene graph
        !!CONFIG.modules.canvasBackgroundColor && this.updateOpts({
            backgroundColor: CONFIG.modules.canvasBackgroundColor
        });

        this.loadLocalizationStrings();

        this.rootView = new StackView({
            superview: this,
            x: (width - device.screen.width) / 2,
            y: (height - device.screen.height) / 2,
            width: device.screen.width,
            height: device.screen.height,
            clip: true
        });

        this.uiLoader = new Scene({
            screenId: 'Loader',
            root: this.rootView
        });

        this.rootView.push(this.uiLoader);
    };

    this.launchUI = function() {
        this.hasStarted = false;
        if (!!CONFIG.modules.preload && CONFIG.modules.preload.length > 0) {
            this.preloadAssets(CONFIG.modules.preload || [], bind(this, function() {
                !this.hasStarted && this.startApp();
            }));

            this.preloadMaxTimeout = setTimeout(bind(this, function() {
                !this.hasStarted && this.startApp();
            }), 10000);
        } else {
            !this.hasStarted && this.startApp();
        }
    };

    this.startApp = function() {
        this.hasStarted = true;
        this.preloadMaxTimeout && clearTimeout(this.preloadMaxTimeout);
        var scripts = (!!CONFIG.modules.scripts && CONFIG.modules.scripts) || [];
        var continueApp = bind(this, function() {
            setTimeout(bind(this, function() {
                this.uiLoader.stopLiveEditor();
                this.scene = new Scene({
                    screenId: 'Main',
                    root: this.rootView
                });
                this.rootView.push(this.scene, true);
            }), CONFIG.modules.wait4It || 0);
        });
        if (scripts && scripts.length > 0) {
            var onLoadedScript = bind(this, function() {
                if (scripts.length > 0) {
                    this.preloadScripts(scripts.splice(0, 1)[0], onLoadedScript);
                } else {
                    continueApp();
                }
            });
            this.preloadScripts(scripts.splice(0, 1)[0], onLoadedScript);
        } else {
            continueApp();
        }
    };
});

// PRE LOAD BASE SCREEN
jsio('import src.ui.Main');
jsio('import src.ui.Loader');
