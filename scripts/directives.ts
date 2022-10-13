interface IKaDirective {
	name: string;
	getDefinition(application: KatApp): Directive<Element> | AsyncDirective<Element>;
}

// v-ka-input, v-ka-input-group, v-ka-template, button/a.v-ka-needs-calc - pre-processed into 'scope'
class Directives {
	public static initializeCoreDirectives(vueApp: PetiteVueApp, application: KatApp): void {
		[
			new DirectiveKaInspector(),
			new DirectiveKaAttributes(),
			new DirectiveKaInline(),
			new DirectiveKaHighchart(),
			new DirectiveKaTable(),

			new DirectiveKaNavigate(),
			new DirectiveKaValue(),
			new DirectiveKaModal(),
			new DirectiveKaApp(),
			new DirectiveKaApi()

		].forEach(d => {
			vueApp.directive(d.name, d.getDefinition(application));
		});
	}

	public static getObjectFromAttributes(attributes: string): IStringIndexer<string> {
		const regex = new RegExp('[\\s\\r\\t\\n]*([a-z0-9\\-_]+)[\\s\\r\\t\\n]*=[\\s\\r\\t\\n]*([\'"])((?:\\\\\\2|(?!\\2).)*)\\2', 'ig');
		const o: IStringIndexer<string> = {};
		let match : RegExpExecArray | null = null;

		while ((match = regex.exec(attributes))) {
			o[match[1]] = match[3];
		}

		return o;
	}
}

class DirectiveKaValue implements IKaDirective {
	public name = "ka-value";
	public getDefinition(application: KatApp): Directive<Element> {
		return ctx => {
			// Shortcut for v-html="rbl.value(table, keyValue, returnField, keyField, calcEngine, tab)"
			// table, keyValue, returnField, keyField, calcEngine, tab
			let selectors = ctx.exp.split(".").map(s => s != "" ? s : undefined);
			if (selectors.length == 1) {
				selectors = ["rbl-value", ...selectors];
			}
			const getSelector = function (pos: number) { return selectors.length > pos && selectors[pos] != "" ? selectors[pos] : undefined; };

			ctx.effect(() => {
				ctx.el.innerHTML =
					application.state.rbl.value(
						getSelector(0)!,
						getSelector(1)!,
						getSelector(2),
						getSelector(3),
						getSelector(4),
						getSelector(5)
					) ?? ctx.el.innerHTML;
			});
		};
	}
}

class DirectiveKaApi implements IKaDirective {
	public name = "ka-api";
	public getDefinition(application: KatApp): Directive<Element> {
		return ctx => {
			const scope: IKaApiOptions = ctx.exp.startsWith("{") ? ctx.get() : { endpoint: ctx.exp };
			const endpoint = scope.endpoint;

			const submitApi = async function (e: Event) {
				e.preventDefault();

				if (scope.confirm != undefined) {
					const confirmResponse = await application.showModalAsync(scope.confirm, $(e.currentTarget as HTMLElement));

					if (!confirmResponse.confirmed) {
						return;
					}
				}

				try {
					const response = await application.apiAsync(
						endpoint,
						Utils.clone(scope, (k, v) => ["confirm", "endpoint", "then", "catch"].indexOf(k) > -1 ? undefined : v), undefined, $(ctx.el as HTMLElement)
					);

					if (scope.then != undefined) {
						scope.then(response, application);
					}
				} catch (e) {
					if (scope.catch != undefined) {
						scope.catch(e, application);
					}
					else {
						console.log("API Submit to " + endpoint + " failed.");
						console.log({ e });
					}
				}
			};

			ctx.el.setAttribute("href", "#");
			ctx.el.addEventListener("click", submitApi);

			return () => {
				ctx.el.removeEventListener("click", submitApi);
			}
		};
	}
}

class DirectiveKaNavigate implements IKaDirective {
	public name = "ka-navigate";
	public getDefinition(application: KatApp): Directive<Element> {
		return ctx => {
			/*
			Mistakenly did :v-ka-navigate="row.link"...you can't do that b/c it tries to run all directives first (so misses these since start with ':' instead of 'v-'), 
			and afterwards it does attribute binding.  So no directives can depend on :bind attributes, petite-vue itself does have a little hack in there to defer v-model 
			saying it needs to make sure :value is bound first, but there is no injection point to support.

			However leaving this sample in here in case I need to do custom functions at some point/reason

			let exp = ctx.exp;
			if (exp.startsWith("{{")) {
				exp = new Function('$scope', `with($scope){return (${exp.substring(2, exp.length - 4)})}`)(ctx.ctx.scope);
			}
			*/

			const scope: IKaNavigateOptions = ctx.exp.startsWith("{") ? ctx.get() : { view: ctx.exp };
			const navigationId = scope.view;

			const navigate = async function (e: Event) {
				e.preventDefault();

				if (scope.confirm != undefined) {
					const confirmResponse = await application.showModalAsync(scope.confirm, $(e.currentTarget as HTMLElement));

					if (!confirmResponse.confirmed) {
						return false;
					}
				}

				const inputs = scope.inputs ?? (scope.ceInputs != undefined ? {} : undefined);
				let persistInputs = scope.persistInputs ?? false;

				// ceInputs are 'key="" key=""' string returned from CalcEngine, used to just put {inputs} into template markup and it dumped attribute
				// if there, otherwise not, so parse them and assign as inputs
				if (scope.ceInputs != undefined) {
					const attrObject = Directives.getObjectFromAttributes(scope.ceInputs as string);
					for (const propertyName in attrObject) {
						if (propertyName.startsWith("data-input-")) {
							inputs!["i" + propertyName.split("-").slice(2).map(n => n[0].toUpperCase() + n.slice(1)).join("")] =
								attrObject[ propertyName ];
						}
					}
				}

				if (inputs != undefined) {
					const cachingKey =
						navigationId == undefined // global
							? "katapp:navigationInputs:global"
							: persistInputs
								? "katapp:navigationInputs:" + navigationId + ":" + (application.options.userIdHash ?? "Everyone")
								: "katapp:navigationInputs:" + navigationId;

					// Shouldn't be previous inputs b/c didn't implement setNavigationInputs method
					/*
					const currentInputsJson = sessionStorage.getItem(cachingKey);
					const currentInputs = currentInputsJson != undefined ? JSON.parse(currentInputsJson) : {};
					Utils.extend(currentInputs, inputs);
					sessionStorage.setItem(cachingKey, JSON.stringify(currentInputs));
					*/

					sessionStorage.setItem(cachingKey, JSON.stringify(inputs));
				}

				await application.triggerEventAsync("onKatAppNavigate", navigationId);

				return false;
			};

			ctx.el.setAttribute("href", "#");
			ctx.el.addEventListener("click", navigate);

			return () => {
				ctx.el.removeEventListener("click", navigate);
			}
		};
	}
}

class DirectiveKaModal implements IKaDirective {
	public name = "ka-modal";
	public getDefinition(application: KatApp): Directive<Element> {
		return ctx => {
			const scope: IKaModalOptions = ctx.get();

			const showModal = async function (e: Event) {
				e.preventDefault();
				const triggerLink = $(e.currentTarget as HTMLInputElement);

				try {
					const response = await application.showModalAsync(
						Utils.clone(scope, (k, v) => ["confirmed", "cancelled", "catch"].indexOf(k) > -1 ? undefined : v),
						triggerLink
					);

					if (response.confirmed) {
						if (scope.confirmed != undefined) {
							scope.confirmed(response.response, application);
						}
						else {
							console.log({ message: "Modal App " + scope.view + " confirmed.", response: response.response });
						}
					}
					else {
						if (scope.cancelled != undefined) {
							scope.cancelled(response.response, application);
						}
						else {
							console.log({ message: "Modal App " + scope.view + " cancelled.", response: response.response });
						}
					}
				} catch (e) {
					if (scope.catch != undefined) {
						scope.catch(e, application);
					}
					else {
						console.log("Modal App " + scope.view + " failed.");
						console.log({ e });
					}
				}
			};

			ctx.el.setAttribute("href", "#");
			ctx.el.addEventListener("click", showModal);

			return () => {
				ctx.el.removeEventListener("click", showModal);
			}
		};
	}
}

class DirectiveKaApp implements IKaDirective {
	public name = "ka-app";
	public getDefinition(application: KatApp): Directive<Element> {
		return ctx => {
			const scope: IKaAppOptions = ctx.get();
			const view = scope.view;

			const nestedAppOptions = Utils.extend<IKatAppOptions>(
				Utils.clone<IKatAppOptions>(application.options, (k, v) => ["handlers", "view", "modalAppOptions", "hostApplication", "currentPage"].indexOf(k) > -1 ? undefined : v),
				{
					view: view,
					currentPage: view,
					hostApplication: application,
					inputs: Utils.extend( { iNestedApplication: 1 }, scope.inputs )
				}
			);
			delete nestedAppOptions.inputs!.iModalApplication;

			const selector = scope.selector ?? "kaNested" + Utils.generateId;
			ctx.el.classList.add(selector);

			let nestedApp: KatApp | undefined;

			(async () => {
				try {
					nestedApp = await KatApp.createAppAsync(selector, nestedAppOptions);
				}
				catch (e) {
					console.log("Nested App " + scope.view + " failed.");
					console.log({ e });
				}
			})();

			return () => {
				if (nestedApp != undefined) {
					KatApp.remove(nestedApp);
				}
			}
		};
	}
}
class DirectiveKaInline implements IKaDirective {
	// https://stackoverflow.com/a/69354385/166231
	public name = "ka-inline";
	public getDefinition(application: KatApp): Directive<Element> {
		return ctx => {
			// Originally, I just got the 'children' and did ctx.el.replaceWith(...children);
			// However, if the next sibling element was a vue decorated element, everything stopped
			// working. I think removing the element while Vue was walking DOM tree caused issues with
			// the loop.
			//
			// Attempt 1: I decorated the element with _v-ka-inline="replace" attribute, and had processing in onCalculation that
			// looked for all elements with this attribute and then did the replace then *after* Vue had done all it's reactivity/rendering.
			// The problem here was then the element was removed and was no longer reactive.
			//
			// Current: So I changed this to have some pre-processing that requires a v-html attribute then duplicates the value into
			// the v-ka-inline attribute so that it can be 'reactive'.  Then during effect(), I put a unique ID on the template and
			// also on any of the 'cloned/rendered' raw html elements.  Then, whenever effect() happens, I remove all cloned/rendered html 
			// elements with matching id and let it re-render the re-active elements

			const inlineId = ctx.el.getAttribute("v-ka-id") ?? Utils.generateId();
			ctx.el.classList.remove("ka-inspector-value");

			ctx.effect(() => {
				// Need to call this to make effect() reactive, contains same expression that was in v-html
				const scope: string = ctx.get();

				if (ctx.el.hasAttribute("v-ka-id")) {
					document.querySelectorAll(`[v-ka-inline-id='${inlineId}']`).forEach(i => i.remove());
				}
				else {
					ctx.el.setAttribute("v-ka-id", inlineId)
				}

				const children = ctx.el.tagName === 'TEMPLATE'
					? [...(ctx.el as HTMLTemplateElement).content.children]
					: [...ctx.el.children];

				children.forEach(c => {
					const render = c.cloneNode(true) as Element;
					if (application.options.debug.showInspector) {
						render.classList.add("ka-inspector-value")
					}
					render.setAttribute("v-ka-inline-id", inlineId);
					ctx.el.before(render);
				});
			});

			return () => {
				document.querySelectorAll(`[v-ka-inline-id='${inlineId}']`).forEach(i => i.remove());
			}
		}
	}
}
class DirectiveKaInspector implements IKaDirective {
	public name = "ka-inspector";
	public getDefinition(application: KatApp): Directive<Element> {
		return ctx => {
			const el = ctx.el;
			const kaId = ctx.el.getAttribute("v-ka-id") ?? Utils.generateId();
			const attributes =
				Array.from(el.attributes)
					.filter(a => a.name != "v-ka-inspector")
					.map(a => ({ name: a.name, value: a.name == "_class" ? a.value.replace("ka-inspector-value", "").trim() : a.value }))
					.filter(a => a.name != "_class" || a.value != "")
					.map(a => `${a.name.substring(1).replace("__at__", "@")}="${a.value}"`)
					.join(" ");

			ctx.effect(() => {
				const info = ctx.get();

				if (ctx.el.hasAttribute("v-ka-id")) {
					if (ctx.el.nextSibling?.nodeType == 8 && (ctx.el.nextSibling.textContent?.indexOf(`KatApp Inspect ${kaId}`) ?? -1) > -1) {
						ctx.el.nextSibling!.remove();
					}
					else {
						console.log(`Unable to find inspector value with ID ${kaId}.  Updated comment will not be displayed.`);
						return;
					}
				}
				else {
					ctx.el.setAttribute("v-ka-id", kaId)
				}

				const details = info.details;
				const scope = info.scope;

				if (scope?.source != undefined && scope.source instanceof Array) {
					scope.source = `Source is array. ${scope.source.length} rows.`
				}

				const itemDetails = (details ?? "") != ""
					? `

Details: ${details}`
					: '';

				const scopeInfo = scope != undefined
					? `

Scope:
${JSON.stringify(scope, null, 2)}`
					: '';

				const comment = new Comment(`
KatApp Inspect ${kaId}
--------------------------------------------------
Element:
<${info.name} ${attributes}>${itemDetails}${scopeInfo}

Rendered Element ↓↓↓↓
`);

				ctx.el.after(comment);
				// ctx.el.replaceWith(comment);
			});
		}
	}
}

class DirectiveKaAttributes implements IKaDirective {
	public name = "ka-attributes";
	public getDefinition(application: KatApp): Directive<Element> {
		return ctx => {
			const attributes = ctx.get();

			if (attributes != undefined && attributes != "") {
				const attrObject = Directives.getObjectFromAttributes(attributes as string);
				for (const propertyName in attrObject) {
					ctx.el.setAttribute(propertyName, attrObject[propertyName]);
				}
			}
		}
	}
}

class DirectiveKaHighchart implements IKaDirective {
	public name = "ka-highchart";

	private cultureEnsured = false;
	private application: KatApp | undefined;

	public getDefinition(application: KatApp): Directive<Element> {
		application.on("onModalAppShown", () => {
			// https://api.highcharts.com/class-reference/Highcharts.Chart#reflow
			application.select("[data-highcharts-chart]").each((i, c) => ($(c).highcharts() as HighchartsChartObject).reflow());
		});

		return ctx => {
			this.application = application;

			let highchart: HighchartsChartObject | undefined;

			ctx.effect(() => {
				if (typeof Highcharts !== "object") {
					Utils.trace(application, `Highcharts javascript is not present for: ${ctx.exp}`, TraceVerbosity.None);
					return;
				}

				const scope: IKaHighchartOptions = ctx.get();
				const data = application.state.rbl.source(`HighCharts-${scope.data}-Data`, scope.ce, scope.tab) as IRblHighChartsDataRow[];
				const optionRows = application.state.rbl.source(`HighCharts-${scope.options ?? scope.data}-Options`, scope.ce, scope.tab) as IRblHighChartsOptionRow[];
				const overrideRows = application.state.rbl.source("HighCharts-Overrides", scope.ce, scope.tab, r => String.compare(r["@id"], scope.data, true) == 0) as IRblHighChartsOverrideRow[];

				const dataRows = data.filter(r => !r.category.startsWith("config-"));
				const seriesConfigurationRows = data.filter(r => r.category.startsWith("config-"));

				// Key automatically added to container for identifying this chart
				const highchartKey = ctx.el.getAttribute('data-highcharts-chart');
				highchart = Highcharts.charts[highchartKey ?? -1];

				if (highchart !== undefined) {
					highchart.destroy();
					highchart = undefined;
				}

				if (dataRows.length > 0) {
					this.ensureCulture();

					const getOptionValue = function (configurationName: string): string | undefined {
						// Look in override table first, then fall back to 'regular' options table
						return overrideRows.find(r => String.compare(r.key, configurationName, true) === 0)?.value ??
							optionRows.find(r => String.compare(r.key, configurationName, true) === 0)?.value;
					}

					const configStyle = getOptionValue("config-style");

					if (configStyle !== undefined) {
						let renderStyle = ctx.el.getAttribute("style") ?? "";
						if (renderStyle !== "" && !renderStyle.endsWith(";")) {
							renderStyle += ";";
						}
						ctx.el.setAttribute("style", renderStyle + configStyle);
					}

					const chartType = getOptionValue("chart.type");
					const tooltipFormat = this.removeRBLEncoding(getOptionValue("config-tooltipFormat"));

					const chartOptions = this.getChartOptions(chartType, tooltipFormat, dataRows, optionRows, overrideRows, seriesConfigurationRows);

					try {
						$(ctx.el).highcharts(chartOptions);
					} catch (error) {
						Utils.trace(application, `Error during highchart creation for ${ctx.exp}`, TraceVerbosity.None);
						console.log({ error });
					}
				}
			});

			return () => {
				// Destroy highchart
				if (highchart !== undefined) {
					highchart.destroy();
				}
			}
		};
	}

	private getChartOptions(chartType: string | undefined, tooltipFormat: string | undefined, dataRows: IRblHighChartsDataRow[], optionRows: IRblHighChartsOptionRow[], overrideRows: IRblHighChartsOverrideRow[], seriesConfigurationRows: IRblHighChartsDataRow[]) {
		const chartOptions: HighchartsOptions = {};

		// First set all API properties from the options/overrides rows (options first, then overrides to replace/append)
		const apiOptions = optionRows.concat(overrideRows).filter(r => !r.key.startsWith("config-"));
		apiOptions.forEach(optionRow => {
			this.setApiOption(chartOptions, optionRow.key, optionRow.value);
		});

		const firstDataRow = dataRows[0];
		const allChartColumns = Object.keys(firstDataRow);
		const seriesColumns = allChartColumns.filter(k => k.startsWith("series"));
		const isXAxisChart = chartType !== "pie" && chartType !== "solidgauge" && chartType !== "scatter3d" && chartType !== "scatter3d";

		chartOptions.series = this.buildSeries(allChartColumns, seriesColumns, seriesConfigurationRows, dataRows, isXAxisChart);

		if (isXAxisChart) {
			chartOptions.xAxis = this.getXAxisOptions(chartOptions.xAxis, dataRows);
		}

		chartOptions.tooltip = this.getTooltipOptions(tooltipFormat, seriesColumns, seriesConfigurationRows) ?? chartOptions.tooltip;

		return chartOptions;
	}

	private getTooltipOptions(tooltipFormat: string | undefined, seriesColumns: string[], seriesConfigurationRows: IRblHighChartsDataRow[]): HighchartsTooltipOptions | undefined {
		if (tooltipFormat === undefined) {
			return undefined;
		}

		// Get the series 'format' row to look for specified format, otherwise return c0 as default (find => firstordefault)
		const configFormat = seriesConfigurationRows.find(c => c.category === "config-format") as IStringAnyIndexer | undefined;

		const seriesFormats = seriesColumns
			// Ensure the series/column is visible
			.filter(seriesName => seriesConfigurationRows.filter((c: IStringAnyIndexer) => c.category === "config-visible" && c[seriesName] === "0").length === 0)
			.map(seriesName => configFormat?.[seriesName] as string || "c0");

		return {
			formatter: function () {
				let s = "";
				let t = 0;

				const pointTemplate = Sys.CultureInfo.CurrentCulture.name.startsWith("fr")
					? "<br/>{name} : {value}"
					: "<br/>{name}: {value}";

				this.points.forEach((point, index) => {
					if (point.y > 0) {

						s += String.formatTokens( pointTemplate, { name: point.series.name, value: String.localeFormat("{0:" + seriesFormats[index] + "}", point.y) });
						t += point.y;
					}
				});
				return String.formatTokens( tooltipFormat, { x: this.x, stackTotal: String.localeFormat("{0:" + seriesFormats[0] + "}", t), seriesDetail: s });
			},
			shared: true
		};
	}

	private getXAxisOptions(existingOptions: HighchartsAxisOptions | HighchartsAxisOptions[] | undefined, dataRows: IRblHighChartsDataRow[]): HighchartsAxisOptions | HighchartsAxisOptions[] | undefined {
		const xAxis = existingOptions as HighchartsAxisOptions ?? {};
		xAxis.categories = dataRows.map(d => this.removeRBLEncoding(d.category) ?? "");

		const plotInformation =
			dataRows
				.map((d, index) => ({ index: index, plotLine: d.plotLine ?? "", plotBand: d.plotBand ?? "" }) as IHighChartsPlotConfigurationRow)
				.filter(r => r.plotLine !== "" || r.plotBand !== "");

		const plotLines: HighchartsPlotLines[] = [];
		const plotBands: HighchartsPlotBands[] = [];

		// Offset should be zero unless you want to adjust the line/band to draw between categories.  If you want to draw before the category, use -0.5.  If you want to draw after category, use 0.5
		// i.e. if you had a column at age 65 and wanted to plot band from there to end of chart, the band would start half way in column starting band 'between' 64 and 65 (i.e. 64.5) will make it so
		// whole bar is in span.
		plotInformation.forEach(row => {
			if (row.plotLine !== "") {
				const info = row.plotLine.split("|");
				const color = info[0];
				const width = Number(info[1]);
				const offset = info.length > 2 ? Number(info[2]) : 0;

				const plotLine: HighchartsPlotLines = {
					color: color,
					value: row.index + offset,
					width: width,
					zIndex: 1
				};

				plotLines.push(plotLine);
			}

			if (row.plotBand !== "") {
				const info = row.plotBand.split("|");
				const color = info[0];
				const span = info[1];
				const offset = info.length > 2 ? Number(info[2]) : 0;

				const from = String.compare(span, "lower", true) === 0 ? -1 : row.index + offset;
				const to =
					String.compare(span, "lower", true) === 0 ? row.index + offset :
					String.compare(span, "higher", true) === 0 ? dataRows.length :
					row.index + Number(span) + offset;

				const plotBand: HighchartsPlotBands = {
					color: color,
					from: from,
					to: to
				};

				plotBands.push(plotBand);
			}
		});

		if (plotLines.length > 0) {
			xAxis.plotLines = plotLines;
		}
		if (plotBands.length > 0) {
			xAxis.plotBands = plotBands;
		}
		return xAxis;
    }

	private buildSeries(allChartColumns: string[], seriesColumns: string[], seriesConfigurationRows: IRblHighChartsDataRow[], dataRows: IRblHighChartsDataRow[], isXAxisChart: boolean): HighchartsSeriesOptions[] {
		const seriesInfo: HighchartsSeriesOptions[] = [];

		seriesColumns.forEach(seriesName => {
			const isVisible = seriesConfigurationRows.filter((c: IStringAnyIndexer) => c.category === "config-visible" && c[seriesName] === "0").length === 0;
			// Don't want series on chart or legend but want it in tooltip/chart data
			const isHidden = seriesConfigurationRows.filter((c: IStringAnyIndexer) => c.category === "config-hidden" && c[seriesName] === "1").length > 0;

			if (isVisible) {
				const series: HighchartsSeriesOptions = {};
				const properties = seriesConfigurationRows
					.filter((c: IStringAnyIndexer) => ["config-visible", "config-hidden", "config-format"].indexOf(c.category) === -1 && c[seriesName] !== undefined)
					.map((c: IStringAnyIndexer) => ({ key: c.category.substring(7), value: c[seriesName] } as IRblHighChartsOptionRow));

				series.data = dataRows.map(d => this.getSeriesDataRow(d, allChartColumns, seriesName, isXAxisChart));

				properties.forEach(c => {
					this.setApiOption(series, c.key, c.value);
				});

				if (isHidden) {
					series.visible = false;
					series.showInLegend = series.showInLegend ?? false;
				}

				seriesInfo.push(series);
			}
		});

		return seriesInfo;
	}

	private getSeriesDataRow(row: IStringAnyIndexer, allChartColumns: string[], seriesName: string, isXAxisChart: boolean): HighchartsDataPoint {
		// id: is for annotations so that points can reference a 'point name/id'
		// name: is for pie chart's built in highcharts label formatter and it looks for '.name' on the point
		const dataRow: IStringAnyIndexer = { y: +row[seriesName], id: seriesName + "." + row.category };

		if (!isXAxisChart) {
			dataRow.name = row.category;
		}

		// Get all the 'data point' property values for the current chart data row
		const pointColumnHeader = "point." + seriesName + ".";
		allChartColumns.filter(k => k.startsWith(pointColumnHeader)).forEach(k => {
			dataRow[k.substring(pointColumnHeader.length)] = this.getOptionValue(row[k]);
		});

		return dataRow;
    }

	private setApiOption(optionsContainer: HighchartsOptions | HighchartsSeriesOptions, name: string, value: string): void {
		let optionJson = optionsContainer;
		const optionNames = name.split(".");
		const optionValue = this.getOptionValue(value);

		// Build up a json object...
		// chart.title.text, Hello = { chart: { title: { text: "Hello } } }
		// annotations[0].labels[0], { point: 'series1.69', text: 'Life Exp' } = { annotations: [ { labels: [ { point: 'series1.69', text: 'Life Exp' } ] } ] }
		for (let k = 0; k < optionNames.length; k++) {
			let optionName = optionNames[k];
			let optionIndex = -1;

			if (optionName.endsWith("]")) {
				const nameParts = optionName.split("[");
				optionName = nameParts[0];
				optionIndex = parseInt(nameParts[1].substring(0, nameParts[1].length - 1));
			}

			const onPropertyValue = k === optionNames.length - 1;

			// When you are on the last name part, instead of setting it
			// to new {} object, set it appropriately to the value passed in CE
			const newValue = onPropertyValue
				? optionValue
				: {};

			const needsArrayElement = optionIndex > -1 && optionJson[optionName] != undefined && (optionJson[optionName] as HighchartsOptionsArray).length - 1 < optionIndex;

			// If doesn't exist, set it to new object or array
			if (optionJson[optionName] === undefined) {
				optionJson[optionName] = optionIndex > -1 ? [newValue] : newValue;
			}
			else if (onPropertyValue || needsArrayElement) {
				if (optionIndex > -1) {
					const propertyArray = optionJson[optionName] as HighchartsOptionsArray;
					// If property is an array and index isn't there yet, push a new element
					while (propertyArray.length - 1 < optionIndex) {
						propertyArray.push(undefined);
					}
					propertyArray[optionIndex] = newValue;
				}
				else {
					// If on property value and exists, this is an override, so just replace the value
					optionJson[optionName] = newValue;
				}
			}

			// Reset my local variable to the most recently added/created object
			optionJson = optionIndex > -1
				? optionJson[optionName][optionIndex]
				: optionJson[optionName];
		}
	}

	private getOptionValue(value: string): string | boolean | number | (() => void) | undefined {
		const d = Number(value);

		if (value === undefined || String.compare(value, "null", true) === 0) return undefined;
		else if (!isNaN(d) && value !== "") return d;
		else if (String.compare(value, "true", true) === 0) return true;
		else if (String.compare(value, "false", true) === 0) return false;
		else if (value.startsWith("json:")) return JSON.parse(value.substring(5));
		else if (value.startsWith("var ")) {
			// Not sure this is ever used because it doesn't appear to work.
			// It assigns a function() to the property instead of the value.
			// Introduced eval method to immediately eval the text
			const v = value.substring(4);
			return function (): any { return eval(v); } // eslint-disable-line @typescript-eslint/no-explicit-any
		}
		else if (value.startsWith("eval ")) {
			const v = value.substring(5);

			return eval(v);
		}
		else if (value.startsWith("function ")) {
			// FindDr has: 
			//  function ( event ) { $(\".iChartClick\").val( event.point.id ).trigger('change'); }
			// Only works if I DON'T have the (event) in my code, so substring after ( didn't work
			// and only substring after { worked. 
			// const f = 
			//  this.removeRBLEncoding("function f {function} f.call(this);"
			//      .format( { function: value.substring(value.indexOf("(")) } ));
			// https://bitbucket.org/benefittechnologyresources/katapp/commits/f81b20cb5d76b24d92579613b2791bbe37374eb2#chg-client/KatAppProvider.ts
			//
			// **BUT** I don't understand how 'event' (or other parms described in Highcharts documentation) 
			// are available when they aren't really mentioned anywhere.
			// **NOTE**: Also, if I simply use what's inside { } instead of the function f() { ... } f.call(this);
			//           it also seems to work.
			const f = this.removeRBLEncoding(
				String.formatTokens("function f() {function} f.call(this);", { function: value.substring(value.indexOf("{")) })
			);

			return function (): any { return eval(f!); } // eslint-disable-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-non-null-assertion
		}
		else {
			return this.removeRBLEncoding(value);
		}
	}

	private ensureCulture(): void {
		if (!this.cultureEnsured) {
			this.cultureEnsured = true;
			const culture = this.application!.state.rbl.value("variable", "culture") ?? "en-";
			if (!culture.startsWith("en-")) {
				Highcharts.setOptions({
					yAxis: {
						labels: {
							formatter: function (this: HighchartsDataPoint): string {
								return String.localeFormat("{0:c0}", this.value);
							}
						},
						stackLabels: {
							formatter: function (this: HighchartsDataPoint): string {
								return String.localeFormat("{0:c0}", this.value);
							}
						}
					}
				});
			}
		}
	}

	private removeRBLEncoding(value: string | undefined): string | undefined {
		if (value === undefined) return value;

		// http://stackoverflow.com/a/1144788/166231
		/*
		function escapeRegExp(string) {
			return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
		}
		*/
		return value.replace(/<</g, "<")
			.replace(/&lt;&lt;/g, "<")
			.replace(/>>/g, ">")
			.replace(/&gt;&gt;/g, ">")
			.replace(/&quot;/g, "\"")
			.replace(/&amp;nbsp;/g, "&nbsp;");
	}
}

class DirectiveKaTable implements IKaDirective {
	public name = "ka-table";

	public getDefinition(application: KatApp): Directive<Element> {
		return ctx => {
			ctx.effect(() => {
				const scope: IKaTableOptions = ctx.get();
				const data = application.state.rbl.source(scope.name, scope.ce, scope.tab);

				const container = $(ctx.el);
				container.children().remove();

				container.html(`<p>Table: ${scope.name}, Rows: ${data.length}</p>`);
			});
		};
	}
}
