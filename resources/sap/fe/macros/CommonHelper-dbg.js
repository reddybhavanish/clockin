/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2017 SAP SE. All rights reserved
    
 */
sap.ui.define(
	[
		"sap/fe/macros/ResourceModel",
		"sap/ui/model/odata/v4/AnnotationHelper",
		"sap/base/Log",
		"sap/fe/core/CommonUtils",
		"sap/fe/navigation/NavigationHelper",
		"sap/fe/navigation/SelectionVariant"
	],
	function(ResourceModel, ODataModelAnnotationHelper, Log, CommonUtils, NavigationHelper, SelectionVariant) {
		"use strict";

		var Helper = {
			/**
			 * Determine if field is visible (= not hidden)
			 * @param {Object} target Target instance
			 * @param {Object} oInterface Interface instance
			 * @return {String/Boolean} - returns true, false, or expression with path, for example "{= !${IsActiveEntity} }"
			 */
			isVisible: function(target, oInterface) {
				var oModel = oInterface.context.getModel(),
					sPropertyPath = oInterface.context.getPath(),
					oAnnotations = oModel.getObject(sPropertyPath + "@"),
					hidden = oAnnotations["@com.sap.vocabularies.UI.v1.Hidden"];

				return typeof hidden === "object" ? "{= !${" + hidden.$Path + "} }" : !hidden;
			},
			fireButtonPress: function(oButton) {
				return CommonUtils.fireButtonPress(oButton);
			},
			/**
			 * Determine if field is editable
			 * @param {Object} target Target instance
			 * @param {Object} oInterface Interface instance
			 * @return {String} - returns sap.ui.mdc.EditMode.Editable, sap.ui.mdc.EditMode.ReadOnly
			 * 					  or expression with path, for example "{= %{HasDraftEntity} ? 'ReadOnly' : 'Editable' }"
			 */
			getParameterEditMode: function(target, oInterface) {
				var oModel = oInterface.context.getModel(),
					sPropertyPath = oInterface.context.getPath(),
					oAnnotations = oModel.getObject(sPropertyPath + "@"),
					fieldControl = oAnnotations["@com.sap.vocabularies.Common.v1.FieldControl"],
					immutable = oAnnotations["@Org.OData.Core.V1.Immutable"],
					computed = oAnnotations["@Org.OData.Core.V1.Computed"];

				if (fieldControl && fieldControl.$Path) {
					if (fieldControl.$Path === "ReadOnly") {
						return sap.ui.mdc.EditMode.ReadOnly;
					} else {
						return (
							"{= %{" +
							fieldControl.$Path +
							"} ? " +
							"'" +
							sap.ui.mdc.EditMode.ReadOnly +
							"'" +
							" : " +
							"'" +
							sap.ui.mdc.EditMode.Editable +
							"'" +
							" }"
						);
					}
				}

				if (fieldControl && fieldControl.$EnumMember) {
					if (fieldControl.$EnumMember === "com.sap.vocabularies.Common.v1.FieldControlType/ReadOnly") {
						return sap.ui.mdc.EditMode.ReadOnly;
					}
				}

				if (immutable || computed) {
					return sap.ui.mdc.EditMode.ReadOnly;
				}

				return sap.ui.mdc.EditMode.Editable;
			},
			/**
			 *  get the complete metapath to the target
			 */
			getMetaPath: function(target, oInterface) {
				return (oInterface && oInterface.context && oInterface.context.getPath()) || undefined;
			},
			getTargetCollection: function(oContext, navCollection) {
				var sPath = oContext.getPath(),
					aParts,
					entitySet,
					navigationCollection;
				if (oContext.getMetadata().getName() === "sap.ui.model.Context" && oContext.getObject("$kind") === "EntitySet") {
					return sPath;
				}
				if (oContext.getModel) {
					sPath =
						(oContext.getModel().getMetaPath && oContext.getModel().getMetaPath(sPath)) ||
						oContext
							.getModel()
							.getMetaModel()
							.getMetaPath(sPath);
				}
				//Supporting sPath of any format, either '/<entitySet>/<navigationCollection>' <OR> '/<entitySet>/$Type/<navigationCollection>'
				aParts = sPath.split("/").filter(function(sPart) {
					return sPart && sPart != "$Type";
				}); //filter out empty strings and parts referring to '$Type'
				entitySet = "/" + aParts[0];
				if (aParts.length === 1) {
					return entitySet;
				}
				navigationCollection = navCollection === undefined ? aParts.slice(1).join("/$NavigationPropertyBinding/") : navCollection;
				return entitySet + "/$NavigationPropertyBinding/" + navigationCollection; // used in gotoTargetEntitySet method in the same file
			},

			isPropertyFilterable: function(property, oInterface, oDataField) {
				var oModel = oInterface.context.getModel(),
					sPropertyPath = oInterface.context.getPath(),
					sEntitySetPath = Helper._getEntitySetPath(oModel, sPropertyPath);

				if (
					oDataField &&
					(oDataField.$Type === "com.sap.vocabularies.UI.v1.DataFieldForAction" ||
						oDataField.$Type === "com.sap.vocabularies.UI.v1.DataFieldForIntentBasedNavigation")
				) {
					return false;
				}

				return CommonUtils.isPropertyFilterable(oModel, sEntitySetPath, property, sPropertyPath);
			},

			formatDraftLockText: function(IsActiveEntity, HasDraftEntity, LockedBy) {
				if (!IsActiveEntity) {
					return ResourceModel.getText("draft.DRAFT_OBJECT");
				} else if (HasDraftEntity) {
					if (LockedBy) {
						return ResourceModel.getText("draft.LOCKED_OBJECT");
					} else {
						return ResourceModel.getText("draft.UNSAVED_CHANGES");
					}
				} else {
					return ""; // not visible
				}
			},

			_getEntitySetPath: function(oModel, sPropertyPath) {
				var iLength;
				var sEntitySetPath = sPropertyPath.slice(0, sPropertyPath.indexOf("/", 1));
				if (oModel.getObject(sEntitySetPath + "/$kind") === "EntityContainer") {
					iLength = sEntitySetPath.length + 1;
					sEntitySetPath = sPropertyPath.slice(iLength, sPropertyPath.indexOf("/", iLength));
				}
				return sEntitySetPath;
			},

			_resolveValueHelpField: function(oContext) {
				// context is a value list property - we need to jump to its value list model to return context to the field
				var oValueListModel = oContext.getModel();
				var oValueListData = oValueListModel.getObject("/");
				return oValueListData.$model
					.getMetaModel()
					.createBindingContext("/" + oValueListData.CollectionPath + "/" + oContext.getObject());
			},
			/**
				Method to fetch the boolean property value from an annotation.
				@param{object} Annotation
				@returns {boolean} Value of the annotation
			 */
			getBoolAnnotationValue: function(oAnnotation) {
				var bValue = oAnnotation || false;
				bValue = bValue === true || (bValue && bValue["Bool"] !== "false");
				return bValue;
			},
			gotoTargetEntitySet: function(oContext) {
				var sPath = Helper.getTargetCollection.call(Helper, oContext);
				return sPath + "/$";
			},
			gotoActionParameter: function(oContext) {
				var sPath = oContext.getPath(),
					sPropertyName = oContext.getObject(sPath + "/$Name");
				var sContext;
				if (sPath.indexOf("@$ui5.overload") > -1) {
					sContext = sPath.split("@$ui5.overload")[0];
				} else {
					// For Unbound Actions in Action Parameter Dialogs
					var aAction = sPath.split("/0/")[0].split(".");
					sContext = "/" + aAction[aAction.length - 1] + "/";
				}
				return sContext + sPropertyName;
			},

			showNavigateErrorMessage: function(oError) {
				sap.m.MessageBox.show(ResourceModel.getText("navigation.ERROR_MESSAGE"), {
					title: ResourceModel.getText("navigation.ERROR_TITLE")
				});
			},

			getLabel: function(oMetadataContext, sPath) {
				sPath = sPath || "";
				return (
					oMetadataContext.getProperty(sPath + "@@sap.ui.model.odata.v4.AnnotationHelper.label") ||
					oMetadataContext.getProperty(sPath + "@com.sap.vocabularies.Common.v1.Label") ||
					oMetadataContext.getProperty(sPath + "/@com.sap.vocabularies.Common.v1.Label") ||
					oMetadataContext.getProperty(sPath + "@sapui.name")
				);
			},

			getIdentifyingName: function(oMetadataContext, bIncludeEntityPath) {
				return (
					(bIncludeEntityPath ? this._getEntitySetPath(oMetadataContext.getModel(), oMetadataContext.getPath()) + "/" : "") +
					(oMetadataContext.getProperty("Value/$Path") ||
						oMetadataContext.getProperty("Target/$AnnotationPath") ||
						oMetadataContext.getProperty("@sapui.name") ||
						(oMetadataContext.getProperty("SemanticObject")
							? "DataFieldForIntentBasedNavigation::" +
							  oMetadataContext.getProperty("SemanticObject") +
							  "::" +
							  oMetadataContext.getProperty("Action")
							: "DataFieldForAction::" + oMetadataContext.getProperty("Action")))
				);
			},

			/**
			 * Returns the entity set name from the entity type name.
			 *
			 * @param {object} oMetaModel - OData v4 metamodel instance
			 * @param {string} sEntity - EntityType of the actiom
			 * @returns {string} - EntitySet of the bound action
			 * @private
			 * @sap-restricted
			 */
			getEntitySetName: function(oMetaModel, sEntityType) {
				var oEntityContainer = oMetaModel.getObject("/");
				for (var key in oEntityContainer) {
					if (typeof oEntityContainer[key] === "object" && oEntityContainer[key].$Type === sEntityType) {
						return key;
					}
				}
			},
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
			getActionPath: function(oAction, bReturnOnlyPath, sActionName, bCheckStaticValue) {
				sActionName = !sActionName ? oAction.getObject(oAction.getPath()) : sActionName;
				var sEntityName = oAction.getPath().split("/@")[0];
				sEntityName = oAction.getObject(sEntityName).$Type;
				sEntityName = this.getEntitySetName(oAction.getModel(), sEntityName);
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
			},
			/**
			 * Helper to get Edit Mode for a DataField or Rating Indicator
			 * @function
			 * @name getEditMode
			 * @memberof sap.fe.macros.CommonHelper
			 * @param  {Object} oAnnotations Object containing all the Annotations of a Field
			 * @param  {String} sDataFieldType Type of the Field
			 * @param  {Object} oFieldControl Object containing FieldControl Type for a Field
			 * @param  {Object} oDraft Object containing Draft Root or Draft Node for a Draft service and for others will be undefined
			 * @param  {String} sEditMode Edit Mode fetched from the parent of the field
			 * @param  {String} sCreateMode Create Mode fetched from the parent of the field. This is used to check if the object is in create mode or edit mode so as to correcltly render the immutable fields
			 * @param  {String} sParentControl Parent control of the Field
			 * @param  {Bool} bReturnBoolean Indicates what should be the return value for the function. For a DataField it should be String and for Rating Indicator it should be Boolean.
			 *  But in some scenarios it can be Expression Binding which will resolve to Bool value during runtime. The Expression Binding is necessary because it consists of the transaction model which cannot be reolved during the templating time.
			 * @param  {String} sSampleSize Sample size for a Rating Indicator
			 * @returns {String/Boolean} the edit Mode
			 * 	A runtime binding or fixed string value for Field
			 *	true/false for Rating Indicator
			 */
			getEditMode: function(
				oAnnotations,
				sDataFieldType,
				oFieldControl,
				oDraft,
				sEditMode,
				sCreateMode,
				sParentControl,
				bReturnBoolean,
				sSampleSize,
				oUoMFieldControl
			) {
				if (sSampleSize) {
					return false;
				}
				if (sEditMode === "Display" || sEditMode === "ReadOnly" || sEditMode === "Disabled") {
					// the edit mode is hardcoded to a non-editable mode so no need to check any annotations
					return sEditMode;
				}
				var bComputed,
					bImmutable,
					sSemiExpression,
					sExpression,
					bDisplayOnly,
					sCheckUiEditMode,
					sFieldControlForUoM,
					sEditableReadOnly,
					bCanCreateProperty,
					sIsFieldControlPathReadOnly,
					sIsFieldControlPathDisabled;
				if (
					sDataFieldType === "com.sap.vocabularies.UI.v1.DataFieldWithUrl" ||
					(oAnnotations &&
						oAnnotations["@com.sap.vocabularies.Common.v1.SemanticObject"] &&
						!(
							oAnnotations["@com.sap.vocabularies.Common.v1.ValueListReferences"] ||
							oAnnotations["@com.sap.vocabularies.Common.v1.ValueListMapping"] ||
							oAnnotations["@com.sap.vocabularies.Common.v1.ValueList"] ||
							oAnnotations["@com.sap.vocabularies.Common.v1.ValueListWithFixedValues"]
						))
				) {
					return "Display";
				}
				if (oAnnotations && oAnnotations["@Org.OData.Core.V1.Computed"]) {
					bComputed = oAnnotations["@Org.OData.Core.V1.Computed"].Bool
						? oAnnotations["@Org.OData.Core.V1.Computed"].Bool == "true"
						: true;
				}
				if (oAnnotations && oAnnotations["@Org.OData.Core.V1.Immutable"]) {
					bImmutable = oAnnotations["@Org.OData.Core.V1.Immutable"].Bool
						? oAnnotations["@Org.OData.Core.V1.Immutable"].Bool == "true"
						: true;
				}
				bDisplayOnly = bComputed || bImmutable;
				if (sCreateMode && sCreateMode.indexOf("{") === 0) {
					sCreateMode = "$" + sCreateMode;
				}
				bCanCreateProperty = typeof bComputed === "undefined" ? typeof bImmutable === "undefined" || bImmutable : !bComputed;
				if (oFieldControl) {
					if (oFieldControl.indexOf("{") === 0) {
						sIsFieldControlPathReadOnly = "$" + oFieldControl + " === '1'";
						sIsFieldControlPathDisabled = "$" + oFieldControl + " === '0'";
					} else {
						bDisplayOnly = bDisplayOnly || oFieldControl == "com.sap.vocabularies.Common.v1.FieldControlType/ReadOnly";
					}
				}
				var sEditableExpression;
				var sDisplayOrReadOnly;
				var sDisplayOrDisabled;
				var sFieldControlDisplayOrReadOnly;

				if (sIsFieldControlPathReadOnly) {
					sFieldControlDisplayOrReadOnly =
						sEditMode === "Editable" ? "'ReadOnly'" : "$" + sEditMode + " === 'Editable' ? 'ReadOnly'  : 'Display'";
					if (bCanCreateProperty) {
						sDisplayOrReadOnly =
							sEditMode === "Editable"
								? sCreateMode + " ? 'Editable' : 'ReadOnly'"
								: "$" + sEditMode + " === 'Editable' ? " + sCreateMode + "? 'Editable' : 'ReadOnly'  : 'Display'";
						sDisplayOrDisabled =
							sEditMode === "Editable" ? "'Disabled'" : "$" + sEditMode + " === 'Editable' ? 'Disabled' : 'Display'";
					} else {
						sDisplayOrReadOnly =
							sEditMode === "Editable" ? "'ReadOnly'" : "$" + sEditMode + " === 'Editable' ? 'ReadOnly' : 'Display'";
						sDisplayOrDisabled =
							sEditMode === "Editable" ? "'Disabled'" : "$" + sEditMode + " === 'Editable' ? 'Disabled' : 'Display'";
					}
				} else {
					sDisplayOrReadOnly = "'Display'";
					sDisplayOrDisabled = "'Display'";
					sFieldControlDisplayOrReadOnly = "'Display'";
				}
				sCheckUiEditMode = sEditMode && sEditMode.indexOf("{") === 0 ? "$" + sEditMode : "'" + sEditMode + "'";
				if (bDisplayOnly) {
					if (!bCanCreateProperty) {
						if (sEditMode && sEditMode.indexOf("{") === 0) {
							return bReturnBoolean ? false : "{= " + sDisplayOrReadOnly + "}";
						}
						sDisplayOrReadOnly = sDisplayOrReadOnly.split("'") && sDisplayOrReadOnly.split("'")[1];
						return bReturnBoolean ? false : sDisplayOrReadOnly;
					} else {
						if (sIsFieldControlPathReadOnly) {
							if (sCreateMode && sCreateMode.indexOf("$") === 0) {
								return (
									"{= " +
									sCreateMode +
									" ? (" +
									sIsFieldControlPathDisabled +
									"? " +
									(bReturnBoolean ? false : "'Disabled'") +
									" : " +
									sIsFieldControlPathReadOnly +
									"? " +
									(bReturnBoolean ? false : "'ReadOnly'") +
									" : " +
									(bReturnBoolean ? "${ui>/editMode} === 'Editable'" : sCheckUiEditMode) +
									") : " +
									(bReturnBoolean ? false : sDisplayOrReadOnly) +
									"}"
								);
							} else if (sCreateMode == "true") {
								return (
									"{= " +
									sIsFieldControlPathDisabled +
									"? " +
									(bReturnBoolean ? false : "'Disabled'") +
									" : " +
									sIsFieldControlPathReadOnly +
									"? " +
									(bReturnBoolean ? false : "'ReadOnly'") +
									" : " +
									(bReturnBoolean ? "${ui>/editMode} === 'Editable'" : sCheckUiEditMode) +
									"}"
								);
							} else {
								return bReturnBoolean ? false : "{= " + sDisplayOrReadOnly + "}";
							}
						} else if (oFieldControl == "com.sap.vocabularies.Common.v1.FieldControlType/ReadOnly") {
							sCheckUiEditMode = "'ReadOnly'";
						}
						if (sCreateMode && sCreateMode.indexOf("$") === 0) {
							return (
								"{= " +
								sCreateMode +
								" ?" +
								(bReturnBoolean ? "${ui>/editMode} === 'Editable'" : sCheckUiEditMode) +
								" : " +
								(bReturnBoolean ? false : sDisplayOrReadOnly) +
								"}"
							);
						} else if (sCreateMode == "true") {
							return "{= " + (bReturnBoolean ? "${ui>/editMode} === 'Editable'" : sCheckUiEditMode) + "}";
						} else {
							return bReturnBoolean ? false : "{= " + sDisplayOrReadOnly + "}";
						}
					}
				}
				if (sIsFieldControlPathReadOnly) {
					if (oUoMFieldControl) {
						sCheckUiEditMode = "$" + oUoMFieldControl + " === '1' ? 'EditableReadOnly' : " + sCheckUiEditMode;
					}
					sSemiExpression =
						sIsFieldControlPathDisabled +
						" ? " +
						(bReturnBoolean ? false : sDisplayOrDisabled) +
						" :" +
						sIsFieldControlPathReadOnly +
						" ? " +
						(bReturnBoolean ? false : sFieldControlDisplayOrReadOnly) +
						" :" +
						(bReturnBoolean ? "${ui>/editMode} === 'Editable'" : sCheckUiEditMode);
					sEditableExpression = "{= " + sSemiExpression + "}";
				} else if (oUoMFieldControl) {
					sFieldControlForUoM = "$" + oUoMFieldControl + " === '1'";
					sEditableReadOnly =
						sEditMode === "Editable"
							? "'EditableReadOnly'"
							: "$" + sEditMode + " === 'Editable' ? 'EditableReadOnly' : 'Display'";
					sSemiExpression = sFieldControlForUoM + " ? " + sEditableReadOnly + " :" + sCheckUiEditMode;
					sEditableExpression = "{= " + sSemiExpression + "}";
				} else {
					sSemiExpression = sCheckUiEditMode;
					sEditableExpression = bReturnBoolean ? "{= ${ui>/editMode} === 'Editable'}" : sEditMode;
				}
				var sExpressionForCreatemode;
				if (sCreateMode && sCreateMode.indexOf("$") === 0) {
					sExpressionForCreatemode =
						"{= " + sCreateMode + " ? " + (bReturnBoolean ? false : sDisplayOrReadOnly) + " : " + sSemiExpression + "}";
				} else if (sCreateMode == "true") {
					sExpressionForCreatemode = bReturnBoolean ? false : "{= " + sDisplayOrReadOnly + "}";
				} else {
					sExpressionForCreatemode = "{= " + sSemiExpression + "}";
				}
				sExpression = bCanCreateProperty ? sEditableExpression : sExpressionForCreatemode;
				return sExpression;
			},
			getNavigationContext: function(oContext) {
				return ODataModelAnnotationHelper.getNavigationPath(oContext.getPath());
			},
			/**
			 * Method to get the Hidden Value Expression property from a DataField or a DataFieldforAnnotation
			 * 1. If UI.Hidden has '$Path', then we take the value at '$Path' directly for same entity set.
			 * 2. Else, value at navigationEntity then check if it is 1:1 assosciation for the entityset and allow to take the correspoind '$Path'
			 * @param {Object} oDataField - context from which DataField needs to be extracted.
			 * @param {Object} oDetails - context from which EntitySet needs to be extracted.
			 * @return {String/Boolean} - if Hidden is a path string is been returned if the association is not collection then it returns true by default
			 */
			getHiddenPathExpression: function(oDataField, oDetails) {
				var oContext = oDetails.context,
					sHiddenExpression,
					sPropertyPath = oContext.getPath(),
					sEntitySetPath = ODataModelAnnotationHelper.getNavigationPath(sPropertyPath),
					sHiddenPath,
					sPropertyHiddenPath;
				// get sHiddenPath at DataField Level
				if (oContext.getObject(sPropertyPath + "@com.sap.vocabularies.UI.v1.Hidden")) {
					sHiddenPath = oContext.getObject(sPropertyPath + "@com.sap.vocabularies.UI.v1.Hidden");
				} else {
					// get sHiddenPath at referenced Property Level
					if (sPropertyPath.lastIndexOf("/") === sPropertyPath.length - 1) {
						sPropertyHiddenPath = "Value/$Path@com.sap.vocabularies.UI.v1.Hidden";
					} else {
						sPropertyHiddenPath = "/Value/$Path@com.sap.vocabularies.UI.v1.Hidden";
					}
					sHiddenPath = oContext.getObject(sPropertyPath + sPropertyHiddenPath);
				}
				if (sHiddenPath) {
					if (sHiddenPath.$Path) {
						if (sHiddenPath.$Path.indexOf("/") > 0) {
							var sNavigationPath = sHiddenPath.$Path.split("/")[0];
							if (
								oContext.getObject(sEntitySetPath + "/" + sNavigationPath) &&
								!oContext.getObject(sEntitySetPath + "/" + sNavigationPath).$isCollection
							) {
								sHiddenExpression = "%{" + sHiddenPath.$Path + "}";
							} else {
								return true;
							}
						} else {
							sHiddenExpression = "%{" + sHiddenPath.$Path + "}";
						}
						return "{= " + sHiddenExpression + "=== true ? false : true }";
					} else {
						return "{= " + sHiddenPath + "=== true ? false : true }";
					}
				}
				return true;
			},
			/**
			 * Returns the metamodel path correctly for bound actions. For unbound actions,
			 * incorrect path is returned but during templating it is ignored.
			 * e.g. for bound action someNameSpace.SomeBoundAction of entity set SomeEntitySet,
			 * the string "/SomeEntitySet/someNameSpace.SomeBoundAction" is returned.
			 * @function
			 * @static
			 * @name sap.fe.macros.CommonHelper.getActionContext
			 * @memberof sap.fe.macros.CommonHelper
			 * @param {object} oAction - context object for the action
			 * @returns {string} - Correct metamodel path for bound and incorrect path for unbound actions
			 * @private
			 * @sap-restricted
			 **/
			getActionContext: function(oAction) {
				return Helper.getActionPath(oAction, true);
			},
			/**
			 * Returns the metamodel path correctly for overloaded bound actions. For unbound actions,
			 * incorrect path is returned but during templating it is ignored.
			 * e.g. for bound action someNameSpace.SomeBoundAction of entity set SomeEntitySet,
			 * the string "/SomeEntitySet/someNameSpace.SomeBoundAction/@$ui5.overload/0" is returned.
			 * @function
			 * @static
			 * @name sap.fe.macros.CommonHelper.getPathToBoundActionOverload
			 * @memberof sap.fe.macros.CommonHelper
			 * @param {object} oAction - context object for the action
			 * @returns {string} - Correct metamodel path for bound action overload and incorrect path for unbound actions
			 * @private
			 * @sap-restricted
			 **/
			getPathToBoundActionOverload: function(oAction) {
				var sPath = Helper.getActionPath(oAction, true);
				return sPath + "/@$ui5.overload/0";
			}
		};

		Helper.isPropertyFilterable.requiresIContext = true;

		return Helper;
	},
	/* bExport= */ true
);
