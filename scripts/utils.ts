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

	private static _pageParameters: IStringIndexer<string> | undefined;
	private static readPageParameters(): IStringIndexer<string> {
		if (this._pageParameters == undefined) {
			this._pageParameters = {};
			const paramsArray = window.location.search.substr(1).split('&');

			for (let i = 0; i < paramsArray.length; ++i) {
				const param = paramsArray[i]
					.split('=', 2);

				if (param.length !== 2)
					continue;

				this._pageParameters[param[0].toLowerCase()] = decodeURIComponent(param[1].replace(/\+/g, " "));
			}
		}

		return this._pageParameters;
	}

	public static pageParameters = this.readPageParameters();

	public static trace(application: KatApp | undefined, message: string, verbosity: TraceVerbosity = TraceVerbosity.Normal): void {
		const verbosityOption = application?.options.debug.traceVerbosity ?? TraceVerbosity.None;

		if (verbosityOption >= verbosity) {

			let item: JQuery | undefined = undefined;

			const d = new Date(),
				year = d.getFullYear();
			let
				month = '' + (d.getMonth() + 1),
				day = '' + d.getDate(),
				hours = '' + d.getHours(),
				minutes = '' + d.getMinutes(),
				seconds = '' + d.getSeconds();

			if (month.length < 2) month = '0' + month;
			if (day.length < 2) day = '0' + day;
			if (hours.length < 2) hours = '0' + hours;
			if (minutes.length < 2) minutes = '0' + minutes;
			if (seconds.length < 2) seconds = '0' + seconds;

			const displayDate = [year, month, day].join('-') + " " + [hours, minutes, seconds].join(':');

			console.log(String.formatTokens("{displayDate} Application {id}: {message}", { displayDate, id: application?.options.currentPage ?? application?.id, message }));
		}
	}
}