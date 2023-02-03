/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2017 SAP SE. All rights reserved
    
 */

/**
 * Initialization Code and shared classes of library sap.ui.mdc.
 */
sap.ui.define(
	[
		"sap/ui/model/json/JSONModel",
		"sap/base/Log",
		"sap/ui/base/ManagedObject",
		"sap/fe/macros/ResourceModel",
		"sap/ui/core/util/XMLPreprocessor",
		"sap/ui/base/SyncPromise",
		"./TraceInfo"
	],
	function(JSONModel, Log, ManagedObject, ResourceModel, XMLPreprocessor, SyncPromise, TraceInfo) {
		"use strict";

		var sPhantomUtil = "sap.fe.macros.PhantomUtil",
			oI18nModel = ResourceModel.getModel();
		//Pretend to be able to do object binding
		oI18nModel.bindContext =
			oI18nModel.bindContext ||
			function() {
				return {
					initialize: function() {},
					attachChange: function() {},
					detachChange: function() {},
					attachEvents: function() {},
					detachEvents: function() {},
					updateRequired: function() {},
					destroy: function() {},
					getContext: function() {}
				};
			};

		function validateMacroMetadataContext(sName, mContexts, oContextSettings, sKey) {
			var oContext, oContextObject;

			if (!mContexts[sKey]) {
				if (oContextSettings.required) {
					throw new Error(sName + ": " + "Required metadataContext '" + sKey + "' is missing");
				}
			} else {
				// Check if properties of metadataContext are of expected kind, e.g. $kind or $Type. Expected kind can be specified as an array or a string
				oContext = mContexts[sKey];
				oContextObject = oContext.getObject();
				// not null or undefined or ...
				if (oContextObject) {
					// clone the context settings
					var oContextSettingsToCheck = Object.assign({}, oContextSettings);
					// no need to loop over properties 'type' and 'required'
					delete oContextSettingsToCheck.required;
					delete oContextSettingsToCheck.type;

					// If context object has $kind property, $Type should not be checked
					// Therefore remove from context settings
					if (oContextObject.hasOwnProperty("$kind")) {
						delete oContextSettingsToCheck.$Type;
					} else {
						delete oContextSettingsToCheck.$kind;
					}

					Object.keys(oContextSettingsToCheck).forEach(function(sProp) {
						var aContextSettingsProp = Array.isArray(oContextSettingsToCheck[sProp])
								? oContextSettingsToCheck[sProp]
								: [oContextSettingsToCheck[sProp]],
							sValue;

						if (typeof oContextObject === "object") {
							sValue = oContextObject[sProp];
							if (!sValue) {
								if (oContextObject.hasOwnProperty("$Path")) {
									sValue = oContext.getObject("$Path/" + sProp);
								}
							}
						} else if (typeof oContextObject === "string") {
							sValue = oContext.getObject(sProp);
							if (!sValue) {
								sValue = aContextSettingsProp[0]; // take expected value to suppress error
							}
						} else {
							sValue = null;
						}

						if (aContextSettingsProp.indexOf(sValue) === -1) {
							throw new Error(
								sName +
									": '" +
									sKey +
									"' must be '" +
									sProp +
									"' '" +
									aContextSettingsProp +
									"' but is '" +
									sValue +
									"': " +
									oContext.getPath()
							);
						}
					});
				}
			}
		}

		function validateMacroSignature(sName, oMetadata, mContexts, oNode) {
			var aMetadataContextKeys = (oMetadata.metadataContexts && Object.keys(oMetadata.metadataContexts)) || [],
				aProperties = (oMetadata.properties && Object.keys(oMetadata.properties)) || [],
				oAttributeNames = {};

			// collect all attributes to find unchecked properties
			Object.keys(oNode.attributes).forEach(function(iKey) {
				var sKey = oNode.attributes[iKey].name;
				if (sKey !== "metadataContexts") {
					oAttributeNames[sKey] = true;
				}
			});
			// special handling for old metadataContext call syntax
			Object.keys(mContexts).forEach(function(sKey) {
				if (sKey !== "this" && sKey !== "this.i18n") {
					oAttributeNames[sKey] = true;
				}
			});

			//Check metadataContexts
			aMetadataContextKeys.forEach(function(sKey) {
				var oContextSettings = oMetadata.metadataContexts[sKey];

				validateMacroMetadataContext(sName, mContexts, oContextSettings, sKey);
				delete oAttributeNames[sKey];
			});
			//Check properties
			aProperties.forEach(function(sKey) {
				var oPropertySettings = oMetadata.properties[sKey];
				// TODO validate property type if possible
				if (!oNode.hasAttribute(sKey)) {
					if (oPropertySettings.required && !oPropertySettings.hasOwnProperty("defaultValue")) {
						throw new Error(sName + ": " + "Required property '" + sKey + "' is missing");
					}
				} else {
					delete oAttributeNames[sKey];
				}
			});

			// Unchecked properties
			Object.keys(oAttributeNames).forEach(function(sKey) {
				// no check for properties which start with underscore "_" or contain a colon ":" (different namespace), e.g. xmlns:trace, trace:macroID, unittest:id
				if (sKey.charAt(0) !== "_" && sKey.indexOf(":") < 0) {
					Log.warning("Unchecked parameter: " + sName + ": " + sKey, null, sPhantomUtil);
				}
			});
		}

		function prepareMetadata(oMacroDefinition) {
			if (oMacroDefinition) {
				var oProperties = {};
				var oMetadataContexts = oMacroDefinition.metadataContexts || {};

				Object.keys(oMacroDefinition.properties).forEach(function(sPropertyName) {
					if (oMacroDefinition.properties[sPropertyName].type !== "sap.ui.model.Context") {
						oProperties[sPropertyName] = oMacroDefinition.properties[sPropertyName];
					} else {
						oMetadataContexts[sPropertyName] = oMacroDefinition.properties[sPropertyName];
					}
				});
				// Merge events into properties as they are handled indentically
				if (oMacroDefinition.events) {
					Object.keys(oMacroDefinition.events).forEach(function(sEventName) {
						oProperties[sEventName] = oMacroDefinition.events[sEventName];
					});
				}
				return {
					properties: oProperties,
					metadataContexts: oMetadataContexts
				};
			} else {
				return {
					metadataContexts: {},
					properties: {},
					events: {}
				};
			}
		}

		function wrapOutput(sKey) {
			return function(oValue) {
				var oObj = {};
				oObj[sKey] = oValue;
				return oObj;
			};
		}

		function getAttributeValue(oNode, sKeyValue, oDefinitionProperties) {
			return function() {
				var vValue = oNode.getAttribute(sKeyValue);
				if (!vValue && oDefinitionProperties.defaultValue) {
					vValue = oDefinitionProperties.defaultValue;
				}
				return wrapOutput(sKeyValue)(vValue);
			};
		}

		function resolve(oMacroDefinition, oNode, oVisitor) {
			var sFragmentName = oMacroDefinition.fragment || oMacroDefinition.namespace + "." + oMacroDefinition.name,
				sName = "this",
				sI18nName = sName + ".i18n",
				mContexts = {},
				oAttributesModel = new JSONModel(oNode),
				sMetadataContexts = oNode.getAttribute("metadataContexts"),
				oMetadataContexts = {},
				oSettings = oVisitor.getSettings(),
				j;

			var oMetadata = prepareMetadata(oMacroDefinition.metadata);

			oAttributesModel._getObject = function(sPath, oContext) {
				if ((sPath === undefined || sPath === "") && this.oProps) {
					return this.oProps;
				}
				// just return the attribute - we can't validate them and we don't support aggregations for now
				if (this.oProps && this.oProps.hasOwnProperty(sPath)) {
					return this.oProps[sPath];
				}
				return oNode.getAttribute(sPath);
			};

			oAttributesModel.getContextName = function() {
				return sName;
			};

			oAttributesModel.$$valueAsPromise = true; //for asynchronuous preprocessing

			//make sure all texts can be accessed at templating time
			mContexts[sI18nName] = oI18nModel.getContext("/");

			//Inject storage for macros
			if (!oSettings[sFragmentName]) {
				oSettings[sFragmentName] = {};
			}

			// First of all we need to visit the attributes
			var oTargetPromise = null;
			var bMetadataContextLegacy = true;
			if (oMacroDefinition.hasValidation) {
				var oDefinitionProperties = oMetadata.properties;
				var oDefinitionContexts = oMetadata.metadataContexts;
				var aDefinitionPropertiesKeys = Object.keys(oDefinitionProperties);
				var aDefinitionContextsKeys = Object.keys(oDefinitionContexts);
				var aAttributeVisitorPromises = [];
				for (j = 0; j < aDefinitionPropertiesKeys.length; j++) {
					var sKeyValue = aDefinitionPropertiesKeys[j];
					if (oNode.hasAttribute(sKeyValue)) {
						aAttributeVisitorPromises.push(
							oVisitor
								.visitAttribute(oNode, oNode.attributes[sKeyValue])
								.then(getAttributeValue(oNode, sKeyValue, oDefinitionProperties[sKeyValue]))
						);
					} else {
						var oObj = {};
						oObj[sKeyValue] = oDefinitionProperties[sKeyValue].defaultValue;
						aAttributeVisitorPromises.push(Promise.resolve(oObj));
					}
				}
				// First check if the contexts are defined directly
				bMetadataContextLegacy = false;
				for (j = 0; j < aDefinitionContextsKeys.length; j++) {
					if (oNode.hasAttribute(aDefinitionContextsKeys[j])) {
						var sAttributeValue = oNode.getAttribute(aDefinitionContextsKeys[j]);
						oVisitor.getResult(sAttributeValue, oNode);
						var oMetadataContext = ManagedObject.bindingParser(sAttributeValue);
						oMetadataContext.name = aDefinitionContextsKeys[j];
						addSingleContext(mContexts, oVisitor, oMetadataContext, oMetadataContexts);
						aAttributeVisitorPromises.push(
							Promise.resolve(wrapOutput(aDefinitionContextsKeys[j])(mContexts[aDefinitionContextsKeys[j]]))
						);
					} else {
						bMetadataContextLegacy = true;
					}
				}

				oTargetPromise = SyncPromise.all(aAttributeVisitorPromises);
			} else {
				oTargetPromise = oVisitor.visitAttributes(oNode);
			}
			return oTargetPromise
				.then(function(aProps) {
					if (aProps != null) {
						var oProps = aProps.reduce(function(oReducer, oProp) {
							return Object.assign(oReducer, oProp);
						}, {});

						if (oMacroDefinition.create) {
							var oControlConfig = {};
							if (oSettings.models.viewData) {
								oControlConfig = oSettings.models.viewData.getProperty("/controlConfiguration");
							}
							oProps = oMacroDefinition.create(oProps, oControlConfig);
						}
						oAttributesModel.oProps = oProps;
					}
					if (bMetadataContextLegacy && sMetadataContexts) {
						oMetadataContexts = sMetadataContexts ? ManagedObject.bindingParser(sMetadataContexts) : { parts: [] };
						if (!oMetadataContexts.parts) {
							oMetadataContexts = { parts: [oMetadataContexts] };
						}

						for (j = 0; j < oMetadataContexts.parts.length; j++) {
							addSingleContext(mContexts, oVisitor, oMetadataContexts.parts[j], oMetadataContexts);
							// Make sure every previously defined context can be used in the next binding
							oVisitor = oVisitor["with"](mContexts, false);
						}
					}
				})
				.then(function() {
					var oPreviousMacroInfo;
					mContexts[sName] = oAttributesModel.getContext("/");

					//Keep track
					if (TraceInfo.isTraceInfoActive()) {
						var oTraceInfo = TraceInfo.traceMacroCalls(sFragmentName, oMetadata, mContexts, oNode, oVisitor);
						if (oTraceInfo) {
							oPreviousMacroInfo = oSettings["_macroInfo"];
							oSettings["_macroInfo"] = oTraceInfo.macroInfo;
						}
					}
					validateMacroSignature(sFragmentName, oMetadata, mContexts, oNode);

					var oContextVisitor = oVisitor["with"](mContexts, true);
					// var oParent = oNode.parentNode;
					return oContextVisitor.insertFragment(sFragmentName, oNode).then(function() {
						if (oPreviousMacroInfo) {
							//restore macro info if available
							oSettings["_macroInfo"] = oPreviousMacroInfo;
						} else {
							delete oSettings["_macroInfo"];
						}
					});
				});
		}

		function addSingleContext(mContexts, oVisitor, oCtx, oMetadataContexts) {
			var sKey = oCtx.name || oCtx.model || undefined;

			if (oMetadataContexts[sKey]) {
				return; // do not add twice
			}
			try {
				var sContextPath = oCtx.path;
				if (oCtx.model != null) {
					sContextPath = oCtx.model + ">" + sContextPath;
				}
				mContexts[sKey] = oVisitor.getContext(sContextPath); // add the context to the visitor
				var mSetting = oVisitor.getSettings();
				if (mSetting && mSetting.bindingContexts && mSetting.bindingContexts.entitySet) {
					mContexts[sKey].$$configModelContext = oVisitor.getSettings().bindingContexts.entitySet.$$configModelContext;
				}
				oMetadataContexts[sKey] = mContexts[sKey]; // make it available inside metadataContexts JSON object
			} catch (ex) {
				// ignore the context as this can only be the case if the model is not ready, i.e. not a preprocessing model but maybe a model for
				// providing afterwards
				// TODO not yet implemented
				//mContexts["_$error"].oModel.setProperty("/" + sKey, ex);
			}
		}

		function register(oMacroDefinition) {
			XMLPreprocessor.plugIn(resolve.bind(this, oMacroDefinition), oMacroDefinition.namespace, oMacroDefinition.name);
		}

		// add private methods for QUnit test to register function
		register._validateMacroSignature = validateMacroSignature;

		return {
			register: register
		};
	}
);
