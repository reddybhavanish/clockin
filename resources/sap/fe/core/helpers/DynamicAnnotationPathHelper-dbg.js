sap.ui.define(["sap/ui/base/BindingParser"], function(BindingParser) {
	"use strict";

	var getObject = function(oObject, sPath) {
		if (!oObject) {
			return null;
		}
		var sPathSplit = sPath.split("/");
		if (sPathSplit.length === 1) {
			return oObject[sPath];
		} else {
			return getObject(oObject[sPathSplit[0]], sPathSplit.splice(1).join("/"));
		}
	};
	/**
	 * Resolve a dynamic annotation path down to a standard annotation path
	 * @param sAnnotationPath
	 * @param oMetaModel
	 * @returns {sAnnotationPath} the non dymamic versiopn of the annotation path
	 */
	var resolveDynamicExpression = function(sAnnotationPath, oMetaModel) {
		if (sAnnotationPath.indexOf("[") !== -1) {
			var firstBracket = sAnnotationPath.indexOf("[");
			var sStableBracket = sAnnotationPath.substr(0, firstBracket);
			var sRest = sAnnotationPath.substr(firstBracket + 1);
			var lastBracket = sRest.indexOf("]");
			var aValue = oMetaModel.getObject(sStableBracket);
			var oExpression = BindingParser.parseExpression(sRest.substr(0, lastBracket));
			if (
				Array.isArray(aValue) &&
				oExpression &&
				oExpression.result &&
				oExpression.result.parts &&
				oExpression.result.parts[0] &&
				oExpression.result.parts[0].path
			) {
				var bFound = false;
				for (var i = 0; i < aValue.length && !bFound; i++) {
					var oObjectValue = getObject(aValue[i], oExpression.result.parts[0].path);
					var bResult = oExpression.result.formatter(oObjectValue);
					if (bResult) {
						bFound = true;
					}
				}
				if (bFound) {
					sAnnotationPath = resolveDynamicExpression(sStableBracket + (i - 1) + sRest.substr(lastBracket + 1), oMetaModel);
				}
			}
		}
		return sAnnotationPath;
	};

	return {
		resolveDynamicExpression: resolveDynamicExpression
	};
});
