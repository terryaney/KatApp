# KatApp Documentation Contents

- [KatApp Framework](#katapp-framework)
- [Initializing and Configuring a KatApp](#initializing-and-configuring-a-katapp)
- [Kaml View Specifications](#kaml-view-specifications)
- [KatApp State](#katapp-state)
- [HTML Content Template Elements](#html-content-template-elements)
- [Common Vue Directives](#common-vue-directives)
- [Custom KatApp Directives](#custom-katapp-directives)
- [KatApp API](#katapp-api)
- [RBLe Framework](#rbl-framework)
- [Upcoming Documentation](#upcoming-documentation)

# KatApp Framework

The KatApp framework is an orchestrator of two other well established frameworks; RBLe framework and [Vue.js](https://vuejs.org/).  The primary function of the KatApp framework is to marshall inputs into a RBLe framework calculation, take the calculation results and turn them into a 'reactive' model that is then used for rendering HTML markup via Vue.  One caveat is that instead of standard Vue, KatApp framework is leveraging [petite-vue](https://github.com/vuejs/petite-vue).  

> `petite-vue` is an alternative distribution of Vue optimized for progressive enhancement. It provides the same template syntax and reactivity mental model as standard Vue. However, it is specifically optimized for "sprinkling" a small amount of interactions on an existing HTML page rendered by a server framework.

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
Kaml View CMS | System for updating Kaml View when Kaml files are not hosted directly by Host Platform.
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

- jquery.js - Required [library](https://api.jquery.com/) to enable KatApp event processing and other functionality internal to KatApp framework.
- bootstrap.js - Required to support [Modals](https://getbootstrap.com/docs/5.0/components/modal/), [Popovers](https://getbootstrap.com/docs/5.0/components/popovers/) and [Tooltips](https://getbootstrap.com/docs/5.0/components/tooltips/).
- highcharts.js - Optional, if `v-ka-highchart` directive is leveraged, to support build [Highcharts](https://api.highcharts.com/highcharts/) from CalcEngine results.

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

When multiple CalcEngines or result tabs are used, additional information can be required to specify the appropriate results.  See [v-ka-value](#v-ka-value), [v-ka-table](#v-ka-table), or [v-ka-highchart](#v-ka-highchart) directives or the [`rbl.source()`](#rbl-source) method for more information on specifying non-default CalcEngine results.

**Important** - Whenever multiple CalcEngines are used, you must provide a `key` attribute; minimally on CalcEngines 2...N, but ideally on all of them.  Note that the first CalcEngine will be assigned a key value of `default` if no `key` is provided.

Entity | Description
---|---
`templates` | Attribute; Comma delimitted list of Kaml Template Files required by this Kaml View.  Each template is specified in Folder:FileName syntax.
`calc-engine` | Element; If one or more CalcEngines are used in Kaml View, specify each one via a `calc-engine` element.
`key` | Attribute; When more than one CalcEngine is provided (or if you need to access [Manual Results](#manualResults)), a CalcEngine is referenced by this key; usually via a `ce` property passed into a Vue directive.
`name` | Attribute; The name of the CalcEngine.
`input-tab` | Attribute; The name of the tab where KatApp framework should inject inputs. Default is `RBLInput`.
`result-tabs` | Attribute; Comma delimitted list of result tabs to process during RBLe Calculation. When more than one result tab is provided, the tab is referenced by name; usually via a `tab` property passed into a Vue directive. Default is `RBLResult`.
`configure-ui` | Attribute; Whether or not this CalcEngine should run during the Kaml View's original [Configure UI Calculation](#IKatApp.configureUICalculation). Default is `true`.
`precalcs` | Attribute; Comma delimitted list of CalcEngines, i.e. `CalcEngine1,CalcEngineN` to use in a a [Precalc Pipeline](#Precalc Pipelines) for the current CalcEngine. .  By default, if only a CalcEngine name is provided, the input and the result tab with the *same* name as the tabs configured on the primary CalcEngine will be used.  To use different tabs, each PreCalc CalcEngine 'entity' becomes `CalcEngine|InputTab|ResultTab`.  

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
		var application = KatApp.get('{id}');

		// Optionally update the KatApp options and state.
		application.update({ 
			model: {
			},
			options: {
			},
			directives: {
			},
			components: {
			}
		});

		// Optionally bind Application Events
		application.on("applicationEvent", () => console.log( 'handled' ) );

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

When Vue applications are created (which is done behind the scenes in the KatApp framework), they are passed a 'model' which is the 'parent scope' for all Vue directives.  The KatApp framework passes in a IApplicationData model which is described below.  All properties and methods of this model can be used directly in Vue directives.

**This is probably the most important section of documentation since this object is used most often in the Vue directives used by Kaml Views when rendering pages.**

- [IApplicationData](#IApplicationData) - The 'state model' used in all Vue directives.
- [RBLe Framework Result Processing in KatApp State](#rble-framework-result-processing-in-katapp-state) - Describes how RBLe Framework calculation results are turned into 'state model' results.

## IApplicationData

The `IApplicationData` interface represents the 'scope' that is passed in to all KatApp Framework Vue enabled applications. Any of the property types below that are not primitive types (i.e. `string`, `boolean`, `any`, etc.) are explained in more detail in the [Supporting Interfaces](#supporting-interfaces) section. 

It is vital to understand the properties and methods of this interface for Kaml View developers.

This 'scope' object will be accessed in both [Vue directives](#common-vue-directives) and in Kaml View javascript.  However, the method of accessing properties and methods is slightly different based on the context.

```html
<!-- 
In Vue directives, access the properties/methods 'directly' given 
that the 'scope' for Vue directives is the IApplicationData object.
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

### IApplicationData.kaId

Property Type: `string`  
Current id of the running KatApp.  Typically only used in Template Files when a unique id is required.

### IApplicationData.uiBlocked

Property Type: `boolean`  
Returns `true` when a RBL Calculation or Api Endpoint is being processed.  See [`IKatApp.blockUI`](#IKatApp.blockUI) and [`IKatApp.unblockUI`](#IKatApp.unblockUI) for more information. Typically used to show a 'blocker' on the rendered HTML to prevent the user from clicking anywhere.

### IApplicationData.needsCalculation

Property Type: `boolean`  
Returns `true` when input that will trigger a calculation has been edited but has not triggered a calculation yet.  Typically used with [`v-ka-needs-calc`](#v-ka-needs-calc) directive which toggles 'submit button' state to indicate to the user that a calculation is needed before they can submit the current form.

### IApplicationData.model

Property Type: `any`  
Kaml Views can pass in 'custom models' that hold state but are not built from Calculation Results. See [`IKatApp.update`](#IKatApp.update) for more information.

### IApplicationData.handlers

Property Type: `IStringAnyIndexer`  
Kaml Views can pass in event handlers that can be bound via @event syntax (i.e. `@click="handlers.foo"`). See [`IKatApp.update`](#IKatApp.update) for more information.

### IApplicationData.components

Property Type: `IStringIndexer<IStringAnyIndexer>`  
Kaml Views can pass in petite-vue components that can used in v-scope directives (i.e. v-scope="components.inputComponent({})"). See [`IKatApp.update`](#IKatApp.update) for more information.

### IApplicationData.inputs

Property Type: `ICalculationInputs`  
Inputs to pass along to each calculation during life span of KatApp

### IApplicationData.errors

Property Type: `Array<IValidation>`  
Error array populated from the `error` calculation result table, API validation issues, unhandled exceptions in KatApp Framework or manually via `push` Kaml View javascript.  Typically they are bound to a validation summary template and input templates.

### IApplicationData.warnings

Property Type: `Array<IValidation>`  
Warning array populated from the `warning` calculation result table or manually via `push` Kaml View javascript.  Typically they are bound to a validation summary template and input templates.

### IApplicationData.rbl.results

Property Type: `IStringIndexer<IStringIndexer<Array<ITabDefRow>>>`  
JSON object containing results of all assocatied CalcEngines.  Typically not used by Kaml developers.  Instead, use other methods of IRblApplicationData to grab results.  The `string` key to results is the concatenation of `CalcEngineKey.TabName`.

See [RBLe Framework Result Processing in KatApp State](#rbl-framework-result-processing-in-katapp-state) to understand how RBLe Framework result managed in KatApp state to ensure proper `reactivity` after each calculation.

```javascript
// The object can be visualized as follows
state: {
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

### IApplicationData.rbl.source

**`source(table: string, calcEngine?: string, tab?: string, predicate?: (row: ITabDefRow) => boolean) => Array<ITabDefRow>`**

Returns table rows from `results`.  The CalcEngine key and `ITabDef` name can be passed in if not using the default CalcEngine and result tab. 

A `predicate` can be passed to filter rows before returning them.

```javascript
// Return all resultTable rows
application.state.rbl.source("resultTable");
// Return all resultTable rows where category = 'red'
application.state.rbl.source("resultTable", r => r.category == 'red');
// Return all brdResultTable rows from the BRD CalcEngine
application.state.rbl.source("brdResultTable", "BRD");
// Return all resultTable rows from the 'RBLSecondTab' tab def
application.state.rbl.source("resultTable", undefined, "RBLSecondTab");
// Return all brdResultTable rows from the BRD CalcEngine where topic = 'head'
application.state.rbl.source("brdResultTable", "BRD", r => r.topic == 'head');
```

### IApplicationData.rbl.exists

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

### IApplicationData.rbl.value

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
// Return 'value' column from 'rbl-value' table where '@id' column is "name-first" from the RBLResult2 tab in the default CalcEngine
const name = application.state.rbl.value("rbl-value", "name-first", undefined, undefined, undefined, "RBLResult2");
// Return 'value2' column from 'rbl-value' table where 'key' column is "name-first" from the RBLResult2 tab in the BRD CalcEngine
const name = application.state.rbl.value("custom-table", "name-first", "value2", "key", "BRD", "RBLResult2");
```

### IApplicationData.rbl.boolean

**`boolean(table: string, keyValue: string, returnField?: string, keyField?: string, calcEngine?: string, tab?: string, valueWhenMissing?: boolean) => boolean`**

Returns `true` if the value returned (with same function signature as `rbl.value`) if value is `undefined` (currently not present in results) or value is string and lower case is not in ['false', '0', 'n', 'no'] or value converted to a boolean is `true`.  Typically used in `v-if` and `v-show` directives.

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

### IApplicationData.rbl.onAll

**`onAll(...values: any[]) => boolean`**

Returns `true` if **all** values passed in evaluate to `true` using same conditions described in `rbl.boolean()`.

### IApplicationData.rbl.onAny

**`onAny(...values: any[]) => boolean`**

Returns `true` if **any** value passed in evaluates to `true` using same conditions described in `rbl.boolean()`.

### IApplicationData.pushTo

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

## RBLe Framework Result Processing in KatApp State

Since Vue directives and template syntax is driven by a [reactivity mental model](#https://vuejs.org/guide/essentials/reactivity-fundamentals.html), it is important to process RBLe Framework calculations properly to subscribe into this reactivity correctly.

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

Vue is a template based javascript framework. Often all markup can be generated without the use of the [HTML Content Template element](#https://developer.mozilla.org/en-US/docs/Web/HTML/Element/template), however there are times when reusable pieces of markup are required or simply developer preference to segregate html content into a template that will be rendered only when needed.

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
	var application = KatApp.get('{id}');
	application.update({
		model: {
			list: ["Pension", "LifeEvents", "Savings"]
		}
    });
)();
</script>

<!-- Loop each item in list and call template with non-array source -->
<div class="rbl-nocalc" v-for="item in model.list">
    <div v-ka-template="{ name: 'templateWithScript', source: { name: item } }"></div>
</div>

<template id="templateWithScript">
	<script setup type="text/javascript">
		function mounted(application) {
			// Use {{ }} syntax to grab value and store it in string selector
            const renderId = '.{{$renderId}}';
			console.log(`setup templateMounted:, ${application.select(renderId).length} scoped items found`);
			console.log(`setup templateMounted:, ${application.select(renderId).length} template-script-input items found`);
		}
		function unmounted(application) {
			const renderId = '.{{$renderId}}';
			console.log(`setup templateUnmounted:, ${application.select(renderId).length} scoped items found`);
			console.log(`setup templateUnmounted:, ${application.select(renderId).length} template-script-input items found`);
		}
	</script>
	<script type="text/javascript">
		function mounted(application) {
			const renderId = '.{{$renderId}}';
			console.log(`templateMounted:, ${application.select(renderId).length} scoped items found`);
			console.log(`templateMounted:, ${application.select(".template-script-input").length} template-script-input items found`);
		}
		function unmounted(application) {
			const renderId = '.{{$renderId}}';
			console.log(`templateUnmounted:, ${application.select(".template-script-input").length} template-script-input items found`);
		}
	</script>
	<input v-ka-input="{name: 'iTemplateInput' + name }" type="text" :class="['form-control template-script-input', $renderId]" />
</template>

<!-- Rendered HTML -->
<div class="rbl-nocalc">
    <input name="iTemplateInputPension" 
        type="text" 
        class="form-control template-script-input iTemplateInputPension templateWithScript_templateWithScript_ka1e46825c_1">
    <input name="iTemplateInputLifeEvents" 
        type="text" 
        class="form-control template-script-input iTemplateInputLifeEvents templateWithScript_templateWithScript_ka1e46825c_2">
    <input name="iTemplateInputPension" 
        type="text" 
        class="form-control template-script-input iTemplateInputSavings templateWithScript_templateWithScript_ka1e46825c_3">
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
	var application = KatApp.get('{id}');
	application.update({
		model: {
			list: ["Pension", "LifeEvents", "Savings"]
		}
    });
)();
</script>

<!-- Call template with array source -->
<div class="rbl-nocalc" v-ka-template="{ name: 'templateWithScript', source: model.list.map( item => ({ name: item }) ) }"></div>

<template id="templateWithScript">
	<script setup type="text/javascript">
		function mounted(application) {
			// Use {{ }} syntax to grab value and store it in string selector
            const renderId = '.{{$renderId}}';
			console.log(`setup templateMounted:, ${application.select(renderId).length} scoped items found`);
			console.log(`setup templateMounted:, ${application.select(renderId).length} template-script-input items found`);
		}
		function unmounted(application) {
			const renderId = '.{{$renderId}}';
			console.log(`setup templateUnmounted:, ${application.select(renderId).length} scoped items found`);
			console.log(`setup templateUnmounted:, ${application.select(renderId).length} template-script-input items found`);
		}
	</script>
	<script type="text/javascript">
		function mounted(application) {
			const renderId = '.{{$renderId}}';
			console.log(`templateMounted:, ${application.select(renderId).length} scoped items found`);
			console.log(`templateMounted:, ${application.select(".template-script-input").length} template-script-input items found`);
		}
		function unmounted(application) {
			const renderId = '.{{$renderId}}';
			console.log(`templateUnmounted:, ${application.select(".template-script-input").length} template-script-input items found`);
		}
	</script>

    <!-- Render items with v-for -->
	<input v-for="(row, index) in rows" v-ka-input="{name: 'iTemplateInput' + row.name }" type="text" :class="['form-control template-script-input', $renderId]" />
</template>

<!-- Rendered HTML (notice how the last segment of renderId is always 1 in this case) -->
<div class="rbl-nocalc">
    <input name="iTemplateInputPension" 
        type="text" 
        class="form-control template-script-input iTemplateInputPension templateWithScript_templateWithScript_ka1e46825c_1">
    <input name="iTemplateInputLifeEvents" 
        type="text" 
        class="form-control template-script-input iTemplateInputLifeEvents templateWithScript_templateWithScript_ka1e46825c_1">
    <input name="iTemplateInputPension" 
        type="text" 
        class="form-control template-script-input iTemplateInputSavings templateWithScript_templateWithScript_ka1e46825c_1">
</div>
```

With the above example, you could expect the following in the console ouput (remembering that all rendering completes before `mounted` is called):

> templateWithScript setup templateMounted:, 3 scoped items found
> templateWithScript setup templateMounted:, 3 template-script-input items found
> templateWithScript templateMounted:, 3 scoped items found
> templateWithScript templateMounted:, 3 template-script-input items found

**Note**: When a template with `<script>` tags is called and passed an `Array` data source, you can see that both the `setup` and 'normal' scripts excecute only one time, therefore it is recommended to always use the 'normal' script mode.

## Input Templates

When templates are used to render an input (or input group), they need to be designated as such.  This instructs the KatApp Framework to locate all `HTMLInputElement`s to ensure that inputs have the proper events hooked up to them.  This is accomplished by using an `input` attribute on the script tag.

```html
<template id="input-text" input>
    <label>My Input</label>
    <input name="iMyInput"/> <!-- KatApp Framework finds this input and adds the required event watchers -->
</template>
```

# Common Vue Directives

Vue supports [many directives](#https://vuejs.org/api/built-in-directives.html), however, there are only a handful that commonly used in Kaml View files.  Below are the most common directives used and some examples of how to use them with the [IApplicationData scope object](#iapplicationdata).

- [v-html / v-text](#v-html--v-text) - Update the element's `innerHTML` or text content.
- [v-bind](#v-bind) - Dynamically bind one or more attributes to an expression.
- [v-for](#v-for) - Render the element or template block multiple times based on the source data.
- [v-on](#v-on) - Attach an event listener to the element.
- [v-if / v-else / v-else-if](#v-if--v-else--v-else-if) - Conditionally render an element or a template fragment based on the truthy-ness of the expression value.
- [v-show](#v-show) - Toggle the element's visibility based on the truthy-ness of the expression value.

**Note:** Usually, 'inside' the actual directive markup, the content is simply 'valid javascript' with the given context/scope.

## v-html / v-text

Use the `v-text` directive to:

> [Vue](#https://vuejs.org/api/built-in-directives.html#v-text): Update the element's text content.

Or, use the `v-html` directive to:

> [Vue](#https://vuejs.org/api/built-in-directives.html#v-html): Update the element's [innerHTML](#https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML).

The `v-html`, and less common `v-text`, directive is most commonly used inside the processing of a [`v-for`](#v-for) directive.  It can also be used in conjunction with the [`rbl.value()`](#iapplicationdatarblvalue) method as well.

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

> [Vue](#https://vuejs.org/api/built-in-directives.html#v-bind): Dynamically bind one or more attributes, or a component prop to an expression.

> [petite-vue](#https://github.com/vuejs/petite-vue#not-supported) Not Supported: `v-bind:style` auto-prefixing

Also note, features from Vue documentation that petite-vue does not support:
1. `.prop` - force a binding to be set as a DOM property.
1. `.attr` - force a binding to be set as a DOM attribute.
1. `<button :[key]="value"></button>` - dynamic attribute name.
1. `style` auto-prefixing - when a CSS property that requires [vendor prefix](#https://developer.mozilla.org/en-US/docs/Glossary/Vendor_Prefix) (i.e. `transform`)

The `v-bind` directive *does* have a `:` shorthand syntax that allows for more terse markup.

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

### v-bind class and style Attributes

The `class` and `style` attributes have special processing that occurs.

1. The `class` 'expression' can return `string` | `IStringIndexer<boolean>` | `Array<string | IStringIndexer<boolean>>`
1. The `style` 'expression' can return `string` | `IStringIndexer<string | Array<string>>` | `Array<string | IStringIndexer<string>>`
1. The `style` 'expression' can return `Array<IStringIndexer<Array<string>>` to support [Vendor Prefixing](#https://developer.mozilla.org/en-US/docs/Glossary/Vendor_Prefix) where only the last supported style is rendered.
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

When expression is IStringIndexer<string> each style is applied and overrides any existing matching styles with last element in array taking precedence.
-->
<div :style="{ color: model.activeColor, fontSize: model.fontSize + 'px' }"></div>
<!-- Renders.. -->
<div style="color: red; fontSize: 30px;"></div>

<!-- 
Expression of type Array<string, IStringIndexer<string>>
Can mix and match string and IStringIndexer<string> in the array as well.
-->
<div style="border: 1px solid blue;" :style="['font-weight: bold', { color: model.activeColor, fontSize: model.fontSize + 'px' }, { font-weight: 'normal' }]"></div>
<!-- Renders... -->
<div style="border: 1px solid blue; color: red; fontSize: 30px; font-weight: normal;"></div>

<!-- 
Expression of type IStringIndexer<Array<string>>
You can provide an array of multiple (prefixed) values to a style property and Vue will only render the last value in the array which the browser supports. 
-->
<div :style="{ display: ['-webkit-box', '-ms-flexbox', 'flex'] }"></div>
<!-- Renders `display: flex` for browsers that support the unprefixed version of `flexbox`.  This gets around the limitation of no support for 'auto-prefixing'. -->
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

> [Vue](#https://vuejs.org/api/built-in-directives.html#v-for): Render the element or template block multiple times based on the source data.

> [petite-vue](#https://github.com/vuejs/petite-vue#not-supported) Not Supported: `v-for` deep destructure

There are two allowed syntaxes for `v-for`. 

1. `v-for="item in array"` where `item` is just a 'variable name' representing each item in the iterable source.  In this case, the `array` value, usually `rbl.source()`, represents the iterable source.
1. `v-for="(item, index) in array"` functions the same as above, except with this signature, an 'index' variable has been introduced (it can be named anything) that is a `0..N` integer representing the current position of `item` in the `array`. This is helpful when you need to conditionally change markup based on the first or last item in the iterable source.

Kaml Views will most often use `v-for` in conjunction with [`rbl.source()`](#iapplicationdatarblsource).

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

> [Vue](#https://vuejs.org/api/built-in-directives.html#v-on): Attach an event listener to the element.

> [petite-vue](#https://github.com/vuejs/petite-vue#not-supported) Not Supported: `v-on="{ mousedown: doThis, mouseup: doThat }"`

The `v-on` directive allows Kaml Views to bind events to elements.  The directive expects a `function` reference or an `inline statement`.

The `v-on` directive *does* have a `@` shorthand syntax that allows for more terse markup.

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
1. `.{`keyAlias} - only trigger handler on certain keys.
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
    application.update({
        handlers: {
            paymentOptionsMounted: () => {
                application.state.inputs.iHsaOption = application.select('#eHSAContribution button:first').attr("value");
                new bootstrap.Tab(application.select('#eHSAContribution button:first')[0]).show();
            }
        }
    })
</script>

<div v-if="rbl.boolean('showElectionForm')" @vue:mounted="handlers.paymentOptionsMounted">
    <ul class="nav nav-tabs" id="eHSAContribution" role="tablist">
        <li v-if="rbl.boolean('enableHsaPPP')" class="nav-item" role="presentation">
            <button class="nav-link" data-bs-toggle="tab" data-bs-target="#perPayPeriod" type="button" role="tab" aria-controls="perPayPeriod" aria-selected="true" value="perPay">Change per-pay-period contribution</button>
        </li>
        <li v-if="rbl.boolean('enableHsaOneTime')" class="nav-item" role="presentation">
            <button @click="handlers.togglePaymentOption" class="nav-link" data-bs-toggle="tab" data-bs-target="#iOneTime" type="button" role="tab" aria-controls="iOneTime" aria-selected="false" value="oneTime">Make a one-time contribution</button>
        </li>
    </ul>

    <!-- Omitting markup for the actual tab content -->
</div>
```


## v-if / v-else / v-else-if

> [Vue](#https://vuejs.org/api/built-in-directives.html#v-if) Conditionally render an element or a template fragment based on the truthy-ness of the expression value.

> [petite-vue](#https://github.com/vuejs/petite-vue#not-supported) Not Supported: Transitions

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

> [Vue](#https://vuejs.org/api/built-in-directives.html#v-show) Toggle the element's visibility based on the truthy-ness of the expression value.

> [petite-vue](#https://github.com/vuejs/petite-vue#not-supported) Not Supported: Transitions

`v-show` works by setting the display CSS property via inline styles, and will try to respect the initial display value when the element is visible.

# Custom KatApp Directives

Similiar to common Vue directives, the KatApp Framework provides custom directives that help rendering markup by leveraging/accessing RBLe Framework calculation results.  The majority of the KatApp Framework directives take a 'model' coming in describing how the directive should function. [`v-ka-template`](#v-ka-template), [`v-ka-input`](#v-ka-input) and [`v-ka-input-group`](#v-ka-input-group) take a model *and* return a 'scope' object that can be used by the markup contained by the template. [`v-ka-needs-calc`](#v-ka-needs-calc) and [`v-ka-inline`](#v-ka-inline) are 'marker' directives and do not take a model or return a scope.

- [v-ka-value](#v-ka-value) - Update element's `innerHTML` from designated RBLe Framework result.
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
- [v-ka-needs-calc](#v-ka-needs-calc) - Control UI state when a submission form requires a RBLe Framework calculation before user can click the 'submit' button.
- [v-ka-inline](#v-ka-inline) - Render *raw HTML* without the need for a `HTMLElement` 'container'.

## v-ka-value

The `v-ka-value` directive is responsible assigning element HTML content from the calculation results.  It is simply a shorthand syntax to use in place of [`v-html`](#v-html--v-text) and [`rbl.value()`](#iapplicationdatarblvalue).

### v-ka-value Model

The model used to configure how a `v-ka-value` will find the appropriate calculation result value is simply a `.` delimitted `string`.

The selector has the format of `table.keyValue.returnField.keyField.calcEngine.tab`. As you can see, it has the same parameters as the [rbl.value()](#iapplicationdatarblvalue) method and behaves the same way. Each of the model 'segments' are optional.

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
<!-- Return 'value' column from 'rbl-value' table where 'key' column is "name-first". NOTE: The 'empty' segment where returnValue is omitted -->
<div v-ka-value="custom-table.name-first..key"></div>

<!-- Return 'value' column from 'rbl-value' table where '@id' column is "name-first" from the BRD CalcEngine. NOTE: Empty segments. -->
<div v-ka-value="rbl-value.name-first...BRD"></div>
<!-- Return 'value' column from 'rbl-value' table where '@id' column is "name-first" from the RBLResult2 tab in the default CalcEngine -->
<div v-ka-value="rbl-value.name-first....RBLResult2"></div>
<!-- Return 'value2' column from 'rbl-value' table where 'key' column is "name-first" from the RBLResult2 tab in the BRD CalcEngine -->
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

## v-ka-input

The `v-ka-input` directive is responsible for initializing HTML inputs to be used in conjunction with the RBLe Framework calculations via synchronizing [`state.inputs`](#iapplicationdatainputs) and HTML inputs.  Events are bound to inputs for default behaviors needed to handle RBLe Framework calculations. Functionality of the [`v-ka-input` Scope](#v-ka-input-scope) is built from specific, known tables in the RBLe Framework calculation (i.e. display,  disabled, etc.).

The `v-ka-input` directive can be used in three scenarios.

1. Applied to a `div` element and provided a `template`. The `<template>` content will be rendered and the rendered content will be searched for any `HTMLInputElement`s and automatically have event watchers added to trigger RBLe Framework calculations as needed and well as binding to the [state.inputs](#iapplicationdatainputs) model. The `<template>` markup will have access to the [scope](#v-ka-input-scope).
1. Applied to a `HTMLInputElement` directly without a `template`. Same as the inputs rendered in a template, this input will have events and binding set up and access to the scope.
1. Applied to a 'container' `HTMLElement` without a `template`. Similar to when a `template` is provided, the container children will be searched for any `HTMLInputElement`s and automatically added events and bindings. The container will be given access to the scope. This can be envisioned as an 'inline template' so to speak where all the markup for an input is manually provided and only available to the current input.

Internally, KatApp Framework leverages the [`v-scope`](#https://github.com/vuejs/petite-vue#petite-vue-only) directive to append 'input helper properties and methods' onto the 'global scope' object that can be used by inputs or templates.

### v-ka-input Model

The `IKaInputModel` represents the model type containing the properties that configure the initialization of inputs and the returned [`v-ka-input` scope](#v-ka-input-scope). All properties of the `IKaInputModel` will be present as *read only* properties on the scope. See the scope documentation for more information.

The `v-ka-input` directive *does* have a `string` shorthand syntax that allows for more terse markup.  If the input instructions only needs to provide an input name to the directive, the following can be used.

```html
<!-- The following examples are equivalent -->
<input v-ka-input="iNameFirst" type="text"></input>
<input v-ka-input="{ name: 'iNameFirst' }" type="text"></input>
```

#### IKaInputModel.name

Property Type: `string`; Required  
The name of the input.  In RBLe Framework, input names start with lower case `i` and then the remaing part(s) is/are [Pascal Case](#https://www.codingem.com/what-is-pascal-case/) (i.e. `iFirstName`).

#### IKaInputModel.template

Property Type: `string`; Optional  
Return an template ID if a [template](#html-content-template-elements) will be used to render markup with the scope.

#### IKaInputModel.type

Property Type: `string`; Optional  
When the associated `HTMLInputElement` is an `INPUT` (vs `SELECT` or `TEXTAREA`), you can provide a [type](#https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#input_types).  By default `text` is used assumed.

The value can also be provided via the `rbl-input.type` RBLe Framework calculation value.

##### IKaInputModel.type for range Inputs

In addition to events that trigger RBLe Framework calculations, if the `HTMLInputElement.type` is of type `range`, the KatApp Framework adds a few more events to enable displaying the `range` value for the benefit of the user.  To enable this feature, the Kaml View developers have to take advantage of the [Template Refs](#https://vuejs.org/guide/essentials/template-refs.html#template-refs) feature of Vue and provide the following `ref` assignments, all of which are optional if the Kaml View does not desire the functionality.

1. `ref="display"` - This is an `HTMLElement` whose `innerHTML` will be set to the value of the `range` every time the value changes.
1. `ref="bubble"` - This is an `HTMLElement` that will have a CSS class of `active` toggled on and off.  It will be on while the user is moving the slider or hovering over the slider, and turned off when the user's mouse no longer is over the `range` input.
1. `ref="bubbleValue" - This is an `HTMLElement` whose `innerHTML` will be set to the value of the `range` every time the value changes.

#### IKaInputModel.value

Property Type: `string`; Optional  
A default value for the input scope can be provided.  

The value can also be provided via the `rbl-defaults.value` or the `rbl-input.value` RBLe Framework calculation value.

#### IKaInputModel.label

Property Type: `string`; Optional  
A label for the input scope can be provided.  

The value can also be provided via the `rbl-value[@id=='l' + name].value` or the `rbl-input.label` RBLe Framework calculation value.

#### IKaInputModel.placeHolder

Property Type: `string`; Optional  
A [placeholder](#https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#placeholder) for the input scope can be provided.

The value can also be provided via the `rbl-value[@id=='ph' + name].value` or the `rbl-input.placeholder` RBLe Framework calculation value.

#### IKaInputModel.hideLabel

Property Type: `boolean`; Optional  
A value for the input scope determining whether the label should be hidden can be provided.

The value can also be provided via a RBLe Framework calculation value. If `rbl-input.label == '-1'`, the label will be hidden.

#### IKaInputModel.help.title

Property Type: `string`; Optional  
Provide a `title` for contextual help to the input scope containing HTML markup.

The value can also be provided via the `rbl-value[@id=='h' + name + 'Title'].value` or the `rbl-input.help-title` RBLe Framework calculation value.

#### IKaInputModel.help.content

Property Type: `string`; Optional  
Provide `content` for contextual help to the input scope containing HTML markup.

The value can also be provided via the `rbl-value[@id=='h' + name].value` or the `rbl-input.help` RBLe Framework calculation value.

#### IKaInputModel.help.width

Property Type: `number`; Optional  
Provide a width for contextual help to the input scope. If the help is to be rendered with [Bootstrap popovers](#https://getbootstrap.com/docs/5.0/components/popovers/#options) and RBLe Framework, the `width` can be provided. The default value is `250`.

The value can also be provided via the `rbl-input.help-width` RBLe Framework calculation value.

#### IKaInputModel.iconHtml

Property Type: `string`; Optional  
Provide additional HTML Markup that could be rendered next to other icons that perform actions.  For example, a `range` input may have an additional icon that should open up a 'worksheet' or [v-ka-modal](#v-ka-modal).

#### IKaInputModel.list

Property Type: `Array<{ key: string; text: string; }>`; Optional  
Provide a `list` to the input scope if the input renders a list (i.e. `SELECT`, `type="radio"`, etc.).

The value can also be provided via the `rbl-listcontrol.table` or `rbl-input.list` RBLe Framework calculation value which points to a table containing columns of `key` an `text`.

#### IKaInputModel.css.input

Property Type: `string`; Optional  
Provide css strings to the input scope that could be applied to the 'inputs' in the template markup.

#### IKaInputModel.css.container

Property Type: `string`; Optional  
Provide css strings to the input scope that could be applied to the 'container' in the template markup.

#### IKaInputModel.prefix

Property Type: `string`; Optional  
Provide a `prefix` to the input scope that could be displayed before the actual input (i.e. with Bootstrap [input-group](#https://getbootstrap.com/docs/5.0/forms/input-group/) markup).

The value can also be provided via the `rbl-input.prefix` RBLe Framework calculation value.

#### IKaInputModel.suffix

Property Type: `string`; Optional  
Provide a `suffix` to the input scope that could be displayed after the actual input (i.e. with Bootstrap [input-group](#https://getbootstrap.com/docs/5.0/forms/input-group/) markup).

The value can also be provided via the `rbl-input.suffix` RBLe Framework calculation value.

#### IKaInputModel.maxLength

Property Type: `number`; Optional  
Provide a `maxLength` to the input scope that could be used to limit the length of textual inputs.

The value can also be provided via the `rbl-input.max-length` RBLe Framework calculation value.

#### IKaInputModel.displayFormat

Property Type: `string`; Optional  
Provide a `displayFormat` to the input scope that could be used to format a value before displaying it. This is currently used when the input type is `range`.  The format should be valid a C# format string in the format of `{0:format}` where `format` is a format string described in one of the links below.

1. [Standard number format strings](#https://learn.microsoft.com/en-us/dotnet/standard/base-types/standard-numeric-format-strings)
1. [Custom number format strings](#https://learn.microsoft.com/en-us/dotnet/standard/base-types/custom-numeric-format-strings)
1. [Standard date format strings](#https://learn.microsoft.com/en-us/dotnet/standard/base-types/standard-date-and-time-format-strings)
1. [Custom date format strings](#https://learn.microsoft.com/en-us/dotnet/standard/base-types/custom-date-and-time-format-strings)

The value can also be provided via the combination of `rbl-sliders.format` and `rbl-sliders.decimals` or the `rbl-input.display-format` RBLe Framework calculation value. When the format comes from `rbl-sliders`, it will be turned into the string of `{0:format + decimals}` (i.e. {0:p2} if `format` was `p` and `decimals` was `2`).

#### IKaInputModel.min

Property Type: `number | string`; Optional  
Provide a `min` value to the input scope that could be used to limit the minimum allowed value on `date` or `range` inputs.

The value can also be provided via the `rbl-input.min` RBLe Framework calculation value.

#### IKaInputModel.max

Property Type: `number | string`; Optional  
Provide a `max` value to the input scope that could be used to limit the maximum allowed value on `date` or `range` inputs.

The value can also be provided via the `rbl-input.max` RBLe Framework calculation value.

#### IKaInputModel.step

Property Type: `number`; Optional  
Provide a `step` increment value to the input scope that could be used to control the value increments for `range` inputs.

The value can also be provided via the `rbl-input.step` RBLe Framework calculation value.

#### IKaInputModel.uploadEndpoint

Property Type: `string`; Optional  
Provide an `uploadEndpoint` value to the input scope that could be used if `type="file"` or if the template will render a 'file upload' UI component.

#### IKaInputModel.ce

Property Type: `string`; Optional  
Provide the CalcEngine key if all the values that automatically pull from RBLe Framework calculation values should use a CalcEngine *different from the default CalcEngine*.

#### IKaInputModel.tab

Property Type: `string`; Optional  
Provide the CalcEngine result tab name if all the values that automatically pull from RBLe Framework calculation values should use a tab name *different from the default tab specified for the associated CalcEngine*.

#### IKaInputModel.isNoCalc

Property Type: `(base: IKaInputScopeBase) => boolean`; Optional
Provide a delegate to the input scope that can be called to determine if an input should *not* trigger an RBLe Framework calculation.

The value can also be provided via the `rbl-skip.value` or `rbl-input.skip` RBLe Framework calculation value.

The `base` parameter passed into the delegate gives access a `base.noCalc` property configured by the default RBLe Framework calculation value processing described above.

**Note:** Additionally if any input or input ancestor has `rbl-nocalc` or `rbl-exclude` in the class list, the calculation will not occur.

#### IKaInputModel.isDisabled

Property Type: `(base: IKaInputScopeBase) => boolean`; Optional
Provide a delegate to the input scope that can be called to determine if an input should be disabled.

The value can also be provided via the `rbl-disabled.value` or `rbl-input.disabled` RBLe Framework calculation value.

The `base` parameter passed into the delegate gives access a `base.disabled` property configured by the default RBLe Framework calculation value processing described above.

#### IKaInputModel.isDisplay

Property Type: `(base: IKaInputScopeBase) => boolean`; Optional
Provide a delegate to the input scope that can be called to determine if an input should be displayed.

The value can also be provided via the `rbl-display.value` or `rbl-input.display` RBLe Framework calculation value.

The `base` parameter passed into the delegate gives access a `base.display` property configured by the default RBLe Framework calculation value processing described above.

#### IKaInputModel.events

Property Type: `IStringIndexer<((e: Event, application: KatApp) => void)>`; Optional
Provide a javascript object where each property is an event handler.  These event handlers will automatically be added to `HTMLInputElements` based on the property name.  The property name follows the same patterns as the [`v-on`](#v-on) directive (including [modifiers](#v-on-modifiers)).

### v-ka-input Model Samples

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
    help: { content: 'Enter your DOB :), also 1 + 2 = {{1+2}}.<br/><b>I\'m bold</b><br/><a v-ka-navigate=&quot;{ view: \'Channel.Home\', inputs: { iFromTooltip: 1 } }&quot;>Go home</a>' }, 
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
3. iUpload is provided uploadEndpoint and template renders a button called iUploadUpload that leverages IKaInputScope.uploadAsync
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
        <a href="#" @click.prevent="handlers.processUpload" class='btn btn-primary'><i class="fa-solid fa-upload"></i> Upload</a>
    </div>
</div>
```

### v-ka-input Scope

The `IKaInputScope` represents the type containing the properties and methods available to inputs and templates that use the `v-ka-input` directive. For the most part, it is a 'read only' version of the `IKaInputModel` object, with default functionality provided from RBLe Framework calculation results when needed.  Additionally, there are helper properties and methods available as well.

#### IKaInputScope.id

Property Type: `string`;  
Gets the unique, generated `id` for the current input. This value *should* be used if an `id` attribute needs to be rendered on an `HTMLInputElement`.

#### IKaInputScope.name

Property Type: `string`;  
Gets the `name` to use for the current input.

#### IKaInputScope.type

Property Type: `string`;  
Gets the [`type`](#https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#input_types) to use if the associated `HTMLInputElement` is an `INPUT` (vs `SELECT` or `TEXTAREA`).

The value can by provided by the model or a RBLe Framework calculation value.

Returns value based on following precedence:

1. `rbl-input.type` RBLe Framework calculation value
1. `model.type` property
1. `text` if no value provided.

#### IKaInputScope.value

Property Type: `string`;  
Gets the default value to use for the input.

The value can by provided by the model or a RBLe Framework calculation value.

Returns value based on following precedence:

1. `rbl-input.value` RBLe Framework calculation value
1. `rbl-defaults.value` RBLe Framework calculation value
1. `model.value` property
1. `""` if no value provided.

#### IKaInputScope.disabled

Property Type: `boolean`;  
Gets a value indicating the disabled state of the current input.

The value can by provided by the model or a RBLe Framework calculation value.

Returns value based on following precedence:

1. `model.isDisabled` delegate property
1. `rbl-input.disabled` RBLe Framework calculation value (if value is `1`)
1. `rbl-disabled.value` RBLe Framework calculation value (if value is `1`)
1. `false` if no value provided.

#### IKaInputScope.display

Property Type: `boolean`;  
Gets a value indicating the display state of the current input.

The value can by provided by the model or a RBLe Framework calculation value.

Returns value based on following precedence:

1. `model.isDisplay` delegate property
1. `rbl-input.display` RBLe Framework calculation value (if value is *not* `0`)
1. `rbl-display.value` RBLe Framework calculation value (if value is *not* `0`)
1. `true` if no value provided.

#### IKaInputScope.noCalc

Property Type: `boolean`;  
Get a value indicating whether the current input should trigger a RBLe Framework calculation on 'change'.

The value can by provided by the model or a RBLe Framework calculation value.

Returns value based on following precedence:

1. `model.isNoCalc` delegate property
1. `rbl-input.skip` RBLe Framework calculation value (if value is `1`)
1. `rbl-skip.value` RBLe Framework calculation value (if value is `1`)
1. `false` if no value provided.

**Note:** Additionally if any input or input ancestor has `rbl-nocalc` or `rbl-exclude` in the class list, the calculation will not occur.

#### IKaInputScope.label

Property Type: `string`;  
Gets the label to use for the input.

The value can by provided by the model or a RBLe Framework calculation value.

Returns value based on following precedence:

1. `rbl-input.label` RBLe Framework calculation value
1. `rbl-value[@id='l' + name].value` RBLe Framework calculation value
1. `model.label` property
1. `""` if no value provided.

#### IKaInputScope.hideLabel

Property Type: `boolean`;  
Gets a value determining whether the label should be hidden or not.

The value can by provided by the model or a RBLe Framework calculation value.

Returns value based on following precedence:

1. `rbl-input.label` RBLe Framework calculation value (return `true` if `label == "-1"`)
1. `model.hideLabel` property
1. `false` if no value provided.

#### IKaInputScope.placeHolder

Property Type: `string | undefined`;  
Gets the placeholder to use for the input.

The value can by provided by the model or a RBLe Framework calculation value.

Returns value based on following precedence:

1. `rbl-input.placeholder` RBLe Framework calculation value
1. `rbl-value[@id='ph' + name].value` RBLe Framework calculation value
1. `model.placeHolder` property
1. `undefined` if no value provided.

The property returns `undefined` if nothing provided vs `""` because some templates might want to know if `""` was assigned.  For example, a Bootstrap Floating `SELECT` might be rendered with a default empty, first element if `placeHolder != ""`.

#### IKaInputScope.help.title

Property Type: `string`;  
Gets the contextual help title to use for the input.

The value can by provided by the model or a RBLe Framework calculation value.

Returns value based on following precedence:

1. `rbl-input.help-title` RBLe Framework calculation value
1. `rbl-value[@id='h' + name + 'Title'].value` RBLe Framework calculation value
1. `model.help.title` property
1. `""` if no value provided.

#### IKaInputScope.help.content

Property Type: `string | undefined`;  
Gets the contextual help content to use for the input.

The value can by provided by the model or a RBLe Framework calculation value.

Returns value based on following precedence:

1. `rbl-input.help` RBLe Framework calculation value
1. `rbl-value[@id='h' + name].value` RBLe Framework calculation value
1. `model.help.content` property
1. `undefined` if no value provided.

The property returns `undefined` if nothing provided vs `""` because some templates might want show a contextual help icon or button based on presence of 'help' or not and it was easier to allow this property to be undefined to allow for `v-if="help.content"` type syntax to be used.

#### IKaInputScope.help.width

Property Type: `number`;  
Gets the contextual help width to use for the input. This is helpful when the rendering template uses the built in [Bootstrap Popover](#https://getbootstrap.com/docs/5.0/components/popovers/) support and the width of the popover can be configured via data attributes.

The value can by provided by the model or a RBLe Framework calculation value.

Returns value based on following precedence:

1. `rbl-input.help-width` RBLe Framework calculation value
1. `model.help.width` property
1. `""` if no value provided.

#### IKaInputScope.css.input

Property Type: `string`;  
Gets the CSS class name to apply to rendered input(s).

The value can by provided by the model.

Returns value based on following precedence:

1. `model.css.input` property
1. `""` if no value provided.

#### IKaInputScope.css.input

Property Type: `string`;  
Gets the CSS class name to apply to the rendered `HTMLElement` considered the 'container'.

The value can by provided by the model.

Returns value based on following precedence:

1. `model.css.container` property
1. `""` if no value provided.

#### IKaInputScope.list

Property Type: `Array<{ key: string; text: string; }>`;  
Gets the array of items to use when the rendered input is built from a list.

The value can by provided by the model or a RBLe Framework calculation value.

Returns value based on following precedence:

1. Get the RBLe Framework calculation table where the name is provided in `rbl-input.list`
1. Get the RBLe Framework calculation table where the name is provided in `rbl-listcontrol.value`
1. `model.list` property
1. `[]` if no list is provided.

#### IKaInputScope.prefix

Property Type: `string | undefined`;  
Gets the prefix to display *before* the rendered input.

The value can by provided by the model or a RBLe Framework calculation value.

Returns value based on following precedence:

1. `rbl-input.prefix` RBLe Framework calculation value
1. `model.prefix` property
1. `undefined` if no value provided.

The property returns `undefined` if nothing provided vs `""` because some templates can more easily check for the presense of a prefix. This property is most often used with [Bootstrap input-group](#https://getbootstrap.com/docs/5.0/forms/input-group/) elements.

#### IKaInputScope.suffix

Property Type: `string | undefined`;  
Gets the suffix to display *after* the rendered input.

The value can by provided by the model or a RBLe Framework calculation value.

Returns value based on following precedence:

1. `rbl-input.suffix` RBLe Framework calculation value
1. `model.suffix` property
1. `undefined` if no value provided.

The property returns `undefined` if nothing provided vs `""` because some templates can more easily check for the presense of a suffix. This property is most often used with [Bootstrap input-group](#https://getbootstrap.com/docs/5.0/forms/input-group/) elements.

#### IKaInputScope.maxLength

Property Type: `number`;  
Gets the max length a textual input value can be; often used with `TEXTAREA` inputs.

The value can by provided by the model or a RBLe Framework calculation value.

Returns value based on following precedence:

1. `rbl-input.max-length` RBLe Framework calculation value
1. `model.maxLength` property
1. `250` if no value provided.

#### IKaInputScope.min

Property Type: `string`;  
Gets the min value allowed if the rendered input supports the concept of minimum value (i.e. `range` or `date` types).

The value can by provided by the model or a RBLe Framework calculation value.

Returns value based on following precedence:

1. `rbl-input.min` RBLe Framework calculation value
1. `model.min` property
1. `""` if no value provided.

#### IKaInputScope.max

Property Type: `string`;  
Gets the max value allowed if the rendered input supports the concept of maximum value (i.e. `range` or `date` types).

The value can by provided by the model or a RBLe Framework calculation value.

Returns value based on following precedence:

1. `rbl-input.max` RBLe Framework calculation value
1. `model.max` property
1. `""` if no value provided.

#### IKaInputScope.step

Property Type: `number`;  
Gets the step increment value to use if the rendered input supports the concept of incremental steps (i.e. `range` types).

The value can by provided by the model or a RBLe Framework calculation value.

Returns value based on following precedence:

1. `rbl-input.step` RBLe Framework calculation value
1. `model.step` property
1. `1` if no value provided.

#### IKaInputScope.error

Property Type: `string | undefined`;  
Gets the error message associated with the current input from the [state.errors property](#iapplicationdataerrors). A value of `undefined` indicates no error.

The value can only by provided the [state.errors property](#iapplicationdataerrors).

#### IKaInputScope.warning

Property Type: `string | undefined`;  
Gets the warning message associated with the current input from the [`state.warnings` property](#iapplicationdatawarnings). A value of `undefined` indicates no warning.

The value can only by provided the `state.warnings` property.

#### IKaInputScope.uploadAsync

Property Type: `() => void | undefined`;  
If an [uploadEndpoint](#ikainputmodeluploadendpoint) was provided, the KatApp Framework provides a help function that can be called to automatically submit the rendered [input.files](#https://developer.mozilla.org/en-US/docs/Web/API/File_API/Using_files_from_web_applications#getting_information_about_selected_files) list to the uploadEndpoint for processing.  Error handling is built in and 'success' is implied if no error occurs.

### v-ka-input Scope Samples

```html
<!--
The following uses all the scope properties except for list, maxLength, min, max, step, iconHtml and uploadAsync
-->
<template id="input-textbox-nexgen" input>
    <div v-if="display && !prefix && !suffix" :class="['tip-icon-wrapper', css.container ?? 'mb-3', { 'form-floating': !hideLabel, 'has-help': help.content }]">

        <input :value="value" :name="name" :id="id" :type="type" :class="['form-control', name, css.input, { 'is-invalid': error, 'is-warning': warning }]" :disabled="disabled" :placeholder="hideLabel ? '' : 'Fill'">

        <span :class="['error-icon-hover-area', { 'd-none': !error && !warning, 'error': error, 'warning': warning }]" :data-bs-content="error || warning || 'Error content'" data-bs-toggle="tooltip" data-bs-placement="top"></span>
        <span :class="['help-icon-hover-area', { 'd-none': !help.content }]" :data-bs-width="help.width" :data-bs-content-selector="'#' + id + 'Help'" data-bs-toggle="popover" data-bs-trigger="click" data-bs-placement="top"></span>

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
                <input :value="value" :name="name" :id="id" :type="type" :class="['form-control', name, css.input, { 'is-invalid': error, 'is-warning': warning }]" :disabled="disabled" :placeholder="!hideLabel ? 'Fill' : ''">
                <span :class="['error-icon-hover-area', { 'd-none': !error && !warning, 'error': error, 'warning': warning }]" :data-bs-content="error || warning || 'Error content'" data-bs-toggle="tooltip" data-bs-placement="top"></span>
                <span :class="['help-icon-hover-area', { 'd-none': !help.content }]" :data-bs-width="help.width" :data-bs-content-selector="'#' + id + 'Help'" data-bs-toggle="popover" data-bs-trigger="click" data-bs-placement="top"></span>
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
    <div :class="['tip-icon-wrapper', css.container ?? 'mb-3', { 'form-floating': !hideLabel, 'has-help': help.content }]" v-if="display">
        <select :name="name" :id="id" :class="['form-select', name, css.input, { 'is-invalid': error, 'is-warning': warning }]" :disabled="disabled" :aria-label="label">
            <option v-if="placeHolder != ''" value="">{{placeHolder || 'Select a value'}}</option>
            <option v-for="item in list" :key="item.key" :value="item.key" :selected="value == item.key">{{item.text}}</option>
        </select>
        <span :class="['error-icon-hover-area', { 'd-none': !error && !warning, 'error': error, 'warning': warning }]" :data-bs-content="error || warning || 'Error content'" data-bs-toggle="tooltip" data-bs-placement="top"></span>
        <span :class="['help-icon-hover-area', { 'd-none': !help.content }]" :data-bs-content-selector="'#' + id + 'Help'" data-bs-toggle="popover" data-bs-trigger="click" data-bs-placement="top"></span>
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
                <span style="color: blue;" :class="['fa fa-regular fa-circle-question', { 'd-none': !help.content }]" :data-bs-width="help.width" :data-bs-content-selector="'#' + id + 'Help'" data-bs-toggle="popover" data-bs-trigger="click" data-bs-placement="top"></span>
                <template v-html="iconHtml" v-ka-inline>
                </template>
                <span :class="['fa fa-regular', { 'd-none': !error && !warning, 'error text-danger fa-circle-exclamation': error, 'warning text-warning fa-triangle-exclamation': warning }]" :data-bs-content="error || warning || 'Error content'" data-bs-toggle="tooltip" data-bs-placement="top"></span>
            </div>
            <div ref="display" class="col-auto fs-sm fw-bolder text-end"></div>
        </div>
        <div class="pt-7 range-slider-wrap">
            <div ref="bubble" class="range-slider-bubble"><span ref="bubbleValue"></span></div>
            <input type="range" :class="['col range-slider', name, { 'is-invalid': error, 'is-warning': warning }]" :name="name" :id="id" :min="min" :max="max" :step="step" :value="value">
        </div>
        <div class="d-none" v-if="help.content">
            <div :id="id + 'HelpTitle'" v-html="help.title"></div>
            <div :id="id + 'Help'" v-html="help.content"></div>
        </div>
    </div>
</template>
```

## v-ka-input-group

The `v-ka-input-group` directive is responsible for initializing groups of HTML inputs to be used in conjunction with the RBLe Framework calculations via synchronizing [`state.inputs`](#iapplicationdatainputs) and HTML inputs. It behaves the same as a [v-ka-input directive](#v-ka-input) except that all the properties on the model and scope are essentially array based to support whatever number of inputs the specified template supports.

The `v-ka-input-group` directive can only be used when a `template` is assigned.

Internally, KatApp Framework leverages the [`v-scope`](#https://github.com/vuejs/petite-vue#petite-vue-only) directive to append 'input helper properties and methods' onto the 'global scope' object that can be used by the template.

### v-ka-input-group Model

The `IKaInputGroupModel` represents the model type containing the properties that configure the initialization of inputs and the returned [`v-ka-input-group` scope](#v-ka-input-group-scope). All properties of the `IKaInputGroupModel` will be present as *read only* properties on the scope. See the scope documentation for more information.

#### IKaInputGroupModel.names

Property Type: `Array<string>`; Required  
The array of `string` names representing each input in the gruop.  In RBLe Framework, input names start with lower case `i` and then the remaing part(s) is/are [Pascal Case](#https://www.codingem.com/what-is-pascal-case/) (i.e. [`"iFirstName"`, `"iFirstName2"`]).

#### IKaInputGroupModel.template

Property Type: `string`; Required  
Return the [template](#html-content-template-elements) ID to be used to render group markup with the scope.

#### IKaInputGroupModel.type

Property Type: `string`; Optional  
When the associated group of `HTMLInputElement`s are a `INPUT` (vs `SELECT` or `TEXTAREA`), you can provide a [type](#https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#input_types).  By default `text` is used assumed.

#### IKaInputGroupModel.values

Property Type: `Array<string>`; Optional  
The default values for the input group scope can be provided.  

The values can also be provided via the `rbl-defaults.value` or the `rbl-input.value` RBLe Framework calculation value where the `@id` is one of the values provided by `names`.

#### IKaInputGroupModel.labels

Property Type: `Array<string>`; Optional  
The labels to use for the input group scope can be provided.  

The values can also be provided via the `rbl-value[@id=='l' + name].value` or the `rbl-input.label` RBLe Framework calculation value where the `@id/name` is one of the values provided by `names`.

#### IKaInputGroupModel.placeHolders

Property Type: `Array<string>`; Optional  
The [placeholders](#https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#placeholder) for the input group scope can be provided.

The values can also be provided via the `rbl-value[@id=='ph' + name].value` or the `rbl-input.placeholder` RBLe Framework calculation value where the `@id/name` is one of the values provided by `names`.

#### IKaInputGroupModel.hideLabels

Property Type: `Array<boolean>`; Optional  
An array of values for the input group scope determining whether the labels should be hidden can be provided.

The values can also be provided via a RBLe Framework calculation value where the `@id` is one of the values provided by `names`. If `rbl-input.label == '-1'`, the label will be hidden.

#### IKaInputGroupModel.helps.title

Property Type: `Array<{ title?: string; content?: string; width?: number; }>`; Optional  
Provide the `title`s to use for contextual help to the input group scope containing HTML markup.

The values can also be provided via the `rbl-value[@id=='h' + name + 'Title'].value` or the `rbl-input.help-title` RBLe Framework calculation value where the `@id/name` is one of the values provided by `names`.

#### IKaInputGroupModel.helps.content

Property Type: `Array<{ title?: string; content?: string; width?: number; }>`; Optional  
Provide the `content` values for contextual help to the input group scope containing HTML markup.

The values can also be provided via the `rbl-value[@id=='h' + name].value` or the `rbl-input.help` RBLe Framework calculation value where the `@id/name` is one of the values provided by `names`.

#### IKaInputGroupModel.helps.width

Property Type: `Array<{ title?: string; content?: string; width?: number; }>`; Optional  
Provide the widths for contextual help to the input group scope. If the help is to be rendered with [Bootstrap popovers](#https://getbootstrap.com/docs/5.0/components/popovers/#options) and RBLe Framework, the `width` can be provided. The default value is `250`.

The values can also be provided via the `rbl-input.help-width` RBLe Framework calculation value.

#### IKaInputGroupModel.iconHtmls

Property Type: `Array<string>`; Optional  
Provide additional HTML Markups that could be rendered next to other icons that perform actions.  For example, a `range` inputs may have an additional icon that should open up a 'worksheet' or [v-ka-modal](#v-ka-modal).

#### IKaInputGroupModel.css.input

Property Type: `Array<{ input?: string; container?: number; }>`; Optional  
Provide css strings to the input group scope that could be applied to the 'inputs' in the template markup.

#### IKaInputGroupModel.css.container

Property Type: `Array<{ input?: string; container?: number; }>`; Optional  
Provide css strings to the input scope that could be applied to the 'container' in the template markup.

#### IKaInputGroupModel.prefixes

Property Type: `Array<string>`; Optional  
Provide an array of `prefixes` to the input group scope that could be displayed before the actual inputs (i.e. with Bootstrap [input-group](#https://getbootstrap.com/docs/5.0/forms/input-group/) markup).

The value can also be provided via the `rbl-input.prefix` RBLe Framework calculation value where the `@id` is one of the values provided by `names`.

#### IKaInputGroupModel.suffixes

Property Type: `Array<string>`; Optional  
Provide an array of `suffixes` to the input group scope that could be displayed after the actual inputs (i.e. with Bootstrap [input-group](#https://getbootstrap.com/docs/5.0/forms/input-group/) markup).

The value can also be provided via the `rbl-input.suffix` RBLe Framework calculation value where the `@id` is one of the values provided by `names`.

#### IKaInputGroupModel.maxLengths

Property Type: `Array<number>`; Optional  
Provide an array of `maxLengths` to the input group scope that could be used to limit the length of textual inputs.

The value can also be provided via the `rbl-input.max-length` RBLe Framework calculation value where the `@id` is one of the values provided by `names`.

#### IKaInputGroupModel.displayFormats

Property Type: `Array<string>`; Optional  
Provide an array of `displayFormats` to the input group scope that could be used to format a value before displaying it. This is currently used when the input types are `range`.  The format should be valid a C# format string in the format of `{0:format}` where `format` is a format string described in one of the links below.

1. [Standard number format strings](#https://learn.microsoft.com/en-us/dotnet/standard/base-types/standard-numeric-format-strings)
1. [Custom number format strings](#https://learn.microsoft.com/en-us/dotnet/standard/base-types/custom-numeric-format-strings)
1. [Standard date format strings](#https://learn.microsoft.com/en-us/dotnet/standard/base-types/standard-date-and-time-format-strings)
1. [Custom date format strings](#https://learn.microsoft.com/en-us/dotnet/standard/base-types/custom-date-and-time-format-strings)

The value can also be provided via the combination of `rbl-sliders.format` and `rbl-sliders.decimals` or the `rbl-input.display-format` RBLe Framework calculation value where the `@id` is one of the values provided by `names`. When the format comes from `rbl-sliders`, it will be turned into the string of `{0:format + decimals}` (i.e. {0:p2} if `format` was `p` and `decimals` was `2`).

#### IKaInputGroupModel.mins

Property Type: `Array<number | string>`; Optional  
Provide an array of `mins` values to the input group scope that could be used to limit the minimum allowed value on `date` or `range` inputs.

The value can also be provided via the `rbl-input.min` RBLe Framework calculation value where the `@id` is one of the values provided by `names`.

#### IKaInputGroupModel.maxes

Property Type: `Array<number | string>`; Optional  
Provide an array of `maxes` values to the input group scope that could be used to limit the maximum allowed value on `date` or `range` inputs.

The value can also be provided via the `rbl-input.max` RBLe Framework calculation value where the `@id` is one of the values provided by `names`.

#### IKaInputGroupModel.steps

Property Type: `Array<number>`; Optional  
Provide an array of `steps` increment values to the input group scope that could be used to control the value increments for `range` inputs.

The value can also be provided via the `rbl-input.step` RBLe Framework calculation value where the `@id` is one of the values provided by `names`.

#### IKaInputGroupModel.ce

Property Type: `string`; Optional  
Provide the CalcEngine key if all the values that automatically pull from RBLe Framework calculation values should use a CalcEngine *different from the default CalcEngine*.

#### IKaInputGroupModel.tab

Property Type: `string`; Optional  
Provide the CalcEngine result tab name if all the values that automatically pull from RBLe Framework calculation values should use a tab name *different from the default tab specified for the associated CalcEngine*.

#### IKaInputGroupModel.isNoCalc

Property Type: `(index: number, base: IKaInputGroupScopeBase) => boolean`; Optional
Provide a delegate to the input group scope that can be called to determine if an input should *not* trigger an RBLe Framework calculation.

The value can also be provided via the `rbl-skip.value` or `rbl-input.skip` RBLe Framework calculation value where the `@id` is one of the values provided by `names`.

The `index` parameter can be used to know which 'item' of the group is being queried.

The `base` parameter passed into the delegate gives access a `base.noCalc(index)` property configured by the default RBLe Framework calculation value processing described above.

**Note:** Additionally if any input or input ancestor has `rbl-nocalc` or `rbl-exclude` in the class list, the calculation will not occur.

#### IKaInputGroupModel.isDisabled

Property Type: `(index: number, base: IKaInputGroupScopeBase) => boolean`; Optional
Provide a delegate to the input group scope that can be called to determine if an input should be disabled.

The value can also be provided via the `rbl-disabled.value` or `rbl-input.disabled` RBLe Framework calculation value where the `@id` is one of the values provided by `names`.

The `index` parameter can be used to know which 'item' of the group is being queried.

The `base` parameter passed into the delegate gives access a `base.disabled(index)` property configured by the default RBLe Framework calculation value processing described above.

#### IKaInputGroupModel.isDisplay

Property Type: `(index: number, base: IKaInputGroupScopeBase) => boolean`; Optional
Provide a delegate to the input group scope that can be called to determine if an input should be displayed.

The value can also be provided via the `rbl-display.value` or `rbl-input.display` RBLe Framework calculation value where the `@id` is one of the values provided by `names`.

The `index` parameter can be used to know which 'item' of the group is being queried.

The `base` parameter passed into the delegate gives access a `base.display(index)` property configured by the default RBLe Framework calculation value processing described above.

#### IKaInputGroupModel.events

Property Type: `IStringIndexer<((e: Event, application: KatApp) => void)>`; Optional
Provide a javascript object where each property is an event handler.  These event handlers will automatically be added to all the group `HTMLInputElement`s based on the property name.  The property name follows the same patterns as the [`v-on`](#v-on) directive (including [modifiers](#v-on-modifiers)).


### v-ka-input-group Model Samples

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

### v-ka-input-group Scope

The `IKaInputGroupScope` represents the type containing the properties and methods available to templates that use the `v-ka-input-group` directive. For the most part, it is a 'read only' version of the `IKaInputGroupModel` object, with default functionality provided from RBLe Framework calculation results when needed.  Additionally, there are helper properties and methods available as well.  Since the input group is a 'group of items', almost all scope properties are functions that take a numerical `index` parameter and return the desired property.

#### IKaInputGroupScope.id

Property Type: `(index: number) => string`;  
Given an input index, gets the unique, generated `id` for the current input. This value *should* be used if an `id` attribute needs to be rendered on an `HTMLInputElement`.

#### IKaInputGroupScope.name

Property Type: `(index: number) => string`;  
Given an input index, gets the `name` (from the model `names[index]` array) to use for the current input.

#### IKaInputGroupScope.type

Property Type: `string`;  
Gets the [`type`](#https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input#input_types) to use if the associated `HTMLInputElement`s ar an `INPUT` (vs `SELECT` or `TEXTAREA`).

The value can by provided by the model.

Returns value based on following precedence:

1. `model.type` property
1. `text` if no value provided.

#### IKaInputGroupScope.value

Property Type: `(index: number) => string`;  
Given an input index, gets the default value to use for the input.

The value can by provided by the model or a RBLe Framework calculation value.

Returns value based on following precedence:

1. `rbl-input.value` RBLe Framework calculation value
1. `rbl-defaults.value` RBLe Framework calculation value
1. `model.values[index]` property
1. `""` if no value provided.

#### IKaInputGroupScope.disabled

Property Type: `(index: number) => boolean`;  
Given an input index, gets a value indicating the disabled state of the current input.

The value can by provided by the model or a RBLe Framework calculation value.

Returns value based on following precedence:

1. `model.isDisabled` delegate property
1. `rbl-input.disabled` RBLe Framework calculation value (if value is `1`)
1. `rbl-disabled.value` RBLe Framework calculation value (if value is `1`)
1. `false` if no value provided.

#### IKaInputGroupScope.display

Property Type: `(index: number) => boolean`;  
Given an input index, gets a value indicating the display state of the current input.

The value can by provided by the model or a RBLe Framework calculation value.

Returns value based on following precedence:

1. `model.isDisplay` delegate property
1. `rbl-input.display` RBLe Framework calculation value (if value is *not* `0`)
1. `rbl-display.value` RBLe Framework calculation value (if value is *not* `0`)
1. `true` if no value provided.

#### IKaInputGroupScope.noCalc

Property Type: `(index: number) => boolean`;  
Given an input index, gets a value indicating whether the current input should trigger a RBLe Framework calculation on 'change'.

The value can by provided by the model or a RBLe Framework calculation value.

Returns value based on following precedence:

1. `model.isNoCalc` delegate property
1. `rbl-input.skip` RBLe Framework calculation value (if value is `1`)
1. `rbl-skip.value` RBLe Framework calculation value (if value is `1`)
1. `false` if no value provided.

**Note:** Additionally if any input or input ancestor has `rbl-nocalc` or `rbl-exclude` in the class list, the calculation will not occur.

#### IKaInputGroupScope.label

Property Type: `(index: number) => string`;  
Given an input index, gets the label to use for the input.

The value can by provided by the model or a RBLe Framework calculation value.

Returns value based on following precedence:

1. `rbl-input.label` RBLe Framework calculation value
1. `rbl-value[@id='l' + name].value` RBLe Framework calculation value
1. `model.labels[index]` property
1. `""` if no value provided.

#### IKaInputGroupScope.hideLabel

Property Type: `(index: number) => boolean`;  
Given an input index, gets a value determining whether the label should be hidden or not.

The value can by provided by the model or a RBLe Framework calculation value.

Returns value based on following precedence:

1. `rbl-input.label` RBLe Framework calculation value (return `true` if `label == "-1"`)
1. `model.hideLabels[index]` property
1. `false` if no value provided.

#### IKaInputGroupScope.placeHolder

Property Type: `(index: number) => string | undefined`;  
Given an input index, gets the placeholder to use for the input.

The value can by provided by the model or a RBLe Framework calculation value.

Returns value based on following precedence:

1. `rbl-input.placeholder` RBLe Framework calculation value
1. `rbl-value[@id='ph' + name].value` RBLe Framework calculation value
1. `model.placeHolders[index]` property
1. `undefined` if no value provided.

The property returns `undefined` if nothing provided vs `""` because some templates might want to know if `""` was assigned.  For example, a Bootstrap Floating `SELECT` might be rendered with a default empty, first element if `placeHolder != ""`.

#### IKaInputGroupScope.help.title

Property Type: `(index: number) => { title: string, content?: string; width: number; }`;  
Given an input index, gets the contextual help title to use for the input.

The value can by provided by the model or a RBLe Framework calculation value.

Returns value based on following precedence:

1. `rbl-input.help-title` RBLe Framework calculation value
1. `rbl-value[@id='h' + name + 'Title'].value` RBLe Framework calculation value
1. `model.helps[index]{title?: string}` property
1. `""` if no value provided.

#### IKaInputGroupScope.help.content

Property Type: `(index: number) => { title: string, content?: string; width: number; }`;  
Given an input index, gets the contextual help content to use for the input.

The value can by provided by the model or a RBLe Framework calculation value.

Returns value based on following precedence:

1. `rbl-input.help` RBLe Framework calculation value
1. `rbl-value[@id='h' + name].value` RBLe Framework calculation value
1. `model.helps[index]{ content?: string }` property
1. `undefined` if no value provided.

The property returns `undefined` if nothing provided vs `""` because some templates might want show a contextual help icon or button based on presence of 'help' or not and it was easier to allow this property to be undefined to allow for `v-if="help(index).content"` type syntax to be used.

#### IKaInputGroupScope.help.width

Property Type: `(index: number) => { title: string, content?: string; width: number; }`;  
Given an input index, gets the contextual help width to use for the input. This is helpful when the rendering template uses the built in [Bootstrap Popover](#https://getbootstrap.com/docs/5.0/components/popovers/) support and the width of the popover can be configured via data attributes.

The value can by provided by the model or a RBLe Framework calculation value.

Returns value based on following precedence:

1. `rbl-input.help-width` RBLe Framework calculation value
1. `model.helps[index]{ width?: number }` property
1. `""` if no value provided.

#### IKaInputGroupScope.css.input

Property Type: `(index: number) => { input: string, container: string; }`;  
Given an input index, gets the CSS class name to apply to rendered input(s).

The value can by provided by the model.

Returns value based on following precedence:

1. `model.css[index]{ input?: string }` property
1. `""` if no value provided.

#### IKaInputGroupScope.css.input

Property Type: `(index: number) => { input: string, container: string; }`;  
Given an input index, gets the CSS class name to apply to the rendered `HTMLElement` considered the 'container'.

The value can by provided by the model.

Returns value based on following precedence:

1. `model.css[index]{ container?: string }` property
1. `""` if no value provided.

#### IKaInputGroupScope.list

Property Type: `(index: number) => Array<{ key: string; text: string; }>`;  
Given an input index, gets the array of items to use when the rendered input is built from a list.

The list can by provided by the RBLe Framework calculation.

Returns value based on following precedence:

1. Get the RBLe Framework calculation table where the name is provided in `rbl-input.list`
1. Get the RBLe Framework calculation table where the name is provided in `rbl-listcontrol.value`
1. `[]` if no list is provided.

#### IKaInputGroupScope.prefix

Property Type: `(index: number) => string | undefined`;  
Given an input index, gets the prefix to display *before* the rendered input.

The value can by provided by the model or a RBLe Framework calculation value.

Returns value based on following precedence:

1. `rbl-input.prefix` RBLe Framework calculation value
1. `model.prefixes[index]` property
1. `undefined` if no value provided.

The property returns `undefined` if nothing provided vs `""` because some templates can more easily check for the presense of a prefix. This property is most often used with [Bootstrap input-group](#https://getbootstrap.com/docs/5.0/forms/input-group/) elements.

#### IKaInputGroupScope.suffix

Property Type: `(index: number) => string | undefined`;  
Given an input index, gets the suffix to display *after* the rendered input.

The value can by provided by the model or a RBLe Framework calculation value.

Returns value based on following precedence:

1. `rbl-input.suffix` RBLe Framework calculation value
1. `model.suffixes[index]` property
1. `undefined` if no value provided.

The property returns `undefined` if nothing provided vs `""` because some templates can more easily check for the presense of a suffix. This property is most often used with [Bootstrap input-group](#https://getbootstrap.com/docs/5.0/forms/input-group/) elements.

#### IKaInputGroupScope.maxLength

Property Type: `(index: number) => number`;  
Given an input index, gets the max length a textual input value can be; often used with `TEXTAREA` inputs.

The value can by provided by the model or a RBLe Framework calculation value.

Returns value based on following precedence:

1. `rbl-input.max-length` RBLe Framework calculation value
1. `model.maxLengths[index]` property
1. `250` if no value provided.

#### IKaInputGroupScope.min

Property Type: `(index: number) => string`;  
Given an input index, gets the min value allowed if the rendered input supports the concept of minimum value (i.e. `range` or `date` types).

The value can by provided by the model or a RBLe Framework calculation value.

Returns value based on following precedence:

1. `rbl-input.min` RBLe Framework calculation value
1. `model.mins[index]` property
1. `""` if no value provided.

#### IKaInputGroupScope.max

Property Type: (index: number) => `string`;  
Given an input index, gets the max value allowed if the rendered input supports the concept of maximum value (i.e. `range` or `date` types).

The value can by provided by the model or a RBLe Framework calculation value.

Returns value based on following precedence:

1. `rbl-input.max` RBLe Framework calculation value
1. `model.maxes[index]` property
1. `""` if no value provided.

#### IKaInputGroupScope.step

Property Type: (index: number) => `number`;  
Given an input index, gets the step increment value to use if the rendered input supports the concept of incremental steps (i.e. `range` types).

The value can by provided by the model or a RBLe Framework calculation value.

Returns value based on following precedence:

1. `rbl-input.step` RBLe Framework calculation value
1. `model.steps[index]` property
1. `1` if no value provided.

#### IKaInputGroupScope.error

Property Type: (index: number) => `string | undefined`;  
Given an input index, gets the error message associated with the current input from the [state.errors property](#iapplicationdataerrors). A value of `undefined` indicates no error.

The value can only by provided the [state.errors property](#iapplicationdataerrors).

#### IKaInputGroupScope.warning

Property Type: (index: number) => `string | undefined`;  
Given an input index, gets the warning message associated with the current input from the [`state.warnings` property](#iapplicationdatawarnings). A value of `undefined` indicates no warning.

The value can only by provided the `state.warnings` property.

### v-ka-input-group Scope Sample

```html
<!--
Sample two column 'textbox' input.  Illustrates how to access scope properties via the property(index) syntax
-->
<template id="input-textbox-2col" input>
    <div v-if="display(0)">
        <label :for="id(0)" class="form-label">
            <span v-html="label(0)"></span> <a v-show="help(0).content" :data-bs-content-selector="'#' + id(0) + 'Help'" data-bs-toggle="popover" data-bs-trigger="click" data-bs-placement="top" role="button" tabindex="-1"><i class="fa-solid fa-circle-question text-blue"></i></a>
        </label>
        <div class="d-none" v-if="help(0).content">
            <div :id="id(0) + 'HelpTitle'" v-html="help(0).title"></div>
            <div :id="id(0) + 'Help'" v-html="help(0).content"></div>
        </div>
        <div class="row">
            <div class="col-md-6">
                <div v-if="inputs.iScenarios > 1" class="d-block d-sm-none scenario-header-mobile m-1">Scenario 1</div>
                <div class="mb-3 tip-icon-wrapper">
                    <input :value="value(0)" :name="name(0)" :id="id(0)" :type="type" :class="['form-control', name(0), css(0).input, { 'is-invalid': error(0), 'is-warning': warning(0) }]" :disabled="disabled(0)" />
                    <span :class="['error-icon-hover-area', { 'd-none': !error(0) && !warning(0), 'error': error(0), 'warning': warning(0) }]" :data-bs-content="error(0) || warning(0) || 'Error content'" data-bs-toggle="tooltip" data-bs-placement="top"></span>
                </div>
            </div>
            <div class="col-md-6" v-if="inputs.iScenarios > 1">
                <div class="d-block d-sm-none m-1 scenario-header-mobile">Scenario 2 <a href="#" @click.prevent="inputs.iScenarios = 1;  needsCalculation = true;" class="text-danger"><i class="fa-light fa-square-xmark"></i></a></div>
                <div class="mb-3 tip-icon-wrapper">
                    <input :value="value(1)" :name="name(1)" :id="id(1)" :type="type" :class="['form-control', name(1), css(1).input, { 'is-invalid': error(1), 'is-warning': warning(1) }]" :disabled="disabled(1)" />
                    <span :class="['error-icon-hover-area', { 'd-none': !error(1) && !warning(1), 'error': error(1), 'warning': warning(1) }]" :data-bs-content="error(1) || warning(1) || 'Error content'" data-bs-toggle="tooltip" data-bs-placement="top"></span>
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

#### IKaNavigateModel.view

Property Type: `string`; Required  
The name of the Kaml View to navigate to.

#### IKaNavigateModel.confirm

Property Type: [`IModalOptions`](#imodaloptions); Optional  
If a confirmation dialog should be displayed to prompt the user whether or not to allow the navigation, the options for the dialog can be provided.

#### IKaNavigateModel.inputs

Property Type: [`ICalculationInputs`](#icalculationinputs); Optional  
If inputs should be passed to the KatApp being navigated to, an `ICalculationInputs` object can be provided.

#### IKaNavigateModel.ceInputs

Property Type: `string`; Optional  
Some CalcEngines return an key/value space delimitted string of inputs in their result tables with the intention of those values being passed in as a representation of `ICalculationInputs`.

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

#### IKaNavigateModel.persistInputs

Property Type: `boolean`; Optional  
Whether or not to persist the inputs in sessionStorage.  If `true` and the user navigates away from current view and comes back the inputs will automatically be injected into the KatApp.  If `false` and the user navigates away and returns the input values will not longer be present.

#### IKaNavigateModel.model

Property Type: `string`; Optional  
If the *entire* `IKaNavigateModel` parameter is being provided by a CalcEngine via a valid 'JSON string', this property can be assigned in place of using all the above individual properties.

## v-ka-template

The `v-ka-template` directive is responsible for manually rendering a template with or without a data source. The data source can be a simple javascript object or it can be an array of data (usually obtained via [rbl.source()](#iapplicationdatarblsource)).  When the source is an `Array<>`, the template can get access to this property via the scope's `rows` properties.

### v-ka-template Model

The model passed to the requested template configures the [`v-ka-template` scope](#v-ka-template-scope) that is available to the template.

The `v-ka-template` directive *does* have a `string` shorthand syntax that allows for more terse markup.  If the model only needs to provide a template name to the directive, the following can be used.

```html
<!-- The following examples are equivalent -->
<div v-ka-template="summary-template"></div>
<div v-ka-template="{ name: 'summary-template' }"></div>
```

#### v-ka-template Model name

Property Type: `string`; Required  
Provides the name of the template to render.

#### v-ka-template Model source

Property Type: `any | Array<ITabDefRow>`; Optional  
Provides the scope that is available to the template to be rendered.


### v-ka-template Scope

The scope available to templates that use the `v-ka-template` directive is simply the same object that was provided in the  `model.source` property.

If the scope is of type `Array<ITabDefRow>`, then the scope provided will have a `rows` property containing all the rows of the `model.source`.  When the scope is any other type, the exact object passed in from `model.source` is treated as the scope and any defined public properties are available to the template.

### v-ka-template Samples

```html
<!-- Template where the model.source is an array, so the template iterated through the 'rows' property -->
<ul class="dropdown-menu dropdown-menu-lg-end" v-ka-template="{ name: 'more-menu-links', source: rbl.source('contentContextLinks') }"></ul>

<template id="more-menu-links">
    <li v-for="link in rows">
        <a v-if="( link.modalModel || '' ) == ''" class="dropdown-item d-flex justify-content-between align-items-start me-3" v-ka-navigate="{ view: link.viewID }">
            {{link.text}} <i :class="['fa-light fs-6 link-primary align-self-center', link.linkIcon]"></i>
        </a>
        <a v-if="( link.modalModel || '' ) != ''" class="dropdown-item d-flex justify-content-between align-items-start me-3" v-ka-modal="{ model: link.modalModel }">
            {{link.text}} <i :class="['fa-light fs-6 link-primary align-self-center', link.linkIcon]"></i>
        </a>
    </li>
</template>
```

```html
<!-- 
1. Same as above where the model.source is an array
2. Demonstrates how the 'scope' to the template takes into account parent scope.  The 'type' iteration item from 'typeMessage' table
    is expected in the template.  The template uses both the 'type' iteration item and its own 'message' iteration item.
-->
<div v-for="type in rbl.source('typeMessage')">
    <div v-ka-template="{ name: 'notice-type1', source: rbl.source('messages', 'Messages').filter( r => r.type == type.type ) }"></div>
</div>

<template id="notice-type1">
    <div v-for="message in rows" :class="'alert alert-' + type.alertType">
        <div class="d-flex w-100 justify-content-between d-none">
            <h4 class="alert-heading mb-1 d-flex align-content-center text-dark"><i :class="'fa-light me-2 ' + type.icon"></i> {{type.text}}</h4>
        </div>
        <p class="mb-1 fw-bold text-dark"><i :class="'fa-light me-1 ' + type.icon"></i>{{message.title}}</p>
        <small v-html="message.message"></small>
        <div class="text-center border-top border-secondary mt-2 pt-2" v-if="message.linkText!=''">
            <a class="link-dark" v-ka-navigate="{ view: message.linkDest }"><i class="fa-light fa-circle-chevron-right me-1"></i><span v-html="message.linkText"></span></a>
        </div>
    </div>
</template>

<!-- 
    To add to this sample, below is a complex version performing the same way where the model 
    is manually constructed (including the type row and the Array<ITabDefRow> rows property) 
    where the type row is not part of the RBLe Framework results 
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
    <div v-if="errors.length > 0" :id="kaId + '_ModelerValidationTable'" class="validation-summary alert alert-danger" role="alert" title="Please review the following issues:">
        <p><strong><i class="fa-duotone fa-circle-exclamation"></i> Please review the following issues:</strong></p>
        <ul>
            <li v-for="error in errors" v-html="error.text"></li>
        </ul>
    </div>
    <div v-if="warnings.length > 0" :id="kaId + '_ModelerWarnings'" class="validation-warning-summary alert alert-warning" role="alert" title="Please review the following warnings:">
        <p><strong><i class="fa-duotone fa-triangle-exclamation"></i> Please review the following warnings:</strong></p>
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
        message: '<p>Do you want to delete this HSA transaction?</p><p>If you delete this transaction, you will not be making a one-time contribution to your HSA.</p><p>Are you sure you want to delete this transaction?</p>' 
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

#### IKaApiModel.endpoint

Property Type: `string`; Required  
The api endpoint to submit to.

#### IKaApiModel.confirm

Property Type: [`IModalOptions`](#imodaloptions); Optional  
If a confirmation dialog should be displayed to prompt the user whether or not to allow the api submission, the options for the dialog can be provided.

#### IKaApiModel.calculationInputs

Property Type: [`ICalculationInputs`](#icalculationinputs); Optional  
Often when an api endpoint is submitted to in a Host Environment that leverages the RBLe Framework, an `iValidate=1` RBL calculation is the first action performed on the server.  This calculation can do UI validations or provide instructions to the Host Environment on what type of actions it should take.  All the inputs from the UI are always submit, but if additional inputs should be passed to the endpoint, an `ICalculationInputs` object can be provided.

#### IKaApiModel.apiParameters

Property Type: `IStringAnyIndexer`; Optional  
Some endpoints require parameters that are processed in the server code of the Host Environment.  These parameters are technically not different from `ICalculationInputs`, but providing them as a second parameter accomplishes a few things.

1. The value type of each parameter can be more than just `string`, supporting `boolean`, `number` or a nested object with its own properties.
1. If all the parameters are of type `string`, even though technically not different from the `calculationInputs` property, using `apiParameters` eliminates parameters from being passed to a RBL calculation.
1. Finally, it simply segregates 'intent' of the parameters versus the inputs.  Parameters are intended to be used by the api endpoint server code while inputs are intended to be used by the RBL calculation.

#### IKaApiModel.isDownload

Property Type: `boolean`; Optional  
If the api endpoint being posted to will return binary content representing a download, setting this flag to true tells the KatApp framework to process the results differently and save the generated content as a downloaded .

#### IKaApiModel.files

Property Type: [`FileList`](#https://developer.mozilla.org/en-US/docs/Web/API/FileList); Optional
If the api endpoint being submitted to accepts file uploads, this property can be set (usually from a `input type="file"` element).

#### IKaApiModel.calculateOnSuccess

Property Type: `boolean | ICalculationInputs`; Optional  
If after a successful submission to an api endpoint, the KatApp Framework should automatically trigger a RBLe Framework Calculation, `calculateOnSuccess` can be set.  Setting the value to `true` indicates that a calculation should occur.  Setting the value to a `ICalculationInputs` object also indicates that a calculation should occur and additionally pass along the inputs provided.

```html
<!-- Submit to a estimate generation endpoint, and on success, run a calculation on the client side passing in iRefreshAfterEstimate = 1 -->
<a v-ka-api="{ endpoint: 'generate/estimate', calculateOnSuccess: { iRefreshAfterEstimate: '1' } }">Submit
```

#### IKaApiModel.then

Property Type: `(response: IStringAnyIndexer | undefined, application: KatApp) => void`; Optional  
If the Kaml View needs to provide a delegate to run if an api submission is successful, the `then` property solves that problem.

```html
<!-- Submit to a estimate generation endpoint, and on success, run a calculation on the client side passing in iRefreshAfterEstimate = 1 -->
<a v-ka-api="{ 
    endpoint: 'generate/estimate', 
    then: ( response, application ) => console.log(`Estimate was successful and responded with ${response}`) 
}">Submit
```

#### IKaApiModel.catch

Property Type: `(e: any | undefined, application: KatApp) => void`; Optional  
If the Kaml View needs to provide a delegate to run if an api submission failed, the `catch` property solves that problem.

```html
<!-- Submit to a estimate generation endpoint, and on failure log the response -->
<a v-ka-api="{ 
    endpoint: 'generate/estimate', 
    catch: ( e, application ) => console.log(`Estimate failed: ${e}`) 
}">Submit
```

If no `catch` is provided and an api endpoint fails, the response will simply be logged by the KatApp framework.

## v-ka-modal

The `v-ka-modal` directive can be used to launch a modal dialog rendering static HTML markup or a separate Kaml View.  Internally, the directive delegates calls to the [IKatApp.showModalAsync](#ikatappshowmodalasync) method.

**Note:** Every KatApp Framework modal rendered uses a `selector` value of `kaModal`.  Therefore, Kaml View developers can always get a reference to a modal KatApp via `KatApp.get('.kaModal')` in the browser console.

### v-ka-modal Model

The `IKaModalModel` represents the model type containing the properties that configure how a `v-ka-modal` link and modal application behaves. The `IKaModalModel` interface extends the [`IModalOptions` interface](#imodaloptions), therefore on extended properties will be documented in this section, please review `IModalOptions` for a list of inherited properties available.

#### IKaModalModel.model

Property Type: `string`; Optional  
If the *entire* `IKaModalModel` parameter is being provided by a CalcEngine via a valid 'JSON string', this property can be assigned in place of using all the individual properties.

#### IKaModalModel.confirmed

Property Type: `(response: any | undefined, application: KatApp) => void`; Optional  
If the Kaml View needs to provide a delegate to run if modal dialog is 'confirmed', the `confirmed` property solves that problem.

```html
<a v-ka-modal="{ 
    view: 'Common.Acknowledgement', 
    confirmed: ( response, application ) => console.log(`Dialog was confirmed with ${response}`) 
}">Submit
```

#### IKaModalModel.cancelled

Property Type: `(response: any | undefined, application: KatApp) => void`; Optional  
If the Kaml View needs to provide a delegate to run if modal dialog is 'cancelled', the `cancelled` property solves that problem.

```html
<a v-ka-modal="{ 
    view: 'Common.Acknowledgement', 
    cancelled: ( response, application ) => console.log(`Dialog was cancelled with ${response}`) 
}">Submit
```

#### IKaModalModel.catch

Property Type: `(e: any | undefined, application: KatApp) => void`; Optional  
If the Kaml View needs to provide a delegate to run if generating a modal dialog fails, the `catch` property solves that problem.

```html
<!-- Submit to a estimate generation endpoint, and on failure log the response -->
<a v-ka-modal="{ 
    view: 'Common.Acknowledgement', 
    catch: ( e, application ) => console.log(`Acknowledgement dialog unable to display: ${e}`) 
}">Submit
```

If no `catch` is provided and generating a modal dialog fails, the response will simply be logged by the KatApp framework.

## v-ka-app

The `v-ka-app` directive can be used to nest a separate KatApp within the body of a host KatApp.  The nested KatApp calculation results, inputs, etc. are all isolated within scope of the KatApp and can not access or communicate with the host application except through the [`options.hostApplication` property](#ikatappoptionshostapplication) and the [IKatApp.notifyAsync](#ikatappnotifyasync) method.

### v-ka-app Model

The `IKaAppModel` represents the model type containing the properties that configure how a `v-ka-app` application behaves.

#### IKaAppModel.view

Property Type: `string`; Required  
The Kaml View to render inside the nested KatApp.

#### IKaAppModel.selector

Property Type: `string`; Optional  
Just a JQuery selector `string` that is used to identify that KatApp.  This property aids in debugging by allowing Kaml View developers to type in `KatApp.get({selector})` in a browser console to get a reference to their KatApp.

#### IKaAppModel.inputs

Property Type: `ICalculationInputs`; Optional
If inputs should be passed to the rendered nested application's Kaml View, provide a `ICalculationInputs` object.

## v-ka-table

The `v-ka-table` directive is responsible for creating HTML tables automatically from the calculation results.

### v-ka-table Model

The `IKaTableModel` represents the model type containing the properties that configure how a `v-ka-table` will render.

The `v-ka-table` directive *does* have a `string` shorthand syntax that allows for more terse markup.  If the table to be rendered only needs to provide a table name to the directive, the following can be used.

```html
<!-- The following v-ka-table examples are equivalent -->
<div v-ka-table="resultTable"></div>
<div v-ka-table="{ name: 'resultTable' }"></div>
```

#### IKaTableModel.name

Property Type: `string`; Required  
The name of the RBLe Framework result table to process.

#### IKaTableModel.css

Property Type: `string`; Optional  
If provided, `css` is the css that should be applied to the rendered `<table>` element.  If not provided, `table table-sm table-hover` is applied.

Note that css names of `rbl` and `model.name` are always applied.

```javascript
// Psuedo code for getting the table css
const tableCss = model.css != undefined
    ? `rbl ${model.name} ${model.css}`
    : `rbl ${model.name} table table-sm table-hover`;
```

#### IKaTableModel.ce

Property Type: `string`; Optional  
If the RBLe Framework results to process is not part of the default Kaml View CalcEngine, a CalcEngine key can provided.

#### IKaTableModel.tab

Property Type: `string`; Optional  
If the RBLe Framework results to process is not part of the default result tab (`RBLResult`), a tab name can provided.

### v-ka-table Result Table Columns

In addition to the rules for all [result tables](#Result-Tables), all tables rendered by `v-ka-table` elements use the rules described below. Simply put, only columns starting with `text` or `value` are rendered, however, there are flags, columns, or names available for use that control how results are generated and returned for each table from the CalcEngine.

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

The first row returned by the `rbl-source` table is used to build the `colgroup` element inside the `table` element.  For each `text*` and `value*` column it generates a `col` element as`<col class="{table}-{column}">`.  Additional width processing is desribed in the [v-ka-table Columns Widths](#v-ka-table-Columns-Widths) section.

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
        text1: { #test: "First", width: "100" }, 
        text2 { #test: "Last", width: "200" }, 
        value1: { #test: "DOB", width: "100" }
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
        text1: { #test: "First", xs-width: "12", lg-width="3" }, 
        text2 { #test: "Last", xs-width: "12", lg-width="3" }, 
        value1: { #test: "DOB", xs-width: "12", lg-width="3" }
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

### v-ka-highchart Model

The `IKaHighchartModel` represents the model type containing the properties that configure how a `v-ka-highchart` will render.

To see all the options available for charts and series, please refer to the [Highcharts API](#https://api.highcharts.com/highcharts/)

The `v-ka-highchart` directive *does* have a `string` shorthand syntax that allows for more terse markup.  If the chart to be rendered only needs to provide a data and, optionally, an options name to the directive, the following can be used.

```html
<!-- The following v-ka-highchar examples are equivalent -->
<div v-ka-highchart="PayChart"></div>
<div v-ka-highchart="{ data: 'PayChart', options: 'PayChart' }"></div>

<!-- The following v-ka-highchar examples are equivalent -->
<div v-ka-highchart="PayChart.PayOptions"></div>
<div v-ka-highchart="{ data: 'PayChart', options: 'PayOptions' }"></div>
```

#### IKaHighchartModel.data

Property Type: `string`; Required  
The *partial* name of the RBLe Framework result table providing the 'data' to the chart.  This value will be translated into `Highcharts-{model.data}-Data` when retrieving results from the calculation.

#### IKaHighchartModel.options

Property Type: `string`; Optional  
The *partial* name of the RBLe Framework result table providing the 'options' for the chart.  This value will be translated into `Highcharts-{model.options}-Options` when retrieving results from the calculation. If not provided, the `model.data` property will be used.

By default, all 'option values' come from the table with the name of `Highcharts-{model.data}-Options`.  The CalcEngine developer may provide overrides to these values using the `Highcharts-Overrides` table.

#### IKaHighchartModel.ce

Property Type: `string`; Optional  
If the RBLe Framework results to process is not part of the default Kaml View CalcEngine, a CalcEngine key can provided.

#### IKaHighchartModel.tab

Property Type: `string`; Optional  
If the RBLe Framework results to process is not part of the default result tab (`RBLResult`), a tab name can provided.

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
config-style | By default, the Highcharts template has no style applied to the `<div class="chart chart-responsive"></div>` element.  If, the CalcEngine wants to apply any CSS styles (i.e. height and width), the config-style value
config-tooltipFormat | When tooltips are enabled, there is a default `tooltip.formatter` function provided by KatApps where this value provides the template to apply a `string.format` to.  For example `<b>{x}</b>{seriesDetail}<br/>`<br/><br/>The available substitution tokens are `x` (current X-Axis value), `stackTotal` (sum of all Y-Axis values at this current `x` value), and `seriesDetail` (list of all Y-Axis points in format of `name: value`).  For more information see [tooltip.formatter API](https://api.highcharts.com/highcharts/tooltip.formatter) and [Property Value Parsing](#v-ka-highchart-Prpoerty-Value-Parsing).

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
config-visible | You can disable a series from being processed by setting its `config-visible` value to `0`.
config-hidden | Similar to `config-visible` except, if hidden, the series is _processed_ in the chart rendering, but it is not displayed in the chart or the legend.  Hidden series are essentially only available for tooltip processing.
config-format | Specify a format to use when display date or number values for this series in the tooltip.  See Microsoft documentation for available [date](https://docs.microsoft.com/en-us/dotnet/standard/base-types/custom-date-and-time-format-strings) and [number](https://docs.microsoft.com/en-us/dotnet/standard/base-types/standard-numeric-format-strings) format strings.

<br/>

An example of how these might look in a CalcEngine result table.

category | series1 | series2 | series3 | series4
---|---|---|---|---
config&#x2011;visible | 1 | 1 | 1 | 0
config-hidden | 0 | 0 | 1 | 1
config-format | c2 | c2 | c2 | c2

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
config-name | Shortfall | 401(k) Plan | Non Qualified Savings Plan | HSA | Personal Savings | Retirement Income  Needed
config-color | #FFFFFF | #006BD6 | #DDDDDD | #6F743A | #FD9F13 | #D92231
config-type | areaspline | column | column | column | column | spline
config-fillOpacity | 0 |||||			
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

### v-ka-highchart Property Value Parsing

Value columns used to set the Highcharts API option values allow for several different formats of data that are then converted into different types of properties values.

Value&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | API&nbsp;Value&nbsp;Type | Description
---|---|---
`blank` or `null` | `undefined` | If no value or value of `null` (case insensitive) is returned, `undefined` will be assigned to the property value.
numeric | numeric | If the value returned can be parsed into a number, a numeric value will be assigned to the property value.
`true` or `false` | boolean |  If a value of `true` or `false` (case insensitive) is returned, a `boolean` value will be assigned to the property value.
`json:{ name: value }` | object | If a value starting with `json:` is returned, the json text will be parsed and the resulting object will be assigned to the property value.
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

To aleviate this issue, the Kaml Views can decorate 'submit buttons' with a `v-ka-needs-calc` attribute which will ultimately take advantage of the [state.needsCalculation](#iapplicationdataneedscalculation) property.  The directive can be applied with or without a value.  When a value is provided, it is the label of the 'cloned button' (otherwise `Refresh` is the default label).  An example will better illustrate this.

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
<a v-ka-needs-calc="Click to Refresh" href="#" class="btn btn-primary btn-sm" @click.prevent="console.log('save inputs')">Save Inputs</a>

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
    var application = KatApp.get('{id}');
    // ... additional code
)();
```

Note: This is also the method used to investigate a KatApp during debug sessions in browser developer tools.

## IKatAppOptions

`IKatAppOptions` is used to configure how a KatApp executes.  It is primarily used as a parameter to the [KatApp.createAsync](#katappcreateappasync) method.  

When a Kaml Vew is a nested or modal application, it can use the `application.options` to acess [modalAppOptions](#ikatappoptionsmodalappoptions) or [hostApplication](#ikatappoptionshostapplication) as needed. 

### IKatAppOptions.view

Property Type: `string | undefined`; Required    
The name of the Kaml View to use in the KatApp in the format of `folder:name`.  Non-modal KatApps will always pass in a view via `"view": "Channel.Home"`.  The only time `view` is `undefined` is when [application.showModalAsync](#ikatappshowmodalasync) is called and static HTML content is passed in via the [IModalOptions.content](#imodaloptionscontent) or [IModalOptions.contentSelector](#imodaloptionscontentselector).

### IKatAppOptions.calculationUrl

Property Type: `string`; Required  
Url (usually an api endpoint in Host Environment) where RBLe Framework calculations should be posted to. A common endpoint that is used is `api/rble/sessionless-proxy`.

### IKatAppOptions.kamlRepositoryUrl

Property Type: `string | undefined`; Optional  
Url of where to download Kaml View and Template files from if they are not hosted in Host Environment.  If not provided, defaults to `https://btr.lifeatworkportal.com/services/evolution/CalculationFunction.ashx`

### IKatAppOptions.debug.traceVerbosity

Property Type: `TraceVerbosity | undefined`; Optional  
Control the trace output level to display for the current KatApp by assigning desired enum value.

The default value is `TraceVerbosity.None`.

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

### IKatAppOptions.debug.refreshCalcEngine

Property Type: `boolean | undefined`; Optional  
Whether or not the RBLe Framework should check for an updated CalcEngine every single calculation.  By default, the RBLe Framework only checks every 5 minutes.  A `boolean` value can be passed in or using the querystring of `expireCE=1` will enable the settings.

The default value is `false`.

### IKatAppOptions.debug.useTestCalcEngine

Property Type: `boolean | undefined`; Optional  
Whether or not the RBLe Framework should the test version of the specified CalcEngine.  A `boolean` value can be passed in or using the querystring of `test=1` will enable the settings.

The default value is `false`.

### IKatAppOptions.debug.useTestView

Property Type: `boolean | undefined`; Optional  
Whether or not the KatApp Framework should use the test versions of any requested Kaml Views or Kaml Template Files that are hosted in the Kaml View CMS instead of by the Host Environment.  A `boolean` value can be passed in or using the querystring of `testview=1` will enable the settings.

The default value is `false`.

### IKatAppOptions.debug.showInspector

Property Type: `boolean | undefined`; Optional  
Whether or not the KatApp Framework should show diagnostic information for all Vue directives.  When enabled, pressing `CTRL+SHIFT` together will toggle visual cues for each 'Vue enabled' element.  Then you can use the browser 'inspect tool' to view an HTML comment about the element.

A `boolean` value can be passed in or using the querystring of `showinspector=1` will enable the settings.

The default value is `false`.

### IKatAppOptions.debug.debugResourcesDomain

Property Type: `string | undefined`; Optional  
Whether or not the KatApp Framework should attempt to find requested Kaml Views or Kaml Template Files from the 'domain' passed in before checking the Kaml View CMS or Host Environment.  A `string` value providing a local web server address can be provided via `"debugResourcesDomain": "localhost:8887"` to enable the feature.

The default value is `undefined`.

### IKatAppOptions.currentPage

Property Type: `string`; Required  
The name of the current page as it is known in the Host Environment.  If a Kaml View is a shared view for various functionalities, this can be used in Kaml View javascript or a CalcEngine to help distinguish in which 'context' a Kaml View is running.

### IKatAppOptions.userIdHash

Property Type: `string | undefined`; Optional  
If the Kaml View is running in the context of a logged in user, a `userIdHash` can be passed in.  This value is used during caching operations that use browser sessionStorage.

### IKatAppOptions.environment

Property Type: `string`; Required  
The name of the current environment as it is known in the Host Environment. This can be used in Kaml View javascript or a CalcEngine if different functionality needs to occur based on which environment (i.e. DEV, QA, PROD) a Kaml View is running.

This value is passed into the RBLe Framework calculations via the `iEnvironment` input.

### IKatAppOptions.requestIP

Property Type: `string`; Required  
The IP address of the browser running the current KatApp.

### IKatAppOptions.currentUICulture

Property Type: `string`; Required  
The current culture as it is known in the Host Environment.  This enables culture specific number and date formatting and is in the format of `languagecode2-country/regioncode2`. 

This value is passed into the RBLe Framework calculations via the `iCurrentUICulture` input.

The default value is `en-US`.

### IKatAppOptions.inputs

Property Type: `ICalculationInputs`; Optional  
The Host Environment can pass in inputs that serve as the default values to inputs rendered in the Kaml View or simply as 'fixed' inputs (if no matching rendered inputs are present that would update them) that will be passed to every RBLe Framework calculation.  This value becomes the initial value for [`IApplicationData.inputs`](#iapplicationdatainputs-icalculationinputs) when the KatApp is created.

### IKatAppOptions.manualResults

Property Type: `IManualTabDef[]`; Optional
The Host Environment can pass in 'manual results'.  These are results that are usually generated one time on the server and cached as needed.  Passing manual results to a KatApp removes the overhead needed to perform a RBLe Framework calculation.  Not only can the manual results be a RBLe Framework calculation performed on the server, it can also be post processed and modified a bit before passing in to the KatApp or the manual results can be completely generated via server side code without using the RBLe Framework.  As long as the results match the `IManualTabDef` interface, it can be used.

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

### IKatAppOptions.manualResultsEndpoint

Property Type: `string`; Optional
Similiar to `manualResults`, this endpoint should be called to retrieve a `manualResults` object from the Host Environment that is the same structure as described above.  Used to leverage browser caching.

### IKatAppOptions.relativePathTemplates

Property Type: `IStringIndexer<string>`; Optional  
If the Host Environment hosts all its own Kaml Views and Kaml Template files, instead of the Kaml View CMS, all the relative paths to existing Kaml Template files can be provided, instructing KatApp Framework to request it via relative path.

```javascript
// The 'Rel:' prefix is required and informs KatApp Framework that is is a relative path.
"relativePathTemplates": {
    "Nexgen:Templates.Pension.Shared.kaml" : "Rel:KatApp/NexgenVue/Templates.Pension.Shared.kaml?c=20220920103112",
    "Nexgen:Templates.Profile.Shared.kaml" : "Rel:KatApp/NexgenVue/Templates.Profile.Shared.kaml?c=20221005182346",
    "Nexgen:Templates.Shared.kaml" : "Rel:KatApp/NexgenVue/Templates.Shared.kaml?c=20221011223650"
}									
```

### IKatAppOptions.modalAppOptions

Property Type: `IModalAppOptions`; Optional, Read Only  
When a KatApp is being rendered as a modal ([v-ka-modal](#v-ka-modal)) application, the KatApp Framework will automatically assign this property; a [IModalAppOptions](#imodalappoptions) created from the [IModalOptions](#imodaloptions) parameter passed in when creating modal application.

This property is not acesed often; `modalAppOptions` is accessed when a Kaml View, launched as a modal, needs to call `modalAppOptions.cancelled` or `modalAppOptions.confirmedAsync`.

### IKatAppOptions.hostApplication

Property Type: `IKatApp`; Optional, Read Only  
When a KatApp is being rendered as a nested ([v-ka-app](#v-ka-app)) or modal ([v-ka-modal](#v-ka-modal)) application, the KatApp Framework will automatically assign this property to a reference of the KatApp application that is creating the nested or modal application.

This property is not acesed often; `hostApplication` is access when a Kaml View needs to call [`KatApp.notifyAsync`](#ikatappnotifyasync).

### IKatAppOptions.katAppNavigate

Property Type: `(id: string, props: IModalOptions, el: HTMLElement) => void | undefined`; Optional  
To allow navigation to occur from within a KatApp (via [v-ka-navigate](#v-ka-navigate)), a reference to a javascript function must be assigned to this property. The KatApp Framework will call this function (created by the Host Environment) when a navigation request has been issued.  It is up to the Host Environment's javascript to do the appropriate processing to initiate a successful navigation.

## IKatApp

The `IKatApp` interface represents the KatApp 'application' object that the Kaml View interacts with via method calls and event handlers.

### IKatApp Properties

#### IKatApp.el

Property Type: `JQuery`  
The `HTMLElement` that is the container for the `IKatApp`.

#### IKatApp.options

Property Type: `IKatAppOptions`  
The `IKatAppOptions` that configure the options that control the `IKatApp`.

#### IKatApp.isCalculating: boolean;

Property Type: `boolean`; Read Only  
Whether or not the KatApp is currently triggering and processing a RBLe Framework calculation.

#### IKatApp.lastCalculation

Property Type: [`ILastCalculation | undefined`](#ilastcalculation); Read Only  
If a RBLe Framework calculation has previously run, this property will contain a snapshot of the `ILastCalculation` object.

#### IKatApp.state

Property Type: [`IApplicationData`](#iapplicationdata)
The global state object passed into the Vue application.  Any updates to properties on the `state` object can trigger reactivity.

#### IKatApp.selector: string;

Property Type: `string`
The JQuery selector string that was used to locate the `HTMLElement` and set the `el` property which hosts the KatApp.

### IKatApp Methods

#### IKatApp.update

**`update(options: IUpdateApplicationOptions): IKatApp`**

The `update` method can only be called one time and must be called before the Kaml View is 'mounted' by Vue. 

##### IUpdateApplicationOptions.model

Property Type: `any`; Optional  
Kaml Views can pass in 'custom models' that hold state but are not built from Calculation Results.

##### IUpdateApplicationOptions.options

Property Type: `IKatAppOptions`; Optional  
Kaml Views can provide partial updates to the [`IKatApp.options`](#ikatappoptions) object.  Typically, only inputs or modal templates are updated.

```javascript
application.update({
    options: {
        inputs: {
            iApplicationInput: "value1"
        },
        modalAppOptions: {
            headerTemplate: "header"
        }
    }
});
```

##### IUpdateApplicationOptions.handlers

Property Type: `IStringAnyIndexer`; Optional  
Provide an object where each property is a function delegate that can be used with [`v-on`](#v-on) directives.

##### IUpdateApplicationOptions.components

Property Type: `IStringAnyIndexer`; Optional  
Provide an object where each property is a Vue component that can be used with [`v-scope`](#v-scope) directives.

##### IUpdateApplicationOptions.directives

Property Type: `IStringIndexer<(ctx: DirectiveContext<Element>) => (() => void) | void>`; Optional  
Provide an object where each property name is the directive tag name (i.e. `v-*`) and the value is a function delegate that returns a [custom directive](#custom-katapp-directives) that can be used in the Kaml View markup.


#### IKatApp.on

**`on<TType extends string>(events: TType, handler: JQuery.TypeEventHandler<HTMLElement, undefined, HTMLElement, HTMLElement, TType> | false): KatApp;`**

The `on` method is a pass through to the [JQuery.on](#https://api.jquery.com/on/) method with the benefit of ensuring that the `.ka` namespace is automatically added if needed and the method is based off of the `IKatApp` which helps provide a fluent api for calling the `update` and `on` methods.

#### IKatApp.off

**`off<TType extends string>(events: TType): KatApp;`**

The `off` method is a pass through to the [JQuery.off](#https://api.jquery.com/off/) method with the benefit of ensuring that the `.ka` namespace is automatically added if needed and the method is based off of the `IKatApp` which helps provide a fluent api for calling the `update` and `off` methods.

#### IKatApp.calculateAsync

**`calculateAsync(customInputs?: ICalculationInputs, processResults?: boolean, calcEngines?: ICalcEngine[]): Promise<ITabDef[] | void>;`**

Manually call a RBLe Framework calculation.  The parameters allow for a list of additional inputs to be passed in, whether or not the results should be [processed](#rbl-framework-result-processing-in-katapp-state) or simply return the raw results and an optional list of `ICalcEngines` to run in place of the KatApp's configured CalcEngines.

#### IKatApp.apiAsync

**`apiAsync(endpoint: string, apiOptions: IApiOptions, calculationSubmitApiConfiguration?: IGetSubmitApiOptions, trigger?: JQuery): Promise<IStringAnyIndexer | undefined>;`**

Use an [`IApiOptions`](#iapioptions) and [`IGetSubmitApiOptions`](#igetsubmitapioptions) object to submit a payload to an api endpoint and return the results on success. KatApps have the ability to call web api endpoints to perform actions that need server side processing (saving data, generating document packages, saving calculations, etc.).  All api endpoints should return an object indicating success or failure.

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

Return a `ICalculationInputs` object that represent the union of the current UI inputs along with the `customInputs` pass in (if any).

#### IKatApp.getInputValue

**`getInputValue(input: string, allowDisabled?: boolean): string | undefined;`**

Get the current input value of the input name passed in by inspecting the raw HTML markup/elements versus the [`state.inputs`](#iapplicationdatainputs) object.

By default, `allowDisabled` is `false`, but if `true` is passed in, and the input element is disabled, the method returns `undefined`.

#### IKatApp.setInputValue

**`setInputValue(name: string, value: string | undefined, calculate?: boolean): JQuery | undefined;`**

Given and input `name` and `value`, set the value of the HTML element and the value in the [`state.inputs`](#iapplicationdatainputs). If `value` is undefined, the input name and property will be removed from `state.inputs`.

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

### IKatApp Lifecycles

There are three main event lifecycles that occur during the life time of a KatApp; the initial 'create application' lifecycle, the 'calculation' lifecycle, and the 'api' lifecycle.

#### Create Application Lifecycle

When a KatApp is being created via the [`KatApp.createAppAsync`](#katappcreateappasync), the following lifecycle occurs.

1. initialized
1. modalAppInitialized - if application is a modal application
1. nestedAppInitialized - if application is a nested application
1. All events in the [Calculation Lifecycle](#calculation-lifecycle) - if any CalcEngines are [configured to all iConfigureUI calculations](#configuring-calcengines-and-template-files)
1. rendered

#### Calculation Lifecycle

When a calculation is initiated via an [input change triggering a calculation](#v-ka-input) or by a Kaml View calling [`application.calculateAsync`](#ikatappcalculateasync), the following lifecycle occurs.

1. updateCalculationOptions - allow Kaml View to update inputs and configuration used during calculation
1. calculateStart
1. inputsCache - allow Kaml View to provide additional inputs/information to cache before caching current inputs (if configured to cache)
1. Success events
    1. resultsProcessing - all Kaml View to inspect and/or modify the calculation results before they are [processed](#rbl-framework-result-processing-in-katapp-state)
    1. All events in [Api Lifecycle](#api-lifecycle) if `jwt-updates` result table is provided and processed
    1. configureUICalculation - if current calculation has an input of `iConfigureUI="1"`
    1. calculation - allow Kaml Views to inspect/use the `ILastCalculation`
1. Failure Event
    1. calculationErrors - allow Kaml Views to handle exceptions gracefully
1. calculateEnd

#### Api Lifecycle

When a submission to an api endpiont is initiated via [`v-ka-api`](#v-ka-api) or by a Kaml View calling [`application.apiAsync`](#ikatappapiasync), the following lifecycle occurs.

1. updateApiOptions - allow Kaml Views to update inputs and configuration used during an api submission
1. apiStart - allow Kaml Views to inspect and/or update the payload used during an api submission
1. apiComplete - allow Kaml Views to inspect/use results from an successful api submission
1. apiFailed - allow Kaml Views to inspect/use error response from a failed api submission

#### IKatApp.initialized

**`initialized(event: Event, application: IKatApp )`**

Triggered after KatApp Framework has finished injecting the  Kaml View and any designated template files.  `initialized` can be used to call api endpoints to retreive/initialize data that has not been obtained by default in the Host Environment.

#### IKatApp.modalAppInitialized

**`modalAppInitialized(event: Event, modalApplication: IKatApp, hostApplication: IKatApp )`**

This event is triggered after a modal application has been initialized. It occurs at the same time as host application's `initialized` event but allows for host application to assign events to the modal application if needed or retain a reference to the modalApplication for later use.

```javascript
// Code that shows a modal, and uses all inputs from the modal/irp application

var irpApplication = undefined;

application.on("modalAppInitialized.ka", (e, modalApplication) => {
    irpApplication = modalApplication;
});

const response = await application.showModalAsync({ view: 'DST.IRP' }); // This will trigger modalAppInitialized before showing the modal

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

**`nestedAppInitialized(event: Event, nestedApplication: IKatApp, hostApplication: IKatApp )`**

This event is triggered after a nested application has been initialized. It occurs at the same time as host application's `initialized` event but allows for host application to assign events to the modal application if needed or retain a reference to the nestedApplication for later use.

```html
<!-- 
    Sample showing a Kaml View turning off ConfigureUI calculations (via configure-ui="false") and waiting until
    a nested application successfully triggers 'configureUICalculation' before calling a `iConfigureUI=1` calculation.
 -->
<rbl-config templates="NexgenVue:Templates.Shared">
	<calc-engine key="Home" configure-ui="false" name="Conduent_Nexgen_Home_SE" result-tabs="RBLHome"></calc-engine>
</rbl-config>

<script>
application.on("nestedAppInitialized.ka", (e, nestedApplication) => {
    nestedApplication.on("configureUICalculation", async () => {
        await application.apiAsync( "common/qna", { calculationInputs: { iAction: "get-credit-card-info" } } );
        await application.calculateAsync({ iConfigureUI: 1, iDataBind: 1 });
    });
});
</script>
```

#### IKatApp.rendered

**`rendered(event: Event, application: IKatApp )`**

Triggered after Kaml View has been made visible to the user (will wait for CSS transitions to complete).

#### IKatApp.updateCalculationOptions

**`updateCalculationOptions( event: Event, submitApiOptions: IGetSubmitApiOptions, application: IKatApp )`**

This event is triggered during RBLe Framework calculations immediately before submission to RBLe Framework.  It allows Kaml Views to massage the [`IGetSubmitApiOptions.configuration`](#igetsubmitapioptionsconfiguration) or the [`IGetSubmitApiOptions.inputs`](#icalculationinputs) before being submitted.  Use this method to add custom inputs/tables to the submission that wouldn't normally be processed by the KatApp Framework.

```javascript
application.on("updateCalculationOptions.ka", (event, submitOptions) => {
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

    submitOptions.inputs.iCustomKamlInput = "custom-value";

    var refreshKeys = [];
    refreshKeys.push("hwCoverages", "hwCoveredDependents");

    if (submitOptions.inputs.iConfigureUI == 1) {
        //run once.
        refreshKeys.push("hwEventHistory");
    }

    submitOptions.configuration.CacheRefreshKeys = refreshKeys;
});
```

#### IKatApp.calculateStart

**`calculateStart( event: Event, submitApiOptions: IGetSubmitApiOptions, application: IKatApp ) => boolean`**

This event is triggered at the start of a RBLe Framework calculation after the `updateCalculationOptions` has been triggered.  Use this event to perform any actions that need to occur before the calculation is submitted (i.e. custom processing of UI blockers or enabled state of inputs).  If the handler returns `false` or calls `e.preventDefault()`, then the calculation is immediately cancelled and only the `calculateEnd` event will be triggered.

#### IKatApp.inputsCache

**`inputsCache( event: Event, cachedInputs: ICalculationInputs, application: IKatApp )`**

This event is triggered immediately before inputs are cached to `sessionStorage` (if `options.inputCaching == true`).  It allows Kaml Views to massage the inputs before being cached if needed.

#### IKatApp.resultsProcessing

**`resultsProcessing( event: Event, results: Array<ITabDef>, inputs: ICalculationInputs, submitApiOptions: IGetSubmitApiOptions, application: IKatApp )`**

This event is triggered during a RBLe Framework calculation _after a successful calculation_ from the RBLe Framework and _before [KatApp Framework result processing](#rbl-framework-result-processing-in-katapp-state)_.  This handler allows Kaml Views to manually push 'additional result rows' into a calculation result table.

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

#### IKatApp.configureUICalculation

**`configureUICalculation( event: Event, lastCalculation: ILastCalculation, application: IKatApp )`**

This event is triggered during RBLe Framework calculation _after a successful calculation and result processing_ and _only_ for a calculation where `iConfigureUI == 1`.  The `configureUICalculation` event is a one time calculation event and can be used to finish setting up Kaml View UI where logic is dependent upon the first calculation results being processed.

#### IKatApp.calculation

**`calculation( event: Event, lastCalculation: ILastCalculation, application: IKatApp )`**

This event is triggered during RBLe Framework calculation _after a successful calculation and result processing_ (even if the calculation has `iConfigureUI == 1`).  Use this handler to process any additional requirements that may be dependent on calculation results.

Note: If calculation contains 'jwt data updating' instructions all the standard [API Lifecycle events](#api-lifecycle) will occur with the `endpoint` being set to `rble/jwtupdate`.

#### IKatApp.calculationErrors

**`calculationErrors( event: Event, key: string, exception: Error | undefined, application: IKatApp )`**

This event is triggered during RBLe Framework calculation if an exception happens.  Use this handler to clean up an UI components that may need processing when calculation results are not available.

The `key` parameter can be `SubmitCalculation`, `SubmitCalculation..ConfigureUI`, `ProcessDocGenResults`, or `ProcessDataUpdateResults` to identify which stage of the [calculation lifecycle](#calculation-lifecycle) failed.

Note: If calculation contains 'jwt data updating' instructions and an exception occurs during the processing of those instructions an [`apiFailed`](#ikatappapifailed) event will be triggered in addition to `calculationErrors`.  

#### IKatApp.calculateEnd

**`calculateEnd( event: Event, application: IKatApp )`**

This event is triggered to signal the 'end' of a RBLe Framework calculation regardless of whether the calculation succeeds, fails, or is cancelled.  Use this event to perform any actions that need to occur after a calculation is completely finished (i.e. UI blockers, processing indicators, etc.).


#### IKatApp.updateApiOptions

**`updateApiOptions( event: Event, submitApiOptions: IGetSubmitApiOptions, endpoint: string, application: IKatApp )`**

This event is triggered during api endpoint submission immediately before submitting to the Host Environment.  It allows Kaml Views to massage the [`IGetSubmitApiOptions.configuration`](#igetsubmitapioptionsconfiguration) or the [`IGetSubmitApiOptions.inputs`](#icalculationinputs) before being submitted.  Use this method to add custom inputs/tables to the submission that wouldn't normally be processed by the KatApp Framework.

The `endpoint` parameter will contain the endpoint the KatApp Framework is going to submit to.

See [`IKatApp.updateCalculationOptions`](#ikatappupdatecalculationoptions) for sample usage of updating the `submitApiOptions`.

#### IKatApp.apiStart

**`apiStart( event: Event, endpoint: string, submitData: ISubmitApiData, trigger: JQuery<HTMLElement> | undefined, apiOptions: IApiOptions, application: IKatApp ) => boolean`**

This event is triggered immediately before submitting the to an api endpoint.  This handler could be used to modify the `submitData` if required.  If the handler returns `false` or calls `e.preventDefault()`, then the api endpoint submission is immediately cancelled.

The `submitData` parameter is the payload that is submitted to the api endpoint and is just a 'reorganization' of existing properties/objects that exist in the KatApp Framework.

```javascript
interface ICalculationInputTableRow extends ITabDefRow {
	index: string;
}
interface ISubmitApiData {
	Inputs: ICalculationInputs;
	InputTables?: Array<{ Name: string, Rows: Array<ICalculationInputTableRow>; }>;
	Configuration: ISubmitApiConfiguration;
}
```

#### IKatApp.apiComplete

**`apiComplete( event: Event, endpoint: string, successResponse: IStringAnyIndexer | undefined, trigger: JQuery<HTMLElement> | undefined, apiOptions: IApiOptions, application: IKatApp )`**

This event is triggered upon successful submission and response from the api endpoint that **is not** an endpoint that generates 'file download'.

```javascript
application.on("apiComplete.ka", async () => {
    // Recalculate after data has been updated on server, and show the action button to submit CC payment
    await application.calculateAsync();
    application.select(".credit-card-action-button").removeClass("d-none");
});
```

#### IKatApp.apiFailed

**`apiFailed( event: Event, endpoint: string, errorResponse: IApiErrorResponse, trigger: JQuery<HTMLElement> | undefined, apiOptions: IApiOptions, application: IKatApp )`**

This event is triggered when submission to an api endpoint fails.  The `errorResponse` object will have a `Validations` property that can be examined for more details about the cause of the exception. See [IKatApp.apiAsync](#ikatappapiasync) for more information on the `IApiErrorResponse` interface.

```javascript
application.on("apiFailed.ka", (event, endpoint) => {
    // Show a save error message if jwt update instructions failed
	if (endpoint == "rble/jwtupdate") {
		application.select(".saveError").show(500).delay(3000).hide(500);
	}
});
```

### IKatApp Events

The KatApp framework raises events throughout the stages of different [lifecycles](#ikatapp-lifecycles) allowing Kaml View developers to catch and respond to these events as needed. All event handlers are registered on the application itself via the [`on` method](#ikatappon). When using events, it is best practice to use the `.ka` namespace.  It is not required when using the `on` because the method automatically ensures each event type processed has the `.ka` namespace, but explicitly using the namespace makes auditing Kaml View code bases much easier.

Details for each event type can be found below.

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

`IValidation` normally maps to a result row (from `error` or `warning` table) from a calculation, but can also be manually created by the KatApp Framework or Kaml View. The row has two properties; `@id` and `text`.

```javascript
const validation: IValidation = {
    "@id": "System",
    "text": "An unexpected error has occurred.  Please try again and if the problem persists, contact technical support."
};
```

If the `@id` property of an `IValidation` item inside [state.errors](#errors:-Array<IValidation>) or [state.warnings](#warnings:-Array<IValidation>) matches the 'name' of an [v-ka-input](#v-ka-input) item, the `error` or `warning` property of the [v-ka-input Scope](#v-ka-input-Scope), respectively, will be set to the `IValidation.text` property.

### ICalculationInputs

`ICalculationInputs` represents an object containing all the inputs that should be sent to a RBL calculation.  Inputs can be passed in during initialization as a property of [`IKatAppOptions`](#IKatAppOptions), as a parameter to the [application.calculateAsync](#calculateAsync) method, or as a model property used by [v-ka-api](#v-ka-api), [v-ka-app](#v-ka-app), [v-ka-modal](#v-ka-modal), or [v-ka-navigate](#v-ka-navigate) directives.

Generally speaking, `ICalculationInputs` is a [IStringIndexer&lt;string>](#istringindexert--istringanyindexer) object with key/value items for each inputs.  However, it also contains 'input tables' as well that can only be set via the [`IKatApp.updateCalculationOptions` event](#IKatApp.updateCalculationOptions).  The object can be visualized as follows.

```javascript
{
    // Framework sets this to 1 on Configure UI calc
	"iConfigureUI": 1,
    // Framework sets this to 1 on Configure UI calc
	"iDataBind": 1,
    // Optional; If changing input triggered calculation, this will contain input name
	"iInputTrigger": "iFirstName",
	// Framework sets this to 1 if running via v-ka-app
    "iNestedApplication": 0, 
	// Framework sets this to 1 if running via v-ka-modal
    "iModalApplication": 0, 
	// Only assignable from Kaml Views in onUpdateCalculationOptions
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

### ITabDef

`ITabDef` is the object returned from RBLe Framework calculations for each 'result tab' processed. The properties available on this object represent the result tables (`Array<ITabDefRow>`) returned from the CalcEngine tab.

### ITabDefRow

`ITabDefRow` represents each row in a `ITabDef` table returned from a RBLe Framework calculation.  Note that it is simply a shorthand name for the underlying `IStringIndexer<string>` interface since every value returned from the RBLe Framework is typed as a `string`.  If a 'value' needs to be treated as `number` or `date`, the KatApp Framework or Kaml Views will need to first parse it into the appropriate type.

### IManualTabDef

`IManualTabDef` is the object passed in to KatApp Framework if [IKatAppOptions.manualResults](#ikatappoptionsmanualresults-imanualtabdef--undefined) is passed. It can be viewed as an `ITabDef` except there are a few more properties attached to it to help the KatApp Framework index these results.

#### IManualTabDef.@calcEngineKey

Required: `string`; The key of the CalcEngine.  This key will be the key used in Vue directives when access result tables; similar to the [rbl-config/calc-engine/@key](#configuring-calcengines-and-template-files) property used when configuring KatApp CalcEngines.

#### IManualTabDef.@name

Optional: `string`; The name to use for this result tab.  If `manualResults` has more than one `IManualTabDef`, then Kaml Views will be specifying in Vue directives how to access each specfic tab via the `tab: 'TabName'` property in directive models.

If not provided, a name will be generated with the tab position concatenated with `RBLResult`, i.e. `'RBLResult1'`, `'RBLResult2'`, etc.

### IModalOptions

The `IModalOptions` parameter passed in to [IKatApp.showModalAsync](#ikatappshowmodalasync) controls how the modal application is built.  The [v-ka-navigate](#v-ka-navigate) directive can also create a modal confirmation before allowing the navigation to occur by passing in this object as part of the model.

#### IModalOptions.view

Property Type: `string | undefined`; Optional  
If the content for the modal being displayed is generated from a Kaml View, the name of the Kaml View 'id' should be assigned here.  When present, the KatApp Framework calls the `rble/verify-katapp` endpoint to ensure that the current user has access to the view before returning the content for the view.

#### IModalOptions.content

Property Type: `string | undefined`; Optional  
If the content for the modal being displayed is a HTML fragment confirmation message, the HTML markup can be passed directly as a string versus having to build a Kaml View for simple modal confirmations.

#### IModalOptions.contentSelector

Property Type: `string | undefined`; Optional  
If the content for the modal being displayed is static HTML that the current application has already generated, but it is complex enough to be cumbersome to pass in as a string via the `content` property, the DOM element selector string can be passed versus having to build a Kaml View. When `contentSelector` is passed, the KatApp Framework will take the `innerHTML` property of the element matching the `contentSelector`.

#### IModalOptions.calculateOnConfirm

Property Type: `ICalculationInputs | boolean | undefined`; Optional  
When a modal application is 'confirmed', using the `calculateOnConfirm` property can instruct the KatApp Framework to automatically run a RBLe Framework calculation.

Setting this property to `true` or providing a [`ICalculationInputs`](#icalculationinputs) object will trigger the automatic calculation.

#### IModalOptions.labels.title

Property Type: `string | undefined`; Optional  
If the modal should display a title, a value can be provided in the `labels.title` property of the parameter.

#### IModalOptions.labels.cancel

Property Type: `string | undefined`; Optional  
By default, the 'cancel' button will have a label of 'Cancel'.  If the modal should display a different label, a value can be provided in the `labels.cancel` property of the parameter.

#### IModalOptions.labels.continue

Property Type: `string | undefined`; Optional  
By default, the 'continue' button will have a label of 'Continue'.  If the modal should display a different label, a value can be provided in the `labels.continue` property of the parameter.

#### IModalOptions.css.cancel

Property Type: `string | undefined`; Optional  
By default, the 'cancel' button will have set css class of 'btn btn-outline-primary'.  If the modal should use a different css class, a value can be provided in the `css.cancel` property of the parameter.

#### IModalOptions.css.continue

Property Type: `string | undefined`; Optional  
By default, the 'continue' button will have set css class of 'btn btn-primary'.  If the modal should use a different css class, a value can be provided in the `css.continue` property of the parameter.

#### IModalOptions.size

Property Type: `"xl" | "lg" | "sm" | undefined`; Optional  
By default, if a modal is rendering a Kaml View, the size will be `xl`, otherwise `undefined`.  The modal size is based on the value passed in.  See [Bootstrap Modal Sizes](#https://getbootstrap.com/docs/5.0/components/modal/#optional-sizes) for more information.

#### IModalOptions.showCancel

Property Type: boolean | undefined; Optional  
By default, a modal shows both a 'continue' *and* a 'cancel' button.  If the displayed dialog only needs a 'continue' (i.e. confirming a transactional result message), set this value to `true` to hide the 'cancel' button.

#### IModalOptions.inputs

Property Type: `ICalculationInputs | undefined`; Optional
If inputs should be passed to the modal's rendered Kaml View, provide a `ICalculationInputs` object.

#### IModalOptions.buttonsTemplate

Property Type: string | undefined; Optional  
By default, KatApp modals will generate a 'continue' and 'cancel' button that are always visible and simply return a `boolean` value indicating whether or not a modal was confirmed.

If a modal is more complex with various stages that influence the behavior (visibility or functionality) of the modal buttons, a template ID can be provided.

Normally, only the Kaml View itself, being displayed as a modal, knows whether or not a template ID should be returned.  Therefore, this property can only be set when the modal is initiated and [application.update](#ikatappupdate) is called.

```javascript
(function () {
    var application = KatApp.get('{id}');
    application.update(
        {
            options: {
                modalAppOptions: {
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
```

#### IModalOptions.headerTemplate

Property Type: string | undefined; Optional  
By default, KatApp modals simply use the `labels.title` string property to display a 'modal header'.

If a modal is more complex and the header is more than just a text label (i.e. links or inputs), a template ID can be provided as the content to be rendered inside the header.

Normally, only the Kaml View itself, being displayed as a modal, knows whether or not a template ID should be returned.  Therefore, this property can only be set when the modal is initiated and [application.update](#ikatappupdate) is called.

```javascript
(function () {
    var application = KatApp.get('{id}');
    application.update(
        {
            options: {
                modalAppOptions: {
                    headerTemplate: "header"
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

```html
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

### IModalAppOptions

`IModalAppOptions` is a superset of [`IModallOptions`](#imodaloptions) interface.  `IModalOptions` is the parameter passed into [application.showModalAsync](#ikatappshowmodalasync) or the [v-ka-modal](#v-ka-modal) directive, while `IModalAppOptions` simply extends this object to pass in a few other properties that are made available to the Kaml View.  

This `IModalAppOptions` object is accessible via two different methods.  Within the templates used to render the 'header' or the 'buttons', there is a `modalAppOptions` available in the current scope.  Everywhere else, when access is needed, the options can be accessed via `application.options.modalAppOptions`.

#### IModalAppOptions.confirmedAsync

Property Type: `(response?: any) => Promise<void>`; Read Only  
Use the `confirmedAsync` property to access a method the KatApp Framework injected for use to indicate when a modal has been 'confirmed'.

Optionally, a response object can be returned as well.  Assuming the following 'buttons' template was in use:

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

#### IModalAppOptions.cancelled

Property Type: `(response?: any) => void`; Read Only
Use the `cancelled` property to access a method the KatApp Framework injected for use to indicate when a modal has been 'cancelled'.

Optionally, a response object can be returned as well.  See [`confirmedAsync`](#imodalappoptionsconfirmedasync) for sample on how to call helper methods on `modalAppOptions`.

#### IModalAppOptions.triggerLink

Property Type: `JQuery | undefined`; Read Only
If the current modal application was launched via a [`v-ka-modal`](#v-ka-modal) link, the `trigger` property will be set to this JQuery element.  This would allow the Kaml View acting as the modal to inspect information that may have been placed on the 'trigger link' (i.e. `data-*` attributes) to provide additional information internal to the sites overall functionality.

### ISubmitApiConfiguration

The payload representing the current configuration to submit to either a RBLe Framework calculation or a api endpoint in the Host Application.

#### ISubmitApiConfiguration.Token

Property Type: `string`; Optional  
If the data used in RBLe Framework calculations was 'registered' with the RBLe Framework web service, this is the token returned uniquely identifying the user's transaction package.

#### ISubmitApiConfiguration.TestCE

Property Type: `boolean`; Required  
Whether or not the RBLe Framework should use the 'test' CalcEngine when running the calculation.

#### ISubmitApiConfiguration.TraceEnabled

Property Type: `number`; Required  
Whether or not the RBLe Framework should provide diagnostic trace for the next calculation. A value of `1` will trace and `0` will not.

#### ISubmitApiConfiguration.SaveCE

Property Type: `string`; Required  
A `|` delimitted list of secure file location folders to save a debug copy of the CalcEngine(s) used during the calculation.

#### ISubmitApiConfiguration.AuthID: string; // used in non-session version, when options has a 'data' property of json formatted xds data

#### ISubmitApiConfiguration.Client

Property Type: `string`; Required  
A `string` value representing a 'client name' used during the calculation for logging purposes.

#### ISubmitApiConfiguration.AdminAuthID

Property Type: `string`; Optional  
If an admin user is impersonating a normal user during the execution of the Kaml View, this value should contain the ID of the admin user to indicate to CalcEngine(s) that an admin user is initiating the calculation.

#### ISubmitApiConfiguration.RefreshCalcEngine

Property Type: `boolean`; Required  
Whether or not the RBLe Framework should check for an updated CalcEngine the next calculation. This value is determined from the [`options.debug.refreshCalcEngine'](#ikatappoptionsdebugrefreshcalcengine) property.

#### ISubmitApiConfiguration.CurrentPage

Property Type: `string`; Required  
The name of the current page as it is known in the Host Environment. This value is determined from the [`options.currentPage'](#ikatappoptionscurrentpage) property.

#### ISubmitApiConfiguration.RequestIP

Property Type: `string`; Required  
The IP address of the browser running the current KatApp. This value is determined from the [`options.requestIP'](#ikatappoptionsrequestip) property.

#### ISubmitApiConfiguration.CurrentUICulture

Property Type: `string`; Required  
The current culture as it is known in the Host Environment. This value is determined from the [`options.currentUICulture'](#ikatappoptionscurrentuiculture) property.

#### ISubmitApiConfiguration.Environment: string;

Property Type: `string`; Required  
The name of the current environment as it is known in the Host Environment. This value is determined from the [`options.environment'](#ikatappoptionsenvironment) property.

#### ISubmitApiConfiguration.Framework: string;

Property Type: `string`; Required  
The name of the current 'framework' submitting to the RBLe Framework. This value is set to `"KatApp"`.

### IGetSubmitApiOptions

The `IGetSubmitApiOptions` interface represents the information that creates an api submission payload.

#### IGetSubmitApiOptions.inputs

Property Type: `ICalculationInputs`  
The list of inputs to submit to the api endpoint (usually used in a `iValidate="1"` calculation in the Host Environment).

#### IGetSubmitApiOptions.configuration

Property Type: `IStringIndexer<string>`  
Any custom configuration settings to pass to the Host Environment. The most common property set is the `configuration.CacheRefreshKeys: Array<string>` property.

### IApiOptions

The `IApiOptions` interface represents the configuration to use when submitting to an api endpoint.

#### IApiOptions.calculationInputs

Property Type: [`ICalculationInputs`](#icalculationinputs); Optional  
Often when an api endpoint is submitted to in a Host Environment that leverages the RBLe Framework, an `iValidate=1` RBL calculation is the first action performed on the server.  This calculation can do UI validations or provide instructions to the Host Environment on what type of actions it should take.  All the inputs from the UI are always submit, but if additional inputs should be passed to the endpoint, an `ICalculationInputs` object can be provided.

#### IApiOptions.apiParameters

Property Type: `IStringAnyIndexer`; Optional  
Some endpoints require parameters that are processed in the server code of the Host Environment.  These parameters are technically not different from `ICalculationInputs`, but providing them as a second parameter accomplishes a few things.

1. The value type of each parameter can be more than just `string`, supporting `boolean`, `number` or a nested object with its own properties.
1. If all the parameters are of type `string`, even though technically not different from the `calculationInputs` property, using `apiParameters` eliminates parameters from being passed to a RBL calculation.
1. Finally, it simply segregates 'intent' of the parameters versus the inputs.  Parameters are intended to be used by the api endpoint server code while inputs are intended to be used by the RBL calculation.

#### IApiOptions.isDownload

Property Type: `boolean`; Optional  
If the api endpoint being posted to will return binary content representing a download, setting this flag to true tells the KatApp framework to process the results differently and save the generated content as a downloaded .

#### IApiOptions.calculateOnSuccess

Property Type: `boolean | ICalculationInputs`; Optional  
If after a successful submission to an api endpoint, the KatApp Framework should automatically trigger a RBLe Framework Calculation, `calculateOnSuccess` can be set.  Setting the value to `true` indicates that a calculation should occur.  Setting the value to a `ICalculationInputs` object also indicates that a calculation should occur and additionally pass along the inputs provided.

#### IApiOptions.files

Property Type: [`FileList`](#https://developer.mozilla.org/en-US/docs/Web/API/FileList); Optional
If the api endpoint being submitted to accepts file uploads, this property can be set (usually from a `input type="file"` element).

### ILastCalculation

The `ILastCalculation` interface represents a snapshot of the most recent calculation.

#### ILastCalculation.inputs

Property Type: `ICalculationInputs`;
The list of inputs submitted to the most recent calculation.

#### ILastCalculation.results

Property Type: `Array<ITabDef>`;
The array of [`ITabDef`s](#itabdef) returned from the most recent calculation.

#### ILastCalculation.configuration

Property Type: [`ISubmitApiConfiguration`](#isubmitapiconfiguration);
The configuration payload submitted to the most recent calculation.

# RBLe Framework

The RBLe Framework is the backbone of KatApps.  The service is able to marshall inputs and results in and out of RBLe CalcEngines.  These results drive the functionality of KatApps.

- [Framework Inputs](#framework-inputs) - Discusses the set of inputs that are always passed to calculations automatically (and are not part of the UI).
- [Input Table Management](#input-table-management) - Discusses how to pass 'input tables' to calculations.
- [Result Tables](#result-tables) - Discusses the standard result table processing rules, structure, and features available in generating results for Kaml Views.
- [Precalc Pipelines](#precalc-pipelines) - Discusses how multiple CalcEngines can be 'chained' together feedings the 'results' from one CalcEngine into the 'inputs' of the next CalcEngine in the pipeline before generating the final result.

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

RBLe Framework has the concept of input tables that allow for tabular input data to be sent to the CalcEngine.  If input tables are expected from the CalcEngine, they can be supplied via the [`IKatApp.updateCalculationOptions` event](#IKatApp.updateCalculationOptions).

```javascript
// Append custom table to the CalculationInputs object instead of sending an input for each 'table cell' of data
application.on("updateCalculationOptions.ka", (event, submitOptions) => {
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

## Result Tables

All tables processed by RBLe Framework follow the rules described below.

Name&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | Location&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; | Description
---|---|---
id | Column Name | An arbitrary 'id' value for each row that can be used by Kaml View.
on | Column Name | Whether or not this row gets exported. If set to `0`, the row is not returned in results.
on | Row ID | Similar to the `on` Column, to control whether or not a column gets exported, provide a row with `id` set to `on`, then for each column in this row, if the value is `0`, then _entire_ column will not be exported.
table-output-control | Table Name | Similar to the `on` Column Name and Row ID, this controls exporting logic, but it puts all the logic in one place (instead of every row's `on` column) to make maintenance easier.  See [table-output-control](#table-output-control) for more information.
export-blanks | Column Switch | By default, blank values/columns are not returned from RBLe service.  If table processing requires all columns to be present even when blank, use the `/export-blanks` switch on the column header.
work-table | Table Switch | By default, all tables on a CalcEngine result tab are exported (until two blank columns are encountered).  To flag a table as simply a temp/work table that doesn't need to be processed, use the `/work-table` switch on the table name.
configure-ui | Table Switch | To configure a table to _only_ export during a Configure UI calculation (`iConfigureUI=1`), use the `/configure-ui` switch on the table name.  This removes the need of putting `on` or `table-output-control` logic that checks the `iConfigureUI` input explicitly.
unique-summary | Table Switch | RBLe has an automatic 'grouping' aggregator to produce a unique list of values for input tables (UI inputs, Data Tables, or Global Tables).  See [Unique Summary Configuration](#Unique-Summary-Configuration) for more information.
child-only | Table Switch | By default, any tables used as a child table are still exported normally, so the data appears twice in the results; once nested, and once at root level.  If you want to supress the exporting of data at the normal/root level, you can add the `/child-only` flag indicating that it will only appear in the results nested in its parent table.  _If the parent is not exported, child tables remain supressed._ See [Table Nesting Configuration](#Table-Nesting-Configuration) for more information.
sort-field | Table Switch | To configure how the table data is sorted, use the `/sort-field:field-name` switch on the table name.  To specify multiple columns to use in the sort, provide a comma delimitted list of field names.  When used on an _Input Tab Table_, the data is sorted _before_ it is loaded into the tab.  Conversely, when used on a _Result Tab Table_, the data is sorted _after_ exporting the results from the CalcEngine.
sort-direction | Table Switch | Optional sort control (`asc` or `desc`) used in conjunction with `sort-field`.  By default, data will be sorted ascending.  Use the `/sort-direction:direction` to control how field(s) specified in the `/sort-field` switch are sorted.  If `/sort-direction:` is provided, there must be the same number of comma delimitted values as the number of comma delimitted fields found in `/sort-field`.
sort-number | Table Switch | Optional switch (`true` or `false`) used in conjunction with `sort-field`.  By default, data will be sorted using a `string` comparison.  Use the `/sort-number:true` to indicate that field(s) specified in the `/sort-field` switch should be treated as numeric when sorting.  If `/sort-number:` is provided, there must be the same number of comma delimitted values as the number of comma delimitted fields found in `/sort-field`.
text | Column Switch | Optional switch used on input table columns to indicate whether or not to force the provided data to be formatted as 'text'.  If `/text` is not provided and a textual value that converts to a number is provided, it can change the value.  For example, if `01` is provided to a column without the `\text` flag, the CalcEngine would convert `01` to `1`.  With the `\text` flag, the leading `0` would be preserved.
off | Column Switch | Optional switch used on result table columns to indicate that the column should not be exported in the results.  This is similar to an `on` row ID where each column is controlled with a `1` or `0` (skipped) value, but is an easier syntax to use if there is no logic behind exporting or not.
Nesting `[]` | Column Switch | Optional syntax to specify that a column contains nested information.  See [Table Nesting Configuration](#Table-Nesting-Configuration) for more information.

### Unique Summary Configuration

Producing a unique list of values in CalcEngines can be difficult (especially when the unique _key_ is a combination of multiple columns). To alleviate this problem, RBLe can produce a unique list of values from input tables (UI inputs, `<data-tables>` or `<<global-tables>>`).  The configuration is controlled by the `/unique-summary:detailTable` flag and the columns specified in the summary table.

1. The `/unique-summary:detailTable` flags a table as a _summary_ table and the `detailTable` name indicates the table that should be summarized.
2. When creating a summary table, you indicate what type of table (input, data, or global) the detail table is by using the same naming convention: `<data>`, `<<global>>`, or no `<>` for user input tables.
3. In the summary table, only columns that generate the _unique_ list of values desired should be specified.  Additional columns (i.e. for additional details) *can not* be used.

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

### Table Nesting Configuration

Traditionally, RBLe exports all tables specified in the CalcEngine as root level table row arrays with no nesting; each row containing only the properties (columns from CalcEngine) defined on the table.  For better API support from other systems calling into RBLe, result tables can be configured so that nesting occurs and rich object hierarchies can be built.  

When a column has `[]` in its name, this signals that this column will have an array of children rows.  The column header name specified before the `[` will be the name of the property on this parent row.  Note that if any `/switch` flags are to be used on this column (i.e. `/text`), they should appear _after_ the closing `]`.  There are two ways to configure nesting.

If only `[]` is used in the name, the nesting configuration will be supplied in the _column value_ of each row, however, if every parent row nests the same child table but simply filters the child rows by a value, the syntax of `[childTable:childKeyColumn]` can be used.

Configuration | Value | Description
---|---|---
`[]` | `childTable` | When the column only has `[]` provided, and the value only specifies a `childTable`, every row present in `childTable` will be nested under this column.
`[]` | `childTable:childKeyColumn=value` | Each row can specify a filter into the specified `childTable`.  The table and filter are separated by a `:` and a simply expression using `=` is all that is supported.  This would nest all rows from `childTable` where the column `childKeyColumn` has a value of `value`.
`[childTable:childKeyColumn]` | `value` | When this syntax is used, the `value` provided in each row is used as a filter for the `childKeyColumn` column.

*Example of `[childTable:childKeyColumn]` syntax.*

*orders table*
id | date | amount | items\[orderItems:orderId\] 
---|---|---|---
1 | 2021-07-13 | 45 | 1
2 | 2021-08-13 | 33 | 2

*orderItems table*
id | orderId | sku | price | quantity 
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

*Example of `[]` syntax.*

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
id | name
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

### table-output-control

Provide a single table with logic that controls whether or not a table is exported without the need placing logic in every row's `on` column of desired table.

Column | Description
---|---
id | The name of the table to control.
export | Whether or not the table is exported.<br/>`1` indicates that the table should be exported. If all rows are turned off via `on` column, then the KatApp state will be assigned an empty result; resulting in reactive processing to occur.<br/>`0` indicates that the table should *not* be exported. KatApp state will remain as is.<br/>`-1` indicates that the table should *not* be exported and the KatApp state will be cleared.

## Precalc Pipelines

Precalc CalcEngines simply allow a CalcEngine developer to put some shared logic inside a helper CalcEngine that can be reused.  Results from each CalcEngine specified will flow through a pipeline into the next CalcEngine.  Precalc CalcEngines are ran in the order they are specified ending with the calculation of the Primary CalcEngine.

The format used to specify precalc CalcEngines is a comma delimitted list of CalcEngines, i.e. `CalcEngine1,CalcEngineN`.  By default, if only a CalcEngine name is provided, the input and the result tab with the *same* name as the tabs<sup>1</sup> configured on the primary CalcEngine will be used.  To use different tabs, each CalcEngine 'entity' becomes `CalcEngine|InputTab|ResultTab`.  

By specifying precalc CalcEngine(s), the flow in RBLe Service is as follows.

1. Load all inputs and data into precalc CalcEngine and run calculation.
2. Any tables returned by the configured result tab<sup>1</sup> are then passed to the next CalcEngine in the pipeline as a *data* `<history-table>` on the input tab.

<sup>1</sup> For precalc CalcEngines, only one result tab is supported.

### Sample 1: Two precalc CalcEngines
Configure two CalcEngines to run in the pipeline before the primary CalcEngine.  In following sample, LAW_Wealth_Helper1_CE and LAW_Wealth_Helper2_CE both use the same tabs configured on LAW_Wealth_CE.

```html
<rbl-config templates="Standard_Templates,LAW:Law_Templates">
    <calc-engine key="default" name="LAW_Wealth_CE" input-tab="RBLInput" result-tabs="RBLResult" precalcs="LAW_Wealth_Helper1_CE,LAW_Wealth_Helper2_CE"></calc-engine>
</rbl-config>
```

### Sample 2: Custom CalcEngine Tabs
Configure two CalcEngines with different tabs to run in the pipeline before the primary CalcEngine.  In following sample, LAW_Wealth_Helper1_CE specifies custom tabs, while LAW_Wealth_Helper2_CE uses same tabs configured on LAW_Wealth_CE.

```html
<rbl-config templates="Standard_Templates,LAW:Law_Templates">
    <calc-engine key="default" name="LAW_Wealth_CE" input-tab="RBLInput" result-tabs="RBLResult" precalcs="LAW_Wealth_Helper1_CE|RBLInput|RBLHelperResults,LAW_Wealth_Helper2_CE"></calc-engine>
</rbl-config>
```


# Upcoming Documentation

1. Document custom 'view model' and how it is passed in...sample with doc center 'showDownload'
1. Original Docs: See [calculate With Different CalcEngine](#calculate-With-Different-CalcEngine) for information about running secondary calculations via javascript and without requiring configuration up front.
1. Comment about how errors/warnings are cleared out everytime there is a 'normal calculation' or apiAsync call
1. Section about how 'modals work' and different ways to call them and work with them (see cheatsheet)
1. Section discussing the 'automatic' flows; a) when I load kaml views and b) after calculations (i.e. help tips and anything else automagic)