sap.ui.define(["./FieldAPI", "sap/fe/test/Utils"], function(FieldAPI, Utils) {
	"use strict";

	/**
	 * Constructor.
	 * @param {sap.fe.test.builder.FieldBuilder} oFieldBuilder the field builder instance to operate on
	 * @param {string} [vFieldDescription] the field description (optional), used to log message
	 * @returns {sap.fe.test.api.FieldAssertions} the instance
	 * @constructor
	 * @private
	 */
	var FieldAssertions = function(oFieldBuilder, vFieldDescription) {
		return FieldAPI.call(this, oFieldBuilder, vFieldDescription);
	};
	FieldAssertions.prototype = Object.create(FieldAPI.prototype);
	FieldAssertions.prototype.constructor = FieldAssertions;
	FieldAssertions.prototype.isAction = false;

	/**
	 * Checks the field for given value and state. Depending on {@link sap.ui.mdc.Field#display}, the provided value to
	 * match can be either the value itself or the description or both.
	 * @param {string | array | object} [vValue] The value to check. If it is an array, the first entry is considered as
	 * value and the second as description. The object format looks like this:
	 * <code><pre>
	 * 	{
	 * 		value: <string | number>, (optional)
	 * 		description: <string | number> (optional)
	 * 	}
	 * </pre></code>
	 * @param {object} [mFieldState] the state of the field. The following states are supported:
	 * <code><pre>
	 * 	{
	 * 		visible: true|false,
	 * 		focused: true|false
	 * 	}
	 * </pre></code>
	 * @private
	 */
	FieldAssertions.prototype.iCheckState = function(vValue, mFieldState) {
		var aArguments = Utils.parseArguments([[String, Object], Object], arguments),
			oFieldBuilder = this.getBuilder(),
			sFieldDescription = this.getIdentifier();

		if (sFieldDescription) {
			oFieldBuilder.description(
				Utils.formatMessage(
					"Checking field '{0}' having value='{1}' and state='{2}'",
					this.getIdentifier(),
					aArguments[0],
					aArguments[1]
				)
			);
		}
		return this.prepareResult(
			oFieldBuilder
				.hasValue(vValue)
				.hasState(mFieldState)
				.execute()
		);
	};

	return FieldAssertions;
});
