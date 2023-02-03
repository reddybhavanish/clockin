/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2017 SAP SE. All rights reserved
    
 */

sap.ui.define(["./MacroMetadata"], function(MacroMetadata) {
	"use strict";

	/**
	 * @classdesc
	 * Macro for creating a FilterField based on the provided OData V4 metadata.
	 *
	 *
	 * Usage example:
	 * <pre>
	 * &lt;macro:FilterField
	 *   idPrefix="SomePrefix"
	 *   vhIdPrefix="SomeVhPrefix"
	 *   entitySet="{entitySet>}"
	 *   property="{entitySet>./@com.sap.vocabularies.UI.v1.SelectionFields/0/$PropertyPath}"
	 * /&gt;
	 * </pre>
	 *
	 * @class sap.fe.macros.FilterField
	 * @hideconstructor
	 * @private
	 * @ui5-restricted
	 * @experimental
	 */
	var FilterField = MacroMetadata.extend("sap.fe.macros.FilterField", {
		/**
		 * Name of the macro control.
		 */
		name: "FilterField",
		/**
		 * Namespace of the macro control.
		 */
		namespace: "sap.fe.macros",
		/**
		 * Fragment source of the macro (optional) - if not set, fragment is generated from namespace and name.
		 */
		fragment: "sap.fe.macros.FilterField",

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
			designtime: "sap/fe/macros/FilterField.designtime",
			/**
			 * Properties.
			 */
			properties: {
				/**
				 * A prefix that is added to the generated ID of the filter field.
				 */
				idPrefix: {
					type: "string",
					defaultValue: "FilterField"
				},
				/**
				 * A prefix that is added to the generated ID of the value help used for the filter field.
				 */
				vhIdPrefix: {
					type: "string",
					defaultValue: "FilterFieldValueHelp"
				},
				/**
				 * Defines the metadata path to the entity set.
				 * In case the property is accessed through an association using a navigation property, it has to be the leading entitySet.
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
				 * Defines the metadata path to the value list.
				 */
				_valueList: {
					type: "sap.ui.model.Context",
					required: false
				}
			},

			events: {}
		}
	});

	return FilterField;
});
