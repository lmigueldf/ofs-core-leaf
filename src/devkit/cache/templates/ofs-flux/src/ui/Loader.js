jsio('import device');
jsio('import oneflag.Utils as OneFlagUtils');
jsio('import ui.View as View');

var setTimeout = OneFlagUtils.setTimeout;
var setInterval = OneFlagUtils.setInterval;
var animate = OneFlagUtils.animate;
var namespace = 'Loader';
function continuousAnimateRotation(n) {
    animate(this)
            .now({r: -3.14 * n}, 1200, animate.linear)
            .then(continuousAnimateRotation.bind(this, n + 2, 0), 0);
}
var nodesTree = {
  base: {
    id: '$base',
    visible: true,
    grid: true, 
    centerX: true, 
    centerY: true,
    backgroundColor: '#000000',   
    children: {
      spinner: {
        id: '$spinner',
        grid: {
          y: 7
        },
        width: .115,
        centerX: true,
        centerY: true,
        lockWidth: true,
        centerAnchor: true,
        imageName: 'loader'
      }
    }
  }
};
var scope = {
  onBeforeBuild: function() {
    console.info('['+ namespace +'] Before build start...');
  },
  onAfterBuild: function() {
    console.info('['+ namespace +'] After build...( build took: ' + ((Date.now() - this.started) / 1000) + ' seconds)');
  },
  liveReloadActions: function() {
    console.info('['+ namespace +'] Live Reload Ready --->');
    continuousAnimateRotation.call(this.$spinner, 3);
  },
};
// DO NOT CHANGE THIS   -------------------------------------------------------------
exports = {
  viewNodes: nodesTree,
  handlers: scope,
  setupComponentsIO: function(opts) {
    // only happens once
    this.registerLiveEditor();
    continuousAnimateRotation.call(this.$spinner, 3);
  }
};