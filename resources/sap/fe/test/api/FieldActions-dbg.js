sap.ui.define(["./FieldAPI", "sap/fe/test/Utils"], function(FieldAPI, Utils) {
	"use strict";

	/**
	 * Constructor.
	 * @param {sap.fe.test.builder.FieldBuilder} oFieldBuilder the field builder instance to operate on
	 * @param {string} [vFieldDescription] the field description (optional), used to log message
	 * @returns {sap.fe.test.api.FieldActions} the instance
	 * @constructor
	 * @private
	 */
	var FieldActions = function(oFieldBuilder, vFieldDescription) {
		return FieldAPI.call(this, oFieldBuilder, vFieldDescription);
	};
	FieldActions.prototype = Object.create(FieldAPI.prototype);
	FieldActions.prototype.constructor = FieldActions;
	FieldActions.prototype.isAction = true;

	/**
	 * Changes the value of the field.
	 *
	 * @param {string} [vValue] The new target value.
	 * @private
	 * @experimental
	 */
	FieldActions.prototype.iChangeValue = function(vValue) {
		var oFieldBuilder = this.getBuilder(),
			sFieldDescription = this.getIdentifier();

		if (sFieldDescription) {
			oFieldBuilder.description(Utils.formatMessage("Changing value of field '{0}' to '{1}'", this.getIdentifier(), vValue));
		}

		return this.prepareResult(oFieldBuilder.doChangeValue(vValue).execute());
	};

	return FieldActions;
});
