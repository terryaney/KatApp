class Components {
	public static initializeCoreComponents(application: KatApp, getTemplateId: (name: string) => string | undefined): void {
		// Not sure I need this, idea was to be able to inject a reference to application/modalAppOptions so I could use it...but can't think of when I'd need
		// application.state.components["kaScope"] = ((scope?) => new KaScopeComponent(scope).getScope(application)) as (scope: IStringAnyIndexer[]) => IStringAnyIndexer;

		application.state.components["template"] = ((props) => new TemplateComponent(props).getScope(application, getTemplateId)) as (props: { name: string, source?: IStringAnyIndexer | Array<IStringIndexer<string>> }) => IStringAnyIndexer;
		application.state.components["input"] = ((props) => new InputComponent(props).getScope(application, getTemplateId)) as (props: IKaInputOptions) => IStringAnyIndexer;
		application.state.components["inputGroup"] = ((props) => new TemplateMultipleInputComponent(props).getScope(application, getTemplateId)) as (props: IKaInputGroupOptions) => IStringAnyIndexer;		
	}
}

class InputComponent {
	constructor(private props: IKaInputOptions) {
	}

	/*
	public static unmounted(application: KatApp, input: HTMLInputElement) {
		// If want to clear input values, probably need to bind a custom handler to whatever triggers unmounting and clear inputs
		throw new Error("Currently not used because if you hide an input and I remove the value in state inputs, then re-render input it cannot restore previous value.");
		const name = input.getAttribute("name");
		if (name != undefined) {
			delete application.state.inputs[name];
		}
	}
	*/

	// My impl of Vue's cacheStringFunction
	private static stringCache: Record<string, string> = Object.create(null);

	private static cacheStringFunction = <T extends (str: string) => string>(fn: T): T => {
		return ((str: string) => {
			const hit = this.stringCache[str]
			return hit || (this.stringCache[str] = fn(str))
		}) as any;
	}

	public static mounted(application: KatApp, name: string, input: HTMLInputElement, defaultValue: (name: string ) => string | undefined, noCalc: (name: string) => boolean, events: undefined | IStringIndexer<((e: Event, application: KatApp) => void)> ) {
		input.setAttribute("name", name);
		input.classList.add(name);

		const type = input.getAttribute("type");

		// If just attaching v-ka-input to 'raw' input that already has markup values, grab the values to assign during mount
		const radioValue = type == "radio" && input.hasAttribute("checked") ? input.getAttribute("value") : undefined;
		const checkValue = type == "checkbox" ? (input.hasAttribute("checked") ? "1" : "0" ) : undefined;
		const textValue = type == "text" ? input.getAttribute("value") : undefined;

		let value = defaultValue(name) ?? checkValue ?? radioValue ?? textValue;
		if (application.state.inputs[name] == undefined && value != undefined) {
			application.state.inputs[name] = value;
		}

		value = application.state.inputs[name];
		if (value != undefined) {
			// If just attaching v-ka-input to a raw input, they might not be using :value="value", so when mounted, just assign it...
			application.setInputValue(name, value);
		}

		const inputEventAsync = async ( calculate: boolean ) => {
			if (!noCalc(name)) {
				// Don't trigger calc if rbl-nocalc/rbl-exclude class as well
				if (
					["rbl-nocalc", "rbl-exclude"].filter(c => input.classList.contains(c)).length == 0 &&
					application.closest(input, ".rbl-nocalc").length == 0 &&
					application.closest(input, ".rbl-exclude").length == 0
				) {

					if (calculate) {
						application.state.inputs.iInputTrigger = name;
						await application.calculateAsync();
					}
					else {
						application.state.needsCalculation = true;
					}
				}
			}
		}

		input.addEventListener("change", async () => {
			return await inputEventAsync(true);
		});

		if (type != "checkbox" && input.tagName != "SELECT") {
			// input event fires when the value of an <input>, <select>, or <textarea> element has been changed (keypress or mouse).
			input.addEventListener("input", async () => {
				application.state.inputs[name] = application.getInputValue(name);
				return await inputEventAsync(false);
			});
			input.addEventListener("blur", () => {
				// In case they typed in input but ended up at same value, 'change' will not trigger, so need to clear this
				if (!application.isCalculating) {
					application.state.needsCalculation = false;
				}
			});
		}

		if (events != undefined) {
			// Would love to use VUE's v-on code as base, but no access, so I have to duplicate bunch here.
			// Cant' just put @ event handlers into templates b/c someone might call them without handlers attached.  Also,
			// if you assigned the events to inline code, you don't have access to 'application'

			/*
			** Doesn't work, application not defined (although I do pass in second param of application so could use it there) **
			<div v-ka-input="{name:'iFirst', events: { 'input': async () => await application.calculateAsync() } }"></div>

			** Below works **
			application.update( {
				handlers: {
					firstNameClick: async e => {
						await application.calculateAsync();
					}
				}
			})
			<div v-ka-input="{name:'iFirst', events: { 'input': handlers.firstNameClick } }"></div> <-- Doesn't work b/c application not defined
			*/

			// So think following is best compromise
			for (const propertyName in events) {
				let arg = propertyName.split(".")[0];
				const modifiers = this.getModifiers(propertyName);

				if (modifiers) {
					const systemModifiers = ['ctrl', 'shift', 'alt', 'meta'];

					type KeyedEvent = KeyboardEvent | MouseEvent | TouchEvent

					const modifierGuards: Record<string, (e: Event, modifiers: Record<string, true>) => void | boolean> = {
						stop: (e) => e.stopPropagation(),
						prevent: (e) => e.preventDefault(),
						self: (e) => e.target !== e.currentTarget,
						ctrl: (e) => !(e as KeyedEvent).ctrlKey,
						shift: (e) => !(e as KeyedEvent).shiftKey,
						alt: (e) => !(e as KeyedEvent).altKey,
						meta: (e) => !(e as KeyedEvent).metaKey,
						left: (e) => 'button' in e && (e as MouseEvent).button !== 0,
						middle: (e) => 'button' in e && (e as MouseEvent).button !== 1,
						right: (e) => 'button' in e && (e as MouseEvent).button !== 2,
						exact: (e, modifiers) =>
							systemModifiers.some((m) => (e as any)[`${m}Key`] && !modifiers[m])
					};

					// map modifiers
					if (arg === 'click') {
						if (modifiers.right) arg = 'contextmenu'
						if (modifiers.middle) arg = 'mouseup'
					}

					const hyphenate = this.cacheStringFunction((str: string) => {
						const hyphenateRE = /\B([A-Z])/g;
						return str.replace(hyphenateRE, '-$1').toLowerCase();
					});

					input.addEventListener(
						arg,
						(e: Event) => {
							if ('key' in e && !(hyphenate((e as KeyboardEvent).key) in modifiers)) {
								return;
							}

							for (const key in modifiers) {
								const guard = modifierGuards[key];
								if (guard && guard(e, modifiers)) {
									return;
								}
							}

							return events[propertyName](e, application);
						},
						modifiers);
				}
				else {
					input.addEventListener(propertyName, (e: Event) => events[propertyName](e, application));
				}
			}
		}
	}

	private static getModifiers(property: string): IStringIndexer<true> | undefined {
		if (property.indexOf(".") == -1) return undefined;

		const modifiers: IStringIndexer<true> = {};
		const propParts = property.split(".");
		propParts.shift()

		for (const m in propParts) {
			modifiers[propParts[m]] = true;
		}

		return modifiers;
	}

	public getScope(application: KatApp, getTemplateId: (name: string) => string | undefined): IStringAnyIndexer {
		const props = this.props;
		const name = props.name;
		const calcEngine = props.ce;
		const tab = props.tab;
		let template = props.template;

		if (template != undefined) {
			template = getTemplateId(template);

			if (template == undefined) {
				return {};
			}
		}

		const base = {
			get display() { return application.state.rbl.value("rbl-display", name, undefined, undefined, calcEngine, tab) != "0"; },
			get noCalc() { return application.state.rbl.value("rbl-skip", name, undefined, undefined, calcEngine, tab) == "1"; },
			// Don't disable if uiBlocked (or maybe isCalculating) b/c changes focus of inputs...unless I store input and restore after calc?
			get disabled() { return /* application.state.uiBlocked || */ application.state.rbl.value("rbl-disabled", name, undefined, undefined, calcEngine, tab) == "1"; },
			get error() { return application.state.errors.find(v => v["@id"] == name)?.text; },
			get warning() { return application.state.warnings.find(v => v["@id"] == name)?.text; }
		};

		const defaultValue = (name: string) => application.state.inputs[name] ?? props.value;
		const noCalc = (name: string) => props.isNoCalc?.(base) ?? base.noCalc;
		
		return {
			$template: template,

			id: props.name + "_" + application.id,
			name: name,
			type: props.type ?? "text",

			// reactive...
			// input binding attempts in template:
			// 1. Using v-model="inputs[name]"
			//		- Problem 1: Started out setting the value to 'undefined'
			//		- To solve, I followed https://stackoverflow.com/questions/54874287/vue-v-model-undefined-or-default-fallback
			//			and implemented a :value="value" binding and @keypress="keypress" where the keypress set value of inputs[name].
			// 2. Using :value="value" @keypress="keypress" @change="change"
			//		- Problem 1: When I changed inputs[name] = value via js, it didn't trigger change event (however, text box value was updated)
			//		- Problem 2: When I changed the el.value = value via js, the state.inputs didn't update
			//		- To solve, I followed comment from post above (https://stackoverflow.com/a/54874989/166231) and made get/set value()
			//			and changed markup to have v-model="value" (no :value or @keypress)
			// 3. Using v-model="value" with get/set value()
			//		- Problem 1: When I changed the el.value = value via js, the state.inputs didn't update and change event wasn't triggered
			//		- To solve, I followed https://stackoverflow.com/a/56348565/166231 and had to emit my own events.  So I created a
			//			KatApp.setInput() method that assigned textbox, state.inputs, and (conditionally) dispatches a change event
			// 4. Went back to method #2 and KatApp.setInput() so that I could support 'range' inputs, b/c v-model currently issue with range support
			get value() { return application.state.inputs[name] ?? props.value ?? ""; },
			// v-model="value" support, but not using right now
			// set value(val: string) { application.state.inputs[name] = val; },
			base: base,
			get disabled() { return props.isDisabled?.(this.base) ?? this.base.disabled; },
			get display() { return props.isDisplay?.(this.base) ?? this.base.display; },
			get noCalc() { return noCalc( name ) },
			get label() { return application.state.rbl.value("rbl-value", "l" + name, undefined, undefined, calcEngine, tab) ?? props.label ?? ""; },
			get placeHolder() { return application.state.rbl.value("rbl-value", "ph" + name, undefined, undefined, calcEngine, tab) ?? props.placeHolder; },
			get help() {
				return {
					content: application.state.rbl.value("rbl-value", "h" + name, undefined, undefined, calcEngine, tab) ?? props.help?.content,
					title: application.state.rbl.value("rbl-value", "h" + name + "Title", undefined, undefined, calcEngine, tab) ?? props.help?.title ?? "",
					width: props?.help?.width ?? ""
				};
			},
			get css() {
				return {
					input: props?.css?.input ?? ""
				};
			},
			get error() { return this.base.error; },
			get warning() { return this.base.warning; },
			get list() {
				const table = application.state.rbl.value("rbl-listcontrol", name, "table", undefined, calcEngine, tab);
				return table != undefined ? application.state.rbl.source(table, calcEngine, tab) : [];
			},
			get hideLabel() { return props.hideLabel ?? false; },
			get prefix() { return props.prefix; },
			get suffix() { return props.suffix; },

			// unmounted: (input: HTMLInputElement) => InputComponent.unmounted( application, input ),
			mounted: (input: HTMLInputElement) => InputComponent.mounted( application, name, input, defaultValue, noCalc, props.events )
		};
	}
}

class TemplateMultipleInputComponent {
	constructor(private props: IKaInputGroupOptions) {
	}

	public getScope(application: KatApp, getTemplateId: (name: string) => string | undefined): IStringAnyIndexer {
		const templateId = getTemplateId(this.props.template);

		if (templateId == undefined) {
			return {};
		}

		const props = this.props;
		const names = props.names as string[];
		const values = props.values != undefined ? props.values as string[] : names.map(n => undefined);
		const labels = props.labels != undefined ? props.labels as string[] : names.map(n => undefined);
		const prefixes = props.prefixes != undefined ? props.prefixes as string[] : names.map(n => undefined);
		const suffixes = props.suffixes != undefined ? props.suffixes as string[] : names.map(n => undefined);
		const placeHolders = props.placeHolders != undefined ? props.placeHolders as string[] : names.map(n => '');		
		const helps = props.helps != undefined ? props.helps as IKaInputHelp[] : names.map(n => undefined);
		const css = props.css != undefined ? props.css as IKaInputCss[] : names.map(n => undefined);
		
		const calcEngine = props.ce;
		const tab = props.tab;

		const base = {
			display: function (index: number) { return application.state.rbl.value("rbl-display", names[index], undefined, undefined, calcEngine, tab) != "0"; },
			noCalc: function (index: number) { return application.state.rbl.value("rbl-skip", names[index], undefined, undefined, calcEngine, tab) == "1"; },
			// Don't disable if uiBlocked (or maybe isCalculating) b/c changes focus of inputs...unless I store input and restore after calc?
			disabled: function (index: number) { return /* application.state.uiBlocked || */ application.state.rbl.value("rbl-disabled", names[index], undefined, undefined, calcEngine, tab) == "1"; },
			error: function (index: number) { return application.state.errors.find(v => v["@id"] == names[index])?.text; },
			warning: function (index: number) { return application.state.warnings.find(v => v["@id"] == names[index])?.text; }
		};

		const noCalc = function (name: string) {
			const index = names.indexOf(name);
			return props.isNoCalc?.(base) ?? base.noCalc(index);
		}
		const defaultValue = function (name: string) {
			const index = names.indexOf(name);
			return application.state.inputs[names[index]] ?? values[index];
		}

		return {
			"$template": templateId,

			id: function (index: number) {
				return names[ index ] + "_" + application.id;
			},
			name: function (index: number) {
				return names[index];
			},
			type: props.type ?? "text",

			application: application,
			modalAppOptions: application.options.modalAppOptions,

			value: function (index: number) { return application.state.inputs[names[index]] ?? values[ index ] ?? ""; },
			// v-model="value" support, but not using right now
			// set value(val: string) { application.state.inputs[name] = val; },
			base: base,
			disabled: function (index: number) { return props.isDisabled?.(this.base) ?? this.base.disabled( index ); },
			display: function (index: number) { return props.isDisplay?.(this.base) ?? this.base.display(index); },
			noCalc: function (index: number) { return noCalc(names[index]); },
			label: function (index: number) { return application.state.rbl.value("rbl-value", "l" + names[index], undefined, undefined, calcEngine, tab) ?? labels[index] ?? ""; },
			placeHolder: function (index: number) { return application.state.rbl.value("rbl-value", "ph" + names[index], undefined, undefined, calcEngine, tab) ?? placeHolders[index]; },			
			help: function (index: number) {
				return {
					content: application.state.rbl.value("rbl-value", "h" + names[index], undefined, undefined, calcEngine, tab) ?? helps[index]?.content,
					title: application.state.rbl.value("rbl-value", "h" + names[index] + "Title", undefined, undefined, calcEngine, tab) ?? helps[index]?.title ?? "",
					width: helps[index]?.width || ""
				};
			},
			css: function (index: number ) {
				return {
					input: css[index]?.input ?? ""
				};
			},
			error: function (index: number) { return this.base.error(index); },
			warning: function (index: number) { return this.base.warning(index); },
			list: function (index: number) {
				const table = application.state.rbl.value("rbl-listcontrol", names[ index ], "table", undefined, calcEngine, tab);
				return table != undefined ? application.state.rbl.source(table, calcEngine, tab) : [];
			},
			get hideLabel() { return props.hideLabel ?? false; },
			prefix: function (index: number) { return prefixes[index]; },
			suffix: function (index: number) { return suffixes[index]; },

			// unmounted: (input: HTMLInputElement) => InputComponent.unmounted(application, input),
			mounted: (input: HTMLInputElement) => {
				const name = input.getAttribute("name");

				if (name == undefined) {
					throw new Error("You must assign a name attribute via :name=\"name(index)\".");
				}

				InputComponent.mounted(application, name, input, defaultValue, noCalc, props.events);
			}
		};
	}
}

class TemplateComponent {
	constructor(private props: { name: string, source?: IStringAnyIndexer | IStringIndexer<string>[] }) {
	}
	public getScope(application: KatApp, getTemplateId: (name: string) => string | undefined): IStringAnyIndexer | IStringIndexer<string>[] {
		if (this.props.name == undefined) {
			throw new Error("You must provide {name:'templateName'} when using v-ka-template.");
		}

		const templateId = getTemplateId(this.props.name);

		if (templateId == undefined) {
			return {};
		}

		const scope = this.props.source ?? {};

		if (scope instanceof Array) {
			return {
				"$template": templateId,
				application: application,
				modalAppOptions: application.options.modalAppOptions,
				rows: scope
			};
		}
		else {
			scope["$template"] = templateId;
			scope["application"] = application;
			scope["modalAppOptions"] = application.options.modalAppOptions;
			return scope;
		}
	}
}

/*
class KaScopeComponent {
	constructor(private scope?: IStringAnyIndexer | IStringIndexer<string>[]) {
	}
	public getScope(application: KatApp): IStringAnyIndexer | IStringIndexer<string>[] {
		const scope = this.scope ?? {};

		if (scope instanceof Array) {
			return {
				application: application,
				modalAppOptions: application.options.modalAppOptions,
				rows: scope
			};
		}
		else {
			scope["application"] = application;
			scope["modalAppOptions"] = application.options.modalAppOptions;
			return scope;
		}
	}
}
*/