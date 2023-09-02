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
					application.getLocalizedString(
						application.state.rbl.value(
							model?.table ?? getSelector(0)!,
							model?.keyValue ?? getSelector(1)!,
							model?.returnField ?? getSelector(2),
							model?.keyField ?? getSelector(3),
							model?.ce ?? getSelector(4),
							model?.tab ?? getSelector(5)
						) ?? ctx.el.innerHTML
					)!;
			});
		};
	}
}