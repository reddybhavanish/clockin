/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2020 SAP SE. All rights reserved
    
 */

// ---------------------------------------------------------------------------------------
// Util class used to help handle side effects
// ---------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------

// TODO: enhance/take over common functionalities from macro field runtime, fe edit flow and transaction helper

sap.ui.define(["sap/base/Log"], function(Log) {
	"use strict";

	var oSideEffectsUtil = {};

	/**
	 * Checks the Side Effects path expressions for empty NavigationPropertyPaths and changes them to
	 * PropertyPaths with path "*"
	 * @function
	 * @name replaceEmptyNavigationPaths
	 * @param {Array} aPathExpressions the array of target path expressions used for the side effect
	 * @returns {Array} updated path expressions
	 */
	oSideEffectsUtil.replaceEmptyNavigationPaths = function(aPathExpressions) {
		return (
			(aPathExpressions &&
				aPathExpressions.map(function(oPathExpression) {
					if (oPathExpression["$NavigationPropertyPath"] === "") {
						return {
							"$PropertyPath": "*"
						};
					}
					return oPathExpression;
				})) ||
			[]
		);
	};
	/**
	 * Checks the Side PropertyPath with path * and adds text property in
	 * PropertyPaths with path "*"
	 * @function
	 * @name addTextProperties
	 * @param {Array} aPathExpressions the array of target path expressions used for the side effect
	 * @param {Object} oModel - MetaModel
	 * @param {String} Base entity name
	 * @returns {Array} updated path expressions
	 */
	oSideEffectsUtil.addTextProperties = function(aPathExpressions, oMetaModel, sBaseEntityType) {
		var sBasePath = sBaseEntityType,
			aTextProperties = [],
			oTextProperty,
			oEntityType,
			bRequestAll;
		if (sBasePath.charAt(0) !== "/") {
			sBasePath = "/" + sBasePath;
		}
		if (sBasePath.charAt(sBasePath.length - 1) !== "/") {
			sBasePath = sBasePath + "/";
		}
		aPathExpressions.forEach(function(oPathExpression) {
			if (oPathExpression["$PropertyPath"] === "*") {
				bRequestAll = true;
			} else if (oPathExpression["$PropertyPath"]) {
				oTextProperty = _getTextProperty(oMetaModel, sBasePath + oPathExpression["$PropertyPath"]);
				if (oTextProperty) {
					aTextProperties.push(oTextProperty);
				}
			}
		});
		if (bRequestAll) {
			oEntityType = oMetaModel.getObject(sBasePath);
			Object.keys(oEntityType).forEach(function(sKey) {
				if (oEntityType[sKey].$kind && oEntityType[sKey].$kind === "Property") {
					oTextProperty = _getTextProperty(oMetaModel, sBasePath + sKey);
					if (oTextProperty) {
						aTextProperties.push(oTextProperty);
					}
				}
			});
		}
		return aPathExpressions.concat(aTextProperties);
	};
	function _getTextProperty(oMetaModel, sPath) {
		var oTextAnnotation = oMetaModel.getObject(sPath + "@com.sap.vocabularies.Common.v1.Text");
		if (oTextAnnotation && oTextAnnotation["$Path"]) {
			return { "$PropertyPath": oTextAnnotation["$Path"] };
		}
		return undefined;
	}

	/**
	 * Logs the Side Effects request with the information -
	 * 		1. Context path - of the context on which side effects are requested
	 * 		2. Property paths - the ones which are requested
	 * @function
	 * @name logRequest
	 * @param {map} oRequest the side effect request ready for execution
	 * @param {Object} oRequest.context the context on which side effect will be requested
	 * @param {Array} oRequest.pathExpressions array of $PropertyPath and $NavigationPropertyPath
	 */
	oSideEffectsUtil.logRequest = function(oRequest) {
		var sPropertyPaths =
			Array.isArray(oRequest.pathExpressions) &&
			oRequest.pathExpressions.reduce(function(sPaths, oPath) {
				return sPaths + "\n\t\t" + (oPath["$PropertyPath"] || oPath["$NavigationPropertyPath"] || "");
			}, "");
		Log.info("SideEffects request:\n\tContext path : " + oRequest.context.getPath() + "\n\tProperty paths :" + sPropertyPaths);
	};

	return oSideEffectsUtil;
});
