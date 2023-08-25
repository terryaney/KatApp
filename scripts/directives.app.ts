class DirectiveKaApp implements IKaDirective {
	public name = "ka-app";
	public getDefinition(application: KatApp): Directive<Element> {
		return ctx => {
			const scope: IKaAppModel = ctx.get();
			const view = scope.view;

			const propertiesToSkip = ["handlers", "view", "modalAppOptions", "hostApplication", "currentPage"];
			
			const nestedAppOptions = Utils.extend<IKatAppOptions>(				
				Utils.clone<IKatAppOptions>(application.options, (k, v) => propertiesToSkip.indexOf(k) > -1 ? undefined : v),
				{
					view: view,
					currentPage: view,
					hostApplication: application,
					inputs: Utils.extend<ICalculationInputs>({ iNestedApplication: "1" } as ICalculationInputs, scope.inputs )
				}
			);
			delete nestedAppOptions.inputs!.iModalApplication;

			const selector = scope.selector ?? ".kaNested" + Utils.generateId();
			ctx.el.classList.add(selector.substring(1));

			let nestedApp: KatApp | undefined;

			(async () => {
				try {
					await PetiteVue.nextTick(); // Make sure the classList.add() method above finishes
					nestedApp = await KatApp.createAppAsync(selector, nestedAppOptions);
				}
				catch (e) {
					Utils.trace(application, "DirectiveKaApp", "getDefinition", `Nested App ${scope.view} failed.`, TraceVerbosity.None, e);
				}
			})();

			return () => {
				if (nestedApp != undefined) {
					KatApp.remove(nestedApp);
				}
			}
		};
	}
}