class DirectiveKaModal implements IKaDirective {
	public name = "ka-modal";
	public getDefinition(application: KatApp): Directive<Element> {
		return ctx => {
			ctx.effect(() => {
				let scope: IKaModalModel = ctx.get();

				try {
					if (scope.model != undefined) {
						scope = ctx.get(scope.model);
					}
				} catch (e) {
					Utils.trace(application, "DirectiveKaModal", "getDefinition", `Unable to compile 'model' property: ${scope.model}`, TraceVerbosity.None, e);
				}

				const showModal = async function (e: Event) {
					e.preventDefault();
					const triggerLink = $(e.currentTarget as HTMLInputElement);

					try {
						if (scope.beforeOpenAsync != undefined) {
							await scope.beforeOpenAsync(application);
						}

						const response = await application.showModalAsync(
							Utils.clone(scope, (k, v) => ["beforeOpenAsync", "confirmedAsync", "cancelledAsync", "catchAsync"].indexOf(k) > -1 ? undefined : v),
							triggerLink
						);

						if (response.confirmed) {
							if (scope.confirmedAsync != undefined) {
								await scope.confirmedAsync(response.response, application);
							}
							else {
								Utils.trace(application, "DirectiveKaModal", "showModal", `Modal App ${scope.view} confirmed.`, TraceVerbosity.Normal, response.response);
							}
						}
						else {
							if (scope.cancelledAsync != undefined) {
								await scope.cancelledAsync(response.response, application);
							}
							else {
								Utils.trace(application, "DirectiveKaModal", "showModal", `Modal App ${scope.view} cancelled.`, TraceVerbosity.Normal, response.response);
							}
						}
					} catch (e) {
						if (scope.catchAsync != undefined) {
							await scope.catchAsync(e, application);
						}
						else {
							Utils.trace(application, "DirectiveKaModal", "showModal", `Modal App ${scope.view} failed.`, TraceVerbosity.None, e);
						}
					}
				};

				ctx.el.setAttribute("href", "#");
				$(ctx.el).off("click.ka-modal").on("click.ka-modal", showModal);
			});

			return () => {
				$(ctx.el).off("click.ka-modal");
			}
		};
	}
}
