class KamlRepository {
	private static resourceRequests: Record<string, Array<(errorMessage?: string)=> void>> = {};

	static async getViewResourceAsync(options: IKatAppOptions, view: string): Promise<IStringIndexer<string>> {
		return this.getKamlResourcesAsync(options, [view], true);
	}
	static async getTemplateResourcesAsync(options: IKatAppOptions, resourceArray: string[]): Promise<IStringIndexer<string>> {
		return this.getKamlResourcesAsync(options, resourceArray, false);
	}

	private static async getKamlResourcesAsync(options: IKatAppOptions, resourceArray: string[], isView: boolean): Promise<IStringIndexer<string>> {
		const currentOptions = options as IKatAppRepositoryOptions;

		const useLocalWebServer = currentOptions.debug.debugResourcesDomain != undefined &&
			(currentOptions.useLocalRepository ?? (currentOptions.useLocalRepository = await this.checkLocalServerAsync(currentOptions)));

		var resourceResults = await Promise.allSettled(
			resourceArray.map(resourceKey => {
				if (!isView) {
					var currentRequest = KamlRepository.resourceRequests[resourceKey];

					if (currentRequest != undefined) {
						// Already being requested...add call back
						var currentRequestPromise: JQuery.Deferred<IKamlResourceResponse> = $.Deferred();

						currentRequest.push((errorMessage) => {
							if (errorMessage != undefined) {
								currentRequestPromise.reject({
									resourceKey: resourceKey,
									errorMessage: errorMessage,
									processedByOtherApp: true
								});
							}
							else {
								currentRequestPromise.resolve({
									resourceKey: resourceKey,
									processedByOtherApp: true
								});
							}
						});
						return currentRequestPromise;
					}
					KamlRepository.resourceRequests[resourceKey] = [];
				}

				return this.getResourceAsync(currentOptions, resourceKey, useLocalWebServer);
			})
		);

		const rejected =
			resourceResults
				.filter(r => r.status == "rejected")
				.map(r => (r as PromiseRejectedResult).reason)
				.map(r => ({
					Exception: r instanceof KamlResourceDownloadError ? r as KamlResourceDownloadError : undefined,
					Response: !(r instanceof KamlResourceDownloadError) ? r as IKamlResourceResponse : undefined 
				}))
				.map(r =>
					r.Exception != undefined
						? {
							resourceKey: r.Exception.resourceKey,
							processedByOtherApp: false,
							errorMessage: r.Exception.message
						} as IKamlResourceResponse
						: r.Response!
				);
		const resolved =
			resourceResults
				.filter(r => r.status == "fulfilled")
				.map(r => (r as PromiseFulfilledResult<IKamlResourceResponse>).value);

		if (rejected.length > 0) {
			// Any requests processed by this app...forward the error to any callbacks
			if (!isView) {
				rejected					
					.filter(r => !r.processedByOtherApp)
					.forEach(f => {
						KamlRepository.resourceRequests[f.resourceKey].forEach(c => c(f.errorMessage));
						delete KamlRepository.resourceRequests[f.resourceKey];
					});

				resolved
					.filter(r => !r.processedByOtherApp)
					.forEach(f => {
						KamlRepository.resourceRequests[f.resourceKey].forEach(c => c());
						delete KamlRepository.resourceRequests[f.resourceKey];
					});
			}

			throw new KamlRepositoryError(
				"Failed to download Kaml repositoryItems.",
				rejected.map(r => ({ resource: r.resourceKey, errorMessage: r.errorMessage! }))
			);
		}
		else {
			const results: IStringIndexer<string> = {};

			resolved
				.filter(r => !r.processedByOtherApp)
				.forEach(r => {
					results[r.resourceKey] = r.content!;
				});

			return results;
		}
	}

	static resolveTemplate(resourceKey: string): void {
		// Forward the success to any callbacks, this is only called by templates 'processed' by current application
		this.resourceRequests[resourceKey].forEach(c => c());
		delete this.resourceRequests[resourceKey];
	}

	private static async checkLocalServerAsync(currentOptions: IKatAppRepositoryOptions): Promise<boolean> {
		const url = "https://" + currentOptions.debug.debugResourcesDomain + "/js/ping.js";
		try {
			await $.ajax({
				converters: {
					'text script': function (text: string): string {
						return text;
					}
				},
				url: url.substring(0, 4) + url.substring(5),
				timeout: 1000,
			});

			return true;
		} catch (error) {
			return false;
		}
	};

	private static async downloadResourceAsync(url: string, tryLocalWebServer: boolean): Promise<{ data?: string, errorMessage?: string }> {
		const requestConfig: IStringAnyIndexer = {
			converters: {
				'text script': function (text: string): string {
					return text;
				}
			},
			url: url,
			cache: !tryLocalWebServer
		};

		if (!tryLocalWebServer) {
			// https://stackoverflow.com/a/38690731/166231
			// requestConfig[ "ifModified" ] = true; // !tryLocalWebServer;
			requestConfig["headers"] = { 'Cache-Control': 'max-age=0' };
		}

		try {
			const result = await $.ajax(requestConfig);
			const isRelativePath = String.compare(url.substring(0, 4), "http", true) != 0;

			// If querying service and get a 'string' back...then I know error happened
			// data.Content when request from service, just data when local files
			return isRelativePath || tryLocalWebServer || typeof result == "object"
				? { data: isRelativePath || tryLocalWebServer ? result : result.Resources[0].Content }
				: { errorMessage: result.startsWith("<!DOCTYPE") && result.indexOf("Code: 004") ? "RBLe Web Service Failure" : result };
		} catch (error) {
			return { errorMessage: (error as XMLHttpRequest).statusText };
		}
	};

	private static async getResourceAsync(currentOptions: IKatAppRepositoryOptions, resourceKey: string, tryLocalWebServer: boolean): Promise<IKamlResourceResponse> {
		const relativeTemplatePath = currentOptions.relativePathTemplates?.[resourceKey];
		const resourceParts = relativeTemplatePath != undefined ? relativeTemplatePath.split(":") : resourceKey.split(":");

		let resourceName = resourceParts[1];
		const resourceFolders = resourceParts[0].split("|");
		const version = resourceParts.length > 2 ? resourceParts[2] : (currentOptions.debug.useTestView ? "Test" : "Live"); // can provide a version as third part of name if you want

		const resourceNameParts = resourceName.split("?");
		const resourceNameBase = resourceNameParts[0];

		// Template names often don't use .kaml syntax
		if (!resourceNameBase.endsWith(".kaml")) {
			resourceName = resourceNameBase + ".kaml";

			if (resourceNameParts.length == 2) {
				// cache buster
				resourceName += "?" + resourceNameParts[1];
			}
		}

		let localWebServerResource = resourceName;
		let resourceUrl = "unavailable";
		let lastResult: { data?: string, errorMessage?: string } = { errorMessage: "unavailable" };

		// Walk each folder and return first successful result...
		for (let i = 0; i < resourceFolders.length; i++) {
			let localWebServerFolder = resourceFolders[i];

			const isResourceInManagementSite = String.compare(localWebServerFolder, "Rel", true) != 0;

			if (!isResourceInManagementSite) {
				// If relative path used, I still need to look at local server and the path
				// is usually Rel:Client/kaml or Rel:Container/Client/kaml.  So always just
				// get the containing folder of the kaml to be used as the 'folder name'
				// and the last part is simply the kaml file.
				const relativeResourceConfig = resourceName.split('/').slice(-2);

				localWebServerFolder = relativeResourceConfig[0];
				localWebServerResource = relativeResourceConfig[1];
			}

			const localServerUrl = "https://" + currentOptions.debug.debugResourcesDomain + "/KatApp/" + localWebServerFolder + "/" + localWebServerResource;
			resourceUrl = tryLocalWebServer
				? localServerUrl.substring(0, 4) + localServerUrl.substring(5)
				: !isResourceInManagementSite
					? ( currentOptions.isDotNetCore ? currentOptions.baseUrl + resourceName.substring(1) : resourceName )
					: currentOptions.kamlRepositoryUrl;

			if (!tryLocalWebServer && isResourceInManagementSite) {
				resourceUrl = resourceUrl + "?" + JSON.stringify({ "Command": "KatAppResource", "Resources": [{ Resource: resourceName, Folder: resourceParts[0], Version: version }] });
			}

			lastResult = await this.downloadResourceAsync(resourceUrl, tryLocalWebServer);

			if (lastResult.data != undefined) {
				let content = lastResult.data;

				return {
					resourceKey: resourceKey,
					content: content,
					processedByOtherApp: false
				};
			}
		}

		if (tryLocalWebServer) {
			return await this.getResourceAsync(currentOptions, resourceKey, false);
		}

		throw new KamlResourceDownloadError("getResourceAsync failed requesting from " + resourceUrl + ": " + lastResult.errorMessage, resourceKey);
	};
}
interface IKatAppRepositoryOptions extends IKatAppOptions {
	useLocalRepository?: boolean;
}
interface IKamlResourceResponse {
	resourceKey: string;
	errorMessage?: string;
	content?: string
	processedByOtherApp: boolean;
}
class KamlRepositoryError extends Error {
	constructor(message: string, public results: { resource: string, errorMessage: string }[]) {
		super(message);
	}
}
class KamlResourceDownloadError extends Error {
	constructor(message: string, public resourceKey: string) {
		super(message);
	}
}