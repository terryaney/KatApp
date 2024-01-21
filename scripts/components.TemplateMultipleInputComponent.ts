/// <reference path="./components.InputComponentBase.ts" />

class TemplateMultipleInputComponent extends InputComponentBase {
	constructor(private props: IKaInputGroupModel) {
		super();
	}

	public getScope(application: KatApp, getTemplateId: (name: string) => string | undefined): IKaInputGroupScope | undefined {
		const templateId = getTemplateId(this.props.template);

		if (templateId == undefined) {
			return undefined;
		}

		const that = this;
		const props = this.props;
		const names = props.names;
		
		function fillProperties<T extends string | boolean | number | IKaInputModelHelp | IKaInputScopeCss>(source: Array<T> | T | undefined, defaultValue?: T): Array<T | undefined> {
			const defaultFill: T | undefined = source != undefined && source instanceof Array
				? source[source.length - 1]
				: source ?? defaultValue;
			
			return source instanceof Array
				? source.concat(names.slice(0, names.length - source.length).map(n => defaultFill!))
				: names.map(n => defaultFill);
		}
		
		const values = fillProperties(props.values);
		const labels = fillProperties(props.labels);
		const prefixes = fillProperties(props.prefixes);
		const suffixes = fillProperties(props.suffixes);		
		const hideLabels = fillProperties(props.hideLabels);
		const placeHolders = fillProperties(props.placeHolders, '');
		const displayFormats = fillProperties(props.displayFormats);
		const masks = fillProperties(props.masks);
		const keypressRegexs = fillProperties(props.keypressRegexs);
		const helps = fillProperties(props.helps);
		const css = fillProperties(props.css);
		const maxLengths = fillProperties(props.maxLengths);
		const mins = fillProperties(props.mins);
		const maxes = fillProperties(props.maxes);
		const steps = fillProperties(props.steps);
		
		const calcEngine = props.ce;
		const tab = props.tab;

		const getInputCeValue = function (index: number, columnName: string, legacyTable?: string, legacyId?: string): string | undefined {
			return application.state.rbl.value("rbl-input", names[ index ], columnName, undefined, calcEngine, tab) ??
				(legacyTable != undefined && legacyId != undefined ? application.state.rbl.value(legacyTable, legacyId, undefined, undefined, calcEngine, tab) : undefined);
		};

		const base = {
			name: ( index: number) => names[index],
			display: (index: number) => getInputCeValue( index, "display", "rbl-display", "v" + names[ index ] ) != "0",
			noCalc: (index: number) => getInputCeValue(index, "skip-calc", "rbl-skip", names[index]) == "1",
			disabled: (index: number) => getInputCeValue(index, "disabled", "rbl-disabled", names[index]) == "1",
			error: (index: number) => that.errorText(application, names[index]),
			warning: (index: number) => that.errorText(application, names[index])
		};

		const label = function (name: string) {
			const index = names.indexOf(name);
			return application.getLocalizedString(getInputCeValue(index, "label", "rbl-value", "l" + names[index]) ?? labels[index] ?? "")!;
		};
		const noCalc = function (name: string) {
			const index = names.indexOf(name);
			return typeof props.isNoCalc == "boolean" ? props.isNoCalc : props.isNoCalc?.(index, base) ?? base.noCalc(index);
		};
		const defaultValue = function (name: string) {
			const index = names.indexOf(name);
			return application.state.inputs[names[index]] as string ?? values[index];
		};
		const mask = function (name: string) {
			const index = names.indexOf(name);
			return getInputCeValue(index, "mask") ?? masks[index];
		};		
		const hasMask = names.some(name => mask(name) !== undefined) || typeof Object.getOwnPropertyDescriptor(props, 'masks')?.get === "function";

		const maxLength = function(name: string) {
			const index = names.indexOf(name);
			const v = getInputCeValue(index, "max-length");
			return (v != undefined ? +v : undefined) ?? maxLengths[index] ?? 250;
		};

		const keypressRegex = function (name: string) {
			const index = names.indexOf(name);
			return getInputCeValue(index, "keypressRegex") ?? keypressRegexs[index];
		};		
		const displayFormat = function (name: string) {
			const index = names.indexOf(name);
			let ceFormat = getInputCeValue(index, "display-format") ?? "";

			if (ceFormat == "") {
				const format = application.state.rbl.value("rbl-sliders", name, 'format', undefined, calcEngine, tab)
				const decimals = application.state.rbl.value("rbl-sliders", name, 'decimals', undefined, calcEngine, tab)
				if (format != undefined && decimals != undefined) {
					ceFormat = `{0:${format}${decimals}}`;
				}
			}

			return ceFormat != "" ? ceFormat : displayFormats[index];
		};

		const inputType = getInputCeValue(0, "type") ?? props.type ?? "text";

		const scope = {
			$template: templateId,
			$renderId: this.getRenderedId(templateId)!,

			id: (index: number) => names[ index ] + "_" + application.id,
			name: (index: number) => base.name( index ),
			type: inputType,

			value: (index: number) => defaultValue( names[ index ]) ?? "",
			// v-model="value" support, but not using right now
			// set value(val: string) { application.state.inputs[name] = val; },
			disabled: (index: number) => typeof props.isDisabled == "boolean" ? props.isDisabled : props.isDisabled?.(index, base) ?? base.disabled(index),
			display: (index: number) => typeof props.isDisplay == "boolean" ? props.isDisplay : props.isDisplay?.(index, base) ?? base.display(index),
			noCalc: (index: number) => noCalc(names[index]),
			label: (index: number) => label(names[index]),
			placeHolder: (index: number) => {
				const ph = getInputCeValue(index, "placeholder", "rbl-value", "ph" + names[index]) ?? placeHolders[index];
				return ph != undefined ? application.getLocalizedString( ph ) : undefined;
			},
			help: (index: number) => ({
				get content() {
					const help = getInputCeValue(index, "help", "rbl-value", "h" + names[index]) ?? helps[index]?.content;
					return help != undefined ? application.getLocalizedString(help) : undefined;
				},
				title: application.getLocalizedString( getInputCeValue(index, "help-title", "rbl-value", "h" + names[index] + "Title") ?? helps[index]?.title ?? "")!,
				width: getInputCeValue(index, "help-width")  ?? helps[index]?.width?.toString() ?? "350"
			}),
			css: (index: number) => ({
				input: css[index]?.input ?? "",
				label: css[index]?.label ?? "",
				container: css[index]?.container
			}),
			error: (index: number) => /* props.isError?.(index, base) ?? */ base.error(index),
			warning: (index: number) => base.warning(index),
			list: function (index: number) {
				const table =
					getInputCeValue(index, "list") ??
					application.state.rbl.value("rbl-listcontrol", names[index], "table", undefined, calcEngine, tab);
				
				const list = table != undefined
					? application.state.rbl.source<IKaInputModelListRow>(table, calcEngine, tab)
					: /* lists[index] ?? */[];

				return list.map(r => ({ key: r.key, text: application.getLocalizedString((r.text).toString())! }));				
			},
			hideLabel: (index: number) => { return getInputCeValue(index, "label") == "-1" || ( hideLabels[index] ?? false ); },
			maxLength: (index: number) => maxLength(names[index]),
			min: (index: number) => getInputCeValue(index, "min") ?? application.state.rbl.value("rbl-sliders", names[index], "min", undefined, calcEngine, tab) ?? mins[index],
			max: (index: number) => getInputCeValue(index, "max") ?? application.state.rbl.value("rbl-sliders", names[index], "max", undefined, calcEngine, tab) ?? maxes[index],
			step: (index: number) => {
				const v = getInputCeValue(index, "step") ?? application.state.rbl.value("rbl-sliders", names[index], "step", undefined, calcEngine, tab);
				return (v != undefined ? +v : undefined) ?? steps[index];
			},
			prefix: (index: number) => getInputCeValue(index, "prefix") ?? prefixes[index],
			suffix: (index: number) => getInputCeValue(index, "suffix") ?? suffixes[index],

			inputUnmounted: (input: HTMLInputElement) => this.unmounted(application, input, props.clearOnUnmount),
			inputMounted: (input: HTMLInputElement, refs: IStringIndexer<HTMLElement>) => { /* placeholder */ }
		};

		scope.inputMounted = (input: HTMLInputElement, refs: IStringIndexer<HTMLElement>) => {
			const name = input.getAttribute("name");

			if (name == undefined) {
				throw new Error("You must assign a name attribute via :name=\"name(index)\".");
			}

			this.mounted(application, scope, name, label, input, defaultValue, props.isExcluded ?? false, noCalc, displayFormat, hasMask, mask, maxLength, keypressRegex, props.events, refs);
		};

		return scope;
	}
}