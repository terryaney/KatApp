/// <reference path="./components.TemplateBase.ts" />

class InputComponentBase extends TemplateBase {
	// My impl of Vue's cacheStringFunction
	private static stringCache: Record<string, string> = Object.create(null);

	private static cacheStringFunction = <T extends (str: string) => string>(fn: T): T => {
		return ((str: string) => {
			const hit = this.stringCache[str]
			return hit ?? (this.stringCache[str] = fn(str))
		}) as T;
	}

	protected addValidityValidation(application: KatApp, inputName: string, label: (name: string) => string, input: HTMLInputElement) {
		if (
			input.validationMessage != undefined && input.validationMessage != "" &&
			application.state.errors.find(r => r["@id"].replace(/ /g, "").split(",").indexOf(inputName) != -1) == undefined
		) {
			application.state.errors.push({ "@id": inputName, text: `${label(inputName)}: ${input.validationMessage}` });
		}
	}
	protected removeValidations(application: KatApp, inputName: string) {
		// If event == "input" don't remove on 'change'.  If client validation adds error on 'input' event
		// the 'change' event would trigger after and core code would automatically remove validation, so needed to preserve
		application.state.errors = application.state.errors.filter(r => (r.event == "input" || r["@id"].replace(/ /g, "").split(",").indexOf(inputName) == -1) && (r.dependsOn ?? "").replace(/ /g, "").split(",").indexOf(inputName) == -1);
		application.state.warnings = application.state.warnings.filter(r => (r.event == "input" || r["@id"].replace(/ /g, "").split(",").indexOf(inputName) == -1) && (r.dependsOn ?? "").replace(/ /g, "").split(",").indexOf(inputName) == -1);
	}
	protected validationText(application: KatApp, validations: Array<IValidationRow>, inputName: string) {
		var validation = validations.find(r => r["@id"].replace(/ /g, "").split(",").indexOf(inputName) > -1);
		return validation != undefined ? application.getLocalizedString( validation.text ) : undefined;
	}
	protected errorText(application: KatApp, inputName: string) {
		return this.validationText( application, application.state.errors, inputName );
	}
	protected warningText(application: KatApp, inputName: string) {
		return this.validationText( application, application.state.warnings, inputName );
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
		label: (name: string) => string,
		input: HTMLInputElement,
		defaultValue: (name: string) => string | undefined,
		isExcluded: boolean,
		noCalc: (name: string) => boolean,
		displayFormat: (name: string) => string | undefined,
		hasMask: boolean,
		mask: (name: string) => string | undefined,
		maxLength: (name: string) => number,
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
						await application.calculateAsync(undefined, true, undefined, false);
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
			this.bindDateEvents(application, name, label, input, removeError, inputEventAsync);
		}
		else if (type == "range") {
			this.bindRangeEvents(name, input, refs, displayFormat, inputEventAsync);
		}
		else {
			this.bindInputEvents(application, name, label, input, type, hasMask, mask, maxLength, keypressRegex, inputEventAsync);
		}

		this.bindCustomEvents(application, input, events, scope);
	}

	private bindInputEvents(
		application: KatApp,
		name: string,
		label: (name: string) => string,
		input: HTMLInputElement,
		type: string | null,
		hasMask: boolean,
		mask: (name: string) => string | undefined,
		maxLength: (name: string) => number,
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
				input.addEventListener("invalid", e => this.addValidityValidation( application, name, label, e.target as HTMLInputElement ) );
				
				const inputKeypressRegex = keypressRegex(name);

				if (inputKeypressRegex != null) {
					// Note: this doesn't work in android chrome
                    const kpBeforeInputRegex = new RegExp(`[${inputKeypressRegex}]`);	
					input.addEventListener("beforeinput", (event: InputEvent) => {
						if (event.inputType == "insertText" && event.data != null && !kpBeforeInputRegex.test(event.data)) {
							event.preventDefault();
						}
					});

                    const kpInputRegex = new RegExp(`[^${inputKeypressRegex}]`, "g");
					input.addEventListener("input", (event: Event) => {
						const target = event.target as HTMLInputElement;
						application.setInputValue(name, target.value = target.value.replace(kpInputRegex, ""), false);
					});
				}

				if (hasMask) {
					const getNumberMaskInfo = function (inputMask: string) {
						const allowNegative = inputMask.startsWith("-");
						const decimalPlacesString = inputMask.substring(allowNegative ? 7 : 6);
						const decimalPlaces = decimalPlacesString != "" ? +decimalPlacesString : 2;

						const currencySeparator = ( Sys.CultureInfo.CurrentCulture as any ).numberFormat.CurrencyDecimalSeparator;
						const negRegEx = allowNegative ? `\\-` : "";
						const sepRegEx = decimalPlaces > 0 ? `\\${currencySeparator}` : "";

						return {
							allowNegative: allowNegative,
							decimalPlaces: decimalPlaces,
							currencySeparator: currencySeparator,
							keypressRegEx: new RegExp(`[0-9${negRegEx}${sepRegEx}]`, "g"),
							inputRegEx: new RegExp(`[^0-9${sepRegEx}]+`, "g")
						};
					};

					// NOTE: This doesn't work for Android mobile, no keypress events are fired
					input.addEventListener("keypress", (event: KeyboardEvent) => {
						const target = event.target as HTMLInputElement;
						const inputMask = mask(name); // support reactivity
						const isNumber = inputMask != undefined && inputMask.indexOf("number") > -1;
									
						switch ( isNumber ? "number" : inputMask ) {
							case "email":
								{
									if (event.key.match(/[A-Za-z0-9.@_-]/) === null) {
										event.preventDefault();
									}
									else if (event.key == "@" && target.value.indexOf("@") > -1) {
										event.preventDefault();
									}
									break;
								}

							case "zip+4":
							case "#####-####":
								{
									input.setAttribute("maxlength", "10");

									// Number, (, ), or -
									if (event.key.match(/[0-9\-]/) === null) {
										event.preventDefault();
									}
									else if (event.key == "-" && input.value.length != 5) {
										event.preventDefault();
									}
									break;
								}

							case "number":
								{
									const numberMaskInfo = getNumberMaskInfo(inputMask!);
									const selectionStart = target.selectionStart;
									const selectionEnd = target.selectionEnd;
									const testValue = selectionStart != null && selectionEnd != null && selectionStart != selectionEnd
										? input.value.substring(0, selectionStart) + input.value.substring(selectionEnd)
										: input.value;
									
									if (event.key.match(numberMaskInfo.keypressRegEx) === null) {
										event.preventDefault();
									}
									else if (event.key == numberMaskInfo.currencySeparator && (testValue.indexOf(numberMaskInfo.currencySeparator) > -1 || input.value == "")) {
										event.preventDefault();
									}
									else if (event.key == "-" && (selectionStart != 0 || testValue.indexOf("-") > -1 )) {
										event.preventDefault();
									}
									else if (numberMaskInfo.decimalPlaces > 0 && event.key != numberMaskInfo.currencySeparator && event.key != "-") {
										// Don't allow number input if already enough behind the currencySeparator
										const endValue = selectionStart != selectionEnd
											? testValue
											: input.value.substring(0, selectionStart!) + event.key + input.value.substring(selectionStart!);
										const parts = endValue.split(numberMaskInfo.currencySeparator);

										if (parts.length == 2 && parts[1].length > numberMaskInfo.decimalPlaces) {
											event.preventDefault();
										}
									}
									break;
								}

							case "cc-expire":
							case "MM/YY":
								{
									input.setAttribute("maxlength", "5");

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
									input.setAttribute("maxlength", "14");

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

							default:
								input.setAttribute("maxlength", maxLength(name).toString());
								break;
						}
					});
					
					const kuEmailRegex = new RegExp(`[^A-Za-z0-9.@_-]`, "g");
					input.addEventListener("input", (event: Event) => {
						const target = event.target as HTMLInputElement;
						const inputMask = mask(name) ?? "";
						const selectionStart = target.selectionStart;
						const isBackspace = (event as InputEvent).inputType == "deleteContentBackward";
						const isDelete = (event as InputEvent).inputType == "deleteContentForward";
						// const isPaste = (event as InputEvent).inputType == "insertFromPaste";

						if ( isBackspace && selectionStart == target.value.length ) {
							return;
						}

						const isNumber = inputMask != undefined && inputMask.indexOf("number") > -1;
									
						switch ( isNumber ? "number" : inputMask ) {
							case "email":
								{
									application.setInputValue(name, target.value = target.value.replace(kuEmailRegex, ""));
									break;
								}

							case "zip+4":
							case "#####-####":
								{
									target.setAttribute("maxlength", "10");

									let input = target.value;
									const hasDash = input.indexOf("-") == 5;
									input = input.replace(/\D/g, '').substring(0, 9);
											
									// First ten digits of input only
									const zip = input.substring(0, 5);
									const plus4 = input.substring(5, 9);
				
									application.setInputValue(name, target.value = input.length > 5
										? zip + "-" + plus4
										: zip + ( hasDash ? "-" : "" ));
									break;
								}

							case "number":
								{
									const numberMaskInfo = getNumberMaskInfo(inputMask!);

									let inputValue = target.value;
									const isNegative = numberMaskInfo.allowNegative && inputValue.indexOf("-") == 0;

									inputValue = inputValue.replace(numberMaskInfo.inputRegEx, '');

									const inputParts = inputValue.split(numberMaskInfo.currencySeparator);

									let newValue = isNegative ? "-" : "";

									if (inputParts.length > 2) {
										newValue += inputParts.slice(0, 2).join(numberMaskInfo.currencySeparator);
									}
									else {
										newValue += inputParts[0];

										if (inputParts.length > 1) {
											newValue += numberMaskInfo.currencySeparator + inputParts[1].substring(0, numberMaskInfo.decimalPlaces);
										}
									}
									application.setInputValue(name, target.value = newValue);
									break;
								}

							case "cc-expire":
							case "MM/YY":
								{
									target.setAttribute("maxlength", "5");

									let input = target.value;
									const hasSlash = input.indexOf("/") == 3;
									input = input.replace(/\D/g, '').substring(0, 4);

									const month = input.substring(0, 2);
									const year = input.substring(2);
								
									application.setInputValue(name, target.value = input.length > 2
										? `${month}/${year}`
										: month + (hasSlash ? "/" : ""));
									break;
								}

							case "phone":
							case "(###) ###-####":
								{
									target.setAttribute("maxlength", "14");

									let input = target.value;

									input = input.replace(/\D/g, '').substring(0, 10);
								
									// First ten digits of input only
									const area = input.substring(0, 3);
									const middle = input.substring(3, 6);
									const last = input.substring(6, 10);
				
									if (input.length >= 6) { target.value = "(" + area + ") " + middle + "-" + last; }
									else if (input.length >= 3) { target.value = "(" + area + ") " + middle; }
									else if (input.length > 0) { target.value = "(" + area; }

									application.setInputValue(name, target.value);
									break;
								}

							default:
								target.setAttribute("maxlength", maxLength(name).toString());
						}

						if (isBackspace || isDelete) {
							target.selectionStart = target.selectionEnd = selectionStart;
						}

						// Android mobile doesn't enforce maxlength until blur
						const maxLengthValue = +(target.getAttribute("maxlength")!);
						const value = target.value;

						if (value.length > maxLengthValue) {
							application.setInputValue(name, target.value = value.slice(0, maxLengthValue));
						}
					});
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

	private bindDateEvents(application: KatApp, name: string, label: (name: string) => string, input: HTMLInputElement, removeError: () => void, inputEventAsync: (calculate: boolean) => Promise<void> ): void {
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

		input.addEventListener("invalid", e => this.addValidityValidation( application, name, label, e.target as HTMLInputElement ) );
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
			<div v-ka-input="{name:'iFirst', events: { 'input': async () => await application.calculateAsync(undefined, true, undefined, false) } }"></div>

			** Below works **
			application.update( {
				handlers: {
					firstNameClick: async e => {
						await application.calculateAsync(undefined, true, undefined, false);
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