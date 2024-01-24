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

		// Put all template *file <style> blocks* (not inside a template, but at root of file) into markup if not already added from previous app (host, modal, nested)
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

	private checkVueSyntax(container: Element | DocumentFragment) {
		let compileError = false;
		container.querySelectorAll("[v-for][v-if]").forEach(directive => {
			console.log(directive);
			compileError = true;
		});
		if (compileError) {
			throw new Error("v-for and v-if on same element.  The v-for should be moved to a child <template v-for/> element.");
		}

		// Make sure v-ka-inline only present on template items
		container.querySelectorAll("[v-ka-inline]").forEach(directive => {
			if (directive.tagName != "TEMPLATE" || !directive.hasAttribute("v-html")) {
				console.log(directive);
				compileError = true;
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
			// https://github.com/vuejs/petite-vue/pull/218 - This would fix it supposedly
			throw new Error("A v-if can not be a direct decendent of an inline <template/>.  Wrap the v-if element with a div.");
		}
	}

	private processMarkup(container: Element | DocumentFragment) {
		this.checkVueSyntax(container);

		// Turn 'directives' into v-scope components...
		// Turn v-ka-input into v-scope="components.input({})"
		// Turn v-ka-input-group into v-scope="components.inputGroup({})"
		// Turn v-ka-template="templateId, scope" into v-scope="components.template(templateId, scope)"
		container.querySelectorAll("[v-ka-input], [v-ka-input-group], [v-ka-template]").forEach(directive => {
			
			if (directive.hasAttribute("v-ka-input")) {
				let scope = directive.getAttribute("v-ka-input")!;
				if (!scope.startsWith("{")) {
					scope = `{ name: '${scope}' }`;
				}

				if (!this.showInspector) {
					// If showInspector, leave this until inspectChild removes it
					directive.removeAttribute("v-ka-input");
				}
				directive.setAttribute("v-scope", `components.input(${scope})`);

				// If no template used, just hooking up the input
				if (scope.indexOf("template:") == -1 && scope.indexOf("'template':") == -1) {
					const isInput = ['INPUT', 'SELECT', 'TEXTAREA'].indexOf(directive.tagName) > -1;

					if (isInput) {
						// Just binding a raw input
						this.mountInput(directive);
					}
					else {
						// If v-ka-input was on a 'container' element that contains inputs...drill into content and mount inputs
						this.mountInputs(directive);
					}
				}
			}
			else if (directive.hasAttribute("v-ka-input-group")) {
				const scope = directive.getAttribute("v-ka-input-group")!;

				if (!this.showInspector) {
					// If showInspector, leave this until inspectChild removes it
					directive.removeAttribute("v-ka-input-group");
				}
				directive.setAttribute("v-scope", `components.inputGroup(${scope})`);
			}
			else {
				const needsReactiveForRE = /.*?name'?\s*:\s*(?<value>'?[\w\s\.]+'?)/;
				const exp = directive.getAttribute("v-ka-template")!;
				const scope = exp.startsWith("{")
					? exp
					: `{ name: '${exp}' }`;
	
				const nameValue = needsReactiveForRE.exec(scope)?.groups!.value ?? ""
				const needsReactiveFor = !directive.hasAttribute("v-for") && !nameValue.startsWith("'");
	
				if (needsReactiveFor) {
					/*
					Need to change following (name is dynamic):
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
					</template>
					*/
	
					directive.removeAttribute("v-ka-template");
					directive.setAttribute("v-scope", `components.template({ name: _reactive_template.name, source: _reactive_template.source})`);
					directive.outerHTML = `<template v-for="_reactive_template in [${scope}]" :key="_reactive_template.name">${directive.outerHTML}<template>`;
					if (this.showInspector) {
						// Put this on container for inspectChild to find/remove
						directive.setAttribute("v-ka-template", exp);
					}
				}
				else {
					directive.setAttribute("v-scope", `components.template(${scope})`);
					if (!this.showInspector) {
						// If showInspector, leave this until inspectChild removes it
						directive.removeAttribute("v-ka-template");
					}
				}
			}

		});


		// Move the 'v-html' source into the scope for v-ka-inline so it is reactive
		container.querySelectorAll("[v-ka-inline]").forEach(directive => {
			directive.setAttribute("v-ka-inline", directive.getAttribute("v-html")!);
		});

		// Fix 'short hand' syntax into valid { } scopes
		// Fix v-ka-highchart 'short hand' of data or data.options string into a valid {} scope
		// Fix v-ka-table 'short hand' of name string into a valid {} scope
		// Fix v-ka-api 'short hand' of api into a valid {} scope
		// Fix v-ka-navigate 'short hand' of view string into a valid {} scope
		container.querySelectorAll("[v-ka-highchart], [v-ka-table], [v-ka-api], [v-ka-navigate]").forEach(directive => {

			if (directive.hasAttribute("v-ka-highchart")) {
				const scope = directive.getAttribute("v-ka-highchart")!;

				if (!scope.startsWith("{")) {
					// Using short hand of just the 'table names': 'data.options' (.options name is optional)
					const chartParts = scope.split('.');
					const data = chartParts[0];
					const options = chartParts.length >= 2 ? chartParts[1] : chartParts[0];
					directive.setAttribute("v-ka-highchart", `{ data: '${data}', options: '${options}' }`);
				}
			}
			else if (directive.hasAttribute("v-ka-table")) {
				const scope = directive.getAttribute("v-ka-table")!;
				if (!scope.startsWith("{")) {
					directive.setAttribute("v-ka-table", `{ name: '${scope}' }`);
				}
			}
			else if (directive.hasAttribute("v-ka-api")) {
				const scope = directive.getAttribute("v-ka-api")!;
				if (!scope.startsWith("{")) {
					directive.setAttribute("v-ka-api", `{ endpoint: '${scope}' }`);
				}
			}
			else if (directive.hasAttribute("v-ka-navigate")) {
				const scope = directive.getAttribute("v-ka-navigate")!;
				if (!scope.startsWith("{")) {
					directive.setAttribute("v-ka-navigate", `{ view: '${scope}' }`);
				}
			}
		});

		// Turn v-ka-rbl-no-calc into ka-rbl-no-calc='true' (was .rbl-nocalc)
		// Turn v-ka-rbl-exclude into ka-rbl-exclude='true' (was .rbl-exclude)
		// Turn v-ka-unmount-clears-inputs into ka-unmount-clears-inputs='true' (was .rbl-clear-on-unmount)
		container.querySelectorAll("[v-ka-rbl-no-calc], [v-ka-rbl-exclude], [v-ka-unmount-clears-inputs]").forEach(directive => {
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

			if (!this.showInspector) {
				directive.removeAttribute("v-ka-needs-calc");
			}
			directive.setAttribute("v-if", "!needsCalculation");
			directive.classList.add("ka-needs-calc");

			const refresh = directive.cloneNode(true) as Element;
			refresh.removeAttribute("v-ka-needs-calc");
			for (const { name, value } of [...refresh.attributes]) {
				if (name.startsWith("@click") ) {
					refresh.attributes.removeNamedItem(name);
				}
			}
			refresh.innerHTML = needsCalcText!;

			refresh.setAttribute("v-if", "needsCalculation");
			directive.after(refresh);
		});

		// Also automatically setup helptips again if the item is removed/added via v-if and the v-if contains tooltips (popup config is lost on remove)
		// Used to occur inside template[id] processing right after mountInputs(); call, but I think this should happen all the time

		// PROBLEM: May have a problem here...if v-if contains templates that contain other v-ifs or helptips...
		// the processing might not work right b / c selection doesn't span outside/inside of templates
		container.querySelectorAll("[v-for], [v-if], [v-else-if], [v-else]").forEach(directive => {
			this.addMountAttribute(directive, "mounted", `_domElementMounted($el)`);
		});

		// Add a !exp for v-show when inspecting so can see it
		if (this.showInspector) {
			container.querySelectorAll("[v-if], [v-show]").forEach(directive => {
				if (directive.classList.contains("ka-needs-calc")) {
					return;
				}

				const conditions = [directive.getAttribute("v-if") ?? directive.getAttribute("v-show")];
				const isIf = directive.hasAttribute("v-if");
				let createClone = true;

				if (isIf) {
					let ifElement = directive;
					while (["v-else-if", "v-else"].some(a => ifElement.nextElementSibling?.hasAttribute(a))) {
						ifElement = ifElement.nextElementSibling!;

						if (ifElement.hasAttribute("v-else")) {
							createClone = false;
						}
						else {
							conditions.push(ifElement.getAttribute("v-else-if")!);
						}
					};
				}

				if (createClone) {
					const opposite = directive.cloneNode(false) as Element;
			
					for (const { name, value } of [...opposite.attributes]) {
						if (!name.startsWith(":class") && !name.startsWith("class")) {
							opposite.attributes.removeNamedItem(name);
						}
					}
					opposite.innerHTML = `<i class='fa-solid fa-eye'></i> <!-- Inspector: next ${isIf ? "v-if/v-else-if" : "v-show"} hidden -->`;
					opposite.setAttribute("v-if", conditions.map(c => `!(${c})`).join(" && "));
					opposite.classList.add("v-opposite");
					directive.before(opposite);
				}
			});
		}

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
	
		if (this.showInspector) {
			this.inspectChildren(container);
		}

		// Recurse for every template without an ID (named templates will be processed at end and moved to kaResources)
		container.querySelectorAll<HTMLTemplateElement>("template:not([id])").forEach(template => {
			this.processMarkup(template.content);
		});
	}

	private inspectChildren(node: Element | DocumentFragment) {
		let child: Node | null = node.firstChild
		while (child) {
			child = this.inspectChild(child) ?? child.nextSibling
		}
	}

	private delimiters = ['{{', '}}'];
	private escapeRegex = (str: string) => str.replace(/[-.*+?^${}()|[\]\/\\]/g, '\\$&');
	private delimitersRE = new RegExp(this.escapeRegex(this.delimiters[0]) + '([^]+?)' + this.escapeRegex(this.delimiters[1]), 'g');
	private directiveRE = /^(?:v-|ka-rbl-|ka-unmount-|:|@)/;
	private inspectChild(node: Node): Node | null | void {
		if (node.nodeType == 1) {
			// Element
			const el = node as Element;

			// Walk children before processing attributes (not sure why but petite-vue does same)
			if (!el.hasAttribute("v-pre")) {
				this.inspectChildren(el);
			}
			
			const isFlag = (name: string): boolean => ["ka-inspector-rbl-no-calc", "ka-inspector-rbl-exclude", "ka-inspector-unmount-clears-inputs"].indexOf(name) != -1;
			const isComponent = (attribute: string): boolean => ["v-ka-needs-calc", "v-ka-input", "v-ka-input-group", "v-ka-template"].indexOf(attribute) != -1;

			const directives: IStringIndexer<string[]> = {};

			const addClass = (css: string, attribute: string, value: string) => {
				const propName = isComponent(attribute) ? attribute : css;

				if (directives[propName] == undefined) {
					directives[propName] = [];
					el.classList.add(css);
					if (attribute == "v-ka-needs-calc") {
						el.nextElementSibling!.classList.add(css);
					}
					if (isComponent(attribute)) {
						// Was left on just so that inspector could put class on...
						el.removeAttribute(attribute);
					}
				}

				directives[propName].push(isComponent(attribute)
					? (value == "" && attribute == "v-ka-needs-calc" ? "[default]" : value)
					: `${attribute}="${value}"`
				);
			};

			for (const { name, value } of [...el.attributes]) {
				// See petite-vue for some processing logic about attirbutes that can be procesed in loop
				// versus deferred...hoping I don't need any deferred processing.
				if (this.directiveRE.test(name) && name !== 'v-cloak') {
					if (name[0] === '@') {
						addClass("ka-inspector-on", name, value);
					}
					else if (name[0] === ':') {
						if (!(name == ":key" && el.hasAttribute("v-for"))) {
							addClass("ka-inspector-bind", name, value);
						}
					}
					else if (name.startsWith("v-ka-")) {
						addClass(`ka-inspector-${name.substring(5)}`, name, value);						
					}
					else if (name.startsWith("ka-")) {
						addClass(`ka-inspector-${name.substring(3)}`, name, value);
					}
					else if (["v-else-if", "v-else"].indexOf(name) != -1) {
						addClass("ka-inspector-if", name, value);
					}
					else if (el.classList.contains("v-opposite") ) {
						el.classList.remove("v-opposite");
						el.classList.add(`ka-inspector-${name.substring(2)}`);
					}					
					else if (
						!(name == "v-scope" && (value.startsWith("components.template") || value.startsWith("components.input" /* Group as well */ ))) &&
						!(name == "v-if" && el.classList.contains("ka-needs-calc")) &&
						!(name == "v-for" && value.startsWith("_reactive_template")) &&
						!(name.startsWith("v-on:vue:mounted") && ["_domElementMounted", "inputMounted", "_templateItemMounted"].some(exp => value.startsWith(exp))) &&
						!(name.startsWith("v-on:vue:unmounted") && ["inputUnmounted", "_templateItemUnmounted"].some(exp => value.startsWith(exp)))
					) {
						const dirName = name.split(":")[0];
						addClass(`ka-inspector-${dirName.substring(2)}`, name, value);
					}
				}
			}
	
			// TODO: For elements with class ka-unmount-clears-inputs (could be tough)
			// 1. If current element has v-if, inject !condition show that ka-unmount-clears-inputs is being applied
			// 2. Find closest v-if/v-for and inject !condition for v-if or v-if v-for.source.length == 0
			
			let details: Array<string> = [];

			const addDirectiveDetails = (name: string, values: string[], directiveIndent: string): void => {
				if (isFlag(name)) {
					details.push(`${directiveIndent}${name}: true`);
				}
				else if (name != "ka-inspector-pre") {
					details.push(values.length > 1
						? `${directiveIndent}${name} expressions:\r\n${values.map(v => "\t" + v).join("\r\n")}`
						: `${directiveIndent}${name}: ${values[0]}`
					);
				}
			};

			let directiveIndent = "";
			// Need to do 'v-if', 'v-for' items first, then indent children
			["ka-inspector-if", "ka-inspector-for"].forEach(d => {
				if (directives[d] != undefined) {
					directiveIndent = "\t";
					addDirectiveDetails(d, directives[d], "");
				}
			});
			for (const [name, values] of Object.entries(directives).filter(([name, values]) => !["ka-inspector-if", "ka-inspector-for"].includes(name) ) ) {
				addDirectiveDetails(name, values, directiveIndent);
			}

			if (details.length > 0) {
				const getPreviousComment = (target: any) => {
					// previousComment - Could be comment injected by processing {{ }} bindings in text, if that is case, 
					//					 inject all {{ }} information below all details...
					const previousComment: Comment | undefined = target.inspector;
					
					if (previousComment != undefined) {
						const data = previousComment.data.substring(2, previousComment.data.length - 2);
						target.previousSibling?.remove();  // Remove markup comment
						delete target.inspector; // Remove previous comment state
						return data.split("\r\n");
					}

					return [];
				}

				let target: any = el;

				// Append any binding comments to end
				details.push(...getPreviousComment(target).map(c => directives["ka-inspector-if"] != undefined ? "\t" + c : c));

				if (directives["ka-inspector-if"] != undefined && ["v-else-if", "v-else"].some(a => el.hasAttribute(a))) {
					let ifElement: Element | null = el;
					while ((ifElement = ifElement.previousElementSibling)) {
						if (ifElement.hasAttribute("v-if")) {
							target = ifElement;
							const ifComments = getPreviousComment(target);
							ifComments.push(...details); // Put previous v-if comments first and append on current 'else' details
							details = ifComments;
							break;
						}
					}
				}

				// Inject inspector comment
				target.before(target.inspector = new Comment(`\r\n${details.join("\r\n")}\r\n`));
			}
		}
		else if (node.nodeType == 3 && (node.parentNode as Element).tagName != "SCRIPT") {
			// Text
			const data = (node as Text).data
			const parent = node.parentElement!;

			let textBindings: Array<string> = [];
			let match: RegExpExecArray | null;

			while ((match = this.delimitersRE.exec(data))) {
				if (textBindings.length == 0) {
					parent.classList.add("ka-inspector-text");
				}
				textBindings.push(match[0].trim());
			}

			if (textBindings.length > 0) {
				parent.before((parent as any).inspector = textBindings.length > 1
					? new Comment(`\r\nka-inspector-text bindings:\r\n${textBindings.map(b => "\t" + b).join("\r\n")}\r\n`)
					: new Comment(`\r\nka-inspector-text binding: ${textBindings[0]}\r\n`)
				);
			}
		}
		/*
		else if (node.nodeType == 8) {
			// Can't figure out why petite-vue processes comments...
			this.inspectChildren(node as DocumentFragment);
		}
		*/
	}
	
	// Mount all inputs within a template
	private mountInputs(container: Element | DocumentFragment) {
		container.querySelectorAll("input:not([v-ka-nomount]), select:not([v-ka-nomount]), textarea:not([v-ka-nomount])").forEach(input => {
			this.mountInput(input);
		});

		// If a template contains a template/v-for (i.e. radio button list) need to drill into each one and look for inputs
		container.querySelectorAll<HTMLTemplateElement>("template[v-for]").forEach(t => {
			this.mountInputs(t.content);
		});
	};
	private mountInput(input: Element) {
		this.addMountAttribute(input, "mounted", "inputMounted($el, $refs)");
		this.addMountAttribute(input, "unmounted", "inputUnmounted($el)");
	};

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
}