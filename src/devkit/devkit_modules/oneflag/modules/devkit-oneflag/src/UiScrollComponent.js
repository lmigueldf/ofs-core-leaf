jsio('import .UiAbstractComponent as UiScreen');
jsio('import device');
jsio('import ui.ScrollView as ScrollView');

exports = Class(UiScreen, function (supr) {
    this.data = [];
    var cols = 2;
    var colWidth;
    var height = device.screen.height * .25;
    this.nodes = {
        base: {
            id: '$$',
            grid: true,
            children: {
                bar: {
                    grid: {
                        x: 10 - .25
                    },
                    visible: false,
                    height: 1,
                    width: .025,
                    backgroundColor: 'yellow'
                },
                noEntries: {
                    grid: {
                        y: 3
                    },
                    centerX: true,
                    width: .8,
                    height: .1,
                    text: ''
                },
                list: {
                    grid: true
                }
            }
        }
    };

    this.init = function (opts) {
        opts = merge(opts, {
            superview: this,
            x: 0,
            y: 0,
            width: opts.superview.style.width,
            height: opts.superview.style.height
        });
        supr(this, 'init', [opts]);
        this.build(opts, {
            viewNodes: this.nodes,
            handlers: this,
            setupComponentsIO: this.setupComponentsIO
        });

        this.bottomOffset = opts.bottomOffset || 0;
        cols = opts.cols || 1;
        this.data = [];

        colWidth = this.style.width / cols;

        if (opts.scrollY == void 0) {
            opts.scrollY = true;
        }

        this.scrollView = new ScrollView({
            superview: this,
            x: 0,
            y: 0,
            width: this.style.width,
            height: this.style.height,
            offsetX: 0,
            offsetY: 0,
            scrollY: !!opts.scrollY,
            scrollX: !!opts.scrollX,
            bounce: true,
            bounceRadius: opts.radius || 0,
            dragRadius: opts.dragRadius || opts.radius || Math.min(device.width, device.height) / 32,
            clip: !!opts.clip,
            scrollBounds: {
                minX: 0,
                maxX: 0,
                minY: 0,
                maxY: 0
            }
        });
        this.scrollView.addSubview(this.$$.list);
        this.scrollView.addSubview(this.$$.noEntries);
        this.scrollView.addSubview(this.$$.bar);
    };

    this.getMaxHeightLastRow = function (y) {
        var maxs = [];
        var reduce = this.data.map(function (item) {
            if (item.style.y == y) {
                maxs.push(Number(item.style.height));
                return item;
            }
        });
        return Math.max.apply(null, maxs);
    };

    this.tick = function (dt) {
        var maxHeight = 0;
        for (var i = 0; i < this.data.length; i++) {
            if (i > 0) {
                var lastEntry = this.data[i - 1];
                if (!!lastEntry) {
                    if ((lastEntry.style.x + lastEntry.style.width) + this.data[i].style.width <= cols * colWidth) {
                        _x = lastEntry.style.x + lastEntry.style.width;
                    } else {
                        _x = 0;
                    }
                    if (_x == 0) {
                        _y = lastEntry.style.y + this.getMaxHeightLastRow.call(this, lastEntry.style.y);
                    } else {
                        _y = lastEntry.style.y;
                    }
                }
                this.data[i].style.y = _y;
            }
            maxHeight += this.data[i].style.height;
            if (i == this.data.length - 1) {
                this.$$.list.style.height = maxHeight;
                //this.scrollView._scrollBounds.maxY = this.$$.list.style.height + (this.bottomOffset || 0);
            }
        }
    }

    this.addElement = function (ObjectType, opts) {
        this.$$.noEntries.hide();

        opts = merge(opts, {
            col: cols
        })

        var getMaxHeightLastRow = bind(this, function (y) {
            var maxs = [];
            var reduce = this.data.map(function (item) {
                if (item.style.y == y) {
                    maxs.push(Number(item.style.height));
                    return item;
                }
            });
            return Math.max.apply(null, maxs);
        });

        var _width = (Math.min(opts.col, cols)) * colWidth;
        var _x = 0;
        var _y = 0;
        var lastEntry = this.data[this.data.length - 1];
        if (!!lastEntry) {
            if ((lastEntry.style.x + lastEntry.style.width) + _width <= cols * colWidth) {
                _x = lastEntry.style.x + lastEntry.style.width;
            } else {
                _x = 0;
            }

            if (_x == 0) {
                _y = lastEntry.style.y + getMaxHeightLastRow(lastEntry.style.y);
            } else {
                _y = lastEntry.style.y;
            }
        }

        var maxHeight = _y + (opts.height || height);

        var entry;
        if (ObjectType != null) {
            var _opts = merge(opts, {
                superview: this.$$.list,
                width: _width,
                x: _x,
                y: _y,
                height: opts.height || height,
                backgroundColor: opts.backgroundColor
            });
            entry = new (ObjectType)(_opts)
        } else {
            entry = opts; // node
            entry.updateOpts({superview: this.$$.list});
        }
        this.data.push(entry);

        this.$$.list.style.height = maxHeight;
        this.scrollView._scrollBounds.maxY = this.$$.list.style.height + (this.bottomOffset || 0);
        return entry;
    };

    this.removeAllEntries = function (cb) {
        this.data = [];
        this.$$.list.removeAllSubviews();
        this.$$.noEntries.show();

        cb && cb();
    };
});
