interface PetiteVue {
	createApp: () => void;
}
declare class PetiteVue {
	static createApp: (initialData?: any) => PetiteVueApp;
	static reactive: <T extends object>(target: T)=> UnwrapNestedRefs<T>;
	static nextTick: (fn?: () => void) => Promise<void>;
}
interface PetiteVueApp {
	directive(name: string, def?: AsyncDirective<Element> | Directive<Element> | undefined): Directive<Element> | any;
	mount(el?: string | Element | null | undefined): any | undefined;
	unmount(): void;
}

interface AsyncDirective<T = Element> {
	(ctx: DirectiveContext<T>): Promise<(() => void) | void>;
}
interface Directive<T = Element> {
	(ctx: DirectiveContext<T>): (() => void) | void;
}


interface DirectiveContext<T = Element> {
	el: T;
	get: (exp?: string) => any;
	effect: typeof rawEffect;
	exp: string;
	arg?: string;
	modifiers?: Record<string, true>;
	ctx: Context;
}
interface Context {
	key?: any;
	scope: Record<string, any>;
	dirs: Record<string, Directive>;
	blocks: Block[];
	effect: typeof rawEffect;
	effects: ReactiveEffectRunner[];
	cleanups: (() => void)[];
	delimiters: [string, string];
	delimitersRE: RegExp;
}
declare class Block {
	template: Element | DocumentFragment;
	ctx: Context;
	key?: any;
	parentCtx?: Context;
	isFragment: boolean;
	start?: Text;
	end?: Text;
	get el(): Element | Text;
	constructor(template: Element, parentCtx: Context, isRoot?: boolean);
	insert(parent: Element, anchor?: Node | null): void;
	remove(): void;
	teardown(): void;
}
declare function rawEffect<T = any>(fn: () => T, options?: ReactiveEffectOptions): ReactiveEffectRunner;
interface ReactiveEffectRunner<T = any> {
	(): T;
	effect: ReactiveEffect;
}
interface ReactiveEffectOptions extends DebuggerOptions {
	lazy?: boolean;
	scheduler?: EffectScheduler;
	scope?: EffectScope;
	allowRecurse?: boolean;
	onStop?: () => void;
}
interface DebuggerOptions {
	onTrack?: (event: DebuggerEvent) => void;
	onTrigger?: (event: DebuggerEvent) => void;
}
declare type DebuggerEvent = {
	effect: ReactiveEffect;
} & DebuggerEventExtraInfo;

declare type DebuggerEventExtraInfo = {
	target: object;
	type: TrackOpTypes | TriggerOpTypes;
	key: any;
	newValue?: any;
	oldValue?: any;
	oldTarget?: Map<any, any> | Set<any>;
};
declare const enum TrackOpTypes {
	GET = "get",
	HAS = "has",
	ITERATE = "iterate"
}
declare const enum TriggerOpTypes {
	SET = "set",
	ADD = "add",
	DELETE = "delete",
	CLEAR = "clear"
}
declare class ReactiveEffect<T = any> {
	fn: () => T;
	scheduler: EffectScheduler | null;
	active: boolean;
	deps: Dep[];
	parent: ReactiveEffect | undefined;
	/* Excluded from this release type: computed */
	/* Excluded from this release type: allowRecurse */
	/* Excluded from this release type: deferStop */
	onStop?: () => void;
	onTrack?: (event: DebuggerEvent) => void;
	onTrigger?: (event: DebuggerEvent) => void;
	constructor(fn: () => T, scheduler?: EffectScheduler | null, scope?: EffectScope);
	run(): T | undefined;
	stop(): void;
}
declare type Dep = Set<ReactiveEffect> & TrackedMarkers;
declare type TrackedMarkers = {
	/**
	 * wasTracked
	 */
	w: number;
	/**
	 * newTracked
	 */
	n: number;
};
declare type EffectScheduler = (...args: any[]) => any;
declare class EffectScope {
	/* Excluded from this release type: active */
	/* Excluded from this release type: effects */
	/* Excluded from this release type: cleanups */
	/* Excluded from this release type: parent */
	/* Excluded from this release type: scopes */
	/* Excluded from this release type: index */
	constructor(detached?: boolean);
	run<T>(fn: () => T): T | undefined;
	/* Excluded from this release type: on */
	/* Excluded from this release type: off */
	stop(fromParent?: boolean): void;
}

declare type UnwrapNestedRefs<T> = T extends Ref ? T : UnwrapRefSimple<T>;
declare const RawSymbol: unique symbol;
declare const RefSymbol: unique symbol;
declare const ShallowReactiveMarker: unique symbol;
declare const ShallowRefMarker: unique symbol;
declare interface Ref<T = any> {
	value: T;
	/**
	 * Type differentiator only.
	 * We need this to be in public d.ts but don't want it to show up in IDE
	 * autocomplete, so we use a private Symbol instead.
	 */
	[RefSymbol]: true;
}
declare type UnwrapRefSimple<T> = T extends Function | CollectionTypes | BaseTypes | Ref | RefUnwrapBailTypes[keyof RefUnwrapBailTypes] | {
	[RawSymbol]?: true;
} ? T : T extends Array<any> ? {
	[K in keyof T]: UnwrapRefSimple<T[K]>;
} : T extends object & {
	[ShallowReactiveMarker]?: never;
} ? {
		[P in keyof T]: P extends symbol ? T[P] : UnwrapRef<T[P]>;
	} : T;
declare interface RefUnwrapBailTypes {
}
declare type UnwrapRef<T> = T extends ShallowRef<infer V> ? V : T extends Ref<infer V> ? UnwrapRefSimple<V> : UnwrapRefSimple<T>;
declare type BaseTypes = string | number | boolean;
declare type CollectionTypes = IterableCollections | WeakCollections;
declare type IterableCollections = Map<any, any> | Set<any>;
declare type WeakCollections = WeakMap<any, any> | WeakSet<any>;
declare type ShallowRef<T = any> = Ref<T> & {
	[ShallowRefMarker]?: true;
}