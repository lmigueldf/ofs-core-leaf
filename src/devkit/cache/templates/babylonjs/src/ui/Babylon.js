//------------------------------------------------------------------------------------- 
var namespace = 'Babylon';
//------------------------------------------------------------------------------------- 
// https://github.com/BabylonJS/Babylon.js
// https://cdn.babylonjs.com/babylon.js
// https://cdn.babylonjs.com/babylon.max.js
//------------------------------------------------------------------------------------- 
jsio('import oneflag.LocalStorage as LocalStorage');
jsio('import src.ui.AssetLoader as Loader');
//------------------------------------------------------------------------------------- 
// !!! TODO :: add service worker to allow proper cache for assets
// https://playground.babylonjs.com/#E4VDDW - Excellent playground
//------------------------------------------------------------------------------------- 
var START_FUNC = 'startScene';
//-------------------------------------------------------------------------------------
var cache = {}; 
var RGBA = Class(function() {
 
  this.init = function() {
    this.r = 0;
    this.g = 0;
    this.b = 0;
    this.a = 1;

    this.update.apply(this, arguments);
  }; 

  this.update = function(rgba) {
    if (arguments.length > 2) {
      this.r = arguments[0];
      this.g = arguments[1];
      this.b = arguments[2];
      this.a = arguments[3] !== undefined ? arguments[3] : 1;
    } else if (typeof rgba === 'string') {
      var cached = cache[rgba];
      if (cached) {
        this.set(cached);
      } else {
        this.parse(rgba);
      }
    } else if (rgba) {
      this.set(rgba);
    }
  };

  this.get = function() {
    return {
      r: this.r,
      g: this.g,
      b: this.b,
      a: this.a
    };
  };

  this.set = function(rgba) {
    if (rgba !== undefined) {
      this.r = rgba.r || 0;
      this.g = rgba.g || 0;
      this.b = rgba.b || 0;
      this.a = rgba.a !== undefined ? rgba.a : 1;
    }
  };

  var rgbParser = /rgba?\(\s*([.0-9]+)\s*,\s*([.0-9]+)\s*,\s*([.0-9]+)\s*,?\s*([.0-9]+)?\s*\)/;

  function hexToRGB(a) {
    a = '0x' + a.slice(1).replace(a.length < 5 && /./g, '$&$&');
    return [a >> 16, a >> 8 & 255, a & 255];
  };

  this.parse = function(str) {
    var match = str.match(rgbParser);
    if (match) {
      this.r = parseInt(match[1]) || 0;
      this.g = parseInt(match[2]) || 0;
      this.b = parseInt(match[3]) || 0;
      if (match[4] !== undefined) {
        var a = parseFloat(match[4]);
        this.a = isNaN(a) ? 1 : a;
      } else {
        this.a = 1;
      }
    } else {
      // handles hex strings (#FC0, #FFCC00, #FC09, #FFCC0099)
      this.a = 1;
      var len = str.length;
      if (len === 5) {
        var a = str.substring(4, 5);
        this.a = ('0x' + a + a | 0) / 255;
        str = str.substring(0, 4);
      } else if (len === 9) {
        this.a = ('0x' + str.substring(7, 9) | 0) / 255;
        str = str.substring(0, 7);
      }
      var match = hexToRGB(str);
      if (match) {
        this.r = match[0];
        this.g = match[1];
        this.b = match[2];
      }
    }
  };

  this.toHex = function() {
    return "#" + ((256 + this.r << 8 | this.g) << 8 | this.b).toString(16).slice(1);
  };

  this.toString = function() {
    return 'rgba(' + this.r + ',' + this.g + ',' + this.b + ',' + this.a + ')';
  };

});
var parse = function(str) {
  return cache[str] || (cache[str] = new RGBA(str));
};
//-------------------------------------------------------------------------------------
var CACHED_MESHES = window._CACHED_MESHES = window._CACHED_MESHES || {};
//------------------------------------------------------------------------------------- 
exports = Class(function(supr) {
  this.sounds = {};
  //------------------------------------------------------------------------------------- 
  this.init = function() {
    this.start();
  };
  //------------------------------------------------------------------------------------- 
  this.loadCanvas = function(id) {
    var canvas;
    if (!window.__canvas || (window.__canvas.id != id)) {
      document.getElementById(id) && document.getElementById(id).remove();
      canvas = document.createElement('canvas'),
      div = document.body;
      div.style.overflow = 'hidden';

      canvas.id = id;
      canvas.width = device.screen.width;
      canvas.height = device.screen.height;
      canvas.style.zIndex = 8;
      canvas.style.position = "absolute";
      canvas.style.overflow = 'hidden';
      div.appendChild(canvas);
    }

    // Get the canvas DOM element
    if (!!window.__canvas) {
      ref = canvas;
    } else {
      ref = window.__canvas = window.__canvas || document.getElementById(id);
    }
    return ref;
  };
  //-------------------------------------------------------------------------------------  
  this.start = function() {
    var id = 'main';
    // NOTE THAT THIS HAS LIVE EDITOR CACHE SYSTEM using the GLOBAL - WINDOW usage
    // load canvas element in DOM
    this.canvas = this.loadCanvas(id);
    // Load the 3D engine
    window.__engine = this.engine = window.__engine || new BABYLON.Engine(this.canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true
    });
    // register resize handler
    if (window.onResizeFunction) {
      window.removeEventListener('resize', window.onResizeFunction);
    }
    window.onResizeFunction = bind(this, this.onResize);
    // Watch for browser/canvas resize events
    window.addEventListener("resize", window.onResizeFunction);
    // Ready 
    this.onReady(this.engine);
  };

  this.onResize = function(width, height) {
    this.engine.resize();
  };

  this.startEngineLoop = function() {
    this.engine.runRenderLoop(bind(this, function(dt) {
      if (!this.running) {
        try {
          this.engine.dispose();
        } catch (ex) {
          console.info(ex);
        }
        return;
      }
      this.onTick(dt);
    }));
  };

  this.destroy = function() {
    this.running = false;
    document.getElementById("main") && document.getElementById("main").remove();
  };
  //------------------------------------------------------------------------------------- 
  this.onTick = function(dt) {
    this.scene && this.scene.render();
    this.tick && this.tick(dt);
  };
  //------------------------------------------------------------------------------------- 
  this.onReady = function(app) {
    this.app = app;
    //this.emit('ready', 'https://www.babylonjs.com/', 'Go to BabylonJs Home');
    this.running = true;
    this.startEngineLoop();

    this.ready && this.ready();

  };
  // -------------------------------------------------------------------------------------
  this.renderSchema = function(_, schema, multiplier, defaultPlaneSize, camera, scene) {
    /* TOOLS integrations for Schema Editor*/
    var schema = load('src.ui.schemas.' + schema);
    var self = _; // ugh!
    var that = this;
    recursiveTreeDrill = function(treeNode, parent) {
      var step = .001;
      var zIndex = 0;
      var ref = {
        width: parent != void 0 ? parent.view.width : defaultPlaneSize.width,
        height: parent != void 0 ? parent.view.height : defaultPlaneSize.height
      };
      for (var node in treeNode) {
        var _node = treeNode[node];
        _node.zIndexx = Number(_node.zIndex || 0) + ((parent && Number(parent.zIndexx)) || 0) + zIndex;

        _node.view = {};
        _node.view.scene = scene;
        _node.view.camera = camera;
        _node.view.engine = that.engine;

        _node.view.width = ref.width * Number(_node.width);
        _node.view.height = ref.height * Number(_node.height);

        _node.view.mesh = BABYLON.MeshBuilder.CreatePlane(_node.id, {
          width: _node.view.width,
          height: _node.view.height
        });
        
        
        parent && _node.view.mesh.setParent(parent.view.mesh);

        _node.view.mesh.position.x = (_node.view.width / 2);
        _node.view.mesh.position.y = (-_node.view.height / 2);
        
        if(!!parent){
          _node.view.mesh.position.x = 0;
          _node.view.mesh.position.y = 0;
          _node.view.mesh.position.x -= (parent.view.width / 2) - (_node.view.width / 2);
          _node.view.mesh.position.y += (parent.view.height / 2) - (_node.view.height/2);
          
          if (_node.centerX) {
            _node.view.mesh.position.x += (parent.view.width - _node.view.width) / 2
          }else{
            _node.view.mesh.position.x += parent.view.width * (_node.grid.x / 10);
          }
          if (_node.centerY) {
            _node.view.mesh.position.y -= (parent.view.height - _node.view.height) / 2;
          }else{
            _node.view.mesh.position.y -= parent.view.height * (_node.grid.y / 10);
          }
        }
        
        _node.r && (_node.view.mesh.rotation.z = -_node.r);
        _node.view.mesh.scaling.x = _node.scale || 1;
        _node.view.mesh.scaling.y = _node.scale || 1;
        _node.view.material = new BABYLON.StandardMaterial();
        if (_node.imageName) {
          //_node.view.material.diffuseTexture = new BABYLON.Texture("resources/images/" + _node.imageName);
          _node.view.material.diffuseTexture = new BABYLON.Texture(Loader.getCachedImage(_node.imageName.split('.').splice(0, _node.imageName.split('.').length - 1).join('.')));
          _node.view.material.diffuseTexture.hasAlpha = true;
          _node.view.material.alpha = Number(_node.opacity);

        } else if (_node.text) {
          var text = _node.text;
          var color = _node.color || "#fff";
          var backgroundColor = _node.backgroundColor;

          var res = (1024) * multiplier;
          var DTWidth = _node.view.width * res;
          var DTHeight = _node.view.height * res;
          var dynamicTexture = new BABYLON.DynamicTexture("DynamicTexture", {
            width: DTWidth,
            height: DTHeight
          }, scene);
          dynamicTexture.hasAlpha = true;

          _node.view.material.backFaceCulling = true;
          //_node.view.material.specularColor = new BABYLON.Color3(0, 0, 0);
          _node.view.material.diffuseTexture = dynamicTexture;

          _node.view.mesh.material = _node.view.material;

          _node.view.updateText = bind(_node, function(ctx, w, h, text, scale) {
            // https://playground.babylonjs.com/#TMHF80#1
            var textureContext = ctx.getContext();
            textureContext.clearRect(0, 0, w, h);
            var size = res; //any value will work
            textureContext.font = size + "px " + this.fontFamily;
            var textWidth = Math.max(w, textureContext.measureText(text).width);
            //Calculate ratio of text width to size of font used
            var ratio = textWidth / size; // 12 or any value
            var fontSize = Math.floor((h / (ratio)) * (scale || 1)); //size of multiplier (1) can be adjusted, increase for smaller text
            var font = "" + fontSize + "px " + (this.fontFamily || "roboto");
            //this.view.fontSize; ???
            //console.info(text, color, font, backgroundColor);
            
            var alignment = null;
            switch (_node.horizontalAlign) {
              case 'right':
                break;
              case 'left':
                alignment = 0;
                break;
              
              default:
                // code
            }
            ctx.drawText(text, alignment, null, font, this.color, this.backgroundColor, true, true);
            ctx.update();
          }, dynamicTexture, DTWidth, DTHeight);

          _node.view.updateText(text, (defaultPlaneSize.height) * (_node.size/24));

          if (_node.elementName && _node.elementType) {
            that.setupInput(_node, function(value) {
              //console.info('on value changed', value);
            }, function(value) {
              console.info('on value submit', value);
            });
          }

        } else {
          var color = parse(_node.backgroundColor);
          _node.view.material.diffuseColor = new BABYLON.Color3(color.r / 255, color.g / 255, color.b / 255);
          _node.view.material.alpha = Number(color.a || 0) * Number(_node.opacity);
        }
        _node.view.mesh.material = _node.view.material;


        _node.view.mesh.position.z = -((_node.zIndexx || 0) * step);
        zIndex++;

        _node.view.mesh.setEnabled(_node.visible == void 0 ? true : _node.visible);
        _node.show = function() {
          _node.visible = true;
          _node.view.mesh.setEnabled(_node.visible);
        };
        _node.hide = function() {
          _node.visible = false;
          _node.view.mesh.setEnabled(_node.visible);
        };

        if (_node.onInput && !self[_node.onInput]) {
          console.info('Warning! Schema function does not exist in scope.', _node.onInput);
        } else {
          _node.onInput && (_node.view.mesh.__event = self[_node.onInput] && bind(self, self[_node.onInput], _node, scene));
        }

        self[_node.id] = _node;

        recursiveTreeDrill(_node.children || {}, _node);

      }
    }
    recursiveTreeDrill(schema, void 0);
    // input handling loop
    var INPUTS_UPDATE = false;
    var activeTextNode;
    scene.onPointerObservable.add(bind(parent, function(pointerInfo) {
      switch (pointerInfo.type) {
        case BABYLON.PointerEventTypes.POINTERPICK:
          var nodeId = pointerInfo.pickInfo.pickedMesh.id;
          if (this[nodeId] && this[nodeId].toggleFocus) {
            activeTextNode = this[nodeId].toggleFocus();
          } else if (activeTextNode) {
            console.info('remove focus', activeTextNode);
            if (activeTextNode) {
              activeTextNode = activeTextNode.removeFocus();
            }
            this.hasFocus = {};
            INPUTS_UPDATE = true;
          }
          break;
        case BABYLON.PointerEventTypes.POINTERTAP:
          pointerInfo.pickInfo.pickedMesh &&
            pointerInfo.pickInfo.pickedMesh.__event && pointerInfo.pickInfo.pickedMesh.__event(pointerInfo.type, pointerInfo.pickInfo);
          break;
      }
    }));
    camera.onProjectionMatrixChangedObservable.add(function() {
      INPUTS_UPDATE = true;
    });
    camera.onViewMatrixChangedObservable.add(function() {
      INPUTS_UPDATE = true;
    });
  };

  this.setupInput = function(node, onChange, onSubmit) {
    if (!this.hasFocus) {
      this.hasFocus = {};
    }
    var elementName = node.elementName;
    var elementType = node.elementType;

    var opts = {
      text: '',
      placeholder: node.placeholder || '...',
      opacity: node.opacity == void 0 ? 1 : node.opacity,
      type: node.type || 'text',
      horizontalAlign: node.horizontalAlign || 'center',
      fontFamily: node.fontFamily || 'Roboto',
      size: (node.size || 18),
      maxLength: node.maxLength || 12,
      rows: node.rows || 1,
      color: node.color || '#000000',
      backgroundColor: node.backgroundColor || 'transparent'
    };
    //node.removeAllSubviews();
    this.hasFocus[node.id] = false;

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

    ele.type = opts.type || 'text';
    ele.style['text-align'] = opts.horizontalAlign || 'left';
    ele.style['color'] = opts.color || 'black';
    ele.style['background-color'] = opts.backgroundColor || 'transparent';
    ele.style['font-size'] = ((opts.size || (node.style.height))) + 'px';
    ele.style['font-family'] = opts.fontFamily || 'inherit';


    /*node.updateOpts({
      visible: !!device.isMobileBrowser,
      //opacity: node._opts.text.length > 0 ? (opts.opacity || 1) : .25,
      text: node._opts.text.length > 0 ? node._opts.text : node.origin.placeholder
    });
    node.updateOpts({
      horizontalAlign: opts.horizontalAlign || 'left'
    });
    node.updateOpts({
      color: opts.color || '#000000'
    });
    node.updateOpts({
      backgroundColor: opts.backgroundColor || 'transparent'
    });*/

    var curr = '';
    ele.oninput = bind(this, function(ev) {
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

      /*node.updateOpts({
        text: curr.length > 0 ? curr : node.origin.placeholder
      });*/

      setTimeout(bind(this, function() {
        ev.target.value = curr;
      }), 50);
    });
    ele.onfocus = bind(this, function(ev, value) {
      this.hasFocus[elementName] = true;

      /*node.onFocus && node.onFocus(this.hasFocus[elementName], ele.value);
      !!device.isMobileBrowser && setTimeout(bind(this, function() {
        var val = ele.value; //store the value of the element
        ele.value = ''; //clear the value of the element
        ele.value = val; //set that value back.
      }), 200);*/
    });

    ele.onblur = bind(this, function(ev, value) {
      this.hasFocus[elementName] = false;
      /*node.onFocus && node.onFocus(this.hasFocus[elementName], ele.value);
      setTimeout(bind(this, function() {
        var val = ele.value; //store the value of the element
        ele.value = ''; //clear the value of the element
        ele.value = val; //set that value back.
        onSubmit && onSubmit(ele.value);
        node.onSubmit && node.onSubmit(ele.value);
      }), 200);*/
    });
    ele.onkeyup = bind(this, function(ev, value) {
      if (ev.keyCode === 13) {
        this.hasFocus[elementName] = false;
        ev.preventDefault();
        ele.blur();
        onSubmit && onSubmit(ele.value);
        node.removeFocus();
      } else {
        node.view.updateText(ele.value);
        onChange && onChange(ele.value);
      }
    });
    ele.onsubmit = bind(this, function(ev, value) {
      this.hasFocus[elementName] = false;
      onSubmit && onSubmit(ele.value);

      node.removeFocus();
    });

    node.view.updateTextViewPosition = bind(this, function() {
      if (!!INPUTS_UPDATE) {
        // update text node position            
        var pos = BABYLON.Vector3.Project(
          node.view.mesh.getAbsolutePosition(),
          BABYLON.Matrix.IdentityReadOnly,
          node.view.scene.getTransformMatrix(),
          node.view.camera.viewport.toGlobal(node.view.engine.getRenderWidth(), node.view.engine.getRenderHeight())
        );
        if (this.hasFocus[node.elementName]) {
          ele['placeholder'] = opts.placeholder;
          node.hide();

          // TODO :: review this
          if (true || device.isMobileBrowser && device.isAndroid) {
            ele.style['left'] = '0px';
            ele.style['padding'] = '0px 7px';
            //ele.style['top'] = (window.innerHeight * .5) + 'px';
            //ele.style['bottom'] = 'inherit';
            delete ele.style['top'];
            ele.style['bottom'] = '0px';
            ele.style['width'] = '100%';
            ele.style['height'] = (56 / device.screen.devicePixelRatio) * device.screen.devicePixelRatio + 'px';
            ele.style['font-size'] = ((56 / device.screen.devicePixelRatio) * .3) * device.screen.devicePixelRatio + 'px';
            ele.style['background-color'] = 'rgba(230, 230, 230, 1)';
            ele.style['color'] = '#000000';
            ele.style['text-align'] = 'left';
            ele.style['opacity'] = '1';
            ele.style['z-index'] = '99000';
            node.show();
          } else {
            ele.style = "position: absolute; transform: translate(-50%, -50%); display: none;";
            ele.style['position'] = 'absolute';
            ele.style['transform'] = 'transform: translate(-50%, -50%)';
            ele.style['display'] = 'none';
            ele.style['z-index'] = 999;

            ele.style['color'] = opts.color || '#000000';
            ele.style['background-color'] = opts.backgroundColor || 'rgba(230, 230, 230,  0)';
            ele.style['width'] = (node.view.width * device.screen.devicePixelRatio) * 1 + 'px';
            ele.style['height'] = (node.view.height * device.screen.devicePixelRatio) * 1 + 'px';
            ele.style['font-size'] = ((node.view.fontSize) / device.screen.devicePixelRatio) * 1 + 'px';

            ele.style['left'] = (pos.x) * 1 + 'px';
            ele.style['top'] = (pos.y) * 1 + 'px';

            ele.style['bottom'] = 'inherit';
            ele.style['text-align'] = opts.horizontalAlign || 'center';
            ele.style['font-family'] = opts.fontFamily || 'inherit';

          }
          ele.style['display'] = 'block';
          ele.style['color'] = 'black';
          ele.style['border'] = 'none';
          ele.style['outline'] = 'none';
        } else {
          ele.style['color'] = opts.color || 'black';
          ele.style['font-size'] = ((opts.size || (node.view.height)) / device.screen.devicePixelRatio) + 'px';
          ele.style['font-family'] = opts.fontFamily || 'inherit';
          ele.style['display'] = 'none';
          ele.style['border'] = 'none';
          ele.style['outline'] = 'none';

          node.show();
        }
        INPUTS_UPDATE = false;
      }
    });

    INPUTS_UPDATE = true;
    node.view.scene.registerAfterRender(bind(this, node.view.updateTextViewPosition));


    // EXTEND node
    node.getInputValue = function() {
      return ele.value; //|| ele.placeholder;
    };

    node.setInputValue = function(value) {
      node.updateOpts({
        text: value
      })
      ele.value = value;
    };

    node.focusInput = bind(this, function() {
      this.hasFocus[elementName] = true;
      INPUTS_UPDATE = true;
      setTimeout(bind(this, function() {
        ele && ele.click();
        ele && ele.focus();
      }), 100);
      document.activeElement.blur();
    });

    node.removeFocus = bind(this, function() {
      this.hasFocus[elementName] = false;
      document.activeElement.blur();
      INPUTS_UPDATE = true;
    });

    node.toggleFocus = bind(this, function() {
      if (this.hasFocus[elementName]) {
        node.removeFocus();
        return void 0;
      } else {
        node.focusInput();
        return node;
      }
    });
  };

  // HELPER ------------------------------------------------------------------------------
  this.getModelPath = function(filename) {
    return 'resources/misc/' + filename;
  };

  this.loadModel = function(scene, url, onMeshLoaded) {
    if (!CACHED_MESHES[url]) {
      BABYLON.SceneLoaderFlags.ShowLoadingScreen = false;
      BABYLON.Tools.LoadFileAsync(url, true)
        .then(function(assetArrayBuffer) {
          var assetBlob = new Blob([assetArrayBuffer]);
          CACHED_MESHES[url] = URL.createObjectURL(assetBlob);
          BABYLON.SceneLoader.AppendAsync(CACHED_MESHES[url], undefined, scene, undefined, '.' + (url).split('.')[1] || ".glb").then(onMeshLoaded);
        });
    } else {
      BABYLON.SceneLoader.AppendAsync(CACHED_MESHES[url], undefined, scene, undefined, '.' + (url).split('.')[1] || ".glb").then(onMeshLoaded);
    }
  };

  this.colorStringToColor3 = function(string) {
    var color = parse(string);
    return new BABYLON.Color3(color.r / 255, color.g / 255, color.b / 255);
  };

  this.colorStringToColor4 = function(string) {
    var color = parse(string);
    return new BABYLON.Color4(color.r / 255, color.g / 255, color.b / 255, color.a);
  };

  this.showAxis = function(size, scene) {
    var makeTextPlane = function(text, color, size) {
      var dynamicTexture = new BABYLON.DynamicTexture("DynamicTexture", 50, scene, true);
      dynamicTexture.hasAlpha = true;
      dynamicTexture.drawText(text, 5, 40, "bold 36px Arial", color, "transparent", true);
      var plane = new BABYLON.Mesh.CreatePlane("TextPlane", size, scene, true);
      plane.material = new BABYLON.StandardMaterial("TextPlaneMaterial", scene);
      plane.material.backFaceCulling = false;
      plane.material.specularColor = new BABYLON.Color3(0, 0, 0);
      plane.material.diffuseTexture = dynamicTexture;
      return plane;
    };

    var axisX = BABYLON.Mesh.CreateLines("axisX", [
      new BABYLON.Vector3.Zero(), new BABYLON.Vector3(size, 0, 0), new BABYLON.Vector3(size * 0.95, 0.05 * size, 0),
      new BABYLON.Vector3(size, 0, 0), new BABYLON.Vector3(size * 0.95, -0.05 * size, 0)
    ]);
    axisX.color = new BABYLON.Color3(1, 0, 0);
    var xChar = makeTextPlane("X", "red", size / 10);
    xChar.position = new BABYLON.Vector3(0.9 * size, -0.05 * size, 0);

    var axisY = BABYLON.Mesh.CreateLines("axisY", [
      new BABYLON.Vector3.Zero(), new BABYLON.Vector3(0, size, 0), new BABYLON.Vector3(-0.05 * size, size * 0.95, 0),
      new BABYLON.Vector3(0, size, 0), new BABYLON.Vector3(0.05 * size, size * 0.95, 0)
    ]);
    axisY.color = new BABYLON.Color3(0, 1, 0);
    var yChar = makeTextPlane("Y", "green", size / 10);
    yChar.position = new BABYLON.Vector3(0, 0.9 * size, -0.05 * size);

    var axisZ = BABYLON.Mesh.CreateLines("axisZ", [
      new BABYLON.Vector3.Zero(), new BABYLON.Vector3(0, 0, size), new BABYLON.Vector3(0, -0.05 * size, size * 0.95),
      new BABYLON.Vector3(0, 0, size), new BABYLON.Vector3(0, 0.05 * size, size * 0.95)
    ]);
    axisZ.color = new BABYLON.Color3(0, 0, 1);
    var zChar = makeTextPlane("Z", "blue", size / 10);
    zChar.position = new BABYLON.Vector3(0, 0.05 * size, 0.9 * size);
  };

  this.drawLabel = function(position, text, scene) {
    var outputplane = BABYLON.Mesh.CreatePlane("outputplane", 5, scene, false);
    outputplane.billboardMode = BABYLON.AbstractMesh.BILLBOARDMODE_ALL;
    outputplane.material = new BABYLON.StandardMaterial("outputplane", scene);
    outputplane.position = position;

    var size = 1024;
    var outputplaneTexture = new BABYLON.DynamicTexture("dynamic texture", 1024, scene, true);
    outputplaneTexture.hasAlpha = true;

    outputplane.material.diffuseTexture = outputplaneTexture;
    outputplane.material.specularColor = new BABYLON.Color3(0, 0, 0);
    outputplane.material.emissiveColor = new BABYLON.Color3(1, 1, 1);
    outputplane.material.backFaceCulling = false;
    outputplane.hasAlpha = true;

    outputplaneTexture.drawText(text, 0, size / 2, "bold 100px verdana", "black", "red");

    return outputplane;
  };

  this.getAudio = function(soundName, scene) {
    if (CONFIG.modules.sounds[soundName] == void 0) {
      console.info('Failed to get audio. Is the sound asset available?', soundName);
      return null;
    }
    if (this.sounds[soundName]) {
      return this.sounds[soundName];
    } else {
      this.sounds[soundName] = new BABYLON.Sound(soundName, "resources/sounds/" + soundName + (CONFIG.modules.sounds[soundName].ext), scene || this.scene, null, {
        loop: CONFIG.modules.sounds[soundName].loop,
        autoplay: false
      });
      return this.sounds[soundName];
    }
  };
});
//-------------------------------------------------------------------------------------