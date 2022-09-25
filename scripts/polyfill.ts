(function ($, window, document, undefined?: undefined): void {
	if (String.compare == undefined) {
		String.compare = function (strA?: string, strB?: string, ignoreCase?: boolean): number {
			if (strA === undefined && strB === undefined) {
				return 0;
			}
			else if (strA === undefined) {
				return -1;
			}
			else if (strB === undefined) {
				return 1;
			}

			if (ignoreCase || false) {
				strA = strA!.toUpperCase();
				strB = strB!.toUpperCase();
			}

			if (strA === strB) {
				return 0;
			}
			else {
				return strA! < strB! ? -1 : 1;
			}
		};
	}

	if (String.formatTokens === undefined) {
		String.formatTokens = function (template, parameters): string {
			// String.formatTokens( "{greeting} {who}!", {greeting: "Hello", who: "world"} )
			let that = template;

			for (const propertyName in parameters) {
				const re = new RegExp('{' + propertyName + '}', 'gm');
				const valueType = typeof parameters[propertyName];

				// If class/width/other RBLe custom columns were used, their values
				// would be assigned as attributes, so a #text property on the object would
				// exist, and that is probably what they want.
				let jsonValue = valueType == "object"
					? parameters[propertyName]["#text"] ?? parameters[propertyName]
					: parameters[propertyName];

				// https://stackoverflow.com/a/6024772/166231 - first attempt
				// https://stackoverflow.com/a/13418900/166231
				if (typeof jsonValue == "string") {
					jsonValue = jsonValue.replace(new RegExp('\\$', 'gm'), '$$$$');
				}

				that = that.replace(re, jsonValue)

				// If I didn't want to hard code the $0 check, this answer suggested using a function, but I didn't want the overhead
				// https://stackoverflow.com/a/6024692/166231
				// that = that.replace(re, function() { return json[propertyName]; });
			}

			// const leftOverTokens = new RegExp('\{\S*\}', 'gm');
			// return that.replace(leftOverTokens, "").replace("_", "_");

			// don't know why I have this replace in here
			return that.replace("_", "_");
		};
	}
})();

interface JQueryStatic {
	_data(element: HTMLElement, property: string): Record<string, { handler: any, kaProxy: boolean | undefined, namespace: string | undefined, guid: number }[] | undefined>;
}
