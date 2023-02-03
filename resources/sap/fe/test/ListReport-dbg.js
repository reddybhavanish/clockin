sap.ui.define(
	["sap/fe/test/Utils", "./TemplatePage", "sap/ui/test/Opa5", "sap/ui/test/OpaBuilder", "sap/fe/test/builder/VMBuilder"],
	function(Utils, TemplatePage, Opa5, OpaBuilder, VMBuilder) {
		"use strict";

		return {
			create: function(sAppId, sComponentId, sEntityPath) {
				var ViewId = sAppId + "::" + sComponentId,
					TableId = "fe::table::" + sEntityPath + "::LineItem",
					FilterBarId = "fe::FilterBar::" + sEntityPath,
					FilterBarVHDId = FilterBarId + "::FilterFieldValueHelp::",
					oResourceBundleCore = sap.ui.getCore().getLibraryResourceBundle("sap.fe.core");

				return Utils.mergeObjects(TemplatePage.create(ViewId, sEntityPath), {
					actions: {
						onTable: function(vTableIdentifier) {
							if (!Utils.isOfType(vTableIdentifier, String)) {
								if (!vTableIdentifier) {
									vTableIdentifier = { id: TableId };
								} else {
									throw new Error("not supported table identifier");
								}
							}
							return this._onTable(vTableIdentifier);
						},
						onFilterBar: function() {
							return this._onFilterBar({ id: FilterBarId });
						},
						iExecuteActionOnDialog: function(sText) {
							return OpaBuilder.create(this)
								.hasType("sap.m.Button")
								.hasProperties({ text: sText })
								.isDialogElement()
								.doPress()
								.description("Pressing dialog button '" + sText + "'")
								.execute();
						},
						iOpenVHDialog: function(sFieldName) {
							return OpaBuilder.create(this)
								.hasId(FilterBarId + "::FilterField::" + sFieldName + "-inner-vhi")
								.doPress()
								.description("Opening value help for dialog'" + sFieldName + "'")
								.execute();
						},
						iSelectFromVHDTable: function(sValue) {
							return OpaBuilder.create(this)
								.hasType("sap.m.ColumnListItem")
								.hasAggregationProperties("cells", { value: sValue })
								.checkNumberOfMatches(1)
								.isDialogElement()
								.doPress()
								.description("Selecting row from dialog with value '" + sValue + "'")
								.execute();
						},
						iConfirmVHDSelection: function(sFieldName, bSuppressApplyFiltersToList) {
							var oResult = OpaBuilder.create(this)
								.hasId(FilterBarVHDId + sFieldName + "-ok")
								.doPress()
								.description("Confirming value help selection for '" + sFieldName + "'")
								.execute();
							if (!bSuppressApplyFiltersToList) {
								oResult = this.onFilterBar().iExecuteSearch();
							}
							return oResult;
						},
						iFilterWithVHDialog: function(sFieldName, vValue) {
							var oResult = this.iOpenVHDialog(sFieldName)
								.and.iSelectFromVHDTable(vValue)
								.and.iConfirmVHDSelection(sFieldName);
							return oResult;
						},
						iSortTableByColumn: function(sColumn) {
							return this._iSortTableByColumn(TableId, sColumn);
						},
						iSelectDefineConditionPanel: function(sFieldName) {
							var oResult = OpaBuilder.create(this)
								.hasId(FilterBarVHDId + sFieldName + "-VHP--defineCondition")
								.doPress()
								.description("Pressing Define Condition Icon Tab Strip for'" + sFieldName + "'")
								.execute();
							return oResult;
						},
						iSelectOperators: function() {
							var oResult = OpaBuilder.create(this)
								.hasType("sap.ui.core.Icon")
								.hasProperties({ src: "sap-icon://slim-arrow-down" })
								.doPress()
								.description("Select list of operators")
								.execute();
							return oResult;
						},
						iSaveVariant: function(sVariantName) {
							return VMBuilder.create(this)
								.hasId("fe::PageVariantManagement")
								.doSaveAs(sVariantName)
								.description(Utils.formatMessage("Saving variant for '{0}' as '{1}'", "Page Variant", sVariantName))
								.execute();
						}
					},
					assertions: {
						onTable: function(vTableIdentifier) {
							if (!Utils.isOfType(vTableIdentifier, String)) {
								if (!vTableIdentifier) {
									vTableIdentifier = { id: TableId };
								} else {
									throw new Error("not supported table identifier");
								}
							}
							return this._onTable(vTableIdentifier);
						},
						onFilterBar: function() {
							return this._onFilterBar({ id: FilterBarId });
						},
						iSeeTheMessageToast: function(sText) {
							return this._iSeeTheMessageToast(sText);
						},
						iSeeFilterFieldsInFilterBar: function(iNumberOfFilterFields) {
							return OpaBuilder.create(this)
								.hasId(FilterBarId)
								.hasAggregationLength("filterItems", iNumberOfFilterFields)
								.description("Seeing Filter bar with " + iNumberOfFilterFields + " filter fields")
								.execute();
						},
						iSeeTableCellWithActions: function(sPath, nCellPos, sButtonText) {
							return OpaBuilder.create(this)
								.hasType("sap.m.ColumnListItem")
								.has(OpaBuilder.Matchers.bindingPath(sPath))
								.has(function(row) {
									var cell = row.getCells()[nCellPos];
									return cell.getMetadata().getElementName() === "sap.m.Button" && cell.getText() === sButtonText;
								})
								.description("Inline Action is present in the table cell with the Text " + sButtonText)
								.execute();
						},
						iSeeLinkWithText: function(sText) {
							return OpaBuilder.create(this)
								.hasType("sap.m.Link")
								.hasProperties({ text: sText })
								.description("Seeing link with text '" + sText + "'")
								.execute();
						},
						iSeeSummaryOfAppliedFilters: function() {
							var sAppliedFilters;
							OpaBuilder.create(this)
								.hasId(FilterBarId)
								.mustBeVisible(false)
								.do(function(oFilterbar) {
									sAppliedFilters = oFilterbar.getAssignedFiltersText();
								})
								.execute();
							return OpaBuilder.create(this)
								.hasType("sap.f.DynamicPageTitle")
								.has(function(oDynamicPageTitle) {
									return oDynamicPageTitle.getSnappedContent()[0].getText() === sAppliedFilters;
								})
								.description("The correct text on the collapsed filterbar is displayed")
								.execute();
						},
						iSeeVHDialog: function(sFieldName) {
							return OpaBuilder.create(this)
								.hasId(FilterBarVHDId + sFieldName + "-dialog")
								.description("Seeing value help dialog for field '" + sFieldName + "'")
								.execute();
						},
						iSeeVHDTable: function(sFieldName) {
							return OpaBuilder.create(this)
								.hasId(FilterBarVHDId + sFieldName + "::Table")
								.has(function(oTable) {
									return oTable.getItems().length !== 0;
								})
								.description("Seeing table of value help dialog for field '" + sFieldName + "'")
								.execute();
						},
						iSeeFieldInVHDFilterBar: function(sFieldName, sFilterBarField, oExpectedState) {
							return OpaBuilder.create(this)
								.hasId(FilterBarVHDId + sFieldName + "::FilterBar::FilterField::" + sFilterBarField)
								.hasProperties(oExpectedState)
								.description("Seeing field " + sFieldName + " in filterbar of valuehelpdialog")
								.execute();
						},
						_checkVHDSearchFieldIsVisible: function(sFieldName, bVisible) {
							var sSearchFieldId = ViewId + "--" + FilterBarVHDId + sFieldName + "-VHP--SearchField";
							return OpaBuilder.create(this)
								.hasId(sSearchFieldId)
								.hasProperties({ visible: bVisible })
								.mustBeVisible(false)
								.description(
									"Search field of value help dialog for field '" +
										sFieldName +
										"' is " +
										(bVisible ? "visible" : "invisible")
								)
								.execute();
						},
						iCheckVHDSearchFieldIsVisible: function(sFieldName, bVisible) {
							return this._checkVHDSearchFieldIsVisible(sFieldName, bVisible === undefined ? true : bVisible);
						},
						iSeeVHDFilterBar: function(sFieldName) {
							return OpaBuilder.create(this)
								.hasId(FilterBarVHDId + sFieldName + "::FilterBar")
								.description("Seeing value help filterbar for field '" + sFieldName + "'")
								.execute();
						},
						iSeeFieldOfDCPOnVHDialog: function(sFieldName) {
							return OpaBuilder.create(this)
								.hasId(FilterBarVHDId + sFieldName + "-DCP")
								.description("Definition Condition Panel is available in Value Help of field '" + sFieldName + "'")
								.execute();
						},
						iSeeDeleteConfirmation: function() {
							return this._iSeeTheMessageToast(oResourceBundleCore.getText("OBJECT_PAGE_DELETE_TOAST_SINGULAR"));
						},
						iSeePageTitle: function(sTitle) {
							return OpaBuilder.create(this)
								.hasType("sap.f.DynamicPageTitle")
								.hasAggregationProperties("heading", { text: sTitle })
								.description("Seeing title '" + sTitle + "'")
								.execute();
						},
						iSeeVariantTitle: function(sTitle) {
							return OpaBuilder.create(this)
								.hasType("sap.m.Title")
								.hasId("fe::PageVariantManagement-text")
								.hasProperties({ text: sTitle })
								.description("Seeing variant title '" + sTitle + "'")
								.execute();
						},
						iSeeControlVMFilterBarTitle: function(sTitle) {
							return OpaBuilder.create(this)
								.hasType("sap.m.Title")
								.hasId(FilterBarId + "::VariantManagement-text")
								.hasProperties({ text: sTitle })
								.description("Seeing variant title '" + sTitle + "'")
								.execute();
						},
						iSeeControlVMTableTitle: function(sTitle) {
							return OpaBuilder.create(this)
								.hasType("sap.m.Title")
								.hasId(TableId + "::VM-text")
								.hasProperties({ text: sTitle })
								.description("Seeing variant title '" + sTitle + "'")
								.execute();
						},
						iSeeVariantModified: function(bIsModified, bControl) {
							var sLabelId;
							if (bControl) {
								sLabelId = FilterBarId + "::VariantManagement-modified";
							} else {
								sLabelId = "fe::PageVariantManagement-modified";
							}

							bIsModified = bIsModified === undefined ? true : bIsModified;
							if (bIsModified) {
								return OpaBuilder.create(this)
									.hasType("sap.m.Label")
									.hasId(sLabelId)
									.hasProperties({ text: "*" })
									.description("Seeing variant state as 'modified'")
									.execute();
							} else {
								return OpaBuilder.create(this)
									.hasType("sap.m.Label")
									.check(function(oLabels) {
										return !oLabels.some(function(oLabel) {
											return oLabel.getId() === sLabelId;
										});
									}, true)
									.description("Seeing variant state as 'not modified'")
									.execute();
							}
						},
						iSeePageVM: function() {
							return OpaBuilder.create(this)
								.hasId("fe::PageVariantManagement")
								.description("Seeing page VM")
								.execute();
						},
						iSeeControlVMFilterBar: function() {
							return OpaBuilder.create(this)
								.hasId(FilterBarId + "::VariantManagement")
								.description("Seeing control VM - FilterBar")
								.execute();
						},
						iSeeDraftIndicator: function() {
							return OpaBuilder.create(this)
								.hasType("sap.m.Link")
								.hasProperties({ text: oResourceBundleCore.getText("DRAFTINFO_DRAFT_OBJECT") })
								.description("Draft indicator is visible")
								.execute();
						},
						iSeeSortedColumn: function(sColumnName, bDescending) {
							return this._iSeeSortedColumn(TableId, sColumnName, "sortIndicator", bDescending);
						},
						iSeeNumOfOperators: function(sFieldName, numItems) {
							return OpaBuilder.create(this)
								.hasId(FilterBarVHDId + sFieldName + "-DCP")
								.doOnChildren(OpaBuilder.create(this).hasAggregationLength("items", numItems))
								.description("Seeing Value List of Condition Operators with " + numItems + " item.")
								.execute();
						}
					}
				});
			}
		};
	}
);
