jsio('import oneflag.Utils as Utils');
// ------------------------------------------------------------------------------------
jsio('import src.logic.stores.AbstractStore as AbstractStore');
// ------------------------------------------------------------------------------------
jsio('import src.logic.actions.ActionsConstants as ACTIONS');
// ------------------------------------------------------------------------------------
var namespace = 'Stores/MyStore';
var StoreInstance;
exports = StoreInstance = StoreInstance || new(Class(AbstractStore, function(supr) {
  // @contructor
  this.init = function(opts) {
    this.namespace = 'MyStore'
    supr(this, 'init', [opts]);
    this.state = {};
    this.registerActionsList(ACTIONS);
  };

  this.myAction = function(){
      console.info('MyAction called in Store');
  };
  // ---------------------------------- ---- -------------------------------------------

}));
