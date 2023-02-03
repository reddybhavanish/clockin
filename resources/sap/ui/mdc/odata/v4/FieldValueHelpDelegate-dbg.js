/*
 * ! SAPUI5

		(c) Copyright 2009-2020 SAP SE. All rights reserved
	
 */

// ---------------------------------------------------------------------------------------
// Helper class used to execute model specific logic in FieldValueHelp
// ---------------------------------------------------------------------------------------

sap.ui.define([
	'sap/ui/mdc/field/FieldValueHelpDelegate',
	'sap/ui/mdc/util/BaseType'
], function(
		FieldValueHelpDelegate,
		BaseType
) {
	"use strict";

	/**
	 * Delegate class for sap.ui.mdc.base.FieldValueHelp.<br>
	 * <h3><b>Note:</b></h3>
	 * The class is experimental and the API/behaviour is not finalized and hence this should not be used for productive usage.
	 *
	 * @author SAP SE
	 * @private
	 * @experimental
	 * @since 1.77.0
	 * @alias sap.ui.mdc.odata.v4.FieldValueHelpDelegate
	 */
	var ODataFieldValueHelpDelegate = Object.assign({}, FieldValueHelpDelegate);

	ODataFieldValueHelpDelegate.isSearchSupported = function(oPayload, oListBinding) {

		return !!oListBinding.changeParameters;

	};

	ODataFieldValueHelpDelegate.executeSearch = function(oPayload, oListBinding, sSearch) {

		if (sSearch) {
			oListBinding.changeParameters({ $search: sSearch });
		} else {
			oListBinding.changeParameters({ $search: undefined });
		}

	};

	return ODataFieldValueHelpDelegate;

});