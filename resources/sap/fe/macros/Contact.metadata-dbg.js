/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2017 SAP SE. All rights reserved
    
 */

sap.ui.define(["./MacroMetadata"], function(MacroMetadata) {
	"use strict";

	/**
	 * @classdesc
	 * Macro for creating a Contact based on provided OData v4 metadata.
	 *
	 *
	 * Usage example:
	 * <pre>
	 * &lt;macro:Contact
	 *   id="someID"
	 *   contact="{contact>}"
	 *   dataField="{dataField>}"
	 * /&gt;
	 * </pre>
	 *
	 * @class sap.fe.macros.Contact
	 * @hideconstructor
	 * @private
	 * @ui5-restricted
	 * @experimental
	 */
	var Contact = MacroMetadata.extend("sap.fe.macros.Contact", {
		/**
		 * Name of the macro control.
		 */
		name: "Contact",
		/**
		 * Namespace of the macro control
		 */
		namespace: "sap.fe.macros",
		/**
		 * Fragment source of the macro (optional) - if not set, fragment is generated from namespace and name
		 */
		fragment: "sap.fe.macros.Contact",
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
			designtime: "sap/fe/macros/Contact.designtime",
			/**
			 * Properties.
			 */
			properties: {
				/**
				 * Metadata path to the Contact
				 */
				contact: {
					type: "sap.ui.model.Context",
					$Type: ["com.sap.vocabularies.Communication.v1.ContactType"],
					required: true
				},
				/**
				 * Boolean visible property
				 */
				visible: {
					type: Boolean
				}
			},

			events: {}
		}
	});

	return Contact;
});
