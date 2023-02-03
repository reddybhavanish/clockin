/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2017 SAP SE. All rights reserved
    
 */
sap.ui.define(
	[
		"sap/fe/macros/ResourceModel",
		"sap/fe/macros/CommonHelper",
		"sap/fe/core/CommonUtils",
		"sap/ui/mdc/odata/v4/FieldBaseDelegate",
		"sap/ui/model/odata/v4/AnnotationHelper",
		"sap/ui/base/ManagedObject",
		"sap/base/Log",
		"sap/base/strings/formatMessage",
		"sap/ui/model/json/JSONModel",
		"sap/ui/mdc/condition/FilterOperatorUtil"
	],
	function(
		ResourceModel,
		CommonHelper,
		CommonUtils,
		FieldBaseDelegate,
		AnnotationHelper,
		ManagedObject,
		Log,
		formatMessage,
		JSONModel,
		FilterOperatorUtil
	) {
		"use strict";

		var ISOCurrency = "@Org.OData.Measures.V1.ISOCurrency",
			Unit = "@Org.OData.Measures.V1.Unit",
			UNIT_ANNOTATIONS = {},
			COMMA = ", ";

		UNIT_ANNOTATIONS[ISOCurrency] = {
			ui5Type: "sap.ui.model.type.Currency",
			formatOptions: "parseAsString : true"
		};

		/**
		 * What does the map look like?
		 * 	{
		 *  	'namespace.of.entityType' : [
		 * 			[namespace.of.entityType1#Qualifier,namespace.of.entityType2#Qualifier], --> Search For: mappingSourceEntities
		 * 			{
		 * 				'property' : [namespace.of.entityType3#Qualifier,namespace.of.entityType4#Qualifier] --> Search For: mappingSourceProperties
		 * 			}
		 * 	}
		 * @param {Object} oInterface Interface instance
		 * @returns {Promise} Promise resolved when the map is ready and provides the map
		 */
		function _generateSideEffectsMap(oInterface) {
			var oMetaModel = oInterface.getModel(),
				oFieldSettings = oInterface.getSetting("sap.fe.macros.Field"),
				oSideEffects = oFieldSettings.sideEffects;

			// Generate map once
			if (oSideEffects) {
				return Promise.resolve(oSideEffects);
			}

			oSideEffects = {};
			return oMetaModel.requestObject("/$").then(function(oEverything) {
				var // just get the entity types
					fnFilterEntityTypes = function(sKey) {
						return oEverything[sKey]["$kind"] === "EntityType";
					},
					// map each side effect
					fnMapSideEffect = function(sEntityType, sSideEffectAnnotation, oSideEffectAnnotation) {
						var sQualifier =
								(sSideEffectAnnotation.indexOf("#") > -1 &&
									sSideEffectAnnotation.substr(sSideEffectAnnotation.indexOf("#"))) ||
								"",
							aSourceProperties = oSideEffectAnnotation.SourceProperties || [],
							aSourceEntities = oSideEffectAnnotation.SourceEntities || [],
							// for each source property, source entity, there could be a oMetaModel.requestObject(...) to get the target entity type of the navigation involved
							aPromises = [];
						aSourceProperties.forEach(function(oSourceProperty) {
							var sPath = oSourceProperty["$PropertyPath"],
								// if the property path has a navigation, get the target entity type of the navigation
								sNavigationPath =
									sPath.indexOf("/") > 0
										? "/" + sEntityType + "/" + sPath.substr(0, sPath.lastIndexOf("/") + 1) + "@sapui.name"
										: false,
								pOwnerEntity = !sNavigationPath ? Promise.resolve(sEntityType) : oMetaModel.requestObject(sNavigationPath);

							sPath = sNavigationPath ? sPath.substr(sPath.lastIndexOf("/") + 1) : sPath;

							aPromises.push(
								pOwnerEntity.then(function(sOwnerEntityType) {
									oSideEffects[sOwnerEntityType] = oSideEffects[sOwnerEntityType] || [[], {}];
									oSideEffects[sOwnerEntityType][1][sPath] = oSideEffects[sOwnerEntityType][1][sPath] || [];
									// if there is only one source property, side effect request is required immediately
									oSideEffects[sOwnerEntityType][1][sPath].push(
										sEntityType + sQualifier + ((aSourceProperties.length === 1 && "$$ImmediateRequest") || "")
									); // --> mappingSourceProperties
								})
							);
						});
						aSourceEntities.forEach(function(oSourceEntity) {
							var sNavigationPath = oSourceEntity["$NavigationPropertyPath"],
								pOwnerEntity;
							// Source entities will have an empty path, meaning same as the target entity type of the side effect annotation
							// or will always have navigation, get target entity for this navigation path
							if (sNavigationPath === "") {
								pOwnerEntity = Promise.resolve(sEntityType);
							} else {
								pOwnerEntity = oMetaModel.requestObject("/" + sEntityType + "/" + sNavigationPath + "/@sapui.name");
							}
							aPromises.push(
								pOwnerEntity.then(function(sOwnerEntityType) {
									oSideEffects[sOwnerEntityType] = oSideEffects[sOwnerEntityType] || [[], {}];
									// side effects for fields referenced via source entities must always be requested immediately
									oSideEffects[sOwnerEntityType][0].push(sEntityType + sQualifier + "$$ImmediateRequest"); // --> mappingSourceEntities
								})
							);
						});
						// returned promise is resolved when all the source properties and source entities of the side effect have been mapped
						return Promise.all(aPromises);
					},
					// map each entity type which has side effects annotated
					fnMapEntityType = function(sEntityType) {
						return oMetaModel.requestObject("/" + sEntityType + "@").then(function(oAnnotations) {
							var aSideEffects = Object.keys(oAnnotations)
								.filter(function(sAnnotation) {
									return sAnnotation.indexOf("@com.sap.vocabularies.Common.v1.SideEffects") > -1;
								})
								.map(function(sSideEffectAnnotation) {
									return fnMapSideEffect(sEntityType, sSideEffectAnnotation, oAnnotations[sSideEffectAnnotation]);
								});
							// returned promise is resolved when all the side effects annotated on this entity type have been mapped
							return Promise.all(aSideEffects);
						});
					};
				// get everything --> filter the entity types which have side effects annotated --> map each side effect --> then return the map
				// returned promise is resolved when the map is ready
				return Promise.all(
					Object.keys(oEverything)
						.filter(fnFilterEntityTypes)
						.map(fnMapEntityType)
				).then(function() {
					oFieldSettings.sideEffects = oSideEffects;
					return oSideEffects;
				});
			});
		}

		// UNIT_ANNOTATIONS[Unit] = {
		// 	ui5Type: "sap.ui.model.type.Unit",
		// 	formatOptions: ""
		// };
		/**
		 * Helper class used by MDC controls for OData(V4) specific handling
		 *
		 * @private
		 * @experimental This module is only for internal/experimental use!
		 */
		var FieldHelper = {
			getFieldDisplay: function(
				oAnnotations,
				sDataFieldType,
				oFieldControl,
				oDraft,
				sEditMode,
				sCreateMode,
				sParentControl,
				oCollectionAnnotations,
				bFieldHelpExists
			) {
				var sDisplayValue = "",
					sFieldEditMode = "";
				if (bFieldHelpExists) {
					return FieldHelper.displayMode(oAnnotations, oCollectionAnnotations);
				} else {
					sFieldEditMode = CommonHelper.getEditMode(
						oAnnotations,
						sDataFieldType,
						oFieldControl,
						oDraft,
						sEditMode,
						sCreateMode,
						sParentControl,
						false,
						undefined,
						undefined
					);
					if (sFieldEditMode === "Editable") {
						return "Value";
					} else {
						sDisplayValue = FieldHelper.displayMode(oAnnotations, oCollectionAnnotations);
						if (ManagedObject.bindingParser(sFieldEditMode)) {
							if (!sFieldEditMode.startsWith("{=")) {
								return "{= $" + sFieldEditMode + " === 'Editable' ? 'Value' : '" + sDisplayValue + "' }";
							}
							//when sEditMode has an expression {= <some exp> }, starting '{=' and ending '}' are removed and only the expression is considered.
							return (
								"{= (" +
								sFieldEditMode.slice(2, sFieldEditMode.length - 1).trim() +
								") === 'Editable' ? 'Value' : '" +
								sDisplayValue +
								"' }"
							);
						}
						// at best #TextOnly is considered for TextArrangment in an value help table
						if (sDisplayValue !== "Description" && sParentControl === "VHTable") {
							sDisplayValue = "Value";
						}
						return sDisplayValue;
					}
				}
			},

			/**
			 * Determine how to show the value by analyzing Text and TextArrangement Annotations
			 *
			 * @function
			 * @name sap.fe.macros.field.FieldHelper#displayMode
			 * @memberof sap.fe.macros.field.FieldHelper
			 * @static
			 * @param {object} oPropertyAnnotations property type annotations
			 * @param {object} oCollectionAnnotations entity type annotations
			 * @returns {String} display mode of the field
			 * @private
			 * @sap-restricted
			 **/
			displayMode: function(oPropertyAnnotations, oCollectionAnnotations) {
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
			},
			//FilterField
			isRequiredInFilter: function(path, oDetails) {
				var sEntitySetPath,
					sProperty,
					bIsRequired = false,
					oFilterRestrictions,
					oModel = oDetails.context.getModel(),
					sPropertyPath = oDetails.context.getPath();

				sEntitySetPath = CommonHelper._getEntitySetPath(oModel, sPropertyPath);
				if (typeof path === "string") {
					sProperty = path;
				} else {
					sProperty = oModel.getObject(sPropertyPath + "@sapui.name");
				}
				oFilterRestrictions = oModel.getObject(sEntitySetPath + "@Org.OData.Capabilities.V1.FilterRestrictions");
				if (oFilterRestrictions && oFilterRestrictions.RequiredProperties) {
					bIsRequired = oFilterRestrictions.RequiredProperties.some(function(property) {
						return property.$PropertyPath === sProperty;
					});
				}
				return bIsRequired;
			},
			maxConditions: function(path, oDetails) {
				var sEntitySetPath,
					sProperty,
					oFilterRestrictions,
					maxConditions = -1,
					oModel = oDetails.context.getModel(),
					sPropertyPath = oDetails.context.getPath();

				sEntitySetPath = CommonHelper._getEntitySetPath(oModel, sPropertyPath);
				if (typeof path === "string") {
					sProperty = path;
				} else {
					sProperty = oModel.getObject(sPropertyPath + "@sapui.name");
				}
				oFilterRestrictions = oModel.getObject(sEntitySetPath + "@Org.OData.Capabilities.V1.FilterRestrictions");
				var oProperty = oModel.getObject(sEntitySetPath + "/" + sProperty);
				if (!oProperty) {
					oProperty = oModel.getObject(sPropertyPath);
				}
				if (oProperty.$Type === "Edm.Boolean") {
					maxConditions = 1;
				} else if (
					oFilterRestrictions &&
					oFilterRestrictions.FilterExpressionRestrictions &&
					oFilterRestrictions.FilterExpressionRestrictions.some(function(property) {
						return (
							property.Property.$PropertyPath === sProperty &&
							(property.AllowedExpressions === "SingleValue" || property.AllowedExpressions === "SingleRange")
						);
					})
				) {
					maxConditions = 1;
				}
				return maxConditions;
			},
			buildExpressionForCriticalityIcon: function(sCriticalityProperty) {
				if (sCriticalityProperty) {
					var sExpression =
						"{= (${" +
						sCriticalityProperty +
						"} === 'com.sap.vocabularies.UI.v1.CriticalityType/Negative') || (${" +
						sCriticalityProperty +
						"} === '1') || (${" +
						sCriticalityProperty +
						"} === 1) ? 'sap-icon://status-negative' : " +
						"(${" +
						sCriticalityProperty +
						"} === 'com.sap.vocabularies.UI.v1.CriticalityType/Critical') || (${" +
						sCriticalityProperty +
						"} === '2') || (${" +
						sCriticalityProperty +
						"} === 2) ? 'sap-icon://status-critical' : " +
						"(${" +
						sCriticalityProperty +
						"} === 'com.sap.vocabularies.UI.v1.CriticalityType/Positive') || (${" +
						sCriticalityProperty +
						"} === '3') || (${" +
						sCriticalityProperty +
						"} === 3) ? 'sap-icon://status-positive' : " +
						"'sap-icon://status-inactive' }";

					return sExpression;
				}
				return undefined;
			},

			buildExpressionForCriticalityColor: function(oDataPoint) {
				var sFormatCriticalityExpression = sap.ui.core.ValueState.None;
				var sExpressionTemplate;
				var oCriticalityProperty = oDataPoint.Criticality;

				if (oCriticalityProperty) {
					sExpressionTemplate =
						"'{'= ({0} === ''com.sap.vocabularies.UI.v1.CriticalityType/Negative'') || ({0} === ''1'') || ({0} === 1) ? ''" +
						sap.ui.core.ValueState.Error +
						"'' : " +
						"({0} === ''com.sap.vocabularies.UI.v1.CriticalityType/Critical'') || ({0} === ''2'') || ({0} === 2) ? ''" +
						sap.ui.core.ValueState.Warning +
						"'' : " +
						"({0} === ''com.sap.vocabularies.UI.v1.CriticalityType/Positive'') || ({0} === ''3'') || ({0} === 3) ? ''" +
						sap.ui.core.ValueState.Success +
						"'' : " +
						"''" +
						sap.ui.core.ValueState.None +
						"'' '}'";
					if (oCriticalityProperty.$Path) {
						var sCriticalitySimplePath = "${" + oCriticalityProperty.$Path + "}";
						sFormatCriticalityExpression = formatMessage(sExpressionTemplate, sCriticalitySimplePath);
					} else if (oCriticalityProperty.$EnumMember) {
						var sCriticality = "'" + oCriticalityProperty.$EnumMember + "'";
						sFormatCriticalityExpression = formatMessage(sExpressionTemplate, sCriticality);
					} else {
						Log.warning("Case not supported, returning the default sap.ui.core.ValueState.None");
					}
				} else {
					// Any other cases are not valid, the default value of 'None' will be returned
					Log.warning("Case not supported, returning the default sap.ui.core.ValueState.None");
				}

				return sFormatCriticalityExpression;
			},
			buildExpressionForTextValue: function(sPropertyPath, oDataField) {
				var oMetaModel = oDataField.context.getModel(),
					sPath = oDataField.context.getPath(),
					oTextAnnotationContext = oMetaModel.createBindingContext(sPath + "@com.sap.vocabularies.Common.v1.Text"),
					oTextAnnotation = oTextAnnotationContext.getProperty(),
					sTextExpression = oTextAnnotation
						? AnnotationHelper.value(oTextAnnotation, { context: oTextAnnotationContext })
						: undefined,
					sExpression = "";

				sPropertyPath = AnnotationHelper.getNavigationPath(sPropertyPath);
				if (sPropertyPath.indexOf("/") > -1 && sTextExpression) {
					sExpression =
						"{" +
						sPropertyPath.substr(0, sPropertyPath.indexOf("/") + 1) +
						sTextExpression.substr(1, sTextExpression.length - 2) +
						"}";
				} else {
					sExpression = sTextExpression;
				}
				if (sExpression) {
					sExpression = "{ path : '" + sExpression.substr(1, sExpression.length - 2) + "', parameters: {'$$noPatch': true}}";
				}

				return sExpression;
			},
			_buildExpressionForTextProperty: function(sPropertyPath, oInterface) {
				var oMetaModel = oInterface.context.getModel(),
					sPath = oInterface.context.getPath(), // "/RootEntity/_Navigation1/_Navigation2/Property"
					aPaths = sPath.split("/"),
					oTextAnnotationContext = oMetaModel.createBindingContext(sPath + "@com.sap.vocabularies.Common.v1.Text"),
					oTextAnnotation = oTextAnnotationContext.getProperty(),
					sTextExpression = oTextAnnotation
						? AnnotationHelper.value(oTextAnnotation, { context: oTextAnnotationContext })
						: undefined,
					sExpression = "";

				if (sTextExpression) {
					sExpression = sTextExpression;
					sTextExpression = sTextExpression.substr(1, sTextExpression.length - 2);
					if (aPaths.length > 2) {
						aPaths.shift(); // remove ""
						aPaths.shift(); // remove "RootEntity"
						aPaths.pop(); // remove "Property"
						sExpression = "{" + (aPaths.length > 0 ? aPaths.join("/") + "/" : "") + sTextExpression + "}";
					}
				}

				if (sExpression) {
					sExpression = "{ path : '" + sExpression.substr(1, sExpression.length - 2) + "', parameters: {'$$noPatch': true}}";
				}

				return sExpression;
			},
			isNotAlwaysHidden: function(oDataField, oDetails) {
				var oContext = oDetails.context,
					isAlwaysHidden = false;
				if (oDataField.Value && oDataField.Value.$Path) {
					isAlwaysHidden = oContext.getObject("Value/$Path@com.sap.vocabularies.UI.v1.Hidden");
				}
				if (!isAlwaysHidden || isAlwaysHidden.$Path) {
					isAlwaysHidden = oContext.getObject("@com.sap.vocabularies.UI.v1.Hidden");
					if (!isAlwaysHidden || isAlwaysHidden.$Path) {
						isAlwaysHidden = false;
					}
				}
				return !isAlwaysHidden;
			},
			isSemanticKey: function(aSemanticKeys, oValue) {
				return (
					(oValue &&
						aSemanticKeys &&
						!aSemanticKeys.every(function(oKey) {
							return oKey["$PropertyPath"] !== oValue["$Path"];
						})) ||
					false
				);
			},
			isLineItem: function(oProperty, oInterface) {
				if (oInterface.context.getPath().indexOf("@com.sap.vocabularies.UI.v1.LineItem") > -1) {
					return true;
				}
				return false;
			},
			getRequiredForDataField: function(oFieldControl, sEditMode) {
				var sEditExpression;
				if (sEditMode === "Display" || sEditMode === "ReadOnly" || sEditMode === "Disabled") {
					return false;
				}
				//sEditMode returns Binding in few cases hence resolving the binding
				if (oFieldControl && sEditMode) {
					if (sEditMode.indexOf("{") > -1) {
						sEditExpression = "%" + sEditMode + " === 'Editable'";
					}
					if (oFieldControl.indexOf("{") > -1) {
						var sExpression = "%" + oFieldControl + " === 7";
						return sEditMode === "Editable" ? "{=" + sExpression + "}" : "{= " + sExpression + " && " + sEditExpression + "}";
					} else {
						return sEditMode === "Editable"
							? oFieldControl == "com.sap.vocabularies.Common.v1.FieldControlType/Mandatory"
							: oFieldControl == "com.sap.vocabularies.Common.v1.FieldControlType/Mandatory" && "{= " + sEditExpression + "}";
					}
				}
				return false;
			},
			isRequired: function(oFieldControl, sEditMode) {
				if (sEditMode === "Display" || sEditMode === "ReadOnly" || sEditMode === "Disabled") {
					return false;
				}
				if (oFieldControl) {
					if (ManagedObject.bindingParser(oFieldControl)) {
						var sExpression = "{= %" + oFieldControl + " === 7}";
						return sExpression;
					} else {
						return oFieldControl == "com.sap.vocabularies.Common.v1.FieldControlType/Mandatory";
					}
				}
				return false;
			},

			_getDraftAdministrativeDataType: function(oMetaModel, sEntityType) {
				return oMetaModel.requestObject("/" + sEntityType + "/DraftAdministrativeData/");
			},

			getBindingForDraftAdminBlockInline: function(iContext, sEntityType) {
				return FieldHelper._getDraftAdministrativeDataType(iContext.getModel(), sEntityType).then(function(oDADEntityType) {
					var aBindings = [];

					if (oDADEntityType.InProcessByUserDescription) {
						aBindings.push("${DraftAdministrativeData/InProcessByUserDescription}");
					}

					aBindings.push("${DraftAdministrativeData/InProcessByUser}");

					if (oDADEntityType.LastChangedByUserDescription) {
						aBindings.push("${DraftAdministrativeData/LastChangedByUserDescription}");
					}

					aBindings.push("${DraftAdministrativeData/LastChangedByUser}");

					return "{= %{HasDraftEntity} ? (" + aBindings.join(" || ") + ") : '' }";
				});
			},

			getBindingForDraftAdminBlockInPopover: function(iContext, sEntityType) {
				return FieldHelper._getDraftAdministrativeDataType(iContext.getModel(), sEntityType).then(function(oDADEntityType) {
					var sBinding =
						"{parts: [{path: 'HasDraftEntity', targetType: 'any'}, " +
						//"{path: 'DraftAdministrativeData/LastChangeDateTime'}, " +
						"{path: 'DraftAdministrativeData/InProcessByUser'}, " +
						"{path: 'DraftAdministrativeData/LastChangedByUser'} ";
					if (oDADEntityType.InProcessByUserDescription) {
						sBinding += " ,{path: 'DraftAdministrativeData/InProcessByUserDescription'}";
					}

					if (oDADEntityType.LastChangedByUserDescription) {
						sBinding += ", {path: 'DraftAdministrativeData/LastChangedByUserDescription'}";
					}
					sBinding += "], formatter: 'sap.fe.macros.field.FieldRuntime.formatDraftOwnerTextInPopover'}";
					return sBinding;
				});
			},

			/**
			 * Computed annotation that returns vProperty for a string and @sapui.name for an object
			 * @param {*} vProperty The property
			 * @param {object} oInterface The interface instance
			 * @returns {string} The property name
			 */
			propertyName: function(vProperty, oInterface) {
				var sPropertyName;
				if (typeof vProperty === "string") {
					sPropertyName = vProperty;
				} else if (vProperty.$Path || vProperty.$PropertyPath) {
					var sPath = vProperty.$Path ? "/$Path" : "/$PropertyPath";
					var sContextPath = oInterface.context.getPath();
					sPropertyName = oInterface.context.getObject(sContextPath + sPath + "/$@sapui.name");
				} else {
					sPropertyName = oInterface.context.getObject("@sapui.name");
				}

				return sPropertyName;
			},

			/**
			 * To Create binding for mdc:filterfield conditions.
			 *
			 * @param {Object} iContext interface with context to the path to be considered for binding
			 * @param {Object} vProperty property path for conditions bindings
			 * @param {String} sEntitySet to check collection
			 * @param {String} sFieldPath field path for conditions bindings
			 * @return {String} Expression binding for conditions for the field
			 */
			getConditionsBinding: function(iContext, vProperty, sEntitySet, sFieldPath) {
				var oMetaModel = iContext.getInterface(0).getModel();
				if (!sFieldPath) {
					sFieldPath =
						typeof vProperty === "string"
							? vProperty
							: FieldHelper.propertyName(vProperty, {
									context: oMetaModel.createBindingContext(iContext.getInterface(0).getPath())
							  });
				}

				// This is to handle navigation properties in case of collection(1-n).
				if (sFieldPath.indexOf("/") > -1) {
					var bToAnyFound,
						aSections = sFieldPath.split("/");
					for (var i = 0; i < aSections.length - 1; i++) {
						var oProperty = oMetaModel.getObject("/" + sEntitySet + "/" + aSections.slice(0, i + 1).join("/"));

						if (oProperty && oProperty.$kind === "NavigationProperty" && oProperty.$isCollection) {
							aSections[i] = aSections[i] + "*";
							bToAnyFound = true;
						}
					}
					if (bToAnyFound) {
						sFieldPath = aSections.join("/");
					}
				}

				return "{$filters>/conditions/" + sFieldPath + "}";
			},

			typeConstraints: function(oProperty, oPropertyAnnotations) {
				var sConstraints = "",
					iMaxLength,
					sType = oProperty.$Type;

				// nullable allows to set mandatory independent of the control
				sConstraints += oProperty.$Nullable !== undefined && !oProperty.$Nullable ? "nullable: " + oProperty.$Nullable : "";
				if (["Edm.Decimal", "Edm.DateTimeOffset"].indexOf(sType) > -1) {
					//Scale and Precision are compatible to sap.ui.model.odata.type.Decimal
					sConstraints += oProperty.$Precision ? (sConstraints ? COMMA : "") + "precision: " + oProperty.$Precision : ""; //TODO: check if COMMA is needed
					sConstraints += oProperty.$Scale
						? (sConstraints ? COMMA : "") + //do we need a comma
						  "scale: " +
						  (oProperty.$Scale === "variable" ? "'" + oProperty.$Scale + "'" : oProperty.$Scale)
						: "";
				} else if (sType === "Edm.String") {
					iMaxLength = oProperty.$MaxLength;
					if (iMaxLength) {
						sConstraints += sConstraints ? COMMA : ""; //do we need a comma
						sConstraints += "maxLength: " + iMaxLength;
					}

					if (oPropertyAnnotations["@com.sap.vocabularies.Common.v1.IsUpperCase"]) {
						//TODO this can't be done through binding as far as I know until sap.ui.model.odata.type.String
						//string enables a corresponding formatOption
					}
				}
				return sConstraints;
			},
			value: function(oProperty, oInterface) {
				var oContext = oInterface.context,
					oRealProperty = oContext.getObject("./$"),
					sMainProperty = typeof oProperty === "string" ? oProperty : oProperty.$Name || oContext.getObject("./$@sapui.name"),
					oPropertyAnnotations = oContext.getObject("@");

				//Always be ready for async usage
				return Promise.resolve().then(function(aValues) {
					var sResult = "",
						sConstraints = "",
						sFormatOptions = "",
						oAnnotation,
						sAnnotation,
						oUnit;
					if (sMainProperty && oPropertyAnnotations) {
						// 1. Check for unit or currency => needs composite binding
						sAnnotation = oPropertyAnnotations.hasOwnProperty(ISOCurrency) && ISOCurrency;
						//|| oPropertyAnnotations.hasOwnProperty(Unit) && Unit; //Add Unit as else if once supported
						if (sAnnotation) {
							// 1a. Currency or Unit
							oAnnotation = oPropertyAnnotations[sAnnotation];
							oUnit = UNIT_ANNOTATIONS[sAnnotation];
							sResult =
								"{" +
								"parts: [" +
								"'" +
								sMainProperty +
								"','" +
								oAnnotation.$Path +
								"'" +
								"], type: '" +
								oUnit.ui5Type +
								"'";
							sFormatOptions += oUnit.formatOptions; //must have for currency or should we check the edm.type
						} else {
							// 1b. no composite binding start with path as we will always have a type
							sResult = "{path: '" + sMainProperty + "'";
							sResult += ",type: '" + FieldBaseDelegate.getDataTypeClass(null, oRealProperty.$Type) + "'";
						}
						// 2. Check constraints
						sConstraints +=
							(sConstraints ? COMMA : "") + //do we need a comma,
							//('precision: ' + ( oRealProperty.$Precision || 0))
							FieldHelper.typeConstraints(oRealProperty, oPropertyAnnotations);

						sResult += sConstraints ? ",constraints: {" + sConstraints + "}" : "";
						// 3. Check format options
						sFormatOptions +=
							["Edm.Date", "Edm.DateTimeOffset"].indexOf(oRealProperty.$Type) > -1
								? (sFormatOptions ? COMMA : "") + "style : 'medium'" //do we need a comma,
								: "";
						sResult += sFormatOptions ? ",formatOptions: {" + sFormatOptions + "}" : "";

						// 2d. Close the curly
						sResult += "}";
					} else {
						sResult = AnnotationHelper.value(oProperty, { context: oContext });
					}

					return sResult;
				});
			},
			_context: function(oProperty, oInterface) {
				return oInterface;
			},
			constraints: function(oProperty, oInterface) {
				return FieldHelper.value(oProperty, oInterface).then(function(sValue) {
					var aMatches = sValue.match(/constraints:.*?({.*?})/),
						sConstraints = aMatches && aMatches[1];
					// Workaround. Add "V4: true" to DateTimeOffset constraints. AnnotationHelper is not aware of this flag.
					if (sValue.indexOf("sap.ui.model.odata.type.DateTimeOffset") > -1) {
						if (sConstraints) {
							sConstraints = sConstraints.substr(0, aMatches[1].indexOf("}")) + ", V4: true}";
						} else {
							sConstraints = "{V4: true}";
						}
					}
					return sConstraints || undefined;
				});
			},
			formatOptions: function(oProperty, oInterface) {
				return FieldHelper.value(oProperty, oInterface).then(function(sValue) {
					var aMatches = sValue.match(/formatOptions:.*?({.*?})/);
					return (aMatches && aMatches[1]) || undefined;
				});
			},
			/**
			 * getFieldGroupIDs uses a map stored in preprocessing data for the macro Field
			 * _generateSideEffectsMap generates this map once during templating for the first macro field
			 * and then resuses it. Map is only during templating.
			 * The map is used to set the field group ids to the macro field.
			 * A field group id has the format -- namespace.of.entityType#Qualifier
			 * where 'namespace.of.entityType' is the target entity type of the side effect annotation
			 * and 'Qualifier' is the qualififer of the side effect annotation.
			 * This information is enough to identify the side effect annotation.
			 * @param {object} oContext Context instance
			 * @param {string} sPropertyPath Property path
			 * @param {string} sEntityType Entity type
			 * @returns {Promise<number>|undefined} a promise for string with comma separated field group ids
			 */
			getFieldGroupIds: function(oContext, sPropertyPath, sEntityType) {
				if (!sPropertyPath) {
					return undefined;
				}
				var oInterface = oContext.getInterface(0);
				// generate the mapping for side effects or get the generated map if it is already generated
				return _generateSideEffectsMap(oInterface).then(function(oSideEffects) {
					var oMetaModel = oInterface.getModel(),
						sPath = sPropertyPath,
						// if the property path has a navigation, get the target entity type of the navigation
						sNavigationPath =
							sPath.indexOf("/") > 0
								? "/" + sEntityType + "/" + sPath.substr(0, sPath.lastIndexOf("/") + 1) + "@sapui.name"
								: false,
						pOwnerEntity = !sNavigationPath ? Promise.resolve(sEntityType) : oMetaModel.requestObject(sNavigationPath),
						aFieldGroupIds,
						sFieldGroupIds;

					sPath = sNavigationPath ? sPath.substr(sPath.lastIndexOf("/") + 1) : sPath;

					return pOwnerEntity.then(function(sOwnerEntityType) {
						// add to fieldGroupIds, all side effects which mention sPath as source property or sOwnerEntityType as source entity
						aFieldGroupIds =
							(oSideEffects[sOwnerEntityType] &&
								oSideEffects[sOwnerEntityType][0].concat(oSideEffects[sOwnerEntityType][1][sPath] || [])) ||
							[];
						if (aFieldGroupIds.length) {
							sFieldGroupIds = aFieldGroupIds.reduce(function(sResult, sId) {
								return (sResult && sResult + "," + sId) || sId;
							});
						}
						// if (sFieldGroupIds) {
						// 	Log.info('FieldGroupIds--' + sPropertyPath + ': ' + sFieldGroupIds);
						// }
						return sFieldGroupIds; //"ID1,ID2,ID3..."
					});
				});
			},
			fieldControl: function(sPropertyPath, oInterface) {
				var oModel = oInterface && oInterface.context.getModel();
				var sPath = oInterface && oInterface.context.getPath();
				var oFieldControlContext = oModel && oModel.createBindingContext(sPath + "@com.sap.vocabularies.Common.v1.FieldControl");
				var oFieldControl = oFieldControlContext && oFieldControlContext.getProperty();
				if (oFieldControl) {
					if (oFieldControl.hasOwnProperty("$EnumMember")) {
						return oFieldControl.$EnumMember;
					} else if (oFieldControl.hasOwnProperty("$Path")) {
						return AnnotationHelper.value(oFieldControl, { context: oFieldControlContext });
					}
				} else {
					return undefined;
				}
			},
			/**
			 * Method to get the navigation entity(the entity where should i look for the available quick view facets)
			 * 	-Loop over all navigation property
			 *	-Look into ReferentialConstraint constraint
			 *	-If ReferentialConstraint.Property = property(Semantic Object) ==> success QuickView Facets from this entity type can be retrieved
			 * @function
			 * @name getNavigationEntity
			 * @memberof sap.fe.macros.field.FieldHelper.js
			 * @param {Object} oProperty - property object on which semantic object is configured
			 * @param {Object} oContext - Metadata Context(Not passed when called with template:with)
			 * @returns {String/Undefined} - if called with context then navigation entity relative binding like "{supplier}" is returned
			 * 	else context path for navigation entity for templating is returned  e.g “/Products/$Type/supplier”
			 *  where Products - Parent entity, supplier - Navigation entity name
			 */

			getNavigationEntity: function(oProperty, oContext) {
				var oContextObject = (oContext && oContext.context) || oProperty,
					//Get the entity type path ex. /Products/$Type from /Products/$Type@com.sap.vocabularies.UI.v1.HeaderInfo/Description/Value...
					sPath = AnnotationHelper.getNavigationPath(oContextObject.getPath()) + "/",
					//Get the entity set object
					oEntitySet = oContextObject.getObject(sPath),
					//Get the naviagation entity details
					akeys = Object.keys(oEntitySet),
					length = akeys.length,
					index = 0;
				for (; index < length; index++) {
					if (
						oEntitySet[akeys[index]].$kind === "NavigationProperty" &&
						oEntitySet[akeys[index]].$ReferentialConstraint &&
						oEntitySet[akeys[index]].$ReferentialConstraint.hasOwnProperty(oContextObject.getObject().$Path)
					) {
						return oContext ? AnnotationHelper.getNavigationBinding(akeys[index]) : sPath + akeys[index];
					}
				}
			},

			/**
			 * Method to get the valuehelp property from a DataField or a PropertyPath(in case of SeclectionField)
			 * Priority form where to get the field property value(example: "Name" or "Supplier"):
			 * 1. If oPropertyContext.getObject() has key '$Path', then we take the value at '$Path'.
			 * 2. Else, value at oPropertyContext.getObject().
			 * In case, there exists ISOCurrency or Unit annotations for the field property, then Path at the ISOCurrency
			 * or Unit annotations of the field property is considered.
			 * @function
			 * @name valueHelpProperty
			 * @memberof sap.fe.macros.field.FieldHelper.js
			 * @param {Object} oPropertyContext - context from which valuehelp property need to be extracted.
			 */
			valueHelpProperty: function(oPropertyContext) {
				/* For currency (and later Unit) we need to forward the value help to the annotated field */
				var sContextPath = oPropertyContext.getPath(),
					oContent = oPropertyContext.getObject() || {},
					sPath = oContent.$Path ? sContextPath + "/$Path" : sContextPath,
					sAnnoPath = sPath + "@",
					oPropertyAnnotations = oPropertyContext.getObject(sAnnoPath),
					sAnnotation;
				if (oPropertyAnnotations) {
					sAnnotation =
						(oPropertyAnnotations.hasOwnProperty(ISOCurrency) && ISOCurrency) ||
						(oPropertyAnnotations.hasOwnProperty(Unit) && Unit);
					if (sAnnotation) {
						sPath = sPath + sAnnotation + "/$Path";
					}
				}
				return sPath;
			},

			getSemanticKeyTitle: function(sPropertyTextValue, sPropertyValue, sDataField) {
				var sNewObject = ResourceModel.getText("field.NEW_OBJECT");
				var sUnnamedObject = ResourceModel.getText("field.UNNAMED_OBJECT");
				var sNewObjectExpression, sUnnnamedObjectExpression;
				var buildExpressionForSemantickKeyTitle = function(sValue) {
					sNewObjectExpression =
						"($" +
						sValue +
						" === '' || $" +
						sValue +
						" === undefined || $" +
						sValue +
						" === null ? '" +
						sNewObject +
						"': $" +
						sValue +
						")";
					sUnnnamedObjectExpression =
						"($" +
						sValue +
						" === '' || $" +
						sValue +
						" === undefined || $" +
						sValue +
						" === null ? '" +
						sUnnamedObject +
						"': $" +
						sValue +
						")";
					return (
						"{= !%{IsActiveEntity} ? !%{HasActiveEntity} ? " +
						sNewObjectExpression +
						" : " +
						sUnnnamedObjectExpression +
						" : " +
						sUnnnamedObjectExpression +
						"}"
					);
				};

				if (sPropertyTextValue) {
					return buildExpressionForSemantickKeyTitle(sPropertyTextValue);
				} else if (sPropertyValue) {
					return buildExpressionForSemantickKeyTitle(sPropertyValue);
				} else {
					sDataField = "{" + sDataField + "}";
					return buildExpressionForSemantickKeyTitle(sDataField);
				}
			},
			/**
			 * Method to formulate tooltip for Progress and Rating Indicators in table.
			 * @param {*} sTitle - DataPoint's Title
			 * @param {*} sValue - DataPoint's Value
			 * @param {*} sEnum - DataPoint's EnumMember. It will either be UI.Visualization/Progress or UI.Visualization/Rating.
			 * @returns {string} Tooltip
			 */
			getTooltip: function(sTitle, sValue, sEnum) {
				var sTooltip;
				if (sEnum.indexOf("Rating") !== -1) {
					sTooltip = ResourceModel.getText("table.RATING_INDICATOR_TOOLTIP", [sTitle, sValue]);
				} else if (sEnum.indexOf("Progress") !== -1) {
					sTooltip = ResourceModel.getText("table.PROGRESS_INDICATOR_TOOLTIP", [sTitle, sValue]);
				}
				return sTooltip;
			},
			/**
			 * Method to calculate the perceentage value of Progress Indicator. Basic formula is Value/Target * 100
			 * @param {*} sValue - Datapoint's value
			 * @param {*} sTarget - DataPoint's Target
			 * @param {*} mUoM  - Datapoint's Unit of Measure
			 * @returns {Binding} Expression binding that will calculate the percent value to be shown in progress indicator. Formula given above.
			 */
			buildExpressionForProgressIndicatorPercentValue: function(sValue, sTarget, mUoM) {
				var sPercentValueExpression = "0";
				var sExpressionTemplate;
				sValue = sValue.charAt(0) === "{" ? "$" + sValue : sValue;
				sTarget = sTarget && sTarget.charAt(0) === "{" ? "$" + sTarget : sTarget;
				// The expression consists of the following parts:
				// 1) When UoM is '%' then percent = value (target is ignored), and check for boundaries (value > 100 and value < 0).
				// 2) When UoM is not '%' (or is not provided) then percent = value / target * 100, check for division by zero and boundaries:
				// percent > 100 (value > target) and percent < 0 (value < 0)
				// Where 0 is Value, 1 is Target, 2 is UoM
				var sExpressionForUoMPercent = "(({0} > 100) ? 100 : (({0} < 0) ? 0 : ({0} * 1)))";
				var sExpressionForUoMNotPercent = "(({1} > 0) ? (({0} > {1}) ? 100 : (({0} < 0) ? 0 : ({0} / {1} * 100))) : 0)";
				if (mUoM) {
					mUoM = "'" + mUoM + "'";
					sExpressionTemplate =
						"'{'= ({2} === ''%'') ? " + sExpressionForUoMPercent + " : " + sExpressionForUoMNotPercent + " '}'";
					sPercentValueExpression = formatMessage(sExpressionTemplate, [sValue, sTarget, mUoM]);
				} else {
					sExpressionTemplate = "'{'= " + sExpressionForUoMNotPercent + " '}'";
					sPercentValueExpression = formatMessage(sExpressionTemplate, [sValue, sTarget]);
				}
				return sPercentValueExpression;
			},

			/* formatNumberForPresentation: function (value) {
			if (value === undefined) {
				return 0;
			}
			var num = sap.ui.core.format.NumberFormat.getIntegerInstance({
				maxFractionDigits: 0
			}).format(value);
			return num;
		},

		trimCurlyBraces : function (value) {
			return value ? value.replace("{","").replace("}","") : undefined;
		},

		getProgressIndicatorValue: function(value) {
			value = sap.fe.macros.field.FieldHelper.trimCurlyBraces(value);
			return "{path: '" + value + "', formatter: 'sap.fe.macros.field.FieldHelper.formatNumberForPresentation' }";
		}, */

			/**
			 * Method to formulate the display value of Progress Indicator.
			 * @param {*} sValue - Datapoint's value
			 * @param {*} sTarget - DataPoint's Target
			 * @param {*} sUoM  - Datapoint's Unit of Measure
			 * @returns {string} Display value of Progress Indicator
			 */
			buildExpressionForProgressIndicatorDisplayValue: function(sValue, sTarget, sUoM) {
				//Commenting the below line as we aren't supporting the UX requirement as of now.
				//sValue = sap.fe.macros.field.FieldHelper.getProgressIndicatorValue(sValue);
				var sDisplayValue = "";

				if (sValue) {
					if (sUoM) {
						if (sUoM === "%") {
							// uom.String && uom.String === '%'
							sDisplayValue = sValue + " %";
						} else if (sTarget) {
							sDisplayValue =
								ResourceModel.getText("progressindicator.PROGRESS_INDICATOR_DISPLAY_VALUE_NO_UOM", [sValue, sTarget]) +
								" " +
								sUoM;
						} else {
							sDisplayValue = sValue + " " + sUoM;
						}
					} else if (sTarget) {
						sDisplayValue = ResourceModel.getText("progressindicator.PROGRESS_INDICATOR_DISPLAY_VALUE_NO_UOM", [
							sValue,
							sTarget
						]);
					} else {
						sDisplayValue = sValue;
					}
				} else {
					// Cannot do anything
					Log.warning("Value property is mandatory, the default (empty string) will be returned");
				}

				return sDisplayValue;
			},

			/**
			 * Method to set the edit mode of the field in valuehelp
			 * @function
			 * @name getFieldEditModeInValueHelp
			 * @param {object} oValueList - valuelist
			 * @param {string} sProperty - property name
			 * @return {string} - Returns the edit mode of the field
			 */
			getFieldEditModeInValueHelp: function(oValueList, sProperty) {
				var aParameters = (oValueList && oValueList.Parameters) || [],
					sEditMode = "Editable",
					oParameter;
				if (aParameters.length) {
					for (var i in aParameters) {
						oParameter = aParameters[i];
						if (oParameter.ValueListProperty === sProperty) {
							if (oParameter.$Type.indexOf("Out") > 48) {
								return "Editable";
							} else if (oParameter.$Type.indexOf("In") > 48) {
								sEditMode = "ReadOnly";
							}
						}
					}
				}
				return sEditMode;
			},
			joinArray: function(aStringArray) {
				return aStringArray.join(",");
			},
			getSemanticObjectsList: function(propertyAnnotations) {
				// look for annotations SemanticObject with and without qualifier
				// returns : list of SemanticObjects
				var annotations = propertyAnnotations;
				var aSemanticObjects = [];
				for (var key in annotations.getObject()) {
					// var qualifier;
					if (
						key.indexOf("com.sap.vocabularies.Common.v1.SemanticObject") > -1 &&
						key.indexOf("com.sap.vocabularies.Common.v1.SemanticObjectMapping") === -1 &&
						key.indexOf("com.sap.vocabularies.Common.v1.SemanticObjectUnavailableActions") === -1
					) {
						var semanticObjectValue = annotations.getObject()[key];
						if (aSemanticObjects.indexOf(semanticObjectValue) === -1) {
							aSemanticObjects.push(semanticObjectValue);
						}
					}
				}
				var oSemanticObjectsModel = new JSONModel(aSemanticObjects);
				oSemanticObjectsModel.$$valueAsPromise = true;
				return oSemanticObjectsModel.createBindingContext("/");
			},
			getSemanticObjectsQualifiers: function(propertyAnnotations) {
				// look for annotations SemanticObject, SemanticObjectUnavailableActions, SemanticObjectMapping
				// returns : list of qualifiers (array of objects with qualifiers : {qualifier, SemanticObject, SemanticObjectUnavailableActions, SemanticObjectMapping for this qualifier}
				var annotations = propertyAnnotations;
				var qualifiersAnnotations = [];
				var findObject = function(qualifier) {
					return qualifiersAnnotations.find(function(object) {
						return object.qualifier === qualifier;
					});
				};
				for (var key in annotations.getObject()) {
					// var qualifier;
					if (
						key.indexOf("com.sap.vocabularies.Common.v1.SemanticObject#") > -1 ||
						key.indexOf("com.sap.vocabularies.Common.v1.SemanticObjectMapping#") > -1 ||
						key.indexOf("com.sap.vocabularies.Common.v1.SemanticObjectUnavailableActions#") > -1
					) {
						var annotationContent = annotations.getObject()[key],
							annotation = key.split("#")[0],
							qualifier = key.split("#")[1],
							qualifierObject = findObject(qualifier);

						if (!qualifierObject) {
							qualifierObject = {
								qualifier: qualifier
							};
							qualifierObject[annotation] = annotationContent;
							qualifiersAnnotations.push(qualifierObject);
						} else {
							qualifierObject[annotation] = annotationContent;
						}
					}
				}
				qualifiersAnnotations = qualifiersAnnotations.filter(function(oQualifier) {
					return !!oQualifier["@com.sap.vocabularies.Common.v1.SemanticObject"];
				});
				var oQualifiersModel = new JSONModel(qualifiersAnnotations);
				oQualifiersModel.$$valueAsPromise = true;
				return oQualifiersModel.createBindingContext("/");
			},
			// returns array of semanticObjects including main and additional, with their mapping and unavailable Actions
			getSemanticObjectsWithAnnotations: function(propertyAnnotations) {
				// look for annotations SemanticObject, SemanticObjectUnavailableActions, SemanticObjectMapping
				// returns : list of qualifiers (array of objects with qualifiers : {qualifier, SemanticObject, SemanticObjectUnavailableActions, SemanticObjectMapping for this qualifier}
				var annotations = propertyAnnotations;
				var semanticObjectList = [];
				var findObject = function(qualifier) {
					return semanticObjectList.find(function(object) {
						return object.qualifier === qualifier;
					});
				};
				for (var key in annotations.getObject()) {
					// var qualifier;
					if (
						key.indexOf("com.sap.vocabularies.Common.v1.SemanticObject") > -1 ||
						key.indexOf("com.sap.vocabularies.Common.v1.SemanticObjectMapping") > -1 ||
						key.indexOf("com.sap.vocabularies.Common.v1.SemanticObjectUnavailableActions") > -1
					) {
						if (key.indexOf("#") > -1) {
							var annotationContent = annotations.getObject()[key],
								annotation = key.split("#")[0],
								qualifier = key.split("#")[1],
								listItem = findObject(qualifier);
							if (!listItem) {
								listItem = {
									qualifier: qualifier
								};
								listItem[annotation] = annotationContent;
								semanticObjectList.push(listItem);
							} else {
								listItem[annotation] = annotationContent;
							}
						} else {
							var annotationContent = annotations.getObject()[key],
								annotation,
								qualifier;
							if (key.indexOf("com.sap.vocabularies.Common.v1.SemanticObjectMapping") > -1) {
								annotation = "@com.sap.vocabularies.Common.v1.SemanticObjectMapping";
							} else if (key.indexOf("com.sap.vocabularies.Common.v1.SemanticObjectUnavailableActions") > -1) {
								annotation = "@com.sap.vocabularies.Common.v1.SemanticObjectUnavailableActions";
							} else if (key.indexOf("com.sap.vocabularies.Common.v1.SemanticObject") > -1) {
								annotation = "@com.sap.vocabularies.Common.v1.SemanticObject";
							}
							var listItem = findObject("main");
							if (!listItem) {
								listItem = {
									qualifier: "main"
								};
								listItem[annotation] = annotationContent;
								semanticObjectList.push(listItem);
							} else {
								listItem[annotation] = annotationContent;
							}
						}
					}
				}
				// filter if no semanticObject was defined
				semanticObjectList = semanticObjectList.filter(function(oQualifier) {
					return !!oQualifier["@com.sap.vocabularies.Common.v1.SemanticObject"];
				});
				var oSemanticObjectsModel = new JSONModel(semanticObjectList);
				oSemanticObjectsModel.$$valueAsPromise = true;
				return oSemanticObjectsModel.createBindingContext("/");
			},
			// returns the list of parameters to pass to the Link delegates
			computeLinkParameters: function(
				delegateName,
				entityType,
				semanticObjectsList,
				semanticObjectsWithAnnotations,
				dataField,
				contact
			) {
				// sPath = AnnotationHelper.getNavigationPath(property.getPath()) + "/";
				var semanticObjectMappings = [],
					semanticObjectUnavailableActions = [];
				if (semanticObjectsWithAnnotations) {
					semanticObjectsWithAnnotations.forEach(function(semObject) {
						if (semObject["@com.sap.vocabularies.Common.v1.SemanticObjectUnavailableActions"]) {
							var unAvailableAction = {
								semanticObject: semObject["@com.sap.vocabularies.Common.v1.SemanticObject"],
								actions: semObject["@com.sap.vocabularies.Common.v1.SemanticObjectUnavailableActions"]
							};
							semanticObjectUnavailableActions.push(unAvailableAction);
						}
						if (semObject["@com.sap.vocabularies.Common.v1.SemanticObjectMapping"]) {
							var items = [];
							semObject["@com.sap.vocabularies.Common.v1.SemanticObjectMapping"].forEach(function(mappingItem) {
								items.push({
									key: mappingItem.LocalProperty.$PropertyPath,
									value: mappingItem.SemanticObjectProperty
								});
							});
							var mapping = {
								semanticObject: semObject["@com.sap.vocabularies.Common.v1.SemanticObject"],
								items: items
							};
							semanticObjectMappings.push(mapping);
						}
					});
				}
				var mParameters = {
					name: delegateName,
					payload: {
						semanticObjects: semanticObjectsList,
						entityType: entityType,
						semanticObjectUnavailableActions: semanticObjectUnavailableActions,
						semanticObjectMappings: semanticObjectMappings,
						dataField: dataField,
						contact: contact
					}
				};
				return JSON.stringify(mParameters);
			},
			getmyvaluePlease: function(test) {
				var value = test;
				return value;
			},
			operators: function(sProperty, oInterface) {
				// Complete possible set of Operators for AllowedExpression Types

				var oContext = oInterface.context,
					oModel = oContext.getModel(),
					sPropertyPath = oContext.getPath(),
					sEntitySetPath = CommonHelper._getEntitySetPath(oModel, sPropertyPath);

				return CommonUtils.getOperatorsForProperty(sProperty, sEntitySetPath, oModel);
			},
			isFilterRestrictedToOnlySingleOrMultiValue: function(sProperty, oInterface) {
				var oContext = oInterface.context,
					oModel = oContext.getModel(),
					sPropertyPath = oContext.getPath(),
					sEntitySetPath = CommonHelper._getEntitySetPath(oModel, sPropertyPath),
					oFilterRestrictions = oModel.getObject(sEntitySetPath + "@Org.OData.Capabilities.V1.FilterRestrictions");

				if (oFilterRestrictions && oFilterRestrictions.FilterExpressionRestrictions) {
					var aRestriction = oFilterRestrictions.FilterExpressionRestrictions.filter(function(oRestriction) {
						return oRestriction.Property.$PropertyPath === sProperty;
					});

					return aRestriction.some(function(oRestriction) {
						return oRestriction.AllowedExpressions === "SingleValue" || oRestriction.AllowedExpressions === "MultiValue";
					});
				}
				return false;
			}
		};
		FieldHelper.getConditionsBinding.requiresIContext = true;
		FieldHelper.buildExpressionForTextValue.requiresIContext = true;
		FieldHelper.getRequiredForDataField.requiresIContext = true;
		FieldHelper.getBindingForDraftAdminBlockInline.requiresIContext = true;
		FieldHelper.getBindingForDraftAdminBlockInPopover.requiresIContext = true;
		FieldHelper.value.requiresIContext = true;
		FieldHelper.getFieldGroupIds.requiresIContext = true;
		FieldHelper.fieldControl.requiresIContext = true;

		return FieldHelper;
	},
	/* bExport= */ true
);
