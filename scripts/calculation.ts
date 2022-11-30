class Calculation {
	public static async calculateAsync(
		application: KatApp,
		serviceUrl: string,
		calcEngines: ICalcEngine[],
		inputs: ICalculationInputs,
		configuration: ISubmitApiConfiguration | undefined
	): Promise<IRbleTabDef[]> {
		Utils.trace(application, "Calculation", "calculateAsync", "Start", TraceVerbosity.Detailed);

		const submitCalculationConfiguration =
			calcEngines.filter(c => !c.manualResult && c.enabled)
				.map(c => ({
					CalcEngine: c.name,
					InputTab: c.inputTab,
					ResultTabs: c.resultTabs,
					PreCalcs: c.preCalcs
				}));

		const submitConfiguration =
			Utils.extend<ISubmitApiConfiguration>(
				{},
				configuration,
				{ CalcEngines: submitCalculationConfiguration }
			);

		const submitData: ISubmitApiData = {
			Inputs: Utils.clone(inputs, (k, v) => k == "tables" ? undefined : v),
			InputTables: inputs.tables?.map<ISubmitCalculationInputTable>(t => ({ Name: t.name, Rows: t.rows })),
			Configuration: submitConfiguration
		};

		const failedResponses: Array<ICalculationFailedResponse> = [];
		const successResponses: Array<Array<IRbleTabDef>> = [];

		const d: JQuery.Deferred<boolean> = $.Deferred();

		try {
			Utils.trace(application, "Calculation", "calculateAsync", "Posting Data", TraceVerbosity.Detailed);

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
					Utils.trace(application, "Calculation", "calculateAsync", "Received Success Response", TraceVerbosity.Detailed);

					let result: IRblCalculationSuccessResponses = jqXHR.responseJSON ?? response;

					if (typeof result == "string") {
						result = JSON.parse(result);
					}

					result.Results.forEach(r => {
						const cacheKey = r.CacheKey;

						if (cacheKey != undefined) {
							if (r.Result == undefined) {
								const cacheResult = sessionStorage.getItem(`RBLCache:${cacheKey}`);
								if (cacheResult == undefined) {
									Utils.trace(application, "Calculation", "calculateAsync", `Cache miss for ${r.CalcEngine} with key ${cacheKey}`, TraceVerbosity.Detailed);
								}
								else {
									Utils.trace(application, "Calculation", "calculateAsync", `Use cache for ${r.CalcEngine}`, TraceVerbosity.Detailed);
								}
								r.Result = JSON.parse(cacheResult!);
							}
							else if (r.Result.Exception != undefined) {
								Utils.trace(application, "Calculation", "calculateAsync", `(RBL exception) Remove cache for ${r.CalcEngine}`, TraceVerbosity.Detailed);
								sessionStorage.removeItem(`RBLCache:${cacheKey}`);
							}
							else {
								Utils.trace(application, "Calculation", "calculateAsync", `Set cache for ${r.CalcEngine}`, TraceVerbosity.Detailed);
								sessionStorage.setItem(`RBLCache:${cacheKey}`, JSON.stringify(r.Result));
							}
						}
					});

					const mergedResults = result as IMergedRblCalculationSuccessResponses;

					if (submitConfiguration.TraceEnabled) {
						mergedResults.Results
							.filter(r => r.Result.Diagnostics != undefined)
							.forEach(r => {
								const utcDateLength = 28;
								const timings: string[] = r.Result.Diagnostics.Timings.Status.map(t => {
									const start = (t["@Start"] + "       ").substring(0, utcDateLength);
									return start + ": " + t["#text"];
								}) ?? [];

								const diag = {
									Server: r.Result.Diagnostics.RBLeServer,
									Session: r.Result.Diagnostics.SessionID,
									Url: r.Result.Diagnostics.ServiceUrl,
									Timings: timings,
									Trace: r.Result.Diagnostics.Trace?.Item.map(i => i.substring(2))
								};
								Utils.trace(application, "Calculation", "calculateAsync", `${r.CalcEngine} ${r.Result.Diagnostics.CalcEngineVersion} Diagnostics`, TraceVerbosity.Detailed, diag);
							});
					}

					mergedResults.Results.filter(r => r.Result.Exception != undefined).forEach(r => {
						const response: ICalculationFailedResponse = {
							calcEngine: r.CalcEngine,
							exception: {
								message: r.Result.Exception.Message,
								detail: [{
									message: r.Result.Exception.Message,
									stackTrace: r.Result.Exception.StackTrace.split("\n")
								}] as Array<ICalculationResponseExceptionDetail>,
								configuration: submitConfiguration,
								inputs: inputs
							}
						};

						failedResponses.push(response);
					});

					mergedResults.Results.filter(r => r.Result.Exception == undefined).forEach(r => {
						const tabDefs = r.Result.RBL.Profile.Data.TabDef;
						successResponses.push(tabDefs instanceof Array ? tabDefs : [tabDefs]);
					});

					d.resolve();
				},
				function (jqXHR, status) {
					Utils.trace(application, "Calculation", "calculateAsync", "Received Error Response", TraceVerbosity.Detailed);
					const apiResponse: IRblCalculationFailedResponse = jqXHR.responseJSON?.Message && jqXHR.responseJSON?.MessageDetail
						? { Exceptions: [{ Message: jqXHR.responseJSON.Message }] }
						: jqXHR.responseJSON ?? (jqXHR.responseText.startsWith("{") ? JSON.parse(jqXHR.responseText) : { Exceptions: [{ Message: "No additional details available." }] });

					const response: ICalculationFailedResponse = {
						calcEngine: submitCalculationConfiguration.map(c => c.CalcEngine).join(", "),
						exception: {
							message: apiResponse.Validations?.[0]?.Message ?? status,
							detail: apiResponse.Exceptions.map(e => {
								const detail: ICalculationResponseExceptionDetail = {
									message: e.Message,
									type: e.Type,
									stackTrace: e.StackTrace
								};

								return detail;
							}),
							configuration: submitConfiguration,
							inputs: inputs
						}
					};

					failedResponses.push(response);
					d.resolve(true);
				}
			);
		} catch (e) {
			const exception: ICalculationResponseException = {
				message: e instanceof Error ? e.message : e + "Unable to process RBL calculation.",
				inputs: inputs,
				configuration: submitConfiguration,
				detail: [{
					message: "Unable to submit Calculation to " + serviceUrl,
					stackTrace: e instanceof Error
						? e.stack?.split("\n") ?? ["No stack available"]
						: ["Calculation.calculateAsync (rest is missing)"]
				}] as Array<ICalculationResponseExceptionDetail>
			};

			failedResponses.push({
				calcEngine: submitCalculationConfiguration.map( c => c.CalcEngine ).join( ", "),
				exception: exception
			});

			d.resolve(true);
		}

		await d;

		if (failedResponses.length > 0) {
			throw new CalculationError("Unable to complete calculation(s)", failedResponses);
		}
		return successResponses.flatMap( r => r );
	}
}

class CalculationError extends Error {
	constructor(message: string, public failures: ICalculationFailedResponse[]) {
		super(message);
	}
}