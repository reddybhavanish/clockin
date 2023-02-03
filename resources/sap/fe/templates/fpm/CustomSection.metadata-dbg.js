/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2020 SAP SE. All rights reserved
    
 */

sap.ui.define(["sap/fe/macros/MacroMetadata"], function(MacroMetadata) {
	"use strict";

	/**
	 * @classdesc
	 * Content of a custom section
	 *
	 * @class sap.fe.templates.fpm.CustomSection
	 * @hideconstructor
	 * @ui5-restricted
	 * @experimental
	 */
	var CustomSection = MacroMetadata.extend("sap.fe.templates.fpm.CustomSection", {
		/**
		 * Name
		 */
		name: "CustomSection",
		/**
		 * Namespace
		 */
		namespace: "sap.fe.fpm",
		/**
		 * Fragment source
		 */
		fragment: "sap.fe.templates.fpm.CustomSection",

		/**
		 * Metadata
		 */
		metadata: {
			/**
			 * Properties.
			 */
			properties: {
				/**
				 * Entity set
				 */
				entitySet: {
					type: "sap.ui.model.Context",
					required: true
				},
				/**
				 * Section ID
				 */
				id: {
					type: "string",
					required: true
				},
				/**
				 * Section content fragment name
				 * TODO: Get rid of this property. it is required by FE, not by the custom section fragment itself
				 */
				fragmentName: {
					type: "string",
					required: true
				},
				/**
				 * Section content fragment name
				 * TODO: Maybe get rid of this: it is required by FE, not by the custom section fragment itself
				 */
				fragmentType: {
					type: "string",
					required: true
				},
				/**
				 * Edit mode
				 */
				editMode: {
					type: "string",
					defaultValue: "Display"
				}
			},
			events: {}
		},
		create: function(oProps, oAggregations) {
			oProps.fragmentInstanceName = oProps.fragmentName + "-JS".replace(/\//g, ".");

			return oProps;
		}
	});

	return CustomSection;
});
