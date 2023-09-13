interface IKatAppCalculationResponse {
	CalcEngine: string;
	Diagnostics?: IRblCalculationDiagnostics;
	TabDefs: Array<IRbleTabDef>;
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
interface IManualTabDef extends IStringIndexer<string | undefined | ITabDefTable> {
	"@calcEngineKey": string;
	"@calcEngine": string;
	"@name": string | undefined;
}
interface ITabDef extends IStringIndexer<ITabDefTable> { }
interface ITabDefTable extends Array<ITabDefRow> { }
interface ITabDefRow extends IStringIndexer<string> { }
interface ITabDefRowWithNulls extends IStringIndexer<string | undefined> { }
interface ITabDefMetaRow extends IStringIndexer<string | IStringIndexer<string>> { }

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

interface IRblCalculationDiagnostics {
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
}
interface IRblCalculationSuccessResponse {
	Diagnostics: IRblCalculationDiagnostics;

	Exception: {
		Message: string;
		Type: string;
		TraceId: string;
		RequestId: string;
		StackTrace: Array<string>;
	};

	RBL: {
		Profile: {
			Data: {
				TabDef: Array<IRbleTabDef> | IRbleTabDef;
			}
		}
	}
}