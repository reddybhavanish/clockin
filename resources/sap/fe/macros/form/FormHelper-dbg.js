/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2017 SAP SE. All rights reserved
    
 */
sap.ui.define(
	["sap/ui/model/odata/v4/AnnotationHelper", "sap/fe/macros/CommonHelper"],
	function(ODataModelAnnotationHelper, CommonHelper) {
		"use strict";

		/**
		 * Helper class used by MDC controls for OData(V4) specific handling
		 *
		 * @private
		 * @experimental This module is only for internal/experimental use!
		 */
		var FormHelper = {
			/*
			 * Method for resolving AnnotationPath if it contains a navigation
			 * @function
			 * @name resolveAnnotationPathForForm
			 * @memberof sap.ui.mdc.odata.v4.form.FormHelper.js
			 * @param {sap.ui.model.Context} - oContext : Context to with path pointing to annotation path of reference facet.
			 * @return : Path to the UI Annotation term to render the form.
			 * Example:
			 * 1. oContext.getPath() : '/Products/$Type/@com.sap.vocabularies.UI.v1.Facets/2/Target/$AnnotationPath'
			 *    oContext.getObject() : '@com.sap.vocabularies.UI.v1.Identification'
			 *    return : '/Products/$Type/UI.Facets/2/Target/$AnnotationPath'
			 * 2. oContext.getPath() : '/Products/$Type/@com.sap.vocabularies.UI.v1.Facets/0/Facets/0/Target/$AnnotationPath'
			 *    oContext.getObject() : 'to_supplier/@com.sap.vocabularies.UI.v1.FieldGroup'
			 *    return : '/Products/$NavigationPropertyBinding/to_supplier/@com.sap.vocabularies.UI.v1.FieldGroup'
			 * 3. oContext.getPath() : '/Products/$Type/@com.sap.vocabularies.UI.v1.Facets/0/Facets/0/Target/$AnnotationPath'
			 *    oContext.getObject() : 'to_supplier/to_department/@com.sap.vocabularies.UI.v1.FieldGroup'
			 *    return : '/Products/$NavigationPropertyBinding/to_supplier/$NavigationPropertyBinding/to_department/@com.sap.vocabularies.UI.v1.FieldGroup'
			 */
			resolveAnnotationPathForForm: function(oContext) {
				var sNavigationPathElements, aNavigationPaths, sEntitySetPath;
				var sPath = oContext.getPath();
				var sAnnotationPath = oContext.getObject();
				var sNavigationPath = ODataModelAnnotationHelper.getNavigationPath(sAnnotationPath);
				if (sNavigationPath) {
					// In case a navigation path exists. like: 'to_supplier', 'to_supplier/to_department' etc
					sNavigationPathElements = sNavigationPath.split("/");
					aNavigationPaths =
						sNavigationPathElements.length > 1
							? sNavigationPathElements.join("/$NavigationPropertyBinding/")
							: sNavigationPathElements[0];
					sEntitySetPath = CommonHelper.getTargetCollection(oContext, aNavigationPaths);
					return sAnnotationPath.replace(sNavigationPath, sEntitySetPath);
				} else {
					return sPath;
				}
			},
			/*
			 * Method to get target EntitySet in case the form container to be rendered is from another EntitySet
			 * @function
			 * @name getTargetEntitySet
			 * @memberof sap.fe.macros.form.FormHelper.js
			 * @param {sap.ui.model.Context} - oContext : Context with path pointing to annotation path of reference facet.
			 * @return : {String} Path to the Target EntitySet.
			 * Example:
			 * 1. oContext.getPath() : '/Products/$NavigationPropertyBinding/to_supplier/@com.sap.vocabularies.UI.v1.FieldGroup'
			 *    return : '/Supplier'
			 */
			getTargetEntitySet: function(oContext) {
				var sEntitySetPath = ODataModelAnnotationHelper.getNavigationPath(oContext.getPath());
				return "/" + oContext.getObject(sEntitySetPath);
			},

			/*
			 * Method to check if a collectionFacet needs to be rendered as a Form.
			 * @function
			 * @name checkIfCollectionFacetNeedsToBeRendered
			 * @memberof sap.fe.macros.form.FormHelper.js
			 * @param {Object} - oCollectionFacet : CollectionFacet object to be rendered containing ReferenceFacets
			 * @param {String} - sPartOfPreview : PartOfPreview that needs to checked against the ReferenceFacets
			 * @return : {boolean} True, if atleaset one match is found with partofpreview against ReferenceFacets. Else, returns false
			 */
			checkIfCollectionFacetNeedsToBeRendered: function(oCollectionFacet, sPartOfPreview) {
				if (oCollectionFacet.$Type === "com.sap.vocabularies.UI.v1.CollectionFacet" && oCollectionFacet.Facets.length) {
					var fnCheckPartOfPreview = function(controlProperty, oReferenceFacet) {
						var annotatedTerm = oReferenceFacet["@com.sap.vocabularies.UI.v1.PartOfPreview"];
						return (
							(controlProperty !== "false" && annotatedTerm !== false) ||
							(controlProperty === "false" && annotatedTerm === false)
						);
					};
					var aReferenceFacet = oCollectionFacet.Facets;
					return aReferenceFacet.some(fnCheckPartOfPreview.bind(null, sPartOfPreview));
				}
				return false;
			},

			/*
			 * Method that checks, if a reference facet needs to be assigned to either "blocks" or "moreBlocks" (tagged by subsection property "partOfPreview!)
			 * @function isReferenceFacetPartOfPreview
			 * @memberof sap.fe.macros.form.FormHelper.js
			 * @param {Object} - oReferenceFacet : Reference facet that needs to be assigned
			 * @param {String} - sPartOfPreview : Subsection property "partOfPreview" that needs to aligned with the reference facet's annotation "PartOfPreview!
			 * @return : {boolean} True, if the ReferenceFacet has the same annotation as the subsection's property "partOfPreview"
			 */
			isReferenceFacetPartOfPreview: function(oReferenceFacet, sPartOfPreview) {
				if (oReferenceFacet.$Type === "com.sap.vocabularies.UI.v1.ReferenceFacet") {
					var annotatedTerm = oReferenceFacet["@com.sap.vocabularies.UI.v1.PartOfPreview"];
					return (
						(sPartOfPreview === "true" && annotatedTerm !== false) || (sPartOfPreview === "false" && annotatedTerm === false)
					);
				}
				return false;
			},

			/*
			 * Method to get the collection of DataFieldAbstracts from the target annotation.
			 * @function
			 * @name getDataFieldCollection
			 * @memberof sap.fe.macros.form.FormHelper.js
			 * @param {sap.ui.model.Context} - oContext : Context with path pointing to target annotation.
			 * @return : {String} Path to the collection of DataFieldAbstracts.
			 */
			getDataFieldCollection: function(oContext) {
				var sPath = oContext.getPath();
				if (oContext.getObject(sPath + "/Data")) {
					return sPath + "/Data";
				} else {
					return sPath;
				}
			},

			/**Creates and returns a select query with the selected fields from the parameters passed
			 * @param {Array} aSemanticKeys - SemanticKeys included in the entity set
			 * @returns {string} sSelectedFields - Fields to be included in the select query
			 */
			create$Select: function(aSemanticKeys) {
				var sSelectedFields = "";
				aSemanticKeys.forEach(function(oSemanticKey) {
					sSelectedFields += sSelectedFields ? "," + oSemanticKey.$PropertyPath : oSemanticKey.$PropertyPath;
				});
				return sSelectedFields;
			},

			/**
			 * Generates the binding expression for the form
			 * @param {string} sNavigationPath - The navigation path defined for the entity
			 * @param {Array} aSemanticKeys - SemanticKeys included in the entity set
			 * @returns {string} oBinding - Binding expression including path and $select query as parameter depending on the function parameters
			 */
			generateBindingExpression: function(sNavigationPath, aSemanticKeys) {
				if (!sNavigationPath && !aSemanticKeys) {
					return "";
				}
				var oBinding = {
					path: sNavigationPath || ""
				};
				if (aSemanticKeys) {
					oBinding.parameters = { $select: FormHelper.create$Select(aSemanticKeys) };
				}
				return JSON.stringify(oBinding);
			}
		};

		return FormHelper;
	},
	/* bExport= */ true
);
