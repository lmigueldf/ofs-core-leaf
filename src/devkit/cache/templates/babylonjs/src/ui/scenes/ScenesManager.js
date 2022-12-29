jsio('import src.ui.Babylon as Base');
//---------------------------------------------------------------------------------------------------------------------------
jsio('import src.ui.scenes.LoaderScene as LoaderScene');
//---------------------------------------------------------------------------------------------------------------------------
jsio('import src.ui.scenes.MainScene as Scene');
//---------------------------------------------------------------------------------------------------------------------------
jsio('import src.ui.AbstractScene as SceneBase');
//---------------------------------------------------------------------------------------------------------------------------
jsio('import src.ui.AssetLoader as Loader');
//---------------------------------------------------------------------------------------------------------------------------
//---------------------------------------------------------------------------------------------------------------------------
var namespace = 'ScenesManager';
//---------------------------------------------------------------------------------------------------------------------------
exports = Class(Base, function() {
  this.ready = function() {
    this.activeScenes = [];
 
    var loaderScene = new LoaderScene(this);
    loaderScene.on('ready', bind(this, function() {
      setTimeout(bind(this, function() {
         
        this.activeScenes.pop();
        loaderScene.remove();  
        this.activeScenes.push(new Scene(this));
      }), Math.max(150, CONFIG.modules.wait4It || 100)); 
    }));
    this.activeScenes.push(loaderScene);
  };
  this.tick = function() {
    for (var i in this.activeScenes) { 
      if (this.activeScenes[i].update) {
        this.activeScenes[i].update();
      }
    }
  };
});
//------------------------------------------------------------------------------------------------------------------------EOF