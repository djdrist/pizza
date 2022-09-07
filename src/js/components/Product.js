import { select, templates, classNames } from '../settings.js';
import { utils } from '../utils.js';
import AmountWidget from './AmountWidget.js';

class Product {
	constructor(id, data) {
		const thisProduct = this;
		thisProduct.id = id;
		thisProduct.data = data;
		thisProduct.renderInMenu();
		thisProduct.getElements();
		thisProduct.initAccordion();
		thisProduct.initOrderForm();
		thisProduct.initAmountWidget();
		thisProduct.processOrder();
		// console.log('new Product:', thisProduct);
	}
	renderInMenu() {
		const thisProduct = this;
		const generatedHTML = templates.menuProduct(thisProduct.data);
		thisProduct.element = utils.createDOMFromHTML(generatedHTML);
		const menuContainer = document.querySelector(select.containerOf.menu);
		menuContainer.appendChild(thisProduct.element);
	}
	getElements() {
		const thisProduct = this;
		thisProduct.accordionTrigger = thisProduct.element.querySelector(select.menuProduct.clickable);
		thisProduct.form = thisProduct.element.querySelector(select.menuProduct.form);
		thisProduct.formInputs = thisProduct.form.querySelectorAll(select.all.formInputs);
		thisProduct.cartButton = thisProduct.element.querySelector(select.menuProduct.cartButton);
		thisProduct.priceElem = thisProduct.element.querySelector(select.menuProduct.priceElem);
		thisProduct.imageWrapper = thisProduct.element.querySelector(select.menuProduct.imageWrapper);
		thisProduct.amountWidgetElem = thisProduct.element.querySelector(select.menuProduct.amountWidget);
		// console.log(this.amountWidgetElem);
	}
	initAccordion() {
		const thisProduct = this;
		thisProduct.accordionTrigger.addEventListener('click', function (event) {
			event.preventDefault();
			const activeProduct = document.querySelector(select.all.menuProductsActive);
			if (activeProduct != null && activeProduct != thisProduct.element) {
				activeProduct.classList.remove(classNames.menuProduct.wrapperActive);
			}
			thisProduct.element.classList.toggle(classNames.menuProduct.wrapperActive);
		});
	}
	initOrderForm() {
		const thisProduct = this;
		thisProduct.form.addEventListener('submit', function (event) {
			event.preventDefault();
			thisProduct.processOrder();
		});

		for (let input of thisProduct.formInputs) {
			input.addEventListener('change', function () {
				thisProduct.processOrder();
			});
		}

		thisProduct.cartButton.addEventListener('click', function (event) {
			event.preventDefault();
			thisProduct.processOrder();
			thisProduct.addToCart();
		});
	}
	processOrder() {
		const thisProduct = this;
		const formData = utils.serializeFormToObject(thisProduct.form);
		// console.log('formData', formData);
		let price = thisProduct.data.price;

		for (let paramId in thisProduct.data.params) {
			const param = thisProduct.data.params[paramId];
			//	console.log(paramId, param);

			for (let optionId in param.options) {
				const option = param.options[optionId];
				const optionSelected = formData[paramId] && formData[paramId].includes(optionId);
				if (optionSelected) {
					// console.log(option.default);
					if (option.default != true) {
						price += option.price;
					}
				} else if (option.default == true) {
					price -= option.price;
				}
				const optionImage = thisProduct.imageWrapper.querySelector(`.${paramId}-${optionId}`);
				// console.log(optionImage);
				if (optionImage) {
					if (optionSelected) {
						optionImage.classList.add(classNames.menuProduct.imageVisible);
					} else {
						optionImage.classList.remove(classNames.menuProduct.imageVisible);
					}
				}
			}
		}
		thisProduct.priceSingle = price;
		price *= thisProduct.amountWidget.value;
		thisProduct.priceElem.innerHTML = price;
	}
	initAmountWidget() {
		const thisProduct = this;
		thisProduct.amountWidget = new AmountWidget(thisProduct.amountWidgetElem);
		thisProduct.amountWidgetElem.addEventListener('updated', function () {
			thisProduct.processOrder();
		});
	}
	addToCart() {
		const thisProduct = this;

		thisProduct.name = thisProduct.data.name;
		thisProduct.amount = thisProduct.amountWidget.value;

		const event = new CustomEvent('add-to-cart', {
			bubbles: true,
			detail: {
				product: thisProduct,
			},
		});

		thisProduct.element.dispatchEvent(event);
		console.log(thisProduct);
		//app.cart.add(thisProduct.prepareCartProduct());
	}
	prepareCartProduct() {
		const thisProduct = this;
		const productSummary = {};
		productSummary.id = thisProduct.id;
		productSummary.name = thisProduct.data.name;
		productSummary.amount = thisProduct.amountWidget.value;
		productSummary.priceSingle = thisProduct.priceSingle;
		productSummary.price = productSummary.priceSingle * productSummary.amount;
		productSummary.params = thisProduct.prepareCartProductParams();
		console.log('!', productSummary);
		return productSummary;
	}
	prepareCartProductParams() {
		const thisProduct = this;
		const formData = utils.serializeFormToObject(thisProduct.form);
		//let price = thisProduct.data.price;
		const params = {};
		for (let paramId in thisProduct.data.params) {
			const param = thisProduct.data.params[paramId];
			params[paramId] = {
				label: param.label,
				options: {},
			};
			//console.log(paramId, param);
			for (let optionId in param.options) {
				const option = param.options[optionId];
				const optionSelected = formData[paramId] && formData[paramId].includes(optionId);
				if (optionSelected) {
					// console.log(paramId); //category key
					// console.log(param.label); //category name
					// console.log(optionId); //option key
					// console.log(option.label); //option name
					params[paramId].options[optionId] = option.label;
				}
			}
		}
		return params;
	}
}

export default Product;
