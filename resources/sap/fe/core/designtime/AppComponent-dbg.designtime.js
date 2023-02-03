sap.ui.define(
	[],
	function() {
		"use strict";
		// To enable all actions, remove the propagateMetadata function. Or, remove this file and its entry in AppComponent.js referring 'designTime'.
		return {
			actions: "not-adaptable",
			aggregations: {
				rootControl: {
					actions: "not-adaptable",
					propagateMetadata: function(oElement) {
						// white list of controls for which we want to enable DesignTime
						var mWhiteList = {
							//"sap.ui.layout.form.Form": true,
							"sap.ui.layout.form.FormContainer": true,
							"sap.ui.layout.form.FormElement": true
						};

						if (mWhiteList[oElement.getMetadata().getName()]) {
							return {};
						} else {
							return {
								actions: "not-adaptable"
							};
						}
					}
				}
			}
		};
	},
	false
);
