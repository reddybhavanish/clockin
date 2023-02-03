/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2017 SAP SE. All rights reserved
    
 */
sap.ui.define(
	["sap/ui/model/resource/ResourceModel"],
	function(ResourceModel) {
		"use strict";
		var oResourceModel = new ResourceModel({ bundleName: "sap.fe.macros.messagebundle", async: true }),
			oResourceBundle = sap.ui.getCore().getLibraryResourceBundle("sap.fe.macros");

		return {
			/**
			 * Return the resource model for the library
			 * @private
			 * @returns {sap.ui.model.resource.ResourceModel} The resource model for this library
			 */
			getModel: function() {
				return oResourceModel;
			},
			/**
			 * Returns a text from the resource bundle of this library
			 * @borrows jQuery.sap.util.ResourceBundle.prototype.getText
			 * @param sText{string} Text
			 * @param aParameter{array} Parameter
			 * @returns {*|string} Text from resource bundle
			 */
			getText: function(sText, aParameter) {
				return oResourceBundle.getText(sText, aParameter);
			}
		};
	},
	true
);
