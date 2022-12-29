jsio('import util.ajax as ajax');


var events = {};
var dispatchEvent = function (namespace, evtName, params) {
    events[namespace] && events[namespace][evtName] && events[namespace][evtName](params);
};

var removeAllEventListeners = function (namespace) {
    events[namespace] = {};
}
var removeEventListener = function (namespace, evtName) {
    if (events[namespace] == void 0) {
        return;
    }
    delete events[namespace][evtName];
}
var addEventListener = function (namespace, evtName, cb) {
    if (events[namespace] == void 0) {
        events[namespace] = {};
    }
    events[namespace][evtName] = cb;
}

var getParameterByName = function (name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}
var urlRoot = function () {
    //var location = window.location;
    //return location.protocol + '//' + location.host;
    return location.protocol + (CONFIG.modules.liveEditServer.split('/live/reload')[0]).replace(':80', '').replace(':443', '');
};

var inprogress = {};
var loadComponent = function (screen, cb) {
    if (!!inprogress[screen]) {
        return;
    } else {
        inprogress[screen] = true;
        setTimeout(bind(this, function (_screen) {
            //console.info('Release screen', _screen);
            inprogress[_screen] = false;
        }, screen), 500);
        ajax.get({
            url: (CONFIG.modules.liveEditServer.replace(':80', '').replace(':443', '')) + '?pid=' + CONFIG.modules.livePid + '&screen=' + screen + '&version=B'
        }, function (err, response) {
            if (err || response == void 0 || response == "") {
                console.error('NO LIVE EDIT VALID RESPONSE FETCHED');
                return;
            }
            try {
                var evalSrc = eval(response.data);
                cb && cb(evalSrc);
            } catch (e) {
                console.error('EVAL LIVE EDIT FAILED', e);
            }
        });
    }
};
var loadComponentByPath = function (screen, path, cb) {
    if (!!inprogress[screen]) {
        return;
    } else {
        inprogress[screen] = true;
        setTimeout(bind(this, function (_screen) {
            //console.info('Release screen', _screen);
            inprogress[_screen] = false;
        }, screen), 500);
        ajax.get({
            url: (CONFIG.modules.liveEditServer.replace(':80', '').replace(':443', '')) + '?pid=' + CONFIG.modules.livePid + '&path=' + path
        }, function (err, response) {
            if (err || response == void 0 || response == "") {
                console.error('NO LIVE EDIT VALID RESPONSE FETCHED');
                return;
            }
            try {
                var evalSrc = eval(response.data);
                cb && cb(evalSrc);
            } catch (e) {
                console.error('EVAL LIVE EDIT FAILED', e);
            }
        });
    }
};
exports.loadComponent = loadComponent;

var isLoaded = false;
var isLoading = false;
var isConnected = false;
var JSIO_UI_LOADED_MODULES = [];
exports.connect = function () {
    if (isConnected) {
        return;
    }
    var connect = bind(this, function () {
        isLoading = false;
        isConnected = true;
        var socket = window.io.connect(urlRoot() + '/fswatch__' + CONFIG.modules.livePid + 'LIVE');

        this._watched = {};

        socket.on('connection', function (res) {
            console.info('Connected to Live Editor');
            window.LIVE_RELOADED_SRC_S = {};
            JSIO_UI_LOADED_MODULES = [];
            for (var path in window.jsio.__modules) {
                if (path.startsWith('src/ui/')) {
                    JSIO_UI_LOADED_MODULES.push(window.jsio.__modules[path]);
                }
            }
        }.bind(this));

        socket.on('disconnect', function (res) {
            console.info('disconnect');
        }.bind(this));
        socket.on('connect_error', function (res) {
            console.info('connect_error');
        }.bind(this));
        socket.on('connect_timeout', function (res) {
            console.info('connect_timeout');
        }.bind(this));

        socket.on('change', function (res) {
            var data = res.data;
            var screen = data.dir.split("\\").join("/").split('root/')[1] + '/' + data.name;//;data.name.split('.')[0];
            console.info('Changed data', screen);
            if (!!inprogress[screen]) {
                return;
            } else {
                inprogress[screen] = true;
                setTimeout(bind(this, function (_screen) {
                    //console.info('Release screen', _screen);
                    inprogress[_screen] = false;
                }, screen), 1000);
                ajax.get({
                    url: (CONFIG.modules.liveEditServer.replace(':80', '').replace(':443', '')) + '?pid=' + CONFIG.modules.livePid + '&path=' + data.path
                }, bind(this, function (__path, err, response) {
                    if (err || response == void 0 || response == "") {
                        console.error('NO LIVE EDIT VALID RESPONSE FETCHED');
                        return;
                    }
                    try {
                        var newScope = eval(response.data);
                        if (window.jsio.__modules[__path]) {
                            window.jsio.__modules[__path].exports = newScope;
                            window.LIVE_RELOADED_SRC_S[screen] = newScope;
                            Object.defineProperty(newScope, "name", {value: __path});
                            Object.defineProperty(newScope, "reloaded", {value: true});
                        }
                        var isLib = __path.startsWith('src/logic/');
                        var module, componentName, path;
                        var toLoad = -1;
                        var toDispatch = {
                            screen: 'src/ui/Bootstrap.js',
                            src: void 0
                        };
                        for (var i in JSIO_UI_LOADED_MODULES) {
                            module = JSIO_UI_LOADED_MODULES[i];
                            componentName = module.path;//filename.replace('.js', '').trim();
                            path = (data.path.split('root').shift()) + 'root/' + module.path.split('\\').join('/');
                            toLoad++;
                            loadComponentByPath(componentName, path, bind(this, function (__loadedName, src) {
                                toLoad--;
                                window.LIVE_RELOADED_SRC_S[__loadedName] = src;
                                //console.info(toLoad, __loadedName);
                                if (__loadedName === toDispatch.screen) {
                                    toDispatch.src = src;
                                }
                                if (toLoad < (isLib ? 0 : 1)) {
                                    dispatchEvent(toDispatch.screen, 'onchanged', {
                                        screen: toDispatch.screen,
                                        src: toDispatch.src || newScope
                                    });
                                }
                            }, componentName));
                        }
                    } catch (e) {
                        console.error('EVAL LIVE EDIT FAILED', e);
                    }
                }, res.data.path.split('root\\').pop().split('\\').join('/').split('root/').pop().split('\\').join('/')));
            }
        }.bind(this));

        socket.on('error', function (res) {
            console.info(res);
        }.bind(this));
    });
    if (isLoading || isConnected) {
        return;
    }
    isLoading = true;
    if (isLoaded) {
        connect();
    } else if (CONFIG.modules.liveLibPath != void 0){
        var script = document.createElement('script');
        script.setAttribute('src', CONFIG.modules.liveLibPath);
        script.onload = function () {
            console.info('Script Loaded with Success...');
            isLoaded = true;
            connect();
        };
        script.onerror = function () {
            console.info('Error on loading  script...');
            isLoading = false;
            isConnected = false;
        };
        document.body.appendChild(script);
    }
};

exports.registerEventChanged4Component = function (screenName, cb) {
    addEventListener(screenName, 'onchanged', cb);
};
