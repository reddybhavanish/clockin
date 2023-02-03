/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2020 SAP SE. All rights reserved
    
 */

/**
 * Stable Id helper
 */
sap.ui.define(["sap/ui/core/library", "sap/base/Log"], function(coreLibrary, Log) {
	"use strict";
	var Id = coreLibrary.ID;

	function replaceSpecialChars(sId) {
		if (sId.indexOf(" ") >= 0) {
			Log.error(sId + " - Spaces are not allowed in ID parts.");
			throw sId + " - Spaces are not allowed in ID parts.";
		}
		sId = sId
			.replace(/^\/|^@|^#/, "") // remove special characters from the beginning of the string
			.replace(/\/$|@$|#$/, "") // remove special characters from the end of the string
			.replace(/\/|@|#/g, "::"); // replace special characters with ::

		while (sId.indexOf("::::") > -1) {
			sId = sId.replace("::::", "::");
		}

		return sId;
	}

	function removeNamespaces(sId) {
		sId = sId.replace("com.sap.vocabularies.UI.v1.", "");
		sId = sId.replace("com.sap.vocabularies.Communication.v1.", "");
		return sId;
	}

	function getStableIdPartFromValue(oValue) {
		if (oValue && oValue.$Path) {
			return oValue.$Path;
		}

		if (oValue && oValue.$Apply && oValue.$Function === "odata.concat") {
			var sPathConcat = "";
			for (var i = 0; i < oValue.$Apply.length; i++) {
				if (oValue.$Apply[i].$Path) {
					if (sPathConcat) {
						sPathConcat += "::";
					}
					sPathConcat += oValue.$Apply[i].$Path;
				}
			}
			return sPathConcat;
		}
	}

	function getStableIdPartFromSemanticObjectAndAction(oDataField) {
		var sIdPart = "";
		if (typeof oDataField.SemanticObject == "string") {
			sIdPart += oDataField.SemanticObject;
		} else if (oDataField.SemanticObject.$Path) {
			sIdPart += oDataField.SemanticObject.$Path;
		}
		if (typeof oDataField.Action == "string") {
			sIdPart += "::" + oDataField.Action;
		} else if (oDataField.Action && oDataField.Action.$Path) {
			sIdPart += "::" + oDataField.Action.$Path;
		}
		if (oDataField["RequiresContext"] && oDataField["RequiresContext"] == true) {
			sIdPart += "::RequiresContext";
		}
		return sIdPart;
	}

	var oStableIdHelper = {
		/**
		 * generates Stable Id based on the given parameters
		 *
		 * parameters are combined in the same order that they are provided and are separated by '::'
		 * special characters (@, /, #) are replaced by '::' if they are in the middle of the Stable Id and removed all together if the are part at the beginning or end
		 * Example:
		 * // Get Constant Stable Id
		 * generate(['Stable', 'Id']) would result in 'Stable::Id' as the Stable Id
		 *
		 * // Get Paramerterized Stable Id from a Collection Facet
		 * var oParameter = {
		 * 		Facet: {
		 * 			$Type: "com.sap.vocabularies.UI.v1.CollectionFacet",
		 * 			Label: "General Info Facet Label",
		 * 			ID: 'GeneralInformation'
		 * 		}
		 * };
		 * generate(['section', oParameter]) would result in 'section::GeneralInformation' as the Stable Id
		 *
		 * oParameter is and object of Metadata contexts available while templating which will be used to generate Stable IDs.
		 * oParameter object keys define the type of metadata context.
		 * For example, the key 'Facet'in the above example tells the Stable Id Helper that the context is a Facet (could be reference or collection facet)
		 *
		 * Currently supported metadata context is Collection/Reference facet identified by 'Facet' key.
		 *
		 * @param {Array<(string|object)>} aStableIdParts - Array of strings and objects
		 * @returns {string} Stable Id constructed from the provided parameters
		 */
		generate: function(aStableIdParts) {
			var sStableId = "",
				vElement,
				sFacetId;

			for (var i = 0; i < aStableIdParts.length; i++) {
				vElement = aStableIdParts[i];
				sStableId += sStableId !== "" ? "::" : "";
				if (
					vElement["Facet"] &&
					vElement["Facet"]["$Type"] &&
					vElement["Facet"]["$Type"] == "com.sap.vocabularies.UI.v1.CollectionFacet"
				) {
					sStableId += vElement["Facet"]["ID"];
				} else {
					if (typeof vElement === "string") {
						if (vElement) {
							sStableId += vElement;
						}
					} else if (typeof vElement === "object") {
						// handle parameters
						if (vElement && vElement.Facet) {
							if (vElement.Facet.$Type && vElement.Facet.$Type === "com.sap.vocabularies.UI.v1.CollectionFacet") {
								if (vElement.Facet.ID) {
									sFacetId = vElement.Facet.ID;
								}
							} else if (vElement.Facet.$Type && vElement.Facet.$Type === "com.sap.vocabularies.UI.v1.ReferenceFacet") {
								if (vElement.Facet.ID) {
									sFacetId = vElement.Facet.ID;
								} else {
									sFacetId = vElement.Facet.Target.$AnnotationPath || vElement.Facet.Target.value; // Compliant with Converters
								}
							}
							if (sFacetId) {
								sStableId += sFacetId;
							}
						}
						if (vElement && vElement["$Type"] && vElement["$Type"].indexOf("com.sap.vocabularies.UI.v1.DataField") > -1) {
							sStableId += this.getStableIdPartFromDataField(vElement);
						}
					}
				}
			}
			sStableId = oStableIdHelper.prepareId(sStableId);
			return sStableId;
		},
		getStableIdPartFromDataField: function(oDataField, mParameter) {
			var sIdPart = "";

			if (oDataField.$Type && oDataField.$Type === "com.sap.vocabularies.UI.v1.DataFieldForAction") {
				sIdPart = "DataFieldForAction::";
				sIdPart += oDataField.Action;
				return oStableIdHelper.prepareId(sIdPart);
			} else if (oDataField.$Type && oDataField.$Type === "com.sap.vocabularies.UI.v1.DataFieldForIntentBasedNavigation") {
				sIdPart = "DataFieldForIntentBasedNavigation::";
				sIdPart += getStableIdPartFromSemanticObjectAndAction(oDataField);
				return sIdPart;
			} else if (oDataField.$Type && oDataField.$Type === "com.sap.vocabularies.UI.v1.DataFieldForAnnotation") {
				sIdPart = "DataFieldForAnnotation::";
				sIdPart += oStableIdHelper.prepareId(oDataField.Target.$AnnotationPath);
				return sIdPart;
			} else if (oDataField.$Type && oDataField.$Type === "com.sap.vocabularies.UI.v1.DataFieldWithAction") {
				sIdPart = "DataFieldWithAction::";
				if (oDataField.Value) {
					sIdPart += getStableIdPartFromValue(oDataField.Value) + "::";
				}
				sIdPart += oDataField.Action;
				return oStableIdHelper.prepareId(sIdPart);
			} else if (oDataField.$Type && oDataField.$Type === "com.sap.vocabularies.UI.v1.DataField") {
				sIdPart = "DataField::";
				sIdPart += getStableIdPartFromValue(oDataField.Value);
				return oStableIdHelper.prepareId(sIdPart);
			} else if (oDataField.$Type && oDataField.$Type === "com.sap.vocabularies.UI.v1.DataFieldWithIntentBasedNavigation") {
				sIdPart = "DataFieldWithIntentBasedNavigation::";
				sIdPart += getStableIdPartFromValue(oDataField.Value) + "::";
				sIdPart += getStableIdPartFromSemanticObjectAndAction(oDataField);
				return oStableIdHelper.prepareId(sIdPart);
			} else if (oDataField.$Type && oDataField.$Type === "com.sap.vocabularies.UI.v1.DataFieldWithNavigationPath") {
				sIdPart = "DataFieldWithNavigationPath::";
				sIdPart += getStableIdPartFromValue(oDataField.Value);
				if (oDataField.Target && oDataField.Target["$NavigationPropertyPath"]) {
					sIdPart += "::" + oDataField.Target["$NavigationPropertyPath"];
				}
				return oStableIdHelper.prepareId(sIdPart);
			} else if (oDataField.$Type && oDataField.$Type === "com.sap.vocabularies.UI.v1.DataFieldWithUrl") {
				sIdPart = "DataFieldWithUrl::";
				sIdPart += getStableIdPartFromValue(oDataField.Value);
				return oStableIdHelper.prepareId(sIdPart);
			} else if (mParameter && mParameter.context && mParameter.context.getObject("@sapui.name")) {
				// the context is not referring to da data field but directly to a property, return the property name
				return oStableIdHelper.prepareId(mParameter.context.getObject("@sapui.name"));
			} else {
				// In case of a string or unknown property
				Log.error("Stable ID Helper: Unable to create a stable ID. Please check the annotations.");
			}
			return undefined;
		},
		prepareId: function(sId) {
			sId = removeNamespaces(sId);
			if (Id.isValid(sId)) {
				return sId;
			} else {
				sId = replaceSpecialChars(sId);
				if (Id.isValid(sId)) {
					return sId;
				} else {
					Log.error(sId + " - Stable Id could not be generated due to insufficient information.");
					throw sId + " - Stable Id could not be generated due to insufficient information.";
				}
			}
		}
	};
	return oStableIdHelper;
});
