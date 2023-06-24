class DirectiveKaTable implements IKaDirective {
	public name = "ka-table";

	public getDefinition(application: KatApp): Directive<Element> {
		return ctx => {
			ctx.effect(() => {
				const scope: IKaTableModel = ctx.get();
				const data = application.state.rbl.source(scope.name, scope.ce, scope.tab);

				$(ctx.el).empty();

				if (data.length > 0) {
					let tableCss = scope.css != undefined
						? `rbl ${scope.name} ${scope.css}`
						: `rbl ${scope.name} table table-sm table-hover`;

					const hasResponsiveTable = tableCss.indexOf("table-responsive") > -1;
					tableCss = tableCss.replace("table-responsive", "");

					const tableConfigRow = data[0] as IStringAnyIndexer;

					const tableColumns: IKaTableColumnConfiguration[] = [];
					const columnConfiguration: IStringIndexer<IKaTableColumnConfiguration> = {};

					let hasBootstrapTableWidths = false;

					Object.keys(tableConfigRow)
						.filter(k => k.startsWith("text") || k.startsWith("value"))
						.map(k => (
							{
								Name: k,
								Element: tableConfigRow[k],
								Meta: tableConfigRow["@" + k] ?? {},
								Width: tableConfigRow["@" + k]?.[hasResponsiveTable ? "@r-width" : "@width"]
							})
						)
						.forEach(e => {
							const config = {
								name: e.Name,
								isTextColumn: e.Name.startsWith("text"),
								cssClass: e.Meta["@class"],
								width: e.Width !== undefined && !e.Width.endsWith("%") ? + e.Width : undefined,
								widthPct: e.Width !== undefined && e.Width.endsWith("%") ? e.Width : undefined,
								xsColumns: (e.Meta["@xs-width"] != undefined ? e.Meta["@xs-width"] * 1 : undefined) || (hasResponsiveTable && e.Meta["@width"] != undefined ? e.Meta["@width"] * 1 : undefined),
								smColumns: e.Meta["@sm-width"] != undefined ? e.Meta["@sm-width"] * 1 : undefined,
								mdColumns: e.Meta["@md-width"] != undefined ? e.Meta["@md-width"] * 1 : undefined,
								lgColumns: e.Meta["@lg-width"] != undefined ? e.Meta["@lg-width"] * 1 : undefined
							};

							if (config.xsColumns !== undefined || config.smColumns !== undefined || config.mdColumns !== undefined || config.lgColumns !== undefined) {
								hasBootstrapTableWidths = true;
							}

							tableColumns.push(config);
							columnConfiguration[e.Name] = config;
						});

					const isHeaderRow = (row: ITabDefRow) => {
						const code = row["code"] ?? "";
						const id = row["@id"] ?? "";
						return (code === "h" || code.startsWith("header") || code.startsWith("hdr")) ||
							(id === "h" || id.startsWith("header") || id.startsWith("hdr"));
					};

					const getHeaderSpanCell = (row: IStringAnyIndexer, isHeader: boolean, span: string, getBootstrapSpanColumnCss?: (start: number, length: number) => string ) => {
						if (!isHeader || span != "") return undefined;

						// If only one cell with value and it is header, span entire row
						const keys = Object.keys(row);

						const values = keys
							.filter(k => k.startsWith("text") || k.startsWith("value"))
							.map(k => ({
								Name: k,
								Value: row[k] ?? "",
								Class: `${columnConfiguration[k].isTextColumn ? "text" : "value"} span-${scope.name}-${k} ${getBootstrapSpanColumnCss?.(0, tableColumns.length - 1) ?? ""}`
							}))
							.filter(c => c.Value !== "");

						return values.length === 1 ? values[0] : undefined;
					};
					
					const getSpanItems = (row: IStringAnyIndexer, span: string, getBootstrapSpanColumnCss?: (start: number, length: number) => string) => {
						const parts = span.split(":");
						let currentCol = 0;

						const spanItems: Array<{ Value: string, Class: string, Span: number }> = [];

						for (let p = 0; p < parts.length; p++) {
							if (p % 2 === 0) {
								const colSpan = +parts[p + 1];
								const colSpanName = parts[p];
								const spanConfig = columnConfiguration[colSpanName];
								const _class = `${spanConfig.isTextColumn ? "text" : "value"} ${spanConfig.cssClass ?? ""} span-${scope.name}-${colSpan} ${getBootstrapSpanColumnCss?.(currentCol, colSpan - 1) ?? ""}`;

								spanItems.push({ Value: row[colSpanName] ?? "", Class: _class, Span: colSpan});
							}
						}

						return spanItems;
					};
					const addClass = (el: HTMLElement, css: string) => {
						if (css.trim() != "") {
							el.classList.add(...css.trim().split(' '));
						}
					};

					const useBootstrapColumnWidths = hasBootstrapTableWidths && !hasResponsiveTable;

					if (useBootstrapColumnWidths) {
						const getBootstrapColumnCss = (c: IKaTableColumnConfiguration) => {
							let bsClass = c.xsColumns !== undefined ? " col-xs-" + c.xsColumns : "";
							bsClass += c.smColumns !== undefined ? " col-sm-" + c.smColumns : "";
							bsClass += c.mdColumns !== undefined ? " col-md-" + c.mdColumns : "";
							bsClass += c.lgColumns !== undefined ? " col-lg-" + c.lgColumns : "";
							bsClass += ` ${c.cssClass ?? ""}`;
							return bsClass.trim();
						};
						const getBootstrapSpanColumnCss = (start: number, length: number) => {
							const spanCols = tableColumns.filter((c, i) => i >= start && i <= start + length);
							const xs = spanCols.reduce((sum, curr) => sum + (curr.xsColumns ?? 0), 0);
							const sm = spanCols.reduce((sum, curr) => sum + (curr.smColumns ?? 0), 0);
							const md = spanCols.reduce((sum, curr) => sum + (curr.mdColumns ?? 0), 0);
							const lg = spanCols.reduce((sum, curr) => sum + (curr.lgColumns ?? 0), 0);
							let bsClass = xs > 0 ? " col-xs-" + xs : "";
							bsClass += sm > 0 ? " col-sm-" + sm : "";
							bsClass += md > 0 ? " col-md-" + md : "";
							bsClass += lg > 0 ? " col-lg-" + lg : "";

							return bsClass.trim();
						};

						const container = document.createElement("div");

						data.forEach(r => {
							const isHeader = isHeaderRow(r);

							const row = document.createElement("div");
							addClass(row, `${r["@class"] ?? r["class"] ?? ""} row tr-row ${isHeader ? "h-row" : ""}`);

							const span = r["span"] ?? "";
							const headerSpanCell = getHeaderSpanCell(r, isHeader, span, getBootstrapSpanColumnCss);

							if (headerSpanCell != undefined) {
								const col = document.createElement("div");
								addClass(col, headerSpanCell.Class);
								col.innerHTML = headerSpanCell.Value;
								row.appendChild(col);
							}
							else if (span != "") {
								row.append(
									...getSpanItems(r, span, getBootstrapSpanColumnCss)
										.map(s => {
											const spanCol = document.createElement("div");
											addClass(spanCol, s.Class);
											spanCol.innerHTML = s.Value;
											return spanCol;
										})
								);
							}
							else {
								tableColumns.forEach(c => {
									const col = document.createElement("div");
									addClass(col, `${getBootstrapColumnCss(c)} ${c.isTextColumn ? "text" : "value"} ${scope.name}-${c.name}`);
									col.innerHTML = r[c.name] ?? "";
									row.append(col);
								})
							}

							container.append(row);
						});

						ctx.el.append(container);
					}
					else {
						const getColGroupDef = () => {
							const colGroupDef = document.createElement("colgroup");
							tableColumns.forEach(c => {
								const width = c.width !== undefined || c.widthPct !== undefined
									? ` width="${c.widthPct ?? (c.width + "px")}"`
									: "";

								const col = document.createElement("col");
								col.setAttribute("class", `${scope.name}-${c.name}`);

								if (c.width !== undefined || c.widthPct !== undefined) {
									col.setAttribute("width", c.widthPct ?? (c.width + "px"));
								}

								colGroupDef.append(col);
							});

							return colGroupDef;
						};

						const table = document.createElement("table");
						addClass(table, tableCss);
						table.appendChild(getColGroupDef());

						let rowContainer: HTMLTableSectionElement | undefined = undefined;

						/* Needed?
						table.setAttribute("border", "0");
						table.setAttribute("cellspacing", "0");
						table.setAttribute("cellpadding", "0");
						*/

						data.forEach(r => {
							const isHeader = isHeaderRow(r);

							if (isHeader && rowContainer == undefined) {
								rowContainer = document.createElement("thead");
								table.append(rowContainer);
							}
							else if (!isHeader && rowContainer?.tagName != "TBODY") {
								rowContainer = document.createElement("tbody");
								table.append(rowContainer);
							}

							const row = document.createElement("tr");
							addClass(row, `${r["@class"] ?? r["class"] ?? ""} ${isHeader && rowContainer!.tagName == "TBODY" ? "h-row" : ""}`);

							const elementName = isHeader ? "th" : "td";
							const span = r["span"] ?? "";
							const headerSpanCell = getHeaderSpanCell(r, isHeader, span);

							if (headerSpanCell != undefined) {
								const col = document.createElement(elementName);
								addClass(col, headerSpanCell.Class);
								col.innerHTML = headerSpanCell.Value;
								row.appendChild(col);
							}
							else if (span != "") {
								row.append(
									...getSpanItems(r, span)
										.map(s => {
											const spanCol = document.createElement(elementName);
											addClass(spanCol, s.Class);
											spanCol.setAttribute("colspan", s.Span.toString());
											spanCol.innerHTML = s.Value;
											return spanCol;
										})
								);
							}
							else {
								tableColumns.forEach(c => {
									const col = document.createElement(elementName);
									addClass(col, `${c.cssClass ?? ""} ${c.isTextColumn ? "text" : "value"} ${scope.name}-${c.name}`);
									col.innerHTML = r[c.name] ?? "";
									row.append(col);
								})
							}

							rowContainer!.append(row);
						});

						if (hasResponsiveTable) {
							const container = document.createElement("div");
							container.classList.add("table-responsive");
							container.append(table);
							ctx.el.append(container);
						}
						else {
							ctx.el.append(table);
						}
					}
				}
			});
		};
	}
}