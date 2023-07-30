interface IKatAppPartialModalOptions {
	view?: string;
	content?: string | JQuery;
	currentPage: string;
	hostApplication: KatApp;
	modalAppOptions: IModalAppOptions;
	inputs: ICalculationInputs;
}
interface ISubmitApiConfiguration {	
	Token?: string; // Used only in submit for session based calcs
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
interface INextCalculation {
	saveLocations: { location: string, serverSideOnly: boolean }[];
	expireCache: boolean;
	trace: boolean;
	originalVerbosity: TraceVerbosity;
}
interface IStringIndexer<T> extends Record<string, T> { }
interface IStringAnyIndexer extends IStringIndexer<any> { } // eslint-disable-line @typescript-eslint/no-explicit-any
interface IStringAnyIndexerReplacer {
	(this: any, key: string, value: any): any; // eslint-disable-line @typescript-eslint/no-explicit-any
}
interface IModalAppVerifyResult {
	path: string;
	manualInputs?: IStringIndexer<string>;
}


interface IKaTableColumnConfiguration {
	name: string;
	cssClass: string | undefined;
	isTextColumn: boolean;
	xsColumns: number | undefined;
	smColumns: number | undefined;
	mdColumns: number | undefined;
	lgColumns: number | undefined;
	width: number | undefined;
	widthPct: string | undefined;
}


// RBLe Result Row Types
interface IRblHighChartsOverrideRow extends IRblHighChartsOptionRow {
	"@id": string;
}
interface IRblHighChartsOptionRow extends ITabDefRow {
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

interface ICalcEngine {
	key: string;
	name: string;
	inputTab: string;
	resultTabs: string[];
	pipeline?: ICalcEngine[];
	manualResult: boolean;
	enabled: boolean;
	allowConfigureUi: boolean;
}

interface ICalculationInputTable {
	name: string;
	rows: ICalculationInputTableRow[]
}

interface ICalculationInputTableRow extends ITabDefRow {
	index: string;
}

interface ITabDefKatAppInfo {
	calcEngineKey: string;
	name: string;
}

// Results after updated by KatApp Framework to have _ka selector info
interface IKaTabDef extends IStringIndexer<ITabDefKatAppInfo | string | ITabDefTable> {
	_ka: ITabDefKatAppInfo;
}
// Raw results as returned from RBL Framework
interface IRbleTabDef extends IStringIndexer<string | ITabDefRow | ITabDefTable> {
	"@calcEngine": string;
	"@name": string;
}

interface ISubmitApiData {
	// Data?: RBLeRESTServiceResult; // Passed in if non-session calcs being used
	Inputs: ICalculationInputs;
	InputTables?: Array<ISubmitCalculationInputTable>;
	ApiParameters?: IStringAnyIndexer | undefined;
	Configuration: ISubmitApiConfiguration;
}
interface ISubmitCalculationInputTable { Name: string, Rows: Array<ICalculationInputTableRow>; }

// Interfaces for responses from RBL Framework
interface IRblCalculationSuccessResponses {
	Results: Array<{
		CalcEngine: string;
		CacheKey?: string;
		Result?: IRblCalculationSuccessResponse;
	}>;
}
// Didn't want !. checks on result every time after getting results successfully set up
interface IMergedRblCalculationSuccessResponses {
	Results: Array<{
		CalcEngine: string;
		Result: IRblCalculationSuccessResponse;
	}>;
}
interface IRblCalculationSuccessResponse {
	Diagnostics: {
		CalcEngineVersion: string;
		Timings: {
			Status: Array<{ "@Start": string; "#text": string; }>;
		};
		RBLeServer: string;
		SessionID: string;
		ServiceUrl: string;
		Trace?: {
			Item: Array<string>;
		}
	};

	Exception: {
		Message: string;
		StackTrace: string;
	};

	RBL: {
		Profile: {
			Data: {
				TabDef: Array<IRbleTabDef> | IRbleTabDef;
			}
		}
	}
}

// Interfaces used by KatApp framework
interface ICalculationFailedResponse {
	calcEngine: string;
	exception: ICalculationResponseException;
}
interface ICalculationSuccessResponse {
	calcEngine: string;
	results: IRbleTabDef[];
}
interface ICalculationResponseException {
	message: string;
	detail: Array<ICalculationResponseExceptionDetail>;
	configuration: ISubmitApiConfiguration;
	inputs: ICalculationInputs;
}
interface ICalculationResponseExceptionDetail {
	type: string;
	message: string;
	stackTrace: string[];
}
// interface ICalculationResponseExceptionConfiguration extends ISubmitApiConfiguration, ISubmitCalculationConfiguration { }
