sap.ui.define(
	[
		"sap/ui/test/OpaBuilder",
		"./FEBuilder",
		"./FieldBuilder",
		"./OverflowToolbarBuilder",
		"sap/fe/test/Utils",
		"sap/ui/table/library",
		"sap/ui/test/matchers/Interactable"
	],
	function(OpaBuilder, FEBuilder, FieldBuilder, OverflowToolbarBuilder, Utils, GridTableLibrary, Interactable) {
		"use strict";

		var RowActionType = GridTableLibrary.RowActionType;

		function _isGridTable(oMdcTable) {
			return oMdcTable._oTable.getMetadata().getName() === "sap.ui.table.Table";
		}

		function _getRowAggregationName(oMdcTable) {
			return _isGridTable(oMdcTable) ? "rows" : "items";
		}

		function _getColumnIndex(vColumn, oMdcTable) {
			var iIndex = Number(vColumn);
			return Number.isNaN(iIndex)
				? oMdcTable.getColumns().findIndex(function(oColumn) {
						return oColumn.getHeader() === vColumn;
				  })
				: iIndex;
		}

		function _getCellIndex(vColumn, oRow) {
			var oMdcTable = oRow;
			do {
				oMdcTable = oMdcTable.getParent();
			} while (!oMdcTable.isA("sap.ui.mdc.Table"));
			return _getColumnIndex(vColumn, oMdcTable);
		}

		function _getCellIndexForInlineActions(vColumn, oRow) {
			if (Utils.isOfType(vColumn, String)) {
				return oRow.getCells().findIndex(function(element) {
					return element.getText && element.getText() === vColumn;
				});
			} else {
				return FEBuilder.Matchers.state("type", "sap.m.Button")(oRow.getCells()[vColumn]) ? vColumn : -1;
			}
		}

		function _getRowNavigationIconOnGridTable(oRow) {
			var oRowAction = oRow.getRowAction();
			return oRowAction.getItems().reduce(function(oIcon, oActionItem, iIndex) {
				if (!oIcon && oActionItem.getType() === RowActionType.Navigation) {
					oIcon = oRowAction.getAggregation("_icons")[iIndex];
				}
				return oIcon;
			}, null);
		}

		function _getRowMatcher(vRowMatcher) {
			var aRowMatcher = [new Interactable(), FEBuilder.Matchers.bound()];
			if (Utils.isOfType(vRowMatcher, Object)) {
				vRowMatcher = TableBuilder.Row.Matchers.cellValues(vRowMatcher);
			}
			if (vRowMatcher) {
				aRowMatcher = aRowMatcher.concat(vRowMatcher);
			}
			return aRowMatcher;
		}

		function _getCellFields(oCell) {
			return oCell.isA("sap.ui.mdc.Field")
				? [oCell]
				: OpaBuilder.Matchers.children(OpaBuilder.create().hasType("sap.ui.mdc.Field"))(oCell);
		}

		var TableBuilder = function() {
			return FEBuilder.apply(this, arguments).hasType("sap.ui.mdc.Table");
		};

		TableBuilder.create = function(oOpaInstance) {
			return new TableBuilder(oOpaInstance);
		};

		TableBuilder.prototype = Object.create(FEBuilder.prototype);
		TableBuilder.prototype.constructor = TableBuilder;

		TableBuilder.prototype.hasColumns = function(mColumnMap) {
			if (!mColumnMap || Object.keys(mColumnMap).length === 0) {
				return this;
			}
			return this.has(TableBuilder.Matchers.columnsMatcher(mColumnMap));
		};

		TableBuilder.prototype.hasRows = function(vRowMatcher, bReturnAggregationItems) {
			vRowMatcher = _getRowMatcher(vRowMatcher);

			return bReturnAggregationItems
				? this.has(TableBuilder.Matchers.rows(vRowMatcher))
				: this.has(TableBuilder.Matchers.rowsMatcher(vRowMatcher));
		};

		TableBuilder.prototype.doOnRows = function(vRowMatcher, vRowAction) {
			if (arguments.length === 1) {
				vRowAction = vRowMatcher;
				vRowMatcher = undefined;
			}
			if (!vRowAction) {
				return this;
			}
			return this.hasRows(vRowMatcher, true).do(OpaBuilder.Actions.executor(vRowAction));
		};

		TableBuilder.prototype.doClickOnCell = function(vRowMatcher, vColumn) {
			return this.doOnRows(vRowMatcher, TableBuilder.Row.Actions.onCell(vColumn, OpaBuilder.Actions.press()));
		};

		TableBuilder.prototype.doEditValues = function(vRowMatcher, mColumnValueMap) {
			if (arguments.length === 1) {
				mColumnValueMap = vRowMatcher;
				vRowMatcher = undefined;
			}
			return this.doOnRows(vRowMatcher, TableBuilder.Row.Actions.editCells(mColumnValueMap));
		};

		TableBuilder.prototype.doEditCreationRowValues = function(mColumnValueMap) {
			return this.has(OpaBuilder.Matchers.aggregation("creationRow")).do(TableBuilder.Row.Actions.editCells(mColumnValueMap));
		};

		TableBuilder.prototype.doSelect = function(vRowMatcher) {
			return this.doOnRows(vRowMatcher, function(oRow) {
				if (oRow.getMetadata().getName() === "sap.ui.table.Row") {
					var oTable = oRow.getParent(),
						oRowIndex = oTable.indexOfRow(oRow);
					return OpaBuilder.Actions.press("rowsel" + oRowIndex).executeOn(oTable);
				}
				return OpaBuilder.Actions.press().executeOn(oRow.getMultiSelectControl());
			});
		};

		TableBuilder.prototype.doNavigate = function(vRowMatcher) {
			return this.doOnRows(vRowMatcher, function(oRow) {
				if (oRow.getMetadata().getName() === "sap.ui.table.Row") {
					return OpaBuilder.Actions.press().executeOn(_getRowNavigationIconOnGridTable(oRow));
				}
				return OpaBuilder.Actions.press("imgNav").executeOn(oRow);
			});
		};

		TableBuilder.prototype.hasNumberOfRows = function(iNumberOfRows) {
			return this.has(function(oTable) {
				var oRowBinding = oTable.getRowBinding();
				return (
					(oRowBinding &&
						(iNumberOfRows === undefined ? oRowBinding.getLength() !== 0 : oRowBinding.getLength() === iNumberOfRows)) ||
					(!oRowBinding && iNumberOfRows === 0)
				);
			});
		};

		TableBuilder.prototype.hasQuickFilterItems = function(iNumberOfItems) {
			return this.has(function(oTable) {
				var oQuickFitler = oTable.getQuickFilter(),
					aItems = oQuickFitler.getItems();
				if (Utils.isOfType(aItems, Array)) {
					return aItems.length === iNumberOfItems;
				}
				return false;
			});
		};

		TableBuilder.prototype.doSelectQuickFilter = function(oItemMatcher) {
			return this.has(function(oTable) {
				return oTable.getQuickFilter();
			})
				.doConditional(FEBuilder.Matchers.state("type", "sap.m.Select"), OpaBuilder.Actions.press())
				.success(
					function(oQFControl) {
						return FEBuilder.create(this)

							.hasId([].concat(oQFControl)[0].getId())
							.doOnAggregation("items", oItemMatcher, OpaBuilder.Actions.press())
							.execute();
					}.bind(this)
				);
		};

		TableBuilder.prototype.doOpenOverflow = function() {
			return OverflowToolbarBuilder.openOverflow(this, "toolbar");
		};

		TableBuilder.prototype.doCloseOverflow = function() {
			return OverflowToolbarBuilder.closeOverflow(this, "toolbar");
		};

		TableBuilder.prototype.doExecuteAction = function(vActionMatcher) {
			var oSuccessBuilder = new TableBuilder(this._getOpaInstance(), this.build()).doOnAggregation(
				"actions",
				vActionMatcher,
				OpaBuilder.Actions.press()
			);
			return this.doOpenOverflow().success(oSuccessBuilder);
		};

		TableBuilder.prototype.doOpenColumnAdaptation = function() {
			return this.doOpenOverflow().success(function(oTable) {
				return OpaBuilder.create()
					.hasType("sap.m.Button")
					.hasId(/-settings$/)
					.has(OpaBuilder.Matchers.ancestor(oTable))
					.doPress()
					.execute();
			});
		};

		TableBuilder.prototype.doExecuteInlineAction = function(vRowMatcher, vColumn) {
			return this.doOnRows(vRowMatcher, TableBuilder.Row.Actions.pressInlineAction(vColumn));
		};

		TableBuilder.Cell = {
			Matchers: {
				state: function(sName, vValue) {
					switch (sName) {
						case "editor":
						case "editors":
							return function(oCell) {
								var aFields = _getCellFields(oCell),
									fnFieldStateMatcher = FieldBuilder.Matchers.states(vValue);
								return aFields.some(fnFieldStateMatcher);
							};
						default:
							return FEBuilder.Matchers.state(sName, vValue);
					}
				},
				states: function(mStateMap) {
					if (!Utils.isOfType(mStateMap, Object)) {
						return OpaBuilder.Matchers.TRUE;
					}
					return FEBuilder.Matchers.match(
						Object.keys(mStateMap).map(function(sProperty) {
							return TableBuilder.Cell.Matchers.state(sProperty, mStateMap[sProperty]);
						})
					);
				}
			}
		};

		TableBuilder.Column = {
			Matchers: {
				state: function(sName, vValue) {
					switch (sName) {
						case "template":
						case "creationTemplate":
							return function(oColumn) {
								return FieldBuilder.Matchers.states(vValue)(oColumn.getAggregation(sName));
							};
						default:
							return FEBuilder.Matchers.state(sName, vValue);
					}
				},
				states: function(mStateMap) {
					if (!Utils.isOfType(mStateMap, Object)) {
						return OpaBuilder.Matchers.TRUE;
					}
					return FEBuilder.Matchers.match(
						Object.keys(mStateMap).map(function(sProperty) {
							return TableBuilder.Column.Matchers.state(sProperty, mStateMap[sProperty]);
						})
					);
				}
			}
		};

		TableBuilder.Row = {
			Matchers: {
				cell: function(vColumn) {
					return function(oRow) {
						var iColumn = _getCellIndex(vColumn, oRow);
						return oRow.getCells()[iColumn];
					};
				},
				cellFields: function(vColumn) {
					return function(oRow) {
						return _getCellFields(TableBuilder.Row.Matchers.cell(vColumn)(oRow));
					};
				},
				cellValue: function(vColumn, vExpectedValue) {
					return function(oRow) {
						var aFields = TableBuilder.Row.Matchers.cellFields(vColumn)(oRow),
							fnFieldValueMatcher = FieldBuilder.Matchers.value(vExpectedValue);
						return aFields.some(fnFieldValueMatcher);
					};
				},
				cellValues: function(mColumnValueMap) {
					if (!mColumnValueMap) {
						return OpaBuilder.Matchers.TRUE;
					}
					return FEBuilder.Matchers.match(
						Object.keys(mColumnValueMap).map(function(sColumnName) {
							return TableBuilder.Row.Matchers.cellValue(sColumnName, mColumnValueMap[sColumnName]);
						})
					);
				},
				cellProperty: function(vColumn, oExpectedState) {
					return function(oRow) {
						var oCell = TableBuilder.Row.Matchers.cell(vColumn)(oRow);
						return TableBuilder.Cell.Matchers.states(oExpectedState)(oCell);
					};
				},
				cellProperties: function(mCellStateMap) {
					if (!mCellStateMap) {
						return OpaBuilder.Matchers.TRUE;
					}
					return FEBuilder.Matchers.match(
						Object.keys(mCellStateMap).map(function(sColumnName) {
							return TableBuilder.Row.Matchers.cellProperty(sColumnName, mCellStateMap[sColumnName]);
						})
					);
				},
				selected: function(bSelected) {
					return function(oRow) {
						var oTable = oRow.getParent(),
							oMdcTable = oTable.getParent(),
							bIsGridTable = _isGridTable(oMdcTable),
							bRowIsSelected = bIsGridTable
								? oTable.getSelectedIndices.includes(oTable.indexOfRow(oRow))
								: oRow.getSelected();

						return bSelected ? bRowIsSelected : !bRowIsSelected;
					};
				},
				focused: function() {
					return function(oRow) {
						var aElementsToCheck = [oRow];
						if (oRow.getMetadata().getName() === "sap.ui.table.Row") {
							aElementsToCheck.push(_getRowNavigationIconOnGridTable(oRow));
						}
						return aElementsToCheck.some(OpaBuilder.Matchers.focused(true));
					};
				},
				states: function(mStateMap) {
					if (!Utils.isOfType(mStateMap, Object)) {
						return OpaBuilder.Matchers.TRUE;
					}
					return FEBuilder.Matchers.match(
						Object.keys(mStateMap).map(function(sProperty) {
							switch (sProperty) {
								case "selected":
									return TableBuilder.Row.Matchers.selected(mStateMap.selected);
								case "focus":
									return TableBuilder.Row.Matchers.focused();
								default:
									return FEBuilder.Matchers.state(sProperty, mStateMap[sProperty]);
							}
						})
					);
				}
			},
			Actions: {
				onCell: function(vColumn, vCellAction) {
					return function(oRow) {
						var iColumn = _getCellIndex(vColumn, oRow),
							oCellControl;
						if (oRow.isA("sap.ui.mdc.table.CreationRow")) {
							oCellControl = oRow._oInnerCreationRow.getCells()[iColumn];
						} else {
							oCellControl = oRow.getCells()[iColumn];
						}
						if (vCellAction.executeOn) {
							vCellAction.executeOn(oCellControl);
						} else {
							vCellAction(oCellControl);
						}
					};
				},
				editCell: function(vColumn, vValue) {
					return TableBuilder.Row.Actions.onCell(vColumn, OpaBuilder.Actions.enterText(vValue, true));
				},
				editCells: function(mColumnValueMap) {
					return Object.keys(mColumnValueMap).map(function(sColumnName) {
						return TableBuilder.Row.Actions.editCell(sColumnName, mColumnValueMap[sColumnName]);
					});
				},
				onCellInlineAction: function(vColumn, vCellAction) {
					return function(oRow) {
						var iColumn = _getCellIndexForInlineActions(vColumn, oRow),
							oCellControl;

						oCellControl = oRow.getCells()[iColumn];
						if (vCellAction.executeOn) {
							vCellAction.executeOn(oCellControl);
						} else {
							vCellAction(oCellControl);
						}
					};
				},
				pressInlineAction: function(vColumn) {
					return TableBuilder.Row.Actions.onCellInlineAction(vColumn, OpaBuilder.Actions.press());
				}
			}
		};

		TableBuilder.Matchers = {
			isGridTable: function() {
				return _isGridTable;
			},
			rows: function(vRowMatcher) {
				return function(oMdcTable) {
					return OpaBuilder.Matchers.aggregation(_getRowAggregationName(oMdcTable), vRowMatcher)(oMdcTable._oTable);
				};
			},
			rowsMatcher: function(vRowMatcher) {
				var fnMatchRows = TableBuilder.Matchers.rows(vRowMatcher);
				return function(oMdcTable) {
					return fnMatchRows(oMdcTable).length > 0;
				};
			},
			columns: function(mColumnsStatesMaps) {
				return function(oMdcTable) {
					var aColumnIndices = Object.keys(mColumnsStatesMaps).map(function(vColumn) {
							return {
								index: _getColumnIndex(vColumn, oMdcTable),
								states: mColumnsStatesMaps[vColumn]
							};
						}),
						aColumns = Utils.getAggregation(oMdcTable, "columns");
					return aColumnIndices.reduce(function(aResult, mColumnIndex) {
						var oColumn = aColumns[mColumnIndex.index];
						if (
							oColumn &&
							(!mColumnIndex.states ||
								FEBuilder.Matchers.match(TableBuilder.Column.Matchers.states(mColumnIndex.states))(oColumn))
						) {
							aResult.push(oColumn);
						}
						return aResult;
					}, []);
				};
			},
			columnsMatcher: function(mColumnMatchers) {
				var fnMatchColumns = TableBuilder.Matchers.columns(mColumnMatchers);
				return function(oMdcTable) {
					return fnMatchColumns(oMdcTable).length === Object.keys(mColumnMatchers).length;
				};
			}
		};

		TableBuilder.Actions = {};

		return TableBuilder;
	}
);
