/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2017 SAP SE. All rights reserved
    
 */

sap.ui.define(["./MacroMetadata"], function(MacroMetadata) {
	"use strict";

	/**
	 * @classdesc
	 * Macro for creating a MicroChart based on the provided OData V4 metadata.
	 *
	 * Usage example:
	 * <pre>
	 * &lt;macro:MicroChart
	 *	id="someID"
	 *	groupId="$auto.microCharts"
	 *	collection="{entitySet&gt;}"
	 *	chartAnnotation="{chartAnnotation&gt;}"
	 * /&gt;
	 * </pre>
	 *
	 * @class sap.fe.macros.MicroChart
	 * @hideconstructor
	 * @ui5-restricted
	 * @experimental
	 */
	var MicroChart = MacroMetadata.extend("sap.fe.macros.MicroChart", {
		/**
		 * Name of the macro control.
		 */
		name: "MicroChart",
		/**
		 * Namespace of the macro control.
		 */
		namespace: "sap.fe.macros",
		/**
		 * Fragment source of the macro (optional) - if not set, fragment is generated from namespace and name.
		 */
		fragment: "sap.fe.macros.MicroChart",

		/**
		 * The metadata describing the macro control.
		 */
		metadata: {
			/**
			 * Macro stereotype for documentation generation. Not visible in documentation.
			 */
			stereotype: "xmlmacro",
			/**
			 * Location of the designtime info.
			 */
			designtime: "sap/fe/macros/MicroChart.designtime",
			/**
			 * Properties.
			 */
			properties: {
				/**
				 * Metadata path to the entitySet or navigationProperty.
				 */
				collection: {
					type: "sap.ui.model.Context",
					required: true,
					$kind: ["EntitySet", "NavigationProperty"]
				},
				/**
				 * Metadata path to the Chart annotations.
				 */
				chartAnnotation: {
					type: "sap.ui.model.Context",
					required: true
				},
				/**
				 * ID of the MicroChart.
				 */
				id: {
					type: "string"
				},
				/**
				 * To control the rendering of Title, Subtitle and Currency Labels.
				 */
				renderLabels: {
					type: "boolean",
					defaultValue: true
				},
				/**
				 * GroupId to group the requests from the MicroChart.
				 */
				groupId: {
					type: "string",
					defaultValue: ""
				},
				/**
				 * Title for the MicroChart. If no title is provided, the title from the Chart annotation is used.
				 * Rendered only if 'renderLabels' is true.
				 */
				title: {
					type: "string",
					defaultValue: ""
				},
				/**
				 * Description for the MicroChart. If no description is provided, the description from the Chart annotation is used.
				 * Rendered only if 'renderLabels' is true.
				 */
				description: {
					type: "string",
					defaultValue: ""
				}
			},

			events: {}
		}
	});

	return MicroChart;
});
