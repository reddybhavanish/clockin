/*
 * SAPUI5

		(c) Copyright 2009-2020 SAP SE. All rights reserved
	
 */

sap.ui.define([
	"sap/ui/core/Core",
	"sap/ui/model/type/Currency",
	"sap/ui/model/ValidateException"
], function(
	Core,
	CurrencyBase,
	ValidateException
) {
	"use strict";
	var _rDecimal = /^([-]?)(\d+)(?:\.(\d+))?$/;

	var Currency = CurrencyBase.extend("sap.ui.comp.smartfield.type.Currency", {
		constructor: function(oFormatOptions, oConstraints) {
			CurrencyBase.apply(this, arguments);
			this.bParseWithValues = true;
			this.sName = "Currency";
		}
	});

	Currency.prototype.parseValue = function(vValue, sInternalType, aCurrentValues) {
		var aValues = CurrencyBase.prototype.parseValue.apply(this, arguments),
			sIntegerPart,
			sFractionPart,
			aMatches = Array.isArray(aValues) && aValues[0] && _splitDecimals(aValues[0]);

		if (Array.isArray(aMatches)) {
			sIntegerPart = aMatches[1] + aMatches[2];
			sFractionPart = aMatches[3];
			if (Number.parseInt(sFractionPart) === 0) {
				aValues[0] = sIntegerPart;
			}
		}

		if (aValues[1] === undefined) {
			aValues[1] = aCurrentValues[1];
		}

		return aValues;
	};

	Currency.prototype.validateValue = function(vValues) {
		var aMatches,
			sValue = vValues[0],
			bNullValue = sValue === null;

		if (this.oConstraints.nullable && (bNullValue || (sValue === this.oFormatOptions.emptyString))) {
			return;
		}

		aMatches = _splitDecimals(sValue);

		if ((typeof sValue !== "string") || (aMatches === null)) {
			throw new ValidateException(getText("EnterNumber"));
		}

		var iIntegerDigits = aMatches[2].length,
			iFractionDigits = (aMatches[3] || "").length,
			iPrecision = this.oConstraints.precision || Infinity,
			sCurrency = vValues[1],
			iScaleOfCurrency = this.oOutputFormat.oLocaleData.getCurrencyDigits(sCurrency),
			iScale = Math.min(this.oConstraints.scale || 0, iScaleOfCurrency);

		if (iFractionDigits > iScale) {

			if (iScale === 0) {

				// enter a number with no decimal places
				throw new ValidateException(getText("EnterInt"));
			}

			if ((iIntegerDigits + iScale) > iPrecision) {

				// enter a number with a maximum of {iPrecision - iScale} digits to the left of the decimal
				// separator and a maximum of {iScale} decimal places
				throw new ValidateException(getText("EnterNumberIntegerFraction", [iPrecision - iScale, iScale]));
			}

			// enter a number with a maximum of {iScale} decimal places
			throw new ValidateException(getText("EnterNumberFraction", [iScale]));
		}

		if (iIntegerDigits > (iPrecision - iScale)) {

			// enter a number with a maximum of {iPrecision - iScale} digits to the left of
			// the decimal separator
			throw new ValidateException(getText("EnterNumberInteger", [iPrecision - iScale]));
		}
	};

	function _splitDecimals(sValue) {
		return _rDecimal.exec(sValue);
	}

	function getText(sKey, aParams) {
		return Core.getLibraryResourceBundle().getText(sKey, aParams);
	}

	Currency.prototype.getName = function() {
		return "sap.ui.comp.smartfield.type.Currency";
	};

	return Currency;
});
