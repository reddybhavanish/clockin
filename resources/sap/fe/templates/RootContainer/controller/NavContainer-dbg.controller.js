sap.ui.define(
	["sap/ui/model/json/JSONModel", "./BaseController", "sap/ui/core/Component"],
	function(JSONModel, BaseController, Component) {
		"use strict";

		return BaseController.extend("sap.fe.templates.RootContainer.controller.NavContainer", {
			/**
			 * Initialize the NavContainer component
			 * @name sap.fe.templates.RootContainer.controller.NavContainer.controller#initialize
			 * @memberof sap.fe.templates.RootContainer.controller.NavContainer.controller
			 * @sap-restricted
			 * @final
			 */
			onInit: function() {
				BaseController.prototype.onInit.bind(this)();
			},

			onExit: function() {},

			/**
			 * check ifthe FCL component is enabled
			 *
			 * @function
			 * @name sap.fe.templates.RootContainer.controller.NavContainer.controller#isFclEnabled
			 * @memberof sap.fe.templates.RootContainer.controller.NavContainer.controller
			 * @returns {bool}
			 *
			 * @sap-restricted
			 * @final
			 */
			isFclEnabled: function() {
				return false;
			}
		});
	},
	true
);
