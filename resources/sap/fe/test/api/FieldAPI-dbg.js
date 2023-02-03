sap.ui.define(["./BaseAPI", "sap/fe/test/Utils", "sap/fe/test/builder/FieldBuilder"], function(BaseAPI, Utils, FieldBuilder) {
	"use strict";

	/**
	 * Constructor.
	 * @param {sap.fe.test.builder.FieldBuilder} oFieldBuilder the field builder instance to operate on
	 * @param {string} [vFieldDescription] the field description (optional), used to log message
	 * @returns {sap.fe.test.api.FieldAPI} the instance
	 * @constructor
	 * @private
	 */
	var FieldAPI = function(oFieldBuilder, vFieldDescription) {
		if (!Utils.isOfType(oFieldBuilder, FieldBuilder)) {
			throw new Error("oFieldBuilder parameter must be a FieldBuilder instance");
		}
		return BaseAPI.call(this, oFieldBuilder, vFieldDescription);
	};
	FieldAPI.prototype = Object.create(BaseAPI.prototype);
	FieldAPI.prototype.constructor = FieldAPI;

	return FieldAPI;
});
