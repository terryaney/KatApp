enum TraceVerbosity {
	None,
	Quiet,
	Minimal,
	Normal,
	Detailed,
	Diagnostic
}

interface IKatAppComponent {
	(name: string, props?: IStringAnyIndexer): IStringAnyIndexer;
}

interface IKatApp {
	el: JQuery;
	options: IKatAppOptions;
	triggerEventAsync: (eventName: string, ...args: (object | string | undefined | unknown)[]) => Promise<boolean | undefined>;
	getTemplateId(name: string): string | undefined;
}

interface IApplicationData {
	kaId: string;
	application: IKatApp;
	options: IKatAppOptions;
	uiBlocked: boolean;
	needsCalculation: boolean; // True when input not 'skipped' has been edited but has not triggered a calculation yet

	model?: any;

	handlers?: IStringAnyIndexer;

	// Private...
	_templateItemMounted: (templateId: string, el: Element, mode: string, scope?: any) => void;
	_templateItemUnmounted: (el: Element, scope?: any) => void;

	components: IStringIndexer<IStringAnyIndexer>;

	inputs: ICalculationInputs;
	errors: IValidation[];
	warnings: IValidation[];

	rbl: {
		results: ICalculationResults;

		source: (table: string, calcEngine?: string, tab?: string, predicate?: (row: IStringIndexer<string>) => boolean) => Array<IStringIndexer<string>>;
		exists: (table: string, calcEngine?: string, tab?: string, predicate?: (row: IStringIndexer<string>) => boolean ) => boolean;
		value: (table: string, keyValue: string, returnField?: string, keyField?: string, calcEngine?: string, tab?: string) => string | undefined;
		boolean: (table: string, keyValue: string, returnField?: string, keyField?: string, calcEngine?: string, tab?: string) => boolean;

		onAll: (...values: any[]) => boolean;
		onAny: (...values: any[]) => boolean;

		pushTo: (tabDef: ITabDef, table: string, rows: IStringIndexer<string> | Array<IStringIndexer<string>>, calcEngine?: string, tab?: string) => void;
	}
}

interface IGetSubmitApiOptions {
	inputs: ICalculationInputs,
	configuration: IStringIndexer<string> | ISubmitApiConfiguration;
}
interface ISubmitApiConfiguration {
	// Used only in submit for session based calcs
	Token?: string;
	Comment?: string; // currently never passed
	TestCE: boolean;
	TraceEnabled: number;
	SaveCE: string;
	AuthID: string; // used in non-session version, when options has a 'data' property of json formatted xds data
	Client: string;
	AdminAuthID: string | undefined;
	RefreshCalcEngine: boolean;
	CurrentPage: string;
	RequestIP: string;
	CurrentUICulture: string;
	Environment: string;
	Framework: string;
}

interface ICalculationResults extends IStringIndexer<ICalculationResult> { }
interface ICalculationResult extends IStringIndexer<Array<IStringIndexer<string>>> { }

interface IValidation {
	"@id": string;
	text: string;
}

interface IKatAppDefaultOptions {
	inputCaching: boolean; // Whether or not inputs are cached to/restored from LocalStorage
	debug: {
		traceVerbosity: TraceVerbosity;
		refreshCalcEngine: boolean; // expireCE=1 querystring
		useTestCalcEngine: boolean; // test=1 querystring
		useTestView: boolean; // testView=1 querystring
		showInspector: boolean; // showInspector=1 querystring
		debugResourcesDomain?: string; // localserver=localhost:8887 querystring
		saveConfigureUiCalculationLocation?: string;
	};
	calculationUrl: string;
	kamlRepositoryUrl: string;
}

interface INextCalculation {
	saveLocations: { location: string, serverSideOnly: boolean }[];
	expireCache: boolean;
	trace: boolean;
}

interface IKatAppOptions extends IKatAppDefaultOptions {
	currentPage: string;
	requestIP?: string;
	environment?: string;
	currentUICulture?: string;

	userIdHash?: string; // User ID hashed to be used in different caching scenarios

	inputs?: ICalculationInputs;
	manualResults?: IRbleTabDef[] | undefined;

	view?: string;
	content?: string;

	modalAppOptions?: IModalAppOptions;
	hostApplication?: IKatApp;

	relativePathTemplates?: IStringIndexer<string>;
	handlers?: {};
}

interface IModalResponse {
	confirmed: boolean;
	response: any;
}

interface IModalAppOptions extends IModalOptions {
	promise: JQuery.Deferred<IModalResponse>;

	// These methods are used when the modal needs to return more than just true/false to the caller
	// in conjunction with creating their own toolbar
	confirmedAsync?: (response?: any) => Promise<void>;
	cancelled?: (response?: any) => void;
	triggerLink?: JQuery;
}

interface IModalOptions {
	view?: string;
	content?: string;
	contentSelector?: string;
	calculateOnConfirm?: ICalculationInputs | boolean;

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

	showCancel?: boolean;
	buttonsTemplate?: string;
	headerTemplate?: string;

	inputs?: IStringIndexer<string>;
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

interface IStringIndexer<T> extends Record<string, T> { }
interface IStringAnyIndexer extends IStringIndexer<any> { } // eslint-disable-line @typescript-eslint/no-explicit-any
interface IStringAnyIndexerReplacer {
	(this: any, key: string, value: any): any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

interface IApiOptions {
	calculationInputs?: IStringIndexer<string>;
	apiParameters?: IStringAnyIndexer;
	isDownload?: boolean;
	calculateOnSuccess?: boolean | ICalculationInputs
	files?: FileList | null;
}

interface IApiResult {
	Validations: { ID: string, Message: string }[] | undefined;
	ValidationWarnings: { ID: string, Message: string }[] | undefined;
	Result: IStringAnyIndexer;
}

interface IModalAppVerifyResult {
	path: string;
	manualInputs?: IStringIndexer<string>;
}

class ApiError extends Error {
	constructor(message: string, public innerException: Error | undefined, public apiResponse: IApiResult ) {
		super(message);
	}
}

// Directive Options
interface IKaNavigateOptions {
	view: string;
	confirm?: IModalOptions;
	inputs?: ICalculationInputs;
	ceInputs?: string;
	persistInputs?: boolean;
}
interface IKaModalOptions extends IModalOptions {
	view: string;
	confirmed?: (response: any | undefined, application: KatApp) => void;
	cancelled?: (response: any | undefined, application: KatApp) => void;
	catch?: (e: any | undefined, application: KatApp) => void;
	calculateOnConfirm?: ICalculationInputs | boolean;
}
interface IKaApiOptions extends IApiOptions {
	endpoint: string;
	then?: (response: IStringAnyIndexer | undefined, application: KatApp) => void;
	catch?: (e: any | undefined, application: KatApp) => void;
	confirm?: IModalOptions;
}
interface IKaAppOptions {
	selector?: string;
	view: string;
	inputs?: ICalculationInputs;
}

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

	readonly help: IKaInputScopeHelp; // from ce ?? markup
	readonly css: IKaInputScopeCss; // from markup

	readonly list: Array<IKaInputListRow>; // from ce ?? markup
	readonly prefix: string | undefined; // from ce ?? markup
	readonly suffix: string | undefined; // from ce ?? markup
	readonly maxLength: number; // from ce ?? markup
	readonly min: string | undefined; // from ce ?? markup
	readonly max: string | undefined; // from ce ?? markup
	readonly step: number; // from ce ?? markup

	readonly error: string | undefined; // from ce
	readonly warning: string | undefined; // from ce 

	uploadAsync: () => void;
	inputMounted: (input: HTMLInputElement, refs: IStringIndexer<HTMLElement>) => void;
}
interface IKaInputScopeBase {
	readonly display: boolean;
	readonly noCalc: boolean;
	readonly disabled: boolean;
	readonly error: string | undefined;
	readonly warning: string | undefined;
}
interface IKaInputScopeHelp {
	title?: string;
	content?: string;
	width?: string;
}
interface IKaInputScopeCss {
	input?: string;
	container?: string;
}

interface IKaInputOptions {
	name: string;

	type?: string;
	value?: string;
	label?: string;
	placeHolder?: string;
	hideLabel?: boolean;
	help?: IKaInputHelp;
	iconHtml?: string;
	list?: Array<IKaInputListRow>;
	css?: IKaInputScopeCss;
	prefix?: string;
	suffix?: string;
	maxLength?: number;
	displayFormat?: string;

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
interface IKaInputHelp {
	title?: string;
	content?: string;
	width?: number;
}
interface IKaInputListRow extends IStringIndexer<string> { key: string; text: string; }

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
	readonly hideLabel: boolean; // from ce ?? markup
	placeHolder: (index: number) => string | undefined; // from ce ?? markup

	help: (index: number) => IKaInputScopeHelp; // from ce ?? markup
	css: (index: number) => IKaInputScopeCss; // from markup

	list: (index: number) => Array<IKaInputListRow>; // from ce ?? markup
	prefix: (index: number) => string | undefined; // from ce ?? markup
	suffix: (index: number) => string | undefined; // from ce ?? markup
	maxLength: (index: number) => number | undefined; // from ce ?? markup
	min: (index: number) => string | undefined; // from ce ?? markup
	max: (index: number) => string | undefined; // from ce ?? markup
	step: (index: number) => number | undefined; // from ce ?? markup

	error: ( index: number ) => string | undefined;
	warning: (index: number) => string | undefined;

	inputMounted: (input: HTMLInputElement, refs: IStringIndexer<HTMLElement>) => void;
}

interface IKaInputGroupScopeBase {
	display: ( index: number ) => boolean;
	noCalc: (index: number) => boolean;
	disabled: (index: number) => boolean;
	error: (index: number) => string | undefined;
	warning: (index: number) => string | undefined;
}

interface IKaInputGroupOptions {
	names: string[];
	type: string;

	values?: string[];
	labels?: string[];
	placeHolders?: string[];
	hideLabel?: boolean;
	helps?: IKaInputHelp[]
	css?: IKaInputScopeCss[];
	displayFormats?: string[];

	maxLengths?: number[];
	mins?: string[];
	maxes?: string[];
	steps?: number[];
	prefixes?: string[];
	suffixes?: string[];

	ce?: string;
	tab?: string;

	template: string;

	isNoCalc?: (index: number, base: IKaInputGroupOptionsBase) => boolean;
	isDisabled?: (index: number, base: IKaInputGroupOptionsBase) => boolean;
	isDisplay?: (index: number, base: IKaInputGroupOptionsBase) => boolean;

	events?: IStringIndexer<((e: Event, application: KatApp) => void)>
}

interface IKaInputGroupOptionsBase {
	display: (index: number) => boolean;
	noCalc: (index: number) => boolean;
	disabled: (index: number) => boolean;
}
interface IKaHighchartOptions {
	data: string;
	options?: string;
	ce?: string;
	tab?: string;
}
interface IKaTableOptions {
	name: string;
	css?: string;
	ce?: string;
	tab?: string;
}


// RBLe Result Row Types
interface IRblHighChartsOverrideRow extends IRblHighChartsOptionRow {
	"@id": string;
}
interface IRblHighChartsOptionRow extends IStringIndexer<string> {
	key: string;
	value: string;
}
interface IRblHighChartsDataRow extends IStringIndexer<string | undefined> {
	category: string;
	plotLine?: string;
	plotBand?: string;
}
interface IHighChartsPlotConfigurationRow {
	index: number;
	plotLine: string;
	plotBand: string;
}
