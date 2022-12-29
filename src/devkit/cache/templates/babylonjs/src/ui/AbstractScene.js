jsio('import lib.PubSub as Emitter');
//---------------------------------------------------------------------------------------------------------------------------
jsio('import src.ui.AssetLoader as Loader');
//---------------------------------------------------------------------------------------------------------------------------
var namespace = 'AbstractScene';
//---------------------------------------------------------------------------------------------------------------------------
var debug = !!CONFIG.modules.debug;
//---------------------------------------------------------------------------------------------------------------------------
var res = 1;
var multiplier = Math.max(1, Math.min(8, res));
var defaultPlaneSize = {
  width: 1.5 * multiplier,
  height: 2.675 * multiplier
};
//---------------------------------------------------------------------------------------------------------------------------
exports = Class(Emitter, function(supr) {
  this.init = function(manager, opts) {
    opts = opts || {};
    this.manager = manager;
    
    this.res = opts.res || res;
    this.multiplier = opts.multiplier || multiplier;
    this.defaultPlaneSize = opts.defaultPlaneSize || defaultPlaneSize;
    
    this.noPreset = !!opts.noPreset;
    
    this.initScene();
  };
  //---------------------------------------------------------------------------------------------------------------------------
  this.initScene = function() {
    // set active scene
    this.scene = this.generateScene(this.manager.engine, this.manager.canvas);

    // Action
    this.action();


    if (!!debug) {
      this.scene.debugLayer.show();
      setTimeout(function() {
        var debugPanelsHackExplorer = document.getElementById('scene-explorer-host');
        debugPanelsHackExplorer.style.zIndex = 9;
        debugPanelsHackExplorer.style.position = "absolute";

        var debugPanelsHackInspector = document.getElementById('inspector-host');
        debugPanelsHackInspector.style.zIndex = 9;
        debugPanelsHackInspector.style.position = "absolute";
      }, 500);

      this.manager.showAxis(6, this.scene);
    }
    
  };
  
  this.resize = function(){
    this.engine.resize();
  }
  //---SCENE SETUP ----------------------------------------------- -------------------------------------------------------------
  this.generateScene = function(engine, canvas) {
    var scene = new BABYLON.Scene(engine);
    scene.clearColor = this.manager.colorStringToColor4('#9b8f1d');
    
    if(!this.noPreset){
      // LIGHTS
      this.setLights(scene);
      // CAMERA
      this.setCamera(scene);
      // Shadows
      this.setShadows(scene);
      // skybox
      this.setSkyBox(scene);
      // fog
      this.setFog(scene);
    }
    // register scene event handling
    this.registerEventListener(scene);
    return scene;
  };
  //---------------------------------------------------------------------------------------------------------------------------
  this.registerEventListener = function(scene) {};
  //---------------------------------------------------------------------------------------------------------------------------
  this.setLights = function(scene) {
    var light = new BABYLON.HemisphericLight("ambient", new BABYLON.Vector3(0.0, 0.50, -1.0));
    light.intensity = 1.0;
    light.range = 1.0;
    light.diffuse = this.manager.colorStringToColor3('#fff');
    light.specular = this.manager.colorStringToColor3('#fff');
    light.groundColor = this.manager.colorStringToColor3('#000');
    scene.light = light;
  };
  this.setCamera = function(scene) {
    var camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2, 3.15 * multiplier,
      new BABYLON.Vector3(defaultPlaneSize.width * 0.5, -defaultPlaneSize.height * 0.5, 0));
    camera.attachControl(this.canvas, true);
    scene.camera = camera;
  };
  this.setShadows = function(scene) {};
  this.setSkyBox = function(scene) {};
  this.setFog = function(scene) {};
  //---------------------------------------------------------------------------------------------------------------------------
  this.action = function() {};
  //---------------------------------------------------------------------------------------------------------------------------
  this.update = function() {
    this.scene.render();
  };
  //---------------------------------------------------------------------------------------------------------------------------
});