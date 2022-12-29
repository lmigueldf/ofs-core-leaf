import ui.StackView as StackView;
import device;
import animate;
import ui.ImageView as ImageView;
import ui.resource.Image as Image;

exports = Class(StackView, function(supr) {
    
    //this.transition = new Image({url: "resources/images/transition.png"});
    this.transition && (this.hideTransitionView = new ImageView({
        image: this.transition,
        width: this.transition.getWidth(),
        height: this.transition.getHeight() + 5,
        x: (device.screen.width - this.transition.getWidth())/2 ,
        y: (device.screen.height - (this.transition.getHeight() + 5))/2 ,
        anchorX : this.transition.getWidth() / 2,
        anchorY : (this.transition.getHeight() + 5) / 2,
        canHandleEvents : false
    }));
    this.transition && (this.showTransitionView = new ImageView({
        image: this.transition,
        width: this.transition.getWidth(),
        height: this.transition.getHeight() + 5,
        x: (device.screen.width - this.transition.getWidth())/2 ,
        y: (device.screen.height - (this.transition.getHeight() + 5))/2 ,
        anchorX : this.transition.getWidth() / 2,
        anchorY : (this.transition.getHeight() + 5) / 2,
        canHandleEvents : false
    }));
    this._hide = function (view, dontAnimate, reverse) {
            view.publish('ViewWillDisappear');
            if (!dontAnimate) {
                this.transition && this.hideTransitionView.updateOpts({
                    scale: 120
                });
                this.transition && view.addSubview(this.hideTransitionView);
                this.getInput().blockEvents = true;
                animate(view)
                        .now(bind(this, function(){
                            this.transition && animate(this.hideTransitionView)
                                .then({scale: 1}, 500)
                                .then(bind(this, function () {
                                    this.removeSubview(this.hideTransitionView);
                                    this.__hide(view);
                                    this.getInput().blockEvents = false;
                                }));
                        }));
            } else {
                    this.__hide(view);
            }
	};       
    this.__hide = function(view){
        this.removeSubview(view);
        view.publish('ViewDidDisappear');
    };

    this._show = function (view, dontAnimate, reverse) {
		view.publish('ViewWillAppear');
		view.style.visible = true;
		if (!dontAnimate) {
                        this.getInput().blockEvents = true;
                        this.transition && this.showTransitionView.updateOpts({
                            scale: 1
                        });
                        this.transition && view.addSubview(this.showTransitionView);
			view.style.x = (reverse ? -1 : 1) * this.style.width;
			view.style.opacity = 0;
			this.addSubview(view);
			animate(view)
                            .wait(1200)
                            .then({x: 0}, 0)
                            .then({opacity: 1}, 0)
                            .then(bind(this, function(){
                                this.transition && animate(this.showTransitionView)
                                    .then({scale: 120}, 1500)
                                    .then(bind(view, 'publish', 'ViewDidAppear'))
                                    .then(bind(this,function(){
                                        this.transition && view.removeSubview(this.showTransitionView);
                                        this.getInput().blockEvents = false;
                                    }))
                             }));
		} else {
			this.addSubview(view);
			view.style.x = 0;
                        view.style.opacity = 1;
			view.publish('ViewDidAppear');
                        this.getInput().blockEvents = false;
		}
	};
});

