sap.ui.define(["./FieldBuilder", "sap/fe/test/Utils"], function(FieldBuilder, Utils) {
	"use strict";

	var FilterFieldBuilder = function() {
		return FieldBuilder.apply(this, arguments);
	};

	FilterFieldBuilder.create = function(oOpaInstance) {
		return new FilterFieldBuilder(oOpaInstance);
	};

	FilterFieldBuilder.prototype = Object.create(FieldBuilder.prototype);
	FilterFieldBuilder.prototype.constructor = FilterFieldBuilder;

	/**
	 * Checks for certain condition value(s).
	 * @param {string | array} [vValue] the expected value(s)
	 * @param {string} [sOperator] the expected operator
	 * @returns {sap.fe.test.builder.FilterFieldBuilder} this
	 * @public
	 * @sap-restricted
	 */
	FilterFieldBuilder.prototype.hasValue = function(vValue, sOperator) {
		return FieldBuilder.prototype.hasConditionValues.apply(this, arguments);
	};

	/**
	 * Changes the value of the filter field.
	 * @param {string} vValue the new value
	 * @returns {sap.fe.test.builder.FilterFieldBuilder} this
	 * @public
	 * @sap-restricted
	 */
	FilterFieldBuilder.prototype.doChangeValue = function(vValue, bClearFirst) {
		if (bClearFirst) {
			this.do(function(oFilterField) {
				oFilterField.setConditions([]);
			});
		}
		return FieldBuilder.prototype.doChangeValue.call(this, vValue);
	};

	FilterFieldBuilder.Matchers = {};

	FilterFieldBuilder.Actions = {};

	return FilterFieldBuilder;
});
