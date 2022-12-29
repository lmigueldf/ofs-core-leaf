jsio('import device');
jsio('import .Utils as Utils');
jsio('import util.ajax as ajax');


var timeoutID = -1;
var currentData = void 0;
var isLiveEditActive = false;

function poolRequest(screen, cb) {
  if (!CONFIG.modules.liveEdit) {
    return;
  }
  if (!isLiveEditActive) {
    return;
  }
  ajax.get({
    url: CONFIG.modules.liveEditServer + '?pid=' + CONFIG.modules.livePid + '&screen=' + screen + '&version=B'
  }, function(err, response) {
    if (err || response == void 0 || response == "") {
      isLiveEditActive = false;
      //console.error('NO LIVE EDIT VALID RESPONSE FETCHED');
      return;
    }
    if (response.data != currentData && response.screen == screen) {
      currentData = response.data;
      try {
        cb(eval(response.data), response.screen);
      } catch (e) {
        console.error('EVAL LIVE EDIT FAILED', e);
      }
    }
    if (!isLiveEditActive) {
      console.error('isLiveEditActive', false);
      return;
    }
    timeoutID = setTimeout(function() {
      poolRequest(screen, cb);
    }, 1000);
  });
}

exports = Class(function(supr) {
  this.OFS = {
    enableLiveEdit: function(screen, cb) {
      if (isLiveEditActive) {
        return;
      }
      isLiveEditActive = true;
      poolRequest(screen, cb);
    },
    disableLiveEdit: function(screen, cb) {
      isLiveEditActive = false;
      clearTimeout(timeoutID);
      timeoutID = -1;
    }
  };
});

