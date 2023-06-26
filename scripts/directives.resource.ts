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
				
				ctx.el.innerHTML = application.getLocalizedString(key, model, defaultValue)!;
			});
		};
	}
}