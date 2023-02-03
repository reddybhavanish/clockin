// Copyright (c) 2009-2020 SAP SE, All Rights Reserved

sap.ui.define([
    "sap/ushell/services/AppConfiguration",
    "sap/ushell/Config",
    "sap/ui/thirdparty/datajs",
    "sap/base/util/isEmptyObject",
    "sap/base/Log",
    "sap/ui/thirdparty/jquery",
    "sap/ui/model/json/JSONModel",
    "sap/ushell/resources"
], function (
    AppConfiguration,
    Config,
    OData,
    isEmptyObject,
    Log,
    jQuery,
    JSONModel,
    resources
) {
    "use strict";

    sap.ui.controller("sap.ushell.ui.footerbar.SaveAsTile", {
        onExit: function () {
            var oView = this.getView();
            var oTileView = oView.getTileView();
            oTileView.destroy();
        },

        onInit: function () {
            var appMetaData = AppConfiguration.getMetadata();
            this.oView = this.getView();
            this.appData = this.oView.viewData.appData || {};
            // For backwards compatibility.
            if (!isEmptyObject(this.appData)) {
                this.oModel = new JSONModel({
                    sizeBehavior: Config.last("/core/home/sizeBehavior"),
                    showGroupSelection: this.appData.showGroupSelection !== false,
                    showInfo: this.appData.showInfo !== false,
                    showIcon: this.appData.showIcon !== false,
                    showPreview: this.appData.showPreview !== false,
                    title: this.appData.title ? this.appData.title.substring(0, 256) : "",
                    subtitle: this.appData.subtitle ? this.appData.subtitle.substring(0, 256) : "",
                    numberValue: "",
                    info: this.appData.info ? this.appData.info.substring(0, 256) : "",
                    icon: this.appData.icon || appMetaData.icon,
                    numberUnit: this.appData.numberUnit,
                    keywords: this.appData.keywords || "",
                    groups: []
                });
                this.oView.setModel(this.oModel);
            }
        },

        calcTileDataFromServiceUrl: function (serviceUrl) {
            var that = this;

            OData.read({ requestUri: serviceUrl },
                // sucess handler
                function (oResult) {
                    if (typeof oResult === "string") {
                        oResult = { number: oResult };
                    }
                    that.oModel.setProperty("/numberValue", oResult.number);
                    var aKeys = ["infoState", "stateArrow", "numberState", "numberDigits", "numberFactor", "numberUnit"];
                    for (var i = 0; i < aKeys.length; i++) {
                        var key = aKeys[i];
                        if (oResult[key]) {
                            that.oModel.setProperty("/" + key, oResult[key]);
                        }
                    }
                }, function (err) {
                    Log.error("sap.ushell.ui.footerbar.SaveAsTile", err);
                }, {
                    read: function (response) {
                        response.data = JSON.parse(response.body).d;
                    }
                }
            );
        },
        /**
         * Loads the list of possible targets offered for bookmark placement into the SaveAsTile view model:
         * e.g. personalized groups in launchpad homepage mode and spaces in launchpad spaces mode.
         *
         * @private
         *
         * @returns {Promise} Promise that resolves, once the possible targets have been loaded into the model.
         */
        loadPersonalizedGroups: function () {

            // Determine targets for bookmark placement
            var oBookmarkTargetsPromise = new Promise(function (resolve, reject) {
                // Get spaces from menu service in launchpad spaces mode
                if (Config.last("/core/spaces/enabled")) {
                    sap.ushell.Container.getServiceAsync("Menu").then(function (menuService) {
                        return menuService.getSpacesPagesHierarchy();
                    }).then(function (spaceEntries) {
                        resolve(spaceEntries.spaces);
                    }).catch(function () {
                        reject();
                    });
                // Get groups from launchpage service in homepage mode
                } else {
                    this.oPageBuilderService = sap.ushell.Container.getService("LaunchPage");
                    resolve(this.oPageBuilderService.getGroupsForBookmarks());
                }
            }.bind(this));

            // Store them into the groups model property
            return oBookmarkTargetsPromise.then(function (aBookmarkTargets) {
                var oModel = this.oView.getModel();
                oModel.setProperty("/groups", aBookmarkTargets);
                oModel.setProperty("/groups/length", aBookmarkTargets.length);
            }.bind(this)).catch(function () {
                Log.error("SaveAsTile controller: Unable to determine targets for bookmark placement.");
            });
        },

        getLocalizedText: function (sMsgId, aParams) {
            return aParams ? resources.i18n.getText(sMsgId, aParams) : resources.i18n.getText(sMsgId);
        }
    });
});
