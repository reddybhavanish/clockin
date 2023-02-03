/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2017 SAP SE. All rights reserved
    
 */

sap.ui.define(["./MacroMetadata"], function(MacroMetadata) {
	"use strict";

	/**
	 * @classdesc
	 * Macro for creating a FormContainer based on provided OData v4 metadata.
	 *
	 *
	 * Usage example:
	 * <pre>
	 * &lt;macro:FormContainer
	 *   id="SomeId"
	 *   entitySet="{entitySet>}"
	 *   dataFieldCollection ="{dataFieldCollection>}"
	 *   editMode="Editable"
	 *   createMode="true"
	 *   title="someTitle"
	 *   navigationPath="{ToSupplier}"
	 *   visibilityPath={facet>./@com.sap.vocabularies.UI.v1.Hidden/$Path}
	 *   onChange=".handlers.onFieldValueChange"
	 * /&gt;
	 * </pre>
	 *
	 * @class sap.fe.macros.FormContainer
	 * @hideconstructor
	 * @private
	 * @ui5-restricted
	 * @experimental
	 */
	var FormContainer = MacroMetadata.extend("sap.fe.macros.FormContainer", {
		/**
		 * Name of the macro control.
		 */
		name: "FormContainer",
		/**
		 * Namespace of the macro control
		 */
		namespace: "sap.fe.macros",
		/**
		 * Fragment source of the macro (optional) - if not set, fragment is generated from namespace and name
		 */
		fragment: "sap.fe.macros.FormContainer",

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
			designtime: "sap/fe/macros/FormContainer.designtime",
			/**
			 * Properties.
			 */
			properties: {
				/**
				 * Id of the FormContainer
				 */
				id: {
					type: "string"
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
				 * Metadata path to the dataFieldCollection
				 */
				dataFieldCollection: {
					type: "sap.ui.model.Context"
				},

				/**
				 * Control the edit mode of the form
				 */
				editMode: {
					type: "sap.ui.mdc.EditMode",
					defaultValue: "Display"
				},
				/**
				 * Control the create mode of the form container
				 */
				createMode: {
					type: "boolean",
					defaultValue: "false"
				},
				/**
				 * Title of the form container
				 */
				title: {
					type: "string"
				},
				/**
				 * Binding the form container using a navigation path
				 */
				navigationPath: {
					type: "string"
				},
				/**
				 * Binding the visibility of the form container using a property path
				 */
				visibilityPath: {
					type: "string"
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

	return FormContainer;
});
