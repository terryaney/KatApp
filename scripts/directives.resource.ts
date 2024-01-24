﻿class DirectiveKaResource implements IKaDirective {
	public name = "ka-resource";
	public getDefinition(application: KatApp): Directive<Element> {
		return ctx => {
			const defaultValue = ctx.el.innerHTML != "" ? ctx.el.innerHTML : undefined;

			ctx.effect(() => {
				const model = ctx.exp.startsWith("{")
					? ctx.get()
					: { key: (ctx.exp != "" ? ctx.exp : undefined ) ?? ctx.el.innerHTML };

				const key = model.key ?? ctx.el.innerHTML;
				
				ctx.el.innerHTML = defaultValue != undefined
					? application.getLocalizedString(key, model, defaultValue)!
					: application.getLocalizedString(key, model)!;
				
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