// If I brought in types of bs5, I had more compile errors that I didn't want to battle yet.
declare const bootstrap: BootstrapStatic;

interface BootstrapStatic {
	Modal: {
		new(el: HTMLElement): BootstrapModal;
		getOrCreateInstance(el: HTMLElement): BootstrapModal;
	};
	Popover: {
		new(el: HTMLElement, options: BootstrapTooltipOptions): BootstrapPopover;
		getInstance(el: HTMLElement): BootstrapPopover
	};
	Tooltip: {
		new(el: HTMLElement, options: BootstrapTooltipOptions): BootstrapTooltip;
	}
}

interface BootstrapModal {
	hide: () => void;
	show: () => void;
}

interface BootstrapPopover {
	hide: () => void;
	show: () => void;
}

interface BootstrapTooltip {
	hide: () => void;
	show: () => void;
}

interface BootstrapTooltipOptions {
	html: boolean;
	sanitize: boolean;
	trigger: "click" | "hover" | "focus" | "manual" | "click hover" | "click focus" | "hover focus" | "click hover focus";
	container: string | false;
	template: string;
	placement: (tooltip: HTMLElement, trigger: HTMLElement) => "auto" | "top" | "bottom" | "left" | "right";
	title: (this: HTMLElement) => string | JQuery<HTMLElement> | undefined;
	content: (this: HTMLElement) => string | JQuery<HTMLElement> | undefined;
}