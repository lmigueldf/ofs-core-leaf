jsio('import oneflag.LocalStorage as LocalStorage');
// ------------------------------------------------------------------------------------
jsio('import src.logic.stores.AbstractStore as AbstractStore');
// ------------------------------------------------------------------------------------
jsio('import src.logic.actions.ActionsConstants as ACTIONS');
// ------------------------------------------------------------------------------------
var supportsVibration = !!navigator.vibrate;
// ------------------------------------------------------------------------------------
var namespace = 'SettingsStore';
// ------------------------------------------------------------------------------------
var SETTINGS_SALT = '874b3f82-04f1-4801-baca-5f25d0dc3bde';
// ------------------------------------------------------------------------------------
var SettingsStoreInstance;
exports = SettingsStoreInstance = SettingsStoreInstance || new(Class(AbstractStore, function(supr) {
  this.init = function(opts) {
    this.namespace = namespace;
    supr(this, 'init', [opts]);
    
    var userLang = (navigator.language.substr(0,2) || 'en').toLowerCase();
    this.availableLangs = Object.keys(CONFIG.modules.i18n) || ['en-EN', 'pt-PT'];
    var index = this.availableLangs
      .map(function(a){ return a.substr(0,2);})
      .indexOf(userLang);
    var defaultLanguage =  index > -1 ? this.availableLangs[index] : this.availableLangs[0];

    this.state = {
      vibrate: supportsVibration,
      sound: true,
      music: true,
      lang: defaultLanguage
    };
    
    this.registerActionsList(ACTIONS);
    this.loadStorageState();

    this.EVENTS = {
      ON_SETTINGS_STATUS: 'ON_SETTINGS_STATUS',
      ON_LANGUAGE_CHANGED: 'ON_LANGUAGE_CHANGED'
    };
  };

  // LOCAL STORAGE  --------------------- ---- -----------------------------------------
  this.loadStorageState = function() {
    this.state = LocalStorage.get(SETTINGS_SALT) || this.state;
  };

  this.saveToStorage = function() {
    LocalStorage.set(SETTINGS_SALT, this.state);
  };
  // PUBLIC functions-------------------- ---- -----------------------------------------
  this.getLang = function(){return this.state.lang};
  // PUBLIC EVENTS --------------------- ---- -----------------------------------------
  this.EVENTS = {};
  // ACTIONS --------------------------- ---- -----------------------------------------
  this.fetchSettingsStatus = function() {
    this.emit(this.EVENTS.ON_SETTINGS_STATUS, this.state);

  };

  this.toggleLang = function() {
    var curr = this.availableLangs.indexOf(this.state.lang);
    if (curr == (this.availableLangs.length - 1)) {
      curr = 0;
    } else {
      curr += 1;
    }
    this.state.lang = this.availableLangs[curr];
    
    this.saveToStorage();
    this.emit(this.EVENTS.ON_LANGUAGE_CHANGED, this.state.lang);
  };

  this.toggleMusic = function() {
    SoundService.toggleMusic();
    this.state.music = SoundService.musicOn;
    
    this.saveToStorage();
    this.fetchSettingsStatus();
  };
  this.toggleEffects = function() {
    SoundService.toggleEffects();
    this.state.sound = SoundService.effectsOn;
    
    this.saveToStorage();
    this.fetchSettingsStatus();
  };
  this.toggleVibration = function() {
    this.state.vibrate = !!!this.state.vibrate;
    this.saveToStorage();
    this.fetchSettingsStatus();
  };

  this.vibrate = function(timeout) {
    supportsVibration && this.state.vibrate && navigator.vibrate([timeout || 200]);
  };

  this.isVibrationSupported = function() {
    return supportsVibration;
  };
}));