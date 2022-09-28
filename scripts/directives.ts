interface IKaDirective {
	name: string;
	getDefinition(application: KatApp): Directive<Element> | AsyncDirective<Element>;
}

// v-ka-input, v-ka-input-group, v-ka-template, button/a.v-ka-needs-calc - pre-processed into 'scope'

class Directives {
	public static initializeCoreDirectives(vueApp: PetiteVueApp, application: KatApp): void {
		[
			new DirectiveKaAttributes(),

			new DirectiveKaNavigate(),
			new DirectiveKaValue(),
			new DirectiveKaModal(),
			new DirectiveKaApp(),
			new DirectiveKaApi()

		].forEach(d => {
			vueApp.directive(d.name, d.getDefinition(application));
		});
	}

	public static getObjectFromAttributes(attributes: string): IStringIndexer<string> {
		const regex = new RegExp('[\\s\\r\\t\\n]*([a-z0-9\\-_]+)[\\s\\r\\t\\n]*=[\\s\\r\\t\\n]*([\'"])((?:\\\\\\2|(?!\\2).)*)\\2', 'ig');
		const o: IStringIndexer<string> = {};
		let match : RegExpExecArray | null = null;

		while ((match = regex.exec(attributes))) {
			o[match[1]] = match[3];
		}

		return o;
	}
}

class DirectiveKaValue implements IKaDirective {
	public name = "ka-value";
	public getDefinition(application: KatApp): Directive<Element> {
		return ctx => {
			// Shortcut for v-html="rbl.value(table, keyValue, returnField, keyField, calcEngine, tab)"
			// table, keyValue, returnField, keyField, calcEngine, tab
			let selectors = ctx.exp.split(".").map(s => s != "" ? s : undefined);
			if (selectors.length == 1) {
				selectors = ["rbl-value", ...selectors];
			}
			const getSelector = function (pos: number) { return selectors.length > pos && selectors[pos] != "" ? selectors[pos] : undefined; };

			ctx.effect(() => {
				ctx.el.innerHTML =
					application.state.rbl.value(
						getSelector(0)!,
						getSelector(1)!,
						getSelector(2),
						getSelector(3),
						getSelector(4),
						getSelector(5)
					) ?? "";
			});
		};
	}
}

class DirectiveKaApi implements IKaDirective {
	public name = "ka-api";
	public getDefinition(application: KatApp): Directive<Element> {
		return ctx => {
			const scope: IKaApiOptions = ctx.exp.startsWith("{") ? ctx.get() : { endpoint: ctx.exp };
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
						Utils.clone(scope, (k, v) => ["confirm", "endpoint", "then", "catch"].indexOf(k) > -1 ? undefined : v), undefined, $(ctx.el as HTMLElement)
					);

					if (scope.then != undefined) {
						scope.then(response, application);
					}
				} catch (e) {
					if (scope.catch != undefined) {
						scope.catch(e, application);
					}
					else {
						console.log("API Submit to " + endpoint + " failed.");
						console.log({ e });
					}
				}
			};

			ctx.el.setAttribute("href", "#");
			ctx.el.addEventListener("click", submitApi);

			return () => {
				ctx.el.removeEventListener("click", submitApi);
			}
		};
	}
}

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

			const scope: IKaNavigateOptions = ctx.exp.startsWith("{") ? ctx.get() : { view: ctx.exp };
			const navigationId = scope.view;

			const navigate = async function (e: Event) {
				e.preventDefault();

				if (scope.confirm != undefined) {
					const confirmResponse = await application.showModalAsync(scope.confirm, $(e.currentTarget as HTMLElement));

					if (!confirmResponse.confirmed) {
						return;
					}
				}

				const inputs = scope.inputs ?? (scope.ceInputs != undefined ? {} : undefined);
				let persistInputs = scope.persistInputs ?? false;

				// ceInputs are 'key="" key=""' string returned from CalcEngine, used to just put {inputs} into template markup and it dumped attribute
				// if there, otherwise not, so parse them and assign as inputs
				if (scope.ceInputs != undefined) {
					const attrObject = Directives.getObjectFromAttributes(scope.ceInputs as string);
					for (const propertyName in attrObject) {
						if (propertyName.startsWith("data-input-")) {
							inputs!["i" + propertyName.split("-").slice(2).map(n => n[0].toUpperCase() + n.slice(1)).join("")] =
								attrObject[ propertyName ];
						}
					}
				}

				if (inputs != undefined) {
					const cachingKey =
						navigationId == undefined // global
							? "katapp:navigationInputs:global"
							: persistInputs
								? "katapp:navigationInputs:" + navigationId + ":" + (application.options.userIdHash ?? "Everyone")
								: "katapp:navigationInputs:" + navigationId;

					// Shouldn't be previous inputs b/c didn't implement setNavigationInputs method
					/*
					const currentInputsJson = sessionStorage.getItem(cachingKey);
					const currentInputs = currentInputsJson != undefined ? JSON.parse(currentInputsJson) : {};
					Utils.extend(currentInputs, inputs);
					sessionStorage.setItem(cachingKey, JSON.stringify(currentInputs));
					*/

					sessionStorage.setItem(cachingKey, JSON.stringify(inputs));
				}

				application.triggerEvent("onKatAppNavigate", navigationId);
			};

			ctx.el.setAttribute("href", "#");
			ctx.el.addEventListener("click", navigate);

			return () => {
				ctx.el.removeEventListener("click", navigate);
			}
		};
	}
}

class DirectiveKaModal implements IKaDirective {
	public name = "ka-modal";
	public getDefinition(application: KatApp): Directive<Element> {
		return ctx => {
			const scope: IKaModalOptions = ctx.get();

			const showModal = async function (e: Event) {
				e.preventDefault();
				const triggerLink = $(e.currentTarget as HTMLInputElement);

				try {
					const response = await application.showModalAsync(
						Utils.clone(scope, (k, v) => ["confirmed", "cancelled", "catch"].indexOf(k) > -1 ? undefined : v),
						triggerLink
					);

					if (response.confirmed) {
						if (scope.confirmed != undefined) {
							scope.confirmed(response.response, application);
						}
						else {
							console.log({ message: "Modal App " + scope.view + " confirmed.", response: response.response });
						}
					}
					else {
						if (scope.cancelled != undefined) {
							scope.cancelled(response.response, application);
						}
						else {
							console.log({ message: "Modal App " + scope.view + " cancelled.", response: response.response });
						}
					}
				} catch (e) {
					if (scope.catch != undefined) {
						scope.catch(e, application);
					}
					else {
						console.log("Modal App " + scope.view + " failed.");
						console.log({ e });
					}
				}
			};

			ctx.el.setAttribute("href", "#");
			ctx.el.addEventListener("click", showModal);

			return () => {
				ctx.el.removeEventListener("click", showModal);
			}
		};
	}
}

class DirectiveKaApp implements IKaDirective {
	public name = "ka-app";
	public getDefinition(application: KatApp): AsyncDirective<Element> {
		return async ctx => {
			const scope: IKaAppOptions = ctx.get();
			const view = scope.view;

			const nestedAppOptions = Utils.extend<IKatAppOptions>(
				Utils.clone<IKatAppOptions>(application.options, (k, v) => ["handlers", "view", "modalAppOptions", "hostApplication", "currentPage"].indexOf(k) > -1 ? undefined : v),
				{
					view: view,
					currentPage: view,
					hostApplication: application,
					inputs: Utils.extend( { iNestedApplication: 1 }, scope.inputs )
				}
			);
			delete nestedAppOptions.inputs!.iModalApplication;

			const selector = scope.selector ?? "kaNested" + Utils.generateId;
			ctx.el.classList.add(selector);

			let nestedApp: KatApp | undefined;

			try {
				nestedApp = await KatApp.createAppAsync(selector, nestedAppOptions);
			} catch (e) {
				console.log("Nested App " + scope.view + " failed.");
				console.log({ e });
			}

			return () => {
				if (nestedApp != undefined) {
					KatApp.remove(nestedApp);
				}
			}
		};
	}
}

class DirectiveKaAttributes implements IKaDirective {
	public name = "ka-attributes";
	public getDefinition(application: KatApp): Directive<Element> {
		return ctx => {
			const attributes = ctx.get();

			if (attributes != undefined && attributes != "") {
				const attrObject = Directives.getObjectFromAttributes(attributes as string);
				for (const propertyName in attrObject) {
					ctx.el.setAttribute(propertyName, attrObject[propertyName]);
				}
			}
		}
	}
}