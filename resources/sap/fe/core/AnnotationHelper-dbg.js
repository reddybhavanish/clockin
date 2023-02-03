/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2020 SAP SE. All rights reserved
    
 */

sap.ui.define(
	["sap/base/Log", "sap/ui/model/odata/v4/AnnotationHelper", "sap/fe/core/CommonUtils", "sap/ui/mdc/library"],
	function(Log, ODataModelAnnotationHelper, CommonUtils, mdcLibrary) {
		"use strict";

		var FilterBarP13nMode = mdcLibrary.FilterBarP13nMode;

		var AnnotationHelper = {
			/* this helper can be activated to debug template processing
			 debug: function (oContext) {
			 //debugger;
			 },
			 */

			getQuickFilterText: function(iContext, sAnnotationPath, sEntityName) {
				var oQuickFilter = iContext.getModel(1).getObject(sEntityName + "/@" + sAnnotationPath);
				return oQuickFilter.Text;
			},

			getFilterBarP13nMode: function(oViewData) {
				var aPersonalization = [],
					vPersonalization = oViewData.variantManagement && oViewData.variantManagement !== "None";

				if (
					oViewData.controlConfiguration &&
					oViewData.controlConfiguration["@com.sap.vocabularies.UI.v1.SelectionFields"] &&
					oViewData.controlConfiguration["@com.sap.vocabularies.UI.v1.SelectionFields"].filterBarSettings &&
					oViewData.controlConfiguration["@com.sap.vocabularies.UI.v1.SelectionFields"].filterBarSettings.personalization !==
						undefined
				) {
					vPersonalization =
						oViewData.controlConfiguration["@com.sap.vocabularies.UI.v1.SelectionFields"].filterBarSettings.personalization;
				}

				if (typeof vPersonalization === "object") {
					if (vPersonalization.item) {
						aPersonalization.push(FilterBarP13nMode.Item);
					}
					if (vPersonalization.value) {
						aPersonalization.push(FilterBarP13nMode.Value);
					}
				} else {
					aPersonalization = vPersonalization ? [FilterBarP13nMode.Item, FilterBarP13nMode.Value] : [];
				}

				return aPersonalization.length > 0 ? aPersonalization.join(",") : undefined;
			},

			getSelectionMode: function(oViewData, sAnnotationPath, bInEditModeOnly, bDeletable, oVisualization) {
				// {= CORE.checkForActions(${visualizationPath>}) ? 'Multi' : !(${targetCollection>@Org.OData.Capabilities.V1.DeleteRestrictions/Deletable} === false) ? (${collection>$kind} === 'EntitySet' ? 'Multi' : '{= ${ui>/editMode} === \'Editable\' ? \'Multi\' : \'None\'}') : 'None'}
				var sSelectionMode =
					(oViewData.controlConfiguration &&
						oViewData.controlConfiguration[sAnnotationPath] &&
						oViewData.controlConfiguration[sAnnotationPath]["tableSettings"] &&
						oViewData.controlConfiguration[sAnnotationPath]["tableSettings"]["selectionMode"]) ||
					"Multi"; // default is Multi

				if (this.checkForActions(oVisualization)) {
					return sSelectionMode;
				} else if (bDeletable) {
					if (bInEditModeOnly) {
						return "{= ${ui>/editMode} === 'Editable' ? '" + sSelectionMode + "' : 'None'}";
					} else {
						return sSelectionMode;
					}
				}

				return "None";
			},

			getTargetContext: function(oTarget) {
				var sTarget = oTarget.getObject(oTarget.getPath()),
					sNavigationPath = ODataModelAnnotationHelper.getNavigationPath(oTarget.getPath());
				return sNavigationPath + "/" + sTarget;
			},

			getFormContext: function(oTarget) {
				var sAnnotationPath = oTarget.getObject(),
					sNavigationPath = ODataModelAnnotationHelper.getNavigationPath(sAnnotationPath),
					sSourceType,
					sTargetType;
				if (sNavigationPath) {
					sSourceType = ODataModelAnnotationHelper.getNavigationPath(oTarget.getPath());
					sTargetType = oTarget.getModel().getObject(sSourceType + "/" + sNavigationPath + "/@sapui.name");
					return "/" + sTargetType + sAnnotationPath.replace(sNavigationPath, "");
				}
				return oTarget.getPath();
			},

			getNavigationContext: function(oContext) {
				return ODataModelAnnotationHelper.getNavigationPath(oContext.getPath());
			},

			replaceSpecialCharsInId: function(sId) {
				if (sId.indexOf(" ") >= 0) {
					Log.error(
						"Annotation Helper: Spaces are not allowed in ID parts. Please check the annotations, probably something is wrong there."
					);
				}
				return sId
					.replace(/@/g, "")
					.replace(/\//g, "::")
					.replace(/#/g, "::");
			},
			createBindingForDraftAdminBlock: function(oMetaModel, sEntityType, sFormatter) {
				var sPath = "/" + sEntityType + "/DraftAdministrativeData/";
				return oMetaModel.requestObject(sPath).then(function(oDADEntityType) {
					var sBinding = "{parts: [{path: 'InProcessByUser'}, " + "{path: 'LastChangedByUser'} ";
					if (oDADEntityType.InProcessByUserDescription) {
						sBinding += " ,{path: 'InProcessByUserDescription'}";
					}
					if (oDADEntityType.LastChangedByUserDescription) {
						sBinding += ", {path: 'LastChangedByUserDescription'}";
					}
					sBinding += "], formatter: '.editFlow." + sFormatter + "'}";
					return sBinding;
				});
			},
			getBindingForDraftAdminBlockInline: function(iContext, sEntityType) {
				return AnnotationHelper.createBindingForDraftAdminBlock(iContext.getModel(), sEntityType, "formatDraftOwnerTextInline");
			},
			getBindingForDraftAdminBlockInPopover: function(iContext, sEntityType) {
				return AnnotationHelper.createBindingForDraftAdminBlock(iContext.getModel(), sEntityType, "formatDraftOwnerTextInPopover");
			},
			checkForActions: function(aLineItems) {
				var oLineItem;
				for (var i = 0; i < aLineItems.length; i++) {
					oLineItem = aLineItems[i];
					if (
						(oLineItem["$Type"] === "com.sap.vocabularies.UI.v1.DataFieldForAction" ||
							(oLineItem["$Type"] === "com.sap.vocabularies.UI.v1.DataFieldForIntentBasedNavigation" &&
								oLineItem.RequiresContext &&
								(oLineItem.RequiresContext === true || oLineItem.RequiresContext.Bool === "true"))) &&
						!(oLineItem.Inline && oLineItem.Inline.Bool !== "true")
					) {
						return true;
					}
				}
				return false;
			},
			hasDeterminingActions: function(oEntityType) {
				var oDataFields = oEntityType["@com.sap.vocabularies.UI.v1.LineItem"];
				for (var i in oDataFields) {
					if (oDataFields[i].$Type === "com.sap.vocabularies.UI.v1.DataFieldForAction" && oDataFields[i].Determining === true) {
						return true;
					}
				}
				return false;
			},

			/**
			 * checks if the navigation collection is insertable
			 * @function
			 * @static
			 * @name sap.fe.core.AnnotationHelper.getNavigationInsertableRestrictions
			 * @memberof sap.fe.core.AnnotationHelper
			 * @param {string} sCurrentCollectionName The name of the navigation collection
			 * @param {array} aRestrictedProperties array of RestrictedProperties of NavigationRestrictions of the root collection
			 * @param {boolean} bInsertable Insertable value of the navigation collection
			 * @returns {string} expression if insertable or insertable path, false otherwise
			 * @private
			 * @sap-restricted
			 **/
			getNavigationInsertableRestrictions: function(
				oCollection,
				sCurrentCollectionName,
				aRestrictedProperties,
				bInsertable,
				bCreationRow
			) {
				// If insertable = true via NavigationRestriction of root collection, navigation collection is insertable
				// If NOT insertable via NavigationRestriction of root collection, navigation collection is NOT insertable
				// If insertable property is undefined for the NavigationRestrictions of the root collection,
				// 	then insertable property of the navigation collection is considered.
				// 	If insertable = true, navigation collection is insertable
				// 	If insertable = false, navigation collection is NOT insertable
				// If Insertable is undefined via navigation restriction of root collection
				// 	and Insertable is undefined at navigation collection,
				// 	then navigation collection is insertable.
				var i,
					oNavigationProperty,
					sPath = "";
				for (i in aRestrictedProperties) {
					oNavigationProperty = aRestrictedProperties[i];
					if (
						oNavigationProperty.NavigationProperty.$NavigationPropertyPath === sCurrentCollectionName &&
						oNavigationProperty.InsertRestrictions
					) {
						if (oNavigationProperty.InsertRestrictions.Insertable && oNavigationProperty.InsertRestrictions.Insertable.$Path) {
							if (bCreationRow) {
								sPath = oCollection.$Partner + "/";
							}
							return (
								"{= ${" +
								sPath +
								oNavigationProperty.InsertRestrictions.Insertable.$Path +
								"}  && ${ui>/editMode} === 'Editable' }"
							);
						}
						return oNavigationProperty.InsertRestrictions.Insertable ? "{= ${ui>/editMode} === 'Editable' }" : false;
					}
				}
				if (bInsertable && bInsertable.$Path && bInsertable.$Path.indexOf("/") > -1) {
					if (bCreationRow) {
						sCurrentCollectionName = "";
					} else {
						sCurrentCollectionName = sCurrentCollectionName + "/";
					}
					return "{=  ${ui>/editMode} === 'Editable' && ${" + sCurrentCollectionName + bInsertable.$Path + "}}";
				}
				return "{= " + (bInsertable !== false) + " && ${ui>/editMode} === 'Editable'}";
			},
			/**
			 * checks if the navigation collection is deletable
			 * @function
			 * @static
			 * @name sap.fe.core.AnnotationHelper.isNavigationPropertyDeletable
			 * @memberof sap.fe.core.AnnotationHelper
			 * @param {string} sCurrentCollectionName The name of the navigation collection
			 * @param {array} aRestrictedProperties array of RestrictedProperties of NavigationRestrictions of the root collection
			 * @param {boolean} bDeletable Deletable value of the navigation collection
			 * @returns {boolean} true if deletable, false otherwise
			 * @private
			 * @sap-restricted
			 **/
			isNavigationPropertyDeletable: function(sCurrentCollectionName, aRestrictedProperties, bDeletable) {
				var i, oNavigationProperty;
				for (i in aRestrictedProperties) {
					oNavigationProperty = aRestrictedProperties[i];
					if (
						oNavigationProperty.NavigationProperty.$NavigationPropertyPath === sCurrentCollectionName &&
						oNavigationProperty.DeleteRestrictions
					) {
						return oNavigationProperty.DeleteRestrictions.Deletable;
					}
				}
				return "{= " + (bDeletable !== false) + " && ${ui>/editMode} === 'Editable'}";
			},
			/**
			 * checks if the footer is visible or not
			 * @function
			 * @static
			 * @name sap.fe.core.AnnotationHelper.showFooter
			 * @memberof sap.fe.core.AnnotationHelper
			 * @param {array} aDataFields array of DataFields in the identification
			 * @param {boolean} bConsiderEditable boolean value to check whether the edit mode binding is required or not
			 * @returns {string} expression if all the actions are ui.hidden, true otherwise
			 * @private
			 * @sap-restricted
			 **/
			showFooter: function(aDataFields, bConsiderEditable) {
				var sHiddenExpression = "";
				var sSemiHiddenExpression;
				var aHiddenActionPath = [];

				for (var i in aDataFields) {
					var oDataField = aDataFields[i];
					if (oDataField.$Type === "com.sap.vocabularies.UI.v1.DataFieldForAction" && oDataField.Determining === true) {
						if (!oDataField["@com.sap.vocabularies.UI.v1.Hidden"]) {
							return true;
						} else if (oDataField["@com.sap.vocabularies.UI.v1.Hidden"].$Path) {
							if (aHiddenActionPath.indexOf(oDataField["@com.sap.vocabularies.UI.v1.Hidden"].$Path) === -1) {
								aHiddenActionPath.push(oDataField["@com.sap.vocabularies.UI.v1.Hidden"].$Path);
							}
						}
					}
				}

				if (aHiddenActionPath.length) {
					for (var index in aHiddenActionPath) {
						if (aHiddenActionPath[index]) {
							sSemiHiddenExpression = "(%{" + aHiddenActionPath[index] + "} === true ? false : true )";
						}
						if (index == aHiddenActionPath.length - 1) {
							sHiddenExpression = sHiddenExpression + sSemiHiddenExpression;
						} else {
							sHiddenExpression = sHiddenExpression + sSemiHiddenExpression + "||";
						}
					}
					return (
						"{= " +
						sHiddenExpression +
						(bConsiderEditable ? " || ${ui>/editMode} === 'Editable' " : " ") +
						"|| ${localUI>/showMessageFooter} === true}"
					);
				} else {
					return (
						"{= " + (bConsiderEditable ? "${ui>/editMode} === 'Editable' || " : "") + "${localUI>/showMessageFooter} === true}"
					);
				}
			},
			getChartVisualizationPath: function(oVisualizations) {
				var i, oVisualization, sAnnotationPath;
				var aVisualizations = oVisualizations.getObject("");
				for (i in aVisualizations) {
					oVisualization = aVisualizations[i];
					sAnnotationPath = oVisualization.$AnnotationPath;
					if (sAnnotationPath.indexOf("@com.sap.vocabularies.UI.v1.Chart") > -1) {
						return oVisualizations.getPath() + "/" + i;
					}
				}
			},
			getFirstVisualizationPath: function(oVisualizations) {
				return oVisualizations.getPath() + "/" + "0";
			},

			/**
			 * Returns the chart path from the default PV in the entity if available
			 * @function
			 * @static
			 * @name sap.fe.core.AnnotationHelper.getPVChartPath
			 * @memberof sap.fe.core.AnnotationHelper
			 * @param {object} oContext - context object for the presentation
			 * @returns {string} - Correct annotation path for the table
			 * @private
			 * @sap-restricted
			 **/
			getPVChartPath: function(oAnnotationPath, oInterface) {
				var oContext = oInterface.context,
					sPath = oContext.getPath();
				if (oContext.getObject(sPath + "/@sapui.name") === "@com.sap.vocabularies.UI.v1.PresentationVariant") {
					var oPresentationVariant = oContext.getObject(sPath);
					if (oPresentationVariant && oPresentationVariant.Visualizations) {
						var aVisualizations = oPresentationVariant.Visualizations;
						for (var i = 0; i < aVisualizations.length; i++) {
							if (aVisualizations[i].$AnnotationPath.indexOf("@com.sap.vocabularies.UI.v1.Chart") !== -1) {
								return oContext
									.getObject(sPath + "/Visualizations/" + i + "/$AnnotationPath/@sapui.name")
									.replace(RegExp(".*\\."), "");
							}
						}
					}
				}
			},
			/**
			 * Returns the metamodel path correctly for bound actions. For unbound actions,
			 * incorrect path is returned but during templating it is ignored.
			 * e.g. for bound action someNameSpace.SomeBoundAction of entity set SomeEntitySet,
			 * the string "/SomeEntitySet/someNameSpace.SomeBoundAction" is returned.
			 * @function
			 * @static
			 * @name sap.fe.core.AnnotationHelper.getActionContext
			 * @memberof sap.fe.core.AnnotationHelper
			 * @param {object} oAction - context object for the action
			 * @returns {string} - Correct metamodel path for bound and incorrect path for unbound actions
			 * @private
			 * @sap-restricted
			 **/
			getActionContext: function(oAction) {
				return CommonUtils.getActionPath(oAction, true);
			},
			/**
			 * Returns the metamodel path correctly for overloaded bound actions. For unbound actions,
			 * incorrect path is returned but during templating it is ignored.
			 * e.g. for bound action someNameSpace.SomeBoundAction of entity set SomeEntitySet,
			 * the string "/SomeEntitySet/someNameSpace.SomeBoundAction/@$ui5.overload/0" is returned.
			 * @function
			 * @static
			 * @name sap.fe.core.AnnotationHelper.getPathToBoundActionOverload
			 * @memberof sap.fe.core.AnnotationHelper
			 * @param {object} oAction - context object for the action
			 * @returns {string} - Correct metamodel path for bound action overload and incorrect path for unbound actions
			 * @private
			 * @sap-restricted
			 **/
			getPathToBoundActionOverload: function(oAction) {
				var sPath = CommonUtils.getActionPath(oAction, true);
				return sPath + "/@$ui5.overload/0";
			}
		};
		AnnotationHelper.getQuickFilterText.requiresIContext = true;
		AnnotationHelper.getBindingForDraftAdminBlockInline.requiresIContext = true;
		AnnotationHelper.getBindingForDraftAdminBlockInPopover.requiresIContext = true;
		return AnnotationHelper;
	},
	true
);
