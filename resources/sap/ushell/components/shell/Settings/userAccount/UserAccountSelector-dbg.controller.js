// Copyright (c) 2009-2020 SAP SE, All Rights Reserved

sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/base/Log",
    "sap/ushell/Config",
    "sap/ushell/resources"
], function (
    Controller,
    JSONModel,
    Log,
    Config,
    resources
) {
    "use strict";

    return Controller.extend("sap.ushell.components.shell.Settings.userAccount.UserAccountSelector", {
        onInit: function () {
            var oShellConfig = sap.ushell.Container.getRenderer("fiori2").getShellConfig(),
                bEnableUserImgConsent = oShellConfig.enableUserImgConsent;

            //determines whether the User Image consent feature is enabled
            this.imgConsentEnabled = bEnableUserImgConsent || false;
            this.oUser = sap.ushell.Container.getUser();

            var oResourceModel = resources.getTranslationModel();
            var oConfigModel = this.getConfigurationModel();
            this.getView().setModel(oResourceModel, "i18n");
            this.getView().setModel(oConfigModel, "config");

            this.oUser.attachOnSetImage(function () {
                var sPersonPlaceHolder = Config.last("/core/shell/model/userImage/personPlaceHolder"),
                    sPlaceholderIcon = "sap-icon://person-placeholder";

                oConfigModel.setProperty("/icon", sPersonPlaceHolder || sPlaceholderIcon);
            });
        },

        getConfigurationModel: function () {
            var oModel = new JSONModel({}),
                oUser = sap.ushell.Container.getUser(),
                sIcon = oUser.getImage() ? Config.last("/core/shell/model/userImage/personPlaceHolder") : "sap-icon://person-placeholder";
            oModel.setData({
                icon: sIcon,
                name: oUser.getFullName(),
                mail: oUser.getEmail(),
                server: window.location.host,
                imgConsentEnabled: this.imgConsentEnabled, //to show second tab
                isImageConsentForUser: oUser.getImageConsent() //CheckBox state
            });
            return oModel;
        },

        onCancel: function () {
            if (this.imgConsentEnabled) {
                this.getView().getModel("config").setProperty("/isImageConsentForUser", this.oUser.getImageConsent());
            }
        },

        onSave: function () {
            if (this.imgConsentEnabled) {
                return this.onSaveUserImgConsent();
            }
            return Promise.resolve();
        },

        onSaveUserImgConsent: function () {
            var oUser = this.oUser,
                bOrigUserImgConsent = oUser.getImageConsent(),
                oModel = this.getView().getModel("config"),
                bCurrentUserImgConsent = oModel.getProperty("/isImageConsentForUser"),
                oUserPreferencesPromise;

            if (bOrigUserImgConsent !== bCurrentUserImgConsent) { //only if there was a change we would like to save it
                // set the user's image consent
                oUser.setImageConsent(bCurrentUserImgConsent);

                return new Promise(function (resolve, reject) {
                    oUserPreferencesPromise = sap.ushell.Container.getService("UserInfo").updateUserPreferences(oUser);
                    oUserPreferencesPromise.done(function () {
                        oUser.resetChangedProperty("isImageConsent");
                        resolve();
                    });
                    oUserPreferencesPromise.fail(function (sErrorMessage) {
                        // Apply the previous display density to the user
                        oUser.setImageConsent(bOrigUserImgConsent);
                        oUser.resetChangedProperty("isImageConsent");
                        oModel.setProperty("/isImageConsentForUser", bOrigUserImgConsent);
                        Log.error(sErrorMessage);
                        reject(sErrorMessage);
                    });
                });
            }
            return Promise.resolve();
        },

        termsOfUserPress: function () {
            var termsOfUseTextBox = this.getView().byId("termsOfUseTextFlexBox"),
                termsOfUseLink = this.getView().byId("termsOfUseLink"),
                isTermsOfUseVisible = termsOfUseTextBox.getVisible();

            termsOfUseTextBox.setVisible(!isTermsOfUseVisible);
            termsOfUseLink.setText(resources.i18n.getText(isTermsOfUseVisible ? "userImageConsentDialogShowTermsOfUse"
                                        : "userImageConsentDialogHideTermsOfUse"));

        }
    });
});
