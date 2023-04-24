class Calculation {
	public static async calculateAsync(
		application: KatApp,
		serviceUrl: string,
		calcEngines: ICalcEngine[],
		inputs: ICalculationInputs,
		configuration: ISubmitApiConfiguration | undefined
	): Promise<IRbleTabDef[]> {
		Utils.trace(application, "Calculation", "calculateAsync", "Start", TraceVerbosity.Detailed);

		const submitConfiguration =
			Utils.extend<ISubmitCalculationConfiguration>(
				{},
				configuration,
				{
					CalcEngines: calcEngines.filter(c => !c.manualResult && c.enabled)
						.map(c => ({
							Name: c.name,
							InputTab: c.inputTab,
							ResultTabs: c.resultTabs,
							PreCalcs: c.preCalcs
						}))
				}
			);

		const submitData: ISubmitApiData = {
			Inputs: Utils.clone(inputs, (k, v) => k == "tables" ? undefined : v?.toString()),
			InputTables: inputs.tables?.map<ISubmitCalculationInputTable>(t => ({ Name: t.name, Rows: t.rows })),
			Configuration: submitConfiguration
		};

		const failedResponses: Array<ICalculationFailedResponse> = [];
		const successResponses: Array<Array<IRbleTabDef>> = [];

		try {
			Utils.trace(application, "Calculation", "calculateAsync", "Posting Data", TraceVerbosity.Detailed);

			const calculationResults = await this.submitCalculationAsync(application, serviceUrl, inputs, submitData);
			const cachedResults = calculationResults.Results.filter(r => r.CacheKey != undefined && r.Result == undefined);

			// If any items are returned as cache, verify they are there...
			for (var i = 0; i < cachedResults.length; i++) {
				const r = calculationResults.Results[i];
				const cacheResult = await this.getCacheAsync(`RBLCache:${r.CacheKey}`, application.options.decryptCache);
				if (cacheResult == undefined) {
					Utils.trace(application, "Calculation", "calculateAsync", `Cache miss for ${r.CalcEngine} with key ${r.CacheKey}`, TraceVerbosity.Detailed);
				}
				else {
					Utils.trace(application, "Calculation", "calculateAsync", `Use cache for ${r.CalcEngine}`, TraceVerbosity.Detailed);
					r.CacheKey = undefined; // So it isn't processed anymore
					r.Result = cacheResult as IRblCalculationSuccessResponse;
				}
			}

			// Any cache misses, need to resubmit them and reassign original results.
			const invalidCacheResults = calculationResults.Results.filter(r => r.CacheKey != undefined && r.Result == undefined);

			if (invalidCacheResults.length > 0) {
				const retryCalcEngines = invalidCacheResults.map(r => r.CalcEngine);
				(submitData.Configuration as ISubmitCalculationConfiguration).CalcEngines = (submitData.Configuration as ISubmitCalculationConfiguration).CalcEngines.filter(c => retryCalcEngines.indexOf(c.Name) > -1);
				(submitData.Configuration as ISubmitCalculationConfiguration).InvalidCacheKeys = invalidCacheResults.map(r => r.CacheKey!);
				const retryResults = await this.submitCalculationAsync(application, serviceUrl, inputs, submitData);

				for (var i = 0; i < retryResults.Results.length; i++) {
					const rr = retryResults.Results[i];
					const position = calculationResults.Results.findIndex(r => r.CalcEngine == rr.CalcEngine);
					calculationResults.Results[position] = rr;
				}
			}

			if (calculationResults.Results.filter(r => r.CacheKey != undefined && r.Result == undefined).length > 0) {
				Utils.trace(application, "Calculation", "calculateAsync", `Client side cache is invalid.`, TraceVerbosity.Detailed);
			}

			for (var i = 0; i < calculationResults.Results.length; i++) {
				var r = calculationResults.Results[i];
				const cacheKey = r.CacheKey;

				if (cacheKey != undefined) {
					if (r.Result!.Exception != undefined) {
						Utils.trace(application, "Calculation", "calculateAsync", `(RBL exception) Remove cache for ${r.CalcEngine}`, TraceVerbosity.Detailed);
						sessionStorage.removeItem(`RBLCache:${cacheKey}`);
					}
					else {
						Utils.trace(application, "Calculation", "calculateAsync", `Set cache for ${r.CalcEngine}`, TraceVerbosity.Detailed);
						await this.setCacheAsync(`RBLCache:${cacheKey}`, r.Result!, application.options.encryptCache);
					}
				}
			}

			// Didn't want !. checks on result every time after getting results successfully set up
			const mergedResults = calculationResults as {
				Results: Array<{
					CalcEngine: string;
					Result: IRblCalculationSuccessResponse;
				}>;
			};

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

			if (failedResponses.length > 0) {
				throw new CalculationError("Unable to complete calculation(s)", failedResponses);
			}
			return successResponses.flatMap(r => r);

		} catch (e) {
			if (e instanceof CalculationError) {
				throw e;
			}

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

			if (!(e instanceof Error)) {
				console.log("Original calculation exception (should have been instanceof Error):");
				console.log({ e });
			}
			throw new CalculationError("Unable to complete calculation(s)", [{
				calcEngine: submitConfiguration.CalcEngines.map(c => c.Name).join(", "),
				exception: exception
			}]);
		}
	}

	static async submitCalculationAsync(
		application: KatApp,
		serviceUrl: string,
		inputs: ICalculationInputs,
		submitData: ISubmitApiData
	): Promise<IRblCalculationSuccessResponses> {
		try {

			let calculationResults: IRblCalculationSuccessResponses = await $.ajax({
				url: serviceUrl,
				data: JSON.stringify(submitData),
				method: "POST",
				headers: submitData.Configuration.Token != undefined
					? { 'x-rble-session': submitData.Configuration.Token, 'Content-Type': undefined }
					: undefined
			});

			Utils.trace(application, "Calculation", "calculateAsync", "Received Success Response", TraceVerbosity.Detailed);

			if (typeof calculationResults == "string") {
				calculationResults = JSON.parse(calculationResults);
			}

			return calculationResults;

		} catch (e) {
			Utils.trace(application, "Calculation", "calculateAsync", "Received Error Response", TraceVerbosity.Detailed);

			const errorResponse: IApiErrorResponse =
				(e as JQuery.jqXHR<any>).responseJSON ??
				(((e as JQuery.jqXHR<any>).responseText?.startsWith("{") ?? false) ? JSON.parse((e as JQuery.jqXHR<any>).responseText) : undefined) ??
				{ exceptions: [{ message: "No additional details available." }] };

			const response: ICalculationFailedResponse = {
				calcEngine: (submitData.Configuration as ISubmitCalculationConfiguration).CalcEngines.map(c => c.Name).join(", "),
				exception: {
					message:
						errorResponse.errors?.[Object.keys(errorResponse.errors)[0]][0] ??
						(errorResponse.exceptions?.[0] ?? {}).message ??
						status,
					detail: errorResponse.exceptions?.map(e => {
						const detail: ICalculationResponseExceptionDetail = {
							message: e.message,
							type: e.type,
							stackTrace: e.stackTrace
						};

						return detail;
					}) ?? [],
					configuration: submitData.Configuration,
					inputs: inputs
				}
			};

			throw new CalculationError("Unable to complete calculation(s)", [response]);
		}
	}
	
	static async setCacheAsync(key: string, data: object, encryptCache: (data: object) => string | Promise<string>): Promise<void> {
		var cacheResult = encryptCache(data);
		if (cacheResult instanceof Promise) {
			cacheResult = await cacheResult;
		}
		sessionStorage.setItem(key, cacheResult);
	}
	static async getCacheAsync(key: string, decryptCache: (cipher: string) => object | Promise<object>): Promise<object | undefined> {
		const data = sessionStorage.getItem(key);

		if (data == undefined) return undefined;

		let cacheResult = decryptCache(data);

		if (cacheResult instanceof Promise) {
			cacheResult = await cacheResult;
		}

		return cacheResult;
	}
}

class CalculationError extends Error {
	constructor(message: string, public failures: ICalculationFailedResponse[]) {
		super(message);
	}
}

interface ISubmitCalculationConfiguration extends ISubmitApiConfiguration {
	CalcEngines: {
		Name: string;
		InputTab: string;
		ResultTabs: string[];
		PreCalcs: string | undefined;
	}[];
	InvalidCacheKeys?: string[];
}
