sap.ui.define(["sap/ui/test/Opa5", "sap/ui/test/OpaBuilder", "sap/fe/test/builder/FEBuilder", "sap/ui/thirdparty/jquery"], function(
	Opa5,
	OpaBuilder,
	FEBuilder,
	jQuery
) {
	"use strict";
	// All common actions for all Opa tests are defined here
	return Opa5.extend("sap.fe.integrations.common.BaseActions", {
		iClosePopover: function() {
			return FEBuilder.createClosePopoverBuilder(this)
				.description("Closing open popover")
				.execute();
		},
		iPressEscape: function() {
			return OpaBuilder.create(this)
				.do(function() {
					jQuery.event.trigger({ type: "keydown", which: 27 });
				})
				.description("Pressing escape button")
				.execute();
		},
		iNavigateBack: function() {
			return OpaBuilder.create(this)
				.viewId(null)
				.hasId("backBtn")
				.doPress()
				.description("Navigating back via shell")
				.execute();
		},
		iExpandShellNavMenu: function() {
			return OpaBuilder.create(this)
				.viewId(null)
				.hasId("shellAppTitle")
				.doPress()
				.description("Expanding Navigation Menu")
				.execute();
		},
		iNavigateViaShellNavMenu: function(sItem) {
			return OpaBuilder.create(this)
				.viewId(null)
				.hasId("sapUshellNavHierarchyItems")
				.doOnAggregation("items", OpaBuilder.Matchers.properties({ title: sItem }), OpaBuilder.Actions.press())
				.description("Navigating to " + sItem)
				.execute();
		}
	});
});
