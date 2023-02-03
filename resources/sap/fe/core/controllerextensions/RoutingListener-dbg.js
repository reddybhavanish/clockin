sap.ui.define(
	["sap/ui/core/mvc/ControllerExtension", "sap/ui/core/mvc/OverrideExecution", "sap/ui/core/Component", "sap/fe/core/CommonUtils"],
	function(ControllerExtension, OverrideExecution, Component, CommonUtils) {
		"use strict";

		/**
		 * {@link sap.ui.core.mvc.ControllerExtension Controller extension}
		 *
		 * @namespace
		 * @alias sap.fe.core.controllerextensions.RoutingListener
		 *
		 * @sap-restricted
		 * @since 1.74.0
		 */
		return ControllerExtension.extend("sap.fe.core.controllerextensions.RoutingListener", {
			metadata: {
				methods: {
					"navigateToTarget": { "public": true, "final": false }
				}
			},
			/**
			 * Navigate to specified navigation target name
			 * @param oContext					Context instance
			 * @param sNavigationTargetName 	Navigation target name
			 */
			navigateToTarget: function(oContext, sNavigationTargetName) {
				var oNavigationConfiguration = this._oPageComponent.getNavigationConfiguration(sNavigationTargetName);
				if (oNavigationConfiguration) {
					var oDetailRoute = oNavigationConfiguration.detail;
					var sRouteName = oDetailRoute.route;
					var mParameterMapping = oDetailRoute.parameters;
					this._oRoutingService.navigateTo(oContext, sRouteName, mParameterMapping, true);
				} else {
					this._oRoutingService.navigateTo(oContext, null, null, true);
				}
				this._oView.getViewData();
			},

			override: {
				onInit: function() {
					var that = this;
					this._oView = this.base.getView();
					this._oAppComponent = CommonUtils.getAppComponent(this._oView);
					this._oPageComponent = Component.getOwnerComponentFor(this._oView);
					if (!this._oAppComponent || !this._oPageComponent || !this._oPageComponent.isA("sap.fe.core.TemplateComponent")) {
						throw new Error(
							"This controller extension requires to be created from a view included in a 'sap.fe.core.TemplateComponent'"
						);
					}
					this._oAppComponent
						.getService("routingService")
						.then(function(oRoutingService) {
							that._oRoutingService = oRoutingService;
						})
						.catch(function() {
							throw new Error("This controller extension cannot work without a 'routingService' on the main AppComponent");
						});
				}
			}
		});
	}
);
