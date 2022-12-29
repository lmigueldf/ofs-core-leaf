import .UiAbstractComponent as UIComponent;

exports = Class(UIComponent, function(supr) {
    this.nodes = {
        root: {
            id: '$$',
            grid: true,
            height: .85,
            clip: true,
            imageName: '',
            children: {
                content: {
                    grid: {},
                    height: 1,
                    visible: true,
                }
            }
        }
    };

    this.init = function(opts) {
        supr(this, 'init', [opts]);
        // public abstract functions
        this.build(opts, {
            viewNodes: this.nodes,
            handlers: this,
            setupComponentsIO: this.setupComponentsIO
        });
        this.entries = [];
        this.$$.updateOpts({
            image: opts.image
        });
    };

    this.tick = function(dt) {
        var _height = this._height;
        this.$$.content.style.y = 0;

        this.$$.content.style.height = this.getCurrentHeight();

        this.$$.style.height = this.$$.content.style.height;
        this.style.height = this.$$.style.height;
    };

    this.reset = function() {
        this.entries = [];
        this.$$.content.removeAllSubviews();
    };

    this.getCurrentHeight = function(){
        var _height = 0;
        for(var i = 0; i < this.entries.length; i++){
            _height += this.entries[i].style.height;
        }
        return _height;
    };

    this.addElement = function(ObjectType, entry) {

        var superview = this.$$.content;
        var _height = this._height;
        var _entry = new ObjectType(merge(entry, {
            superview: superview,
            y: this.getCurrentHeight(),
            height: entry.height,
            width: superview.style.width
        }));
        this.entries.push(_entry);
        return _entry;
    };

    this.removeElement = function(entry) {
        var index = this.entries.indexOf(entry);
        index > -1 && this.entries.splice(index, 1);
    };
});
