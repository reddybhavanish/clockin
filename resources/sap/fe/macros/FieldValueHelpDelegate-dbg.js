/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2017 SAP SE. All rights reserved
    
 */

// ---------------------------------------------------------------------------------------
// Helper class used to help create content in the field value help
// ---------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------
/* eslint-disable no-console */
sap.ui.define(
	["sap/ui/mdc/odata/v4/FieldValueHelpDelegate", "sap/fe/core/helpers/ValueListHelper"],
	function(FieldValueHelpDelegate, ValueListHelper) {
		"use strict";

		var ODataFieldValueHelpDelegate = Object.assign({}, FieldValueHelpDelegate);

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
		ODataFieldValueHelpDelegate.determineSearchSupported = function(oPayload, oFieldHelp) {
			return ValueListHelper.setValueListFilterFields(oPayload.propertyPath, oFieldHelp, true, oPayload.conditionModel);
		};

		/**
		 * Requests the content of the field help.
		 *
		 * This function is called when the field help is opened or a key or description is requested.
		 *
		 * So, depending on the field help control used, all content controls and data need to be assigned.
		 * Once they are assigned and the data is set, the returned <code>Promise</code> needs to be resolved.
		 * Only then does the field help continue opening or reading data.
		 *
		 * @param {object} oPayload Payload for delegate
		 * @param {sap.ui.mdc.base.FieldHelpBase} oFieldHelp Field help instance
		 * @param {boolean} bSuggestion Field help is called for suggestion
		 * @returns {Promise} Promise that is resolved if all content is available
		 */
		ODataFieldValueHelpDelegate.contentRequest = function(oPayload, oFieldHelp, bSuggestion) {
			return ValueListHelper.showValueListInfo(oPayload.propertyPath, oFieldHelp, bSuggestion, oPayload.conditionModel);
		};

		return ODataFieldValueHelpDelegate;
	},
	/* bExport= */ false
);
