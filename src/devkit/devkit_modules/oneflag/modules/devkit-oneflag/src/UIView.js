jsio('import oneflag.UiAbstractComponent as UIComponent');

jsio('import .SoundService as SoundManager');

exports = Class(UIComponent, function (supr) {


    this.init = function (opts) {
        supr(this, 'init', [opts]);
        this.started = Date.now();
        // public abstract functions
        this.build(opts, {
            viewNodes: this.viewNodes,
            handlers: this
        });

        this.startLiveEditor();
    };

    var __applyStyle = function __applyStyle(rootNode, templateNode) {
        rootNode = rootNode || {};
        var node;
        for (var i in templateNode) {
            node = templateNode[i];
            rootNode[i] = rootNode[i] || {};
            if ((typeof node !== 'object')) {
                rootNode[i] = node;
                continue;
            }
            for (var prop in node) {
                if (prop != 'children') {
                    rootNode[i][prop] = node[prop];
                    if (prop == 'ctor') {
                        // magic stuff
                    }
                    if (prop == 'onInput' && !!node['onInput'] && node['onInput'].length > 0) {
                        node['onInput'] && (rootNode[i].onInputCallbackSignature = node['onInput']);
                        try{
                            node['inputParams'] = node['inputParams'];
                        }catch (ex){
                            console.info(ex);
                        }
                        rootNode[i].onInput = {
                            params: node['inputParams'],
                            execute: bind(this, function (__node, params, ev) {

                                ev && ev.cancel(); // stop propagation;

                                try {
                                    this[__node.onInputCallbackSignature](params, ev);
                                } catch (ex) {
                                    console.info('Function not found in scope :: [' + __node.onInputCallbackSignature + ']');
                                }
                                if (!!__node.sound) {
                                    try {
                                        SoundManager.play(__node.sound);
                                    } catch (ex) {
                                        console.info('Sound not found :: [' + __node.sound + ']');
                                    }
                                }
                            }, rootNode[i])
                        };
                    } else if (prop == 'sound' && !node['onInput']) {
                        rootNode[i].onInput = {
                            execute: bind(this, function (__node, params, ev) {
                                ev && ev.cancel(); // stop propagation;
                                params = params || {};
                                if (!!__node.sound) {
                                    try {
                                        SoundManager.play(__node.sound);
                                    } catch (ex) {
                                        console.info('Sound not found :: [' + __node.sound + ']');
                                    }
                                }
                            }, rootNode[i])
                        };
                    }

                    if (prop == 'elementType' && !!node['elementType']) {
                        rootNode[i].elementName = node['elementName'] || 'input_default_key_missing';
                        rootNode[i].elementType = node['elementType'] || 'input';
                        node['onInput'] && (rootNode[i].onInputCallbackSignature = node['onInput']);
                        rootNode[i].onInput = {
                            execute: bind(this, function (__node, params, ev) {

                                ev && ev.cancel(); // stop propagation;
                                params = params || {};
                                try {
                                    __node.view.focusInput();
                                    __node.view.emit('onInput', this.hasFocus[__node.view.origin.elementName]);
                                } catch (ex) {
                                    console.info(ex);
                                }
                                try {
                                    this[__node.onInputCallbackSignature] && this[__node.onInputCallbackSignature](params, ev);
                                } catch (ex) {
                                    console.info('Function not found in scope :: [' + __node.onInputCallbackSignature + ']');
                                }
                            }, rootNode[i])
                        };

                        rootNode[i].onChange = bind(this, function (__node, value) {
                            __node.view.emit('onChange', this.hasFocus[__node.view.origin.elementName], value);
                        }, rootNode[i]);

                        rootNode[i].onSubmit = bind(this, function (__node, value) {
                            __node.view.emit('onSubmit', this.hasFocus[__node.view.origin.elementName], value);
                        }, rootNode[i]);
                    }
                }
            }
            if (node['children']) {
                rootNode[i]['children'] = rootNode[i]['children'] || {};
                __applyStyle.call(this, rootNode[i]['children'], node['children']);
            }
        }
    };
    var __applyStyleEditor = function __applyStyleEditor(rootNode, templateNode) {
        rootNode = rootNode || {};
        var node;
        for (var i in templateNode) {
            node = templateNode[i];
            rootNode[i] = rootNode[i] || {};
            if ((typeof node !== 'object')) {
                rootNode[i] = node;
                continue;
            }
            for (var prop in node) {
                if (prop != 'children') {
                    rootNode[i][prop] = node[prop];
                    node['onInput'] && (rootNode[i].onInputCallbackSignature = node['onInput']);
                    rootNode[i].onInput = {
                        execute: function (params, ev) {
                            this.toggleEditMode(ev.target);
                            ev.cancel();
                        }
                    };
                }
            }
            if (node['children']) {
                rootNode[i]['children'] = rootNode[i]['children'] || {};
                __applyStyleEditor(rootNode[i]['children'], node['children']);
            }
        }
    };

    this.applySchema = function (data) {
        __applyStyleEditor(this.viewNodes, data);
    };

    this.applyTemplateStyles = function () {
        if (this.schema == void 0) {
            return;
        }
        var _template;
        try {
            _template = jsio('import src.ui.schemas.' + this.schema);
            __applyStyle.call(this, this.viewNodes, _template);

        } catch (ex) {
            console.info('-- template not found');
        }
    };

    this.tick = function (dt) {
        this.__tick && this.__tick(dt);
        this.onTick && this.onTick(dt);
    };
});
