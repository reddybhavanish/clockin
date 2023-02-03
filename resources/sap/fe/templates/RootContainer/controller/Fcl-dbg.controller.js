sap.ui.define(
	[
		"sap/ui/model/json/JSONModel",
		"./BaseController",
		"sap/f/FlexibleColumnLayoutSemanticHelper",
		"sap/ui/core/Component",
		"sap/fe/core/controllerextensions/Routing"
	],
	function(JSONModel, BaseController, FlexibleColumnLayoutSemanticHelper, Component, Routing) {
		"use strict";

		var CONSTANTS = {
			page: {
				names: ["BeginColumn", "MidColumn", "EndColumn"],
				currentGetter: {
					prefix: "getCurrent",
					suffix: "Page"
				},
				getter: {
					prefix: "get",
					suffix: "Pages"
				}
			}
		};

		return BaseController.extend("sap.fe.templates.RootContainer.controller.Fcl", {
			onInit: function(oEvent) {
				BaseController.prototype.onInit.bind(this)();

				this.oTargetsAggregation = {};
				this.oTargetsFromRoutePattern = {};
				this.sCurrentRouteName = "";
				this.sCurrentArguments = {};
				this.SQUERYKEYNAME = "?query";

				var oAppComponent = Component.getOwnerComponentFor(this.getView());

				this.oRouter = oAppComponent.getRouter();
				this.oNavigationHelper = oAppComponent.getRouterProxy();
				this.oRouter.attachBeforeRouteMatched(this.onBeforeRouteMatched, this);
				this.oRouter.attachRouteMatched(this.onRouteMatched, this);

				// Default FCL layouts
				this._oFCLConfig = {};
				var oRoutingConfig = oAppComponent.getManifest()["sap.ui5"].routing;
				if (oRoutingConfig.config && oRoutingConfig.config.flexibleColumnLayout) {
					var oFCLManifestConfig = oRoutingConfig.config.flexibleColumnLayout;
					if (oFCLManifestConfig.defaultTwoColumnLayoutType) {
						this._oFCLConfig.defaultTwoColumnLayoutType = oFCLManifestConfig.defaultTwoColumnLayoutType;
					}
					if (oFCLManifestConfig.defaultThreeColumnLayoutType) {
						this._oFCLConfig.defaultThreeColumnLayoutType = oFCLManifestConfig.defaultThreeColumnLayoutType;
					}
				}

				this.initializeTargetAggregation(oAppComponent);
				this._initializeRoutesInformation(oAppComponent);

				var oRouting = new Routing();
				var oFirstBeforeRouteMatchedCallEvent = oRouting.getFirstBeforeRouteMatchedCallEvent();
				// hook in case of deeplink navigation:  the beforeroutematched event of the fcl controller is not yet attached.
				// so it is called here with the parameters coming from the beforeroutematched of the routing controler extention
				if (oFirstBeforeRouteMatchedCallEvent) {
					this.onBeforeRouteMatched(oFirstBeforeRouteMatchedCallEvent);
				}
			},

			getFclControl: function() {
				return this.getView().getContent()[0];
			},

			onExit: function() {
				this.oRouter.detachRouteMatched(this.onRouteMatched, this);
				this.oRouter.detachBeforeRouteMatched(this.onBeforeRouteMatched, this);
				this.getFclControl().detachStateChange(this.onStateChanged, this);
				this.getFclControl().detachAfterEndColumnNavigate(this.onStateChanged, this);
				this.oRouter = null;
				this.oTargetsAggregation = null;
				this.oTargetsFromRoutePattern = null;
			},

			/**
			 * check if the FCL component is enabled
			 *
			 * @function
			 * @name sap.fe.templates.RootContainer.controller.Fcl.controller#isFclEnabled
			 * @memberof sap.fe.templates.RootContainer.controller.Fcl.controller
			 * @returns {bool}
			 *
			 * @sap-restricted
			 * @final
			 */
			isFclEnabled: function() {
				return true;
			},

			/**
			 * Initialize the object oTargetsAggregation that defines for each route the relevant aggregation and pattern
			 * @name sap.fe.templates.RootContainer.controller.Fcl.controller#initializeTargetAggregation
			 * @memberof sap.fe.templates.RootContainer.controller.Fcl.controller
			 * @function
			 * @param {object} [oAppComponent] ref to the AppComponent
			 */
			initializeTargetAggregation: function(oAppComponent) {
				var oManifest = oAppComponent.getManifest();
				var oTargets = oManifest["sap.ui5"].routing.targets;
				var that = this;
				Object.keys(oTargets).forEach(function(sTargetName) {
					var oTarget = oTargets[sTargetName];
					if (oTarget.controlAggregation) {
						that.oTargetsAggregation[sTargetName] = {
							aggregation: oTarget.controlAggregation,
							pattern: oTarget.contextPattern
						};
					} else {
						that.oTargetsAggregation[sTargetName] = {
							aggregation: "page",
							pattern: null
						};
					}
				});
			},

			/**
			 * Initializes the mapping between a route (identifed as its pattern) and the corresponding targets
			 * @name sap.fe.templates.RootContainer.controller.Fcl.controller#_initializeRoutesInformation
			 * @memberof sap.fe.templates.RootContainer.controller.Fcl.controller
			 * @function
			 * @param {object} [oAppComponent] ref to the AppComponent
			 */

			_initializeRoutesInformation: function(oAppComponent) {
				var oManifest = oAppComponent.getManifest();
				var aRoutes = oManifest["sap.ui5"].routing.routes;
				var that = this;
				aRoutes.forEach(function(route) {
					that.oTargetsFromRoutePattern[route.pattern] = route.target;
				});
			},

			getCurrentArgument: function() {
				return this.sCurrentArguments;
			},

			getCurrentRouteName: function() {
				return this.sCurrentRouteName;
			},

			/**
			 * Get FE FCL constant
			 * @name sap.fe.templates.RootContainer.controller.Fcl.controller#getConstant
			 * @memberof sap.fe.templates.RootContainer.controller.Fcl.controller
			 * @function
			 */
			getConstants: function() {
				return CONSTANTS;
			},

			/**
			 * getter for oTargetsAggregation array
			 * @name sap.fe.templates.RootContainer.controller.Fcl.controller#getTargetAggregation
			 * @memberof sap.fe.templates.RootContainer.controller.Fcl.controller
			 * @function
			 * @returns {array} return the oTargetsAggregation array
			 *
			 * @sap-restricted
			 */
			getTargetAggregation: function() {
				return this.oTargetsAggregation;
			},

			/**
			 * function triggered by the router RouteMatched event
			 * @name sap.fe.templates.RootContainer.controller.Fcl.controller#onRouteMatched
			 * @memberof sap.fe.templates.RootContainer.controller.Fcl.controller
			 * @param {*} oEvent referent to the event received
			 */
			onRouteMatched: function(oEvent) {
				var sRouteName = oEvent.getParameter("name");

				this._updateUIstateForEachviews();
				// Save the current/previous routes and arguments
				this.sCurrentRouteName = sRouteName;
				this.sCurrentArguments = oEvent.getParameter("arguments");
			},

			/**
			 * function triggered by the FCL StateChanged event
			 * @name sap.fe.templates.RootContainer.controller.Fcl.controller#onStateChanged
			 * @memberof sap.fe.templates.RootContainer.controller.Fcl.controller
			 * @param {*} oEvent referent to the event received
			 */
			onStateChanged: function(oEvent) {
				var bIsNavigationArrow = oEvent.getParameter("isNavigationArrow");
				if (this.sCurrentArguments !== undefined) {
					if (!this.sCurrentArguments[this.SQUERYKEYNAME]) {
						this.sCurrentArguments[this.SQUERYKEYNAME] = {};
					}
					this.sCurrentArguments[this.SQUERYKEYNAME].layout = oEvent.getParameter("layout");
				}
				this._updateUIstateForEachviews();
				this._forceModelContextChangeOnBreadCrumbs(oEvent);

				// Replace the URL with the new layout if a navigation arrow was used
				if (bIsNavigationArrow) {
					//oRouter.navTo(currentRouteName, sCurrentArguments, true);
					this.oNavigationHelper.navTo(this.sCurrentRouteName, this.sCurrentArguments);
				}
			},

			/**
			 * function to fire ModelContextChange event on all breadcrumbs ( on each ObjectPages)
			 * @name sap.fe.templates.RootContainer.controller.Fcl.controller#_forceModelContextChangeOnBreadCrumbs
			 * @memberof sap.fe.templates.RootContainer.controller.Fcl.controller
			 * @param {*} oEvent referent to the event received
			 */
			_forceModelContextChangeOnBreadCrumbs: function(oEvent) {
				//force modelcontextchange on ObjectPages to refresh the breadcrumbs link hrefs
				var oFcl = oEvent.getSource();
				var oPages = [];
				oPages = oPages
					.concat(oFcl.getBeginColumnPages())
					.concat(oFcl.getMidColumnPages())
					.concat(oFcl.getEndColumnPages());
				oPages.forEach(function(oPage) {
					var oView = oPage.getComponentInstance().getRootControl();
					var oBreadCrumbs = oView.byId("breadcrumbs");
					if (oBreadCrumbs) {
						oBreadCrumbs.fireModelContextChange();
					}
				});
			},

			/**
			 *
			 */
			// beginColumn , midColumn, endColumn,
			_updateUIstateForEachviews: function() {
				var that = this;
				this._getAllCurrentViews().forEach(function(oView) {
					that._updateUIStateForView(oView);
				});
			},

			/**
			 * function triggered to update the Share button Visibility
			 * @name sap.fe.templates.RootContainer.controller.Fcl.controller#_updateShareButtonVisibility
			 * @memberof sap.fe.templates.RootContainer.controller.Fcl.controller
			 * @param {*} viewColumn referent to the current viewColumn("beginColumn", "midColumn", "endColumn")
			 * @param {*} sLayout referent to the current fcl layout
			 */
			_updateShareButtonVisibility: function(viewColumn, sLayout) {
				var bShowShareIcon;
				switch (sLayout) {
					case "OneColumn":
						bShowShareIcon = viewColumn === "beginColumn";
						break;
					case "MidColumnFullScreen":
					case "ThreeColumnsBeginExpandedEndHidden":
					case "ThreeColumnsMidExpandedEndHidden":
					case "TwoColumnsBeginExpanded":
					case "TwoColumnsMidExpanded":
						bShowShareIcon = viewColumn === "midColumn";
						break;
					case "EndColumnFullScreen":
					case "ThreeColumnsEndExpanded":
					case "ThreeColumnsMidExpanded":
						bShowShareIcon = viewColumn === "endColumn";
						break;
					default:
						bShowShareIcon = false;
				}
				return bShowShareIcon;
			},

			_updateUIStateForView: function(oView) {
				var oUIState = this.getHelper().getCurrentUIState();
				var oFclColName = ["beginColumn", "midColumn", "endColumn"];
				var FCLLevel = oView.getController().fcl.getFCLLevel();
				var sLayout = this.getFclControl().getLayout();
				var viewColumn = oFclColName[FCLLevel <= 2 ? FCLLevel : 2];
				if (!oView.getModel("fclhelper")) {
					oView.setModel(new JSONModel(), "fclhelper");
				}
				if (FCLLevel > 2) {
					oUIState.actionButtonsInfo.endColumn.exitFullScreen = null;
					oUIState.actionButtonsInfo.endColumn.closeColumn = null;
				}
				if (FCLLevel > 2 || sLayout === "EndColumnFullScreen" || sLayout === "MidColumnFullScreen" || sLayout === "OneColumn") {
					oView.getModel("fclhelper").setProperty("/breadCrumbIsVisible", true);
				} else {
					oView.getModel("fclhelper").setProperty("/breadCrumbIsVisible", false);
				}
				// Unfortunately, the FCLHelper doesn't provide actionButton values for the first column
				// so we have to add this info manually
				oUIState.actionButtonsInfo.beginColumn = { fullScreen: null, exitFullScreen: null, closeColumn: null };

				oView.getModel("fclhelper").setProperty("/actionButtonsInfo", Object.assign({}, oUIState.actionButtonsInfo[viewColumn]));

				oView.getModel("fclhelper").setProperty("/showShareIcon", this._updateShareButtonVisibility(viewColumn, sLayout));
			},

			_getViewFromContainer: function(oContainer) {
				if (oContainer.isA("sap.ui.core.ComponentContainer")) {
					return oContainer.getComponentInstance().getRootControl();
				} else {
					return oContainer;
				}
			},

			/**
			 * get all active views in FCL component
			 * @name sap.fe.templates.RootContainer.controller.Fcl.controller#_getAllCurrentViews
			 * @memberof sap.fe.templates.RootContainer.controller.Fcl.controller
			 * @returns {array} return views
			 *
			 * @sap-restricted
			 */

			_getAllCurrentViews: function() {
				var oViews = [];
				var oContainer;
				if ((oContainer = this.getFclControl().getCurrentEndColumnPage()) !== undefined) {
					oViews.push(this._getViewFromContainer(oContainer));
				}
				if ((oContainer = this.getFclControl().getCurrentMidColumnPage()) !== undefined) {
					oViews.push(this._getViewFromContainer(oContainer));
				}
				if ((oContainer = this.getFclControl().getCurrentBeginColumnPage()) !== undefined) {
					oViews.push(this._getViewFromContainer(oContainer));
				}
				return oViews;
			},

			/**
			 * function triggered by the router BeforeRouteMatched event
			 * @name sap.fe.templates.RootContainer.controller.Fcl.controller#onBeforeRouteMatched
			 * @memberof sap.fe.templates.RootContainer.controller.Fcl.controller
			 * @param {*} oEvent referent to the event received
			 */
			onBeforeRouteMatched: function(oEvent) {
				if (oEvent) {
					var oQueryParams = oEvent.getParameters().arguments[this.SQUERYKEYNAME];
					var sLayout = oQueryParams ? oQueryParams.layout : null;

					// If there is no layout parameter, query for the default level 0 layout (normally OneColumn)
					if (!sLayout) {
						var oNextUIState = this.getHelper().getNextUIState(0);
						sLayout = oNextUIState.layout;
					}

					// Check if the layout if compatible with the number of targets
					// This should always be the case for normal navigation, just needed in case
					// the URL has been manually modified
					var aTargets = oEvent.getParameter("config").target;
					sLayout = this._correctLayoutForTargets(sLayout, aTargets);

					// Update the layout of the FlexibleColumnLayout
					if (sLayout) {
						if (!this.getFclControl().getModel("fcl")) {
							this.getFclControl().setModel(new JSONModel(), "fcl");
							this.getFclControl().bindProperty("layout", "fcl>/layout");
						}
						this.getFclControl().setProperty("layout", sLayout);
					}
				}
			},

			/**
			 * Helper for the FCL Component
			 * @name sap.fe.templates.RootContainer.controller.Fcl.controller#getHelper
			 * @memberof sap.fe.templates.RootContainer.controller.Fcl.controller
			 * @returns {object} instance of a semantic helper
			 */
			getHelper: function() {
				return FlexibleColumnLayoutSemanticHelper.getInstanceFor(this.getFclControl(), this._oFCLConfig);
			},

			/**
			 * Updates the FCL level information for all views corresponding to an array of targets
			 *
			 * @function
			 * @name sap.fe.templates.RootContainer.controller.Fcl.controller#updateFCLLevels
			 * @memberof sap.fe.templates.RootContainer.controller.Fcl.controller
			 * @param {*} aTargetNames Array of target names
			 * @param {*} aContainers Array of corresponding view containers
			 */
			updateFCLLevels: function(aTargetNames, aContainers) {
				var oView;
				if (aTargetNames.length == 1 && this.getTargetAggregation()[aTargetNames[0]].aggregation === "endColumnPages") {
					// Only 1 view in the last column : FCLLevel forced to 3 (fullscreen)
					oView = this._getViewFromContainer(aContainers[0]);
					oView.getController().fcl.setFCLLevel(3);
					this._updateUIStateForView(oView);
				} else {
					for (var index = 0; index < aTargetNames.length; index++) {
						var sTargetName = aTargetNames[index];
						var oTargetConfiguration = this.getTargetAggregation()[sTargetName];
						oView = this._getViewFromContainer(aContainers[index]);

						switch (oTargetConfiguration.aggregation) {
							case "beginColumnPages":
								oView.getController().fcl.setFCLLevel(0);
								break;

							case "midColumnPages":
								oView.getController().fcl.setFCLLevel(1);
								break;

							default:
								oView.getController().fcl.setFCLLevel(2);
						}

						this._updateUIStateForView(oView);
					}
				}
			},

			/**
			 * Calculates the FCL layout for a given FCL level and a target hash
			 * @param {*} iNextFCLLevel
			 * @param {*} sHash
			 * @param {*} sProposedLayout (optional) proposed layout
			 */
			getFCLLayout: function(iNextFCLLevel, sHash, sProposedLayout) {
				// First, ask the FCL helper to calculate the layout in nothing is proposed
				if (!sProposedLayout) {
					sProposedLayout = this.getHelper().getNextUIState(iNextFCLLevel).layout;
				}

				// Then change this value if necessary, based on the number of targets
				var oRoute = this.oRouter.getRouteByHash(sHash + "?layout=" + sProposedLayout);
				var aTargets = this.oTargetsFromRoutePattern[oRoute.getPattern()];

				return this._correctLayoutForTargets(sProposedLayout, aTargets);
			},

			/**
			 * Checks whether a given FCL layout is compatible with an array of targets
			 *
			 * @param {*} sProposedLayout Proposed value for the FCL layout
			 * @param {*} aTargets Array of target names used for checking
			 * @returns the corrected layout
			 */
			_correctLayoutForTargets: function(sProposedLayout, aTargets) {
				var allAllowedLayouts = {
					"2": ["TwoColumnsMidExpanded", "TwoColumnsBeginExpanded", "MidColumnFullScreen"],
					"3": [
						"ThreeColumnsMidExpanded",
						"ThreeColumnsEndExpanded",
						"ThreeColumnsMidExpandedEndHidden",
						"ThreeColumnsBeginExpandedEndHidden",
						"MidColumnFullScreen",
						"EndColumnFullScreen"
					]
				};

				if (!aTargets) {
					// Defensive, just in case...
					return sProposedLayout;
				} else if (aTargets.length > 1) {
					// More than 1 target: just simply check from the allowed values
					var aLayouts = allAllowedLayouts[aTargets.length];
					if (aLayouts.indexOf(sProposedLayout) < 0) {
						// The proposed layout isn't compatible with the number of columns
						// --> Ask the helper for the default layout for the number of columns
						sProposedLayout = aLayouts[0]; //this.getHelper().getNextUIState(aTargets.length - 1).layout;
					}
				} else {
					// Only one target
					switch (this.getTargetAggregation()[aTargets[0]].aggregation) {
						case "beginColumnPages":
							sProposedLayout = "OneColumn";
							break;

						case "midColumnPages":
							sProposedLayout = "MidColumnFullScreen";
							break;

						default:
							sProposedLayout = "EndColumnFullScreen";
							break;
					}
				}

				return sProposedLayout;
			}
		});
	},
	true
);
