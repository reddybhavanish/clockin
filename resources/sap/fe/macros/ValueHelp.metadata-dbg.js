/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2017 SAP SE. All rights reserved
    
 */

sap.ui.define(["./MacroMetadata"], function(MacroMetadata) {
	"use strict";

	/**
	 * @classdesc
	 * Macro for creating a ValueHelp based on the provided OData V4 metadata.
	 *
	 *
	 * Usage example:
	 * <pre>
	 * &lt;macro:ValueHelp
	 *   idPrefix="SomePrefix"
	 *   entitySet="{someEntitySet&gt;}"
	 *   property="{someProperty&gt;}"
	 *   conditionModel="$filters"
	 * /&gt;
	 * </pre>
	 *
	 * @class sap.fe.macros.ValueHelp
	 * @hideconstructor
	 * @private
	 * @ui5-restricted
	 * @experimental
	 */
	var ValueHelp = MacroMetadata.extend("sap.fe.macros.ValueHelp", {
		/**
		 * Name of the macro control.
		 */
		name: "ValueHelp",
		/**
		 * Namespace of the macro control.
		 */
		namespace: "sap.fe.macros",
		/**
		 * Fragment source of the macro (optional) - if not set, fragment is generated from namespace and name.
		 */
		fragment: "sap.fe.macros.ValueHelp",

		/**
		 * The metadata describing the macro control.
		 */
		metadata: {
			/**
			 * Macro stereotype for documentation generation. Not visible in documentation.
			 */
			stereotype: "xmlmacro",
			/**
			 * Location of the designtime information.
			 */
			designtime: "sap/fe/macros/ValueHelp.designtime",
			/**
			 * Properties.
			 */
			properties: {
				/**
				 * A prefix that is added to the generated ID of the value help.
				 */
				idPrefix: {
					type: "string",
					defaultValue: "ValueHelp"
				},
				/**
				 * Defines the metadata path to the entity set.
				 */
				entitySet: {
					type: "sap.ui.model.Context",
					required: true,
					$kind: "EntitySet"
				},
				/**
				 * Defines the metadata path to the property.
				 */
				property: {
					type: "sap.ui.model.Context",
					required: true,
					$kind: "Property"
				},
				/**
				 * Indicator whether the value help is for a filter field.
				 */
				conditionModel: {
					type: "string",
					defaultValue: ""
				},
				/**
				 * Enforce to display a value help for a field. Necessary if no value help is annotated,
				 * but a value help with just the condition tab should be available.
				 */
				forceValueHelp: {
					type: "boolean",
					defaultValue: false
				},
				/**
				 * Indicates that that this is a value help of a filter field. Necessary to decide if a
				 * validation should occur on the backend or already on the client.
				 */
				filterFieldValueHelp: {
					type: "boolean",
					defaultValue: false
				}
			},

			events: {}
		}
	});

	return ValueHelp;
});
