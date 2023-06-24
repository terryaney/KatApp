class DirectiveKaInspector implements IKaDirective {
	public name = "ka-inspector";

	public getDefinition(application: KatApp): Directive<Element> {
		return ctx => {
			let comment: Comment | undefined = undefined;

			ctx.effect(() => {
				const info = ctx.get();
				const kaTargetId = ctx.el.getAttribute("ka-inspector-target-id");

				if (kaTargetId != undefined) {
					// Only process if the ka-inspector-target-id has been set...
					const details = info.details;
					const blocks: Array<IStringAnyIndexer> = info.blocks;

					const inspectTarget = document.querySelector(`[ka-inspector-id='${kaTargetId}']`)!;

					let commentContent = `
KatApp Inspect ${kaTargetId}
--------------------------------------------------
${(details ?? "") != `Details: ${details}

` ? "" : ""}`;

					blocks.forEach(b => {
						const scope = b.scope;
						if (scope?.source != undefined && scope.source instanceof Array) {
							scope.source = `Source is array. ${scope.source.length} rows.`
						}

						const scopeInfo = scope != undefined
							? `

Scope:
${JSON.stringify(scope, null, 2)}

`
							: '';

						const attributes =
							Object.keys(b.attributes)
								.map(k => (b.attributes[k] ?? "") != "" ? `${k}="${b.attributes[k]}"` : k)
								.join(" ");

						commentContent += `Element:
<${b.name} ${attributes}>${scopeInfo}`
					});

					commentContent += `Rendered Element(s) ↓↓↓↓`

					if (inspectTarget == undefined) {
						Utils.trace(application, "DirectiveKaInspector", "getDefinition", `Unable to find inspector target.`, TraceVerbosity.Detailed, commentContent);
					}
					else {
						if (inspectTarget.previousSibling?.nodeType == 8 && (inspectTarget.previousSibling?.textContent?.indexOf(`KatApp Inspect ${kaTargetId}`) ?? -1) > -1) {
							inspectTarget.previousSibling!.remove();
						}
						comment = new Comment(commentContent);

						inspectTarget.before(comment);
					}
				}
			});

			return () => {
				if (comment !== undefined) {
					comment.remove();
				}
			}
		}
	}
}