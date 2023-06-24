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
			// new DirectiveKaTrigger(),

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