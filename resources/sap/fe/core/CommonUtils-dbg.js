/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2020 SAP SE. All rights reserved
    
 */

sap.ui.define(
	[
		"sap/ui/core/mvc/View",
		"sap/ui/core/Component",
		"sap/m/MessageBox",
		"sap/base/Log",
		"sap/fe/navigation/SelectionVariant",
		"sap/ui/mdc/condition/FilterOperatorUtil",
		"sap/ui/mdc/odata/v4/FieldBaseDelegate"
	],
	function(View, Component, MessageBox, Log, SelectionVariant, FilterOperatorUtil, FieldBaseDelegate) {
		"use strict";

		var aValidTypes = [
				"Edm.Boolean",
				"Edm.Byte",
				"Edm.Date",
				"Edm.DateTimeOffset",
				"Edm.Decimal",
				"Edm.Double",
				"Edm.Guid",
				"Edm.Int16",
				"Edm.Int32",
				"Edm.Int64",
				"Edm.SByte",
				"Edm.Single",
				"Edm.String",
				"Edm.TimeOfDay"
			],
			oExcludeMap = {
				"Contains": "NotContains",
				"StartsWith": "NotStartsWith",
				"EndsWith": "NotEndsWith",
				"Empty": "NotEmpty",
				"NotEmpty": "Empty",
				"LE": "NOTLE",
				"GE": "NOTGE",
				"LT": "NOTLT",
				"GT": "NOTGT",
				"BT": "NOTBT",
				"NE": "EQ",
				"EQ": "NE"
			};

		function fnGetParentViewOfControl(oControl) {
			while (oControl && !(oControl instanceof View)) {
				oControl = oControl.getParent();
			}
			return oControl;
		}

		function fnHasTransientContexts(oListBinding) {
			var bHasTransientContexts = false;
			oListBinding.getCurrentContexts().forEach(function(oContext) {
				if (oContext && oContext.isTransient()) {
					bHasTransientContexts = true;
				}
			});
			return bHasTransientContexts;
		}

		function _isInNonFilterableProperties(oModel, sEntitySetPath, sContextPath) {
			var bIsNotFilterable = false;
			var oAnnotation = oModel.getObject(sEntitySetPath + "@Org.OData.Capabilities.V1.FilterRestrictions");
			if (oAnnotation && oAnnotation.NonFilterableProperties) {
				bIsNotFilterable = oAnnotation.NonFilterableProperties.some(function(property) {
					return property.$NavigationPropertyPath === sContextPath || property.$PropertyPath === sContextPath;
				});
			}
			return bIsNotFilterable;
		}

		function _isContextPathFilterable(oModel, sEntitySetPath, sContexPath) {
			var aContext = sContexPath.split("/"),
				bIsNotFilterable = false,
				sContext = "";

			aContext.some(function(item, index, array) {
				if (sContext.length > 0) {
					sContext += "/" + item;
				} else {
					sContext = item;
				}
				if (index === array.length - 1) {
					//last path segment
					bIsNotFilterable = _isInNonFilterableProperties(oModel, sEntitySetPath, sContext);
				} else if (oModel.getObject(sEntitySetPath + "/$NavigationPropertyBinding/" + item)) {
					//check existing context path and initialize it
					bIsNotFilterable = _isInNonFilterableProperties(oModel, sEntitySetPath, sContext);
					sContext = "";
					//set the new EntitySet
					sEntitySetPath = "/" + oModel.getObject(sEntitySetPath + "/$NavigationPropertyBinding/" + item);
				}
				return bIsNotFilterable === true;
			});
			return bIsNotFilterable;
		}

		/**
		 * Checks if the property is filterable
		 *
		 * @param {object} oModel - MetaModel
		 * @param {string} sEntitySetPath - EntitySet Path
		 * @param {string} sProperty - Entityset's Property
		 * @param {string} sPropertyPath - Overall property path
		 * @param {boolean} bSkipHiddenFilter - if HiddenFilters annotation check needs to be skipped
		 * @return {boolean} bIsNotFilterable - True, if the property is filterable
		 *
		 */
		function isPropertyFilterable(oModel, sEntitySetPath, sProperty, sPropertyPath, bSkipHiddenFilter) {
			var bIsNotFilterable;

			if (!sPropertyPath) {
				sPropertyPath = sEntitySetPath + "/" + sProperty;
			}
			if (oModel.getObject(sPropertyPath + "@com.sap.vocabularies.UI.v1.Hidden")) {
				return false;
			}

			if (!bSkipHiddenFilter && oModel.getObject(sPropertyPath + "@com.sap.vocabularies.UI.v1.HiddenFilter")) {
				return false;
			}

			if (typeof sProperty === "string") {
				sProperty = sProperty;
			} else {
				sProperty = oModel.getObject(sPropertyPath + "@sapui.name");
			}
			if (sProperty.indexOf("/") < 0) {
				bIsNotFilterable = _isInNonFilterableProperties(oModel, sEntitySetPath, sProperty);
			} else {
				bIsNotFilterable = _isContextPathFilterable(oModel, sEntitySetPath, sProperty);
			}

			return !bIsNotFilterable;
		}

		function updateRelateAppsModel(
			oEntry,
			oObjectPageLayout,
			oXApplNavigation,
			sCurrentSemObj,
			sCurrentAction,
			aSemKeys,
			aSemUnavailableActs,
			oMetaModel,
			oMetaPath
		) {
			var oParam = {};
			if (oEntry) {
				if (aSemKeys && aSemKeys.length > 0) {
					for (var j = 0; j < aSemKeys.length; j++) {
						var sSemKey = aSemKeys[j].$PropertyPath;
						if (!oParam[sSemKey]) {
							oParam[sSemKey] = oEntry[sSemKey];
						}
					}
				} else {
					// fallback to Technical Keys if no Semantic Key is present
					var aTechnicalKeys = oMetaModel.getObject(oMetaPath + "/$Type/$Key");
					for (var key in aTechnicalKeys) {
						var sObjKey = aTechnicalKeys[key];
						if (!oParam[sObjKey]) {
							oParam[sObjKey] = oEntry[sObjKey];
						}
					}
				}
			}
			var oLinksDeferred = oXApplNavigation.getLinks({
				semanticObject: sCurrentSemObj,
				params: oParam
			});
			oLinksDeferred.done(function(aLinks) {
				// Sorting the related app links alphabetically
				aLinks.sort(function(oLink1, oLink2) {
					if (oLink1.text < oLink2.text) {
						return -1;
					}
					if (oLink1.text > oLink2.text) {
						return 1;
					}
					return 0;
				});
				if (aLinks && aLinks.length > 0) {
					var aItems = [];
					//Skip same application from Related Apps
					for (var i = 0; i < aLinks.length; i++) {
						var oLink = aLinks[i];
						var sIntent = oLink.intent;
						var sAction = sIntent.split("-")[1].split("?")[0];
						if (
							sAction !== sCurrentAction &&
							(!aSemUnavailableActs || (aSemUnavailableActs && aSemUnavailableActs.indexOf(sAction) === -1))
						) {
							aItems.push({
								text: oLink.text,
								targetSemObject: sIntent.split("#")[1].split("-")[0],
								targetAction: sAction.split("~")[0]
							});
						}
					}
					// If no app in list, related apps button will be hidden
					oObjectPageLayout.getModel("relatedAppsModel").setProperty("/visibility", aItems.length > 0);
					oObjectPageLayout.getModel("relatedAppsModel").setProperty("/items", aItems);
				} else {
					oObjectPageLayout.getModel("relatedAppsModel").setProperty("/visibility", false);
				}
			});
		}

		function fnUpdateRelatedAppsDetails(oObjectPageLayout) {
			var oUshellContainer = sap.ushell && sap.ushell.Container;
			var oXApplNavigation = oUshellContainer && oUshellContainer.getService("CrossApplicationNavigation");
			var oURLParsing = oUshellContainer && oUshellContainer.getService("URLParsing");
			var oParsedUrl = oURLParsing && oURLParsing.parseShellHash(document.location.hash);
			var sCurrentSemObj = oParsedUrl.semanticObject; // Current Semantic Object
			var sCurrentAction = oParsedUrl.action; // Current Action
			var oMetaModel = oObjectPageLayout.getModel().getMetaModel();
			var oBindingContext = oObjectPageLayout.getBindingContext();
			var oPath = oBindingContext && oBindingContext.getPath();
			var oMetaPath = oMetaModel.getMetaPath(oPath);
			// Semantic Key Vocabulary
			var sSemanticKeyVocabulary = oMetaPath + "/" + "@com.sap.vocabularies.Common.v1.SemanticKey";
			//Semantic Keys
			var aSemKeys = oMetaModel.getObject(sSemanticKeyVocabulary);
			// Unavailable Actions
			var aSemUnavailableActs = oMetaModel.getObject(
				oMetaPath + "/" + "@com.sap.vocabularies.Common.v1.SemanticObjectUnavailableActions"
			);
			var oEntry = oBindingContext.getObject();
			if (!oEntry) {
				oBindingContext.requestObject().then(function(oEntry) {
					updateRelateAppsModel(
						oEntry,
						oObjectPageLayout,
						oXApplNavigation,
						sCurrentSemObj,
						sCurrentAction,
						aSemKeys,
						aSemUnavailableActs,
						oMetaModel,
						oMetaPath
					);
				});
			} else {
				updateRelateAppsModel(
					oEntry,
					oObjectPageLayout,
					oXApplNavigation,
					sCurrentSemObj,
					sCurrentAction,
					aSemKeys,
					aSemUnavailableActs,
					oMetaModel,
					oMetaPath
				);
			}
		}

		/**
		 * Fire Press on a Button
		 * Test if oButton is an enabled and visible sap.m.Button before triggering a press event
		 * @param {sap.m.Button | sap.m.OverflowToolbarButton} oButton a SAP UI5 Button
		 */
		function fnFireButtonPress(oButton) {
			var aAuthorizedTypes = ["sap.m.Button", "sap.m.OverflowToolbarButton"];
			if (
				oButton &&
				aAuthorizedTypes.indexOf(oButton.getMetadata().getName()) !== -1 &&
				oButton.getVisible() &&
				oButton.getEnabled()
			) {
				oButton.firePress();
			}
		}

		function fnResolveStringtoBoolean(sValue) {
			if (sValue === "true" || sValue === true) {
				return true;
			} else {
				return false;
			}
		}

		/**
		 * Retrieves the main component associated with a given control / view
		 * @param {sap.ui.base.ManagedObject} oControl a managed object
		 */
		function getAppComponent(oControl) {
			var oOwner = Component.getOwnerComponentFor(oControl);
			if (!oOwner) {
				return oControl;
			} else {
				return getAppComponent(oOwner);
			}
		}

		/**
		 * FE MessageBox to confirm in case data loss warning is to be given.
		 *
		 * @param {Function} fnProcess - Task to be performed if user confirms.
		 * @param {sap.ui.core.Control} oControl - Control responsible for the the trigger of the dialog
		 * @param {string} programmingModel - Type of transaction model
		 * @returns {object} MessageBox if confirmation is required else the fnProcess function.
		 *
		 */
		function fnProcessDataLossConfirmation(fnProcess, oControl, programmingModel, oController) {
			var oUIModelData = oControl && oControl.getModel("ui") && oControl.getModel("ui").getData(),
				bUIEditable = oUIModelData.createMode || oUIModelData.editMode === "Editable",
				oResourceBundle = sap.ui.getCore().getLibraryResourceBundle("sap.fe.templates"),
				sWarningMsg = oResourceBundle && oResourceBundle.getText("NAVIGATION_AWAY_MSG"),
				sConfirmButtonTxt = oResourceBundle && oResourceBundle.getText("NAVIGATION_AWAY_CONFIRM_BUTTON"),
				sCancelButtonTxt = oResourceBundle && oResourceBundle.getText("NAVIGATION_AWAY_CANCEL_BUTTON");

			if (programmingModel === "Sticky" && bUIEditable) {
				return MessageBox.warning(sWarningMsg, {
					actions: [sConfirmButtonTxt, sCancelButtonTxt],
					onClose: function(sAction) {
						if (sAction === sConfirmButtonTxt) {
							var oLocalUIModel = oControl && oControl.getModel("localUI");

							Log.info("Navigation confirmed.");
							if (oLocalUIModel) {
								oLocalUIModel.setProperty("/sessionOn", false);
							} else {
								Log.warning("Local UIModel couldn't be found.");
							}
							fnProcess();
							if (oController) {
								oController.editFlow.fnStickyDiscard(oControl.getBindingContext());
							}
						} else {
							Log.info("Navigation rejected.");
						}
					}
				});
			}
			return fnProcess();
		}

		/**
		 * Performs External Navigation.
		 *
		 * @param {object} oView - LR or OP view where Navigation is performed
		 * @param {object} oSelectionVariantEntityType - Selection Variant
		 * @param {string} sSemanticObject
		 * @param {string} sAction
		 * @param {boolean} bOpenInNewTab - Open in new tab in case the app is in sticky edit mode
		 *
		 */
		function fnNavigateToExternalApp(oView, oSelectionVariant, sSemanticObject, sAction, fnOnError, bOpenInNewTab) {
			oSelectionVariant = oSelectionVariant ? oSelectionVariant : new SelectionVariant();
			var vNavigationParameters = oSelectionVariant.toJSONString();
			var oAppComponent = CommonUtils.getAppComponent(oView);
			// TODO: We need to remove the below if block once FLP provide the solution to FIORITECHP1-14400
			if (bOpenInNewTab) {
				oView.getModel("localUI").setProperty("/IBN_OpenInNewTable", true);
			}
			oAppComponent.getService("navigation").then(function(oNavigationService) {
				oNavigationService.navigate(
					sSemanticObject,
					sAction,
					vNavigationParameters,
					null,
					fnOnError,
					null,
					bOpenInNewTab ? "explace" : "inplace"
				);
			});
		}

		/**
		 * Method to get metadata of entityset properties
		 *
		 * @param {object} oMetaModel - MetaModel for annotations
		 * @param {string} sEntitySet - EntitySet for properities
		 *
		 */
		function fnGetEntitySetProperties(oMetaModel, sEntitySet) {
			var oEntityType = oMetaModel.getObject("/" + sEntitySet + "/") || {},
				oProperties = {};

			for (var sKey in oEntityType) {
				if (
					oEntityType.hasOwnProperty(sKey) &&
					!/^\$/i.test(sKey) &&
					oEntityType[sKey].$kind &&
					oEntityType[sKey].$kind === "Property"
				) {
					oProperties[sKey] = oEntityType[sKey];
				}
			}
			return oProperties;
		}

		/**
		 * Method to get madatory filterfields
		 *
		 * @param {object} oMetaModel - MetaModel for annotations
		 * @param {string} sEntitySet - EntitySet for properities
		 *
		 */
		function fnGetMandatoryFilterFields(oMetaModel, sEntitySet) {
			var aMandatoryFilterFields;
			if (oMetaModel && sEntitySet) {
				aMandatoryFilterFields = oMetaModel.getObject(
					"/" + sEntitySet + "@Org.OData.Capabilities.V1.FilterRestrictions/RequiredProperties"
				);
			}
			return aMandatoryFilterFields;
		}

		/**
		 * Method to update the IBN Buttons Visibility
		 *
		 * @param {object} localUIModel - JSONModel containing SemanticObject and Action combination
		 */
		function fnUpdateDataFiledForIBNButtonsVisibility(localUIModel) {
			var oUshellContainer = sap.ushell && sap.ushell.Container;
			var oXApplNavigation = oUshellContainer && oUshellContainer.getService("CrossApplicationNavigation");
			var oLinksDeferred = oXApplNavigation.getLinks({
				params: {}
			});
			oLinksDeferred.then(function(aLinks) {
				if (aLinks && aLinks.length > 0) {
					var oLinks = {};
					// TODO: we need to add only those actions in the model which are present on the UI
					for (var i = 0; i < aLinks.length; i++) {
						oLinks[aLinks[i].intent.substring(1)] = true;
					}
					localUIModel.setProperty("/IBNActions", oLinks);
				}
			});
		}
		/**
		 * Creates the updated key to check the i18n override and fallbacks to the old value if the new value is not available for the same key.
		 *
		 * @param {string} sFrameworkKey - current key.
		 * @param {object} oResourceBundle - contains the local resource bundle
		 * @param {object} oParams - parameter object for the resource value
		 * @param {object} sEntitySetName - entity set name of the control where the resource is being used
		 */
		function getTranslatedText(sFrameworkKey, oResourceBundle, oParams, sEntitySetName) {
			var sContextOverriddenKey;
			if (oResourceBundle) {
				if (sEntitySetName) {
					//CASE: Context Specific Overriding of the text
					sContextOverriddenKey = sFrameworkKey + "|" + sEntitySetName;
					if (oResourceBundle.getText(sContextOverriddenKey, oParams, true)) {
						return oResourceBundle.getText(sContextOverriddenKey, oParams, true);
					}
				}
				//CASE: Direct overriding of the Framework Text
				if (oResourceBundle.getText(sFrameworkKey, oParams, true)) {
					return oResourceBundle.getText(sFrameworkKey, oParams, true);
				}
			}
			//CASE: Framework Text
			oResourceBundle = sap.ui.getCore().getLibraryResourceBundle("sap.fe.core");
			return oResourceBundle.getText(sFrameworkKey, oParams);
		}

		/**
		 * Returns the metamodel path correctly for bound actions if used with bReturnOnlyPath as true,
		 * else returns an object which has 3 properties related to the action. They are the entity set name,
		 * the $Path value of the OperationAvailable annotation and the binding parameter name. If
		 * bCheckStaticValue is true, returns the static value of OperationAvailable annotation, if present.
		 * e.g. for bound action someNameSpace.SomeBoundAction
		 * of entity set SomeEntitySet, the string "/SomeEntitySet/someNameSpace.SomeBoundAction" is returned.
		 *
		 * @param {oAction} oAction - context object of the action
		 * @param {boolean} bReturnOnlyPath - if false, additional info is returned along with metamodel path to the bound action
		 * @param {string} sActionName - name of the bound action of the form someNameSpace.SomeBoundAction
		 * @param {boolean} bCheckStaticValue - if true, the static value of OperationAvailable is returned, if present
		 * @returns {string|object} - string or object as specified by bReturnOnlyPath
		 * @private
		 * @sap-restricted
		 */
		function getActionPath(oAction, bReturnOnlyPath, sActionName, bCheckStaticValue) {
			sActionName = !sActionName ? oAction.getObject(oAction.getPath()) : sActionName;
			var sEntityName = oAction.getPath().split("/@")[0];
			sEntityName = oAction.getObject(sEntityName).$Type;
			sEntityName = getEntitySetName(oAction.getModel(), sEntityName);
			if (bCheckStaticValue) {
				return oAction.getObject("/" + sEntityName + "/" + sActionName + "@Org.OData.Core.V1.OperationAvailable");
			}
			if (bReturnOnlyPath) {
				return "/" + sEntityName + "/" + sActionName;
			} else {
				return {
					sEntityName: sEntityName,
					sProperty: oAction.getObject("/" + sEntityName + "/" + sActionName + "@Org.OData.Core.V1.OperationAvailable/$Path"),
					sBindingParameter: oAction.getObject("/" + sEntityName + "/" + sActionName + "/@$ui5.overload/0/$Parameter/0/$Name")
				};
			}
		}

		function getEntitySetName(oMetaModel, sEntityType) {
			var oEntityContainer = oMetaModel.getObject("/");
			for (var key in oEntityContainer) {
				if (typeof oEntityContainer[key] === "object" && oEntityContainer[key].$Type === sEntityType) {
					return key;
				}
			}
		}

		function computeDisplayMode(oPropertyAnnotations, oCollectionAnnotations) {
			var oTextAnnotation = oPropertyAnnotations["@com.sap.vocabularies.Common.v1.Text"],
				oTextArrangementAnnotation =
					oTextAnnotation &&
					((oPropertyAnnotations &&
						oPropertyAnnotations["@com.sap.vocabularies.Common.v1.Text@com.sap.vocabularies.UI.v1.TextArrangement"]) ||
						(oCollectionAnnotations && oCollectionAnnotations["@com.sap.vocabularies.UI.v1.TextArrangement"]));

			if (oTextArrangementAnnotation) {
				if (oTextArrangementAnnotation.$EnumMember === "com.sap.vocabularies.UI.v1.TextArrangementType/TextOnly") {
					return "Description";
				} else if (oTextArrangementAnnotation.$EnumMember === "com.sap.vocabularies.UI.v1.TextArrangementType/TextLast") {
					return "ValueDescription";
				}
				//Default should be TextFirst if there is a Text annotation and neither TextOnly nor TextLast are set
				return "DescriptionValue";
			}
			return oTextAnnotation ? "DescriptionValue" : "Value";
		}

		function setActionEnablement(oContextModel, oActionOperationAvailableMap, sContextCollectionName, aSelectedContexts) {
			for (var sAction in oActionOperationAvailableMap) {
				oContextModel.setProperty(sContextCollectionName + "/" + sAction, false);
				var sProperty = oActionOperationAvailableMap[sAction];
				for (var i = 0; i < aSelectedContexts.length; i++) {
					var oSelectedContext = aSelectedContexts[i];
					var oContextData = oSelectedContext.getObject();
					if (sProperty === null && !!oContextData["#" + sAction]) {
						//look for action advertisement if present and its value is not null
						oContextModel.setProperty(sContextCollectionName + "/" + sAction, true);
						break;
					} else if (!!oSelectedContext.getObject(sProperty)) {
						oContextModel.setProperty(sContextCollectionName + "/" + sAction, true);
						break;
					}
				}
			}
		}
		function _getDefaultOperators(oRealProperty) {
			// mdc defines the full set of operations that are meaningful for each Edm Type
			var oDataClass = FieldBaseDelegate.getDataTypeClass(null, oRealProperty);
			var oBaseType = FieldBaseDelegate.getBaseType(null, oDataClass);
			return FilterOperatorUtil.getOperatorsForType(oBaseType);
		}

		function _getRestrictions(aDefaultOps, aExpressionOps) {
			// From the default set of Operators for the Base Type, select those that are defined in the Allowed Value.
			// In case that no operators are found, return undefined so that the default set is used.
			var aOperators = aDefaultOps.filter(function(sElement) {
				return aExpressionOps.indexOf(sElement) > -1;
			});
			return aOperators.toString() || undefined;
		}

		function getOperatorsForProperty(sProperty, sEntitySetPath, oModel) {
			var oFilterRestrictions = oModel.getObject(sEntitySetPath + "@Org.OData.Capabilities.V1.FilterRestrictions");
			var aEqualsOps = ["EQ"];
			var aSingleRangeOps = ["EQ", "BT", "BTEX", "LT", "NOTLT", "GT", "NOTGT", "LE", "NOTLE", "GE", "NOTGE"];
			var aMultiRangeOps = ["EQ", "BT", "BTEX", "NOTBT", "NOTBTEX", "LT", "NOTLT", "GT", "NOTGT", "LE", "NOTLE", "GE", "NOTGE", "NE"];
			var aSeachExpressionOps = ["StartsWith", "NotStartsWith", "EndsWith", "NotEndsWith", "Contains", "NotContains"];

			// Is there a Filter Restriction defined for this property?
			if (
				oFilterRestrictions &&
				oFilterRestrictions.FilterExpressionRestrictions &&
				oFilterRestrictions.FilterExpressionRestrictions.some(function(oRestriction) {
					return oRestriction.Property.$PropertyPath === sProperty;
				})
			) {
				var oRealProperty = oModel.getObject(sEntitySetPath + "/" + sProperty + "/$Type");
				// Get the default Operators for this Property Type
				var aDefaultOperators = _getDefaultOperators(oRealProperty);

				var aRestriction = oFilterRestrictions.FilterExpressionRestrictions.filter(function(oRestriction) {
					return oRestriction.Property.$PropertyPath === sProperty;
				});

				// In case more than one Allowed Expressions has been defined for a property
				// choose the most restrictive Allowed Expression

				// MultiValue has same Operator as SingleValue, but there can be more than one (maxConditions)
				if (
					aRestriction.some(function(oRestriction) {
						return oRestriction.AllowedExpressions === "SingleValue" || oRestriction.AllowedExpressions === "MultiValue";
					})
				) {
					return _getRestrictions(aDefaultOperators, aEqualsOps);
				}

				if (
					aRestriction.some(function(oRestriction) {
						return oRestriction.AllowedExpressions === "SingleRange";
					})
				) {
					return _getRestrictions(aDefaultOperators, aSingleRangeOps);
				}

				if (
					aRestriction.some(function(oRestriction) {
						return oRestriction.AllowedExpressions === "MultiRange";
					})
				) {
					return _getRestrictions(aDefaultOperators, aMultiRangeOps);
				}

				if (
					aRestriction.some(function(oRestriction) {
						return oRestriction.AllowedExpressions === "SearchExpression";
					})
				) {
					return _getRestrictions(aDefaultOperators, aSeachExpressionOps);
				}

				if (
					aRestriction.some(function(oRestriction) {
						return oRestriction.AllowedExpressions === "MultiRangeOrSearchExpression";
					})
				) {
					return _getRestrictions(aDefaultOperators, aSeachExpressionOps.concat(aMultiRangeOps));
				}
				// In case AllowedExpressions is not recognised, undefined in return results in the default set of
				// operators for the type.
				return undefined;
			}
		}

		/**
		 * Method to get the compliant value type based on data type
		 * @param {Object} sValue - Raw value
		 * @param {String} sType - Property Metadata type for type conversion
		 * @return {Object} - value to be propagated to the condition.
		 */
		function getValueTypeCompliant(sValue, sType) {
			var oValue;
			if (aValidTypes.indexOf(sType) > -1) {
				oValue = sValue;
				if (sType === "Edm.Boolean") {
					oValue = sValue === "true" || (sValue === "false" ? false : undefined);
				} else if (sType === "Edm.Double" || sType === "Edm.Single") {
					oValue = isNaN(sValue) ? undefined : parseFloat(sValue);
				} else if (sType === "Edm.Byte" || sType === "Edm.Int16" || sType === "Edm.Int32" || sType === "Edm.SByte") {
					oValue = isNaN(sValue) ? undefined : parseInt(sValue, 10);
				} else if (sType === "Edm.Date") {
					oValue = sValue.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
						? sValue.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)[0]
						: sValue.match(/^(\d{8})/) && sValue.match(/^(\d{8})/)[0];
				} else if (sType === "Edm.DateTimeOffset") {
					if (sValue.match(/^(\d{4})-(\d{1,2})-(\d{1,2})T(\d{1,2}):(\d{1,2}):(\d{1,2})\+(\d{1,4})/)) {
						oValue = sValue.match(/^(\d{4})-(\d{1,2})-(\d{1,2})T(\d{1,2}):(\d{1,2}):(\d{1,2})\+(\d{1,4})/)[0];
					} else if (sValue.match(/^(\d{4})-(\d{1,2})-(\d{1,2})T(\d{1,2}):(\d{1,2}):(\d{1,2})/)) {
						oValue = sValue.match(/^(\d{4})-(\d{1,2})-(\d{1,2})T(\d{1,2}):(\d{1,2}):(\d{1,2})/)[0] + "+0000";
					} else if (sValue.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)) {
						oValue = sValue.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)[0] + "T00:00:00+0000";
					} else if (sValue.indexOf("Z") === sValue.length - 1) {
						oValue = sValue.split("Z")[0] + "+0100";
					} else {
						oValue = undefined;
					}
				} else if (sType === "Edm.TimeOfDay") {
					oValue = sValue.match(/(\d{1,2}):(\d{1,2}):(\d{1,2})/) ? sValue.match(/(\d{1,2}):(\d{1,2}):(\d{1,2})/)[0] : undefined;
				}
			}
			return oValue;
		}

		/**
		 * Method to create a condition.
		 * @param {String} sOption - Operator to be used.
		 * @param {Object} oV1 - Lower Value
		 * @param {Object} oV2 - Higher Value
		 * @return {Object} - condition.
		 */
		function createConditions(sOption, oV1, oV2, sSign) {
			var oValue = oV1,
				oValue2,
				sInternalOperation,
				oCondition = {
					isEmpty: null,
					values: []
				};

			if (oV1 === undefined || oV1 === null) {
				return;
			}

			switch (sOption) {
				case "CP":
					sInternalOperation = "Contains";
					if (oValue) {
						var nIndexOf = oValue.indexOf("*");
						var nLastIndex = oValue.lastIndexOf("*");

						// only when there are '*' at all
						if (nIndexOf > -1) {
							if (nIndexOf === 0 && nLastIndex !== oValue.length - 1) {
								sInternalOperation = "EndsWith";
								oValue = oValue.substring(1, oValue.length);
							} else if (nIndexOf !== 0 && nLastIndex === oValue.length - 1) {
								sInternalOperation = "StartsWith";
								oValue = oValue.substring(0, oValue.length - 1);
							} else {
								oValue = oValue.substring(1, oValue.length - 1);
							}
						} else {
							Log.warning("Contains Option cannot be used without '*'.");
							return;
						}
					}
					break;
				case "EQ":
					sInternalOperation = oV1 === "" ? "Empty" : sOption;
					break;
				case "NE":
					sInternalOperation = oV1 === "" ? "NotEmpty" : sOption;
					break;
				case "BT":
					if (oV2 === undefined || oV2 === null) {
						return;
					}
					oValue2 = oV2;
					sInternalOperation = sOption;
					break;
				case "LE":
				case "GE":
				case "GT":
				case "LT":
					sInternalOperation = sOption;
					break;
				default:
					Log.warning("Selection Option is not supported : '" + sOption + "'");
					return;
			}
			if (sSign === "E") {
				sInternalOperation = oExcludeMap[sInternalOperation];
			}
			oCondition.operator = sInternalOperation;
			oCondition.values.push(oValue);
			if (oValue2) {
				oCondition.values.push(oValue2);
			}

			return oCondition;
		}

		/**
		 * Method to convert selection variant to conditions.
		 * @param {Object} oSelectionVariant - SelectionVariant to be converted.
		 * @param {Object} oConditions - oConditions object to be extended.
		 * @param {Object} oValidProperties - EntityType Metadata.
		 * @param {Object} oMetaModel - Odata V4 metamodel.
		 * @param {String} sEntitySet - EntitySet for the SV properties.
		 * @return {Object} - condition.
		 */
		function addSelectionVariantToConditions(oSelectionVariant, oConditions, oMetaModel, sEntitySet) {
			var aSelectOptionsPropertyNames = oSelectionVariant.getSelectOptionsPropertyNames(),
				oValidProperties = CommonUtils.getEntitySetProperties(oMetaModel, sEntitySet),
				aParameterNames = oSelectionVariant.getParameterNames();

			// Remove all parameter names without 'P_' in them

			aParameterNames.forEach(function(sParameterName) {
				//check only those parameterNames starting from 'P_'
				if (sParameterName.substring(0, 2) === "P_") {
					var sOrigParamName = sParameterName;
					sParameterName = sParameterName.slice(2, sParameterName.length);
					//check if SO already has sParameterName, if so, then ignore sParameterName.
					if (aSelectOptionsPropertyNames.indexOf(sParameterName) == -1) {
						if (sParameterName in oValidProperties) {
							var sParameter = oSelectionVariant.getParameter(sOrigParamName),
								oValue = CommonUtils.getValueTypeCompliant(sParameter, oValidProperties[sParameterName].$Type),
								oCondition;
							if (oValue !== undefined || oValue !== null) {
								oCondition = {
									isEmpty: null,
									operator: "EQ",
									values: [oValue]
								};
								oConditions[sParameterName] = oConditions.hasOwnProperty(sParameterName)
									? oConditions[sParameterName].concat([oCondition])
									: [oCondition];
							}
						}
					}
				}
			});

			// Looping through all the propeties within selectOptions.
			aSelectOptionsPropertyNames.forEach(function(sPropertyName) {
				var sOrigPropertyName = sPropertyName;
				//check if propertyname starts with 'P_' or not, if it does, replace P_propertyName with propertyName
				if (sPropertyName.substring(0, 2) === "P_") {
					//Check if a matching propertyName is also present, if so ignore this value.
					sPropertyName = sPropertyName.slice(2, sPropertyName.length);
					if (aSelectOptionsPropertyNames.indexOf(sPropertyName) > -1) {
						sPropertyName = "";
					}
				}

				if (sPropertyName in oValidProperties) {
					var aConditions = [],
						aSelectOptions,
						aValidOperators;

					if (CommonUtils.isPropertyFilterable(oMetaModel, "/" + sEntitySet, sPropertyName, false, true)) {
						aSelectOptions = oSelectionVariant.getSelectOption(
							sOrigPropertyName == sPropertyName ? sPropertyName : sOrigPropertyName
						);
						aValidOperators = CommonUtils.getOperatorsForProperty(sPropertyName, "/" + sEntitySet, oMetaModel);

						// Create conditions for all the selectOptions of the property
						aConditions = aSelectOptions.reduce(function(aCumulativeConditions, oSelectOption) {
							var oValue1 = CommonUtils.getValueTypeCompliant(oSelectOption.Low, oValidProperties[sPropertyName].$Type),
								oValue2 = oSelectOption.High
									? CommonUtils.getValueTypeCompliant(oSelectOption.High, oValidProperties[sPropertyName].$Type)
									: undefined;
							if ((oValue1 !== undefined || oValue1 !== null) && oSelectOption.Option) {
								var oCondition = CommonUtils.createConditions(oSelectOption.Option, oValue1, oValue2, oSelectOption.Sign);
								if (!aValidOperators || aValidOperators.indexOf(oCondition.operator) > -1) {
									aCumulativeConditions.push(oCondition);
								}
							}
							return aCumulativeConditions;
						}, aConditions);
						if (aConditions.length) {
							oConditions[sPropertyName] = oConditions.hasOwnProperty(sPropertyName)
								? oConditions[sPropertyName].concat(aConditions)
								: aConditions;
						}
					}
				}
			});

			return oConditions;
		}

		/**
		 * Method to add condtions to SelectionVariant.
		 * @param {object} Instance of {@link sap.fe.navigation.SelectionVariant} SelectionVariant to be used.
		 * @param {object} Conditons to be added to the SelectionVariant
		 * @returns {object} Instance of {@link sap.fe.navigation.SelectionVariant} SelectionVariant with the conditions.
		 * @private
		 * @ui5-restricted
		 * @example <code>
		 * </code>
		 **/
		function addExternalStateFiltersToSelectionVariant(oSelectionVariant, mFilters) {
			var sFilter,
				sLow = "",
				sHigh = null;
			var fnGetSignAndOption = function(sOperator, sLowValue, sHighValue) {
				var oSelectOptionState = {
					option: "",
					sign: "I",
					low: sLowValue,
					high: sHighValue
				};
				switch (sOperator) {
					case "Contains":
						oSelectOptionState.option = "CP";
						break;
					case "StartsWith":
						oSelectOptionState.option = "CP";
						oSelectOptionState.low += "*";
						break;
					case "EndsWith":
						oSelectOptionState.option = "CP";
						oSelectOptionState.low = "*" + oSelectOptionState.low;
						break;
					case "BT":
					case "LE":
					case "LT":
					case "GT":
					case "NE":
					case "EQ":
						oSelectOptionState.option = sOperator;
						break;
					case "EEQ":
						oSelectOptionState.option = "EQ";
						break;
					case "Empty":
						oSelectOptionState.option = "EQ";
						oSelectOptionState.low = "";
						break;
					case "NotContains":
						oSelectOptionState.option = "CP";
						oSelectOptionState.sign = "E";
						break;
					case "NOTBT":
						oSelectOptionState.option = "BT";
						oSelectOptionState.sign = "E";
						break;
					case "NotStartsWith":
						oSelectOptionState.option = "CP";
						oSelectOptionState.low += "*";
						oSelectOptionState.sign = "E";
						break;
					case "NotEndsWith":
						oSelectOptionState.option = "CP";
						oSelectOptionState.low = "*" + oSelectOptionState.low;
						oSelectOptionState.sign = "E";
						break;
					case "NotEmpty":
						oSelectOptionState.option = "NE";
						oSelectOptionState.low = "";
						break;
					case "NOTLE":
						oSelectOptionState.option = "LE";
						oSelectOptionState.sign = "E";
						break;
					case "NOTGE":
						oSelectOptionState.option = "GE";
						oSelectOptionState.sign = "E";
						break;
					case "NOTLT":
						oSelectOptionState.option = "LT";
						oSelectOptionState.sign = "E";
						break;
					case "NOTGT":
						oSelectOptionState.option = "GT";
						oSelectOptionState.sign = "E";
						break;
					default:
						Log.warning(sOperator + " is not supported. " + sFilter + " could not be added to the navigation context");
				}
				return oSelectOptionState;
			};
			mFilters = mFilters.filter || mFilters;
			for (var sFilter in mFilters) {
				if (sFilter === "$editState") {
					continue;
				}
				var aFilters = mFilters[sFilter];
				for (var item in aFilters) {
					var oFilter = aFilters[item];
					sLow = oFilter.values[0].toString();
					sHigh = (oFilter.values[1] && oFilter.values[1].toString()) || null;
					var oSelectOptionValues = fnGetSignAndOption(oFilter.operator, sLow, sHigh);
					if (oSelectOptionValues.option) {
						oSelectionVariant.addSelectOption(
							sFilter,
							oSelectOptionValues.sign,
							oSelectOptionValues.option,
							oSelectOptionValues.low,
							oSelectOptionValues.high
						);
					}
				}
			}
			return oSelectionVariant;
		}

		/**
		 * Returns true if Application is in sticky edit mode
		 * @param {object} oControl
		 * @param {string} programmingModel
		 */
		function isStickyEditMode(oControl, programmingModel) {
			var oUIModelData = oControl && oControl.getModel("ui") && oControl.getModel("ui").getData();
			var bUIEditable = oUIModelData.createMode || oUIModelData.editMode === "Editable";
			return programmingModel === "Sticky" && bUIEditable;
		}

		var CommonUtils = {
			isPropertyFilterable: isPropertyFilterable,
			fireButtonPress: fnFireButtonPress,
			getParentViewOfControl: fnGetParentViewOfControl,
			hasTransientContext: fnHasTransientContexts,
			updateRelatedAppsDetails: fnUpdateRelatedAppsDetails,
			resolveStringtoBoolean: fnResolveStringtoBoolean,
			getAppComponent: getAppComponent,
			processDataLossConfirmation: fnProcessDataLossConfirmation,
			navigateToExternalApp: fnNavigateToExternalApp,
			getMandatoryFilterFields: fnGetMandatoryFilterFields,
			getEntitySetProperties: fnGetEntitySetProperties,
			updateDataFiledForIBNButtonsVisibility: fnUpdateDataFiledForIBNButtonsVisibility,
			getTranslatedText: getTranslatedText,
			getEntitySetName: getEntitySetName,
			getActionPath: getActionPath,
			computeDisplayMode: computeDisplayMode,
			setActionEnablement: setActionEnablement,
			isStickyEditMode: isStickyEditMode,
			getOperatorsForProperty: getOperatorsForProperty,
			addSelectionVariantToConditions: addSelectionVariantToConditions,
			addExternalStateFiltersToSelectionVariant: addExternalStateFiltersToSelectionVariant,
			createConditions: createConditions,
			getValueTypeCompliant: getValueTypeCompliant
		};

		return CommonUtils;
	}
);
