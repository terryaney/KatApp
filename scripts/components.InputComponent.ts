/// <reference path="./components.InputComponentBase.ts" />

class InputComponent extends InputComponentBase {
	constructor(private props: IKaInputModel) {
		super();
	}

	public getScope(application: KatApp, getTemplateId: (name: string) => string | undefined): IKaInputScope | undefined {
		const props = this.props;

		const that = this;
		const name = props.name;
		const calcEngine = props.ce;
		const tab = props.tab;
		let template = props.template;

		if (template != undefined) {
			const uniqueTemplateId = getTemplateId(template);

			if (uniqueTemplateId == undefined) {
				console.log(`Unable to find template ${uniqueTemplateId}, ${JSON.stringify(props)}`);
				return undefined;
			}

			template = uniqueTemplateId;
		}

		const getInputCeValue = function(columnName: string, legacyTable?: string, legacyId?: string): string | undefined {
			return application.state.rbl.value("rbl-input", name, columnName, undefined, calcEngine, tab) ??
				( legacyTable != undefined && legacyId != undefined ? application.state.rbl.value(legacyTable, legacyId, undefined, undefined, calcEngine, tab) : undefined );
		};

		const inputType = getInputCeValue("type") ?? props.type ?? "text";

		const base: IKaInputScopeBase = {
			get display() { return getInputCeValue("display", "rbl-display", "v" + name) != "0"; },
			get noCalc() { return getInputCeValue( "skip-calc", "rbl-skip", name) == "1"; },
			get disabled() {
				// Don't disable if uiBlocked (or maybe isCalculating) b/c changes focus of inputs...unless I store input and restore after calc?
				return /* application.state.uiBlocked || */ getInputCeValue( "disabled", "rbl-disabled", name) == "1";
			},
			get error() { return that.errorText(application, name); },
			get warning() { return that.warningText(application, name); }
		};

		const mask = (name: string) => getInputCeValue("mask") ?? props.mask;
		const hasMask = mask(name) != undefined || typeof Object.getOwnPropertyDescriptor(props, 'mask')?.get === "function";

		const maxLength = (name: string) => {
			const v = getInputCeValue("max-length");
			return (v != undefined ? +v : undefined) ?? props.maxLength ?? 250;
		};

		const keypressRegex = (name: string) => getInputCeValue("keypress-regex") ?? props.keypressRegex;
		const defaultValue = (name: string) => application.state.inputs[name] as string ?? props.value;
		const label = (name: string) => application.getLocalizedString( getInputCeValue("label", "rbl-value", "l" + name) ?? props.label ?? "" )!;
		const noCalc = (name: string) => typeof props.isNoCalc == "boolean" ? props.isNoCalc : props.isNoCalc?.(base) ?? base.noCalc;
		const displayFormat = (name: string) => {
			let ceFormat = getInputCeValue("display-format") ?? "";

			if (ceFormat == "") {
				const format = application.state.rbl.value("rbl-sliders", name, 'format', undefined, calcEngine, tab)
				const decimals = application.state.rbl.value("rbl-sliders", name, 'decimals', undefined, calcEngine, tab)
				if (format != undefined && decimals != undefined) {
					ceFormat = `{0:${format}${decimals}}`;
				}
			}

			return ceFormat != "" ? ceFormat : props.displayFormat;
		};
		
		const scope: IKaInputScope = {
			$template: template,
			$renderId: this.getRenderedId(template),

			id: name + "_" + application.id,
			name: name,
			type: inputType,

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
			get value() { return application.state.inputs[name] as string ?? props.value ?? ""; },

			/*
			// Keeping code here...was going to make it possible to detect if property is reactive or not and use it, but it didn't keep
			// state.inputs in sync with the object I was maintaining outside of state.input (i.e. item.percent for nexgen.beneficiaries)
			// so I just used v-ka-rbl-exclude for now for those inputs
			get value() {
				// Currently not supported in inputGroup...it has a 'values' properties, but expected to just be values...would
				// have to made introduce a function/object that somehow could be used in reactive way

				const hasGetter = Object.getOwnPropertyDescriptor(props, 'value')?.get != undefined;
				// If property is a getter, it is 'reactive' and probably don't want to always default to state.inputs.  Wanted this so that
				// I could have an input with 'calculated' value that I managed outside of state.inputs, but still wanted the input available
				// in state.inputs for other parts of code to use
				return (hasGetter ? props.value : application.state.inputs[name]) ?? application.state.inputs[name] ?? "";
			},
			*/

			// v-model="value" support, but not using right now
			// set value(val: string) { application.state.inputs[name] = val; },

			get disabled() { return typeof props.isDisabled == "boolean" ? props.isDisabled : props.isDisabled?.(base) ?? base.disabled; },
			get display() { return typeof props.isDisplay == "boolean" ? props.isDisplay : props.isDisplay?.(base) ?? base.display; },
			get noCalc() { return noCalc(name); },
			get label() { return label(name); },
			get hideLabel() { return getInputCeValue("label") == "-1" || (props.hideLabel ?? false); },
			get placeHolder() {
				const ph = getInputCeValue("placeholder") ?? props.placeHolder;
				return ph != undefined ? application.getLocalizedString( ph ) : undefined;
			},
			get help() {
				return {
					get content() {
						const help = getInputCeValue("help", "rbl-value", "h" + name) ?? props.help?.content;
						return help != undefined ? application.getLocalizedString(help) : undefined;
					},
					title: application.getLocalizedString( getInputCeValue("help-title", "rbl-value", "h" + name + "Title") ?? props.help?.title ?? "" )!,
					width: getInputCeValue("help-width") ?? props?.help?.width?.toString() ?? "350"
				};
			},
			get iconHtml() { return props.iconHtml ?? "" },
			get css() {
				return {
					input: props?.css?.input ?? "",
					label: props?.css?.label ?? "",
					container: props?.css?.container
				};
			},
			get error() { return /* props.isError?.(base) ?? */ base.error; },
			get warning() { return base.warning; },
			get list() {
				const table = props.list == undefined
					? getInputCeValue("list") ?? application.state.rbl.value("rbl-listcontrol", name, "table", undefined, calcEngine, tab)
					: undefined;
				const list = table != undefined
					? application.state.rbl.source<IKaInputModelListRow>(table, calcEngine, tab)
					: props.list ?? [];
				return list.map(r => ({ key: r.key, text: application.getLocalizedString((r.text).toString())! }));
			},
			get prefix() { return getInputCeValue("prefix") ?? props.prefix; },
			get suffix() { return getInputCeValue("suffix") ?? props.suffix; },
			get maxLength() { return maxLength(name); },
			get min() { return getInputCeValue("min") ?? application.state.rbl.value("rbl-sliders", name, "min", undefined, calcEngine, tab) ?? props.min?.toString(); },
			get max() { return getInputCeValue("max") ?? application.state.rbl.value("rbl-sliders", name, "max", undefined, calcEngine, tab) ?? props.max?.toString(); },
			get step() {
				const v = getInputCeValue("step") ?? application.state.rbl.value("rbl-sliders", name, "step", undefined, calcEngine, tab);
				return (v != undefined ? +v : undefined) ?? props.step ?? 1;
			},

			inputUnmounted: (input: HTMLInputElement) => this.unmounted(application, input, props.clearOnUnmount),
			inputMounted: (input: HTMLInputElement, refs: IStringIndexer<HTMLElement>) => { /* placeholder, assigned below so that 'scope' can be passed to handlers */ },
			uploadAsync: async () => {
				if (props.uploadEndpoint == undefined) {
					throw new Error("Cannot use uploadAsync if uploadEndpoint is not set.");
				}
				const files = (application.select("." + name)[0] as HTMLInputElement).files;

				try {
					await application.apiAsync(props.uploadEndpoint, { files: files });
				} catch (e) {
					// logged in apiAsync already
				}
				finally {
					application.setInputValue(name, undefined);
				}
			}
		};

		scope.inputMounted = (input: HTMLInputElement, refs: IStringIndexer<HTMLElement>) => this.mounted(application, scope, name, label, input, defaultValue, props.isExcluded ?? false, noCalc, displayFormat, hasMask, mask, maxLength, keypressRegex, props.events, refs);

		return scope;
	}
}