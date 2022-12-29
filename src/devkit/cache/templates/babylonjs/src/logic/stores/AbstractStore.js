jsio('import src.logic.dispatcher.AppDispatcher as AppDispatcher');
// ------------------------------------------------------------------------------------
jsio('import event.Emitter as Emitter');
// ------------------------------------------------------------------------------------
var namespace = 'Stores/AbstractStore';
exports = Class(Emitter, function() {
  this.init = function(opts) {
    this.initDispatcherListener(bind(this, this.onDispatched));
  };

  this.initDispatcherListener = function(handler) {
    AppDispatcher.register(this.namespace || 'namelessstore', handler);
  };

  this.registerActionsList = function(actions) {
    this.actions = actions;
  };

  this.onDispatched = function(action) {
    for (var key in this.actions) {
      if (action.type == this.actions[key]) {
        !!this[this.actions[key]] && this[this.actions[key]](action.data);
      }
    }
  };
});