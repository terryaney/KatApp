class DirectiveKaAttributes implements IKaDirective {
	public name = "ka-attributes";
	public getDefinition(application: KatApp): Directive<Element> {
		return ctx => {
			const attributes: string = ctx.get();

			if (attributes != undefined && attributes != "") {
				const attrObject = Utils.getObjectFromAttributes(attributes);
				for (const propertyName in attrObject) {
					ctx.el.setAttribute(propertyName, attrObject[propertyName]);
				}
			}
		}
	}
}