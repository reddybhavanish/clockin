/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2017 SAP SE. All rights reserved
    
 */

sap.ui.define(["./MacroMetadata"], function(MacroMetadata) {
	"use strict";

	/**
	 * /**
	 * @classdesc
	 * Macro for creating a FilterBar based on provided OData v4 metadata.
	 *
	 *
	 * Usage example:
	 * <pre>
	 * &lt;macro:FilterBar
	 *   id="SomeID"
	 *   entitySet="{entitySet>}"
	 *   hideBasicSearch="false"
	 *   showAdaptFiltersButton="true"
	 *   p13nMode=["Item","Value"]
	 *   listBindingNames = "sap.fe.tableBinding"
	 *   liveMode="true"
	 *   draftEditStateModelName="<Name of draftEditState model>"
	 *   search=".handlers.onSearch"
	 *   filtersChanged=".handlers.onFiltersChanged"
	 * /&gt;
	 * </pre>
	 *
	 * Macro for creating a FilterBar based on provided OData v4 metadata.
	 * @class sap.fe.macros.FilterBar
	 * @hideconstructor
	 * @private
	 * @ui5-restricted
	 * @experimental
	 */
	var FilterBar = MacroMetadata.extend("sap.fe.macros.FilterBar", {
		/**
		 * Name of the macro control.
		 */
		name: "FilterBar",
		/**
		 * Namespace of the macro control
		 */
		namespace: "sap.fe.macros",
		/**
		 * Fragment source of the macro (optional) - if not set, fragment is generated from namespace and name
		 */
		fragment: "sap.fe.macros.FilterBar",

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
			designtime: "sap/fe/macros/FilterBar.designtime",
			/**
			 * Properties.
			 */
			properties: {
				/**
				 * ID of the FilterBar
				 */
				id: {
					type: "string"
				},
				/**
				 * Mandatory context to the EntitySet
				 */
				entitySet: {
					type: "sap.ui.model.Context",
					required: true,
					$kind: "EntitySet"
				},
				/**
				 * Don't show the basic search field
				 */
				hideBasicSearch: {
					type: "boolean",
					defaultValue: false
				},

				/**
				 * Enables the fallback to show all fields of the EntityType as filter fields if com.sap.vocabularies.UI.v1.SelectionFields are not present
				 */
				enableFallback: {
					type: "boolean",
					defaultValue: false
				},

				/**
				 * Handles visibility of the 'Adapt Filters' button on the FilterBar
				 */
				showAdaptFiltersButton: {
					type: "boolean",
					defaultValue: false
				},

				/**
				 * Specifies the personalization options for the filter bar.
				 */
				p13nMode: {
					type: "sap.ui.mdc.FilterBarP13nMode[]"
				},

				/**
				 * List bindings that must be attached to the condition model
				 */
				listBindingNames: {
					type: "string"
				},

				/**
				 * If set the search will be automatically triggered, when a filter value was changed.
				 */
				liveMode: {
					type: "boolean",
					defaultValue: false
				},
				/**
				 * Name of draftEditState model that will be bound to a control
				 */
				draftEditStateModelName: {
					type: "string",
					defaultValue: false
				},
				/**
				 * Temporary workaround only
				 * path to valuelist
				 **/
				_valueList: {
					type: "sap.ui.model.Context",
					required: false
				}
			},
			events: {
				/**
				 * Search handler name
				 */
				search: {
					type: "function"
				},
				/**
				 * Filters changed handler name
				 */
				filtersChanged: {
					type: "function"
				}
			}
		}
	});

	return FilterBar;
});
