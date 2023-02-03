/**
 * Actions and assertions to be used with a page hosted in an FCL
 */
sap.ui.define(["sap/ui/test/OpaBuilder"], function(OpaBuilder) {
	"use strict";
	return {
		actions: {
			iEnterFullScreenMode: function() {
				return OpaBuilder.create(this)
					.hasType("sap.m.OverflowToolbarButton")
					.hasProperties({ icon: "sap-icon://full-screen" })
					.description("Entering the FullScreen Button")
					.doPress()
					.execute();
			},
			iExitFullScreenMode: function() {
				return OpaBuilder.create(this)
					.hasType("sap.m.OverflowToolbarButton")
					.hasProperties({ icon: "sap-icon://exit-full-screen" })
					.description("Exiting Full screen mode")
					.doPress()
					.execute();
			},
			iCloseThisColumn: function() {
				return OpaBuilder.create(this)
					.hasType("sap.m.OverflowToolbarButton")
					.hasProperties({ icon: "sap-icon://decline" })
					.doPress()
					.description("Close FCL column for object page")
					.execute();
			}
		},
		assertions: {
			iSeeFullScreenButton: function() {
				return OpaBuilder.create(this)
					.hasType("sap.m.OverflowToolbarButton")
					.hasProperties({ visible: true, icon: "sap-icon://full-screen" })
					.description("Seeing the FullScreen Button")
					.execute();
			},
			iSeeFullScreenExitButton: function() {
				return OpaBuilder.create(this)
					.hasType("sap.m.OverflowToolbarButton")
					.hasProperties({ visible: true, icon: "sap-icon://exit-full-screen" })
					.description("Seeing the FullScreen Exit Button")
					.execute();
			},
			iSeeEndColumnFullScreen: function() {
				return OpaBuilder.create(this)
					.hasType("sap.m.OverflowToolbarButton")
					.check(function(oButtons) {
						var bFound = oButtons.some(function(oButton) {
							return oButton.getProperty("icon") === "sap-icon://full-screen";
						});
						return bFound === false;
					}, true)
					.description("No FCL displayed")
					.execute();
			},
			iSeeRemoveFCLColumnButton: function() {
				return OpaBuilder.create(this)
					.hasType("sap.m.OverflowToolbarButton")
					.hasProperties({ icon: "sap-icon://decline" })
					.description("Seeing the Layout Decline Button")
					.execute();
			}
		}
	};
});
