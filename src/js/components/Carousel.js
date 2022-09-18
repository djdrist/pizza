/* eslint-disable no-undef */
class Carousel {
	constructor(element) {
		const thisCarousel = this;
		thisCarousel.render(element);
		thisCarousel.initPlugin();
	}

	render(element) {
		const thisCarousel = this;
		thisCarousel.dom = {};
		thisCarousel.dom.wrapper = element;
	}

	initPlugin() {
		const thisCarousel = this;
		thisCarousel.widget = new Flickity(thisCarousel.dom.wrapper, {
			autoPlay: true,
			cellAlign: 'left',
			contain: true,
			//imagesLoaded: true,
			groupCells: true,
		});
	}
}

export default Carousel;
