sap.ui.define(["sap/ui/test/Opa5", "sap/ui/test/OpaBuilder", "sap/fe/test/builder/FEBuilder"], function(Opa5, OpaBuilder, FEBuilder) {
	"use strict";
	// All common assertions for all Opa tests are defined here
	return Opa5.extend("sap.fe.integrations.common.BaseAssertions", {
		iSeeListReport: function() {
			return OpaBuilder.create(this)
				.viewName("ListReport.ListReport")
				.description("ListReport is visible")
				.execute();
		},
		iSeeObjectPage: function() {
			return OpaBuilder.create(this)
				.viewName("ObjectPage.ObjectPage")
				.description("ObjectPage is visible")
				.execute();
		},
		iSeeShellNavHierarchyItem: function(iItemTitle, iItemPosition, iItemNumbers, iItemDesc) {
			return OpaBuilder.create(this)
				.viewId(null)
				.hasId("sapUshellNavHierarchyItems")
				.hasAggregationLength("items", iItemNumbers)
				.check(function(oNavHierarchyItems) {
					return (
						oNavHierarchyItems.getItems()[iItemPosition - 1].getTitle() === iItemTitle &&
						oNavHierarchyItems.getItems()[iItemPosition - 1].getDescription() === iItemDesc
					);
				})
				.description("Checking Navigation Hierarchy Items")
				.execute();
		},
		iSeeShellAppTitle: function(sTitle) {
			return OpaBuilder.create(this)
				.viewId(null)
				.hasId("shellAppTitle")
				.hasProperties({ text: sTitle })
				.description(sTitle + " is the Shell App Title")
				.execute();
		},
		iSeeFlpDashboard: function() {
			return OpaBuilder.create(this)
				.hasId("sapUshellDashboardPage")
				.description("Seeing FLP Dashboard")
				.execute();
		},
		iSeeMessagePage: function(sMessage) {
			return OpaBuilder.create(this)
				.hasType("sap.m.MessagePage")
				.hasProperties({ text: sMessage })
				.description("Error Page is visible")
				.execute();
		},
		iSeeMessageToast: function(sText) {
			return FEBuilder.createMessageToastBuilder(sText).execute(this);
		}
	});
});
