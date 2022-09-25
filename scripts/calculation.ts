class Calculation {
	public static async calculateAsync(
		serviceUrl: string,
		calcEngines: ICalcEngine[],
		inputs: ICalculationInputs,
		configuration: ISubmitApiConfiguration | undefined
	): Promise<IRbleTabDef[]> {

		const calculationResults = await Promise.allSettled(
			calcEngines.filter(c => !c.manualResult && c.enabled)
				.map(c => {
					const d: JQuery.Deferred<ICalculationSuccessResponse | ICalculationFailedResponse> = $.Deferred();

					const submitConfiguration =
						Utils.extend<ISubmitApiConfiguration>(
							{},
							configuration,
							{
								CalcEngine: c.name,
								InputTab: c.inputTab,
								ResultTabs: c.resultTabs,
								PreCalcs: c.preCalcs,
							} as ISubmitCalculationConfiguration
						);

					const submitData: ISubmitApiData = {
						Inputs: Utils.clone( inputs, ( k, v ) => k == "tables" ? undefined : v ),
						InputTables: inputs.tables?.map(t => ({ Name: t.name, Rows: t.rows } as ISubmitCalculationInputTable)),
						Configuration: submitConfiguration
					};

					try {
						$.ajax({
							url: serviceUrl,
							data: JSON.stringify(submitData),
							method: "POST",
							// dataType: "json",
							headers: submitConfiguration.Token != undefined
								? { 'x-rble-session': submitConfiguration.Token, 'Content-Type': undefined }
								: undefined
						}).then(
							function (response, status, jqXHR) {
								let result = jqXHR.responseJSON ?? response;

								if (typeof result == "string") {
									result = JSON.parse(result);
								}

								if (result.Diagnostics != null) {
									console.group(c.name + " " + result.Diagnostics.CalcEngineVersion + " Diagnostics");

									const utcDateLength = 28;
									const timings: string[] = result.Diagnostics.Timings.Status.map((t: IStringIndexer<string>) => {
										const start = (t["@Start"] + "       ").substring(0, utcDateLength);
										return start + ": " + t["#text"];
									}) ?? [];

									const diag = {
										Server: result.Diagnostics.RBLeServer,
										Session: result.Diagnostics.SessionID,
										Url: result.Diagnostics.ServiceUrl,
										Timings: timings,
										Trace: (result.Diagnostics.Trace?.Item as Array<string> ).map(i => i.substring(2))
									};
									console.log(diag);

									console.groupEnd();
								}

								if (result.Exception == undefined) {
									const tabDefs = result["RBL"]["Profile"]["Data"]["TabDef"];
									d.resolve({ calcEngine: c.name, results: tabDefs instanceof Array ? tabDefs as Array<IRbleTabDef> : [tabDefs] as Array<IRbleTabDef> } as ICalculationSuccessResponse);
								}
								else {
									d.reject({
										calcEngine: c.name,
										exception: {
											message: result.Exception.Message as string,
											detail: result.Exception.Message as string,
											stackTrace: (result.Exception.StackTrace as string).split("\n"),
											configuration: submitConfiguration,
											inputs: inputs
										}
									} as ICalculationFailedResponse);
								}
							},
							function (jqXHR, status) {
								const response = jqXHR.responseJSON ?? (jqXHR.responseText.startsWith("{") ? JSON.parse(jqXHR.responseText) : {});

								d.reject({
									calcEngine: c.name,
									exception: {
										message: response.Validations?.[0]?.Message as string ?? status,
										detail: response.ExceptionDetails?.Message as string ?? jqXHR.responseText,
										stackTrace: response.ExceptionDetails?.StackTrace as string[],
										configuration: submitConfiguration,
										inputs: inputs
									}
								} as ICalculationFailedResponse);
							}
						);
					} catch (e) {
						const exception = e instanceof Error
							? { message: e.message, stackTrace: e.stack?.split("\n") }
							: { message: e + "", stackTrace: "Calculation.calculateAsync (rest is missing)" };

						d.reject({
							calcEngine: c.name,
							errorMessage: "Unable to submit Calculation to " + serviceUrl,
							exception: exception
						});
					}
					finally {
						return d;
					}
				})
		);

		const rejected =
			calculationResults
				.filter(r => r.status == "rejected")
				.map(r => (r as PromiseRejectedResult).reason as ICalculationFailedResponse);

		if (rejected.length > 0) {
			throw new CalculationError("Unable to complete calculation(s) submitted to " + serviceUrl, rejected);
		}

		const tabDefs =
			calculationResults
				.filter(r => r.status == "fulfilled")
				.flatMap(r => (r as PromiseFulfilledResult<ICalculationSuccessResponse>).value.results);

		return tabDefs;
	}
}

interface ICalcEngine {
	key: string;
	name: string;
	inputTab: string;
	resultTabs: string[];
	preCalcs?: string;
	manualResult: boolean;
	enabled: boolean;
	allowConfigureUi: boolean;
}

interface ICalculationInputs extends IStringAnyIndexer {
	iConfigureUI?: number;
	iDataBind?: number;
	iInputTrigger?: string;
	iNestedApplication?: number;
	iModalApplication?: number;
	tables?: ICalculationInputTable[];
}

interface ICalculationInputTable {
	name: string;
	rows: ICalculationInputTableRow[]
}

interface ICalculationInputTableRow extends IStringIndexer<string> {
	index: string;
}

interface IRbleTabDef extends IStringIndexer<string | IStringIndexer<string> | Array<IStringIndexer<string>>> { }
interface ITabDef extends IStringIndexer<ITabDefKatAppInfo | string | Array<IStringIndexer<string>>> {
	_ka: ITabDefKatAppInfo;
}

interface ITabDefKatAppInfo {
	calcEngineKey: string;
	name: string;
}

interface ISubmitApiData {
	// Data?: RBLeRESTServiceResult; // Passed in if non-session calcs being used
	Inputs: IStringIndexer<string>;
	InputTables?: Array<ISubmitCalculationInputTable>;
	Configuration: ISubmitApiConfiguration;
}
interface ISubmitCalculationInputTable { Name: string, Rows: Array<ICalculationInputTableRow>; }

interface ISubmitCalculationConfiguration {
	CalcEngine: string;
	InputTab: string;
	ResultTabs: string[];
	PreCalcs?: string;
}
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
	detail: string;
	stackTrace: string[];
	configuration: ICalculationResponseExceptionConfiguration;
	inputs: ICalculationInputs;
}
interface ICalculationResponseExceptionConfiguration extends ISubmitApiConfiguration, ISubmitCalculationConfiguration { }

interface ILastCalculation {
	inputs: ICalculationInputs;
	results: ITabDef[];
	configuration: ISubmitApiConfiguration;
}
class CalculationError extends Error {
	constructor(message: string, public failures: ICalculationFailedResponse[]) {
		super(message);
	}
}