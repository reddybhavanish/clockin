/*
 * ! SAPUI5

		(c) Copyright 2009-2020 SAP SE. All rights reserved
	
 */

// ---------------------------------------------------------------------------------------
// Helper class used to execute model specific logic in FieldBase
// ---------------------------------------------------------------------------------------

sap.ui.define([
	'sap/ui/mdc/field/FieldHelpBaseDelegate'
], function(
		FieldHelpBaseDelegate
) {
	"use strict";
	/**
	 * Delegate class for sap.ui.mdc.base.FieldValueHelp.<br>
	 * <b>Note:</b> The class is experimental and the API/behavior is not finalized and hence this should not be used for productive usage.
	 *
	 * @author SAP SE
	 * @private
	 * @experimental
	 * @restricted sap.ui.mdc.field.FieldvalueHelp
	 * @since 1.77.0
	 * @alias sap.ui.mdc.field.FieldValueHelpDelegate
	 */
	var FieldValueHelpDelegate = Object.assign({}, FieldHelpBaseDelegate);

	/**
	 * Requests to set the <code>filterFields</code> property of the <code>FieldValueHelp</code> element.
	 *
	 * This function is called when the field help is opened for suggestion.
	 * If no search is supported, content controls are not needed right now as the field help is not opened in this case.
	 *
	 * @param {object} oPayload Payload for delegate
	 * @param {sap.ui.mdc.base.FieldHelpBase} oFieldHelp Field help instance
	 * @returns {Promise} Promise that is resolved if the <code>FilterFields</code> property is set
	 */
	FieldValueHelpDelegate.determineSearchSupported = function(oPayload, oFieldHelp) {

	};

	/**
	 * Checks if a <code>ListBinding</code> supports $Search.
	 *
	 * @param {object} oPayload Payload for delegate
	 * @param {sap.ui.model.ListBinding} oListBinding ListBinding
	 * @returns {boolean} true if $search is supported
	 */
	FieldValueHelpDelegate.isSearchSupported = function(oPayload, oListBinding) {

		return false; // only on V4

	};

	/**
	 * Executes a search in a <code>ListBinding</code>.
	 *
	 * @param {object} oPayload Payload for delegate
	 * @param {sap.ui.model.ListBinding} oListBinding ListBinding
	 * @param {string} sSearch Search string
	 */
	FieldValueHelpDelegate.executeSearch = function(oPayload, oListBinding, sSearch) {

		// only on V4

	};

	return FieldValueHelpDelegate;

});