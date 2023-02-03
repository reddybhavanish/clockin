/*!
 * SAPUI5

		(c) Copyright 2009-2020 SAP SE. All rights reserved
	
 */

/**
 * Initialization Code and shared classes of library sap.webanalytics.core.
 */
sap.ui.define(['jquery.sap.global', 'sap/ui/core/library'],
	function(jQuery, library1) {
	"use strict";


	/**
	 * UI5 library: sap.webanalytics.core.
	 *
	 * @namespace
	 * @name sap.webanalytics.core
	 * @public
	 */

	// library dependencies

	// delegate further initialization of this library to the Core
	sap.ui.getCore().initLibrary({
		name : "sap.webanalytics.core",
		dependencies : ["sap.ui.core"],
		types: [],
		interfaces: [],
		controls: [],
		elements: [],
		noLibraryCSS: true,
		version: "1.78.0"
	});

	return sap.webanalytics.core;

});
