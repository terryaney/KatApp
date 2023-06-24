/*
Was trying to support a syntax that looked like these:
<div v-ka-trigger="{ watch: [ inputs.iElection, inputs.iElectionAmt ], run: () => model.isDirty = true }"></div>
<div v-effect="if ( (inputs.iElection && inputs.iElectionAmt) || true) model.isDirty = true"></div>	

<div v-ka-trigger="{ watch: [ inputs.haveChanged ], run: () => { console.log( 'hi' ); inputs.iAcknowledge = 0; } }"></div>
<div v-effect="if( inputs.iRelationshipCode || true) inputs.iAcknowledge = 0"></div>

<div v-ka-trigger="{ watch: [ inputs.haveChanged ], run: handlers.savannaReactive }"></div>
<div v-effect="if ( JSON.stringify(inputs) || true ) handlers.savannaReactive()"></div>

TLDR: Essentially WHATEVER is in the entire v-effect or v-ka-trigger affects reactivity (even if it calls function).

v-effect="if( inputs.iRelationshipCode || true) inputs.iAcknowledge = 0"
	- changes to iRelationshipCode OR iAcknowledge trigger this effect to occur.

v-effect="if ( JSON.stringify(inputs) || true ) handlers.savannaReactive()"
	- changes to any inputs (since stringify will be diff) OR *anything* used inside savannaReactive() changes it will trigger.
	- So if savannaReactive used something from model or inputs (irrelevant in this example b/c he wants all inputs) and they change
		it will trigger expression to run when you may not intend it to.

Notes:
1. Tom came up with the v-effect idea to essentially create an expression with any inputs (or all - using stringify) he wanted to
	'watch' and then run an expression, then at the end of all the 'watch variables', he put '|| true' to ensure the desired function
	executed.

1. I created a v-ka-trigger directive to try and make it more explicit but essentially do the same thing.  Have an 'array' of things to 
	'watch' and if any changed, run the 'run' property which could be a function or inline lambda.

1. I was going to pre-process and convert to a v-scope like Tom's but didn't want to battle parsing the string expression.  So skipped that attempt.

1. First directive attempt, but ran too often
	return ctx => {	
		ctx.effect(async () => {
			if (model.watch.length > 0) {
				const result = model.run();

				if (result instanceof Promise) {
					await result;
				}
			}
		});			
	}

1. Second directive attempt was to parse string and create a Function but I couldn't get the scope passed in correctly
	and I think it was running too often.

return ctx => {			
	const watchPos = ctx.exp.indexOf("watch:");
	const runPos = ctx.exp.indexOf("run:");
	if (watchPos == -1) {
		throw new Error("You must provide a 'watch' property on the v-ka-trigger directive.");
	}
	if (runPos == -1) {
		throw new Error("You must provide a 'watch' property on the v-ka-trigger directive.");
	}

	let watchExpString = watchPos < runPos
		? ctx.exp.substring(watchPos + 6, runPos - 1).trim()
		: ctx.exp.substring(watchPos + 6, ctx.exp.length - 1).trim();

	if (watchExpString.endsWith(",")) {
		watchExpString = watchExpString.substring(0, watchExpString.length - 1);
	}

	let runExpString = runPos < watchPos
		? ctx.exp.substring(runPos + 4, watchPos - 1).trim()
		: ctx.exp.substring(runPos + 4, ctx.exp.length - 1).trim();

	if (runExpString.endsWith(",")) {
		runExpString = runExpString.substring(0, runExpString.length - 1);
	}
		
	if (!runExpString.startsWith("(") && !runExpString.endsWith(")")) {
		runExpString += "()";
	}
	
	const watchExp = ctx.get(watchExpString) as Array<object>;
	const runFunction = new Function('$scope', `with($scope){return (${runExpString})}`);

	ctx.effect(async () => {
		if (watchExp.length > 0) {
			console.log(`Length: ${watchExp.length}`);
			runFunction(ctx.ctx.scope);
		}
	});
};

*/
/*
class DirectiveKaTrigger implements IKaDirective {
	public name = "ka-trigger";
	public getDefinition(application: KatApp): Directive<Element> {
		return ctx => {			
			const watchPos = ctx.exp.indexOf("watch:");
			const runPos = ctx.exp.indexOf("run:");
			if (watchPos == -1) {
				throw new Error("You must provide a 'watch' property on the v-ka-trigger directive.");
			}
			if (runPos == -1) {
				throw new Error("You must provide a 'watch' property on the v-ka-trigger directive.");
			}

			let watchExpString = watchPos < runPos
				? ctx.exp.substring(watchPos + 6, runPos - 1).trim()
				: ctx.exp.substring(watchPos + 6, ctx.exp.length - 1).trim();

			if (watchExpString.endsWith(",")) {
				watchExpString = watchExpString.substring(0, watchExpString.length - 1);
			}
		
			let runExpString = runPos < watchPos
				? ctx.exp.substring(runPos + 4, watchPos - 1).trim()
				: ctx.exp.substring(runPos + 4, ctx.exp.length - 1).trim();

			if (runExpString.endsWith(",")) {
				runExpString = runExpString.substring(0, runExpString.length - 1);
			}
				
			if (!runExpString.startsWith("(") && !runExpString.endsWith(")")) {
				runExpString += "()";
			}
			
			const watchExp = ctx.get(watchExpString) as Array<object>;
			const runFunction = new Function('$scope', `with($scope){return (${runExpString})}`);

			ctx.effect(async () => {
				if (watchExp.length > 0) {
					console.log(`Length: ${watchExp.length}`);
					runFunction(ctx.ctx.scope);
				}
				
				// if (model.watch.length > 0) {
				// 	const result = model.run();

				// 	if (result instanceof Promise) {
				// 		await result;
				// 	}
				// }				
			});
		};
	}
}
*/