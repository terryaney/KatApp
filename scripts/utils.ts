class Utils {
	// https://blog.logrocket.com/4-different-techniques-for-copying-objects-in-javascript-511e422ceb1e/
	// Wanted explicitly 'undefined' properties set to undefined and jquery .Extend() didn't do that
	public static extend<T>(target: IStringAnyIndexer, ...sources: (IStringAnyIndexer | undefined)[]): T {
		sources.forEach((source) => {
			if (source === undefined) return;
			this.copyProperties(target, source);
		})
		return target as T;
	};

	public static clone<T>(source: IStringAnyIndexer, replacer?: IStringAnyIndexerReplacer): T { // eslint-disable-line @typescript-eslint/no-explicit-any
		return this.copyProperties({}, source, replacer) as T;
	};

	private static copyProperties(target: IStringAnyIndexer, source: IStringAnyIndexer, replacer?: IStringAnyIndexerReplacer): IStringAnyIndexer { // eslint-disable-line @typescript-eslint/no-explicit-any
		Object.keys(source).forEach((key) => {

			const value = replacer != undefined
				? replacer(key, source[key])
				: source[key];

			// Always do deep copy unless modalAppOptions or hostApplication, then simply assign
			if (value != undefined && typeof value === "object" && !Array.isArray(value) && !(value instanceof jQuery) && key != "hostApplication") {
				if (target[key] === undefined || typeof target[key] !== "object") {
					target[key] = {};
				}
				this.copyProperties(target[key], value, replacer);
			}
			// If replacer passed in and value is undefined , skip assigning property
			else if (value != undefined || replacer == undefined) {
				target[key] = value;
			}
		})
		return target;
	};

	// https://stackoverflow.com/a/2117523
	public static generateId = function (): string {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,
			function (c) {
				const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
				return v.toString(16);
			}
		);
	};

	public static parseQueryString( qs: string | undefined ): IStringIndexer<string> {
		const qsValues: IStringIndexer<string> = {};

		if ( qs != undefined && qs != "") {
			const paramsArray = ( qs.startsWith( "?" ) ? qs.substr(1) : qs ).split('&');

			for (let i = 0; i < paramsArray.length; ++i) {
				const param = paramsArray[i]
					.split('=', 2);

				if (param.length !== 2)
					continue;

				qsValues[param[0].toLowerCase()] = decodeURIComponent(param[1].replace(/\+/g, " "));
			}
		}

		return qsValues;
	}

	public static pageParameters = this.readPageParameters();
	private static _pageParameters: IStringIndexer<string> | undefined;
	private static readPageParameters(): IStringIndexer<string> {
		return this._pageParameters ?? (this._pageParameters = this.parseQueryString(window.location.search));
	}

	public static trace(application: KatApp, callerType: string, methodName: string, message: string, verbosity: TraceVerbosity, ...groupItems: Array<any>): void {
		const verbosityOption = application.options.debug.traceVerbosity ?? TraceVerbosity.None;

		if (verbosityOption >= verbosity) {
			const currentTrace = new Date();
			const origin = `${callerType}\tKatApp Framework`;
			const katApp = application.selector ?? application.id;
			const startTrace = application.traceStart
			const lastTrace = application.traceLast;
			const startDelta = Math.abs(currentTrace.getTime() - startTrace.getTime());
			const lastDelta = Math.abs(currentTrace.getTime() - lastTrace.getTime());
			application.traceLast = currentTrace;
			// Date MillisecondsFromStart MilliscondsFromLastTrace DataGroup KatAppId CallerType CallerMethod Message
			const log = `${String.localeFormat("{0:yyyy-MM-dd hh:mm:ss:ff}", currentTrace)}\t${String(startDelta).padStart(5, "0")}\t${String(lastDelta).padStart(5, "0")}\t${application.options.dataGroup}\t${katApp ?? "Unavailable"}\t${origin}\t${methodName}: ${message}`;

			if (groupItems.length > 0) {
				console.group(log);
				groupItems.forEach(i => i instanceof Error ? console.log({ i }) : console.log(i));
				console.groupEnd();
			}
			else {
				console.log(log);
			}
		}
	}
}