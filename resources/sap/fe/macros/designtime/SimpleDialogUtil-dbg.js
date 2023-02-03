/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2017 SAP SE. All rights reserved
    
 */
// Provides the Dialogs for Design Time Metadata Features of OData v4 Macros
sap.ui.define(["../Constants", "sap/ui/core/Fragment", "sap/ui/model/resource/ResourceModel", "sap/ui/model/json/JSONModel"], function(
	Constants,
	Fragment,
	ResourceModel,
	JSONModel
) {
	"use strict";
	var oResourceModel = new ResourceModel({
			bundleName: "sap.fe.macros.designtime.messagebundle",
			async: true
		}),
		oResourceModelPromise = new Promise(function(resolve, reject) {
			oResourceModel.attachRequestCompleted(resolve);
		}),
		oScope = {
			dialog: null
		};

	function createDialog(sID, sTitle, sMessage, aSelectOptions, currentSelection) {
		return new Promise(function(resolve) {
			//Always take the new promise
			oScope.resolve = resolve;
			Promise.all([
				oScope.dialog
					? Promise.resolve(oScope.dialog)
					: Fragment.load({
							id: sID,
							name: "sap.fe.macros.designtime.fragments.SimpleSettingsDialog",
							controller: {
								apply: function(oEvent) {
									var oResult = {
										selectedOption: sap.ui.core.Fragment.byId(sID, "options")
											.getSelectedButton()
											.data("selectedOption")
									};
									oScope.dialog.close();
									oScope.resolve(oResult);
								},
								cancel: function() {
									oScope.dialog.close();
									oScope.resolve();
								}
							}
					  }),
				oResourceModelPromise
			]).then(function(aResults) {
				var oDialog = aResults[0],
					oDialogModel,
					iSelectedIndex,
					sCurrentSelectedOption = currentSelection;

				//remember for controller above so we only create it once
				oScope.dialog = oDialog;

				for (var i = 0; i < aSelectOptions.length; i++) {
					if (aSelectOptions[i].option === sCurrentSelectedOption) {
						iSelectedIndex = i;
						break;
					}
				}

				oDialogModel = new JSONModel({
					initialMode: sCurrentSelectedOption,
					selectedIndex: iSelectedIndex,
					options: aSelectOptions,
					title: sTitle,
					message: sMessage
				});

				oDialog.setModel(oDialogModel, Constants.sDialogModel);
				oDialog.setModel(oResourceModel, Constants.sI18n);
				oDialog.open();
			});
		});
	}

	return {
		createDialog: createDialog
	};
});
