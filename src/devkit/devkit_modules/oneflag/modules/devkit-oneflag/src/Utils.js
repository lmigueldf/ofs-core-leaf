jsio("import device");
jsio("import animate");
jsio("import ui.TextView");
jsio("import ui.View");
jsio("import ui.ImageView");
jsio("import ui.resource.Image");
jsio('import ui.ImageScaleView as ImageScaleView');
jsio("import oneflag.Settings as Settings");
jsio("import ui.resource.loader as loader");

jsio('import ui.filter as Filters');
jsio('import ui.Color as Color');
var rgba = new Color({});

var functionName = function functionName(fun) {
    var ret = fun.toString();
    ret = ret.substr('function '.length);
    ret = ret.substr(0, ret.indexOf('('));
    return ret;
};

exports.preloadAssets = function (folders, onProgress, cb) {
    var that = this;
    loader.preload(folders, function () {
        onProgress && onProgress(1);
        cb && cb();
    });
    loader.subscribe('imageLoaded', function (i) {
        onProgress && onProgress(loader.progress, i);
    });
};

var IMAGE_DEFAULT_PATH = "resources/images/";
var IMAGE_EXT = ".png";

exports.clamp = function (val, low, high) {
    return Math.max(low, Math.min(val, high));
}

var getAngleRad2Points = exports.getAngleRad2Points = function getAngleRad2Points(p1, p2) {
    return Math.atan2(p2.y - p1.y, p2.x - p1.x);
};

exports.getAngleRad3Points = function (p1, p2, p3) {
    var p12 = Math.sqrt(Math.pow((p1.x - p2.x), 2) + Math.pow((p1.y - p2.y), 2));
    var p13 = Math.sqrt(Math.pow((p1.x - p3.x), 2) + Math.pow((p1.y - p3.y), 2));
    var p23 = Math.sqrt(Math.pow((p2.x - p3.x), 2) + Math.pow((p2.y - p3.y), 2));

    //angle in radians
    return Math.acos(((Math.pow(p12, 2)) + (Math.pow(p13, 2)) - (Math.pow(p23, 2))) / (2 * p12 * p13));
    return Math.atan2(p2.y - p1.y, p2.x - p1.x);
};

var drawPoint = exports.drawCanvasPoint = function drawPoint(parent, p, color, size) {
    return createUiView(parent, {
        superview: this,
        grid: !!!size,
        x: p.x,
        y: p.y,
        width: size || .01,
        lockWidth: !!!size,
        height: !size ? void 0 : size,
        backgroundColor: color || 'red',
        zIndex: 100000
    });
};

var drawCanvasLine = exports.drawCanvasLine = function (parent, p1, p2, color, height) {
    var segment = createUiView(parent, {
        grid: true,
        width: .01,
        lockWidth: true,
        backgroundColor: color || 'red',
        zIndex: 10000
    });

    var width = Math.sqrt(((p2.x - p1.x)) * (p2.x - p1.x) + (p2.y - p1.y) * (p2.y - p1.y));
    segment.updateOpts({
        x: p1.x,
        y: p1.y,
        width: width,
        height: height || 1,
        r: getAngleRad2Points(p1, p2)
    });
    return segment;
};

/**
 * Returns a random float between `low` and `high`, high exclusive, or
 * between 0 and `low` if no `high` was passed.
 * @method randFloat
 * @return {float}
 */
exports.randFloat = function (low, high) {
    if (high == null) {
        high = low;
        low = 0;
    }
    return low + ((high - low) * Math.random());
}

exports.generateUUID = function () { // Public Domain/MIT
    var d = new Date().getTime();
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
        d += performance.now(); //use high-precision timer if available
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = (d + Math.random() * 16) % 16 | 0;
        d = Math.floor(d / 16);
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}

/**
 * Given an array, returns a suffled array.
 * @method choice
 * @param {Array} arr
 * @returns random element
 */
exports.shuffle = function (array) {
    var tmp, current, top = array.length;
    if (top)
        while (--top) {
            current = Math.floor(Math.random() * (top + 1));
            tmp = array[current];
            array[current] = array[top];
            array[top] = tmp;
        }
    return array;
}

/**
 * Returns a random int between `low` and `high`, high exclusive, or
 * between 0 and `low` if no `high` was passed.
 * @method randInt
 * @return {int}
 */
exports.randInt = function (low, high) {
    return exports.randFloat(low, high) | 0;
}

/**
 * Given an array, returns a random element from the array.
 * @method choice
 * @param {Array} arr
 * @returns random element
 */
exports.choice = function (arr) {
    return arr[arr.length * Math.random() | 0];
}
/**
 * Given an function.
 * @method isFunction
 * @param {Object} functionToCheck
 * @returns boolean result
 */
exports.isFunction = function (functionToCheck) {
    return typeof(functionToCheck) === 'function';
}

/**
 * Scales the root view of the DevKit application so that it has a
 * size of W x H but always fits within the main window, letterboxing
 * the view if necessary. A typical size is 1024x576, for fitting in
 * most phones reasonably well. You should call this function before
 * adding any other views to the app.
 * @method scaleRootView
 * @param {GC.Application} app
 * @param W desired main view width
 * @param H desired main view height
 */
exports.scaleRootView = function (app, W, H) {
    var view = app.view;
    var scale = Math.min(view.style.width / W, view.style.height / H);
    app.view = new ui.View({
        superview: view,
        scale: scale,
        width: W,
        height: H,
        x: (device.screen.width - W * scale) / 2,
        y: (device.screen.height - H * scale) / 2,
        clip: true,
    });
}
exports.setImagePath = function (imageName) {
    return 'resources/images/' + imageName + '.png'
}
var __Canvas = device.get('Canvas');
var __canvas;
var paintImageNode = exports.paintImageNode = function paintImageNode(node, opts) {
    __canvas = __canvas || new __Canvas();

    __canvas.width = node.style.width;
    __canvas.height = node.style.height;

    var superview = node;
    var visibility = node.style.visible;
    // Save position of animated view and restore after render.
    var as = superview.style;
    var x = as.x;
    var y = as.y;
    as.x = 0;
    as.y = 0;
    var context = __canvas.getContext('2D');

    if (!device.isMobileNative && !!opts.cornerRadius) {
        context.save();
        context.roundRect(0, 0, __canvas.width, __canvas.height, opts.cornerRadius * __canvas.width);

        if (!!superview.getImage) {
            !!superview.getImage() && superview.getImage().render(context, 0, 0, __canvas.width, __canvas.width);
        } else {
            context.fillStyle = opts.overlayColor || 'transparent';
            context.fill();
        }
        context.restore();
        context.clip();
    }

    if (!device.isMobileNative && !!opts.shadowColor && !!opts.shadowBlur) {
        // Shadow
        context.shadowColor = opts.shadowColor;
        context.shadowBlur = opts.shadowBlur;
        context.shadowOffsetX = opts.shadowOffsetX;
        context.shadowOffsetY = opts.shadowOffsetY;
    }

    !device.isMobileNative && !!opts.filter && (context.filter = opts.filter);

    superview.__view.wrapRender(context, {});
    if (!!opts.overlayColor || !!opts.compositeOperation) {
        context.save();
        //superview.__view.updateGlobalTransform();
        var gt = superview.__view._globalTransform;
        !!gt && context.setTransform(gt.a, gt.b, gt.c, gt.d, gt.tx, gt.ty);
        context.globalCompositeOperation = opts.compositeOperation || "source-atop";
        context.globalAlpha = opts.globalAlpha || 1; // you may want to make this an argument
        context.fillStyle = opts.overlayColor;
        context.fillRect(0, 0, __canvas.width, __canvas.height);

        // reset
        context.globalCompositeOperation = "source-over";
        context.globalAlpha = 1.0;
        context.restore();
    }


    as.x = x;
    as.y = y;

    var url = (device.isMobileNative ? 'data:image/png;base64,' : '') + __canvas.toDataURL('image/png', 1);

    node.updateOpts({
        image: url
    });
    // reset visibility
    node.style.visible = visibility;

    return url;
};
/**
 * Creates a global  Ui view (Image || Text || View) with scale factor
 */
var createUiView = exports.createUiView = function createUiView(parent, opts) {
    // default values
    (opts.width == void 0) && (opts.width = 1);
    if (!!opts.roundedClip && opts.height == void 0) {
        opts.lockWidth = true;
    }

    (opts.height == void 0) && (opts.height = 1);
    (opts.opacity == void 0) && (opts.opacity = 1);

    if (opts.lockWidth != null && opts.lockWidth) {
        opts.height = opts.width * (parent.style.width / parent.style.height);
    } else if (opts.lockHeight != null && opts.lockHeight) {
        opts.width = opts.height * (parent.style.height / parent.style.width);
    }

    var view;
    if ((opts.image != null || opts.imageName != void 0) || ((!!opts.clipColor) && !!opts.inlinewebGLClip && Settings.engineOpts.useWebGL)) {
        if ((!!opts.clipColor) && !!opts.inlinewebGLClip && Settings.engineOpts.useWebGL) {
            opts.imageName = '';
        }
        if (opts.image == void 0 && opts.imageName != '') {
            var hasExt = opts.imageName.split('.').length >= 2;
            var _img = new ui.resource.Image({url: IMAGE_DEFAULT_PATH + opts.imageName + (hasExt ? '' : IMAGE_EXT)});
            opts.image = {
                scale: 1,
                img: _img,
                width: _img.getWidth(),
                height: _img.getHeight()
            }
        } else if (opts.imageName == '') {
            opts.image = null;
        }
        var extendedOpts = {
            superview: parent,
            image: (opts.image && opts.image.img) || opts.image,
            width: opts.width || opts.image.width,
            height: opts.height || opts.image.height,
            x: opts.position && opts.position == 'relative' ? ((opts.x || 0) * opts.image.scale) : (opts.x || 0),
            y: opts.position && opts.position == 'relative' ? ((opts.y || 0) * opts.image.scale) : (opts.y || 0),
            opacity: opts.opacity || 1,
            canHandleEvents: false
        };

        if (!!opts.scaleMethod && !!opts.grid) {
            extendedOpts.scaleMethod = opts.scaleMethod;
            extendedOpts.layout = opts.layout || 'box';
            extendedOpts.debug = !!opts.debug;
            extendedOpts.renderCenter = opts.renderCenter == null ? true :  !!opts.renderCenter;
            if(extendedOpts.scaleMethod == 'tile' &&  opts.columns != void 0){
                extendedOpts.columns = opts.columns || 1;
            }else{
                extendedOpts.rows = opts.rows || 1;
            }
            if(opts.scaleWidth != null || opts.scaleHeight != null ){
                // old UI
                extendedOpts.sourceSlices = {
                    horizontal: {
                        left: parent.style.width * opts.width,
                        center: parent.style.width * opts.width,
                        right: parent.style.width * opts.width
                    },
                    vertical: {
                        top: parent.style.height * opts.height,
                        middle: parent.style.height * opts.height,
                        bottom: parent.style.height * opts.height
                    }
                };
                extendedOpts.destSlices = {
                    horizontal: {
                        left: parent.style.width * opts.width * (opts.scaleWidth || .05),
                        right: parent.style.width * opts.width * (opts.scaleWidth || .05)
                    },
                    vertical: {
                        top: parent.style.height * opts.height * (opts.scaleHeight || .1),
                        bottom: parent.style.height * opts.height * (opts.scaleHeight || .1)
                    }
                };
            }else{
                switch (opts.scaleMethod){
                case '2slice':
                    if(opts.scaleOrientation == 'horizontal'){
                        extendedOpts.sourceSlices = {
                            horizontal :{
                                left  :  parent.style.width * opts.width * (opts.sourceScaleWidthLeft || 0),
                                right  : parent.style.width * opts.width * (opts.sourceScaleWidthRight || 0)
                            }
                        };
                        extendedOpts.destSlices = {
                            horizontal :{
                                left  :  parent.style.width * opts.width * (opts.destScaleWidthLeft || 0)
                            }
                        };
                    }else{ // default vertical
                        extendedOpts.sourceSlices = {
                            vertical:{
                                top :  parent.style.height * opts.height * (opts.sourceScaleHeightTop || 0),
                                bottom : parent.style.width * opts.width * (opts.sourceScaleHeightBottom || 0)
                            }
                        };
                        extendedOpts.destSlices = {
                            vertical:{
                                top :  parent.style.height * opts.height * (opts.destScaleHeightTop || 0)
                            }
                        };
                    }

                    break;
                case '3slice':
                    if(opts.scaleOrientation == 'horizontal'){
                        extendedOpts.sourceSlices = {
                            horizontal :{
                                left  :  parent.style.width * opts.width * (opts.sourceScaleWidthLeft    || 0),
                                center  :  parent.style.width * opts.width * (opts.sourceScaleWidthCenter  || 0),
                                right  : parent.style.width * opts.width * (opts.sourceScaleWidthRight    || 0)
                            }
                        };
                        extendedOpts.destSlices = {
                            horizontal :{
                                left  :  parent.style.width * opts.width * (opts.destScaleWidthLeft || 0),
                                right  : parent.style.width * opts.width * (opts.destScaleWidthRight || 0)
                            }
                        };
                    }else{ // default vertical
                        extendedOpts.sourceSlices = {
                            vertical:{
                                top :  parent.style.height * opts.height * (opts.sourceScaleHeightTop || 0),
                                middle :  parent.style.height * opts.height * (opts.sourceScaleHeightMiddle || 0),
                                bottom : parent.style.width * opts.width * (opts.sourceScaleHeightBottom || 0)
                            }
                        };
                        extendedOpts.destSlices = {
                            vertical:{
                                top :  parent.style.height * opts.height * (opts.destScaleHeightTop || 0),
                                bottom : parent.style.width * opts.height * (opts.destScaleHeightBottom || 0)
                            }
                        };
                    }

                    break;
                case '6slice':
                    if(opts.scaleOrientation == 'horizontal'){
                        extendedOpts.sourceSlices = {
                            horizontal :{
                                left  :  parent.style.width * opts.width * (opts.sourceScaleWidthLeft    || 0),
                                center  :  parent.style.width * opts.width * (opts.sourceScaleWidthCenter  || 0),
                                right  : parent.style.width * opts.width * (opts.sourceScaleWidthRight    || 0)
                            },
                            vertical:{
                                top :  parent.style.height * opts.height * (opts.sourceScaleHeightTop || 0),
                                bottom : parent.style.width * opts.width * (opts.sourceScaleHeightBottom || 0)
                            }
                        };
                        extendedOpts.destSlices = {
                            horizontal :{
                                left  :  parent.style.width * opts.width * (opts.destScaleWidthLeft || 0),
                                right  : parent.style.width * opts.width * (opts.destScaleWidthRight || 0)
                            },
                            vertical:{
                                top :  parent.style.height * opts.height * (opts.destScaleHeightTop || 0),
                                bottom : parent.style.width * opts.height * (opts.destScaleHeightBottom || 0)
                            }
                        };
                    }else{ // default vertical
                        extendedOpts.sourceSlices = {
                            horizontal :{
                                left  :  parent.style.width * opts.width * (opts.sourceScaleWidthLeft    || 0),
                                right  : parent.style.width * opts.width * (opts.sourceScaleWidthRight    || 0)
                            },
                            vertical:{
                                top :  parent.style.height * opts.height * (opts.sourceScaleHeightTop || 0),
                                middle :  parent.style.height * opts.height * (opts.sourceScaleHeightMiddle || 0),
                                bottom : parent.style.width * opts.width * (opts.sourceScaleHeightBottom || 0)
                            }
                        };
                        extendedOpts.destSlices = {
                            horizontal :{
                                left  :  parent.style.width * opts.width * (opts.destScaleWidthLeft || 0),
                                right  : parent.style.width * opts.width * (opts.destScaleWidthRight || 0)
                            },
                            vertical:{
                                top :  parent.style.height * opts.height * (opts.destScaleHeightTop || 0),
                                bottom : parent.style.width * opts.height * (opts.destScaleHeightBottom || 0)
                            }
                        };
                    }
                    break;
                case '9slice':
                    if(opts.scaleOrientation == 'horizontal'){
                        extendedOpts.sourceSlices = {
                            horizontal :{
                                left  :  parent.style.width * opts.width * (opts.sourceScaleWidthLeft    || 0),
                                center  :  parent.style.width * opts.width * (opts.sourceScaleWidthCenter  || 0),
                                right  : parent.style.width * opts.width * (opts.sourceScaleWidthRight    || 0)
                            },
                            vertical:{
                                top :  parent.style.height * opts.height * (opts.sourceScaleHeightTop || 0),
                                bottom : parent.style.width * opts.width * (opts.sourceScaleHeightBottom || 0)
                            }
                        };
                        extendedOpts.destSlices = {
                            horizontal :{
                                left  :  parent.style.width * opts.width * (opts.destScaleWidthLeft || 0),
                                right  : parent.style.width * opts.width * (opts.destScaleWidthRight || 0)
                            },
                            vertical:{
                                top :  parent.style.height * opts.height * (opts.destScaleHeightTop || 0),
                                bottom : parent.style.width * opts.height * (opts.destScaleHeightBottom || 0)
                            }
                        };
                    }else{ // default vertical
                        extendedOpts.sourceSlices = {
                            horizontal :{
                                left  :  parent.style.width * opts.width * (opts.sourceScaleWidthLeft    || 0),
                                right  : parent.style.width * opts.width * (opts.sourceScaleWidthRight    || 0)
                            },
                            vertical:{
                                top :  parent.style.height * opts.height * (opts.sourceScaleHeightTop || 0),
                                middle :  parent.style.height * opts.height * (opts.sourceScaleHeightMiddle || 0),
                                bottom : parent.style.width * opts.width * (opts.sourceScaleHeightBottom || 0)
                            }
                        };
                        extendedOpts.destSlices = {
                            horizontal :{
                                left  :  parent.style.width * opts.width * (opts.destScaleWidthLeft || 0),
                                right  : parent.style.width * opts.width * (opts.destScaleWidthRight || 0)
                            },
                            vertical:{
                                top :  parent.style.height * opts.height * (opts.destScaleHeightTop || 0),
                                bottom : parent.style.width * opts.height * (opts.destScaleHeightBottom || 0)
                            }
                        };
                    }
                    break;
            }
            }

        }

        view = new ImageScaleView(extendedOpts);

        if (opts.filter) {
            rgba.parse(opts.filter.color || '#000000');
            var filter = (Filters[opts.filter.ctor || 'TintFilter']);
            filter && view.setFilter(new filter(opts.filter.props || (rgba)));
        }
    } else if (opts.text != null) {
        view = new ui.TextView({
            superview: parent,
            text: opts.text,
            color: opts.color || 'black',
            x: (opts.x || 0),
            y: (opts.y || 0),
            fontFamily: opts.fontFamily || device.defaultFontFamily,
            width: opts.width,
            height: opts.height,
            canHandleEvents: false,
            opacity: opts.opacity || 1,
            wrap: opts.wrap || false
        });

        if (opts.shadowWidth != null) {
            view.updateOpts({
                shadowWidth: opts.grid ? opts.shadowWidth * device.screen.width / 100 : opts.shadowWidth,
                shadowColor: opts.shadowColor || 'black'
            });
        }

        if (opts.strokeWidth != null) {
            view.updateOpts({
                strokeWidth: opts.grid ? opts.strokeWidth * device.screen.width / 100 : opts.strokeWidth,
                strokeColor: opts.strokeColor || 'black'
            });
        }

        if (opts.verticalAlign != null) {
            view.updateOpts({
                verticalAlign: opts.verticalAlign
            });
        }
        if (opts.horizontalAlign != null) {
            view.updateOpts({
                horizontalAlign: opts.horizontalAlign
            });
        }

        if (opts.size != null) {
            view.updateOpts({
                size: opts.grid ? opts.size * device.screen.width / 100 : opts.size
            });
        }
    } else if (opts.ctor != null) {
        if (opts.grid) {
            opts._width = parent.style.width * opts.width;
            opts._height = parent.style.height * opts.height;
        }
        var _opts = {
            ctor: opts.ctor,
            superview: parent,
            x: opts.x || 0,
            y: opts.y || 0,
            width: opts._width || opts.width || parent.style.width,
            height: opts._height || opts.height || parent.style.height
        };

        if (opts.extended) {
            for (var prop in opts.extended) {
                _opts[prop] = opts.extended[prop];
            }
        }
        view = new (opts.ctor)(_opts);
    } else {
        view = new ui.View({
            superview: parent,
            width: opts.width,
            height: opts.height,
            x: opts.x || 0,
            y: opts.y || 0,
            opacity: opts.opacity || 1,
            canHandleEvents: false
        });
    }

    if (opts.compositeOperation != null) {
        view.updateOpts({
            compositeOperation: opts.compositeOperation
        });
    }

    if (opts.zIndex != null) {
        view.updateOpts({
            zIndex: opts.zIndex
        });
    }

    if (opts.showGrid) {
        for (var i = 0; i < 10; i++) {
            new ui.View({
                superview: view,
                width: opts.width * (opts.grid ? parent.style.width : 1),
                height: 0.5,
                x: 0,
                y: (opts.height * (i / 10)) * (opts.grid ? parent.style.height : 1),
                opacity: 1,
                canHandleEvents: false,
                backgroundColor: 'rgba(255, 0, 0, 1)'
            });
            new ui.View({
                superview: view,
                width: 0.5,
                height: opts.height * (opts.grid ? parent.style.height : 1),
                x: (opts.width * (i / 10)) * (opts.grid ? parent.style.width : 1),
                y: 0,
                opacity: 1,
                canHandleEvents: false,
                backgroundColor: 'rgba(255, 0, 0, 1)'
            });
        }
    }
    if (opts.grid) {
        view.updateOpts({
            width: parent.style.width * opts.width,
            height: parent.style.height * opts.height
        });
        view.grid = opts.grid;
        opts._width = parent.style.width * opts.width;
        opts._height = parent.style.height * opts.height;

        if (opts.size != null) {
            view.updateOpts({
                size: Math.min(view.style.height , ((view.style.height * opts.size) / 20))
            });
        }
    }
    if (opts.grid && opts.grid.y != void 0) {
        view.updateOpts({
            y: parent.style.height * (opts.grid.y / 10)
        });
        opts._y = parent.style.height * (opts.grid.y / 10)
    }
    if (opts.grid && opts.grid.x != void 0) {
        view.updateOpts({
            x: parent.style.width * (opts.grid.x / 10)
        });
        opts._x = parent.style.width * (opts.grid.x / 10)
    }
    if (opts.r != null) {
        view.updateOpts({
            r: opts.r
        });
    }
    if (opts.backgroundColor != null) {
        view.updateOpts({
            backgroundColor: opts.backgroundColor || 'transparent'
        });
    }
    if (opts.anchorX != null) {
        view.updateOpts({
            anchorX: opts.anchorX
        });
    }
    if (opts.anchorY != null) {
        view.updateOpts({
            anchorY: opts.anchorY
        });
    }

    if (opts.centerAnchor == true) {
        view.updateOpts({
            anchorX: (opts.image != null ? opts.width != null ? ((opts.width) / 2) : ((opts.image.width) / 2) : (opts.width) / 2) * (opts.grid ? parent.style.width : 1),
            anchorY: (opts.image != null ? opts.height != null ? ((opts.height) / 2) : ((opts.image.height) / 2) : (opts.height) / 2) * (opts.grid ? parent.style.height : 1)
        });
    }
    if (opts.r != null) {
        view.updateOpts({
            r: opts.r
        });
    }
    if (opts.visible != null) {
        view.updateOpts({
            visible: opts.visible
        });
    }
    if (opts.scale != null) {
        view.updateOpts({
            scale: opts.scale
        });
    }
    if (opts.ignoreSubviews != null) {
        view.updateOpts({
            ignoreSubviews: opts.ignoreSubviews
        });
    }
    if (opts.canHandleEvents != null) {
        view.updateOpts({
            canHandleEvents: opts.canHandleEvents
        });
    }
    if (opts.blockEvents != null) {
        view.updateOpts({
            blockEvents: opts.blockEvents
        });
    }
    if (opts.flipX != null) {
        view.updateOpts({
            flipX: opts.flipX
        });
    }
    if (opts.flipY != null) {
        view.updateOpts({
            flipY: opts.flipY
        });
    }

    if (opts.scaleX != null) {
        view.updateOpts({
            scaleX: opts.scaleX
        });
    }
    if (opts.scaleY != null) {
        view.updateOpts({
            scaleY: opts.scaleY
        });
    }
    if (opts.clip != null) {
        view.updateOpts({
            clip: opts.clip
        });
    }

    if (opts.centerX != void 0 && opts.centerX) {
        view.updateOpts({
            x: ((parent && parent.style.width ? parent.style.width : device.screen.width) - view.style.width) / 2
        });
        opts.x = ((parent && parent.style.width ? parent.style.width : device.screen.width) - view.style.width) / 2;
        opts._x = ((parent && parent.style.width ? parent.style.width : device.screen.width) - view.style.width) / 2;
    }
    if (opts.centerY != void 0 && opts.centerY) {
        view.updateOpts({
            y: ((parent && parent.style.height != void 0 ? parent.style.height : device.screen.height) - view.style.height) / 2
        });
        opts.y = ((parent && parent.style.height != void 0 ? parent.style.height : device.screen.height) - view.style.height) / 2;
        opts._y = ((parent && parent.style.height != void 0 ? parent.style.height : device.screen.height) - view.style.height) / 2;
    }

    if (!opts.grid) {
        opts.width = view.style.width;
        opts.height = view.style.height;
    }

    opts._x = opts._x || 0;
    opts._y = opts._y || 0;
    if (!!opts.effectsTransform) {
        paintImageNode(view, opts.effectsTransform);
    }

    view.___opts = opts; // save original reference for parse simplify KISS
    return view;
};

exports.getViewFromComponentsList = function (list, path) {
    var temp = null;
    if (path.length > 1) {
        for (var i = 0; i < path.length; i++) {
            if (i === 0) {
                temp = list[path[i]];
            } else {
                temp = temp.children[path[i]];
            }
        }
    } else if (path.length) {
        temp = list[path[0]];
    } else {
        return null;
    }
    return temp;
};

var Canvas = device.get('Canvas');
//var IS_NATIVE = !device.isSimulator && !device.isMobileBrowser;
// this MUST be used within a VIEW or IMAGEVIEW SCOPE and MUST be BIND to the SCOPE
// p.ex. var url = bind([VIEW SCOPE], toBase64());
var toBase64 = function (superview, opts) {
    try {
        var width = opts.width || device.screen.width;
        var height = opts.height || device.screen.height;
        var quality = opts.quality || 1.0;

        console.info(width, height, quality);
        var canvas = new Canvas({
            width: width,
            height: height
        });

        // Save position of animated view and restore after render.
        var as = superview.style;
        var x = as.x;
        var y = as.y;
        as.x = 0;
        as.y = 0;

        superview.__view.wrapRender(canvas.getContext('2D'), {});

        as.x = x;
        as.y = y;

        var url = canvas.toDataURL('image/png', quality);
        return url;
    } catch (e) {
        console.error(e);
        return null;
    }
};
exports.toBase64 = toBase64;

// animations helpers
var loop = false;
exports.isActive = function () {
    return loop;
};
exports.activateAnimations = function () {
    loop = true;
};
exports.deactivateAnimations = function () {
    loop = false;
};
exports.continuousAnimateRotation = function continuousAnimateRotation(n, speed) {
    if (!loop) {
        return;
    }
    animate(this).clear()
        .now({
            r: 3.14 * n
        }, (speed || 10000), animate.linear)
        .then(continuousAnimateRotation.bind(this, n + 1, speed));
};
exports.continuousAnimateScale = function continuousAnimateScale(n, factor, speed) {
    if (!loop) {
        return;
    }
    animate(this).clear()
        .now({
            scale: n * (factor || 0.9)
        }, (speed || 800), animate.easeIn)
        .then({
            scale: n
        }, (speed || 800), animate.easeOut)
        .then(continuousAnimateScale.bind(this, n, factor, speed));
};
exports.continuousAnimateShake = function continuousAnimateShake(x, factor, speed) {
    if (!loop) {
        return;
    }
    animate(this).clear()
        .now({
            x: x - (factor * 20)
        }, (speed || 800), animate.easeOut)
        .then({
            x: x + (factor * 20)
        }, (speed || 800), animate.easeIn)
        .then({
            x: x
        }, (speed || 800), animate.easeOut)
        .then(continuousAnimateShake.bind(this, x, factor, speed));
};
exports.continuousAnimateWidthHeight = function continuousAnimateWidthHeight(x, y, width, height, factorWidth, factorHeight, speed) {
    if (!loop) {
        return;
    }
    animate(this).clear()
        .now({
            x: x - (((width * factorWidth) - width) / 2),
            y: y - (((height * factorHeight) - height) / 2),
            width: width * factorWidth,
            height: height * factorHeight
        }, (speed || 800), animate.easeIn)
        .then({
            x: x,
            y: y,
            width: width,
            height: height
        }, (speed || 800), animate.easeOut)
        .then(continuousAnimateWidthHeight.bind(this, x, y, width, height, factorWidth, factorHeight, speed));
};

var originalAnimate = animate;
var animations = [];
exports.clearAllAnimations = function clearAllAnimations() {
    for (var i in animations) {
        animations[i].clear();
    }
    animations = [];
};
exports.animate = function (node) {
    var __anim = originalAnimate.call(originalAnimate, node);
    animations.push(__anim);
    return __anim;
};
exports.animateObjectPipeline = function (object, optsArr, cb, onStartWait, onEndwait) {
    var anim = animate(object).clear();
    var i = 0;
    var pipe = function (_cb) {
        if (!!optsArr[i]) {
            anim.then(optsArr[i], optsArr[i].delay, optsArr[i].animation || animate.linear)
                .wait(optsArr[i].wait || 0)
                .then(function () {
                    i++;
                    pipe(_cb);
                }, 0);
        } else {
            anim
                .wait(onEndwait || 0)
                .then(function () {
                    _cb && _cb();
                }, 0)
        }
    };
    setTimeout(function () {
        pipe(cb)
    }, onStartWait);
};
// set animations indexing
exports.animate.linear = 1;
exports.animate.easeIn = 2;
exports.animate.easeOut = 3;
exports.animate.easeInOut = 4;
exports.animate.easeInQuad = 5;
exports.animate.easeOutQuad = 6;
exports.animate.easeInOutQuad = 7;
exports.animate.easeInCubic = 8;
exports.animate.easeOutCubic = 9;
exports.animate.easeInOutCubic = 10;
exports.animate.easeInQuart = 11;
exports.animate.easeOutQuart = 12;
exports.animate.easeInOutQuart = 13;
exports.animate.easeInQuint = 14;
exports.animate.easeOutQuint = 15;
exports.animate.easeInOutQuint = 16;
exports.animate.easeInSine = 17;
exports.animate.easeOutSine = 18;
exports.animate.easeInOutSine = 19;
exports.animate.easeInExpo = 20;
exports.animate.easeOutExpo = 21;
exports.animate.easeInOutExpo = 22;
exports.animate.easeInCirc = 23;
exports.animate.easeOutCirc = 24;
exports.animate.easeInOutCirc = 25;
exports.animate.easeInElastic = 26;
exports.animate.easeOutElastic = 27;
exports.animate.easeInOutElastic = 28;
exports.animate.easeInBack = 29;
exports.animate.easeOutBack = 30;
exports.animate.easeInOutBack = 31;
exports.animate.easeInBounce = 32;
exports.animate.easeOutBounce = 33;
exports.animate.easeInOutBounce = 34;

var originalSetTimeout = setTimeout;
var timeouts = [];
exports.clearAllTimeouts = function () {
    for (var id in timeouts) {
        clearTimeout(timeouts[id]);
    }
    timeouts = [];
};
exports.setTimeout = function (cb, delay) {
    var __timeout = originalSetTimeout(cb, delay);
    timeouts.push(__timeout);
    return __timeout;
};

var originalSetInterval = setInterval;
var intervals = [];
exports.clearAllIntervals = function () {
    for (var id in intervals) {
        clearInterval(intervals[id]);
    }
    intervals = [];
};
exports.setInterval = function (cb, delay) {
    var __interval = originalSetInterval(cb, delay);
    intervals.push(__interval);
    return __interval;
};

var canvasTo;
var cachedClippedUrls = {};

function generateRoundedImageURL(opts, callback) {
    if (!Settings.engineOpts.useWebGL) {
        callback(opts.url);
    } else if (!!cachedClippedUrls[opts.url] && !!opts.useCache) {
        callback(cachedClippedUrls[opts.url]);
    } else {
        console.info('clip');
        var image = new Image();
        image.crossOrigin = "Anonymous";
        image.onload = function () {
            var canvasTo = canvasTo || document.createElement('canvas');
            var width = canvasTo.width = opts.width || this.naturalWidth; // or 'width' if you want a special/scaled size
            var height = canvasTo.height = opts.height || this.naturalHeight; // or 'height' if you want a special/scaled size

            var ctx = canvasTo.getContext('2d');
            if (!opts.doNotClip) {
                // Save the state, so we can undo the clipping
                ctx.save();
                // Create a shape, of some sort
                ctx.beginPath();
                ctx.moveTo(width * .2, height * .1);
                ctx.lineTo(width * .8, height * .1);

                ctx.lineTo(200, 75);

                ctx.lineTo(100, 155);
                ctx.lineTo(0, 75);

                ctx.closePath();
                // Clip to the current path
                ctx.clip();
            }
            ctx.drawImage(image, 0, 0);
            ctx.restore();
            var dtUrl = canvasTo.toDataURL('image/png');
            cachedClippedUrls[opts.url] = dtUrl;
            callback(dtUrl);
        };
        image.src = opts.url;
    }
};
exports.generateRoundedImageURL = generateRoundedImageURL;


// EFFECTS PARTICLES
// EFFECTS START ------------------------------------------------------------
var PI = Math.PI;
var TAU = 2 * PI;
var pow = Math.pow;
var abs = Math.abs;
var sin = Math.sin;
var cos = Math.cos;
var sqrt = Math.sqrt;
var random = Math.random;
var choose = exports.choice;
var rollFloat = exports.randFloat;
var rollInt = exports.randInt;
var min = Math.min;
var max = Math.max;

/**
 *Set the composite operation from one of the following supported types:

 source-atop: Display the source image wherever both images are opaque. Display the destination image wherever the destination image is opaque but the source image is transparent. Display transparency elsewhere.
 source-in: Display the source image wherever both the source image and destination image are opaque. Display transparency elsewhere.
 source-out: Display the source image wherever the source image is opaque and the destination image is transparent. Display transparency elsewhere.
 source-over: Display the source image wherever the source image is opaque. Display the destination image elsewhere.
 destination-atop: Same as source-atop but using the destination image instead of the source image and vice versa.
 destination-in: Same as source-in but using the destination image instead of the source image and vice versa.
 destination-out: Same as source-out but using the destination image instead of the source image and vice versa.
 destination-over: Same as source-over but using the destination image instead of the source image and vice versa.
 lighter: Display the sum of the source image and destination image, with color values approaching 255 (100%) as a limit.
 xor: Exclusive OR of the source image and destination image.
 copy: Display the source image instead of the destination image.
 */

var effects = {};
/**
 * emitExplosion
 * ~ general explosion effect
 */
effects.emitParticles = function (engine, entity) {
    var count = entity.count || 32;
    var data = engine.obtainParticleArray(count);
    var size = entity.size || device.screen.width * 0.0035;
    var ttl = entity.ttl || 1000;
    var stop = -(entity.ttl || 1000) / ttl;
    var vb = entity.viewBounds;
    var x = entity.x;
    var y = entity.y;
    // define each particles trajectory
    for (var i = 0; i < count; i++) {
        var p = data[i];
        p.polar = true;
        p.ox = x + (!!entity.rangeX ? rollFloat(entity.rangeX[0], entity.rangeX[1]) : rollFloat(device.screen.width * -0.0065, device.screen.width * 0.065));
        p.oy = y + (!!entity.rangeY ? rollFloat(entity.rangeY[0], entity.rangeY[1]) : rollFloat(-0, device.screen.width * 0.0005));


        //p.dx = (Math.random() * 50 - 25) * -5;
        p.dy = entity.dy || -device.screen.height * .2;
        p.dr = Math.random() * 2 * Math.PI;
        //p.ddx = (Math.random() * 100 - 50)  *-1;
        //p.ddy = (-Math.random() * 75) * 1;


        /*
            p.ax = 0;//size / 2;
            p.ay = 0//;size / 2;
            p.dax = Math.random() * 60 - 30;
            p.day = Math.random() * 60 - 30;
            p.ddax = -p.dax / 2;
            p.dday = -p.day / 2;
            */

        p.radius = entity.radius || rollFloat(-5, 5);
        p.dradius = entity.dradius || rollFloat(-20, 20);

        p.ddradius = stop * p.dradius;
        p.theta = TAU * random();

        if (!entity.r) {
            p.r = TAU * random();
            p.dr = rollFloat(-4, 4);
            p.ddr = stop * p.dr;
        }
        p.anchorX = size / 2;
        p.anchorY = size / 2;
        p.width = size;
        p.height = size;

        p.opacity = entity.opacity || 1;
        p.dopacity = -1000 / ttl;
        p.ddopacity = -Math.random() * 1000 / ttl;

        p.scale = entity.scale || rollFloat(0.25, 2);
        p.dscale = -stop * p.scale;

        p.ttl = ttl;
        p.image = entity.image;
        // the rare, non-blending smoke particle is cool
        p.compositeOperation = random() < 0.5 ? "source-atop" : "lighter";
    }
    engine.emitParticles(data);
};

exports.effects = effects;
