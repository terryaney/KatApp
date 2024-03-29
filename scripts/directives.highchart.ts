﻿class DirectiveKaHighchart implements IKaDirective {
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
				const exists = (highchart = Highcharts.charts[ctx.el.getAttribute('data-highcharts-chart') ?? -1]) != undefined;
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
						highchart = Highcharts.charts[ctx.el.getAttribute('data-highcharts-chart')!];
						if (exists) {
							// Screen probably not redrawing, so need to ensure it reflows into the proper height
							($(ctx.el).highcharts() as HighchartsChartObject).reflow();
						}		
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
			.map(seriesName => configFormat?.[seriesName] ?? "c0");

		return {
			formatter: function () {
				let s = "";
				let t = 0;

				const pointTemplate = Sys.CultureInfo.CurrentCulture.name.startsWith("fr")
					? "<br/>{{name}} : {{value}}"
					: "<br/>{{name}}: {{value}}";

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
		else if (value.startsWith("resource:")) return this.application?.getLocalizedString(value.substring(9));
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
			const f = this.removeRBLEncoding(`function f() ${value.substring(value.indexOf("{"))} f.call(this);`);

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