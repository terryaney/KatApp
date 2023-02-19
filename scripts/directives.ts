interface IKaDirective {
	name: string;
	getDefinition(application: KatApp): Directive<Element> | AsyncDirective<Element>;
}

// v-ka-input, v-ka-input-group, v-ka-template, [button | a].v-ka-needs-calc - pre-processed into 'scope'

class Directives {
	public static initializeCoreDirectives(vueApp: PetiteVueApp, application: KatApp): void {
		[
			new DirectiveKaInspector(),

			new DirectiveKaAttributes(),
			new DirectiveKaInline(),
			new DirectiveKaResource(),

			new DirectiveKaHighchart(),
			new DirectiveKaTable(),

			new DirectiveKaValue(),

			new DirectiveKaNavigate(),
			new DirectiveKaModal(),
			new DirectiveKaApp(),
			new DirectiveKaApi()

		].forEach(d => {
			vueApp.directive(d.name, d.getDefinition(application));
		});
	}

	public static getObjectFromAttributes(attributes: string): IStringIndexer<string> {
		// https://stackoverflow.com/questions/30420491/javascript-regex-to-get-tag-attribute-value/48396506#48396506
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

			const model = ctx.exp.startsWith("{") ? ctx.get() : undefined;

			if (model != undefined && model.table == undefined) {
				model.table = "rbl-value";
			}

			const selector = ctx.exp.startsWith("{")
				? undefined
				: ctx.exp;

			let selectors = selector?.split(".").map(s => s != "" ? s : undefined) ?? [];

			if (selectors.length == 1) {
				selectors = ["rbl-value", selectors[0] ];
			}

			const getSelector = function (pos: number) {
				return selectors.length > pos && selectors[pos] != "" ? selectors[pos] : undefined;
			};

			ctx.effect(() => {
				ctx.el.innerHTML =
					application.state.rbl.value(
						model?.table ?? getSelector(0)!,
						model?.keyValue ?? getSelector(1)!,
						model?.returnField ?? getSelector(2),
						model?.keyField ?? getSelector(3),
						model?.ce ?? getSelector(4),
						model?.tab ?? getSelector(5)
					) ?? ctx.el.innerHTML;
			});
		};
	}
}

class DirectiveKaResource implements IKaDirective {
	public name = "ka-resource";
	public getDefinition(application: KatApp): Directive<Element> {
		return ctx => {
			const defaultValue = ctx.el.innerHTML;

			ctx.effect(() => {
				const model = ctx.exp.startsWith("{")
					? ctx.get()
					: { key: (ctx.exp != "" ? ctx.exp : undefined ) ?? ctx.el.innerHTML };

				const key = model.key ?? ctx.el.innerHTML;
				
				ctx.el.innerHTML = application.getLocalizedString(key, model, defaultValue);
			});
		};
	}
}

class DirectiveKaApi implements IKaDirective {
	public name = "ka-api";
	public getDefinition(application: KatApp): Directive<Element> {
		return ctx => {
			const scope: IKaApiModel = ctx.exp.startsWith("{") ? ctx.get() : { endpoint: ctx.exp };
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
						Utils.clone(scope, (k, v) => ["confirm", "endpoint", "then", "catch"].indexOf(k) > -1 ? undefined : v),
						$(ctx.el as HTMLElement)
					);

					if (scope.then != undefined) {
						scope.then(response, application);
					}
				} catch (e) {
					if (scope.catch != undefined) {
						scope.catch(e, application);
					}
					else {
						Utils.trace(application, "DirectiveKaApi", "submitApi", `API Submit to ${endpoint} failed.`, TraceVerbosity.None, e);
					}
				}
			};

			ctx.el.setAttribute("href", "#");
			$(ctx.el).on("click.ka-api", submitApi);

			return () => {
				$(ctx.el).off("click.ka-api");
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

			// TODO: I think I want this all inside an .effect method.  Because when view only had manual result, it rendered everything when
			//		I did mount.  Then later on, when I updated the BRD/manual result info, other things tied to those results (i.e. v-html for links)
			//		were automatically reactive and updated correctly, but my navigate remained with old values

			let scope: IKaNavigateModel = ctx.get();

			try {
				if (scope.model != undefined) {
					scope = ctx.get(scope.model);
				}
			} catch (e) {
				Utils.trace(application, "DirectiveKaNavigate", "getDefinition", `Unable to compile 'model' property: ${scope.model}`, TraceVerbosity.None, e);
			}

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

				// ceInputs are 'key="" key=""' string returned from CalcEngine, used to just put {inputs} into template markup and it dumped attribute
				// if there, otherwise not, so parse them and assign as inputs
				if (scope.ceInputs != undefined) {
					const attrObject = Directives.getObjectFromAttributes(scope.ceInputs);
					for (const propertyName in attrObject) {
						if (propertyName.startsWith("i") || /* legacy */ propertyName.startsWith("data-input-")) {
							const inputName = propertyName.startsWith("i")
								? propertyName
								: "i" + propertyName.split("-").slice(2).map(n => n[0].toUpperCase() + n.slice(1)).join("");

							inputs![inputName] = attrObject[ propertyName ];
						}
					}
				}

				await application.navigateAsync(navigationId, { inputs: inputs, persistInputs: scope.persistInputs ?? false });

				return false;
			};

			ctx.el.setAttribute("href", "#");
			$(ctx.el).on("click.ka-navigate", navigate);

			return () => {
				$(ctx.el).off("click.ka-navigate");
			}
		};
	}
}

class DirectiveKaModal implements IKaDirective {
	public name = "ka-modal";
	public getDefinition(application: KatApp): Directive<Element> {
		return ctx => {
			ctx.effect(() => {
				let scope: IKaModalModel = ctx.get();

				try {
					if (scope.model != undefined) {
						scope = ctx.get(scope.model);
					}
				} catch (e) {
					Utils.trace(application, "DirectiveKaModal", "getDefinition", `Unable to compile 'model' property: ${scope.model}`, TraceVerbosity.None, e);
				}

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
								Utils.trace(application, "DirectiveKaModal", "showModal", `Modal App ${scope.view} confirmed.`, TraceVerbosity.Normal, response.response);
							}
						}
						else {
							if (scope.cancelled != undefined) {
								scope.cancelled(response.response, application);
							}
							else {
								Utils.trace(application, "DirectiveKaModal", "showModal", `Modal App ${scope.view} cancelled.`, TraceVerbosity.Normal, response.response);
							}
						}
					} catch (e) {
						if (scope.catch != undefined) {
							scope.catch(e, application);
						}
						else {
							Utils.trace(application, "DirectiveKaModal", "showModal", `Modal App ${scope.view} failed.`, TraceVerbosity.None, e);
						}
					}
				};

				ctx.el.setAttribute("href", "#");
				$(ctx.el).off("click.ka-modal").on("click.ka-modal", showModal);
			});

			return () => {
				$(ctx.el).off("click.ka-modal");
			}
		};
	}
}

class DirectiveKaApp implements IKaDirective {
	public name = "ka-app";
	public getDefinition(application: KatApp): Directive<Element> {
		return ctx => {
			const scope: IKaAppModel = ctx.get();
			const view = scope.view;

			const nestedAppOptions = Utils.extend<IKatAppOptions>(
				Utils.clone<IKatAppOptions>(application.options, (k, v) => ["handlers", "view", "modalAppOptions", "hostApplication", "currentPage"].indexOf(k) > -1 ? undefined : v),
				{
					view: view,
					currentPage: view,
					hostApplication: application,
					inputs: Utils.extend<ICalculationInputs>({ iNestedApplication: "1" } as ICalculationInputs, scope.inputs )
				}
			);
			delete nestedAppOptions.inputs!.iModalApplication;

			const selector = scope.selector ?? ".kaNested" + Utils.generateId();
			ctx.el.classList.add(selector.substring(1));

			let nestedApp: KatApp | undefined;

			(async () => {
				try {
					await PetiteVue.nextTick(); // Make sure the classList.add() method above finishes
					nestedApp = await KatApp.createAppAsync(selector, nestedAppOptions);
				}
				catch (e) {
					Utils.trace(application, "DirectiveKaApp", "getDefinition", `Nested App ${scope.view} failed.`, TraceVerbosity.None, e);
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
			let comment: Comment | undefined = undefined;

			ctx.effect(() => {
				const info = ctx.get();
				const kaTargetId = ctx.el.getAttribute("ka-inspector-target-id");

				if (kaTargetId != undefined) {
					// Only process if the ka-inspector-target-id has been set...
					const details = info.details;
					const blocks: Array<IStringAnyIndexer> = info.blocks;

					const inspectTarget = document.querySelector(`[ka-inspector-id='${kaTargetId}']`)!;

					let commentContent = `
KatApp Inspect ${kaTargetId}
--------------------------------------------------
${(details ?? "") != `Details: ${details}

` ? "" : ""}`;

					blocks.forEach(b => {
						const scope = b.scope;
						if (scope?.source != undefined && scope.source instanceof Array) {
							scope.source = `Source is array. ${scope.source.length} rows.`
						}

						const scopeInfo = scope != undefined
							? `

Scope:
${JSON.stringify(scope, null, 2)}

`
							: '';

						const attributes =
							Object.keys(b.attributes)
								.map(k => (b.attributes[k] ?? "") != "" ? `${k}="${b.attributes[k]}"` : k)
								.join(" ");

						commentContent += `Element:
<${b.name} ${attributes}>${scopeInfo}`
					});

					commentContent += `Rendered Element(s) ↓↓↓↓`

					if (inspectTarget == undefined) {
						Utils.trace(application, "DirectiveKaInspector", "getDefinition", `Unable to find inspector target.`, TraceVerbosity.Detailed, commentContent);
					}
					else {
						if (inspectTarget.previousSibling?.nodeType == 8 && (inspectTarget.previousSibling?.textContent?.indexOf(`KatApp Inspect ${kaTargetId}`) ?? -1) > -1) {
							inspectTarget.previousSibling!.remove();
						}
						comment = new Comment(commentContent);

						inspectTarget.before(comment);
					}
				}
			});

			return () => {
				if (comment !== undefined) {
					comment.remove();
				}
			}
		}
	}
}

class DirectiveKaAttributes implements IKaDirective {
	public name = "ka-attributes";
	public getDefinition(application: KatApp): Directive<Element> {
		return ctx => {
			const attributes: string = ctx.get();

			if (attributes != undefined && attributes != "") {
				const attrObject = Directives.getObjectFromAttributes(attributes);
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
	// private appReflowAdded = false;
	private application: KatApp | undefined;

	// Automatic reflow...
	// 1. After app is originally displayed, all application charts are reflowed
	// 2. If chart is inside a tab-pane, hook to 'shown.bs.tab' using aria-labelledby attribute will reflow current chart
	// 3. If a v-if item contains a v-ka-highchart, a mounted event is added to v-if element to reflow child charts
	public getDefinition(application: KatApp): Directive<Element> {

		return ctx => {
			this.application = application;

			const navItemId = application.closest(ctx.el as HTMLElement, ".tab-pane").attr("aria-labelledby");
			if (navItemId != undefined) {
				const navItem = application.select("#" + navItemId);
				navItem.on('shown.bs.tab', () => ($(ctx.el).highcharts() as HighchartsChartObject).reflow() );
			}

			let highchart: HighchartsChartObject | undefined;

			ctx.effect(() => {
				if (typeof Highcharts !== "object") {
					Utils.trace(application, "DirectiveKaHighchart", "getDefinition", `Highcharts javascript is not present.`, TraceVerbosity.None, ctx.exp);
					return;
				}

				const scope: IKaHighchartModel = ctx.get();
				const data = application.state.rbl.source(`HighCharts-${scope.data}-Data`, scope.ce, scope.tab) as Array<IRblHighChartsDataRow>;
				const optionRows = application.state.rbl.source<IRblHighChartsOptionRow>(`HighCharts-${scope.options ?? scope.data}-Options`, scope.ce, scope.tab);
				const overrideRows = application.state.rbl.source<IRblHighChartsOverrideRow>("HighCharts-Overrides", scope.ce, scope.tab, r => String.compare(r["@id"], scope.data, true) == 0);

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
						Utils.trace(application, "DirectiveKaHighchart", "getDefinition", `Error during highchart creation.`, TraceVerbosity.None, ctx.exp, error);
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
		const configFormat = seriesConfigurationRows.find(c => c.category === "config-format");

		const seriesFormats = seriesColumns
			// Ensure the series/column is visible
			.filter(seriesName => seriesConfigurationRows.filter(c => c.category === "config-visible" && c[seriesName] === "0").length === 0)
			.map(seriesName => configFormat?.[seriesName] || "c0");

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
				.map<IHighChartsPlotConfigurationRow>((d, index) => ({ index: index, plotLine: d.plotLine ?? "", plotBand: d.plotBand ?? "" }))
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
					.map<IRblHighChartsOptionRow>( c => ({ key: c.category.substring(7), value: c[seriesName]! }));

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
				const scope: IKaTableModel = ctx.get();
				const data = application.state.rbl.source(scope.name, scope.ce, scope.tab);

				$(ctx.el).empty();

				if (data.length > 0) {
					let tableCss = scope.css != undefined
						? `rbl ${scope.name} ${scope.css}`
						: `rbl ${scope.name} table table-sm table-hover`;

					const hasResponsiveTable = tableCss.indexOf("table-responsive") > -1;
					tableCss = tableCss.replace("table-responsive", "");

					const tableConfigRow = data[0] as IStringAnyIndexer;

					const tableColumns: IKaTableColumnConfiguration[] = [];
					const columnConfiguration: IStringIndexer<IKaTableColumnConfiguration> = {};

					let hasBootstrapTableWidths = false;

					Object.keys(tableConfigRow)
						.filter(k => k.startsWith("text") || k.startsWith("value"))
						.map(k => (
							{
								Name: k,
								Element: tableConfigRow[k],
								Meta: tableConfigRow["@" + k] ?? {},
								Width: tableConfigRow["@" + k]?.[hasResponsiveTable ? "@r-width" : "@width"]
							})
						)
						.forEach(e => {
							const config = {
								name: e.Name,
								isTextColumn: e.Name.startsWith("text"),
								cssClass: e.Meta["@class"],
								width: e.Width !== undefined && !e.Width.endsWith("%") ? + e.Width : undefined,
								widthPct: e.Width !== undefined && e.Width.endsWith("%") ? e.Width : undefined,
								xsColumns: (e.Meta["@xs-width"] != undefined ? e.Meta["@xs-width"] * 1 : undefined) || (hasResponsiveTable && e.Meta["@width"] != undefined ? e.Meta["@width"] * 1 : undefined),
								smColumns: e.Meta["@sm-width"] != undefined ? e.Meta["@sm-width"] * 1 : undefined,
								mdColumns: e.Meta["@md-width"] != undefined ? e.Meta["@md-width"] * 1 : undefined,
								lgColumns: e.Meta["@lg-width"] != undefined ? e.Meta["@lg-width"] * 1 : undefined
							};

							if (config.xsColumns !== undefined || config.smColumns !== undefined || config.mdColumns !== undefined || config.lgColumns !== undefined) {
								hasBootstrapTableWidths = true;
							}

							tableColumns.push(config);
							columnConfiguration[e.Name] = config;
						});

					const isHeaderRow = (row: ITabDefRow) => {
						const code = row["code"] ?? "";
						const id = row["@id"] ?? "";
						return (code === "h" || code.startsWith("header") || code.startsWith("hdr")) ||
							(id === "h" || id.startsWith("header") || id.startsWith("hdr"));
					};

					const getHeaderSpanCell = (row: IStringAnyIndexer, isHeader: boolean, span: string, getBootstrapSpanColumnCss?: (start: number, length: number) => string ) => {
						if (!isHeader || span != "") return undefined;

						// If only one cell with value and it is header, span entire row
						const keys = Object.keys(row);

						const values = keys
							.filter(k => k.startsWith("text") || k.startsWith("value"))
							.map(k => ({
								Name: k,
								Value: row[k] ?? "",
								Class: `${columnConfiguration[k].isTextColumn ? "text" : "value"} span-${scope.name}-${k} ${getBootstrapSpanColumnCss?.(0, tableColumns.length - 1) ?? ""}`
							}))
							.filter(c => c.Value !== "");

						return values.length === 1 ? values[0] : undefined;
					};
					
					const getSpanItems = (row: IStringAnyIndexer, span: string, getBootstrapSpanColumnCss?: (start: number, length: number) => string) => {
						const parts = span.split(":");
						let currentCol = 0;

						const spanItems: Array<{ Value: string, Class: string, Span: number }> = [];

						for (let p = 0; p < parts.length; p++) {
							if (p % 2 === 0) {
								const colSpan = +parts[p + 1];
								const colSpanName = parts[p];
								const spanConfig = columnConfiguration[colSpanName];
								const _class = `${spanConfig.isTextColumn ? "text" : "value"} ${spanConfig.cssClass ?? ""} span-${scope.name}-${colSpan} ${getBootstrapSpanColumnCss?.(currentCol, colSpan - 1) ?? ""}`;

								spanItems.push({ Value: row[colSpanName] ?? "", Class: _class, Span: colSpan});
							}
						}

						return spanItems;
					};
					const addClass = (el: HTMLElement, css: string) => {
						if (css.trim() != "") {
							el.classList.add(...css.trim().split(' '));
						}
					};

					const useBootstrapColumnWidths = hasBootstrapTableWidths && !hasResponsiveTable;

					if (useBootstrapColumnWidths) {
						const getBootstrapColumnCss = (c: IKaTableColumnConfiguration) => {
							let bsClass = c.xsColumns !== undefined ? " col-xs-" + c.xsColumns : "";
							bsClass += c.smColumns !== undefined ? " col-sm-" + c.smColumns : "";
							bsClass += c.mdColumns !== undefined ? " col-md-" + c.mdColumns : "";
							bsClass += c.lgColumns !== undefined ? " col-lg-" + c.lgColumns : "";
							bsClass += ` ${c.cssClass ?? ""}`;
							return bsClass.trim();
						};
						const getBootstrapSpanColumnCss = (start: number, length: number) => {
							const spanCols = tableColumns.filter((c, i) => i >= start && i <= start + length);
							const xs = spanCols.reduce((sum, curr) => sum + (curr.xsColumns ?? 0), 0);
							const sm = spanCols.reduce((sum, curr) => sum + (curr.smColumns ?? 0), 0);
							const md = spanCols.reduce((sum, curr) => sum + (curr.mdColumns ?? 0), 0);
							const lg = spanCols.reduce((sum, curr) => sum + (curr.lgColumns ?? 0), 0);
							let bsClass = xs > 0 ? " col-xs-" + xs : "";
							bsClass += sm > 0 ? " col-sm-" + sm : "";
							bsClass += md > 0 ? " col-md-" + md : "";
							bsClass += lg > 0 ? " col-lg-" + lg : "";

							return bsClass.trim();
						};

						const container = document.createElement("div");

						data.forEach(r => {
							const isHeader = isHeaderRow(r);

							const row = document.createElement("div");
							addClass(row, `${r["@class"] ?? r["class"] ?? ""} row tr-row ${isHeader ? "h-row" : ""}`);

							const span = r["span"] ?? "";
							const headerSpanCell = getHeaderSpanCell(r, isHeader, span, getBootstrapSpanColumnCss);

							if (headerSpanCell != undefined) {
								const col = document.createElement("div");
								addClass(col, headerSpanCell.Class);
								col.innerHTML = headerSpanCell.Value;
								row.appendChild(col);
							}
							else if (span != "") {
								row.append(
									...getSpanItems(r, span, getBootstrapSpanColumnCss)
										.map(s => {
											const spanCol = document.createElement("div");
											addClass(spanCol, s.Class);
											spanCol.innerHTML = s.Value;
											return spanCol;
										})
								);
							}
							else {
								tableColumns.forEach(c => {
									const col = document.createElement("div");
									addClass(col, `${getBootstrapColumnCss(c)} ${c.isTextColumn ? "text" : "value"} ${scope.name}-${c.name}`);
									col.innerHTML = r[c.name] ?? "";
									row.append(col);
								})
							}

							container.append(row);
						});

						ctx.el.append(container);
					}
					else {
						const getColGroupDef = () => {
							const colGroupDef = document.createElement("colgroup");
							tableColumns.forEach(c => {
								const width = c.width !== undefined || c.widthPct !== undefined
									? ` width="${c.widthPct || (c.width + "px")}"`
									: "";

								const col = document.createElement("col");
								col.setAttribute("class", `${scope.name}-${c.name}`);

								if (c.width !== undefined || c.widthPct !== undefined) {
									col.setAttribute("width", c.widthPct || (c.width + "px"));
								}

								colGroupDef.append(col);
							});

							return colGroupDef;
						};

						const table = document.createElement("table");
						addClass(table, tableCss);
						table.appendChild(getColGroupDef());

						let rowContainer: HTMLTableSectionElement | undefined = undefined;

						/* Needed?
						table.setAttribute("border", "0");
						table.setAttribute("cellspacing", "0");
						table.setAttribute("cellpadding", "0");
						*/

						data.forEach(r => {
							const isHeader = isHeaderRow(r);

							if (isHeader && rowContainer == undefined) {
								rowContainer = document.createElement("thead");
								table.append(rowContainer);
							}
							else if (!isHeader && rowContainer?.tagName != "TBODY") {
								rowContainer = document.createElement("tbody");
								table.append(rowContainer);
							}

							const row = document.createElement("tr");
							addClass(row, `${r["@class"] ?? r["class"] ?? ""} ${isHeader && rowContainer!.tagName == "TBODY" ? "h-row" : ""}`);

							const elementName = isHeader ? "th" : "td";
							const span = r["span"] ?? "";
							const headerSpanCell = getHeaderSpanCell(r, isHeader, span);

							if (headerSpanCell != undefined) {
								const col = document.createElement(elementName);
								addClass(col, headerSpanCell.Class);
								col.innerHTML = headerSpanCell.Value;
								row.appendChild(col);
							}
							else if (span != "") {
								row.append(
									...getSpanItems(r, span)
										.map(s => {
											const spanCol = document.createElement(elementName);
											addClass(spanCol, s.Class);
											spanCol.setAttribute("colspan", s.Span.toString());
											spanCol.innerHTML = s.Value;
											return spanCol;
										})
								);
							}
							else {
								tableColumns.forEach(c => {
									const col = document.createElement(elementName);
									addClass(col, `${c.cssClass ?? ""} ${c.isTextColumn ? "text" : "value"} ${scope.name}-${c.name}`);
									col.innerHTML = r[c.name] ?? "";
									row.append(col);
								})
							}

							rowContainer!.append(row);
						});

						if (hasResponsiveTable) {
							const container = document.createElement("div");
							container.classList.add("table-responsive");
							container.append(table);
							ctx.el.append(container);
						}
						else {
							ctx.el.append(table);
						}
					}
				}
			});
		};
	}
}
