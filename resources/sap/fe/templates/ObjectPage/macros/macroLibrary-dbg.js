/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2020 SAP SE. All rights reserved
    
 */

/**
 * Initialization Code and shared classes of odata v4 phantom controls
 */
sap.ui.define(["sap/ui/core/util/XMLPreprocessor", "sap/fe/macros/PhantomUtil", "./SubSectionBlockContent.metadata"], function(
	XMLPreprocessor,
	PhantomUtil,
	SubSectionBlockContent
) {
	"use strict";

	/**
	 * The context definition mapping a source context to a target name.
	 *
	 * @typedef {map} sap.fe.macros.MetadataContext
	 * @property {string} model The source model
	 * @property {string} path The path of the source model
	 * @property {string} name The target name
	 *
	 * @private
	 * @ui5-restricted
	 * @experimental
	 */

	/**
	 * OData Version 4 Macros (XMLPreprocessor Plugins) for UI5 XML Views
	 *
	 * <b>
	 * All the macros below are not controls. They will only create XML snippets
	 * during XMLPreprocessing. That generated XML will only use real controls.
	 * </b>
	 *
	 * <h3>Prerequisites for using macros</h3>
	 * <ul>
	 * 	<li>The {@link sap.ui.core.util.XMLPreprocessor} must be used for
	 * 		view creation
	 * 	</li>
	 * 	<li>The view or fragment that uses the macros must define an xml
	 * 	 namespace and require this
	 * 	 macro library using template:require. E.g.:
	 * 	<pre>
	 * &lt;mvc:View xmlns="sap.m"
	 * 	  xmlns:macro="sap.fe.macros"
	 * 	  template:require="{
	 * 	    macroLibrary: 'sap/fe/templates/ObjectPage/macros/macroLibrary'
	 * 	  }"
	 * /&gt;
	 *  </pre>
	 *	</li>
	 * </ul>
	 * @experimental
	 * @namespace
	 * @name sap.fe.macros
	 * @author SAP SE
	 * @version 1.78.0
	 * @private
	 * @sap-restricted
	 */
	var sNamespace = "sap.fe.templates.ObjectPage.macros",
		aControls = [SubSectionBlockContent].map(function(vEntry) {
			if (typeof vEntry === "string") {
				return {
					name: vEntry,
					namespace: sNamespace,
					metadata: {
						metadataContexts: {},
						properties: {},
						events: {}
					}
				};
			}
			return vEntry;
		});

	function registerAll() {
		// as a first version we expect that there's a fragment with exactly the namespace/name
		aControls.forEach(function(oEntry) {
			PhantomUtil.register(oEntry);
		});
	}

	//This is needed in for templating test utils
	function deregisterAll() {
		aControls.forEach(function(oEntry) {
			XMLPreprocessor.plugIn(null, oEntry.namespace, oEntry.name);
		});
	}

	//Always register when loaded for compatibility
	registerAll();

	return {
		register: registerAll,
		deregister: deregisterAll
	};
});
