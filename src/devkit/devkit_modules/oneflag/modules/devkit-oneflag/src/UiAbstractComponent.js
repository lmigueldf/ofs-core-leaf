jsio('import ui.View');
jsio('import device');
// dependencies
jsio('import .Utils as Utils');
jsio('import .ConfigLoader as Config');

jsio('import .LiveEdit as LiveEdit');

exports = Class(ui.View, function (supr) {
    this.Utils = Utils;
    this.musicOff = true;
    this.soundOff = true;

    this.viewNodes = {};

    this.init = function (opts) {
        opts = merge(opts, {
            superview: this,
            x: 0,
            y: 0,
            width: (opts.superview.style && opts.superview.style.width) || device.screen.width,
            height: (opts.superview.style && opts.superview.style.height) || device.screen.height
        });
        supr(this, 'init', [opts]);

        if (!!CONFIG.modules.liveEditor && !CONFIG.modules.liveEdit) {
            var liveLoadComponents = [];

            function findNodeCtors(node) {
                var _node;
                for (var i in node) {
                    _node = node[i];
                    if (_node['ctor']) {
                        // Override old alias stuff
                        try {
                            _node['ctorAlias'] = _node['ctor'].reloaded ? _node['ctor'].name : (_node['ctor'].name.split('root_')[1].split('_').join('/')) + '.js';
                        } catch (ex) {
                            var modules = window.jsio.__modules;
                            var found;
                            for(var p in modules){
                                if(modules[p].exports == _node['ctor']){
                                    found = modules[p];
                                }
                            }
                            _node['ctorAlias'] = found && found.path;
                        }
                        var componentName = _node['ctorAlias'];
                        liveLoadComponents.indexOf(componentName) < 0 && liveLoadComponents.push(componentName);
                    }
                    if (_node.children !== null) {
                        findNodeCtors(_node.children);
                    }
                }
            };
            findNodeCtors(this.viewNodes);

            function replaceNodeCtors(node, componentName) {
                var _node;
                for (var i in node) {
                    _node = node[i];
                    if (window.LIVE_RELOADED_SRC_S && window.LIVE_RELOADED_SRC_S[componentName] && _node['ctorAlias'] == componentName) {
                        _node['ctor'] = window.LIVE_RELOADED_SRC_S[componentName];
                    }
                    if (_node.children !== null) {
                        replaceNodeCtors(_node.children, componentName);
                    }
                }
            };
            for (var i in liveLoadComponents) {
                replaceNodeCtors(this.viewNodes, liveLoadComponents[i]);
            }
        }
    }

    this.startLiveEditor = function () {

        if (!CONFIG.modules.liveEditor || !!CONFIG.modules.liveEdit) {
            return;
        }
        LiveEdit.connect();

        if (this.CONFIG == 'Main') {
            var componentPath = 'src/ui/Bootstrap.js';
            var componentNameAlias = 'Bootstrap';
            var lastUpdatedScreenSrc = this;
            LiveEdit.registerEventChanged4Component(componentPath, bind(this, function (data) {
                window.LIVE_RELOADED_SRC_S[componentPath] = data.src;

                function replaceNodeCtors(node) {
                    var _node;
                    for (var i in node) {
                        _node = node[i];
                        if (_node['ctorAlias'] == componentPath || _node['ctorAlias'] == componentNameAlias) {
                            _node['ctor'] = data.src;
                        }
                        if (_node.children !== null) {
                            replaceNodeCtors(_node.children);
                        }
                    }
                };
                replaceNodeCtors(lastUpdatedScreenSrc.viewNodes);
                this.removeAllSubviews();
                this.build({}, lastUpdatedScreenSrc);
            }));
        } else {

        }
    };

    this.build = function (opts, liveData) {
        this.CONFIG && Config.loadScreen(this.CONFIG);
        this.components = (liveData && liveData.viewNodes) || Config.getImagesComponentsConfig(this.CONFIG);

        if (!liveData) {
            for (var t in Config.getHandlers(this.CONFIG)) {
                this[t] = Config.getHandlers(this.CONFIG)[t];
            }
            if (Config.getConfigAnimations(this.CONFIG)) {
                this.configAnimations = Config.getConfigAnimations(this.CONFIG);
            }
            this.setBackButtonHandling();

            if (Config.getSetupComponentsIO(this.CONFIG)) {
                this.setupComponentsIO = bind(this, Config.getSetupComponentsIO(this.CONFIG));
            }
        } else {
            this.configAnimations = liveData.configAnimations;
            var newHandlers = liveData.handlers || {};
            for (var t in newHandlers) {
                this[t] = newHandlers[t];
            }
        }
        this.started = Date.now();
        this.onBeforeBuild && this.onBeforeBuild();
        this.applyTemplateStyles && this.applyTemplateStyles();
        var counter = 0;
        var x = 0;
        var y = 0;
        var element;
        for (var i in this.components) {
            element = this.components[i];
            this.componentViewInstantiate({opts: this.components[i]});
            if (this.components[i].onInput != void 0) {
                if (!Utils.isFunction(this.components[i].onInput.execute)) {
                    this.components[i].onInput.execute = new Function(this.components[i].onInput.execute);
                }
                var params = {};
                params.target = this.components[i].view;
                params = merge(params, this.components[i].onInput.params);

                this.handleBtnInput(this.components[i].view,
                    this.components[i].onInput.btn_normal,
                    this.components[i].onInput.btn_pressed,
                    bind(this, this.components[i].onInput.execute, params));
            }
            if (element && element.text != void 0 && element.elementType && (element.elementName)) {
                this.setupInput(element.view, bind(this, element.onChange), bind(this, element.onSubmit));
            }
        }
        !liveData && !opts.noReflow && this.setupComponentsIO(opts);
        !!liveData && !opts.noReflow && this.liveReloadActions && this.liveReloadActions();

        this.onAfterBuild && this.onAfterBuild();
    };

    this.setupComponentsIO = function () {
    };

    this.setBackButtonHandling = function () {
    };

    this.setupInput = function (node, onChange, onSubmit) {
        if (!this.hasFocus) {
            this.hasFocus = {};
        }
        var elementName = node.origin.elementName;
        var elementType = node.origin.elementType;

        var opts = {
            text: '',
            placeholder: node.origin.placeholder || '...',
            opacity: node.origin.opacity == void 0 ? 1 : node.origin.opacity,
            type: node.origin.type || 'text',
            horizontalAlign: node.origin.horizontalAlign || 'center',
            fontFamily: node.origin.fontFamily || void 0,
            size: (node.origin.size || 18),
            maxLength: node.origin.maxLength || 12,
            rows: node.origin.rows || 1,
            color: node.origin.color || '#000000',
            backgroundColor: node.origin.backgroundColor || 'transparent'
        };

        node.removeAllSubviews();
        this.hasFocus[elementName] = false;

        var ele = document.getElementById(elementName) || document.createElement(elementType);
        ele.id = elementName;
        document.body.appendChild(ele);

        ele.style['position'] = 'absolute';
        ele.style['border'] = 'none';
        ele.style['outline'] = 'none';
        ele.style['z-Index'] = '99000';

        ele.style['text-align'] = 'center';
        ele.style['background-color'] = 'transparent';
        ele.style['opacity'] = '1';
        ele.style['letter-spacing'] = 'normal';
        ele.style['resize'] = 'none';
        ele['type'] = 'default';
        ele.maxlength = opts.maxLength || '12';
        ele['rows'] = opts.rows || 1;
        ele['autofocus'] = true;

        ele.autocomplete = 'off';
        ele.autocorrect = 'off';
        ele.autocapitalize = 'off';
        ele.spellcheck = false;
        ele.autofocus = false;

        var _dt = 0;

        ele.placeholder = opts.placeholder || '';
        ele.value = opts.text || '';

        node.updateOpts({
            visible: !!device.isMobileBrowser,
            //opacity: node._opts.text.length > 0 ? (opts.opacity || 1) : .25,
            text: node._opts.text.length > 0 ? node._opts.text : node.origin.placeholder
        });

        ele.type = opts.type || 'text';

        node.updateOpts({
            horizontalAlign: opts.horizontalAlign || 'left'
        });
        ele.style['text-align'] = opts.horizontalAlign || 'left';

        node.updateOpts({
            color: opts.color || '#000000'
        });
        ele.style['color'] = opts.color || 'black';

        node.updateOpts({
            backgroundColor: opts.backgroundColor || 'transparent'
        });
        ele.style['background-color'] = opts.backgroundColor || 'transparent';


        ele.style['font-size'] = ((opts.size || (node.style.height))) + 'px';
        ele.style['font-family'] = opts.fontFamily || 'inherit';

        var curr = '';
        ele.oninput = bind(this, function (ev) {
            if (opts.type == 'number') {
                if (ev.target.value) {
                    ev.target.value = ev.target.value.replace(/[^0-9.]/g, '');
                    ev.target.value = ev.target.value.replace(/(\..*)\./g, '$1');
                    curr = ev.target.value;
                } else {
                    ev.target.value = curr.length > 1 ? curr : '';
                    curr = ev.target.value;
                }
                curr = (curr.replace(',', ''));
                curr = (curr.replace('.', ''));
                ev.target.value = curr;
            }

            curr = ev.target.value;
            if (!!opts.maxLength) {
                curr = curr.slice(0, opts.maxLength);
            }
            node.updateOpts({
                text: curr.length > 0 ? curr : node.origin.placeholder
            });

            setTimeout(bind(this, function () {
                ev.target.value = curr;
            }), 50);
        });
        ele.onfocus = bind(this, function (ev, value) {
            this.hasFocus[elementName] = true;
            node.onFocus && node.onFocus(this.hasFocus[elementName], ele.value);
            !!device.isMobileBrowser && setTimeout(bind(this, function () {
                var val = ele.value; //store the value of the element
                ele.value = ''; //clear the value of the element
                ele.value = val; //set that value back.
            }), 200);
        });

        ele.onblur = bind(this, function (ev, value) {
            this.hasFocus[elementName] = false;
            node.onFocus && node.onFocus(this.hasFocus[elementName], ele.value);
            setTimeout(bind(this, function () {
                var val = ele.value; //store the value of the element
                ele.value = ''; //clear the value of the element
                ele.value = val; //set that value back.
                onSubmit && onSubmit(ele.value);
                node.onSubmit && node.onSubmit(ele.value);
            }), 200);
        });
        ele.onkeyup = bind(this, function (ev, value) {
            if (ev.keyCode === 13) {
                this.hasFocus[elementName] = false;
                ev.preventDefault();
                ele.blur();
                node.onFocus && node.onFocus(this.hasFocus[elementName], ele.value);
            } else {
                onChange && onChange(ele.value);
                node.onChange && node.onChange(ele.value);
            }
        });
        ele.onsubmit = bind(this, function (ev, value) {
            ele.blur();
            this.hasFocus[elementName] = false;
            onSubmit && onSubmit(ele.value);
            node.onSubmit && node.onSubmit(ele.value);
        });

        node.tick = bind(this, function (dt) {
            if (this.hasFocus[elementName]) {
                if (_dt <= 0) {
                    ele.style['display'] = 'block';
                    ele.style['color'] = 'black';
                    //ele.style['font-family'] = 'inherit';
                    ele['placeholder'] = opts.placeholder;
                    node.hide();
                    if (device.isMobileBrowser && device.isAndroid) {
                        ele.style['left'] = '0px';
                        ele.style['padding'] = '0px 7px';
                        //ele.style['top'] = (window.innerHeight * .5) + 'px';
                        //ele.style['bottom'] = 'inherit';
                        delete ele.style['top'];
                        ele.style['bottom'] = '0px';
                        ele.style['width'] = '100%';
                        ele.style['height'] = (56 / device.devicePixelRatio) * device.devicePixelRatio + 'px';
                        ele.style['font-size'] = ((56 / device.devicePixelRatio) * .3) * device.devicePixelRatio + 'px';
                        ele.style['background-color'] = 'rgba(230, 230, 230, 1)';
                        ele.style['color'] = '#000000';
                        ele.style['text-align'] = 'left';
                        ele.style['opacity'] = '1';

                        node.show();
                    } else {
                        ele.style['color'] = opts.color || '#000000';
                        ele.style['background-color'] = opts.backgroundColor || 'rgba(230, 230, 230,  0)';
                        ele.style['width'] = (node.style.width / device.devicePixelRatio) * 1 + 'px';
                        ele.style['height'] = (node.style.height / device.devicePixelRatio) * 1 + 'px';
                        ele.style['font-size'] = ((node._opts.size) / device.devicePixelRatio) * 1 + 'px';
                        ele.style['left'] = (node.getPosition().x / device.devicePixelRatio) * 1 + 'px';
                        ele.style['top'] = (node.getPosition().y / device.devicePixelRatio) * 1 + 'px';
                        ele.style['bottom'] = 'inherit';
                        ele.style['text-align'] = opts.horizontalAlign || 'center';
                        ele.style['font-family'] = opts.fontFamily || 'inherit';
                    }

                    _dt = 0;
                } else {
                    _dt -= dt;
                }
            } else {
                ele.style['color'] = opts.color || 'black';
                ele.style['font-size'] = ((opts.size || (node.style.height)) / device.devicePixelRatio) + 'px';
                ele.style['font-family'] = opts.fontFamily || 'inherit';
                ele.style['display'] = 'none';
                node.show();

            }
        });
        if (opts.autoFocus) {
            this.focus();
        }

        node.getInputValue = function () {
            return ele.value; //|| ele.placeholder;
        };

        node.setInputValue = function (value) {
            node.updateOpts({
                text: value
            })
            ele.value = value;
        };

        node.focusInput = bind(this, function () {
            //console.info('add focus');
            this.hasFocus[elementName] = true;
            setTimeout(bind(this, function () {
                ele && ele.click();
                ele && ele.focus();
            }), 100);
            document.activeElement.blur();
        });

        node.removeFocus = bind(this, function () {
            this.hasFocus[elementName] = false;
            document.activeElement.blur();
        });
    };

    this.handleBtnInput = function (_node, a, b, cb) {
        _node.updateOpts({canHandleEvents: true});
        var time = 0, cancelled = false;
        var startvalue = -1,
            moveVal = 0;
        _node.on('InputStart', bind(this, function (evt, pt) {
            cancelled = false
            startvalue = pt;
            time = Date.now();
            if (a != void 0) {
                _node.updateOpts({
                    image: this.getResourceImage(b, 0.75).img
                });
            }
        }));
        _node.on("InputMove", function (evt, pt) {
            if (startvalue != -1) {
                moveVal = pt.x - startvalue.x;
                if (moveVal < -25 || moveVal > 25) {
                    cancelled = true;
                }
            }
        });
        _node.on('InputSelect', bind(this, function (evt, pt) {
            if ((!time) || (time && Date.now() - time < 500 && !cancelled)) {
                cb(evt, pt);
            }
            if (b != void 0) {
                _node.updateOpts({
                    image: this.getResourceImage(a, 0.75).img
                });
            }
            time = 0;
        }));
    };

    this.handlingBackButtonPressed = function () {
        if (this.time == 0) {
            this.time = Date.now();
        } else if ((Date.now() - this.time) < 1000) {
            this.time = 0;
            return false;
        } else {
            this.time = 0;
        }
//        console.info("Back button pressed on", this.CONFIG);
        if (this.backButtonHandler != void 0) {
            this.backButtonHandler();
        }
    };

    this.startAnimations = function (_toAnimate) {
        // TIMEOUT TO ALLOW CURRENT ANIMATIONS TO STOP
        setTimeout(bind(this, function () {
            Utils.activateAnimations();
            for (var view in _toAnimate) {
                switch (_toAnimate[view].animation) {
                    case 'continuousAnimateShake':
                        Utils.continuousAnimateShake.call(this.getView(_toAnimate[view].path),
                            this.getParams(_toAnimate[view].path).x,
                            _toAnimate[view].factor,
                            _toAnimate[view].speed);
                        break;
                    case 'continuousAnimateScale':
                        Utils.continuousAnimateScale.call(
                            this.getView(_toAnimate[view].path),
                            _toAnimate[view].n,
                            _toAnimate[view].factor,
                            _toAnimate[view].speed);
                        break;
                    case 'continuousAnimateRotation':
                        Utils.continuousAnimateRotation.call(
                            this.getView(_toAnimate[view].path),
                            _toAnimate[view].n,
                            _toAnimate[view].speed);
                        break;
                    case 'continuousAnimateDirectionVertical':
                        Utils.continuousAnimateDirectionVertical.call(
                            this.getView(_toAnimate[view].path),
                            _toAnimate[view].y,
                            _toAnimate[view].factor,
                            _toAnimate[view].speed);
                        break;
                    case 'continuousAnimateDirectionHorizontal':
                        Utils.continuousAnimateDirectionVertical.call(
                            this.getView(_toAnimate[view].path),
                            _toAnimate[view].x,
                            _toAnimate[view].factor,
                            _toAnimate[view].speed);
                        break;
                    case 'continuousAnimateWidthHeight':
                        Utils.continuousAnimateWidthHeight.call(this.getView(_toAnimate[view].path),
                            this.getParams(_toAnimate[view].path).x,
                            this.getParams(_toAnimate[view].path).y,
                            this.getParams(_toAnimate[view].path).width,
                            this.getParams(_toAnimate[view].path).height,
                            _toAnimate[view].factorWidth,
                            _toAnimate[view].factorHeight,
                            _toAnimate[view].speed);
                        break;
                }
            }
        }), 500);
    };
    this.stopAnimations = function () {
        Utils.deactivateAnimations();
    };

    this.componentViewInstantiate = function (__) {
        if((typeof __.opts === 'object')){
            if (__.opts.parent != null && this.components[__.opts.parent].view) {
                __.opts.view = Utils.createUiView(this.components[__.opts.parent].view, __.opts);
            } else if (__.parent != undefined) {
                __.opts.view = Utils.createUiView(__.parent, __.opts);
            } else {
                if (__.opts.views) {
                    if (__.opts.views[__.row] == undefined) {
                        __.opts.views[__.row] = {}
                    }
                    ;
                    __.opts.views[__.row][__.column] = Utils.createUiView(this, __.opts);
                } else {
                    __.opts.view = Utils.createUiView(this, __.opts);
                }
            }

            if (__.opts.id != void 0 && __.opts.view) {
                this[__.opts.id] = __.opts.view;
            }
            // improve references to get to node elements without path navigation    --> JS rocks!
            __.opts.view.origin = __.opts;

            this.checkForChildren(__.opts, __.row, __.column);
        }
    };
    this.checkForChildren = function (opts, row, column) {
        var element;
        if (opts.children != null) {
            for (var t in opts.children) {
                element = opts.children[t];
                this.componentViewInstantiate({
                    opts: opts.children[t],
                    parent: opts.repeat ? opts.views[row][column] : opts.view
                });
                // improve references to get to node elements without path navigation    --> JS rocks!
                opts.view[t] = opts.children[t].view;

                if (opts.children[t].onInput != void 0) {

                    // TODO::  Refactor this
                    if (!Utils.isFunction(opts.children[t].onInput.execute)) {
                        opts.children[t].onInput.execute = new Function(opts.children[t].onInput.execute);
                    }

                    var params = {};
                    params.target = opts.children[t].view;
                    params = merge(params, opts.children[t].onInput.params);

                    this.handleBtnInput(opts.children[t].view,
                        opts.children[t].onInput.btn_normal,
                        opts.children[t].onInput.btn_pressed,
                        bind(this, opts.children[t].onInput.execute, params));
                }
                if (element && element.text != void 0 && element.elementType && element.elementName) {
                    this.setupInput(element.view, bind(this, element.onChange), bind(this, element.onSubmit));
                }
            }
        }
    };
    this.getView = function (path) {
        var data = Utils.getViewFromComponentsList(this.components, path);
        return data !== void 0 ? (data.repeat ? data.views : data.view) : void 0;
    };

    this.getViewById = function (id) {
        return this[id];
    };

    this.getParams = function (path) {
        return Utils.getViewFromComponentsList(this.components, path);
    };
});
