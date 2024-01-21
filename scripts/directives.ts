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
}