jsio('import lib.PubSub as Emitter');
//---------------------------------------------------------------------------------------------------------------------------
jsio('import src.ui.AssetLoader as Loader');
//---------------------------------------------------------------------------------------------------------------------------
var namespace = 'LoaderScene';
//---------------------------------------------------------------------------------------------------------------------------
var res = 1;
var multiplier = Math.max(1, Math.min(8, res));

var defaultPlaneSize = {
  width: 1.5 * multiplier,
  height: 2.675 * multiplier
};
//---------------------------------------------------------------------------------------------------------------------------
exports = Class(Emitter, function(supr) {
  this.init = function(manager) {
    this.manager = manager;
    
    this.roll = 0;
    this.rollStep = (Math.PI / 360) * 2;
    
    this.initScene();
    setTimeout(bind(this, this.preload), 0);
  };
  // --------------------------------------------------------------------------------------------------------------------------
  this.preload = function() {
    this.updateProgress(0.0);
    this.updateMessage('Loading textures...');
    var spritesheets;
    try {
      if (GLOBAL.CACHE) {
        spritesheets = JSON.parse(GLOBAL.CACHE['spritesheets'+ (CONFIG.modules.spritesheetsVersion == void 0 ? '': '.'+CONFIG.modules.spritesheetsVersion ) +'/map.json']);
        Loader.setCanvas(this.manager.loadCanvas('loader'));
      }
    } catch (e) {
      logger.warn("spritesheet map failed to parse", e);
    }

    var soundMap;
    try {
      if (GLOBAL.CACHE) {
        soundMap = JSON.parse(GLOBAL.CACHE['resources/sound-map.json']);
      }
    } catch (e) {
      logger.warn("sound map failed to parse", e);
    }
    Loader.addSheets(spritesheets);
    Loader.addAudioMap(soundMap);
    
    if (!!!CONFIG.modules.liveEditor && CONFIG.modules.debug == void 0) {
      jsio('import src.ui.WorkerRegistry');
    }
    Loader.preload(['resources/images', 'resources/sounds'], bind(this, function() {
      Loader.destroyCanvas();
      
      this.setSkyBox(this.scene);
      // DONE
      this.updateProgress(1.0);

      this.updateMessage('Loading models...');
      this.updateProgress(0.0);
      // Pre load models
      var preloadModels = [].concat(CONFIG.modules.extended.preloadModels || []);
      var loaded = 0;
      var progress = 0;
      
      /* copy refs */
      var copyRefs = [];
      for(var i in this.scene.rootNodes){
        copyRefs.push(this.scene.rootNodes[i]);
      }
      
      var onModelLoaded = bind(this, function(scene) {
        //mesh = scene.rootNodes[scene.rootNodes.length - 1];
        //mesh.setEnabled(false);
        for(var t in scene.rootNodes){
          copyRefs.indexOf(scene.rootNodes[t]) < 0 && scene.rootNodes[t].setEnabled(false);
          
        }
        

        loaded++;
        if (loaded == preloadModels.length) {
          console.info('All models loaded');
          //ready
          this.ready();
        } else {
          progress = (loaded / preloadModels.length).toFixed(1);
          this.updateProgress(progress);
        }
      });

      if (preloadModels.length > 0) {
        for (var i in preloadModels) {
          this.manager.loadModel(this.manager.scene, 'resources/misc/' + preloadModels[i], onModelLoaded);
        }
      } else {
        this.updateProgress(1.0);
        // ready
        this.ready();
      }
    }));
    Loader.subscribe('imageLoaded', bind(this, function(res, src) {
      this.updateProgress(Loader.progress);
    }));
  };
  // --------------------------------------------------------------------------------------------------------------------------
  this.ready = function() {
    this.updateMessage('Ready');
    this.emit('ready', {});
  };
  // --------------------------------------------------------------------------------------------------------------------------
  this.remove = function() {
    this.manager = void 0;
    this.scene.dispose();
    this.scene = void 0;
  };
  this.update = function() {
    this.scene.render();
    
    
    if (this.$loader) {
      this.roll -= this.rollStep;
      this.$loader_base.view.mesh.rotation = (new BABYLON.Vector3(0, 0, this.roll));
      this.scene.skybox && (this.scene.skybox.rotation = (new BABYLON.Vector3(0, this.roll * -0.01 , 0)));
    }
  };
  //---------------------------------------------------------------------------------------------------------------------------
  this.initScene = function() {
    // set active scene
    this.scene = this.generateScene(this.manager.engine, this.manager.canvas);
    // Action
    this.start();
  };
  //---SCENE SETUP ----------------------------------------------- ------------------------------------------------------------
  this.generateScene = function(engine, canvas) {
    var scene = new BABYLON.Scene(engine);
    scene.clearColor = this.manager.colorStringToColor4('#000');
    // LIGHTS
    this.setLights(scene);
    // CAMERA
    this.setCamera(scene);
    // Shadows
    this.setShadows(scene);
    // skybox
    //this.setSkyBox(scene);
    // fog
    this.setFog(scene);
    // register scene event handling
    this.registerEventListener(scene);
    return scene;
  };
  //---------------------------------------------------------------------------------------------------------------------------
  this.registerEventListener = function(scene) {};
  //---------------------------------------------------------------------------------------------------------------------------
  this.setLights = function(scene) {
    var light = new BABYLON.HemisphericLight("ambient", new BABYLON.Vector3(-0.0, 1.0, -1.0));
    light.intensity = 0.95;
    light.range = 1.0;
    light.diffuse = this.manager.colorStringToColor3('#fff');
    light.specular = this.manager.colorStringToColor3('#fff');
    light.groundColor = this.manager.colorStringToColor3('#000');
    scene.light = light;

    //var lightSphere = BABYLON.Mesh.CreateSphere("sphere", 5, 1, scene);
    //lightSphere.position = light.position;
    //lightSphere.material = new BABYLON.StandardMaterial("light", scene);
    //lightSphere.material.emissiveColor = new BABYLON.Color3(1, 1, 0);

    //var light2 = new BABYLON.SpotLight("spot02", new BABYLON.Vector3(30, 40, 20), new BABYLON.Vector3(-1, -2, -1), 1.1, 16, scene);
    //light2.intensity = 0.5;

    //scene.light.diffuse = new BABYLON.Color3(1, 0, 0);
    //scene.light.specular = new BABYLON.Color3(0, 1, 0);
  };
  this.setCamera = function(scene) {
    var camera = new BABYLON.ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2, 3.15 * multiplier,
      new BABYLON.Vector3(defaultPlaneSize.width * 0.5, -defaultPlaneSize.height * 0.5, 0));
    scene.camera = camera;
  };
  this.setShadows = function(scene) {
    //scene.shadowGenerator = new BABYLON.ShadowGenerator(128, scene.light);
    //scene.shadowGenerator.useExponentialShadowMap = true;
  };
  this.setSkyBox = function(scene) {
    var skybox = BABYLON.MeshBuilder.CreateBox("skyBox", {
      size: 5000
    }, scene);
    var skyboxMaterial = new BABYLON.StandardMaterial("skyBox", scene);
    skyboxMaterial.backFaceCulling = false;
    
    var images = [];
    images.push(Loader.getCachedImage('skybox/skybox_px'));
    images.push(Loader.getCachedImage('skybox/skybox_py'));
    images.push(Loader.getCachedImage('skybox/skybox_pz'));
    images.push(Loader.getCachedImage('skybox/skybox_nx'));
    images.push(Loader.getCachedImage('skybox/skybox_ny'));
    images.push(Loader.getCachedImage('skybox/skybox_nz'));
  
    skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture("skybox", scene, null, false, images);
    skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
    skyboxMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0);
    skyboxMaterial.specularColor = new BABYLON.Color3(0, 0, 0);
    skybox.material = skyboxMaterial;

    scene.skybox = skybox;
  };
  this.setFog = function(scene) {
    //scene.fogMode = BABYLON.Scene.FOGMODE_EXP;
    //scene.fogColor = new BABYLON.Color3(0.9, 0.9, 0.85);
    //scene.fogDensity = 0.0015; 
  };
  //---------------------------------------------------------------------------------------------------------------------------
  this.start = function() {
    //this.manager.showAxis(6, this.scene);
    //this.scene.camera.attachControl(this.canvas, true);
    
    this.manager.renderSchema(this, 'LoaderSchema', multiplier, defaultPlaneSize, this.scene.camera, this.scene);
    
    var layerBg = BABYLON.MeshBuilder.CreatePlane('coverBG', {
      width: defaultPlaneSize.width,
      height: defaultPlaneSize.height
    });
    layerBg.material = new BABYLON.StandardMaterial();
    layerBg.material.diffuseColor = this.manager.colorStringToColor3('#000');
    layerBg.material.alpha = 0.5;
    
    layerBg.position.x += defaultPlaneSize.width * 0.5;
    layerBg.position.y -= defaultPlaneSize.height * 0.5;
    
    layerBg.scaling.x *= 8;
    layerBg.scaling.y *= 4;
    
    this.originX = this.$bar.view.mesh.scaling.x * 1;
  };
  // --------------------------------------------------------------------------------------------------------------------------
  this.updateMessage = function(value) {
    this.$message.view.updateText(value || '-');
  };
  this.updateProgress = function(progress) {
    this.$bar.view.mesh.scaling.x = this.originX * progress;
  };
  //---------------------------------------------------------------------------------------------------------------------------
});