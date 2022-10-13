export { };

declare global {
	interface StringConstructor {
		compare: (strA: string | undefined, strB: string | undefined, ignoreCase?: boolean) => number;
		formatTokens(template: string, parameters: IStringAnyIndexer): string;
		localeFormat(format: string, ...args: any[]): string;
	}
	interface Number {
		localeFormat(format: string): string;
	}
}