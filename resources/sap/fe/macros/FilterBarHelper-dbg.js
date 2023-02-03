/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2017 SAP SE. All rights reserved
    
 */

/**
 * Filter Bar helper
 */
sap.ui.define(function(ODataModelAnnotationHelper, CommonHelper) {
	"use strict";

	var FilterBarHelper = {
		/*
		 * Method to check if the Basic Serch Field in FilterBar is visible.
		 * @function
		 * @name checkIfBasicSearchIsVisible
		 * @memberof sap.fe.macros.FilterBarHelper.js
		 * @param {boolean} - hideBasicSearch: visibility of Basic Search Field
		 * @param {String} - searchRestrictions to be checked
		 * @return : {boolean} True, if property hideBasisSearch is not equal "true" and
		 * 					   either there are no SearchRestrictions or property SearchRestrictions.Searchable is equal true.
		 */
		checkIfBasicSearchIsVisible: function(hideBasicSearch, searchRestrictionAnnotation) {
			return hideBasicSearch !== "true" && (!searchRestrictionAnnotation || searchRestrictionAnnotation.Searchable) ? true : false;
		}
	};

	return FilterBarHelper;
}, /* bExport= */ true);
