class TemplateBase {
	static templateRenderedCount: IStringIndexer<number> = {};

	public getRenderedId(templateId: string | undefined): string | undefined {
		if (templateId == undefined) {
			return undefined;
		}

		TemplateBase.templateRenderedCount[templateId] = TemplateBase.templateRenderedCount[templateId] == undefined
			? 1
			: TemplateBase.templateRenderedCount[templateId] + 1;
		
		return `${templateId.substring(1)}_${TemplateBase.templateRenderedCount[templateId]}`;
	}
}