sap.ui.define(["sap/base/util/merge", "./TemplatePage", "sap/ui/test/OpaBuilder", "sap/m/library"], function(
	mergeObjects,
	TemplatePage,
	OpaBuilder,
	mLibrary
) {
	"use strict";
	return {
		create: function(sFlpAppName) {
			return {
				actions: {
					iClickFirstColumnExpandButton: function() {
						return OpaBuilder.create(this)
							.hasId("application-" + sFlpAppName + "-component---appRootView--appContent-midForward")
							.description("Clicking the First Column Expand Button")
							.doPress()
							.execute();
					},
					iClickLastColumnExpandButton: function() {
						return OpaBuilder.create(this)
							.hasId("application-" + sFlpAppName + "-component---appRootView--appContent-midBack")
							.description("Clicking the Last Column Expand Button")
							.doPress()
							.execute();
					},
					iClickLastColumnCollapseButton: function() {
						return OpaBuilder.create(this)
							.hasId("application-" + sFlpAppName + "-component---appRootView--appContent-endForward")
							.doPress()
							.description("Seeing the Last Column Expand Button")
							.execute();
					},
					iClickFirstColumnCollapseButton: function() {
						return OpaBuilder.create(this)
							.hasId("application-" + sFlpAppName + "-component---appRootView--appContent-beginBack")
							.doPress()
							.description("Seeing the Last Column Expand Button")
							.execute();
					}
				},
				assertions: {
					iSeeFirstColumnExpandButton: function() {
						return OpaBuilder.create(this)
							.hasId("application-" + sFlpAppName + "-component---appRootView--appContent-midForward")
							.description("Seeing the First Column Expand Button")
							.execute();
					},
					iDoNotSeeFirstColumnExpandButton: function() {
						return OpaBuilder.create(this)
							.hasType("sap.m.Button")
							.check(function(oButtons) {
								var bFound = oButtons.some(function(oButton) {
									return (
										oButton.getId() === "application-" + sFlpAppName + "-component---appRootView--appContent-midForward"
									);
								});
								return bFound === false;
							}, true)
							.description("Do not see the First Column Expand Button")
							.execute();
					},
					iSeeFirstColumnCollapseButton: function() {
						return OpaBuilder.create(this)
							.hasId("application-" + sFlpAppName + "-component---appRootView--appContent-beginBack")
							.description("Seeing the Last Column Expand Button")
							.execute();
					},
					iClickLastColumnCollapseButton: function() {
						return OpaBuilder.create(this)
							.hasId("application-" + sFlpAppName + "-component---appRootView--appContent-endForward")
							.description("Seeing the Last Column Expand Button")
							.execute();
					},
					iSeeLastColumnExpandButton: function() {
						return OpaBuilder.create(this)
							.hasId("application-" + sFlpAppName + "-component---appRootView--appContent-midBack")
							.description("Seeing the Last Column Expand Button")
							.execute();
					},
					iDoNotSeeLastColumnExpandButton: function() {
						return OpaBuilder.create(this)
							.hasType("sap.m.Button")
							.check(function(oButtons) {
								var bFound = oButtons.some(function(oButton) {
									return (
										oButton.getId() === "application-" + sFlpAppName + "-component---appRootView--appContent-midBack"
									);
								});
								return bFound === false;
							}, true)
							.description("Do not see the Last Column Expand Button")
							.execute();
					},
					iSeeNumberOfColumns: function(nCols) {
						// Map to have the number of visible columns from the layout
						// Hidden columns don't count, fullscreen is 1 column
						var mLayoutToColumn = {
							"OneColumn": 1,
							"TwoColumnsMidExpanded": 2,
							"TwoColumnsBeginExpanded": 2,
							"MidColumnFullScreen": 1,
							"ThreeColumnsMidExpanded": 3,
							"ThreeColumnsEndExpanded": 3,
							"ThreeColumnsMidExpandedEndHidden": 2,
							"ThreeColumnsBeginExpandedEndHidden": 2,
							"EndColumnFullScreen": 1
						};

						return OpaBuilder.create(this)
							.hasId("application-" + sFlpAppName + "-component---appRootView--appContent")
							.check(function(oFCL) {
								return mLayoutToColumn[oFCL.getLayout()] === nCols;
							}, true)
							.description("FCL displays " + nCols + " columns")
							.execute();
					},
					iSeeFullscreen: function() {
						return OpaBuilder.create(this)
							.hasId("application-" + sFlpAppName + "-component---appRootView--appContent")
							.check(function(oFCL) {
								return oFCL.getLayout() === "MidColumnFullScreen" || oFCL.getLayout() === "EndColumnFullScreen";
							}, true)
							.description("FCL is in fullscreen")
							.execute();
					},
					iGetDefaultLayoutOnFirstLevel: function() {
						return OpaBuilder.create(this)
							.hasId("application-" + sFlpAppName + "-component---appRootView--appContent")
							.hasProperties({ layout: "TwoColumnsMidExpanded" })
							.description("Seeing default layout for FCL on first level: TwoColumnsMidExpanded ")
							.execute();
					},
					iGetDefaultLayoutOnSecondLevel: function() {
						return OpaBuilder.create(this)
							.hasId("application-" + sFlpAppName + "-component---appRootView--appContent")
							.hasProperties({ layout: "ThreeColumnsMidExpanded" })
							.description("Seeing default layout for FCL on second level: ThreeColumnsMidExpanded ")
							.execute();
					}
				}
			};
		}
	};
});
