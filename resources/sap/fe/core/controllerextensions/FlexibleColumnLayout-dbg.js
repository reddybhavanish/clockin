/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2020 SAP SE. All rights reserved
    
 */

sap.ui.define(
	[
		"sap/ui/core/mvc/ControllerExtension",
		"sap/ui/model/json/JSONModel",
		"sap/f/FlexibleColumnLayoutSemanticHelper",
		"sap/fe/core/CommonUtils",
		"sap/ui/core/Component"
	],
	function(ControllerExtension, JSONModel, FlexibleColumnLayoutSemanticHelper, CommonUtils, Component) {
		"use strict";

		/**
		 * {@link sap.ui.core.mvc.ControllerExtension Controller extension} for Flexible control Layout
		 *
		 * @namespace
		 * @alias sap.fe.core.controllerextensions.FlexibleColumnLayout
		 *
		 **/
		var Extension = ControllerExtension.extend("sap.fe.core.controllerextensions.ContextManager", {
			oTargetsAggregation: {},
			mTargetsFromRoutePattern: {},
			FCLLevel: 0,

			getFCLLevel: function() {
				return this.FCLLevel;
			},

			setFCLLevel: function(level) {
				this.FCLLevel = level;
			},

			/**
			 * return a referent to the AppComponent using the controlerExtention mechanisms (this.base)
			 * @name sap.fe.core.controllerextensions.FlexibleColumnLayout#_getOwnerComponent
			 * @memberof sap.fe.core.controllerextensions.FlexibleColumnLayout
			 * @returns {state} reference to the AppComponent
			 *
			 * @sap-restricted
			 */
			_getOwnerComponent: function() {
				return CommonUtils.getAppComponent(this.base.getView());
			},

			/**
			 * Triggers navigation when entering in fullscreen mode
			 *
			 * @function
			 * @name sap.fe.core.controllerextensions.FlexibleColumnLayout#handleFullScreen
			 * @memberof sap.fe.core.controllerextensions.FlexibleColumnLayout
			 * @param {*} oEvent Event sent to the function
			 *
			 * @sap-restricted
			 * @final
			 */

			handleFullScreen: function(oEvent) {
				var oAppComponent = this._getOwnerComponent();
				var oFclController = oAppComponent.getRootViewController();
				var oRouterProxy = oAppComponent.getRouterProxy();
				var sNextLayout = oEvent
					.getSource()
					.getModel("fclhelper")
					.getProperty("/actionButtonsInfo/fullScreen");
				if (!oFclController.getCurrentArgument()[oFclController.SQUERYKEYNAME]) {
					oFclController.getCurrentArgument()[oFclController.SQUERYKEYNAME] = {};
				}
				oFclController.getCurrentArgument()[oFclController.SQUERYKEYNAME].layout = sNextLayout;
				oRouterProxy.navTo(oFclController.getCurrentRouteName(), oFclController.getCurrentArgument());
			},

			/**
			 * Triggers navigation when exit from fullscreen mode
			 *
			 * @function
			 * @name sap.fe.core.controllerextensions.FlexibleColumnLayout#handleExitFullScreen
			 * @memberof sap.fe.core.controllerextensions.lexibleFlexibleColumnLayoutColumnLayout
			 * @param {*} oEvent Event sent to the function
			 *
			 * @sap-restricted
			 * @final
			 */
			handleExitFullScreen: function(oEvent) {
				var oAppComponent = this._getOwnerComponent();
				var oFclController = oAppComponent.getRootViewController();
				var oRouterProxy = oAppComponent.getRouterProxy();

				var sNextLayout = oEvent
					.getSource()
					.getModel("fclhelper")
					.getProperty("/actionButtonsInfo/exitFullScreen");
				if (!oFclController.getCurrentArgument()[oFclController.SQUERYKEYNAME]) {
					oFclController.getCurrentArgument()[oFclController.SQUERYKEYNAME] = {};
				}
				oFclController.getCurrentArgument()[oFclController.SQUERYKEYNAME].layout = sNextLayout;
				//oRouter.navTo(currentRouteName, currentArguments);
				oRouterProxy.navTo(oFclController.getCurrentRouteName(), oFclController.getCurrentArgument());
			},

			/**
			 * Triggers navigation when closing a FCL column
			 *
			 * @function
			 * @name sap.fe.core.controllerextensions.FlexibleColumnLayout#handleClose
			 * @memberof sap.fe.core.controllerextensions.FlexibleColumnLayout
			 * @param {*} oEvent Event sent to the function
			 *
			 * @sap-restricted
			 * @final
			 */
			handleClose: function(oEvent) {
				var oContext = oEvent.getSource().getBindingContext();
				this.base.routing.navigateBackFromContext(oContext);
			}
		});

		return Extension;
	}
);
