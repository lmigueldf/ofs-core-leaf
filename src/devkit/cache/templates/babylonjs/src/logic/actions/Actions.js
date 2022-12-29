jsio('import src.logic.dispatcher.AppDispatcher as AppDispatcher');
jsio('import src.logic.actions.ActionsConstants as ACTIONS');
// ------------------------------------------------------------------------------------
var namespace = 'Actions/Actions';
var ActionsInstance;
exports = ActionsInstance = ActionsInstance || new(Class(function() {
  this.demoAction = function() {
    AppDispatcher.dispatch({
      type: ACTIONS.demoAction,
      data: {}
    });
  };
}))();