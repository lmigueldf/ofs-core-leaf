// SCHEMAS don't need to be preloaded as they are added automonous 
// --- TREE SHAKING CLASS LOADER ------------------------------------------------------------------------------------
jsio('import src.ui.scenes.ScenesManager');
// --- SET GLOBAL Loader func ---------------------------------------------------------------------------------------
GLOBAL.load = function(path, alias){
  return  alias != void 0 ? jsio('import ' + path + ' as ' + alias) : jsio('import ' + path);
};
// -- ENTRY SCENE ---------------------------------------------------------------------------------------------------
GLOBAL.entryScene = 'ScenesManager';
