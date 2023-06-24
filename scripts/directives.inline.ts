class DirectiveKaInline implements IKaDirective {
	// https://stackoverflow.com/a/69354385/166231
	public name = "ka-inline";
	public getDefinition(application: KatApp): Directive<Element> {
		return ctx => {
			// Originally, I just got the 'children' and did ctx.el.replaceWith(...children);
			// However, if the next sibling element was a vue decorated element, everything stopped
			// working. I think removing the element while Vue was walking DOM tree caused issues with
			// the loop.
			//
			// Attempt 1: I decorated the element with _v-ka-inline="replace" attribute, and had processing in onCalculation that
			// looked for all elements with this attribute and then did the replace then *after* Vue had done all it's reactivity/rendering.
			// The problem here was then the element was removed and was no longer reactive.
			//
			// Current: So I changed this to have some pre-processing that requires a v-html attribute then duplicates the value into
			// the v-ka-inline attribute so that it can be 'reactive'.  Then during effect(), I put a unique ID on the template and
			// also on any of the 'cloned/rendered' raw html elements.  Then, whenever effect() happens, I remove all cloned/rendered html 
			// elements with matching id and let it re-render the re-active elements

			const inlineId = ctx.el.getAttribute("v-ka-id") ?? Utils.generateId();
			ctx.el.classList.remove("ka-inspector-value");

			ctx.effect(() => {
				// Need to call this to make effect() reactive, contains same expression that was in v-html
				const scope: string = ctx.get();

				if (ctx.el.hasAttribute("v-ka-id")) {
					document.querySelectorAll(`[v-ka-inline-id='${inlineId}']`).forEach(i => i.remove());
				}
				else {
					ctx.el.setAttribute("v-ka-id", inlineId)
				}

				const children = ctx.el.tagName === 'TEMPLATE'
					? [...(ctx.el as HTMLTemplateElement).content.children]
					: [...ctx.el.children];

				children.forEach(c => {
					const render = c.cloneNode(true) as Element;
					if (application.options.debug.showInspector) {
						render.classList.add("ka-inspector-value")
					}
					render.setAttribute("v-ka-inline-id", inlineId);
					ctx.el.before(render);
				});
			});

			return () => {
				document.querySelectorAll(`[v-ka-inline-id='${inlineId}']`).forEach(i => i.remove());
			}
		}
	}
}