jsio('import src.logic.dispatcher.AppDispatcher as AppDispatcher');
jsio('import src.logic.actions.ActionsConstants as ACTIONS');
// ------------------------------------------------------------------------------------
var namespace = 'Actions/Actions';
var ActionsInstance;
exports = ActionsInstance = ActionsInstance || new(Class(function() {
  this.init = function(opts) {};
  this.myAction = function() {
    AppDispatcher.dispatch({
      type: ACTIONS.myAction,
      data: {}
    });
  };
}))();
