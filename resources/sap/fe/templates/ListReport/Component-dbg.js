/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2020 SAP SE. All rights reserved
    
 */
sap.ui.define(
	["sap/fe/core/TemplateComponent", "sap/base/Log", "sap/fe/templates/VariantManagement"],
	function(TemplateComponent, Log, VariantManagement) {
		"use strict";

		var ListReportComponent = TemplateComponent.extend("sap.fe.templates.ListReport.Component", {
			metadata: {
				properties: {
					initialLoad: {
						type: "boolean",
						defaultValue: true
					},
					/**
					 * Defines if and on which level variants can be configured:
					 * 		None: no variant configuration at all
					 * 		Page: one variant configuration for the whole page
					 * 		Control: variant configuration on control level
					 */
					variantManagement: {
						type: "sap.fe.templates.VariantManagement",
						defaultValue: VariantManagement.Page
					}
				},
				library: "sap.fe.templates",
				manifest: "json"
			},
			onBeforeBinding: function(oContext) {},
			onAfterBinding: function(oContext, mParameters) {
				TemplateComponent.prototype.onAfterBinding.apply(this, arguments);
				// for now we just forward this to the list report controller
				this.getRootControl()
					.getController()
					.onAfterBinding(oContext, mParameters);
			},
			// liveMode should be kept as default on false, this should not be adjustable by the app developer
			getViewData: function() {
				var oViewData = TemplateComponent.prototype.getViewData.apply(this, arguments);
				oViewData.liveMode = false;
				return oViewData;
			}
		});
		return ListReportComponent;
	},
	/* bExport= */ true
);
