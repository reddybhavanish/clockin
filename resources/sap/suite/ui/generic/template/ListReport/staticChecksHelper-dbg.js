sap.ui.define([], function() {
	"use strict";
    // This helper class handles the  design time checks for List Report
	// sap.suite.ui.generic.template.Listreport.controller.staticChecksHelper which implements the main part of the logic
	function fnCheckErrorforCreateWithDialog(oEntityType, oSettings) {
        //validation in case of create dialog pop up
        var aEntityProperties = oEntityType.property;
        var oFieldObject = oSettings.createWithParameterDialog.fields;
        var bPropertyExists;
        if (Object.keys(oFieldObject).length > 8) {
            throw new Error("Maximum allowed entries for create with dialog is 8, please relook in manifest.");
        } else if (oSettings.quickVariantSelectionX || oSettings.quickVariantSelection) {
            throw new Error("The feature Create With Dialog is not enabled for multiView or multiTab app, please relook in manifest.");
        } else {
            var fnHasPropertyName = function(sName, oPropertyInfo) {
                return oPropertyInfo.name === sName;
            };
            for (var sProperty in oFieldObject) {
                bPropertyExists = aEntityProperties.some(fnHasPropertyName.bind(null, oFieldObject[sProperty].path));
                if (!bPropertyExists) {
                    throw new Error("property " + oFieldObject[sProperty].path + " is not part of entity type, please relook in manifest.");
                }
            }
        }
	}

	return {
		checkErrorforCreateWithDialog: fnCheckErrorforCreateWithDialog
	};
});
