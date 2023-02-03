/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2017 SAP SE. All rights reserved
    
 */

sap.ui.define(["./MacroMetadata"], function(MacroMetadata) {
	"use strict";

	/**
	 * @classdesc
	 * Macro for creating a Form based on provided OData v4 metadata.
	 *
	 *
	 * Usage example:
	 * <pre>
	 * &lt;macro:Form
	 *  id="SomeID"
	 *  entitySet="{entitySet>}"
	 *  facet="{facet>}"
	 *  formTitle="someTitle"
	 *  editMode="Editable"
	 *  createMode="true"
	 *  useFormContainerLabels="true"
	 *  partOfPreview="true"
	 *  onChange=".handlers.onFieldValueChange"
	 * /&gt;
	 * </pre>
	 *
	 * @class sap.fe.macros.Form
	 * @hideconstructor
	 * @ui5-restricted
	 * @experimental
	 */
	var Form = MacroMetadata.extend("sap.fe.macros.Form", {
		/**
		 * Name of the macro control.
		 */
		name: "Form",
		/**
		 * Namespace of the macro control
		 */
		namespace: "sap.fe.macros",
		/**
		 * Fragment source of the macro (optional) - if not set, fragment is generated from namespace and name
		 */
		fragment: "sap.fe.macros.Form",

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
			designtime: "sap/fe/macros/Form.designtime",
			/**
			 * Properties.
			 */
			properties: {
				/**
				 * mandatory context to the EntitySet
				 */
				entitySet: {
					type: "sap.ui.model.Context",
					required: true,
					$kind: ["NavigationProperty", "EntitySet"]
				},
				/**
				 * Metadata path to the facet
				 */
				facet: {
					type: "sap.ui.model.Context",
					$Type: ["com.sap.vocabularies.UI.v1.CollectionFacet", "com.sap.vocabularies.UI.v1.ReferenceFacet"]
				},
				/**
				 * ID of the form
				 */
				id: {
					type: "string"
				},
				/**
				 * Title of the form
				 */
				formTitle: {
					type: "string"
				},
				/**
				 * Control the edit mode of the form
				 */
				editMode: {
					type: "string",
					defaultValue: "Display"
				},
				/**
				 * Control the create mode of the form
				 */
				createMode: {
					type: "string",
					defaultValue: "false"
				},
				/**
				 * Control the rendering of the form container labels
				 */
				useFormContainerLabels: {
					type: "string"
				},
				/**
				 * Toggle Preview: Part of Preview / Preview via 'Show More' Button
				 */
				partOfPreview: {
					type: "boolean",
					defaultValue: true
				}
			},
			events: {
				/**
				 * Change handler name
				 */
				onChange: {
					type: "function"
				}
			}
		}
	});

	return Form;
});
