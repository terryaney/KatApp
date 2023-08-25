class Calculation {
	public static async calculateAsync(
		application: KatApp,
		serviceUrl: string,
		calcEngines: ICalcEngine[],
		inputs: ICalculationInputs,
		configuration: ISubmitApiConfiguration | undefined
	): Promise<Array<{ Diagnostics?: IRblCalculationDiagnostics, TabDefs: Array<IRbleTabDef>}>> {
		Utils.trace(application, "Calculation", "calculateAsync", "Start", TraceVerbosity.Detailed);

		const submitConfiguration =
			Utils.extend<ISubmitCalculationConfiguration>(
				{},
				configuration,
				{
					calcEngines: calcEngines.filter(c => !c.manualResult && c.enabled)
						.map(c => ({
							name: c.name,
							inputTab: c.inputTab,
							resultTabs: c.resultTabs,
							pipeline: c.pipeline?.map(p => {
								const ce: ISubmitCalculationCalcEnginePipeline = { name: p.name, inputTab: p.inputTab, resultTab: p.resultTab };
								return ce;
							} )
						} as ISubmitCalculationCalcEngine ))
				} as ISubmitCalculationConfiguration
			);

		const inputPropertiesToSkip = ["tables", "getNumber", "getOptionText"];
		const submitData: ISubmitApiData = {
			inputs: Utils.clone(inputs, (k, v) => inputPropertiesToSkip.indexOf(k) > -1 ? undefined : v?.toString()),
			inputTables: inputs.tables?.map<ICalculationInputTable>(t => ({ name: t.name, rows: t.rows })),
			configuration: submitConfiguration
		};

		const failedResponses: Array<ICalculationFailedResponse> = [];
		const successResponses: Array<{ Diagnostics?: IRblCalculationDiagnostics, TabDefs: Array<IRbleTabDef>}> = [];

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
				(submitData.configuration as ISubmitCalculationConfiguration).calcEngines = (submitData.configuration as ISubmitCalculationConfiguration).calcEngines.filter(c => retryCalcEngines.indexOf(c.name) > -1);
				(submitData.configuration as ISubmitCalculationConfiguration).invalidCacheKeys = invalidCacheResults.map(r => r.CacheKey!);
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

			mergedResults.Results.filter(r => r.Result.Exception != undefined).forEach(r => {
				const response: ICalculationFailedResponse = {
					calcEngine: r.CalcEngine,
					diagnostics: r.Result.Diagnostics,
					configuration: submitConfiguration,
					inputs: inputs,
					exceptions: [{
						message: r.Result.Exception.Message,
						type: r.Result.Exception.Type,
						stackTrace: r.Result.Exception.StackTrace
					}]
				};

				failedResponses.push(response);
			});

			mergedResults.Results
				.filter(r => r.Result.Exception == undefined)
				.forEach(r => {
					const tabDefs = r.Result.RBL.Profile.Data.TabDef;
					successResponses.push(
						{
							Diagnostics: r.Result.Diagnostics,
							TabDefs: tabDefs instanceof Array ? tabDefs : [tabDefs]
						});
				});

			if (failedResponses.length > 0) {
				throw new CalculationError("Unable to complete calculation(s)", failedResponses);
			}
			return successResponses;
		} catch (e) {
			if (e instanceof CalculationError) {
				throw e;
			}

			const exception: ICalculationResponseException = {
				message: e instanceof Error ? e.message : e + "Unable to submit Calculation to " + serviceUrl,
				type: e instanceof Error ? e.name : "Error",
				stackTrace: e instanceof Error
					? e.stack?.split("\n") ?? ["No stack available"]
					: ["Calculation.calculateAsync (rest is missing)"],
			};

			if (!(e instanceof Error)) {
				console.log("Original calculation exception (should have been instanceof Error):");
				console.log({ e });
			}
			throw new CalculationError("Unable to complete calculation(s)", [{
				calcEngine: submitConfiguration.calcEngines.map(c => c.name).join(", "),
				inputs: inputs,
				configuration: submitConfiguration,
				exceptions: [exception]
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
				contentType: "application/json"
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

			const exceptions = errorResponse.exceptions ?? [];
			const response: ICalculationFailedResponse = {
				calcEngine: (submitData.configuration as ISubmitCalculationConfiguration).calcEngines.map(c => c.name).join(", "),
				configuration: submitData.configuration,
				inputs: inputs,
				exceptions: exceptions.map(ex => ({
					message: ex.message,
					type: ex.type ?? "Unknown type",
					stackTrace: ex.stackTrace
				}))
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