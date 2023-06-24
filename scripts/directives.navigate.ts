class DirectiveKaNavigate implements IKaDirective {
	public name = "ka-navigate";
	public getDefinition(application: KatApp): Directive<Element> {
		return ctx => {
			/*
			Mistakenly did :v-ka-navigate="row.link"...you can't do that b/c it tries to run all directives first (so misses these since start with ':' instead of 'v-'), 
			and afterwards it does attribute binding.  So no directives can depend on :bind attributes, petite-vue itself does have a little hack in there to defer v-model 
			saying it needs to make sure :value is bound first, but there is no injection point to support.

			However leaving this sample in here in case I need to do custom functions at some point/reason

			let exp = ctx.exp;
			if (exp.startsWith("{{")) {
				exp = new Function('$scope', `with($scope){return (${exp.substring(2, exp.length - 4)})}`)(ctx.ctx.scope);
			}
			*/

			// TODO: I think I want this all inside an .effect method.  Because when view only had manual result, it rendered everything when
			//		I did mount.  Then later on, when I updated the BRD/manual result info, other things tied to those results (i.e. v-html for links)
			//		were automatically reactive and updated correctly, but my navigate remained with old values

			let scope: IKaNavigateModel = ctx.get();

			try {
				if (scope.model != undefined) {
					scope = ctx.get(scope.model);
				}
			} catch (e) {
				Utils.trace(application, "DirectiveKaNavigate", "getDefinition", `Unable to compile 'model' property: ${scope.model}`, TraceVerbosity.None, e);
			}

			const navigationId = scope.view;

			const navigate = async function (e: Event) {
				e.preventDefault();

				if (scope.clearDirty ?? false) {
					application.state.isDirty = false;
				}
				
				if (scope.confirm != undefined) {
					const confirmResponse = await application.showModalAsync(scope.confirm, $(e.currentTarget as HTMLElement));

					if (!confirmResponse.confirmed) {
						return false;
					}
				}

				const inputs = scope.inputs ?? (scope.ceInputs != undefined ? {} : undefined);

				// ceInputs are 'key="" key=""' string returned from CalcEngine, used to just put {inputs} into template markup and it dumped attribute
				// if there, otherwise not, so parse them and assign as inputs
				if (scope.ceInputs != undefined) {
					const attrObject = Directives.getObjectFromAttributes(scope.ceInputs);
					for (const propertyName in attrObject) {
						if (propertyName.startsWith("i") || /* legacy */ propertyName.startsWith("data-input-")) {
							const inputName = propertyName.startsWith("i")
								? propertyName
								: "i" + propertyName.split("-").slice(2).map(n => n[0].toUpperCase() + n.slice(1)).join("");

							inputs![inputName] = attrObject[ propertyName ];
						}
					}
				}

				await application.navigateAsync(navigationId, { inputs: inputs, persistInputs: scope.persistInputs ?? false });

				return false;
			};

			ctx.el.setAttribute("href", "#");
			$(ctx.el).on("click.ka-navigate", navigate);

			return () => {
				$(ctx.el).off("click.ka-navigate");
			}
		};
	}
}