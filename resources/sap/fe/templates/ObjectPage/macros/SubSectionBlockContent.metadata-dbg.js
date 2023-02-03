/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2020 SAP SE. All rights reserved
    
 */

sap.ui.define(["sap/fe/macros/MacroMetadata"], function(MacroMetadata) {
	"use strict";

	/**
	 * @classdesc
	 * Macro for creating a SubSectionBlockContent based on provided OData v4 metadata.
	 *
	 *
	 * Usage example:
	 * <pre>
	 * &lt;opmacro:SubSectionBlockContent
	 * 		id="SomeID"
	 *  	entitySet="{entitySet>}"
	 *  	facet="{facet>}"
	 *  	metaPath="{metaPath>}"
	 *  	partOfPreview="true"
	 * /&gt;
	 * </pre>
	 *
	 * @class sap.fe.templates.ObjectPage.macros.SubSectionBlockContent
	 * @hideconstructor
	 * @ui5-restricted
	 * @experimental
	 */
	var SubSectionContent = MacroMetadata.extend("sap.fe.templates.ObjectPage.macros.SubSectionBlockContent", {
		/**
		 * Name of the macro control.
		 */
		name: "SubSectionBlockContent",
		/**
		 * Namespace of the macro control
		 */
		namespace: "sap.fe.templates.ObjectPage.macros",
		/**
		 * Fragment source of the macro (optional) - if not set, fragment is generated from namespace and name
		 */
		fragment: "sap.fe.templates.ObjectPage.macros.SubSectionBlockContent",

		/**
		 * The metadata describing the macro control.
		 */
		metadata: {
			/**
			 * Define macro stereotype for documentation purpose
			 */
			stereotype: "xmlmacro",
			/**
			 * Properties.
			 */
			properties: {
				/**
				 * ID of the SubSectionContent
				 */
				id: {
					type: "string"
				},
				/**
				 * Parent Facet
				 */
				facet: {
					type: "sap.ui.model.Context"
				},
				/**
				 * Metadata Path to the Facet
				 */
				metaPath: {
					type: "sap.ui.model.Context"
				},
				/**
				 * Mandatory Context to the EntitySet
				 */
				entitySet: {
					type: "sap.ui.model.Context",
					required: true,
					$kind: ["NavigationProperty", "EntitySet"]
				},
				viewData: {
					type: "sap.ui.model.Context",
					required: true
				},
				/**
				 * Part of Preview - true/false ('false' part toggled by 'Show More / Show Less' Button)
				 */
				partOfPreview: {
					type: "boolean",
					defaultValue: true
				}
			}
		}
	});

	return SubSectionContent;
});
