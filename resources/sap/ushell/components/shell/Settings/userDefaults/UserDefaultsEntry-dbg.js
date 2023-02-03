// Copyright (c) 2009-2020 SAP SE, All Rights Reserved

sap.ui.define([
    "sap/base/Log",
    "sap/ui/core/mvc/JSView",
    "sap/ushell/resources"
], function (
    Log,
    JSView,
    resources
) {
    "use strict";

    return {
        getEntry: function () {
            var oViewInstance;
            return {
                id: "userDefaultEntry", // defaultParametersSelector
                entryHelpID: "defaultParameters",
                title: resources.i18n.getText("defaultsValuesEntry"),
                valueArgument: function () {
                    return sap.ushell.Container.getServiceAsync("UserDefaultParameters")
                        .then(function (oUserDefaultParametersService) {
                            return new Promise(function (resolve, reject) {
                                oUserDefaultParametersService.hasRelevantMaintainableParameters()
                                    .done(function (bHasRelevantParameters) {
                                        resolve({ value: bHasRelevantParameters });
                                    })
                                    .fail(function (sErrorMessage) {
                                        reject(sErrorMessage);
                                    });
                            });
                    });
                },
                contentFunc: function () {
                    return sap.ui.getCore().loadLibrary("sap.ui.comp", { async: true })
                        .then(function () {
                            return JSView.create({
                                id: "defaultParametersSelector",
                                viewName: "sap.ushell.components.shell.Settings.userDefaults.UserDefaultsSetting"
                            });
                        })
                        .then(function (oView) {
                            return new Promise(function (resolve, reject) {
                                oView.getController().getContent()
                                    .done(function (oContent) {
                                        oViewInstance = oContent;
                                        resolve(oContent);
                                    });
                            });
                        });
                },
                onSave: function () {
                    if (oViewInstance) {
                        return oViewInstance.getController().onSave();
                    }
                    Log.warning("Save operation for user account settings was not executed, because the user default view was not initialized");
                    return Promise.resolve();

                },
                onCancel: function () {
                    if (oViewInstance) {
                        oViewInstance.getController().onCancel();
                        return;
                    }
                    Log.warning("Cancel operation for user account settings was not executed, because the user default view was not initialized");
                },
                defaultVisibility: false
            };
        }
    };

});
