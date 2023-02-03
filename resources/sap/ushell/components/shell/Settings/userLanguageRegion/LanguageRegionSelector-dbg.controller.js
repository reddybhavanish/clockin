// Copyright (c) 2009-2020 SAP SE, All Rights Reserved

sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/performance/Measurement",
    "sap/base/util/UriParameters",
    "sap/base/Log",
    "sap/ui/core/Locale",
    "sap/ui/core/LocaleData",
    "sap/ui/model/json/JSONModel"
], function (
    Controller,
    Measurement,
    UriParameters,
    Log,
    Locale,
    LocaleData,
    JSONModel
) {
    "use strict";

    return Controller.extend("sap.ushell.components.shell.Settings.userLanguageRegion.LanguageRegionSelector", {
        onInit: function () {

            this.userInfoService = sap.ushell.Container.getService("UserInfo");
            this.oUser = sap.ushell.Container.getUser();

            var oLocale = sap.ui.getCore().getConfiguration().getFormatSettings().getFormatLocale();
            var oLocaleData = LocaleData.getInstance(oLocale);
            var sDatePattern = oLocaleData.getDatePattern("medium"),
                sTimePattern = oLocaleData.getTimePattern("medium"),
                sTimeFormat = (sTimePattern.indexOf("H") === -1) ? "12h" : "24h";


            var bIsEnableSetLanguage = sap.ushell.Container.getRenderer("fiori2").getShellConfig().enableSetLanguage || false;
            var bIsLanguagePersonalized = this.oUser.isLanguagePersonalized();

            var oModel = new JSONModel({
                languageList: null,
                selectedLanguage: this.oUser.getLanguage(),
                selectedLanguageText: this.oUser.getLanguageText(),
                selectedDatePattern: sDatePattern,
                selectedTimeFormat: sTimeFormat,
                isSettingsLoaded: true,
                isLanguagePersonalized: bIsLanguagePersonalized,
                isEnableSetLanguage: bIsEnableSetLanguage
            });

            if (bIsEnableSetLanguage) {
                this.getView().setBusy(true);
                this._loadLanguagesList().then(function (aLanguageList) {
                    if (aLanguageList && aLanguageList.length > 1) {
                        oModel.setProperty("/languageList", aLanguageList);
                        var bHasDefault = aLanguageList.some(function (oLanguage) {
                            return oLanguage.key === "default";
                        });
                        if (!bIsLanguagePersonalized && bHasDefault) {
                            oModel.setProperty("/selectedLanguage", "default");
                        }
                    }
                    this.oView.setModel(oModel);
                    this.getView().setBusy(false);
                }.bind(this));
            } else {
                this.oView.setModel(oModel);
            }
        },

        /**
         * Load language via userInfoService API
         * @returns {Promise} the language list from the platforms
         * @private
         */
        _loadLanguagesList: function () {
            Measurement.start("FLP:LanguageRegionSelector._getLanguagesList", "_getLanguagesList", "FLP");
            return new Promise(function (resolve) {
                Measurement.start("FLP:LanguageRegionSelector._getLanguagesList", "_getLanguagesList", "FLP");
                this.userInfoService.getLanguageList()
                    .done(function (oData) {
                        Measurement.end("FLP:LanguageRegionSelector._getLanguagesList");
                        resolve(oData);
                    })
                    .fail(function (error) {
                        Measurement.end("FLP:LanguageRegionSelector._getLanguagesList");
                        Log.error("Failed to load language list.", error,
                            "sap.ushell.components.ushell.settings.userLanguageRegion.LanguageRegionSelector.controller");
                        resolve(null);
                    });
            }.bind(this));
        },

        onCancel: function () {
            var oModel = this.getView().getModel(),
                oModelData = oModel.getData(),
                aLanguageList = oModelData.languageList,
                isEnableSetLanguage = oModelData.isEnableSetLanguage;
            if (isEnableSetLanguage && aLanguageList) {
                var oUserLanguage = this.oUser.getLanguage();
                // if the user language isn't personalzied - need to return browser language in select
                var sSelectedLanguage = oModelData.isLanguagePersonalized ? oUserLanguage : "default";
                oModel.setProperty("/selectedLanguage", sSelectedLanguage);
                //Date and time format are taken from current language
                this._updateTextFields(oUserLanguage);
            }
        },

        onSave: function () {
            var oUser = this.oUser,
                oModelData = this.getView().getModel().getData(),
                sSelectedLanguage = oModelData.selectedLanguage,
                sOriginLanguage = oUser.getLanguage(),
                bLanguegeChanged = sSelectedLanguage !== (oModelData.isLanguagePersonalized ? sOriginLanguage : "default");

            if (oModelData.isEnableSetLanguage && oModelData.languageList && bLanguegeChanged) {
                return new Promise(function (resolve, reject) {
                    oUser.setLanguage(sSelectedLanguage);
                    this.userInfoService.updateUserPreferences(oUser)
                        .done(function () {
                            oUser.resetChangedProperty("language");
                            var oResolvedResult = {
                                refresh: true
                            };
                            var sLanguageinUrl = UriParameters.fromQuery(window.location.search).get("sap-language");
                            if (sLanguageinUrl && sSelectedLanguage !== "default") {
                                oResolvedResult.urlParams=[{
                                    "sap-language": sSelectedLanguage
                                }];
                            }

                            // the backend would use the language of the sap-usercontext cookie after the reload
                            // without the language in the cookie the backend uses the language from the user defaults
                            // this has to be done after the last backend request and right before the reload as a
                            // backend request would reset the language in the cookie
                            this._removeLanguageFromUserContextCookie();

                            resolve(oResolvedResult); //refresh the page to apply changes.
                        }.bind(this))
                        // in case of failure - return to the original language
                        .fail(function (sErrorMessage) {
                            oUser.setLanguage(sOriginLanguage);
                            oUser.resetChangedProperty("language");
                            this._updateTextFields(sOriginLanguage);
                            Log.error("Failed to save language", sErrorMessage,
                                "sap.ushell.components.ushell.settings.userLanguageRegion.LanguageRegionSelector.controller");
                            reject(sErrorMessage);
                        }.bind(this));
                }.bind(this));
            }
            return Promise.resolve();
        },

        /**
         * Remove the language from the sap-usercontext cookie
         *
         * @private
         * @since 1.79.0
         */
        _removeLanguageFromUserContextCookie: function () {

            var sUserContextCookie = document.cookie.split(";").find(function (cookie) {
                return cookie.indexOf("sap-usercontext") !== -1;
            });

            // the cookie is only present on the ABAP platform
            if (!sUserContextCookie) {
                return;
            }

            // the cookie should always look like this: sap-usercontext=sap-language=EN&sap-client=120
            // to be on the safe side the language is removed while preserving the other parameters
            var aCookieValues = sUserContextCookie.replace("sap-usercontext=", "").split("&");
            aCookieValues = aCookieValues.filter(function (sValue) {
                return sValue.indexOf("sap-language") === -1;
            });

            document.cookie = "sap-usercontext=" + aCookieValues.join("&") + ";path=/";
        },

        /**
         * This method call handle the change in the selection language
         * @param {string} oEvent control event
         * @private
         */
        _handleSelectChange: function (oEvent) {
            var sSelectedLanguage = oEvent.getParameters().selectedItem.getKey();
            this._updateTextFields(sSelectedLanguage);
        },

        /**
         * Update Date and Time text fields
         * @param {string} sLanguage the newly selected langauge
         * @private
         */
        _updateTextFields: function (sLanguage) {
            var oModel = this.getView().getModel(),
                oLocale = new Locale(sLanguage),
                oLocaleData = LocaleData.getInstance(oLocale),
                sDatePattern = oLocaleData.getDatePattern("medium"),
                sTimePattern = oLocaleData.getTimePattern("medium"),
                sTimeFormat = (sTimePattern.indexOf("H") === -1) ? "12h" : "24h";

            oModel.setProperty("/selectedDatePattern", sDatePattern);
            oModel.setProperty("/selectedTimeFormat", sTimeFormat);
        }
    });
});
