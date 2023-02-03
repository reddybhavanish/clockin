sap.ui.define(
	[
		"sap/base/util/LoaderExtensions",
		"sap/base/util/UriParameters",
		"sap/base/util/merge",
		"sap/base/strings/formatMessage",
		"sap/base/strings/capitalize"
	],
	function(LoaderExtensions, UriParameters, mergeObjects, formatMessageRaw, capitalize) {
		"use strict";

		var _oStateCheckFn = {
			focus: function(oElement) {
				// Need to also test the class sapMFocus for some elements that don't match with default jQuery focus selector (sap.m.InputBase)
				return oElement.$().is(":focus") || oElement.$().hasClass("sapMFocus") || oElement.$().find(":focus").length > 0;
			}
		};

		var Utils = {};

		Utils.checkControlState = function(oElement, mExepectedState) {
			var bIsCompliant = false;
			if (mExepectedState) {
				bIsCompliant = Object.keys(mExepectedState).some(function(sProperty) {
					return _oStateCheckFn[sProperty](oElement) !== mExepectedState[sProperty];
				});
			}
			return !bIsCompliant;
		};

		Utils.getManifest = function(sComponentName) {
			var oUriParams = new UriParameters(window.location.href),
				sDeltaManifest = oUriParams.get("manifest"),
				sTenantID,
				oDefaultManifest = LoaderExtensions.loadResource(sComponentName + "/manifest.json");

			try {
				sTenantID = window.parent.__karma__.config.ui5.shardIndex;
			} catch (error) {
				sTenantID = undefined;
			}

			var oTargetManifest = oDefaultManifest;
			if (sDeltaManifest) {
				sDeltaManifest.split(",").forEach(function(sSingleDeltaManifest) {
					if (sSingleDeltaManifest.indexOf("/") !== 0) {
						sSingleDeltaManifest = sComponentName + "/" + sSingleDeltaManifest;
					}
					oTargetManifest = mergeObjects({}, oTargetManifest, LoaderExtensions.loadResource(sSingleDeltaManifest));
				});
			}
			if (sTenantID !== undefined) {
				oTargetManifest["sap.app"].dataSources.mainService.uri =
					"/tenant-" + sTenantID + oTargetManifest["sap.app"].dataSources.mainService.uri;
			}
			return oTargetManifest;
		};

		Utils.isOfType = function(vToTest, vValidTypes, bNullAndUndefinedAreValid) {
			var aValidTypes = Array.isArray(vValidTypes) ? vValidTypes : [vValidTypes];

			return aValidTypes.reduce(function(bIsOfType, vTypeToCheck) {
				if (bIsOfType) {
					return true;
				}

				if (vTypeToCheck === null || vTypeToCheck === undefined) {
					return vToTest === vTypeToCheck;
				}

				if (vToTest === null || vToTest === undefined) {
					return !!bNullAndUndefinedAreValid;
				}

				if (typeof vTypeToCheck === "function") {
					if (vTypeToCheck === Boolean) {
						return typeof vToTest === "boolean";
					}
					if (vTypeToCheck === Array) {
						return Array.isArray(vToTest);
					}
					if (vTypeToCheck === String) {
						return typeof vToTest === "string" || vToTest instanceof String;
					}
					if (vTypeToCheck === Object) {
						return typeof vToTest === "object" && vToTest.constructor === Object;
					}
					if (vTypeToCheck === Number) {
						return typeof vToTest === "number";
					}
					return vToTest instanceof vTypeToCheck;
				}

				return typeof vToTest === vTypeToCheck;
			}, false);
		};

		Utils.isArguments = function(vValue) {
			return Object.prototype.toString.call(vValue) === "[object Arguments]";
		};

		Utils.parseArguments = function(aExpectedTypes) {
			var aArguments = Array.prototype.slice.call(arguments, 1);

			if (aArguments.length === 1 && Utils.isArguments(aArguments[0])) {
				aArguments = Array.prototype.slice.call(aArguments[0], 0);
			}

			return aExpectedTypes.reduce(function(aActualArguments, vExpectedType) {
				if (Utils.isOfType(aArguments[0], vExpectedType, true)) {
					aActualArguments.push(aArguments.shift());
				} else {
					aActualArguments.push(undefined);
				}
				return aActualArguments;
			}, []);
		};

		Utils.formatObject = function(mObject) {
			if (Utils.isOfType(mObject, [null, undefined])) {
				return "";
			}
			if (Utils.isOfType(mObject, Array)) {
				return (
					"[" +
					mObject
						.map(function(oElement) {
							return Utils.formatObject(oElement);
						})
						.join(", ") +
					"]"
				);
			}
			if (Utils.isOfType(mObject, Object)) {
				return (
					"{" +
					Object.keys(mObject)
						.map(function(sKey) {
							return sKey + ": " + Utils.formatObject(mObject[sKey]);
						})
						.join(", ") +
					"}"
				);
			}
			return mObject.toString();
		};

		Utils.formatMessage = function(sMessage) {
			var aParameters = Array.prototype.slice.call(arguments, 1).map(function(vParameter) {
				return Utils.formatObject(vParameter);
			});
			return formatMessageRaw(sMessage && sMessage.replace(/'/g, "''"), aParameters);
		};

		Utils.mergeObjects = function() {
			return mergeObjects.apply(this, [{}].concat(Array.prototype.slice.call(arguments)));
		};

		Utils.getAggregation = function(oManagedObject, sAggregationName) {
			if (!oManagedObject) {
				return null;
			}
			var fnAggregation = oManagedObject["get" + capitalize(sAggregationName, 0)];
			if (!fnAggregation) {
				throw new Error("Object '" + oManagedObject + "' does not have an aggregation called '" + sAggregationName + "'");
			}
			return fnAggregation.call(oManagedObject);
		};

		Utils.pushToArray = function(vElement, vTarget, bAtTheBeginning) {
			if (vTarget === undefined) {
				vTarget = [];
			} else if (!Array.isArray(vTarget)) {
				vTarget = [vTarget];
			} else {
				vTarget = vTarget.slice(0);
			}

			if (Array.isArray(vElement)) {
				vTarget = bAtTheBeginning ? vElement.slice(0).concat(vTarget) : vTarget.concat(vElement);
			} else if (vElement !== undefined) {
				if (bAtTheBeginning) {
					vTarget.unshift(vElement);
				} else {
					vTarget.push(vElement);
				}
			}
			return vTarget;
		};

		return Utils;
	}
);
