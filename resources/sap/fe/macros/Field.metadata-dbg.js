/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2017 SAP SE. All rights reserved
    
 */

sap.ui.define(["./MacroMetadata"], function(MacroMetadata) {
	"use strict";

	/**
	 * @classdesc
	 * Macro for creating a Field based on provided OData v4 metadata.
	 * <br>
	 * Usually, a DataField or DataPoint annotation is expected, but the macro Field can also be used to display a property from the entity type.
	 *
	 *
	 * Usage example:
	 * <pre>
	 * &lt;macro:Field
	 *   idPrefix="SomePrefix"
	 *   vhIdPrefix="SomeVhPrefix"
	 *   entitySet="{entitySet&gt;}"
	 *   dataField="{dataField&gt;}"
	 *   editMode="Editable"
	 *   createMode="false"
	 * /&gt;
	 * </pre>
	 *
	 * @class sap.fe.macros.Field
	 * @hideconstructor
	 * @private
	 * @ui5-restricted
	 * @experimental
	 */
	var Field = MacroMetadata.extend("sap.fe.macros.Field", {
		/**
		 * Name of the macro control.
		 */
		name: "Field",
		/**
		 * Namespace of the macro control
		 */
		namespace: "sap.fe.macros",
		/**
		 * Fragment source of the macro (optional) - if not set, fragment is generated from namespace and name
		 */
		fragment: "sap.fe.macros.Field",

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
			designtime: "sap/fe/macros/Field.designtime",
			/**
			 * Properties.
			 */
			properties: {
				/**
				 * Prefix added to the generated ID of the field
				 */
				idPrefix: {
					type: "string"
				},
				/**
				 * Prefix added to the generated ID of the value help used for the field
				 */
				vhIdPrefix: {
					type: "string",
					defaultValue: "FieldValueHelp"
				},
				/**
				 * Metadata path to the entity set
				 */
				entitySet: {
					type: "sap.ui.model.Context",
					required: true,
					$kind: ["EntitySet", "NavigationProperty"]
				},
				/**
				 * Metadata path to the dataField.
				 * This property is usually a metadataContext pointing to a DataField having
				 * $Type of DataField, DataFieldWithUrl, DataFieldForAnnotation, DataFieldForAction, DataFieldForIntentBasedNavigation, DataFieldWithNavigationPath, or DataPointType.
				 * But it can also be a Property with $kind="Property"
				 */
				dataField: {
					type: "sap.ui.model.Context",
					required: true,
					$kind: "Property",
					$Type: [
						"com.sap.vocabularies.UI.v1.DataField",
						"com.sap.vocabularies.UI.v1.DataFieldWithUrl",
						"com.sap.vocabularies.UI.v1.DataFieldForAnnotation",
						"com.sap.vocabularies.UI.v1.DataFieldForAction",
						"com.sap.vocabularies.UI.v1.DataFieldForIntentBasedNavigation",
						"com.sap.vocabularies.UI.v1.DataFieldWithNavigationPath",
						"com.sap.vocabularies.UI.v1.DataPointType"
					]
				},
				/**
				 * Edit Mode of the field
				 */
				editMode: {
					type: "sap.ui.mdc.EditMode",
					defaultValue: "Display"
				},
				/**
				 * Create Mode of the field
				 */
				createMode: {
					type: "boolean",
					defaultValue: "false"
				},
				/**
				 * Parent control
				 */
				parentControl: {
					type: "string"
				},
				/**
				 * Maximum number of lines for multiline texts
				 */
				textLinesDisplay: {
					type: "string",
					defaultValue: "0",
					configurable: true
				},
				/**
				 * Maximum number of lines for multiline texts in edit mode
				 */
				textLinesEdit: {
					type: "string",
					defaultValue: "4",
					configurable: true
				},
				/**
				 * Wrap field
				 */
				wrap: {
					type: "boolean"
				},
				/**
				 * CSS class for margin
				 */
				"class": {
					type: "string"
				}
			},

			events: {
				/**
				 * Event handler for change event
				 */
				onChange: {
					type: "function"
				},
				/**
				 * Event handler for actions
				 */
				onCallAction: {
					type: "function"
				},
				/**
				 * Event handler for IBN
				 */
				onDataFieldForIBN: {
					type: "function"
				}
			}
		},
		create: function(oProps, oControlConfiguration) {
			var oProps = this.applyOverrides(oProps, oControlConfiguration, oProps.dataField.getPath());
			return oProps;
		}
	});

	return Field;
});
