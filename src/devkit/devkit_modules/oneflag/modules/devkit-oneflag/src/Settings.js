jsio('import .LocalStorage as LocalStorage');
jsio('import device');

var settingsKey = '91a94453-d999-414c-b393-d9259a557e7f';
var instance;
var SettingsManager = function () {
    var settings = CONFIG.modules.engineOpts || {};
    var loadedSettings = LocalStorage.get(settingsKey);
    if(loadedSettings){
        settings = loadedSettings;
    }else{
        if (CONFIG.modules.extended) {
            if (device.isAndroid && CONFIG.modules.extended.androidDPI) {
                settings.dpi = CONFIG.modules.extended.androidDPI;
            }
            if (CONFIG.modules.extended.forceCanvas) {
                settings.useWebGL = false;
            }
            if (CONFIG.modules.extended.forceWebGL) {
                settings.useWebGL = true;
            }
        }
    }

    this.engineOpts = {
        showFPS: settings == void 0 ? false : !!settings.showFPS,
        dtFixed: settings == void 0 ? 0 : settings.dtFixed,
        clearEachFrame: settings == void 0 ? true : !!settings.clearEachFrame,
        dtMinimum: settings == void 0 ? 0 : settings.dtMinimum,
        keyListenerEnabled: settings == void 0 ? false : !!settings.keyListenerEnabled,
        continuousInputCheck: settings == void 0 ? true : !!settings.continuousInputCheck,
        repaintOnEvent: settings == void 0 ? false : !!settings.repaintOnEvent,
        mergeMoveEvents: settings == void 0 ? false : !!settings.mergeMoveEvents,
        alwaysRepaint: settings == void 0 ? true : !!settings.alwaysRepaint,
        noReflow: settings == void 0 ? true : !!settings.noReflow,

        useWebGL: settings == void 0 ? CONFIG.useWebGL || false : (settings.useWebGL != void 0 ? settings.useWebGL : CONFIG.useWebGL),
        resolution: settings == void 0 ? CONFIG.modules.resolution : (settings.resolution || CONFIG.modules.resolution),
        dpi: settings.dpi || CONFIG.modules.dpi || device.devicePixelRatio
    };

    this.engine = void 0;

    this.setupWebGL();

    this.saveChanges();
};
SettingsManager.prototype.reset = function () {
    LocalStorage.removeItem(settingsKey);
};

SettingsManager.prototype.saveChanges = function () {
    LocalStorage.set(settingsKey, this.engineOpts);
};

SettingsManager.prototype.setEngine = function (engine) {
    this.engine = engine;
};

SettingsManager.prototype.updateEngine = function (opts) {
    this.engine.updateOpts(opts);
};

SettingsManager.prototype.setupWebGL = function () {
    if (!LocalStorage.get(settingsKey) && CONFIG.modules.engineOpts.forceWebGL) {
        if (device.isAndroid) {
            CONFIG.useWebGL = CONFIG.modules.engineOpts.forceWebGL.android;
        } else if (device.isIOS) {
            CONFIG.useWebGL = CONFIG.modules.engineOpts.forceWebGL.ios;
        } else {
            CONFIG.useWebGL = CONFIG.modules.engineOpts.forceWebGL.desktop;
        }
        this.engineOpts.useWebGL = CONFIG.useWebGL;
    }
};

SettingsManager.prototype.loadEngineOpts = function () {
    CONFIG.useWebGL = this.engineOpts.useWebGL;
    return this.engineOpts;
};

SettingsManager.prototype.setupAppResolutionAndDPI = function () {
    var ref;
    if ((device.isAndroid) || !device.isIOS) {
        if (device.screen.isPortrait) {
            ref = !!this.engineOpts.resolution ? this.engineOpts.resolution[0] : device.screen.width;
        } else {
            ref = !!this.engineOpts.resolution ? this.engineOpts.resolution[1] : device.screen.height;
        }
        var fixedResolutionDPR = !!this.engineOpts.resolution ? ((ref * device.devicePixelRatio) / (device.screen.isPortrait ? device.screen.width : device.screen.height)) : device.devicePixelRatio;
        device.setDevicePixelRatio(!!this.engineOpts.dpi ? this.engineOpts.dpi : fixedResolutionDPR);
    }
};

SettingsManager.prototype.setWebGL = function (value) {
    this.engineOpts.useWebGL = !!value;
    this.saveChanges();
    // informs that reboot is needed in order to changes to take action
    this.needsReboot = true;
};

SettingsManager.prototype.setStats = function (value) {
    this.engineOpts.showFPS = !!value;
    this.saveChanges();
    // informs that reboot is needed in order to changes to take action
    this.needsReboot = true;
};

SettingsManager.prototype.setDPI = function (dpi) {
    this.engineOpts.dpi = dpi;
    this.saveChanges();
    // informs that reboot is needed in order to changes to take action
    this.needsReboot = true;
};

SettingsManager.factory = function () {
    // Singleton pattern simplified
    if (!!instance) {
        return instance;
    } else {
        return instance = new SettingsManager();
    }
};

exports = SettingsManager.factory();
