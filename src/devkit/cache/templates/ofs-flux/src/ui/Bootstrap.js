jsio('import oneflag.UIView as Base');

var namespace = 'Bootstrap';
exports = Class(Base, function(supr) {
  this.viewNodes = {
    root: {
      id: '$$',
      grid: true
    }
  };

  this.init = function(opts) {
    supr(this, 'init', [opts]);
  };

  this.onBeforeBuild = function() {
    console.info('[' + namespace + '] Before build...');

  };

  this.onAfterBuild = function() {
    console.info('[' + namespace + '] After build...( build took: ' + ((Date.now() - this.started) / 1000) + ' seconds)');
  };
});
