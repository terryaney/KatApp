class DirectiveKaApi implements IKaDirective {
	public name = "ka-api";
	public getDefinition(application: KatApp): Directive<Element> {
		return ctx => {
			const scope: IKaApiModel = ctx.exp.startsWith("{") ? ctx.get() : { endpoint: ctx.exp };
			const endpoint = scope.endpoint;

			const submitApi = async function (e: Event) {
				e.preventDefault();

				if (scope.confirm != undefined) {
					const confirmResponse = await application.showModalAsync(scope.confirm, $(e.currentTarget as HTMLElement));

					if (!confirmResponse.confirmed) {
						return;
					}
				}

				try {
					const response = await application.apiAsync(
						endpoint,
						Utils.clone(scope, (k, v) => ["confirm", "endpoint", "then", "catch"].indexOf(k) > -1 ? undefined : v),
						$(ctx.el as HTMLElement)
					);

					if (scope.thenAsync != undefined) {
						await scope.thenAsync(response, application);
					}
				} catch (e) {
					if (scope.catchAsync != undefined) {
						await scope.catchAsync(e, application);
					}
					else {
						Utils.trace(application, "DirectiveKaApi", "submitApi", `API Submit to ${endpoint} failed.`, TraceVerbosity.None, e);
					}
				}
			};

			ctx.el.setAttribute("href", "#");
			$(ctx.el).on("click.ka-api", submitApi);

			return () => {
				$(ctx.el).off("click.ka-api");
			}
		};
	}
}