
var inactivityTimeout = -1;
var inactivityCb = void 0;
var inactivityLIMIT = void 0;

var handleVisibilityChange = function(cb, inactivityLIMIT) {
  if (document.hidden) {
    inactivityTimeout = Date.now();
    inactivityCb && inactivityCb(false);
  } else {
    inactivityCb && inactivityCb(true);
  }
} 

exports.register = function(cb, inactivityLIMIT){
    inactivityCb = cb;
    inactivityLIMIT = inactivityLIMIT;
    document.addEventListener("visibilitychange", handleVisibilityChange, true);

};
exports.unregister = function(){
    inactivityCb = void 0;
    inactivityLIMIT = void 0;
    document.removeEventListener("visibilitychange", handleVisibilityChange, true);
};