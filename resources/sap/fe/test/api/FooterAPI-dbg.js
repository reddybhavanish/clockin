sap.ui.define(
	[
		"./BaseAPI",
		"sap/fe/test/Utils",
		"sap/fe/test/builder/OverflowToolbarBuilder",
		"sap/ui/test/OpaBuilder",
		"sap/fe/test/builder/FEBuilder"
	],
	function(BaseAPI, Utils, OverflowToolbarBuilder, OpaBuilder, FEBuilder) {
		"use strict";

		/**
		 * Constructor.
		 * @param {sap.fe.test.builder.OverflowToolbarBuilder} oOverflowToolbarBuilder the OverflowToolbarBuilder builder instance to operate on
		 * @param {string} [vFooterDescription] the footer description (optional), used to log message
		 * @returns {sap.fe.test.api.FooterAPI} the instance
		 * @constructor
		 * @private
		 */
		var FooterAPI = function(oOverflowToolbarBuilder, vFooterDescription) {
			if (!Utils.isOfType(oOverflowToolbarBuilder, OverflowToolbarBuilder)) {
				throw new Error("oOverflowToolbarBuilder parameter must be a OverflowToolbarBuilder instance");
			}
			return BaseAPI.call(this, oOverflowToolbarBuilder, vFooterDescription);
		};
		FooterAPI.prototype = Object.create(BaseAPI.prototype);
		FooterAPI.prototype.constructor = FooterAPI;

		return FooterAPI;
	}
);
