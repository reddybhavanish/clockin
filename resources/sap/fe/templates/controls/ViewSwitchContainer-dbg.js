/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2020 SAP SE. All rights reserved
    
 */

sap.ui.define(
	["sap/ui/core/Control"],
	function(Control) {
		"use strict";

		var ViewSwitchContainer = Control.extend("sap.fe.templates.controls.ViewSwitchContainer", {
			metadata: {
				properties: {
					selectedIndex: {
						type: "int",
						defaultValue: 0
					},
					height: {
						type: "sap.ui.core.CSSSize"
					}
				},
				events: {},
				defaultAggregation: "items",
				aggregations: {
					items: {
						type: "sap.fe.templates.controls.ViewSwitchContainerItem",
						multiple: true,
						singularName: "item"
					}
				},
				publicMethods: []
			},

			renderer: {
				render: function(oRm, oControl) {
					var aItems = oControl.getItems();
					oRm.write("<div");
					oRm.writeControlData(oControl);
					oRm.write(' style="height: ' + oControl.getHeight() + '"');
					oRm.write(">");
					// tbd toolbar containing the switch between the items
					for (var i = 0; i < aItems.length; i++) {
						oRm.renderControl(aItems[i]);
					}
					oRm.write("</div>");
				}
			}
		});

		return ViewSwitchContainer;
	},
	/* bExport= */ true
);
