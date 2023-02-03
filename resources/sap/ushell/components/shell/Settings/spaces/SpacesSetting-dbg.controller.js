// Copyright (c) 2009-2020 SAP SE, All Rights Reserved

sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ushell/Config",
    "sap/ushell/resources"
], function (
    Controller,
    JSONModel,
    Config,
    resources
) {
    "use strict";

    return Controller.extend("sap.ushell.components.shell.Settings.spaces.SpacesSetting", {
        onInit: function () {
            this.getView().setModel(new JSONModel({
                isSpacesEnabled: Config.last("/core/spaces/enabled")
            }));
            this.getView().setModel(resources.getTranslationModel(), "i18n");
        },

        onSave: function () {
            var oModel = this.getView().getModel(),
                bSwitchValue = oModel.getProperty("/isSpacesEnabled"),
                bSpacesEnabled = Config.last("/core/spaces/enabled");

            // Nothing to do if setting has not been changed
            if (bSwitchValue === bSpacesEnabled) {
                return Promise.resolve();
            }

            // Set and persist changed user preferences
            return sap.ushell.Container.getServiceAsync("UserInfo").then(function (oUserInfoService) {
                var oUser = oUserInfoService.getUser();
                oUser.setChangedProperties({
                    propertyName: "spacesEnabled",
                    name: "SPACES_ENABLEMENT"
                }, bSpacesEnabled, bSwitchValue);

                return new Promise(function (resolve, reject) {
                    oUserInfoService.updateUserPreferences(oUser)
                        .done(function () {
                            oUser.resetChangedProperty("spacesEnabled");
                            resolve({refresh: true});
                        })
                        .fail(function (sErrorMessage) {
                            oModel.setProperty("/isSpacesEnabled", bSpacesEnabled);
                            oUser.resetChangedProperty("spacesEnabled");
                            reject(sErrorMessage);
                        });
                });
            });
        },

        onCancel: function () {
            this.getView().getModel().setProperty("/isSpacesEnabled", Config.last("/core/spaces/enabled"));
        }
    });
});
