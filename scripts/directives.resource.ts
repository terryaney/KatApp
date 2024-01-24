class DirectiveKaResource implements IKaDirective {
	public name = "ka-resource";
	public getDefinition(application: KatApp): Directive<Element> {
		return ctx => {
			const defaultValue = ctx.el.innerHTML != "" ? ctx.el.innerHTML : undefined;

			ctx.effect(() => {
				const model: IKaResourceModel = ctx.exp.startsWith("{")
					? ctx.get()
					: { key: (ctx.exp != "" ? ctx.exp : undefined ) ?? ctx.el.innerHTML };

				let key: string | undefined = model.key ?? ctx.el.innerHTML;
				
				if (key != undefined && key.indexOf( "^" ) == -1 && model.templateArguments != undefined) {
					key = [key, ...model.templateArguments].join("^");
				}

				ctx.el.innerHTML = defaultValue != undefined
					? application.getLocalizedString(key, model as IStringIndexer<string>, defaultValue)!
					: application.getLocalizedString(key, model as IStringIndexer<string>)!;
				
				ctx.el.setAttribute("data-resource-key", key);
				if (application.missingResources.findIndex(x => x == key) != -1) {
					ctx.el.classList.add("missing");
				}
				else {
					ctx.el.classList.remove("missing");
				}
				if (application.missingLanguageResources.findIndex(x => x == key) != -1) {
					ctx.el.classList.add("missing-culture");
				}
				else {
					ctx.el.classList.remove("missing-culture");
				}
			});
		};
	}
}