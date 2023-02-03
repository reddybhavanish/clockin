/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2017 SAP SE. All rights reserved
    
 */

// ----------------------------------------------------------------------------------
// Provides base class sap.fe.AppComponent for all generic app components
// ----------------------------------------------------------------------------------
sap.ui.define(["sap/fe/core/AppComponent", "sap/base/Log", "sap/m/Dialog", "sap/m/Text", "sap/m/Button"], function(
	CoreAppComponent,
	Log,
	Dialog,
	Text,
	Button
) {
	"use strict";

	/**
	 * @classname "sap.fe.AppComponent"
	 * @private
	 * @deprecated please use sap.fe.core.AppComponent instead
	 */
	return CoreAppComponent.extend("sap.fe.AppComponent", {
		init: function() {
			var sText = 'This class of the AppComponent is deprecated, please use "sap.fe.core.AppComponent" instead';
			Log.error(sText);
			var oDialog = new Dialog({
				title: "Depreciation Notice",
				type: "Message",
				content: new Text({
					text: sText
				}),
				beginButton: new Button({
					type: "Emphasized",
					text: "OK",
					press: function() {
						oDialog.close();
					}
				}),
				afterClose: function() {
					oDialog.destroy();
				}
			});
			oDialog.open();
			CoreAppComponent.prototype.init.apply(this, arguments);
		}
	});
});
