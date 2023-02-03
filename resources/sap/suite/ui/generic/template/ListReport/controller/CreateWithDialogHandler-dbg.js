sap.ui.define([
	"sap/ui/base/Object",
	"sap/suite/ui/generic/template/js/StableIdHelper",
    "sap/suite/ui/generic/template/lib/MessageUtils",
    "sap/base/util/extend",
    "sap/suite/ui/generic/template/lib/testableHelper"
], function(BaseObject, StableIdHelper, MessageUtils, extend, testableHelper) {
	"use strict";

	// This helper class handles creation using dialog in the List Report
	// In case the create with dialog is enabled in List Report it instantiates an instance of
	// sap.suite.ui.generic.template.Listreport.controller.CreateWithDialogHandler which implements the main part of the logic
	// This class only contains the glue code which is used to adapt the services provided by  generic class to the requirements of the List Report

	// oState is used as a channel to transfer data to the controller and back
	// oController is the controller of the enclosing ListReport
	// oTemplateUtils are the template utils as passed to the controller implementation
	function getMethods(oState, oController, oTemplateUtils) {
        var sIdForCreationDialog = StableIdHelper.getStableId({
            type: "ListReportAction",
            subType: "CreateWithDialog"
        });
        var oDialog = oController.byId(sIdForCreationDialog);

        function fnGetFilterForCurrentState() {
            return {
                "aFilters": [
                    {
                        sPath: "fullTarget",
                        sOperator: "StartsWith",
                        oValue1: oDialog.getBindingContext().getPath()
                    },
                    {
                        sPath: "target",
                        sOperator: "EQ",
                        oValue1: "/" + oController.getOwnerComponent().getEntitySet()
                    }]
            };
        }

        function fnRemoveOldMessageFromModel() {
            var oContextFilter = fnGetFilterForCurrentState(oDialog);
            var oMessageModel = sap.ui.getCore().getMessageManager().getMessageModel();
            if (oContextFilter) {
                var oMessageBinding = oMessageModel.bindList("/", null, null, [oContextFilter]); // Note: It is necessary to create  binding each time, since UI5 does not update it (because there is no change handler)
                var aContexts = oMessageBinding.getContexts();
                if (aContexts.length) {
                    var aErrorToBeRemoved = [];
                    for (var oContext in aContexts) {
                        aErrorToBeRemoved.push(aContexts[oContext].getObject());
                    }
                    sap.ui.getCore().getMessageManager().removeMessages(aErrorToBeRemoved); //to remove error state from field
                }
            }
        }

        function fnCancelPopUpDialog() {
            oDialog.close();
            if (oTemplateUtils.oComponentUtils.isDraftEnabled()) {
                oTemplateUtils.oServices.oCRUDManager.deleteEntities([oDialog.getBindingContext().getPath()], true);
            } else {
                fnRemoveOldMessageFromModel(oDialog);
                oController.getView().getModel().deleteCreatedEntry(oDialog.getBindingContext());
            }
            oDialog.setBindingContext(null);
        }

        function fnSavePopUpDialog(oEvent) {
            var bMessageModelContainsError = false;

            // client side error processing
            var aModelData = sap.ui.getCore().getMessageManager().getMessageModel().getData();
            bMessageModelContainsError = aModelData.some(function(oErrorInfo) {
                return oErrorInfo.type === "Error" && oErrorInfo.validation;
            });
            if (!bMessageModelContainsError && oTemplateUtils.oComponentUtils.isDraftEnabled()) { //Draft save
                oState.oCRUDActionHandler = oTemplateUtils.oServices.oApplication.getCRUDActionHandler(oController, oTemplateUtils.oCommonUtils);
                oState.oCRUDActionHandler.handleCRUDScenario(1, fnActivateImpl);
            } else if (!bMessageModelContainsError) {   //non-draft save
                oTemplateUtils.oCommonEventHandlers.submitChangesForSmartMultiInput();
                var oFilter = fnGetFilterForCurrentState(oDialog);
                var oSaveEntityPromise = oTemplateUtils.oServices.oCRUDManager.saveEntity(oFilter);
                oSaveEntityPromise.then(function () {
                    oDialog.close();
                    oTemplateUtils.oCommonUtils.refreshModel(oState.oSmartTable);
                    oTemplateUtils.oCommonUtils.refreshSmartTable(oState.oSmartTable);
                    fnRemoveOldMessageFromModel(oDialog);
                    oDialog.setBindingContext(null);
                });
                var oEvent1 = {
                    saveEntityPromise: oSaveEntityPromise
                };
                oTemplateUtils.oComponentUtils.fire(oController, "AfterSave", oEvent1);
            }
        }

        function fnActivateImpl() {	//activate draft entity
            var oActivationPromise = oTemplateUtils.oServices.oCRUDManager.activateDraftEntity(oState.oCRUDActionHandler, oDialog.getBindingContext());
            oActivationPromise.then(function (oResponse) {
                if (oResponse && oResponse.response && oResponse.response.statusCode === "200") {
                    oDialog.close();
                    oDialog.setBindingContext(null);
                    MessageUtils.showSuccessMessageIfRequired(oTemplateUtils.oCommonUtils.getText("OBJECT_SAVED"), oTemplateUtils.oServices);
                    oTemplateUtils.oCommonUtils.refreshSmartTable(oState.oSmartTable);
                }
            }, Function.prototype);
            var oEvent = {
                activationPromise: oActivationPromise
            };
            oTemplateUtils.oComponentUtils.fire(oController, "AfterActivate", oEvent);
        }

        function fnCreateWithDialog(oEventSource) {
            var oSmartFilterbar = oState.oSmartFilterbar;
            var oTable = oTemplateUtils.oCommonUtils.getOwnerControl(oEventSource);
            oTable = oTemplateUtils.oCommonUtils.isSmartTable(oTable) ? oTable : oTable.getParent();
            if (oTemplateUtils.oComponentUtils.isDraftEnabled()) {	//Create Dialog load for draft apps
                oTemplateUtils.oCommonEventHandlers.addEntry(oEventSource, false, oSmartFilterbar, false, false, true).then(
                    function (oTargetInfo) {
                        oTemplateUtils.oServices.oApplication.registerContext(oTargetInfo);
                        oDialog.setBindingContext(oTargetInfo);
                        oDialog.open();
                    });
            } else {	//create dialog for non-draft apps.
                var oNewContext = oTemplateUtils.oServices.oApplication.createNonDraft(oTable.getEntitySet());
                oDialog.setBindingContext(oNewContext);
                oDialog.open();
            }
        }

        /* eslint-disable */
        var fnActivateImpl = testableHelper.testable(fnActivateImpl, "fnActivateImpl");
        var fnRemoveOldMessageFromModel = testableHelper.testable(fnRemoveOldMessageFromModel, "fnRemoveOldMessageFromModel");
        var fnGetFilterForCurrentState = testableHelper.testable(fnGetFilterForCurrentState, "fnGetFilterForCurrentState");
        /* eslint-enable */

		// public instance methods
		return {
            onCancelPopUpDialog: fnCancelPopUpDialog,
            onSavePopUpDialog: fnSavePopUpDialog,
            createWithDialog: fnCreateWithDialog
		};
	}

	return BaseObject.extend("sap.suite.ui.generic.template.ListReport.controller.CreateWithDialogHandler", {
		constructor: function(oState, oController, oTemplateUtils) {
			extend(this, getMethods(oState, oController, oTemplateUtils));
		}
	});
});
