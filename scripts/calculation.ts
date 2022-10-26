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

					const submitCalculationConfiguration: ISubmitCalculationConfiguration = {
						CalcEngine: c.name,
						InputTab: c.inputTab,
						ResultTabs: c.resultTabs,
						PreCalcs: c.preCalcs,
					};

					const submitConfiguration =
						Utils.extend<ISubmitApiConfiguration>(
							{},
							configuration,
							submitCalculationConfiguration
						);

					const submitData: ISubmitApiData = {
						Inputs: Utils.clone( inputs, ( k, v ) => k == "tables" ? undefined : v ),
						InputTables: inputs.tables?.map<ISubmitCalculationInputTable>(t => ({ Name: t.name, Rows: t.rows })),
						Configuration: submitConfiguration
					};

					try {
						$.ajax({
							url: serviceUrl,
							data: JSON.stringify(submitData),
							method: "POST",
							// dataType: "json",
							/*
							// My attempt to get browser caching
							headers: submitConfiguration.Token != undefined
								? { 'x-rble-session': submitConfiguration.Token, 'Content-Type': undefined, 'Cache-Control': 'max-age=0' }
								: { 'Cache-Control': 'max-age=0' }
							*/
							headers: submitConfiguration.Token != undefined
								? { 'x-rble-session': submitConfiguration.Token, 'Content-Type': undefined }
								: undefined
						}).then(
							function (response, status, jqXHR) {
								var rbleCacheKey = jqXHR.getResponseHeader("rble-cache-key");

								let result: IRblCalculationSuccessResponse = status == "notmodified"
									? sessionStorage.getItem(`RBLCache:${rbleCacheKey}`)
									: jqXHR.responseJSON ?? response;

								if (typeof result == "string") {
									result = JSON.parse(result);
								}

								if (rbleCacheKey != undefined) {
									sessionStorage.setItem(`RBLCache:${rbleCacheKey}`, JSON.stringify(result));
								}

								if (result.Diagnostics != null) {
									console.group(c.name + " " + result.Diagnostics.CalcEngineVersion + " Diagnostics");

									const utcDateLength = 28;
									const timings: string[] = result.Diagnostics.Timings.Status.map(t => {
										const start = (t["@Start"] + "       ").substring(0, utcDateLength);
										return start + ": " + t["#text"];
									}) ?? [];

									const diag = {
										Server: result.Diagnostics.RBLeServer,
										Session: result.Diagnostics.SessionID,
										Url: result.Diagnostics.ServiceUrl,
										Timings: timings,
										Trace: result.Diagnostics.Trace?.Item.map(i => i.substring(2))
									};
									console.log(diag);

									console.groupEnd();
								}

								if (result.Exception != undefined) {
									const response: ICalculationFailedResponse = {
										calcEngine: c.name,
										exception: {
											message: result.Exception.Message,
											detail: result.Exception.Message,
											stackTrace: result.Exception.StackTrace.split("\n"),
											configuration: submitConfiguration,
											inputs: inputs
										}
									};

									d.reject(response);
								}
								else {
									const tabDefs = result.RBL.Profile.Data.TabDef;
									const resopnse: ICalculationSuccessResponse = { calcEngine: c.name, results: tabDefs instanceof Array ? tabDefs : [tabDefs] };
									d.resolve(resopnse);
								}
							},
							function (jqXHR, status) {
								const apiResponse: IRblCalculationFailedResponse = jqXHR.responseJSON ?? (jqXHR.responseText.startsWith("{") ? JSON.parse(jqXHR.responseText) : {});

								const response: ICalculationFailedResponse = {
									calcEngine: c.name,
									exception: {
										message: apiResponse.Validations?.[0]?.Message ?? status,
										detail: apiResponse.ExceptionDetails?.Message ?? jqXHR.responseText,
										stackTrace: apiResponse.ExceptionDetails?.StackTrace,
										configuration: submitConfiguration,
										inputs: inputs
									}
								};

								d.reject(response);
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

class CalculationError extends Error {
	constructor(message: string, public failures: ICalculationFailedResponse[]) {
		super(message);
	}
}