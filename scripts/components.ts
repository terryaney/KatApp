class Components {
	public static initializeCoreComponents(application: KatApp, getTemplateId: (name: string) => string | undefined): void {
		// Not sure I need this, idea was to be able to inject a reference to application/modalAppOptions so I could use it...but can't think of when I'd need
		// application.state.components["kaScope"] = ((scope?) => new KaScopeComponent(scope).getScope(application)) as (scope: IStringAnyIndexer[]) => IStringAnyIndexer;

		application.state.components["template"] = ((props) => new TemplateComponent(props).getScope(application, getTemplateId)) as (props: { name: string, source?: IStringAnyIndexer | Array<ITabDefRow> }) => IStringAnyIndexer;
		application.state.components["input"] = ((props) => new InputComponent(props).getScope(application, getTemplateId)) as (props: IKaInputModel) => IStringAnyIndexer;
		application.state.components["inputGroup"] = ((props) => new TemplateMultipleInputComponent(props).getScope(application, getTemplateId)) as (props: IKaInputGroupModel) => IStringAnyIndexer;		
	}
}

class TemplateBase {
	static templateRenderedCount: IStringIndexer<number> = {};

	public getRenderedId(templateId: string | undefined): string | undefined {
		if (templateId == undefined) {
			return undefined;
		}

		TemplateBase.templateRenderedCount[templateId] = TemplateBase.templateRenderedCount[templateId] == undefined
			? 1
			: TemplateBase.templateRenderedCount[templateId] + 1;
		
		return `${templateId.substring(1)}_${TemplateBase.templateRenderedCount[templateId]}`;
	}
}

class InputComponentBase extends TemplateBase {
	// My impl of Vue's cacheStringFunction
	private static stringCache: Record<string, string> = Object.create(null);

	private static cacheStringFunction = <T extends (str: string) => string>(fn: T): T => {
		return ((str: string) => {
			const hit = this.stringCache[str]
			return hit ?? (this.stringCache[str] = fn(str))
		}) as T;
	}

	protected removeValidations(application: KatApp, inputName: string) {
		// If event == "input" don't remove on 'change'.  If client validation adds error on 'input' event
		// the 'change' event would trigger after and core code would automatically remove validation, so needed to preserve
		application.state.errors = application.state.errors.filter(r => (r.event == "input" || r["@id"].replace(/ /g, "").split(",").indexOf(inputName) == -1) && (r.dependsOn ?? "").replace(/ /g, "").split(",").indexOf(inputName) == -1);
		application.state.warnings = application.state.warnings.filter(r => (r.event == "input" || r["@id"].replace(/ /g, "").split(",").indexOf(inputName) == -1) && (r.dependsOn ?? "").replace(/ /g, "").split(",").indexOf(inputName) == -1);
	}
	protected errorText(application: KatApp, inputName: string) {
		return application.getLocalizedString( application.state.errors.find(r => r["@id"].replace(/ /g, "").split(",").indexOf(inputName) > -1)?.text );
	}
	protected warningText(application: KatApp, inputName: string) {
		return application.getLocalizedString( application.state.warnings.find(r => r["@id"].replace(/ /g, "").split(",").indexOf(inputName) > -1)?.text );
	}

	protected unmounted(application: KatApp, input: HTMLInputElement, clearOnUnmount: boolean | undefined) {
		// input is always 'isConnected = false' so don't need to use scoped application.closest, just use DOM input.closest event
		if (clearOnUnmount || input.hasAttribute("ka-unmount-clears-inputs") || input.closest("[ka-unmount-clears-inputs]") != undefined) {
			const name = input.getAttribute("name");
			if (name != undefined) {
				delete application.state.inputs[name];
			}
		}
	}

	protected mounted(
		application: KatApp,
		scope: IStringAnyIndexer,
		name: string,
		input: HTMLInputElement,
		defaultValue: (name: string) => string | undefined,
		isExcluded: boolean,
		noCalc: (name: string) => boolean,
		displayFormat: (name: string) => string | undefined,
		mask: (name: string) => string | undefined,
		keypressRegex: (name: string) => string | undefined,
		events: undefined | IStringIndexer<((e: Event, application: KatApp, scope: IStringAnyIndexer) => void)>,
		refs: IStringIndexer<HTMLElement>
	) {
		input.setAttribute("name", name);
		input.classList.add(name);

		// Issue with nested v-if directives and reactivity - see tests/if.nested.reactive.html
		// https://stackoverflow.com/questions/74497174/petite-vue-mount-and-unmount-events-with-nested-v-if
		// https://github.com/vuejs/petite-vue/discussions/188

		if (!input.isConnected) {
			Utils.trace(application, "InputComponent", "mounted", `Skipping input mount on ${name} because the input is not connected, consider the order of model properties being set.`, TraceVerbosity.Diagnostic);
			return;
		}

		const type = input.getAttribute("type");

		// If just attaching v-ka-input to 'raw' input that already has markup values, grab the values to assign during mount
		const radioValue = type == "radio" && input.hasAttribute("checked") ? input.getAttribute("value") : undefined;
		const checkValue = type == "checkbox" ? (input.hasAttribute("checked") ? "1" : "0" ) : undefined;
		const textValue = type == "text" ? input.getAttribute("value") : undefined;

		const exclude = isExcluded || input.hasAttribute("ka-rbl-exclude") || application.closest(input, "[ka-rbl-exclude]").length != 0;
		const skipCalc = input.hasAttribute("ka-rbl-no-calc") || application.closest(input, "[ka-rbl-no-calc]").length != 0;

		if (!exclude) {
			let value = defaultValue(name) ?? checkValue ?? radioValue ?? textValue;

			if (application.state.inputs[name] == undefined && value != undefined) {
				application.state.inputs[name] = value;
			}

			value = application.state.inputs[name] as string;

			if (value != undefined) {
				// If just attaching v-ka-input to a raw input, they might not be using :value="value", so when mounted, just assign it...
				application.setInputValue(name, value);
			}
		}

		const removeError = () => this.removeValidations(application, name);
		const inputEventAsync = async (calculate: boolean) => {
			removeError();

			if (!exclude) {
				application.state.lastInputChange = Date.now();
				application.state.inputsChanged = true;
				application.state.inputs[name] = application.getInputValue(name);

				if (!skipCalc && !noCalc(name)) {
					// Don't trigger calc if ka-rbl-no-calc/ka-rbl-exclude attribute as well
					if (calculate) {
						application.state.inputs.iInputTrigger = name;
						await application.calculateAsync();
					}
					else {
						application.state.needsCalculation = true;
					}
				}
			}

			// Trigger after setting input state b/c triggering this allows other 'change' events to
			// execute and input state hasn't been set yet.
			//
			// i.e.simply changing a drop down that has a @change event, this inputEventAsync was registered first so it runs
			// but when it called this 'await triggerEventAsync("input"...)' the @change event of the event was triggered before
			// input state was set so it didn't have the right state.
			await application.triggerEventAsync("input", name, calculate, input, scope);
		}

		if (type == "date") {
			this.bindDateEvents(application, name, input, removeError, inputEventAsync);
		}
		else if (type == "range") {
			this.bindRangeEvents(name, input, refs, displayFormat, inputEventAsync);
		}
		else {
			this.bindInputEvents(application, name, input, type, mask, keypressRegex, inputEventAsync);
		}

		this.bindCustomEvents(application, input, events, scope);
	}

	private bindInputEvents(
		application: KatApp,
		name: string,
		input: HTMLInputElement,
		type: string | null,
		mask: (name: string) => string | undefined,
		keypressRegex: (name: string) => string | undefined,
		inputEventAsync: (calculate: boolean) => Promise<void>
	): void {
		input.addEventListener("change", async () => await inputEventAsync(true));

		if (type != "file" && type != "checkbox" && input.tagName != "SELECT") {
			input.addEventListener("input", async () => await inputEventAsync(false));
			input.addEventListener("blur", () => {
				if (!application.isCalculating) {
					application.state.needsCalculation = false;
				}
			});

			// Textbox...
			if (type != "radio" && input.tagName == "INPUT") {

				input.addEventListener("input", async () => {
					await inputEventAsync(false);
				});

				const inputKeypressRegex = keypressRegex(name);

				if (inputKeypressRegex != null) {
					const kpRegex = new RegExp(inputKeypressRegex);
					const kpInputRegex = new RegExp(`[^${inputKeypressRegex}]$`, "g");
		
					// Note: this doesn't work in android chrome
					input.addEventListener("beforeinput", (event: InputEvent) => {
						if (event.inputType == "insertText" && event.data != null && !kpRegex.test(event.data)) {
							event.preventDefault();
						}
					});
					input.addEventListener("input", (event: Event) => {
						const target = event.target as HTMLInputElement;
						target.value = target.value.replace(kpInputRegex, "");
					});
				}

				const inputMask = mask(name);
				let maxLength = input.getAttribute("maxlength");
	
				if (inputMask != undefined || maxLength != null) {
					if (inputMask != undefined) {
						input.setAttribute("ka-mask", inputMask);
					}

					switch (inputMask) {
						case "zip+4":
						case "#####-####":
							{
								input.setAttribute("maxlength", maxLength = "10");
								break;
							}

						case "cc-expire":
						case "MM/YY":
							{
								input.setAttribute("maxlength", maxLength = "5");
								break;
							}

						case "phone":
						case "(###) ###-####":
							{
								input.setAttribute("maxlength", maxLength = "14");
								break;
							}
					}

					if (inputMask != undefined) {						
						// NOTE: This doesn't work for Android mobile, no keypress events are fired
						input.addEventListener("keypress", (event: KeyboardEvent) => {
							const target = event.target as HTMLInputElement;
							const inputMask = target.getAttribute("ka-mask");
	
							// `^\-?[0-9]+(\\${currencySeparator}[0-9]{1,2})?$`
							const isMoney = inputMask != undefined && inputMask.indexOf("money") > -1;
										
							switch ( isMoney ? "money" : inputMask ) {
								case "zip+4":
								case "#####-####":
									{
										// Number, (, ), or -
										if (event.key.match(/[0-9\-]/) === null) {
											event.preventDefault();
										}
										else if (event.key == "-" && input.value.length != 5) {
											event.preventDefault();
										}
										break;
									}
	
								case "money":
									{
										const allowNegative = inputMask!.startsWith("-");
										const decimalPlacesString = inputMask!.substring(allowNegative ? 6 : 5);
										const decimalPlaces = decimalPlacesString != "" ? +decimalPlacesString : 2;
			
										const currencySeparator = ( Sys.CultureInfo.CurrentCulture as any ).numberFormat.CurrencyDecimalSeparator;
										const negRegEx = allowNegative ? `\\-` : "";
										const sepRegEx = decimalPlaces > 0 ? `\\${currencySeparator}` : "";
										const moneyRegEx = new RegExp(`[0-9${negRegEx}${sepRegEx}]`, "g");

										const selectionStart = target.selectionStart;
										const selectionEnd = target.selectionEnd;
										const testValue = selectionStart != null && selectionEnd != null && selectionStart != selectionEnd
											? input.value.substring(0, selectionStart) + input.value.substring(selectionEnd)
											: input.value;
										
										if (event.key.match(moneyRegEx) === null) {
											event.preventDefault();
										}
										else if (event.key == currencySeparator && (testValue.indexOf(currencySeparator) > -1 || input.value == "")) {
											event.preventDefault();
										}
										else if (event.key == "-" && (selectionStart != 0 || testValue.indexOf("-") > -1 )) {
											event.preventDefault();
										}
										else if (decimalPlaces > 0 && event.key != currencySeparator && event.key != "-") {
											// Don't allow number input if already enough behind the currencySeparator
											const endValue = selectionStart != selectionEnd
												? testValue
												: input.value.substring(0, selectionStart!) + event.key + input.value.substring(selectionStart!);
											const parts = endValue.split(currencySeparator);

											if (parts.length == 2 && parts[1].length > decimalPlaces) {
												event.preventDefault();
											}
										}
										break;
									}
	
								case "cc-expire":
								case "MM/YY":
									{
										if (event.key.match(/[0-9\/]/) === null) {
											event.preventDefault();
										}
										else if (event.key == "/" && input.value.length != 2 ) {
											event.preventDefault();
										}
										break;
									}
	
								case "phone":
								case "(###) ###-####":
									{
										// Number, (, ), or -
										if (event.key.match(/[0-9\(\)\-\s]/) === null) {
											event.preventDefault();
										}
										else if (event.key == "(" && input.value != "") {
											event.preventDefault();
										}
										else if (event.key == ")" && input.value.length != 4) {
											event.preventDefault();
										}
										else if (event.key == "-" && input.value.length != 9) {
											event.preventDefault();
										}
										else if (event.key == " " && input.value.length != 5) {
											event.preventDefault();
										}
										break;
									}
							}
						});
						
						input.addEventListener("keyup", (event: KeyboardEvent) => {
							const target = event.target as HTMLInputElement;
							const inputMask = target.getAttribute("ka-mask");
							const selectionStart = target.selectionStart;
							const isBackspace = event.code == "Backspace" || event.key == "Backspace";
	
							if (isBackspace && selectionStart == target.value.length) {
								return; // Do nothing
							}
				
							switch (inputMask) {
								case "zip+4":
								case "#####-####":
									{
										let input = target.value;
										const hasDash = input.indexOf("-") == 5;
										input = input.replace(/\D/g, '').substring(0, 9);
												
										// First ten digits of input only
										const zip = input.substring(0, 5);
										const plus4 = input.substring(5, 9);
					
										target.value = input.length > 5
											? zip + "-" + plus4
											: zip + ( hasDash ? "-" : "" );
										break;
									}
	
								case "money":
									{
										const allowNegative = inputMask!.startsWith("-");
										const decimalPlacesString = inputMask!.substring(allowNegative ? 6 : 5);
										const decimalPlaces = decimalPlacesString != "" ? +decimalPlacesString : 2;
										const currencySeparator = ( Sys.CultureInfo.CurrentCulture as any ).numberFormat.CurrencyDecimalSeparator;

										let input = target.value;
										const isNegative = allowNegative && input.indexOf("-") == 0;
										input = input.replace(new RegExp(`[^0-9${currencySeparator}]+`, "g"), '');

										const inputParts = input.split(currencySeparator);

										let newValue = isNegative ? "-" : "";

										if (inputParts.length > 2) {
											newValue += inputParts.slice(0, 2).join(currencySeparator);
										}
										else {
											newValue += inputParts[0];

											if (inputParts.length > 1) {
												newValue += currencySeparator + inputParts[1].substring(0, decimalPlaces);
											}
										}
										target.value = newValue;										
										break;
									}
	
								case "cc-expire":
								case "MM/YY":
									{
										let input = target.value;
										const hasSlash = input.indexOf("/") == 3;
										input = input.replace(/\D/g, '').substring(0, 4);

										const month = input.substring(0, 2);
										const year = input.substring(2);
									
										target.value = input.length > 2
											? `${month}/${year}`
											: month + ( hasSlash ? "/" : "" );
										break;
									}
	
								case "phone":
								case "(###) ###-####":
									{
										let input = target.value;

										input = input.replace(/\D/g, '').substring(0, 10);
									
										// First ten digits of input only
										const area = input.substring(0, 3);
										const middle = input.substring(3, 6);
										const last = input.substring(6, 10);
					
										if (input.length >= 6) { target.value = "(" + area + ") " + middle + "-" + last; }
										else if (input.length >= 3) { target.value = "(" + area + ") " + middle; }
										else if (input.length > 0) { target.value = "(" + area; }
										break;
									}
							}
	
							if (isBackspace || event.code == "Delete") {
								target.selectionStart = target.selectionEnd = selectionStart;
							}
						});
					}

					// Android mobile doesn't enforce maxlength until blur
					if ( maxLength != undefined ) {
						input.addEventListener("input", (event: Event) => {
							const target = event.target as HTMLInputElement;
							const maxLength = +(target.getAttribute("maxlength")!);
							const value = target.value;

							if (value.length > maxLength) {
								target.value = value.slice(0, maxLength);
							}
						});
					}
				}
			}
		}
	}

	static percentFormat = /([/s/S]*?){0:p\d*}/;

	private bindRangeEvents(name: string, input: HTMLInputElement, refs: IStringIndexer<HTMLElement>, displayFormat: (name: string) => string | undefined, inputEventAsync: (calculate: boolean) => Promise<void>): void {
		// https://css-tricks.com/value-bubbles-for-range-inputs/
		let bubbleTimer: number | undefined;
		const bubble = refs.bubble != undefined ? $(refs.bubble) : undefined;
		const bubbleValue = refs.bubbleValue != undefined ? $(refs.bubbleValue) : bubble;

		const display = refs.display != undefined ? $(refs.display) : undefined;

		const setRangeValues = (showBubble: boolean) => {
			if (bubbleTimer) {
				clearTimeout(bubbleTimer);
			}

			const range = $(input);

			const
				value = range.val()!,
				valueFormat = displayFormat(name),
				displayValue = valueFormat != undefined
					? String.localeFormat(valueFormat, valueFormat.match(InputComponent.percentFormat) ? +value / 100 : +value)
					: value.toString(),
				max = +(range.attr("max"))!,
				min = +(range.attr("min"))!,
				newValue = Number((+value - min) * 100 / (max - min)),
				newPosition = 10 - (newValue * 0.2);

			if (display != undefined) {
				display.html(displayValue);
			}
			if (bubble != undefined) {
				bubbleValue!.html(displayValue);

				if (showBubble) {
					let displayWidth = 30;
					if (display != undefined) {
						// displayWidth = display[0].clientWidth;

						// https://stackoverflow.com/questions/25197184/get-the-height-of-an-element-minus-padding-margin-border-widths
						const element = display[0];
						const cs = getComputedStyle(element);

						const paddingX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
						// const paddingY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);

						const borderX = parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth);
						// const borderY = parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);

						// Element width and height minus padding and border
						displayWidth = 15 + element.offsetWidth - paddingX - borderX;
						// elementHeight = element.offsetHeight - paddingY - borderY;
					}

					bubbleValue!.css("width", `${displayWidth}px`);

					bubble
						.css("left", `calc(${newValue}% + (${newPosition}px))`)
						.addClass("active");
				}
			}

			range.css("backgroundSize", `${((+value - min) * 100) / (max - min)}% 100%`);
		};

		// Initial render
		setRangeValues(false);

		input.addEventListener("input", async () => {
			await inputEventAsync(false);
			setRangeValues(true);
		});
		input.addEventListener("rangeset.ka", () => {
			setRangeValues(false);
		});
		input.addEventListener("change", async () => {
			await inputEventAsync(true);
		});

		if (bubble != undefined) {
			input.addEventListener("mouseenter", () => {
				bubbleTimer = setTimeout(() => {
					setRangeValues(true);
				}, 750);
			});
			input.addEventListener("mouseleave", () => {
				if (bubbleTimer) {
					clearTimeout(bubbleTimer);
				}
				bubble.removeClass("active");
			});
		}
	}

	private bindDateEvents(application: KatApp, name: string, input: HTMLInputElement, removeError: () => void, inputEventAsync: (calculate: boolean) => Promise<void> ): void {
		// Date fires 'change' every typed number if the date input is valid...and we don't want that, we need to only do it when blur, hit enter, or pick from calendar

		// So flow:
		//	1. Create action to do calculation if the stored input value is different than date input value.
		//	2. Bind action to change
		//	3. Bind to keydown (so delete/backspace caught too)
		//		- Remove change event and bind action to blur
		//	3. Bind to keypress
		//		- When typing, remove error if present
		//		- If keyCode=13 (enter), fire action
		//	4. Bind to click event (to get calendar change event)
		//	5. Remove blur and change, re-add change event

		const dateChangeAsync = async (e: Event) => {
			// Since we might be triggered on a blur vs a change, a blur would happen every time they 'tab' through
			// an input or if they type a value and change it back to same value before tabbing out (normal inputs
			// automatically handle this and doesn't trigger change event)
			const v = application.getInputValue(name);

			if (application.state.inputs[name] != v) {
				// To give ability to hook events to it.
				(e.currentTarget as HTMLInputElement).dispatchEvent(new Event('value-ka'));
				await inputEventAsync(true);
			}
		};

		input.addEventListener("change", dateChangeAsync);

		input.addEventListener("keypress", async e => {
			removeError();
			if (e.code == "Enter") {
				await dateChangeAsync(e);
			}
		});
		input.addEventListener("keydown", () => {
			input.removeEventListener("change", dateChangeAsync);
			input.addEventListener("blur", dateChangeAsync);
		});

		input.addEventListener("click", () => {
			input.removeEventListener("blur", dateChangeAsync);
			input.removeEventListener("change", dateChangeAsync);
			input.addEventListener("change", dateChangeAsync);
		});

		input.addEventListener("blur", () => {
			if (!application.isCalculating) {
				application.state.needsCalculation = false;
			}
		});
	}

	private bindCustomEvents(application: KatApp, input: HTMLInputElement, events: undefined | IStringIndexer<((e: Event, application: KatApp, scope: IStringAnyIndexer) => void)>, scope: IStringAnyIndexer ): void {
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
							systemModifiers.some((m) => (e as unknown as IStringIndexer<boolean>)[`${m}Key`] && !modifiers[m])
					};

					// map modifiers
					if (arg === 'click') {
						if (modifiers.right) arg = 'contextmenu'
						if (modifiers.middle) arg = 'mouseup'
					}

					const hyphenate = InputComponentBase.cacheStringFunction(str => {
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

							return events[propertyName](e, application, scope);
						},
						modifiers);
				}
				else {
					input.addEventListener(propertyName, (e: Event) => events[propertyName](e, application, scope));
				}
			}
		}
	}

	private getModifiers(property: string): IStringIndexer<true> | undefined {
		if (property.indexOf(".") == -1) return undefined;

		const modifiers: IStringIndexer<true> = {};
		const propParts = property.split(".");
		propParts.shift()

		for (const m in propParts) {
			modifiers[propParts[m]] = true;
		}

		return modifiers;
	}
}

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
			template = getTemplateId(template);

			if (template == undefined) {
				return undefined;
			}
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
		const keypressRegex = (name: string) => getInputCeValue("keypress-regex") ?? props.keypressRegex;
		const defaultValue = (name: string) => application.state.inputs[name] as string ?? props.value;
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
			get noCalc() { return noCalc(name) },
			get label() { return application.getLocalizedString( getInputCeValue("label", "rbl-value", "l" + name) ?? props.label ?? "" )!; },
			get hideLabel() { return getInputCeValue("label") == "-1" || (props.hideLabel ?? false); },
			get placeHolder() { return application.getLocalizedString( getInputCeValue("placeholder") ?? props.placeHolder ); },
			get help() {
				return {
					content: application.getLocalizedString( getInputCeValue("help", "rbl-value", "h" + name) ?? props.help?.content ),
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
				const table = getInputCeValue("list") ?? application.state.rbl.value("rbl-listcontrol", name, "table", undefined, calcEngine, tab);
				const list = table != undefined
					? application.state.rbl.source<IKaInputModelListRow>(table, calcEngine, tab)
					: props.list ?? [];
				return list.map(r => ({ key: r.key, text: application.getLocalizedString((r.text).toString())! }));
			},
			get prefix() { return getInputCeValue("prefix") ?? props.prefix; },
			get suffix() { return getInputCeValue("suffix") ?? props.suffix; },
			get maxLength() {
				const v = getInputCeValue("max-length");
				return (v != undefined ? +v : undefined) ?? props.maxLength ?? 250;
			},
			get min() { return getInputCeValue("min") ?? application.state.rbl.value("rbl-sliders", name, "min", undefined, calcEngine, tab) ?? props.min?.toString() ?? ""; },
			get max() { return getInputCeValue("max") ?? application.state.rbl.value("rbl-sliders", name, "max", undefined, calcEngine, tab) ?? props.max?.toString() ?? ""; },
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

		scope.inputMounted = (input: HTMLInputElement, refs: IStringIndexer<HTMLElement>) => this.mounted(application, scope, name, input, defaultValue, props.isExcluded ?? false, noCalc, displayFormat, mask, keypressRegex, props.events, refs);

		return scope;
	}
}

class TemplateMultipleInputComponent extends InputComponentBase {
	constructor(private props: IKaInputGroupModel) {
		super();
	}

	public getScope(application: KatApp, getTemplateId: (name: string) => string | undefined): IKaInputGroupScope | undefined {
		const templateId = getTemplateId(this.props.template);

		if (templateId == undefined) {
			return undefined;
		}

		const that = this;
		const props = this.props;
		const names = props.names;
		
		function fillProperties<T extends string | boolean | number | IKaInputModelHelp | IKaInputScopeCss>(source: Array<T> | T | undefined, defaultValue?: T): Array<T | undefined> {
			const defaultFill: T | undefined = source != undefined && source instanceof Array
				? source[source.length - 1]
				: source ?? defaultValue;
			
			return source instanceof Array
				? source.concat(names.slice(0, names.length - source.length).map(n => defaultFill!))
				: names.map(n => defaultFill);
		}
		
		const values = fillProperties(props.values);
		const labels = fillProperties(props.labels);
		const prefixes = fillProperties(props.prefixes);
		const suffixes = fillProperties(props.suffixes);		
		const hideLabels = fillProperties(props.hideLabels);
		const placeHolders = fillProperties(props.placeHolders, '');
		const displayFormats = fillProperties(props.displayFormats);
		const masks = fillProperties(props.masks);
		const keypressRegexs = fillProperties(props.keypressRegexs);
		const helps = fillProperties(props.helps);
		const css = fillProperties(props.css);
		const maxLengths = fillProperties(props.maxLengths);
		const mins = fillProperties(props.mins);
		const maxes = fillProperties(props.maxes);
		const steps = fillProperties(props.steps);
		
		const calcEngine = props.ce;
		const tab = props.tab;

		const getInputCeValue = function (index: number, columnName: string, legacyTable?: string, legacyId?: string): string | undefined {
			return application.state.rbl.value("rbl-input", names[ index ], columnName, undefined, calcEngine, tab) ??
				(legacyTable != undefined && legacyId != undefined ? application.state.rbl.value(legacyTable, legacyId, undefined, undefined, calcEngine, tab) : undefined);
		};

		const base = {
			name: ( index: number) => names[index],
			display: (index: number) => getInputCeValue( index, "display", "rbl-display", "v" + names[ index ] ) != "0",
			noCalc: (index: number) => getInputCeValue(index, "skip-calc", "rbl-skip", names[index]) == "1",
			disabled: (index: number) => getInputCeValue(index, "disabled", "rbl-disabled", names[index]) == "1",
			error: (index: number) => that.errorText(application, names[index]),
			warning: (index: number) => that.errorText(application, names[index])
		};

		const noCalc = function (name: string) {
			const index = names.indexOf(name);
			return typeof props.isNoCalc == "boolean" ? props.isNoCalc : props.isNoCalc?.(index, base) ?? base.noCalc(index);
		}
		const defaultValue = function (name: string) {
			const index = names.indexOf(name);
			return application.state.inputs[names[index]] as string ?? values[index];
		}
		const mask = function (name: string) {
			const index = names.indexOf(name);
			return getInputCeValue(index, "mask") ?? masks[index];
		}
		const keypressRegex = function (name: string) {
			const index = names.indexOf(name);
			return getInputCeValue(index, "keypressRegex") ?? keypressRegexs[index];
		}		
		const displayFormat = function (name: string) {
			const index = names.indexOf(name);
			let ceFormat = getInputCeValue(index, "display-format") ?? "";

			if (ceFormat == "") {
				const format = application.state.rbl.value("rbl-sliders", name, 'format', undefined, calcEngine, tab)
				const decimals = application.state.rbl.value("rbl-sliders", name, 'decimals', undefined, calcEngine, tab)
				if (format != undefined && decimals != undefined) {
					ceFormat = `{0:${format}${decimals}}`;
				}
			}

			return ceFormat != "" ? ceFormat : displayFormats[index];
		}

		const inputType = getInputCeValue(0, "type") ?? props.type ?? "text";

		const scope = {
			$template: templateId,
			$renderId: this.getRenderedId(templateId)!,

			id: (index: number) => names[ index ] + "_" + application.id,
			name: (index: number) => base.name( index ),
			type: inputType,

			value: (index: number) => defaultValue( names[ index ]) ?? "",
			// v-model="value" support, but not using right now
			// set value(val: string) { application.state.inputs[name] = val; },
			disabled: (index: number) => typeof props.isDisabled == "boolean" ? props.isDisabled : props.isDisabled?.(index, base) ?? base.disabled(index),
			display: (index: number) => typeof props.isDisplay == "boolean" ? props.isDisplay : props.isDisplay?.(index, base) ?? base.display(index),
			noCalc: (index: number) => noCalc(names[index]),
			label: (index: number) => application.getLocalizedString( getInputCeValue( index, "label", "rbl-value", "l" + names[ index ] ) ?? labels[index] ?? "" )!,
			placeHolder: (index: number) => application.getLocalizedString( getInputCeValue(index, "placeholder", "rbl-value", "ph" + names[index]) ?? placeHolders[index] ),
			help: (index: number) => ({
				content: application.getLocalizedString( getInputCeValue(index, "help", "rbl-value", "h" + names[index]) ?? helps[index]?.content ),
				title: application.getLocalizedString( getInputCeValue(index, "help-title", "rbl-value", "h" + names[index] + "Title") ?? helps[index]?.title ?? "")!,
				width: getInputCeValue(index, "help-width")  ?? helps[index]?.width?.toString() ?? "350"
			}),
			css: (index: number) => ({
				input: css[index]?.input ?? "",
				label: css[index]?.label ?? "",
				container: css[index]?.container
			}),
			error: (index: number) => /* props.isError?.(index, base) ?? */ base.error(index),
			warning: (index: number) => base.warning(index),
			list: function (index: number) {
				const table =
					getInputCeValue(index, "list") ??
					application.state.rbl.value("rbl-listcontrol", names[index], "table", undefined, calcEngine, tab);
				
				const list = table != undefined
					? application.state.rbl.source<IKaInputModelListRow>(table, calcEngine, tab)
					: /* lists[index] ?? */[];

				return list.map(r => ({ key: r.key, text: application.getLocalizedString((r.text).toString())! }));				
			},
			hideLabel: (index: number) => { return getInputCeValue(index, "label") == "-1" || ( hideLabels[index] ?? false ); },
			maxLength: (index: number) => {
				const v = getInputCeValue(index, "max-length");
				return (v != undefined ? +v : undefined) ?? maxLengths[index];
			},
			min: (index: number) => getInputCeValue(index, "min") ?? application.state.rbl.value("rbl-sliders", names[index], "min", undefined, calcEngine, tab) ?? mins[index],
			max: (index: number) => getInputCeValue(index, "max") ?? application.state.rbl.value("rbl-sliders", names[index], "max", undefined, calcEngine, tab) ?? maxes[index],
			step: (index: number) => {
				const v = getInputCeValue(index, "step") ?? application.state.rbl.value("rbl-sliders", names[index], "step", undefined, calcEngine, tab);
				return (v != undefined ? +v : undefined) ?? steps[index];
			},
			prefix: (index: number) => getInputCeValue(index, "prefix") ?? prefixes[index],
			suffix: (index: number) => getInputCeValue(index, "suffix") ?? suffixes[index],

			inputUnmounted: (input: HTMLInputElement) => this.unmounted(application, input, props.clearOnUnmount),
			inputMounted: (input: HTMLInputElement, refs: IStringIndexer<HTMLElement>) => { /* placeholder */ }
		};

		scope.inputMounted = (input: HTMLInputElement, refs: IStringIndexer<HTMLElement>) => {
			const name = input.getAttribute("name");

			if (name == undefined) {
				throw new Error("You must assign a name attribute via :name=\"name(index)\".");
			}

			this.mounted(application, scope, name, input, defaultValue, props.isExcluded ?? false, noCalc, displayFormat, mask, keypressRegex, props.events, refs);
		};

		return scope;
	}
}

class TemplateComponent extends TemplateBase {
	constructor(private props: { name: string, source?: IStringAnyIndexer | Array<ITabDefRow> }) {
		super();
	}

	public getScope(application: KatApp, getTemplateId: (name: string) => string | undefined): IStringAnyIndexer | Array<ITabDefRow> {
		if (this.props.name == undefined) {
			throw new Error("You must provide {name:'templateName'} when using v-ka-template.");
		}

		const templateId = getTemplateId(this.props.name);

		if (templateId == undefined) {
			return {};
		}

		TemplateComponent.templateRenderedCount[templateId] = TemplateComponent.templateRenderedCount[templateId] == undefined
			? 1
			: TemplateComponent.templateRenderedCount[templateId] + 1;

		if (this.props.source instanceof Array) {
			const that = this;
			return {
				$template: templateId,
				$renderId: that.getRenderedId(templateId),

				application: application,
				modalAppOptions: application.options.modalAppOptions,
				get rows() { return that.props.source; }
			};
		}
		else {
			const scope = this.props.source ?? {};
			scope.$template = templateId;
			scope.$renderId = this.getRenderedId(templateId);
			scope.application = application;
			scope.modalAppOptions = application.options.modalAppOptions;
			return scope;
		}
	}
}

/*
class KaScopeComponent {
	constructor(private scope?: IStringAnyIndexer | Array<ITabDefRow>) {
	}
	public getScope(application: KatApp): IStringAnyIndexer | Array<ITabDefRow> {
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
