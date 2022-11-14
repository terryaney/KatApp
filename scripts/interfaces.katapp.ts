enum TraceVerbosity {
	None,
	Quiet,
	Minimal,
	Normal,
	Detailed,
	Diagnostic
}

interface IKatAppDefaultOptions {
	calculationUrl: string;
	kamlRepositoryUrl: string;

	debug: {
		traceVerbosity: TraceVerbosity;
		refreshCalcEngine: boolean; // expireCE=1 querystring
		useTestCalcEngine: boolean; // test=1 querystring
		useTestView: boolean; // testView=1 querystring
		showInspector: boolean; // showInspector=1 querystring
		debugResourcesDomain?: string; // localserver=localhost:8887 querystring
	};

	// Not really used yet, no one setting to 'true', only defaults to false
	inputCaching: boolean; // Whether or not inputs are cached to/restored from LocalStorage
}

interface IKatAppOptions extends IKatAppDefaultOptions {
	// Only missing when showModalAsync called 'createAppAsync' and modal was built with 'content' instead of a view
	view?: string;
	// Only present when showModalAsync called 'createAppAsync' and modal was built with 'content' instead of a view
	content?: string;

	currentPage: string;
	userIdHash?: string; // User ID hashed to be used in different caching scenarios
	environment?: string;
	requestIP?: string;
	currentUICulture?: string;

	inputs?: ICalculationInputs;
	manualResults?: IManualTabDef[];
	manualResultsEndpoint?: string;
	relativePathTemplates?: IStringIndexer<string>;

	onKatAppNavigate?: (id: string, props: IModalOptions, el: HTMLElement) => void;

	// Set by framework when nested/modal app
	modalAppOptions?: IModalAppOptions;
	hostApplication?: IKatApp;
}

interface IManualTabDef extends IStringIndexer<string | undefined | ITabDefTable> {
	"@calcEngineKey": string;
	"@name": string | undefined;
}

interface ITabDef extends IStringIndexer<ITabDefTable> {
}
interface ITabDefTable extends Array<ITabDefRow> { };
interface ITabDefRow extends IStringIndexer<string> { };
interface ITabDefRblInputRow extends IStringIndexer<string | undefined> { };

interface KatApp {
	createAppAsync(selector: string, options: IKatAppOptions): Promise<KatApp>;
	get(key: string | number | Element): KatApp | undefined;
}

interface IKatApp {
	el: JQuery;
	options: IKatAppOptions;
	isCalculating: boolean;
	lastCalculation?: ILastCalculation;
	state: IApplicationData;
	selector: string;

	update(options: IUpdateApplicationOptions): IKatApp;
	on<TType extends string>(events: TType, handler: JQuery.TypeEventHandler<HTMLElement, undefined, HTMLElement, HTMLElement, TType> | false): KatApp;
	off<TType extends string>(events: TType): KatApp;

	calculateAsync(customInputs?: ICalculationInputs, processResults?: boolean, calcEngines?: ICalcEngine[]): Promise<ITabDef[] | void>;
	apiAsync(endpoint: string, apiOptions: IApiOptions, calculationSubmitApiConfiguration?: IGetSubmitApiOptions, trigger?: JQuery): Promise<IStringAnyIndexer | undefined>;
	showModalAsync(options: IModalOptions, triggerLink?: JQuery): Promise<IModalResponse>;

	blockUI(): void;
	unblockUI(): void;
	allowCalculation(ceKey: string, enabled: boolean): void;

	getInputs(customInputs?: ICalculationInputs): ICalculationInputs;
	getInputValue(name: string, allowDisabled?: boolean): string | undefined;
	setInputValue(name: string, value: string | undefined, calculate?: boolean): JQuery | undefined;

	select<T extends HTMLElement>(selector: string, context?: JQuery | HTMLElement | undefined): JQuery<T>;
	closest(element: JQuery | HTMLElement, selector: string): JQuery;

	notifyAsync(from: KatApp, name: string, information?: IStringAnyIndexer): Promise<void>;
	triggerEventAsync(eventName: string, ...args: (object | string | undefined | unknown)[]): Promise<boolean | undefined>;

	debugNext(saveLocations?: string | boolean, serverSideOnly?: boolean, trace?: boolean, expireCache?: boolean): void;

	getTemplateContent(name: string): DocumentFragment;
}

interface IUpdateApplicationOptions {
	model?: any;
	options?: {
		modalAppOptions?: IModalAppOptions;
		inputs?: ICalculationInputs;
	}
	handlers?: IStringAnyIndexer;
	components?: IStringAnyIndexer;
	directives?: IStringIndexer<(ctx: DirectiveContext<Element>) => (() => void) | void>;
}

interface ICalculationInputs extends IStringAnyIndexer {
	iConfigureUI?: number;
	iDataBind?: number;
	iInputTrigger?: string;
	iNestedApplication?: number;
	iModalApplication?: number;
	tables?: ICalculationInputTable[];
}

interface IApplicationData {
	kaId: string;
	application: IKatApp;
	// Don't think I need this
	// options: IKatAppOptions;
	uiBlocked: boolean;
	needsCalculation: boolean; // True when input not 'skipped' has been edited but has not triggered a calculation yet

	model?: any;

	handlers?: IStringAnyIndexer;

	// Private...
	_inspectors: IStringIndexer<number>;
	_inspectorMounted: (el: Element, inspectorCommentId: string) => void;
	_domElementMounted: (el: HTMLElement) => void;
	_templateItemMounted: (templateId: string, el: Element, scope?: any) => void;
	_templateItemUnmounted: (templateId: string, el: Element, scope?: any) => void;

	components: IStringIndexer<IStringAnyIndexer>;

	inputs: ICalculationInputs;
	errors: IValidation[];
	warnings: IValidation[];

	rbl: IRblApplicationData;
}
interface IValidation {
	"@id": string;
	text: string;
}

interface IRblApplicationData {
	results: IStringIndexer<IStringIndexer<Array<ITabDefRow>>>;

	source: <T extends ITabDefRow>(table: string, calcEngine?: string, tab?: string, predicate?: (row: T) => boolean) => Array<T>;
	exists: <T extends ITabDefRow>(table: string, calcEngine?: string, tab?: string, predicate?: (row: T) => boolean) => boolean;
	value: (table: string, keyValue: string, returnField?: string, keyField?: string, calcEngine?: string, tab?: string) => string | undefined;
	boolean: (table: string, keyValue: string, returnField?: string, keyField?: string, calcEngine?: string, tab?: string, valueWhenMissing?: boolean) => boolean;

	onAll: (...values: Array<undefined | string | number>) => boolean;
	onAny: (...values: Array<undefined | string | number>) => boolean;

	pushTo: (tabDef: ITabDef, table: string, rows: ITabDefRow | Array<ITabDefRow>, calcEngine?: string, tab?: string) => void;
}


// Event parameter interfaces
interface IGetSubmitApiOptions {
	inputs: ICalculationInputs,
	configuration: IStringIndexer<string>;
}

interface ILastCalculation {
	inputs: ICalculationInputs;
	results: ITabDef[];
	configuration: ISubmitApiConfiguration;
}


interface IModalOptions {
	view?: string;
	content?: string;
	contentSelector?: string;
	calculateOnConfirm?: boolean | ICalculationInputs;

	labels?: {
		title?: string;
		cancel?: string;
		continue?: string;
	};
	css?: {
		cancel?: string;
		continue?: string;
	};
	size?: "xl" | "lg" | "md" | "sm";
	scrollable?: boolean;
	showCancel?: boolean;
	buttonsTemplate?: string;
	headerTemplate?: string;

	inputs?: ICalculationInputs;
}
interface IModalAppOptions extends IModalOptions {
	promise: JQuery.Deferred<IModalResponse>;

	// These methods are used when the modal needs to return more than just true/false to the caller
	// in conjunction with creating their own toolbar
	confirmedAsync?: (response?: any) => Promise<void>;
	cancelled?: (response?: any) => void;
	triggerLink?: JQuery;

	// If a dialog does its own buttons and is a 'step' based dialog and at the final step hides all but 'ok', the 'X' at the top of the dialog needs to trigger 'confirm' as well.
	closeButtonTrigger?: string; 
}
interface IModalResponse {
	confirmed: boolean;
	response: any;
}


interface IApiOptions {
	calculationInputs?: ICalculationInputs;
	apiParameters?: IStringAnyIndexer;
	isDownload?: boolean;
	calculateOnSuccess?: boolean | ICalculationInputs
	files?: FileList | null;
}
interface IApiErrorResponse {
	Validations: { ID: string, Message: string }[] | undefined;
	ValidationWarnings: { ID: string, Message: string }[] | undefined;
	Result: IStringAnyIndexer;
}


// Directive Options
interface IKaNavigateModel {
	view: string;
	confirm?: IModalOptions;
	inputs?: ICalculationInputs;
	ceInputs?: string;
	persistInputs?: boolean;
	model?: string;
}
interface IKaModalModel extends IModalOptions {
	confirmed?: (response: any | undefined, application: KatApp) => void;
	cancelled?: (response: any | undefined, application: KatApp) => void;
	catch?: (e: any | undefined, application: KatApp) => void;
	model?: string;
}
interface IKaAppModel {
	selector?: string;
	view: string;
	inputs?: ICalculationInputs;
}
interface IKaApiModel extends IApiOptions {
	endpoint: string;
	then?: (response: IStringAnyIndexer | undefined, application: KatApp) => void;
	catch?: (e: any | undefined, application: KatApp) => void;
	confirm?: IModalOptions;
}
interface IKaHighchartModel {
	data: string;
	options?: string;
	ce?: string;
	tab?: string;
}
interface IKaTableModel {
	name: string;
	css?: string;
	ce?: string;
	tab?: string;
}
interface IKaInputModel {
	name: string;
	clearOnUnmount?: boolean;

	type?: string;
	value?: string;
	label?: string;
	placeHolder?: string;
	hideLabel?: boolean;
	help?: IKaInputModelHelp;
	iconHtml?: string;
	list?: Array<IKaInputModelListRow>;
	css?: IKaInputScopeCss;
	prefix?: string;
	suffix?: string;
	maxLength?: number;
	displayFormat?: string;
	mask?: string;

	min?: number | string;
	max?: number | string;
	step?: number;

	uploadEndpoint?: string;

	ce?: string;
	tab?: string;

	template?: string;

	isNoCalc?: (base: IKaInputScopeBase) => boolean;
	isDisabled?: (base: IKaInputScopeBase) => boolean;
	isDisplay?: (base: IKaInputScopeBase) => boolean;

	events?: IStringIndexer<((e: Event, application: KatApp) => void)>
}
interface IKaInputModelHelp {
	title?: string;
	content?: string;
	width?: number;
}
interface IKaInputModelListRow extends ITabDefRow { key: string; text: string; }

interface IKaInputScope {
	$template: string | undefined; // from markup

	readonly id: string; // generated
	readonly name: string; // from markup
	readonly type: string; // from markup
	readonly value: string; // from ce ?? markup

	readonly disabled: boolean; // from isDisabled ?? ce
	readonly display: boolean; // from isDisplay ?? ce
	readonly noCalc: boolean; // from isNoCalc ?? ce

	readonly label: string; // from ce ?? markup
	readonly hideLabel: boolean; // from ce (value=-1) ?? markup
	readonly placeHolder: string | undefined; // from ce ?? markup
	readonly iconHtml: string; // from markup

	readonly help: IKaInputScopeHelp; // from ce ?? markup
	readonly css: IKaInputScopeCss; // from markup

	readonly list: Array<IKaInputModelListRow>; // from ce ?? markup
	readonly prefix: string | undefined; // from ce ?? markup
	readonly suffix: string | undefined; // from ce ?? markup
	readonly maxLength: number; // from ce ?? markup
	readonly min: string; // from ce ?? markup
	readonly max: string; // from ce ?? markup
	readonly step: number; // from ce ?? markup

	readonly error: string | undefined; // from ce
	readonly warning: string | undefined; // from ce 

	uploadAsync: () => void;
	inputMounted: (input: HTMLInputElement, refs: IStringIndexer<HTMLElement>) => void;
	inputUnmounted: (input: HTMLInputElement) => void;
}
interface IKaInputScopeBase {
	readonly display: boolean;
	readonly noCalc: boolean;
	readonly disabled: boolean;
	readonly error: string | undefined;
	readonly warning: string | undefined;
}
interface IKaInputScopeHelp {
	readonly title: string;
	readonly content?: string;
	readonly width: string;
}
interface IKaInputScopeCss {
	readonly input: string;
	readonly container: string | undefined;
}

interface IKaInputGroupModel {
	names: string[];
	type: string;
	clearOnUnmount?: boolean;

	values?: string[];
	labels?: string[];
	placeHolders?: string[];
	hideLabels?: boolean[];
	helps?: IKaInputModelHelp[]
	css?: IKaInputScopeCss[];
	displayFormats?: string[];
	masks?: string[];

	maxLengths?: number[];
	mins?: string[];
	maxes?: string[];
	steps?: number[];
	prefixes?: string[];
	suffixes?: string[];

	ce?: string;
	tab?: string;

	template: string;

	isNoCalc?: (index: number, base: IKaInputGroupModelBase) => boolean;
	isDisabled?: (index: number, base: IKaInputGroupModelBase) => boolean;
	isDisplay?: (index: number, base: IKaInputGroupModelBase) => boolean;

	events?: IStringIndexer<((e: Event, application: KatApp) => void)>
}
interface IKaInputGroupScope {
	readonly $template: string | undefined; // from markup
	readonly type: string; // from markup

	id: ( index: number ) => string; // generated
	name: ( index: number ) => string; // from markup
	value: ( index: number ) => string; // from ce ?? markup

	disabled: ( index: number ) => boolean; // from isDisabled ?? ce
	display: ( index: number ) => boolean; // from isDisplay ?? ce
	noCalc: ( index: number ) => boolean; // from isNoCalc ?? ce

	label: (index: number) => string; // from ce ?? markup
	hideLabel: (index: number) => boolean; // from ce ?? markup
	placeHolder: (index: number) => string | undefined; // from ce ?? markup

	help: (index: number) => IKaInputScopeHelp; // from ce ?? markup
	css: (index: number) => IKaInputScopeCss; // from markup

	list: (index: number) => Array<IKaInputModelListRow>; // from ce ?? markup
	prefix: (index: number) => string | undefined; // from ce ?? markup
	suffix: (index: number) => string | undefined; // from ce ?? markup
	maxLength: (index: number) => number | undefined; // from ce ?? markup
	min: (index: number) => string | undefined; // from ce ?? markup
	max: (index: number) => string | undefined; // from ce ?? markup
	step: (index: number) => number | undefined; // from ce ?? markup

	error: ( index: number ) => string | undefined;
	warning: (index: number) => string | undefined;

	inputMounted: (input: HTMLInputElement, refs: IStringIndexer<HTMLElement>) => void;
	inputUnmounted: (input: HTMLInputElement) => void;
}
interface IKaInputGroupScopeBase {
	display: ( index: number ) => boolean;
	noCalc: (index: number) => boolean;
	disabled: (index: number) => boolean;
	error: (index: number) => string | undefined;
	warning: (index: number) => string | undefined;
}
interface IKaInputGroupModelBase {
	display: (index: number) => boolean;
	noCalc: (index: number) => boolean;
	disabled: (index: number) => boolean;
}