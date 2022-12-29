jsio('import src.logic.Utils as Utils');
// ------------------------------------------------------------------------------------
jsio('import src.logic.stores.AbstractStore as AbstractStore');
// ------------------------------------------------------------------------------------
jsio('import src.logic.actions.ActionsConstants as ACTIONS');
// ------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------
var namespace = 'Stores/MainStore';
var StoreInstance;
exports = StoreInstance = StoreInstance || new(Class(AbstractStore, function(supr) {
  this.EVENTS = {
    ON_ONLINE_STATUS_CHANGED: 1000001
  };
  
  // @contructor
  this.init = function(opts) {
    this.namespace = 'MyStore'
    supr(this, 'init', [opts]);
    this.state = {};
    this.registerActionsList(ACTIONS);

    // INIT PLAYER INSTANCE
    this.player = Player.load();
    this.player.save(true);

    // handle notifications 
    Utils.registerOnlineStatusChanged(bind(this, function(status) {
      this.emit(this.EVENTS.ON_ONLINE_STATUS_CHANGED, status);
    }));
    this.emit(this.EVENTS.ON_ONLINE_STATUS_CHANGED, Utils.getOnlineStatus());
  };

  // ACTIONS --------------------------- ---- -----------------------------------------
  this.hasAcceptedTermsAndConditions = function() {
    this.emit(this.EVENTS.ON_TERMS_AND_CONDITIONS_STATE, this.player.acceptedTC);
  };
}))();