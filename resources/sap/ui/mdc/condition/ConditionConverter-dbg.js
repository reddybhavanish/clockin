/*!
 * SAPUI5

		(c) Copyright 2009-2020 SAP SE. All rights reserved
	
 */
sap.ui.define([
		'sap/ui/mdc/condition/Condition',
//		'sap/ui/mdc/field/FieldBaseDelegate',
		'sap/ui/mdc/odata/v4/FieldBaseDelegate',
		'sap/ui/mdc/util/BaseType',
		'sap/ui/mdc/util/DateUtil',
		'sap/ui/mdc/condition/FilterOperatorUtil',
		'sap/ui/mdc/condition/Operator',
		'sap/base/util/merge'
	],
	function(
		Condition,
		FieldBaseDelegate,
		BaseType,
		DateUtil,
		FilterOperatorUtil,
		Operator,
		merge
	) {
		"use strict";

		/**
		 * Utility function for condition conversion
		 *
		 * @author SAP SE
		 * @private
		 * @since 1.74.0
		 * @alias sap.ui.mdc.condition.ConditionConverter
		 */
		var ConditionConverter = function() {};
		var sDateTimePattern = "yyyy-MM-ddTHH:mm:ssZ"; // milliseconds missing
		var sDatePattern = "yyyy-MM-dd";
		var sTimePattern = "HH:mm:ss";

		/**
		 * converts a condition into a unified String
		 *
		 * The condition is not checked for validity. The used values must fit to the used basic type.
		 *
		 * @param {object} oCondition Condition
		 * @param {sap.ui.model.SimpleType} oType Data type of the condition
		 * @returns {object} stringified condition
		 * @public
		 * @since 1.74.0
		 */
		ConditionConverter.toString = function(oCondition, oType) {
			var oOperator = FilterOperatorUtil.getOperator(oCondition.operator);
			if (oOperator && oOperator.valueTypes.length > 0 && oOperator.valueTypes[0] !== Operator.ValueType.Self && oOperator.valueTypes[0] !== Operator.ValueType.Static) {
				// we have to create the type instance for the values
				oType = oOperator._createLocalType(oOperator.valueTypes[0]); // TODO type for all values must be the same
			}

			// convert using "normalized" data type
			var aValues = _valuesToString(oCondition.values, oType);

			// ignore the second value for EQ operator with description
			if (oCondition.operator === "EQ") {
				aValues = [aValues[0]];
			}

			// inParameter, OutParameter
			// TODO: we need the types of the in/out parameter
			var oInParameters;
			var oOutParameters;

			if (oCondition.inParameters) {
				oInParameters = merge({}, oCondition.inParameters);
			}
			if (oCondition.outParameters) {
				oOutParameters = merge({}, oCondition.outParameters);
			}

			var oResult = Condition.createCondition(oCondition.operator, aValues, oInParameters, oOutParameters, oCondition.validated);
			return oResult;

		};

		/**
		 * converts a stringified condition into a type bases condition
		 *
		 * The condition is not checked for validity. The used values must fit to the used basic type.
		 *
		 * @param {object} oCondition stringified condition
		 * @param {sap.ui.model.SimpleType} oType Data type of the condition
		 * @returns {object} condition
		 * @public
		 * @since 1.74.0
		 */
		ConditionConverter.toType = function(oCondition, oType) {
			var oOperator = FilterOperatorUtil.getOperator(oCondition.operator);
			if (oOperator && oOperator.valueTypes.length > 0 && oOperator.valueTypes[0] !== Operator.ValueType.Self && oOperator.valueTypes[0] !== Operator.ValueType.Static) {
				// we have to create the type instance for the values
				oType = oOperator._createLocalType(oOperator.valueTypes[0]); // TODO type for all values must be the same
			}

			// convert using "normalized" data type
			var aValues = _stringToValues(oCondition.values, oType);

			// inParameter, OutParameter
			// TODO: we need the types of the in/out parameter
			var oInParameters;
			var oOutParameters;

			if (oCondition.inParameters) {
				oInParameters = merge({}, oCondition.inParameters);
			}
			if (oCondition.outParameters) {
				oOutParameters = merge({}, oCondition.outParameters);
			}

			var oResult = Condition.createCondition(oCondition.operator, aValues, oInParameters, oOutParameters, oCondition.validated);
			return oResult;

		};

		function _getBaseType(oType) {

			// TODO: use central function, not FieldBaseDelegate
			var oFormatOptions = oType.oFormatOptions;
			var oConstraints = oType.oConstraints;
			return FieldBaseDelegate.getBaseType({}, oType.getMetadata().getName(), oFormatOptions, oConstraints);

		}

		function _valuesToString(aValues, oType) {

			var aResult = [];

			for (var i = 0; i < aValues.length; i++) {
				var vValue = aValues[i];
				aResult.push(_valueToString(vValue, oType));
			}

			return aResult;

		}

		function _valueToString(vValue, oType){

			// read base type
			var sBaseType = _getBaseType.call(this, oType);

			switch (sBaseType) {
			case BaseType.DateTime:
				return DateUtil.typeToString(vValue, oType, sDateTimePattern);

			case BaseType.Date:
				return DateUtil.typeToString(vValue, oType, sDatePattern);

			case BaseType.Time:
				return DateUtil.typeToString(vValue, oType, sTimePattern);

			case BaseType.Boolean:
				return vValue;

			case BaseType.Numeric:
				if (oType.getMetadata().getName() === "sap.ui.model.odata.type.Int64" || oType.getMetadata().getName() === "sap.ui.model.odata.type.Decimal") {
					return vValue.toString();
				}
				return vValue;

			default:
				// just use type to convert
				return oType.formatValue(vValue, "string");
			}

		}

		function _stringToValues(aValues, oType) {

			var aResult = [];

			for (var i = 0; i < aValues.length; i++) {
				var sValue = aValues[i];
				aResult.push(_stringToValue(sValue, oType));
			}

			return aResult;

		}

		function _stringToValue(sValue, oType){

			// read base type
			var sBaseType = _getBaseType.call(this, oType);

			switch (sBaseType) {
			case BaseType.DateTime:
				return DateUtil.stringToType(sValue, oType, sDateTimePattern);

			case BaseType.Date:
				return DateUtil.stringToType(sValue, oType, sDatePattern);

				case BaseType.Time:
				return DateUtil.stringToType(sValue, oType, sTimePattern);

			case BaseType.Boolean:
				return sValue;

			case BaseType.Numeric:
				if (oType.getMetadata().getName() === "sap.ui.model.odata.type.Int64" || oType.getMetadata().getName() === "sap.ui.model.odata.type.Decimal") {
					return oType.parseValue(sValue, "string");
				}
				return sValue;

			default:
				// just use type to convert
				return oType.parseValue(sValue, "string");
			}

		}

		return ConditionConverter;
	}, /* bExport= */ true);
