import { select, templates, settings, classNames } from '../settings.js';
import { utils } from '../utils.js';
import AmountWidget from './AmountWidget.js';
import DatePicker from './DatePicker.js';
import HourPicker from './HourPicker.js';

class Booking {
	constructor(element) {
		const thisBooking = this;
		thisBooking.render(element);
		thisBooking.initWidgets();
		thisBooking.getData();
	}
	getData() {
		const thisBooking = this;
		const startDateParam = settings.db.dateStartParamKey + '=' + utils.dateToStr(thisBooking.datePicker.minDate);
		const endDateParam = settings.db.dateEndParamKey + '=' + utils.dateToStr(thisBooking.datePicker.maxDate);
		const params = {
			bookings: [startDateParam, endDateParam],
			eventsCurrent: [settings.db.notRepeatParam, startDateParam, endDateParam],
			eventsRepeat: [settings.db.repeatParam, endDateParam],
		};

		// console.log('getData params', params);

		const urls = {
			bookings: settings.db.url + '/' + settings.db.bookings + '?' + params.bookings.join('&'),
			eventsCurrent: settings.db.url + '/' + settings.db.events + '?' + params.eventsCurrent.join('&'),
			eventsRepeat: settings.db.url + '/' + settings.db.events + '?' + params.eventsRepeat.join('&'),
		};

		// console.log(urls);

		Promise.all([fetch(urls.bookings), fetch(urls.eventsCurrent), fetch(urls.eventsRepeat)])
			.then(function (allResponse) {
				const bookingsResponse = allResponse[0];
				const eventsCurrentResponse = allResponse[1];
				const eventsRepeatResponse = allResponse[2];

				return Promise.all([bookingsResponse.json(), eventsCurrentResponse.json(), eventsRepeatResponse.json()]);
			})
			.then(function ([bookings, eventsCurrent, eventsRepeat]) {
				// console.log(bookings);
				// console.log(eventsCurrent);
				// console.log(eventsRepeat);
				thisBooking.parseData(bookings, eventsCurrent, eventsRepeat);
			});
	}

	parseData(bookings, eventsCurrent, eventsRepeat) {
		const thisBooking = this;

		thisBooking.booked = {};

		for (let item of bookings) {
			thisBooking.makeBooked(item.date, item.hour, item.duration, item.table);
		}

		for (let item of eventsCurrent) {
			thisBooking.makeBooked(item.date, item.hour, item.duration, item.table);
		}

		const minDate = thisBooking.datePicker.minDate;
		const maxDate = thisBooking.datePicker.maxDate;

		for (let item of eventsRepeat) {
			if (item.repeat == 'daily') {
				for (let loopDate = minDate; loopDate <= maxDate; loopDate = utils.addDays(loopDate, 1)) {
					thisBooking.makeBooked(utils.dateToStr(loopDate), item.hour, item.duration, item.table);
				}
			}
		}
		thisBooking.updateDOM();
	}

	makeBooked(date, hour, duration, table) {
		const thisBooking = this;
		if (typeof thisBooking.booked[date] == 'undefined') {
			thisBooking.booked[date] = {};
		}

		const startHour = utils.hourToNumber(hour);

		for (let hourBlock = startHour; hourBlock < startHour + duration; hourBlock += 0.5) {
			if (typeof thisBooking.booked[date][hourBlock] == 'undefined') {
				thisBooking.booked[date][hourBlock] = [];
			}
			thisBooking.booked[date][hourBlock].push(table);
		}
	}

	render(element) {
		const thisBooking = this;
		const generatedHTML = templates.bookingWidget();
		thisBooking.dom = {};
		thisBooking.dom.wrapper = element;
		thisBooking.dom.wrapper.innerHTML = generatedHTML;
		thisBooking.dom.peopleAmount = thisBooking.dom.wrapper.querySelector(select.booking.peopleAmount);
		thisBooking.dom.hoursAmount = thisBooking.dom.wrapper.querySelector(select.booking.hoursAmount);
		thisBooking.dom.datePicker = thisBooking.dom.wrapper.querySelector(select.widgets.datePicker.wrapper);
		thisBooking.dom.hourPicker = thisBooking.dom.wrapper.querySelector(select.widgets.hourPicker.wrapper);
		thisBooking.dom.tables = thisBooking.dom.wrapper.querySelectorAll(select.booking.tables);
		thisBooking.dom.floor = thisBooking.dom.wrapper.querySelector(select.booking.floor);
		thisBooking.dom.submit = thisBooking.dom.wrapper.querySelector(select.booking.formSubmit);
		thisBooking.dom.phone = thisBooking.dom.wrapper.querySelector(select.booking.phone);
		thisBooking.dom.address = thisBooking.dom.wrapper.querySelector(select.booking.address);
	}
	initWidgets() {
		const thisBooking = this;
		thisBooking.activeTable = null;
		thisBooking.peopleAmount = new AmountWidget(thisBooking.dom.peopleAmount);
		thisBooking.hoursAmount = new AmountWidget(thisBooking.dom.hoursAmount);

		thisBooking.dom.peopleAmount.addEventListener('updated', function () {
			//	console.log('changed people');
		});
		thisBooking.dom.hoursAmount.addEventListener('updated', function () {
			//	console.log('changed hours');
		});

		thisBooking.dom.wrapper.addEventListener('updated', function () {
			thisBooking.updateDOM();
		});

		thisBooking.datePicker = new DatePicker(thisBooking.dom.datePicker);
		thisBooking.hourPicker = new HourPicker(thisBooking.dom.hourPicker);

		thisBooking.dom.floor.addEventListener('click', function (event) {
			thisBooking.tableSelect(event);
		});

		thisBooking.dom.submit.addEventListener('click', function (event) {
			event.preventDefault();
			thisBooking.sendBooking();
		});
	}

	tableSelect(event) {
		const thisBooking = this;
		const inputHTML = event.target;
		if (inputHTML.classList.contains(classNames.booking.table) && !inputHTML.classList.contains(classNames.booking.tableBooked)) {
			if (thisBooking.activeTable == null) {
				thisBooking.activeTable = inputHTML.getAttribute(settings.booking.tableIdAttribute);
				inputHTML.classList.add(classNames.booking.tableActive);
			} else if (thisBooking.activeTable !== inputHTML.getAttribute(settings.booking.tableIdAttribute)) {
				inputHTML.classList.add(classNames.booking.tableActive);
				thisBooking.dom.activeTable = thisBooking.dom.wrapper.querySelector('[' + settings.booking.tableIdAttribute + '="' + thisBooking.activeTable + '"]');
				thisBooking.dom.activeTable.classList.remove(classNames.booking.tableActive);
				thisBooking.activeTable = inputHTML.getAttribute(settings.booking.tableIdAttribute);
			} else {
				inputHTML.classList.remove(classNames.booking.tableActive);
				thisBooking.activeTable = null;
			}
		}
	}

	updateDOM() {
		const thisBooking = this;
		thisBooking.date = thisBooking.datePicker.value;
		thisBooking.hour = utils.hourToNumber(thisBooking.hourPicker.value);
		let allAvailable = false;

		if (typeof thisBooking.booked[thisBooking.date] == 'undefined' || typeof thisBooking.booked[thisBooking.date][thisBooking.hour] == 'undefined') {
			allAvailable = true;
		}

		for (let table of thisBooking.dom.tables) {
			let tableId = table.getAttribute(settings.booking.tableIdAttribute);
			if (!isNaN(tableId)) {
				tableId = parseInt(tableId);
			}

			if (!allAvailable && thisBooking.booked[thisBooking.date][thisBooking.hour].includes(tableId)) {
				table.classList.add(classNames.booking.tableBooked);
			} else {
				table.classList.remove(classNames.booking.tableBooked);
			}
		}
		if (thisBooking.activeTable !== null) {
			thisBooking.dom.activeTable = thisBooking.dom.wrapper.querySelector('[' + settings.booking.tableIdAttribute + '="' + thisBooking.activeTable + '"]');
			thisBooking.dom.activeTable.classList.remove(classNames.booking.tableActive);
			thisBooking.activeTable = null;
		}
	}

	sendBooking() {
		const thisBooking = this;
		const url = settings.db.url + '/' + settings.db.bookings;
		const starters = [];
		thisBooking.dom.starters = thisBooking.dom.wrapper.querySelectorAll(select.booking.starters);
		for (let starter of thisBooking.dom.starters) {
			if (starter.checked === true) {
				starters.push(starter.value);
			}
		}

		const payload = {
			date: thisBooking.date,
			hour: thisBooking.hourPicker.value,
			table: parseInt(thisBooking.activeTable),
			duration: thisBooking.hoursAmount.value,
			ppl: thisBooking.peopleAmount.value,
			starters: starters,
			phone: thisBooking.dom.phone.value,
			address: thisBooking.dom.address.value,
		};

		const options = {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(payload),
		};
		fetch(url, options)
			.then(thisBooking.makeBooked(thisBooking.date, thisBooking.hourPicker.value, thisBooking.hoursAmount.value, parseInt(thisBooking.activeTable)))
			.then(thisBooking.updateDOM());
	}
}

export default Booking;
