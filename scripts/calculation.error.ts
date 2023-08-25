class CalculationError extends Error {
	constructor(message: string, public failures: ICalculationFailedResponse[]) {
		super(message);
	}
}