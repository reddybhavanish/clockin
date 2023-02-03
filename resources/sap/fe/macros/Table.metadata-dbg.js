/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2017 SAP SE. All rights reserved
    
 */

sap.ui.define(["./MacroMetadata"], function(MacroMetadata) {
	"use strict";

	/**
	 * @classdesc
	 * Macro for creating a Table based on provided OData v4 metadata.
	 *
	 * Usage example:
	 * <pre>
	 * &lt;macro:Table
	 *   id="someID"
	 *   tableType="ResponsiveTable"
	 *   collection="collection",
	 *   presentation="presentation"
	 *   selectionMode="Multi"
	 *   onCallAction=".myActionHandler"
	 *   selectedContextsModel="ui"
	 *   groupId="$auto.test"
	 *   editMode="{ui>/editMode}"
	 *   p13nMode="Column,Sort"
	 * /&gt;
	 * </pre>
	 *
	 * @class sap.fe.macros.Table
	 * @hideconstructor
	 * @private
	 * @ui5-restricted
	 * @experimental
	 */

	var Table = MacroMetadata.extend("sap.fe.macros.Table", {
		/**
		 * Name of the macro control.
		 */
		name: "Table",
		/**
		 * Namespace of the macro control
		 */
		namespace: "sap.fe.macros",
		/**
		 * Fragment source of the macro (optional) - if not set, fragment is generated from namespace and name
		 */
		fragment: "sap.fe.macros.Table",
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
				 * metadataContext:collection mandatory context to a collection (entitySet or 1:n navigation)
				 */
				collection: {
					type: "sap.ui.model.Context",
					required: true,
					$kind: ["EntitySet", "NavigationProperty"]
				},
				/**
				 * Parent EntitySet for the present collection
				 */
				parentEntitySet: {
					type: "sap.ui.model.Context"
				},
				/**
				 * metadataContext:presentation mandatory context to a presentation (lineItem w or w/o qualifier / PV)
				 */
				presentation: {
					type: "sap.ui.model.Context",
					required: true
				},
				quickFilter: {
					type: "string"
				},
				columnSettings: {
					type: "sap.ui.model.Context"
				},
				/**
				 * Id of the table
				 */
				id: {
					type: "string"
				},
				/**
				 * List binding information for mdc.Table (ui5object: true is needed to prevent this property being used as a binding). If not specified it is created from the metadata information
				 *
				 */
				rowsBindingInfo: {
					type: "object"
				},
				/**
				 * For binding the table to a navigation path. So only the path is used for rows binding.
				 */
				navigationPath: {
					type: "string"
				},
				/**
				 * Edit mode of the table / fields (Display,Editable,ReadOnly,Disabled) / Default: Display
				 */
				editMode: {
					type: "string",
					defaultValue: "Display"
				},
				/**
				 * Create mode of the table / fields (true/false) / Default: true
				 */
				createMode: {
					type: "boolean",
					defaultValue: true
				},
				/**
				 * Specifies whether the button is hidden when no data has been entered yet in the row (true/false) / Default: false
				 */
				disableAddRowButtonForEmptyData: {
					type: "boolean",
					defaultValue: false
				},
				/**
				 * Specifies the possible actions available on the table row (Navigation,null) / Default: null
				 */
				rowAction: {
					type: "string",
					defaultValue: null
				},
				/**
				 * Specifies the selection mode (None,Single,Multi,Auto)
				 */
				selectionMode: {
					type: "string",
					defaultValue: "Auto"
				},
				/**
				 * The busy mode of table
				 */
				busy: {
					type: "string"
				},
				/**
				 * Name of a model in which the selected contexts are stored (under /$contexts/)
				 */
				selectedContextsModel: {
					type: "string"
				},
				/**
				 * The groupId of the table. It is added as parameter only if it is set by application developer, else model takes it directly from binding. It is defined by OData V4. Currently only the $auto is supported, which means that any data changes are submitted in a batch group at a time determined by the system.
				 */
				groupId: {
					type: "string"
				},
				/**
				 * Boolean to decide if a create (+) button is rendered. onCreate
				 * needs to be specified
				 */
				creatable: {
					type: "boolean",
					defaultValue: true
				},
				/**
				 * Custom data to determine visibility of create button or creation row
				 */
				showCreate: {
					type: "string"
				},
				/**
				 * Parameter which helps to not show the delete button on the table in display mode
				 * in object page.(Default value: false)
				 */
				showDelete: {
					type: "boolean",
					defaultValue: false
				},
				/**
				 * Display Table Title (mdc Header)
				 */
				headerVisible: {
					type: "boolean",
					defaultValue: true
				},
				/**
				 * Parameter which sets the threshold for the mdc table
				 */
				threshold: {
					type: "string",
					defaultValue: undefined
				},
				/**
				 * Parameter which sets the noDataText for the mdc table
				 */
				noDataText: {
					type: "string"
				},
				/**
				 * Creation Mode to be passed to the onCreate hanlder. Values: ["Inline", "NewPage"]
				 */
				creationMode: {
					type: "string",
					defaultValue: "NewPage"
				},
				/**
				 * Defines whether table should be bound during initialization.
				 */
				autoBindOnInit: {
					type: "boolean",
					defaultValue: true
				},
				/**
				 * Setting to determine if the new row should be created at the end or beginning
				 */
				createAtEnd: {
					type: "boolean",
					defaultValue: false
				},
				/**
				 * Custom data to set a unique named binding ID for the table
				 */
				namedBindingId: {
					type: "string",
					defaultValue: "Inline"
				},
				/**
				 * Personalisation Mode
				 */
				p13nMode: {
					type: "array"
				},
				/**
				 * Custom data to determine whether VM can be enabled for the table directly
				 */
				enableControlVM: {
					type: "boolean",
					defaultValue: false
				},
				/**
				 * Table Type: ResponsiveTable, Table
				 */
				tableType: {
					type: "string",
					defaultValue: "ResponsiveTable"
				},
				/**
				 * Enable export to file
				 */
				enableExport: {
					type: "boolean",
					defaultValue: true
				},
				/**
				 * Table filter: Defines the filter interface used to filter rows of the table.
				 */
				filter: {
					type: "string"
				},
				/**
				 * The manifest defined actions to be shown in the action area of the table
				 */
				actions: {
					type: "sap.ui.model.Context"
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
				 * Event handler to react on row press
				 */
				rowPress: {
					type: "function"
				},
				/**
				 * Event handler to be used to trigger actions. if specified all available actions in the annotations are rendered, either in the toolbar or as inline actions. Toolbar actions require a selectedContextsModel and an id as well as well
				 */
				onCallAction: {
					type: "function"
				},
				/**
				 * Custom data to determine the create handler
				 */
				onCreate: {
					type: "function"
				},
				/**
				 * Event handler to be used to delete the objects from the table. The delete button will not be rendered if this is not provided.
				 */
				onDelete: {
					type: "function"
				},
				/**
				 * Event handler to react on dataReceived event of table.
				 */
				onDataReceived: {
					type: "function"
				},
				/**
				 * Event handler to react on patchSent event of table.
				 * @experimental
				 */
				onPatchSent: {
					type: "function"
				},
				/**
				 * Event handler to react on patchCompleted event of table.
				 * @experimental
				 */
				onPatchCompleted: {
					type: "function"
				}
			}
		},
		create: function(oProps) {
			if (oProps.columnSettings) {
				var sEntitySetName = oProps.presentation.getObject("@sapui.name");
				if (oProps.navigationPath !== "") {
					sEntitySetName = oProps.navigationPath + "/" + sEntitySetName;
				}
				oProps.columnSettings.sPath = "/controlConfiguration/" + sEntitySetName + "/columnSettings";
			}
			return oProps;
		}
	});
	return Table;
});
