/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2017 SAP SE. All rights reserved
    
 */

/**
 * @namespace reserved for Fiori Elements
 * @name sap.fe
 * @private
 * @experimental
 */

/**
 * Initialization Code and shared classes of library sap.fe
 */
sap.ui.define(
	["sap/m/Dialog", "sap/m/Text", "sap/m/Button"],
	function(Dialog, Text, Button) {
		"use strict";

		/**
		 * Fiori Elements Library
		 *
		 * @namespace
		 * @name sap.fe
		 * @private
		 * @deprecated
		 * @experimental
		 */
		// library dependencies
		// delegate further initialization of this library to the Core
		sap.ui.getCore().initLibrary({
			name: "sap.fe",
			dependencies: ["sap.ui.core", "sap.fe.templates"],
			types: [],
			interfaces: [],
			controls: [],
			elements: [],
			version: "1.78.0",
			noLibraryCSS: true
		});

		var oDialog = new Dialog({
			title: "Depreciation Notice",
			type: "Message",
			content: new Text({
				text: "The sap.fe library will be deprecate in favor of sap.fe.template, please use `sap.fe.templates` instead"
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

		return sap.fe;
	},
	/* bExport= */ false
);
