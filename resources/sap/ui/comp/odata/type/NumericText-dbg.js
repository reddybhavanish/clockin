/*
 * ! SAPUI5

		(c) Copyright 2009-2020 SAP SE. All rights reserved
	
 */

sap.ui.define([
	"sap/ui/core/Core",
	"sap/ui/core/library",
	"sap/ui/comp/smartfield/type/String"

], function(Core, coreLibrary, String) {
	"use strict";

	var NumericText = String.extend("sap.ui.comp.odata.type.NumericText", {
		constructor: function(oFormatOptions, oConstraints) {
			String.call(this, oFormatOptions, oConstraints);
			this.oCustomRegex = new RegExp("^[0]*$");
		}
	});

	/**
	 * Parses the given value which is expected to be of the numeric text to a string.
	 *
	 * @param {string|number|boolean} vValue
	 *   The value to be parsed
	 * @returns {string}
	 *   The parsed value
	 * @override
	 * @private
	 */
	NumericText.prototype.parseValue = function(vValue) {
		if (this.oCustomRegex.test(vValue)) {
			return null;
		}

		return String.prototype.parseValue.apply(this, arguments);
	};

	/**
	 * Formats the given value to the given numeric text.
	 *
	 * @param {string} sValue
	 *   The value to be formatted
	 * @returns {string|number|boolean}
	 *   The formatted output value; contains only <code>0</code> is always formatted
	 *   to <code>null</code>.
	 * @function
	 * @override
	 * @private
	 */
	NumericText.prototype.formatValue = function(sValue) {
		if (this.oCustomRegex.test(sValue)) {
			return null;
		}

		return String.prototype.formatValue.apply(this, arguments);
	};

	/**
	 * @inheritDoc
	 */
	NumericText.prototype.destroy = function() {
		String.prototype.destroy.apply(this, arguments);
	};

	return NumericText;
});
