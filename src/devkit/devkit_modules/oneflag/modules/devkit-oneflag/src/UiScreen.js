// Class inherits from
jsio('import .UiAbstractComponent as UIComponent');
jsio('import .OfsSdk as OfsSDK');
jsio('import device');

jsio('import .LiveEdit as LiveEdit');

exports = Class(UIComponent, function (supr) {
    this.API = new OfsSDK();

    this.init = function (opts) {
        this.rootView = opts.root;
        this.CONFIG = opts.screenId || 'Titlescreen';
        this.leave = opts.leave;
        opts = merge(opts, {
            superview: this,
            x: 0,
            y: 0,
            width: (opts.superview && opts.superview.style.width) || device.screen.width,
            height: (opts.superview && opts.superview.style.height) || device.screen.height
        });
        supr(this, 'init', [opts]);
        // public abstract functions

        this._width = (opts.superview && opts.superview.style.width) || device.screen.width;
        this._height = (opts.superview && opts.superview.style.height) || device.screen.height;


        this.build(opts);
    };

    this.registerLiveEditor = function () {
        if (!CONFIG.modules.liveEdit) {
            return;
        }
        //console.info('REGISTERING LIVE EDIT MODEs');
        this.API.OFS.enableLiveEdit(this.CONFIG, bind(this, function (data, screen) {
            if (this.CONFIG != screen) {
                return;
            }
            // cleaning screen
            //console.info('CLEANING SCREEN');
            this.removeAllSubviews();
            this.stopAnimations();
            //console.info('RENDERING LIVE DATA', data);

            this._width = device.screen.width;
            this._height = device.screen.height;

            this.build({}, data);

            this.startAnimations(this.configAnimations);
        }));
    };

    this.stopLiveEditor = function () {
        if (!CONFIG.modules.liveEdit) {
            return;
        }
        this.API.OFS.disableLiveEdit();
    };

    this.onBeforeBuild = function () {
        //console.info('Before build...');
    };

    this.onAfterBuild = function () {
        //console.info('After build...');
    };

    this.tick = function (dt) {
        this.__tick && this.__tick(dt);
        this.onTick && this.onTick(dt);
    };
});


