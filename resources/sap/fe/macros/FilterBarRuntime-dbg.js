/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2017 SAP SE. All rights reserved
    
 */

// ---------------------------------------------------------------------------------------
// Static class used by MDC FilterBar during runtime
// ---------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------
sap.ui.define(
	[],
	function() {
		"use strict";
		var FilterBarHelper = {
			fireSearch: function(oEvent) {
				oEvent
					.getSource()
					.getParent()
					.fireSearch();
			}
		};
		return FilterBarHelper;
	},
	/* bExport= */ false
);
