// TODO: Nexgen Convert
//	1. Global
//		1. Do I need to mount before first calc?  Better if run calc first then mount
//		1. Cheat sheet, calling template with and without source
//		1. Templates - make a v-ka-template that preprocesses to v-scope syntax
//		1. toFunction - don't support this
//		1. events ... look for '.modifier' like vue, keypress.enter , etc.
//		1. clear out errors on apiAsync
//		1. v-ka-input - pre-process and change from v-ka-input="iPhoneNumber" to v-scope="input({name: 'iPhoneNumber'})"
//			1. What else does v-ka-input do? during pre-process assign same attributes that mount does
//			1. What is accepted as input to v-ka-input attribute ... in line with input() component?
//		1. Convert all profiles to sep katapps
//			1. Make sure to 'mount' katapp so that if element removed it removes katapp
//		1. HelpTips
//			1. Get select, textarea, and checkbox with error/warnings to test
//			1. application.select('.checkbox label a[data-bs-toggle], .abc-checkbox label a[data-bs-toggle]', container) - > this can probably be inside main loop instead of another select
//		1. When to calculate? after keypress, if move mouse? on delay timer (current implementation)?, on blur?
//		1. Document CLEAR.KEY for api
//		1. Need onKatAppNotification?  Or just onHostNotification? - QnA/MakePayment
//
//	1. Nexgen.js
//		1. Added a global Savanna helper...but think for Vue I just code a custom v-ka-savanna directive and add during .update() method?
//		1. input.removeClass("is-invalid") - put that in core code to remove ? Or maybe remove validations from state ?
//		1. validationsEventHandler - This isn't enabled yet, might not be needed? If templates and what not just use properties of state.validations
//
//	1. Converting Views
//		1. rbl-config
//			1. Can't have calcengine attribute (or tab attributes), needs nested calc-engine elements
//			1. All templates should be NexgenVue:*
//		1. IIFE
//			1. Don't need reference to 'view'
//			1. Declare -> var application = KatApp.get('{id}');
//			1. Don't need 'manualInputs' in state, think we can just do application.state.inputs.iInputName = 1;
//			1. If application.updateOptions for 'handlers'...
//				1. Delete any handlers not in use
//				1. Change application.updateOptions to application.update
//
//		1. javascript handlers (via @/v-on syntax)
//			1. Can't use $(this) to get current element clicked, need to use $(e.currentTarget)
//
//		1. Event handlers:
//			1. All are .ka namespace now instead of .RBLe
//			1. Create App Life-Cycle
//				1. onInitialized( e: Event, application: KatApp )
//				1. onModalAppInitialized( e: Event, modalApplication: KatApp, hostApplication: KatApp )
//				1. onNestedAppInitialized( e: Event, nestedApplication: KatApp, hostApplication: KatApp )
//				1. onMounted( e: Event, application: KatApp )
//				1. Then do ConfigureUI calculation if any CEs are 'enabled'
//			1. Calculation Life-Cycle
//				1. onUpdateCalculationOptions( e: Event, options: IGetSubmitApiOptions, application: KatApp )
//				1. onCalculateStart( e: Event, options: IGetSubmitApiOptions, application: KatApp ): boolean
//				1. onInputsCache( e: Event, cachedInputs: ICalculationInputs, application: KatApp )
//				1. onResultsProcessing( e: Event, results: ITabDef[], inputs: ICalculationInputs, options: IGetSubmitApiOptions, application: KatApp)
//				1. onConfigureUICalculation( e: Event, lastCalculation: ILastCalculation, application: KatApp ) *only triggered if iConfigureUI=1
//				1. onCalculation( e: Event, lastCalculation: ILastCalculation, application: KatApp )
//				1. onCalculationErrors( e: Event, key: string, error: Error, application: KatApp ) *triggered any time an error occurs
//				1. onCalculateEnd( e: Event, application: KatApp )
//			1. Api Life-Cycle
//				1. onUpdateApiOptions( e: Event, endpoint: string, options: IGetSubmitApiOptions, application: KatApp )
//				1. onApiStart( e: Event, endpoint: string, triggerLink: JQuery | undefined, options: IApiOptions, application: KatApp ): boolean
//
//		1. Templates
//			1. All `rbl-template tid` should be `template id`
//			1. Calling template without rbl-source, <div rbl-tid="ad-doc-center"></div> -> <div v-scope="template('ad-doc-center')"></div>
//			1. If template is used with a 'source', then needs to have v-for="r in rows" inside template
//				<template id="benefit-cards">
//					<div class="col benefit-type" v-for="r in rows">
//
//		1. Search for rbl-
//			1. rbl-on
//				1. Just @event handlers, rbl-on="click:expandSavannaFAQ" -> @click="handlers.expandSavannaFAQ"
//				1. Passing params (usually instead of data-input-*) @click="handlers.foo($event, { iInputName: 'value' })"
//			1. rbl-value -> v-ka-value (probably same syntax)
//			1. rbl-navigate
//				1. rbl-navigate="common-documentcenter" -> v-ka-navigate="Common.DocumentCenter"
//				1. Navigate with prompt:
//					<a v-ka-navigate="{
//						view: 'About.Privacy',
//						confirm: {
//							content: 'Are you sure you want to leave?',
//							labels: {
//								cancel: 'OK, I\'ll Stay',
//								continue: 'Yes, I have things to do!'
//							}
//						}
//					}">Navigate to Privacy with confirm?</a>
//
//			1. rbl-if / rbl-display
//				1. <span rbl-if="v:{coveredCount}=0"> -> <span v-if="row.coveredCount == 0"> (use == instead of =)
//				1. <span rbl-display="v:{coveredCount}>0">You</span> -> <span v-if="row.coveredCount > 0">You</span>
//				1. rbl-if="exists(payments)" -> v-if="rbl.exists('payments')"
//
//			1. rbl-attr - just use :attr
//				1. rbl-attr="href:helpfulInfo.index.{index}['tel:' + row.providerPhone.replace(/-/g, '')]" ->
//					rbl.value -> value(table, keyValue, returnField, keyField, calcEngine, tab)
//					:href="'tel:' + rbl.value('helpfulInfo', row.index, 'providerPhone', 'index').replace(/-/g, '')"
//
//			1. rbl-source scenarios
//				1. rbl-source with named template
//					Before:
//					<div class="row row-cols-3" rbl-ce="BRD" rbl-source="configBenefitInfo" rbl-tid="benefit-cards">
//
//					After:
//					<div class="row row-cols-3">
//						<template v-scope="template('benefit-cards', rbl.source('configBenefitInfo', 'BRD'))">
//
//				1. rbl-source with content to be used when no table returned...
//					Before:
//					<div class="row row-cols-3" rbl-ce="BRD" rbl-source="configBenefitInfo" rbl-tid="benefit-cards">
//						<div class="alert alert-info"> No Benefit Contact Info </div>
//
//					After:
//					<div class="row row-cols-3">
//						<div v-if="rbl.source('configBenefitInfo', 'BRD').length == 0" class="alert alert-info">No Benefit Contact Info</div>
//						<template v-scope="template('benefit-cards', rbl.source('configBenefitInfo', 'BRD'))">
//
//				1. rbl-source with content to be used with rbl-prepend
//					Before:
//					<div class="row row-cols-3" rbl-ce="BRD" rbl-source="configBenefitInfo" rbl-tid="benefit-cards" rbl-prepend="before-preserve">
//						<div class="col rbl-preserve">
//
//					After:
//					<div class="row row-cols-3">
//						<template v-scope="template('benefit-cards', rbl.source('configBenefitInfo', 'BRD'))">
//						<div class="col">
//
//				1. rbl-source where you need a correct heirarchy of bootstrap classes (.col directly under .row), note scope inside template is just the 'row' so don't need 'prefix' before property names
//					Before:
//						<div class="row row-cols-3" rbl-ce="BRD" rbl-source="configBenefitInfo" rbl-tid="benefit-cards">
//
//						<rbl-template tid="benefit-cards">
//							<div class="col benefit-type">
//							</div>
//						</rbl-template>
//
//					After:
//						<div class="col benefit-type" v-for="r in rbl.source('configBenefitInfo', 'BRD')">
//							<template v-scope="template('benefit-cards', r)"></template>
//						</div>
//
//						<template id="benefit-cards">
//							<div class="card">
//							</div>
//						</template>
//
//				1. rbl-source with tid="inline"
//					Before:
//					<div class="row" rbl-ce="BRD" rbl-source="contentResourceLinks.selector.tools-highlighted">
//						<div class="col-12 col-md-6" rbl-tid="inline">
//
//					After:
//					<div class="row">
//						<div class="col-12 col-md-6" v-for="link in rbl.source('contentResourceLinks', 'BRD').filter( r => r.selector == 'tools-highlighted' )">
//
//					Values:
//						- Any use of {} to pull a column needs to come from v-for variable...class="fa-light {icon}" -> :class="['fa-light', link.icon]"
//						- Html..if item is possibly markup, use v-html, <span>{text}</span> -> <span v-html="text"></span>
//
//				1. rbl-source with tid="inline" with *multiple* children...
//					Before
//					<div rbl-ce="BRD" rbl-source="faqGroup">
//						<div rbl-tid="inline">
//							<h5 class="mt-2">{text}</h5>
//							<div class="col-12 col-md-12" rbl-ce="BRD" rbl-source="faqCategories.idGroup.{idGroup}">
//
//					After
//					<template v-for="group in rbl.source('faqGroup', 'BRD')">
//						<h5>...
//						<div>...
//
//				1. rbl-source with tid="empty"
//					Before
//						<div rbl-source="configBenefitCategories">
//							<div class="col" rbl-tid="inline">
//								... inline content
//							</div>
//							<div class="col" rbl-tid="empty">
//								<div class="alert alert-info">No previous elections or coverages on file.</div>
//							</div>
//						</div>
//
//					After (take item outside of v-for but use same source for check)
//						<div class="col" v-if="rbl.exists('configBenefitCategories')">
//							<div class="alert alert-info">No previous elections or coverages on file.</div>
//						</div>
//						<div class="col" v-for="row in rbl-source('configBenefitCategories')">
//							... template content
//						</div>
//
//				1. Calling rbl-source/rbl-tid where the tid expects a parent scope but it is hard coded...
//					Usually (notice-type1 expects a scope variable named 'type'):
//						<div v-for="type in rbl.source('typeMessage')">
//							<div v-scope="template('notice-type1', rbl.source('messages', 'Messages').filter( r => r.type == type.type ))"></div>
//						</div>
//
//					Before (template values were passed in via data-* instead of 'type' variable):
//						<div rbl-ce="Messages" rbl-source="messages[row['@id'] == 'hw-action-enroll' ]" rbl-tid="notice-type1" data-alerttype="danger" data-icon="fa-triangle-exclamation"  data-header="{text}"></div>
//
//					After: (note that I set a type and rows property, but the rows has to be get row() {} to make it reactive, b/c it renders when page is rendered *before* calc results so rbl.source.filter is empty...don't fully understand why I need getter yet)
//						<div v-scope="template('notice-type1', { type: { icon: 'fa-triangle-exclamation', text: '', alertType: 'danger' }, get rows() { return rbl.source('messages', 'Messages').filter( r => r['@id'] == 'hw-action-enroll' ); } })"></div>
//
//		1. Fix legacy issues...
//			1. skipRBLe -> rbl-nocalc
//			1. Hidden inputs (for state) need to use update({options: {inputs:{}}})
//				.update({
//					options: {
//						inputs: {
//							iAgeCommStart: "1",
//							iAlertType: "home",
//							iScenario: 1
//						}
//					}
//			1. <div class="ui-blocker"></div> -> <div v-if="uiBlocked" class="ui-blocker"></div>
//		1. <div class="row" v-scope="template('validation-summary')"></div>
//		1. apiActions
//			1. onAction* - different parameters
//			1. onUpdateEndpointOptions - called instead of onUpdateCalculationOptions - pain in but or just use one event?
//
//	1. Discuss
//		1. allowCalculation() method
//		1. Turning on and off configureUi calculation
//

// TODO: processResults items to finish
//	1. Manually process highcharts -> chartjs or apex?
//		1. Think 'contents' is required to discribe which charts to process ??  Convert to 'objects' so if I update it, chart rebuilds ? Or just manually set it ?
//	1. const updateData = function(): void {
//	1. const processDocGens = function (): void {

// TODO: Directives to code
//	1. v-ka-upload

// TODO: setInput/getInputValue Issues Remaining
//	1. Need to handle all diff input types here
//	1. Need to handle diff selectors (. or # prefix?)
//	1. Need to handle when querySelectorAll returns > 1?

// TODO: Standard template items/make automatically built in? ajax blocker
//	1. Ajax blocker ? Or UI just uses uiBlocked ? QnA seemed to use onInitializing and showAjax call, not sure calculating would be true when it needs to be ?
//	1. Valiation summary code/events? Or just update errors/warnings and let each app decide how to show?

// TODO: Decide on modules vs iife? Modules seems better/recommended practices, but iife and static methods support console debugging better

// TODO: Remove reference to jquery and just use vanilla js?
//	1. Currently, have to wrap application.select() in $() - $(application.select("")).on(...) since it is HTMLElement[], might change this
//	1. mountAsync issue with scripts in view
//		1. this.el.append() doesn't execute scripts
//		1. $(this.el).append() *does* execute scripts
//		1. https://stackoverflow.com/a/44902662/166231
//		1. Search for 'htmlelement append doesn't run script' if you want
//	1. If remove, search for $, JQuery., $.ajax in entire project - don't know how to replicate $.ajax() in vanilla yet
//	1. Should we make rule to not use it in kaml either? Probably not, just don't want to 'force' dependency if using our stuff
//	1. .triggerEvent() depends heavily on jquery
//	1. Make an 'on/off' method on my app that uses standard handlers? Are they automatically removed if element is removed? (note I have on/off methods for adding 'app events' right now)

// Hack to get bootstrap modals in bs5 working without having to bring in the types from bs5.
// If I brought in types of bs5, I had more compile errors that I didn't want to battle yet.
declare const bootstrap: any; // eslint-disable-line @typescript-eslint/no-explicit-any

class KatApp implements IKatApp {
	private static applications: KatApp[] = [];

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
			const el = key as Element;
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

	public static async createAppAsync(selector: string, options: IKatAppOptions): Promise<KatApp | undefined> {
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
	public lastCalculation?: ILastCalculation;
	public options: IKatAppOptions;
	public state: IApplicationData;

	public isCalculating: boolean;

	private vueApp?: PetiteVueApp;
	private viewTemplates?: string[];
	private mountedTemplates: IStringIndexer<boolean> = {};
	private el: JQuery;
	private isMounted = false;
	private updateOptions: IUpdateApplicationOptions | undefined;

	private calcEngines: ICalcEngine[] = [];
	private uiBlockCount = 0;

	private constructor(private selector: string, options: IKatAppOptions) {
		this.id = Utils.generateId();
		this.isCalculating = false;

		this.options = Utils.extend<IKatAppOptions>(
			{},
			{
				inputCaching: false,
				debug: {
					traceVerbosity: TraceVerbosity.None,
					showInspector: false,
					refreshCalcEngine: Utils.pageParameters["expireCE"] === "1",
					useTestCalcEngine: Utils.pageParameters["test"] === "1",
					useTestPlugin: Utils.pageParameters["testplugin"] === "1",
					useTestView: Utils.pageParameters["testview"] === "1",
					saveConfigureUiCalculationLocation: Utils.pageParameters["saveConfigureUI"],
					debugResourcesDomain: Utils.pageParameters["localserver"],
				},
				nextCalculation: {
					trace: false,
					expireCache: false,
					saveLocations: []
				},
				calculationUrl: "https://btr.lifeatworkportal.com/services/evolution/CalculationFunction.ashx",
				kamlRepositoryUrl: "https://btr.lifeatworkportal.com/services/evolution/CalculationFunction.ashx"
			} as IKatAppDefaultOptions,
			options
		);

		const selectorResults = options.modalAppOptions == undefined ? $(selector) : undefined;
		if (selectorResults != undefined && selectorResults.length != 1) {
			throw new Error("'selector' of '" + this.selector + "' did not match any elements.");
		}
		else if (selectorResults == undefined && options.modalAppOptions == undefined) {
			throw new Error("No 'selector' or 'modalAppOptions' were provided.");
		}

		this.el = selectorResults ?? this.createModalContainer();

		this.el.attr("ka-id", this.id);
		this.el.addClass("katapp-css");

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
				</style>";
			document.body.appendChild(kaResources);
		}

		const that = this;

		const getResultTableRows = function (table: string, calcEngine?: string, tab?: string) {
			const ce = calcEngine
				? that.calcEngines.find(c => c.key == calcEngine)
				: that.calcEngines[0];

			if (ce == undefined) {
				throw new Error(String.formatTokens("Can not find CalcEngine {ce} in rbl-config.", { ce: calcEngine }));
			}

			const tabName = tab ?? ce.resultTabs[0];

			if (ce.resultTabs.indexOf(tabName) == -1) {
				throw new Error(String.formatTokens("Can not find Tab {tab} for {ce} in rbl-config.", { ce: calcEngine, tab: tabName }));
			}

			const key = String.formatTokens("{ce}.{tab}", { ce: ce.key, tab: tabName });

			return that.state.rbl.results[key]?.[table] as Array<IStringIndexer<string>> ?? [];
		};

		const state = {
			kaId: this.id,
			options: this.options,

			uiBlocked: false,
			uiDirty: false,

			model: undefined,

			handlers: {},

			templateMounted: (templateId, el, mode, scope?) => {
				if (mode == "setup") {
					const oneTimeId = templateId + "_" + el.tagName;
					if (that.mountedTemplates[oneTimeId] != undefined) {
						el.remove();
						return;
					}
					that.mountedTemplates[oneTimeId] = true;
				}

				if (el.tagName == "SCRIPT") {
					new Function("_v", "_a", "_s", el.textContent + "\nif ( typeof mounted !== 'undefined' ) mounted( _v, _a, _s);")(that.el, that, scope);
					el.remove();
				}
				else if (el.tagName == "STYLE") {
					const thisClassCss = ".katapp-" + this.id;
					el.outerHTML =
						el.outerHTML
							.replace(/{thisClass}/g, thisClassCss)
							.replace(/\.thisClass/g, thisClassCss)
							.replace(/thisClass/g, thisClassCss)
							.replace(/thisVueClass/g, thisClassCss);
				}
			},
			templateUnmounted: (script, scope?) => {
				new Function("_v", "_a", "_s", script.textContent + "\nif ( typeof unmounted !== 'undefined' ) unmounted( _v, _a, _s);")(that.el, that, scope);
			},

			inputs: Utils.extend({}, this.options.inputs, this.getLocalStorageInputs()),
			errors: [],
			warnings: [],

			rbl: {
				results: {},

				pushTo(tabDef, table, rows, calcEngine, tab) {
					const t = (tabDef[table] ?? (tabDef[table] = [])) as Array<IStringIndexer<string>>;
					const toPush = rows instanceof Array ? rows : [rows];

					toPush.forEach((r, i) => r["@id"] = r["@id"] ?? "_pushId_" + (t.length + i));

					t.push(...toPush);
				},
				value(table, keyValue, returnField, keyField, calcEngine, tab) {
					if (arguments.length == 1) {
						keyValue = table;
						table = "rbl-value";
					}
					return getResultTableRows(table, calcEngine, tab)
						.find(r => r[keyField ?? "@id"] == keyValue)?.[returnField ?? "value"];
				},
				source(table, calcEngine, tab) {
					return getResultTableRows(table, calcEngine, tab);
				},
				exists(table, calcEngine, tab) {
					return getResultTableRows(table, calcEngine, tab).length > 0;
				}
			},

			components: {}
		} as IApplicationData;

		this.state = PetiteVue.reactive(state);
	}

	public update(options: IUpdateApplicationOptions): KatApp {
		if (this.isMounted) {
			throw new Error("You cannot call 'update' after the KatApp has been mounted.");
		}
		this.updateOptions = options;

		// Fluent api
		return this;
	}

	private async mountAsync(): Promise<void> {
		try {
			const viewElement = await this.getViewElementAsync();
			this.viewTemplates = viewElement != undefined
				? [...(await this.getViewTemplatesAsync(viewElement)), this.id].reverse()
				: [this.id];

			this.calcEngines = viewElement != undefined
				? Array.from(viewElement.querySelectorAll("rbl-config calc-engine")).map(c => {
					return {
						key: c.getAttribute("key") ?? "default",
						name: c.getAttribute("name") ?? "UNAVAILABLE",
						inputTab: c.getAttribute("input-tab") ?? "RBLInput",
						resultTabs: c.getAttribute("result-tabs")?.split(",") ?? ["RBLResult"],
						preCalcs: c.getAttribute("precalcs") ?? undefined, // getAttribute returned 'null' and I want undefined
						allowConfigureUi: c.getAttribute("configureUI") != "false",
						manualResult: false,
						enabled: true
					} as ICalcEngine;
				})
				: [];

			this.calcEngines.push(...this.toCalcEngines(this.options.manualResults as IRbleTabDef[]));

			if (this.options.manualResults != undefined) {
				this.toTabDefs(this.options.manualResults as IRbleTabDef[]).forEach(t => {
					Object.keys(t)
						.filter(k => !k.startsWith("@") && "_ka" != k)
						.forEach(k => this.copyTabDefToRblState(t._ka.calcEngineKey, t._ka.name, t, k));
				});
			}

			if (viewElement != undefined) {
				// Need to append() so script runs to call update() inside Kaml
				if (this.options.hostApplication != undefined && this.options.inputs?.iModalApplication == 1) {
					this.select(".modal-body").append(viewElement);
				}
				else {
					$(this.el).append(viewElement);
				}
			}

			Components.initializeCoreComponents(this, name => this.getTemplateId(name));

			this.state.model = this.updateOptions?.model;
			this.state.handlers = this.updateOptions?.handlers;

			if (this.updateOptions?.components != undefined) {
				for (const propertyName in this.updateOptions.components) {
					this.state.components[propertyName] = this.updateOptions.components[propertyName];
				}
			}
			if (this.updateOptions?.options?.modalAppOptions != undefined && this.state.inputs.iModalApplication == 1) {
				Utils.extend(this.options, { modalAppOptions: this.updateOptions.options.modalAppOptions });
			}
			if (this.updateOptions?.options?.inputs != undefined) {
				Utils.extend(this.state.inputs, this.updateOptions.options.inputs);
			}

			if (this.options.hostApplication != undefined && this.options.inputs?.iModalApplication == 1) {
				if (this.options.modalAppOptions?.buttonsTemplate != undefined) {
					this.select(".modal-footer-buttons button").remove();
					this.select(".modal-footer-buttons").attr("v-scope", "template('" + this.options.modalAppOptions.buttonsTemplate + "', {})");
				}

				this.options.hostApplication.triggerEvent("onModalAppInitialized", this);
			}
			else {
				if (this.options.hostApplication != undefined && this.options.inputs?.iNestedApplication == 1) {
					this.options.hostApplication.triggerEvent("onNestedAppInitialized", this);
				}
			}
			this.triggerEvent("onInitialized");

			const that = this;
			this.on("onCalculation.ka", function () {
				that.select("a[href='#']")
					.off("click.ka")
					.on("click.ka", function (e) {
						e.preventDefault();
					});
			})

			// Was thinking about moving the vueApp.mount() to *after* first calculation b/c we ran into issue of v-if="rbl.value('key').length > 1" throwing error
			// even though 'key' value was hard coded to be exported and we were surprised.  Problem is, on first mount, there are no calculation results so it
			// returned undefined.  But if I run calculation first before mounting, I'm worried about 'onCalculation' looking for elements it expects to be there
			// b/c of processing by Vue that wouldn't be there yet.

			this.vueApp = PetiteVue.createApp(this.state);

			Directives.initializeCoreDirectives(this.vueApp, this);

			if (this.updateOptions?.directives != undefined) {
				for (const propertyName in this.updateOptions.directives) {
					this.vueApp.directive(propertyName, this.updateOptions.directives[propertyName]);
				}
			}
			this.vueApp.mount(this.selector);
			this.isMounted = true;

			// Make sure everything is processed from vue before raising event to ensure onMounted code that looks for elements aren't missed
			await PetiteVue.nextTick();

			this.triggerEvent("onMounted");

			if (this.calcEngines.filter(c => c.allowConfigureUi).length > 0) {
				if (this.options.debug.saveConfigureUiCalculationLocation != undefined && this.calcEngines.find(c => !c.manualResult && c.allowConfigureUi) != undefined) {
					this.debugNext(this.options.debug.saveConfigureUiCalculationLocation);
				}

				await this.calculateAsync({ iConfigureUI: 1, iDataBind: 1 });
			}

			if (this.options.hostApplication != undefined && this.options.inputs?.iModalApplication == 1) {
				this.showModalApplication();
			}
			this.el.removeAttr("ka-cloak");

		} catch (ex) {
			if (ex instanceof KamlRepositoryError) {
				Utils.trace(
					this,
					"Error during resource download...\n" +
					ex.results.map(r =>
						String.formatTokens("  {resource}: {errorMessage}", { resource: r.resource, errorMessage: r.errorMessage })
					).join("\n"),
					TraceVerbosity.None
				);
			}

			throw ex;
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
				calculateOnConfirm: false
			},
			this.options.modalAppOptions
		);

		const labelCancel = options.labels!.cancel;
		const cssCancel = options.css!.cancel;
		const labelContinue = options.labels!.continue;
		const cssContinue = options.css!.continue;

		const modal = $(
			'<div v-scope class="modal fade kaModal" tabindex="-1" role="dialog" data-bs-backdrop="static">\
                <div class="modal-dialog">\
                    <div class="modal-content">\
                    <div class="modal-header d-none">\
                        <h5 class="modal-title"></h5>\
                        <button type="button" class="btn-close" aria-label="Close"></button>\
                    </div>\
                    <div class="modal-body"></div>\
                        <div class="modal-footer">\
							<div class="modal-footer-buttons d-none">\
								<button type="button" class="' + cssCancel + ' cancelButton" aria-hidden="true">' + labelCancel + '</button>\
								<button type="button" class="' + cssContinue + ' continueButton">' + labelContinue + '</button>\
	                        </div>\
                        </div>\
                    </div>\
                </div>\
            </div>');

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

		$("[ka-id]").first().after(modal);

		return modal;
    }

	private showModalApplication(): void {
		const modalBS5 = new bootstrap.Modal(this.el);

		const that = this;
		const closeModal = function () {
			modalBS5.hide();
			that.el.remove();
			KatApp.remove(that);
		}

		const options = this.options.modalAppOptions!;

		options.confirmed = async response => {
			closeModal();

			if (options.calculateOnConfirm != undefined) {
				const calculateOnConfirm = (typeof options.calculateOnConfirm == 'boolean') ? options.calculateOnConfirm : true;
				const calculationInputs = (typeof options.calculateOnConfirm == 'object') ? options.calculateOnConfirm : undefined;
				if (calculateOnConfirm) {
					await that.calculateAsync(calculationInputs);
				}
			}

			options.promise.resolve({ confirmed: true, response: response });
		};
		options.cancelled = response => {
			closeModal();
			options.promise.resolve({ confirmed: false, response: response });
		};

		const showCancel = options.showCancel ?? true;

		if (options.buttonsTemplate == undefined) {
			this.select('.modal-footer-buttons .continueButton').on("click.ka", function (e) {
				e.preventDefault();
				options.confirmed!();
			});

			if (!showCancel) {
				this.select('.modal-footer-buttons .cancelButton, .modal-header .btn-close').remove();
				this.el.attr("data-bs-keyboard", "false");
			}
			else {
				this.select('.modal-footer-buttons .cancelButton').on("click.ka", function (e) {
					e.preventDefault();
					options.cancelled!();
				});
			}
		}

		if (showCancel) {
			this.select('.modal-header .btn-close').on("click.ka", function (e) {
				e.preventDefault();
				options.cancelled!();
			});
			$(this.el).on("hidden.bs.modal", function () {
				// Triggered when ESC is clicked (when programmatically closed, this isn't triggered)
				options.cancelled!();
			});
		}

		this.select(".modal-footer-buttons").removeClass("d-none");

		modalBS5.show();

		if (options.triggerLink != undefined) {
			options.triggerLink.prop("disabled", false).removeClass("disabled kaModalInit");
			$("body").removeClass("kaModalInit kaModalInit");
		}
	}

	public on<TType extends string>(events: TType, handler: JQuery.TypeEventHandler<HTMLElement, undefined, HTMLElement, HTMLElement, TType> | false): KatApp {

		const kaEvents = events.split(" ").map(e => e.endsWith(".ka") ? e : e + ".ka").join(" ") as TType;
		$(this.el).on(kaEvents, handler);

		// Fluent api
		return this;
	}

	public off<TType extends string>(events: TType): KatApp {

		const kaEvents = events.split(" ").map(e => e.endsWith(".ka") ? e : e + ".ka").join(" ") as TType;
		$(this.el).off(kaEvents);

		// Fluent api
		return this;
	}

	public async calculateAsync(customInputs?: ICalculationInputs, processResults = true, calcEngines?: ICalcEngine[]): Promise<ITabDef[] | void> {
		const getSubmitApiConfigurationResults = this.getSubmitApiConfiguration(
			submitApiOptions => this.triggerEvent("onUpdateCalculationOptions", submitApiOptions),
			customInputs
		);
		const serviceUrl = /* this.options.registerDataWithService ? this.options.{what url should this be} : */ this.options.calculationUrl

		if (!processResults) {
			return this.toTabDefs(
				await Calculation.calculateAsync(
					serviceUrl,
					calcEngines ?? this.calcEngines,
					getSubmitApiConfigurationResults.inputs,
					getSubmitApiConfigurationResults.configuration as ISubmitApiConfiguration
				)
			);
		}
		else {
			this.isCalculating = true;
			this.blockUI();
			this.state.errors = [];
			this.state.warnings = [];
			this.lastCalculation = undefined;
			let isConfigureUICalculation = false;

			try {
				const inputs = getSubmitApiConfigurationResults.inputs;
				const submitApiConfiguration = getSubmitApiConfigurationResults.configuration as ISubmitApiConfiguration;
				isConfigureUICalculation = inputs.iConfigureUI === 1;

				const calcStartResult = this.triggerEvent("onCalculateStart", submitApiConfiguration) ?? true;
				if (!calcStartResult) {
					return;
				}

				const results = this.toTabDefs(
					await Calculation.calculateAsync(
						serviceUrl,
						inputs.iConfigureUI == 1
							? this.calcEngines.filter(c => c.allowConfigureUi)
							: this.calcEngines,
						inputs,
						submitApiConfiguration
					)
				);

				// Some Kaml's without a CE have manual results only.  They were processed one time during
				// mount since they theoretically never change.  However, onResultsProcessing injects some
				// rbl-values that need to be processed, so I make this dummy tabdef that should only affect
				// stuff if items are added.  Don't append manual results here b/c then all the reactive code
				// will get reassigned and processed.
				if (results.length == 0) {
					results.push({
						_ka: {
							calcEngineKey: "ResultProcessing",
							name: "RBLResult"
						}
					});
				}

				this.cacheInputs(inputs);

				this.triggerEvent("onResultsProcessing", results, inputs, submitApiConfiguration);

				this.processResults(results);

				this.lastCalculation = {
					inputs: inputs,
					results: results.filter(r => r._ka.calcEngineKey != "ResultProcessing"),
					configuration: submitApiConfiguration
				};

				await PetiteVue.nextTick(); // Need to make sure all VUE processing is handled

				if (isConfigureUICalculation) {
					this.triggerEvent("onConfigureUICalculation", this.lastCalculation);
				}
				this.triggerEvent("onCalculation", this.lastCalculation);
			}
			catch (error) {
				if (error instanceof CalculationError) {
					// TODO: Check exception.detail: result.startsWith("<!DOCTYPE") and show diff error?
					Utils.trace(
						this,
						"calculateAsync Exception: " + error.message + "\n" +
						error.failures.map(f =>
							String.formatTokens("  {ce}: {errorMessage}\n  Details: {details}\n  Stack:\n{stack}", { ce: f.calcEngine, errorMessage: f.exception.message, details: f.exception.detail, stack: f.exception.stackTrace.map(t => "    " + t).join("\n") })
						).join("\n"),
						TraceVerbosity.None
					);
				}
				else {
					Utils.trace(this, "calculateAsync Exception: " + (error as Error).message, TraceVerbosity.None);
				}

				this.triggerEvent("onCalculationErrors", "SubmitCalculation" + (isConfigureUICalculation ? ".ConfigureUI" : ""), error);
			}
			finally {
				this.triggerEvent("onCalculateEnd");
				delete this.state.inputs.iInputTrigger;
				this.unblockUI();
				this.isCalculating = false;
			}
		}
	}

	public async apiAsync(endpoint: string, apiOptions: IApiOptions, calculationSubmitApiConfiguration?: IGetSubmitApiOptions, trigger?: JQuery): Promise<IStringAnyIndexer | undefined> {
		const isDownload = apiOptions.isDownload ?? false;

		const xhr = new XMLHttpRequest();
		xhr.onreadystatechange = function (): void {
			// https://stackoverflow.com/a/29039823/166231
			if (xhr.readyState == 2) {
				if (isDownload && xhr.status == 200) {
					xhr.responseType = "blob";
				} else {
					// We are always returning json (binary/responseBinary) from our endpoints
					xhr.responseType = "json";
				}
			}
		};

		this.blockUI();
		this.state.errors = [];
		this.state.warnings = [];

		let successResponse: IStringAnyIndexer | Blob | undefined = undefined;
		let errorResponse: IApiResult | undefined = undefined;

		try {
			const url = this.getApiUrl(endpoint);

			const getSubmitApiConfigurationResults =
				calculationSubmitApiConfiguration ??
				this.getSubmitApiConfiguration(
					submitApiOptions => this.triggerEvent("onUpdateApiOptions", endpoint, submitApiOptions),
					apiOptions.calculationInputs
				);

			// const startResult = this.triggerEvent("onActionStart", endpoint, apiOptions, trigger);
			const startResult = this.triggerEvent("onApiStart", endpoint, trigger, apiOptions);
			if (typeof startResult == "boolean" && !startResult) {
				return undefined;
			}

			const calcEngine = this.calcEngines.find(c => !c.manualResult);

			const submitData: ISubmitApiData = {
				Inputs: Utils.clone(getSubmitApiConfigurationResults.inputs ?? {}, (k, v) => k == "tables" ? undefined : v),
				InputTables: getSubmitApiConfigurationResults.inputs.tables?.map(t => ({ Name: t.name, Rows: t.rows } as ISubmitCalculationInputTable)),
				Configuration: Utils.extend(
					Utils.clone(this.options, (k, v) => ["manualResults", "modalAppOptions", "relativePathTemplates", "handlers"].indexOf(k) > -1 ? undefined : v),
					apiOptions.calculationInputs != undefined ? { inputs: apiOptions.calculationInputs } : undefined,
					apiOptions.apiParameters != undefined ? { customParameters: apiOptions.apiParameters } : undefined,
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
						: undefined
				)
			};

			// Couldn't figure out how to model bind JObject or Dictionary, so hacking with this
			( submitData as IStringAnyIndexer )["inputTablesRaw"] = submitData.InputTables != undefined ? JSON.stringify(submitData.InputTables) : undefined;

			const formData = this.buildFormData(submitData);

			successResponse = await $.ajax({
				method: "POST",
				url: url,
				data: formData,
				contentType: false,
				processData: false,
				headers: { "Content-Type": undefined },/*
				beforeSend: function (_xhr, settings) {
					// Enable jquery to assign 'binary' results so I can grab later.
					(settings as IStringAnyIndexer)["responseFields"]["binary"] = "responseBinary";
				},*/
				xhr: function () { return xhr; }
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
				// this.triggerEvent("onActionResult", endpoint, successResponse, apiOptions, trigger);
				return successResponse as IStringAnyIndexer;
			}
		} catch (e) {
			errorResponse = xhr.response as IApiResult ?? {};

			this.state.errors = (errorResponse.Validations ?? []).map(v => ({ "@id": v.ID, text: v.Message }));
			if (this.state.errors.length == 0) {
				this.state.errors.push({ "@id": "System", text: "An unexpected error has occurred.  Please try again and if the problem persists, contact technical support." });
			}

			this.state.warnings = (errorResponse.ValidationWarnings ?? []).map(v => ({ "@id": v.ID, text: v.Message }));

			console.group("Unable to process " + endpoint);
			console.log(errorResponse);
			console.log(this.state.errors);
			console.groupEnd();

			// this.triggerEvent("onActionFailed", endpoint, errorResponse, apiOptions, trigger);

			throw new ApiError("Unable to complete API submitted to " + endpoint, e instanceof Error ? e : undefined, errorResponse);
		}
		finally {
			// this.triggerEvent("onActionComplete", endpoint, apiOptions, trigger);
			this.unblockUI();
		}
	}

	private downloadBlob(blob: Blob, filename: string): void {
		const tempEl = document.createElement("a");
		$(tempEl).addClass("d-none hidden");
		const url = window.URL.createObjectURL(blob);
		tempEl.href = url;
		tempEl.download = filename;
		tempEl.click();
		window.URL.revokeObjectURL(url);
	}

	private getApiUrl(endpoint: string): string {
		let url = "api/" + endpoint;
		const urlParts = this.options.calculationUrl.split("?");
		if (urlParts.length === 2) {
			url += (url.indexOf("?") > -1 ? "&" : "?") + urlParts[1];
		}
		return url;
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
						const createDictionary =
							formName == "Inputs" || formName == "Configuration[customInputs]" || formName == "Configuration[manualInputs]";

						if (key != "manualResults") {
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
		/*
		const useFormData = true; // Used to pass this in...but upload and apiAction both use 'FormData'

		if ( useFormData ) {
		}
		else {
			// Couldn't figure out how to model bind JObject or Dictionary, so hacking with this
		    
			// If I start using 'raw data' to submit, need to figure out how to make a 'key/value' dictionary like above
			if ( submitData.Inputs != undefined ) {
				submitData[ "inputsRaw" ] = JSON.stringify( submitData.Inputs );
			}
			if ( submitData.Configuration.manualInputs != undefined ) {
				submitData.Configuration[ "manualInputsRaw" ] = JSON.stringify( submitData.Configuration.manualInputs );
			}
			if ( submitData.Configuration[ "customInputs" ] != undefined ) {
				submitData.Configuration[ "customInputsRaw" ] = JSON.stringify( submitData.Configuration[ "customInputs" ] );
			}
			return submitData;
		}
		*/
	}

	public setInput(name: string, value: string | boolean | undefined, calculate = false) : JQuery {
		const input = document.querySelector("." + name) as HTMLInputElement;
		this.state.inputs[name] = input.value = value as string;

		if (calculate) {
			input.dispatchEvent(new Event('change'));
		}

		return $(input);
	}

	public getInputs(customInputs?: ICalculationInputs): ICalculationInputs {
		const inputs =
			Utils.extend<ICalculationInputs>({},
				this.state.inputs,
				customInputs
			);
		return inputs;
	}

	public closest(element: JQuery | HTMLElement, selector: string): JQuery {
		const context = element != undefined && !(element instanceof jQuery)
			? $(element)
			: element as JQuery;

		const c = context.closest(selector);
		const cAppId = c.attr("ka-id") || c.closest("[ka-id]").attr("ka-id");

		return cAppId == this.id ? c : $();
	}

	public select(selector: string, context?: JQuery | HTMLElement): JQuery {
		const container = context != undefined && !(context instanceof jQuery)
			? $(context)
			: context as JQuery ?? $(this.el);

		var appId = context == undefined
			? this.id
			: container.attr("ka-id") || container.parents("[ka-id]").attr("ka-id");

		return $(selector, container).filter(function () {
			// Sometimes have to select the child app to ask for inputs and selector will have rbl-app= in it, so allow
			return $(this).parents("[ka-id]").attr("ka-id") == appId;
		});
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

		if (templateId == undefined) {
			Utils.trace(this, "Invalid template id: " + name, TraceVerbosity.None);
		}

		return templateId;
	}

	public triggerEvent(eventName: string, ...args: (object | string | undefined | unknown)[]): boolean | string | ICalculationInputs | undefined {
		// If event is cancelled, return false;
		const eventArgs = [...args, this];

		try {
			// Make application.element[0] be 'this' in the event handler
			const delegateResult = (this.options as IStringAnyIndexer)[eventName]?.apply(this.el, eventArgs);

			if (delegateResult != undefined) {
				return delegateResult;
			}

		} catch (error) {
			Utils.trace(this, "Error calling " + eventName + ": " + error, TraceVerbosity.None);
			console.log({ error });
		}

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

			const eventResult = (event as JQuery.TriggeredEvent).result;
			if (event.isDefaultPrevented()) {
				return false;
			}

			return eventResult;

		} catch (error) {
			Utils.trace(this, "Error triggering " + eventName + ": " + error, TraceVerbosity.None);
			console.log({ error });
		}

		return true;
	}

	public debugNext(saveLocations?: string | boolean, serverSideOnly?: boolean, trace?: boolean, expireCache?: boolean ) {
		if (typeof (saveLocations) == "boolean") {
			if (!saveLocations) {
				this.options.nextCalculation.saveLocations = [];
			}
		}
		else if (( saveLocations ?? "" ) != "") {
			const locations = saveLocations!.split(",").map( l => l.trim() );

			this.options.nextCalculation.saveLocations = [
				...this.options.nextCalculation.saveLocations.filter(l => locations.indexOf(l.location) == -1),
				...locations.map(l => ({ location: l, serverSideOnly: serverSideOnly ?? false }))
			];

			this.options.nextCalculation.trace = trace ?? false;
			this.options.nextCalculation.expireCache = expireCache ?? false;
		}
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

	public processHelpTips(container?: JQuery, selector?: string): void {
		HelpTips.processHelpTips(this, container ?? this.el, selector);
	}

	public cloneOptions(includeManualResults: boolean): IKatAppOptions {
		return Utils.clone<IKatAppOptions>(this.options, (k, v) => ["handlers", "view", "content", "modalAppOptions", "hostApplication"].indexOf(k) > -1 || (!includeManualResults && k == "manualResults") ? undefined : v)
	}
		
	public async showModalAsync(options: IModalOptions, triggerLink?: JQuery): Promise<IModalResponse> {

		if (options.content == undefined && options.view == undefined) {
			throw new Error("You must provide content or viewId when using showModal.");
		}
		if ($(".kaModal").length > 0) {
			throw new Error("You can not use the showModalAsync method if you have markup on the page already containing the class kaModal.");
		}

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

			const modalAppOptions = Utils.extend<IKatAppOptions>(
				this.cloneOptions(options.content == undefined),
				{
					view: options.view,
					content: options.content,
					currentPage: options.view,
					hostApplication: this,
					modalAppOptions: Utils.extend({ promise: d, triggerLink: triggerLink }, Utils.clone(options, (k, v) => ["content", "view"].indexOf(k) > -1 ? undefined : v)),
					inputs: {
						iModalApplication: 1
					}
				},
				options.inputs != undefined ? { inputs: options.inputs } : undefined
			);
			delete modalAppOptions.inputs!.iNestedApplication;

			await KatApp.createAppAsync(".kaModal", modalAppOptions);

			return d;
		} catch (e) {
			if (triggerLink != undefined) {
				triggerLink.prop("disabled", false).removeClass("disabled kaModalInit");
				$("body").removeClass("kaModalInit kaModalInit");
			}

			throw e;
		}
	}

	private cacheInputs(inputs: ICalculationInputs) {
		if (this.options.inputCaching) {
			const inputCachingKey = "katapp:cachedInputs:" + this.options.currentPage + ":" + (this.options.userIdHash ?? "EveryOne");
			const cachedInputs = Utils.clone<ICalculationInputs>(inputs);
			this.triggerEvent("onInputsCache", cachedInputs);
			sessionStorage.setItem(inputCachingKey, JSON.stringify(cachedInputs));
		}
    }

	private getSubmitApiConfiguration(triggerEvent: (submitApiOptions: IGetSubmitApiOptions) => void, customInputs?: ICalculationInputs): IGetSubmitApiOptions {
		const submitApiOptions: IGetSubmitApiOptions = {
			inputs: Utils.extend(this.getInputs(customInputs), { tables: [] }),
			configuration: {}
		}
		
		triggerEvent(submitApiOptions);

		const currentOptions = this.options;

		return {
			inputs: submitApiOptions.inputs,
			configuration: Utils.extend<ISubmitApiConfiguration>(
				{
					Token: /* (currentOptions.registerDataWithService ?? true) ? currentOptions.registeredToken : */ undefined,
					TraceEnabled: (currentOptions.nextCalculation?.trace ?? false) ? 1 : 0,
					SaveCE: currentOptions.nextCalculation?.saveLocations.map(l => l.location).join("|") ?? "",
					RefreshCalcEngine: (currentOptions.nextCalculation?.expireCache ?? false) || (currentOptions.debug?.refreshCalcEngine ?? false),
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
				} as ISubmitApiConfiguration,
				submitApiOptions.configuration
			)
		} as IGetSubmitApiOptions;
	}

	private getCeName(name: string) {
		return name?.split(".")[0].replace("_Test", "") ?? "";
	}

	private toCalcEngines(manualResults: IRbleTabDef[] | undefined): ICalcEngine[] {
		if (manualResults == undefined) {
			return [];
		}

		const mrCalcEngineTabs: IStringIndexer<{ ceKey: string, tabs: string[] }> = {};

		(this.options.manualResults as IRbleTabDef[]).forEach(t => {
			const ceKey: string | undefined = t["@calcEngineKey"] as string;
			let ceName: string | undefined = t["@calcEngine"] as string;
			if (ceName == undefined) {
				ceName = t["@calcEngine"] = ceKey;
			}

			if (ceKey == undefined) {
				throw new Error("manualResults requires a @calcEngineKey attribute specified.");
			}

			ceName = this.getCeName(ceName);

			if (this.calcEngines.find(c => !c.manualResult && c.name.toLowerCase() == ceName!.toLowerCase()) != undefined) {
				// Can't have same CE in manual results as we do in normal results, so prefix with Manual
				ceName = t["@calcEngine"] = "Manual." + ceName;
			}

			if (mrCalcEngineTabs[ceName] == undefined) {
				mrCalcEngineTabs[ceName] = { ceKey: ceKey, tabs: [] };
			}

			let tabName: string | undefined = t["@name"] as string;
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

			mrCalcEngines.push( ce );
		}

		return mrCalcEngines;
	}

	private toTabDefs(rbleResults: IRbleTabDef[]): ITabDef[] {
		const calcEngines = this.calcEngines;
		const defaultCEKey = calcEngines[0].key;

		return rbleResults.map((t, i) => {
			const ceName = this.getCeName(t["@calcEngine"] as string);
			const configCe = calcEngines.find(c => c.name.toLowerCase() == ceName.toLowerCase());

			if (configCe == undefined) {
				/*
				// If they run a different CE than is configured via this event handler
				// the CalcEngine might not be in calcEngine options, so find will be 
				// undefined, just treat results as 'primary' CE
                .on("onCalculationOptions.ka", function (event, submitOptions, application) {
                    submitOptions.Configuration.CalcEngine = "Conduent_Nexgen_Profile_SE";
                })
				*/
				console.log("Unable to find calcEngine: " + ceName + ".  Determine if this should be supported.")
			}

			const ceKey = configCe?.key ?? defaultCEKey;
			const name = t["@name"] as string;

			const tabDef: ITabDef = {
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
							? [t[k] as IStringIndexer<string>]
							: t[k] as Array<IStringIndexer<string>>;
					}
				});

			return tabDef;
		});
	}
	
	private copyTabDefToRblState(ce: string, tab: string, t: ITabDef, propName: string) {
		const key = String.formatTokens("{ce}.{tab}", { ce: ce, tab: tab })
		if (this.state.rbl.results[key] == undefined) {
			this.state.rbl.results[key] = {};
		}

		const rows = t[propName] as Array<IStringIndexer<string>> ?? [];

		if (rows.length > 0) {
			// Make sure every row has every property that is returned in the *first* row of results...b/c RBL service doesn't export blanks after first row
			const firstRow = Utils.clone<IStringIndexer<string>>(rows[0], () => "");
			this.state.rbl.results[key][propName] = rows.map(r => Utils.extend({}, firstRow, r));
		}
		else {
			this.state.rbl.results[key][propName] = [];
		}
	};

	private mergeTableToRblState(ce: string, tab: string, table: Array<IStringIndexer<string>>, tableName: string) {
		const key = String.formatTokens("{ce}.{tab}", { ce: ce, tab: tab })
		if (this.state.rbl.results[key] == undefined) {
			this.state.rbl.results[key] = {};
		}
		if (this.state.rbl.results[key][tableName] == undefined) {
			this.state.rbl.results[key][tableName] = [];
		}

		table.forEach(s => {
			const index = this.state.rbl.results[key][tableName].findIndex(r => r["@id"] == s["@id"]);
			if (index > -1) {
				Utils.extend(this.state.rbl.results[key][tableName][index], s);
			}
			else {
				this.state.rbl.results[key][tableName].push(Utils.clone(s));
			}
		});
	};

	private processResults(results: ITabDef[]) {
		results.forEach(t => {
			["rbl-disabled", "rbl-display", "rbl-skip", "rbl-value", "rbl-listcontrol"].forEach(table => {
				if (t[table] != undefined) {
					this.mergeTableToRblState(t._ka.calcEngineKey, t._ka.name, t[table] as Array<IStringIndexer<string>>, table);
				}
			});

			(t["rbl-defaults"] as Array<IStringIndexer<string>> ?? []).forEach(r => {
				this.setInput(r["@id"], r["value"]);
			});

			(t["errors"] as Array<IStringIndexer<string>> ?? []).forEach(r => {
				this.state.errors.push(Utils.clone(r) as any as IValidation);
			});
			(t["warnings"] as Array<IStringIndexer<string>> ?? []).forEach(r => {
				this.state.warnings.push(Utils.clone(r) as any as IValidation);
			});

			// If table control says they want to export, but no rows are returned, then need to re-assign to empty array
			(t["table-output-control"] as Array<IStringIndexer<string>> ?? []).forEach(r => {
				if (r["export"] == "1" && t[r["@id"]] == undefined ) {
					this.copyTabDefToRblState(t._ka.calcEngineKey, t._ka.name, t, r["@id"]);
				}
			});

			Object.keys(t)
				.filter(k => !k.startsWith("@") && ["_ka", "rbl-disabled", "rbl-display", "rbl-skip", "rbl-value", "rbl-listcontrol"].indexOf( k ) == -1 )
				.forEach(k => this.copyTabDefToRblState(t._ka.calcEngineKey, t._ka.name, t, k));
		});
	}

	private async getViewElementAsync(): Promise<HTMLElement | undefined> {
		const viewElement: HTMLElement = document.createElement("div");
		const thisClassCss = ".katapp-" + this.id;
		viewElement.classList.add(thisClassCss.substring(1));

		if ((this.options.modalAppOptions != undefined || this.options.inputs?.iNestedApplication == 1) && this.options.view != undefined ) {
			const view = this.options.view;

			const url = this.getApiUrl( "rble/verify-katapp?applicationId=" + view );

			try {
				const response = await $.ajax({ method: "GET", url: url, dataType: "json" }) as IModalAppVerifyResult;

				Utils.extend( this.options, { view: response.path, currentPath: view } );

				if (response.manualInputs != undefined) {
					Utils.extend(this.state.inputs, response.manualInputs);
				}
			} catch (e) {
				Utils.trace(this, "Error verifying KatApp " + view, TraceVerbosity.None);
			}
		}

		if (this.options.view != undefined) {
			const viewResource = await KamlRepository.getViewResourceAsync(this.options, this.options.view);

			const viewContent =
				viewResource[this.options.view]
					.replace(/{thisView}/g, "[ka-id='" + this.id + "']")
					.replace(/{id}/g, this.id)
					.replace(/{thisClass}/g, thisClassCss)
					.replace(/\.thisClass/g, thisClassCss)
					.replace(/thisClass/g, thisClassCss);

			viewElement.innerHTML = viewContent;

			if (viewElement.querySelectorAll("rbl-config").length !== 1) {
				throw new Error("View " + this.options.view + " is missing rbl-config element");
			}

			this.processKamlMarkup(viewElement, this.id);
		}
		else if (this.options.content != undefined) {
			viewElement.innerHTML = this.options.content;
		}
		else {
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

	private getLocalStorageInputs(): ICalculationInputs {
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

		const localStorageInputs = Utils.extend<ICalculationInputs>({}, cachedInputs, oneTimeInputs, persistedInputs);

		return localStorageInputs;
	}

	private processKamlMarkup(kaml: Element, resourceKey: string): void {
		const kaResources = document.querySelector("ka-resources")!;
		const processingTemplates = resourceKey != this.id;

		const toFunction = (exp: string): Function => {
			try {
				return new Function(`return(${exp})`);
			} catch (e) {
				console.error(`${(e as Error).message} in expression: ${exp}`)
				throw e;
			}
		};

		// Put all <style> blocks into markup
		if (processingTemplates) {
			kaml.querySelectorAll<HTMLStyleElement>("style").forEach(s => kaResources.appendChild(s));
		}

		const compileMarkup = function (container: Element | DocumentFragment) {
			let compileError = false;
			container.querySelectorAll("[v-for][v-if]").forEach(invalid => {
				console.log(invalid);
				compileError = true;
			});
			if (compileError) {
				throw new Error("v-for and v-if on same element.  The v-for should be moved to a child <template v-for/> element.");
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
			container.querySelectorAll("[v-ka-input]").forEach(inputComponent => {
				let scope = inputComponent.getAttribute("v-ka-input")!;
				if (!scope.startsWith("{")) {
					scope = `{ name: '${scope}' }`;
				}
				inputComponent.removeAttribute("v-ka-input");
				inputComponent.setAttribute("v-scope", `components.input(${scope})`);
			});

			// Turn v-ka-input-group into v-scope="components.inputGroup({})"
			container.querySelectorAll("[v-ka-input-group]").forEach(inputComponent => {
				const scope = inputComponent.getAttribute("v-ka-input-group")!;
				inputComponent.removeAttribute("v-ka-input-group");
				inputComponent.setAttribute("v-scope", `components.inputGroup(${scope})`);
			});

			// Turn v-ka-template="templateId, scope" into v-scope="components.template(templateId, scope)"
			container.querySelectorAll("[v-ka-template]").forEach(inputComponent => {
				let scope = inputComponent.getAttribute("v-ka-template")!;
				if (!scope.startsWith("{")) {
					scope = `{ name: '${scope}' }`;
				}

				inputComponent.removeAttribute("v-ka-template");
				inputComponent.setAttribute("v-scope", `components.template(${scope})`);
			});

			// Set mount/unmount in 'InputComponent' items outside of templates
			container.querySelectorAll("[v-scope^='input(']").forEach(inputComponent => {
				inputComponent.setAttribute("v-on:vue:mounted", "mounted($el)");
				// inputComponent.setAttribute("v-on:vue:unmounted", "unmounted($el)");
			});
		}

		compileMarkup(kaml);

		// Update template ids and move them to ka-resources
		kaml.querySelectorAll<HTMLTemplateElement>("template[id]")
			.forEach(el => {
				compileMarkup(el.content);

				const keyParts = resourceKey.split(":"); // In case "Rel:"
				const containerId = keyParts[keyParts.length - 1].split("?")[0]; // Cache buster
				el.id = String.formatTokens("{id}_{containerId}", { id: el.id, containerId: containerId });

				// Setup a mount event that will put style into markup if this template is ever used
				el.content.querySelectorAll("style").forEach(style => {
					style.setAttribute("v-on:vue:mounted", "templateMounted('" + el.id + "', $el, 'setup')");
				});

				// If this is an 'input template', need attach mounted/unmounted events on all 'inputs'
				if (el.hasAttribute("input")) {
					el.content.querySelectorAll("input, select, textarea").forEach(script => {
						script.setAttribute("v-on:vue:mounted", "mounted($el)");
						// script.setAttribute("v-on:vue:unmounted", "unmounted($el)");
					});

					// Also automatically setup helptips again...
					el.content.querySelectorAll("[v-if]").forEach(ifDir => {
						if (ifDir.querySelector("[data-bs-toggle='tooltip'], [data-bs-toggle='popover']") != undefined) {
							ifDir.setAttribute("v-on:vue:mounted", "KatApp.get($el).processHelpTips($($el))");
						}
					});

					el.removeAttribute("input");
				}

				// Setup mount events for all script elements to run appropriately if this template is used
				el.content.querySelectorAll("script").forEach(script => {
					let mode = "mount";
					if (script.hasAttribute("setup")) {
						mode = "setup";
						script.removeAttribute("setup");
					}

					// Third parameter is 'scope', but I'm not sure that is every going to be needed, but maybe
					// think about supporting a 'scope="{}"' attribute on script where it would be grabbing info
					// from 'current scope' and passing it into this templates mount function, then remove scope attribute
					script.setAttribute("v-on:vue:mounted", "templateMounted('" + el.id + "', $el, '" + mode + "')");
					script.setAttribute("v-on:vue:unmounted", "templateUnmounted($el)");
				});

				kaResources.appendChild(el);
			});
	}
}