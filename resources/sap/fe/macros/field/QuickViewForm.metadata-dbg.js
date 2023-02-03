/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2017 SAP SE. All rights reserved
    
 */

sap.ui.define(["../MacroMetadata"], function(MacroMetadata) {
	"use strict";

	/**
	 * @classdesc
	 * Macro for creating a quickView card based on provided OData v4 metadata.
	 *
	 *
	 * Usage example:
	 * <pre>
	 *   &lt;macroField:QuickViewForm
	 *   	dataField="{dataField>}"
	 *   	entityType="{entityType>}"
	 *   	/&gt;
	 * </pre>
	 *
	 * @class sap.fe.macros.QuickViewForm
	 * @hideconstructor
	 * @private
	 * @ui5-restricted
	 * @experimental
	 */
	var QuickViewForm = MacroMetadata.extend("sap.fe.macros.QuickViewForm", {
		/**
		 * Name of the macro control.
		 */
		name: "QuickViewForm",
		/** TODO verify that we can add macro to the field folder/namespace
		 * Namespace of the macro control
		 */
		namespace: "sap.fe.macros.field",
		/**
		 * Fragment source of the macro (optional) - if not set, fragment is generated from namespace and name
		 */
		fragment: "sap.fe.macros.field.QuickViewForm",
		/**
		 * The metadata describing the macro control.
		 */
		metadata: {
			/**
			 * Define macro stereotype for documentation purpose
			 */
			stereotype: "xmlmacro",
			/**
			 * Location of the designtime info
			 */
			designtime: "sap/fe/macros/QuickViewForm.designtime",
			/**
			 * Properties.
			 */
			properties: {
				/**
				 * Metadata path to the Contact
				 * TODO find $type or $kind of the navigationentity
				 */
				entityType: {
					type: "sap.ui.model.Context"
				},
				/**
				 * Boolean visible property
				 */
				dataField: {
					type: "sap.ui.model.Context",
					required: true,
					$kind: "Property",
					$Type: [
						"com.sap.vocabularies.UI.v1.DataField",
						"com.sap.vocabularies.UI.v1.DataFieldWithUrl",
						"com.sap.vocabularies.UI.v1.DataFieldForAnnotation"
					]
				}
			},

			events: {}
		}
	});

	return QuickViewForm;
});
