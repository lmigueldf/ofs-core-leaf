GLOBAL.__require = function (path) {
    return (window.LIVE_RELOADED_SRC_S && window.LIVE_RELOADED_SRC_S[path/*.split('.').pop()*/]) || jsio(path);
};
// -- AUTO SCHEMA IMPORTER -------------------------------------------

//--------------------------------------------------------------------
jsio('import src.ui.Bootstrap as Bootstrap');
/**
 * --|||||||||||||||||||||||||||||--
 * --||-   Project Bootstrap   -||--
 * --|||||||||||||||||||||||||||||--
 *
 * !! DO NOT DELETE THIS FILE STRUCTURE !!
 **/

var onReady = function (opts) {
    //console.info('Ready!');
};
/**
 * !! DO NOT DELETE THIS FILE STRUCTURE !!
 * ... unless you realy know what your doing :P
 **/
var namespace = 'Main';
exports = new (Class(function (supr) {
    this.viewNodes = {
        root: {
            grid: true,
            ctor: Bootstrap,
            ctorAlias: 'src/ui/Bootstrap.js'
        }
    };
    this.init = function (opts) {
        this.isLoaded = false;
        return {
            viewNodes: this.viewNodes,
            handlers: this,
            setupComponentsIO: this.setupComponentsIO
        }
    };
    this.onBeforeBuild = function () {
        //console.info('[' + namespace + '] Before build...');
    };
    this.onAfterBuild = function () {
        //console.info('[' + namespace + '] After build...( build took: ' + ((Date.now() - this.started) / 1000) + ' seconds)');
        if (!!document && !!CONFIG.modules.extended.clearInputs) {
            var inputElements = document.getElementsByTagName('input');
            for (var i = 0; i < inputElements.length; i++) {
                document.getElementsByTagName('input')[i].parentElement.removeChild(document.getElementsByTagName('input')[i])
            }
        }
        this.startLiveEditor();
        onReady.call(this, this.opts);
    };
    this.onResize = function (width, height, device) {
        //console.info(width, height, device);
    };
    this.setupComponentsIO = function (opts) {
        this.opts = opts;
        // set main screen history handling via history
        window.onpopstate = function (event) {
            if (event.state && event.state.doNotCloseApp) {
                history.pushState({
                    doNotCloseApp: true
                }, '', '');
            }
        };
        history.pushState({
            doNotCloseApp: true
        }, '', '');
    };
}));
