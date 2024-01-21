/// <reference path="./components.TemplateBase.ts" />

class TemplateComponent extends TemplateBase {
	constructor(private props: { name: string, source?: IStringAnyIndexer | Array<ITabDefRow> }) {
		super();
	}

	public getScope(application: KatApp, getTemplateId: (name: string) => string | undefined): IStringAnyIndexer | Array<ITabDefRow> {
		if (this.props.name == undefined) {
			throw new Error("You must provide {name:'templateName'} when using v-ka-template.");
		}

		const templateId = getTemplateId(this.props.name);

		if (templateId == undefined) {
			return {};
		}

		TemplateComponent.templateRenderedCount[templateId] = TemplateComponent.templateRenderedCount[templateId] == undefined
			? 1
			: TemplateComponent.templateRenderedCount[templateId] + 1;

		if (this.props.source instanceof Array) {
			const that = this;
			return {
				$template: templateId,
				$renderId: that.getRenderedId(templateId),

				application: application,
				modalAppOptions: application.options.modalAppOptions,
				get rows() { return that.props.source; }
			};
		}
		else {
			const scope = this.props.source ?? {};
			scope.$template = templateId;
			scope.$renderId = this.getRenderedId(templateId);
			scope.application = application;
			scope.modalAppOptions = application.options.modalAppOptions;
			return scope;
		}
	}
}

/*
class KaScopeComponent {
	constructor(private scope?: IStringAnyIndexer | Array<ITabDefRow>) {
	}
	public getScope(application: KatApp): IStringAnyIndexer | Array<ITabDefRow> {
		const scope = this.scope ?? {};

		if (scope instanceof Array) {
			return {
				application: application,
				modalAppOptions: application.options.modalAppOptions,
				rows: scope
			};
		}
		else {
			scope["application"] = application;
			scope["modalAppOptions"] = application.options.modalAppOptions;
			return scope;
		}
	}
}
*/
