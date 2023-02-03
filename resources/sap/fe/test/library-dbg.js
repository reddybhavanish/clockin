/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2020 SAP SE. All rights reserved
    
 */

/**
 * @namespace reserved for Fiori Elements
 * @name sap.fe.templates
 * @private
 * @experimental
 */

/**
 * Initialization Code and shared classes of library sap.fe.templates
 */
sap.ui.define(
	[],
	function() {
		"use strict";

		/**
		 * Fiori Elements Templates Library
		 *
		 * @namespace
		 * @name sap.fe.templates
		 * @private
		 * @experimental
		 */

		// library dependencies
		sap.ui.getCore().initLibrary({
			name: "sap.fe.test",
			dependencies: ["sap.ui.core"],
			types: [],
			interfaces: [],
			controls: [],
			elements: [],
			version: "1.78.0",
			noLibraryCSS: true
		});

		return sap.fe.test;
	},
	/* bExport= */ false
);
