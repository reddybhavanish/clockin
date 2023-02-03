// Copyright (c) 2009-2020 SAP SE, All Rights Reserved

sap.ui.define([
    "sap/base/Log",
    "sap/ui/core/mvc/Controller",
    "sap/ushell/EventHub",
    "sap/ushell/Config",
    "sap/ui/core/Component",
    "sap/ui/thirdparty/jquery",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/theming/Parameters",
    "sap/ui/Device",
    "sap/ushell/resources"
], function (
    Log,
    Controller,
    EventHub,
    Config,
    Component,
    jQuery,
    JSONModel,
    Parameters,
    Device,
    resources
) {
    "use strict";

    // Get common name for to complementary (dark/lite) themes
    function getCommonName (name1, name2) {
        var l = Math.min(name1.length, (name2 || "").length);
        var i = 0;
        while (i < l && name1[i] === name2[i]) {
            i++;
        }
        return i ? name1.slice(0, i).trim() : name1;
    }

    var SAP_THEMES = {
        "base": "sapUshellBaseIconStyle",
        "sap_bluecrystal": "sapUshellBlueCrystalIconStyle",
        "sap_belize_hcb": "sapUshellHCBIconStyle sapUshellHCBIconStyleOnHCB",
        "sap_belize_hcw": "sapUshellHCWIconStyle sapUshellHCWIconStyleOnHCW",
        "sap_belize": "sapUshellBelizeIconStyle",
        "sap_belize_plus": "sapUshellPlusIconStyle",
        "sap_fiori_3_hcb": "sapUshellHCBIconStyle sapUshellHCBIconStyleOnHCB",
        "sap_fiori_3_hcw": "sapUshellHCWIconStyle sapUshellHCWIconStyleOnHCW",
        "sap_fiori_3": "sapUshellQuartzLightIconStyle",
        "sap_fiori_3_dark": "sapUshellQuartzDarkIconStyle"
    };

    return Controller.extend("sap.ushell.components.shell.Settings.appearance.Appearance", {
        TILE_SIZE: {
            Small: 0,
            Responsive: 1,

            getName: function (iValue) {
                return Object.keys(this)[iValue];
            }
        },

        onInit: function () {
            this.userInfoService = sap.ushell.Container.getService("UserInfo");
            this.oUser = sap.ushell.Container.getUser();
            this.aThemeListFromServer = this.getView().getViewData().themeList || [];

            this.oPersonalizers = {};

            //set models
            var oResourceModel = resources.getTranslationModel();
            this.getView().setModel(oResourceModel, "i18n");
            this.getView().setModel(this.getConfigurationModel(), "config");
            this._oDarkModeModel = this.getDarkModeModel(this.aThemeListFromServer);
            this.getView().setModel(this._oDarkModeModel, "darkMode");

            //Model for the tab with theme list
            var oUserTheme = this.oUser.getTheme();
            this.getView().setModel(new JSONModel({
                "options": this._getThemeListData(this.aThemeListFromServer, oUserTheme)
            }));

            //listener
            sap.ui.getCore().attachThemeChanged(this._handleThemeApplied, this);
        },

        onExit: function () {
            sap.ui.getCore().detachThemeChanged(this._handleThemeApplied, this);
        },

        _getThemeListData: function (aThemeList, sCurrentThemeId) {
            if (this.oUser.isSetThemePermitted() === false) {
                var sName = sCurrentThemeId;
                for (var i = 0; i < aThemeList.length; i++) {
                    if (aThemeList[i].id === sCurrentThemeId) {
                        sName = aThemeList[i].name || sCurrentThemeId;
                        break;
                    }
                }
                return [{
                    id: sCurrentThemeId,
                    name: sName
                }];
            }
            var oDarkModeModelData = this.getView().getModel("darkMode").getData(),
                isDarkModeActive = this._isDarkModeActive();
            return aThemeList.reduce(function (aList, oTheme) {
                var oThemeForModel = {
                    id: oTheme.id,
                    name: oTheme.name || oTheme.id || "",
                    isVisible: true,
                    isSelected: oTheme.id === sCurrentThemeId,
                    isSapTheme: !!SAP_THEMES[oTheme.id]
                };

                if (isDarkModeActive && oDarkModeModelData.supportedThemes[oTheme.id]) {
                    var oThemeDarkModeConfig = oDarkModeModelData.supportedThemes[oTheme.id];
                    if (oThemeDarkModeConfig.complementaryTheme === sCurrentThemeId || oTheme.id === sCurrentThemeId) {
                        //if one theme from pair is selected show selected theme with common name
                        oThemeForModel.isVisible = oTheme.id === sCurrentThemeId;
                    } else {
                        //if theme is not selected, show light theme as combine
                        oThemeForModel.isVisible = oThemeDarkModeConfig.mode === sap.ushell.services.DarkModeSupport.Mode.LIGHT;
                    }
                    //don't change the name, because leads to different sorting and error in onAfterRendering
                    oThemeForModel.combineName = oThemeDarkModeConfig.combineName;
                }

                aList.push(oThemeForModel);
                return aList;
            }, []).sort(function (theme1, theme2) {
                var iOrder = theme1.name.localeCompare(theme2.name);
                if (iOrder === 0) {
                    iOrder = theme1.id.localeCompare(theme2.id);
                }
                return iOrder;

            });
        },

        getConfigurationModel: function () {
            var oConfModel = new JSONModel({});

            oConfModel.setData({
                themeConfigurable: Config.last("/core/shell/model/setTheme"),
                sizeBehaviorConfigurable: Config.last("/core/home/sizeBehaviorConfigurable"),
                tileSize: this.TILE_SIZE[Config.last("/core/home/sizeBehavior")],
                contentDensityConfigurable: !Device.system.phone,
                isCozyContentMode: this.oUser.getContentDensity() === "cozy",
                sapUiContentIconColor: Parameters.get("sapUiContentIconColor"),
                textAlign: Device.system.phone ? "Left" : "Right"
            });
            return oConfModel;
        },

        getDarkModeModel: function (aThemeList) {
            var oDarkModeModel = new JSONModel({}),
                oDarkModeModelData = {
                    enabled: false,
                    detectionSupported: false,
                    detectionEnabled: true, //enabled by default in DarkModeSupport service
                    isDarkThemeApplied: false,
                    supportedThemes: {}
                };


            if (Config.last("/core/darkMode/enabled")) {
                oDarkModeModelData.enabled = true;
                var oDarkModeSupport = sap.ushell.Container.getService("DarkModeSupport");
                oDarkModeModelData.detectionSupported = oDarkModeSupport.canAutomaticallyToggleDarkMode();
                oDarkModeSupport.attachModeChanged(function (sMode) {
                        oDarkModeModel.setProperty("/isDarkThemeApplied", sMode === sap.ushell.services.DarkModeSupport.Mode.DARK);
                });
                oDarkModeModelData.supportedThemes = this._getSupportedDarkModeThemes(aThemeList, Config.last("/core/darkMode/supportedThemes") || []);
            }
            oDarkModeModel.setData(oDarkModeModelData);
            return oDarkModeModel;
        },

        _getSupportedDarkModeThemes: function (aThemeList, aSupportedThemePairs) {
            var oThemeNamesMap = aThemeList.reduce(function (oResult, oTheme) {
                oResult[oTheme.id] = oTheme.name;
                return oResult;
            }, {});

            return aSupportedThemePairs.reduce(function (oResult, oPair) {
                var sLightThemeId = oPair.light,
                    sDarkThemeId = oPair.dark,
                    sLightThemeName = oThemeNamesMap[sLightThemeId],
                    sDarkThemeName = oThemeNamesMap[sDarkThemeId];

                if (sLightThemeName && sDarkThemeName
                        && !oResult[sLightThemeId] && !oResult[sDarkThemeId]) {
                    //skip if some theme is missing from pair in aThemeList or some of the theme is used (wrong configuration)
                    var sCombineName = getCommonName(sLightThemeName, sDarkThemeName);
                    oResult[sLightThemeId] = {
                        mode: sap.ushell.services.DarkModeSupport.Mode.LIGHT,
                        complementaryTheme: sDarkThemeId,
                        combineName: sCombineName
                    };
                    oResult[sDarkThemeId] = {
                        mode: sap.ushell.services.DarkModeSupport.Mode.DARK,
                        complementaryTheme: sLightThemeId,
                        combineName: sCombineName
                    };
                }
                return oResult;
            }, {});
        },

        onAfterRendering: function () {
            var bDarkModeActive = this._isDarkModeActive(),
                isListSelected = this.getView().getModel("config").getProperty("/themeConfigurable");

            var oList = this.getView().byId("themeList"),
                items = oList.getItems(),
                oIcon,
                sThemeId;

            oList.toggleStyleClass("sapUshellThemeListDisabled", !isListSelected);
            items.forEach(function (oListItem, index) {
                sThemeId = oListItem.getCustomData()[0].getValue();
                oIcon = oListItem.getContent()[0].getItems()[0].getItems()[0];

                if (SAP_THEMES[sThemeId]) {
                   oIcon.addStyleClass(SAP_THEMES[sThemeId]);
                }
                oIcon.toggleStyleClass("sapUshellDarkMode", bDarkModeActive); // Special icon for combined themes in the dark mode
            });
        },

        _handleThemeApplied: function () {
            var oConfigModel = this.getView().getModel("config");
            if (oConfigModel) {
                oConfigModel.setProperty("/sapUiContentIconColor", Parameters.get("sapUiContentIconColor"));
            }
        },

        onCancel: function () {
            var oConfigModel = this.getView().getModel("config");

            if (oConfigModel.getProperty("/themeConfigurable")) {
                var sUserTheme = this.oUser.getTheme(),
                    aThemeOptions = this.getView().getModel().getProperty("/options");
                aThemeOptions.forEach(function (oThemeOption) {
                    oThemeOption.isSelected = sUserTheme === oThemeOption.id;
                });
                this.getView().getModel().setProperty("/options", aThemeOptions);
            }
            if (oConfigModel.getProperty("/contentDensityConfigurable")) {
                oConfigModel.setProperty("/isCozyContentMode", this.oUser.getContentDensity() === "cozy");
            }
            if (oConfigModel.getProperty("/sizeBehaviorConfigurable")) {
                oConfigModel.setProperty("/tileSize", this.TILE_SIZE[Config.last("/core/home/sizeBehavior")]);
            }
        },

        onSave: function () {
            var oConfigModel = this.getView().getModel("config"),
                aSavePromises = [];

            if (oConfigModel.getProperty("/themeConfigurable")) {
                aSavePromises.push(this.onSaveThemes());
            }

            if (oConfigModel.getProperty("/contentDensityConfigurable")) {
                aSavePromises.push(this.onSaveContentDensity());
            }

            if (oConfigModel.getProperty("/sizeBehaviorConfigurable")) {
                aSavePromises.push(this.onSaveTileSize());
            }

            return Promise.all(aSavePromises)
                .then(function (aResult) {
                    var bHasError = aResult.some(function (oResult) {
                        return oResult && oResult.error;
                    });
                    return bHasError ? Promise.reject("Can not save appearance settings") : Promise.resolve();
                });
        },

        onSaveThemes: function () {
            var oConfigModel = this.getView().getModel("config"),
                oThemeList = this.getView().byId("themeList"),
                oSelectedItem = oThemeList.getSelectedItem(),
                sNewThemeId = oSelectedItem ? oSelectedItem.getBindingContext().getProperty("id") : null,
                oUser = this.oUser,
                sOriginalThemeId = oUser.getTheme(sap.ushell.User.prototype.constants.themeFormat.ORIGINAL_THEME);

            if (sNewThemeId && sNewThemeId !== sOriginalThemeId && oConfigModel.getProperty("/themeConfigurable")) {
                return new Promise(function (resolve) {
                    oUser.setTheme(sNewThemeId);
                    this.userInfoService.updateUserPreferences(oUser)
                        .done(function () {
                            oUser.resetChangedProperty("theme");
                            this._applyDarkMode(); // make sure that the dark mode is applied after the theme change
                            resolve();
                        }.bind(this))
                        .fail(function (err) {
                            oUser.setTheme(this.origThemeId);
                            oUser.resetChangedProperty("theme");
                            Log.error("Can not save selected theme", err);
                            resolve({
                                error: true
                            });
                        });
                }.bind(this));
            }
            return Promise.resolve();
        },

        onSaveContentDensity: function () {
            var oConfigModel = this.getView().getModel("config"),
                oUser = this.oUser,
                sNewContentDensity = oConfigModel.getProperty("/isCozyContentMode") ? "cozy" : "compact",
                sUserContentDensity = oUser.getContentDensity();

            if (sNewContentDensity !== sUserContentDensity && oConfigModel.getProperty("/contentDensityConfigurable")) {
                return new Promise(function (resolve) {
                    oUser.setContentDensity(sNewContentDensity);
                    this.userInfoService.updateUserPreferences(this.oUser)
                        .done(function () {
                            oUser.resetChangedProperty("contentDensity");
                            sap.ui.getCore().getEventBus().publish("launchpad", "toggleContentDensity", {
                                contentDensity: sNewContentDensity
                            });
                            EventHub.emit("toggleContentDensity", {
                                contentDensity: sNewContentDensity
                            });
                            // resolve the promise _after_ the event has been processed
                            // we need to do this in an event handler, as the EventHub is asynchronous.
                            EventHub.once("toggleContentDensity").do(function () {
                                resolve();
                            });
                        })
                        .fail(function (err) {
                            oUser.setContentDensity(sUserContentDensity);
                            oUser.resetChangedProperty("contentDensity");
                            Log.error("Can not save content density configuration", err);
                            resolve({
                                error: true
                            });
                        });
                }.bind(this));
            }
            return Promise.resolve();
        },

        onSaveTileSize: function () {
            var oConfigModel = this.getView().getModel("config"),
                sNewSizeBehavior = this.TILE_SIZE.getName(oConfigModel.getProperty("/tileSize")), //take string value, not index
                sCurrentSizeBehavior = Config.last("/core/home/sizeBehavior");

            if (sNewSizeBehavior && sNewSizeBehavior !== sCurrentSizeBehavior && oConfigModel.getProperty("/sizeBehaviorConfigurable")) {
                return new Promise(function (resolve) {
                    this.writeToPersonalization("flp.settings.FlpSettings", "sizeBehavior", sNewSizeBehavior)
                        .done(function () {
                            Config.emit("/core/home/sizeBehavior", sNewSizeBehavior);
                            //todo move to other place?
                            if (sNewSizeBehavior === "Responsive") {
                                jQuery(".sapUshellTile").removeClass("sapUshellSmall");
                                jQuery(".sapUshellPlusTile").removeClass("sapUshellPlusTileSmall");
                            } else {
                                jQuery(".sapUshellTile").addClass("sapUshellSmall");
                                jQuery(".sapUshellPlusTile").addClass("sapUshellPlusTileSmall");
                            }
                            resolve();
                        })
                        .fail(function (err) {
                            Log.error("Can not save tile size configuration", err);
                            resolve({
                                error: true
                            });
                        });
                }.bind(this));
            }
            return Promise.resolve();
        },

        /**
         * Calls the Personalization service to write the given value to the backend at the given
         * place identified by the container and item name.
         *
         * @param {string} sContainer The name of the container
         * @param {string} sItem The name of the item
         * @param {any} vValue The value to be posted to the personalization service
         * @returns {Promise} A promise that is resolved once the personalization data is written.
         *                    This promise is rejected if the service fails in doing so.
         */
        writeToPersonalization: function (sContainer, sItem, vValue) {
            var oPromise;

            try {
                oPromise = this.getPersonalizer(sContainer, sItem).setPersData(vValue);
            } catch (oError) {
                Log.error("Personalization service does not work:");
                Log.error(oError.name + ": " + oError.message);

                oPromise = jQuery.when(Promise.reject(oError));
            }

            return oPromise;
        },

        /**
         * Retrieves a Personalizer instance from the Personalization service and stores it in an internal map.
         *
         * @param {string} sContainer The container ID
         * @param {string} sItem The item ID
         * @returns {object} A new or cached Personalizer instance
         */
        getPersonalizer: function (sContainer, sItem) {
            var sKey = sContainer + "-" + sItem;

            if (this.oPersonalizers[sKey]) {
                return this.oPersonalizers[sKey];
            }

            var oPersonalizationService = sap.ushell.Container.getService("Personalization");
            var oComponent = Component.getOwnerComponentFor(this);
            var oScope = {
                keyCategory: oPersonalizationService.constants.keyCategory.FIXED_KEY,
                writeFrequency: oPersonalizationService.constants.writeFrequency.LOW,
                clientStorageAllowed: true
            };

            if (!this.oPersonalizers[sKey]) {
                this.oPersonalizers[sKey] = oPersonalizationService.getPersonalizer({
                    container: sContainer,
                    item: sItem
                }, oScope, oComponent);
            }

            return this.oPersonalizers[sKey];
        },

        // Apply dark mode after the user has selected a new theme
        _applyDarkMode: function () {
            var oModel = this._oDarkModeModel;
            if (oModel.getProperty("/enabled") && oModel.getProperty("/detectionSupported") && oModel.getProperty("/detectionEnabled")) {
                sap.ushell.Container.getService("DarkModeSupport")._toggleDarkModeBasedOnSystemColorScheme();
            }
        },

        _isDarkModeActive: function () {
            var oModel = this._oDarkModeModel;
            if (oModel.getProperty("/enabled")) {
                return oModel.getProperty("/detectionSupported") ? oModel.getProperty("/detectionEnabled") : true;
            }
            return false;
        },

        changeThemeMode: function (oEvent) {
            sap.ushell.Container.getService("DarkModeSupport").toggleModeChange();
        },

        changeSystemModeDetection: function (oEvent) {
            var bSwitchState = oEvent.getSource().getState();
            if (bSwitchState) {
                sap.ushell.Container.getService("DarkModeSupport").enableDarkModeBasedOnSystem();
            } else {
                sap.ushell.Container.getService("DarkModeSupport").disableDarkModeBasedOnSystem();
            }

            // Re-adjust the theme list after the dark mode change
            var oUserTheme = this.oUser.getTheme();
            this.getView().getModel().setProperty("/options", this._getThemeListData(this.aThemeListFromServer, oUserTheme));
            this.getView().invalidate();
        }

    });
});
