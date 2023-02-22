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
			return template.replace(/{{([^}]+)}}/g, function (match, token) {
				const valueType = typeof parameters[token];

				// If class/width/other RBLe custom columns were used, their values
				// would be assigned as attributes, so a #text property on the object would
				// exist, and that is probably what they want.
				let jsonValue = valueType == "object"
					? parameters[token]["#text"] ?? parameters[token]
					: parameters[token];

				// https://stackoverflow.com/a/6024772/166231 - first attempt
				// https://stackoverflow.com/a/13418900/166231
				// Tested this again and was getting $$ in results...seems I don't need to do this replacement since
				// my string.replace takes a 'function' as the second param, without a function, the issue presented itself,
				// without a funciton it seems to just work as expected.
				/*
				if (typeof jsonValue == "string") {
					jsonValue = jsonValue.replace(new RegExp('\\$', 'gm'), '$$$$');
				}
				*/

				// If I didn't want to hard code the $0 check, this answer suggested using a function, but I didn't want the overhead
				// https://stackoverflow.com/a/6024692/166231
				// that = that.replace(re, function() { return json[propertyName]; });

				return jsonValue || `{{${token}}}`;
			});

		};
	}
})();

interface JQueryStatic {
	_data(element: HTMLElement, property: string): Record<string, { handler: any, kaProxy: boolean | undefined, namespace: string | undefined, guid: number }[] | undefined>;
}
