
# Vue KatApp Notes

## To Do

### Final Audit
1. Search for rbl-, application., .RBLe", data-input-, .KatApp(), .apiAction, .createModal, .trigger to see where to fix up code
1. rbl-tid="empty" - this is just a v-if= to check if previous rbl-tid=inline source has any rows
1. Look in my KatApp for triggerEvent and see all event types/signatures and document
1. Need to search for each 'standard' template inside nexgen to see if used (probably validation summary for sure)
1. Search for configureUICalculation = 0/off...see if my thing still works b/c removed 'calculate()' call in init(), if doesn't work right, would have to put manualResult processing/assigning (one time) inside the 'calculate' type method where it copies regular results
1. ManualInputs - can be removed from EndpointParameters

### Miscellaneous

1. intellisense for js and kaml?
1. Han's generic 'dropdown-items' processing :| in pension.estimate, how do I handle that? onResultProcessing?


## Breaking Changes

1. Reference KatApp.js directly (no more dynamic loading of provider, just one file)
1. Provider Code
	1. No automatic bootstrap input processing?  Removed `bootstrap` property from rbl-config (starting at 5 only right now)
	1. polyfill for some prototypes no longer done (the ones that weren't supported in IE so I implemented myself) - so basically old IE not supported
	1. Never register data, always sessionless (can address change when needed)
	1. init process
		1. No more rbl- attributes on the 'katapp', always passed via options (*original* poc let you specify some props on element you triggered .KatApp() on)
		1. No more 'defaultoptions' available to modify, just hard coded internally
		1. No more concept of 'shareData' across multiple KatApps (*original* poc that never went anywhere)
		1. Don't support custom 'React' submission post (l@w) (can address change when needed)
	1. calculate process
		1. No more ensureApplicationValid (since that was only invalid when data updating was screwed up and not supporting that yet)
		1. No more getCalculationData (L@W), registerData (we are sessionless), submit 'retry' (only failed if data expired, we are sessionless) - will re-introduce when needed
1. Options Object Changes
	1. Removed viewTemplates (only specified via rbl-config)
	1. Removed `calcEngine` property (l@w), only `calcEngines`
	1. relativePathTemplates - needs .kaml extension always (done by KatApp.cs control)
	1. sessionUrl -> calculationUrl, functionUrl -> kamlRepositoryUrl (done by KatApp.cs control - but l@w would have to update if they used new version)
1. Template Files
	1. <rbl-template tid=""/> -> <template id=""/>
	1. Only children of `<script> <style> <template>` are supported
	1. mounted/unmounted javascript instead of templateOn()
	1. No more 'standard_templates' (not yet at least b/c shouldn't be needed, and other breaking changes will require a new format obviously for VUE)
	1. Maybe make standard template file that is part of project
		1. validation summary?
		1. ajax blocker (just use v-if="rbl.calculating")
1. CalcEngine
	1. Only support rbl-* table names, not old ejs-* ones
	1. *Have to be careful* about returning all tables and being 'lazy' about turning off tables, since now a 'reactive assignment' will be done
	1. No more concept of 'visible'/'rebuild' for rbl-listcontrol, basically you just always return all rows you want to display (if change happens)
		1. If you return input in rbl-listcontrol and 'linked' table is empty, it'll empty out the list control
1. Kaml Files
	1. rbl-config is required, `calc-engine` must be specified as sub element(s)
	1. The way you grab your application in script
	1. Leverage .update() method at start, only way to update (and one chance only)
	1. Handlers, shouldn't use .on("change")...always use @change= and assign handlers in update() method
	1. $(this) in handlers, should always be $(e.target)
	1. Probably need :key="" on every v-for to make sure it re-renders...could make it default to :key="@id" if no :key is present when I load kaml?
	1. application.select is now HtmlElement/HtmlElement[] based.  Not jquery.  Might change this.
	1. data-input- not supported, use json object with properties
	1. "result-table" template no longer supported
1. Event Handlers
	1. Use .ka suffix for application events, use .nexgen suffixs for events added/removed to own UI components
	1. Check signatures of all remaining events (app) is always appended to the end
	1. onInitializing is gone, use onInitialized
	1. onCalculationOptions -> onGetCalculationOptions 
		{ inputs?: { name: value, tables: [ { name: "table", rows: [{}]}]}, configuration?: { /* overrides or custom properties, i.e. CacheRefreshKeys } }
		1. For calculation input/tables -> onGetCalculationInputs { inputs?: { name: value, tables: [ { name: "table", rows: [{}]}]}, cacheRefreshKeys?: string[] }
		1. For CacheRefreshKeys -> onGetCalculationOptions 
	1. onCalculationErrors -> double check signature
	1. onUpdateEndpointOptions -> 'endpoint' parameter (this would only be called if api called manually without a calculation or with v-ka-api)
	1. There are no 'calculation' events triggered if only processing manualResults.

1. Not Organized Yet
	1. Boostrap select getInput (Find Dr?) - if multiselect returned array and I joined with ^.  Not supporting yet.
	1. RBLe-input-table class not supported - all input tables have to be done via handler

## Need to Organize

    - Vue like
        - Features to code??
            - Make all 'katapp-processed' flags 'data'
            - Can expressions have inputs?  might be worth passing those in
            - Walk elements (in add remove to dom, including injectTemplatesWithoutSource) and process
                - :attributes (or ka:attribute)
                - @event (ka@event)
                - #data?  short hand for rbl-value?
            - rbl-if - ability to evaluate it and show it again?
            - Make a katapp.js file that is like vue with KatApp.mount('selector', options);
        - Can I use VUE?
            - Questions
                - what if I want multiple click events on one element
                - Sample for Han, he wanted to hide results if user changed any inputs, how would I do that?
            - Features we have
                - Nested katapps
                    https://github.com/vuejs/petite-vue/discussions/53#discussioncomment-2053949
                    vue-hydrate seems to have references to other instances of apps