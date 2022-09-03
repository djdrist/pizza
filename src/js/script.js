/* global Handlebars, utils, dataSource */ // eslint-disable-line no-unused-vars

{
	('use strict');

	const select = {
		templateOf: {
			menuProduct: '#template-menu-product',
			cartProduct: '#template-cart-product', // CODE ADDED
		},
		containerOf: {
			menu: '#product-list',
			cart: '#cart',
		},
		all: {
			menuProducts: '#product-list > .product',
			menuProductsActive: '#product-list > .product.active',
			formInputs: 'input, select',
		},
		menuProduct: {
			clickable: '.product__header',
			form: '.product__order',
			priceElem: '.product__total-price .price',
			imageWrapper: '.product__images',
			amountWidget: '.widget-amount',
			cartButton: '[href="#add-to-cart"]',
		},
		widgets: {
			amount: {
				input: 'input.amount', // CODE CHANGED
				linkDecrease: 'a[href="#less"]',
				linkIncrease: 'a[href="#more"]',
			},
		},
		// CODE ADDED START
		cart: {
			productList: '.cart__order-summary',
			toggleTrigger: '.cart__summary',
			totalNumber: `.cart__total-number`,
			totalPrice: '.cart__total-price strong, .cart__order-total .cart__order-price-sum strong',
			subtotalPrice: '.cart__order-subtotal .cart__order-price-sum strong',
			deliveryFee: '.cart__order-delivery .cart__order-price-sum strong',
			form: '.cart__order',
			formSubmit: '.cart__order [type="submit"]',
			phone: '[name="phone"]',
			address: '[name="address"]',
		},
		cartProduct: {
			amountWidget: '.widget-amount',
			price: '.cart__product-price',
			edit: '[href="#edit"]',
			remove: '[href="#remove"]',
		},
		// CODE ADDED END
	};

	const classNames = {
		menuProduct: {
			wrapperActive: 'active',
			imageVisible: 'active',
		},
		// CODE ADDED START
		cart: {
			wrapperActive: 'active',
		},
		// CODE ADDED END
	};

	const settings = {
		amountWidget: {
			defaultValue: 1,
			defaultMin: 1,
			defaultMax: 9,
		}, // CODE CHANGED
		// CODE ADDED START
		cart: {
			defaultDeliveryFee: 20,
		},
		db: {
			url: '//localhost:3131',
			products: 'products',
			orders: 'orders',
		},
		// CODE ADDED END
	};

	const templates = {
		menuProduct: Handlebars.compile(document.querySelector(select.templateOf.menuProduct).innerHTML),
		// CODE ADDED START
		cartProduct: Handlebars.compile(document.querySelector(select.templateOf.cartProduct).innerHTML),
		// CODE ADDED END
	};

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

			app.cart.add(thisProduct.prepareCartProduct());
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
			// console.log(productSummary);
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
						//console.log(paramId); //category key
						//console.log(param.label); //category name
						//console.log(optionId); //option key
						//console.log(option.label); //option name
						params[paramId].options[optionId] = option.label;
					}
				}
			}
			return params;
		}
	}

	class AmountWidget {
		constructor(element) {
			const thisWidget = this;
			thisWidget.getElements(element);
			thisWidget.setValue(settings.amountWidget.defaultValue);
			thisWidget.initActions();
			// console.log('AmountWidget:', thisWidget);
			// console.log('constructor arguments:', element);
		}
		getElements(element) {
			const thisWidget = this;

			thisWidget.element = element;
			thisWidget.input = thisWidget.element.querySelector(select.widgets.amount.input);
			thisWidget.linkDecrease = thisWidget.element.querySelector(select.widgets.amount.linkDecrease);
			thisWidget.linkIncrease = thisWidget.element.querySelector(select.widgets.amount.linkIncrease);
		}
		setValue(value) {
			const thisWidget = this;
			const newValue = parseInt(value);
			// console.log(value);
			// ADD VALIDATION
			if (
				thisWidget.value !== newValue &&
				!isNaN(newValue) &&
				newValue >= settings.amountWidget.defaultMin - 1 &&
				newValue <= settings.amountWidget.defaultMax + 1
			) {
				thisWidget.value = newValue;
				thisWidget.announce();
			}
			thisWidget.input.value = thisWidget.value;
		}
		initActions() {
			const thisWidget = this;
			thisWidget.input.addEventListener('change', function () {
				thisWidget.setValue(thisWidget.input.value);
			});
			thisWidget.linkDecrease.addEventListener('click', function (event) {
				event.preventDefault();
				thisWidget.setValue(thisWidget.value - 1);
			});
			thisWidget.linkIncrease.addEventListener('click', function (event) {
				event.preventDefault();
				thisWidget.setValue(thisWidget.value + 1);
			});
		}
		announce() {
			const thisWidget = this;
			const event = new CustomEvent('updated', {
				bubbles: true,
			});
			thisWidget.element.dispatchEvent(event);
		}
	}

	class Cart {
		constructor(element) {
			const thisCart = this;
			thisCart.products = [];
			thisCart.getElements(element);
			thisCart.initActions();
		}

		getElements(element) {
			const thisCart = this;
			thisCart.dom = {};
			thisCart.dom.wrapper = element;
			thisCart.dom.toggleTrigger = thisCart.dom.wrapper.querySelector(select.cart.toggleTrigger);
			thisCart.dom.productList = thisCart.dom.wrapper.querySelector(select.cart.productList);
			thisCart.dom.deliveryFee = thisCart.dom.wrapper.querySelector(select.cart.deliveryFee);
			thisCart.dom.subtotalPrice = thisCart.dom.wrapper.querySelector(select.cart.subtotalPrice);
			thisCart.dom.totalPrice = thisCart.dom.wrapper.querySelectorAll(select.cart.totalPrice);
			thisCart.dom.totalNumber = thisCart.dom.wrapper.querySelector(select.cart.totalNumber);
			thisCart.dom.form = thisCart.dom.wrapper.querySelector(select.cart.form);
			thisCart.dom.phone = thisCart.dom.wrapper.querySelector(select.cart.phone);
			thisCart.dom.address = thisCart.dom.wrapper.querySelector(select.cart.address);
		}
		initActions() {
			const thisCart = this;
			thisCart.dom.toggleTrigger.addEventListener('click', function () {
				thisCart.dom.wrapper.classList.toggle(classNames.cart.wrapperActive);
			});
			thisCart.dom.productList.addEventListener('updated', function () {
				thisCart.update();
			});
			thisCart.dom.productList.addEventListener('remove', function (event) {
				thisCart.remove(event.detail.cartProduct);
			});
			thisCart.dom.form.addEventListener('submit', function (event) {
				event.preventDefault();
				thisCart.sendOrder();
			});
		}
		add(menuProduct) {
			const thisCart = this;
			const generatedHTML = templates.cartProduct(menuProduct);
			const generatedDOM = utils.createDOMFromHTML(generatedHTML);
			thisCart.dom.productList.appendChild(generatedDOM);
			thisCart.products.push(new CartProduct(menuProduct, generatedDOM));
			thisCart.update();
		}
		update() {
			const thisCart = this;
			let deliveryFee = settings.cart.defaultDeliveryFee;
			let totalNumber = 0;
			let subtotalPrice = 0;
			for (let product of thisCart.products) {
				totalNumber += product.amount;
				subtotalPrice += product.price;
			}
			if (totalNumber !== 0) {
				thisCart.totalPrice = subtotalPrice + deliveryFee;
			} else {
				deliveryFee = 0;
				thisCart.totalPrice = 0;
			}
			thisCart.dom.deliveryFee.innerHTML = deliveryFee;
			thisCart.dom.subtotalPrice.innerHTML = subtotalPrice;
			for (let total of thisCart.dom.totalPrice) {
				total.innerHTML = thisCart.totalPrice;
			}
			thisCart.dom.totalNumber.innerHTML = totalNumber;
			thisCart.totalNumber = totalNumber;
			thisCart.subtotalPrice = subtotalPrice;
			thisCart.deliveryFee = deliveryFee;
		}
		remove(product) {
			const thisCart = this;
			product.dom.wrapper.remove();
			thisCart.products.splice(thisCart.products.indexOf(product), 1);
			thisCart.update();
		}
		sendOrder() {
			const thisCart = this;
			const url = settings.db.url + '/' + settings.db.orders;
			const payload = {
				address: thisCart.dom.address.value, //adres klienta wpisany w koszyku,
				phone: thisCart.dom.phone.value, //numer telefonu wpisany w koszyku,
				totalPrice: thisCart.totalPrice, //całkowita cena za zamówienie,
				subtotalPrice: thisCart.subtotalPrice, //cena całkowita - koszt dostawy,
				totalNumber: thisCart.totalNumber, //całkowita liczba sztuk,
				deliveryFee: thisCart.deliveryFee, //koszt dostawy,
				products: [], // tablica obecnych w koszyku produktów
			};
			for (let prod of thisCart.products) {
				payload.products.push(prod.getData());
			}
			const options = {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(payload),
			};
			fetch(url, options);
		}
	}

	class CartProduct {
		constructor(menuProduct, element) {
			const thisCartProduct = this;
			thisCartProduct.id = menuProduct.id;
			thisCartProduct.name = menuProduct.name;
			thisCartProduct.amount = menuProduct.amount;
			thisCartProduct.params = menuProduct.params;
			thisCartProduct.price = menuProduct.price;
			thisCartProduct.priceSingle = menuProduct.priceSingle;
			thisCartProduct.getElements(element);
			thisCartProduct.initAmountWidget();
			thisCartProduct.initActions();
		}
		getElements(element) {
			const thisCartProduct = this;
			thisCartProduct.dom = {};
			thisCartProduct.dom.wrapper = element;
			thisCartProduct.dom.amountWidget = thisCartProduct.dom.wrapper.querySelector(select.cartProduct.amountWidget);
			thisCartProduct.dom.price = thisCartProduct.dom.wrapper.querySelector(select.cartProduct.price);
			thisCartProduct.dom.edit = thisCartProduct.dom.wrapper.querySelector(select.cartProduct.edit);
			thisCartProduct.dom.remove = thisCartProduct.dom.wrapper.querySelector(select.cartProduct.remove);
		}
		initAmountWidget() {
			const thisCartProduct = this;
			thisCartProduct.amountWidget = new AmountWidget(thisCartProduct.dom.amountWidget);
			thisCartProduct.dom.amountWidget.addEventListener('updated', function () {
				thisCartProduct.amount = thisCartProduct.amountWidget.value;
				thisCartProduct.price = thisCartProduct.amount * thisCartProduct.priceSingle;
				//	console.log(thisCartProduct.amount);
				//	console.log(thisCartProduct.priceSingle);
				thisCartProduct.dom.price.innerHTML = thisCartProduct.price;
			});
		}
		remove() {
			const thisCartProduct = this;
			const event = new CustomEvent('remove', {
				bubbles: true,
				detail: {
					cartProduct: thisCartProduct,
				},
			});
			thisCartProduct.dom.wrapper.dispatchEvent(event);
		}
		initActions() {
			const thisCartProduct = this;
			thisCartProduct.dom.edit.addEventListener('click', function (event) {
				event.preventDefault();
			});
			thisCartProduct.dom.remove.addEventListener('click', function (event) {
				event.preventDefault();
				thisCartProduct.remove();
			});
		}
		getData() {
			const thisCartProduct = this;
			const cartSummary = {};
			cartSummary.id = thisCartProduct.id;
			cartSummary.name = thisCartProduct.name;
			cartSummary.amount = thisCartProduct.amount;
			cartSummary.priceSingle = thisCartProduct.priceSingle;
			cartSummary.price = thisCartProduct.price;
			cartSummary.params = thisCartProduct.params;
			return cartSummary;
		}
	}
	const app = {
		initMenu: function () {
			const thisApp = this;
			// console.log('thisApp.data:', thisApp.data);
			for (let productData in thisApp.data.products) {
				new Product(thisApp.data.products[productData].id, thisApp.data.products[productData]);
			}
		},

		initData: function () {
			const thisApp = this;

			thisApp.data = {};
			const url = settings.db.url + '/' + settings.db.products;
			fetch(url)
				.then(function (rawResponse) {
					return rawResponse.json();
				})
				.then(function (parsedResponse) {
					console.log('parsedresponse', parsedResponse);
					//save parsedResponse as thisApp.data.products
					thisApp.data.products = parsedResponse;
					//execute initMenu methos
					thisApp.initMenu();
				});
			console.log('thisApp.data', JSON.stringify(thisApp.data));
		},
		initCart: function () {
			const thisApp = this;

			const cartElem = document.querySelector(select.containerOf.cart);
			thisApp.cart = new Cart(cartElem);
		},

		init: function () {
			const thisApp = this;
			// console.log('*** App starting ***');
			// console.log('thisApp:', thisApp);
			// console.log('classNames:', classNames);
			// console.log('settings:', settings);
			// console.log('templates:', templates);
			thisApp.initData();
			thisApp.initCart();
		},
	};
	app.init();
}
