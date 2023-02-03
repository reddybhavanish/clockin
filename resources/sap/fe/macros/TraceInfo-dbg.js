/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2017 SAP SE. All rights reserved
    
 */

/**
 * Trace Information of sap.fe
 */
sap.ui.define(
	["sap/ui/base/ManagedObject", "sap/ui/core/util/XMLPreprocessor"],
	function(ManagedObject, XMLPreprocessor) {
		"use strict";
		//Trace information
		var aTraceInfo = [
			/* Structure for a macro
			{
				macro: '', //name of macro
				metaDataContexts: [ //Properties of type sap.ui.model.Context
					{
						name: '', //context property name / key
						path: '', //from oContext.getPath()
					}
				],
				properties: { // Other properties which become part of {this>}
					property1: value,
					property2: value
				}
				viewInfo: {
					viewInfo: {} // As specified in view or fragement creation
				},
				traceID: this.index, //ID for this trace information,
				macroInfo: {
					macroID: index, // traceID of this macro (redundant for macros)
					parentMacroID, index // traceID of the parent macro (if it has a parent)
				}
			}
			// Structure for a control
			{
				control: '', //control class
				properties: { // Other properties which become part of {this>}
					property1: {
						originalValue: '', //Value before templating
						resolvedValue: '' //Value after templating
					}
				}
				contexts: { //Models and Contexts used during templating
					// Model or context name used for this control
					modelName1: { // For ODataMetaModel
						path1: {
							path: '', //absolut path within metamodel
							data: '', //data of path unless type Object
						}
					modelName2: {
						// for other model types
						{
							property1: value,
							property2: value
						}
						// In case binding cannot be resolved -> mark as runtime binding
						// This is not always true, e.g. in case the path is metamodelpath
						{
							"bindingFor": "Runtime"
						}
					}
				},
				viewInfo: {
					viewInfo: {} // As specified in view or fragement creation
				},
				macroInfo: {
					macroID: index, // traceID of the macro that created this control
					parentMacroID, index // traceID of the macro's parent macro
				},
				traceID: this.index //ID for this trace information
			}
			*/
		];

		var traceNamespace = "http://schemas.sap.com/sapui5/extension/sap.fe.info/1",
			xmlns = "http://www.w3.org/2000/xmlns/",
			/**
			 * Switch is currently based on url parameter
			 */
			traceIsOn = location.search.indexOf("sap-ui-xx-feTraceInfo=true") > -1,
			/**
			 * Specify all namespaces that shall be traced during templating
			 */
			aNamespaces = [
				"sap.m",
				"sap.uxap",
				"sap.ui.unified",
				"sap.f",
				"sap.ui.table",
				"sap.suite.ui.microchart",
				"sap.ui.layout.form",
				"sap.ui.mdc",
				"sap.ui.mdc.link",
				"sap.ui.mdc.field",
				"sap.fe.fpm"
			],
			oCallbacks = {};

		function fnClone(oObject) {
			return JSON.parse(JSON.stringify(oObject));
		}

		function collectContextInfo(sValue, oContexts, oVisitor, oNode) {
			var aContexts,
				aPromises = [];
			try {
				aContexts = ManagedObject.bindingParser(sValue, undefined, false, true) || [];
			} catch (e) {
				aContexts = [];
			}
			aContexts = Array.isArray(aContexts) ? aContexts : [aContexts];
			aContexts
				.filter(function(oContext) {
					return oContext.path || oContext.parts;
				})
				.forEach(function(oContext) {
					var aParts = oContext.parts || [oContext];
					aParts
						.filter(function(oContext) {
							return oContext.path;
						})
						.forEach(function(oContext) {
							var oModel = (oContexts[oContext.model] = oContexts[oContext.model] || {}),
								sSimplePath =
									oContext.path.indexOf(">") < 0
										? (oContext.model && oContext.model + ">") + oContext.path
										: oContext.path,
								oRealContext,
								aParts;

							if (typeof oContext.model === "undefined" && sSimplePath.indexOf(">") > -1) {
								aParts = sSimplePath.split(">");
								oContext.model = aParts[0];
								oContext.path = aParts[1];
							}
							try {
								oRealContext = oVisitor.getContext(sSimplePath);
								aPromises.push(
									oVisitor
										.getResult("{" + sSimplePath + "}", oNode)
										.then(function(oResult) {
											if (
												oRealContext
													.getModel()
													.getMetadata()
													.getName() === "sap.ui.model.json.JSONModel"
											) {
												oModel[oContext.path] = oResult; //oRealContext.getObject(oContext.path);
											} else {
												oModel[oContext.path] = {
													path: oRealContext.getPath(),
													data: typeof oResult === "object" ? "[ctrl/cmd-click] on path to see data" : oResult
												};
											}
										})
										.catch(function(exc) {
											oModel[oContext.path] = {
												bindingFor: "Runtime"
											};
										})
								);
							} catch (exc) {
								oModel[oContext.path] = {
									bindingFor: "Runtime"
								};
							}
						});
				});
			return Promise.all(aPromises);
		}

		function fillAttributes(oResults, oAttributes, sName, sValue) {
			return oResults
				.then(function(result) {
					oAttributes[sName] =
						sValue !== result
							? {
									originalValue: sValue,
									resolvedValue: result
							  }
							: sValue;
				})
				.catch(function(e) {
					oAttributes[sName] = {
						originalValue: sValue,
						error: (e.stack && e.stack.toString()) || e
					};
				});
		}

		function collectInfo(oNode, oVisitor) {
			var oAttributes = {},
				aPromises = [],
				oContexts = {},
				oResults;
			for (var i = oNode.attributes.length >>> 0; i--; ) {
				var oAttribute = oNode.attributes[i],
					sName = oAttribute.nodeName,
					sValue = oNode.getAttribute(sName);
				if (!["core:require"].includes(sName)) {
					aPromises.push(collectContextInfo(sValue, oContexts, oVisitor, oNode));
					oResults = oVisitor.getResult(sValue, oNode);
					if (oResults) {
						aPromises.push(fillAttributes(oResults, oAttributes, sName, sValue));
					} else {
						//What
					}
				}
			}
			return Promise.all(aPromises).then(function() {
				return { properties: oAttributes, contexts: oContexts };
			});
		}

		function resolve(oNode, oVisitor) {
			var sControlName = oNode.nodeName.split(":")[1] || oNode.nodeName,
				bIsControl = /^[A-Z]/.test(sControlName),
				oTraceMetadataContext = {
					control: oNode.namespaceURI + "." + (oNode.nodeName.split(":")[1] || oNode.nodeName)
				};

			if (bIsControl) {
				if (!oNode.ownerDocument.firstChild.getAttribute("xmlns:trace")) {
					oNode.ownerDocument.firstChild.setAttributeNS(xmlns, "xmlns:trace", traceNamespace);
					oNode.ownerDocument.firstChild.setAttributeNS(traceNamespace, "trace:is", "on");
				}
				return collectInfo(oNode, oVisitor)
					.then(function(result) {
						var bRelevant = Object.keys(result.contexts).length > 0; //If no context was used it is not relevant so we ignore Object.keys(result.properties).length
						if (bRelevant) {
							Object.assign(oTraceMetadataContext, result);
							oTraceMetadataContext.viewInfo = oVisitor.getViewInfo();
							oTraceMetadataContext.macroInfo = oVisitor.getSettings()["_macroInfo"];
							oTraceMetadataContext.traceID = aTraceInfo.length;
							oNode.setAttributeNS(traceNamespace, "trace:traceID", oTraceMetadataContext.traceID);
							aTraceInfo.push(oTraceMetadataContext);
						}
						return oVisitor.visitAttributes(oNode).then(function() {
							return oVisitor.visitChildNodes(oNode);
						});
					})
					.catch(function(exc) {
						oTraceMetadataContext.error = {
							exception: exc,
							node: new XMLSerializer().serializeToString(oNode)
						};
					});
			} else {
				return oVisitor.visitAttributes(oNode).then(function() {
					return oVisitor.visitChildNodes(oNode);
				});
			}
		}

		/**
		 * Register path-through XMLPreprocessor plugin for all namespaces
		 * given above in aNamespaces
		 */
		if (traceIsOn) {
			aNamespaces.forEach(function(namespace) {
				oCallbacks[namespace] = XMLPreprocessor.plugIn(resolve.bind(namespace), namespace);
			});
		}

		/**
		 * Adds information about the processing of one macro to the collection
		 * @function
		 * @name sap.fe.macros.TraceInfo.traceMacroCalls
		 * @param {String} sName Macro class name
		 * @param {Object} oMetadata Definition from (macro).metadata.js
		 * @param {Object} mContexts Available named contexts
		 * @param {XMLNode} oNode
		 * @param {Object} oVisitor
		 * @private
		 * @sap-restricted
		 * @static
		 */
		function traceMacroCalls(sName, oMetadata, mContexts, oNode, oVisitor) {
			var aMetadataContextKeys = (oMetadata.metadataContexts && Object.keys(oMetadata.metadataContexts)) || [],
				aProperties = (oMetadata.properties && Object.keys(oMetadata.properties)) || [],
				macroInfo = fnClone(oVisitor.getSettings()["_macroInfo"] || {}),
				oTraceMetadataContext = {
					macro: sName,
					metaDataContexts: [],
					properties: {}
				};

			if (aMetadataContextKeys.length === 0) {
				//In case the macro has not metadata.js we take all metadataContexts except this
				aMetadataContextKeys = Object.keys(mContexts).filter(function(name) {
					return name !== "this";
				});
			}

			if (!oNode.getAttribute("xmlns:trace")) {
				oNode.setAttributeNS(xmlns, "xmlns:trace", traceNamespace);
			}

			if (aMetadataContextKeys.length > 0) {
				aMetadataContextKeys.forEach(function(sKey) {
					var oContext = mContexts[sKey],
						oMetaDataContext = oContext && {
							name: sKey,
							path: oContext.getPath()
							//data: JSON.stringify(oContext.getObject(),null,2)
						};

					if (oMetaDataContext) {
						oTraceMetadataContext.metaDataContexts.push(oMetaDataContext);
					}
				});

				aProperties.forEach(function(sKey) {
					var //oPropertySettings = oMetadata.properties[sKey],
						oProperty = mContexts.this.getObject(sKey);
					// (oNode.hasAttribute(sKey) && oNode.getAttribute(sKey)) ||
					// (oPropertySettings.hasOwnProperty("defaultValue") && oPropertySettings.define) ||
					// false;

					if (oProperty) {
						oTraceMetadataContext.properties[sKey] = oProperty;
					}
				});
				oTraceMetadataContext.viewInfo = oVisitor.getViewInfo();
				oTraceMetadataContext.traceID = aTraceInfo.length;
				macroInfo.parentMacroID = macroInfo.macroID;
				macroInfo.macroID = oTraceMetadataContext.traceID;
				oTraceMetadataContext.macroInfo = macroInfo;
				oNode.setAttributeNS(traceNamespace, "trace:macroID", oTraceMetadataContext.traceID);
				aTraceInfo.push(oTraceMetadataContext);
				return oTraceMetadataContext;
			}
		}

		/**
		 * Returns the globally stored trace information for the macro or
		 * control marked with the given id.
		 *
		 * Returns all trace information if no id is specified
		 *
		 *
<pre>Structure for a macro
{
	macro: '', //name of macro
	metaDataContexts: [ //Properties of type sap.ui.model.Context
		{
			name: '', //context property name / key
			path: '', //from oContext.getPath()
		}
	],
	properties: { // Other properties which become part of {this>}
		property1: value,
		property2: value
	}
	viewInfo: {
		viewInfo: {} // As specified in view or fragement creation
	},
	traceID: this.index, //ID for this trace information,
	macroInfo: {
		macroID: index, // traceID of this macro (redundant for macros)
		parentMacroID, index // traceID of the parent macro (if it has a parent)
	}
}
Structure for a control
{
	control: '', //control class
	properties: { // Other properties which become part of {this>}
		property1: {
			originalValue: '', //Value before templating
			resolvedValue: '' //Value after templating
		}
	}
	contexts: { //Models and Contexts used during templating
		// Model or context name used for this control
		modelName1: { // For ODataMetaModel
			path1: {
				path: '', //absolut path within metamodel
				data: '', //data of path unless type Object
			}
		modelName2: {
			// for other model types
			{
				property1: value,
				property2: value
			}
			// In case binding cannot be resolved -> mark as runtime binding
			// This is not always true, e.g. in case the path is metamodelpath
			{
				"bindingFor": "Runtime"
			}
		}
	},
	viewInfo: {
		viewInfo: {} // As specified in view or fragement creation
	},
	macroInfo: {
		macroID: index, // traceID of the macro that created this control
		parentMacroID, index // traceID of the macro's parent macro
	},
	traceID: this.index //ID for this trace information
}</pre>
		 *
		 * @function
		 * @name sap.fe.macros.TraceInfo.getTraceInfo
		 * @param {Number} id Trace information id
		 * @returns {Object|Array} Object for one trace info / Array for all
		 * @private
		 * @sap-restricted
		 * @static
		 */
		function getTraceInfo(id) {
			var aErrors;
			if (id) {
				return aTraceInfo[id];
			}
			aErrors = aTraceInfo.filter(function(traceInfo) {
				return traceInfo.error;
			});
			return (aErrors.length > 0 && aErrors) || aTraceInfo;
		}

		/**
		 * Returns true if trace info collection is active
		 * @function
		 * @name sap.fe.macros.TraceInfo.isTraceInfoActive
		 * @returns {Boolean} true when active
		 * @private
		 * @sap-restricted
		 * @static
		 */
		function isTraceInfoActive() {
			return traceIsOn;
		}

		/**
		 * @typedef {map} sap.fe.macros.TraceInfo
		 * Fiori elements trace information
		 *
		 * Once traces is switched, information about macros and controls
		 * that are processed during xml preprocessing ( @see {@link sap.ui.core.util.XMLPreprocessor})
		 * will be collected within this singleton
		 * @namespace
		 * @private
		 * @sap-restricted
		 * @experimental This module is only for experimental use! <br/><b>This is only a POC and maybe deleted</b>
		 * @since 1.74.0
		 */
		return {
			isTraceInfoActive: isTraceInfoActive,
			traceMacroCalls: traceMacroCalls,
			getTraceInfo: getTraceInfo
		};
	},
	true
);
