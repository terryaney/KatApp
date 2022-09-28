class HelpTips {
	private static visiblePopover: HTMLElement | undefined;
	private static visiblePopoverApp: KatApp | undefined;

	public static processHelpTips(application: KatApp, container: JQuery, selector?: string): void {
		// Code to hide tooltips if you click anywhere outside the tooltip
		// Combo of http://stackoverflow.com/a/17375353/166231 and https://stackoverflow.com/a/21007629/166231 (and 3rd comment)
		// This one looked interesting too: https://stackoverflow.com/a/24289767/166231 but I didn't test this one yet
		const hideVisiblePopover = function (): void {
			// Going against entire KatApp (all apps) instead of a local variable because I only setup
			// the HTML click event one time, so the 'that=this' assignment above would be the first application
			// and might not match up to the 'currently executing' katapp, so had to make this global anyway
			const visiblePopover = HelpTips.visiblePopover;

			if (visiblePopover != undefined) {
				// Just in case the tooltip hasn't been configured
				if ($(visiblePopover).attr("ka-init") != "true") return;

				// Used to use this logic, but it didn't work with bootstrap 5, I've asked a question here:
				// https://stackoverflow.com/questions/67301932/cannot-access-bootstrap-5-bs-popover-data-with-jquery
				// if ( $(visiblePopover).data("bs.popover") === undefined ) return;

				bootstrap.Popover.getInstance(visiblePopover).hide();
			}
		};

		if ($("html").attr("ka-init-tip") != "true") {
			$("html")
				.on("click.ka", e => {
					if ($(e.target).is(".popover-header, .popover-body")) return;
					hideVisiblePopover();
				})
				.on("keyup.ka", e => {
					if (e.keyCode != 27) { // esc
						return;
					}
					e.preventDefault();
					hideVisiblePopover();
				})
				.on("show.bs.popover.ka", () => hideVisiblePopover())
				.on("inserted.bs.tooltip.ka", e => {
					const target = $(e.target);
					const tipId = "#" + target.attr("aria-describedby");
					const tip = $(tipId);
					tip.removeClass("error warning");
					if (target.hasClass("error")) {
						tip.addClass("error");
					}
					else if (target.hasClass("warning")) {
						tip.addClass("warning");
					}
				})
				.on("inserted.bs.popover.ka", async e => {
					const templateId = "#" + $(e.target).attr("aria-describedby");
					HelpTips.visiblePopoverApp = await KatApp.createAppAsync(templateId, application.cloneOptions(false));
				})
				.on("shown.bs.popover.ka", e => HelpTips.visiblePopover = e.target)
				.on("hide.bs.popover.ka", e => {
					if (HelpTips.visiblePopoverApp != undefined) {
						KatApp.remove(HelpTips.visiblePopoverApp);
					}
					HelpTips.visiblePopover = undefined;
					HelpTips.visiblePopoverApp = undefined;
				})
				.attr("ka-init-tip", "true");
		}

		const getTipTitle = function (h: JQuery<Element>) {
			const titleSelector = h.data('bs-content-selector');
			if (titleSelector != undefined) {
				const title = application.select(titleSelector + "Title").html();
				if ((title ?? "") != "") {
					return title;
				}
			}
			return "";
		};

		const getTipContent = function (h: JQuery<Element>) {
			// See if they specified data-content directly on trigger element.                
			const dataContent = h.data('bs-content');
			const dataContentSelector = h.data('bs-content-selector');
			let content = dataContent == undefined
				? dataContentSelector == undefined ? h.next().html() : application.select(dataContentSelector, container).html()
				: dataContent as string;

			// Replace {Label} in content with the trigger provided...used in Error Messages
			const labelFix = h.data("label-fix");

			if (labelFix != undefined) {
				content = content.replace(/\{Label}/g, application.select("." + labelFix, container).html());
			}

			return content;
		};

		application
			.select(selector ?? "[data-bs-toggle='tooltip'], [data-bs-toggle='popover']", container)
			.not('[ka-init="true"]')
			.each((i, tip) => {
				const tipElement = $(tip);
				const isTooltip = tipElement.attr("data-bs-toggle") == "tooltip";

				// When helptip <a/> for checkboxes were moved inside <label/>, attempting to click the help icon simply toggled
				// the radio/check.  This stops that toggle and lets the help icon simply trigger it's own click to show or hide the help.
				if (tipElement.parent()[0].tagName == "LABEL" && tipElement.parent().parent().find("input[type=checkbox]").length > 0) {
					tipElement.on('click', function (e) {
						e.stopPropagation();
						return false;
					});
				}

				let placement = tipElement.data('bs-placement') || "top";
				const trigger = tipElement.data('bs-trigger') || "hover";
				const container = tipElement.data('bs-container') || "body";

				const options: any = {
					html: true,
					sanitize: false,
					trigger: trigger,
					container: container,
					template: isTooltip
						? '<div class="tooltip katapp-css" role="tooltip"><div class="tooltip-arrow arrow"></div><div class="tooltip-inner"></div></div>'
						: '<div v-scope class="popover katapp-css" role="tooltip"><div class="popover-arrow arrow"></div><h3 class="popover-header"></h3><div class="popover-body"></div></div>',

					placement: function (tooltip: any, trigger: any) {
						// Add a class to the .popover element

						// http://stackoverflow.com/a/19875813/166231
						const t = $(trigger);
						let dataClass = t.data('class');
						if (dataClass != undefined) {
							$(tooltip).addClass(dataClass);
						}

						// Did they specify a data-width?
						dataClass = t.data('bs-width');
						if (dataClass != undefined) {
							// context is for popups, tooltip-inner is for tooltips (bootstrap css has max-width in css)
							$(tooltip).add($(".tooltip-inner", tooltip))
								.css("width", dataClass)
								.css("max-width", dataClass);

						}

						// Bootstrap 4 no longer supports 'left auto' (two placements) so just in case any markup has that still
						// remove it (unless it is only thing specified - which 'popper' supports.)
						const autoToken = /\s?auto?\s?/i
						const autoPlace = autoToken.test(placement)
						if (autoPlace) placement = placement.replace(autoToken, '') || 'auto';

						return placement;
					},
					title: function () { return isTooltip ? getTipContent($(this)) : getTipTitle($(this)); },
					content: function () { return getTipContent($(this)); }
				};

				if (isTooltip) {
					new bootstrap.Tooltip(tip, options);
				}
				else {
					new bootstrap.Popover(tip, options);
				}
			})
			.attr("ka-init", "true");
	}
}