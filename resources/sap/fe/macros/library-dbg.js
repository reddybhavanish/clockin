/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2017 SAP SE. All rights reserved
    
 */

/**
 * @namespace reserved for Fiori Elements
 * @name sap.fe.macros
 * @private
 * @experimental
 */

/**
 * Initialization Code and shared classes of library sap.fe.core
 */
sap.ui.define(
	[],
	function() {
		"use strict";

		/**
		 * @namespace
		 * @name sap.fe.macros
		 * @private
		 * @experimental
		 */

		/**
		 * Fiori Elements Macros Library
		 *
		 * @namespace
		 * @name sap.fe.macros
		 * @private
		 * @experimental
		 */

		// library dependencies
		// delegate further initialization of this library to the Core
		sap.ui.getCore().initLibrary({
			name: "sap.fe.macros",
			dependencies: ["sap.ui.core"],
			types: [],
			interfaces: [],
			controls: [],
			elements: [],
			version: "1.78.0",
			noLibraryCSS: true
		});

		return sap.fe.macros;
	},
	/* bExport= */ false
);
