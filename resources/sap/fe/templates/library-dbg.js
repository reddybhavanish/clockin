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
	["sap/ui/core/Fragment", "sap/ui/core/XMLTemplateProcessor"],
	function(Fragment, XMLTemplateProcessor) {
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
		// delegate further initialization of this library to the Core
		sap.ui.getCore().initLibrary({
			name: "sap.fe.templates",
			dependencies: ["sap.ui.core", "sap.fe.core", "sap.fe.macros"],
			types: ["sap.fe.templates.VariantManagement", "sap.fe.templates.ObjectPage.SectionLayout"],
			interfaces: [],
			controls: [],
			elements: [],
			version: "1.78.0",
			noLibraryCSS: true
		});

		sap.fe.templates.VariantManagement = {
			/**
			 * No variant management at all.
			 * @public
			 */
			None: "None",

			/**
			 * One variant configuration for the whole page.
			 * @public
			 */
			Page: "Page",

			/**
			 * Variant management on control level.
			 * @public
			 */
			Control: "Control"
		};
		if (!sap.fe.templates.ObjectPage) {
			sap.fe.templates.ObjectPage = {};
		}
		sap.fe.templates.ObjectPage.SectionLayout = {
			/**
			 * All sections are shown in one page
			 * @public
			 */
			Page: "Page",

			/**
			 * All top-level sections are shown in an own tab
			 * @public
			 */
			Tabs: "Tabs"
		};

		Fragment.registerType("CUSTOM", {
			init: function(mSettings) {
				this._sExplicitId = this.getId();
				this._oContainingView = this;
				this.oController = mSettings.containingView.getController().createExtensionAPI();
				this._aContent = XMLTemplateProcessor.parseTemplate(mSettings.fragmentContent, this);
			}
		});

		return sap.fe.templates;
	},
	/* bExport= */ false
);
