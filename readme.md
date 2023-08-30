# KatApp Framework

The KatApp framework is an orchestrator of two other well established frameworks; RBLe framework and [Vue.js](https://vuejs.org/).  The primary function of the KatApp framework is to marshall inputs into a RBLe framework calculation, take the calculation results and turn them into a 'reactive' model that is then used for rendering HTML markup via Vue.  One caveat is that instead of standard Vue, KatApp framework is leveraging [petite-vue](https://github.com/vuejs/petite-vue).  

> `petite-vue` is an alternative distribution of Vue optimized for progressive enhancement. It provides the same template syntax and reactivity mental model as standard Vue. However, it is specifically optimized for "sprinkling" a small amount of interactions on an existing HTML page rendered by a server framework.

- [KatApp Framework](#katapp-framework)
- [Initializing and Configuring a KatApp](#initializing-and-configuring-a-katapp)
- [Kaml View Specifications](#kaml-view-specifications)
- [KatApp State](#katapp-state)
- [HTML Content Template Elements](#html-content-template-elements)
- [Common Vue Directives](#common-vue-directives)
- [Custom KatApp Directives](#custom-katapp-directives)
- [KatApp API](#katapp-api)
- [RBLe Framework](#rble-framework)
- [Upcoming Documentation](#upcoming-documentation)

## Definitions

There are many terms and concepts that will be discussed in this document.  The most important ones to understand before continuing are listed below.

Term | Definition
---|---
KatApp | Dynamic webpage content driven by AJAX, using Kaml Views, RBLe Service, and Vue directives.
Kaml View | A _KatApp Markup Language_ file is a combination of RBL Configuration, HTML, CSS, and Javascript where the HTML supports Vue directives to leaverage CalcEngine results to produce presentation markup.
RBLe Framework | Rapid Business Logic (evolved) calcuation service.  Driven by CalcEngine files which contains all of the business logic.
CalcEngine | Specialized Excel speadsheet that drives business logic.
RBLe Results | Calculation results from RBLe Service (stored in KatApp state for use via Vue directives).
KatApp element | The HTML element that is target/container for the KatApp.  Example: `<div id="KatApp"></div>`
Vue Directive | Special attributes indicating that the attribute content should be processed by Vue and its rendering engine. 
Host Platform | Web Application hosting the KatApp.
KAT CMS | System for updating CalcEngines and Kaml Views when Kaml files are not hosted directly by Host Platform.
Kaml&nbsp;Template&nbsp;Files | Kaml file containing *only* templates, css, and javascript for generating common markup/controls used in KatApp's.  Kaml Template Files are never the 'main view' of a KatApp.
Template | A reuseable piece of a markup found in Kaml Template file.

## Vue Support

The documentation for [standard Vue](https://vuejs.org/) and [petite-vue](https://github.com/vuejs/petite-vue) are both extensive and helpful, but for the most part, 'coding' of Vue objects is handled in the KatApp framework while rendering markup with 'Vue Directives' is the primary interaction Kaml Views will have with Vue.  The most important documentation page for understanding how to leverage Vue can be found on the [Built In Directives](https://vuejs.org/api/built-in-directives.html) page.

### Vue Directives

Below are the ways to indicate to Vue that attributes should be 'processed'.  When attributes are processed, for the most part, the contents of the attribute (or `{{ }}`) is simply a javascript expression that will be processed via `eval()`.  When the expression is evaluated, it is also passed in the current *scope* known to Vue as well, so you have access to both [KatApp State](#KatApp-State) and any *scope variables* created from containing `v-for` directives.

Markup | Definition
---|---
`v-*` Attribute | Indicates to process in-built Vue directives. petite-vue supports the following [Vue directives](https://github.com/vuejs/petite-vue#vue-compatible).
`v-ka-` Attribute | Indicates to process [custom KatApp directives](#Custom-KatApp-Directives).
Attribute starts with `:` | Shorthand for Vue `v-bind` directive indicating that the attribute content should be processed by Vue.
Attribute starts with `@` | Shorthand for Vue `v-on` directive for attaching events to HTML elements.
Html element contains `{{ }}` | Shorthand for Vue `v-text` directive to sent element's `innerText` value (note, you need to use `v-html` directive if your expression generates HTML markup).

See [Common Vue Directives](#Common-Vue-Directives) and [Custom KatApp Directives](#Custom-KatApp-Directives) for more information.

## Required Javascript Libraries

Below are the libraries required or used by KatApp framework.

- petite-vue.js - Required [library](https://unpkg.com/petite-vue) to enable Vue processing and other functionality internal to KatApp framework.
- jquery.js - Required [library](https://api.jquery.com/) to enable KatApp event processing and other functionality internal to KatApp framework.
- bootstrap.js - Required to support [Modals](https://getbootstrap.com/docs/5.0/components/modal/), [Popovers](https://getbootstrap.com/docs/5.0/components/popovers/) and [Tooltips](https://getbootstrap.com/docs/5.0/components/tooltips/).
- highcharts.js - Optional, if `v-ka-highchart` directive is leveraged, to support building [Highcharts](https://api.highcharts.com/highcharts/) from CalcEngine results.

# Initializing and Configuring a KatApp

To initiate a KatApp, options are provided via a configuration object passed on the [`KatApp.createAppAsync()`](#KatApp.createAppAsync) method. In the sample below, minimal options are shown.  See [IKatAppOptions](IKatAppOptions) for all available options.

```javascript
$(document).ready(() => {
    // Async IIFE
    (async () => {
        await KatApp.createAppAsync( '.katapp', { "view": "Nexgen:Channel.Home" } )
            .catch(ex => console.log({ex}) );
    })();
});
```

## Configuring CalcEngines and Template Files

Inside each Kaml View file is a required `<rbl-config>` element; This should be the first element in any Kaml View file. It controls which CalcEngine(s) are used (if any) and which templates are required for this view (if any).

```html
<!-- A Kaml View that uses no CalcEngines -->
<rbl-config templates="Standard_Templates,LAW:Law_Templates"></rbl-config>

<!-- One CalcEngine using default RBLInput and RBLResult tabs -->
<rbl-config templates="Standard_Templates,LAW:Law_Templates">
    <calc-engine key="default" name="LAW_Wealth_CE"></calc-engine>
</rbl-config>

<!-- One CalcEngine with Custom Tabs -->
<rbl-config templates="Standard_Templates,LAW:Law_Templates">
    <calc-engine key="default" name="LAW_Wealth_CE" input-tab="RBLInputWealth" result-tabs="RBLResultWealth"></calc-engine>
</rbl-config>

<!-- Multiple CalcEngines -->
<rbl-config templates="Standard_Templates,LAW:Law_Templates">
    <calc-engine key="default" name="LAW_Wealth_CE" input-tab="RBLInput" result-tabs="RBLResult"></calc-engine>
    <calc-engine key="shared" name="LAW_Shared_CE" input-tab="RBLInput" result-tabs="RBLResult,RBLHelpers"></calc-engine>
</rbl-config>
```

When multiple CalcEngines or result tabs are used, additional information can be required to specify the appropriate results.  See the [`rbl.source()`](#istaterblsource) method for more information on how the appropriate CalcEngine/Tab name combination is determined specifying non-default CalcEngine results and how they are used in the [`rbl.exists()`](#istaterblexists), [`rbl.boolean()`](#istaterblboolean), [`rbl.value()`](#istaterblvalue) and [`rbl.number()`](#istaterblnumber) methods and the [v-ka-value](#v-ka-value), [v-ka-table](#v-ka-table), and [v-ka-highchart](#v-ka-highchart) directives.

**Important** - Whenever multiple CalcEngines are used, you must provide a `key` attribute; minimally on CalcEngines 2...N, but ideally on all of them.  Note that the first CalcEngine will be assigned a key value of `default` if no `key` is provided.

Entity | Description
---|---
templates | Attribute; Comma delimitted list of Kaml Template Files required by this Kaml View.  Each template is specified in Folder:FileName syntax.
local-kaml-package | Attribute; When a Kaml file has been broken into individual files to be packaged up as a single Kaml file when requested, if a developer is working in [debugResourcesDomain](#IKatAppDebugOptions) mode, to minimize the noise of 404 errors present in the browser console, the supporting file types to process must be specified as a comma delimitted list.  The available types are `js` (file for Kaml javascript), `css` (file for Kaml CSS), `templates` (file for Kaml templates), or `template.items` (process all templates in file looking for `script`, `script.setup`, or `css` attributes which point to a supporting file).  Note: Since `Template.*` files do not require a `rbl-config` element, they are always processed looking for supporting file attributes when requested.
calc&#x2011;engine | Element; If one or more CalcEngines are used in Kaml View, specify each one via a `calc-engine` element.
key | Attribute; When more than one CalcEngine is provided (or if you need to access [Manual Results](#imanualtabdef)), a CalcEngine is referenced by this key; usually via a `ce` property passed into a Vue directive.
name | Attribute; The name of the CalcEngine.
input&#x2011;tab | Attribute; The name of the tab where KatApp framework should inject inputs. Default is `RBLInput`.
result&#x2011;tabs | Attribute; Comma delimitted list of result tabs to process during RBLe Calculation. When more than one result tab is provided, the tab is referenced by name; usually via a `tab` property passed into a Vue directive. Default is `RBLResult`.
configure&#x2011;ui | Attribute; Whether or not this CalcEngine should run during the Kaml View's original [Configure UI Calculation](#IKatApp.configureUICalculation). Default is `true`.
pipeline | Element; One or more 'CalcEngines' to use in a [Calculation Pipelines](#calculation-pipelines) for the current CalcEngine.  Only the `name`, `input-tab`, and `result-tab` attributes are supported.  By default, if only a `name` is provided, the input and the result tab with the *same* name as the tabs configured on the primary CalcEngine will be used.

# Kaml View Specifications

A *K*at*A*pp *M*arkup *L*anguage file, known as a 'Kaml View', is a combination of [RBL Configuration](#Configuring-CalcEngines-and-Template-Files), HTML, CSS, and Javascript where the HTML supports Vue directives to leaverage CalcEngine results to produce presentation markup. In addition to all the [Common Vue Directives](#Common-Vue-Directives) and [Custom KatApp Directives](#Custom-KatApp-Directives) that are supported, the following describes the best practices and supported Kaml View features that fall outside of Vue directive processing.

The standard Kaml View file will have the following structure.

```html
<!-- Specify RBL Configuration properties -->
<rbl-config templates="Standard_Templates,LAW:Law_Templates">
    <calc-engine name="LAW_Wealth_CE"></calc-engine>    
</rbl-config>

<script>
	// Immediately Invoked Function Expression (IIFE) to allow for javascript scoped to this Kaml View
	(function () {
		/** @type {IKatApp} */
		var application = KatApp.get('{id}');

		// Optionally update the KatApp options and state.  The configAction delegate passes in
		// references to the rbl, model, inputs, and handlers properties from its state.
		application.configure((config, rbl, model, inputs, handlers) => { 
			config.model = {
			};

			config.options = {
			}
			
			config.handlers = {
			};

			config.events.initialized = () => {
			    // Optionally bind Application Events
			    console.log( 'handled' );

			    // Can use the current applications state properties via delegate parameters.
			    console.log( rbl.value("nameFirst" ) );
			    // 'rbl' is equivalent to 'application.state.rbl'.
			};

			config.directives = {
			};

			config.components = {
			};
		});

		// Any 'element' selection should use application.select()
		application.select(".warning-items").css("background-color", "red");
	})();
</script>

<!-- Optionally provide <style> element...all css selectors should be scoped to thisApplication -->
<style>
thisApplication .view-table {
	font-weight: bold;
}
</style>

<!-- Finally, the actual markup containing various Vue directives -->
<h1>KatApp Tutorial</h1>
<p>To Do</p>
<ul>
	<li v-for="row in rbl.source('ce-table')" :class="row.class" v-html="row.text"></li>
</ul>
```

## Kaml View Scoping

It is very important to keep Kaml View encapsulated as an isolated environment, or sandbox if you will. **The KatApp framework ensures that all input and calculation result processing are isolated to the KatApp/Kaml View in which they are specified.**  In the same manner, there are ways to ensure proper scoping for your markup and javascript so that Kaml Views do not interfere with Host Platform sites.

- [Scoping CSS](#scoping-css) - Discusses how Kaml Views can ensure CSS styles do not adversely affect the Host Environment.
- [Scoping IDs](#scoping-ids) - Discusses how Kaml Views can ensure `HTMLElement.id` assignments are guaranteed to be unique.
- [Scoping jQuery Selection](#scoping-jquery-selection) - Discusses how Kaml Views can ensure jQuery DOM queries are isolated to *only* their markup and not other Kaml Views or the Host Environment.

### Scoping CSS

In Kaml Views, if you include a `<style>` section to define some CSS for the view, make sure you prefix every class selector with `thisApplication`.

Additional CSS scoping can be considered as well when creating Template Kaml Files.  The `katapp-css` class will always be applied to any KatApp container element.  This provides a way to scope CSS inside template files (or Kaml Views too, although `thisApplication` is preferred) to only be applied to KatApp View markup.

So the CSS priority would be:

1. `.katapp-css`
2. `thisApplication`

```html
<style>
    /* 
	Without scoping would affect all h2 elements on rendered page even if 
	not part of this Kaml View but part Host Environment.
	*/
    h2 {
        font-size: 24px;
    }

    /* 
	With .katapp-css scoping, every KatApp rendered during a page request (if the Host Environment was 
	initializing more than one KatApp) would have their h2 elements styled
	*/
    .katapp-css h2 {
        color: Green;
        font-size: 30px;
    }

    /* 
	With thisApplication scoping, only the h2 elements present inside this Kaml View will be styled.
	*/
    thisApplication h2 {
        color: Red;
    }

    /* 
	Given the CSS scoping precedence, the end result given the style above for an h2 element
	inside *this* Kaml View would be color: Red, size 30px.
	*/
</style>

<h2>Hello</h2>
```

### Scoping IDs

When creating HTML elements inside the Kaml View that need an `id` attribute provided, ID scoping must be used.  A name cannot be guaranteed to be unique throughout the Host Environment if ID scoping is not used.  To guarantee a unique ID for elements, include the `{id}` token somewhere in the `id` attribute. The `{id}` token is replaced before the markup is rendered with the unique ID associated with the currently running KatApp.

```html
<!-- nav-list can not be guaranteed unique, the containing application (or other hosted KatApps may use the same id) -->
<div id="nav-list">
    <!-- ... -->
</div>

<!-- This would create a unique ID specific to *this* Kaml View -->
<div id="nav-list_{id}">
    <!-- ... -->
</div>
```

### Scoping jQuery Selection

When `<script>` tags are included in Kaml View files, the correct way to obtain the KatApp element is by using this `{id}` token. Then, any time selection is needed, selection needs to be scoped to the currently running KatApp.  To do this, use the `application.select()` and `application.closest()` methods instead of the jQuery counterparts of `$()` or `$().closest()`.  This is also required to ensure proper selection scope when using [nested KatApps](#v-ka-app) as well.

```html
<!-- Snippet from the above sample structure -->
<script>
var application = KatApp.get('{id}');
application.select(".warning-items").css("background-color", "red");
</script>
```

See [IKatApp Methods](#IKatApp-Methods) for more details.

# KatApp State

When Vue applications are created (which is done behind the scenes in the KatApp framework), they are passed a 'model' which is the 'parent scope' for all Vue directives.  The KatApp framework passes in a IState model which is described below.  All properties and methods of this model can be used directly in Vue directives.

**This is probably the most important section of documentation since this object is used most often in the Vue directives used by Kaml Views when rendering pages.**

- [IState](#istate) - The 'state model' used in all Vue directives.
- [RBLe Framework Result Processing in KatApp State](#rble-framework-result-processing-in-katapp-state) - Describes how RBLe Framework calculation results are turned into 'state model' results.

## IState

The `IState` interface represents the 'scope' that is passed in to all KatApp Framework Vue enabled applications. Any of the property types below that are not primitive types (i.e. `string`, `boolean`, `any`, etc.) are explained in more detail in the [Supporting Interfaces](#supporting-interfaces) section. 

It is vital to understand the properties and methods of this interface for Kaml View developers.

This 'scope' object will be accessed in both [Vue directives](#common-vue-directives) and in Kaml View javascript.  However, the method of accessing properties and methods is slightly different based on the context.

```html
<!-- 
In Vue directives, access the properties/methods 'directly' given 
that the 'scope' for Vue directives is the IState object.
-->
<div v-html="rbl.value('name-first')"></div>
```

```javascript
/*
In Kaml View javascript, since there is no concept of 'Vue scope', 
the javascript needs to access the properties/methods through the
application.state object.
*/
const nameFirst = application.state.rbl.value("name-first");
```

### IState Properties

Property | Type | Description
---|---|---
`kaId` | `string` | Current id of the running KatApp.  Typically only used in Template Files when a unique id is required.
`lastInputChange` | `number` | Automatically maintained by the KatApp framework.  Every time *any* input changes (changing a dropdown, typing a character in text input, etc.), this value is updated with a new timestamp. Allows for reactive v-effect statements without hooking up an [`IKatAppEventsConfiguration.input`](#ikatappeventsconfiguration) event. 
`isDirty` | `boolean \| undefined` | Indicates whether the current KatApp is considered 'dirty' overall.  If the value is set to `undefined`, the value returned is simply the state of the `inputsChanged` property.  If set to a `boolean` value, it will return that value as a manually set flag.  By default, the value is set to `false`, so the KatApp host must set it to `undefined` if they want `inputsChanged` to indicate application dirty state.  If the value is set to `false`, `inputsChanged` is automatically set to `false` as well.  Host application must set to `false` after any action/api that has 'saved' inputs.
`inputsChanged` | `boolean` | Indicates if any v-ka-input has changed since the KatApp has been rendered.  Allows for host application to prompt about changes before navigation or actions if necessary.  Host application must set to `false` after any action/api that has 'saved' inputs. 
`uiBlocked` | `boolean` | Returns `true` when a RBL Calculation or Api Endpoint is being processed.  See [`IKatApp.blockUI`](#IKatApp.blockUI) and [`IKatApp.unblockUI`](#IKatApp.unblockUI) for more information. Typically used to show a 'blocker' on the rendered HTML to prevent the user from clicking anywhere.
`needsCalculation` | `boolean` | Returns `true` when input that will trigger a calculation has been edited but has not triggered a calculation yet.  Typically used with [`v-ka-needs-calc`](#v-ka-needs-calc) directive which toggles 'submit button' state to indicate to the user that a calculation is needed before they can submit the current form.
`model` | `any` | Kaml Views can pass in 'custom models' that hold state but are not built from Calculation Results. See [`IKatApp.update`](#IKatApp.update) for more information.
`handlers` | `IStringAnyIndexer` | Kaml Views can pass in event handlers that can be bound via @event syntax (i.e. `@click="handlers.foo"`). See [`IKatApp.update`](#IKatApp.update) for more information.
`components` | `IStringIndexer<IStringAnyIndexer>` | Kaml Views can pass in petite-vue components that can used in v-scope directives (i.e. v-scope="components.inputComponent({})"). See [`IKatApp.update`](#IKatApp.update) for more information.
`inputs` | [`ICalculationInputs`](#icalculationinputs) | Inputs to pass along to each calculation during life span of KatApp.  See ICalculationInputs for more detail the the built in `getNumber()` and `getOptionText()` methods.
`errors` | [`Array<IValidation>`](#ivalidation) | Error array populated from the `error` calculation result table, API validation issues, unhandled exceptions in KatApp Framework or manually via `push` Kaml View javascript.  Typically they are bound to a validation summary template and input templates.
`warnings` | [`Array<IValidation>`](#ivalidation) | Warning array populated from the `warning` calculation result table or manually via `push` Kaml View javascript.  Typically they are bound to a validation summary template and input templates.
`rbl` | [`IStateRbl`](#istaterbl) | Helper object used to access RBLe Framework Calculation results.


### IState Methods

Name | Description
---|---
[`canSubmit`](#istatecansubmit) | Returns `true` if application is in the 'state' to submit to server for processing.
[`onAll`](#istateonall) | Returns `true` if **all** values passed in evaluate to `true` using same conditions described in [`rbl.boolean()`](#istaterblboolean)
[`onAny`](#istateonany) | Returns `true` if **any** values passed in evaluate to `true` using same conditions described in [`rbl.boolean()`](#istaterblboolean)
[`pushTo`](#istatepushto) | Allows Kaml Views to manually push 'additional result rows' into a calculation result table.

#### IState.canSubmit

**`canSubmit(whenInputsHaveChanged: boolean | undefined) => boolean`**

Returns `true` if application is in the 'state' to submit to server for processing; handling the most common situations.  

Returns `true` if `( whenInputsHaveChanged ? inputsChanged : isDirty ) && !uiBlocked && errors.filter( r => r['@id'].startsWith('i')).length == 0`.  

The `errors.filter` is ensuring that there are no `v-ka-input` validation errors that the user could correct.  

This property is helpful to use in modal applications with a submit button to control the `disabled` state.
#### IState.onAll

**`onAll(...values: any[]) => boolean`**

Returns `true` if **all** values passed in evaluate to `true` using same conditions described in `rbl.boolean()`.
#### IState.onAny

**`onAny(...values: any[]) => boolean`**

Returns `true` if **any** value passed in evaluates to `true` using same conditions described in `rbl.boolean()`.

#### IState.pushTo

**`pushTo(tabDef: ITabDef, table: string, rows: ITabDefRow | Array<ITabDefRow>, calcEngine?: string, tab?: string) => void`**

Allows Kaml Views to manually push 'additional result rows' into a calculation result table.  Typically used in [IKatApp.resultsProcessing](#ikatapponresultsprocessing) event handlers to inject rows before they are [processed into the application state](#rbl-framework-result-processing-in-katapp-state).

```javascript
application.on("resultsProcessing.ka", (event, results, inputs) => {
    // Push 'core' inputs into rbl-value for every CalcEngine if they exist
    // in this global handler instead of requiring *every* CalcEngine to return these.
    application.state.rbl.pushTo(results[0], "rbl-value",
        [
            { "@id": "currentPage", "value": inputs.iCurrentPage || "" },
            { "@id": "parentPage", "value": inputs.iParentPage || "" },
            { "@id": "referrerPage", "value": inputs.iReferrer || "" },
            { "@id": "isModal", "value": inputs.iModalApplication || "0" },
            { "@id": "isNested", "value": inputs.iNestedApplication || "0" }
        ]
    );
});
```


## IStateRbl

Helper object used to access RBLe Framework Calculation results.

### IStateRbl Properties

Property | Type | Description
`results`<sup>1</sup> | `IStringIndexer<IStringIndexer<Array<ITabDefRow>>>` | JSON object containing results of all assocatied CalcEngines.  Typically not used by Kaml developers.  Instead, use other methods of `IStateRbl` to grab results.  The `string` key to results is the concatenation of `CalcEngineKey.TabName`.
`options`<sup>2</sup> | `{ calcEngine?: string, tab?: string }` | Default configuration settings to be applied when working with the `IState.rbl` object and its methods.  The CalcEngine key and/or the `ITabDef` name to use as the default source when the CalcEngine key is not provided in methods that access RBLe Framework results.  If not provided, the *first* CalcEngine key and its *first* result tab defined in the [`<rbl-config>`](#configuring-calcengines-and-template-files) element in the Kaml View will be used when accessing results.

<sup>1</sup> The `results` object can be visualized as below (See [RBLe Framework Result Processing in KatApp State](#rble-framework-result-processing-in-katapp-state) to understand how RBLe Framework result managed in KatApp state to ensure proper `reactivity` after each calculation):

```javascript
// The object can be visualized as follows
rbl: {
    results: {
        "Home.RBLResult": {
            "rbl-value": [
                { "@id": "name", "value": "John Smith" },
                { "@id": "company", "value": "Conduent" },
            ],
            "rbl-display": [
                { "@id": "name", "value": "1" }
            ]
        },
        "Home.RBLDocGenResult": {
            "download": [
                { 
                    "template": "Sample.docx", 
                    "fileName": "statement.pdf" }
            ]
        }        
    }
}
```

<sup>2</sup> Given the following configuration for multiple CalcEngines and tabs, the `rbl.options` object can be used in the following scenarios.  Note, that when `options.calcEngine` or `options.tab` are set, all KatApp directives (`v-ka-value`, `v-ka-template`, `v-ka-table`, `v-ka-highchart`, etc.) that access RBLe Results will also obey the settings.

```html
<rbl-config templates="Standard_Templates,LAW:Law_Templates">
    <calc-engine key="default" name="LAW_Wealth_CE" input-tab="RBLInput" result-tabs="RBLResult"></calc-engine>
    <calc-engine key="shared" name="LAW_Shared_CE" input-tab="RBLInput" result-tabs="RBLResult,RBLHelpers"></calc-engine>
</rbl-config>
```

```javascript
// Start: application.state.rbl.options.calcEngine is 'undefined'
application.state.rbl.value("firstName"); // return rbl-value.firstName from LAW_Wealth_CE, RBLResult tab

application.state.rbl.options.calcEngine = "shared";
application.state.rbl.value("firstName"); // return rbl-value.firstName from LAW_Shared_CE, RBLResult tab

application.state.rbl.options.calcEngine = "default";
application.state.rbl.value("firstName"); // return rbl-value.firstName from LAW_Wealth_CE, RBLResult tab

application.state.rbl.options.calcEngine = "shared";
application.state.rbl.options.tab = "RBLHelpers";
application.state.rbl.value("firstName"); // return rbl-value.firstName from LAW_Shared_CE, RBLHelpers tab
```

### IStateRbl Methods

Name | Description
---|---
[`source`](#istaterblsource) | Returns table rows from `results`.
[`exists`](#istaterblexists) | Check for existence of table row(s).
[`value`](#istaterblvalue) | Return a single value (`undefined` if not present) from `results`.
[`number`](#istaterblnumber) | Return a single *number* value (`0` if not present or not a number) from `results`.
[`boolean`](#istaterblboolean) | Return whether or not a single row.column value is truthy.

#### IStateRbl.source

**`source(table: string, calcEngine?: string, tab?: string, predicate?: (row: ITabDefRow) => boolean) => Array<ITabDefRow>`**

The core method that returns table rows from `results` (and is leveraged internally by other `IState.rbl` methods).  The CalcEngine key and `ITabDef` name can be passed in if not using the 'default' CalcEngine and result tab. 

When the `calcEngine` and/or `tab` parameter is not provided, a 'default' location has to be determined.  This can be set via the the `IState.rbl.options` object.

1. CalcEngine is determined by `calcEngine` param, then [`rbl.options.calcEngine`](#istaterbloptionscalcengine) setting.
1. Tab name is determined by `tab` param, then [`rbl.options.tab`](#istaterbloptionstab) setting.

The `predicate` parameter indicates how the result rows should be filtered before returning them.

```javascript
// Return all resultTable rows
application.state.rbl.source("resultTable");

// Return all resultTable rows where category = 'red'
application.state.rbl.source("resultTable", r => r.category == 'red');

// Return all brdResultTable rows from the BRD CalcEngine
application.state.rbl.source("brdResultTable", "BRD");

// Return all resultTable rows from the 'RBLSecondTab' tab def
application.state.rbl.source("resultTable", undefined, "RBLSecondTab");
application.state.rbl.source("resultTable", , "RBLSecondTab");

// Return all brdResultTable rows from the BRD CalcEngine where topic = 'head'
application.state.rbl.source("brdResultTable", "BRD", r => r.topic == 'head');
```


#### IStateRbl.exists

**`exists(table: string, calcEngine?: string, tab?: string, predicate?: (row: ITabDefRow) => boolean ) => boolean`**

Returns `true` if the specfied table has any rows in `results`.  The CalcEngine key and `ITabDef` name can be passed in if not using the default CalcEngine and result tab. 

A `predicate` can be passed to filter rows before checking for existence. 

`rbl.exists` has the same syntax as `rbl.source` and is typically used in [`v-if`](#v-if--v-else--v-else-if) and [`v-show`](#v-show) directives.

```html
<div v-if="rbl.exists('resultTable')">
    <!-- Only render this element if any rows exist for resultTable -->
</div>
<div v-show="rbl.exists('resultTable', r => r.topic == 'head')">
    <!-- Only show this element if any rows exist for resultTable with topic = 'head'  -->
</div>
```

#### IStateRbl.value

**`value(table: string, keyValue: string, returnField?: string, keyField?: string, calcEngine?: string, tab?: string) => string | undefined`**

Return a single value (`undefined` if not present) from `results` given parameters passed in.  .  The CalcEngine key and `ITabDef` name can be passed in if not using the default CalcEngine and result tab.

After `keyValue`, all parameters are optional. If `returnField` is not passed in, the `value` column is used.  If `keyField` is not passed in, the `@id` column is used.

Shorthand syntax of only one parameter is allowed, where the `table` parameter is then assumed to be `rbl-value` and the single parameter is assumed to be the `keyValue`.

```javascript
// Return 'value' column from 'rbl-value' table where '@id' column is "name-first".
const name = application.state.rbl.value("rbl-value", "name-first");

// Shorthand syntax for example above.
const name = application.state.rbl.value("name-first");

// Return 'value2' column from 'rbl-value' table where '@id' column is "name-first".
const name = application.state.rbl.value("custom-table", "name-first", "value2");

// Return 'value2' column from 'rbl-value' table where 'key' column is "name-first".
const name = application.state.rbl.value("custom-table", "name-first", "value2", "key");

// Return 'value' column from 'rbl-value' table where 'key' column is "name-first".
const name = application.state.rbl.value("custom-table", "name-first", undefined, "key");


// Return 'value' column from 'rbl-value' table where '@id' column is "name-first" from the BRD CalcEngine
const name = application.state.rbl.value("rbl-value", "name-first", undefined, undefined, "BRD");

// Return 'value' column from 'rbl-value' table where '@id' column is "name-first" 
// from the RBLResult2 tab in the default CalcEngine
const name = application.state.rbl.value("rbl-value", "name-first", 
                undefined, undefined, undefined, "RBLResult2");

// Return 'value2' column from 'rbl-value' table where 'key' column is "name-first" from the 
// RBLResult2 tab in the BRD CalcEngine
const name = application.state.rbl.value("custom-table", "name-first", "value2", "key", 
                "BRD", "RBLResult2");
```

#### IStateRbl.text

**`text(table: string, keyValue: string, returnField?: string, keyField?: string, calcEngine?: string, tab?: string) => string | undefined`**

The exact same functionality as `rbl.value()` except that the value returned from `rbl.value` is used as a key to look into resource strings.  If a resource string is not found, the value returned from `rbl.value` is returned.

#### IStateRbl.number

**`number(table: string, keyValue: string, returnField?: string, keyField?: string, calcEngine?: string, tab?: string) => number`**

Return a single *number* value (`undefined` if not present) from `results` given parameters passed in.  .  The CalcEngine key and `ITabDef` name can be passed in if not using the default CalcEngine and result tab.

After `keyValue`, all parameters are optional. If `returnField` is not passed in, the `value` column is used.  If `keyField` is not passed in, the `@id` column is used.

Internally, `number()` first retrieves a value using the [`value()`](#istaterblvalue) method, then converts it to a number.  If the value is `undefined` or unable to be converted to a number, `0` is returned.

See `rbl.value()` for examples on syntax available.

#### IStateRbl.boolean

**`boolean(table: string, keyValue: string, returnField?: string, keyField?: string, calcEngine?: string, tab?: string, valueWhenMissing?: boolean) => boolean`**

Returns `true` if the value returned (with same function signature as `rbl.value`) is `undefined` (currently not present in results) or value is string and lower case is not in ['false', '0', 'n', 'no'] or value converted to a boolean is `true`.  Typically used in `v-if` and `v-show` directives.

Shorthand syntax of only one parameter is allowed, where the parameter is assumed to be the `keyValue` parameter, and then **multiple** tables are checked returning first existing match.  The tables checked (based on priority) are: `rbl-value`, `rbl-display`, `rbl-disabled`, and `rbl-skip`.

```html
<div v-if="rbl.boolean('canSeeThis')">
    <!-- 
    Only render this element if rbl-value, rbl-display, rbl-disabled, or rbl-skip 
    does not contain an row with @id = 'canSeeThis' or that row does *not* have a 
    value = 'false', '0', 'n', 'no'.
    -->
</div>
<div v-show="rbl.boolean('customTable', 'canSeeThis')">
    <!-- 
    Only render this element if customTable table does not contain an row with @id = 'canSeeThis' 
    or that row does *not* have a value = 'false', '0', 'n', 'no'.
    -->
</div>
```

There are times when Kaml Views do not want a 'missing calculation value' to return true, most commonly when using `rbl.boolean()` for a `:disabled` Vue directive.  In this case, it is useful to use the `valueWhenMissing` parameter and set it to `false` so that if a CalcEngine does not return the requested item the element is *not* disabled; only disable the element if a value is return and can not be parsed into `true`.

There is also a shorthand syntax for `valueWhenMissing`.  It is always the last parameter, so no matter how many of the other parameters to `rbl.boolean()` a Kaml View needs to use to get the appropriate value from the appropriate calculation result location, `valueWhenMissing` can be provided at any point as the last parameter.

```html
<!-- 
Link disabled if allowLink not returned in rbl-value, rbl-display, rbl-disabled, or rbl-skip
since 'undefined' will be treated as 'true' in rbl.boolean()
 -->
<a href="#" :disabled="rbl.value('allowLink')">Click Here</a>

<!-- 
Link is *not* disabled, even if allowLink not returned in rbl-value, rbl-display, 
rbl-disabled, or rbl-skip since 'undefined' will be treated as 'false' in rbl.boolean()
because valueWhenMissing was provided.
 -->
<a href="#" :disabled="rbl.value('allowLink', false)">Click Here</a>

<!-- 
Link disabled, if allowLink not returned in rbl-disabled
since 'undefined' will be treated as 'true' in rbl.boolean()
 -->
<a href="#" :disabled="rbl.value('rbl-disabled', 'allowLink')">Click Here</a>

<!-- 
Link is *not* disabled, event if allowLink not returned in rbl-disabled
since 'undefined' will be treated as 'false' in rbl.boolean() because valueWhenMissing was provided.
 -->
<a href="#" :disabled="rbl.value('rbl-disabled', 'allowLink', false)">Click Here</a>
```


## RBLe Framework Result Processing in KatApp State

Since Vue directives and template syntax is driven by a [reactivity mental model](https://vuejs.org/guide/essentials/reactivity-fundamentals.html), it is important to process RBLe Framework calculations properly to subscribe into this reactivity correctly.

There are three ways calculations tables are processed:

1. **Merge the 'core KatApp table' into Vue state.** This is because with core tables, CalcEngines often only return rows that have 'changed'.  So if initial calculation returned 15 'core rows', then a subsequent calculation only returned the '1 affected row', the KatApp Framework cannot replace entire table with new results because all Vue reactivity bound to previous core table rows would be reprocessed (against a non-existent row).
1. **Completely replace the table in Vue state.** All non-core tables that are returned are usually used in a [v-for directive](#v-for) and CalcEngines always return the complete list of rows needed to re-render the markup (partial updates are not allowed).  So it is safe to completely replace the table and allow Vue reactivity to process and re-render (any non-existant rows would be 'removed').
1. **Process [`table-output-control`](#table-output-control) instructions that clear tables in Vue state.** All non-core tables that normally replace Vue state tables need a way to indicate when an original calculation returned table rows, then a subsequent calculation wants to return **no** rows; emptying out Vue state and triggering Vue reactivity run re-render (with zero rows as the Vue scope). When RBLe Framework CalcEngines do *not* return a table (b/c nothing has changed and there is no need to re-process the results with Vue reactivity), there is no way for the KatApp Framework to know if a table is missing because no updates were made or because there is now no valid data.  To allow for this scenario, the `table-output-table` is processed and indicates how the Vue state should be updated.

The following psuedo code demonstrates the work flow for result processing.

```javascript
const coreKatAppTable = ["rbl-disabled", "rbl-display", "rbl-skip", "rbl-value", "rbl-listcontrol", "rbl-input"];
const resultKey = `Home.${tabDef.name}`; // CalcEngineKey.TabName
const stateResult = application.state.rbl.results[resultKey];

// Update/merge Vue state as needed for each table returned in the calculation
for (const tableName in tabDef) {
    if (coreKatAppTable.indexOf(tableName) == -1) {
        // For any non coreKatAppTable returned, simply assign state value
        stateResult[tableName] = tabDef[tableName];
    }
    else {
        tabDef[tableName].forEach( row => {
			const index = stateResult[tableName].findIndex(r => r["@id"] == row["@id"]);

			if (index > -1) {
                // Found existing row, merge rows together by extending the 
                // state row with any properties returned in result row.
				Utils.extend(stateResult[tableName][index], row);
			}
			else {
                // If no existing row, simply push new row to end of table, order
                // of rows in coreKatAppTables is not important.
				stateResult[tableName].push(row);
			}
        });
    }
}

// Update input values (both state.inputs and any matching HTML elements) via rbl-default instructions
tabDef["rbl-defaults"].forEach( r => application.setInputValue(r["@id"], r["value"]) );

// Look for any value/errors/warnings in rbl-input table and update state appropriately.
// However, only set 'value', 'error', 'warning' column is returned in rbl-input table
const hasRblInputValue = tabDef.hasTable("rbl-input") && tabDef["rbl-input"].hasColumn("value");
const hasRblInputError = tabDef.hasTable("rbl-input") && tabDef["rbl-input"].hasColumn("error");
const hasRblInputWarning = tabDef.hasTable("rbl-input") && tabDef["rbl-input"].hasColumn("warning");

tabDef["rbl-input"].forEach( r => {
    if (hasRblInputValue) {
        application.setInputValue(r["@id"], r["value"]);
    }
    if (hasRblInputError && (r["error"] ?? "") != "") {
        const v: IValidation = { "@id": r["@id"], text: r["error"] };
        application.state.errors.push(v);
    }
    if (hasRblInputWarning && (r["warning"] ?? "") != "") {
        const v: IValidation = { "@id": r["@id"], text: r["warning"] };
        application.state.warnings.push(v);
    }
});

// Check error/warning tables and apply to state if present
tabDef["error"].forEach(r => application.state.errors.push(r) );
tabDef["warning"].forEach(r => application.state.errors.push(r) );

// If table control says they want to export, but no rows are returned, then need to re-assign to empty array
tabDef["table-output-control"].forEach(r => {
    // export = -1 = didn't export table but clear out in Vue state
    // export = 1 = exported table, if empty clear Vue state
    if ((r["export"] == "-1" || r["export"] == "1") ) {
        stateResult[r["@id"]] = [];
    }
});
```

# HTML Content Template Elements

Vue is a template based javascript framework. Often all markup can be generated without the use of the [HTML Content Template element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/template), however there are times when reusable pieces of markup are required or simply developer preference to segregate html content into a template that will be rendered only when needed.

- [HTML Template Element](#html-template-element) - Describes important role the `<template>` element plays in Vue / KatApps.
- [Template Precedence](#template-precedence) - Describes the process used in locating the proper KatApp template based on name.
- [Template Script and Style Tags](#template-script-and-style-tags) - When templates contain their own `<style>` and `<script>` elements, special processing is required.
- [Input Templates](#input-templates) - When templates represent an 'input', special processing is required.

## HTML Template Element

It is important to understand how `<template>` elements function inside the DOM. From the Mozilla documentation:

> The &lt;template> HTML element is a mechanism for holding HTML that is not to be rendered immediately when a page is loaded but may be instantiated subsequently during runtime using JavaScript.

In Kaml Views, templates are rendered via the [`v-ka-template`](#v-ka-template), [`v-ka-input`](#v-ka-input), or [`v-ka-input-group`](#v-ka-input-group) directive.  Usually, directives that use a template will receive a data source, called a 'model' and when rendering a 'scope' object will be provided to the `<template>` markup. This scope could be the model itself, or it could be an object constructed from the model. See the above directives for more information and samples.

There are two important features in play with regards to templates in the KatApp Framework.

1. Template Precedence - How the KatApp Framework finds the right template to render given a template name.
1. Template Script and Style Tags - The KatApp Framework will render `<style>` from a template at most one time, however, there are conventions to control how often a `<script>` element runs.

## Template Precedence

Templates can be created inside Kaml View files, however, they can also be provided via separate Kaml Template file.  To add to the complexity, a Kaml View can specify multiple Kaml Template files that are required.  

Therefore, an order of precedence is applied so that templates can be overridden if desired by using the same `id` for the `<temlpate>`.

```html
<!-- Assume the following markup for each file -->

<!-- Templates.Shared Markup.kaml -->
<template id="banner">
    <div class="banner">My Global Banner: {greeting}</div>
</template>
<template id="sub-banner">
    <div class="sub-banner">My Global Sub Banner: {greeting}</div>
</template>
<template id="footer">
    <div class="footer">My Global Footer: {greeting}</div>
</template>

<!-- Templates.Profile.Shared.kaml Markup -->
<template id="banner">
    <div class="banner">My Profile Banner: {greeting}</div>
</template>
<template id="sub-banner">
    <div class="sub-banner">My Profile Sub Banner: {greeting}</div>
</template>

<!-- Sample.kaml View Markup -->
<rbl-config templates="Nexgen:Templates.Shared,Nexgen:Templates.Profile.Shared"></rbl-config>

<template id="banner">
    <div class="banner">My Kaml Banner: {greeting}</div>
</template>
```

Given the sample markups above, the order of precedence (1 being the highest) is applied when locating a template:

1. Template located inside the Kaml View file
2. Search template files specified in the `templates` attribute from _right to left_

Requested Template | Location of Template
---|---
banner | Sample.kaml (overrides Templates.Profile.Shared.kaml and Templates.Shared.kaml)
sub-banner | Templates.Profile.Shared.kaml (overrides Templates.Shared.kaml)
footer | Templates.Shared.Kaml (only present in this file)

## Template Script and Style Tags

Sometimes, templates are complex enough that they provide their own `<style>` and `<script>` tags to help encapsulate functionality.

`<style>` tags are always only rendered one time since injecting the identical `<style>` markup multiple times will have no effect on the CSS processor.

However, `<script>` tags can be processed similarily (i.e. only processed on the first time a template is used and rendered) or can be configured to inject the script content every time the template is rendered. This is accomplished with a `setup` attribute.

Vue has a concept for element 'lifecycle events'.  The two events available are `mounted` and `unmounted` than run the specified code every time reactivity causes an element to be rendered or removed.  See [v-on](#v-on) for more information.  KatApp Framework followed this convention for template script code.

The only two methods that can be provided inside template `<script>` tags are a `mounted` and `unmounted` function. Both functions are optional; if the functions do not exist, the script will do nothing. Below are the function signatures.


```html
<template id="widget-resources">
    <!-- 
    Use the 'setup' attribute to indicate that this script
    element should only be processed the first time a template
    is rendred.
    -->
    <script setup>
        // code only runs the first time the template is rendered and the first time a rendered template item is removed (if ever)
		function mounted(application) {
		}
		function unmounted(application) {
		}
    </script>

    <!--
    Omit the 'setup' attribute to indicate that this script
    element should be processed *every* time a template is
    rendered.  A single template can have multiple <script>
    elements each with their own 'setup' configuration 
    applied appropriately.
    -->
    <script>
        // code runs every time the template is rendered and when a rendered template item is removed
		function mounted(application) {
		}
		function unmounted(application) {
		}
    </script>
</template>
```

The most common use for these functions are to hook to [IKatApp Events](#ikatapp-events), but the template scripts can also opt to simply perform some DOM manipulation of its own.  When performing DOM manipulation on the template's elements, a mechanism is required to ensure proper 'selection' of rendered template markup.

1. Vue caches the `mounted` and `unmounted` function calls until all elements are rendered. If a template was manually called twice, the results of both template calls would be rendered and *then* the `mounted`/`unmounted` functions would be called.  This can lead to adverse affects.  For example, if a `mounted` function was designated to run every time the template was ran, the content from two template calls would already be rendered before each of their `mounted` functions were called. This essentially results in double processing.
1. If a template is provided an `Array<>` data source, and uses a [`v-for="row in rows"`](#v-for) to render content, the `mounted` functions in both the `setup` and the 'every time' script sections will only be called one time, *not for iteraction of the `v-for`*.
1. To aid in selection scoping, the 'scope' of the template will have a special `$renderId` property assigned that is an unique ID that can be rendered and used during selection actions to ensure proper scoping. The `$renderId` is made up via `{templateId}_{application.id}_{index}` where `index` is a number 1..N representing how many times this template has been rendered.

Below is an example of how to leverage the `$renderId` to allow for proper scoping.

```html
<script>
// Create a model we can use in markup
(function () {
	/** @type {IKatApp} */
	var application = KatApp.get('{id}');
	application.configure( config => {
		config.model = {
			list: ["Pension", "LifeEvents", "Savings"]
		};
    });
)();
</script>

<!-- Loop each item in list and call template with non-array source -->
<div v-ka-rbl-no-calc v-for="item in model.list">
    <div v-ka-template="{ name: 'templateWithScript', source: { name: item } }"></div>
</div>

<template id="templateWithScript">
	<script setup type="text/javascript">
		function mounted(application) {
			// Use {{ }} syntax to grab value and store it in string selector
			const renderId = '.{{$renderId}}';
            const length = application.select(renderId).length;
			console.log(`setup templateMounted:, ${length} scoped items found`);
		}
		function unmounted(application) {
			const renderId = '.{{$renderId}}';
            const length = application.select(renderId).length;
			console.log(`setup templateUnmounted:, ${length} scoped items found`);
		}
	</script>
	<script type="text/javascript">
		function mounted(application) {
			const renderId = '.{{$renderId}}';
            const scopeLength = application.select(renderId).length;
            const templateLength = application.select(renderId).length;
			console.log(`templateMounted:, ${scopeLength} scoped items found`);
			console.log(`templateMounted:, ${templateLength} template-script-input items found`);
		}
		function unmounted(application) {
			const renderId = '.{{$renderId}}';
            const templateLength = application.select(renderId).length;
			console.log(`templateUnmounted:, ${templateLength} template-script-input items found`);
		}
	</script>
	<input v-ka-input="{name: 'iTemplateInput' + name }" type="text" 
        :class="['template-script-input', $renderId]" />
</template>

<!-- Rendered HTML -->
<div v-ka-rbl-no-calc>
    <input name="iTemplateInputPension" 
        type="text" 
        class="template-script-input iTemplateInputPension templateWithScript_templateWithScript_ka1e46825c_1">
    <input name="iTemplateInputLifeEvents" 
        type="text" 
        class="template-script-input iTemplateInputLifeEvents templateWithScript_templateWithScript_ka1e46825c_2">
    <input name="iTemplateInputPension" 
        type="text" 
        class="template-script-input iTemplateInputSavings templateWithScript_templateWithScript_ka1e46825c_3">
</div>
```

With the above example, you could expect the following in the console ouput (remembering that all rendering completes before `mounted` is called):

> templateWithScript setup templateMounted:, 1 scoped items found  
> templateWithScript setup templateMounted:, 3 template-script-input items found  
> templateWithScript templateMounted:, 1 scoped items found  
> templateWithScript templateMounted:, 3 template-script-input items found  
> templateWithScript templateMounted:, 1 scoped items found  
> templateWithScript templateMounted:, 3 template-script-input items found  
> templateWithScript templateMounted:, 1 scoped items found  
> templateWithScript templateMounted:, 3 template-script-input items found  

```html
<script>
// Create a model we can use in markup
(function () {
    /** @type {IKatApp} */
	var application = KatApp.get('{id}');
	application.configure( config => {
		config.model = {
			list: ["Pension", "LifeEvents", "Savings"]
		};
    });
)();
</script>

<!-- Call template with array source -->
<div v-ka-rbl-no-calc v-ka-template="{ name: 'templateWithScript', source: model.list.map( item => ({ name: item }) ) }"></div>

<template id="templateWithScript">
	<script setup type="text/javascript">
		function mounted(application) {
			// Use {{ }} syntax to grab value and store it in string selector
            const renderId = '.{{$renderId}}';
            const length = application.select(renderId).length;
			console.log(`setup templateMounted:, ${length} scoped items found`);
		}
		function unmounted(application) {
			const renderId = '.{{$renderId}}';
            const length = application.select(renderId).length;
			console.log(`setup templateUnmounted:, ${length} scoped items found`);
		}
	</script>
	<script type="text/javascript">
		function mounted(application) {
			const renderId = '.{{$renderId}}';
            const scopeLength = application.select(renderId).length;
            const templateLength = application.select(renderId).length;
			console.log(`templateMounted:, ${scopeLength} scoped items found`);
			console.log(`templateMounted:, ${templateLength} template-script-input items found`);
		}
		function unmounted(application) {
			const renderId = '.{{$renderId}}';
            const templateLength = application.select(renderId).length;
			console.log(`templateUnmounted:, ${templateLength} template-script-input items found`);
		}
	</script>

    <!-- Render items with v-for -->
	<input v-for="(row, index) in rows" v-ka-input="{name: 'iTemplateInput' + row.name }" type="text" 
        :class="['template-script-input', $renderId]" />
</template>

<!-- Rendered HTML (notice how the last segment of renderId is always 1 in this case) -->
<div v-ka-rbl-no-calc>
    <input name="iTemplateInputPension" 
        type="text" 
        class="template-script-input iTemplateInputPension templateWithScript_templateWithScript_ka1e46825c_1">
    <input name="iTemplateInputLifeEvents" 
        type="text" 
        class="template-script-input iTemplateInputLifeEvents templateWithScript_templateWithScript_ka1e46825c_1">
    <input name="iTemplateInputPension" 
        type="text" 
        class="template-script-input iTemplateInputSavings templateWithScript_templateWithScript_ka1e46825c_1">
</div>
```

With the above example, you could expect the following in the console ouput (remembering that all rendering completes before `mounted` is called):

> templateWithScript setup templateMounted:, 3 scoped items found  
> templateWithScript setup templateMounted:, 3 template-script-input items found  
> templateWithScript templateMounted:, 3 scoped items found  
> templateWithScript templateMounted:, 3 template-script-input items found  

**Note**: When a template with `<script>` tags is called and passed an `Array` data source, you can see that both the `setup` and 'normal' scripts excecute only one time, therefore it is recommended to always use the 'normal' script mode.

## Input Templates

When templates are used to render an input (or input group), they need to be designated as such.  This instructs the KatApp Framework to locate all `HTMLInputElement`s to ensure that inputs are 'mounted' and 'unmounted' properly.  This is accomplished by using an `input` attribute on the script tag.

```html
<template id="input-text" input>
    <label>My Input</label>
    <input name="iMyInput"/> <!-- KatApp Framework finds this input and adds the required event watchers -->
</template>
```

There are some scenarios when an input template renders multiple inputs and some of the inputs should not be 'mounted' and 'unmounted' the [`v-ka-nomount`](#v-ka-nomount) directive can be used.  See the `v-ka-nomount` documentation for more information.

# Common Vue Directives

Vue supports [many directives](https://vuejs.org/api/built-in-directives.html), however, there are only a handful that commonly used in Kaml View files.  Below are the most common directives used and some examples of how to use them with the [IState scope object](#istate).

- [v-html / v-text](#v-html--v-text) - Update the element's `innerHTML` or text content.
- [v-bind](#v-bind) - Dynamically bind one or more attributes to an expression.
- [v-for](#v-for) - Render the element or template block multiple times based on the source data.
- [v-on](#v-on) - Attach an event listener to the element.
- [v-if / v-else / v-else-if](#v-if--v-else--v-else-if) - Conditionally render an element or a template fragment based on the truthy-ness of the expression value.
- [v-show](#v-show) - Toggle the element's visibility based on the truthy-ness of the expression value.
- [v-pre](#v-pre) - Use the `v-pre` directive to an element that is used for [IModalOptions.contentSelector](#imodaloptionscontentselector) if the markup within the element should not be processed by the host application, but instead should be processed and become reactive when the modal application is created.

**Note:** Usually, 'inside' the actual directive markup, the content is simply 'valid javascript' with the given context/scope.

## v-html / v-text

Use the `v-text` directive to:

> [Vue](https://vuejs.org/api/built-in-directives.html#v-text): Update the element's text content.

Or, use the `v-html` directive to:

> [Vue](https://vuejs.org/api/built-in-directives.html#v-html): Update the element's [innerHTML](https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML).

The `v-html`, and less common `v-text`, directive is most commonly used inside the processing of a [`v-for`](#v-for) directive.  It can also be used in conjunction with the [`rbl.value()`](#istaterblvalue) method as well.

The `v-text` directive *does* have a `{{ }}` shorthand syntax that allows for more terse markup.

Only use `v-text` or `{{ }}` when the value does *not* have any HTML markup.

For all samples in this section, assume calculation results of the following:

```javascript
results: {
    'rbl-value': [
        { "@id": "fullName", "value": "John Doe" },
        { "@id": "address", "value": "123 Normal Lane<br/>Manhattan, NY 55123" },
    ]
}
```

```html
<div v-html="rbl.value('fullName')"></div>
<!-- renders... -->
<div>John Doe</div>

<div v-html="rbl.value('fullNameInvalid')"></div>
<!-- renders (note how 'undefined' is rendered since rbl.value returns undefined for missing IDs)... -->
<div>undefined</div>

<div v-html="rbl.value('fullNameInvalid') || ''"></div>
<!-- renders 'blank' correctly, but somewhat cumbersome -->
<div></div>


<div v-html="rbl.value('address')"></div>
<!-- renders... -->
<div>123 Normal Lane<br/>Manhattan, NY 55123</div>

<div v-text="rbl.value('address')"></div>
<!-- renders (note how markup is HTML encoded)... -->
<div>123 Normal Lane&lt;br/&gt;Manhattan, NY 55123</div>

<div v-html="`<p>Hello from <b>v-html</b> with Template Literal <b>${1+2}</b></p>`"></div>
<!-- renders...  -->
<p>Hello from <b>v-html</b> with Template Literal <b>3</b></p>
```

Note: Given that `v-html` used with `rbl.value` renders the 'undefined' in the markup, it is preferrable to use the [`v-ka-value`](#v-ka-value) directive to avoid this issue.

## v-bind

> [Vue](https://vuejs.org/api/built-in-directives.html#v-bind): Dynamically bind one or more attributes, or a component prop to an expression.

> [petite-vue](https://github.com/vuejs/petite-vue#not-supported) Not Supported: `v-bind:style` auto-prefixing

The `v-bind` directive *does* have a `:` shorthand syntax that allows for more terse markup.

- [v-bind Examples](#v-bind-examples) - Samples doing general `v-bind` instructions.
- [v-bind `class` and `style` Examples](#v-bind-class-and-style-examples) - Samples explaining the special processing that occurs when binding `class` or `style` attributes.

Also note, features from Vue documentation that petite-vue does not support:
1. `.prop` - force a binding to be set as a DOM property.
1. `.attr` - force a binding to be set as a DOM attribute.
1. `<button :[key]="value"></button>` - dynamic attribute name.
1. `style` auto-prefixing - when a CSS property that requires [vendor prefix](https://developer.mozilla.org/en-US/docs/Glossary/Vendor_Prefix) (i.e. `transform`)

### v-bind Examples

```html
<!-- The following are equivalent -->
<div v-bind:class="'blue'"></div>
<div :class="'blue'"></div>
```

For all the following samples in this section, the `:` shorthand syntax will be used and assume a custom application.state.model of the following:

```javascript
model: {
    favoriteClass: "bootstrap awesome",
    isActive: true,
    hasError: false,
    activeColor: 'red',
    fontSize: 30,
    id: '123'
}
```

In the simplest sense, `v-bind` takes an 'expression' that returns a `string` and that value is assigned to the attribute. That 'expression' and be a model property, string concatenation, or Template Literals.

```html
<div :class="model.favoriteClass"></div>
<!-- Renders... -->
<div class="bootstrap awesome"></div>

<div :class="'conduent ' + model.favoriteClass"></div>
<!-- Renders... -->
<div class="conduent bootstrap awesome"></div>

<div :class="`conduent ${model.favoriteClass}`"></div>
<!-- Renders... -->
<div class="conduent bootstrap awesome"></div>

<div :data-calculation-id="model.id"></div>
<!-- Renders... -->
<div data-calculation-id="123"></div>
```

### v-bind `class` and `style` Examples

The `class` and `style` attributes have special processing that occurs.

1. The `class` 'expression' can return `string` | `IStringIndexer<boolean>` | `Array<string | IStringIndexer<boolean>>`
1. The `style` 'expression' can return `string` | `IStringIndexer<string | Array<string>>` | `Array<string | IStringIndexer<string>>`
1. The `style` 'expression' can return `Array<IStringIndexer<Array<string>>` to support [Vendor Prefixing](https://developer.mozilla.org/en-US/docs/Glossary/Vendor_Prefix) where only the last supported style is rendered.
1. The `:class` and `:style` directives can co-exist with the standard `class` and `style` attributes and the directive will 'extend' the values.

**Note:** Both `class` and `style` have special processing when the expression returns an `Array<string>` enabling Vue to properly `space` delimit the class names.  However, for any other attribute binding, if an `Array<string>` is provided, Vue will `,` delimit the values.

#### v-bind class Examples

```html
<!-- Basic expression of type string -->
<div :class="model.hasError ? 'text-danger' : '' }"></div>

<!-- class and :class can co-exist -->
<div
  class="static"
  :class="model.isActive ? 'active' : '' }"></div>
<!-- Renders... -->
<div class="static active"></div>

<!-- 
Expression of type Array<string> 
-->
<div :class="['static', model.isActive ? 'active' : '', model.hasError ? 'text-danger' : '']"></div>
<!-- Renders... -->
<div class="static active"></div>

<!-- 
Expression of type IStringIndexer<boolean> 

When expression is IStringIndexer<boolean> it only applies the class if the boolean expression evaluates to true.

Note: This expression style is preferrable to the Ternary operator of :class="isActive ? 'active' : ''"
-->
<div :class="{ 'active': isActive, 'text-danger': hasError }"></div>
<!-- Renders... -->
<div class="active"></div>

<!-- 
Expression of type Array<string, IStringIndexer<boolean>>
Can mix and match string and IStringIndexer<boolean> in the array as well.
-->
<div :class="['static', { 'active': isActive, 'text-danger': hasError }]"></div>
<!-- Renders... -->
<div class="static active"></div>
```

Given how complex the class expression can become, consider binding directly to a class object on a custom model so that the template is cleaner.

```javascript
// All expressions below would be a 'calculated' value usually
model: {
    myClass: {
        'static': true,
        'active': true,
        'hasError': false
    }
}
```

```html
<div :class="model.myClass"></div>
<!-- Renders -->
<div class="static active"></div>
```

#### v-bind style Examples

```html
<!-- Basic expression of type string -->
<div :style="model.fontSize + 'px'"></div>
<!-- Renders.. -->
<div style="fontSize: 30px;"></div>

<!-- style and :style can co-exist -->
<div style="color: blue;" :style="'fontSize: ' + model.fontSize + 'px'"></div>
<!-- Renders.. -->
<div style="color: blue; fontSize: 30px;"></div>

<!-- Basic expression of type Array<string> -->
<div :style="['color: ' + model.activeColor, 'fontSize: ' + model.fontSize + 'px']"></div>
<!-- Renders.. -->
<div style="color: red; fontSize: 30px;"></div>

<!-- Expressions override existing matching styles with last element in array taking precedence -->
<div style="color: blue;" :style="['color: ' + model.activeColor, 'fontSize: ' + model.fontSize + 'px' ]"></div>
<!-- Renders.. -->
<div style="color: red; fontSize: 30px;"></div>

<!-- 
Expression of type IStringIndexer<string> 

When expression is IStringIndexer<string> each style is applied and overrides any existing matching styles with 
last element in array taking precedence.
-->
<div :style="{ color: model.activeColor, fontSize: model.fontSize + 'px' }"></div>
<!-- Renders.. -->
<div style="color: red; fontSize: 30px;"></div>

<!-- 
Expression of type Array<string, IStringIndexer<string>>
Can mix and match string and IStringIndexer<string> in the array as well.
-->
<div style="border: 1px solid blue;" 
    :style="['font-weight: bold', { color: model.activeColor, fontSize: model.fontSize + 'px' }, { font-weight: 'normal' }]">
</div>
<!-- Renders... -->
<div style="border: 1px solid blue; color: red; fontSize: 30px; font-weight: normal;"></div>

<!-- 
Expression of type IStringIndexer<Array<string>>
You can provide an array of multiple (prefixed) values to a style property and Vue will only render the last 
value in the array which the browser supports. 
-->
<div :style="{ display: ['-webkit-box', '-ms-flexbox', 'flex'] }"></div>
<!-- 
Renders `display: flex` for browsers that support the unprefixed version of `flexbox`.  
This gets around the limitation of no support for 'auto-prefixing'. 
-->
<div style="display: flex;"></div>
```

Given how complex the style expression can become, consider binding directly to a style object on a custom model so that the template is cleaner.

```javascript
model: {
    myStyle: {
        display: ['-webkit-box', '-ms-flexbox', 'flex'],
        color: 'red', 
        fontSize: '40px',
        fontWeight: 'bold'
    }
}
```

```html
<div :style="model.myStyle"></div>
<!-- Renders -->
<div style="display: flex; color: red; fontSize: 40px; fontWeight: bold;"></div>
```

## v-for

> [Vue](https://vuejs.org/api/built-in-directives.html#v-for): Render the element or template block multiple times based on the source data.

> [petite-vue](https://github.com/vuejs/petite-vue#not-supported) Not Supported: `v-for` deep destructure


There are two allowed syntaxes for `v-for`. 

1. `v-for="item in array"` where `item` is just a 'variable name' representing each item in the iterable source.  In this case, the `array` value, usually `rbl.source()`, represents the iterable source.
1. `v-for="(item, index) in array"` functions the same as above, except with this signature, an 'index' variable has been introduced (it can be named anything) that is a `0..N` integer representing the current position of `item` in the `array`. This is helpful when you need to conditionally change markup based on the first or last item in the iterable source.

Kaml Views will most often use `v-for` in conjunction with [`rbl.source()`](#istaterblsource).

For all samples in this section, assume calculation results of the following:

```javascript
results: {
    resultTable: [
        { "key": "Apple", "type": "Fruit", "text": "An apple a day keeps the doctor away." },
        { "key": "Orange", "type": "Fruit", "text": "'Orange' you glad you didn't eat an apple?" },
        { "key": "Baked Beans", "type": "Vegetables", "text": "Beans, beans, the magical fruit..." }
    ]
}
```

### Using the `:key` Attribute with v-for

It is advised to use the [`:key`](https://vuejs.org/api/built-in-special-attributes.html#key) attribute any time a `v-for` directive is used. This is to give a hint to Vue about how to uniquely identify each row when rendering, otherwise unexpected behavior could result.


- [v-for With rbl.source](#v-for-with-rblsource) - Most common syntax of using `v-for` directive with results from a CalcEngine.
- [v-for With template Element](#v-for-with-template-element) - Describes the benefit of using a HTML Template element with `v-for` to eliminate the rendering of a parent HTML element if not desired.
- [v-for With v-bind Attributes](#v-for-with-v-bind-attributes) - Example using both `v-for` and `v-bind` directives on the same element.

### v-for With rbl.source

The most common and basic syntax used will be:

```html
<div v-for="item in rbl.source('resultTable')">
  {{item.key}}: {{ item.text }}
</div>

<!-- Renders... -->
<div>Apple: An apple a day keeps the doctor away.</div>
<div>Orange: 'Orange' you glad you didn't eat an apple.</div>
<div>Baked Beans: Beans, beans, the magical fruit...</div>

<div v-for="item in rbl.source('resultTable', r => r.type == 'Fruit')">
  {{item.key}}: {{ item.text }}
</div>

<!-- Renders... -->
<div>Apple: An apple a day keeps the doctor away.</div>
<div>Orange: 'Orange' you glad you didn't eat an apple.</div>
```

### v-for With template Element

As documented in the [HTML Content Template Elements](#html-content-template-elements) section, a `<template>` element is a 'mechanism for holding HTML that is not to be rendered'.  Therefore, in addition to being reusable pieces of markup, `<template>` elements have an important role to be considered when rendering markup in Kaml Views.  

Normally, on which ever element the `v-for` directive appears, that will be the element that *repeats* for each row that is present in the data source. Consider the following example.

```html
<div class="row">
    <div v-for="item in rbl.source('resultTable')">
        <div class="col-6">{{item.key}}</div>
        <div class="col-6">{{item.text}}</div>
    </div>
</div>

<!-- Produces... -->
<div class="row">
    <div> <!-- Repeated element -->
        <div class="col-6">Apple</div>
        <div class="col-6">An apple a day keeps the doctor away.</div>
    </div>
    <div> <!-- Repeated element -->
        <div class="col-6">Orange</div>
        <div class="col-6">'Orange' you glad you didn't eat an apple.</div>
    </div>
    <div> <!-- Repeated element -->
        <div class="col-6">Baked Beans</div>
        <div class="col-6">Beans, beans, the magical fruit...</div>
    </div>
</div>
```

This is *not* the proper hierarchial structure that Bootstrap css expects.  It expects `col-*` elements to be placed as an *immediate* descending of an element with the `row` class applied.

We can use the `<template>` element to solve this problem.  When a `v-for` is placed on a `<template>` element, **only** the content inside the template is repeated and not the actual `<template>` element (since template elements are never rendered in HTML).

```html
<div class="row">
    <template v-for="item in rbl.source('resultTable')">
        <div class="col-6">{{item.key}}</div>
        <div class="col-6">{{item.text}}</div>
    </template>
</div>

<!-- Produces... -->
<div class="row">
    <!-- Repeated content -->
    <div class="col-6">Apple</div>
    <div class="col-6">An apple a day keeps the doctor away.</div>
    <!-- Repeated content -->
    <div class="col-6">Orange</div>
    <div class="col-6">'Orange' you glad you didn't eat an apple.</div>
    <!-- Repeated content -->
    <div class="col-6">Baked Beans</div>
    <div class="col-6">Beans, beans, the magical fruit...</div>
</div>
```

### v-for With v-bind Attributes

When an element has `v-for` directive applied, [v-bind](#v-bind) attributes can also be used and has access to the current item of the iterator/array.

```html
<div v-for="item in rbl.source('resultTable')" :class="item.type">
  {{item.key}}: {{item.text}}
</div>

<!-- Renders... -->
<div class="Fruit">Apple: An apple a day keeps the doctor away.</div>
<div class="Fruit">Orange: 'Orange' you glad you didn't eat an apple.</div>
<div class="Vegetable">Baked Beans: Beans, beans, the magical fruit...</div>
```

## v-on

> [Vue](https://vuejs.org/api/built-in-directives.html#v-on): Attach an event listener to the element.

> [petite-vue](https://github.com/vuejs/petite-vue#not-supported) Not Supported: `v-on="{ mousedown: doThis, mouseup: doThat }"`

The `v-on` directive allows Kaml Views to bind events to elements.  The directive expects a `function` reference or an `inline statement`.

The `v-on` directive *does* have a `@` shorthand syntax that allows for more terse markup.

- [v-on Modifiers](#v-on-modifiers) - Explains the 'modifier' feature that can be used to modify how events are processed (i.e. automatically calling the `preventDefault()` method of the `Event` object).
- [v-on Element Lifecycle Events](#v-on-element-lifecycle-events) - Discusses the Vue specific `mounted` and `unmounted` events that are triggered when HTML elements are added to or removed from the DOM.


```html
<!-- 
The following are equivalent; providing a 'function' to the directive.

When listening to native DOM events, the method receives the native event as the only argument.
-->
<button v-on:click="handlers.doThat"></button>
<button @click="handlers.doThat"></button>

<!-- 
The following are equivalent; using an 'inline statement' with the directive.

When using inline statement, the statement has access to the special $event and $el properties.
-->
<button v-on:click="handlers.doThat($event, 'hello')"></button>
<button @click="handlers.doThat($event, 'hello')"></button>
```

### v-on Modifiers

Vue has the concept of event 'modifiers' (via `.modifier` after event name) that allow for extra functionliaty when hooking up events; controlling when events are triggered, performing boilerplate event handler code automatically (i.e. `event.preventDefault()`).

1. `.stop` - call `event.stopPropagation()`.
1. `.prevent` - call `event.preventDefault()`.
1. `.capture` - add event listener in capture mode.
1. `.self` - only trigger handler if event was dispatched from this element.
1. `.{keyAlias}` - only trigger handler on certain keys.
1. `.once` - trigger handler at most once.
1. `.left` - only trigger handler for left button mouse events.
1. `.right` - only trigger handler for right button mouse events.
1. `.middle` - only trigger handler for middle button mouse events.
1. `.passive` - attaches a DOM event with `{ passive: true }`.

```html
<!-- 
When button is clicked, automatically call 'event.preventDefault()' and
the event should only run one time.
 -->
<button @click.prevent.once="handlers.doThat($event, 'hello')"></button>
```

### v-on Element Lifecycle Events

Vue has a concept for element 'lifecycle events'.  The two events available are `mounted` and `unmounted` than run the specified code every time reactivity causes an element to be rendered or removed.

These events can be used in Kaml Views manually if needed. To use the elements you must add a namespace of `vue:`.  The KatApp Framework leverages these events in several instances internally (i.e. [`v-ka-input`](#v-ka-input) to wire up change events to trigger a calculation, enabling help tips if contained inside a [`v-if`](#v-if--v-else--v-else-if) statement, etc.).

```html
<!-- Use vue:mounted to show appropriate bootstrap tab when shown -->
<script>
    /** @type {IKatApp} */
    var application = KatApp.get('{id}');    
    application.configure( (config, rbl, model, inputs) => {
        config.handlers = {
            paymentOptionsMounted: () => {
                inputs.iHsaOption = application.select('#eHSAContribution button:first').attr("value");
                new bootstrap.Tab(application.select('#eHSAContribution button:first')[0]).show();
            }
        };
    })
</script>

<div v-if="rbl.boolean('showElectionForm')" @vue:mounted="handlers.paymentOptionsMounted">
    <ul class="nav nav-tabs" id="eHSAContribution" role="tablist">
        <li v-if="rbl.boolean('enableHsaPPP')" class="nav-item" role="presentation">
            <button class="nav-link" data-bs-toggle="tab" data-bs-target="#perPayPeriod" 
                type="button" role="tab" aria-controls="perPayPeriod" aria-selected="true" 
                value="perPay">Change per-pay-period contribution</button>
        </li>
        <li v-if="rbl.boolean('enableHsaOneTime')" class="nav-item" role="presentation">
            <button class="nav-link" data-bs-toggle="tab" data-bs-target="#iOneTime" 
                type="button" role="tab" aria-controls="iOneTime" aria-selected="false" value="oneTime"
                @click="handlers.togglePaymentOption">Make a one-time contribution</button>
        </li>
    </ul>

    <!-- Omitting markup for the actual tab content -->
</div>
```

## v-if / v-else / v-else-if

> [Vue](https://vuejs.org/api/built-in-directives.html#v-if) Conditionally render an element or a template fragment based on the truthy-ness of the expression value.

> [petite-vue](https://github.com/vuejs/petite-vue#not-supported) Not Supported: Transitions

`v-if` directives toggle the presence of an element.  Can optionally be chained with `v-else-if` and `v-else` directives as well. When the `v-if`, `v-else-if` and `v-else` directives are chained together, they must be applied on elements that are immediate siblings of one another.

```html
<div v-if="type === 'A'">A</div>
<div v-else-if="type === 'B'">B</div>
<div v-else-if="type === 'C'">C</div>
<div v-else>Not A/B/C</div>
```

When an element is toggled, the element and its contained directives are destroyed and re-constructed. If the initial condition is falsy, then the inner content won't be rendered at all.

`v-if` directives can be used on `<template>` elements to denote a conditional block containing only text or multiple elements.

```html
<template v-if="model.showTextOnly">Only render text with no HTML container element</template>

<template v-if="model.showMultiple">
    <div>Label</div>
    <div>Render multiple elements with one condition and no HMTL container element</div>
</template>
```

## v-show

> [Vue](https://vuejs.org/api/built-in-directives.html#v-show) Toggle the element's visibility based on the truthy-ness of the expression value.

> [petite-vue](https://github.com/vuejs/petite-vue#not-supported) Not Supported: Transitions

`v-show` works by setting the display CSS property via inline styles, and will try to respect the initial display value when the element is visible.

## v-pre

> [Vue](https://vuejs.org/api/built-in-directives.html#v-pre) Skip compilation for this element and all its children.

Use the `v-pre` directive to an element that is used for [IModalOptions.contentSelector](#imodaloptionscontentselector) if the markup within the element should not be processed by the host application, but instead should be processed and become reactive when the modal application is created.

When this directive is applied to an element targeted with `contentSelector`, the resulting modal application's [`state`](#istate) is a clone from the host application, so that all `v-*` and `v-ka-*` directives have all the data they need to correctly process.  The `v-pre` is discarded when the application is created and regular Vue processing/compilation correctly occurs for the modal application.

# Custom KatApp Directives

Similiar to common Vue directives, the KatApp Framework provides custom directives that help rendering markup by leveraging/accessing RBLe Framework calculation results.  The majority of the KatApp Framework directives take a 'model' coming in describing how the directive should function. [`v-ka-template`](#v-ka-template), [`v-ka-input`](#v-ka-input) and [`v-ka-input-group`](#v-ka-input-group) take a model *and* return a 'scope' object that can be used by the markup contained by the template. [`v-ka-needs-calc`](#v-ka-needs-calc) and [`v-ka-inline`](#v-ka-inline) are 'marker' directives and do not take a model or return a scope.

- [v-ka-value](#v-ka-value) - Update element's `innerHTML` from designated RBLe Framework result.
- [v-ka-resource](#v-ka-resource) - When a KatApp needs to support localization (different language translations), the `v-ka-resource` can work in conjunction with the [IKatAppOptions.resourceStrings](#ikatappoptions) to replace the element's `innerHTML` with a translated string.
- [v-ka-input](#v-ka-input) - Render input template or bind existing inputs to RBLe Framework calculations.
- [v-ka-input-group](#v-ka-input-group) - Render template representing multiple inputs of the same type and bind to RBLe Framework calculations.
- [v-ka-navigate](#v-ka-navigate) - Configure navigation within Kaml Views to other Kaml Views in Host Environment.
- [v-ka-template](#v-ka-template) - Render template with or without a data source; the data source can be an array rendering template content multiple times.
- [v-ka-api](#v-ka-api) - Configure a `HTMLElement` to submit to an api endpoint on click event.
- [v-ka-modal](#v-ka-modal) - Configure a `HTMLElement` to open up a modal dialog (containing fixed markup or seperate Kaml View) on click.
- [v-ka-app](#v-ka-app) - Nest an instance of a seperate Kaml View within the current Kaml View (the KatApps will be isolated from each other).
- [v-ka-table](#v-ka-table) - Render HTML tables automatically from the calculation results based on `text*` and `value*` columns.
- [v-ka-highchart](#v-ka-highchart) - Render Highcharts chart automatically from the calculation results.
- [v-ka-attributes](#v-ka-attributes) - Accepts a key/value space delimitted `string` of attributes and applies them to the current `HTMLElement`.
- [v-ka-needs-calc](#v-ka-needs-calc) - Flag UI submission link/button as requiring a RBLe Framework calculation to complete before user can submit the form.
- [v-ka-inline](#v-ka-inline) - Render *raw HTML* without the need for a `HTMLElement` 'container'.
- [v-ka-rbl-no-calc](#v-ka-rbl-no-calc) - Flag an element so that any contained `v-ka-input` elements do not trigger a RBLe calculation upon change.
- [v-ka-rbl-exclude](#v-ka-rbl-exclude) - Flag an element so that any contained `v-ka-input` elements do not trigger a RBLe calculation upon change *and* are never submitted to an RBLe calculation.
- [v-ka-unmount-clears-inputs](#v-ka-unmount-clears-inputs) - Flag an element so that when any contained `v-ka-input` elements are removed from the DOM, the associated [`state.inputs`](#istate-properties) value is also removed.
- [v-ka-nomount](#v-ka-nomount) - Flag an element so that any contained `v-ka-input` elements allow for the KatApp framework to wire up all automatic processing.

## v-ka-value

The `v-ka-value` directive is responsible for assigning element HTML content from the calculation results.  It is simply a shorthand syntax to use in place of [`v-html`](#v-html--v-text) and [`rbl.value()`](#istaterblvalue).

- [v-ka-value Model](#v-ka-value-model) - Discusses the properties that can be passed in to configure the `v-ka-value` directive.
- [v-ka-value Samples](#v-ka-value-samples) - Various use examples of how to use `v-ka-value`.
- [v-ka-value Model Segments With Periods](#v-ka-value-model-segments-with-periods) - Displays how to use `v-ka-value` if the `keyValue` contains one or more periods (which would break the default `.` delimitted segment string usually passed in for configuration).

### v-ka-value Model

The model used to configure how a `v-ka-value` will find the appropriate calculation result value is simply a `.` delimitted `string`.

The selector has the format of `table.keyValue.returnField.keyField.calcEngine.tab`. As you can see, it has the same parameters as the [rbl.value()](#istaterblvalue) method and behaves the same way. Each of the model 'segments' are optional.

The `v-ka-value` directive has the same shorthand capabilities as `rbl.value()` which allows for more terse markup.  If the `rbl-value` is the table being selected from, you can simply provide a single `@id` value to the directive.

`v-ka-value` Caveat: This directive is almost equivalent to `v-html="rbl.value(...)"` with a single caveat.  When the requested value does not exist in the calculation results, `rbl.value()` returns `undefined` and that would be rendered if the `v-html` method was used.  **With `v-ka-value`, when the value does not exist, the element's current HTML is left unmodified.**

### v-ka-value Samples

```html
<!-- The following statements are 'equivalent' (considering the caveat above) -->
<div v-ka-value="nameFirst"></div>
<div v-ka-value="rbl-value.nameFirst"></div>
<div v-html="rbl.value( 'nameFirst' )"></div>
<div v-html="rbl.value( 'rbl-value', 'nameFirst' )"></div>

<!-- Optional Segment examples -->

<!-- Return 'value' column from 'rbl-value' table where '@id' column is "name-first". -->
<div v-ka-value="rbl-value.name-first"></div>
<!-- Shorthand syntax for example above. -->
<div v-ka-value="name-first"></div>
<!-- Return 'value2' column from 'rbl-value' table where '@id' column is "name-first". -->
<div v-ka-value="custom-table.name-first.value2"></div>
<!-- Return 'value2' column from 'rbl-value' table where 'key' column is "name-first". -->
<div v-ka-value="custom-table.name-first.value2.key"></div>
<!-- 
Return 'value' column from 'rbl-value' table where 'key' column is "name-first". 
NOTE: The 'empty' segment where returnValue is omitted 
-->
<div v-ka-value="custom-table.name-first..key"></div>

<!-- 
Return 'value' column from 'rbl-value' table where '@id' column is "name-first" from the BRD CalcEngine. 
NOTE: Empty segments. 
-->
<div v-ka-value="rbl-value.name-first...BRD"></div>
<!-- 
Return 'value' column from 'rbl-value' table where '@id' column is "name-first" from the 
RBLResult2 tab in the default CalcEngine
-->
<div v-ka-value="rbl-value.name-first....RBLResult2"></div>
<!-- 
Return 'value2' column from 'rbl-value' table where 'key' column is "name-first" from the
RBLResult2 tab in the BRD CalcEngine 
-->
<div v-ka-value="custom-table.name-first.value2.key.BRD.RBLResult2"></div>
```

### v-ka-value Model Segments With Periods

Since the model is `.` delimtted `string`, if any of the segments need to have a `.` in the value, a Kaml View can not use the 'simple' segment string syntax.  In this case, there is an alternate model available.  It is simply a javascript object  with the properties displayed below.

```html
table.keyValue.returnField.keyField.calcEngine.tab
<div v-ka-value="{ 
    table: 'table', 
    keyValue: 'key.with.dots', 
    returnField: 'optionalField',
    keyField: 'optionalField',
    ce: 'optionalCalcEngineName',
    tab: 'optionalTabName'
}">Default Text</div>
```

The only required property is `keyValue`, the rest can be `undefined` or excluded.  If `table` is undefined, `rbl-value` will be used. Even though this sytax can be longer than using `v-html="rbl.value()`, it has the benefit of leaving the default element content if the value is not present in the results.

## v-ka-resource

The `v-ka-resource` directive is responsible for assigning element HTML content from localized resource strings based on the current culture.  

- [v-ka-resource Model](#v-ka-resource-model) - Discusses the properties that can be passed in to configure the `v-ka-resource` directive.
- [v-ka-resource Samples](#v-ka-resource-samples) - Various use examples of how to use `v-ka-resource`.

### v-ka-resource Model

The model used to configure how a `v-ka-resource` will find the appropriate translated string has a `key` property and optional properties that can be used via the `String.formatTokens` method.  If the `key` property is not provided, the HTML element's inner HTML is assumed to be the key.

**Note**: If the token format values can changed due to reactivity, a [javascript getter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/get) must be used.

```javascript
// Simple model specifying a key
{ 'key': 'Good.Morning' }

// Simple model specifying a key and name/dob tokens
{ 'key': 'Good.Morning', 'name': 'Fred', 'dob': '5/9/73' }

// Model specifying a key and reactive calculation value
{ 'key': 'Retirement.Summary', 'name': 'Fred', get savings() { return rbl.value('total-savings'); } }
```
See [application.getLocalizedString](#ikatappgetlocalizedstring) for documentation explaining language selection priority.

The `v-ka-resource` directive has a couple shorthand capabilities which allows for more terse markup, see samples below for supported markup.

**Note**: 'key' can also be a complete model (or json string representation of the model) if needed.  When the 'entire model' is passed into the `key` parameter, there **must** be a `key` property on the model.  This is helpful when parameter substitution is needed and it is created from a RBL . A `string` can be generated to represent the entire model and passed in.  See below for examples.

### v-ka-resource Samples

All the markup samples will assume the following [IKatAppOptions.resourceStrings](#ikatappoptions) object is available:

```javascript
{
    "en": {
        "defaultLanguageOnly": "'en' default language.",
        "defaultRegionOverride": "'en', but is overridden.",
        "cultureLanguageOverride": "'en', but is overridden.",
        "cultureRegionOverride": "'es', but is overridden.",
        
        "Good.Morning": "Good morning {{name}}, how are you?",
        "Good.Night": "Good night {{name}}, sleep well.",

        "RBL.Parent": "This is Parent. {{child}}",
        "RBL.Child": "This is Child. Hello {{name}} from CalcEngine."
	},
    "en-us": {
        "defaultRegionOnly": "'en-us' default region.",
        "defaultRegionOverride": "'en-us' default region override.",
        "cultureLanguageOverride": "'en-us', but is overridden.",
        "cultureRegionOverride": "'es', but is overridden."
    },
    "es": {
        "cultureLanguageOnly": "'es' culture language.",
        "cultureLanguageOverride": "'es' culture language override.",
        "cultureRegionOverride": "'es', but is overridden.",

        "Good.Morning": "¿Buenas dias {{name}}, cómo estás?"
    },    
    "es-es": {
        "cultureRegionOnly": "'es-es' culture region.",
        "cultureRegionOverride": "'es-es' culture region override."
    }
}
```

```html
<!-- Assuming CurrentCultureUI is es-es -->

<!-- 
    All three of the following samples return: 'en' default language. 
    The second two are just terse/shorthand ways of providing a localization string when no format tokens are needed via:

    1. v-ka-resource string literal value
    2. The content of the element decorated with the v-ka-resource directive.
-->
<div v-ka-resource="{ key: 'defaultLanguageOnly' }"></div>
<div v-ka-resource="defaultLanguageOnly"></div>
<div v-ka-resource>defaultLanguageOnly</div>

<!-- Returns: 'en-us' default region. -->
<div v-ka-resource="defaultRegionOnly"></div>

<!-- Returns: 'es' culture language. -->
<div v-ka-resource="cultureLanguageOnly"></div>

<!-- Returns: 'es-es' culture region. -->
<div v-ka-resource="cultureRegionOnly"></div>

<!-- 
    Returns: 'en-us' default region override.
    Ignores 'en' language value since 'en-us' is more specific. 
-->
<div v-ka-resource="defaultRegionOverride"></div>

<!-- 
    Returns: 'es' culture language override.
    Ignores 'en' and 'en-us' language values since 'es' is more specific. 
-->
<div v-ka-resource="cultureLanguageOverride"></div>

<!-- 
    Returns: 'es-es' culture region.
    Ignores 'en', 'en-us', and 'es' language values since 'es-es' is more specific. 
-->
<div v-ka-resource="cultureRegionOverride"></div>

<!-- 
    Returns: Missing.Key
    Since no languages provide a translation for this key.
-->
<div v-ka-resource="{ key: 'Missing.Key' }"></div>
<div v-ka-resource="Missing.Key"></div>
<div v-ka-resource>Missing.Key</div>

<!-- 
    Returns: ¿Buenas dias Terry, cómo estás?
    Ignores 'en' language value since 'es' is more specific. 
-->
<div v-ka-resource="{ key: 'Good.Morning', name: 'Terry' }"></div>
<div v-ka-resource="{ name: 'Terry' }">Good.Morning</div>

<!-- 
    Returns: Good night name, sleep well.
    Only 'en' has a localized string, and since 'name' token wasn't provided, it just uses the value of the token.
-->
<div v-ka-resource="Good.Night"></div>


<!--
    String key property: 
    rbl.value("rbl-greeting") returns string value of { key: 'Good.Morning', name: 'Terry' }
	
    Returns: ¿Buenas dias Terry, cómo estás?
    Ignores 'en' language value since 'es' is more specific. 
-->
<div v-ka-resource="{ key: rbl.value('rbl-greeting') }"></div>

<!--
	String key property with nested strings and parameters: 
	rbl.value("rbl-nested") returns string value of

	{ key: 'RBL.Parent', child: application.getLocalizedString( 'RBL.Child', { name: 'RBL User' } ) }

	Formatted for readability:
	{ 
		key: 'RBL.Parent', 
		child: application.getLocalizedString( 'RBL.Child', { name: 'RBL User' } ) 
	}

	Returns: This is Parent. This is Child. Hello RBL User from CalcEngine.
-->
<div v-ka-resource="{ key: rbl.value('rbl-nested') }"></div>

```

## v-ka-input

The `v-ka-input` directive is responsible for initializing HTML inputs to be used in conjunction with the RBLe Framework calculations.  The functionality of the [`v-ka-input` Scope](#v-ka-input-scope) (i.e. labels, help, display, disabled, etc.) is built from specific, known tables in the RBLe Framework calculation.  See the [`rbl-input` Table](#rbl-input-table) documentation to understand how calculation results automatically can initialize the scope object.

The `v-ka-input` directive can be used in three scenarios.

1. Applied to a `div` element and provide a [`template`](#ikainputmodeltemplate) name to indicate which [input template](#input-templates) should be used. 
1. Applied to a `HTMLInputElement` directly without a `template`. Same as inputs rendered with a template, this input will have events and binding set up and access to the scope.
1. Applied to a 'container' `HTMLElement` without a `template`. Similar to when a `template` is provided, the container will be searched for any `HTMLInputElement`s and automatically added events and bindings. The container will be given access to the scope. This can be envisioned as an 'inline template' so to speak where all the markup for an input is manually provided and only available to the current input.

Internally, KatApp Framework leverages the [`v-scope`](https://github.com/vuejs/petite-vue#petite-vue-only) directive to append 'input helper properties and methods' onto the 'global scope' object that can be used by inputs or templates.

- [v-ka-input Model](#v-ka-input-model) - Discusses the properties that can be passed in to configure the `v-ka-input` directive.
- [v-ka-input Scope](#v-ka-input-scope) - Discusses the properties that are exposed on the `v-ka-input` scope and can be used in Kaml View markup.
- [rbl-input Table](#rbl-input-table) - Discusses RBLe Framework `rbl-input` table layout that can be used to automatically control many of the `v-ka-input` model properties.
- [v-ka-input Samples](#v-ka-input-samples) - Examples illustrating uses of the different features of the `v-ka-input` directive.

See [v-ka-nomount](#v-ka-nomount) and `rbl-input Table` to learn more about controlling whether or not the associated HTML input elements allow for the KatApp framework to wire up all automatic processing and information about the RBLe Framework `rbl-input` that can be used to automatically control many of the `v-ka-input` model properties.

### v-ka-input Model

The `IKaInputModel` represents the model type containing the properties that configure the initialization of inputs and the returned [`v-ka-input` scope](#v-ka-input-scope). All properties of the `IKaInputModel` will be present as *read only* properties with appropriate defaults on the scope. See the [v-ka-input Scope documentation](#v-ka-input-scope) for more information about default values provided.

The `v-ka-input` directive *does* have a `string` shorthand syntax that allows for more terse markup.  If the input instructions only needs to provide an input name to the directive, the following can be used.

```html
<!-- The following examples are equivalent -->
<input v-ka-input="iNameFirst" type="text"></input>
<input v-ka-input="{ name: 'iNameFirst' }" type="text"></input>
```

Property | Type | Description
---|---|---
`name` | `string` | **Required;** The name of the input.  In RBLe Framework, input names start with lower case `i` and then the remaing part(s) is/are [Pascal Case](https://www.codingem.com/what-is-pascal-case/) (i.e. `iFirstName`).
`template` | `string` | The template ID if a [template](#html-content-template-elements) will be used to render markup with the scope.
`type`<sup>1</sup> | `string` | Set the [type](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#input_types) of the associated `HTMLInputElement` when the `tagName=INPUT` (vs `SELECT` or `TEXTAREA`).
`value` | `string` | Provide a default value for the input.  The value can also be provided via the `rbl-defaults.value` or the `rbl-input.value` RBLe Framework calculation value.
`label` | `string` | Provide a display label for the input.  The value can also be provided via the `rbl-value[@id=='l' + name].value` or the `rbl-input.label` RBLe Framework calculation value.
`placeHolder` | `string` | Provide a [placeholder](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#placeholder) for the input.  The value can also be provided via the `rbl-input.placeholder` RBLe Framework calculation value.
`hideLabel` | `boolean` | Provide a value determining whether the display label should be hidden. The value can also be provided via a RBLe Framework calculation value. If `rbl-input.label == '-1'`, the label will be hidden.
`iconHtml` | HTML | Provide additional HTML Markup that could be rendered next to other icons that perform actions.  For example, a `range` input may have an additional icon that should open up a 'worksheet' or [v-ka-modal](#v-ka-modal).
`list` | `Array<{ key: string; text: string; }>` | Provide a `list` for the input if it renders a list (i.e. `SELECT`, `type="radio"`, etc.) when building the control.  The value can also be provided via the `rbl-listcontrol.table` or `rbl-input.list` RBLe Framework calculation value which points to a table containing columns of `key` an `text`.
`prefix` | `string` | Provide a `prefix` for the input that could be displayed before the actual input (i.e. with Bootstrap [input-group](https://getbootstrap.com/docs/5.0/forms/input-group/) markup).  The value can also be provided via the `rbl-input.prefix` RBLe Framework calculation value.
`suffix` | `string` | Provide a `suffix` for the input that could be displayed after the actual input (i.e. with Bootstrap [input-group](https://getbootstrap.com/docs/5.0/forms/input-group/) markup). The value can also be provided via the `rbl-input.suffix` RBLe Framework calculation value.
`maxLength` | `number` | Provide a `maxLength` for the input that could be used to limit the length of textual inputs. The value can also be provided via the `rbl-input.max-length` RBLe Framework calculation value.
`displayFormat`<sup>2</sup> | string | Provide a `displayFormat` for the input that could be used to format a value before displaying it. This is currently used when the input type is `range`.
`min` | `number \| string` | Provide a `min` value for the input that could be used to limit the minimum allowed value on `date` or `range` inputs.  The value can also be provided via the `rbl-input.min` RBLe Framework calculation value.
`max` | `number \| string` | Provide a `max` value for the input that could be used to limit the maximum allowed value on `date` or `range` inputs.  The value can also be provided via the `rbl-input.max` RBLe Framework calculation value.
`step` | `number` | Provide a `step` increment value for the input that could be used to control the value increments for `range` inputs.  The value can also be provided via the `rbl-input.step` RBLe Framework calculation value.
`mask` | `string` | Provide an input `mask` to apply during user input for text inputs.  The value can also be provided via the `rbl-input.mask` RBLe Framework calculation value.<br/><br/>The supported masks are:<br/>1. `phone`, `(###) ###-####`<br/>2. `zip+4`, `#####-####`<br/>3. `cc-expire`, `MM/YY`<br/>4. `email` (only permits letters, numbers, period, `@`, `_`, and `-`)<br/>5. A 'money' mask which verifies the input is entered as a currency value taking into consideration the current cultures decimal place separator.  You can control decimal places and whether or not it allows negative values.  The format is `[-]money[N]` where the `-` is optional to indicate negatives are allowed and the `N` is optional to specify the number of decimal places to allow.  By default, specifying only `money` results in positive only values and 2 decimal places.<br/><br/>The property value is determined based on following precedence:<br/><br/>1. `rbl-input.mask` RBLe Framework calculation value<br/>2. `model.mask` property<br/>3. `undefined` if no value provided.
`keyboardRegex` | `string` | Provide an regular expression to evaluate during user input for text inputs.  This is to provide a simple, first line of defense against bad input, you can supply a regular expression to inputs via the keypressRegex(s) property that simply evaluates the keyboard input while the user types.  Full client/server validation should still be performed, this is simply a UI aid to guard 99% of users.  i.e. `\d` would only allow numerical input.<br/><br/>The property value is determined based on following precedence:<br/><br/>1. `rbl-input.keyboard-regex` RBLe Framework calculation value<br/>2. `model.keyboardRegex` property<br/>3. `undefined` if no value provided.
`uploadEndpoint` | `string` | Provide an `uploadEndpoint` value for the input that could be used if `type="file"` or if the template will render a 'file upload' UI component.
`clearOnUnmount` | `boolean` | If `true`, when an input is removed from the DOM, the associated [`state.inputs`](#istate-properties) value is also removed.
`help` | `{ title?: string; content: string; width?: number; }` | Provide the help configuration when the input displays contextual help.<br/><br/>When `help` is provided, `content` is required and both `title` and `content` are HTML strings.<br/><br/>Values can also be provided via the RBLe Framework calculation.<br/>1. `title` via `rbl-value[@id=='h' + name + 'Title'].value` or `rbl-input.help-title`.<br/>2.`content` via `rbl-value[@id=='h' + name].value` or `rbl-input.help`.<br/>3. `width` via `rbl-input.help-width` (`width` is often used when leveraging [Bootstrap popovers](https://getbootstrap.com/docs/5.0/components/popovers/#options) to render the contextual help).
`css` | `{ container?: string; input?: string; }` | Provide css configuration that can be applied to the 'container' element or any 'inputs' within a template markup.
`events` | `IStringIndexer<((e: Event, application: KatApp) => void)>` | Provide a javascript object where each property is an event handler.  These event handlers will automatically be added to `HTMLInputElements` based on the property name.  The property name follows the same patterns as the [`v-on`](#v-on) directive (including [modifiers](#v-on-modifiers)).
`isNoCalc`<sup>3</sup> | `((base: IKaInputScopeBase) => boolean) \| boolean` | Provide a simple boolean value or a delegate for the input that will be called to determine if an input should *not* trigger an RBLe Framework calculation.  The value can also be provided via the `rbl-skip.value` or `rbl-input.skip-calc` RBLe Framework calculation value.<br/><br/>**Note:** Additionally if any input or input ancestor has [`v-ka-rbl-no-calc`](#v-ka-rbl-no-calc) or [`v-ka-rbl-exclude`](#v-ka-rbl-exclude) in the class list, the calculation will not occur.
`isDisabled`<sup>3</sup> | `((base: IKaInputScopeBase) => boolean) \| boolean` | Provide a simple boolean value or a delegate for the input that will be called to determine if an input should be disabled.<br/><br/>The value can also be provided via the `rbl-disabled.value` or `rbl-input.disabled` RBLe Framework calculation value.
`isDisplay`<sup>3</sup> | `((base: IKaInputScopeBase) => boolean) \| boolean` | Provide a simple boolean value or a delegate for the input that will be called to determine if an input should be displayed.<br/><br/>The value can also be provided via the `rbl-display.value` or `rbl-input.display` RBLe Framework calculation value.
`ce` | `string` | Provide the CalcEngine key if all the values that automatically pull from RBLe Framework calculation values should use a CalcEngine *different from the default CalcEngine*.
`tab` | `string` | Provide the CalcEngine result tab name if all the values that automatically pull from RBLe Framework calculation values should use a tab name *different from the default tab specified for the associated CalcEngine*.

<sup>1</sup> In addition to events that trigger RBLe Framework calculations, if the `HTMLInputElement.type` is of type `range`, the KatApp Framework adds a few more events to enable displaying the `range` value for the benefit of the user.  To enable this feature, the Kaml View developers have to take advantage of the [Template Refs](https://vuejs.org/guide/essentials/template-refs.html#template-refs) feature of Vue and provide the following `ref` assignments, all of which are optional if the Kaml View does not desire the functionality.

* `ref="display"` - This is an `HTMLElement` whose `innerHTML` will be set to the value of the `range` every time the value changes.
* `ref="bubble"` - This is an `HTMLElement` that will have a CSS class of `active` toggled on and off.  It will be on while the user is moving the slider or hovering over the slider, and turned off when the user's mouse no longer is over the `range` input.
* `ref="bubbleValue" - This is an `HTMLElement` whose `innerHTML` will be set to the value of the `range` every time the value changes.

<sup>2</sup> The format should be valid a C# format string in the format of `{0:format}` where `format` is a format string described in one of the links below.

* [Standard number format strings](https://learn.microsoft.com/en-us/dotnet/standard/base-types/standard-numeric-format-strings#standard-format-specifiers)
* [Custom number format strings](https://learn.microsoft.com/en-us/dotnet/standard/base-types/custom-numeric-format-strings)
* [Standard date format strings](https://learn.microsoft.com/en-us/dotnet/standard/base-types/standard-date-and-time-format-strings#table-of-format-specifiers)
* [Custom date format strings](https://learn.microsoft.com/en-us/dotnet/standard/base-types/custom-date-and-time-format-strings)

The value can also be provided via the combination of `rbl-sliders.format` and `rbl-sliders.decimals` or the `rbl-input.display-format` RBLe Framework calculation value. When the format comes from `rbl-sliders`, it will be turned into the string of `{0:format + decimals}` (i.e. {0:p2} if `format` was `p` and `decimals` was `2`).

<sup>3</sup> The `base` parameter passed into the delegate gives access to the associated `base.display`, `base.disabled`, and `base.noCalc` properties configured by the default RBLe Framework calculation value processing described above in each property.

### v-ka-input Scope

The `IKaInputScope` represents the type containing the properties and methods available to inputs and templates that use the `v-ka-input` directive. For the most part, it is a 'read only' version of the [`v-ka-input` model](#v-ka-input-model) object, with default functionality provided from RBLe Framework calculation results when needed.  Additionally, there are helper properties and methods available as well.

Property | Type | Description
---|---|---
`id` | `string` | Gets the unique, generated `id` for the current input. This value *should* be used if an `id` attribute needs to be rendered on an `HTMLInputElement`.
`name` | `string` | Gets the `name` to use for the current input.
`type` | `string` | Gets the [`type`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#input_types) to use if the associated `HTMLInputElement` is an `INPUT` (vs `SELECT` or `TEXTAREA`).<br/><br/>Returns value based on following precedence:<br/><br/>1. `rbl-input.type` RBLe Framework calculation value<br/>2. `model.type` property<br/>3. `text` if no value provided.
`value` | `string` | Gets the default value to use for the input.<br/><br/>Returns value based on following precedence:<br/><br/>1. `rbl-input.value` RBLe Framework calculation value<br/>2. `rbl-defaults.value` RBLe Framework calculation value<br/>3. `model.value` property<br/>4. `""` if no value provided.
`disabled` | `boolean` | Gets a value indicating the disabled state of the current input.<br/><br/>Returns value based on following precedence:<br/><br/>1. `model.isDisabled` delegate property<br/>2. `rbl-input.disabled` RBLe Framework calculation value (if value is `1`)<br/>3. `rbl-disabled.value` RBLe Framework calculation value (if value is `1`)<br/>4. `false` if no value provided.
`display` | `boolean` | Gets a value indicating the display state of the current input.<br/><br/>Returns value based on following precedence:<br/><br/>1. `model.isDisplay` delegate property<br/>2. `rbl-input.display` RBLe Framework calculation value (if value is *not* `0`)<br/>3. `rbl-display.value` RBLe Framework calculation value (if value is *not* `0`)<br/>4. `true` if no value provided.
`noCalc` | `boolean` | Get a value indicating whether the current input should trigger a RBLe Framework calculation on 'change'.<br/><br/>Returns value based on following precedence:<br/><br/>1. `model.isNoCalc` delegate property<br/>2. `rbl-input.skip-calc` RBLe Framework calculation value (if value is `1`)<br/>3. `rbl-skip.value` RBLe Framework calculation value (if value is `1`)<br/>4. `false` if no value provided.<br/><br/>**Note:** Additionally if any input or input ancestor has [`v-ka-rbl-no-calc`](#v-ka-rbl-no-calc)` or [`v-ka-rbl-exclude`](#v-ka-rbl-exclude) in the class list, the calculation will not occur.
`label` | `string` | Gets the label to use for the input.<br/><br/>Returns value based on following precedence:<br/><br/>1. `rbl-input.label` RBLe Framework calculation value<br/>2. `rbl-value[@id='l' + name].value` RBLe Framework calculation value<br/>3. `model.label` property<br/>4. `""` if no value provided.
`hideLabel` | `boolean` | Gets a value determining whether the label should be hidden or not.<br/><br/>Returns value based on following precedence:<br/><br/>1. `rbl-input.label` RBLe Framework calculation value (return `true` if `label == "-1"`)<br/>2. `model.hideLabel` property<br/>3. `false` if no value provided.
`placeHolder` | `string \| undefined` | Gets the placeholder to use for the input.<br/><br/>Returns value based on following precedence:<br/><br/>1. `rbl-input.placeholder` RBLe Framework calculation value<br/>2. `model.placeHolder` property<br/>3. `undefined` if no value provided.<br/><br/>The property returns `undefined` if nothing provided vs `""` because some templates might want to know if `""` was assigned.  For example, a Bootstrap Floating `SELECT` might be rendered with a default empty, first element if `placeHolder != ""`.
`help` | `{ title: string; content: string \| undefined; width: string; }` | Gets the contextual help configuration to use for the input.<br/><br/>`title` value is based on following precedence:<br/><br/>1. `rbl-input.help-title` RBLe Framework calculation value<br/>2. `rbl-value[@id='h' + name + 'Title'].value` RBLe Framework calculation value<br/>3. `model.help.title` property<br/>4. `""` if no value provided.<br/><br/>`content` value is based on following precedence:<br/><br/>1. `rbl-input.help` RBLe Framework calculation value<br/>2. `rbl-value[@id='h' + name].value` RBLe Framework calculation value<br/>3. `model.help.content` property<br/>3. `undefined` if no value provided.<br/><br/>The property returns `undefined` if nothing provided vs `""` because some templates might want show a contextual help icon or button based on presence of 'help' or not and it was easier to allow this property to be undefined to allow for `v-if="help.content"` type syntax to be used.<br/><br/>`width` value is based on following precedence:<br/><br/>1. `rbl-input.help-width` RBLe Framework calculation value<br/>2. `model.help.width` property<br/>3. `''` if no value provided. (`width` is often used when leveraging [Bootstrap popovers](https://getbootstrap.com/docs/5.0/components/popovers/#options) to render the contextual help).
`css` | `{ container: string; input: string; }` | Gets the CSS configuration to apply to the rendered `HTMLElement` considered the 'container' or 'input' within a template rendered input.<br/><br/><br/><br/>`container` value is based on following precedence:<br/><br/>1. `model.css.container` property<br/>2. `""` if no value provided.<br/><br/>`input` value is based on following precedence:<br/><br/>1. `model.css.input` property<br/>2. `""` if no value provided.
`list` | `Array<{ key: string; text: string; }>` | Gets the array of items to use when the rendered input is built from a list.<br/><br/>Returns value based on following precedence:<br/><br/>1. Get the RBLe Framework calculation table where the name is provided in `rbl-input.list`<br/>2. Get the RBLe Framework calculation table where the name is provided in `rbl-listcontrol.value`<br/>3. `model.list` property<br/>4. `[]` if no list is provided.
`prefix` | `string \| undefined` | Gets the prefix to display *before* the rendered input.<br/><br/>Returns value based on following precedence:<br/><br/>1. `rbl-input.prefix` RBLe Framework calculation value<br/>2. `model.prefix` property<br/>3. `undefined` if no value provided.<br/><br/>The property returns `undefined` if nothing provided vs `""` because some templates can more easily check for the presense of a prefix. This property is most often used with [Bootstrap input-group](https://getbootstrap.com/docs/5.0/forms/input-group/) elements.
`suffix` | `string \| undefined` | Gets the suffix to display *after* the rendered input.<br/><br/>Returns value based on following precedence:<br/><br/>1. `rbl-input.suffix` RBLe Framework calculation value<br/>2. `model.suffix` property<br/>3. `undefined` if no value provided.<br/><br/>The property returns `undefined` if nothing provided vs `""` because some templates can more easily check for the presense of a suffix. This property is most often used with [Bootstrap input-group](https://getbootstrap.com/docs/5.0/forms/input-group/) elements.
`maxLength` | `number` | Gets the max length a textual input value can be; often used with `TEXTAREA` inputs.<br/><br/>Returns value based on following precedence:<br/><br/>1. `rbl-input.max-length` RBLe Framework calculation value<br/>2. `model.maxLength` property<br/>3. `250` if no value provided.
`min` | `string` | Gets the min value allowed if the rendered input supports the concept of minimum value (i.e. `range` or `date` types).<br/><br/>Returns value based on following precedence:<br/><br/>1. `rbl-input.min` RBLe Framework calculation value<br/>2. `model.min` property<br/>3. `""` if no value provided.
`max` | `string` | Gets the max value allowed if the rendered input supports the concept of maximum value (i.e. `range` or `date` types).<br/><br/>Returns value based on following precedence:<br/><br/>1. `rbl-input.max` RBLe Framework calculation value<br/>2. `model.max` property<br/>3. `""` if no value provided.
`step` | `number` | Gets the step increment value to use if the rendered input supports the concept of incremental steps (i.e. `range` types).<br/><br/>Returns value based on following precedence:<br/><br/>1. `rbl-input.step` RBLe Framework calculation value<br/>2. `model.step` property<br/>3. `1` if no value provided.
`error` | `string \| undefined` | Gets the error message associated with the current input from the [state.errors property](#istateerrors). A value of `undefined` indicates no error.  The value can only by provided the [state.errors property](#istateerrors).
`warning` | `string \| undefined` | Gets the warning message associated with the current input from the [`state.warnings` property](#istatewarnings). A value of `undefined` indicates no warning.  The value can only by provided the `state.warnings` property.
`uploadAsync` | `() => void \| undefined` | If an [uploadEndpoint](#ikainputmodeluploadendpoint) was provided, the KatApp Framework provides a help function that can be called to automatically submit the rendered [input.files](https://developer.mozilla.org/en-US/docs/Web/API/File_API/Using_files_from_web_applications#getting_information_about_selected_files) list to the uploadEndpoint for processing.  Error handling is built in and 'success' is implied if no error occurs.

### rbl-input Table

The `rbl-input` table is the preferred RBLe Calculation table to use to manage `v-ka-input` and `v-ka-input-group` scopes.  This table supercedes the functionality of the legacy tables of `rbl-display`, `rbl-disabled`, `rbl-skip`, `rbl-value`, `rbl-listcontrol`, `rbl-defaults` and `rbl-sliders`. The KatApp framework still supports the legacy tables if `rbl-input` isn't present (see [KatApp Provider: Push Table Processing](https://github.com/terryaney/nexgen-documentation/blob/main/KatApps.md#push-table-processing) for more information.).

Column | Description
---|---
id | The id/name of the input (matches [`model.name`](#ikainputmodelname)).
type | For textual inputs, a [HTML5 input type](https://developer.mozilla.org/en-US/docs/Learn/Forms/HTML5_input_types) can be specified.  The default value is `text`.
label | Provide the associated label for the current input.
placeholder | For textual inputs, provided the associated placeholder to display when the input is empty.  
help | Provide help content (can be HTML). Default is blank.
help&#x2011;title | If the help popup should have a 'title', can return it here. Default is blank.
help&#x2011;width | By default, when help popup is displayed, the width is 250px, provide a width (without the `px`) if you need it larger.
value | A input value can be set from the CalcEngine whenever a calculation occurs.  Normally, this column is only returned during `iConfigureUI` calculations to return the 'default' value, but if it is non-blank, the value will be assigned during any calculation.
display | Whether or not the input should be displayed.  Returning `0` will hide the input, anything else will display the input.
disabled | Whether or not the input should be disabled.  Returning `1` will disable the input, anything else will enable the input.
skip&#x2011;calc | Whether or not this input should trigger a calculation when it is changed by the user.  Returning `1` will prevent the input from triggering a calculation, anything else will allow a calculation to occur.
list | If the input is a 'list' control (dropdown, option list, checkbox list, etc.), return the name of the table that provides the list of items used to populate the control.
prefix | If the input should have a prefix (usually a [Bootstrap `input-group`](https://getbootstrap.com/docs/5.0/forms/input-group/)) prepended to the front, provide a value here (i.e. `$`).
suffix | If the input should have a prefix (usually a Bootstrap `input-group`) appended to the end, provide a value here (i.e. `%`).
max&#x2011;length | For textual inputs (i.e. TEXTAREA inputs), a maximum allowed input length can be provided.  Default is `250`.
min | For inputs with the concept of minimum values (sliders, dates), a minimum value can be provided.
max | For inputs with the concept of maximum values (sliders, dates), a minimum value can be provided.
step | For range/slider inputs, a `step` increment can be provided. Default is `1`.
mask | For textual inputs, if an input mask should be applied while the user is typing information, a mask pattern can be provided (i.e. `phone`, `zip+4`, `cc-expire`, `email`, 'money mask' - see Input and Input Group models for more information).
keyboard&#x2011;regex | For textual inputs, a regular expression to test each character typed by a user to determine if valid or not (i.e. `\d` for numeric values).
display&#x2011;format | For range/slider inputs, a display format can be provided. See [`model.displayFormat`](#ikainputmodeldisplayformat) for more details.
error | During validation calculations (usually `iValidate=1`), if an input is invalid, an error message can be provided here.  Additionally, the `errors` table can be used as well.
warning | During validation calculations (usually `iValidate=1`), if an input triggers a warning, an warning message can be provided here.  Additionally, the `warnings` table can be used as well.

### v-ka-input Samples

#### v-ka-input Model Samples

```html
<!-- Range input rendered via an 'input-slider-nexgen' template -->
<div v-ka-input="{ 
    name: 'iSlider', 
    template: 'input-slider-nexgen', 
    css: { input: 'input-slider' },
    help: { content: 'Pick the age to stop working, the younger the better!' }, 
    label: 'What age do you want to stop working?', 
    min: '20', max: '80', value: '65' }"></div>

<!-- 
Date input rendered via an `input-textbox-nexgen` template; 
1. Providing help markup - markup can contain other directives (help popovers are rendered as their own KatApps)
2. Providing a isDisplay delegate that looks at another input value and falls back to using base.display functionality
3. Providing events object hooking up two events to inputs (and using modifiers)
-->
<div class="col-4" v-ka-input="{ 
    name: 'iDateBirth', 
    template: 'input-textbox-nexgen', 
    label: 'Date of Birth', 
    type: 'date',
    help: { 
        content: 
            '1 + 2 = {{1+2}}.<br/><b>I\'m bold</b><br/>' + 
            '<a v-ka-navigate=&quot;{ view: \'Channel.Home\', inputs: { iFromTooltip: 1 } }&quot;>Go home</a>' 
    }, 
    isDisplay: base => inputs.iHideDateBirth != '1' && base.display,
    events: { 
        'keypress.enter.once': () => console.log('Hooray, enter pressed!'), 
        'input.prevent': e => console.log($(e.currentTarget).attr('name')) 
    }
}"></div>

<!--
Render an upload control and corresponding comment control.

1. iComment and iUpload are rendered with templates
2. iComment has max length of 250 and keyup handler to display remaining characters
3. iUpload is provided uploadEndpoint and template renders a button called iUploadUpload 
    that leverages IKaInputScope.uploadAsync
-->
<script>
    application.update({
        handlers: {
            processUpload: () => application.select('.iUploadUpload').trigger('click'),
            textAreaCharCount: e => application.select("#{id}_count").text(Math.max(0, 250 - $(e.currentTarget).val().length))
        }
    });
</script>
<div class="col-md-12">
    <div v-ka-input="{ 
        name: 'iComment', 
        template: 'input-textarea-nexgen', 
        label: 'Notes (250 character maximum) – you have <span id=\'{id}_count\'>250</span> characters remaining', 
        maxLength: 250, 
        events: { keyup: handlers.textAreaCharCount } 
    }"></div>
    <div v-ka-input="{ 
        name: 'iUpload', 
        template: 'input-fileupload-nexgen', 
        label: 'File Name', 
        uploadEndpoint: 'document-center/upload' 
    }"></div>
    <div class="mt-2">
        <a href="#" @click.prevent="handlers.processUpload" class='btn btn-primary'>
            <i class="fa-solid fa-upload"></i> Upload
        </a>
    </div>
</div>
```

#### v-ka-input Scope Samples

```html
<!--
The following uses all the scope properties except for list, maxLength, min, max, step, iconHtml and uploadAsync
-->
<template id="input-textbox-nexgen" input>
    <div v-if="display && !prefix && !suffix" 
        :class="['mb-3', css.container, { 'form-floating': !hideLabel, 'has-help': help.content }]">

        <input :value="value" :name="name" :id="id" :type="type" 
            :class="['form-control', name, css.input, { 'is-invalid': error, 'is-warning': warning }]" 
            :disabled="disabled" :placeholder="hideLabel ? '' : 'Fill'">

        <span 
            :class="['error-icon-hover-area', { 'd-none': !error && !warning, 'error': error, 'warning': warning }]" 
            :data-bs-content="error || warning || 'Error content'" 
            data-bs-toggle="tooltip" data-bs-placement="top"></span>
        <span 
            :class="['help-icon-hover-area', { 'd-none': !help.content }]" 
            :data-bs-width="help.width" :data-bs-content-selector="'#' + id + 'Help'" 
            data-bs-toggle="popover" data-bs-trigger="click" data-bs-placement="top"></span>

        <label v-if="!hideLabel" :for="id" v-html="label"></label>

        <div class="d-none" v-if="help.content">
            <div :id="id + 'HelpTitle'" v-html="help.title"></div>
            <div :id="id + 'Help'" v-html="help.content"></div>
        </div>
    </div>

    <div v-if="display && (prefix || suffix)" class="mb-3" :class="{ 'has-help': help.content }">

        <div :class="`input-group tip-icon-wrapper ${css.container ?? ''}`">
            <span v-if="prefix" class="input-group-text">{{prefix}}</span>

            <div :class="hideLabel ? 'no-label' : 'form-floating'">
                <input :value="value" :name="name" :id="id" :type="type" 
                    :class="['form-control', name, css.input, { 'is-invalid': error, 'is-warning': warning }]" 
                    :disabled="disabled" :placeholder="!hideLabel ? 'Fill' : ''">
                <span 
                    :class="['error-icon-hover-area', { 'd-none': !error && !warning, 'error': error, 'warning': warning }]" 
                    :data-bs-content="error || warning || 'Error content'" data-bs-toggle="tooltip" data-bs-placement="top"></span>
                <span 
                    :class="['help-icon-hover-area', { 'd-none': !help.content }]" 
                    :data-bs-width="help.width" :data-bs-content-selector="'#' + id + 'Help'" 
                    data-bs-toggle="popover" data-bs-trigger="click" data-bs-placement="top"></span>
                <label v-if="!hideLabel" :for="id" v-html="label"></label>
            </div>

            <span v-if="suffix" class="input-group-text">{{suffix}}</span>
        </div>

        <div class="d-none" v-if="help.content">
            <div :id="id + 'HelpTitle'" v-html="help.title"></div>
            <div :id="id + 'Help'" v-html="help.content"></div>
        </div>
    </div>
</template>

<!--
The following template uses same properties as above, but additionally uses the list property.
-->
<template id="input-dropdown-nexgen" input>
    <div 
        :class="['tip-icon-wrapper', css.container ?? 'mb-3', { 'form-floating': !hideLabel, 'has-help': help.content }]" 
        v-if="display">
        <select :name="name" :id="id" :disabled="disabled" :aria-label="label"
            :class="['form-select', name, css.input, { 'is-invalid': error, 'is-warning': warning }]">
            <option v-if="placeHolder != ''" value="">{{placeHolder || 'Select a value'}}</option>
            <option v-for="item in list" :key="item.key" :value="item.key" :selected="value == item.key">{{item.text}}</option>
        </select>
        <span 
            :class="['error-icon-hover-area', { 'd-none': !error && !warning, 'error': error, 'warning': warning }]" 
            :data-bs-content="error || warning || 'Error content'" 
            data-bs-toggle="tooltip" data-bs-placement="top"></span>
        <span 
            :class="['help-icon-hover-area', { 'd-none': !help.content }]" 
            :data-bs-content-selector="'#' + id + 'Help'" 
            data-bs-toggle="popover" data-bs-trigger="click" data-bs-placement="top"></span>
        <label v-if="!hideLabel" :for="id" v-html="label"></label>
        <div class="d-none" v-if="help.content">
            <div :id="id + 'HelpTitle'" v-html="help.title"></div>
            <div :id="id + 'Help'" v-html="help.content"></div>
        </div>
    </div>
</template>

<!--
The following template uses most of the previous properties and additionally uses the min, max, and step properties
-->
<template id="input-slider-nexgen" input>
    <div :class="`mb-3 ${css.container}`" v-if="display">
        <div class="row">
            <div class="col fs-sm fw-bolder">
                <span v-html="label"></span>
                <span style="color: blue;" 
                    :class="['fa fa-regular fa-circle-question', { 'd-none': !help.content }]" 
                    :data-bs-width="help.width" :data-bs-content-selector="'#' + id + 'Help'" 
                    data-bs-toggle="popover" data-bs-trigger="click" data-bs-placement="top"></span>
                <template v-html="iconHtml" v-ka-inline></template>
                <span 
                    :class="['fa fa-regular', { 
                        'd-none': !error && !warning, 
                        'error text-danger fa-circle-exclamation': error, 
                        'warning text-warning fa-triangle-exclamation': warning 
                    }]" 
                    :data-bs-content="error || warning || 'Error content'" 
                    data-bs-toggle="tooltip" data-bs-placement="top"></span>
            </div>
            <div ref="display" class="col-auto fs-sm fw-bolder text-end"></div>
        </div>
        <div class="pt-7 range-slider-wrap">
            <div ref="bubble" class="range-slider-bubble"><span ref="bubbleValue"></span></div>
            <input type="range" :class="['col range-slider', name, { 'is-invalid': error, 'is-warning': warning }]" 
                :name="name" :id="id" :min="min" :max="max" :step="step" :value="value">
        </div>
        <div class="d-none" v-if="help.content">
            <div :id="id + 'HelpTitle'" v-html="help.title"></div>
            <div :id="id + 'Help'" v-html="help.content"></div>
        </div>
    </div>
</template>
```

## v-ka-input-group

The `v-ka-input-group` directive is responsible for initializing groups of HTML inputs to be used in conjunction with the RBLe Framework calculations via synchronizing [`state.inputs`](#istate-properties) and HTML inputs. It behaves the same as a [v-ka-input directive](#v-ka-input) except that all the properties on the model and scope are essentially array based to support whatever number of inputs the specified template supports.

**The `v-ka-input-group` directive can only be used when a `template` is assigned.**

Internally, KatApp Framework leverages the [`v-scope`](https://github.com/vuejs/petite-vue#petite-vue-only) directive to append 'input helper properties and methods' onto the 'global scope' object that can be used by the template.

- [v-ka-input-group Model](#v-ka-input-group-model) - Discusses the properties that can be passed in to configure the `v-ka-input` directive.
- [v-ka-input-group Scope](#v-ka-input-group-scope) - Discusses the properties that are exposed on the `v-ka-input-group` scope and can be used in Kaml View markup.
- [v-ka-input-group Samples](#v-ka-input-group-samples) - Examples illustrating the different properties that can be assigned on the `v-ka-input-group` model object.

See [v-ka-nomount](#v-ka-nomount) and [rbl-input Table](#rbl-input-table) to learn more about controlling whether or not the associated HTML input elements allow for the KatApp framework to wire up all automatic processing and information about the RBLe Framework `rbl-input` that can be used to automatically control many of the `v-ka-input` model properties.

### v-ka-input-group Model

The `IKaInputGroupModel` represents the model type containing the properties that configure the initialization of inputs and the returned [`v-ka-input-group` scope](#v-ka-input-group-scope). All properties of the `IKaInputGroupModel` will be present as *read only* properties with appropriate defaults on the scope. See the [v-ka-input-group Scope documentation](#v-ka-input-group-scope) for more information about default values provided.

Property | Type | Description
---|---|---
`names` | `Array<string>` | The array of `string` names representing each input in the gruop.  In RBLe Framework, input names start with lower case `i` and then the remaing part(s) is/are [Pascal Case](https://www.codingem.com/what-is-pascal-case/) (i.e. [`"iFirstName"`, `"iFirstName2"`]).
`template` | `string` | Return the [template](#html-content-template-elements) ID to be used to render group markup with the scope.  Unlike the `v-ka-input` model, here, `template` is required.
`type` | `string` | When the associated group of `HTMLInputElement`s `tageName=INPUT` (vs `SELECT` or `TEXTAREA`), you can provide a [type](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#input_types).
`values` | `Array<string>` | The default values for the input group scope can be provided.  The values can also be provided via the `rbl-defaults.value` or the `rbl-input.value` RBLe Framework calculation value where the `@id` is one of the values provided by `names`.
`labels` | `Array<string> \| string` | The labels to use for the input group scope can be provided.  The values can also be provided via the `rbl-value[@id=='l' + name].value` or the `rbl-input.label` RBLe Framework calculation value where the `@id/name` is one of the values provided by `names`.
`placeHolders` | `Array<string> \| string` | The [placeholders](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#placeholder) for the input group scope can be provided.  The values can also be provided via the `rbl-input.placeholder` RBLe Framework calculation value where the `@id/name` is one of the values provided by `names`.
`hideLabels` | `Array<boolean> \| boolean` | An array of values for the input group scope determining whether the labels should be hidden can be provided. The values can also be provided via a RBLe Framework calculation value where the `@id` is one of the values provided by `names`. If `rbl-input.label == '-1'`, the label will be hidden.
`helps` | `Array<{ title?: string; content: string; width?: number; }> \| { title?: string; content: string; width?: number; }` | Provide array of help configuration objects for contextual help.<br/><br/>For each 'help configuration' is provided, `content` is required and both `title` and `content` are HTML strings.<br/><br/>Values can also be provided via the RBLe Framework calculation.<br/>1. `title` via `rbl-value[@id=='h' + name + 'Title'].value` or `rbl-input.help-title`.<br/>2.`content` via `rbl-value[@id=='h' + name].value` or `rbl-input.help`.<br/>3. `width` via `rbl-input.help-width` (`width` is often used when leveraging [Bootstrap popovers](https://getbootstrap.com/docs/5.0/components/popovers/#options) to render the contextual help).
`css` | `Array<{ container?: string; input?: string; }> \| { container?: string; input?: string; }` | Provide array of css configuration objects that can be applied to the 'container' element or any 'inputs' for each input group item within a template markup.
`prefixes` |  `Array<string> \| string` | Provide an array of `prefixes` to the input group scope that could be displayed before the actual inputs (i.e. with Bootstrap [input-group](https://getbootstrap.com/docs/5.0/forms/input-group/) markup).  The value can also be provided via the `rbl-input.prefix` RBLe Framework calculation value where the `@id` is one of the values provided by `names`.
`suffixes` | `Array<string> \| string` | Provide an array of `suffixes` to the input group scope that could be displayed after the actual inputs (i.e. with Bootstrap [input-group](https://getbootstrap.com/docs/5.0/forms/input-group/) markup).  The value can also be provided via the `rbl-input.suffix` RBLe Framework calculation value where the `@id` is one of the values provided by `names`.
`maxLengths` | `Array<number> \| number` | Provide an array of `maxLengths` to the input group scope that could be used to limit the length of textual inputs.  The value can also be provided via the `rbl-input.max-length` RBLe Framework calculation value where the `@id` is one of the values provided by `names`.
`displayFormats`<sup>1</sup> | `Array<string> \| string` | Provide an array of `displayFormats` to the input group scope that could be used to format a value before displaying it. This is currently used when the input types are `range`.
`mins` | `Array<number \| string> \| number \| string` | Provide an array of `mins` values to the input group scope that could be used to limit the minimum allowed value on `date` or `range` inputs.  The value can also be provided via the `rbl-input.min` RBLe Framework calculation value where the `@id` is one of the values provided by `names`.
`maxes` | `Array<number \| string> \| number \| string` | Provide an array of `maxes` values to the input group scope that could be used to limit the maximum allowed value on `date` or `range` inputs.  The value can also be provided via the `rbl-input.max` RBLe Framework calculation value where the `@id` is one of the values provided by `names`.
`steps` | `Array<number> \| number` | Provide an array of `steps` increment values to the input group scope that could be used to control the value increments for `range` inputs.  The value can also be provided via the `rbl-input.step` RBLe Framework calculation value where the `@id` is one of the values provided by `names`.
`masks` | `Array<string> \| string` | Provide an array of input `mask` to apply during user input for text inputs.  The value can also be provided via the `rbl-input.mask` RBLe Framework calculation value where the `@id` is one of the values provided by `names`.<br/><br/>The supported masks are:<br/>1. `phone`, `(###) ###-####`<br/>2. `zip+4`, `#####-####`<br/>3. `cc-expire`, `MM/YY`<br/>4. `email` (only permits letters, numbers, period, `@`, `_`, and `-`)<br/>5. A 'money' mask which verifies the input is entered as a currency value taking into consideration the current cultures decimal place separator.  You can control decimal places and whether or not it allows negative values.  The format is `[-]money[N]` where the `-` is optional to indicate negatives are allowed and the `N` is optional to specify the number of decimal places to allow.  By default, specifying only `money` results in positive only values and 2 decimal places.
`keyboardRegexs` | `Array<string> \| string` | Provide an array of regular expressions to evaluate during user input for text inputs.  This is to provide a simple, first line of defense against bad input, you can supply a regular expression to inputs via the keypressRegex(s) property that simply evaluates the keyboard input while the user types.  Full client/server validation should still be performed, this is simply a UI aid to guard 99% of users.  i.e. `\d` would only allow numerical input.<br/><br/>The property value is determined based on following precedence:<br/><br/>1. `rbl-input.keyboard-regex` RBLe Framework calculation value<br/>2. `model.keyboardRegex` property<br/>3. `undefined` if no value provided.
`ce` | `string` | Provide the CalcEngine key if all the values that automatically pull from RBLe Framework calculation values should use a CalcEngine *different from the default CalcEngine*.
`tab` | `string` | Provide the CalcEngine result tab name if all the values that automatically pull from RBLe Framework calculation values should use a tab name *different from the default tab specified for the associated CalcEngine*.
`isNoCalc`<sup>2</sup> | `((index: number, base: IKaInputGroupScopeBase) => boolean) \| boolean` | Provide a simple boolean value or a delegate to the input group scope that can be called to determine if an input should *not* trigger an RBLe Framework calculation.  The value can also be provided via the `rbl-skip.value` or `rbl-input.skip-calc` RBLe Framework calculation value where the `@id` is one of the values provided by `names`.<br/><br/>**Note:** Additionally if any input or input ancestor has [`v-ka-rbl-no-calc`](#v-ka-rbl-no-calc) or [`v-ka-rbl-exclude`](#v-ka-rbl-exclude) in the class list, the calculation will not occur.
`isDisabled`<sup>2</sup> | `((index: number, base: IKaInputGroupScopeBase) => boolean) \| boolean` | Provide a simple boolean value or a delegate to the input group scope that can be called to determine if an input should be disabled.  The value can also be provided via the `rbl-disabled.value` or `rbl-input.disabled` RBLe Framework calculation value where the `@id` is one of the values provided by `names`.
`isDisplay`<sup>2</sup> | `((index: number, base: IKaInputGroupScopeBase) => boolean) \| boolean` | Provide a simple boolean value or a delegate to the input group scope that can be called to determine if an input should be displayed.  The value can also be provided via the `rbl-display.value` or `rbl-input.display` RBLe Framework calculation value where the `@id` is one of the values provided by `names`.
`events` | `IStringIndexer<((e: Event, application: KatApp) => void)>` | Provide a javascript object where each property is an event handler.  These event handlers will automatically be added to all the group `HTMLInputElement`s based on the property name.  The property name follows the same patterns as the [`v-on`](#v-on) directive (including [modifiers](#v-on-modifiers)).
`clearOnUnmount` | `boolean` | If `true`, when the inputs of an input group are removed from the DOM, the associated [`state.inputs`](#istate-properties) values are also removed.

<sup>1</sup> The format should be valid a C# format string in the format of `{0:format}` where `format` is a format string described in one of the links below.

1. [Standard number format strings](https://learn.microsoft.com/en-us/dotnet/standard/base-types/standard-numeric-format-strings)
1. [Custom number format strings](https://learn.microsoft.com/en-us/dotnet/standard/base-types/custom-numeric-format-strings)
1. [Standard date format strings](https://learn.microsoft.com/en-us/dotnet/standard/base-types/standard-date-and-time-format-strings)
1. [Custom date format strings](https://learn.microsoft.com/en-us/dotnet/standard/base-types/custom-date-and-time-format-strings)

The value can also be provided via the combination of `rbl-sliders.format` and `rbl-sliders.decimals` or the `rbl-input.display-format` RBLe Framework calculation value where the `@id` is one of the values provided by `names`. When the format comes from `rbl-sliders`, it will be turned into the string of `{0:format + decimals}` (i.e. {0:p2} if `format` was `p` and `decimals` was `2`).

<sup>2</sup> The `index` and `base` parameters passed into the delegate gives access to the associated `base.display(index)`, `base.disabled(index)`, and `base.noCalc(index)` properties configured by the default RBLe Framework calculation value processing described above in each property.  The `index` parameter can be used to know which 'item' of the group is being queried.

### v-ka-input-group Scope

The `IKaInputGroupScope` represents the type containing the properties and methods available to templates that use the `v-ka-input-group` directive. For the most part, it is a 'read only' version of the [`v-ka-input-group` model](#v-ka-input-group-model) object, with default functionality provided from RBLe Framework calculation results when needed.  Additionally, there are helper properties and methods available as well.  

**Since the input group is a 'group of items', almost all scope properties are functions that take a numerical `index` parameter and return the desired property.**

Property | Type | Description
---|---|---
`id` | `(index: number) => string` | Given an input index, gets the unique, generated `id` for the current input. This value *should* be used if an `id` attribute needs to be rendered on an `HTMLInputElement`.
`name` | `(index: number) => string` | Given an input index, gets the `name` (from the model `names[index]` array) to use for the current input.
`type` | `string` | Gets the [`type`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#input_types) to use if the associated `HTMLInputElement`s ar an `INPUT` (vs `SELECT` or `TEXTAREA`).<br/><br/>Returns value based on following precedence:<br/>1. `model.type` property<br/>2. `text` if no value provided.
`value` | `(index: number) => string` | Given an input index, gets the default value to use for the input.<br/><br/>Returns value based on following precedence:<br/>1. `rbl-input.value` RBLe Framework calculation value<br/>2. `rbl-defaults.value` RBLe Framework calculation value<br/>3. `model.values[index]` property<br/>4. `""` if no value provided.
`disabled` | `(index: number) => boolean` | Given an input index, gets a value indicating the disabled state of the current input.<br/><br/>Returns value based on following precedence:<br/>1. `model.isDisabled` delegate property<br/>2. `rbl-input.disabled` RBLe Framework calculation value (if value is `1`)<br/>3. `rbl-disabled.value` RBLe Framework calculation value (if value is `1`)<br/>4. `false` if no value provided.
`display` | `(index: number) => boolean` | Given an input index, gets a value indicating the display state of the current input.<br/><br/>Returns value based on following precedence:<br/>1. `model.isDisplay` delegate property<br/>2. `rbl-input.display` RBLe Framework calculation value (if value is *not* `0`)<br/>3. `rbl-display.value` RBLe Framework calculation value (if value is *not* `0`)<br/>4. `true` if no value provided.
`noCalc` | `(index: number) => boolean` | Given an input index, gets a value indicating whether the current input should trigger a RBLe Framework calculation on 'change'.<br/><br/>Returns value based on following precedence:<br/>1. `model.isNoCalc` delegate property<br/>2. `rbl-input.skip-calc` RBLe Framework calculation value (if value is `1`)<br/>3. `rbl-skip.value` RBLe Framework calculation value (if value is `1`)<br/>4. `false` if no value provided.<br/><br/>**Note:** Additionally if any input or input ancestor has [`v-ka-rbl-no-calc`](#v-ka-rbl-no-calc) or [`v-ka-rbl-no-calc`](#v-ka-rbl-exclude) in the class list, the calculation will not occur.
`label` | `(index: number) => string` | Given an input index, gets the label to use for the input.<br/><br/>Returns value based on following precedence:<br/>1. `rbl-input.label` RBLe Framework calculation value<br/>2. `rbl-value[@id='l' + name].value` RBLe Framework calculation value<br/>3. `model.labels[index]` property<br/>4. `""` if no value provided.
`hideLabel` | `(index: number) => boolean` | Given an input index, gets a value determining whether the label should be hidden or not.<br/><br/>Returns value based on following precedence:<br/>1. `rbl-input.label` RBLe Framework calculation value (return `true` if `label == "-1"`)<br/>2. `model.hideLabels[index]` property<br/>3. `false` if no value provided.
`placeHolder` | `(index: number) => string \| undefined` | Given an input index, gets the placeholder to use for the input.<br/><br/>Returns value based on following precedence:<br/>1. `rbl-input.placeholder` RBLe Framework calculation value<br/>2. `model.placeHolders[index]` property<br/>3. `undefined` if no value provided.<br/><br/>The property returns `undefined` if nothing provided vs `""` because some templates might want to know if `""` was assigned.  For example, a Bootstrap Floating `SELECT` might be rendered with a default empty, first element if `placeHolder != ""`.
`help` | `(index: number) => { title: string, content?: string; width: string; }` | Given an input index, gets the contextual help configuration to use for the input.<br/><br/>`title` value is based on following precedence:<br/><br/>1. `rbl-input.help-title` RBLe Framework calculation value<br/>2. `rbl-value[@id='h' + name + 'Title'].value` RBLe Framework calculation value<br/>3. `model.help.title` property<br/>4. `""` if no value provided.<br/><br/>`content` value is based on following precedence:<br/><br/>1. `rbl-input.help` RBLe Framework calculation value<br/>2. `rbl-value[@id='h' + name].value` RBLe Framework calculation value<br/>3. `model.help.content` property<br/>3. `undefined` if no value provided.<br/><br/>The property returns `undefined` if nothing provided vs `""` because some templates might want show a contextual help icon or button based on presence of 'help' or not and it was easier to allow this property to be undefined to allow for `v-if="help.content"` type syntax to be used.<br/><br/>`width` value is based on following precedence:<br/><br/>1. `rbl-input.help-width` RBLe Framework calculation value<br/>2. `model.help.width` property<br/>3. `''` if no value provided. (`width` is often used when leveraging [Bootstrap popovers](https://getbootstrap.com/docs/5.0/components/popovers/#options) to render the contextual help).
`css` | `(index: number) => { input: string, container: string; }` | Given an input index, gets the CSS configuration to apply to the rendered `HTMLElement` considered the 'container' or 'input' for the specified template rendered input.<br/><br/><br/><br/>`container` value is based on following precedence:<br/><br/>1. `model.css.container` property<br/>2. `""` if no value provided.<br/><br/>`input` value is based on following precedence:<br/><br/>1. `model.css.input` property<br/>2. `""` if no value provided.
`list` | `(index: number) => Array<{ key: string; text: string; }>` | Given an input index, gets the array of items to use when the rendered input is built from a list.<br/><br/>Returns value based on following precedence:<br/>1. Get the RBLe Framework calculation table where the name is provided in `rbl-input.list`<br/>2. Get the RBLe Framework calculation table where the name is provided in `rbl-listcontrol.value`<br/>3. `[]` if no list is provided.
`prefix` | `(index: number) => string \| undefined` | Given an input index, gets the prefix to display *before* the rendered input.<br/><br/>Returns value based on following precedence:<br/>1. `rbl-input.prefix` RBLe Framework calculation value<br/>2. `model.prefixes[index]` property<br/>3. `undefined` if no value provided.<br/><br/>The property returns `undefined` if nothing provided vs `""` because some templates can more easily check for the presense of a prefix. This property is most often used with [Bootstrap input-group](https://getbootstrap.com/docs/5.0/forms/input-group/) elements.
`suffix` | `(index: number) => string \| undefined` | Given an input index, gets the suffix to display *after* the rendered input.<br/><br/>Returns value based on following precedence:<br/>1. `rbl-input.suffix` RBLe Framework calculation value<br/>2. `model.suffixes[index]` property<br/>3. `undefined` if no value provided.<br/><br/>The property returns `undefined` if nothing provided vs `""` because some templates can more easily check for the presense of a suffix. This property is most often used with [Bootstrap input-group](https://getbootstrap.com/docs/5.0/forms/input-group/) elements.
`maxLength` | `(index: number) => number` | Given an input index, gets the max length a textual input value can be; often used with `TEXTAREA` inputs.<br/><br/>Returns value based on following precedence:<br/>1. `rbl-input.max-length` RBLe Framework calculation value<br/>2. `model.maxLengths[index]` property<br/>3. `250` if no value provided.
`min` | `(index: number) => string` | Given an input index, gets the min value allowed if the rendered input supports the concept of minimum value (i.e. `range` or `date` types).<br/><br/>Returns value based on following precedence:<br/>1. `rbl-input.min` RBLe Framework calculation value<br/>2. `model.mins[index]` property<br/>3. `""` if no value provided.
`max` | `(index: number) => string` | Given an input index, gets the max value allowed if the rendered input supports the concept of maximum value (i.e. `range` or `date` types).<br/><br/>Returns value based on following precedence:<br/>1. `rbl-input.max` RBLe Framework calculation value<br/>2. `model.maxes[index]` property<br/>3. `""` if no value provided.
`step` | `(index: number) => number` | Given an input index, gets the step increment value to use if the rendered input supports the concept of incremental steps (i.e. `range` types).<br/><br/>Returns value based on following precedence:<br/>1. `rbl-input.step` RBLe Framework calculation value<br/>2. `model.steps[index]` property<br/>3. `1` if no value provided.
`error` | `(index: number) => string \| undefined` | Given an input index, gets the error message associated with the current input from the [state.errors property](#istateerrors). A value of `undefined` indicates no error.  The value can only by provided the [state.errors property](#istateerrors).
`warning` | `(index: number) => string \| undefined` | Given an input index, gets the warning message associated with the current input from the [`state.warnings` property](#istatewarnings). A value of `undefined` indicates no warning.  The value can only by provided the `state.warnings` property.

### v-ka-input-group Samples

#### v-ka-input-group Model Samples

```html
<!-- 
Similar to 'v-ka-input Model Samples' except most properties are simply [] of whatever the property type was for v-ka-input Model.

If the template doesn't expect values for 'every' array position, the length of property arrays does *not* have to match
the number of elements in the names property. For example, below, the 'input-textbox-2col' template only uses the first label
when rendering the group, so only one element is required for both labels and helps.
 -->
<div class="col-8" v-ka-input-group="{ 
    template: 'input-textbox-2col', 
    names: ['iDateTerm1', 'iDateTerm2'], 
    labels: ['2 Col Date of Termination'], 
    helps: [ { content: 'Tricky, but add your date of term' } ], 
    events: { 
        'keypress.enter.once': () => console.log('Hooray, enter pressed!'), 
        'input': e => console.log($(e.currentTarget).attr('name')) 
    } 
}"></div>

<!-- See 'v-ka-input Model Samples' for more sample ideas. -->
```

#### v-ka-input-group Scope Samples

```html
<!--
Sample two column 'textbox' input.  Illustrates how to access scope properties via the property(index) syntax
-->
<template id="input-textbox-2col" input>
    <div v-if="display(0)">
        <label :for="id(0)" class="form-label">
            <span v-html="label(0)"></span> 
            <a v-show="help(0).content" 
                :data-bs-content-selector="'#' + id(0) + 'Help'" 
                data-bs-toggle="popover" data-bs-trigger="click" data-bs-placement="top" role="button" tabindex="-1">
                <i class="fa-solid fa-circle-question text-blue"></i>
            </a>
        </label>
        <div class="d-none" v-if="help(0).content">
            <div :id="id(0) + 'HelpTitle'" v-html="help(0).title"></div>
            <div :id="id(0) + 'Help'" v-html="help(0).content"></div>
        </div>
        <div class="row">
            <div class="col-md-6">
                <div v-if="inputs.iScenarios > 1" class="d-block d-sm-none scenario-header-mobile m-1">Scenario 1</div>
                <div class="mb-3 tip-icon-wrapper">
                    <input :value="value(0)" :name="name(0)" :id="id(0)" :type="type" 
                        :class="['form-control', name(0), css(0).input, { 
                            'is-invalid': error(0), 
                            'is-warning': warning(0) 
                        }]" 
                        :disabled="disabled(0)" />
                    <span 
                        :class="['error-icon-hover-area', { 
                            'd-none': !error(0) && !warning(0), 
                            'error': error(0), 
                            'warning': warning(0) 
                        }]" 
                        :data-bs-content="error(0) || warning(0) || 'Error content'" 
                        data-bs-toggle="tooltip" data-bs-placement="top"></span>
                </div>
            </div>
            <div class="col-md-6" v-if="inputs.iScenarios > 1">
                <div class="d-block d-sm-none m-1 scenario-header-mobile">
                    <span>Scenario 2 </span>
                    <a href="#" @click.prevent="inputs.iScenarios = 1;  needsCalculation = true;" class="text-danger">
                        <i class="fa-light fa-square-xmark"></i>
                    </a>
                </div>
                <div class="mb-3 tip-icon-wrapper">
                    <input :value="value(1)" :name="name(1)" :id="id(1)" :type="type" 
                        :class="['form-control', name(1), css(1).input, { 
                            'is-invalid': error(1), 
                            'is-warning': warning(1) 
                        }]" 
                        :disabled="disabled(1)" />
                    <span 
                        :class="['error-icon-hover-area', { 
                            'd-none': !error(1) && !warning(1), 
                            'error': error(1), 
                            'warning': warning(1) 
                        }]" 
                        :data-bs-content="error(1) || warning(1) || 'Error content'" 
                        data-bs-toggle="tooltip" data-bs-placement="top"></span>
                </div>
            </div>
        </div>
    </div>
</template>
```

## v-ka-navigate

The `v-ka-navigate` directive is responsible initiating a 'page navigation' within the Host Environment.

### v-ka-navigate Model

The `IKaNavigateModel` represents the model type containing the properties that configure how a `v-ka-navigate` behaves when clicked.

The `v-ka-navigate` directive *does* have a `string` shorthand syntax that allows for more terse markup.  If the navigation instructions only needs to provide a Kaml view name to the directive, the following can be used.

```html
<!-- The following examples are equivalent -->
<div v-ka-navigate="Channel.Home"></div>
<div v-ka-navigate="{ view: 'Channel.Home' }"></div>
```

Property | Type | Description
---|---|---
`view` | `string` | The name of the Kaml View to navigate to.
`confirm` | [`IModalOptions`](#imodaloptions) | If a confirmation dialog should be displayed to prompt the user whether or not to allow the navigation, the options for the dialog can be provided.
`inputs` | [`ICalculationInputs`](#icalculationinputs) | If inputs should be passed to the KatApp being navigated to, an `ICalculationInputs` object can be provided.
`ceInputs`<sup>1</sup> | `string` | Some CalcEngines return an key/value space delimitted string of inputs in their result tables with the intention of those values being passed in as a representation of `ICalculationInputs`.
`persistInputs` | `boolean` | Whether or not to persist the inputs in sessionStorage.  If `true` and the user navigates away from current view and comes back the inputs will automatically be injected into the KatApp.  If `false` and the user navigates away and returns the input values will not longer be present. The default value is `false`.
`model` | `string` | If the *entire* `IKaNavigateModel` parameter is being provided by a CalcEngine via a valid 'JSON string', this property can be assigned in place of using all the above individual properties.
`clearDirty` | `boolean` | Can control whether or not the applications `state.isDirty` property should be set to `false` before navigation.

<sup>1</sup> `ceInputs` is a way to pass a string configuration of inputs from a CalcEngine result.

```javascript
row: {
    inputs: "iFirstName=\"John\" iLastName=\"Doe\""
}
```

```html
<a href="#" v-ka-navigate="{ otherProps: otherValues, inputs: { iMiddleInitial: 'C' }, ceInputs: row.inputs }">Click Here</a>
```

When navigating, then inputs sent would be:

```javascript
inputs: {
    iFirstName: "John",
    iLastName: "Doe",
    iMidleInitial: "C"
}
```


## v-ka-template

The `v-ka-template` directive is responsible for manually rendering a template with or without a data source. The data source can be a simple javascript object or it can be an array of data (usually obtained via [rbl.source()](#istaterblsource)).  When the source is an `Array<>`, the template can get access to this property via the scope's `rows` properties.

- [v-ka-template Model](#v-ka-template-model) - Discusses the properties that can be passed in to configure the `v-ka-template` directive.
- [v-ka-template Scope](#v-ka-template-scope) - Discusses how/which properties are exposed on the `v-ka-template` scope and can be used in Kaml View markup.  See [Scopes with Properties that are Reactive](#scopes-with-properties-that-are-reactive) for information on how to define the `source` property when information is reactive (i.e. a custom source defining a `rows` property that changes via new calculation results).
- [v-ka-template Samples](#v-ka-template-samples) - Examples illustrating different scenario usages for `v-ka-template` directive.

### v-ka-template Model

The model passed to the requested template configures the [`v-ka-template` scope](#v-ka-template-scope) that is available to the template.

The `v-ka-template` directive *does* have a `string` shorthand syntax that allows for more terse markup.  If the model only needs to provide a template name to the directive, the following can be used.

```html
<!-- The following examples are equivalent -->
<div v-ka-template="summary-template"></div>
<div v-ka-template="{ name: 'summary-template' }"></div>
```

Property | Type | Description
---|---|---
`name` | `string` | Provides the name of the template to render.
`source` | `any \| Array<ITabDefRow>` | Provides the scope that is available to the template to be rendered.

### v-ka-template Scope

The scope available to templates used within the `v-ka-template` directive is simply a variation of the object that was provided in the  `model.source` property.  

Property | Type | Description
---|---|---
`rows` | `Array<ITabDefRow>` | If the model `source` is of type `Array<ITabDefRow>`, the `rows` property contains all the array specified by the `model.source`.  
`application` | [`IKatApp`](#ikatapp) | Added for easier access to the application object while in Kaml View markup.
`modalAppOptions` | [`IModalAppOptions`](#imodalappoptions) | When the current Kaml View is being hosted as a modal application, added for easier access to the application object while in Kaml View markup.
`$renderId` | `string` | Unique identifier for this template's rendered output to aid in selection scoping.
`source` Properties | `any` | If the model `source` is **not** of type `Array<ITabDefRow>`, the exact object passed in from `model.source` is treated as the scope and any defined public properties are available to the template.

#### Scopes with Properties that are Reactive

If the scope could change due to reactivity (i.e. a calculation or javascript changes the array), the `model.source` property **must** be written as a [javascript getter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/get) or the scope will not participate in reactivity.

Note: If the `source` property of the `v-ka-template` scope is simply an `Array<>`, the KatApp framework will automatically make it reactive.

```html
<!--
    The KatApp framework will automatically make this template reactive.
-->
<div v-ka-template="{ name: 'templateName', source: rbl.source( 'resultTable', r => r.field == '1' ) }"></div>

<!--
    When a custom source scope is built, the 'source' property of the scope must be reactive:
        get source() { return { ... }; }

    Additionally, any part of the scope that must be reactive must be written as a getter:
        get rows() { return rbl.source( 'resultTable', r => r.field == '1' ); }
-->
<div v-ka-template="{ name: 'templateWithCustomSource', get source() { return { staticProp: true, get rows() { return rbl.source( 'resultTable', r => r.field == '1' ); } } } }"></div>
```

### v-ka-template Samples

```html
<!-- Template where the model.source is an array, so the template iterated through the 'rows' property -->
<ul class="dropdown-menu dropdown-menu-lg-end" 
    v-ka-template="{ name: 'more-menu-links', source: rbl.source('contentContextLinks') }"></ul>

<template id="more-menu-links">
    <li v-for="link in rows">
        <a v-if="( link.modalModel || '' ) == ''" 
            class="dropdown-item d-flex justify-content-between align-items-start me-3" 
            v-ka-navigate="{ view: link.viewID }">
            {{link.text}} <i :class="['fa-light fs-6 link-primary align-self-center', link.linkIcon]"></i>
        </a>
        <a v-if="( link.modalModel || '' ) != ''" 
            class="dropdown-item d-flex justify-content-between align-items-start me-3" 
            v-ka-modal="{ model: link.modalModel }">
            {{link.text}} <i :class="['fa-light fs-6 link-primary align-self-center', link.linkIcon]"></i>
        </a>
    </li>
</template>
```

```html
<!-- 
1. Same as above where the model.source is an array
2. Demonstrates how the 'scope' to the template takes into account parent scope.  The 'type' iteration item 
    from 'typeMessage' table is expected in the template.  The template uses both the 'type' iteration item 
    and its own 'message' iteration item.
-->
<div v-for="type in rbl.source('typeMessage')">
    <div v-ka-template="{ 
        name: 'notice-type1', 
        source: rbl.source('messages', 'Messages').filter( r => r.type == type.type ) 
    }"></div>
</div>

<template id="notice-type1">
    <div v-for="message in rows" :class="'alert alert-' + type.alertType">
        <div class="d-flex w-100 justify-content-between d-none">
            <h4 class="alert-heading mb-1 d-flex align-content-center text-dark">
                <i :class="'fa-light me-2 ' + type.icon"></i> {{type.text}}
            </h4>
        </div>
        <p class="mb-1 fw-bold text-dark"><i :class="'fa-light me-1 ' + type.icon"></i>{{message.title}}</p>
        <small v-html="message.message"></small>
        <div class="text-center border-top border-secondary mt-2 pt-2" v-if="message.linkText!=''">
            <a class="link-dark" v-ka-navigate="{ view: message.linkDest }">
                <i class="fa-light fa-circle-chevron-right me-1"></i><span v-html="message.linkText"></span>
            </a>
        </div>
    </div>
</template>

<!-- 
    To add to this sample, below is a complex version performing the same way where the model 
    is manually constructed (including the type row and the Array<ITabDefRow> rows property) 
    where the type row is not part of the RBLe Framework results.

    Additionally, it shows the syntax for making a javascript getter for the rows property.
-->
<div v-ka-template="{ 
    name: 'notice-type1', 
    source: { 
        type: { icon: 'fa-triangle-exclamation', text: '', alertType: 'danger' }, 
        get rows() { return rbl.source('messages', 'Messages').filter( r => r['@id'] == 'hw-action-enroll' ); } 
    } 
}"></div>
```

```html
<!-- Calling a template without a data source, the template is just accessing the global scope (errors/warnings) directly -->
<div v-ka-template="validation-summary"></div>

<template id="validation-summary">
    <div v-if="errors.length > 0" :id="kaId + '_ModelerValidationTable'" 
        class="validation-summary alert alert-danger" 
        role="alert" title="Please review the following issues:">
        <p><b><i class="fa-duotone fa-circle-exclamation"></i> Please review the following issues:</b></p>
        <ul>
            <li v-for="error in errors" v-html="error.text"></li>
        </ul>
    </div>
    <div v-if="warnings.length > 0" :id="kaId + '_ModelerWarnings'" 
        class="validation-warning-summary alert alert-warning" 
        role="alert" title="Please review the following warnings:">
        <p><b><i class="fa-duotone fa-triangle-exclamation"></i> Please review the following warnings:</b></p>
        <ul>
            <li v-for="warning in warnings" v-html="warning.text"></li>
        </ul>
    </div>
</template>
```

```html
<!-- Call a template with a custom data source object, the model properties are access directly -->
<div v-ka-template="{ 
    name: 'confirm-danger', 
    source: { 
        selector: 'delete-confirm', 
        message: 
            '<p>Do you want to delete this HSA transaction?</p>' + 
            '<p>If you delete this transaction, you will not be making a one-time contribution to your HSA.</p>' + 
            '<p>Are you sure you want to delete this transaction?</p>' 
    } 
}"></div>

<template id="confirm-danger">
    <div :class="['d-none align-items-center', selector]">
        <div class="d-flex align-items-center h6">
            <i class="fa-solid fa-circle-exclamation fa-2x text-danger"></i>
            <span class="p-2" v-html="message"></span>
        </div>
    </div>
</template>
```

## v-ka-api

The `v-ka-api` directive allows Kaml Views to set up links that will automatically call an api endpiont in the Host Environment.  Internally, the directive simply passes information to a [IKatApp.apiAsync](#ikatappapiasync) method call.

### v-ka-api Model

The `IKaApiModel` represents the model type containing the properties that configure how a `v-ka-api` link behaves when clicked.

Property | Type | Description
---|---|---
`endpoint` | `string` | The api endpoint to submit to.
`confirm` | [`IModalOptions`](#imodaloptions) | If a confirmation dialog should be displayed to prompt the user whether or not to allow the api submission, the options for the dialog can be provided.
`calculationInputs` | [`ICalculationInputs`](#icalculationinputs) | Often when an api endpoint is submitted to in a Host Environment that leverages the RBLe Framework, an `iValidate=1` RBL calculation is the first action performed on the server.  This calculation can do UI validations or provide instructions to the Host Environment on what type of actions it should take.  All the inputs from the UI are always submit, but if additional inputs should be passed to the endpoint, an `ICalculationInputs` object can be provided.
`apiParameters` | `IStringAnyIndexer` | Some endpoints require parameters that are processed in the server code of the Host Environment.  These parameters are technically not different from `ICalculationInputs`, but providing them as a second parameter accomplishes a few things.<br/><br/>1. The value type of each parameter can be more than just `string`, supporting `boolean`, `number` or a nested object with its own properties.<br/>2. If all the parameters are of type `string`, even though technically not different from the `calculationInputs` property, using `apiParameters` eliminates parameters from being passed to a RBL calculation.<br/>3. Finally, it simply segregates 'intent' of the parameters versus the inputs.  Parameters are intended to be used by the api endpoint server code while inputs are intended to be used by the RBL calculation.
`isDownload` | `boolean` | If the api endpoint being posted to will return binary content representing a download, setting this flag to true tells the KatApp framework to process the results differently and save the generated content as a downloaded .
`files` | [`FileList`](https://developer.mozilla.org/en-US/docs/Web/API/FileList) | If the api endpoint being submitted to accepts file uploads, this property can be set (usually from a `input type="file"` element).
`calculateOnSuccess` | `boolean \| ICalculationInputs` | If after a successful submission to an api endpoint, the KatApp Framework should automatically trigger a RBLe Framework Calculation, `calculateOnSuccess` can be set.  Setting the value to `true` indicates that a calculation should occur.  Setting the value to a `ICalculationInputs` object also indicates that a calculation should occur and additionally pass along the inputs provided.  See [v-ka-api Model Samples](#v-ka-api-model-samples) for more information.
`thenAsync` | `(response: IStringAnyIndexer \| undefined, application: KatApp) => Promise<void>` | If the Kaml View needs to provide a delegate to run if an api submission is successful, the `thenAsync` property solves that problem.  See [v-ka-api Model Samples](#v-ka-api-model-samples) for more information.
`catchAsync` | `(e: any \| undefined, application: KatApp) => Promise<void>` | If the Kaml View needs to provide a delegate to run if an api submission failed, the `catchAsync` property solves that problem.  See [v-ka-api Model Samples](#v-ka-api-model-samples) for more information.<br/><br/>If no `catchAsync` is provided and an api endpoint fails, the response will simply be logged by the KatApp framework.

### v-ka-api Model Samples

```html
<!-- 
Submit to a estimate generation endpoint, and on success, run a calculation on 
the client side passing in iRefreshAfterEstimate = 1 
-->
<a v-ka-api="{ endpoint: 'generate/estimate', calculateOnSuccess: { iRefreshAfterEstimate: '1' } }">Submit
```

```html
<!-- 
Submit to a estimate generation endpoint, and on success, run a calculation on 
the client side passing in iRefreshAfterEstimate = 1 
-->
<a v-ka-api="{ 
    endpoint: 'generate/estimate', 
    thenAsync: ( response, application ) => console.log(`Estimate was successful and responded with ${response}`) 
}">Submit
```

```html
<!-- Submit to a estimate generation endpoint, and on failure log the response -->
<a v-ka-api="{ 
    endpoint: 'generate/estimate', 
    catchAsync: ( e, application ) => console.log(`Estimate failed: ${e}`) 
}">Submit
```

## v-ka-modal

The `v-ka-modal` directive can be used to launch a modal dialog rendering static HTML markup or a separate Kaml View.  Internally, the directive delegates calls to the [IKatApp.showModalAsync](#ikatappshowmodalasync) method.

**Note:** Every KatApp Framework modal rendered uses a `selector` value of `kaModal`.  Therefore, Kaml View developers can always get a reference to a modal KatApp via `KatApp.get('.kaModal')` in the browser console.

### v-ka-modal Model

The `IKaModalModel` represents the model type containing the properties that configure how a `v-ka-modal` link and modal application behaves. The `IKaModalModel` interface extends the [`IModalOptions` interface](#imodaloptions), therefore on extended properties will be documented in this section, please review `IModalOptions` for a list of inherited properties available.

Property | Type | Description
---|---|---
`model` | `string` | If the *entire* `IKaModalModel` parameter is being provided by a CalcEngine via a valid 'JSON string', this property can be assigned in place of using all the individual properties.
`beforeOpenAsync` | `(application: KatApp) => Promise<void>` | When a modal is displayed using the [IModalOptions.contentSelector](#imodaloptions) property, at times it is necessary to update the content dynamically before rendering the modal.  This event enables the host application to update reactive model properties before rendering the modal.  See [v-ka-modal Model Samples](#v-ka-modal-model-samples) for more information.
`confirmedAsync` | `(response: any \| undefined, application: KatApp) => Promise<void>` | If the Kaml View needs to provide a delegate to run if modal dialog is 'confirmed', the `confirmedAsync` property solves that problem.  See [v-ka-modal Model Samples](#v-ka-modal-model-samples) for more information.
`cancelledAsync` | `(response: any \| undefined, application: KatApp) => Promise<void>` | If the Kaml View needs to provide a delegate to run if modal dialog is 'cancelled', the `cancelledAsync` property solves that problem. See [v-ka-modal Model Samples](#v-ka-modal-model-samples) for more information.
`catchAsync` | `(e: any \| undefined, application: KatApp) => Promise<void>` | If the Kaml View needs to provide a delegate to run if generating a modal dialog fails, the `catchAsync` property solves that problem. See [v-ka-modal Model Samples](#v-ka-modal-model-samples) for more information.<br/><br/>If no `catchAsync` is provided and generating a modal dialog fails, the response will simply be logged by the KatApp framework.

### v-ka-modal Model Samples

```html
<a v-ka-modal="{ 
    view: 'Common.Acknowledgement', 
    confirmedAsync: ( response, application ) => console.log(`Dialog was confirmed with ${response}`) 
}">Submit</a>
```

```html
<a v-ka-modal="{ 
    view: 'Common.Acknowledgement', 
    cancelledAsync: ( response, application ) => console.log(`Dialog was cancelled with ${response}`) 
}">Submit</a>
```

```html
<!-- Submit to a estimate generation endpoint, and on failure log the response -->
<a v-ka-modal="{ 
    view: 'Common.Acknowledgement', 
    catchAsync: ( e, application ) => console.log(`Acknowledgement dialog unable to display: ${e}`) 
}">Submit</a>
```

```html
<div v-for="name in ['John', 'Sally']">
	<a v-ka-modal="{ 
		contentSelector: '.modalContent',
		beforeOpenAsync: () => model.name = name 
		
	}">Show Modal for {{name}}</a>
</div>

<div class="d-none modalContent">
	Saying hello to {{model.name}} from the modal!
</div>
```

## v-ka-app

The `v-ka-app` directive can be used to nest a separate KatApp within the body of a host KatApp.  The nested KatApp calculation results, inputs, etc. are all isolated within scope of the KatApp and can not access or communicate with the host application except through the [`options.hostApplication` property](#ikatappoptionshostapplication) and the [IKatApp.notifyAsync](#ikatappnotifyasync) method.

### v-ka-app Model

The `IKaAppModel` represents the model type containing the properties that configure how a `v-ka-app` application behaves.

Property | Type | Description
---|---|---
`view` | `string` | The Kaml View to render inside the nested KatApp.
`selector` | `string` | If provided, a JQuery selector `string` that is used to identify that KatApp.  This property aids in debugging by allowing Kaml View developers to type in `KatApp.get({selector})` in a browser console to get a reference to their KatApp.
`inputs` | `ICalculationInputs` | If inputs should be passed to the rendered nested application's Kaml View, provide a `ICalculationInputs` object.

## v-ka-table

The `v-ka-table` directive is responsible for creating HTML tables automatically from the calculation results.

- [v-ka-table Model](#v-ka-table-model) - Discusses the properties that can be passed in to configure the `v-ka-table` directive.
- [v-ka-table Result Table Columns](#v-ka-table-result-table-columns) - Discusses how konwn RBLe result table columns are processed to automatically render a table.
- [v-ka-table colgroup Processing](#v-ka-table-colgroup-processing) - Discusses how a `v-ka-table` colgroup is built from results.
- [v-ka-table Header Rows](#v-ka-table-header-rows) - Explains how to identify RBLe Calculation result rows as 'header' rows and when they appear in `thead` versus `tbody`.
- [v-ka-table Automatic Column Spanning](#v-ka-table-automatic-column-spanning) - Explains when automatic column spanning occurs in the rendered table.
- [v-ka-table Manual Column Spanning](#v-ka-table-manual-column-spanning) - Explains how the RBLe CalcEngine can control column spanning in each row via the `span` column.
- [v-ka-table Column Widths](#v-ka-table-column-widths) - Describes the different ways the RBLe CalcEngine can control column widths of the table.
- [v-ka-table Row Processing](#v-ka-table-row-processing) - Explains the logic used when generating the `tr` HTML element to append to the table.

### v-ka-table Model

The `IKaTableModel` represents the model type containing the properties that configure how a `v-ka-table` will render.

The `v-ka-table` directive *does* have a `string` shorthand syntax that allows for more terse markup.  If the table to be rendered only needs to provide a table name to the directive, the following can be used.

```html
<!-- The following v-ka-table examples are equivalent -->
<div v-ka-table="resultTable"></div>
<div v-ka-table="{ name: 'resultTable' }"></div>
```

Property | Type | Description
---|---|---
`name` | `string` | The name of the RBLe Framework result table to process.
`css` | `string` | If provided, `css` is the css that should be applied to the rendered `<table>` element.  If not provided, `table table-sm table-hover` is applied.<br/><br/>Note that css names of `rbl` and `model.name` are always applied.
`ce` | `string` | If the RBLe Framework results to process is not part of the default Kaml View CalcEngine, a CalcEngine key can provided.
`tab` | `string` | If the RBLe Framework results to process is not part of the default result tab (`RBLResult`), a tab name can provided.

### v-ka-table Result Table Columns

In addition to the rules for all [result tables](#rble-calcengine-result-tabs), all tables rendered by `v-ka-table` elements use the rules described below. Simply put, only columns starting with `text` or `value` are rendered, however, there are flags, columns, or names available for use that control how results are generated and returned for each table from the CalcEngine.

Name&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | Location&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | Description
---|---|---
id | Column Name | Used to detect 'header' rows.
code | Column Name | Same rules as id column for rendering 'header' rows.
class | Column Name | Optional CSS class to apply to the table row (`tr` element).
span | Column Name | Optional column to use to define column spanning within the row.
textX | Column Name | Render content with `text {table}-{column}` CSS class. `text` by default causes left alignment.
valueX | Column Name | | Render content with `value {table}-{column}` CSS class. `value` by default causes right alignment.
width<br/>r-width | Row ID | If you want explicit control of column widths via absolute or percentage, values can be provided here.  `r-width` is used when the table has a CSS class of `table-responsive` applied.
width-xs<br/>width-sm<br/>width-md<br/>width-lg | Row ID | If you want explicit control of column widths via bootstrap column sizes, values can be provided here.  **Note:** If any bootstrap viewport width is provided, the `width` column is ignored.
class | Row ID | Similar to the `class` Column, to provide a class on a specific column, provide a row with `id` set to `class`, then for each column in this row, provide a class that will be applied to a column for _every_ row rendered.

### v-ka-table colgroup Processing

The first row returned by the `model.name` table is used to build the `colgroup` element inside the `table` element.  For each `text*` and `value*` column it generates a `col` element as`<col class="{table}-{column}">`.  Additional width processing is desribed in the [v-ka-table Columns Widths](#v-ka-table-Columns-Widths) section.

### v-ka-table Header Rows

The `id` and `code` columns are used to detect header rows.  Row ids do _not_ have to be unique.  However, the only time they possibly shouldn't be unique is when they are identifying header rows.  Otherwise, you cannot guarantee selecting the proper row if used in a selector path.  If the `id`/``code` column is `h`, starts with `hdr` or starts with `header`, then the cell element will be a `th` (header), otherwise it will be a `td` (row).

All 'header' rows processed before the _first_ non-header row is processed will be placed inside the `thead` element, after which, all remaining rows (data and header) will be placed inside the `tbody` element. If the row is a 'header' row contained within the `tbody` element, a `h-row` class will be applied to the `tr` element.

### v-ka-table Automatic Column Spanning

For header rows, if only one column has a value and all others are blank, the single column is automatically spanned across the entire table.

### v-ka-table Manual Column Spanning

The `span` column is used to define column spanning in the format of `columnName:spanCount[:columnName:spanCount]`

Each span definition is a column name followed by a colon and how many columns to span. If you need to control more than one grouping of spans, you can put as many definitions back to back separated by colons as needed.

Additionally, when a column span definition is processed, the resulting table cell has an additional CSS class of `span-{table}-{column}`.

**Examples**  
Span `text1` all three columns in a three cell table: `text1:3`  
Span `text1` 1 column and `value1` 2 columns in a three cell table: `text1:1:value1:2`

**Note:** When using the `span` column, the total number of columns spanned/configured must equal the total number of columns in the table even if the span configuration directs several columns to 'span' only one column (which is counter intuitive since that really isn't 'spanning').

**Example:**  
If you have table with columns `text1`, `value1`, `value2`, and `value3` and you want `text1` to span the first two columns and then `value2` and `value3` render their contents appropriately, the following applies to the span column:

_Wrong:_ `text1:2` - setting this will only generate one cell spanning two columns, but leaving the third and fourth columns unrendered.

_Correct:_ `text1:2:value2:1:value3:1` - you must explicitly set all columns for the row. The sum of columns by this configuration is four which equals the total number of columns in the table.  

### v-ka-table Column Widths

Column widths can be provided in three ways.  Absolute width, percentage width, or bootstrap class widths.  If **any** bootstrap class widths are provided, or if the `data-css` attribute provided for a table contains `table-responsive`, then bootstrap widths are used.  Otherwise, the `width` column is used and is deemed a percentage if the value ends with a `%` sign.

**Absolute or Percentage Widths**
When using absolute or percentage widths, the `width` value is applied to the `col` element inside the `colgroup`.

```html
<!-- 
  foundingfathers: [{ 
        id: "header", 
        text1: "First", 
        @text1: { width: "100" }, 
        text2: "Last", 
        @text2: { width: "200" }, 
        value1: "DOB",
        @value1: { width: "100" }
    }, ...
    ]
-->
<colgroup>
    <col class="foundingfathers-text1" width="100px">
    <col class="foundingfathers-text2" width="200px">
    <col class="foundingfathers-value1" width="100px">
</colgroup>
```

**Bootstrap Widths**
When using bootstrap widths, the `width` value is applied to the `col` element inside the `colgroup` and on every row.

```html
<!-- 
  foundingfathers: [{ 
        id: "header", 
        text1: "First", 
        @text1: { xs-width: "12", lg-width="3" }, 
        text2: "Last", 
        @text2: { xs-width: "12", lg-width="3" }, 
        value1: "DOB",
        @value1: { xs-width: "12", lg-width="3" }
    }, ...
    ]
-->
<colgroup>
    <col class="foundingfathers-text1 col-xs-12 col-lg-3">
    <col class="foundingfathers-text2 col-xs-12 col-lg-3">
    <col class="foundingfathers-value1 col-xs-12 col-lg-3">
</colgroup>
```

### v-ka-table Row Processing

In addition to the header row, spanning, and column width processing described above, the final step is to render a HTML table rows and cells.  For each row returned in the specified table source a `tr` element is created.  Then for each column in that row whose name starts with `text` or `value`, a `td` or `th` element is created and the value along with the appropriate css classes described in [v-ka-table Result Table Columns](v-ka-table-Result-Table-Columns).

## v-ka-highchart

The `v-ka-highchart` directive is responsible for creating HTML/javascript based chart objects (using the Highcharts API) from the calculation results.  There are three types of chart information rows returned from CalcEngines: KatApp specific `config-*` option rows, chart and series option rows (with `id` matching the names of [Highcharts API](https://api.highcharts.com/highcharts/) properties), and data rows to be used as the chart data source.

- [v-ka-highchart Model](#v-ka-highchart-model) - Discusses the properties that can be passed in to configure the `v-ka-highchart` directive.
- [v-ka-highchart Table Layouts](#v-ka-highchart-table-layouts) - Discusses the three tables in the RBLe CalcEngine used to render the chart.
- [v-ka-highchart Custom Options](#v-ka-highchart-custom-options) - Discusses custom options processed by RBLe Framework that do *not* map directly to HighCharts options.
- [v-ka-highchart Standard Options](#v-ka-highchart-standard-options) - Discusses the standard options processed by RBLe Framework that *map directly* to Highcharts options.
- [v-ka-highchart Custom Series Options](#v-ka-highchart-custom-series-options) - Discusses custom series options processed by RBLe Framework that do *not* map directly to Highcharts series options.
- [v-ka-highchart Standard Series Options](#v-ka-highchart-standard-series-options) - Discusses the standard options processed by RBLe Framework that *map directly* to Highcharts series options.
- [v-ka-highchart Series Data Options](#v-ka-highchart-series-data-options) - Explains how to set properties on individual data points for each series.
- [v-ka-highchart Property Value Parsing](#v-ka-highchart-property-value-parsing) - Explains how the RBLe Framework parses values from the CalcEngine to convert them into Highcharts property values.
- [v-ka-highchart Language Support](#v-ka-highchart-language-support) - Explains how to control the UI culture/localization of the chart.

### v-ka-highchart Model

The `IKaHighchartModel` represents the model type containing the properties that configure how a `v-ka-highchart` will render.

To see all the options available for charts and series, please refer to the [Highcharts API](https://api.highcharts.com/highcharts/)

The `v-ka-highchart` directive *does* have a `string` shorthand syntax that allows for more terse markup.  If the chart to be rendered only needs to provide a data and, optionally, an options name to the directive, the following can be used.

```html
<!-- The following v-ka-highchar examples are equivalent -->
<div v-ka-highchart="PayChart"></div>
<div v-ka-highchart="{ data: 'PayChart', options: 'PayChart' }"></div>

<!-- The following v-ka-highchar examples are equivalent -->
<div v-ka-highchart="PayChart.PayOptions"></div>
<div v-ka-highchart="{ data: 'PayChart', options: 'PayOptions' }"></div>
```

Property | Type | Description
---|---|---
`data` | `string` | The *partial* name of the RBLe Framework result table providing the 'data' to the chart.  This value will be translated into `Highcharts-{model.data}-Data` when retrieving results from the calculation.
`options` | `string` | The *partial* name of the RBLe Framework result table providing the 'options' for the chart.  This value will be translated into `Highcharts-{model.options}-Options` when retrieving results from the calculation. If not provided, the `model.data` property will be used.<br/><br/>By default, all 'option values' come from the table with the name of `Highcharts-{model.data}-Options`.  The CalcEngine developer may provide overrides to these values using the `Highcharts-Overrides` table.
`ce` | `string` | If the RBLe Framework results to process is not part of the default Kaml View CalcEngine, a CalcEngine key can provided.
`tab` | `string` | If the RBLe Framework results to process is not part of the default result tab (`RBLResult`), a tab name can provided.

### v-ka-highchart Table Layouts

The tables used to produce Highcharts in a Kaml view are mostly 'key/value pair' tables.  The three tables in use are `Highcharts-{Model.options}-Options`, `Highcharts-{Model.name}-Data`, and `Highcharts-Overrides`.  Note that if `model.Options` is not provided, `Model.name` will be used as the 'name' for both the options and the data table.

#### v-ka-highchart Options Table

Provides the options used to build the chart.  Either [Custom Options](#v-ka-highchart-Custom-Options) or [Standard Options](#v-ka-highchart-Standard-Options).  If the option name starts with `config-`, it is Custom ResultBuilder Framework option, otherwise it is a standard Highcharts option.  If it is a [standard option](#v-ka-highchart-Standard-Options), it is a `period` delimitted key that matches the Highcharts API object hierarchy.

Column | Description
---|---
key | The name of the option.
value | The value of the option.  See [Property Value Parsing](#v-ka-highchart-Property-Value-Parsing) for allowed values.

#### v-ka-highchart Data Table

Provides the data and _series configuration_ to build the chart.  If the category name starts with `config-`, it is a row that provides [Standard Highchart Series Options](#Standard-Highchart-Series-Options) for each series in the chart, otherwise, the category name represents the data values for each series in the chart.

Column | Description
---|---
category | Either a series configuration 'key' (see [Custom](#Custom-Series-Options) and [Standard](#Standard-Series-Options) series options), data category/name or X-Axis value for the current data point.  For all charts, `category` is used in the `id` property of the data point in the format of `seriesN.category` (which is helpful for [chart annotations](https://api.highcharts.com/highcharts/annotations)).  For charts of type `pie`, `solidgauge`, `scatter3d` or `scatter3d`, `category` is the 'name' used for each category and, it is part of the `id` _and_ it is used for the 'name' of the data point, which is leveraged by the built in label formatter.
seriesN | A column exists for each series in the chart to provide the 'value' of that series for the current row (i.e. `series1`, `series2`, and `series3` for a chart with three series).
point.seriesN.propertyName | Custom data point properties to be applied for each data point.  `seriesN` should match desired series' column name and `propertyName` should match an available property name for the chart's data points.  See [series](https://api.highcharts.com/highcharts/series) documentation and look at the `data` array property for each series type to learn more about available properties for each chart type.
plotLine | Provide [plot line information](https://api.highcharts.com/highcharts/xAxis.plotLines) for the given data row.  The value is in the format of `color\|width\|offset`.  `offset` is optional and just renders the plotline offsetted from the current row by the provided value.
plotBand | Provide [plot band information](https://api.highcharts.com/highcharts/xAxis.plotBands) for the given data row.  The value is in the format of `color\|span\|offset`.  `span` is either `lower` meaning the band fills backwards, `upper` meaning it fills forwards, or a number value for how many X-Axis values to span.  `offset` is optional and just renders the plotline offsetted from the current row by the provided value.

#### v-ka-highchart Override Table

Similar to [v-ka-highchart Options Table](#v-ka-highchart-Options-Table), this table provides the options used to build the chart, but it overrides any option `keys` matching the original `Highcharts-{Model.options}-Options` table.  This is useful if several charts have the same values for the majority of the properties and use the same `Highcharts-{Model.options}-Options` table as a base setup.  Then you can provide overrides for each property that varies from the shared options setup.

Column | Description
---|---
id | The name of the chart whose values will be overridden.  `id` needs to match the `Model.options` value.
key | The name of the option.
value | The value of the option.  See [Property Value Parsing](#v-ka-highchart-Property-Value-Parsing) for allowed values.

### v-ka-highchart Custom Options

There are some configuration options that are explicitly handled by the ResultBuilder Framework, meaning, they do not map to the Highcharts API.

Configuration&nbsp;Setting | Description
---|---
config&#x2011;style | By default, the Highcharts template has no style applied to the `<div class="chart chart-responsive"></div>` element.  If, the CalcEngine wants to apply any CSS styles (i.e. height and width), the config-style value
config&#x2011;tooltipFormat | When tooltips are enabled, there is a default `tooltip.formatter` function provided by KatApps where this value provides the template to apply a `string.format` to.  For example `<b>{x}</b>{seriesDetail}<br/>`<br/><br/>The available substitution tokens are `x` (current X-Axis value), `stackTotal` (sum of all Y-Axis values at this current `x` value), and `seriesDetail` (list of all Y-Axis points in format of `name: value`).  For more information see [tooltip.formatter API](https://api.highcharts.com/highcharts/tooltip.formatter) and [Property Value Parsing](#v-ka-highchart-Prpoerty-Value-Parsing).

### v-ka-highchart Standard Options

Standard chart option names provided by `key` columns are a `period` delimitted value meant to represent the Highcharts API object hierarchy.  

For example, given:
id | value
---|---
chart.title.text | My Chart


The following Hicharts configuration would be created:

```javascript
{
    chart: {
        title: {
            text: "My Chart"
        }
    }
}
```

If the Highcharts API object property is an array, you can set specific array elements as well using an `[]` syntax.  

For example, given:
id | value
---|---
plotOptions.pie.colors[0] | Red
plotOptions.pie.colors[1] | Blue

<br/>
The following Hicharts configuration would be created:

```javascript
{
    plotOptions: {
        pie: {
            colors: [
                "Red",
                "Blue"
            ]
        }
    }
}
```

Another example assigning [annotations](https://api.highcharts.com/highcharts/annotations):

For example, given:

id | value
---|---
annotations[0].labels[0] | json:{ point: 'series1.69', text: 'Life Exp' }

<br/>
The following Hicharts configuration would be created:

```javascript
{
    annotations: [
        {
            labels: [
                { 
                    point: 'series1.69', 
                    text: 'Life Exp' 
                }
            ]
        }
    ]
}
```

### v-ka-highchart Custom Series Options

There are some configuration options that are explicitly handled by the ResultBuilder Framework for Highchart series, meaning, they do not map to the Highcharts API.

Series options are created by having a row in the `Highcharts-{rbl-chartdata}-Data` table with a `category` column value starting with `config-`.  Then the values in every `seriesN` column in the row represent the configuration setting for _that_ series.

Configuration&nbsp;Setting | Description
---|---
config&#x2011;visible | You can disable a series from being processed by setting its `config-visible` value to `0`.
config&#x2011;hidden | Similar to `config-visible` except, if hidden, the series is _processed_ in the chart rendering, but it is not displayed in the chart or the legend.  Hidden series are essentially only available for tooltip processing.
config&#x2011;format | Specify a format to use when display date or number values for this series in the tooltip.  See Microsoft documentation for available [date](https://docs.microsoft.com/en-us/dotnet/standard/base-types/custom-date-and-time-format-strings) and [number](https://docs.microsoft.com/en-us/dotnet/standard/base-types/standard-numeric-format-strings) format strings.

<br/>

An example of how these might look in a CalcEngine result table.

category | series1 | series2 | series3 | series4
---|---|---|---|---
config&#x2011;visible | 1 | 1 | 1 | 0
config&#x2011;hidden | 0 | 0 | 1 | 1
config&#x2011;format | c2 | c2 | c2 | c2

<br/> 

This table would result a chart with `series1`, `series2`, and `series3` being processed.  `series3` would not be visible in the chart or legend, but would be displayed in the tooltip.  Each of the processed series would display values in $0.00 format.

### v-ka-highchart Standard Series Options

In addition to the Custom Series Options, if you need to apply any Highcharts API options to the series in the chart, you accomplish it in the following manner.

Configuration&nbsp;Setting | Description
---|---
config-* | Every row that starts with `config-` but is not `config-visible`, `config-hidden` or `config-format` is assumed to be an option to assign to the Highcharts API for the given series.  `*` represents a `period` delimitted list of property names.  See [Standard Options](#v-ka-highchart-Standard-Options) for more information on API property naming.

Example of settings used for KatApp Sharkfin Income chart.

category | series1 | series2 | series3 | series4 | series5 | series6
---|---|---|---|---|---|--
config&#x2011;name | Shortfall | 401(k) Plan | Non Qualified Savings Plan | HSA | Personal Savings | Retirement Income  Needed
config&#x2011;color | #FFFFFF | #006BD6 | #DDDDDD | #6F743A | #FD9F13 | #D92231
config&#x2011;type | areaspline | column | column | column | column | spline
config&#x2011;fillOpacity | 0 |||||			
config&#x2011;showInLegend | 0 | 1 | 1 | 1 | 1 | 1

<br/>

The following Hicharts configuraiton would be created:

```javascript
{
    series: [
        {
            name: "Shortfall",
            color: "#FFFFFF",
            type: "areaspline",
            fillOpacity: 0,
            showInLegend: 0,
            data: [ /* filled in from data rows */ ]
        },
        {
            name: "401(k) Plan",
            color: "#006BD6",
            type: "column",
            showInLegend: 1,
            data: [ /* filled in from data rows */ ]
        },
        {
            name: "Non Qualified Savings Plan",
            color: "#DDDDDD",
            type: "column",
            showInLegend: 1,
            data: [ /* filled in from data rows */ ]
        },
        {
            name: "HSA",
            color: "#6F743A",
            type: "column",
            showInLegend: 1,
            data: [ /* filled in from data rows */ ]
        },
        {
            name: "Personal Savings",
            color: "#FD9F13",
            type: "column",
            showInLegend: 1,
            data: [ /* filled in from data rows */ ]
        },
        {
            name: "Retirement Income Needed",
            color: "#D92231",
            type: "spline",
            showInLegend: 1,
            data: [ /* filled in from data rows */ ]
        }
    ]
}
```

See [series](https://api.highcharts.com/highcharts/series) documentation to learn more about available series properties for each chart type.

### v-ka-highchart Series Data Options

In addition to options set directly on a series itself, there are times when options need to be set individiually on each data value in the series (i.e. color, radius, etc.).  See [`series.line.data`](https://api.highcharts.com/highcharts/series.line.data) for an example, but each chart/series type may have its own specific set of properties that can be assigned on data values.  To assign those properties, columns are added to the 'data' table in the format of `point.seriesX.property` where `seriesX` matches the series column header and `property` is the name of the configuration property.  `point` is a hard coded string indicating that this is a 'data' configuration value.

Example of settings colors for a pie chart.

category | series1 | point.series1.color
---|---|---
config&#x2011;name | score
config&#x2011;type | type
config&#x2011;innerSize | 50%
score | 43 | green
nonScore | 57 | #eeeeee

### v-ka-highchart Property Value Parsing

Value columns used to set the Highcharts API option values allow for several different formats of data that are then converted into different types of properties values.

Value&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | API&nbsp;Value&nbsp;Type | Description
---|---|---
`blank` or `null` | `undefined` | If no value or value of `null` (case insensitive) is returned, `undefined` will be assigned to the property value.
numeric | numeric | If the value returned can be parsed into a number, a numeric value will be assigned to the property value.
`true` or `false` | boolean |  If a value of `true` or `false` (case insensitive) is returned, a `boolean` value will be assigned to the property value.
`json:{ name: value }` | object | If a value starting with `json:` is returned, the json text will be parsed and the resulting object will be assigned to the property value.
`resource:key` | string | If a value starting with `resource:` is returned, the resource information will be passed to [getLocalizedString](#ikatappgetlocalizedstring) and the resulting string will be assigned to the property value.
`eval [1,2]` | any | If a value starting with `eval ` is returned, the text following the `eval` prefix is _parsed and evaluated_ as Javascript and the resulting value (can be any type) is assigned to the property value.  In the example shown here, an integer array of `[1,2]` would be assigned to the property.  Assigning properties of type array are most common use of this syntax.
`function () { ... }` | function: any | For API properties that can be assigned a function, if a value starting with `function ` is returned, it will be parsed as a valid function and assigned to the property.

### v-ka-highchart Language Support

The 'culture' of the table can be set via the CalcEngine.  If the results have a `variable` row with `id` of 'culture', then the language preference will be set to the `value` column of this row.  This enables culture specific number and date formatting and is in the format of `languagecode2-country/regioncode2`.  By default, `en-US` is used.

## v-ka-attributes

The `v-ka-attributes` directive is a helper directive that takes a key/value space delimitted `string` of attributes to apply to the current element.

```javascript
row: {
    "@id": "123",
    attributes: "data-show=\"profile1\" data-context=\"profile\""
}
```

```html
<div v-ka-attributes="row.attributes"></div>
<!-- Renders... -->
<div data-show="profile1" data-context="profile"></div>
```

## v-ka-needs-calc

The `v-ka-needs-calc` directive helps brige the gap between UI 'button state' and the RBLe Framework calculations and can be applied to `button` or `a` elements.  Inputs typically do not trigger a calculation until the `change` event (which normally triggers when an input loses focus).  When a screen has a series of inputs, then a submit button at the bottom, often users will fill in the last input value, then 'attempt' to click the submit button.

Attempt is in quotes because when the user 'thinks' they click the button, they actually trigger the `change` event of the last input (the currently active input) which triggers a calculation.  Most Kaml Views will have some sort of UI blocker that enables during calculation and this will 'block' the users click attempt.  So it appears to the user as though they have to click twice to make the submit function correctly.

A worse scenario is when a page with inputs and a submit button *also display calculation results* that are providing the user information to confirm before submitting the transaction.  With the same flow, when the user edits the last input but has not triggered the `change` event via a loss of focus, the 'information' on the screen is out of sync with the input values, however, the user may assume that the information is accurate and is attempting to submit based on the information displayed.  Most likely the 'two clicks to function' scenario described above will occur, but the user may not notice that the 'information' has updated after the calculation and simply clicks on the submit again.

To aleviate this issue, the Kaml Views can decorate 'submit buttons' with a `v-ka-needs-calc` attribute which will ultimately take advantage of the [state.needsCalculation](#istateneedscalculation) property.  The directive can be applied with or without a value.  When a value is provided, it is the label of the 'cloned button' (otherwise `Refresh` is the default label).  An example will better illustrate this.

```html
<a v-ka-needs-calc href="#" class="btn btn-primary btn-sm" @click.prevent="console.log('save inputs')">Save Inputs</a>

<!-- 
    KatApp Framework Changes this to:
    1. Adds v-if="!needsCalculation" and removes the v-ka-needs-calc attribute
    2. Clones the element 
        a. Removes any @click.* events 
        b. Assigns the 'text' of the button
        c. Adds v-if="needsCalculation"
 -->
<a v-if="!needsCalculation" href="#" class="btn btn-primary btn-sm" @click.prevent="console.log('save inputs')">Save Inputs</a>
<a v-if="needsCalculation" href="#" class="btn btn-primary btn-sm">Refresh</a>
```

After KatApp Framework has created the required directives and elements, when a user is on a form and 'edits' an input, but has not triggered a `change` event yet, the `needsCalculation` property will be true, so the original 'submit button' will be removed, while the cloned element (that is just a place holder to hint to the user to click so that a calculation is run) is displayed.  Given the label says `Refresh` it is more apparent to the user that they will trigger a calculation and review the results before clicking submit.

```html
<a v-ka-needs-calc="Click to Refresh" href="#" class="btn btn-primary btn-sm" 
    @click.prevent="console.log('save inputs')">Save Inputs</a>

<!-- When a value is provided in the directive, that text is used as the label of the button -->
<a v-if="!needsCalculation" href="#" class="btn btn-primary btn-sm" @click.prevent="console.log('save inputs')">Save Inputs</a>
<a v-if="needsCalculation" href="#" class="btn btn-primary btn-sm">Click to Refresh</a>
```

## v-ka-inline

The `v-ka-inline` directive is responsible for taking HTML markup and rendering it 'inline' without any container element.  

Normally to render HTML, a Kaml View would use `<div v-html="row.html"></div>`.  The problem with this is that the `div` container will be rendered and that may not be allowed based on current HTML or CSS rules.  The other way to attempt to render content without a container is to simply sprinkle the `v-text` shorthand syntax of `{{ row.html }}` in the Kaml View.  The problem with this approach, as stated earlier, is that `v-text` will HTML encode the content instead of rendering raw markup. 

The use of `v-ka-inline` directive can solve this problem.  This directive has no content.  Simply decorate an element with the directive name. Using `v-ka-inline` is especially useful when the HTML string to render is a HTML table row (`<tr>`) which must be direct descendant of `<tbody>`, `<thead>`, or `<tfoot>` but those elements are manually coded in the Kaml View markup and the CalcEngine only returns one or more `<tr>` HTML strings.

```javascript
// Assuming the following iteration row
row: {
    html: "<p>Working at Conduent is <b>awesome</b>!</p>"
}
```

```html
<template v-for="row in rbl.source('ret-estimate-outputs')">
    <div v-html="row.html"></div>
</template>
<!-- Renders following but we don't want the div wrapper. -->
<div><p>Working at Conduent is <b>awesome</b>!</p></div>

<template v-for="row in rbl.source('ret-estimate-outputs')">
    {{ row.html }}
</template>
<!-- Renders following but the html is encoded. -->
&lt;p&gt;Working at Conduent is &lt;b&gt;awesome&lt;/b&gt;!&lt;/p&gt;

<template v-for="row in rbl.source('ret-estimate-outputs')">
    <div v-html="row.html" v-ka-inline></div>
</template>
<!-- Renders -->
<p>Working at Conduent is <b>awesome</b>!</p>

<!-- Can be used on <template> elements too -->
<template v-for="row in rbl.source('ret-estimate-outputs')">
    <template v-html="row.html" v-ka-inline></template>
</template>
<!-- Renders -->
<p>Working at Conduent is <b>awesome</b>!</p>
```

## v-ka-rbl-no-calc

The `v-ka-rbl-no-calc` directive is a 'marker' directive (no model/attribute value) that can be assigned to any HTML element to indicate that any contained inputs should not trigger a RBLe calculation on change.  Inputs typically trigger a calculation on the `change` event (which normally triggers when an input loses focus).  If all RBLe calculations should be supressed until an entire form is completed and a 'submit button' is clicked, then `v-ka-rbl-no-calc` can be applied.

To trigger the calculation manually, the [`IKatApp.calculateAsync`](#ikatappcalculateasync) method will need to be called.

The `v-ka-rbl-no-calc` directive has the same effect as the [`IKaInputModel.isNoCalc` property](#v-ka-input-model) when it returns `true`.

```html
<!-- Don't trigger a calculation when inputs change.  Wait until the 'Use Values' button is clicked and the 'closeWorksheetAsync' manually triggers 'calculateAsync' -->
<div class="card" v-ka-rbl-no-calc>
	<div class="card-header"><h4 class="card-title">Advanced Annual Future Pay Increase Rates</h4></div>
	<div class="card-body">
		<div class="row">
			<div v-ka-input="{ name: 'iPayIncreaseYear1', template: 'input-textbox-nexgen', label: 'Year' }" class="col-sm-6"></div>
			<div v-ka-input="{ name: 'iPayIncreaseRate1', template: 'input-textbox-nexgen', label: 'Rate', suffix: '%' }" class="col-sm-6"></div>
			<div v-ka-input="{ name: 'iPayIncreaseYear2', template: 'input-textbox-nexgen', label: 'Year' }" class="col-sm-6"></div>
			<div v-ka-input="{ name: 'iPayIncreaseRate2', template: 'input-textbox-nexgen', label: 'Rate', suffix: '%' }" class="col-sm-6"></div>
			<div class="col-12">
				<button @click.prevent="model.worksheet = undefined" type="button" class="btn btn-primary btn-default">Cancel</button>
				<button @click.prevent="handlers.closeWorksheetAsync" type="button" class="btn btn-primary btn-default">Use Values</button>
			</div>
		</div>
	</div>
</div>
```

## v-ka-rbl-exclude

The `v-ka-rbl-no-calc` directive is a 'marker' directive (no model/attribute value) that can be assigned to any HTML element to indicate that any contained inputs should not trigger a RBLe calculation on change **and** should never be submitted to an RBLe calculation.  

The `v-ka-rbl-exclude` directive has the same effect as the [`IKaInputModel.isExcluded` property](#v-ka-input-model) when it returns `true`.

```html
<!-- 
	All inputs below are *not* associated with RBLe.  They do not trigger a calc nor are they passed to any RBLe calculation.  This scenario occurs
	when Kaml Views are doing all input/UI logic via javascript/reactivity and do not need any logic/calculation provided from CE.
 -->
<div class="card" v-ka-rbl-exclude>
	<div class="card-header"><h4 class="card-title">Advanced Annual Future Pay Increase Rates</h4></div>
	<div class="card-body">
		<div class="row">
			<div v-ka-input="{ name: 'iPayIncreaseYear1', template: 'input-textbox-nexgen', label: 'Year' }" class="col-sm-6"></div>
			<div v-ka-input="{ name: 'iPayIncreaseRate1', template: 'input-textbox-nexgen', label: 'Rate', suffix: '%' }" class="col-sm-6"></div>
			<div v-ka-input="{ name: 'iPayIncreaseYear2', template: 'input-textbox-nexgen', label: 'Year' }" class="col-sm-6"></div>
			<div v-ka-input="{ name: 'iPayIncreaseRate2', template: 'input-textbox-nexgen', label: 'Rate', suffix: '%' }" class="col-sm-6"></div>
			<div class="col-12">
				<button @click.prevent="model.worksheet = undefined" type="button" class="btn btn-primary btn-default">Cancel</button>
				<button @click.prevent="handlers.closeWorksheetAsync" type="button" class="btn btn-primary btn-default">Use Values</button>
			</div>
		</div>
	</div>
</div>
```

## v-ka-unmount-clears-inputs

The `v-ka-unmount-clears-inputs` directive is a 'marker' directive (no model/attribute value) that can be assigned to any HTML element to indicate that any contained [`v-ka-input`](https://github.com/terryaney/nexgen-documentation/blob/main/KatApp.Vue.md#v-ka-input) elements are removed from the DOM, the associated [`state.inputs`](https://github.com/terryaney/nexgen-documentation/blob/main/KatApp.Vue.md#istateinputs) value is also removed.

The `v-ka-unmount-clears-inputs` directive has the same effect as the [`IKaInputModel.clearOnUnmount` property](#v-ka-input-model) when it returns `true`.

Using `v-ka-unmount-clears-inputs` is useful if a `v-for` generates `v-ka-inputs` with dynamic names based on the `v-for` iterator properties and when new data changes the `v-for` source data which completely changes the list of inputs and their IDs, but any previous IDs that weren't replaced by new data source would cause problems for CalcEngine.

```html
<!-- 
	When model.showPayIncreases becomes true, all iPay* inputs will be injected into application.state.inputs.  When showPayIncreases becomes
	false, and Vue removes this element from the DOM, the `v-ka-unmount-clear-inputs` instructs KatApp to remove all the iPay* inputs from
	state.inputs object.
 -->
<div class="card" v-ka-unmount-clears-inputs v-if="model.showPayIncreases">
	<div class="card-header"><h4 class="card-title">Advanced Annual Future Pay Increase Rates</h4></div>
	<div class="card-body">
		<div class="row">
			<div v-ka-input="{ name: 'iPayIncreaseYear1', template: 'input-textbox-nexgen', label: 'Year' }" class="col-sm-6"></div>
			<div v-ka-input="{ name: 'iPayIncreaseRate1', template: 'input-textbox-nexgen', label: 'Rate', suffix: '%' }" class="col-sm-6"></div>
			<div v-ka-input="{ name: 'iPayIncreaseYear2', template: 'input-textbox-nexgen', label: 'Year' }" class="col-sm-6"></div>
			<div v-ka-input="{ name: 'iPayIncreaseRate2', template: 'input-textbox-nexgen', label: 'Rate', suffix: '%' }" class="col-sm-6"></div>
			<div class="col-12">
				<button @click.prevent="model.worksheet = undefined" type="button" class="btn btn-primary btn-default">Cancel</button>
				<button @click.prevent="handlers.closeWorksheetAsync" type="button" class="btn btn-primary btn-default">Use Values</button>
			</div>
		</div>
	</div>
</div>
```

## v-ka-nomount

When using `v-ka-input` or [input templates](#input-templates), all 'discovered' inputs are automatically processed when they are mounted (rendered) or unmounted (removed from the page) to ensure that the KatApp [`state.inputs`](#istate-properties) are properly synchronized and additionally HTML DOM events are attached for default behaviors needed to handle RBLe Framework calculations.

There are some situations where **inputs should not be automatically processed** (i.e. if a view/template has hidden inputs that are for internal use only - i.e. file upload templates).  When an input should **not** be processed, the `v-ka-nomount` attribute can be applied to the input.

During the mounting of a KatApp input the following occurs:

1. The input `name` attribute is set appropriately to the [`scope.name`](#ikainputscopename).
1. The `scope.name` is added to the input's `classList`.
1. If the input (or a container of the input) does *not* contain the `rbl-exclude` class
    1. The input value will be assigned from the [`scope.value`](#ikainputscopevalue) (if provided), or
    1. `state.inputs` are initialized with the current value from markup (if there is one).
1. DOM events are attached
    1. All Inputs
        1. On 'change' (i.e. any modification to the input value)
            1. Remove an [`state.errors`](#istateerrors) associated with the input.
            1. Set [`state.needsCalculation`](#istateneedscalculation) to `true`.
        1. On 'update', syncronize `state.inputs` if `rbl-exclude` class is not used.
        1. On 'update', trigger RBLe Calculation if `rbl-skip` class is not used and [`scope.noCalc`](#ikainputscopenocalc) is `false`.
        1. On `update`, set `state.needsCalculation` to `false`.
        1. On `update`, trigger [`scope.noCalc`](#ikainputscopenocalc) event.
        1. Attach any events provided in the [`model.events`](#ikainputmodelevents) property.
    1. Specific Input Processing
        1. Date Inputs ([`scope.type`](#ikainputscopetype) is `date`)
            1. The `state.inputs` are only assigned a valid date or `undefined` and not each time a keypress occurs.
            1. When `state.inputs` are set, a `value-ka` event is triggered for Kaml Views to catch as needed.
        1. Range Inputs (`scope.type` is `range`)
            1. Add additional events to handle displaying range value in UI for the user (see [IKaInputModel.type for range Inputs](#ikainputmodeltype-for-range-inputs) for more information).
            1. Watches for a `rangeset.ka` event (triggered via [`application.setInputValue`](#ikatappsetinputvalue)) to update display
        1. Text Inputs (excluding `TEXTAREA`)
            1. When `enter` is pressed, trigger an 'update' event.
			1. Process [`scope.keyboardRegex`](#ikainputscopekeyboardregex) if provided.
            1. Process [`scope.mask`](#ikainputscopemask) if provided.

During the unmounting of a KatApp input the following occurs:

1. If the [`model.clearOnUnmount`](#ikainputmodelclearonunmount) is `true`, the input will be removed from the [`state.inputs`](#istate-properties).
1. If the input, or a container, has a [`v-ka-unmount-clears-inputs`](#v-ka-unmount-clears-inputs) directive, the input will be removed from the `state.inputs`.
    1. Note, since Vue handles [`v-if`](#v-if--v-else--v-else-if) and [`v-for`](#v-for) directives with special 'cloned nodes', if the [`v-ka-unmount-clears-inputs`](#v-ka-unmount-clears-inputs) directive is applied *outside* of these elements, they will not work properly.
    1. [`v-ka-unmount-clears-inputs`](#v-ka-unmount-clears-inputs) directive is useful to use if you can wrap a group of inputs with the class and the inputs themselves will never show and hide based on their `display` property.  For example if a modal has a 'view' mode and 'edit' mode.  The 'edit' mode gets processed and returns the 'view' mode.  If the user wants to edit/create again in the 'edit' mode, you want all the inputs to be cleared after they were hidden/processed.

```html
<!--
    When iAge is removed from DOM because showAgeInputs is set to false, 
    it WILL be removed from state.inputs since the element that 'triggered' the unmount
    is the v-if element and the class is on/within that element.
-->
<div v-if="showAgeInputs" v-ka-unmount-clears-inputs>
    <div v-ka-input="{ name: 'iAge', template: 'age-input' }"></div>
</div>

<!--
    When iAge is removed from DOM because showAgeInputs is set to false, 
    it will NOT be removed from state.inputs because the class is outside the
    'cloned' node that has the v-if on it.
    
    In this situation, the clearOnUnmount property should be set specifically on the v-ka-input model.
-->
<div v-ka-unmount-clears-inputs>
    <div v-if="showAgeInputs">
        <div v-ka-input="{ name: 'iAge', template: 'age-input' }"></div>
    </div>
</div>

<!--
    When iAge is removed from DOM because rbl-input[@id='iAge'].display is set to 0
    it will NOT be removed from state.inputs because the v-ka-input renders its own
    v-if directive inside the div.v-ka-input element and v-ka-unmount-clears-inputs will
    be ouside the 'cloned' node.
    
    In this situation, the clearOnUnmount property should be set specifically on the v-ka-input model.
-->
<div v-ka-unmount-clears-inputs>
    <div v-ka-input="{ name: 'iAge', template: 'age-input' }"></div>
</div>
```

The `<template>` content will be rendered and searched for any `HTMLInputElement`s and automatically have event watchers added to trigger RBLe Framework calculations as needed and well as binding to the [state.inputs](#istate-properties) model. The `<template>` markup will have access to the [scope](#v-ka-input-scope).



# KatApp API

This section describes all the interfaces and their properties, methods and events present in the KatApp Framework.

- [KatApp Static Methods](#katapp-static-methods)
- [IKatAppOptions](#IKatAppOptions)
- [IKatApp](#IKatApp)
    - [IKatApp Properties](#ikatapp-properties)
    - [IKatApp Methods](#ikatapp-methods)
    - [IKatApp Lifecycles](#ikatapp-lifecycles)
    - [IKatApp Events](#ikatapp-events)
- [Supporting Interfaces](#supporting-interfaces)

## KatApp Static Methods

To create and retrieve references to existing KatApps, there are static methods exposed on the `KatApp` interface.

Name | Description
---|---
[`createAppAsync`](#katappcreateappasync) | Asyncronous method to create a new KatApp bound to an `HTMLElement` selected via `selector`.
[`get`](#katappget) | Get access to an existing KatApp.
[`handleEvents`](#katapphandleasync) | Similar to [`IKatApp.handleEvents`](#ikatapphandleevents) and allows for events to be attached to applications.  Used generic javascript libraries that want to attach events to an application, but is have direct access to an application or the application may not be created/available at the time the library wants to register the events.
[`getDirty`](#katappgetdirty) | Returns all currently running KatApps where the [`isDirty`](#istate-properties) flag is `true`.

### KatApp.createAppAsync

`createAppAsync(selector: string, options: IKatAppOptions): Promise<KatApp>`

Asyncronous method to create a new KatApp bound to an `HTMLElement` selected via `selector`.

```javascript
$(document).ready(function () {
	(async () => {
		await KatApp.createAppAsync(
			'.katapp', 
			{ /* options */ } 
		).catch(ex => {
			console.log({ex});
		});
	})();
});
```

### KatApp.get

`get(key: string | Element): KatApp | undefined`

To get access to an existing KatApp, use the `get` method and pass in a 'key'.  The `key` can be the KatApp `selector` or `id` or the `HTMLElement` the KatApp is bound to.

This method is the way Kaml Views get access to the currently running KatApp.

```javascript
(function () {
	/** @type {IKatApp} */
	var application = KatApp.get('{id}');
	// ... additional code
)();
```

Note: This is also the method used to investigate a KatApp during debug sessions in browser developer tools.

### KatApp.handleEvents

`handleEvents(selector: string, configAction: (config: IKatAppEventsConfiguration) => void): void`

Attach events to an application given a known JQuery selector string.  Can be called at any time during the life cycle of a KatApp application, *even before the application has been created and/or mounted*.

When using this method to bind events, *almost always*, the last parameter, `application`, of any given event will be required since these event handlers are often generic and don't necessarily know 'which' application is being handled.

```javascript
(function () {
	// Sample that hooks up global logging for a katapp selector from the host framework's library code.
	// So the host framework *knows* what the main application selector is (.katapp).
	KatApp.handleEvents(".katapp", events => {
		events.calculation = (lastCalculation, application) => {
			const logTitle = lastCalculation?.configuration.CurrentPage ?? application.options.currentPage;
			console.group(logTitle + " KatApp calculation");

			console.log(lastCalculation != undefined && lastCalculation.results.length > 0 ? lastCalculation.results[0] : application.options.manualResults[0]);
		};
	});
)();
```

### KatApp.getDirty

`getDirty(): Array<IKatApp>`

Returns all currently running KatApps where the [`isDirty`](#istate-properties) flag is `true`.  Useful for preventing navigation if anything is dirty.

```javascript
(function () {
	window.addEventListener('beforeunload', e => {
		const dirtyKatApps = KatApp.getDirty();

		// Could walk the dirtyKatApps and look to see if hostApplication != undefined meaning it is a modal or nested as well

		if (dirtyKatApps.length > 0) {
			e.preventDefault();
			e.returnValue = "";
		}
	});
)();
```

## IKatAppOptions

`IKatAppOptions` is used to configure how a KatApp executes.  It is primarily used as a parameter to the [KatApp.createAsync](#katappcreateappasync) method.  

When a Kaml Vew is a nested or modal application, it can use the `application.options` to acess [modalAppOptions](#ikatappoptionsmodalappoptions) or [hostApplication](#ikatappoptionshostapplication) as needed. 

Property | Type | Description
---|---|---
`view` | `string \| undefined` | The name of the Kaml View to use in the KatApp in the format of `folder:name`.  Non-modal KatApps will always pass in a view via `"view": "Channel.Home"`.  The only time `view` is `undefined` is when [application.showModalAsync](#ikatappshowmodalasync) is called and static HTML content is passed in via the [IModalOptions.content](#imodaloptionscontent) or [IModalOptions.contentSelector](#imodaloptionscontentselector).
`calculationUrl` | `string` | Url (usually an api endpoint in Host Environment) where RBLe Framework calculations should be posted to. A common endpoint that is used is `api/rble/sessionless-proxy`.
`katDataStoreUrl` | `string \| undefined` | Url of where to download Kaml View and Template files from if they are not hosted in Host Environment.  If not provided, defaults to `https://btr.lifeatworkportal.com/services/camelot/datalocker/api/kat-apps/{name}/download`
`kamlVerifyUrl` | `string` | Url (api endpoint in Host Environment) where Kaml views requested modal and nested KatApp applications are verified.  If not provided, defaults to `api/katapp/verify-katapp`.
`anchoredQueryStrings` | `string?` | Optional query string that should be merged with every api call.  If not provided, it will use the query string (if any) that is present on the `calculationUrl`.
`debug` | [`IKatAppDebugOptions \| undefined`](#ikatappdebugoptions) | Provide debug configuration used throughout lifetime of KatApp.
`dataGroup` | `string` | The name of the current 'data group' that the user data is tied to.  Used as identification in tracing.
`baseUrl` | `string?` | Optional string to indicate the base url to use before calling api endpoints.  It will be prepended before the `api/`.
`currentPage` | `string` | The name of the current page as it is known in the Host Environment.  If a Kaml View is a shared view for various functionalities, this can be used in Kaml View javascript or a CalcEngine to help distinguish in which 'context' a Kaml View is running.
`userIdHash` | `string` | If the Kaml View is running in the context of a logged in user, a `userIdHash` can be passed in.  This value is used during caching operations that use browser sessionStorage.
`environment` | `string` | The name of the current environment as it is known in the Host Environment. This can be used in Kaml View javascript or a CalcEngine if different functionality needs to occur based on which environment (i.e. DEV, QA, PROD) a Kaml View is running<br/><br/>This value is passed into the RBLe Framework calculations via the `iEnvironment` input.
`requestIP` | `string` | The IP address of the browser running the current KatApp.
`currentUICulture` | `string` | The current culture as it is known in the Host Environment.  This enables culture specific number and date formatting and is in the format of `languagecode2-country/regioncode2`.  The default value is `en-US`.<br/><br/>This value is passed into the RBLe Framework calculations via the `iCurrentUICulture` input.
`inputs` | [`ICalculationInputs`](#icalculationinputs) | The Host Environment can pass in inputs that serve as the default values to inputs rendered in the Kaml View or simply as 'fixed' inputs (if no matching rendered inputs are present that would update them) that will be passed to every RBLe Framework calculation.  This value becomes the initial value for [`IState.inputs`](#istateinputs-icalculationinputs) when the KatApp is created.
`inputCaching` | `boolean` | Whether or not the page inputs are cached after each calculation.  This allows the user to leave a page and come back and the inputs would automatically be retored.  The default is `false`.
`manualResults`<sup>1</sup> | [`Array<IManualTabDef>`](#imanualtabdef) | The Host Environment can pass in 'manual results'.  These are results that are usually generated one time on the server and cached as needed.  Passing manual results to a KatApp removes the overhead needed to perform a RBLe Framework calculation.  
`manualResultsEndpoint` | `string` | Similiar to `manualResults`, if provided, this endpoint could be called to retrieve a `manualResults` object from the Host Environment that is of type [`Array<IManualTabDef>`](#imanualtabdef).  Used to leverage browser caching.
`relativePathTemplates`<sup>2</sup> | `IStringIndexer<string>` | If the Host Environment hosts all its own Kaml Views and Kaml Template files, instead of the KAT CMS, all the relative paths to existing Kaml Template files can be provided, instructing KatApp Framework to request it via relative path.
`resourceStrings` | [`IResourceStrings`](#iresourcestrings) | The Host Environment can pass in 'resource strings'.  This object is usually generated one time on the server and cached as needed and provides the KatApp the ability to localize its strings via the [v-ka-resource](#v-ka-resource) directive or via the [IKatApp.getLocalizedString](#ikatappgetlocalizedstring) method. 
`resourceStringsEndpoint` | `string` | Similiar to `resourceStrings`, if provided, this endpoint could be called to retrieve the `resourceStrings` object from the Host Environment that is of type [`IResourceStrings`](#iresourcestrings).  Used to leverage browser caching.
`relativePathTemplates`<sup>2</sup> | `IStringIndexer<string>` | If the Host Environment hosts all its own Kaml Views and Kaml Template files, instead of the KAT CMS, all the relative paths to existing Kaml Template files can be provided, instructing KatApp Framework to request it via relative path.
`modalAppOptions` | [`IModalAppOptions`](#imodalappoptions) | Read Only; When a KatApp is being rendered as a modal ([v-ka-modal](#v-ka-modal)) application, the KatApp Framework will automatically assign this property; a [IModalAppOptions](#imodalappoptions) created from the [IModalOptions](#imodaloptions) parameter passed in when creating modal application.<br/><br/>This property is not accessed often; `modalAppOptions` is accessed when a Kaml View, launched as a modal, needs to call `modalAppOptions.cancelled` or `modalAppOptions.confirmedAsync`.
`hostApplication` | [`IKatApp`](#ikatapp) | Read Only; When a KatApp is being rendered as a nested ([v-ka-app](#v-ka-app)) or modal ([v-ka-modal](#v-ka-modal)) application, the KatApp Framework will automatically assign this property to a reference of the KatApp application that is creating the nested or modal application.<br/><br/>This property is not acesed often; `hostApplication` is access when a Kaml View needs to call [`KatApp.notifyAsync`](#ikatappnotifyasync).
`katAppNavigate` | `(id: string, props: IModalOptions, el: HTMLElement) => void \| undefined` | To allow navigation to occur from within a KatApp (via [v-ka-navigate](#v-ka-navigate)), a reference to a javascript function must be assigned to this property. The KatApp Framework will call this function (created by the Host Environment) when a navigation request has been issued.  It is up to the Host Environment's javascript to do the appropriate processing to initiate a successful navigation.
`encryptCache` | `(data: object) => string \| Promise<string>` | RBL results are cached in browser storage.  This delegate allows the client to provide a JavaScript function that will encrypt the data before storing the results.  By default, the results are not cached.
`decryptCache` | `(cipher: string) => object \| Promise<object>` | If the RBL results were encrypted before caching in browser storage, this delegate allows the client to provide a JavaScript function that will decrypt the data before returning the results.  By default, the results are not cached.

<sup>1</sup> Not only can the manual results be a RBLe Framework calculation performed on the server, it can also be post processed and modified a bit before passing in to the KatApp or the manual results can be completely generated via server side code without using the RBLe Framework.  As long as the results match the `IManualTabDef` interface, it can be used.

```javascript
"manualResults": [
    { 
        "@calcEngineKey":"BRD",
        "@name":"RBLUser",
        "@type":"ResultXml",
        "@version":"1.0148",
        "@calcEngine":"Conduent_Nexgen_Global_BRD_SE_Test.xlsm",
        "configBenefitCategories": [
            { "@id":"1", "groupId":"1", "text":"Health Benefits" }
        ]
    }
]
```

<sup>2</sup> `relativePathTemplates` is an object in the format of the following:

```javascript
// The 'Rel:' prefix is required and informs KatApp Framework that is is a relative path.
"relativePathTemplates": {
    "Nexgen:Templates.Pension.Shared.kaml" : "Rel:KatApp/NexgenVue/Templates.Pension.Shared.kaml?c=20220920103112",
    "Nexgen:Templates.Profile.Shared.kaml" : "Rel:KatApp/NexgenVue/Templates.Profile.Shared.kaml?c=20221005182346",
    "Nexgen:Templates.Shared.kaml" : "Rel:KatApp/NexgenVue/Templates.Shared.kaml?c=20221011223650"
}									
```

## IKatAppDebugOptions

Optional debugging options that can be used during the development of a KatApp's Kaml View or CalcEngine.

Property | Type | Description
---|---|---
`traceVerbosity`<sup>1</sup> | `TraceVerbosity` | Control the trace output level to display for the current KatApp by assigning desired enum value.  The default value is `TraceVerbosity.None`.
`useTestCalcEngine` | `boolean` | Whether or not the RBLe Framework should the test version of the specified CalcEngine.  A `boolean` value can be passed in or using the querystring of `test=1` will enable the settings.  The default value is `false`.
`useTestView` | `boolean` | Whether or not the KatApp Framework should use the test versions of any requested Kaml Views or Kaml Template Files that are hosted in the KAT CMS instead of by the Host Environment.  A `boolean` value can be passed in or using the querystring of `testview=1` will enable the settings. The default value is `false`.
`showInspector` | `boolean` | Whether or not the KatApp Framework should show diagnostic information for all Vue directives.  When enabled, pressing `CTRL+SHIFT` together will toggle visual cues for each 'Vue enabled' element.  Then you can use the browser 'inspect tool' to view an HTML comment about the element.  A `boolean` value can be passed in or using the querystring of `showinspector=1` will enable the settings.  The default value is `false`.
`debugResourcesDomain` | `string` | Whether or not the KatApp Framework should attempt to find requested Kaml Views or Kaml Template Files from the 'domain' passed in before checking the KAT CMS or Host Environment.  A `string` value providing a local web server address can be provided via `"debugResourcesDomain": "localhost:8887"` to enable the feature.  The default value is `undefined`.<br/><br/>KAT Evolution and Camelot frameworks enable this feature using a `localserver` querystring parameter.  For example, `https://hosted.site.domain/?localserver=localhost:5500` will enable the feature and attempt to find files at `http://localhost:5500/` before checking the KAT CMS or Host Environment.  Kaml files can be partitioned into view.kaml, view.kaml.js, view.kaml.css, and view.kaml.templates to promote single responsibility principle.<br/><br/>Using `debugResourcesDomain` supports this as well, however it makes individual requests for each file if the original Kaml file does not have a `<script/>` or `<style/>` section present.  If additional files are required to create the Kaml package, the `local-kaml-package` attribute must be set on the `<rbl-config/>` element.  See [Configuring CalcEngines and Template Files](#configuring-calcengines-and-template-files) for more information.

<sup>1</sup> `TraceVerbosity` is defined as the following.

```typescript
enum TraceVerbosity {
	None,
	Quiet,
	Minimal,
	Normal,
	Detailed,
	Diagnostic
}
```

## IKatApp

The `IKatApp` interface represents the KatApp 'application' object that the Kaml View interacts with via method calls and event handlers.

### IKatApp Properties

Property | Type | Description
---|---|---
`el` | `JQuery` |  The `HTMLElement` that is the container for the `IKatApp`.
`options` | [`IKatAppOptions`](#ikatappoptions) | The `IKatAppOptions` that configure the options that control the `IKatApp`.
`isCalculating` | `boolean` | Read Only; Whether or not the KatApp is currently triggering and processing a RBLe Framework calculation.
`lastCalculation` | [`ILastCalculation | undefined`](#ilastcalculation) | Read Only; If a RBLe Framework calculation has previously run, this property will contain a snapshot of the `ILastCalculation` object.
`state` | [`IState`](#istate) | The global state object passed into the Vue application.  Any updates to properties on the `state` object can trigger reactivity.
`selector` | `string` | The JQuery selector string that was used to locate the `HTMLElement` and set the `el` property which hosts the KatApp.

### IKatApp Methods

Name | Description
---|---
[`configure`](#ikatappconfigure) | Allows for the Kaml View to configure the application by augmenting the original application options, providing a custom model, adding event handlers, etc.
[`handleEvents`](#ikatapphandleevents) | Allows for the Kaml View to add additional event handlers to an application.
[`navigateAsync`](#ikatappnavigateasync) | Manually trigger a navigation.
[`calculateAsync`](#ikatappcalculateasync) | Manually call a RBLe Framework calculation.
[`apiAsync`](#ikatappapiasync) | Use an [`IApiOptions`](#iapioptions) and [`ISubmitApiOptions`](#ISubmitApiOptions) object to submit a payload to an api endpoint.
[`showModalAsync`](#ikatappshowmodalasync) | Manually show a modal dialog configured by the [`IModalOptions`](#imodaloptions) parameter.
[`blockUI`](#ikatappblockui) | Indicate that the Kaml View UI should be blocked while performing a long running action.
[`unblockUI`](#ikatappunblockui) | Indicate that the Kaml View UI should no longer be blocked after performing a long running action.
[`allowCalculation`](#ikatappallowcalculation) | Turn on or off a configured CalcEngine from being ran in subsequent calculations.
[`getInputs`](#ikatappgetinputs) | Return a [`ICalculationInputs`](#icalculationinputs) object representing current Kaml View inputs.
[`getInputValue`](#ikatappgetinputvalue) | Get the specified input value based on the input name passed.
[`setInputValue`](#ikatappsetinputvalue) | Set the specified input value based on the input name passed.
[`select`](#ikatappselect) | Select DOM element(s) scoped to the current KatApp.
[`closest`](#ikatappclosest) | Select parent DOM element scoped to the current KatApp.
[`notifyAsync`](#ikatappnotifyasync) | Allow a nested application to send information to its [`hostApplication`](#ikatappoptionshostapplication).
[`debugNext`](#ikatappdebugnext) | Helper method to indicate to the KatApp what debugging features should be used during the next calculation.
[`getTemplateContent`](#ikatappgettemplatecontent) | Returns the 'content' of a requested template.
[`getLocalizedString`](#ikatappgetlocalizedstring) | Returns the localized string of a requested key.

#### IKatApp.configure

**`configure(configAction: (config: IConfigureOptions, rbl: IStateRbl, model: IStringAnyIndexer | undefined, inputs: ICalculationInputs, handlers: IHandlers | undefined) => void): IKatApp`**

The `configure` method can only be called one time and must be called before the Kaml View is 'mounted' by Vue. Allows for the Kaml View to update application options by modifying the `config` parameter.  See [`IConfigureOptions`](#iconfigureoptions) for more information.

This pattern follows a similar configuration action delegate used in .NET Core application setup.

The `rbl`, `model`, `inputs`, and `handlers` parameters are optional, but are passed in to allow access to the application's state properties in a shorthand syntax.

```javascript
/** @type {IKatApp} */
var application = KatApp.get('{id}');

// Optionally update the KatApp options and state.  The configAction delegate passes in
// references to the rbl, model, inputs, and handlers properties from its state.
application.configure((config, rbl, model, inputs, handlers) => { 

	// In any event below, we access 'model' and 'rbl' in the handler.
	// Even though 'configure' is called immediately at application start and 'rbl' and
	// 'model' are empty at the time of the 'configure' call...by the time the rendered event
	// is raised, the references for `rbl` and `model` are up to date and will have appropriate 
	// values.

	config.model = {
	};

	config.options = {
	}
	config.handlers = {
	};

	config.events.initialized = () => {
		// Optionally bind Application Events
		console.log( 'handled' );

		// Can use the current applications state properties via delegate parameters.
		console.log( rbl.value("nameFirst" ) );
		// 'rbl' is equivalent to 'application.state.rbl'.
	};
	config.events.rendered = () => {
		// using 'model' is equivalent to 'application.state.model'
		// using 'rbl' is equivalent to 'application.state.rbl'
		model.eventMessageHeader = rbl.value("eventMessageHeader");
		model.eventMessage = rbl.value("eventMessage");
	}
	
	config.directives = {
	};

	config.components = {
	};
});
```


#### IKatApp.handleEvents

**`handleEvents(configAction: (events: IKatAppEventsConfiguration, rbl: IStateRbl, model: IStringAnyIndexer | undefined, inputs: ICalculationInputs, handlers: IHandlers | undefined) => void): IKatApp`**

Allows for the Kaml View to add additional event handlers to an application via the `events` parameter.  This is similar to the original `configure()` method call and assigning specific events, but is allowed to be called at any time during the application life cycle.

See [`IKatAppEventsConfiguration`](#ikatappeventsconfiguration) for more information.

#### IKatApp.navigateAsync

**`navigateAsync(navigationId: string, options?: INavigationOptions): Promise<void>;`**

Manually trigger a navigation.  The [INavigationOptions](#inavigationoptions) object allows for passing (and optionally persisting) inputs to be passed to the next application.

#### IKatApp.calculateAsync

**`calculateAsync(customInputs?: [ICalculationInputs](#icalculationinputs), processResults?: boolean, calcEngines?: ICalcEngine[]): Promise<ITabDef[] | void>;`**

Manually call a RBLe Framework calculation.  The parameters allow for a list of additional inputs to be passed in, whether or not the results should be [processed](#rbl-framework-result-processing-in-katapp-state) or simply return the raw results and an optional list of `ICalcEngines` to run in place of the KatApp's configured CalcEngines.

#### IKatApp.apiAsync

**`apiAsync(endpoint: string, apiOptions: IApiOptions, trigger?: JQuery, calculationSubmitApiConfiguration?: ISubmitApiOptions): Promise<IStringAnyIndexer | undefined>;`**

Use an [`IApiOptions`](#iapioptions) and [`ISubmitApiOptions`](#ISubmitApiOptions) object to submit a payload to an api endpoint and return the results on success. KatApps have the ability to call web api endpoints to perform actions that need server side processing (saving data, generating document packages, saving calculations, etc.).  All api endpoints should return an object indicating success or failure.

See [`v-ka-api`](#v-ka-api) and [`IApiOptions` interface](#iapioptions) for more information.

Api endpoints can return an `IApiErrorResponse` response either due to validation issues or unhandled exceptions on the server. When an api endpoint fails, the response object implements the following interface:

```javascript
interface IApiErrorResponse {
	Validations: Array<{ ID: string, Message: string }> | undefined;
	ValidationWarnings: Array<{ ID: string, Message: string }> | undefined;
	Result: IStringAnyIndexer;
}
```

If `apiAsync` receives this error response, it will throw an `ApiError` exception (`ApiError` extends the base `Error` class).

Note: There are API Endpoint lifecycle events that are triggered during the processing of an api endpoint.  See [API Lifecycle Events](#api-lifecycle) for more information.

##### ApiError.message

Property Type: `string`  
The message of the error.

##### ApiError.stack

Property Type: `string | undefined`  
The current call stack when the exception occurred (if present).

##### ApiError.innerException

Property Type: `Error | undefined`  
If an unexpected exception occurred, `innerException` will be set to the original exception thrown.

##### ApiError.apiResponse

Property Type: `IApiErrorResponse | undefined`  
If the api endpoint returned a failure response, the `apiResponse` will be set to the original response.

#### IKatApp.showModalAsync

**`showModalAsync(options: IModalOptions, triggerLink?: JQuery): Promise<{ confirmed: boolean; response: any; }>;`**

Manually show a modal dialog configured by the [`IModalOptions`](#imodaloptions) parameter and return an object indicating whether or not it was confirmed and the response returned (in both the 'confirmed' and 'cancelled' scenarios).

If a `triggerLink` is provided, the link will be disabled while the modal dialog is shown and re-enabled when hidden.

`showModalAsync` can throw exceptions.

See [`v-ka-modal`](#v-ka-modal) and [`IModalOptions` interface](#imodaloptions) for more information.

#### IKatApp.blockUI

**`blockUI(): void`**

In the simplest sense, the UI is blocked during a calculation and unblocked when complete or blocked when an api submission starts and unblocked when complete.  However, since some actions might trigger a calculation and an api submission, UI blocking and unblocking is actually like a publisher/subscriber relationship where `blockUI()` can be called (published to) multiple times and the UI will only be unblocked if `unblockUI()` is called the same number of times.

#### IKatApp.unblockUI

**`unblockUI(): void`**

See [`blockUI`](#ikatappblockui) for more information.

#### IKatApp.allowCalculation

**`allowCalculation(ceKey: string, enabled: boolean): void`**

Turn on or off a configured CalcEngine from being ran in subsequent calculations.  Only CalcEngines whose current `enabled` value is `true` will be processed when a calculation is triggered.

#### IKatApp.getInputs

**`getInputs(customInputs?: ICalculationInputs): ICalculationInputs;`**

Return a [`ICalculationInputs`](#icalculationinputs) object that represent the union of the current UI inputs along with the `customInputs` pass in (if any).

#### IKatApp.getInputValue

**`getInputValue(input: string, allowDisabled?: boolean): string | undefined;`**

Get the current input value of the input name passed in by inspecting the raw HTML markup/elements versus the [`state.inputs`](#istate-properties) object.

By default, `allowDisabled` is `false`, but if `true` is passed in, and the input element is disabled, the method returns `undefined`.

#### IKatApp.setInputValue

**`setInputValue(name: string, value: string | undefined, calculate?: boolean): JQuery | undefined;`**

Given and input `name` and `value`, set the value of the HTML element and the value in the [`state.inputs`](#istate-properties). If `value` is undefined, the input name and property will be removed from `state.inputs`.

By default, `calculate` is `false` so that setting input values does not trigger a calculation and Kaml Views can safely set multiple input values without a calculation. If `true` is passed in, then a RBLe Framework calculation will occur after the input value is applied.

#### IKatApp.select

**`.select(selector: string, context?: JQuery | HTMLElement): JQuery`**

This is a replacement function for jQuery's default `$()` selector method.  It is needed scope the selection within the current KatApp (does not reach outside the KatApp markup) and also prevents selection from selecting **inside** a nested KatApp.

```javascript
// Get all inputs of my application (but none from nested KatApps or outside of my KatApp in container site)
application.select(":input");

// Get all inputs of my application within the address container
var address = application.select(".address")
application.select(":input", address);
```

#### IKatApp.closest

**`.closest(element: JQuery | HTMLElement, selector: string): JQuery`**

This is a replacement function for jQuery's default `$()` selector method.  It is needed scope the selection within the current KatApp (does not reach outside the KatApp markup - either to hosting site or a parent KatApp).

```javascript
var name = application.select(".iName");
var nameLabel application.closest(name, "label");
```

#### IKatApp.notifyAsync

**`notifyAsync(from: KatApp, name: string, information?: IStringAnyIndexer): Promise<void>;`**

`notifyAsync` is a mechanism for a nested application to send information to its [`hostApplication`](#ikatappoptionshostapplication).

```javascript
// Assume this code is inside a nested application and it has a reference to its 'hostApplication'
await hostApplication.notifyAsync(application, "myNotificationName", { moreData: "dataValue" });
```

For an application to receive this notification, it must have a `IKatAppEventsConfiguration.notification` delegate provided.

#### IKatApp.debugNext

**`debugNext(saveLocations?: string | boolean, serverSideOnly?: boolean, trace?: boolean, expireCache?: boolean): void`**

`debugNext` is a helper method to indicate to the KatApp that during the next *successful* RBLe Framework calculation(s) should have their debug CalcEngines saved to KAT Team's CMS, traced, or version checked. This is helpful to Kaml View or CalcEngine developers to aid in their debugging.  This method is manually invoked via the browser's console window while debugging the site.

`saveLocations` can be a comma delimitted list of KAT Team folder names or multiple calls to `debugNext` can take place before triggering a calculation and acheive the same result.  To clear out all currently specified locations specified, call `debugNext( false )`.

Setting `serverSideOnly` to `true` will only save calculations that occur in the Host Environment's server side code.  This is beneficial if an event handler triggers a calculation *then* posts to an api endpoint (which usually runs an initial RBLe Framework calculation).  If you only want to save the calculation that occurs when processing the api endpoint, setting this parameter to `true` accomplishes that.

Setting `trace` to `true` instructs the RBLe Framework to return detailed trace information inside the calculation results.

Setting `expireCache` to `true` instructs the RBLe Framework to immediately check for an updated CalcEngine from the CalcEngine CMS instead of waiting for the RBLe Framework's CalcEngine cache to expire.

#### IKatApp.getTemplateContent

**`getTemplateContent(name: string): DocumentFragment;`**

`getTemplateContent` returns the 'content' of a requested template.  This can be helpful if the Host Environment needs to render template content outside the context of a KatApp. The most common scenario is when a Host Environment needs to get the content for a `validation-summary` to render errors before a KatApp can finish rendering property.

#### IKatApp.getLocalizedString

**`getLocalizedString(key: string | undefined, formatObject?: IStringIndexer<string>, defaultValue?: string): string | undefined;`**

`getLocalizedString` returns the localized 'content' of the requested requested key based on the KatApp's [`options.currentUICulture'](#ikatappoptionscurrentuiculture).  In the KatApp markup/html, a [v-ka-resource](#v-ka-resource) will be used, but if a localized string is needed inside of a KatApp's `script` section, this method can be used.

The flow for locating a localized string is as follows:

1. Use localized string for full 'languagecode-country/regioncode' if present.
1. Used localized string for 'languagecode' if present.
1. Use localized string for 'en-us' if present.
1. Use localized string for 'en' if present.
1. Use the `key` value when no localized string is found.

**Note**: 'key' can also be a complete json string representation of the model if needed.  Usually when generated from RBLe Framework calculations.  When the `key` is the entire model, there **must** be a `key` property on the model.

```javascript
// Returns string with 'Name.First' key.
application.getLocalizedString('Name.First');

// When no match, key is returned.  The following returns: This is actually the content and the key, if no key matches, this content will be returned.
application.getLocalizedString('This is actually the content and the key, if no key matches, this content will be returned.');

// Token substition is supported too.
// The following returns: Good morning Fred, how are you?
application.getLocalizedString('Good morning {name}, how are you?', { 'name': 'Fred' });

// Returns string with 'Default value for Name First' key when 'Name.First' key value is not found.
application.getLocalizedString('Name.First', undefined, 'Default value for Name First');

// assume rbl.value("greeting") returns { key: 'greeting', name: 'Terry' }
// assume greeting resource is "Good morning {name}, how are you?"
// Returns string with 'Good morning Terry, how are you?'.
application.getLocalizedString(rbl.value('greeting'));
```

See [v-ka-resource samples](#v-ka-resource-samples) for more additional sample patterns.

### IKatApp Lifecycles

There are three main event lifecycles that occur during the life time of a KatApp; the initial 'create application' lifecycle, the 'calculation' lifecycle, and the 'api' lifecycle.

#### Create Application Lifecycle

When a KatApp is being created via the [`KatApp.createAppAsync`](#katappcreateappasync), the following lifecycle occurs.

1. [beforeOpenAsync](#imodaloptions) - if application is a modal application *using* `contentSelector`
1. [initialized](#ikatappinitialized)
1. [modalAppInitialized](#ikatappmodalappinitialized) - if application is a modal application
1. [nestedAppInitialized](#ikatappnestedappinitialized) - if application is a nested application
1. All events in the [Calculation Lifecycle](#calculation-lifecycle) - if any CalcEngines are [configured to all iConfigureUI calculations](#configuring-calcengines-and-template-files)
1. [rendered](#ikatapprendered)
1. [nestedAppRendered](#ikatappnestedapprendered) - if application is a nested application

#### Calculation Lifecycle

When a calculation is initiated via an [input change triggering a calculation](#v-ka-input) or by a Kaml View calling [`application.calculateAsync`](#ikatappcalculateasync), the following lifecycle occurs.

1. [updateApiOptions](#ikatappupdateapioptions) - allow Kaml View to update inputs and configuration used during calculation
1. [calculateStart](#ikatappcalculatestart)
1. [inputsCached](#ikatappinputscached) - allow Kaml View to provide additional inputs/information to cache before caching current inputs (if configured to cache)
1. Success events
    1. [resultsProcessing](#ikatappresultsprocessing) - all Kaml View to inspect and/or modify the calculation results before they are [processed](#rbl-framework-result-processing-in-katapp-state)
    1. All events in [Api Lifecycle](#api-lifecycle) if `jwt-updates` result table is provided and processed
    1. [configureUICalculation](#ikatappconfigureuicalculation) - if current calculation has an input of `iConfigureUI="1"`
    1. [calculation](#ikatappcalculation) - allow Kaml Views to inspect/use the `ILastCalculation`
    1. [domUpdated](#ikatappdomupdated) - allow Kaml Views to process final rendered DOM after reactivity
1. Failure Event
    1. [calculationErrors](#ikatappcalculationerrors) - allow Kaml Views to handle exceptions gracefully
1. [calculateEnd](#ikatappcalculateend)

#### Api Lifecycle

When a submission to an api endpiont is initiated via [`v-ka-api`](#v-ka-api) or by a Kaml View calling [`application.apiAsync`](#ikatappapiasync), the following lifecycle occurs.

1. [updateApiOptions](#ikatappupdateapioptions) - allow Kaml Views to update inputs and configuration used during an api submission
1. [apiStart](#ikatappapistart) - allow Kaml Views to inspect and/or update the payload used during an api submission
1. [apiComplete](#ikatappapicomplete) - allow Kaml Views to inspect/use results from an successful api submission
1. [apiFailed](#ikatappapifailed) - allow Kaml Views to inspect/use error response from a failed api submission

### IKatApp Events

The KatApp framework raises events throughout the stages of different [lifecycles](#ikatapp-lifecycles) allowing Kaml View developers to catch and respond to these events as needed. All event handlers are registered on the application itself via the [`configure` method](#ikatappconfigure) or [`handleEvents` method](#ikatapphandleevents).

#### IKatAppEventsConfiguration

The `IKatAppEventsConfiguration` interface describes all events that are raised by the KatApp framework and are available to be handled via delegates assigned in `configure` or `handleEvents`.

**Note:** When examining the signatures of the functions, due to the javascript language processing, when creating the appropriate delegates, all/any parameters are optional and only required if you plan to use them.  If a delegate had 4 parameters, and you only needed the 4th parameter, then, you would need to include all parameters.  You can only skip unused, trailing parameters.

Name | Description
---|---
[`initialized`](#ikatappinitialized) | Triggered after KatApp Framework has finished initialization.
[`modalAppInitialized`](#ikatappmodalappinitialized) | Triggered on host application after a modal application has been initialized.
[`nestedAppInitialized`](#ikatappnestedappinitialized) | Triggered on host application after a nested application has been initialized.
[`rendered`](#ikatapprendered) | Triggered after Kaml View has been made visible to the user.
[`nestedAppRendered`](#ikatappnestedapprendered) | Triggered on host application after a nested application has been rendered.
[`updateApiOptions`](#ikatappupdateapioptions) | Triggered immediately before submission to server side API calls to allow for Kaml Views to modify inputs or configuration settings before submission.
[`calculateStart`](#ikatappcalculatestart) | Triggered at the start of a RBLe Framework calculation submission.
[`inputsCached`](#ikatappinputscached) | Triggered during a RBLe Framework calculation before inputs are cached to `sessionStorage` allowing for modification if needed.
[`resultsProcessing`](#ikatappresultsprocessing) | Triggered during a RBLe Framework calculation before framework processing of RBLe results allowing for modification of raw results if needed.
[`configureUICalculation`](#ikatappconfigureuicalculation) | Triggered after successful RBLe Framework calculation processing if `iConfigureUI = "1"`.
[`calculation`](#ikatappcalculation) | Triggered after successful RBLe Framework calculation processing.
[`calculationErrors`](#ikatappcalculationerrors) | Triggered when an exception is thrown during RBLe Framework calculation processing.
[`calculateEnd`](#ikatappcalculateend) | Triggered at the completion of a RBLe Framework calculation submission, regardless of success or not.
[`domUpdated`](#ikatappdomupdated) | Triggered to signal the 'end' of a DOM manipulation due to reactivity.
[`apiStart`](#ikatappapistart) | Triggered at the start of an API submission (via [`apiAsync`](#ikatappapiasync)).
[`apiComplete`](#ikatappapicomplete) | Triggered at the *successful* completion of an API submission that is *not* an file download endpoint.
[`apiFailed`](#ikatappapifailed) | Triggered when an exception is thrown during an API submission.
[`notification`](#ikatappnotification) | Triggered after another KatApp notifies the current KatApp via the [`notifyAsync`](#ikatappnotifyasync) method.
[`input`](#ikatappinput) | Triggered whenever a KatApp input has been updated.

#### IKatApp.initialized

**`initialized(application: IKatApp )`**

Triggered after KatApp Framework has finished injecting the Kaml View and any designated template files.  `initialized` can be used to call api endpoints to retrieve/initialize data that has not been obtained by default in the Host Environment.

#### IKatApp.modalAppInitialized

**`modalAppInitialized(modalApplication: IKatApp, hostApplication: IKatApp )`**

This event is triggered after a modal application has been initialized. It allows for a host application to assign events to the modal application if needed or retain a reference to the modalApplication for later use.

```javascript
// Code that shows a modal, and uses all inputs from the modal/irp application

var irpApplication = undefined;

application.handleEvents( events => {
	events.modalAppInitialized = modalApplication => {
	    irpApplication = modalApplication;
	};
});

// This will trigger modalAppInitialized before showing the modal
const response = await application.showModalAsync({ view: 'DST.IRP' }); 

if (response.confirmed) {
    // If we made it this far, irpApplication will have been successfully assigned, grab a reference to its inputs
    // and assign the value to our own inputs.
    const irpInputs = irpApplication.state.inputs;
    application.setInputValue('iRetAge', irpInputs.iRetirementAge);
    application.setInputValue('iSalaryIncrease', irpInputs.iAnnualFuturePayIncreaseRate);
    application.setInputValue('iReplaceRatio', Math.round(Number(irpInputs.iReplaceRatio) * 100 / 5) * 5, true);
}
```

#### IKatApp.nestedAppInitialized

**`nestedAppInitialized(nestedApplication: IKatApp, hostApplication: IKatApp )`**

This event is triggered after a nested application has been initialized. It allows for a host application to assign events to the nested application if needed or retain a reference to the nestedApplication for later use.

```html
<!-- 
    Sample showing a Kaml View turning off ConfigureUI calculations (via configure-ui="false") and waiting until
    a nested application successfully triggers 'configureUICalculation' before calling a `iConfigureUI="1"` calculation.
 -->
<rbl-config templates="NexgenVue:Templates.Shared">
	<calc-engine key="Home" configure-ui="false" name="Conduent_Nexgen_Home_SE" result-tabs="RBLHome"></calc-engine>
</rbl-config>

<script>
application.handleEvents(events => {
	events.nestedAppInitialized = nestedApplication => {
		nestedApplication.handleEvents(nestedEvents => {
			nestedEvents.configureUICalculation = async () => {
				await application.apiAsync( "common/qna", { calculationInputs: { iAction: "get-credit-card-info" } } );
				await application.calculateAsync({ iConfigureUI: "1", iDataBind: "1" });
			};
		});
	};
});
</script>
```

#### IKatApp.rendered

**`rendered(initializationErrors: IValidation[] | undefined, application: IKatApp )`**

Triggered after Kaml View has been made visible to the user (will wait for CSS transitions to complete).  If any errors occurred during the `initialized` event, they will be passed through via the `initializationErrors` parameter.

#### IKatApp.nestedAppRendered

**`nestedAppRendered(nestedApplication: IKatApp, initializationErrors: IValidation[] | undefined, hostApplication: IKatApp )`**

This event is triggered after a nested application has been rendered. It for host application to remove any UI blockers that might have been in place during initialization.  If any errors occurred during the nested application's `initialized` event, they will be passed through via the `initializationErrors` parameter.

```html
<script>
application.handleEvents( events => {
	events.nestedAppRendered = () => {
	    application.select(".nestedApp.ui-blocker").remove();
	};
});
</script>
```

#### IKatApp.updateApiOptions

**`updateApiOptions( submitApiOptions: ISubmitApiOptions, endpoint: string, application: IKatApp )`**

This event is triggered during RBLe Framework calculations immediately before submission to RBLe Framework and/or during api endpoint submission immediately before submitting to the Host Environment.  It allows Kaml Views to massage the [`ISubmitApiOptions.configuration`](#ISubmitApiOptionsconfiguration) or the [`ISubmitApiOptions.inputs`](#icalculationinputs) before being submitted.  Use this method to add custom inputs/tables to the submission that wouldn't normally be processed by the KatApp Framework.

The `endpoint` parameter will contain the endpoint the KatApp Framework is going to submit to.  When processing a RBLe Framework calculation, the url will be the same as [`options.calculationUrl`](#ikatappoptions.calculationurl).

```javascript
application.handleEvents( events => {
	events.updateApiOptions = submitApiOptions => {
		// Create custom coverage table
		var coverageTable = {
			name: "coverage",
			rows: []
		};

		// Loop all inputs that start with iCoverageA- and process them.
		// data-inputname is in form of iCoverageA-id
		// For each input, create a row with id/covered properties
		var inputControlData = application.select("div[data-inputname^=iCoverageA-]");
		inputControlData.each(function (index, element) {
			var id = $(element).data("inputname").split("-")[1];
			var v = $(element).hasClass("active") ? 1 : 0;
			var row = { "id": id, covered: v };
			coverageTable.rows.push(row);
		});
		submitApiOptions.inputs.tables.push(coverageTable);

		submitApiOptions.inputs.iCustomKamlInput = "custom-value";

		// Any other custom properties can be assigned to configuration object that the host environment
		// might be processing (below, Nexgen framework handles cacheRefreshKeys).
		var refreshKeys = [];
		refreshKeys.push("hwCoverages", "hwCoveredDependents");

		if (submitApiOptions.inputs.iConfigureUI == "1") {
			//run once.
			refreshKeys.push("hwEventHistory");
		}

		submitApiOptions.configuration.cacheRefreshKeys = refreshKeys;
	};
});
```

#### IKatApp.calculateStart

**`calculateStart( submitApiOptions: ISubmitApiOptions, application: IKatApp ) => boolean`**

This event is triggered at the start of a RBLe Framework calculation after the `updateApiOptions` has been triggered.  Use this event to perform any actions that need to occur before the calculation is submitted (i.e. custom processing of UI blockers or enabled state of inputs).  If the handler returns `false` or calls `e.preventDefault()`, then the calculation is immediately cancelled and only the `calculateEnd` event will be triggered.

#### IKatApp.inputsCached

**`inputsCached( cachedInputs: ICalculationInputs, application: IKatApp )`**

This event is triggered immediately before inputs are cached to `sessionStorage` (if `options.inputCaching == true`).  It allows Kaml Views to massage the inputs before being cached if needed.

#### IKatApp.resultsProcessing

**`resultsProcessing( results: Array<ITabDef>, inputs: ICalculationInputs, submitApiOptions: ISubmitApiOptions, application: IKatApp )`**

This event is triggered during a RBLe Framework calculation _after a successful calculation_ from the RBLe Framework and _before [KatApp Framework result processing](#rbl-framework-result-processing-in-katapp-state)_.  This handler allows Kaml Views to manually push 'additional result rows' into a calculation result table.

```javascript
application.configure((config, rbl) => {
	config.events.resultsProcessing = (results, inputs) => {
		// Push 'core' inputs into rbl-value for every CalcEngine if they exist
		// in this global handler instead of requiring *every* CalcEngine to return these.
		rbl.pushTo(results[0], "rbl-value",
			[
				{ "@id": "currentPage", "value": inputs.iCurrentPage || "" },
				{ "@id": "parentPage", "value": inputs.iParentPage || "" },
				{ "@id": "referrerPage", "value": inputs.iReferrer || "" },
				{ "@id": "isModal", "value": inputs.iModalApplication || "0" },
				{ "@id": "isNested", "value": inputs.iNestedApplication || "0" }
			]
		);
	};
});
```

#### IKatApp.configureUICalculation

**`configureUICalculation( lastCalculation: ILastCalculation, application: IKatApp )`**

This event is triggered during RBLe Framework calculation _after a successful calculation and result processing_ and _only_ for a calculation where `iConfigureUI == "1"`.  The `configureUICalculation` event is a one time calculation event and can be used to finish setting up Kaml View UI where logic is dependent upon the first calculation results being processed.

#### IKatApp.calculation

**`calculation( lastCalculation: ILastCalculation, application: IKatApp )`**

This event is triggered during RBLe Framework calculation _after a successful calculation and result processing_ (even if the calculation has `iConfigureUI == "1"`).  Use this handler to process any additional requirements that may be dependent on calculation results.

Note: If calculation contains 'jwt data updating' instructions all the standard [API Lifecycle events](#api-lifecycle) will occur with the `endpoint` being set to `rble/jwtupdate`.

#### IKatApp.calculationErrors

**`calculationErrors( key: string, exception: Error | undefined, application: IKatApp )`**

This event is triggered during RBLe Framework calculation if an exception happens.  Use this handler to clean up an UI components that may need processing when calculation results are not available.

The `key` parameter can be `SubmitCalculation`, `SubmitCalculation..ConfigureUI`, `ProcessDocGenResults`, or `ProcessDataUpdateResults` to identify which stage of the [calculation lifecycle](#calculation-lifecycle) failed.

Note: If calculation contains 'jwt data updating' instructions and an exception occurs during the processing of those instructions an [`apiFailed`](#ikatappapifailed) event will be triggered in addition to `calculationErrors`.  

#### IKatApp.calculateEnd

**`calculateEnd( application: IKatApp )`**

This event is triggered to signal the 'end' of a RBLe Framework calculation regardless of whether the calculation succeeds, fails, or is cancelled.  Use this event to perform any actions that need to occur after a calculation is completely finished (i.e. UI blockers, processing indicators, etc.).

#### IKatApp.domUpdated

**`domUpdated( elements: Array<HTMLElement>, application: IKatApp )`**

This event is triggered to signal the 'end' of a DOM manipulation due to reactivity ([`v-if`](#v-if--v-else--v-else-if) or [`v-for`](#v-for) processed) or after the inital rendering of a KatApp.  Use this event to perform any DOM processing after Vue and the KatApp framework has finished all rendering/manipulations (i.e. attaching events to rendered objects, updating DOM elements that are *not* decorated with @vue:mounted events, etc.).

#### IKatApp.apiStart

**`apiStart( endpoint: string, submitData: ISubmitApiData, trigger: JQuery<HTMLElement> | undefined, apiOptions: IApiOptions, application: IKatApp ) => boolean`**

This event is triggered immediately before submitting the to an api endpoint.  This handler could be used to modify the `submitData` if required.  If the handler returns `false` or calls `e.preventDefault()`, then the api endpoint submission is immediately cancelled.

The `submitData` parameter is the payload that is submitted to the api endpoint and is just a 'reorganization' of existing properties/objects that exist in the KatApp Framework.

```javascript
interface ICalculationInputTableRow extends ITabDefRow {
	index: string;
}
interface ISubmitApiData {
	inputs: ICalculationInputs;
	inputTables?: Array<{ Name: string, Rows: Array<ICalculationInputTableRow>; }>;
	configuration: ISubmitApiConfiguration;
}
```

#### IKatApp.apiComplete

**`apiComplete( endpoint: string, successResponse: IStringAnyIndexer | undefined, trigger: JQuery<HTMLElement> | undefined, apiOptions: IApiOptions, application: IKatApp )`**

This event is triggered upon successful submission and response from the api endpoint that **is not** an endpoint that generates 'file download'.

```javascript
application.handleEvents(events => {
	events.apiComplete = async () => {
		// Recalculate after data has been updated on server, and show the action button to submit CC payment
		await application.calculateAsync();
		application.select(".credit-card-action-button").removeClass("d-none");
	};
});
```

#### IKatApp.apiFailed

**`apiFailed( endpoint: string, errorResponse: IApiErrorResponse, trigger: JQuery<HTMLElement> | undefined, apiOptions: IApiOptions, application: IKatApp )`**

This event is triggered when submission to an api endpoint fails.  The `errorResponse` object will have a `Validations` property that can be examined for more details about the cause of the exception. See [IKatApp.apiAsync](#ikatappapiasync) for more information on the `IApiErrorResponse` interface.

```javascript
application.handleEvents(events => {
	events.apiFailed = endpoint => {
		// Show a save error message if jwt update instructions failed
		if (endpoint == "rble/jwtupdate") {
			application.select(".saveError").show(500).delay(3000).hide(500);
		}
	};
});
```

#### IKatApp.notification

**`notification: (name: string, information: IStringAnyIndexer | undefined, from: IKatApp)`**

The 'notification' delegate is invoked when another KatApp wants to notify this application via the [`notifyAsync`](#ikatappnotifyasync) method.  Usually this is used as a mechanism for nested or modal applications to communicate back to their host application.

**Nested Application Configuration**
```javascript
/** @type {IKatApp} */
var application = KatApp.get('{id}');
application.configure(config => {
	config.handlers.cancel = () => {
		application.options.hostApplication.notifyAsync(
			application,
			"NestedCancelled",
			{ ExtraInfo: "Value" }
		);
	};
});
```

**Host Application Configuration**
```javascript
/** @type {IKatApp} */
var application = KatApp.get('{id}');
application.configure(config => {
	config.events.notification = (name, information) => {
		if ( name == "NestedCancelled" ) {
			console.log(information["ExtraInfo"]);
		}
	};
});
```

#### IKatApp.input

**`input( name: string, calculate: boolean, input: HTMLElement, scope: IKaInputScope | IKaInputGroupScope )`**

This event is triggered whenever a KatApp input has been updated.  It is a 'catch all' event that allows an application to bind a single event handler on the KatApp when all (or almost all inputs) on the page will use the same event handler.  The same goal could be accomplished via a [`IKaInputModel.events.input` delgate](#v-ka-input-model).


## Supporting Interfaces

In addition to the primary `IKatApp` and `IKatAppOptions` interfaces, there are supporting interfaces that Kaml View developers will not necessarily declare, but rather are interfaces for properties or parameters on the main interface methods that are used.

### IStringIndexer / IStringAnyIndexer

`IStringIndexer<T>` is internal KatApp Framework type but worth mentioning as it is used in this documentation.  It is synonomous with a C# `Dictionary` object or 'key/value' pair object.  `T` describes the type of *values* stored in the object.  Therefore, `IStringAnyIndexer` is just shorthand for `IStringIndexer<any>`. This class is used to define dynamic objects of unknown property listings.

```javascript
const stringValueObj: IStringIndexer<string> = {};
{
    "PropA": "ValueA", // valid
    "PropB": 123, // invalid
    "PropC": { // invalid
        "PropD": "ValueB"
    }
}

// All property types are valid
const anyValueObj: IStringAnyIndexer = {};
{
    "PropA": "ValueA",
    "PropB": 123,
    "PropC": {
        "PropD": "ValueB",
        "PropE": true
    }
}
```

### IValidation

`IValidation` normally maps to a result row (from `error` or `warning` table) from a calculation, but can also be manually created by the KatApp Framework or Kaml View.

Property | Type | Description
---|---|---
`@id` | `string` | The 'id' associated with the validation.  There are three different usage scenarios for `@id`.<br/><br/>1. The most common scenario is the name of the input that caused the validation.<br/>2. If the validation is associated with multiple inputs, `@id` can be a comma delimited list of input IDs causing the validation.<br/>3. If the validation is **not** associated with a specific input, then any `@id` can be used, but ensure that it is unique if at some point filtering to find this validation is required.<br/><br/>If the `@id` matches the `name` of an [v-ka-input](#v-ka-input) item (or the `name` is one of the comma delimitted items), the `error` or `warning` property of the [v-ka-input Scope](#v-ka-input-Scope), respectively, will be set to the `text` property.  Additionally, the `error` or `warning` will be automatically removed when the input (or one of the inputs in the comma delimitted items) is updated.
`text` | `string` | The text to display for the validation.
`dependsOn` | `string?` | The 'id' of another input (or comma delimitted list) that this validation depends on.  For example, a radio button list where there are different 'child' inputs displayed based on radio selection.  If the `dependsOn` input is updated, any validations that contain that input ID in the `dependsOn` property will automatically be removed.  This is different from using a comma delimitted list in the `id` property because adding an ID(s) to `dependsOn` will not set the `v-ka-input.error` or `v-ka-input.warning` properties of the associated ID(s).

**Note**: All `errors` and `warnings` are automatically removed when the [application.calculateAsync](#calculateAsync) method is called or when the [application.apiAsync](#apiAsync) method is called.  This is to ensure that the user is not presented with stale errors/warnings.  They can also be manually removed by simply setting [application.state.errors](#istate-properties) or [application.state.warnings](#istate-properties) to an empty array.

### INavigationOptions

`INavigationOptions` allows for additional actions to occur during a navigation lifecycle.  The options available are described below.

Property | Type | Description
---|---|---
`inputs` | [`ICalculationInputs`](#icalculationinputs) | If inputs should be passed to the KatApp being navigated to, an `ICalculationInputs` object can be provided.
`persistInputs` | `boolean` | Whether or not to persist the inputs in sessionStorage.  If `true` and the user navigates away from current view and comes back the inputs will automatically be injected into the KatApp.  If `false` and the user navigates away and returns the input values will not longer be present. The default value is `false`.


### ICalculationInputs

`ICalculationInputs` represents an object containing all the inputs that should be sent to a RBL calculation.  Inputs can be passed in during initialization as a property of [`IKatAppOptions`](#IKatAppOptions), as a parameter to the [application.calculateAsync](#calculateAsync) method, or as a model property used by [v-ka-api](#v-ka-api), [v-ka-app](#v-ka-app), [v-ka-modal](#v-ka-modal), or [v-ka-navigate](#v-ka-navigate) directives.

Generally speaking, `ICalculationInputs` is a [IStringIndexer&lt;string>](#istringindexert--istringanyindexer) object with key/value items for each inputs.  However, it also contains 'input tables' as well that can only be set via the [`IKatApp.updateApiOptions` event](#IKatApp.updateApiOptions).  The object can be visualized as follows.

```javascript
{
    // Framework sets this to 1 on Configure UI calc
	"iConfigureUI": "1",
    // Framework sets this to 1 on Configure UI calc
	"iDataBind": "1",
    // Optional; If changing input triggered calculation, this will contain input name
	"iInputTrigger": "iFirstName",
	// Framework sets this to 1 if running via v-ka-app
    "iNestedApplication": "0", 
	// Framework sets this to 1 if running via v-ka-modal
    "iModalApplication": "0", 
	// Only assignable from Kaml Views in updateApiOptions
    "tables": [ 
        {
            "name": "InputTableA",
            "rows": [
                { "key": "A", "value": 1 },
                { "key": "B", "value": 2 }
            ]
        }
    ]
    // The rest of the inputs present on page are added as IStringIndexer<string> properties
    "iPageInput1": "64",
    "iPageInputN": "Conduent"
}
```

**NOTE**: When creating or passing ICalculationInputs, the above javascript object represent the available features.  However, the [state.inputs](#istate-properties) has a built in method of `getNumber( inputId: string ) => number | undefined` what will try to parse the input as a number taking the current cultures decimal place separator into account.  If the value cannot be parsed, `undefined` is returned.

#### ICalculationInputs.getNumber

In addition to the storage of inputs and tables, the `ICalculationInputs` object has a built in method called `getNumber`.

**`getNumber(inputId: string): number | undefined`**

You can call this method to automatically convert textual input (including culture specific handling of the decimal place character) into a numeric value if conversion is possible.  If the conversion fails, it returns `undefined`.

#### ICalculationInputs.getOptionText

In addition to the storage of inputs and tables, the `ICalculationInputs` object has a built in method called `getOptionText`.

**`getOptionText(inputId: string): string | undefined`**

You can call this method to automatically retreive the textual value of the selected options in a `<select/>` input.

### ITabDef

`ITabDef` is the object returned from RBLe Framework calculations for each 'result tab' processed. The properties available on this object represent the result tables (`Array<ITabDefRow>`) returned from the CalcEngine tab.

### ITabDefRow

`ITabDefRow` represents each row in a `ITabDef` table returned from a RBLe Framework calculation.  Note that it is simply a shorthand name for the underlying `IStringIndexer<string>` interface since every value returned from the RBLe Framework is typed as a `string`.  If a 'value' needs to be treated as `number` or `date`, the KatApp Framework or Kaml Views will need to first parse it into the appropriate type.

### IResourceStrings

`IResourceStrings` represents the resource strings available for use by the KatApp.  Its structure is dynamic based on the languages supported, but it should have the following pattern.

```javascript
{
    "lang1": {
        "key1": "lang1 key1 string value",
        "key2": "lang1 key2 string value"
    },
    "lang2": {
        "key1": "lang2 key1 string value",
        "key2": "lang2 key2 string value"
    }
}
```

The object can have 0 to N languages it supports and 0 to N 'key/value' translations.

### IManualTabDef

`IManualTabDef` is the object passed in to KatApp Framework if [IKatAppOptions.manualResults](#ikatappoptionsmanualresults-imanualtabdef--undefined) is passed. It can be viewed as an `ITabDef` except there are a few more properties attached to it to help the KatApp Framework index these results.

#### IManualTabDef.@calcEngineKey

Required: `string`; The key of the CalcEngine.  This key will be the key used in Vue directives when access result tables; similar to the [rbl-config/calc-engine/@key](#configuring-calcengines-and-template-files) property used when configuring KatApp CalcEngines.

#### IManualTabDef.@name

Optional: `string`; The name to use for this result tab.  If `manualResults` has more than one `IManualTabDef`, then Kaml Views will be specifying in Vue directives how to access each specfic tab via the `tab: 'TabName'` property in directive models.

If not provided, a name will be generated with the tab position concatenated with `RBLResult`, i.e. `'RBLResult1'`, `'RBLResult2'`, etc.

### IConfigureOptions

Property | Type | Description
---|---|---
`model` | `any` | Kaml Views can pass in 'custom models' that hold state but are not built from Calculation Results.
`options` | [`IKatAppOptions`](#ikatappoptions) | Kaml Views can provide partial updates to the [`IKatApp.options`](#ikatappoptions) object.  Typically, only inputs or modal templates are updated.
`handlers` | `IHandlers` | Provide an object where each property is a function delegate that can be used with [`v-on`](#v-on) directives.
`components` | `IStringAnyIndexer` | Provide an object where each property is a Vue component that can be used with [`v-scope`](#v-scope) directives.
`directives` | `IStringIndexer<(ctx: DirectiveContext<Element>) => (() => void) \| void>` | Provide an object where each property name is the directive tag name (i.e. `v-*`) and the value is a function delegate that returns a [custom directive](#custom-katapp-directives) that can be used in the Kaml View markup.
`events` | [`IKatAppEventsConfiguration`](#ikatappeventsconfiguration) | A `IKatAppEventsConfiguration` object that can have event handler delegates assigned for each supported KatApp event.


```javascript
application.configure(config => {
    config.options = {
        inputs: {
            iApplicationInput: "value1"
        },
        modalAppOptions: {
            headerTemplate: "header"
        }
    };

	config.inputs = {
		iAdditionalInput: "Value"
	};

	config.handlers = {
		cancel: () => {
			console.log("cancelled");
		},
		saveAsync: async () => {
			await application.apiAsync( /* ... */ );
		}
	};

	config.events.initialized = () => {
		console.log("initialized");
	}
});
```

### IModalOptions

The `IModalOptions` parameter passed in to [IKatApp.showModalAsync](#ikatappshowmodalasync) controls how the modal application is built.  The [v-ka-navigate](#v-ka-navigate) directive can also create a modal confirmation before allowing the navigation to occur by passing in this object as part of the model.

Property | Type | Description
---|---|---
`view` | `string` | If the content for the modal being displayed is generated from a Kaml View, the name of the Kaml View 'id' should be assigned here.  When present, the KatApp Framework calls the `rble/verify-katapp` endpoint to ensure that the current user has access to the view before returning the content for the view.
`content` | `string` | If the content for the modal being displayed is a HTML fragment confirmation message, the HTML markup can be passed directly as a string versus having to build a Kaml View for simple modal confirmations.
`contentSelector`<sup>1</sup> | `string` | If the content for the modal being displayed is generated by the current application, a DOM element selector string can be passed versus having to build a Kaml View. When `contentSelector` is passed, the KatApp Framework will clone the element's content.  Add the attribute `v-pre` if the modal markup should be reactive.
`calculateOnConfirm` | `ICalculationInputs \| boolean` | When a modal application is 'confirmed', using the `calculateOnConfirm` property can instruct the KatApp Framework to automatically run a RBLe Framework calculation.<br/><br/>Setting this property to `true` or providing a [`ICalculationInputs`](#icalculationinputs) object will trigger the automatic calculation.
`labels` | `{ title: string?; cancel: string?; continue: string? }` | Provide custom labels to be used when the KatApp framework builds the modal container.<br/><br/>1. `title` can be provided if the modal should display a title. If not provided, no modal header/title will be displayed.<br/>2. `cancel` can provide a label to use for the 'cancel' button.  Default is `Cancel`.<br/>3. `continue` can provide a label to use for the 'continue' button.  Default is `Continue`.
`css` | `{ cancel: string?; continue: string? }` | Provide custom css to be used when the KatApp framework builds the modal container.<br/><br/>1. `cancel` can provide css to apply to the 'cancel' button.  Default is `btn btn-outline-primary`.<br/>2. `continue` can provide css to apply to the 'continue' button.  Default is `btn btn-primary`.
`size` | `"xl" \| "lg" \| "md" \| "sm" \| undefined` | By default, if a modal is rendering a Kaml View, the size will be `xl`, otherwise `undefined`.  The modal size is based on the value passed in.  See [Bootstrap Modal Sizes](https://getbootstrap.com/docs/5.0/components/modal/#optional-sizes) for more information.
`scrollable` | `boolean` | By default, modal content will not be scrollable; only the *entire* modal dialogis scrollable.  If a modal dialog should have its own vertical scrollbar for its body/content, pass `true`.
`showCancel` | `boolean` | By default, a modal shows both a 'continue' *and* a 'cancel' button.  If the displayed dialog only needs a 'continue' (i.e. confirming a transactional result message), set this value to `true` to hide the 'cancel' button.
`inputs` | [`ICalculationInputs`](#icalculationinputs) | If inputs should be passed to the modal's rendered Kaml View, provide a `ICalculationInputs` object.
`buttonsTemplate`<sup>2</sup> | `string` | By default, KatApp modals will generate a 'continue' and 'cancel' button that are always visible and simply return a `boolean` value indicating whether or not a modal was confirmed.<br/><br/>If a modal is more complex with various stages that influence the behavior (visibility or functionality) of the modal buttons, a template ID can be provided.<br/><br/>See [IModalOptions Template Samples](#imodaloptions-template-samples) for more information.
`headerTemplate` | `string` | By default, KatApp modals simply use the `labels.title` string property to display a 'modal header'.<br/><br/>If a modal is more complex and the header is more than just a text label (i.e. links or inputs), a template ID can be provided as the content to be rendered inside the header.<br/><br/>See [IModalOptions Template Samples](#imodaloptions-template-samples) for more information.

<sup>1</sup> When the `contentSelector` property is provided, but you still want to be able to use Vue directives (especially reactivity and events) in the modal dialog, you can decorate the element matched by `contentSelector` with the Vue directive of `v-pre`.  This results in none of the Vue/KatApp directives processing until the modal is actually displayed.  When the modal starts, it will receive a clone of the host application's `rbl`, `model`, and `handlers` objects. 

<sup>2</sup> When creating your own buttons for a modal application, it is best practice to always apply a `cancelButton` and `continueButton` class to the appropriate buttons as the KatApp framework first tries to trigger a `click` event on those buttons when the `X` in the header is clicked or `ESC` is pressed.  `cancelButton` is clicked if `showCancel` was set to true otherwise `continueButton` is clicked. If additional processing other than simply calling the [`IModalAppOptions.cancelled` or `IModalAppOptions.confirmedAsync` delegates](#imodalappoptions), make sure to apply those buttons.  If the custom toolbar *only* provides a single 'close' button, both classes can be assigned to the button to ensure that it is triggered, this eliminates the need for the caller of the modal to know the internal logic of the buttons and does not need to 'correctly' pass the `showCancel` property.

#### IModalOptions Template Samples

Normally, only the Kaml View itself, being displayed as a modal, knows whether or not a `buttonsTemplate` or `headerTemplate` template ID should be returned.  Therefore, this property can only be set when the modal is initiated and [application.update](#ikatappupdate) is called.

```javascript
(function () {
    var application = KatApp.get('{id}');
    application.update(
        {
            options: {
                modalAppOptions: {
                    headerTemplate: "header",
                    buttonsTemplate: "buttons"
                }
            }
        }
    );
)();
```

Sample template rendering buttons:

1. All Vue directives inside the temlpate have access to application state as normal.
1. The ['modalAppOptions' object](#imodalappoptions) in scope will be valid.
1. Use the 'cancelled' and 'confirmedAsync' methods off of the modalAppOptions object to 'cancel' or 'confirm' the modal.
1. Can use the 'css' and 'labels' properties of modalAppOptions to assign values based options passed in when displaying the modal

```html
<template id="buttons">
	<button 
        type="button" 
        @click="modalAppOptions.cancelled" 
        :class="modalAppOptions.css.cancel" 
        aria-hidden="true">{{modalAppOptions.labels.cancel}}</button>
	<button 
        type="button" 
        @click="modalAppOptions.confirmedAsync" 
        :class="modalAppOptions.css.continue">{{modalAppOptions.labels.continue}}</button>
</template>
 
 <template id="header">
	<div class="row w-100">
		<div class="col-6">
			<div class="form-floating">
				<select class="form-select" id="floatingSelect">
					<option selected>Select</option>
                    <option>July 1, 2017</option>
                    <option>June 1, 2017</option>
				</select>
				<label for="floatingSelect">Pension Check for</label>
			</div>
		</div>
		<div class="col-6 text-end">
			<button
                @click="handlers.downloadDetails" 
                class="btn btn-outline-primary btn-sm me-4" type="button">
                <span class="glyphicons glyphicons-download-alt"></span> Download / Print
            </button>
			<button 
                @click="modalAppOptions.cancelled" 
                type="button" class="btn-close pe-0" 
                aria-label="Close"></button>
		</div>
	</div>
</template>
```

### IModalResponse

When a modal is dismissed (either via confirming or cancelling) a response is sent back to the caller.

Property | Type | Description
---|---|---
`confirmed` | `boolean` | Whether or not the dialog was 'confirmed' or 'cancelled'.
`response` | `any \| undefined` | If a modal application returns a custom response via the `IModalAppOptions.confirmedAsync` or `IModalAppOptions.cancelled` callbacks, the object will be available here.
`modalApp` | [`IKatApp`](#ikatapp) | A reference to the modal KatApp in case the caller needs access to anything present in the KatApp's [state](#istate).

### IModalAppOptions

`IModalAppOptions` is a superset of [`IModallOptions`](#imodaloptions) interface.  `IModalOptions` is the parameter passed into [application.showModalAsync](#ikatappshowmodalasync) or the [v-ka-modal](#v-ka-modal) directive, while `IModalAppOptions` simply extends this object to pass in a few other properties that are made available to the Kaml View.  

This `IModalAppOptions` object is accessible via two different methods.  Within the templates used to render the 'header' or the 'buttons', there is a `modalAppOptions` available in the current scope.  Everywhere else, when access is needed, the options can be accessed via `application.options.modalAppOptions`.

Property | Type | Description
---|---|---
`confirmedAsync` | `(response?: any) => Promise<void>` | Use the `confirmedAsync` property to access a method the KatApp Framework injected for use to indicate when a modal has been 'confirmed'.  See [IModalAppOptions confirmedAsync Sample](#imodalappoptions-confirmedasync-sample) for more information.
`cancelled` | `(response?: any) => void` | Use the `cancelled` property to access a method the KatApp Framework injected for use to indicate when a modal has been 'cancelled'.<br/><br/>Optionally, a response object can be returned as well.  See [IModalAppOptions confirmedAsync Sample](#imodalappoptions-confirmedasync-sample) for sample on how to call helper methods on `modalAppOptions`.
`closeButtonTrigger` | `string` | By default, when a modal application is displayed and there is a [`title`](#imodaloptionslabelstitle) provided, the modal allows the user to press `ESC` or click a dismissable `X` close button to close the dialog.  When this occurs, the [`cancelled`](#imodalappoptionscancelled) method is called. If the modal application state requires different behavior to occur, a JQuery selector string can be provided and the KatApp framework will click this instead.<br/><br/>Examples:<br/>1. A modal application has worked its way through 'steps', completed its function, and has arrived at the final 'confirm' step and is only presenting an 'OK' button to close the dialog and indicate 'confirmed' to the host application.  At this point, the modal application would want to assign `closeButtonTrigger` to a selector that would trigger clicking the 'OK' button.<br/>2. A modal has a primary function (i.e. selecting beneficiaries), but supports a secondary function (i.e. creating a new beneficiary on the fly) simply by changing its UI.  Dismissing the 'secondary' function via `ESC` or the `X` close button should only dismiss the secondary function and return to the primary function.  When displaying the secondary function UI, the modal application should assign the `closeButtonTrigger` and then clear it out when the secondary UI is hidden.
`triggerLink` | `JQuery` | Read Only;  If the current modal application was launched via a [`v-ka-modal`](#v-ka-modal) link, the `trigger` property will be set to this JQuery element.  This would allow the Kaml View acting as the modal to inspect information that may have been placed on the 'trigger link' (i.e. `data-*` attributes) to provide additional information internal to the sites overall functionality.

#### IModalAppOptions confirmedAsync Sample

When calling `confirmedAsync`, a response object can be returned as well.  Assuming the following 'buttons' template was in use:

```html
<template id="buttons">
	<button 
        type="button" 
        @click="handlers.submitAsync" 
        :class="modalAppOptions.css.continue">Submit</button>
</template>
```

The following javascript would indicate to use this template along with providing a handler for the 'Submit' button returning an api response as part of the modal confirmation.

```javascript
(function () {
    var application = KatApp.get('{id}');
    application.update(
        {
            options: {
                modalAppOptions: {
                    buttonsTemplate: "button"
                }
            },
            handlers: {
                submitAsync: async () => {
                    const resopnse = 
                        await application.apiAsync( 
                            /* options here for a valid api */ 
                        );
                    
                    await application.options.modalAppOptions
                        .confirmedAsync(response);
                }
            }
        }
    );
)();
```

### ISubmitApiConfiguration

The payload representing the current configuration to submit to either a RBLe Framework calculation or a api endpoint in the Host Application.

Property | Type | Description
---|---|---
`token` | `string` | If the data used in RBLe Framework calculations was 'registered' with the RBLe Framework web service, this is the token returned uniquely identifying the user's transaction package.
`testCE` | `boolean` | Whether or not the RBLe Framework should use the 'test' CalcEngine when running the calculation.
`authID` | `string | Used in non-session version, when options has a 'data' property of json formatted xDS Data.
`client` | `string` | A `string` value representing a 'client name' used during the calculation for logging purposes.
`adminAuthID` | `string` | If an admin user is impersonating a normal user during the execution of the Kaml View, this value should contain the ID of the admin user to indicate to CalcEngine(s) that an admin user is initiating the calculation.
`currentPage` | `string` | The name of the current page as it is known in the Host Environment. This value is determined from the [`options.currentPage'](#ikatappoptionscurrentpage) property.
`requestIP` | `string` | The IP address of the browser running the current KatApp. This value is determined from the [`options.requestIP'](#ikatappoptionsrequestip) property.
`currentUICulture` | `string` | The current culture as it is known in the Host Environment. This value is determined from the [`options.currentUICulture'](#ikatappoptionscurrentuiculture) property.
`environment` | `string` | The name of the current environment as it is known in the Host Environment. This value is determined from the [`options.environment'](#ikatappoptionsenvironment) property.
`nextCalculation` | `INextCalculation` | Whether or not the RBLe Framework should provide diagnostic trace, list of secure file location folders to save a debug copy of the CalcEngine(s) used during the calculation, or force CalcEngine cache to expire.  See [INextCalculation](#inextcalculation) for more information.
`allowLogging` | `boolean` | Whether or not the calculation should be logged in backend monitoring systems.  Usually set to `false` after the first page calculation has finished.

### INextCalculation

The `INextCalculation` interface represents the information that enables developer diagnostics to occur.  The properties can be set via [debugNext()](#ikatappdebugnext).

Property | Type | Description
---|---|---
`expireCache` | `boolean` | Whether or not to expire CalcEngine cache and check KAT Data Store for new version.
`trace` | `boolean` | Whether or not to generate diagnostic trace during the next calculation.
`saveLocations` | `{ location: string, serverSideOnly: boolean }[]` | The locations to save debug CalcEngines to used during the next Calculation.  `serverSideOnly` will only save CalcEngines processed during an API endpoint call.

### ISubmitApiOptions

The `ISubmitApiOptions` interface represents the information that creates an api submission payload.

Property | Type | Description
---|---|---
`inputs` | [`ICalculationInputs`](#icalculationinputs) | The list of inputs to submit to the api endpoint (usually used in a `iValidate="1"` calculation in the Host Environment).
`configuration` | `IStringIndexer<string>` | Any custom configuration settings to pass to the Host Environment. The most common property set is the `configuration.cacheRefreshKeys: Array<string>` property.

### IApiOptions

The `IApiOptions` interface represents the configuration to use when submitting to an api endpoint.

Property | Type | Description
---|---|---
`calculationInputs` | [`ICalculationInputs`](#icalculationinputs) | Often when an api endpoint is submitted to in a Host Environment that leverages the RBLe Framework, an `iValidate=1` RBL calculation is the first action performed on the server.  This calculation can do UI validations or provide instructions to the Host Environment on what type of actions it should take.  All the inputs from the UI are always submit, but if additional inputs should be passed to the endpoint, an `ICalculationInputs` object can be provided.
`apiParameters` | `IStringAnyIndexer` | Some endpoints require parameters that are processed in the server code of the Host Environment.  These parameters are technically not different from `ICalculationInputs`, but providing them as a second parameter accomplishes a few things<br/><br/>1. The value type of each parameter can be more than just `string`, supporting `boolean`, `number` or a nested object with its own properties.<br/>2. If all the parameters are of type `string`, even though technically not different from the `calculationInputs` property, using `apiParameters` eliminates parameters from being passed to a RBL calculation.<br/>3. Finally, it simply segregates 'intent' of the parameters versus the inputs.  Parameters are intended to be used by the api endpoint server code while inputs are intended to be used by the RBL calculation.
`isDownload` | `boolean` | If the api endpoint being posted to will return binary content representing a download, setting this flag to true tells the KatApp framework to process the results differently and save the generated content as a downloaded .
`calculateOnSuccess` | `boolean \| ICalculationInputs` | If after a successful submission to an api endpoint, the KatApp Framework should automatically trigger a RBLe Framework Calculation, `calculateOnSuccess` can be set.  Setting the value to `true` indicates that a calculation should occur.  Setting the value to a `ICalculationInputs` object also indicates that a calculation should occur and additionally pass along the inputs provided.
`files` | [`FileList`](https://developer.mozilla.org/en-US/docs/Web/API/FileList) | If the api endpoint being submitted to accepts file uploads, this property can be set (usually from a `input type="file"` element).

### ILastCalculation

The `ILastCalculation` interface represents a snapshot of the most recent calculation.

Property | Type | Description
---|---|---
`inputs` | [`ICalculationInputs`](#icalculationinputs) | The list of inputs submitted to the most recent calculation.
`results` | `Array<ITabDef>` |The array of [`ITabDef`s](#itabdef) returned from the most recent calculation.
`configuration` | [`ISubmitApiConfiguration`](#isubmitapiconfiguration) | The configuration payload submitted to the most recent calculation.

# RBLe Framework

The RBLe Framework is the backbone of KatApps.  The service is able to marshall inputs and results in and out of RBLe CalcEngines.  These results drive the functionality of KatApps.

- [RBLe Tab Structure](#rble-tab-structure) - Discusses the standard RBLe table processing rules, structure, and features available in generating results for Kaml Views.
- [Framework Inputs](#framework-inputs) - Discusses the set of inputs that are always passed to calculations automatically (and are not part of the UI).
- [Input Table Management](#input-table-management) - Discusses how to pass 'input tables' to calculations.
- [Calculation Pipelines](#calculation-pipelines) - Discusses how multiple CalcEngines can be 'chained' together feedings the 'results' from one CalcEngine into the 'inputs' of the next CalcEngine in the pipeline before generating the final result.

## RBLe Tab Structure

RBLe CalcEngine tabs are either input, result, or update tabs.

- [Required RBLe Tab Named Ranges](#required-rble-tab-named-ranges) - Describes the *required* named ranges on a CalcEngine worksheet to enable it for RBLe processing.
- [RBLe CalcEngine General Table Rules](#rble-calcengine-general-table-rules) - Discusses features available via 'switches', special column and table names, or special values within a table that apply to both input and result tables.
- [RBLe CalcEngine Input Tabs](#rble-calcengine-input-tabs) - Discusses features available via 'switches', special column and table names, or special values within a table that apply to *only* input tables.
- [RBLe CalcEngine Result Tabs](#rble-calcengine-result-tabs) - Discusses features available via 'switches', special column and table names, or special values within a table that apply to *only* result tables.
- [RBLe CalcEngine Table Samples](#rble-calcengine-table-samples) - Samples illustrating usages of the features available via 'switches', special column and table names, or special values within a  CalcEngine tables.

### Required RBLe Tab Named Ranges

Every RBLe CalcEngine tab requires the following named ranges to be properly identified as a RBLe tab.

Name | Description
---|---
SheetType | The type of sheet; `Input`, `ResultXml`, `FolderItem` or `Update`.  The `FolderItem` and `Update` sheet types are only used in administration systems. `FolderItem` sheet results are automatically saved to the xDS data store and `Update` sheet types are used to provide instructions on how to update data during a batch 'calculated data load'.
FolderItemType | When the sheet type is `FolderItem`, specify the type to use when saving the results.  If blank, then the tab will *not* be processed.
FolderItemReplace | Control how previous results of the same type are processed when saving the results.<br/><br/>`true` - Replace all previously saved results with current.<br/>`false` - Keep all previous results when saving current.<br/>`KeepN` - `N` is a number of previous results to keep (newest to oldest) before saving current results.
StartData | Indicates the start of 'data' elements and 'input' elements on `Input` tabs.  Must be in column `A` of a worksheet and appear *before* `StartTables`.  This cell appears one row before the first data or input element.  This named range is required on non-input tabs as well, even though there are never any items in this section; only tables are present in non-input tabs.<br/><br/>The section ends when the `StartTables` named range is encountered or when two blank rows are encountered.
StartTables | Indicates the start of 'table' configurations on RBLe CalcEngine tabs.  Must be in column `A` of a worksheet and appear *after* `StartData`.  This cell appears one row before the configuration of the first table.<br/><br/>Tables are configured with a table name and any configuration switches in one cell, then in the row immediately following, all the column names are defined until a blank column is encountered.  The RBLe Framework then continues to look for additional table configurations with only a single blank column seperating tables until two blank columns are encountered.
Inputs | `ResultXml` tabs only; RBLe Framework calculations allow specifications of *one* input tab and *one or more* result tabs.  When a CalcEngine has several result tabs, the single input tab can become quite large and cluttered.  To help encapsulate functionality, the 'input' tab in CalcEngines can be configured to only contain 'shared' information for all types of calculations (i.e. profile and history data, framework inputs, and/or shared inputs) while each result tab can contain a section to receive inputs that are specific to its tab.  To enable this feature, create a worksheet scoped named range called `Inputs` that appears in column `A` and *before* `StartData`.  It will be processed in the same manner as `StartData`; namely each row will be processed until two blank rows are encountered or `StartData` is encountered.

### RBLe CalcEngine General Table Rules

There are many features available during RBLe Framework processing that are controlled via 'switches', special column and table names, or special values within a table.  All tables processed by RBLe Framework follow the rules described below.

Name | Location | Description
---|---|---
Case Specific | General | All configuration information (input name, table names, column names, switches) are case specific.
/work&#x2011;table<br/>/off` | Table Switch | By default, all tables on a CalcEngine tab are processed (until two blank columns are encountered).  To flag a table as simply a temp/work table that doesn't need to be processed, use the `/work-table` or `/off` switch on the table name.<br/><br/> **Note:** It is preferred to use the `/off` switch versus inserted two blank columns to disable a table because it allows for 'work tables' to be placed in the most logical position in CalcEngine tabs instead of being forced to always be at the end right of all tables and additionally, it allows for the KAT Excel Addin to navigate to these tables since the table configuration is detected before encountering two blank columns.
/off | Column Switch | Optional switch used on table columns to indicate that the column should not be processed during calculations
/sort&#x2011;field | Table Switch | To configure how the table data is sorted, use the `/sort-field:field[,direction,isNumber]` switch on the table name. `direction` and `isNumber` are optional parameters.  `direction` can be `asc` or `desc` (defaulting to `asc`) while `isNumber` can be `true` or `false` (defaulting to `false`).  To specify multiple columns to sort, provide a `\|` delimitted list of column configurations.  For example `/sort-field:status\|pay,,true\|year,desc,true` would sort by `status` *text* ascending, then by `pay` *number* ascending, then by `year` *number* descending.
/sort&#x2011;field Legacy | Table Switch | To configure how the table data is sorted, use the `/sort-field:field-name` switch on the table name.  To specify multiple columns to use in the sort, provide a comma delimitted list of field names.  When used on an _Input Tab Table_, the data is sorted _before_ it is loaded into the tab.  Conversely, when used on a _Result Tab Table_, the data is sorted _after_ exporting the results from the CalcEngine.
/sort&#x2011;direction Legacy | Table Switch | Optional sort control (`asc` or `desc`) used in conjunction with `sort-field`.  By default, data will be sorted ascending.  Use the `/sort-direction:direction` to control how field(s) specified in the `/sort-field` switch are sorted.  If `/sort-direction:` is provided, there must be the same number of comma delimitted values as the number of comma delimitted fields found in `/sort-field`.
/sort&#x2011;number Legacy | Table Switch | Optional switch (`true` or `false`) used in conjunction with `sort-field`.  By default, data will be sorted using a `string` comparison.  Use the `/sort-number:true` to indicate that field(s) specified in the `/sort-field` switch should be treated as numeric when sorting.  If `/sort-number:` is provided, there must be the same number of comma delimitted values as the number of comma delimitted fields found in `/sort-field`.

### RBLe CalcEngine Input Tabs

There are many features available during RBLe Framework processing that are controlled via 'switches', special column and table names, or special values within a table.  Input tabs have the following features.

Name | Location | Description
---|---|---
`<data-element>` | `StartData` Element | Surrounding a term with `< >` indicates that data should be pulled from the current xDS data model. The term can be in one of the following three formats:<br/><br/>`profile-field` - Simply a name to a field present in Profile data.<br/>`HistoryTable:index:field` - Selector expression to query a specific row within historical data.  `index` can be a specific index value (must match exactly) or a positional based index; `first`, `last`, `first+N` or `last-N`. When using `first+` or `last-` if the expression results in an 'overflow' position (i.e. `first+10` but only 5 rows exist), then a blank value will be returned.<br/>`HistoryItem{XPath}` where `XPath` creates a valid XPath expression; i.e. `HistoryItem[@hisType='Pay'][position()=last()]/pay would select the most recent `pay` field.
`/text` | Element switch | Optional switch used on `<data-element>`, inputs, or input table columns to indicate that the provided data should be formatted as 'text'.  If `/text` is not provided and a textual value that can convert to a number is provided, the CalcEngine automatically parses the value as a number.  For example, if 'code' of `01` is provided without the `/text` flag, the CalcEngine would convert `01` to `1`.  With the `/text` flag, the leading `0` would be preserved.
`<dataTable>` | `StartTables` Element | Surrounding a table name with `< >` indicates that, for each calculation, the rows of the table will be cleared and populated with *data from the xDS history table* with the matching `dataTable` (i.e. `<Pay>`). The columns specified will popualte with the xDS History fields with the exact same name. There are a few exceptions:  a) the column  `id`, `index` and `hisIndex` will all function to populate with the 'index' field of the xDS History row, b) `@hisDateCreated`, `@hisDateUpdated`, `@hisCreatedBy`, and `@hisUpdatedBy` will populate with the associated xDS framework audit data items.
`<<globalTable>>` | `StartTables` Element | Surrounding a table name with `<< >>` indicates that, for each calculation, the rows of the table will be cleared and populated with *data from KAT CMS 'Global Lookups CalcEngine' table* with the matching `dataTable` (i.e. `<<IrsRates>>`). Only data from the columns specified will be popualted.
inputTable | `StartTables` Element | Surrounding a table name with `<< >>` indicates that, for each calculation, the rows of the table will be cleared and populated with data from KAT CMS 'Global Lookups CalcEngine' table with the matching `globalTable` (i.e. `<<IrsRates>>`). The columns specified will popualte with the global lookup fields with the exact same name.
inputTable | `StartTables` Element | A table name with *no wrapping characters* indicates that, for each calculation, the rows of the table will be cleared and populated with *tabular input data* provided from the UI (see [Input Table Management](#input-table-management) for more information) with the matching `inputTable` (i.e. `RetirementDates`). The columns specified will popualte with the input table fields with the exact same name.
`[configureUiInputData]` | `StartTables` Element | Surrounding a table name with `[ ]` indicates that the table is a hybrid of a `<dataTable>` and an `inputTable`. When a calculation is an [`iConfigureUI` calculation](#framework-inputs), the rows of the table will be cleared and populated as if it were a `<dataTable>`.  For all other calculations, the rows of the table will be cleared and populated as if it were an `inputTable`.  This enabled a 'single input table' to be referenced in the CalcEngine an 'input table' is managed by the UI but initially populated by 'matching' data saved in xDS data store. The most common example of this is an 'UI Input Table' that has the capability of being saved to xDS and reloaded into the UI in a subsequent user session.
/unique&#x2011;summary:sourceTable | Table Switch | The RBLe Framework supports automatic 'grouping' to produce a unique list of values for input tables (`inputTable`, `<dataTable>`, or `<<globalTable>>`).  The `sourceTable` parameter indicates which table/data aggregate before loading it into the current table. See [Unique Summary Configuration](#Unique-Summary-Configuration) for more information.
/id&#x2011;locked | Table Switch | The RBLe Framework allows loading only specific xDS History data rows based on indexes that provided the desired row indexes to load in an `id` column of the table, *which must be the first column specified* in the table. The index value provided in the `id` column can be a specific index value (must match exactly) or a positional based index; `first`, `last`, `first+N` or `last-N`. When using `first+` or `last-` if the expression results in an 'overflow' position (i.e. `first+10` but only 5 rows exist), then no row data will be populated. See [id-locked Configuration](#id-locked-configuration) for more information.

### RBLe CalcEngine Result Tabs

There are many features available during RBLe Framework processing that are controlled via 'switches', special column and table names, or special values within a table.  Result tabs have the following features.

Name | Location | Description
---|---|---
`id` | Column Name | An arbitrary 'id' value for each row that can be used by Kaml View.
`on` | Column Name | Whether or not current *row* gets exported. If no `on` column is present or the value is *not* set to `0` the row will be exported.
`on` | Row ID | Whether or not a *column* gets exported (similar to the `on` Column). Provide a row with `id` set to `on`, then for each column in this row, if the value is set to `0`, then column will be omitted from each row exported.
On/Off Flags | General | All RBLe Framework/KatApp Framework columns that are 'flag' columns (i.e. `on` columns, [`rbl-input.disabled`](#rbl-input-table), etc.) use `1` to indicate 'true' and `0` to indicate 'false'; 'anything else' (usually `blank`) will indicate to use the default value specified for each flag column.
`table-output-control` | Table Name | Similar to the `on` Column Name and Row ID, this controls exporting logic, but it puts all the logic in one place (instead of every row's `on` column) to make maintenance easier.  See [table-output-control](#table-output-control) for more information.
`/export-blanks` | Table Switch | By default, columns with blank values are not returned from RBLe service (except for the first row which always contains all columns to provide a table schema to the caller).  Excluding columns with blank values helps reduce network bandwidth.  , however, if table processing requires all columns to be present even when blank to avoid `null`/`undefined` errors, use the `/export-blanks` switch on the column header. **Note**: This switch is only needed for legacy frameworks because the KatApp framework automatically inspects the RBLe Framework results and ensures that all rows have all columns (injecting a 'blank' value for any missing columns; instead of `undefined`) *except* for tables that expect `undefined` to be present to aid in detection of 'not supplied' versus an 'empty value' supplied (i.e. for the [`rbl-input.value`](#rbl-input-table) result column).
`'` (text forced) | Column Value | As described in the `/export-blanks` switch, blank columns are not exported. If you want to ensure a column is present inside the result row with a 'blank' value and *not* removed, set the CalcEngine column value to `'` and it will be returned and treated as an 'empty value' versus a 'missing value'.
`/configure-ui` | Table Switch<br/>Column Switch | To configure a table or column to _only_ export during a [`iConfigureUI`](#framework-inputs) calculation, append the `/configure-ui` switch.  This removes the need of providing `on` column or `table-output-control` logic that checks the `iConfigureUI` input explicitly.
`/iAnd:` `/iOr:` | Table Switch<br/>Column Switch | To configure a table or column to _only_ export when one or more input values are matched. These switches can be used together *and* appear more than one time in a specified configuration.<br/><br/>The format for these switches are a `\|` delimitted list of input match patterns in the format of `/iAnd:iInput1=value1\|iInput2=value2\|...`.  When using `/iAnd:`, every input match pattern must evaluate to `true` to export the current item.  When using `iOr:`, if any input match pattern evaluates to `true` the current item will be exported.<br/><br/>These switches are the successor to the `/configure-ui` switch, but they can be used together.  The `/configure-ui` switch is simply translated into `/iAnd:iConfigureUI="1"` before processing.<br/><br/>When these switches are table switches, they accomplish the same functionality as the `table-output-control` feature described above with the benefit of not requiring every table that needs export control to be added to the `table-output-control` table, especially when the logic is simple (i.e. tied to a single input value) and can be view directly with the table.<br/><br/>When these switches are used as a column switch too, which accomplishes the same functionality as the `on` Row ID feature described above with the benefit of easily seeing the 'on' logic and using familiar syntax when used as table switch.
`[]` Nesting | Column Switch | Optional syntax to specify that a column contains result nesting information.  Note that if any `/switch` flags are to be used on this column (i.e. `/text`), they should appear _after_ the closing `]`.  See [Table Nesting Configuration](#Table-Nesting-Configuration) for more information.
`/child-only` | Table Switch | By default, any tables used as a child table are still exported normally, so the data appears twice in the results; once nested, and once at root level.  If you want to supress the exporting of data at the normal/root level, you can add the `/child-only` flag indicating that it will only appear in the results nested in its parent table.  _If the parent is not exported, child tables remain supressed._ See [Table Nesting Configuration](#Table-Nesting-Configuration) for more information.
`/type:dataType` | Column Switch | When calculation results are turned into a JSON object (usually in conjunction with `[]` Nesting), by default, all column values will be treated as a `string`.  If certain columns need to be of a different data type, the following values can be provided: `Date`, `Integer`, `Double`, or `Boolean`. See [Table Nesting Configuration](#Table-Nesting-Configuration) for more information.

#### table-output-control

Provide a single table with logic that controls whether or not a table is exported without the need placing logic in every row's `on` column of desired table.

Column | Description
---|---
id | The name of the table to control.
export | Whether or not the table is exported.<br/>`1` indicates that the table should be exported. If all rows are turned off via `on` column, then the KatApp state will be assigned an empty result; resulting in reactive processing to occur.<br/>`0` indicates that the table should *not* be exported. KatApp state will remain as is.<br/>`-1` indicates that the table should *not* be exported and the KatApp state will be cleared.

### RBLe CalcEngine Table Samples

Below are some samples of different table configurations leveraging different switches, values, etc. to enable custom RBLe Framework processing.

- [RBLe Input Table Configuration](#rble-input-table-configuration) - General flags available on all input tables.
- [RBLe Result Table Configuration](#rble-result-table-configuration) - General flags available on all result tables.
- [Unique Summary Configuration](#unique-summary-configuration) - Discusses how to control data aggregation when using the `/unique-summary` switch.
- [Table Nesting Configuration](#table-nesting-configuration) - Discusses how to control result table nesting when using the `[]` Nesting, `/child-only`, and `/type` switches.
- [id-locked Configuration](#id-locked-configuration) - Explains how to load specific data into input tables via the `/id-locked` switch and `index` column configurations.

#### RBLe Input Table Configuration

```xml
<xDataDef id-auth="111111111">
    <HistoryData>
        <HistoryItem hisIndex="2004" hisType="Pay" hisUpdatedBy="kat.admin">
            <index>2004</index>
            <pay>56000</pay>
            <bonus>1000</bonus>
            <status>01</status>
            <organization>03</organization>
        </HistoryItem>
        <HistoryItem hisIndex="2005" hisType="Pay" hisUpdatedBy="kat.admin">
            <index>2005</index>
            <pay>52000</pay>
            <bonus>1100</bonus>
            <status>10</status>
            <organization>02</organization>
        </HistoryItem>
        <HistoryItem hisIndex="2006" hisType="Pay" hisUpdatedBy="kat.admin">
            <index>2006</index>
            <pay>54000</pay>
            <bonus>1200</bonus>
            <status>10</status>
            <organization>02</organization>
        </HistoryItem>
        <HistoryItem hisIndex="2007" hisType="Pay" hisUpdatedBy="kat.admin">
            <index>2007</index>
            <pay>56000</pay>
            <bonus>1300</bonus>
            <status>01</status>
            <organization>01</organization>
        </HistoryItem>
    </HistoryData>
</xDataDef>
```

Given the data above, and the configurations below, the data would be loaded as follows:

`<Pay>/sort-field:status|pay,,true|organization,desc,true`
index | pay | bonus | status | organization/text | @hisUpdatedBy
---|---|---|---|---|---
2007 | 56000 | 1300 | 1 | 01 | kat.admin
2004 | 56000 | 1000 | 1 | 03 | kat.admin
2005 | 52000 | 1100 | 10 | 02 | kat.admin
2006 | 54000 | 1200 | 10 | 02 | kat.admin

States/off
key | text
---|---
MN | Minnesota
CA | California
PA | Pennsylvania

\* Note: The States table *without* the `/off` switch would be treated as an `inputTable` and cleared out on each calculation and attempted to be loaded from an UI input table named `States`.  However, with the `/off` switch, it is treated as a work table and ignored, and therefore 'lookup tables' can be inserted and configured right next to all other 'source' tables for the calculations.

#### RBLe Result Table Configuration

Given the following result table configuration and data present in the CalcEngine:

`rbl-input`
on | id | label | value | help/iAnd:iConfigureUI=1
---|---|---|---|---
1 | iNameFirst | First Name | John
1 | iNameMiddle | Middle Name
0 | iNickName | Nick Name
| iNameLast | Last Name |`'`| Provide your last name, we don't know it.

`errors/iAnd:iValidate=1/export-blanks`
id | text
---|---
iNameFirst | First Name is required.
iNameMiddle | Last Name is required.

If the calculation has `iConfigureUI=1 and iValidate=0` input, the following data would be returned.

1. `help` column returned.
1. `errors` table *not* returned.
1. `iNickName` row *not* returned because `on=0`.

```javascript
{
    "rbl-input": [
        { 
            "@id": "iNameFirst", 
            "label": "First Name",
            "value": "John",
            "help": ""            
        },
        { 
            "@id": "iNameMiddle", 
            "label": "Middle Name",
        },
        { 
            "@id": "iNameLast", 
            "label": "Last Name",
            "value": "",
            "@value": { "text-forced": "true" },
            "help": "Provide your last name, we don't know it."            
        }
    ]
}
```

If the calculation has `iConfigureUI=0 and iValidate=1` input, the following data would be returned.

1. `help` column *not* returned.
1. `errors` table returned.
1. `iNickName` row *not* returned because `on=0`.

```javascript
{
    "rbl-input": [
        { 
            "@id": "iNameFirst", 
            "label": "First Name",
            "value": "John",
        },
        { 
            "@id": "iNameMiddle", 
            "label": "Middle Name",
        },
        { 
            "@id": "iNameLast", 
            "label": "Last Name",
            "value": "",
            "@value": { "text-forced": "true" }
        }
    ],
    "errors": [
        { "@id": "iNameFirst", "text": "First Name is required." },
        { "@id": "iLastFirst", "text": "Last Name is required." }
    ]
}
```

#### Unique Summary Configuration

Producing a unique list of values in CalcEngines can be difficult (especially when the unique _key_ is a combination of multiple columns). To alleviate this problem, RBLe can produce a unique list of values from input tables (UI inputs, `<data-tables>` or `<<global-tables>>`).  The configuration is controlled by the `/unique-summary:detailTable` flag and the columns specified in the summary table.

1. The `/unique-summary:sourceTable` flags a table as a _summary_ table and the `sourceTable` name indicates the table that should be summarized.
2. When creating a summary table, you indicate what type of table (input, data, or global) the detail table is by using the same naming convention: `<data>`, `<<global>>`, or no `<>` for user input tables.
3. In the summary table, only columns that generate the _unique_ list of values desired should be specified.  Additional columns (i.e. for additional details) *can not* be used because the combination of all supplied columns will be the 'aggregator key' used to generate each row.

In the example below, `benefitSummary` will contain values that generate a unique list across the `benefitType` and `optionId` columns from the `benefitDetails` table.

*&lt;benefitDetails&gt; table*
id | benefitType/text | optionId/text | coverageLevel/text
---|---|---|---
1 | 01 | 02 | 05
2 | 01 | 02 | 04
3 | 02 | 02 | 05
4 | 02 | 01 | 03
5 | 03 | 01 | 01

*&lt;benefitSummary&gt;/unique-summary:benefitDetails table*
benefitType/text | optionId/text
---|---
01 | 02
02 | 02
02 | 01
03 | 01


#### Table Nesting Configuration

Traditionally, RBLe exports all tables specified in the CalcEngine as root level table row arrays with no nesting; each row containing only the properties (columns from CalcEngine) defined on the table.  For better API support from other systems calling into RBLe, result tables can be configured so that nesting occurs and rich object hierarchies can be built.  

When a column has `[]` in its name, this signals that this column will have an array of children rows.  The column header name specified before the `[` will be the name of the property on this parent row.  Note that if any `/switch` flags are to be used on this column (i.e. `/text`), they should appear _after_ the closing `]`.  There are two ways to configure nesting.

If only `[]` is used in the name, the nesting configuration will be supplied in the _column value_ of each row, however, if every parent row nests the same child table but simply filters the child rows by a value, the syntax of `[childTable:childKeyColumn]` can be used.

Configuration | Value | Description
---|---|---
`[]` | `childTable` | When the column only has `[]` provided, and the value only specifies a `childTable`, every row present in `childTable` will be nested under this column.
`[]` | `childTable:childKeyColumn=value` | Each row can specify a filter into the specified `childTable`.  The table and filter are separated by a `:` and a simply expression using `=` is all that is supported.  This would nest all rows from `childTable` where the column `childKeyColumn` has a value of `value`.
`[childTable:childKeyColumn]` | `value` | When this syntax is used, the `value` provided in each row is used as a filter for the `childKeyColumn` column.

*Example of `[childTable:childKeyColumn]` syntax (with `/type` switch).*

*orders table*
id | date | amount/type:Double | items\[orderItems:orderId\] 
---|---|---|---
1 | 2021-07-13 | 45 | 1
2 | 2021-08-13 | 33 | 2

*orderItems table*
id | orderId/type:Double | sku | price/type:Double | quantity/type:Double
---|---|---|---|---
1 | 1 | PRD4321 | 10 | 3
2 | 1 | PRD5678 | 5 | 2
3 | 1 | PRD3344 | 5 | 1
4 | 2 | PRD6677 | 33 | 1

This CalcEngine nesting configuration would result in the following JSON

```javascript
{
    orders: [
        {
            "@id": 1,
            date: "2021-07-13",
            amount: 45
            items: [
                { "@id": 1, orderId: 1, sku: "PRD4321", price: 10, quantity: 3 },
                { "@id": 2, orderId: 1, sku: "PRD5678", price: 5, quantity: 2 },
                { "@id": 3, orderId: 1, sku: "PRD3344", price: 5, quantity: 1 }
            ]
        },
        {
            "@id": 2,
            date: "2021-08-13",
            amount: 33
            items: [
                { "@id": 4, orderId: 2, sku: "PRD6677", price: 33, quantity: 1 }
            ]
        }
    ],
    orderItems: [
        { "@id": 1, orderId: 1, sku: "PRD4321", price: 10, quantity: 3 },
        { "@id": 2, orderId: 1, sku: "PRD5678", price: 5, quantity: 2 },
        { "@id": 3, orderId: 1, sku: "PRD3344", price: 5, quantity: 1 },
        { "@id": 4, orderId: 2, sku: "PRD6677", price: 33, quantity: 1 }
    ]
}
```

*Example of `[]` syntax.  (with `/type` switch)*

*plans table*
id | name | subPlans\[\] 
---|---|---
DB | Retirement | retirementPlans
SDB | Special Retirement | specialRetirementPlans
HSA | HSA Savings | savingsPlans:type=HSA
FSA | FSA Savings | savingsPlans:type=FSA
MISC | Misc Savings | savingsPlans:type=MISC
SIMPLE | Simple (no subPlans) |

*retirementPlans/child-only table*
id/type:Integer | name
---|---
1 | Plan 1
2 | Plan 2
3 | Plan 3

*specialRetirementPlans/child-only table has no rows*

*savingsPlans/child-only table - with no MISC type rows*
id | name | type
---|---|---
HSA-1 | Savings 1 | HSA
HSA-2 | Savings 2 | HSA
HSA-3 | Savings 3 | HSA
FSA-1 | Savings 1 | FSA

This CalcEngine nesting configuration would result in the following JSON

```javascript
// Since /child-only was used on all child tables, their results are not exported
{
    plans: [
        {
            "@id": "DB",
            name: "Retirement",
            subPlans: [
                { "@id": 1, name: "Plan 1" },
                { "@id": 2, name: "Plan 2" },
                { "@id": 3, name: "Plan 3" }
            ]
        },
        {
            "@id": "SDB",
            name: "Special Retirement"
        },
        {
            "@id": "HSA",
            name: "HSA Savings",
            subPlans: [
                { "@id": "HSA-1", name: "Savings 1" },
                { "@id": "HSA-2", name: "Savings 2" },
                { "@id": "HSA-3", name: "Savings 3" }
            ]
        },
        {
            "@id": "FSA",
            name: "FSA Savings",
            subPlans: [
                { "@id": "FSA-1", name: "Savings 1" }
            ]
        },
        {
            "@id": "MISC",
            name: "Misc Savings"
        },
        {
            "@id": "SIMPLE",
            name: "Simple (no subPlans)"
        }
    ]
}
```

Notes about nesting:

1. A parent table can have more than one property column configured as a nesting column.
2. Nesting can be configured to nest 1..N levels deep.
3. If no child rows are present, the property is simply removed from the parent row.  There *is not* an empty array property specified.
4. When using `[]`, no nesting is attempted if no column value is provided, if `childTable` is provided, but that table has no rows, or if applying the `childKeyColumn=value` filter results in no rows.
5. When using `[childTable:childKeyColumn]`, no nesting is attempted if no column value is provided or if the `childKeyColumn` has no row matching the column value.
6. By default, tables that are the 'child' tables of a nest configuration are still exported as root level table rows.  If the data should _only_ appear in the nested relationship, the `child-only` table flag can be used to supress the normal exporting process.

#### id-locked Configuration

`<dataTables>` located on RBLe Input Tabs can be configured to only be populated with specific xDS History rows.  To enable this feature, use the `/id-locked` flag on the input table and provided the desired row indexes in the `id` column.  Below are some examples of how to use the `/id-locked` flag.

In the samples below, assume the following history data is present in xDS:

```xml
<xDataDef id-auth="111111111">
    <HistoryData>
        <HistoryItem hisIndex="2004" hisType="Pay">
            <index>2004</index>
            <pay>50000</pay>
            <bonus>1000</bonus>
        </HistoryItem>
        <HistoryItem hisIndex="2005" hisType="Pay">
            <index>2005</index>
            <pay>52000</pay>
            <bonus>1100</bonus>
        </HistoryItem>
        <HistoryItem hisIndex="2006" hisType="Pay">
            <index>2006</index>
            <pay>54000</pay>
            <bonus>1200</bonus>
        </HistoryItem>
        <HistoryItem hisIndex="2007" hisType="Pay">
            <index>2007</index>
            <pay>56000</pay>
            <bonus>1300</bonus>
        </HistoryItem>
    </HistoryData>
</xDataDef>
```

##### id-locked Fixed Index

If the `<Pay>` table is configured as follows in the CalcEngine:

&lt;Pay&gt;/id-locked
id | pay
---|---
2005
2006

When data is loaded, the resulting table will be:

&lt;Pay&gt;/id-locked
id | pay
---|---
2005 | 52000
2006 | 54000

##### id-locked Positional Index

`/id-locked` supports positional based indexes as well; `first`, `last`, `first+N` or `last-N`. When using `first+` or `last-` if the expression results in an 'overflow' position (i.e. `first+10` but only 5 rows exist), then no row data will be populated. Additionally, to retrieve the *actual* value of the xDS History row index, you must provide an additional `index` column in your configuration because the `< >` configuration instructions inside the `id` column will *not* be replaced.

If the `<Pay>` table is configured as follows in the CalcEngine:

&lt;Pay&gt;/id-locked  
id | index | pay
---|---|---
`<first>`
`<first+1>`
`<first+4>`
`<last-1>`
`<last>`

When data is loaded, the resulting table will be:

&lt;Pay&gt;/id-locked  
id | index | pay
---|---|---
`<first>` | 2004 | 50000
`<first+1>` | 2005 | 52000
`<first+4>`*
`<last-1>` | 2006 | 54000
`<last>` | 2007 | 56000

\* Note how no data is loaded because `first+4` wants to retreive the fifth row, but there are only 4 rows present in data.

## Framework Inputs

Every calculation sends back a set of framework inputs that are set programmatically via the `KatAppOptions`, versus an actual input on the page.

Input | Description
---|---
iConfigureUI | A value of `1` indicates that this is the first calculation called after the markup has been rendered.  Can be turned off via `IKatAppOptions.runConfigureUICalculation`
iDataBind | A value of `1` indicates that all `rbl-listcontrol` and `rbl-defaults` should be processed to set default data bound values (note, this happens on the same calculation that sends `iConfigureUI=1`).
iInputTrigger | The name of the input that triggered the calculation (if any) will be passed.
iCurrentPage | Describes which page the calculation is being submitted from.  Passed from `IKatAppOptions.currentPage`
iCurrentUICulture | Specifies which culture should be when generating results.  Passed from `IKatAppOptions.currentUICulture`
iEnvironment | Specifies the environment in which the RBLe Service is executing.  Passed from `IKatAppOptions.environment` (`PITT.PROD`, `PITT.UAT`, or `WN.PROD`)

## Input Table Management

RBLe Framework has the concept of input tables that allow for tabular input data to be sent to the CalcEngine.  If input tables are expected from the CalcEngine, they can be supplied via the [`IKatApp.updateApiOptions` event](#IKatApp.updateApiOptions).

```javascript
// Append custom table to the CalculationInputs object instead of sending an input for each 'table cell' of data
application.on("updateApiOptions.ka", (event, submitOptions) => {
    // Create custom coverage table
    var coverageTable = {
        name: "coverage",
        rows: []
    };

    // Loop all inputs that start with iCoverageA- and process them.
    // data-inputname is in form of iCoverageA-id
    // For each input, create a row with id/covered properties
    var inputControlData = application.select("div[data-inputname^=iCoverageA-]");
    inputControlData.each(function (index, element) {
        var id = $(element).data("inputname").split("-")[1];
        var v = $(element).hasClass("active") ? 1 : 0;
        var row = { "id": id, covered: v };
        coverageTable.rows.push(row);
    });
	submitOptions.inputs.tables.push(coverageTable);
});
```


## Calculation Pipelines

Pipeline CalcEngines simply allow a CalcEngine developer to put some shared logic inside a helper CalcEngine that can be reused.  Results from each CalcEngine specified will flow through a pipeline into the next CalcEngine.  Pipeline CalcEngines are ran in the order they are specified ending with the calculation of the Primary CalcEngine.

The format used to specify Pipeline CalcEngines is one or more `pipeline` child elements with support for `name`, `input-tab`, and `result-tab` attributes.  By default, if only the `name` is provided, the input and the result tabs with the *same* name as the tabs<sup>1</sup> configured on the primary CalcEngine will be used.

By specifying Pipeline CalcEngine(s), the flow in RBLe Service is as follows.

1. Load all inputs and data into Pipeline CalcEngine and run calculation.
2. Any tables returned by the configured result tab<sup>1</sup> are then passed to the next CalcEngine in the pipeline as a *data* `<history-table>` on the input tab.

<sup>1</sup> For Pipeline CalcEngines, only one result tab is supported.

### Sample 1: Two Pipeline CalcEngines
Configure two CalcEngines to run in the pipeline before the primary CalcEngine.  In following sample, LAW_Wealth_Helper1_CE and LAW_Wealth_Helper2_CE both use the same tabs configured on LAW_Wealth_CE.

```html
<rbl-config templates="Standard_Templates,LAW:Law_Templates">
    <calc-engine key="default" name="LAW_Wealth_CE" input-tab="RBLInput" result-tabs="RBLResult">
		<pipeline name="LAW_Wealth_Helper1_CE" />
		<pipeline name="LAW_Wealth_Helper2_CE" />
	</calc-engine>
</rbl-config>
```

### Sample 2: Custom CalcEngine Tabs
Configure two CalcEngines with different tabs to run in the pipeline before the primary CalcEngine.  In following sample, LAW_Wealth_Helper1_CE specifies custom tabs, while LAW_Wealth_Helper2_CE uses same tabs configured on LAW_Wealth_CE.

```html
<rbl-config templates="Standard_Templates,LAW:Law_Templates">
    <calc-engine key="default" name="LAW_Wealth_CE" input-tab="RBLInput" result-tabs="RBLResult">
		<pipeline name="LAW_Wealth_Helper1_CE" input-tab="RBLInput" result-tabs="RBLHelperResults" />
		<pipeline name="LAW_Wealth_Helper2_CE" />
	</calc-engine>
</rbl-config>
```

# Upcoming Documentation

1. Document custom 'view model' and how it is passed in...sample with doc center 'showDownload'
1. Original Docs: See [calculate With Different CalcEngine](#calculate-With-Different-CalcEngine) for information about running secondary calculations via javascript and without requiring configuration up front.
1. Section about how 'modals work' and different ways to call them and work with them (see cheatsheet)
1. Section discussing the 'automatic' flows; a) when I load kaml views and b) after calculations (i.e. help tips (and .ka-ht-js class) and anything else automagic)
