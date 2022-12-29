jsio('import .UiAbstractComponent as UIComponent');
jsio('import device');
exports = Class(UIComponent, function (supr) {
    this.nodes = {
        stats: {
            id: 'stats',
            x: device.screen.width * .65 - (device.screen.width * .015),
            y: (device.screen.width * .015),
            width: device.screen.width * .35,
            height: device.screen.height * .35,
            horizontalAlign: 'right',
            visible: true,
            zIndex: 1000,
            canHandleEvents: false,
            children: {
                text: {
                    grid: {
                        x: 0,
                        y: 0
                    },
                    width: 1,
                    height: 1,
                    text: '',
                    size: 1,
                    wrap: true,
                    verticalAlign: 'top',
                    color: 'white',
                    horizontalAlign: 'right'
                }
            }
        }
    };

    this.init = function (opts) {
        opts.canHandleEvents = false;
        opts.zIndex = 9999;
        opts.backgroundColor = 'rgba(0,0,0,0)';
        opts.x = opts.x || 0,
            opts.y = opts.y || 0,
            opts.width = opts.width || device.screen.width,
            opts.height = opts.height || device.screen.height;

        supr(this, 'init', [opts]);
        // public abstract functions
        this.build(opts, {
            viewNodes: this.nodes,
            handlers: this,
            setupComponentsIO: this.setupComponentsIO
        });
    };

    this.setText = function (str) {
        this.stats.text.updateOpts({
            text: str
        });
    };
});
