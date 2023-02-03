sap.ui.define(
	[
		"sap/ui/test/OpaBuilder",
		"sap/ui/test/Opa5",
		"sap/ui/core/util/ShortcutHelper",
		"sap/fe/test/Utils",
		"sap/fe/test/builder/FEBuilder",
		"sap/fe/test/builder/FieldBuilder",
		"sap/fe/test/builder/TableBuilder",
		"sap/fe/test/api/TableAssertions",
		"sap/fe/test/api/TableActions",
		"sap/fe/test/builder/FilterBarBuilder",
		"sap/fe/test/api/FilterBarAssertions",
		"sap/fe/test/api/FilterBarActions",
		"sap/base/util/deepEqual",
		"sap/ushell/resources"
	],
	function(
		OpaBuilder,
		Opa5,
		ShortcutHelper,
		Utils,
		FEBuilder,
		FieldBuilder,
		TableBuilder,
		TableAssertions,
		TableActions,
		FilterBarBuilder,
		FilterBarAssertions,
		FilterBarActions,
		deepEqual,
		resources
	) {
		"use strict";

		function _getTableSettingsColumnBuilder(sFieldName, vGroupName) {
			return OpaBuilder.Matchers.aggregationMatcher("cells", function(oControl) {
				var bControlFound = false;
				if (oControl.getItems) {
					var items = oControl.getItems();
					if (items && items.length === 2) {
						bControlFound = items[0].getProperty("text") === sFieldName;
						if (vGroupName !== undefined) {
							if (!Array.isArray(vGroupName)) {
								vGroupName = [vGroupName];
							}
							vGroupName = vGroupName.join(" > ");
							bControlFound = bControlFound && items[1].getProperty("text") === vGroupName;
						}
					}
				}
				return bControlFound;
			});
		}

		function _getTableBuilder(vOpaInstance, vTableIdentifier) {
			var oTableBuilder = TableBuilder.create(vOpaInstance);
			if (Utils.isOfType(vTableIdentifier, String)) {
				oTableBuilder.hasProperties({ header: vTableIdentifier });
			} else {
				oTableBuilder.hasId(vTableIdentifier.id);
			}
			return oTableBuilder;
		}

		function _getFilterBarBuilder(vOpaInstance, vFilterBarIdentifier) {
			return FilterBarBuilder.create(vOpaInstance).hasId(vFilterBarIdentifier.id);
		}

		return {
			create: function(sViewId, sEntityPath) {
				var oResourceBundleTemplates = sap.ui.getCore().getLibraryResourceBundle("sap.fe.templates"),
					oResourceBundleCore = sap.ui.getCore().getLibraryResourceBundle("sap.fe.core");

				return {
					viewId: sViewId,
					actions: {
						_onTable: function(vTableIdentifier) {
							return new TableActions(_getTableBuilder(this, vTableIdentifier), vTableIdentifier);
						},
						_onFilterBar: function(vFilterBarIdentifier) {
							return new FilterBarActions(_getFilterBarBuilder(this, vFilterBarIdentifier), vFilterBarIdentifier);
						},
						iCloseMessageErrorDialog: function() {
							return OpaBuilder.create(this)
								.isDialogElement()
								.hasType("sap.m.Bar")
								.hasAggregation("contentMiddle", OpaBuilder.Matchers.properties({ text: "Error" })) // TODO THIS MUST BE A LOCALIZED TEXT!!!!
								.do(
									OpaBuilder.create(this)
										.isDialogElement()
										.hasType("sap.m.Dialog")
										.doOnAggregation(
											"beginButton",
											OpaBuilder.Matchers.resourceBundle("text", "sap.fe.core", "SAPFE_CLOSE"),
											OpaBuilder.Actions.press()
										)
								)
								.description("Closing message error dialog")
								.execute();
						},
						iOpenVHOnActionDialog: function(sFieldName) {
							var sFieldId = "APD_::" + sFieldName + "-inner-vhi";
							return OpaBuilder.create(this)
								.hasId(sFieldId)
								.isDialogElement()
								.doPress()
								.description("Opening value help for '" + sFieldName + "'")
								.execute();
						},
						_iPressKeyboardShortcut: function(sId, sShortcut, mProperties, sType) {
							return OpaBuilder.create(this)
								.hasId(sId)
								.hasProperties(mProperties ? mProperties : {})
								.hasType(sType)
								.do(function(oElement) {
									var oNormalizedShorcut = ShortcutHelper.parseShortcut(sShortcut);
									oNormalizedShorcut.type = "keydown";
									oElement.$().trigger(oNormalizedShorcut);
								})
								.description("Execute keyboard shortcut " + sShortcut)
								.execute();
						},
						iCancelActionDialog: function() {
							return OpaBuilder.create(this)
								.hasType("sap.m.Button")
								.isDialogElement()
								.hasProperties({ text: oResourceBundleCore.getText("SAPFE_ACTION_PARAMETER_DIALOG_CANCEL") })
								.doPress()
								.description("Cancelling Action dialog")
								.execute();
						},
						iConfirmCustomAction: function(sText) {
							return OpaBuilder.create(this)
								.hasType("sap.m.Button")
								.hasProperties({ text: sText })
								.doPress()
								.description("Custom Action in Table ToolBar")
								.execute();
						},
						iConfirmDialog: function() {
							return OpaBuilder.create(this)
								.hasType("sap.m.Button")
								.isDialogElement()
								.hasProperties({ text: oResourceBundleCore.getText("SAPFE_OK") })
								.doPress()
								.description("Confirming Action dialog via Ok button")
								.execute();
						},
						iConfirmDelete: function() {
							return OpaBuilder.create(this)
								.hasType("sap.m.Button")
								.isDialogElement()
								.hasProperties({ text: oResourceBundleTemplates.getText("OBJECT_PAGE_DELETE") })
								.doPress()
								.description("Delete dialog confirmed")
								.execute();
						},
						iConfirmActionVHDialog: function(sServiceName, sActionName, sFieldName) {
							return OpaBuilder.create(this)
								.hasId(sServiceName + "." + sActionName + "::" + sFieldName + "-ok")
								.isDialogElement()
								.doPress()
								.description("Confirming value help dialog for action " + sActionName)
								.execute();
						},
						iCancelActionVHDialog: function(sServiceName, sActionName, sFieldName) {
							return OpaBuilder.create(this)
								.hasId(sServiceName + "." + sActionName + "::" + sFieldName + "-cancel")
								.isDialogElement()
								.doPress()
								.description("Cancelling value help dialog for action " + sActionName)
								.execute();
						},
						iCollapseExpandPageHeader: function(bCollapse) {
							var oExpandedButtonMatcher = OpaBuilder.Matchers.resourceBundle(
									"tooltip",
									"sap.f",
									"COLLAPSE_HEADER_BUTTON_TOOLTIP"
								),
								oCollapsedButtonMatcher = OpaBuilder.Matchers.resourceBundle(
									"tooltip",
									"sap.f",
									"EXPAND_HEADER_BUTTON_TOOLTIP"
								);
							return OpaBuilder.create(this)
								.hasType("sap.m.Button")
								.has(OpaBuilder.Matchers.some(oExpandedButtonMatcher, oCollapsedButtonMatcher))
								.doConditional(bCollapse ? oExpandedButtonMatcher : oCollapsedButtonMatcher, OpaBuilder.Actions.press())
								.description("Resizing of the Page Header")
								.execute();
						},
						_iOpenTableSortSettings: function(sTableId) {
							return TableBuilder.create(this)
								.hasId(sTableId)
								.doPress("sort")
								.description("Opening sort settings for table " + sTableId)
								.execute();
						},
						_iAddColumnInTableSettings: function(sFieldName, vGroupName) {
							return this._iModifyFilterInTableSettings(sFieldName, vGroupName, false, "Adding column");
						},
						_iSortTableByColumn: function(sTableId, sColumn) {
							return this._iOpenTableSortSettings(sTableId).and._iAddColumnInTableSettings(sColumn);
						},
						_iModifyFilterInTableSettings: function(sFieldName, vGroupName, bIsSelected, sDescription) {
							return OpaBuilder.create(this)
								.hasType("sap.m.ColumnListItem")
								.isDialogElement()
								.hasProperties({ selected: bIsSelected })
								.has(_getTableSettingsColumnBuilder(sFieldName, vGroupName))
								.doOnChildren(
									OpaBuilder.create(this)
										.hasType("sap.m.CheckBox")
										.doPress()
								)
								.description(sDescription + " '" + sFieldName + "'")
								.execute();
						}
					},
					assertions: {
						_onTable: function(vTableIdentifier) {
							return new TableAssertions(_getTableBuilder(this, vTableIdentifier), vTableIdentifier);
						},
						_onFilterBar: function(vFilterBarIdentifier) {
							return new FilterBarAssertions(_getFilterBarBuilder(this, vFilterBarIdentifier), vFilterBarIdentifier);
						},
						iSeeThisPage: function() {
							return OpaBuilder.create(this)
								.hasId(sViewId)
								.viewId(null)
								.viewName(null)
								.description(Utils.formatMessage("Seeing the page '{0}'", sViewId))
								.execute();
						},
						iSeeFilterDefinedOnActionDialogValueHelp: function(sAction, sVHParameter, sFieldName, sValue) {
							return OpaBuilder.create(this)
								.hasId(sAction + "::" + sVHParameter + "::FilterBar::FilterField::" + sFieldName + "-inner")
								.isDialogElement()
								.hasAggregationProperties("tokens", { text: sValue })
								.description("Seeing filter for '" + sFieldName + "' set to '" + sValue + "'")
								.execute();
						},
						_iSeeTheMessageToast: function(sText) {
							return FEBuilder.createMessageToastBuilder(sText).execute(this);
						},
						iSeeMessageErrorDialog: function() {
							return OpaBuilder.create(this)
								.isDialogElement()
								.hasType("sap.m.Bar")
								.hasAggregation("contentMiddle", OpaBuilder.Matchers.properties({ "text": "Error" })) // TODO THIS MUST BE A LOCALIZED TEXT!!!!
								.description("Seeing message error dialog")
								.execute();
						},
						_iSeeButtonWithText: function(sText, oButtonState) {
							return FEBuilder.create(this)
								.hasType("sap.m.Button")
								.hasProperties({ text: sText })
								.hasState(oButtonState)
								.checkNumberOfMatches(1)
								.description(
									Utils.formatMessage(
										"Seeing Button with text '{0}'" + (oButtonState ? " with state: '{1}'" : ""),
										sText,
										oButtonState
									)
								)
								.execute();
						},
						_iSeeElement: function(sId, oElementState) {
							return FEBuilder.create(this)
								.hasId(sId)
								.hasState(oElementState)
								.description(
									Utils.formatMessage(
										"Seeing Element '{0}'" + (oElementState ? " with state: '{1}'" : ""),
										sId,
										oElementState
									)
								)
								.execute();
						},
						iSeeActionParameterDialog: function(sDialogTitle) {
							return OpaBuilder.create(this)
								.hasType("sap.m.Dialog")
								.hasProperties({ title: sDialogTitle })
								.isDialogElement()
								.description("Seeing Action Parameter Dialog with title '" + sDialogTitle + "'")
								.execute();
						},
						iSeeActionCustomDialog: function(sDialogText) {
							return OpaBuilder.create(this)
								.hasType("sap.m.Text")
								.hasProperties({ text: sDialogText })
								.isDialogElement()
								.description("Seeing Action Custom Dialog '" + sDialogText + "'")
								.execute();
						},
						iSeeActionDefaultDialog: function() {
							return (
								OpaBuilder.create(this)
									.hasType("sap.m.Text")
									.has(OpaBuilder.Matchers.resourceBundle("text", "sap.fe.core", "SAPFE_ACTION_CONFIRM"))
									//.hasProperties({ text: sDialogText })
									.isDialogElement()
									.description("Seeing Action Default Dialog ")
									.execute()
							);
						},
						iSeeActionParameterContent: function(sFieldName, sContent) {
							var sFieldId = "APD_::" + sFieldName + "-inner";
							return OpaBuilder.create(this)
								.hasId(sFieldId)
								.isDialogElement()
								.hasProperties({ value: sContent })
								.description("Seeing Action parameter '" + sFieldName + "' with content '" + sContent + "'")
								.execute();
						},
						iSeeActionVHDialog: function(sServiceName, sActionName, sFieldName) {
							return OpaBuilder.create(this)
								.hasId(sServiceName + "." + sActionName + "::" + sFieldName + "-dialog")
								.isDialogElement()
								.description("Seeing Action Value Help dialog for field " + sFieldName)
								.execute();
						},
						iSeeActionVHDialogFilterBar: function(sServiceName, sActionName, sFieldName) {
							return OpaBuilder.create(this)
								.hasId(sServiceName + "." + sActionName + "::" + sFieldName + "::FilterBar")
								.isDialogElement()
								.description("Seeing Action Value Help FilterBar for field " + sFieldName)
								.execute();
						},
						iSeeActionVHDialogTable: function(sServiceName, sActionName, sFieldName) {
							return OpaBuilder.create(this)
								.hasId(sServiceName + "." + sActionName + "::" + sFieldName + "::Table")
								.isDialogElement()
								.description("Seeing Action Value Help Table for field " + sFieldName)
								.execute();
						},
						iSeePageHeaderButton: function(bCollapse) {
							return OpaBuilder.create(this)
								.hasType("sap.m.Button")
								.has(
									OpaBuilder.Matchers.resourceBundle(
										"tooltip",
										"sap.f",
										bCollapse ? "COLLAPSE_HEADER_BUTTON_TOOLTIP" : "EXPAND_HEADER_BUTTON_TOOLTIP"
									)
								)
								.description("Seeing the " + (bCollapse ? "Collapse" : "Expand") + " Page Header Button")
								.execute();
						},
						iSeeTileCreationMessage: function() {
							return this._iSeeTheMessageToast(resources.i18n.getText("tile_created_msg"));
						},
						_iSeeSortedColumn: function(sTableId, sColumnName, sPropertyName, bDescending) {
							var properties = {};
							properties[sPropertyName] = bDescending ? "Descending" : "Ascending";
							return OpaBuilder.create(this)
								.hasId(sTableId + "::C::" + sColumnName + "-innerColumn")
								.hasProperties(properties)
								.description(
									Utils.formatMessage(
										"Seeing column '{0}' sorted by '{1}' {2}",
										sColumnName,
										sPropertyName,
										properties[sPropertyName]
									)
								)
								.execute();
						}
					}
				};
			}
		};
	}
);
