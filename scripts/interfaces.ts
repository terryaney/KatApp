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
	options: IKatAppOptions;
	triggerEvent: (eventName: string, ...args: (object | string | undefined | unknown)[]) => boolean | string | ICalculationInputs | undefined;
}

interface IApplicationData {
	kaId: string;
	application: IKatApp;
	options: IKatAppOptions;
	uiBlocked: boolean;
	needsCalculation: boolean; // True when input not 'skipped' has been edited but has not triggered a calculation yet

	model?: any;

	handlers?: IStringAnyIndexer;
	templateMounted: (templateId: string, el: Element, mode: string, scope?: any) => void;
	templateUnmounted: (el: Element, scope?: any) => void;

	inputs: ICalculationInputs;
	errors: IValidation[];
	warnings: IValidation[];

	rbl: {
		results: ICalculationResults;

		source: (table: string, calcEngine?: string, tab?: string) => Array<IStringIndexer<string>>;
		exists: (table: string, calcEngine?: string, tab?: string) => boolean;
		value: (table: string, keyValue: string, returnField?: string, keyField?: string, calcEngine?: string, tab?: string) => string | undefined;
		boolean: (table: string, keyValue: string, returnField?: string, keyField?: string, calcEngine?: string, tab?: string) => boolean;

		pushTo: (tabDef: ITabDef, table: string, rows: IStringIndexer<string> | Array<IStringIndexer<string>>, calcEngine?: string, tab?: string) => void;
	}

	components: IStringIndexer<IStringAnyIndexer>;
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
	nextCalculation: {
		saveLocations: { location: string, serverSideOnly: boolean }[];
		expireCache: boolean;
		trace: boolean;
	};
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
	confirmed?: (response?: any) => void;
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
interface IKaInputOptions {
	name: string;

	type?: string;
	value?: string;
	label?: string;
	placeHolder?: string;
	hideLabel?: boolean;
	help?: IKaInputHelp;
	css?: IKaInputCss;
	prefix?: string;
	suffix?: string;

	ce?: string;
	tab?: string;

	template?: string;

	isNoCalc?: (base: IKaInputOptionsBase) => boolean;
	isDisabled?: (base: IKaInputOptionsBase) => boolean;
	isDisplay?: (base: IKaInputOptionsBase) => boolean;

	events?: IStringIndexer<((e: Event, application: KatApp) => void)>
}

interface IKaInputOptionsBase {
	display: boolean;
	noCalc: boolean;
	disabled: boolean;
}

interface IKaInputHelp {
	title?: string;
	content?: string;
	width?: number;
}
interface IKaInputCss {
	input?: string;
}

interface IKaInputGroupOptions {
	names: string[];
	type: string;

	values?: string[];
	labels?: string[];
	placeHolders?: string[];
	hideLabel?: boolean;
	helps?: IKaInputHelp[]
	css?: IKaInputCss[];

	prefixes?: string[];
	suffixes?: string[];

	ce?: string;
	tab?: string;

	template: string;

	isNoCalc?: (base: IKaInputGroupOptionsBase) => boolean;
	isDisabled?: (base: IKaInputGroupOptionsBase) => boolean;
	isDisplay?: (base: IKaInputGroupOptionsBase) => boolean;

	events?: IStringIndexer<((e: Event, application: KatApp) => void)>
}

interface IKaInputGroupOptionsBase {
	display: (index: number) => boolean;
	noCalc: (index: number) => boolean;
	disabled: (index: number) => boolean;
}
