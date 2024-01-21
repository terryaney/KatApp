class KamlCompiler {
	private showInspector: boolean;
	private applicationId: string;

	constructor(application: KatApp) {
		this.showInspector = application.options.debug.showInspector;
		this.applicationId = application.id;
	}

	public compileMarkup(kaml: Element, resourceKey: string): void {
		const kaResources = document.querySelector("ka-resources")!;
		const processingTemplates = resourceKey != this.applicationId;

		// Put all template file <style> blocks into markup if not already added from previous app (host, modal, nested)
		if (processingTemplates) {
			const keyParts = resourceKey.split(":"); // In case "Rel:"
			const containerId = keyParts[keyParts.length - 1].split("?")[0].replace(/\//g, "_"); // Cache buster
			const kamlTemplatesAdded = kaResources.querySelector(`style[ka=${containerId}]`) != undefined;

			kaml.querySelectorAll<HTMLStyleElement>("style").forEach(s => {
				if (kamlTemplatesAdded) {
					s.remove();
				}
				else {
					s.setAttribute("ka", containerId);
					kaResources.appendChild(s);
				}
			});
		}

		this.processMarkup(kaml);

		// Update template ids and move them to ka-resources
		kaml.querySelectorAll<HTMLTemplateElement>("template[id]")
			.forEach(template => {
				const keyParts = resourceKey.split(":"); // In case "Rel:"
				const containerId = keyParts[keyParts.length - 1].split("?")[0].replace(/\//g, "_"); // Cache buster
				template.id = `${template.id}_${containerId}`;

				// Only process template markup once (in case same template file is requested for multiple apps on the page)
				if (kaResources.querySelector(`template[id=${template.id}]`) == undefined) {
					this.processMarkup(template.content);

					// If this is an 'input template', need attach mounted/unmounted events on all 'inputs'
					if (template.hasAttribute("input")) {
						this.mountInputs(template.content);
						template.removeAttribute("input");
					}

					template.content.querySelectorAll("style, script").forEach(templateItem => {
						this.addMountAttribute(templateItem, "mounted", `_templateItemMounted('${template.id}', $el, $data)`);
						if (templateItem.tagName == "SCRIPT") {
							this.addMountAttribute(templateItem, "unmounted", `_templateItemUnmounted('${template.id}', $el, $data)`);
						}
					});

					kaResources.appendChild(template);
				}
				else {
					template.remove();
				}
			});
	}

	private processMarkup(container: Element | DocumentFragment) {
		let compileError = false;
		container.querySelectorAll("[v-for][v-if]").forEach(directive => {
			console.log(directive);
			compileError = true;
		});
		if (compileError) {
			throw new Error("v-for and v-if on same element.  The v-for should be moved to a child <template v-for/> element.");
		}

		// Make sure v-ka-inline only present on template items, then move the 'v-html' source
		// into the scope for v-ka-inline so it is reactive
		container.querySelectorAll("[v-ka-inline]").forEach(directive => {
			if (directive.tagName != "TEMPLATE" || !directive.hasAttribute("v-html")) {
				console.log(directive);
				compileError = true;
			}
			else {
				directive.setAttribute("v-ka-inline", directive.getAttribute("v-html")!);
			}
		});
		if (compileError) {
			throw new Error("v-ka-inline can only be used on <template/> elements and must have a v-html attribute.");
		}

		container.querySelectorAll<HTMLTemplateElement>("template:not([id])").forEach(template => {
			Array.from(template.content.children).filter( c => c.hasAttribute( "v-if" ) ).forEach(invalid => {
				console.log(invalid);
				compileError = true;
			})
		});
		if (compileError) {
			throw new Error("A v-if can not be a direct decendent of an inline <template/>.  Wrap the v-if element with a div.");
		}

		// Turn v-ka-input into v-scope="components.input({})"
		container.querySelectorAll("[v-ka-input]").forEach(directive => {
			let scope = directive.getAttribute("v-ka-input")!;
			if (!scope.startsWith("{")) {
				scope = `{ name: '${scope}' }`;
			}

			this.inspectElement(directive, scope);

			directive.removeAttribute("v-ka-input");
			directive.setAttribute("v-scope", `components.input(${scope})`);

			// If no template used, just hooking up the input
			if (scope.indexOf("template:") == -1 && scope.indexOf("'template':") == -1) {
				const isInput = ['INPUT', 'SELECT', 'TEXTAREA'].indexOf(directive.tagName) > -1;

				if (isInput) {
					// Just binding a raw input
					this.addMountAttribute(directive, "mounted", "inputMounted($el, $refs)");
					this.addMountAttribute(directive, "unmounted", "inputUnmounted($el)");
				}
				else {
					// If v-ka-input was on a 'container' element that contains inputs...drill into content and mount inputs
					this.mountInputs(directive);
				}
			}
		});

		// Fix v-ka-highchart 'short hand' of data or data.options string into a valid {} scope
		container.querySelectorAll("[v-ka-highchart]").forEach(directive => {
			let scope = directive.getAttribute("v-ka-highchart")!;

			if (!scope.startsWith("{")) {
				// Using short hand of just the 'table names': 'data.options' (.options name is optional)
				const chartParts = scope.split('.');
				const data = chartParts[0];
				const options = chartParts.length >= 2 ? chartParts[1] : chartParts[0];
				scope = `{ data: '${data}', options: '${options}' }`;
			}

			directive.setAttribute("v-ka-highchart", scope);
			this.inspectElement(directive, scope);
		});

		// Fix v-ka-table 'short hand' of name string into a valid {} scope
		container.querySelectorAll("[v-ka-table]").forEach(directive => {
			let scope = directive.getAttribute("v-ka-table")!;

			if (!scope.startsWith("{")) {
				// Using short hand of just the 'table name'
				scope = `{ name: '${scope}' }`;
			}

			directive.setAttribute("v-ka-table", scope);
			this.inspectElement(directive, scope);
		});

		// Fix v-ka-navigate 'short hand' of view string into a valid {} scope
		container.querySelectorAll("[v-ka-navigate]").forEach(directive => {
			let scope = directive.getAttribute("v-ka-navigate")!;

			if (!scope.startsWith("{")) {
				// Using short hand of just the 'table names': 'data.options' (.options name is optional)
				scope = `{ view: '${scope}' }`;
			}

			directive.setAttribute("v-ka-navigate", scope);
			this.inspectElement(directive, scope);
		});

		// Turn v-ka-rbl-no-calc into ka-rbl-no-calc='true' (was .rbl-nocalc)
		// Turn v-ka-rbl-exclude into ka-rbl-exclude='true' (was .rbl-exclude)
		// Turn v-ka-unmount-clears-inputs into ka-unmount-clears-inputs='true' (was .rbl-clear-on-unmount)
		container.querySelectorAll("[v-ka-rbl-no-calc],[v-ka-rbl-exclude],[v-ka-unmount-clears-inputs]").forEach(directive => {
			if ( directive.hasAttribute("v-ka-rbl-no-calc") ) {
				directive.removeAttribute("v-ka-rbl-no-calc");
				directive.setAttribute("ka-rbl-no-calc", "true");
			}
			if ( directive.hasAttribute("v-ka-rbl-exclude") ) {
				directive.removeAttribute("v-ka-rbl-exclude");
				directive.setAttribute("ka-rbl-exclude", "true");
			}
			if ( directive.hasAttribute("v-ka-unmount-clears-inputs") ) {
				directive.removeAttribute("v-ka-unmount-clears-inputs");
				directive.setAttribute("ka-unmount-clears-inputs", "true");
			}
		});

		// Turn v-ka-needs-calc into two items with toggled class and handler
		container.querySelectorAll("button[v-ka-needs-calc], a[v-ka-needs-calc]").forEach(directive => {
			let needsCalcText = directive.getAttribute("v-ka-needs-calc");

			if (needsCalcText == "") {
				needsCalcText = "<i class='fa-solid fa-rotate-right'></i>&nbsp;Refresh";
			}

			directive.setAttribute("v-if", "!needsCalculation");

			this.inspectElement(directive, `{ needsCalcText: '${needsCalcText}' }`, `Cloned element immediately following with v-if=needsCalculation`);

			directive.removeAttribute("v-ka-needs-calc");

			const refresh = directive.cloneNode(true) as Element;
			for (const { name, value } of [...refresh.attributes]) {
				if (name.startsWith("@click") ) {
					refresh.attributes.removeNamedItem(name);
				}
			}
			refresh.innerHTML = needsCalcText!;

			refresh.setAttribute("v-if", "needsCalculation");
			directive.after(refresh);
		});

		// Turn v-ka-input-group into v-scope="components.inputGroup({})"
		container.querySelectorAll("[v-ka-input-group]").forEach(directive => {
			const scope = directive.getAttribute("v-ka-input-group")!;

			this.inspectElement(directive, scope);

			directive.removeAttribute("v-ka-input-group");
			directive.setAttribute("v-scope", `components.inputGroup(${scope})`);
		});

		// Also automatically setup helptips again if the item is removed/added via v-if and the v-if contains tooltips (popup config is lost on remove)
		// Used to occur inside template[id] processing right after mountInputs(); call, but I think this should happen all the time

		// PROBLEM: May have a problem here...if v-if contains templates that contain other v-ifs or helptips...the processing might not work right b/c selection doesn't
		// span outside/inside of templates
		container.querySelectorAll("[v-if]").forEach(directive => {
			// Only do the 'outer most if'...otherwise the 'container' context when doing getTipContent is wrong and the 'selector' isn't found
			// UPDATE: Leaving condition in, but I didn't see any inputs with 'nested' v-if directives so not sure it is needed
			// directive.parentElement?.closest("[v-if]") == undefined

			this.addMountAttribute(directive, "mounted", `_domElementMounted($el)`);
			this.inspectElement(directive, `{ condition: ${directive.getAttribute("v-if")} }`);
		});

		container.querySelectorAll("[v-for], [v-else-if], [v-else]").forEach(directive => {
			this.addMountAttribute(directive, "mounted", `_domElementMounted($el)`);
		});

		// Not sure if I need this.  Don't think I do, but leaving here in case I do need to
		// preprocess v-ka-resource items.
		/*
		// Turn v-ka-resource with 'content as the key' into v-ka-resource="{ key: 'content', ...
		container.querySelectorAll("[v-ka-resource]").forEach(directive => {
			const resourceKeyRegex = /\{\s*key\s*:\s* /g; get rid of space between * and /
			const exp = directive.getAttribute("v-ka-resource");
			const needsKey = exp == null || (exp.startsWith("{") && !resourceKeyRegex.test(exp));

			if (needsKey) {
				if (exp == null) {
					directive.setAttribute("v-ka-resource", `{ key: '${directive.innerHTML}' }`);
				}
			}
			console.log("Needs key: " + directive.outerHTML);
		});
		*/
	
		// Turn v-ka-template="templateId, scope" into v-scope="components.template(templateId, scope)"
		container.querySelectorAll("[v-ka-template]").forEach(directive => {
			const needsReactiveForRE = /.*?name'?\s*:\s*(?<value>'?[\w\s\.]+'?)/;
			const exp = directive.getAttribute("v-ka-template")!;
			const scope = exp.startsWith("{")
				? exp
				: `{ name: '${exp}' }`;

			this.inspectElement(directive, scope);
			directive.removeAttribute("v-ka-template");

			const nameValue = needsReactiveForRE.exec(scope)?.groups!.value ?? ""
			const needsReactiveFor = !directive.hasAttribute("v-for") && !nameValue.startsWith("'");

			if (needsReactiveFor) {
				/*
					Need to change following:
					<div v-ka-template="{ name: model.templateName, source: model.list }" class="mt-5 row"></div>

					To:	
					<template v-for="_reactive_template in [{ name: model.templateName, source: model.list }]" :key="_reactive_template.name">
						<div v-scope="components.template({ name: _reactive_template.name, source: _reactive_template.source})" class="mt-5 row"></div>
					</template>

					Needed loop on single item so that reactivity would kick in when it changed and render a new item

					Tried to create via dom manipulation wasn't working.  I think the 'template' element screwed it up with the 'document fragment' created
					before dom markup was 'really' loaded by browser and then resulted in double document fragment?  No idea, but outerHTML assignment worked.

					const reactiveFor: Element = document.createElement("template");
					reactiveFor.setAttribute("v-for", `_reactive_template in [${scope}]`);
					reactiveFor.setAttribute(":key", "_reactive_template.name");
					directive.before(reactiveFor);
					reactiveFor.appendChild(directive);

					However, the end markup looks like this 🤪:
					<template v-for="_reactive_template in [{ name: model.templateName, source: model.list }]" :key="_reactive_template.name">
						<div v-scope="components.template({ name: _reactive_template.name, source: _reactive_template.source})" class="mt-5 row"></div>
						<template></template>
					</template>
				*/

				directive.setAttribute("v-scope", `components.template({ name: _reactive_template.name, source: _reactive_template.source})`);
				directive.outerHTML = `<template v-for="_reactive_template in [${scope}]" :key="_reactive_template.name">${directive.outerHTML}<template>`;
			}
			else {
				directive.setAttribute("v-scope", `components.template(${scope})`);
			}
		});

		if (this.showInspector) {
			container.querySelectorAll("[v-ka-modal]").forEach(directive => {
				const scope = directive.getAttribute("v-ka-modal");

				this.inspectElement(directive, scope);
			});
			container.querySelectorAll("[v-ka-api]").forEach(directive => {
				let scope = directive.getAttribute("v-ka-api")!;

				if (!scope.startsWith("{")) {
					scope = `{ endpoint: '${scope}' }`;
				}

				this.inspectElement(directive, scope);
			});
			container.querySelectorAll("[v-ka-app]").forEach(directive => {
				let scope = directive.getAttribute("v-ka-app")!;

				if (!scope.startsWith("{")) {
					scope = `{ view: '${scope}' }`;
				}

				this.inspectElement(directive, scope);
			});

			container.querySelectorAll("[v-for]").forEach(directive => {
				this.inspectElement(directive);
			});

			// Common Vue directives
			container.querySelectorAll("[v-show]").forEach(directive => {
				this.inspectElement(directive, `{ condition: ${directive.getAttribute("v-show")} }`);
			});

			container.querySelectorAll("[v-effect], [v-on]").forEach(directive => {
				// No scope here b/c v-effect can be 'code eval' (not returning anything just 'doing' something - setting inner html)
				// v-on - no scope either, just dump the original element markup
				this.inspectElement(directive);
			});

			// Following items always last since they can be added
			// to same element with other (more important) v-ka- elements
			// that I want to inspect
			container.querySelectorAll("[v-ka-value], [v-ka-attributes], [v-ka-inline], [v-html], [v-text]").forEach(directive => {
				this.inspectElement(directive);
			});

			// TODO: Need @ and : attribute items and {{ }} syntax
		}

		// Recurse for every template without an ID (named templates will be processed next and moved to kaResources)
		container.querySelectorAll<HTMLTemplateElement>("template:not([id])").forEach(template => {
			this.processMarkup(template.content);
		});
	}

	// Add mount event to dump comment with 'markup details'
	private inspectElement(el: Element, scope?: string | null, details?: string) {
		if (this.showInspector && !el.classList.contains("ka-inspector-value")) {
			el.classList.add("ka-inspector-value");

			const getBlockString = (blockEl: Element, blockScope: string | null | undefined): string => {
				const attrs: IStringAnyIndexer = {};
				Array.from(blockEl.attributes)
					.filter(a => a.name != "ka-inspector-id")
					.forEach(a => {
						attrs[a.name] = a.value;
					});

				return `{ name: '${blockEl.tagName.toLowerCase()}', scope: ${blockScope?.replace(/"/g, '&quot;') ?? 'undefined' }, attributes: ${JSON.stringify(attrs)} }`;
			}

			const blocks: Array<string> = [];

			const currentScope = el.hasAttribute("v-for")
				? el.getAttribute("v-for")!.substring(el.getAttribute("v-for")!.indexOf(" in ") + 4)
				: scope;

			blocks.push(getBlockString(el, currentScope));

			let ifEl = el.nextElementSibling;
			while (ifEl != undefined && (ifEl.hasAttribute("v-else-if") || ifEl.hasAttribute("v-else"))) {
				ifEl.classList.add("ka-inspector-value");
				blocks.push(getBlockString(ifEl, ifEl.getAttribute("v-else-if") ) );
				ifEl = ifEl.nextElementSibling;
			}

			const inspectorCommentId = Utils.generateId();
			const inspectorScope = `{ inspectorTargetId: _inspectors[ '${inspectorCommentId}' ], details: ${details != undefined ? `\'${details}\'` : 'undefined'}, blocks: [${blocks.join(", ")}] }`;
			const inspector: Element = document.createElement("template");
			inspector.setAttribute("v-ka-inspector", inspectorScope);
			el.before(inspector);
			el.setAttribute("v-on:vue:mounted", `_inspectorMounted($el, '${inspectorCommentId}')`);
		}
	}

	// Add mounted/unmounted attributes and safely keep any previously assigned values.
	private addMountAttribute(el: Element, type: string, exp: string, predicate?: (existingScript: string) => boolean ) {
		let mountScript = el.getAttribute("v-on:vue:" + type) ?? el.getAttribute("@vue:" + type) ?? ""

		if (predicate?.(mountScript) ?? true) {
			el.removeAttribute("v-on:vue:" + type);
			el.removeAttribute("@vue:" + type);

			if (mountScript.startsWith("handlers.") && mountScript.indexOf("(") == -1) {
				// the @vue:mounted simply pointed to a handlers.function...but since we are appending more
				// script to it, need to change it into a function call...
				mountScript += "($event)"
			}

			el.setAttribute("v-on:vue:" + type, `${mountScript != '' ? mountScript + ';' : ''}${exp}`);
		}
	}

	// Mount all inputs within a template
	private mountInputs(container: Element | DocumentFragment) {
		container.querySelectorAll("input:not([v-ka-nomount]), select:not([v-ka-nomount]), textarea:not([v-ka-nomount])").forEach(input => {
			this.addMountAttribute(input, "mounted", "inputMounted($el, $refs)");
			this.addMountAttribute(input, "unmounted", "inputUnmounted($el)");
		});

		// If a template contains a template/v-for (i.e. radio button list) need to drill into each one and look for inputs
		container.querySelectorAll<HTMLTemplateElement>("template[v-for]").forEach(t => {
			this.mountInputs(t.content);
		});
	};
}