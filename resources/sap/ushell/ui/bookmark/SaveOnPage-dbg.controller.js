// Copyright (c) 2009-2020 SAP SE, All Rights Reserved

sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ushell/services/AppConfiguration",
    "sap/ui/thirdparty/datajs",
    "sap/base/util/isEmptyObject",
    "sap/base/Log",
    "sap/ui/model/json/JSONModel",
    "sap/ushell/resources",
    "sap/ui/thirdparty/hasher"
], function (
    Controller,
    AppConfiguration,
    OData,
    isEmptyObject,
    Log,
    JSONModel,
    resources,
    hasher
) {
    "use strict";

    return Controller.extend("sap.ushell.ui.bookmark.SaveOnPage", {

        /**
         * Initialize
         */
        onInit: function () {

            this.oView = this.getView();
            this.oViewData = this.oView.getViewData();
            this.oAppData = this.oViewData.appData || {};
            this.oView.setModel(resources.i18nModel, "i18n");
            if (!isEmptyObject(this.oAppData)) {
                this.oModel = new JSONModel({
                    showPageSelection: this.oAppData.showPageSelection !== false,
                    showInfo: this.oAppData.showInfo !== false,
                    showIcon: this.oAppData.showIcon !== false,
                    showPreview: this.oAppData.showPreview !== false,
                    title: this.oAppData.title ? this.oAppData.title.substring(0, 256) : "",
                    subtitle: this.oAppData.subtitle ? this.oAppData.subtitle.substring(0, 256) : "",
                    numberValue: "",
                    info: this.oAppData.info ? this.oAppData.info.substring(0, 256) : "",
                    icon: this.oAppData.icon || AppConfiguration.getMetadata().icon,
                    numberUnit: this.oAppData.numberUnit,
                    keywords: this.oAppData.keywords || ""
                });
                this.oView.setModel(this.oModel);
            }
            if (this.oViewData.serviceUrl) {
                var sServiceUrl = typeof (this.oViewData.serviceUrl) === "function" ? this.oViewData.serviceUrl() : this.oViewData.serviceUrl;
                this.oView.getModel().setProperty("serviceUrl", sServiceUrl);
                this.loadTileDataFromServiceUrl(sServiceUrl);
            }
        },

        /**
         * Loads the tile data and update the model based on the provided service url.
         *
         * @private
         * @param {string} sServiceUrl the service url
         * @since 1.78.0
         */
        loadTileDataFromServiceUrl: function (sServiceUrl) {
            var that = this;

            OData.read({
                    requestUri: sServiceUrl
                },
                // success handler
                function (vResult) {
                    if (typeof vResult === "string") {
                        vResult = {
                            number: vResult
                        };
                    }
                    that.oModel.setProperty("/numberValue", vResult.number);
                    var aKeys = ["infoState", "stateArrow", "numberState", "numberDigits", "numberFactor", "numberUnit"];
                    for (var i = 0; i < aKeys.length; i++) {
                        var key = aKeys[i];
                        if (vResult[key]) {
                            that.oModel.setProperty("/" + key, vResult[key]);
                        }
                    }
                },
                function (err) {
                    Log.error("sap.ushell.ui.footerbar.SaveAsTile", err);
                }, {
                    read: function (response) {
                        response.data = JSON.parse(response.body).d;
                    }
                }
            );
        },

        /**
         * When the dialog is set to show page selection and pages are not loaded yet, loads the list of possible targets
         * that are offered for bookmark placement into the save-on-page view model. These are pages grouped by spaces in
         * launchpad spaces mode.
         *
         * @private
         * @param {boolean} bShowPageSelection The dialog show page selection
         * @param {object[]} aPages Array of pages
         * @returns {Promise<void>} Promise that resolves, once the possible targets have been loaded into the model.
         *
         * @since 1.78.0
         */
        loadPagesIntoModel: function (bShowPageSelection, aPages) {
            if (bShowPageSelection && !aPages) {
                // Store them into the "pages" model property
                return Promise.all([
                    sap.ushell.Container.getServiceAsync("Menu"),
                    sap.ushell.Container.getServiceAsync("CommonDataModel")
                ])
                .then(function (aServices) {
                    return Promise.all([
                        aServices[0].getSpacesPagesHierarchy(),
                        aServices[1].getAllPages()
                    ]);
                })
                .then(function (aResults) {
                    var aSpaceEntries = aResults[0].spaces;
                    var aAllPages = aResults[1];
                    var mPageIdToTitle = {};

                    aAllPages.forEach(function (oPage) {
                        mPageIdToTitle[oPage.identification.id] = oPage.identification.title;
                    });

                    return aSpaceEntries.reduce(function (aTargets, oSpace) {
                        oSpace.pages.map(function (oPage) {
                            if (mPageIdToTitle[oPage.id]) {
                                aTargets.push({
                                    id: oPage.id,
                                    title: mPageIdToTitle[oPage.id],
                                    spaceTitle: oSpace.title
                                });
                            }
                        });

                        return aTargets;
                    }, []);
                })
                .then(function (aTargetPages) {
                    if (aTargetPages.length < 1) {
                        return Promise.reject();
                    }
                    this.getView().getModel().setProperty("/pages", aTargetPages);
                }.bind(this))
                .catch(function () {
                    this.getView().getModel().setProperty("/pages", []);
                    this.getView().getModel().setProperty("/cannotLoadPages", true);
                    Log.error("SaveOnPage controller: Unable to determine or use targets for bookmark placement.");
                }.bind(this));
            }
        },

        /**
         * Removes the focus from the preview tile so that the keyboard navigation does not focus on the preview tile.
         *
         * @private
         * @since 1.78.0
         */
        removeFocusFromTile: function () {
            this.getView().getDomRef().querySelector(".sapMGT").removeAttribute("tabindex");
        },

        /**
         * @returns {object} Bookmark tile data
         *
         * @private
         * @since 1.78.0
         */
        getBookmarkTileData: function () {
            var oModel = this.getView().getModel();
            var oViewData = this.getView().getViewData();
            var sURL;

            if (oViewData.customUrl) {
                if (typeof (oViewData.customUrl) === "function") {
                    sURL = oViewData.customUrl();
                } else {
                    sURL = oViewData.customUrl;
                }
            } else {
                sURL = hasher.getHash() ? ("#" + hasher.getHash()) : window.location.href;
            }

            return {
                title: oModel.getProperty("/title") ? oModel.getProperty("/title").substring(0, 256).trim() : "",
                subtitle: oModel.getProperty("/subtitle") ? oModel.getProperty("/subtitle").substring(0, 256).trim() : "",
                url: sURL,
                icon: oModel.getProperty("/icon"),
                info: oModel.getProperty("/info") ? oModel.getProperty("/info").substring(0, 256).trim() : "",
                numberUnit: oViewData.numberUnit,
                serviceUrl: typeof (oViewData.serviceUrl) === "function" ? oViewData.serviceUrl() : oViewData.serviceUrl,
                serviceRefreshInterval: oViewData.serviceRefreshInterval,
                pages: this.byId("pageSelect") ? this.byId("pageSelect").getSelectedKeys() : [],
                keywords: oViewData.keywords
            };
        }
    });
});
