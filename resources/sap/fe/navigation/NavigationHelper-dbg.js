/*!
 * @copyright@
 */
sap.ui.define(["sap/base/Log", "sap/fe/navigation/SelectionVariant", "sap/fe/navigation/NavError"], function(
	Log,
	SelectionVariant,
	NavError
) {
	"use strict";

	var NavigationHelper = {
		aValidTypes: [
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

		oExcludeMap: {
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
		},

		/**
		 * Removes sensitive data from the navigation context
		 * @param {Object} oContext mandatory context
		 * @param {Object} oData optional selection variant or data map
		 * @return {Object} mPureData selection variant or data map
		 **/
		removeSensitiveData: function(oContext, oData) {
			if (!oContext) {
				// context is mandatory
				Log.error("Context is required");
				return;
			}
			var aPropertyNames = [],
				bIsSelectionVariant,
				mPureData,
				oContextData = oContext.getObject(),
				oMetaModel = oContext.getModel().getMetaModel(),
				sEntitySet = this._getTargetCollection(oContext),
				that = this,
				fnIsSensitiveData = function(sProp, esName, mData) {
					var aPropertyAnnotations;
					esName = esName || sEntitySet;
					mData = mData || oContextData;
					aPropertyAnnotations = oMetaModel.getObject(esName + "/" + sProp + "@");
					if (aPropertyAnnotations) {
						if (that._checkPropertyAnnotationsForSensitiveData(aPropertyAnnotations)) {
							return true;
						} else if (aPropertyAnnotations["@com.sap.vocabularies.Common.v1.FieldControl"]) {
							var oFieldControl = aPropertyAnnotations["@com.sap.vocabularies.Common.v1.FieldControl"];
							if (oFieldControl["$EnumMember"] && oFieldControl["$EnumMember"].split("/")[1] === "Inapplicable") {
								return true;
							} else if (oFieldControl["$Path"]) {
								var oFieldControlPath = oFieldControl["$Path"],
									aParts = oFieldControlPath.split("/");
								// sensitive data is removed only if the path has already been resolved.
								if (aParts.length > 1) {
									return mData[aParts[0]] && mData[aParts[0]][aParts[1]] && mData[aParts[0]][aParts[1]] === 0;
								} else {
									return mData[oFieldControlPath] === 0;
								}
							}
						}
					}
					return false;
				};

			if (oContextData) {
				delete oContextData["@odata.context"];
				delete oContextData["@odata.metadataEtag"];
			}

			if (oData) {
				mPureData = oData;
				if (oData.getMetadata && oData.getMetadata().getName() === "sap.fe.navigation.SelectionVariant") {
					bIsSelectionVariant = true;
					aPropertyNames = oData.getPropertyNames() || [];
				} else if (oData instanceof Object) {
					aPropertyNames = Object.keys(oData) || [];
				} else {
					Log.error("Unsupported format - Sensitive data not removed. Pass a SelectionVariant or data map");
				}
			} else {
				aPropertyNames = Object.keys(oContextData) || [];
				mPureData = JSON.parse(JSON.stringify(oContextData));
			}

			aPropertyNames.forEach(function(sProperty) {
				// properties of the entity set
				if (!(oContextData[sProperty] instanceof Object)) {
					if (fnIsSensitiveData(sProperty)) {
						if (bIsSelectionVariant) {
							mPureData.removeSelectOption(sProperty);
						} else {
							delete mPureData[sProperty];
						}
					}
				} else {
					//handle properties of the navigation entity
					// only one level of navigation property is supported
					var esName = "/" + oMetaModel.getObject(sEntitySet + "/$NavigationPropertyBinding/" + sProperty),
						oNavigationEntityData = bIsSelectionVariant
							? JSON.parse(oData.getSelectOption(sProperty)[0].Low)
							: mPureData[sProperty],
						aProps = Object.keys(oNavigationEntityData),
						bIsSensitiveData = false;
					// remove all sensitive properties from the navigation data
					aProps.forEach(function(sProp) {
						if (fnIsSensitiveData(sProp, esName, oNavigationEntityData)) {
							bIsSensitiveData = true;
							delete oNavigationEntityData[sProp];
						}
					});
					if (bIsSensitiveData) {
						if (bIsSelectionVariant) {
							// remove the current low value having the sensitive data
							// then set the value with the non-sensitive data
							// this has to be followed to avoid SelectionVariant.PARAMETER_SELOPT_COLLISION error
							mPureData.removeSelectOption(sProperty);
							mPureData.addSelectOption(sProperty, "I", "EQ", JSON.stringify(oNavigationEntityData));
						} else {
							// reset data of navigation property with the non-sensitive data
							mPureData[sProperty] = oNavigationEntityData;
						}
					}
				}
			});
			return mPureData;
		},

		_checkPropertyAnnotationsForSensitiveData: function(aPropertyAnnotations) {
			return (
				aPropertyAnnotations["@com.sap.vocabularies.PersonalData.v1.IsPotentiallySensitive"] ||
				aPropertyAnnotations["@com.sap.vocabularies.UI.v1.ExcludeFromNavigationContext"] ||
				aPropertyAnnotations["@com.sap.vocabularies.Analytics.v1.Measure"]
			);
		},

		/*
		 * @private
		 * @ui5-restricted
		 */
		_getTargetCollection: function(oContext, navCollection) {
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
			aParts = sPath.split("/").filter(Boolean); //filter out empty strings from array
			//Supporting sPath of any format, either '/<entitySet>/<navigationCollection>' <OR> '/<entitySet>/$Type/<navigationCollection>'
			entitySet = "/" + aParts[0];
			if (aParts.length === 1) {
				return entitySet;
			}
			navigationCollection = typeof navCollection === "undefined" ? aParts[aParts.length - 1] : navCollection;
			return entitySet + "/$NavigationPropertyBinding/" + navigationCollection; // used in gotoTargetEntitySet method in the same file
		},

		/**
		 * Method to add display currency to selection variant.
		 * @param {Array} aMandatoryFilterFields - mandatory filterfields of entitySet.
		 * @param {Object} oAppData - app-state data.
		 */
		addDefaultDisplayCurrency: function(aMandatoryFilterFields, oAppData) {
			if (oAppData && oAppData.oSelectionVariant && aMandatoryFilterFields && aMandatoryFilterFields.length) {
				for (var i = 0; i < aMandatoryFilterFields.length; i++) {
					var aSVOption = oAppData.oSelectionVariant.getSelectOption("DisplayCurrency"),
						aDefaultSVOption =
							oAppData.oDefaultedSelectionVariant && oAppData.oDefaultedSelectionVariant.getSelectOption("DisplayCurrency");
					if (
						aMandatoryFilterFields[i].$PropertyPath === "DisplayCurrency" &&
						(!aSVOption || !aSVOption.length) &&
						aDefaultSVOption &&
						aDefaultSVOption.length
					) {
						var displayCurrencySelectOption = aDefaultSVOption[0];
						var sSign = displayCurrencySelectOption["Sign"];
						var sOption = displayCurrencySelectOption["Option"];
						var sLow = displayCurrencySelectOption["Low"];
						var sHigh = displayCurrencySelectOption["High"];
						oAppData.oSelectionVariant.addSelectOption("DisplayCurrency", sSign, sOption, sLow, sHigh);
					}
				}
			}
		},

		_mixAttributesToSelVariant: function(mSemanticAttributes, oSelVariant, iSuppressionBehavior) {
			// add all semantic attributes to the mixed selection variant
			for (var sPropertyName in mSemanticAttributes) {
				if (mSemanticAttributes.hasOwnProperty(sPropertyName)) {
					// A value of a semantic attribute may not be a string, but can be e.g. a date.
					// Since the selection variant accepts only a string, we have to convert it in dependence of the type.
					var vSemanticAttributeValue = mSemanticAttributes[sPropertyName];

					if (jQuery.type(vSemanticAttributeValue) === "array" || jQuery.type(vSemanticAttributeValue) === "object") {
						vSemanticAttributeValue = JSON.stringify(vSemanticAttributeValue);
					} else if (jQuery.type(vSemanticAttributeValue) === "date") {
						// use the same conversion method for dates as the SmartFilterBar: toJSON()
						vSemanticAttributeValue = vSemanticAttributeValue.toJSON();
					} else if (jQuery.type(vSemanticAttributeValue) === "number" || jQuery.type(vSemanticAttributeValue) === "boolean") {
						vSemanticAttributeValue = vSemanticAttributeValue.toString();
					}

					if (vSemanticAttributeValue === "") {
						if (iSuppressionBehavior & sap.fe.navigation.SuppressionBehavior.ignoreEmptyString) {
							Log.info(
								"Semantic attribute " +
									sPropertyName +
									" is an empty string and due to the chosen Suppression Behiavour is being ignored."
							);
							continue;
						}
					}

					if (vSemanticAttributeValue === null) {
						if (iSuppressionBehavior & sap.fe.navigation.SuppressionBehavior.raiseErrorOnNull) {
							throw new NavError("NavigationHandler.INVALID_INPUT");
						} else {
							Log.warning("Semantic attribute " + sPropertyName + " is null and ignored for mix in to selection variant");
							continue; // ignore!
						}
					}

					if (vSemanticAttributeValue === undefined) {
						if (iSuppressionBehavior & sap.fe.navigation.SuppressionBehavior.raiseErrorOnUndefined) {
							throw new NavError("NavigationHandler.INVALID_INPUT");
						} else {
							Log.warning(
								"Semantic attribute " + sPropertyName + " is undefined and ignored for mix in to selection variant"
							);
							continue;
						}
					}

					if (jQuery.type(vSemanticAttributeValue) === "string") {
						oSelVariant.addSelectOption(sPropertyName, "I", "EQ", vSemanticAttributeValue);
					} else {
						throw new NavError("NavigationHandler.INVALID_INPUT");
					}
				}
			}
			return oSelVariant;
		},

		/**
		 * Combines the given parameters and selection variant into a new selection variant containing properties from both, with the parameters
		 * overriding existing properties in the selection variant. The new selection variant does not contain any parameters. All parameters are
		 * merged into select options. The output of this function, converted to a JSON string, can be used for the
		 * {@link #.navigate NavigationHandler.navigate} method.
		 * @param {object/array} vSemanticAttributes Object/(Array of Objects) containing key/value pairs
		 * @param {string} sSelectionVariant The selection variant in string format as provided by the SmartFilterBar control
		 * @param {int} [iSuppressionBehavior=sap.fe.navigation.SuppressionBehavior.standard] Indicates whether semantic
		 *        attributes with special values (see {@link sap.fe.navigation.SuppressionBehavior suppression behavior}) must be
		 *        suppressed before they are combined with the selection variant; several
		 *        {@link sap.fe.navigation.SuppressionBehavior suppression behaviors} can be combined with the bitwise OR operator
		 *        (|)
		 * @returns {object} Instance of {@link sap.fe.navigation.SelectionVariant}
		 * @private
		 * @ui5-restricted
		 * @example <code>
		 * var vSemanticAttributes = { "Customer" : "C0001" };
		 * or
		 * var vSemanticAttributes = [{ "Customer" : "C0001" },{ "Customer" : "C0002" }];
		 * var sSelectionVariant = oSmartFilterBar.getDataSuiteFormat();
		 * var oNavigationHandler = new sap.fe.navigation.NavigationHandler(oController);
		 * var sNavigationSelectionVariant = oNavigationHandler.mixAttributesAndSelectionVariant(vSemanticAttributes, sSelectionVariant).toJSONString();
		 * // In case of an vSemanticAttributes being an array, the semanticAttributes are merged to a single SV and compared against the sSelectionVariant(second agrument).
		 * // Optionally, you can specify one or several suppression behaviors. Several suppression behaviors are combined with the bitwise OR operator, e.g.
		 * // var iSuppressionBehavior = sap.fe.navigation.SuppressionBehavior.raiseErrorOnNull | sap.fe.navigation.SuppressionBehavior.raiseErrorOnUndefined;
		 * // var sNavigationSelectionVariant = oNavigationHandler.mixAttributesAndSelectionVariant(mSemanticAttributes, sSelectionVariant, iSuppressionBehavior).toJSONString();
		 *
		 * oNavigationHandler.navigate("SalesOrder", "create", sNavigationSelectionVariant);
		 * </code>
		 */
		mixAttributesAndSelectionVariant: function(vSemanticAttributes, sSelectionVariant, iSuppressionBehavior) {
			var oSelectionVariant = new SelectionVariant(sSelectionVariant);
			var oNewSelVariant = new SelectionVariant();

			if (oSelectionVariant.getFilterContextUrl()) {
				oNewSelVariant.setFilterContextUrl(oSelectionVariant.getFilterContextUrl());
			}
			if (oSelectionVariant.getParameterContextUrl()) {
				oNewSelVariant.setParameterContextUrl(oSelectionVariant.getParameterContextUrl());
			}
			if (Array.isArray(vSemanticAttributes)) {
				vSemanticAttributes.forEach(function(mSemanticAttributes) {
					NavigationHelper._mixAttributesToSelVariant(mSemanticAttributes, oNewSelVariant, iSuppressionBehavior);
				});
			} else {
				NavigationHelper._mixAttributesToSelVariant(vSemanticAttributes, oNewSelVariant, iSuppressionBehavior);
			}

			// add parameters that are not part of the oNewSelVariant yet
			var aParameters = oSelectionVariant.getParameterNames();
			for (var i = 0; i < aParameters.length; i++) {
				if (!oNewSelVariant.getSelectOption(aParameters[i])) {
					oNewSelVariant.addSelectOption(aParameters[i], "I", "EQ", oSelectionVariant.getParameter(aParameters[i]));
				}
			}

			// add selOptions that are not part of the oNewSelVariant yet
			var aSelOptionNames = oSelectionVariant.getSelectOptionsPropertyNames();
			for (i = 0; i < aSelOptionNames.length; i++) {
				// add selOptions that are not part of the oNewSelVariant yet
				var aSelectOption = oSelectionVariant.getSelectOption(aSelOptionNames[i]);
				if (!oNewSelVariant.getSelectOption(aSelOptionNames[i])) {
					for (var j = 0; j < aSelectOption.length; j++) {
						oNewSelVariant.addSelectOption(
							aSelOptionNames[i],
							aSelectOption[j].Sign,
							aSelectOption[j].Option,
							aSelectOption[j].Low,
							aSelectOption[j].High
						);
					}
				}
			}

			return oNewSelVariant;
		}
	};

	return NavigationHelper;
});
