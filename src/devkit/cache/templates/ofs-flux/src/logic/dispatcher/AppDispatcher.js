var namespace = 'Dispatcher/AppDispatcher';

var AppDispatcherInstance;
exports = AppDispatcherInstance = AppDispatcherInstance || new(Class(function(supr) {
  this.length = 0;
  this.handlers = [];

  this.init = function(opts) {};

  this.dispatch = function(actionData) {
    for (var namespace in this.handlers) {
      (this.handlers[namespace])(actionData);
    } 
  };
  
  this.register = function(namespace, handler) {
    this.handlers[namespace] = (handler);
    this.length = 0;
    for (var i in this.handlers) {
      this.length++;
    }
    return this.length;
  };    
}))();