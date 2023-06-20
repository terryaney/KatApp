//	1. IDs: QnA - 011310302, ASU - 011103657
//	1. Demo site
//		- https://oneportal.uxgroup.com/LWConnect/Demo/index.html#/profile/address
//		- https://oneportal.uxgroup.com/LWConnect/Demo/index.html#/theme
//	1. Inspector
//		- channel.pension doesn't work, throws error when turning switch on and off
//		- Common.Profile doesn't work, change from addresses to email and back and get error
//		- what happens for v-ka-template with data source and elements inside?
//	1. v-ka-template
//		- if element assigned is a <template> just replace inline?
//		- look at v-ka-inline to get idea on how to handle
//	1. Help Tips
//		Content is treated as it's own VUE app...but if data-bs-content-selector is used and it is just pointing to a hidden div
//		VUE will have already mounted everything and any @eventHandlers would be lost. I made my v-ka directives work by using jquery.on()
//		instead of addEventListener, so when helpTips gets the cotnent and 'clones' elements all the event handlers move with.  But there is a problem
//		if I need unique 'scope values' AND @eventHandlers.  Because to use scope values, I'd have to render a hidden div when processing a scope row
//		and use scope properties as needed.  But if @event or v-on was used, they would be lost.
//
//		To solve this, I think I need a v-ka-helptip directive that can expose an event for when the tip is inserted...then event handlers could be attached
//		by selecting appropriate items inside the tip content.  If I make a directive, could make some assumptions about properties and auto add appropriate
//		data-bs-* attributes to trigger helptips maybe.
//
//		I might want to consider supporting content-selector that also points to a template and then returns 'children' elements...vs default handling when
//		assuming the matched item is simply a htmlelement.

// TODO: Decide on modules vs iife? Modules seems better/recommended practices, but iife and static methods support console debugging better

class KatApp implements IKatApp {
	private static applications: Array<KatApp> = [];
	private static globalEventConfigurations: Array<{ selector: string, events: IKatAppEventsConfiguration }> = [];

	public static getDirty(): Array<IKatApp> {
		return this.applications.filter(a => a.state.isDirty);
	}

	public static remove(item: KatApp): void {
		if (item.vueApp != undefined) {
			item.vueApp.unmount();
		}
		$("template[id$='" + item.id + "']").remove();
		this.applications = this.applications.filter(a => a.id != item.id);
	}

	public static get(key: string | number | Element): KatApp | undefined {
		if (typeof key == "number") return this.applications[key];

		if (typeof key == 'object') {
			const el = key;
			key = el.closest("[ka-id]")?.getAttribute("ka-id") ?? "";
		}

		if (typeof key == "string") {
			const app = this.applications.find(a => a.id == key || a.selector == key);

			if (app != undefined) return app;

			let select = document.querySelectorAll(key);

			if (select.length == 0 && !key.startsWith(".") && !key.startsWith("#")) {
				select = document.querySelectorAll("." + key);
			}

			if (select.length > 1) {
				throw new Error("Unable to find a unique application with the key of " + key);
			}

			if (select.length == 1 && select[0].hasAttribute("ka-id")) {
				return this.applications.find(a => a.id == select[0].getAttribute("ka-id"));
			}
		}

		return undefined;
	}

	public static handleEvents(selector: string, configAction: (config: IKatAppEventsConfiguration) => void): void {
		const config: IKatAppEventsConfiguration = {};
		configAction(config);
		this.globalEventConfigurations.push({ selector: selector, events: config });
	}

	public static async createAppAsync(selector: string, options: IKatAppOptions): Promise<KatApp> {
		let katApp: KatApp | undefined;
		try {
			katApp = new KatApp(selector, options);
			this.applications.push(katApp);
			await katApp.mountAsync();
			return katApp;
		} catch (e) {
			$(".kaModal").remove();

			if (katApp != undefined) {
				KatApp.remove(katApp);
			}

			throw e;
		}
	}

	public id: string;
	public isCalculating: boolean;
	public lastCalculation?: ILastCalculation;
	public options: IKatAppOptions;
	public state: IApplicationData;
	public el: JQuery;
	public traceStart: Date;
	public traceLast: Date;

	private applicationCss: string;
	private vueApp?: PetiteVueApp;
	private viewTemplates?: string[];
	private mountedTemplates: IStringIndexer<boolean> = {};
	private isMounted = false;
	
	private configureOptions: IConfigureOptions | undefined;

	public calcEngines: ICalcEngine[] = [];
	private uiBlockCount = 0;

	private eventConfigurations: Array<IKatAppEventsConfiguration> = [];

	private domElementQueued = false;
	private domElementQueue: Array<HTMLElement> = [];
	private updateDomPromise = Promise.resolve();

	private constructor(public selector: string, options: IKatAppOptions) {
		this.traceStart = this.traceLast = new Date();		
		const id = this.id = "ka" + Utils.generateId();
		this.applicationCss = ".katapp-" + this.id.substring(2);
		this.isCalculating = false;

		const defaultOptions: IKatAppDefaultOptions = {
			inputCaching: false,
			debug: {
				traceVerbosity: Utils.pageParameters["tracekatapp"] === "1" ? TraceVerbosity.Diagnostic : TraceVerbosity.None,
				showInspector: Utils.pageParameters["showinspector"] === "1" || Utils.pageParameters["localserver"] != undefined,
				refreshCalcEngine: Utils.pageParameters["expireCE"] === "1",
				useTestCalcEngine: Utils.pageParameters["test"] === "1",
				useTestView: Utils.pageParameters["testview"] === "1",
				debugResourcesDomain: Utils.pageParameters["localserver"],
			},
			calculationUrl: "https://btr.lifeatworkportal.com/services/evolution/CalculationFunction.ashx",
			kamlRepositoryUrl: "https://btr.lifeatworkportal.com/services/evolution/CalculationFunction.ashx",
			kamlVerifyUrl: "api/katapp/verify-katapp",
			encryptCache: data => typeof (data) == "string" ? data : JSON.stringify(data),
			decryptCache: cipher => cipher.startsWith("{") ? JSON.parse(cipher) : cipher
		};

		this.options = Utils.extend<IKatAppOptions>(
			{},
			defaultOptions,
			options,
			// for now, I want inspector disabled
			{ debug: { showInspector: false } },
		);

		const nc = this.nextCalculation;
		if (nc.trace) {
			// Reassign this if they navigated in case the level changed
			nc.originalVerbosity = this.options.debug.traceVerbosity;
			this.nextCalculation = nc;
			this.options.debug.traceVerbosity = TraceVerbosity.Detailed;
		}

		const selectorResults = options.modalAppOptions == undefined ? $(selector) : undefined;
		if (selectorResults != undefined && selectorResults.length != 1) {
			throw new Error("'selector' of '" + this.selector + "' did not match any elements.");
		}
		else if (selectorResults == undefined && options.modalAppOptions == undefined) {
			throw new Error("No 'selector' or 'modalAppOptions' were provided.");
		}

		this.el = selectorResults ?? this.createModalContainer();

		// Initialize to process entire container one time...
		this.domElementQueue = [this.el[0]];

		this.el.attr("ka-id", this.id);
		this.el.addClass("katapp-css " + this.applicationCss.substring(1));

		if (this.el.attr("v-scope") == undefined) {
			// Supposedly always need this on there...
			this.el.attr("v-scope", "");
		}
		if (this.el.attr("ka-cloak") == undefined && (options.view != undefined || options.content != undefined)) {
			// Hide app until first calc done...
			this.el.attr("ka-cloak", "");
		}

		if (document.querySelector("ka-resources") == undefined) {
			const kaResources = document.createElement("ka-resources");

			kaResources.innerHTML =
				"<style>\
					ka-resources, [v-cloak], [ka-cloak] { display: none; }\
					.kaModalInit { cursor: progress; }\
					body.ka-inspector .ka-inspector-value { border: 1px solid #34495E; box-shadow: 5px 5px 5px 0px #41B883; }\
				</style>";

			document.body.appendChild(kaResources);
		}

		const that = this;

		const getResultTableRows = function <T extends ITabDefRow>(table: string, calcEngine?: string, tab?: string) {
			const ceKey = calcEngine ?? that.state.rbl.options?.calcEngine;

			const ce = ceKey
				? that.calcEngines.find(c => c.key == ceKey)
				: that.calcEngines[0];

			if (ce == undefined) {
				throw new Error(`Can not find CalcEngine ${calcEngine} in rbl-config.`);
			}

			const tabName = tab ?? that.state.rbl.options?.tab ?? ce.resultTabs[0];

			if (ce.resultTabs.indexOf(tabName) == -1) {
				throw new Error(`Can not find Tab ${tabName} for ${calcEngine} in rbl-config.`);
			}

			const key = `${ce.key}.${tabName}`;
			return (that.state.rbl.results[key]?.[table] ?? []) as Array<T>;
		};

		const getValue = function (...args: Array<string | undefined>) {
			const table = args.length == 1 ? "rbl-value" : args[0]!;
			const keyValue = args.length == 1 ? args[0]! : args[1]!;
			const returnField = args.length >= 3 ? args[2] : undefined;
			const keyField = args.length >= 4 ? args[3] : undefined;
			const calcEngine = args.length >= 5 ? args[4] : undefined;
			const tab = args.length >= 6 ? args[5] : undefined;

			return getResultTableRows(table, calcEngine, tab)
				.find(r => r[keyField ?? "@id"] == keyValue)?.[returnField ?? "value"];
		}

		const isTrue = (v: any) => {
			if (v == undefined) return true;

			if (typeof (v) == "string") return ["false", "0", "n", "no"].indexOf(v.toLowerCase()) == -1;

			// Convert to boolean
			return !(!v);
		};

		const cloneHost = this.options.modalAppOptions?.cloneHost ?? false;

		let _isDirty: boolean | undefined = false;

		const state: IApplicationData = {
			kaId: this.id,

			application: this,

			lastInputChange: Date.now(),
			inputsChanged: false,
			get isDirty() {
				return _isDirty ?? this.inputsChanged;
			},
			set isDirty(value: boolean | undefined) {
				_isDirty = value;
				if (!( value ?? true )) {
					this.inputsChanged = false;
				}
			},
			uiBlocked: false,
			canSubmit( whenInputsHaveChanged ) { return ( whenInputsHaveChanged ? this.inputsChanged : this.isDirty! ) && this.errors.filter( r => r['@id'].startsWith('i')).length == 0 && !this.uiBlocked; },
			needsCalculation: false,

			inputs: Utils.extend(
				{
					getOptionText: (inputId: string): string | undefined => {
						return that.select(`.${inputId} option:selected`).text();
					},
					getNumber: (inputId: string): number | undefined => {
						// `^\-?[0-9]+(\\${currencySeparator}[0-9]{1,2})?$`
						
						const currencyString = that.state.inputs[inputId] as string;
						if (currencyString == undefined) return undefined;

						const decimalSeparator = ( Sys.CultureInfo.CurrentCulture as any ).numberFormat.CurrencyDecimalSeparator;
						const moneyRegEx = new RegExp(`[^0-9${decimalSeparator}]+`, "g");
						// Parse the cleaned string as a float, replacing the French decimal separator with a dot
						var parsedValue = parseFloat(currencyString.replace(moneyRegEx, "").replace(decimalSeparator, "."));
						
						return !isNaN(parsedValue) ? parsedValue : undefined;
					}
				},
				this.options.inputs,
				this.getSessionStorageInputs()
			),
			errors: [],
			warnings: [],
			onAll(...values: any[]) {
				return values.find(v => (v ?? "") == "" || !isTrue(v)) == undefined;
			},
			onAny(...values: any[]) {
				return values.find(v => (v ?? "") != "" && isTrue(v)) != undefined;
			},
			rbl: {
				results: cloneHost ? Utils.clone(this.options.hostApplication!.state.rbl.results) : {},
				options: cloneHost ? Utils.clone(this.options.hostApplication!.state.rbl.options) : {},
				pushTo(tabDef, table, rows) {
					const t = (tabDef[table] ?? (tabDef[table] = [])) as ITabDefTable;
					const toPush = rows instanceof Array ? rows : [rows];

					toPush.forEach((row, i) => {
						row["@id"] = row["@id"] ?? "_pushId_" + (t.length + i);

						const index = t.findIndex(r => r["@id"] == row["@id"]);
						if (index > -1) {
							t[index] = row;
						}
						else {
							t.push(row);
						}
					});
				},
				boolean() {
					const argList = Array.from(arguments);
					const stringParams = argList.filter(i => typeof i != "boolean");
					const table = argList[0];

					const v = stringParams.length == 1
						? this.value("rbl-value", table) ?? this.value("rbl-display", table) ?? this.value("rbl-disabled", table) ?? this.value("rbl-skip", table)
						: getValue(...stringParams);

					const valueWhenMissing = argList.find(i => typeof i == "boolean");

					if (v == undefined && valueWhenMissing != undefined) {
						return valueWhenMissing;
					}

					return isTrue(v);
				},
				value() { return getValue(...arguments) },
				number() {
					const v = +(getValue(...arguments) ?? 0);
					return isNaN(v) ? 0 : v;
				},
				source(table, calcEngine, tab, predicate) {
					if (typeof calcEngine == "function") {
						predicate = calcEngine;
						calcEngine = undefined;
					}
					else if (typeof tab == "function") {
						predicate = tab;
						tab = undefined;
					}

					// https://stackoverflow.com/a/74083606/166231
					/*
					type T = typeof predicate extends
						((row: infer T) => boolean) | undefined ? T : never;
					*/
					const result = predicate
						? getResultTableRows<any>(table, calcEngine, tab).filter(r => predicate!(r))
						: getResultTableRows<any>(table, calcEngine, tab);

					return result;
				},
				exists(table, calcEngine, tab, predicate) {
					if (typeof calcEngine == "function") {
						predicate = calcEngine;
						calcEngine = undefined;
					}
					else if (typeof tab == "function") {
						predicate = tab;
						tab = undefined;
					}

					// https://stackoverflow.com/a/74083606/166231
					/*
					type T = typeof predicate extends
						((row: infer T) => boolean) | undefined ? T : never;
					*/

					return predicate
						? getResultTableRows<any>(table, calcEngine, tab).filter(r => predicate!(r)).length > 0
						: getResultTableRows<any>(table, calcEngine, tab).length > 0;
				}
			},

			model: cloneHost ? Utils.clone(this.options.hostApplication!.state.model) : {},
			handlers: cloneHost ? Utils.clone(this.options.hostApplication!.state.handlers ?? {}) : {},
			components: {},

			// Private
			_inspectors: {},
			_inspectorMounted: function (el, inspectorCommentId) {
				/*
				Problem: When something was inspected inside a template and that template was used in v-for, every render had a <template> created, but all had the same inspector id, so
							each one kept finding the first rendered items 'comment' and updating it...so the comment was only visible on the first one and it had the last items information
							applied.

				Solution 1: In ka-inspector directive's ctx.effect, I tried to generate a *new* unique ID and find rendered element and change its ID, then let processing occur.
				
						Start:
						<template>
							<a v-ka-api="...">click</a>
						<template>

						After 'Compile'
						<template>
							<a v-ka-api="..." ka-inspector-id="unique1">click</a>
						<template>

						During ctx.effect (the ka-inspector scope had kaId = unique1)
						uniqueInspectorId = uniqueInspectorId ?? Utils.generateId(); // create a unique Id if not already created for this 'rendered' element

						// Find all rendered items with ka-inspector-id = (original) unique1 // was assuming I'd always only find one
						document.querySelectorAll(`[ka-inspector-id='${kaId}']`).forEach(directive => {
							// Change the value to new unique ID
							directive.setAttribute("ka-inspector-id", uniqueInspectorId!);
						});

						kaId = uniqueInspectorId; // reassign and let rest of processing occur.

					Failed: This didn't work because the 'first render' of an element, my document.querySelectorAll didn't return any hits...so ctx.effect() runs BEFORE the element is 
							rendered.  But then the 'second' item rendered, would find the rendered element from the 'first item' and so on.  So each 'comment' was displaying information
							from the 'next' item's scope.  And the last item would not have a comment since it hadn't been rendered yet.

				Solution 2: During precompile, the scope for the v-ka-inspector injected for every element I'm inspecting has a reference to _inspectors[inspectorCommentId], so every time
							that value changes, the v-ka-inspector.effect() will trigger.  I also attach a mounted event on the element that will be inspected and that is the code running
							here.

							During mount, I increment the count for this._inspectors[inspectorCommentId] (which will eventually retrigger .effect()).  Additionally, I add a 'target-id' to
							the rendered v-ka-inspector element (the 'template' element found at el.previousElementSibling) and an 'id' to the rendered 'inspected element'.

							During the ctx.effect() method, it only processes if the rendered v-ka-inspector element (ctx.el) has a ka-inspector-target-id attribute.  If it has that attribute
							it finds the 'target' and injects the inspector comment.
				*/

				this._inspectors[inspectorCommentId] = (this._inspectors[inspectorCommentId] ?? 0) + 1;
				const targetId = Utils.generateId();

				// this is the 'element' with directives on it
				el.setAttribute("ka-inspector-id", targetId);
				// this is the 'template' that I injected during precompile
				el.previousElementSibling!.setAttribute("ka-inspector-target-id", targetId);
			},
			_domElementMounted(el) {

				// If still rendering the first time...then don't add any elements during the first render
				if (that.el[0].hasAttribute("ka-cloak")) return;

				if (!that.domElementQueue.includes(that.el[0]) && !that.domElementQueue.includes(el)) {
					let queueElement = true;

					// https://stackoverflow.com/a/9882349
					var i = that.domElementQueue.length;
					while (i--) {
						const q = that.domElementQueue[i];
						if (el.contains(q)) {
							// console.log(`${that.selector} _domElementMounted index ${i} was contained by el, remove ${i}`);
							that.domElementQueue.splice(i, 1);
						}
						else if (q.contains(el)) {
							// console.log(`${that.selector} _domElementMounted index ${i} contained el, don't queue el`);
							queueElement = false;
							i = 0;
						}
					}

					if (queueElement) {
						// console.log(that.selector + " _domElementMounted, count: " + that.domElementQueue.length);
						that.domElementQueue.push(el);
					}
				}
				if (!that.domElementQueued) {
					that.domElementQueued = true;
					that.updateDomPromise.then(async () => await that.processDomElementsAsync.apply(that));
				}
			},
			_templateItemMounted: (templateId, el, scope?) => {
				// Setup a mount event that will put <style> into markup or run <script> appropritately when this template is ever used
				const mode = el.tagName == "STYLE" || el.hasAttribute("setup") ? "setup" : "mount";

				el.removeAttribute("setup");

				if (mode == "setup") {
					const oneTimeId = `${templateId}_${el.tagName}_${id}_mount`;
					if (that.mountedTemplates[oneTimeId] != undefined) {
						el.remove(); // Remove tag just to keep content clean
						return;
					}
					that.mountedTemplates[oneTimeId] = true;
				}

				if (el.tagName == "SCRIPT") {
					new Function("_a", "_s", el.textContent + "\nif ( typeof mounted !== 'undefined' ) mounted(_a, _s);")(that, scope);
					el.remove(); // Remove script tag just to keep content clean
				}
				else if (el.tagName == "STYLE") {
					el.outerHTML = el.outerHTML.replace(/thisApplication/g, this.applicationCss);
				}
			},
			_templateItemUnmounted: (templateId, el, scope?) => {
				const mode = el.hasAttribute("setup") ? "setup" : "mount";

				if (mode == "setup") {
					const oneTimeId = `${templateId}_${el.tagName}_${id}_unmount`;
					if (that.mountedTemplates[oneTimeId] != undefined) {
						el.remove();
						return;
					}
					that.mountedTemplates[oneTimeId] = true;
				}

				new Function("_a", "_s", el.textContent + "\nif ( typeof unmounted !== 'undefined' ) unmounted(_a, _s);")(that, scope);
			}
		};

		this.state = PetiteVue.reactive(state);
	}

	public async triggerEventAsync(eventName: string, ...args: (object | string | undefined | unknown)[]): Promise<boolean | undefined> {
		Utils.trace(this, "KatApp", "triggerEventAsync", `Start: ${eventName}.`, TraceVerbosity.Detailed);

		try {
			if (eventName == "calculation" || eventName == "configureUICalculation") {
				await PetiteVue.nextTick();
			}

			const isReturnable = (result: false | undefined) => result != undefined && typeof(result) == "boolean" && ["calculateStart", "apiStart"].indexOf(eventName) > -1 && !result;

			const eventArgs = [...args, this];

			for (const eventConfiguration of this.eventConfigurations.concat(KatApp.globalEventConfigurations.filter( e => e.selector.split(",").indexOf(this.selector) > -1).map( e => e.events))) {
				try {
					// Make application.element[0] be 'this' in the event handler
					let delegateResult = (eventConfiguration as IStringAnyIndexer)[eventName]?.apply(this.el, eventArgs);

					if (delegateResult instanceof Promise) {
						delegateResult = await delegateResult;
					}
						
					if ( isReturnable(delegateResult) ) {
						return delegateResult;
					}
	
				} catch (error) {
					// apiAsync already traces error, so I don't need to do again
					if (!(error instanceof ApiError)) {
						Utils.trace(this, "KatApp", "triggerEventAsync", `Error calling ${eventName}: ${error}`, TraceVerbosity.None, error);
						this.state.errors.push({ "@id": "System", text: "An unexpected error has occurred.  Please try again and if the problem persists, contact technical support." });
					}
				}
			}
			
			/*
			// If event is cancelled, return false;
			try {
				const event = jQuery.Event(eventName + ".ka");

				const currentEvents = $._data(this.el[0], "events")?.[eventName];

				// Always prevent bubbling, KatApp events should never bubble up, had a problem where
				// events were triggered on a nested rbl-app view element, but every event was then
				// bubbled up to the containing application handlers as well
				if (currentEvents != undefined) {
					currentEvents.filter(e => e.namespace == "ka" && (e.kaProxy ?? false) == false).forEach(e => {
						e.kaProxy = true;
						const origHandler = e.handler;
						e.handler = function () {
							arguments[0].stopPropagation();
							return origHandler.apply(this, arguments);
						}
					});

					$(this.el).trigger(event, eventArgs);
				}

				let eventResult = (event as JQuery.TriggeredEvent).result;

				if (eventResult instanceof Promise) {
					eventResult = await eventResult;
				}

				if (event.isDefaultPrevented()) {
					return false;
				}

				if ( isReturnable(eventResult) ) {
					return eventResult;
				}
			} catch (error) {
				// apiAsync already traces error, so I don't need to do again
				if (!(error instanceof ApiError)) {
					Utils.trace(this, "KatApp", "triggerEventAsync", `Error triggering ${eventName}`, TraceVerbosity.None, ( error as IStringAnyIndexer ).responseJSON ?? error);
				}
			}
			*/
			
			return true;
		} finally {
			Utils.trace(this, "KatApp", "triggerEventAsync", `Complete: ${eventName}.`, TraceVerbosity.Detailed);
		}
	}


	public configure(configAction: (config: IConfigureOptions, rbl: IRblApplicationData, model: IStringAnyIndexer | undefined, inputs: ICalculationInputs, handlers: IHandlers | undefined) => void): IKatApp {
		if (this.isMounted) {
			throw new Error("You cannot call 'configure' after the KatApp has been mounted.");
		}

		const config: IConfigureOptions = {
			events: {}
		};

		configAction(config, this.state.rbl, this.state.model, this.state.inputs, this.state.handlers);

		let hasEventHandlers = false;
        for (const propertyName in config.events) {
			hasEventHandlers = true;
			break;
        }
		if (hasEventHandlers) {
			this.eventConfigurations.push(config.events);
		}

		this.configureOptions = config;

		// Fluent api
		return this;
	}

	public handleEvents(configAction: (config: IKatAppEventsConfiguration, rbl: IRblApplicationData, model: IStringAnyIndexer | undefined, inputs: ICalculationInputs, handlers: IHandlers | undefined) => void): IKatApp {
		const config: IKatAppEventsConfiguration = {};
		configAction(config, this.state.rbl, this.state.model, this.state.inputs, this.state.handlers);
		this.eventConfigurations.push(config);
		return this;
	}

	private async mountAsync(): Promise<void> {
		try {
			Utils.trace(this, "KatApp", "mountAsync", `Start`, TraceVerbosity.Detailed);

			if (this.options.view != undefined) {
				this.el.attr("data-view-name", this.options.view);
			}
			
			const viewElement = await this.getViewElementAsync();

			// TODO: Should this just be 'view.kaml' instead of the 'guid' id?
			this.viewTemplates = viewElement != undefined
				? [...(await this.getViewTemplatesAsync(viewElement)), this.id].reverse()
				: [this.id];

			const inputs = this.options.inputs;
			const processInputTokens = (value: string | null): string | null => {
				if (value == undefined) return value;

				return value.replace(/{([^}]+)}/g, function (match, token) {
					return inputs?.[token] as string ?? match;
				});
			};

			const cloneHost = this.options.modalAppOptions?.cloneHost ?? false;

			this.calcEngines = !cloneHost && viewElement != undefined
				? Array.from(viewElement.querySelectorAll("rbl-config calc-engine")).map(c => {
					const ce: ICalcEngine = {
						key: c.getAttribute("key") ?? "default",
						name: processInputTokens( c.getAttribute("name") ) ?? "UNAVAILABLE",
						inputTab: c.getAttribute("input-tab") ?? "RBLInput",
						resultTabs: processInputTokens( c.getAttribute("result-tabs") )?.split(",") ?? ["RBLResult"],
						preCalcs: c.getAttribute("precalcs") ?? undefined, // getAttribute returned 'null' and I want undefined
						allowConfigureUi: c.getAttribute("configure-ui") != "false",
						manualResult: false,
						enabled: true
					};
					return ce;
				})
				: cloneHost ? [...this.options.hostApplication!.calcEngines.filter( c => !c.manualResult)] : [];

			if (this.options.resourceStringsEndpoint != undefined) {
				const apiUrl = this.getApiUrl(this.options.resourceStringsEndpoint);

				try {
					this.options.resourceStrings = await $.ajax({ method: "GET", url: apiUrl.url, cache: true, headers: { 'Cache-Control': 'max-age=0' } });
				} catch (e) {
					Utils.trace(this, "KatApp", "mountAsync", `Error downloading resourceStrings ${this.options.resourceStringsEndpoint}`, TraceVerbosity.None, e);
				}
			}

			if (this.options.manualResultsEndpoint != undefined) {
				const apiUrl = this.getApiUrl(this.options.manualResultsEndpoint);

				try {
					this.options.manualResults = await $.ajax({ method: "GET", url: apiUrl.url, cache: true, headers: { 'Cache-Control': 'max-age=0' } });
				} catch (e) {
					Utils.trace(this, "KatApp", "mountAsync", `Error downloading manualResults ${this.options.manualResultsEndpoint}`, TraceVerbosity.None, e);
				}
			}

			if (viewElement != undefined) {
				if (this.options.hostApplication != undefined && this.options.inputs?.iModalApplication == "1") {
					if (this.options.content != undefined) {
						if (typeof this.options.content == "string") {
							this.select(".modal-body").html(this.options.content);
						}
						else {
							// Need to append() so jquery DOM events remain in place
							this.select(".modal-body").append(this.options.content);
						}
						// Even with appending the 'content' object (if selector was provided) the help tips don't function, so
						// need to remove init flag and let them reprocess
						this.select("[data-bs-toggle='tooltip'], [data-bs-toggle='popover']").removeAttr("ka-init-tip");

						// There is still an issue with things that used {id} notation (i.e. bootstrap accordians) because now
						// the original ID is baked into the markup, so in the modal when they are expanding an accordian
						// it expands the original hidden markup as well.  So there are still issues to consider before using 
						// contentSelector with showModalAsync.
					}
					else {
						this.select(".modal-body").append(viewElement);
					}
				}
				else {
					// Need to append() so script runs to call update() inside Kaml
					$(this.el).append(viewElement);
				}
			}

			Components.initializeCoreComponents(this, name => this.getTemplateId(name));

			// Couldn't do this b/c the model passed in during configure() delegate was then reassigned so
			// any references to 'model' in code 'inside' delegate was using old/original model.
			// this.state.model = this.configureOptions?.model ?? {};

			// Couldn't do this b/c any reactivity coded against model was triggered
			// i.e.Nexgen Common.Footer immediately triggered the get searchResults() because searchString was updated, but rbl.source
			// was not yet valid b/c no calculation ran, so it threw an error.
			// Utils.extend(this.state.model, this.configureOptions?.model ?? {});		

			// Using below (copied from code in Petite Vue) and it seems to 'modify' model so that code inside configure() delegate that
			// used it always had 'latest' model, but it also didn't trigger reactivity 'at this point'
			Object.defineProperties(this.state.model, Object.getOwnPropertyDescriptors(this.configureOptions?.model ?? {}))
			Object.defineProperties(this.state.handlers, Object.getOwnPropertyDescriptors(this.configureOptions?.handlers ?? {}))

			if (this.configureOptions != undefined) {
				for (const propertyName in this.configureOptions.components) {
					this.state.components[propertyName] = this.configureOptions.components[propertyName];
				}
				if (this.configureOptions.options?.modalAppOptions != undefined && this.state.inputs.iModalApplication == "1") {
					Utils.extend(this.options, { modalAppOptions: this.configureOptions.options.modalAppOptions });
				}
				if (this.configureOptions.options?.inputs != undefined) {
					Utils.extend(this.state.inputs, this.configureOptions.options.inputs);
				}
			}

			if (this.options.hostApplication != undefined) {
				if (this.options.inputs?.iModalApplication == "1") {

					if (this.options.modalAppOptions?.buttonsTemplate != undefined) {
						this.select(".modal-footer-buttons button").remove();
						this.select(".modal-footer-buttons").attr("v-scope", "components.template({name: '" + this.options.modalAppOptions.buttonsTemplate + "'})");
					}

					if (this.options.modalAppOptions?.headerTemplate != undefined) {
						this.select(".modal-header")
							.removeClass("d-none")
							.attr("v-scope", "components.template({name: '" + this.options.modalAppOptions.headerTemplate + "'})")
							.children().remove();
					}

					await ( this.options.hostApplication as KatApp ).triggerEventAsync("modalAppInitialized", this);
				}
				else if (this.options.inputs?.iNestedApplication == "1") {
					await ( this.options.hostApplication as KatApp ).triggerEventAsync("nestedAppInitialized", this);
				}
			}
			await this.triggerEventAsync("initialized");

			const initializedErrors = this.state.errors.length > 0;

			if (this.options.manualResults != undefined) {
				const hasCalcEngines = this.calcEngines.length > 0;
				this.calcEngines.push(...this.toCalcEngines(this.options.manualResults));

				const manualResultTabDefs = this.toTabDefs(this.options.manualResults as unknown as IRbleTabDef[]);

				// Some Kaml's without a CE have manual results only.  They will be processed one time during
				// mount since they theoretically never change.  However, resultsProcessing is used to inject some
				// rbl-value rows, so need to call this event to allow that processing to occur
				if (!hasCalcEngines) {
					const getSubmitApiConfigurationResults = await this.getSubmitApiConfigurationAsync(
						async submitApiOptions => {
							await this.triggerEventAsync(
								"updateApiOptions",
								submitApiOptions,
								this.getApiUrl(this.options.calculationUrl).endpoint
							);
						},
						{},
						true
					);

					await this.triggerEventAsync("resultsProcessing", manualResultTabDefs, getSubmitApiConfigurationResults.inputs, getSubmitApiConfigurationResults.configuration);
				}
				await this.processResultsAsync(manualResultTabDefs, undefined);
			}

			if (this.options.debug.showInspector) {
				$(document.body)
					.off("keydown.ka")
					.on("keydown.ka", function (e) {
						if (e.ctrlKey && e.shiftKey) {
							document.body.classList.toggle("ka-inspector");
						}
					});
			}

			const isModalApplication = this.options.hostApplication != undefined && this.options.inputs?.iModalApplication == "1";
			const isConfigureUICalculation = this.calcEngines.filter(c => c.allowConfigureUi && c.enabled && !c.manualResult).length > 0;

			// initialized event might have called apis and got errors, so we don't want to clear out errors or run calculation
			if (!cloneHost && !initializedErrors && isConfigureUICalculation) {
				this.handleEvents(events => {
					events.calculationErrors = async (key, exception) => {
						if (key == "SubmitCalculation.ConfigureUI") {
							this.state.errors.push({ "@id": "System", text: "An unexpected error has occurred.  Please try again and if the problem persists, contact technical support." });
							Utils.trace(this, "KatApp", "mountAsync", isModalApplication ? "KatApp Modal Exception" : "KatApp Exception", TraceVerbosity.None, exception);
						}
					};
				});
				// _iConfigureUI is 'indicator' to calcuateAsync to not trigger events
				await this.calculateAsync({ _iConfigureUI: "1", iConfigureUI: "1", iDataBind: "1" });
			}

			this.vueApp = PetiteVue.createApp(this.state);

			Directives.initializeCoreDirectives(this.vueApp, this);

			if (this.configureOptions != undefined) {
				for (const propertyName in this.configureOptions.directives) {
					this.vueApp.directive(propertyName, this.configureOptions.directives[propertyName]);
				}
			}

			this.vueApp.mount(this.selector);
			this.isMounted = true;

			if (!initializedErrors && !cloneHost) {
				// Now that everything has been processed, can trigger iConfigureUI 'calculation' events
				if (isConfigureUICalculation && this.lastCalculation) {
					await this.triggerEventAsync("configureUICalculation", this.lastCalculation);
					await this.triggerEventAsync("calculation", this.lastCalculation);
					await this.triggerEventAsync("calculateEnd");
				}
				else if (this.calcEngines.find(c => c.manualResult) != undefined) {
					await this.triggerEventAsync("calculation", this.lastCalculation);
				}
			}

			if (isModalApplication) {
				await this.showModalApplicationAsync();
			}
			this.el.removeAttr("ka-cloak");
			await this.processDomElementsAsync(); // process main application

			this.state.inputsChanged = false; // If needed, rendered can have some logic  set to true if needed
			await this.triggerEventAsync("rendered", initializedErrors ? this.state.errors : undefined);
			
			if (this.options.hostApplication != undefined && this.options.inputs?.iNestedApplication == "1") {
				await ( this.options.hostApplication as KatApp ).triggerEventAsync("nestedAppRendered", this, initializedErrors ? this.state.errors : undefined);
			}
		} catch (ex) {
			if (ex instanceof KamlRepositoryError) {
				Utils.trace(this, "KatApp", "mountAsync", "Error during resource download", TraceVerbosity.None,
					...ex.results.map(r => `${r.resource}: ${r.errorMessage}` )
				);
			}

			throw ex;
		}
		finally {
			Utils.trace(this, "KatApp", "mountAsync", `Complete`, TraceVerbosity.Detailed);
		}
	}

	private createModalContainer(): JQuery {

		const options = this.options.modalAppOptions = Utils.extend(
			{
				labels: {
					cancel: "Cancel",
					continue: "Continue"
				},
				css: {
					cancel: "btn btn-outline-primary",
					continue: "btn btn-primary"
				},
				showCancel: true,
				size: this.options.view != undefined ? "xl" : undefined,
				scrollable: false,
				calculateOnConfirm: false
			},
			this.options.modalAppOptions
		);

		const labelCancel = options.labels!.cancel;
		const cssCancel = options.css!.cancel;
		const labelContinue = options.labels!.continue;
		const cssContinue = options.css!.continue;

		const viewName =
			this.options.view ??
			(this.options.modalAppOptions.contentSelector != undefined ? `selector: ${this.options.modalAppOptions.contentSelector}` : "static content");
		
		const modal = $(
			`<div v-scope class="modal fade kaModal" tabindex="-1" role="dialog" data-bs-backdrop="static" data-view-name="${viewName}">\
                <div class="modal-dialog">\
                    <div class="modal-content">\
						<div v-if="uiBlocked" class="ui-blocker"></div>

						<div class="modal-header d-none">\
							<h5 class="modal-title"></h5>\
							<button type="button" class="btn-close" aria-label="Close"></button>\
						</div>\
	                    <div class="modal-body"></div>\
                        <div class="modal-footer">\
							<div class="modal-footer-buttons text-center d-none">\
								<button type="button" :class="[\'${cssCancel}\', \'cancelButton\', { disabled: uiBlocked}]" aria-hidden="true">${labelCancel}</button>\
								<button type="button" :class="[\'${cssContinue}\', \'continueButton\', { disabled: uiBlocked}]">${labelContinue}</button>\
	                        </div>\
                        </div>\
                    </div>\
                </div>\
            </div>`);

		if (options.scrollable) {
			$(".modal-dialog", modal).addClass("modal-dialog-scrollable");
		}
		if (options.size != undefined) {
			$(".modal-dialog", modal).addClass("modal-dialog-centered modal-" + options.size);
		}

		const title = options.labels!.title;

		if (title != undefined) {
			$(".modal-title", modal).html(title);
			$(".modal-header", modal).removeClass("d-none");
		}
		else {
			$(".btn-close", modal).remove();
			modal.attr("data-bs-keyboard", "false");
		}

		if (this.options.modalAppOptions.view != undefined) {
			$("[ka-id]").first().after(modal);
		}
		else {
			// If just 'content' for a modal dialog, append inside current application so that any CSS from
			// current application/view is applied as well.
			this.options.hostApplication!.el.append(modal);
		}

		return modal;
    }

	private async showModalApplicationAsync(): Promise<boolean> {
		const d: JQuery.Deferred<boolean> = $.Deferred();
		
		if (this.el.hasClass("show")) {
			console.log("When this is hit, document why condition is there");
			debugger;
			d.resolve(true);
			return d;
		}

		const options = this.options.modalAppOptions!;
		const that = this;
		let katAppModalClosing = false;

		const closeModal = function () {
			katAppModalClosing = true;
			HelpTips.hideVisiblePopover();
			modalBS5.hide();
			that.el.remove();
			KatApp.remove(that);
		}

		// If response if of type Event, 'confirmedAsync/cancelled' was just attached to a button and default processing occurred and the first param was
		// click event object.  Just pass undefined back as a response in that scenario.		
		options.confirmedAsync = async response => {
			closeModal();

			if (options.calculateOnConfirm != undefined) {
				const calculateOnConfirm = (typeof options.calculateOnConfirm == 'boolean') ? options.calculateOnConfirm : true;
				const calculationInputs = (typeof options.calculateOnConfirm == 'object') ? options.calculateOnConfirm : undefined;
				if (calculateOnConfirm) {
					await that.options.hostApplication!.calculateAsync(calculationInputs);
				}
			}

			options.promise.resolve({ confirmed: true, response: response instanceof Event ? undefined : response, modalApp: that });
		};
		options.cancelled = response => {
			closeModal();
			options.promise.resolve({ confirmed: false, response: response instanceof Event ? undefined : response, modalApp: that });
		};

		// if any errors during initialized event or during iConfigureUI calculation, modal is probably 'dead', show a 'close' button and
		// just trigger a cancelled
		const isInvalid = this.state.errors.length > 0;
		const hasCustomHeader = options.headerTemplate != undefined;
		const hasCustomButtons = options.buttonsTemplate != undefined;
		// If custom buttons, framework should ignore the options (kaml can use them)
		const showCancel = hasCustomButtons || ( options.showCancel ?? true );

		// Could put an options about whether or not to set this
		// this.el.attr("data-bs-keyboard", "false");

		const closeButtonClickAsync = async (e: JQuery.TriggeredEvent) => {
			if (!katAppModalClosing) {
				e.preventDefault();
				if (isInvalid) {
					options.cancelled!();
				}
				else if (options.closeButtonTrigger != undefined) {
					that.select(options.closeButtonTrigger)[0].click();
				}
				else if (showCancel) {
					if (that.select(".modal-footer-buttons .cancelButton").length == 1) {
						that.select(".modal-footer-buttons .cancelButton")[0].click();
					}
					else {
						options.cancelled!();
					}
				}
				else {
					if (that.select(".modal-footer-buttons .continueButton").length == 1) {
						that.select(".modal-footer-buttons .continueButton")[0].click();
					}
					else {
						await options.confirmedAsync!();
					}
				}
			}
		};

		if (isInvalid) {
			const hasCloseButton = this.select(".modal-header .btn-close").length == 1;
			this.select(".modal-footer-buttons button, .modal-footer-buttons a.btn, .modal-header .btn-close").remove();
			this.select(".modal-footer-buttons").append($(`<button type="button" class="${options.css!.continue} continueButton">Close</button>`));
			if (hasCloseButton) {
				this.select(".modal-header").append($('<button type="button" class="btn-close" aria-label="Close"></button>'));
			}
			this.select('.modal-footer-buttons .continueButton, .modal-header .btn-close').on("click.ka", async (e) => {
				e.preventDefault();
				await options.cancelled!();
			});
		}
		else {
			if (!hasCustomHeader) {
				this.select(".modal-header .btn-close").on("click.ka", async e => await closeButtonClickAsync(e) );
			}

			if (!hasCustomButtons) {
				this.select('.modal-footer-buttons .continueButton').on("click.ka", async e => {
					e.preventDefault();
					await options.confirmedAsync!();
				});
				this.select('.modal-footer-buttons .cancelButton').on("click.ka", function (e) {
					e.preventDefault();
					options.cancelled!();
				});

				if (!showCancel) {
					this.select('.modal-footer-buttons .cancelButton').remove();
				}
			}
		}

		this.el
			.on("shown.bs.modal", () => {
				that.select(".modal-footer-buttons").removeClass("d-none");
				d.resolve(true);
			})
			// Triggered when ESC is clicked (when programmatically closed, this isn't triggered)
			// After modal is shown, resolve promise to caller to know modal is fully displayed
			.on("hide.bs.modal", async e => {
				if (HelpTips.hideVisiblePopover()) {
					e.preventDefault();
					return;
				}
				await closeButtonClickAsync(e);
			});

		const modalBS5 = new bootstrap.Modal(this.el[0]);
		modalBS5.show();

		if (options.triggerLink != undefined) {
			options.triggerLink.prop("disabled", false).removeClass("disabled kaModalInit");
			$("body").removeClass("kaModalInit");
		}

		this.options.hostApplication!.unblockUI();

		return d;
	}

	public async navigateAsync(navigationId: string, options?: INavigationOptions) {
		if (options?.inputs != undefined) {
			const cachingKey =
				navigationId == undefined // global
					? "katapp:navigationInputs:global"
					: options.persistInputs ?? false
						? "katapp:navigationInputs:" + navigationId.split("?")[0] + ":" + (this.options.userIdHash ?? "Everyone")
						: "katapp:navigationInputs:" + navigationId.split("?")[0];

			// Shouldn't be previous inputs b/c didn't implement setNavigationInputs method
			/*
			const currentInputsJson = sessionStorage.getItem(cachingKey);
			const currentInputs = currentInputsJson != undefined ? JSON.parse(currentInputsJson) : undefined;
			Utils.extend(currentInputs, inputs);
			sessionStorage.setItem(cachingKey, JSON.stringify(currentInputs));
			*/

			sessionStorage.setItem(cachingKey, JSON.stringify(options.inputs));
		}

		await this.options.katAppNavigate?.(navigationId);
	}

	public async calculateAsync(customInputs?: ICalculationInputs, processResults = true, calcEngines?: ICalcEngine[]): Promise<ITabDef[] | void> {
		// First calculation done before application is even mounted, just get the results setup
		const isConfigureUICalculation = customInputs?._iConfigureUI === "1";
		if (!isConfigureUICalculation) {
			this.traceStart = this.traceLast = new Date();
		}
		Utils.trace(this, "KatApp", "calculateAsync", `Start: ${(calcEngines ?? this.calcEngines).map( c => c.name ).join(", ")}`, TraceVerbosity.Detailed);

		try {
			const apiUrl = this.getApiUrl(this.options.calculationUrl);
			const serviceUrl = /* this.options.registerDataWithService 
				? this.options.{what url should this be} 
				: */ apiUrl.url;

			const getSubmitApiConfigurationResults = await this.getSubmitApiConfigurationAsync(
				async submitApiOptions => {
					await this.triggerEventAsync("updateApiOptions", submitApiOptions, apiUrl.endpoint);
				},
				customInputs,
				true
			);

			if (!processResults) {
				return this.toTabDefs(
					await Calculation.calculateAsync(
						this,
						serviceUrl,
						calcEngines ?? this.calcEngines,
						getSubmitApiConfigurationResults.inputs,
						getSubmitApiConfigurationResults.configuration as ISubmitApiConfiguration
					)
				) as Array<ITabDef>;
			}
			else {
				this.isCalculating = true;
				this.blockUI();
				this.state.errors = [];
				this.state.warnings = [];
				this.lastCalculation = undefined;

				try {
					const inputs = getSubmitApiConfigurationResults.inputs;
					const submitApiConfiguration = getSubmitApiConfigurationResults.configuration;
					delete inputs._iConfigureUI;

					const calcStartResult = await this.triggerEventAsync("calculateStart", submitApiConfiguration) ?? true;
					if (!calcStartResult) {
						return;
					}

					const results = this.toTabDefs(
						await Calculation.calculateAsync(
							this,
							serviceUrl,
							isConfigureUICalculation
								? this.calcEngines.filter(c => c.allowConfigureUi)
								: this.calcEngines,
							inputs,
							submitApiConfiguration as ISubmitApiConfiguration
						)
					);

					await this.cacheInputsAsync(inputs);

					await this.triggerEventAsync("resultsProcessing", results, inputs, submitApiConfiguration);

					await this.processResultsAsync(results, getSubmitApiConfigurationResults);

					this.lastCalculation = {
						inputs: inputs,
						results: results as Array<ITabDef>,
						configuration: submitApiConfiguration as ISubmitApiConfiguration
					};

					// If configure UI, Vue not mounted yet, so don't trigger this until after mounting
					if (!isConfigureUICalculation) {
						// Sometimes KAMLs call a iConfigureUI calc at different intervals (outside of the normal 'mount' flow) and if iConfigureUI=1, 
						// but I'm not in the 'mountAsync configureUI calc', then I want to trigger the event
						if (inputs.iConfigureUI == "1") {
							await this.triggerEventAsync("configureUICalculation", this.lastCalculation);
						}
						await this.triggerEventAsync("calculation", this.lastCalculation);
					}

					this.state.needsCalculation = false;
					this.options.debug.traceVerbosity = this.nextCalculation.originalVerbosity;
					this.nextCalculation = undefined;
				}
				catch (error) {
					this.state.errors.push({ "@id": "System", text: "An unexpected error has occurred.  Please try again and if the problem persists, contact technical support." });

					if (!isConfigureUICalculation) {
						// TODO: Check exception.detail: result.startsWith("<!DOCTYPE") and show diff error?
						Utils.trace(this, "KatApp", "calculateAsync", `Exception: ${(error instanceof Error ? error.message : error + "")}`, TraceVerbosity.None, error);
					}

					await this.triggerEventAsync("calculationErrors", "SubmitCalculation" + (isConfigureUICalculation ? ".ConfigureUI" : ""), error instanceof Error ? error : undefined);
				}
				finally {
					// If configure UI, Vue not mounted yet, so don't trigger this until after mounting
					if (!isConfigureUICalculation) {
						await this.triggerEventAsync("calculateEnd");
					}
					delete this.state.inputs.iInputTrigger;
					this.isCalculating = false;
					this.unblockUI();
				}
			}
		} finally {
			Utils.trace(this, "KatApp", "calculateAsync", `Complete: ${(calcEngines ?? this.calcEngines).map(c => c.name).join(", ")}`, TraceVerbosity.Detailed);
		}
	}

	public async notifyAsync(from: KatApp, name: string, information?: IStringAnyIndexer) {
		await this.triggerEventAsync("notification", name, information, from);
	}

	public async apiAsync(endpoint: string, apiOptions: IApiOptions | undefined, trigger?: JQuery, calculationSubmitApiConfiguration?: ISubmitApiOptions): Promise<IStringAnyIndexer | undefined> {
		// calculationSubmitApiConfiguration is only passed internally, when apiAsync is called within the calculation pipeline and there is already a configuration determined

		if (!this.el[0].hasAttribute("ka-cloak")) {
			this.traceStart = this.traceLast = new Date();
		}

		apiOptions = apiOptions ?? {};

		const isDownload = apiOptions.isDownload ?? false;
		const xhr = new XMLHttpRequest();

		xhr.onreadystatechange = function (): void {
			// https://stackoverflow.com/a/29039823/166231
			if (xhr.readyState == 2 && isDownload && xhr.status == 200) {
				xhr.responseType = "blob";
			}
		};

		this.blockUI();
		this.state.errors = [];
		this.state.warnings = [];

		let successResponse: IStringAnyIndexer | Blob | undefined = undefined;
		let errorResponse: IApiErrorResponse | undefined = undefined;
		const apiUrl = this.getApiUrl(endpoint);

		try {
			const getSubmitApiConfigurationResults =
				calculationSubmitApiConfiguration ??
				await this.getSubmitApiConfigurationAsync(
					async submitApiOptions => {
						await this.triggerEventAsync("updateApiOptions", submitApiOptions, apiUrl.endpoint);
					},
					apiOptions.calculationInputs,
					false
				);

			const calcEngine = this.calcEngines.find(c => !c.manualResult);

			const rbleApiConfiguration = ["Token", "TraceEnabled", "SaveCE", "RefreshCalcEngine", "AuthID", "AdminAuthID", "Client", "TestCE", "CurrentPage", "RequestIP", "CurrentUICulture", "Environment", "Framework"];

			const submitData: ISubmitApiData = {
				Inputs: Utils.clone(getSubmitApiConfigurationResults.inputs ?? {}, (k, v) => k == "tables" || k == "getNumber" ? undefined : v?.toString()),
				InputTables: getSubmitApiConfigurationResults.inputs.tables?.map<ISubmitCalculationInputTable>(t => ({ Name: t.name, Rows: t.rows })),
				ApiParameters: apiOptions.apiParameters,
				Configuration: Utils.extend(
					Utils.clone(this.options, (k, v) => ["manualResults", "manualResultsEndpoint", "resourceStrings", "resourceStringsEndpoint", "modalAppOptions", "hostApplication", "relativePathTemplates", "handlers", "nextCalculation", "katAppNavigate" ].indexOf(k) > -1 ? undefined : v),
					apiOptions.calculationInputs != undefined ? { inputs: apiOptions.calculationInputs } : undefined,
                    // Endpoints only ever use first calc engine...so reset calcEngines property in case kaml
                    // changed calcEngine in the onCalculationOptions.
					calcEngine != undefined
						? {
							calcEngines: [
								{
									name: calcEngine.name,
									inputTab: calcEngine.inputTab,
									resultTabs: calcEngine.resultTabs,
									preCalcs: calcEngine.preCalcs
								}
							]
						}
						: undefined,
					{ nextCalculation: this.nextCalculation },
					Utils.clone(getSubmitApiConfigurationResults.configuration, (k, v) => rbleApiConfiguration.indexOf(k) > -1 ? undefined : v)
				)
			};

			const startResult = await this.triggerEventAsync("apiStart", apiUrl.endpoint, submitData, trigger, apiOptions);
			if (typeof startResult == "boolean" && !startResult) {
				return undefined;
			}

			const formData = this.buildFormData(submitData);

			// FastEndpionts - once converted, no need to do a 'buildFormData' method
			formData.append("inputs", JSON.stringify(submitData.Inputs));
			if (submitData.InputTables != undefined) {
				formData.append("inputTables", JSON.stringify(submitData.InputTables));
			}
			if (submitData.ApiParameters != undefined) {
				formData.append("apiParameters", JSON.stringify(submitData.ApiParameters));
			}
			formData.append("configuration", JSON.stringify(submitData.Configuration));
			
			if (apiOptions.files != undefined) {
				Array.from(apiOptions.files)
					.forEach((f,i) => {
						formData.append("PostedFiles[" + i + "]", f);
					});
			}

			successResponse = await $.ajax({
				method: "POST",
				url: apiUrl.url,
				data: formData,
				xhr: function () { return xhr; },
				contentType: false,
				processData: false,
				headers: { "Content-Type": undefined }
				/*, 
				beforeSend: function (_xhr, settings) {
					// Enable jquery to assign 'binary' results so I can grab later.
					(settings as IStringAnyIndexer)["responseFields"]["binary"] = "responseBinary";
				},*/
			});

			if (isDownload) {
				const blob = successResponse as Blob;

				let filename = "Download.pdf";
				const disposition = xhr.getResponseHeader('Content-Disposition');
				if (disposition && disposition.indexOf('attachment') !== -1) {
					filename = disposition.split('filename=')[1].split(';')[0];
				}

				this.downloadBlob(blob, filename);				
			}
			else if ( apiOptions.calculateOnSuccess != undefined ) {
				const calculateOnSuccess = (typeof apiOptions.calculateOnSuccess == 'boolean') ? apiOptions.calculateOnSuccess : true;
				const calculationInputs = (typeof apiOptions.calculateOnSuccess == 'object') ? apiOptions.calculateOnSuccess : undefined;
				if (calculateOnSuccess) {
					await this.calculateAsync(calculationInputs);
				}
			}

			if (!isDownload) {
				await this.triggerEventAsync("apiComplete", apiUrl.endpoint, successResponse, trigger, apiOptions);
				return successResponse;
			}
		} catch (e) {
			errorResponse = (e as JQuery.jqXHR<any>).responseJSON as IApiErrorResponse ?? {};

			if (errorResponse.errors != undefined) {
				for (var id in errorResponse.errors) {
					this.state.errors.push({ "@id": id, text: this.getLocalizedString(errorResponse.errors[id][0])!, dependsOn: errorResponse.errorsDependsOn?.[id] });
				}
			}
			if (this.state.errors.length == 0) {
				this.state.errors.push({ "@id": "System", text: this.getLocalizedString("An unexpected error has occurred.  Please try again and if the problem persists, contact technical support.")! });
			}

			if (errorResponse.warnings != undefined) {
				for (var id in errorResponse.warnings) {
                    this.state.warnings.push({ "@id": id, text: this.getLocalizedString(errorResponse.warnings[id][0])!, dependsOn: errorResponse.warningsDependsOn?.[id] });
				}
			}

			Utils.trace(this, "KatApp", "apiAsync", "Unable to process " + endpoint, TraceVerbosity.None, errorResponse!.errors != undefined ? [errorResponse, this.state.errors] : errorResponse );

			await this.triggerEventAsync("apiFailed", apiUrl.endpoint, errorResponse, trigger, apiOptions);

			throw new ApiError("Unable to complete API submitted to " + endpoint, e instanceof Error ? e : undefined, errorResponse);
		}
		finally {
			const nextCalculation = this.nextCalculation;
			nextCalculation.saveLocations = nextCalculation.saveLocations.filter(l => !l.serverSideOnly);
			this.nextCalculation = nextCalculation;

			// this.triggerEvent("onActionComplete", endpoint, apiOptions, trigger);
			this.unblockUI();
		}
	}

	private downloadBlob(blob: Blob, filename: string): void {
		const tempEl = document.createElement("a");
		tempEl.classList.add("d-none");
		const url = window.URL.createObjectURL(blob);
		tempEl.href = url;

		filename = filename.replace(/ /g, '+');
		if (filename.startsWith("\"")) {
			filename = filename.substring(1);
		}
		if (filename.endsWith("\"")) {
			filename = filename.substring(0, filename.length - 1);
		}

		tempEl.download = filename;
		tempEl.click();
		window.URL.revokeObjectURL(url);
	}

	private getApiUrl(endpoint: string): { url: string, endpoint: string } {
		const urlParts = this.options.calculationUrl.split("?");
		const endpointParts = endpoint.split("?");

		var qsAnchored = Utils.parseQueryString(this.options.anchoredQueryStrings ?? (urlParts.length == 2 ? urlParts[1] : undefined));
		var qsEndpoint = Utils.parseQueryString(endpointParts.length == 2 ? endpointParts[1] : undefined);
		var qsUrl = Utils.extend<IStringIndexer<string>>(qsAnchored, qsEndpoint, { katapp: this.selector ?? this.id });


		let url = endpointParts[0];
		Object.keys(qsUrl).forEach((key, index) => {
			url += `${(index == 0 ? "?" : "&")}${key}=${qsUrl[key]}`;
		});

		if (!url.startsWith("api/")) {
			url = "api/" + url;
		}

		return {
			url: this.options.baseUrl ? this.options.baseUrl + url : url,
			endpoint: url.split("?")[0].substring(4)
		};
	}

	private buildFormData(submitData: ISubmitApiData): FormData {
		// https://gist.github.com/ghinda/8442a57f22099bdb2e34#gistcomment-3405266
		const buildForm = function (formData: FormData, data: IStringAnyIndexer, parentKey?: string, asDictionary?: boolean): void {
			if (data && typeof data === 'object' && !(data instanceof Date) && !(data instanceof File) && !(data instanceof Blob)) {
				Object.keys(data).forEach((key, index) => {
					if (asDictionary ?? false) {
						formData.append(`${parentKey}[${index}].Key`, key);
						formData.append(`${parentKey}[${index}].Value`, data[key]);
					}
					else {
						const formName = parentKey ? `${parentKey}[${key}]` : key;
						const createDictionary = formName == "Inputs";
						if (key != "manualResults" && key != "manualResultsEndpoint" && key != "resourceStrings" && key != "resourceStringsEndpoint") {
							buildForm(formData, data[key], formName, createDictionary);
						}
					}
				});
			} else if (data != null) {
				const value = (data instanceof Date)
					? data.toISOString()
					: data;

				if (typeof value !== "function") {
					formData.append(parentKey!, value); // eslint-disable-line @typescript-eslint/no-non-null-assertion
				}
			}
		};

		const fd = new FormData();

		buildForm(fd, submitData);

		return fd;
	}

	private async processDomElementsAsync() {
		// console.log(this.selector + " domUpdated: " + this.domElementQueue.length);
		const addUiBlockerWrapper = function (el: HTMLElement): void {
			if (el.parentElement != undefined) {
				el.parentElement.classList.add("ui-blocker-wrapper");
			}
		};

		for (const el of this.domElementQueue) {
			// console.log(this.selector + " charts: " + this.select('[data-highcharts-chart]', $(el)).length + ", hasCloak: " + el.hasAttribute("ka-cloak"));

			// Default markup processing...think about creating a public method that triggers calculation
			// in case KAMLs have code that needs to run inside calculation handler? Or create another
			// event that is called from this new public method AND from calculation workflow and then
			// KAML could put code in there...b/c this isn't really 'calculation' if they just call
			// 'processModel'
			this.select("a[href='#']", el).off("click.ka").on("click.ka", e => e.preventDefault());
			HelpTips.processHelpTips(this, $(el));
			this.select('[data-highcharts-chart]', $(el)).each((i, c) => ($(c).highcharts() as HighchartsChartObject).reflow());

			if (el.classList.contains("ui-blocker")) {
				addUiBlockerWrapper(el);
			}
			else {
				this.select(".ui-blocker", $(el)).each((i, e) => {
					addUiBlockerWrapper(e);
				});
			}
		}

		const elementsProcessed = [...this.domElementQueue];
		this.domElementQueue.length = 0;
		this.domElementQueued = false;
		await this.triggerEventAsync("domUpdated", elementsProcessed);
	}

	/* Not sure what this is or if I need this
	public async nextDomUpdate(): Promise<void> {
		await PetiteVue.nextTick();
	}
	*/

	public getInputValue(name: string, allowDisabled = false): string | undefined {
		const el = this.select<HTMLInputElement>("." + name);

		if (el.length == 0) return undefined;

		if (!allowDisabled && el.prop("disabled")) return undefined;

		if (el.length > 1 && el[0].getAttribute("type") == "radio") {
			const v = el.filter((i, o) => o.checked).val();
			return v != undefined ? v + '' : undefined;
		}

		if (el.hasClass("checkbox-list")) {
			const v = Array.from( el.find<HTMLInputElement>("input:checked") ).map( c => c.value ).join(",");
			return ( v ?? "" ) != "" ? v : undefined;
		}

		if (el[0].getAttribute("type") == "checkbox") {
			return el[0].checked ? "1" : "0";
		}

		if (el[0].getAttribute("type") == "file") {
			const files = el[0].files;
			const numFiles = files?.length ?? 1;
			return numFiles > 1 ? numFiles + ' files selected' : (el.val() as string).replace(/\\/g, '/').replace(/.*\//, ''); // remove c:\fakepath
		}

		return el.val() as string;
	}

	public setInputValue(name: string, value: string | undefined, calculate = false) : JQuery | undefined {

		if (value == undefined) {
			delete this.state.inputs[name];
		}
		else {
			this.state.inputs[name] = typeof value == 'boolean'
				? (value ? "1" : "0") // support true/false for checkboxes
				: value;
		}

		const el = this.select<HTMLInputElement>("." + name);

		if (el.length > 0) {
			const isCheckboxList = el.hasClass("checkbox-list");

			if (el.length > 0 && el[0].getAttribute("type") == "radio") {
				el.prop("checked", false);
				el.filter((i, o) => o.value == value).prop("checked", true);
			}
			else if (isCheckboxList) {
				el.find<HTMLInputElement>("input").prop("checked", false);

				if (value != undefined) {
					const values = value?.split(",")
					el.find<HTMLInputElement>("input:checked").each((i, c) => {
						if (values.indexOf(c.value)) {
							c.checked = true;
						}
					});
				}
			}
			else if (el[0].getAttribute("type") == "checkbox") {
				el[0].checked = typeof value == 'boolean' ? value : value == "1";
			}
			else {
				el.val(value ?? "");
			}


			if (el[0].getAttribute("type") == "range") {
				el[0].dispatchEvent(new Event('rangeset.ka'));
			}
			if (calculate) {
				const target = isCheckboxList ? el.find("input")[0] : el[0];
				target.dispatchEvent(new Event('change'));
			}
		}

		return el;
	}

	public getInputs(customInputs?: ICalculationInputs): ICalculationInputs {
		const inputs =
			Utils.extend<ICalculationInputs>({},
				this.state.inputs,
				customInputs
			);
		
		delete inputs.getNumber;
		delete inputs.getOptionText;
		return inputs;
	}

	public closest(element: JQuery | HTMLElement, selector: string): JQuery {
		const context = element instanceof jQuery ? element as JQuery : $(element);

		const c = context.closest(selector);
		const cAppId = c.attr("ka-id") || c.closest("[ka-id]").attr("ka-id");

		return cAppId == this.id ? c : $();
	}

	public select<T extends HTMLElement>(selector: string, context?: JQuery | HTMLElement | undefined): JQuery<T> {
		const container = !(context instanceof jQuery) && context != undefined
			? $(context)
			: context as JQuery ?? $(this.el);

		var appId = context == undefined
			? this.id
			: container.attr("ka-id") || container.parents("[ka-id]").attr("ka-id");

		return $(selector, container).filter(function () {
			// Sometimes have to select the child app to ask for inputs and selector will have rbl-app= in it, so allow
			return $(this).parents("[ka-id]").attr("ka-id") == appId;
		}) as JQuery<T>;
	}

	public getLocalizedString(key: string | undefined, formatObject?: IStringAnyIndexer, defaultValue?: string): string | undefined {
		if (key != undefined && key.startsWith("{") && formatObject == undefined) {
			formatObject = JSON.parse(key);
			key = formatObject!.key;
		}

		const currentCulture = this.options.currentUICulture ?? "en-us";
		const defaultRegionStrings = this.options.resourceStrings?.["en-us"];
		const defaultLanguageStrings = this.options.resourceStrings?.["en"];
		const cultureStrings = this.options.resourceStrings?.[currentCulture];
		const baseCultureStrings = this.options.resourceStrings?.[currentCulture.split("-")[0]];

		const resource = key == undefined
			? defaultValue
			: cultureStrings?.[key] ??
				baseCultureStrings?.[key] ??
				defaultRegionStrings?.[key] ??
				defaultLanguageStrings?.[key] ??
				defaultValue ??
				key;
		
		const value = typeof resource == "object" ? resource.text : resource;
		return value == undefined ? undefined : String.formatTokens(value, formatObject ?? {} );
	}

	public getTemplateContent(name: string): DocumentFragment {
		const templateId = this.getTemplateId(name);
		return (document.querySelector(templateId!) as HTMLTemplateElement)!.content;
	}

	private getTemplateId(name: string): string | undefined {
		let templateId: string | undefined;

		// Find template by precedence
		for (var k in this.viewTemplates!) {
			const tid = "#" + name + "_" + this.viewTemplates[k];
			if (document.querySelector(tid) != undefined) {
				templateId = tid;
				break;
			}
		}

		if (templateId == undefined && this.options.hostApplication != undefined) {
			templateId = ( this.options.hostApplication as KatApp ).getTemplateId(name);
		}

		if (templateId == undefined) {
			Utils.trace(this, "KatApp", "getTemplateId", `Unable to find template: ${name}.`, TraceVerbosity.Normal);
		}

		return templateId;
	}

	private get nextCalculation(): INextCalculation {
		let app: IKatApp = this;

		// Always get the root application
		while (app.options.hostApplication != undefined) {
			app = app.options.hostApplication;
		}

		const cacheValue = sessionStorage.getItem("katapp:debugNext:" + app.selector);
		const debugNext: INextCalculation = JSON.parse(cacheValue ?? "{ \"saveLocations\": [], \"expireCache\": false, \"trace\": false }");

		if (cacheValue == undefined) {
			debugNext.originalVerbosity = this.options.debug.traceVerbosity;
		}

		return debugNext;
	}
	private set nextCalculation(value: INextCalculation | undefined) {
		let app: IKatApp = this;

		// Always set in the root application
		while (app.options.hostApplication != undefined) {
			app = app.options.hostApplication;
		}

		const cacheKey = "katapp:debugNext:" + app.selector;

		if (value == undefined) {
			sessionStorage.removeItem(cacheKey);
		}
		else {
			sessionStorage.setItem(cacheKey, JSON.stringify(value));
		}
	}

	public debugNext(saveLocations?: string | boolean, serverSideOnly?: boolean, trace?: boolean, expireCache?: boolean ) {
		const debugNext = this.nextCalculation;

		if (typeof (saveLocations) == "boolean") {
			if (!saveLocations) {
				debugNext.saveLocations = [];
			}
		}
		else if ((saveLocations ?? "") != "") {
			
			const locations = saveLocations!.split(",").map(l => l.trim());

			debugNext.saveLocations = [
				...debugNext.saveLocations.filter(l => locations.indexOf(l.location) == -1),
				...locations.map(l => ({ location: l, serverSideOnly: serverSideOnly ?? false }))
			];
		}

		debugNext.trace = trace ?? false;
		if (debugNext.trace) {
			this.options.debug.traceVerbosity = TraceVerbosity.Detailed;
		}
		debugNext.expireCache = expireCache ?? false;
		this.nextCalculation = debugNext;
	}

	public blockUI(): void {
		this.uiBlockCount++;
		this.state.uiBlocked = true;
	}
	public unblockUI(): void {
		this.uiBlockCount--;

		if (this.uiBlockCount <= 0) {
			this.uiBlockCount = 0;
			this.state.uiBlocked = false;
		}
	}

	public allowCalculation(ceKey: string, enabled: boolean): void {
		const ce = this.calcEngines.find(c => c.key == ceKey);
		if (ce != undefined) {
			ce.enabled = enabled;
		}
	}

	// public so HelpTips can call when needed
	public cloneOptions(includeManualResults: boolean): IKatAppOptions {
		return Utils.clone<IKatAppOptions>(
			this.options,
			(k, v) =>
				["handlers", "view", "content", "modalAppOptions", "hostApplication"].indexOf(k) > -1 || (!includeManualResults && k == "manualResults")
					? undefined
					: v
		);
	}
		
	public async showModalAsync(options: IModalOptions, triggerLink?: JQuery): Promise<IModalResponse> {
		let cloneHost = false;

		if (options.contentSelector != undefined) {
			await PetiteVue.nextTick(); // Just in case kaml js set property that would trigger updating this content

			const selectContent = this.select(options.contentSelector); // .not("template " + options.contentSelector);

			if (selectContent.length == 0) {
				throw new Error(`The content selector (${options.contentSelector}) did not return any content.`);
			}

			cloneHost = selectContent[0].hasAttribute("v-pre");
			const selectorContent = $("<div/>");
			// Use this instead of .html() so I keep my bootstrap events
			selectorContent.append(selectContent.contents().clone());
			options.content = selectorContent;
		}

		if (options.content == undefined && options.view == undefined) {
			throw new Error("You must provide content or viewId when using showModal.");
		}
		if ($(".kaModal").length > 0) {
			throw new Error("You can not use the showModalAsync method if you have markup on the page already containing the class kaModal.");
		}

		this.blockUI();

		if (triggerLink != undefined) {
			triggerLink.prop("disabled", true).addClass("disabled kaModalInit");
			$("body").addClass("kaModalInit");			
		}

		try {
			const previousModalApp = KatApp.get(".kaModal");
			if (previousModalApp != undefined) {
				KatApp.remove(previousModalApp);
			}

			// const d: JQuery.Deferred<ICalculationSuccessResponse | ICalculationFailedResponse> = $.Deferred();
			const d: JQuery.Deferred<IModalResponse> = $.Deferred();

			const modalOptions: IKatAppPartialModalOptions = {
				view: options.view,
				content: options.content,
				currentPage: options.view ?? this.options.currentPage,
				hostApplication: this,
				modalAppOptions: Utils.extend<IModalAppOptions>(
					{ promise: d, triggerLink: triggerLink, cloneHost: cloneHost },
					Utils.clone(options, (k, v) => ["content", "view"].indexOf(k) > -1 ? undefined : v)
				),
				inputs: {
					iModalApplication: "1"
				}
			};

			const modalAppOptions = Utils.extend<IKatAppOptions>(
				this.cloneOptions(options.content == undefined),
				modalOptions,
				options.inputs != undefined ? { inputs: options.inputs } : undefined
			);
			delete modalAppOptions.inputs!.iNestedApplication;
			await KatApp.createAppAsync(".kaModal", modalAppOptions);

			return d;
		} catch (e) {
			this.unblockUI();

			if (triggerLink != undefined) {
				triggerLink.prop("disabled", false).removeClass("disabled kaModalInit");
				$("body").removeClass("kaModalInit");
			}

			throw e;
		}
	}

	private async cacheInputsAsync(inputs: ICalculationInputs) {
		if (this.options.inputCaching) {
			const inputCachingKey = "katapp:cachedInputs:" + this.options.currentPage + ":" + (this.options.userIdHash ?? "EveryOne");
			const cachedInputs = Utils.clone<ICalculationInputs>(inputs);
			await this.triggerEventAsync("inputsCached", cachedInputs);
			sessionStorage.setItem(inputCachingKey, JSON.stringify(cachedInputs));
		}
    }

	private async getSubmitApiConfigurationAsync(triggerEventAsync: (submitApiOptions: ISubmitApiOptions) => Promise<void>, customInputs?: ICalculationInputs, isCalculation: boolean = false): Promise<ISubmitApiOptions> {
		const currentInputs = this.getInputs(customInputs);

		if (currentInputs.tables == undefined) {
			currentInputs.tables = [];
		}

		const submitApiOptions: ISubmitApiOptions = {
			inputs: currentInputs,
			configuration: {},
			isCalculation: isCalculation
		};
		
		await triggerEventAsync(submitApiOptions);

		const currentOptions = this.options;

		const submitConfiguration: ISubmitApiConfiguration = {
			Token: /* (currentOptions.registerDataWithService ?? true) ? currentOptions.registeredToken : */ undefined,
			TraceEnabled: this.nextCalculation.trace ? 1 : 0,
			SaveCE: this.nextCalculation.saveLocations.map(l => l.location).join("|"),
			RefreshCalcEngine: this.nextCalculation.expireCache || (currentOptions.debug?.refreshCalcEngine ?? false),
			// Should we be using JWT for AuthID, AdminAuthID, Client?
			AuthID: /* currentOptions.data?.AuthID ?? */ "NODATA",
			AdminAuthID: undefined,
			Client: /* currentOptions.data?.Client ?? */ "KatApp",
			TestCE: currentOptions.debug?.useTestCalcEngine ?? false,
			CurrentPage: currentOptions.currentPage ?? "KatApp:" + (currentOptions.view ?? "UnknownView"),
			RequestIP: currentOptions.requestIP ?? "1.1.1.1",
			CurrentUICulture: currentOptions.currentUICulture ?? "en-US",
			Environment: currentOptions.environment ?? "EW.PROD",
			Framework: "KatApp"
		};

		return {
			inputs: submitApiOptions.inputs,
			configuration: Utils.extend<ISubmitApiConfiguration>(
				submitConfiguration,
				submitApiOptions.configuration
			),
			isCalculation: isCalculation
		};
	}

	private getCeName(name: string) {
		return name?.split(".")[0].replace("_Test", "") ?? "";
	}

	private toCalcEngines(manualResults: IManualTabDef[] | undefined): ICalcEngine[] {
		if (manualResults != undefined) {
			const mrCalcEngineTabs: IStringIndexer<{ ceKey: string, tabs: string[] }> = {};

			manualResults.forEach(t => {
				const ceKey = t["@calcEngineKey"];
				if (ceKey == undefined) {
					throw new Error("manualResults requires a @calcEngineKey attribute specified.");
				}

				let ceName = this.getCeName(t["@calcEngine"] ?? t["@calcEngineKey"]);
				if (this.calcEngines.find(c => !c.manualResult && c.name.toLowerCase() == ceName!.toLowerCase()) != undefined) {
					// Can't have same CE in manual results as we do in normal results, so prefix with Manual
					ceName = "Manual." + ceName;
				}

				if (mrCalcEngineTabs[ceName] == undefined) {
					mrCalcEngineTabs[ceName] = { ceKey: ceKey, tabs: [] };
				}

				let tabName = t["@name"];
				if (tabName == undefined) {
					tabName = t["@name"] = "RBLResult" + (mrCalcEngineTabs[ceName].tabs.length + 1);
				}
				mrCalcEngineTabs[ceName].tabs.push(tabName);
			});

			const mrCalcEngines: ICalcEngine[] = [];

			for (const ceName in mrCalcEngineTabs) {
				const ceInfo = mrCalcEngineTabs[ceName];

				const ce: ICalcEngine = {
					key: ceInfo.ceKey,
					name: ceName,
					inputTab: "RBLInput",
					resultTabs: ceInfo.tabs,
					manualResult: true,
					allowConfigureUi: true,
					enabled: true
				};

				mrCalcEngines.push(ce);
			}

			return mrCalcEngines;
		}

		return [];
	}

	private toTabDefs(rbleResults: IRbleTabDef[]): IKaTabDef[] {
		const calcEngines = this.calcEngines;
		const defaultCEKey = calcEngines[0].key;

		return rbleResults.map((t, i) => {
			const ceName = this.getCeName(t["@calcEngine"]);
			const configCe = calcEngines.find(c => c.name.toLowerCase() == ceName.toLowerCase());

			if (configCe == undefined) {
				/*
				// If they run a different CE than is configured via this event handler
				// the CalcEngine might not be in calcEngine options, so find will be 
				// undefined, just treat results as 'primary' CE
                .on("calculationOptions.ka", function (event, submitOptions, application) {
                    submitOptions.Configuration.CalcEngine = "Conduent_Nexgen_Profile_SE";
                })
				*/
				Utils.trace(this, "KatApp", "toTabDefs", `Unable to find calcEngine: ${ceName}.  Determine if this should be supported.`, TraceVerbosity.None);
			}

			const ceKey = configCe?.key ?? defaultCEKey;
			const name = t["@name"];

			const tabDef: IKaTabDef = {
				_ka: {
					calcEngineKey: ceKey,
					name: name
				}
			};

			Object.keys(t)
				.forEach(k => {
					if (k.startsWith("@")) {
						tabDef[k] = t[k] as string;
					}
					else {
						tabDef[k] = !(t[k] instanceof Array)
							? [t[k] as ITabDefRow]
							: t[k] as ITabDefTable;
					}
				});

			return tabDef;
		});
	}
	
	private copyTabDefToRblState(ce: string, tab: string, t: IKaTabDef, propName: string) {
		const key = `${ce}.${tab}`;
		if (this.state.rbl.results[key] == undefined) {
			this.state.rbl.results[key] = {};
		}

		this.state.rbl.results[key][propName] = t[propName] as ITabDefTable ?? [];
	}

	private mergeTableToRblState(ce: string, tab: string, table: ITabDefTable, tableName: string) {
		if (ce == "_ResultProcessing" && this.calcEngines.length > 0) {
			ce = this.calcEngines[0].key;
			tab = this.calcEngines[0].resultTabs[0];
		}

		const key = `${ce}.${tab}`;
		if (this.state.rbl.results[key] == undefined) {
			this.state.rbl.results[key] = {};
		}
		if (this.state.rbl.results[key][tableName] == undefined) {
			this.state.rbl.results[key][tableName] = [];
		}

		table.forEach(row => {
			if (tableName == "rbl-skip") {
				row["@id"] = row.key;
				// Legacy support...didn't have ability to turn on and off, so if they don't have value column, imply that it is on
				if (row.value == undefined) {
					row.value = "1";
				}
			}

			const index = this.state.rbl.results[key][tableName].findIndex(r => r["@id"] == row["@id"]);

			if (index > -1) {
				Utils.extend(this.state.rbl.results[key][tableName][index], row);
			}
			else {
				this.state.rbl.results[key][tableName].push(row);
			}
		});
	}

	private async processResultsAsync(results: IKaTabDef[], calculationSubmitApiConfiguration: ISubmitApiOptions | undefined): Promise<void> {
		Utils.trace(this, "KatApp", "processResultsAsync", `Start: ${results.map(r => `${r._ka.calcEngineKey}.${r._ka.name}`).join(", ")}`, TraceVerbosity.Detailed);
		const tablesToMerge = ["rbl-disabled", "rbl-display", "rbl-skip", "rbl-value", "rbl-listcontrol", "rbl-input"];

		const processResultColumn = (row: ITabDefRow, colName: string, isRblInputTable: boolean) => {
			if (typeof (row[colName]) === "object") {
				const metaRow: ITabDefMetaRow = row;
				const metaSource = metaRow[colName] as IStringIndexer<string>;
				const metaDest = (metaRow["@" + colName] = {}) as IStringIndexer<string>;

				// For the first row of a table, if there was a width row in CE, then each 'column' has text and @width attribute,
				// so row[columnName] is no longer a string but a { #text: someText, @width: someWidth }.  This happens during process
				// turning the calculation into json.  http://www.newtonsoft.com/json/help/html/convertingjsonandxml.htm
				Object.keys(metaSource)
					.filter(k => k != "#text")
					.forEach(p => {
						metaDest[p] = metaSource[p];
					});

				row[colName] = metaSource["#text"] ?? "";
			}

			const value = row[colName];

			if (isRblInputTable && value == "" && (row["@" + colName] as unknown as IStringIndexer<string>)?.["@text-forced"] != "true") {
				// For rbl-input (which is special table), I want any 'blanks' to be returned as undefined, any other table, I always want '' in there
				// so Kaml Views don't always have to code undefined protection code
				(row as ITabDefRblInputRow)[colName] = undefined;
			}

			// Make sure every row has every property that is returned in the *first* row of results...b/c RBL service doesn't export blanks after first row
			if (value == undefined && !isRblInputTable) {
				row[colName] = "";
			}
		};

		results.forEach(t => {
			Object.keys(t)
				// No idea how ItemDefs is in here, but not supporting going forward, it was returned by IRP CE but the value was null so it blew up the code
				.filter(k => !k.startsWith("@") && k != "_ka" && k != "ItemDefs")
				.forEach(tableName => {
					const rows = t[tableName] as ITabDefTable ?? [];

					if (rows.length > 0) {
						const isRblInputTable = tableName == "rbl-input";
						const colNames = Object.keys(rows[0]);

						rows.forEach(r => {
							colNames.forEach(c => processResultColumn(r, c, isRblInputTable))

							switch (tableName) {
								case "rbl-defaults":
									this.setInputValue(r["@id"], r["value"]);
									break;

								case "rbl-input":
									if (r["value"] != undefined) {
										this.setInputValue(r["@id"], r["value"]);
									}
									if ((r["error"] ?? "") != "") {
										const v: IValidation = { "@id": r["@id"], text: this.getLocalizedString(r.error)!, dependsOn: r.dependsOn };
										this.state.errors.push(v);
									}
									if ((r["warning"] ?? "") != "") {
										const v: IValidation = { "@id": r["@id"], text: this.getLocalizedString(r.warning)!, dependsOn: r.dependsOn };
										this.state.warnings.push(v);
									}
									break;

								case "errors":
									r.text = this.getLocalizedString(r.text)!;
									this.state.errors.push(r as unknown as IValidation);
									break;

								case "warnings":
									r.text = this.getLocalizedString(r.text)!;
									this.state.warnings.push(r as unknown as IValidation);
									break;

								case "table-output-control":
									// If table control says they want to export, but no rows are returned, then need to re-assign to empty array
									// export = -1 = don't export table and also clear out in Vue state
									// export = 0 = don't export table but leave Vue state
									// export = 1 = try export table and if empty, clear Vue state
									if ((r["export"] == "-1" || r["export"] == "1") && t[r["@id"]] == undefined) {
										this.copyTabDefToRblState(t._ka.calcEngineKey, t._ka.name, t, r["@id"]);
									}
									break;
							}
						});
					}

					if (tablesToMerge.indexOf(tableName) == -1) {
						this.copyTabDefToRblState(t._ka.calcEngineKey, t._ka.name, t, tableName);
					}
					else {
						this.mergeTableToRblState(t._ka.calcEngineKey, t._ka.name, t[tableName] as ITabDefTable, tableName);
					}
				});

			(t["rbl-input"] as ITabDefTable ?? []).filter(r => (r["list"] ?? "") != "").map(r => ({ input: r["@id"], list: r["list"]! })).concat(
				(t["rbl-listcontrol"] as ITabDefTable ?? []).map(r => ({ input: r["@id"], list: r["table"]! }))
			).forEach(r => {
				if (t[r.list] != undefined) {
					const values = (t[r.list] as Array<IKaInputModelListRow>).map(l => l.key);
					const inputValue: string | undefined = this.state.inputs[r.input] as string;
					if (values.indexOf(inputValue ?? "") == -1) {
						delete this.state.inputs[r.input];
					}
				}
			});
		});

		try {
			await this.processDataUpdateResultsAsync(results, calculationSubmitApiConfiguration);
		} catch (error) {
			await this.triggerEventAsync("calculationErrors", "ProcessDataUpdateResults", error instanceof Error ? error : undefined);
		}
		try {
			this.processDocGenResults(results);
		} catch (error) {
			await this.triggerEventAsync("calculationErrors", "ProcessDocGenResults", error instanceof Error ? error : undefined);
		}
		Utils.trace(this, "KatApp", "processResultsAsync", `Complete: ${results.map(r => `${r._ka.calcEngineKey}.${r._ka.name}`).join(", ")}`, TraceVerbosity.Detailed);
	}

	private async processDataUpdateResultsAsync(results: IKaTabDef[], calculationSubmitApiConfiguration: ISubmitApiOptions | undefined): Promise<void> {
		try {
			const jwtPayload = {
				DataTokens: [] as Array<{ Name: string; Token: string; }>
			};

			results
				.forEach(t => {
					(t["jwt-data"] as ITabDefTable ?? [])
						.filter(r => r["@id"] == "data-updates")
						.forEach(r => {
							jwtPayload.DataTokens.push({ Name: r["@id"], Token: r["value"] });
						});
				});

			if (jwtPayload.DataTokens.length > 0) {
				Utils.trace(this, "KatApp", "processDataUpdateResultsAsync", `Start (${jwtPayload.DataTokens.length} jwt-data items)`, TraceVerbosity.Detailed);
				await this.apiAsync("rble/jwtupdate", { apiParameters: jwtPayload }, undefined, calculationSubmitApiConfiguration);
				Utils.trace(this, "KatApp", "processDataUpdateResultsAsync", `Complete`, TraceVerbosity.Detailed);
			}
		} catch (e) {
			Utils.trace(this, "KatApp", "processResultsAsync", `Unhandled exception.`, TraceVerbosity.None, e);
			throw e;
		}
    }

	private processDocGenResults(results: IKaTabDef[]) {
		const base64toBlob = function (base64Data: string, contentType = 'application/octet-stream', sliceSize = 1024): Blob {
			// https://stackoverflow.com/a/20151856/166231                
			const byteCharacters = atob(base64Data);
			const bytesLength = byteCharacters.length;
			const slicesCount = Math.ceil(bytesLength / sliceSize);
			const byteArrays = new Array(slicesCount);

			for (let sliceIndex = 0; sliceIndex < slicesCount; ++sliceIndex) {
				const begin = sliceIndex * sliceSize;
				const end = Math.min(begin + sliceSize, bytesLength);

				const bytes = new Array(end - begin);
				for (let offset = begin, i = 0; offset < end; ++i, ++offset) {
					bytes[i] = byteCharacters[offset].charCodeAt(0);
				}
				byteArrays[sliceIndex] = new Uint8Array(bytes);
			}
			return new Blob(byteArrays, { type: contentType });
		}
		/*
		const base64toBlobFetch = (base64 : string, type: string = 'application/octet-stream'): Promise<Blob> => 
			// Can't use in IE :(
			fetch(`data:${type};base64,${base64}`).then(res => res.blob())
		*/

		try {
			const docGenInstructions = results.flatMap(t => (t["api-actions"] as ITabDefTable ?? []).filter(r => r["action"] == "DocGen"));

			if (docGenInstructions.length > 0) {
				Utils.trace(this, "KatApp", "processDocGenResults", `Start (${docGenInstructions.length} DocGen items)`, TraceVerbosity.Detailed);

				docGenInstructions.forEach(r => {
					const fileName = r["file-name"];
					if (r.exception != undefined) {
						Utils.trace(this, "KatApp", "processDocGenResults", `DocGen Instruction Exception: ${fileName ?? 'File Not Availble'}, ${r.exception})`, TraceVerbosity.None);
					}
					else {
						const base64 = r["content"];
						const contentType = r["content-type"];
						const blob = base64toBlob(base64, contentType);
						this.downloadBlob(blob, fileName);
					}
				});
				Utils.trace(this, "KatApp", "processDocGenResults", `Complete`, TraceVerbosity.Detailed);
			}
		} catch (e) {
			Utils.trace(this, "KatApp", "processDocGenResults", `Unhandled exception.`, TraceVerbosity.None, e);
			throw e;
		}
	}

	private async getViewElementAsync(): Promise<HTMLElement | undefined> {
		const viewElement: HTMLElement = document.createElement("div");

		if ((this.options.modalAppOptions != undefined || this.options.inputs?.iNestedApplication == "1") && this.options.view != undefined ) {
			const view = this.options.view;

			const apiUrl = this.getApiUrl(`${this.options.kamlVerifyUrl}?applicationId=${view}&currentId=${this.options.hostApplication!.options.currentPage}` );

			try {
				const response: IModalAppVerifyResult = await $.ajax({ method: "GET", url: apiUrl.url, dataType: "json" });

				Utils.extend( this.options, { view: response.path, currentPath: view } );

				if (response.manualInputs != undefined) {
					Utils.extend(this.state.inputs, response.manualInputs);
				}
			} catch (e) {
				Utils.trace(this, "KatApp", "getViewElementAsync", `Error verifying KatApp ${view}`, TraceVerbosity.None, e);
			}
		}

		if (this.options.view != undefined) {
			const viewResource = await KamlRepository.getViewResourceAsync(this.options, this.options.view);

			const viewContent =
				viewResource[this.options.view]
					.replace(/{id}/g, this.id)
					.replace(/thisApplication/g, this.applicationCss);

			viewElement.innerHTML = viewContent;

			if (viewElement.querySelectorAll("rbl-config").length !== 1) {
				throw new Error("View " + this.options.view + " is missing rbl-config element");
			}

			this.processKamlMarkup(viewElement, this.id);
		}
		else if (this.options.content == undefined) {
			// just mounting existing html (usually just a help tip is what this was made for)
			return undefined;
		}

		return viewElement;
	}

	private async getViewTemplatesAsync(viewElement: Element): Promise<string[]> {
		var requiredViewTemplates =
			(viewElement.querySelector("rbl-config")?.getAttribute("templates")?.split(",") ?? [])
				.map(r => {
					const resourceNameParts = (r.split(":").length > 1 ? r : "Global:" + r).split("?");

					let resourceName = resourceNameParts[0];
					if (!resourceName.endsWith(".kaml")) {
						resourceName += ".kaml";
					}

					return resourceName;
				});

		const viewTemplateResults = await KamlRepository.getTemplateResourcesAsync(this.options, requiredViewTemplates);

		Object.keys(viewTemplateResults).forEach(k => {
			const templateContent = document.createElement("kaml-template");
			templateContent.innerHTML = viewTemplateResults[k];

			this.processKamlMarkup(templateContent, k.replace(/\./g, "_"));

			KamlRepository.resolveTemplate(k);
		});
		return requiredViewTemplates.map(t => {
			const keyParts = t.split(":"); // In case Rel:
			return keyParts[keyParts.length - 1].split("?")[0].replace(/\./g, "_");
		});
	}

	private getSessionStorageInputs(): ICalculationInputs {
		const inputCachingKey = "katapp:cachedInputs:" + this.options.currentPage + ":" + (this.options.userIdHash ?? "EveryOne");
		const cachedInputsJson = this.options.inputCaching ? sessionStorage.getItem(inputCachingKey) : undefined;
		const cachedInputs = cachedInputsJson != undefined && cachedInputsJson != null ? JSON.parse(cachedInputsJson) : undefined;

		const oneTimeInputsKey = "katapp:navigationInputs:" + this.options.currentPage;
		const oneTimeInputsJson = sessionStorage.getItem(oneTimeInputsKey);
		const oneTimeInputs = oneTimeInputsJson != undefined ? JSON.parse(oneTimeInputsJson) : undefined;
		sessionStorage.removeItem(oneTimeInputsKey);

		const persistedInputsKey = "katapp:navigationInputs:" + this.options.currentPage + ":" + (this.options.userIdHash ?? "Everyone");
		const persistedInputsJson = sessionStorage.getItem(persistedInputsKey);
		const persistedInputs = persistedInputsJson != undefined ? JSON.parse(persistedInputsJson) : undefined;

		const sessionStorageInputs = Utils.extend<ICalculationInputs>({}, cachedInputs, persistedInputs, oneTimeInputs);
		return sessionStorageInputs;
	}

	private processKamlMarkup(kaml: Element, resourceKey: string): void {
		const kaResources = document.querySelector("ka-resources")!;
		const processingTemplates = resourceKey != this.id;
		const that = this;

		// Put all template file <style> blocks into markup if not already added from previous app (host, modal, nested)
		if (processingTemplates) {
			const keyParts = resourceKey.split(":"); // In case "Rel:"
			const containerId = keyParts[keyParts.length - 1].split("?")[0]; // Cache buster
			const kamlTemplatesAdded = kaResources.querySelector(`style[ka=${containerId}]`) != undefined;

			kaml.querySelectorAll<HTMLStyleElement>("style").forEach(s => {
				if (kamlTemplatesAdded) {
					s.remove();
				}
				else {
					s.setAttribute("ka", containerId);
					kaResources.appendChild(s);
				}
			});
		}

		// Add mounted/unmounted attributes and safely keep any previously assigned values.
		const addMountAttribute = (el: Element, type: string, exp: string, predicate?: (existingScript: string) => boolean ) => {
			let mountScript = el.getAttribute("v-on:vue:" + type) ?? el.getAttribute("@vue:" + type) ?? ""

			if (predicate?.(mountScript) ?? true) {
				el.removeAttribute("v-on:vue:" + type);
				el.removeAttribute("@vue:" + type);

				if (mountScript.startsWith("handlers.") && mountScript.indexOf("(") == -1) {
					// the @vue:mounted simply pointed to a handlers.function...but since we are appending more
					// script to it, need to change it into a function call...
					mountScript += "($event)"
				}

				el.setAttribute("v-on:vue:" + type, `${mountScript != '' ? mountScript + ';' : ''}${exp}`);
			}
		};

		// Mount all inputs within a template
		const mountInputs = function (container: Element | DocumentFragment) {
			container.querySelectorAll("input:not([v-ka-nomount]), select:not([v-ka-nomount]), textarea:not([v-ka-nomount])").forEach(input => {
				addMountAttribute(input, "mounted", "inputMounted($el, $refs)");
				addMountAttribute(input, "unmounted", "inputUnmounted($el)");
			});

			// If a template contains a template/v-for (i.e. radio button list) need to drill into each one and look for inputs
			container.querySelectorAll<HTMLTemplateElement>("template[v-for]").forEach(t => {
				mountInputs(t.content);
			});
		};

		// Add mount event to dump comment with 'markup details'
		const inspectElement = (el: Element, scope?: string | null, details?: string) => {
			if (this.options.debug.showInspector && !el.classList.contains("ka-inspector-value")) {
				el.classList.add("ka-inspector-value");

				const getBlockString = (blockEl: Element, blockScope: string | null | undefined): string => {
					const attrs: IStringAnyIndexer = {};
					Array.from(blockEl.attributes)
						.filter(a => a.name != "ka-inspector-id")
						.forEach(a => {
							attrs[a.name] = a.value;
						});

					return `{ name: '${blockEl.tagName.toLowerCase()}', scope: ${blockScope?.replace(/"/g, '&quot;') ?? 'undefined' }, attributes: ${JSON.stringify(attrs)} }`;
				}

				const blocks: Array<string> = [];

				const currentScope = el.hasAttribute("v-for")
					? el.getAttribute("v-for")!.substring(el.getAttribute("v-for")!.indexOf(" in ") + 4)
					: scope;

				blocks.push(getBlockString(el, currentScope));

				let ifEl = el.nextElementSibling;
				while (ifEl != undefined && (ifEl.hasAttribute("v-else-if") || ifEl.hasAttribute("v-else"))) {
					ifEl.classList.add("ka-inspector-value");
					blocks.push(getBlockString(ifEl, ifEl.getAttribute("v-else-if") ) );
					ifEl = ifEl.nextElementSibling;
				}

				const inspectorCommentId = Utils.generateId();
				const inspectorScope = `{ inspectorTargetId: _inspectors[ '${inspectorCommentId}' ], details: ${details != undefined ? `\'${details}\'` : 'undefined'}, blocks: [${blocks.join(", ")}] }`;
				const inspector: Element = document.createElement("template");
				inspector.setAttribute("v-ka-inspector", inspectorScope);
				el.before(inspector);
				el.setAttribute("v-on:vue:mounted", `_inspectorMounted($el, '${inspectorCommentId}')`);
			}
		};

		const compileMarkup = function (container: Element | DocumentFragment) {
			let compileError = false;
			container.querySelectorAll("[v-for][v-if]").forEach(directive => {
				console.log(directive);
				compileError = true;
			});
			if (compileError) {
				throw new Error("v-for and v-if on same element.  The v-for should be moved to a child <template v-for/> element.");
			}

			// Make sure v-ka-inline only present on template items, then move the 'v-html' source
			// into the scope for v-ka-inline so it is reactive
			container.querySelectorAll("[v-ka-inline]").forEach(directive => {
				if (directive.tagName != "TEMPLATE" || !directive.hasAttribute("v-html")) {
					console.log(directive);
					compileError = true;
				}
				else {
					directive.setAttribute("v-ka-inline", directive.getAttribute("v-html")!);
				}
			});
			if (compileError) {
				throw new Error("v-ka-inline can only be used on <template/> elements and must have a v-html attribute.");
			}

			container.querySelectorAll<HTMLTemplateElement>("template:not([id])").forEach(template => {
				Array.from(template.content.children).filter( c => c.hasAttribute( "v-if" ) ).forEach(invalid => {
					console.log(invalid);
					compileError = true;
				})
			});
			if (compileError) {
				throw new Error("A v-if can not be a direct decendent of an inline <template/>.  Wrap the v-if element with a div.");
			}

			// Turn v-ka-input into v-scope="components.input({})"
			container.querySelectorAll("[v-ka-input]").forEach(directive => {
				let scope = directive.getAttribute("v-ka-input")!;
				if (!scope.startsWith("{")) {
					scope = `{ name: '${scope}' }`;
				}

				inspectElement(directive, scope);

				directive.removeAttribute("v-ka-input");
				directive.setAttribute("v-scope", `components.input(${scope})`);

				// If no template used, just hooking up the input
				if (scope.indexOf("template:") == -1 && scope.indexOf("'template':") == -1) {
					const isInput = ['INPUT', 'SELECT', 'TEXTAREA'].indexOf(directive.tagName) > -1;

					if (isInput) {
						// Just binding a raw input
						addMountAttribute(directive, "mounted", "inputMounted($el, $refs)");
						addMountAttribute(directive, "unmounted", "inputUnmounted($el)");
					}
					else {
						// If v-ka-input was on a 'container' element that contains inputs...drill into content and mount inputs
						mountInputs(directive);
					}
				}
			});

			// Fix v-ka-highchart 'short hand' of data or data.options string into a valid {} scope
			container.querySelectorAll("[v-ka-highchart]").forEach(directive => {
				let exp = directive.getAttribute("v-ka-highchart")!;

				if (!exp.startsWith("{")) {
					// Using short hand of just the 'table names': 'data.options' (.options name is optional)
					const chartParts = exp.split('.');
					const data = chartParts[0];
					const options = chartParts.length >= 2 ? chartParts[1] : chartParts[0];
					exp = `{ data: '${data}', options: '${options}' }`;
				}

				directive.setAttribute("v-ka-highchart", exp);
				inspectElement(directive, exp);
			});

			// Fix v-ka-table 'short hand' of name string into a valid {} scope
			container.querySelectorAll("[v-ka-table]").forEach(directive => {
				let exp = directive.getAttribute("v-ka-table")!;

				if (!exp.startsWith("{")) {
					// Using short hand of just the 'table name'
					exp = `{ name: '${exp}' }`;
				}

				directive.setAttribute("v-ka-table", exp);
				inspectElement(directive, exp);
			});

			// Fix v-ka-navigate 'short hand' of view string into a valid {} scope
			container.querySelectorAll("[v-ka-navigate]").forEach(directive => {
				let exp = directive.getAttribute("v-ka-navigate")!;

				if (!exp.startsWith("{")) {
					// Using short hand of just the 'table names': 'data.options' (.options name is optional)
					exp = `{ view: '${exp}' }`;
				}

				directive.setAttribute("v-ka-navigate", exp);
				inspectElement(directive, exp);
			});

			// Turn v-ka-rbl-no-calc into ka-rbl-no-calc='true' (was .rbl-nocalc)
			// Turn v-ka-rbl-exclude into ka-rbl-exclude='true' (was .rbl-exclude)
			// Turn v-ka-unmount-clears-inputs into ka-unmount-clears-inputs='true' (was .rbl-clear-on-unmount)
			container.querySelectorAll("[v-ka-rbl-no-calc],[v-ka-rbl-exclude],[v-ka-unmount-clears-inputs]").forEach(directive => {
				if ( directive.hasAttribute("v-ka-rbl-no-calc") ) {
					directive.removeAttribute("v-ka-rbl-no-calc");
					directive.setAttribute("ka-rbl-no-calc", "true");
				}
				if ( directive.hasAttribute("v-ka-rbl-exclude") ) {
					directive.removeAttribute("v-ka-rbl-exclude");
					directive.setAttribute("ka-rbl-exclude", "true");
				}
				if ( directive.hasAttribute("v-ka-unmount-clears-inputs") ) {
					directive.removeAttribute("v-ka-unmount-clears-inputs");
					directive.setAttribute("ka-unmount-clears-inputs", "true");
				}
			});

			// Turn v-ka-needs-calc into two items with toggled class and handler
			container.querySelectorAll("button[v-ka-needs-calc], a[v-ka-needs-calc]").forEach(directive => {
				let needsCalcText = directive.getAttribute("v-ka-needs-calc");

				if (needsCalcText == "") {
					needsCalcText = "<i class='fa-solid fa-rotate-right'></i>&nbsp;Refresh";
				}

				directive.setAttribute("v-if", "!needsCalculation");

				inspectElement(directive, `{ needsCalcText: '${needsCalcText}' }`, `Cloned element immediately following with v-if=needsCalculation`);

				directive.removeAttribute("v-ka-needs-calc");

				const refresh = directive.cloneNode(true) as Element;
				for (const { name, value } of [...refresh.attributes]) {
					if (name.startsWith("@click") ) {
						refresh.attributes.removeNamedItem(name);
					}
				}
				refresh.innerHTML = needsCalcText!;

				refresh.setAttribute("v-if", "needsCalculation");
				directive.after(refresh);
			});

			// Turn v-ka-input-group into v-scope="components.inputGroup({})"
			container.querySelectorAll("[v-ka-input-group]").forEach(directive => {
				const scope = directive.getAttribute("v-ka-input-group")!;

				inspectElement(directive, scope);

				directive.removeAttribute("v-ka-input-group");
				directive.setAttribute("v-scope", `components.inputGroup(${scope})`);
			});

			// Also automatically setup helptips again if the item is removed/added via v-if and the v-if contains tooltips (popup config is lost on remove)
			// Used to occur inside template[id] processing right after mountInputs(); call, but I think this should happen all the time

			// PROBLEM: May have a problem here...if v-if contains templates that contain other v-ifs or helptips...the processing might not work right b/c selection doesn't
			// span outside/inside of templates
			container.querySelectorAll("[v-if]").forEach(directive => {
				// Only do the 'outer most if'...otherwise the 'container' context when doing getTipContent is wrong and the 'selector' isn't found
				// UPDATE: Leaving condition in, but I didn't see any inputs with 'nested' v-if directives so not sure it is needed
				// directive.parentElement?.closest("[v-if]") == undefined

				addMountAttribute(directive, "mounted", `_domElementMounted($el)`);
				inspectElement(directive, `{ condition: ${directive.getAttribute("v-if")} }`);
			});

			container.querySelectorAll("[v-for], [v-else-if], [v-else]").forEach(directive => {
				addMountAttribute(directive, "mounted", `_domElementMounted($el)`);
			});

			// Turn v-ka-template="templateId, scope" into v-scope="components.template(templateId, scope)"
			const needsReactiveForRE = /.*?name'?\s*:\s*(?<value>'?[\w\s\.]+'?)/;
			container.querySelectorAll("[v-ka-template]").forEach(directive => {
				const exp = directive.getAttribute("v-ka-template")!;
				const scope = exp.startsWith("{")
					? exp
					: `{ name: '${exp}' }`;

				inspectElement(directive, scope);
				directive.removeAttribute("v-ka-template");

				const nameValue = needsReactiveForRE.exec(scope)?.groups!.value ?? ""
				const needsReactiveFor = !directive.hasAttribute("v-for") && ["inputs.", "model.", "rbl."].find( n => nameValue.startsWith(n)) != undefined;

				if (needsReactiveFor) {
					/*
						Need to change following:
						<div v-ka-template="{ name: inputs.iNavigationCurrent }" class="mt-5 row"></div>

						To:	
						<template v-for="template in [inputs.iNavigationCurrent]" :key="template">
							<div v-ka-template="{ name: template }" class="mt-5 row"></div>
						</template>

						Needed loop on single item so that reactivity would kick in when it changed and render a new item
						-->
					*/

					directive.setAttribute("v-scope", `components.template({ name: _reactive_template.name, source: _reactive_template.source})`);

					// Try to create via dom manipulation wasn't working.  I think the 'template' element screwed it up with the 'document fragment' created
					// before dom markup was 'really' loaded by browser and then resulted in double document fragment?  No idea, but outerHTML assignment worked.
					/*
					const reactiveFor: Element = document.createElement("template");
					reactiveFor.setAttribute("v-for", `_reactive_template in [${scope}]`);
					reactiveFor.setAttribute(":key", "_reactive_template.name");
					directive.before(reactiveFor);
					reactiveFor.appendChild(directive);
					*/
					directive.outerHTML = `<template v-for="_reactive_template in [${scope}]" :key="_reactive_template.name">${directive.outerHTML}<template>`;
				}
				else {
					directive.setAttribute("v-scope", `components.template(${scope})`);
				}
			});

			if (that.options.debug.showInspector) {
				container.querySelectorAll("[v-ka-modal]").forEach(directive => {
					const scope = directive.getAttribute("v-ka-modal");

					inspectElement(directive, scope);
				});
				container.querySelectorAll("[v-ka-api]").forEach(directive => {
					let scope = directive.getAttribute("v-ka-api")!;

					if (!scope.startsWith("{")) {
						scope = `{ endpoint: '${scope}' }`;
					}

					inspectElement(directive, scope);
				});
				container.querySelectorAll("[v-ka-app]").forEach(directive => {
					let scope = directive.getAttribute("v-ka-app")!;

					if (!scope.startsWith("{")) {
						scope = `{ view: '${scope}' }`;
					}

					inspectElement(directive, scope);
				});

				container.querySelectorAll("[v-for]").forEach(directive => {
					inspectElement(directive);
				});

				// Common Vue directives
				container.querySelectorAll("[v-show]").forEach(directive => {
					inspectElement(directive, `{ condition: ${directive.getAttribute("v-show")} }`);
				});

				container.querySelectorAll("[v-effect], [v-on]").forEach(directive => {
					// No scope here b/c v-effect can be 'code eval' (not returning anything just 'doing' something - setting inner html)
					// v-on - no scope either, just dump the original element markup
					inspectElement(directive);
				});

				// Following items always last since they can be added
				// to same element with other (more important) v-ka- elements
				container.querySelectorAll("[v-ka-value], [v-ka-attributes], [ka-inline], [v-html], [v-text]").forEach(directive => {
					inspectElement(directive);
				});

				// TODO: Need @ and : attribute items and {{ }} syntax

			}

			// Recurse for every template without an ID (named templates will be processed next and moved to kaResources)
			container.querySelectorAll<HTMLTemplateElement>("template:not([id])").forEach(template => {
				compileMarkup(template.content);
			});
		}

		compileMarkup(kaml);

		// Update template ids and move them to ka-resources
		kaml.querySelectorAll<HTMLTemplateElement>("template[id]")
			.forEach(template => {
				const keyParts = resourceKey.split(":"); // In case "Rel:"
				const containerId = keyParts[keyParts.length - 1].split("?")[0]; // Cache buster
				template.id = `${template.id}_${containerId}`;

				// Only process template markup once (in case same template file is requested for multiple apps on the page)
				if (kaResources.querySelector(`template[id=${template.id}]`) == undefined) {
					compileMarkup(template.content);

					// If this is an 'input template', need attach mounted/unmounted events on all 'inputs'
					if (template.hasAttribute("input")) {
						mountInputs(template.content);
						template.removeAttribute("input");
					}

					template.content.querySelectorAll("style, script").forEach(templateItem => {
						addMountAttribute(templateItem, "mounted", `_templateItemMounted('${template.id}', $el, $data)`);
						if (templateItem.tagName == "SCRIPT") {
							addMountAttribute(templateItem, "unmounted", `_templateItemUnmounted('${template.id}', $el, $data)`);
						}
					});

					kaResources.appendChild(template);
				}
				else {
					template.remove();
				}
			});
	}
}

class ApiError extends Error {
	constructor(message: string, public innerException: Error | undefined, public apiResponse: IApiErrorResponse) {
		super(message);
	}
}
