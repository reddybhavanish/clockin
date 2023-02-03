sap.ui.define([], function() {
	"use strict";
	var SemanticKeyHelper = {
		getSemanticKeys: function(oMetaModel, sEntitySetName) {
			return oMetaModel.getObject("/" + sEntitySetName + "/@com.sap.vocabularies.Common.v1.SemanticKey");
		},
		getSemanticObjectInformation: function(oMetaModel, sEntitySetName) {
			var oSemanticObject = oMetaModel.getObject("/" + sEntitySetName + "/@com.sap.vocabularies.Common.v1.SemanticObject");
			var aSemanticKeys = this.getSemanticKeys(oMetaModel, sEntitySetName);
			return {
				semanticObject: oSemanticObject,
				semanticKeys: aSemanticKeys
			};
		},
		getSemanticPath: function(oContext) {
			var oMetaModel = oContext.getModel().getMetaModel();
			var sEntitySetName = oMetaModel.getMetaContext(oContext.getPath()).getObject("@sapui.name");
			var oSemanticObjectInformation = this.getSemanticObjectInformation(oMetaModel, sEntitySetName);
			if (!oSemanticObjectInformation.semanticKeys) {
				// If there is no semantic key just return the original path
				return oContext.getPath();
			} else {
				var sSemanticKeysPart = oSemanticObjectInformation.semanticKeys
					.map(function(oSemanticKey) {
						return oSemanticKey.$PropertyPath;
					})
					.map(function(sPropertyPath) {
						return sPropertyPath + "=" + oContext.getProperty(sPropertyPath);
					})
					.join(",");
				return sEntitySetName + "(" + sSemanticKeysPart + ")";
			}
		}
	};
	return SemanticKeyHelper;
});
