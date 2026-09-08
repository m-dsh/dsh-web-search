import Schema from "@deepseek-ai/schemastery";

//#region node_modules/.pnpm/@deepseek-ai+cosmokit@1.8.3/node_modules/@deepseek-ai/cosmokit/lib/index.js
/** Return true when a value is `null` or `undefined`. */
function isNullable(value) {
	return value === null || value === void 0;
}
/** Define a non-enumerable writable property and return the object. */
function defineProperty(object, key, value) {
	return Object.defineProperty(object, key, {
		writable: true,
		value,
		enumerable: false
	});
}
/** Test values using `instanceof` with a `toStringTag` fallback. */
function is(type, value) {
	if (arguments.length === 1) return (value$1) => is(type, value$1);
	return type in globalThis && value instanceof globalThis[type] || Object.prototype.toString.call(value).slice(8, -1) === type;
}
function isArrayBufferLike(value) {
	return is("ArrayBuffer", value) || is("SharedArrayBuffer", value);
}
function isArrayBufferSource(value) {
	return isArrayBufferLike(value) || ArrayBuffer.isView(value);
}
/** Binary source detection and base64/hex conversion helpers. */
var Binary;
(function(Binary$1) {
	Binary$1.is = isArrayBufferLike;
	Binary$1.isSource = isArrayBufferSource;
	function fromSource(source) {
		if (ArrayBuffer.isView(source)) return source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
		else return source;
	}
	Binary$1.fromSource = fromSource;
	function toBase64(source) {
		source = fromSource(source);
		if (typeof Buffer !== "undefined") return Buffer.from(source).toString("base64");
		let binary = "";
		const bytes = new Uint8Array(source);
		for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
		return btoa(binary);
	}
	Binary$1.toBase64 = toBase64;
	function fromBase64(source) {
		if (typeof Buffer !== "undefined") return fromSource(Buffer.from(source, "base64"));
		return Uint8Array.from(atob(source), (c) => c.charCodeAt(0));
	}
	Binary$1.fromBase64 = fromBase64;
	function toHex(source) {
		source = fromSource(source);
		if (typeof Buffer !== "undefined") return Buffer.from(source).toString("hex");
		return Array.from(new Uint8Array(source), (byte) => byte.toString(16).padStart(2, "0")).join("");
	}
	Binary$1.toHex = toHex;
	function fromHex(source) {
		if (typeof Buffer !== "undefined") return fromSource(Buffer.from(source, "hex"));
		const hex = source.length % 2 === 0 ? source : source.slice(0, source.length - 1);
		const buffer = [];
		for (let i = 0; i < hex.length; i += 2) buffer.push(parseInt(`${hex[i]}${hex[i + 1]}`, 16));
		return Uint8Array.from(buffer).buffer;
	}
	Binary$1.fromHex = fromHex;
})(Binary || (Binary = {}));
/** Decode a base64 string into binary data. */
const base64ToArrayBuffer = Binary.fromBase64;
/** Encode binary data as base64. */
const arrayBufferToBase64 = Binary.toBase64;
/** Decode a hex string into binary data. */
const hexToArrayBuffer = Binary.fromHex;
/** Encode binary data as hex. */
const arrayBufferToHex = Binary.toHex;
function tokenize(source, delimiters, delimiter) {
	const output = [];
	let state = 0;
	for (let i = 0; i < source.length; i++) {
		const code = source.charCodeAt(i);
		if (code >= 65 && code <= 90) {
			if (state === 1) {
				const next = source.charCodeAt(i + 1);
				if (next >= 97 && next <= 122) output.push(delimiter);
				output.push(code + 32);
			} else {
				if (state !== 0) output.push(delimiter);
				output.push(code + 32);
			}
			state = 1;
		} else if (code >= 97 && code <= 122) {
			output.push(code);
			state = 2;
		} else if (delimiters.includes(code)) {
			if (state !== 0) output.push(delimiter);
			state = 0;
		} else output.push(code);
	}
	return String.fromCharCode(...output);
}
/** Convert text to dash-delimited parameter case. */
function paramCase(source) {
	return tokenize(source, [45, 95], 45);
}
/** Runtime alias for `paramCase`. */
const hyphenate = paramCase;
/** Time constants plus parsing and formatting helpers. */
var Time;
(function(Time$1) {
	Time$1.millisecond = 1;
	Time$1.second = 1e3;
	Time$1.minute = Time$1.second * 60;
	Time$1.hour = Time$1.minute * 60;
	Time$1.day = Time$1.hour * 24;
	Time$1.week = Time$1.day * 7;
	let timezoneOffset = (/* @__PURE__ */ new Date()).getTimezoneOffset();
	function setTimezoneOffset(offset) {
		timezoneOffset = offset;
	}
	Time$1.setTimezoneOffset = setTimezoneOffset;
	function getTimezoneOffset() {
		return timezoneOffset;
	}
	Time$1.getTimezoneOffset = getTimezoneOffset;
	function getDateNumber(date = /* @__PURE__ */ new Date(), offset) {
		if (typeof date === "number") date = new Date(date);
		if (offset === void 0) offset = timezoneOffset;
		return Math.floor((date.valueOf() / Time$1.minute - offset) / 1440);
	}
	Time$1.getDateNumber = getDateNumber;
	function fromDateNumber(value, offset) {
		const date = new Date(value * Time$1.day);
		if (offset === void 0) offset = timezoneOffset;
		return new Date(+date + offset * Time$1.minute);
	}
	Time$1.fromDateNumber = fromDateNumber;
	const numeric = /\d+(?:\.\d+)?/.source;
	const timeRegExp = /* @__PURE__ */ new RegExp(`^${[
		"w(?:eek(?:s)?)?",
		"d(?:ay(?:s)?)?",
		"h(?:our(?:s)?)?",
		"m(?:in(?:ute)?(?:s)?)?",
		"s(?:ec(?:ond)?(?:s)?)?"
	].map((unit) => `(${numeric}${unit})?`).join("")}$`);
	function parseTime(source) {
		const capture = timeRegExp.exec(source);
		if (!capture) return 0;
		return (parseFloat(capture[1]) * Time$1.week || 0) + (parseFloat(capture[2]) * Time$1.day || 0) + (parseFloat(capture[3]) * Time$1.hour || 0) + (parseFloat(capture[4]) * Time$1.minute || 0) + (parseFloat(capture[5]) * Time$1.second || 0);
	}
	Time$1.parseTime = parseTime;
	function parseDate(date) {
		const parsed = parseTime(date);
		if (parsed) date = Date.now() + parsed;
		else if (/^\d{1,2}(:\d{1,2}){1,2}$/.test(date)) date = `${(/* @__PURE__ */ new Date()).toLocaleDateString()}-${date}`;
		else if (/^\d{1,2}-\d{1,2}-\d{1,2}(:\d{1,2}){1,2}$/.test(date)) date = `${(/* @__PURE__ */ new Date()).getFullYear()}-${date}`;
		return date ? new Date(date) : /* @__PURE__ */ new Date();
	}
	Time$1.parseDate = parseDate;
	function format(ms) {
		const abs = Math.abs(ms);
		if (abs >= Time$1.day - Time$1.hour / 2) return Math.round(ms / Time$1.day) + "d";
		else if (abs >= Time$1.hour - Time$1.minute / 2) return Math.round(ms / Time$1.hour) + "h";
		else if (abs >= Time$1.minute - Time$1.second / 2) return Math.round(ms / Time$1.minute) + "m";
		else if (abs >= Time$1.second) return Math.round(ms / Time$1.second) + "s";
		return ms + "ms";
	}
	Time$1.format = format;
	function toDigits(source, length = 2) {
		return source.toString().padStart(length, "0");
	}
	Time$1.toDigits = toDigits;
	function template(template$1, time = /* @__PURE__ */ new Date()) {
		return template$1.replace("yyyy", time.getFullYear().toString()).replace("yy", time.getFullYear().toString().slice(2)).replace("MM", toDigits(time.getMonth() + 1)).replace("dd", toDigits(time.getDate())).replace("hh", toDigits(time.getHours())).replace("mm", toDigits(time.getMinutes())).replace("ss", toDigits(time.getSeconds())).replace("SSS", toDigits(time.getMilliseconds(), 3));
	}
	Time$1.template = template;
})(Time || (Time = {}));

//#endregion
//#region node_modules/.pnpm/@deepseek-ai+cordis@4.0.2_@deepseek-ai+cordis-plugin-include@1.0.7_@deepseek-ai+cordis-plugin-loader@1.0.3/node_modules/@deepseek-ai/cordis/lib/index.js
/** Ordered collection of disposable values with O(1) deletion by value. */
var DisposableList = class {
	sn = 0;
	map = /* @__PURE__ */ new Map();
	weak = /* @__PURE__ */ new WeakMap();
	get length() {
		return this.map.size;
	}
	push(value) {
		const sn = ++this.sn;
		this.map.set(sn, value);
		this.weak.set(value, sn);
		return () => this.map.delete(sn);
	}
	delete(value) {
		const sn = this.weak.get(value);
		if (!sn) return false;
		return this.map.delete(sn);
	}
	clear() {
		const values = [...this.map.values()];
		this.map.clear();
		return values.reverse();
	}
	[Symbol.iterator]() {
		return this.map.values();
	}
	[Symbol.for("nodejs.util.inspect.custom")]() {
		return [...this];
	}
};
/** Shared symbols used to avoid public property-name collisions. */
const symbols = {
	shadow: Symbol.for("cordis.shadow"),
	receiver: Symbol.for("cordis.receiver"),
	original: Symbol.for("cordis.original"),
	metadata: Symbol.for("cordis.metadata"),
	initHooks: Symbol.for("cordis.initHooks"),
	checkProto: Symbol.for("cordis.checkProto"),
	effect: Symbol.for("cordis.effect"),
	filter: Symbol.for("cordis.filter"),
	isolate: Symbol.for("cordis.isolate"),
	intercept: Symbol.for("cordis.intercept"),
	init: Symbol.for("cordis.init"),
	check: Symbol.for("cordis.check"),
	config: Symbol.for("cordis.config"),
	invoke: Symbol.for("cordis.invoke"),
	extend: Symbol.for("cordis.extend"),
	tracker: Symbol.for("cordis.tracker"),
	resolveConfig: Symbol.for("cordis.resolveConfig")
};
const GeneratorFunction = function* () {}.constructor;
const AsyncGeneratorFunction = async function* () {}.constructor;
/** Return true when a plugin callback should be constructed with `new`. */
function isConstructor(func) {
	if (!func.prototype) return false;
	if (func instanceof GeneratorFunction) return false;
	if (AsyncGeneratorFunction !== Function && func instanceof AsyncGeneratorFunction) return false;
	return true;
}
/** Merge two prototype chains while preserving descriptors from `proto1`. */
function joinPrototype(proto1, proto2) {
	if (proto1 === Object.prototype) return proto2;
	const result = Object.create(joinPrototype(Object.getPrototypeOf(proto1), proto2));
	for (const key of Reflect.ownKeys(proto1)) Object.defineProperty(result, key, Object.getOwnPropertyDescriptor(proto1, key));
	return result;
}
/** Return true for non-null objects and functions. */
function isObject(value) {
	return value && (typeof value === "object" || typeof value === "function");
}
/** Find a property descriptor by walking an object's prototype chain. */
function getPropertyDescriptor(target, prop) {
	let proto = target;
	while (proto) {
		const desc = Reflect.getOwnPropertyDescriptor(proto, prop);
		if (desc) return desc;
		proto = Object.getPrototypeOf(proto);
	}
}
/** Wrap services/functions so method calls see the caller's active context. */
function getTraceable(ctx, value) {
	if (!isObject(value)) return value;
	if (Object.hasOwn(value, symbols.shadow)) return Object.getPrototypeOf(value);
	const tracker = value[symbols.tracker];
	if (!tracker) return value;
	return createTraceable(ctx, value, tracker);
}
/** Return a proxy that overlays readonly or writable properties onto a target. */
function withProps(target, props) {
	if (!props) return target;
	return new Proxy(target, {
		get: (target$1, prop, receiver) => {
			if (prop in props && prop !== "constructor") return Reflect.get(props, prop, receiver);
			return Reflect.get(target$1, prop, receiver);
		},
		set: (target$1, prop, value, receiver) => {
			if (prop in props && prop !== "constructor") return Reflect.set(props, prop, value, receiver);
			return Reflect.set(target$1, prop, value, receiver);
		}
	});
}
function withProp(target, prop, value) {
	return withProps(target, Object.defineProperty(Object.create(null), prop, {
		value,
		writable: false
	}));
}
function createShadow(ctx, target, property, receiver) {
	if (!property) return receiver;
	const origin = Reflect.getOwnPropertyDescriptor(target, property)?.value;
	if (!origin) return receiver;
	return withProp(receiver, property, ctx.extend({ [symbols.shadow]: origin }));
}
function createShadowMethod(ctx, value, outer, shadow) {
	return new Proxy(value, { apply: (target, thisArg, args) => {
		if (thisArg === outer) thisArg = shadow;
		return getTraceable(ctx, Reflect.apply(target, thisArg, args));
	} });
}
function createTraceable(ctx, value, tracker) {
	if (ctx[symbols.shadow] && !tracker.noShadow) ctx = Object.getPrototypeOf(ctx);
	const proxy = new Proxy(value, {
		get: (target, prop, receiver) => {
			if (prop === symbols.original) return target;
			if (prop === tracker.property) return ctx;
			if (typeof prop === "symbol") return Reflect.get(target, prop, receiver);
			if (tracker.associate && ctx.reflect.props[`${tracker.associate}.${prop}`]) return Reflect.get(ctx, `${tracker.associate}.${prop}`, withProp(ctx, symbols.receiver, receiver));
			let shadow, innerValue;
			const desc = getPropertyDescriptor(target, prop);
			if (desc && "value" in desc) innerValue = desc.value;
			else {
				shadow = createShadow(ctx, target, tracker.property, receiver);
				innerValue = Reflect.get(target, prop, shadow);
			}
			const innerTracker = innerValue?.[symbols.tracker];
			if (innerTracker) return createTraceable(ctx, innerValue, innerTracker);
			else if (!tracker.noShadow && typeof innerValue === "function") {
				shadow ??= createShadow(ctx, target, tracker.property, receiver);
				return createShadowMethod(ctx, innerValue, receiver, shadow);
			} else return innerValue;
		},
		set: (target, prop, value$1, receiver) => {
			if (prop === symbols.original) return false;
			if (prop === tracker.property) return false;
			if (typeof prop === "symbol") return Reflect.set(target, prop, value$1, receiver);
			if (tracker.associate && ctx.reflect.props[`${tracker.associate}.${prop}`]) return Reflect.set(ctx, `${tracker.associate}.${prop}`, value$1, withProp(ctx, symbols.receiver, receiver));
			const shadow = createShadow(ctx, target, tracker.property, receiver);
			return Reflect.set(target, prop, value$1, shadow);
		},
		apply: (target, thisArg, args) => {
			return applyTraceable(proxy, target, thisArg, args);
		}
	});
	return proxy;
}
function applyTraceable(proxy, value, thisArg, args) {
	if (!value[symbols.invoke]) return Reflect.apply(value, thisArg, args);
	return value[symbols.invoke].apply(proxy, args);
}
/** Create a callable service object that dispatches through `symbols.invoke`. */
function createCallable(name$1, proto, tracker) {
	const self = function(...args) {
		return applyTraceable(createTraceable(self["ctx"], self, tracker), self, this, args);
	};
	defineProperty(self, "name", name$1);
	return Object.setPrototypeOf(self, proto);
}
function handleError(info, reason, getOuterStack) {
	const innerLines = info.error.stack.split("\n");
	if (typeof reason?.stack !== "string") {
		const outerError = new Error(reason);
		const lines$1 = outerError.stack.split("\n");
		lines$1.splice(1, Infinity, ...getOuterStack());
		outerError.stack = lines$1.join("\n");
		throw outerError;
	}
	const lines = reason.stack.split("\n");
	let index = lines.indexOf(innerLines[2]);
	if (index === -1) throw reason;
	index -= info.offset;
	while (index > 0) {
		if (!lines[index - 1].endsWith(" (<anonymous>)")) break;
		index -= 1;
	}
	lines.splice(index, Infinity, ...getOuterStack());
	reason.stack = lines.join("\n");
	throw reason;
}
/** Run a callback and splice outer call-site frames into thrown async errors. */
function composeError(callback, getOuterStack = buildOuterStack()) {
	const info = {
		offset: 1,
		error: /* @__PURE__ */ new Error()
	};
	try {
		const result = callback(info);
		if (isObject(result) && "then" in result) return result.then(void 0, (reason) => handleError(info, reason, getOuterStack));
		else return result;
	} catch (reason) {
		handleError(info, reason, getOuterStack);
	}
}
/** Capture a lazy stack-frame supplier for later error composition. */
function buildOuterStack(offset = 0) {
	const outerError = /* @__PURE__ */ new Error();
	return () => outerError.stack.split("\n").slice(3 + offset);
}
/**
* Return whether an event result should stop a bail-style dispatch.
*
* @param value — a listener's return value.
* @returns `true` unless `value` is `null`, `false`, or `undefined`.
*/
function isBailed(value) {
	return value !== null && value !== false && value !== void 0;
}
/**
* Event bus installed as `ctx.events` and mixed into every context.
*
* The service supports concurrent, synchronous, serial, bail, and waterfall
* dispatch and automatically disposes listeners with their owning fiber.
*/
var EventsService = class {
	ctx;
	_hooks = {};
	constructor(ctx) {
		this.ctx = ctx;
		defineProperty(this, symbols.tracker, {
			property: "ctx",
			noShadow: true
		});
		this.on("internal/listener", function(name$1, listener, options) {
			if (name$1 === "internal/update" && !options.global) return (this.fiber._hooks["internal/update"] ??= new DisposableList())[options.prepend ? "unshift" : "push"](listener);
		});
		this.on("internal/update", function(config, noSave, next) {
			const cbs = [...this._hooks["internal/update"] || []];
			const _next = () => {
				return (cbs.shift() ?? next).call(this, config, noSave, _next);
			};
			return _next();
		}, {
			global: true,
			prepend: true
		});
	}
	/**
	* Resolve listeners for one dispatch and apply context filtering.
	*
	* @param type — the dispatch mode, reported on `internal/dispatch`.
	* @param args — the raw dispatch arguments; consumed up to the event name.
	* @returns the matching listener callbacks, bound to the dispatch `this`.
	*/
	dispatch(type, args) {
		const thisArg = typeof args[0] === "object" || typeof args[0] === "function" ? args.shift() : null;
		const name$1 = args.shift();
		if (!name$1.startsWith("internal/")) this.emit("internal/dispatch", type, name$1, args, thisArg);
		const filter = thisArg?.[Context.filter];
		return (this._hooks[name$1] || []).filter((hook) => hook.global || !filter || filter.call(thisArg, hook.ctx)).map((hook) => hook.callback.bind(thisArg));
	}
	/**
	* Run listeners concurrently and wait for all of them.
	*
	* @param args — optional `this`, the event name, then listener arguments.
	* @returns a promise resolving once every listener has settled.
	*/
	async parallel(...args) {
		const errors = (await Promise.allSettled(this.dispatch("emit", args).map(async (cb) => cb(...args)))).filter((result) => result.status === "rejected");
		if (errors.length) throw new AggregateError(errors.map((error) => error.reason));
	}
	/**
	* Run listeners synchronously without waiting for returned promises.
	*
	* @param args — optional `this`, the event name, then listener arguments.
	*/
	emit(...args) {
		this.dispatch("emit", args).map((cb) => cb(...args));
	}
	/**
	* Run listeners in order, awaiting each, until one returns a bail value.
	*
	* @param args — optional `this`, the event name, then listener arguments.
	* @returns the first bail value (see {@link isBailed}), if any.
	*/
	async serial(...args) {
		for (const cb of this.dispatch("serial", args)) {
			const result = await cb(...args);
			if (isBailed(result)) return result;
		}
	}
	/**
	* Run listeners synchronously until one returns a bail value.
	*
	* @param args — optional `this`, the event name, then listener arguments.
	* @returns the first bail value (see {@link isBailed}), if any.
	*/
	bail(...args) {
		for (const cb of this.dispatch("bail", args)) {
			const result = cb(...args);
			if (isBailed(result)) return result;
		}
	}
	/**
	* Compose listeners around the final `next` callback.
	*
	* The last dispatch argument is treated as the innermost `next`. Listeners
	* run outermost-first; a listener that does not call `next()` vetoes the
	* rest of the chain, including the built-in behavior.
	*
	* @param args — optional `this`, the event name, listener arguments, then `next`.
	* @returns the outermost listener's return value.
	*/
	waterfall(...args) {
		const cbs = this.dispatch("waterfall", args);
		const inner = args.pop();
		const next = () => {
			return (cbs.shift() ?? inner)(...args);
		};
		args.push(next);
		return next();
	}
	/**
	* Store a listener record as an effect on the current fiber.
	*
	* @param label — effect label shown in fiber diagnostics.
	* @param hooks — the listener list for one event.
	* @param callback — the listener to store.
	* @param options — placement and filtering options.
	* @returns a disposer that unregisters the listener.
	*/
	register(label, hooks, callback, options) {
		const method = options.prepend ? "unshift" : "push";
		return this.ctx.fiber.effect(() => {
			hooks[method]({
				ctx: this.ctx,
				callback,
				...options
			});
			return () => this.unregister(hooks, callback);
		}, label);
	}
	/**
	* Remove a stored listener record.
	*
	* @param hooks — the listener list for one event.
	* @param callback — the listener to remove.
	* @returns `true` if the listener was found and removed.
	*/
	unregister(hooks, callback) {
		const index = hooks.findIndex((hook) => hook.callback === callback);
		if (index >= 0) {
			hooks.splice(index, 1);
			return true;
		}
	}
	/**
	* Register an event listener owned by the current fiber.
	*
	* The listener is removed automatically when the fiber unloads. Throws
	* `CordisError('INACTIVE_EFFECT')` if the fiber is already disposed.
	*
	* @param name — the event name to listen for.
	* @param listener — called with the dispatch arguments.
	* @param options — listener options; a boolean is shorthand for `prepend`.
	* @returns a disposer removing the listener; `true` if it was still registered.
	*/
	on(name$1, listener, options) {
		if (typeof options !== "object") options = { prepend: options };
		this.ctx.fiber.assertActive();
		listener = this.ctx.reflect.bind(listener);
		const result = this.bail(this.ctx, "internal/listener", name$1, listener, options);
		if (result) return result;
		const hooks = this._hooks[name$1] ||= [];
		const label = `ctx.on(${typeof name$1 === "string" ? JSON.stringify(name$1) : name$1.toString()})`;
		return this.register(label, hooks, listener, options);
	}
	/**
	* Register an event listener that disposes itself after the first call.
	*
	* @param name — the event name to listen for.
	* @param listener — called at most once with the dispatch arguments.
	* @param options — listener options; a boolean is shorthand for `prepend`.
	* @returns a disposer removing the listener; `true` if it was still registered.
	*/
	once(name$1, listener, options) {
		const dispose = this.on(name$1, function(...args) {
			dispose();
			return listener.apply(this, args);
		}, options);
		return dispose;
	}
};
/** Built-in placeholder formatters used by `Logger.format()`. */
const defaultFormatters = {
	s: (value) => String(value),
	d: (value) => Math.trunc(Number(value)),
	i: (value) => Math.trunc(Number(value)),
	f: (value) => Number(value),
	o: (value) => JSON.stringify(value),
	O: (value) => JSON.stringify(value),
	c: () => "",
	C: (value, exporter, message) => {
		return Logger.color(exporter, Logger.code(message.name, exporter.colors), value);
	}
};
function isAggregateError(error) {
	return error instanceof Error && Array.isArray(error["errors"]);
}
/** Logger facade for one named subsystem. */
var Logger = class {
	service;
	static color(exporter, code, value, decoration = "") {
		if (!exporter.colors) return "" + value;
		return `\u001b[3${code < 8 ? code : "8;5;" + code}${exporter.colors >= 2 ? decoration : ""}m${value}\u001b[0m`;
	}
	static code(name$1, level) {
		let hash = 0;
		for (let i = 0; i < name$1.length; i++) {
			hash = (hash << 3) - hash + name$1.charCodeAt(i) + 13;
			hash |= 0;
		}
		const colors = !level ? [] : level >= 2 ? c256 : c16;
		return colors[Math.abs(hash) % colors.length];
	}
	static format(exporter, message) {
		const args = message.args.slice();
		if (args[0] instanceof Error) {
			args[0] = args[0].stack || args[0].message;
			args.unshift("%s");
		} else if (typeof args[0] !== "string") args.unshift("%o");
		let format = args.shift();
		format = format.replace(/%([a-zA-Z%])/g, (match, char) => {
			if (match === "%%") return "%";
			const formatter = exporter.formatters?.[char] ?? defaultFormatters[char];
			if (typeof formatter === "function") return formatter(args.shift(), exporter, message);
			return match;
		});
		const oFormatter = exporter.formatters?.o ?? defaultFormatters.o;
		for (let arg of args) {
			if (typeof arg === "object" && arg) arg = oFormatter(arg, exporter, message);
			format += " " + arg;
		}
		const { maxLength = 10240 } = exporter;
		return format.split(/\r?\n/g).map((line) => {
			return line.slice(0, maxLength) + (line.length > maxLength ? "..." : "");
		}).join("\n");
	}
	constructor(options, service) {
		this.service = service;
		Object.assign(this, options);
		this.error = this._method("error", 0);
		this.info = this._method("info", 1);
		this.warn = this._method("warn", 2);
		this.debug = this._method("debug", 3);
	}
	_method(type, level) {
		return (...args) => {
			if (args.length === 1 && args[0] instanceof Error) {
				if (args[0].cause) this[type](args[0].cause);
				else if (isAggregateError(args[0])) {
					args[0].errors.forEach((error) => this[type](error));
					return;
				}
			}
			const sn = ++this.service._snMessage;
			const ts = Date.now();
			for (const exporter of this.service.exporters.values()) {
				if ((exporter.levels?.[this.name] ?? exporter.levels?.default ?? this.level ?? 1) < level) continue;
				const message = {
					sn,
					ts,
					type,
					level,
					name: this.name,
					...this.meta,
					args
				};
				exporter.export(message);
			}
		};
	}
};
/** ANSI 16-color palette indexes used for logger name coloring. */
const c16 = [
	6,
	2,
	3,
	4,
	5,
	1
];
/** ANSI 256-color palette indexes used for logger name coloring. */
const c256 = [
	20,
	21,
	26,
	27,
	32,
	33,
	38,
	39,
	40,
	41,
	42,
	43,
	44,
	45,
	56,
	57,
	62,
	63,
	68,
	69,
	74,
	75,
	76,
	77,
	78,
	79,
	80,
	81,
	92,
	93,
	98,
	99,
	112,
	113,
	129,
	134,
	135,
	148,
	149,
	160,
	161,
	162,
	163,
	164,
	165,
	166,
	167,
	168,
	169,
	170,
	171,
	172,
	173,
	178,
	179,
	184,
	185,
	196,
	197,
	198,
	199,
	200,
	201,
	202,
	203,
	204,
	205,
	206,
	207,
	208,
	209,
	214,
	215,
	220,
	221
];
/**
* Built-in logging service.
*
* Call `ctx.logger()` to create a named logger, or call `ctx.logger.info()`
* directly to log with the current fiber-derived name.
*/
var LoggerService = class LoggerService$1 {
	bufferSize = 1e3;
	buffer = [];
	ctx;
	_snMessage = 0;
	_snExporter = 0;
	exporters = /* @__PURE__ */ new Map();
	constructor(ctx) {
		const tracker = {
			property: "ctx",
			noShadow: true
		};
		const self = createCallable("logger", joinPrototype(Object.getPrototypeOf(this), Function.prototype), tracker);
		Object.assign(self, this);
		self.ctx = ctx;
		defineProperty(self, symbols.tracker, tracker);
		self.exporter({
			colors: 3,
			export: (message) => {
				self.buffer.push(message);
				if (self.buffer.length > self.bufferSize) self.buffer = self.buffer.slice(-self.bufferSize);
			}
		});
		return self;
	}
	/**
	* Register an exporter and dispose it with the current fiber.
	*
	* @param exporter — the sink that receives structured log messages.
	* @returns a disposer that removes the exporter.
	*/
	exporter(exporter) {
		return this.ctx.effect(() => {
			this.exporters.set(++this._snExporter, exporter);
			return () => this.exporters.delete(this._snExporter);
		}, "ctx.logger.exporter()");
	}
	_resolveConfig() {
		let intercept = this.ctx[symbols.intercept];
		const configs = [];
		while ("logger" in intercept) {
			if (Object.hasOwn(intercept, "logger")) configs.unshift(intercept["logger"]);
			intercept = Object.getPrototypeOf(intercept);
		}
		return Object.assign({}, ...configs);
	}
	[symbols.invoke](name$1) {
		const config = this._resolveConfig();
		const fiber = (this.ctx[symbols.shadow] ?? this.ctx).fiber;
		name$1 ??= config.name;
		name$1 ??= hyphenate(fiber.name);
		return new Logger({
			name: name$1,
			level: config.level,
			meta: { fiber: new WeakRef(fiber) }
		}, this);
	}
	static {
		for (const type of [
			"error",
			"info",
			"warn",
			"debug"
		]) LoggerService$1.prototype[type] = function(...args) {
			return this()[type](...args);
		};
	}
};
function enhanceError(error) {
	const lines = error.stack.split("\n");
	lines.splice(0, 2, `Error: ${error.message}`);
	error.stack = lines.join("\n");
	return error;
}
const RESERVED_WORDS = ["prototype", "then"];
function isSpecialProperty(prop) {
	return typeof prop === "symbol" || RESERVED_WORDS.includes(prop) || parseInt(prop).toString() === prop || prop.startsWith("_");
}
/**
* Reflection and service-resolution layer installed as `ctx.reflect`.
*
* This service powers the context proxy, service registration, accessors, and
* the mixins that expose core service methods directly on `ctx`.
*/
var ReflectService = class {
	ctx;
	/** Proxy traps implementing service resolution for every context object. */
	static handler = {
		get: (target, prop, ctx) => {
			if (isSpecialProperty(prop)) return Reflect.get(target, prop, ctx);
			if (Reflect.has(target, prop)) return getTraceable(ctx, Reflect.get(target, prop, ctx));
			const error = /* @__PURE__ */ new Error(`cannot get property "${prop}" without inject`);
			try {
				const def = target.reflect.props[prop];
				if (def?.type === "accessor") return def.get.call(ctx, ctx[symbols.receiver], error);
				if (!ctx.fiber.runtime) return ctx.reflect.get(prop, false);
				return ctx.events.waterfall("internal/get", ctx, prop, error, () => {
					const key = target[symbols.isolate][prop];
					let fiber = (ctx[symbols.shadow] ?? ctx).fiber;
					while (true) {
						const impl = fiber.store?.[prop];
						if (impl) return getTraceable(ctx, impl.value);
						if (prop in fiber.inject) {
							error.message = `cannot get required service "${prop}" in inactive context`;
							throw error;
						}
						if (!fiber.runtime) throw error;
						if (fiber.parent[symbols.isolate][prop] !== key) throw error;
						fiber = fiber.parent.fiber;
					}
				});
			} catch (e) {
				throw e === error ? enhanceError(e) : e;
			}
		},
		set: (target, prop, value, ctx) => {
			if (isSpecialProperty(prop)) return Reflect.set(target, prop, value, ctx);
			const error = /* @__PURE__ */ new Error(`cannot set property "${prop}" without provide`);
			const def = target.reflect.props[prop];
			if (!def) {
				if (!ctx.fiber.runtime) return Reflect.set(target, prop, value, ctx);
				throw enhanceError(error);
			}
			try {
				if (def.type === "accessor") {
					if (!def.set) return false;
					return def.set.call(ctx, value, ctx[symbols.receiver], error);
				}
				return ctx.events.waterfall("internal/set", ctx, prop, value, error, () => {
					return ctx.reflect.set(prop, value, error);
				});
			} catch (e) {
				throw e === error ? enhanceError(e) : e;
			}
		},
		has: (target, prop) => {
			if (isSpecialProperty(prop)) return Reflect.has(target, prop);
			if (Reflect.has(target, prop)) return true;
			return !!target.reflect.props[prop];
		}
	};
	/** Service implementations, keyed by isolation label. */
	store = Object.create(null);
	/** Declared context properties (services and accessors), by name. */
	props = Object.create(null);
	constructor(ctx) {
		this.ctx = ctx;
		defineProperty(this, symbols.tracker, {
			property: "ctx",
			noShadow: true
		});
		this.mixin("reflect", [
			"get",
			"set",
			"provide",
			"accessor",
			"mixin"
		]);
		this.mixin("fiber", ["runtime", "effect"]);
		this.mixin("registry", ["inject", "plugin"]);
		this.mixin("events", [
			"on",
			"once",
			"parallel",
			"emit",
			"serial",
			"bail",
			"waterfall"
		]);
	}
	/**
	* Read a service from the store without the inject requirement.
	*
	* @param name — the service name.
	* @param strict — when `true`, only return implementations whose providing
	* fiber is currently active.
	* @returns the service value, or `undefined` when not (yet) provided.
	*/
	get(name$1, strict = true) {
		return getTraceable(this.ctx, this._getImpl(name$1, strict)?.value);
	}
	_getImpl(name$1, strict = true) {
		const key = this.ctx[symbols.isolate][name$1];
		const impl = key && this.store[key];
		if (!impl) return;
		if (strict && impl.fiber.state !== 2) return;
		return impl;
	}
	/**
	* Overwrite a provided service's value.
	*
	* @param name — the service name.
	* @param value — the new service value.
	* @param error — carrier for the caller stack in diagnostics.
	* @returns `true` on success.
	* @throws when `name` was never provided, or was provided by another fiber.
	*/
	set(name$1, value, error) {
		const key = this.ctx[symbols.isolate][name$1];
		const impl = this.store[key];
		if (!impl) throw new Error(`cannot set property "${name$1}" without provide`);
		if (impl.fiber !== this.ctx.fiber) throw new Error(`cannot set property "${name$1}" in multiple fibers`);
		impl.value = value;
		return true;
	}
	/**
	* Register a service implementation owned by the current fiber.
	*
	* See the `ctx.provide()` overload above for the full contract.
	*
	* @param name — the service name.
	* @param value — the service value.
	* @param check — optional availability predicate for dependents.
	* @returns a disposer that unregisters the service.
	*/
	provide(name$1, value, check) {
		return this.ctx.fiber.effect(() => {
			if (!this.props[name$1]) this.props[name$1] ??= { type: "service" };
			else if (this.props[name$1].type !== "service") throw new Error(`property "${name$1}" is already declared as ${this.props[name$1].type}`);
			this.props[name$1] = { type: "service" };
			this.ctx.root[symbols.isolate][name$1] ??= Symbol(name$1);
			const key = this.ctx[symbols.isolate][name$1];
			const impl = {
				name: name$1,
				value,
				fiber: this.ctx.fiber,
				check
			};
			if (this.store[key]) throw new Error(`service "${name$1}" has been registered at <${this.store[key].fiber.name}>`);
			this.store[key] = impl;
			this.ctx.fiber.store[name$1] = impl;
			if (this.ctx.fiber.state === 2) this.notify([name$1]);
			return async () => {
				delete this.store[key];
				const fibers = this.notify([name$1]);
				await Promise.allSettled(fibers.map((fiber) => fiber.await()));
				delete this.ctx.fiber.store[name$1];
			};
		}, `ctx.provide(${JSON.stringify(name$1)})`);
	}
	/**
	* Re-evaluate every fiber that requires one of the given services.
	*
	* @param names — the service names that changed.
	* @param filter — restricts notification to matching isolation scopes.
	* @returns the fibers whose dependency state was refreshed.
	*/
	notify(names, filter = (ctx, name$1) => ctx[symbols.isolate][name$1] === this.ctx[symbols.isolate][name$1]) {
		const fibers = [];
		for (const runtime of this.ctx.registry.values()) for (const fiber of runtime.fibers) {
			let hasUpdate = false;
			for (const name$1 of names) {
				if (!(name$1 in fiber.inject)) continue;
				if (!filter(fiber.ctx, name$1)) continue;
				hasUpdate = true;
				fiber._checkImpl(name$1);
			}
			if (!hasUpdate) continue;
			fiber._refresh();
			fibers.push(fiber);
		}
		for (const name$1 of names) {
			const self = Object.create(this.ctx);
			self[symbols.filter] = (target) => filter(target, name$1);
			this.ctx.events.emit(self, "internal/service", name$1, this._getImpl(name$1, false)?.value);
		}
		return fibers;
	}
	/**
	* Define a computed context property backed by get/set hooks.
	*
	* @param name — the context property name.
	* @param options — the `get` hook and optional `set` hook.
	* @returns a disposer that removes the accessor.
	*/
	accessor(name$1, options) {
		return this.ctx.fiber.effect(() => {
			if (name$1 in this.props) throw new Error(`property "${name$1}" is already declared as ${this.props[name$1].type}`);
			this.props[name$1] = {
				type: "accessor",
				...options
			};
			return () => delete this.props[name$1];
		}, `ctx.accessor(${JSON.stringify(name$1)})`);
	}
	/**
	* Expose selected members of a service directly on `ctx`.
	*
	* See the `ctx.mixin()` overload above for the full contract.
	*
	* @param source — a context property name or a source object.
	* @param mixins — keys to forward, or a source-key → ctx-key map.
	* @returns a disposer that removes all created accessors.
	*/
	mixin(source, mixins) {
		const self = this;
		return this.ctx.fiber.effect(function* () {
			const entries = Array.isArray(mixins) ? mixins.map((key) => [key, key]) : Object.entries(mixins);
			const getTarget = (ctx, error) => {
				return ctx[source];
			};
			for (const [key, value] of entries) yield self.accessor(value, {
				get(receiver, error) {
					const service = getTarget(this, error);
					if (isNullable(service)) return service;
					const mixin = receiver ? withProps(receiver, service) : service;
					const value$1 = Reflect.get(service, key, mixin);
					if (typeof value$1 !== "function") return value$1;
					return value$1.bind(mixin ?? service);
				},
				set(value$1, receiver, error) {
					const service = getTarget(this, error);
					const mixin = receiver ? withProps(receiver, service) : service;
					return Reflect.set(service, key, value$1, mixin);
				}
			});
		}, `ctx.mixin(${JSON.stringify(source)})`);
	}
	/**
	* Attach this context's tracing wrapper to a value.
	*
	* @param value — the value to wrap.
	* @returns the traceable wrapper (or the value itself when not applicable).
	*/
	trace(value) {
		return getTraceable(this.ctx, value);
	}
	/**
	* Wrap a callback so calls trace `this` and arguments to this context.
	*
	* @param callback — the function to wrap.
	* @returns a proxy delegating to `callback` with traced values.
	*/
	bind(callback) {
		return new Proxy(callback, {
			apply: (target, thisArg, args) => {
				return Reflect.apply(target, this.trace(thisArg), args.map((arg) => this.trace(arg)));
			},
			construct: (target, args, newTarget) => {
				return Reflect.construct(target, args.map((arg) => this.trace(arg)), newTarget);
			}
		});
	}
};
const kValidationError = Symbol.for("ValidationError");
/** Error raised when plugin configuration fails standard-schema validation. */
var ValidationError = class extends TypeError {
	name = "ValidationError";
	/**
	* Build the aggregated message from schema issues.
	*
	* @param issues — the standard-schema issues, one message line each.
	*/
	constructor(issues) {
		super(`invalid config:\n` + issues.map((issue) => {
			if (issue.path) return `  - ${issue.message} (at ${issue.path.join(".")})`;
			else return `  - ${issue.message}`;
		}).join("\n"));
	}
};
Object.defineProperty(ValidationError.prototype, kValidationError, { value: true });
/**
* Validate and normalize config for a plugin runtime before it starts.
*
* @param runtime — the plugin runtime whose `Config` schema to apply.
* @param config — the raw user config.
* @returns the validated config, or `config` unchanged if the runtime has no schema.
* @throws {ValidationError} when validation reports issues.
*/
function resolveConfig(runtime, config) {
	if (!runtime.Config) return config;
	const result = runtime.Config["~standard"].validate(config);
	if ("then" in result) throw new TypeError("Async config validation is not supported");
	if (result.issues) throw new ValidationError(result.issues);
	else return result.value;
}
const effectInertia = /* @__PURE__ */ new WeakMap();
function runDisposable(dispose) {
	const result = dispose();
	return effectInertia.get(dispose)?.() ?? result;
}
/** Notify plugin teardown without allowing one observer to break ownership cleanup. */
function emitPluginDisposed(context, fiber) {
	const args = ["internal/plugin", fiber];
	let callbacks;
	try {
		callbacks = context.events.dispatch("emit", args);
	} catch (error) {
		context.logger.error(error);
		return;
	}
	for (const callback of callbacks) try {
		const returned = callback(...args);
		Promise.resolve(returned).catch((error) => context.logger.error(error));
	} catch (error) {
		context.logger.error(error);
	}
}
/** Framework error with a stable machine-readable code. */
var CordisError = class CordisError$1 extends Error {
	code;
	/**
	* @param code — the stable error code; also the default message.
	* @param message — optional human-readable override.
	*/
	constructor(code, message) {
		super(message ?? CordisError$1.Code[code]);
		this.code = code;
	}
};
/** Cordis error code definitions. */
(function(CordisError$1) {
	CordisError$1.Code = { INACTIVE_EFFECT: "cannot create effect on inactive context" };
})(CordisError || (CordisError = {}));
const INACTIVE = "__INACTIVE__";
/**
* Runtime instance of one plugin application.
*
* A fiber tracks dependency state, validated config, lifecycle effects, and
* cleanup for the plugin context returned by `ctx.plugin()`.
*/
var Fiber = class {
	parent;
	inject;
	runtime;
	/** Unique id within the registry; 0 for the root fiber, `null` once disposed. */
	uid;
	/** The context this fiber's plugin runs in (extends the parent context). */
	ctx;
	/** The validated plugin config (updated by `update()`). */
	config;
	/** The raw plugin config, re-resolved before each activation. */
	_config;
	/** Current lifecycle state; transitions emit `internal/status`. */
	state = 0;
	/** Dispose this fiber: unload the plugin, then settle once cleanup finished. */
	dispose;
	/** Snapshot of required service implementations while loaded; `undefined` otherwise. */
	store;
	/** The in-flight load/unload transition, if one is currently running. */
	inertia;
	_hooks = Object.create(null);
	_disposables = new DisposableList();
	context;
	_error;
	_runner;
	_store = Object.create(null);
	/**
	* Create a fiber. Plugin authors normally obtain fibers from `ctx.plugin()`
	* rather than constructing them directly.
	*
	* @param parent — the context the plugin was loaded from.
	* @param config — raw config, validated against the runtime's schema.
	* @param inject — resolved dependency map (service name → intercept config).
	* @param runtime — the shared plugin runtime, or `null` for the root fiber.
	* @param getOuterStack — captures the caller stack for effect diagnostics.
	*/
	constructor(parent, config, inject$1, runtime, getOuterStack) {
		this.parent = parent;
		this.inject = inject$1;
		this.runtime = runtime;
		this._config = config;
		const collect = (dispose) => {
			this._disposables.push(dispose);
		};
		if (runtime) {
			this.uid = parent.registry.counter;
			this.ctx = this.context = parent.extend({ fiber: this });
			const injectEntries = Object.entries(this.inject);
			if (injectEntries.length) {
				this.ctx[Context.intercept] = Object.create(parent[Context.intercept]);
				for (const [name$1, config$1] of injectEntries) {
					if (isNullable(config$1)) continue;
					this.ctx[Context.intercept][name$1] = config$1;
				}
			}
			this._runner = {
				epoch: INACTIVE,
				getOuterStack,
				execute: function() {
					if (isConstructor(runtime.callback)) {
						const instance = new runtime.callback(this.ctx, this.config);
						for (const hook of instance?.[symbols.initHooks] ?? []) hook();
						return instance?.[symbols.init]?.();
					} else return runtime.callback(this.ctx, this.config);
				},
				collect
			};
			this.dispose = parent.fiber.effect(() => {
				const remove = runtime.fibers.push(this);
				return async () => {
					this.uid = null;
					emitPluginDisposed(this.context, this);
					if (this.ctx.registry.has(runtime.callback)) {
						remove();
						if (!runtime.fibers.length) this.ctx.registry.delete(runtime.callback);
					}
					this._setEpoch(INACTIVE);
					if (!this.inertia) this._updateState(() => {
						this.inertia = this._unload();
						return 5;
					});
					while (this.inertia) await this.inertia;
				};
			}, "ctx.plugin()");
			try {
				this.context.emit("internal/plugin", this);
			} catch (error) {
				Promise.resolve(this.dispose()).catch((reason) => this.ctx.logger.error(reason));
				throw error;
			}
			if (this.uid !== null && parent.fiber.state !== 5) {
				for (const name$1 of Object.keys(this.inject)) this._checkImpl(name$1);
				this._refresh();
			}
		} else {
			this.uid = 0;
			this.ctx = this.context = parent;
			this.state = 2;
			this.store = Object.create(null);
			this._runner = {
				epoch: "",
				getOuterStack,
				execute: () => {},
				collect
			};
			this.dispose = () => this.restart();
		}
	}
	/** The plugin's display name, inherited from the nearest named ancestor, else `'root'`. */
	get name() {
		let fiber = this;
		do {
			if (fiber.runtime?.name) return fiber.runtime.name;
			fiber = fiber.parent.fiber;
		} while (fiber !== fiber.parent.fiber);
		return "root";
	}
	/**
	* Throw if the fiber has already been disposed.
	*
	* @returns nothing when the fiber is still active.
	* @throws {CordisError} `INACTIVE_EFFECT` when the fiber's uid has been cleared.
	*/
	assertActive() {
		if (this.uid !== null) return;
		throw new CordisError("INACTIVE_EFFECT");
	}
	_execute(runner) {
		const oldEpoch = runner.epoch;
		return composeError((info) => {
			const safeCollect = (dispose) => {
				if (typeof dispose === "function") runner.collect(dispose);
				else if (!isNullable(dispose)) throw new TypeError("Invalid effect");
			};
			const effect = runner.execute.call(this);
			if (typeof effect === "function") return runner.collect(effect);
			else if (isNullable(effect)) {} else if (!isObject(effect)) throw new TypeError("Invalid effect");
			else if ("then" in effect) return effect.then(safeCollect);
			else if (Symbol.iterator in effect) {
				info.error = /* @__PURE__ */ new Error();
				const iter = effect[Symbol.iterator]();
				while (true) {
					const result = iter.next();
					safeCollect(result.value);
					if (result.done) return;
				}
			} else if (Symbol.asyncIterator in effect) {
				const iter = effect[Symbol.asyncIterator]();
				return (async () => {
					await Promise.resolve();
					info.error = /* @__PURE__ */ new Error();
					while (true) {
						if (runner.epoch !== oldEpoch) return;
						const result = await iter.next();
						safeCollect(result.value);
						if (result.done) return;
					}
				})();
			} else throw new TypeError("Invalid effect");
		}, runner.getOuterStack);
	}
	effect(execute, label = "anonymous") {
		this.assertActive();
		if (this.state === 5) throw new CordisError("INACTIVE_EFFECT");
		const disposables = [];
		let disposing = false;
		let disposalTask;
		const dispose = () => {
			if (disposing) return disposalTask;
			disposing = true;
			let task$1;
			for (const disposable of disposables.splice(0).reverse()) if (task$1) task$1 = task$1.then(() => runDisposable(disposable));
			else {
				const result = runDisposable(disposable);
				if (isObject(result) && "then" in result) task$1 = result;
			}
			return disposalTask = task$1;
		};
		const meta = {
			label,
			children: []
		};
		const runner = {
			execute,
			epoch: true,
			collect: (dispose$1) => {
				disposables.push(dispose$1);
				this._disposables.delete(dispose$1);
				if (dispose$1[symbols.effect]) meta.children.push(dispose$1[symbols.effect]);
			},
			getOuterStack: buildOuterStack()
		};
		let task;
		let executing = true;
		let resolveSetup;
		let rejectSetup;
		let setupBarrier;
		let setupFailed = false;
		let inFlight;
		let removeWrapper = () => false;
		const waitForSetup = () => {
			setupBarrier ??= new Promise((resolve, reject) => {
				resolveSetup = resolve;
				rejectSetup = reject;
			});
			return setupBarrier;
		};
		const disposeAfter = (setup) => {
			return Promise.resolve(setup).then(() => dispose(), async (reason) => {
				await dispose();
				throw reason;
			});
		};
		const finalizeDisposal = (callback) => {
			let result;
			try {
				result = callback();
			} catch (error) {
				removeWrapper();
				throw error;
			}
			if (isObject(result) && "then" in result) {
				const pending = Promise.resolve(result).finally(() => {
					removeWrapper();
					if (inFlight === pending) inFlight = void 0;
				});
				return inFlight = pending;
			}
			removeWrapper();
			return result;
		};
		const wrapper = defineProperty(() => {
			if (!runner.epoch) return setupFailed ? inFlight : void 0;
			runner.epoch = false;
			return finalizeDisposal(() => {
				if (executing) return disposeAfter(waitForSetup());
				return task ? disposeAfter(task) : dispose();
			});
		}, symbols.effect, meta);
		effectInertia.set(wrapper, () => inFlight);
		removeWrapper = this._disposables.push(wrapper);
		try {
			task = this._execute(runner);
		} catch (reason) {
			executing = false;
			setupFailed = true;
			runner.epoch = false;
			let cleanup;
			try {
				cleanup = finalizeDisposal(dispose);
			} finally {
				rejectSetup?.(reason);
			}
			if (isObject(cleanup) && "then" in cleanup) cleanup.catch((error) => this.ctx.logger.error(error));
			throw reason;
		}
		executing = false;
		if (setupBarrier) Promise.resolve(task).then(resolveSetup, rejectSetup);
		task?.catch(() => {
			if (!runner.epoch) return dispose();
			return finalizeDisposal(dispose);
		}).catch((error) => this.ctx.logger.error(error));
		const disposeAsync = () => {
			if (!runner.epoch) return;
			runner.epoch = false;
			return finalizeDisposal(dispose);
		};
		wrapper.then = async (onFulfilled, onRejected) => {
			return Promise.resolve(task).then(() => disposeAsync).then(onFulfilled, onRejected);
		};
		return wrapper;
	}
	/**
	* Return metadata for currently registered effects.
	*
	* @returns one {@link EffectMeta} tree per labeled live effect.
	*/
	getEffects() {
		return [...this._disposables].map((dispose) => dispose[symbols.effect]).filter(Boolean);
	}
	_getState() {
		if (this.uid === null) return 4;
		if (this._error) return 3;
		if (this._runner.epoch !== INACTIVE) return 2;
		return 0;
	}
	_updateState(callback) {
		const oldState = this.state;
		this.state = callback() ?? this._getState();
		if (oldState === this.state) return;
		this.context.emit("internal/status", this, oldState);
		if (oldState !== 2 && this.state !== 2) return;
		for (const key of Reflect.ownKeys(this.ctx.reflect.store)) {
			const impl = this.ctx.reflect.store[key];
			if (impl.fiber !== this) continue;
			this.ctx.reflect.notify([impl.name]);
		}
	}
	_checkImpl(name$1) {
		const impl = this.ctx.reflect._getImpl(name$1, true);
		if (!impl) return delete this._store[name$1];
		try {
			if (impl.check && !impl.check.call(getTraceable(this.ctx, impl.value))) return delete this._store[name$1];
		} catch (error) {
			impl.fiber.ctx.logger.error(error);
			return delete this._store[name$1];
		}
		this._store[name$1] = impl;
	}
	_refresh() {
		let epoch = false;
		epoch = "";
		for (const name$1 of Object.keys(this.inject)) {
			const impl = this._store[name$1];
			if (!impl) {
				epoch = INACTIVE;
				break;
			}
			epoch += ":" + impl.fiber.uid;
		}
		this._setEpoch(epoch);
	}
	_setEpoch(epoch) {
		const oldEpoch = this._runner.epoch;
		if (epoch === oldEpoch) return;
		this._runner.epoch = epoch;
		if (this.inertia) return;
		this._updateState(() => {
			if (epoch !== INACTIVE && oldEpoch === INACTIVE) {
				this.inertia = this._reload();
				return 1;
			} else {
				this.inertia = this._unload();
				return 5;
			}
		});
	}
	_resolveConfig(config) {
		config = this.context.waterfall(this, "internal/config", config, () => config);
		return this.runtime ? resolveConfig(this.runtime, config) : config;
	}
	async _reload() {
		this.store = { ...this._store };
		const oldEpoch = this._runner.epoch;
		try {
			await Promise.resolve();
			if (this._runner.epoch === oldEpoch) {
				this.config = this._resolveConfig(this._config);
				await this._execute(this._runner);
				this._error = void 0;
			}
		} catch (reason) {
			this.ctx.logger.error(reason);
			this._error = reason;
			this._runner.epoch = INACTIVE;
		}
		this._updateState(() => {
			if (this._runner.epoch === oldEpoch) this.inertia = void 0;
			else {
				this.inertia = this._unload();
				return 5;
			}
		});
	}
	async _unload() {
		await Promise.all(this._disposables.clear().map(async (dispose) => {
			try {
				await composeError(async (info) => {
					await Promise.resolve();
					info.error = /* @__PURE__ */ new Error();
					await runDisposable(dispose);
				}, this._runner.getOuterStack);
			} catch (reason) {
				this.ctx.logger.error(reason);
			}
		}));
		this.store = void 0;
		this._updateState(() => {
			if (this._runner.epoch === INACTIVE) this.inertia = void 0;
			else {
				this.inertia = this._reload();
				return 1;
			}
		});
	}
	/**
	* Wait for current lifecycle work and rethrow startup errors.
	*
	* @returns this fiber, once it has settled into a stable state.
	* @throws the config-validation or plugin-startup error, if any.
	*/
	async await() {
		while (this.inertia) await this.inertia;
		if (this._error) throw this._error;
		return this;
	}
	/**
	* Dispose and immediately reload this plugin with its current config.
	*
	* @returns a promise resolving once the reload settled.
	* @throws {CordisError} `INACTIVE_EFFECT` when the fiber is already disposed.
	*/
	async restart() {
		this.assertActive();
		this._setEpoch(INACTIVE);
		this._refresh();
		await this.await();
	}
	/**
	* Validate and apply new config, then restart the plugin.
	*
	* Runs the `internal/update` waterfall first, so update hooks (and HMR)
	* can veto or replace the restart.
	*
	* @param config — the new raw config; validated before anything restarts.
	* @param noSave — hint for persistence hooks not to write the change back.
	* @returns the update waterfall result; the default restart returns a promise.
	* @throws when validation, an update listener, or the restarted plugin fails.
	*/
	update(config, noSave = false) {
		this.assertActive();
		this._config = config;
		if (this.state !== 2) {
			this._error = void 0;
			this._setEpoch(INACTIVE);
			this._refresh();
			return;
		}
		config = this._resolveConfig(config);
		return this.context.waterfall(this, "internal/update", config, noSave, () => {
			this.config = config;
			this._error = void 0;
			return this.restart();
		});
	}
};
function isApplicable(object) {
	return object && typeof object === "object" && typeof object.apply === "function";
}
/**
* Decorator for declaring service dependencies on classes or class methods.
*
* On classes it contributes to the plugin's static `inject` map. On methods it
* delays the method call until the declared services are available.
*/
/**
* @param name — the required service name.
* @param config — optional intercept config applied for that service.
* @returns the class or method decorator.
*/
function Inject(name$1, config) {
	return function(value, decorator) {
		if (decorator.kind === "class") {
			if (!Object.hasOwn(value, "inject")) {
				defineProperty(value, "inject", Object.create(Object.getPrototypeOf(value).inject ?? null));
				defineProperty(value.inject, symbols.checkProto, true);
			}
			value.inject[name$1] = config;
		} else if (decorator.kind === "method") {
			const inject$1 = (value[symbols.metadata] ??= {}).inject ??= Object.create(null);
			inject$1[name$1] = config;
			decorator.addInitializer(function() {
				const property = this[symbols.tracker]?.property;
				(this[symbols.initHooks] ??= []).push(() => {
					this.ctx.inject(inject$1, (ctx) => {
						return value.call(property ? withProps(this, { [property]: ctx }) : this);
					});
				});
			});
		} else throw new Error("@Inject() can only be used on class or class methods");
	};
}
/** Utilities for normalizing plugin dependency declarations. */
(function(Inject$1) {
	/**
	* Convert array/object/class-inherited inject metadata into a plain map.
	*
	* @param inject — the declaration to normalize; `null`/`undefined` add nothing.
	* @param result — the map to fill (service name → intercept config or `null`).
	* @returns `result`.
	*/
	function resolve(inject$1, result = Object.create(null)) {
		if (!inject$1) return result;
		if (Array.isArray(inject$1)) for (const name$1 of inject$1) result[name$1] = null;
		else if (Reflect.has(inject$1, symbols.checkProto)) {
			Object.assign(result, resolve(Object.getPrototypeOf(inject$1)));
			for (const name$1 of Object.keys(inject$1)) result[name$1] = inject$1[name$1] ?? null;
		} else for (const name$1 of Object.keys(inject$1)) result[name$1] = inject$1[name$1] ?? null;
		return result;
	}
	Inject$1.resolve = resolve;
})(Inject || (Inject = {}));
/**
* Plugin registry installed as `ctx.registry` and mixed into every context.
*
* It normalizes plugin shapes, tracks plugin runtimes, starts fibers, and
* exposes map-like inspection over active plugin callbacks.
*/
var RegistryService = class {
	ctx;
	_counter = 0;
	_internal = /* @__PURE__ */ new Map();
	constructor(ctx) {
		this.ctx = ctx;
		defineProperty(this, symbols.tracker, {
			property: "ctx",
			noShadow: true
		});
	}
	/** Allocate the next fiber uid (increments on every read). */
	get counter() {
		return ++this._counter;
	}
	/** Number of registered plugin runtimes. */
	get size() {
		return this._internal.size;
	}
	/**
	* Resolve a supported plugin shape to its executable callback.
	*
	* @param plugin — a function, class, or `{ apply }` object plugin.
	* @returns the callback identifying the plugin, or `undefined` if invalid.
	*/
	resolve(plugin) {
		try {
			if (typeof plugin === "function") return plugin;
			if (isApplicable(plugin)) return plugin.apply;
		} catch {}
	}
	/**
	* Look up the runtime record for a plugin.
	*
	* @param plugin — any supported plugin shape.
	* @returns the runtime, or `undefined` when the plugin is not registered.
	*/
	get(plugin) {
		const key = this.resolve(plugin);
		return key && this._internal.get(key);
	}
	/**
	* Check whether a plugin has a registered runtime.
	*
	* @param plugin — any supported plugin shape.
	* @returns `true` when at least one fiber of the plugin exists.
	*/
	has(plugin) {
		const key = this.resolve(plugin);
		return !!key && this._internal.has(key);
	}
	/**
	* Dispose every running fiber for a plugin and remove its runtime record.
	*
	* @param plugin — any supported plugin shape.
	* @returns the removed runtime, or `undefined` when none was registered.
	*/
	delete(plugin) {
		const key = this.resolve(plugin);
		const runtime = key && this._internal.get(key);
		if (!runtime) return;
		this._internal.delete(key);
		for (const fiber of runtime.fibers) fiber.dispose();
		return runtime;
	}
	/** Iterate the registered plugin callbacks. */
	keys() {
		return this._internal.keys();
	}
	/** Iterate the registered plugin runtimes. */
	values() {
		return this._internal.values();
	}
	/** Iterate `[callback, runtime]` pairs. */
	entries() {
		return this._internal.entries();
	}
	/**
	* Visit every registered runtime.
	*
	* @param callback — receives each runtime and its identifying callback.
	*/
	forEach(callback) {
		return this._internal.forEach(callback);
	}
	/**
	* Start a callback once the requested dependencies are available.
	*
	* @param inject — required services, as an array or a name → config map.
	* @param callback — plugin body called with `(ctx, config)`.
	* @returns the fiber; awaiting it settles once loading finished.
	*/
	inject(inject$1, callback) {
		return this.plugin({
			inject: inject$1,
			apply: callback,
			name: callback.name
		});
	}
	/**
	* Start a plugin in the current context and return its fiber.
	*
	* Creates (or reuses) the plugin's runtime record, then starts a new fiber
	* under the current context. Throws if `plugin` is not a supported shape or
	* if the current fiber is already disposed.
	*
	* @param plugin — a function, class, or `{ apply }` object plugin.
	* @param config — the plugin config, validated against its `Config` schema.
	* @param getOuterStack — captures the caller stack for effect diagnostics.
	* @returns the fiber; awaiting it settles once loading finished.
	*/
	plugin(plugin, config, getOuterStack = buildOuterStack()) {
		const callback = this.resolve(plugin);
		if (!callback) throw new Error("invalid plugin, expect function or object with an \"apply\" method, received " + typeof plugin);
		this.ctx.fiber.assertActive();
		let runtime = this._internal.get(callback);
		if (!runtime) {
			let name$1 = plugin.name;
			if (name$1 === "apply") name$1 = void 0;
			runtime = {
				name: name$1,
				callback,
				fibers: new DisposableList(),
				Config: plugin.Config
			};
			this._internal.set(callback, runtime);
		}
		const fiber = new Fiber(this.ctx, config, Inject.resolve(plugin.inject), runtime, getOuterStack);
		const wrapped = Object.create(fiber);
		wrapped.then = (onFulfilled, onRejected) => {
			return fiber.await().then(onFulfilled, onRejected);
		};
		return wrapped;
	}
};
/**
* Root and child dependency containers for Cordis plugins.
*
* A context is a proxy: normal property reads go through the service resolver,
* while `extend()`, `isolate()`, and `intercept()` create scoped child
* contexts without mutating their parent.
*/
var Context = class Context$1 {
	/** Symbol key under which a disposer exposes its {@link EffectMeta} diagnostics tree. */
	static effect = symbols.effect;
	/** Symbol key for a context's listener filter, consulted on every event dispatch. */
	static filter = symbols.filter;
	/** Symbol key of the isolation map (see the `Context[symbols.isolate]` property). */
	static isolate = symbols.isolate;
	/** Symbol key of the intercept map (see the `Context[symbols.intercept]` property). */
	static intercept = symbols.intercept;
	/**
	* Returns true for Cordis context proxies and context prototypes.
	*
	* Works across realms and across multiple copies of cordis, because the
	* brand is keyed by a global symbol rather than by `instanceof`.
	*
	* @param value — the value to test.
	* @returns `true` if `value` is a Cordis context, narrowing its type.
	*/
	static is(value) {
		return !!value?.[Context$1.is];
	}
	static {
		Context$1.is[Symbol.toPrimitive] = () => Symbol.for("cordis.is");
		Context$1.prototype[Context$1.is] = true;
	}
	/** Create the root context and install the built-in services. */
	constructor() {
		this[symbols.isolate] = Object.create(null);
		this[symbols.intercept] = Object.create(null);
		const self = new Proxy(this, ReflectService.handler);
		this.root = self;
		this.baseUrl = void 0;
		this.fiber = new Fiber(self, {}, Object.create(null), null, () => []);
		this.reflect = new ReflectService(self);
		this.registry = new RegistryService(self);
		this.events = new EventsService(self);
		this.logger = new LoggerService(self);
		this.fiber._disposables.clear();
		return self;
	}
	[Symbol.for("nodejs.util.inspect.custom")]() {
		return `Context <${this.fiber.name}>`;
	}
	/**
	* Create a child context with extra metadata on top of the current scope.
	*
	* The child prototypally inherits every property of this context; own
	* properties of `meta` shadow the inherited ones. The parent is not mutated.
	*
	* @param meta — own properties (including symbol keys) to define on the child.
	* @returns a child context inheriting from this one.
	*/
	extend(meta = {}) {
		const shadow = Reflect.getOwnPropertyDescriptor(this, symbols.shadow)?.value;
		const self = Object.create(getTraceable(this, this));
		for (const prop of Reflect.ownKeys(meta)) Object.defineProperty(self, prop, Reflect.getOwnPropertyDescriptor(meta, prop));
		if (!shadow) return self;
		return Object.assign(Object.create(self), { [symbols.shadow]: shadow });
	}
	/**
	* Create a child context with an independent service scope for `name`.
	*
	* Below the returned context, reads and writes of the service `name`
	* resolve against the new label instead of the parent's, so a different
	* implementation can be provided without affecting the parent scope.
	* Passing the same `label` to two `isolate()` calls joins their scopes.
	*
	* @param name — the service name to isolate.
	* @param label — scope label to join; defaults to a fresh unique symbol.
	* @returns a child context whose `name` service resolves in the new scope.
	*/
	isolate(name$1, label) {
		const shadow = Object.create(this[symbols.isolate]);
		shadow[name$1] = label ?? Symbol(name$1);
		return this.extend({ [symbols.isolate]: shadow });
	}
	intercept(name$1, config) {
		const intercept = Object.create(this[symbols.intercept]);
		intercept[name$1] = config;
		return this.extend({ [symbols.intercept]: intercept });
	}
};
/**
* Base class for services that expose a named API on `ctx`.
*
* Subclasses call `super(ctx, name)` from their constructor. The service is
* registered immediately and is automatically removed with the owning fiber.
*/
var Service = class Service$1 {
	ctx;
	/** Symbol key of an instance method run after construction (class plugins). */
	static init = symbols.init;
	/** Symbol key of the availability predicate passed to `ctx.provide()`. */
	static check = symbols.check;
	/** Symbol key of the phantom intercept-config type parameter. */
	static config = symbols.config;
	/** Symbol key of the call body making a service callable (e.g. `ctx.logger()`). */
	static invoke = symbols.invoke;
	/** Symbol key of the helper deriving an extended service instance. */
	static extend = symbols.extend;
	/** Symbol key of the tracker metadata used for context tracing. */
	static tracker = symbols.tracker;
	/** Symbol key of the intercept-config resolution helper below. */
	static resolveConfig = symbols.resolveConfig;
	/** The service name this instance is registered under. */
	name;
	/**
	* Register this instance as `name` in the current context.
	*
	* Calls `ctx.reflect.provide(name, this, this[Service.check])`, so the
	* service is unregistered automatically when the owning fiber unloads.
	* Services with a `[Service.invoke]` body return a callable instance.
	*
	* @param ctx — the context to register in (stored as `this.ctx`).
	* @param name — the service name; defaults to the static `provide` field.
	*/
	constructor(ctx, name$1) {
		this.ctx = ctx;
		name$1 ??= this.constructor["provide"];
		let self = this;
		const tracker = {
			associate: name$1,
			property: "ctx"
		};
		if (self[symbols.invoke]) self = createCallable(name$1, joinPrototype(Object.getPrototypeOf(this), Function.prototype), tracker);
		self.ctx = ctx;
		self.name = name$1;
		defineProperty(self, symbols.tracker, tracker);
		self.ctx.reflect.provide(name$1, self, this[symbols.check]);
		return self;
	}
	[symbols.filter](ctx) {
		return ctx[symbols.isolate][this.name] === this.ctx[symbols.isolate][this.name];
	}
	[symbols.extend](props) {
		let self;
		if (this[Service$1.invoke]) self = createCallable(this.name, this, this[symbols.tracker]);
		else self = Object.create(this);
		return Object.assign(self, props);
	}
	/**
	* Merge intercept config from ancestors with optional base and head values.
	*
	* Entries added closer to the root apply first; `base` is prepended and
	* `head` appended. Uses `Config.merge` when the service declares one,
	* otherwise a shallow `Object.assign`.
	*
	* @param base — lowest-precedence config merged before all intercepts.
	* @param head — highest-precedence config merged after all intercepts.
	* @returns the merged config.
	*/
	[symbols.resolveConfig](base, head) {
		let intercept = this.ctx[Context.intercept];
		const configs = [];
		while (this.name in intercept) {
			if (Object.hasOwn(intercept, this.name)) configs.unshift(intercept[this.name]);
			intercept = Object.getPrototypeOf(intercept);
		}
		if (base) configs.unshift(base);
		if (head) configs.push(head);
		if (this["Config"]?.merge) return this["Config"].merge(...configs);
		else return Object.assign({}, ...configs);
	}
	static [Symbol.hasInstance](instance) {
		if (!instance) return false;
		let constructor = instance.constructor;
		while (constructor) {
			constructor = constructor.prototype?.constructor;
			if (constructor === this) return true;
			constructor &&= Object.getPrototypeOf(constructor);
		}
		return false;
	}
};

//#endregion
//#region node_modules/.pnpm/@deepseek-ai+dsh-settings@0.1.1-rc.2_@deepseek-ai+cordis@4.0.2_@deepseek-ai+dsh-brand@0_2dd31f709f91e7b96c62a2afe9d4c22c/node_modules/@deepseek-ai/dsh-settings/lib/index.js
/**
* Structural secret redaction for settings values. `role('secret')` fields are
* removed from a value before it crosses a wire boundary; a sidecar records
* each schema-declared secret position and whether it currently holds a value,
* so a configuration surface can render a write-only input without ever
* receiving the secret itself.
* @module @deepseek-ai/dsh-settings/redact
*/
/** Whether a value is a plain data object the walker may recurse into. */
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function walk(node, value, path, secrets) {
	if (node === void 0) return value;
	if (node.meta?.role === "secret") {
		secrets.push({
			path,
			set: value !== void 0
		});
		return;
	}
	switch (node.type) {
		case "object": {
			const properties = node.dict ?? {};
			const source = isRecord(value) ? value : void 0;
			const rebuilt = {};
			if (source !== void 0) for (const [key, entry] of Object.entries(source)) {
				if (key in properties) continue;
				rebuilt[key] = entry;
			}
			for (const [key, child] of Object.entries(properties)) {
				const stripped = walk(child, source?.[key], [...path, key], secrets);
				if (stripped !== void 0) rebuilt[key] = stripped;
			}
			return source === void 0 && Object.keys(rebuilt).length === 0 ? value : rebuilt;
		}
		case "dict": {
			if (!isRecord(value)) return value;
			const rebuilt = {};
			for (const [key, entry] of Object.entries(value)) {
				const stripped = walk(node.inner, entry, [...path, key], secrets);
				if (stripped !== void 0) rebuilt[key] = stripped;
			}
			return rebuilt;
		}
		case "array":
			if (!Array.isArray(value)) return value;
			return value.map((entry, index) => walk(node.inner, entry, [...path, String(index)], secrets));
		default: return value;
	}
}
/**
* Remove every `role('secret')` field a schema declares from a value. The
* walker follows `object`, `dict`, and `array` containers; a secret must be
* declared directly on a field reachable through those containers (a secret
* buried inside a union branch or transform is not reachable and must not be
* modeled that way). The input is never mutated.
* @param schema - live schemastery schema describing the value.
* @param value - the value to strip; `undefined` yields an empty record with
*   object-property secret slots still enumerated.
* @returns the stripped detached value and the ordered secret positions.
*/
function redactSecrets(schema, value) {
	const secrets = [];
	return {
		value: walk(schema, value, [], secrets),
		secrets
	};
}
/**
* Service Definition for the user-settings capability seam (`ctx.settings`). Providers store one raw document of
* per-namespace sections; plugins register a namespace schema and read the
* resolved value, which layers schema defaults, the registrant's composition
* `base`, and the user document section, in that order.
* @module @deepseek-ai/dsh-settings
*/
const NAMESPACE_PATTERN = /^[a-z][a-z0-9-]*$/;
/**
* Brand a raw string as a {@link SettingsNamespace}.
* @param value - candidate namespace; lowercase kebab-case, as in plugin short names.
* @returns the branded namespace.
*/
function settingsNamespace(value) {
	if (!NAMESPACE_PATTERN.test(value)) throw new TypeError(`settings namespace "${value}" must match ${String(NAMESPACE_PATTERN)}`);
	return value;
}
/**
* Deep equality over JSON-compatible data (objects, arrays, primitives) — the
* Service Definition's single change-detection predicate, exported so the invariant
* companion checks exactly the implementation's relation.
* @param a - one JSON-compatible value.
* @param b - the other JSON-compatible value.
* @returns whether the two values are structurally equal.
*/
function deepEqualJson(a, b) {
	if (a === b) return true;
	if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
	if (Array.isArray(a) || Array.isArray(b)) {
		if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
		return a.every((entry, index) => deepEqualJson(entry, b[index]));
	}
	const left = a;
	const right = b;
	const keys = Object.keys(left);
	if (keys.length !== Object.keys(right).length) return false;
	return keys.every((key) => key in right && deepEqualJson(left[key], right[key]));
}
/**
* A write refused because the namespace moved since the caller read it. The
* Service Definition's serialized write queue orders writes; it cannot tell a fresh writer
* from one holding a stale snapshot, which is what this reports.
*/
var SettingsConflictError = class extends Error {
	/** Stable machine code for wire layers mapping this to their own taxonomy. */
	code = "SETTINGS_CONFLICT";
	/** The revision the write expected. */
	expected;
	/** The revision the namespace actually stands at. */
	actual;
	/**
	* @param ns - the namespace whose write was refused.
	* @param expected - the revision the caller sent.
	* @param actual - the revision now stored.
	*/
	constructor(ns, expected, actual) {
		super(`settings namespace "${ns}" changed since it was read (expected revision ${String(expected)}, now ${String(actual)})`);
		this.name = "SettingsConflictError";
		this.expected = expected;
		this.actual = actual;
	}
};
/** Whether a value is a plain data object (not an array, null, or class instance). */
function isPlainObject(value) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
	const proto = Object.getPrototypeOf(value);
	return proto === Object.prototype || proto === null;
}
/** Apply one path op to a detached section, returning the next section. */
function applyPathOp(section, op) {
	const [head, ...rest] = op.path;
	if (head === void 0) {
		if (op.op === "unset") return {};
		if (!isPlainObject(op.value)) throw new TypeError("settings mutate: setting the section root requires a plain object");
		return { ...op.value };
	}
	if (rest.length === 0) {
		if (op.op === "set") return {
			...section,
			[head]: op.value
		};
		const { [head]: _removed,...kept } = section;
		return kept;
	}
	const child = section[head];
	if (!isPlainObject(child)) {
		if (op.op === "unset") return section;
		return {
			...section,
			[head]: applyPathOp({}, {
				...op,
				path: rest
			})
		};
	}
	return {
		...section,
		[head]: applyPathOp(child, {
			...op,
			path: rest
		})
	};
}
/** Human label for a value that lossless JSON cannot represent (numbers reject inline). */
function describeRejected(value) {
	if (value === void 0) return "undefined";
	if (typeof value === "object" && value !== null) {
		const name$1 = Object.getPrototypeOf(value)?.constructor?.name;
		return name$1 === void 0 || name$1 === "Object" ? "a non-plain object" : `a ${name$1}`;
	}
	return `a ${typeof value}`;
}
/**
* Detach and validate one write input in a single walk before persistence:
* only JSON data (plain objects, arrays, strings, finite numbers,
* booleans, `null`) may reach a provider document. `structuredClone` alone
* would admit Dates, Maps, BigInts, and cycles that YAML/JSON storage then
* silently distorts on the reload round-trip. `undefined` entries in objects
* are skipped — the same sparse-patch semantics as {@link mergeLayers} — while
* an `undefined` array entry is rejected rather than coerced.
* @param root - plain-object write input (caller-checked).
* @param reject - builds the validation error from a value label and its `$`-rooted path.
* @returns the detached JSON-compatible clone.
*/
function cloneJsonShaped(root, reject) {
	const visiting = /* @__PURE__ */ new WeakSet();
	const clone = (value, path) => {
		if (value === null || typeof value === "string" || typeof value === "boolean") return value;
		if (typeof value === "number") {
			if (!Number.isFinite(value)) throw reject("a non-finite number", path);
			return value;
		}
		if (Array.isArray(value)) {
			if (visiting.has(value)) throw reject("a circular reference", path);
			visiting.add(value);
			const entries = value.map((entry, index) => clone(entry, `${path}[${index}]`));
			visiting.delete(value);
			return entries;
		}
		if (isPlainObject(value)) {
			if (visiting.has(value)) throw reject("a circular reference", path);
			visiting.add(value);
			const out = {};
			for (const [key, entry] of Object.entries(value)) {
				if (entry === void 0) continue;
				out[key] = clone(entry, `${path}.${key}`);
			}
			visiting.delete(value);
			return out;
		}
		throw reject(describeRejected(value), path);
	};
	return clone(root, "$");
}
/**
* Layer `over` onto `under`: plain objects merge recursively, every other
* value (arrays included) replaces the lower layer wholesale. `over` never
* carries `undefined` entries — sections come from parsed documents and write
* snapshots pass {@link cloneJsonShaped}, which strips them so a sparse patch
* cannot erase lower keys.
*/
function mergeLayers(under, over) {
	if (over === void 0) return under;
	if (!isPlainObject(under) || !isPlainObject(over)) return over;
	const merged = { ...under };
	for (const [key, value] of Object.entries(over)) merged[key] = key in merged ? mergeLayers(merged[key], value) : value;
	return merged;
}
/** Recursively freeze one resolved value so handed-out snapshots stay immutable. */
function deepFreeze(value) {
	if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
	for (const entry of Object.values(value)) deepFreeze(entry);
	return Object.freeze(value);
}
/**
* Abstract settings service. Providers implement raw-document storage
* (`load`/`persist`) and push external changes through {@link Settings.publish};
* the base class owns namespace registration, resolution, validation, change
* detection, and the `settings/updated` commit event.
*/
var SettingsProvider = class extends Service {
	registrations = /* @__PURE__ */ new Map();
	/** Latest published raw document; empty until the provider's first publish. */
	document = {};
	/** Per-namespace write chains; settled tails, so a failure never poisons the queue. */
	writeQueues = /* @__PURE__ */ new Map();
	/** In-flight watcher invocation segments, drained by the dispose teardown. */
	pendingTails = /* @__PURE__ */ new Set();
	/** Set at service dispose: refuse new writes while queued ones drain. */
	stopped = false;
	/** Opaque read of {@link stopped}: control flow cannot narrow it across awaits. */
	isStopped() {
		return this.stopped;
	}
	constructor(ctx) {
		super(ctx, "settings");
	}
	/**
	* Load the provider's document once and publish it before the service
	* becomes injectable, and register the write-drain teardown. Providers with
	* their own init (watchers, connections) delegate here first via
	* `yield* super[Service.init]()`; their disposers then run before the drain.
	*/
	async *[Service.init]() {
		yield async () => {
			this.stopped = true;
			await Promise.allSettled([...this.writeQueues.values(), ...this.pendingTails]);
		};
		this.publish(await this.load());
	}
	/**
	* Absolute path of the provider's user-editable document, when its storage
	* is one local file. Configuration surfaces use this only as availability
	* metadata; the guarded open operation resolves the path again Host-side.
	* Non-file providers leave it undefined and expose no open-document affordance.
	* @returns the absolute local document path, or undefined for non-file storage.
	*/
	get documentPath() {}
	/**
	* Prepare the provider's user-editable document for a native editor. File
	* providers may materialize an absent document before returning its path;
	* non-file providers return undefined.
	* @returns the absolute local document path, or undefined for non-file storage.
	*/
	prepareDocument() {
		return Promise.resolve(this.documentPath);
	}
	/**
	* Register a namespace schema and receive its owner scope. The registration
	* is an effect on the calling plugin's fiber: disposing that fiber removes
	* the namespace and its observers. An invalid stored section fails the
	* registration itself — the earliest point where the schema can judge it.
	* @param ns - unique namespace; duplicate registration fails loud.
	* @param schema - schemastery schema resolving this namespace's value.
	* @param options - composition `base` layer and effect timing.
	* @returns the owner scope for reads, observation, and updates.
	*/
	register(ns, schema, options) {
		if (this.registrations.has(ns)) throw new Error(`settings namespace "${ns}" is already registered`);
		const registration = {
			ns,
			schema,
			base: options?.base,
			applies: options?.applies ?? "live",
			...options?.validate === void 0 ? {} : { validate: options.validate },
			resolved: deepFreeze(this.resolve(schema, options?.base, this.section(ns), options?.validate)),
			revision: 0,
			watchers: /* @__PURE__ */ new Set()
		};
		this.ctx.effect(() => {
			this.registrations.set(ns, registration);
			return () => this.registrations.delete(ns);
		}, `settings.register(${JSON.stringify(String(ns))})`);
		return {
			get: () => registration.resolved,
			watch: (callback) => {
				const watcher = {
					callback,
					tail: Promise.resolve(),
					active: true
				};
				registration.watchers.add(watcher);
				return () => {
					watcher.active = false;
					registration.watchers.delete(watcher);
				};
			},
			update: (patch) => this.update(ns, patch),
			replace: (section) => this.replace(ns, section)
		};
	}
	/**
	* Describe every registered namespace for configuration surfaces, including
	* the composition `base` and raw user layers so a form can mark which fields
	* the user overrode (presence in `user`) and what a reset returns to.
	* @param options - redaction switch; wire surfaces must redact.
	* @returns one descriptor per registered namespace, in registration order.
	*/
	describe(options) {
		return [...this.registrations.values()].map((registration) => {
			let user;
			try {
				user = this.section(registration.ns);
			} catch {
				user = void 0;
			}
			const base = registration.base === void 0 ? void 0 : structuredClone(registration.base);
			const detachedUser = user === void 0 ? void 0 : structuredClone(user);
			const descriptor = {
				ns: registration.ns,
				schema: registration.schema.toJSON(),
				value: registration.resolved,
				revision: registration.revision,
				...base === void 0 ? {} : { base },
				...detachedUser === void 0 ? {} : { user: detachedUser },
				applies: registration.applies
			};
			if (options?.redactSecrets !== true) return descriptor;
			const schema = registration.schema;
			const redacted = redactSecrets(schema, registration.resolved);
			return {
				...descriptor,
				value: redacted.value,
				...base === void 0 ? {} : { base: redactSecrets(schema, base).value },
				...detachedUser === void 0 ? {} : { user: redactSecrets(schema, detachedUser).value },
				secrets: redacted.secrets
			};
		});
	}
	/**
	* Read one registered namespace's resolved value.
	* @param ns - the namespace to read.
	* @returns the resolved value, or `undefined` while unregistered.
	*/
	get(ns) {
		return this.registrations.get(ns)?.resolved;
	}
	/**
	* Merge a patch into one registered namespace's user layer, validate the
	* resolved candidate, persist through the provider, then commit and emit.
	* A validation failure rejects before anything is persisted. Writes to one
	* namespace are serialized: concurrent updates apply in call order, each
	* merging over the previous write's committed section.
	* @param ns - the registered namespace to update.
	* @param patch - plain-object patch over the user section.
	* @param expectedRevision - the descriptor `revision` the caller read; a
	*   namespace that moved past it rejects with {@link SettingsConflictError}.
	*/
	async update(ns, patch, expectedRevision) {
		return this.write(ns, patch, "merge", expectedRevision);
	}
	/**
	* Replace one registered namespace's user section wholesale, validate,
	* persist, then commit and emit. Keys absent from `section` fall back to the
	* composition `base` and schema defaults — this is the removal/reset path a
	* merge-only patch cannot express (`replace({})` re-inherits everything).
	* @param ns - the registered namespace to replace.
	* @param section - the complete next user section.
	* @param expectedRevision - the descriptor `revision` the caller read; a
	*   namespace that moved past it rejects with {@link SettingsConflictError}.
	*/
	async replace(ns, section, expectedRevision) {
		return this.write(ns, section, "replace", expectedRevision);
	}
	/**
	* Apply path-addressed edits to one registered namespace's user section,
	* validate, persist, then commit and emit. The ops are applied to the
	* section as it stands when the write reaches the front of the queue, so a
	* caller never has to restate fields it did not touch — and, crucially,
	* cannot delete fields it never saw. This is the write path for any caller
	* holding a redacted view; `replace` remains the wholesale reset.
	* @param ns - the registered namespace to edit.
	* @param ops - ordered path edits; later ops observe earlier ones.
	* @param expectedRevision - the descriptor `revision` the caller read; a
	*   namespace that moved past it rejects with {@link SettingsConflictError}.
	*/
	async mutate(ns, ops, expectedRevision) {
		if (!Array.isArray(ops)) throw new TypeError(`settings mutate for "${ns}" must be an array of path ops`);
		for (const op of ops) {
			if (!isPlainObject(op) || op["op"] !== "set" && op["op"] !== "unset") throw new TypeError(`settings mutate for "${ns}" ops must be {op:'set'|'unset', path}`);
			if (!Array.isArray(op["path"]) || op["path"].some((part) => typeof part !== "string")) throw new TypeError(`settings mutate for "${ns}" op paths must be arrays of strings`);
		}
		return this.write(ns, ops, "mutate", expectedRevision);
	}
	/** Validate a write, then queue it on the namespace's serialized write chain. */
	write(ns, input, mode, expectedRevision) {
		const verb = mode === "merge" ? "update" : mode === "replace" ? "replace" : "mutate";
		const registration = this.registrations.get(ns);
		if (registration === void 0) throw new Error(`settings namespace "${ns}" is not registered`);
		if (this.isStopped()) throw new Error(`settings service is disposed: "${ns}" cannot be written`);
		if (!this.writable) throw new Error(`settings provider is read-only: "${ns}" cannot be updated in-process`);
		let payload;
		if (mode === "mutate") payload = { ops: input };
		else {
			if (!isPlainObject(input)) throw new TypeError(`settings ${verb} for "${ns}" must be a plain object`);
			payload = input;
		}
		const snapshot = cloneJsonShaped(payload, (label, path) => /* @__PURE__ */ new TypeError(`settings ${verb} for "${ns}" must contain only JSON-compatible data (found ${label} at ${path})`));
		const run = (this.writeQueues.get(ns) ?? Promise.resolve()).catch(() => void 0).then(async () => {
			if (this.isStopped()) throw new Error(`settings service was disposed before the queued "${ns}" ${verb} ran`);
			if (this.registrations.get(ns) !== registration) throw new Error(`settings namespace "${ns}" registration was disposed before the queued ${verb} ran`);
			const current = this.section(ns) ?? {};
			if (expectedRevision !== void 0 && expectedRevision !== registration.revision) throw new SettingsConflictError(ns, expectedRevision, registration.revision);
			const section = mode === "merge" ? mergeLayers(current, snapshot) : mode === "replace" ? snapshot : snapshot["ops"].reduce(applyPathOp, current);
			const next = deepFreeze(this.resolve(registration.schema, registration.base, section, registration.validate));
			await this.persist(ns, section);
			this.document[ns] = section;
			if (this.registrations.get(ns) === registration && !this.isStopped()) {
				this.bumpRevision(registration, current, section);
				this.commit(registration, next, "update");
			}
		});
		this.writeQueues.set(ns, run);
		return run;
	}
	/**
	* Provider hook: commit a complete raw document observed in storage. Each
	* registered namespace re-resolves; an invalid section keeps that
	* namespace's last good value and warns, other namespaces still commit.
	* @param doc - the detached raw document (unregistered sections preserved).
	* @param source - change origin; defaults to `provider`.
	*/
	publish(doc, source = "provider") {
		const before = /* @__PURE__ */ new Map();
		for (const registration of this.registrations.values()) try {
			before.set(registration.ns, this.section(registration.ns));
		} catch {
			before.set(registration.ns, void 0);
		}
		this.document = doc;
		for (const registration of this.registrations.values()) {
			let next;
			try {
				next = deepFreeze(this.resolve(registration.schema, registration.base, this.section(registration.ns), registration.validate));
			} catch (error) {
				this.ctx.logger.warn("settings: keeping last good \"%s\" after invalid stored section", registration.ns);
				this.ctx.logger.warn(error);
				continue;
			}
			this.bumpRevision(registration, before.get(registration.ns), this.section(registration.ns));
			this.commit(registration, next, source);
		}
	}
	/** Read one namespace's raw user section, rejecting non-object sections. */
	section(ns) {
		const section = this.document[ns];
		if (section === void 0) return void 0;
		if (!isPlainObject(section)) throw new TypeError(`settings section "${ns}" must be an object of keys`);
		return section;
	}
	/** Resolve one namespace value: schema defaults, then `base`, then the user layer. */
	resolve(schema, base, section, validate) {
		const value = schema(mergeLayers(base, section));
		validate?.(value);
		return value;
	}
	/**
	* Advance a namespace's revision when its RAW section changed, and announce
	* it. Deliberately independent of {@link commit}'s resolved-value equality:
	* storing an override equal to the composition base leaves the resolved
	* value alone but changes what the document says, which is exactly what a
	* configuration surface must re-read.
	*/
	bumpRevision(registration, before, after) {
		if (deepEqualJson(before, after)) return;
		registration.revision += 1;
		this.emitDocumentUpdated(registration.ns, registration.revision);
	}
	/** Contained fan-out of `settings/document-updated`, mirroring {@link commit}'s. */
	emitDocumentUpdated(ns, revision) {
		let invariantFailure;
		const args = [
			"settings/document-updated",
			ns,
			revision
		];
		for (const listener of this.ctx.events.dispatch("emit", args)) try {
			const returned = listener(ns, revision);
			if (returned != null && typeof returned.then === "function") Promise.resolve(returned).then(void 0, (error) => {
				this.warnListenerFailure(ns, error);
			});
		} catch (error) {
			if (error?.code === "INVARIANT") {
				invariantFailure ??= error;
				continue;
			}
			this.warnListenerFailure(ns, error);
		}
		if (invariantFailure !== void 0) throw invariantFailure;
	}
	/** Commit a resolved value when changed: swap, notify watchers, emit the event. */
	commit(registration, next, source) {
		const prev = registration.resolved;
		if (deepEqualJson(next, prev)) return;
		registration.resolved = next;
		for (const watcher of [...registration.watchers]) {
			const segment = watcher.tail.then(() => {
				if (!watcher.active || this.isStopped()) return;
				return watcher.callback(next, prev);
			}).then(() => void 0, (error) => {
				this.warnWatcherFailure(registration.ns, error);
			});
			watcher.tail = segment;
			this.pendingTails.add(segment);
			segment.then(() => this.pendingTails.delete(segment));
		}
		let invariantFailure;
		const args = [
			"settings/updated",
			registration.ns,
			next,
			prev,
			source
		];
		for (const listener of this.ctx.events.dispatch("emit", args)) try {
			const returned = listener(registration.ns, next, prev, source);
			if (returned != null && typeof returned.then === "function") Promise.resolve(returned).then(void 0, (error) => {
				this.warnListenerFailure(registration.ns, error);
			});
		} catch (error) {
			if (error?.code === "INVARIANT") {
				invariantFailure ??= error;
				continue;
			}
			this.warnListenerFailure(registration.ns, error);
		}
		if (invariantFailure !== void 0) throw invariantFailure;
	}
	/** Contained-watcher diagnostic shared by the sync and async failure paths. */
	warnWatcherFailure(ns, error) {
		this.ctx.logger.warn("settings: watcher for \"%s\" failed", ns);
		this.ctx.logger.warn(error);
	}
	/** Contained-listener diagnostic shared by the sync and async failure paths. */
	warnListenerFailure(ns, error) {
		this.ctx.logger.warn("settings: a settings/updated listener for \"%s\" failed", ns);
		this.ctx.logger.warn(error);
	}
};

//#endregion
//#region src/index.ts
const TAVILY_HOST = "https://api.tavily.com";
const SERPER_HOST = "https://google.serper.dev";
const TAVILY_CHANNEL = "tavily";
const SERPER_CHANNEL = "serper";
const DEFAULT_TIMEOUT_MS = 3e4;
const TAVILY_ENABLED_REF = "TAVILY_SEARCH_ENABLED";
const TAVILY_KEY_REF = "TAVILY_API_KEY";
const TAVILY_BASE_URL_REF = "TAVILY_BASE_URL";
const SERPER_ENABLED_REF = "SERPER_SEARCH_ENABLED";
const SERPER_KEY_REF = "SERPER_API_KEY";
const SERPER_BASE_URL_REF = "SERPER_BASE_URL";
const DEFAULT_SERPER_REF = "WEB_SEARCH_DEFAULT_SERPER";
const Config = Schema.object({
	maxResults: Schema.number().min(1).max(20).step(1).default(5),
	searchTimeoutMs: Schema.number().min(1).step(1).default(DEFAULT_TIMEOUT_MS),
	tavilyEnabled: Schema.boolean().default(false),
	serperEnabled: Schema.boolean().default(false),
	tavilyBaseURL: Schema.string().default(""),
	serperBaseURL: Schema.string().default(""),
	defaultChannel: Schema.string().default(TAVILY_CHANNEL)
});
var WebError = class extends Error {
	code;
	cause;
	constructor(message, code, opts) {
		super(message);
		this.name = "WebError";
		this.code = code;
		this.cause = opts?.cause;
	}
};
function throwIfAborted(signal) {
	if (signal?.aborted) throw new WebError("Web search aborted", "WEB_ABORTED", { cause: signal.reason });
}
function truthy(v) {
	if (v == null) return false;
	if (typeof v === "boolean") return v;
	if (typeof v === "string") return v.length > 0 && v !== "false" && v !== "0";
	return true;
}
/** 读取 credential ref 的值 */
async function resolveRef(ctx, ref) {
	try {
		const creds = ctx.get("credentials");
		if (!creds) return void 0;
		return (await creds.resolve(ref))?.value;
	} catch {
		return;
	}
}
/** 解析 baseURL：credential ref (legacy) > Config > 默认 host */
async function resolveBaseURL(ctx, config, credRef, configKey, defaultHost) {
	const credVal = await resolveRef(ctx, credRef);
	if (credVal && credVal.trim().length > 0) return credVal.trim();
	const cfgVal = config[configKey];
	if (typeof cfgVal === "string" && cfgVal.trim().length > 0) return cfgVal.trim();
	return defaultHost;
}
async function resolveChannel(ctx, config) {
	const [tavilyOnCred, serperOnCred, defaultSerper] = await Promise.all([
		resolveRef(ctx, TAVILY_ENABLED_REF),
		resolveRef(ctx, SERPER_ENABLED_REF),
		resolveRef(ctx, DEFAULT_SERPER_REF)
	]);
	const tavilyOn = truthy(tavilyOnCred) || config.tavilyEnabled === true;
	const serperOn = truthy(serperOnCred) || config.serperEnabled === true;
	const preferred = truthy(defaultSerper) ? SERPER_CHANNEL : config.defaultChannel === SERPER_CHANNEL ? SERPER_CHANNEL : TAVILY_CHANNEL;
	const enabled = {
		[TAVILY_CHANNEL]: tavilyOn,
		[SERPER_CHANNEL]: serperOn
	};
	if (enabled[preferred]) return preferred;
	if (enabled[TAVILY_CHANNEL]) return TAVILY_CHANNEL;
	if (enabled[SERPER_CHANNEL]) return SERPER_CHANNEL;
	return null;
}
function tavilyToSources(data) {
	const results = data.results;
	if (!Array.isArray(results)) return [];
	return results.filter((r) => !!r && typeof r === "object").map((r) => ({
		title: typeof r.title === "string" ? r.title : "",
		url: typeof r.url === "string" ? r.url : "",
		content: typeof r.content === "string" ? r.content : ""
	}));
}
async function searchTavily(baseURL, key, request, maxResults, timeoutMs, signal) {
	const body = {
		query: request.query,
		max_results: maxResults,
		search_depth: "basic",
		include_answer: false
	};
	if (key) body.api_key = key;
	const controller = new AbortController();
	const linked = AbortSignal.any?.([signal, controller.signal].filter(Boolean)) ?? controller.signal;
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const res = await fetch(new URL("/search", baseURL).toString(), {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
			signal: linked
		});
		if (!res.ok) {
			const text = await res.text().catch(() => "");
			throw new WebError(`Tavily HTTP ${res.status}: ${text.slice(0, 200)}`, "provider_error");
		}
		return tavilyToSources(await res.json());
	} finally {
		clearTimeout(timer);
	}
}
function serperToSources(data) {
	const organic = data.organic;
	if (!Array.isArray(organic)) return [];
	return organic.filter((r) => !!r && typeof r === "object").map((r) => ({
		title: typeof r.title === "string" ? r.title : "",
		url: typeof r.link === "string" ? r.link : "",
		content: typeof r.snippet === "string" ? r.snippet : ""
	}));
}
async function searchSerper(baseURL, key, request, maxResults, timeoutMs, signal) {
	const body = {
		q: request.query,
		num: maxResults
	};
	const controller = new AbortController();
	const linked = AbortSignal.any?.([signal, controller.signal].filter(Boolean)) ?? controller.signal;
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const url = baseURL.endsWith("/search") ? baseURL : new URL("/search", baseURL).toString();
		const res = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...key ? { "X-API-KEY": key } : {}
			},
			body: JSON.stringify(body),
			signal: linked
		});
		if (!res.ok) {
			const text = await res.text().catch(() => "");
			throw new WebError(`Serper HTTP ${res.status}: ${text.slice(0, 200)}`, "provider_error");
		}
		return serperToSources(await res.json());
	} finally {
		clearTimeout(timer);
	}
}
async function getDeepSeekProvider(ctx) {
	try {
		const providers = ctx.get("webSearchProviders");
		if (!providers) return void 0;
		return Object.values(providers).find((p) => p.id !== "web-search" && p.id !== "web-search-tavily");
	} catch {
		return;
	}
}
function sendJson(res, status, body) {
	const r = res;
	r.status(status);
	r.json(body);
}
function createProbeHandler(ctx, config, channel) {
	return async (req, res) => {
		const r = req;
		if (r.method === "OPTIONS") return sendJson(res, 204, null);
		if (r.method !== "POST") return sendJson(res, 405, {
			ok: false,
			code: "method"
		});
		try {
			const keyRef = channel === TAVILY_CHANNEL ? TAVILY_KEY_REF : SERPER_KEY_REF;
			const baseRef = channel === TAVILY_CHANNEL ? TAVILY_BASE_URL_REF : SERPER_BASE_URL_REF;
			const host = channel === TAVILY_CHANNEL ? TAVILY_HOST : SERPER_HOST;
			const configKey = channel === TAVILY_CHANNEL ? "tavilyBaseURL" : "serperBaseURL";
			const [key, baseURL] = await Promise.all([resolveRef(ctx, keyRef), resolveBaseURL(ctx, config, baseRef, configKey, host)]);
			await (channel === TAVILY_CHANNEL ? searchTavily : searchSerper)(baseURL, key, { query: "test" }, 1, 1e4, AbortSignal.timeout(1e4));
			return sendJson(res, 200, { ok: true });
		} catch (err) {
			if (err instanceof WebError) {
				if (err.code === "WEB_ABORTED") return sendJson(res, 200, {
					ok: false,
					code: "timeout"
				});
				return sendJson(res, 200, {
					ok: false,
					code: err.code,
					status: void 0,
					error: err.message
				});
			}
			return sendJson(res, 200, {
				ok: false,
				code: "network",
				error: String(err)
			});
		}
	};
}
const name = "dsh-web-search";
const inject = [
	"webServer",
	"credentials",
	"settings"
];
/** Settings 命名空间 */
const WEB_SEARCH_NS = settingsNamespace("web-search");
function apply(ctx, config) {
	ctx.settings.register(WEB_SEARCH_NS, Config, { applies: "live" });
	(async () => {
		for (const [credRef, cfgKey] of [
			[TAVILY_ENABLED_REF, "tavilyEnabled"],
			[SERPER_ENABLED_REF, "serperEnabled"],
			[TAVILY_BASE_URL_REF, "tavilyBaseURL"],
			[SERPER_BASE_URL_REF, "serperBaseURL"]
		]) try {
			const credVal = await resolveRef(ctx, credRef);
			if (credVal != null && String(credVal).length > 0 && !config[cfgKey]) {
				const v = cfgKey.endsWith("Enabled") ? truthy(credVal) : String(credVal);
				ctx.settings.set("web-search", cfgKey, v);
				config[cfgKey] = v;
			}
		} catch {}
		try {
			if (truthy(await resolveRef(ctx, DEFAULT_SERPER_REF)) && config.defaultChannel !== SERPER_CHANNEL) {
				ctx.settings.set("web-search", "defaultChannel", SERPER_CHANNEL);
				config.defaultChannel = SERPER_CHANNEL;
			}
		} catch {}
	})();
	const provider = {
		id: "web-search",
		available: () => true,
		search: async (request, signal) => {
			throwIfAborted(signal);
			const channel = await resolveChannel(ctx, config);
			const { maxResults, searchTimeoutMs } = config;
			if (channel) {
				const keyRef = channel === TAVILY_CHANNEL ? TAVILY_KEY_REF : SERPER_KEY_REF;
				const baseRef = channel === TAVILY_CHANNEL ? TAVILY_BASE_URL_REF : SERPER_BASE_URL_REF;
				const host = channel === TAVILY_CHANNEL ? TAVILY_HOST : SERPER_HOST;
				const cfgKey = channel === TAVILY_CHANNEL ? "tavilyBaseURL" : "serperBaseURL";
				const [key, baseURL] = await Promise.all([resolveRef(ctx, keyRef), resolveBaseURL(ctx, config, baseRef, cfgKey, host)]);
				return { sources: await (channel === TAVILY_CHANNEL ? searchTavily : searchSerper)(baseURL, key, request, maxResults, searchTimeoutMs, signal) };
			}
			const deepseek = await getDeepSeekProvider(ctx);
			if (deepseek) return deepseek.search(request, signal);
			throw new WebError("No web search channel available", "WEB_UNAVAILABLE");
		}
	};
	const providers = ctx.get("webSearchProviders");
	if (providers) providers["web-search"] = provider;
	const ws = ctx.get("webServer");
	if (ws) {
		ws.register({
			kind: "exact",
			path: "/api/web-search-probe/tavily",
			handler: createProbeHandler(ctx, config, TAVILY_CHANNEL)
		});
		ws.register({
			kind: "exact",
			path: "/api/web-search-probe/serper",
			handler: createProbeHandler(ctx, config, SERPER_CHANNEL)
		});
		ws.register({
			kind: "exact",
			path: "/api/web-search-config",
			handler: async (req, res) => {
				if (req.method !== "GET") return sendJson(res, 405, {});
				try {
					const [travilyURL, serperURL, travilyOn, serperOn, defSerper] = await Promise.all([
						resolveBaseURL(ctx, config, TAVILY_BASE_URL_REF, "tavilyBaseURL", TAVILY_HOST),
						resolveBaseURL(ctx, config, SERPER_BASE_URL_REF, "serperBaseURL", SERPER_HOST),
						resolveRef(ctx, TAVILY_ENABLED_REF),
						resolveRef(ctx, SERPER_ENABLED_REF),
						resolveRef(ctx, DEFAULT_SERPER_REF)
					]);
					return sendJson(res, 200, {
						tavilyEnabled: truthy(travilyOn) || config.tavilyEnabled === true,
						serperEnabled: truthy(serperOn) || config.serperEnabled === true,
						tavilyBaseURL: travilyURL === TAVILY_HOST ? "" : travilyURL,
						serperBaseURL: serperURL === SERPER_HOST ? "" : serperURL,
						defaultChannel: truthy(defSerper) ? SERPER_CHANNEL : config.defaultChannel || TAVILY_CHANNEL
					});
				} catch {
					return sendJson(res, 200, {
						tavilyEnabled: false,
						serperEnabled: false,
						tavilyBaseURL: "",
						serperBaseURL: "",
						defaultChannel: TAVILY_CHANNEL
					});
				}
			}
		});
	}
}

//#endregion
export { Config, apply, inject, name };