jsio('import device');
jsio('import AudioManager');
jsio('import oneflag.LocalStorage as Storage');

var instance = null;
var STORAGE_KEY = 's23t!P32s4';
var SoundManager = function(opts) {
  /* Initialize internal audio manager*/
  var __opts= {
    path: "resources/sounds/",
    files: {}
  };
  for(var name in CONFIG.modules.sounds){
    var sound = CONFIG.modules.sounds[name];
    __opts.files[name] = {
      loop: sound.loop || false,
      background: sound.background || false,
      volume: sound.volume || 1,
      ext: sound.ext || '.mp3'
    };
  }

  this.audioManager = new AudioManager(__opts);


  /* Initialize audio state*/
  this.musicOn = true;
  this.audioManager.setMusicMuted(false);

  this.effectsOn = true;
  this.audioManager.setEffectsMuted(false);

  // Load music stored settings
  var settings = Storage.get(STORAGE_KEY);
  if (!!settings) {
    this.settings = settings;
    this.musicOn = !this.settings.musicOn;
    this.effectsOn = !this.settings.effectsOn;

    this.toggleMusic();
    this.toggleEffects();
  } else {
    this.settings = {
      musicOn: this.musicOn,
      effectsOn: this.effectsOn
    };
  }

  // mixin functions
  this.play = bind(this.audioManager, this.audioManager.play);
  this.pause = bind(this.audioManager, this.audioManager.pause);
  this.addSound = bind(this.audioManager, this.audioManager.addSound);
  this.stop = bind(this.audioManager, this.audioManager.stop);

  var that = this;
  handleVisibilityChange = function handleVisibilityChange() {
    if (document.hidden) {
      that.audioManager.setMusicMuted(true);
      that.audioManager.setEffectsMuted(true);
    } else {
      !!that.musicOn && that.audioManager.setMusicMuted(false);
      !!that.effectsOn && that.audioManager.setEffectsMuted(false);
    }
  }
  !!document && !!document.addEventListener && document.addEventListener("visibilitychange", handleVisibilityChange, true);
};
SoundManager.prototype.toggleMusic = function() {
  if (this.musicOn) {
    this.musicOn = false;
    this.audioManager.setMusicMuted(true);
  } else {
    this.musicOn = true;
    this.audioManager.setMusicMuted(false);
  }
  this.settings.musicOn = this.musicOn;
  Storage.set(STORAGE_KEY, this.settings);
};
SoundManager.prototype.toggleEffects = function() {
  if (this.effectsOn) {
    this.effectsOn = false;
    this.audioManager.setEffectsMuted(true);
  } else {
    this.effectsOn = true;
    this.audioManager.setEffectsMuted(false);
  }
  this.settings.effectsOn = this.effectsOn;
  Storage.set(STORAGE_KEY, this.settings);
};
SoundManager.factory = function(opts) {
  if (instance) {
    return instance;
  } else {
    return instance = new SoundManager(opts);
  }
};

exports = SoundManager.factory({});
