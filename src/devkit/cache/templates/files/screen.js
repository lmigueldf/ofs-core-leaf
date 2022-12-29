jsio('import device');
var nodesTree = {};
var scope = {
  // Game start         -------------------------------------------------------------
  init: function(){}
  // Your Game logic    -------------------------------------------------------------
};

// DO NOT CHANGE THIS   -------------------------------------------------------------
exports = {
  viewNodes: nodesTree,
  handlers: scope,
  setupComponentsIO: function(opts) {
    this.registerLiveEditor();
  }
};
