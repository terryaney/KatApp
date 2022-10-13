declare const Highcharts: HighchartsStatic;

interface HighchartsStatic {
	charts: Record<string | number, HighchartsChartObject>;
	setOptions: (options: HighchartsGlobalOptions) => void;
}

interface HighchartsChartObject {
	destroy: () => void;
	reflow: () => void;
}

interface JQuery {
	highcharts: (options?: HighchartsOptions) => JQuery | HighchartsChartObject;
}

interface HighchartsGlobalOptions extends HighchartsOptions {
}

interface HighchartsOptions extends IStringAnyIndexer {
	xAxis?: HighchartsAxisOptions | HighchartsAxisOptions[];
	yAxis?: HighchartsAxisOptions | HighchartsAxisOptions[];
	series?: HighchartsSeriesOptions[];
	tooltip?: HighchartsTooltipOptions;
}

interface HighchartsAxisOptions {
	labels?: HighchartsAxisLabels;
	stackLabels?: HighchartsAxisLabels;
	categories?: string[];
	plotBands?: HighchartsPlotBands[];
	plotLines?: HighchartsPlotLines[];
}

interface HighchartsAxisLabels {
	formatter?: () => string;
}

interface HighchartsDataPoint {
	value?: number;
}

interface HighchartsSeriesOptions extends IStringAnyIndexer {

}

interface HighchartsOptionsArray extends Array<any> { // eslint-disable-line @typescript-eslint/no-explicit-any
	// made this interface to just put the one lint comment and not have to put lint every place I use it
}

interface HighchartsTooltipOptions {
	formatter: (this: HighchartsTooltipFormatterContextObject) => string;
	shared: boolean;
}

interface HighchartsTooltipFormatterContextObject {
	y: number;
	x: number;
	series: {
		name: string;
	};
	points: Array<HighchartsTooltipFormatterContextObject>;
}

interface HighchartsPlotLines {
	color?: string | HighchartsGradient;
	value?: number;
	width?: number;
	zIndex?: number;
}
interface HighchartsGradient {
}
interface HighchartsPlotBands {
	color?: string | HighchartsGradient;
	from?: number;
	to?: number;
}