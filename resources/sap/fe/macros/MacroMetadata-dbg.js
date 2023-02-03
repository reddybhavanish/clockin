/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2017 SAP SE. All rights reserved
    
 */

sap.ui.define([], function() {
	"use strict";
	var fnApplyOverrides = function(oProps, mControlConfiguration, sID) {
		if (mControlConfiguration) {
			var oControlConfig = mControlConfiguration[sID];
			var that = this;
			if (oControlConfig) {
				Object.keys(oControlConfig).forEach(function(sConfigKey) {
					if (that.metadata.properties.hasOwnProperty(sConfigKey) && that.metadata.properties[sConfigKey].configurable) {
						oProps[sConfigKey] = oControlConfig[sConfigKey];
					}
				});
			}
		}
		return oProps;
	};
	var MacroMetadata = {
		extend: function(fnName, oContent) {
			oContent.hasValidation = true;
			oContent.applyOverrides = fnApplyOverrides.bind(oContent);
			return oContent;
		}
	};
	return MacroMetadata;
});
