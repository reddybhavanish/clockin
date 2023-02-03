// Copyright (c) 2009-2020 SAP SE, All Rights Reserved

/**
 * @fileOverview The Unified Shell's platform independent sap.ushell.adapters.PagesCommonDataModelAdapter.
 *
 * @version 1.78.0
 */
sap.ui.define([
    "sap/base/Log",
    "sap/ushell/adapters/cdm/util/cdmSiteUtils",
    "sap/ushell/utils/clone",
    "sap/base/util/Version"
], function (Log, cdmSiteUtils, clone, Version) {
    "use strict";

    /**
     * This method MUST be called by the Unified Shell's container only.
     * Constructs a new instance of the platform independent PagesCommonDataModelAdapter.
     *
     * @class
     * @constructor
     * @see {@link sap.ushell.adapters.PagesCommonDataModelAdapter}
     *
     * @since 1.69.0
     * @private
     */
    var PagesCommonDataModelAdapter = function () {
        this._oCDMPagesRequests = {};
        this._sComponent = "sap/ushell/adapters/cdm/PagesCommonDataModelAdapter";

        this.oSitePromise = new Promise(function (resolve, reject) {
            this.fnSiteResolve = resolve;
            this.fnSiteReject = reject;
        }.bind(this));
    };

    /**
     * Retrieves all availble visualizations and applications and builds an initial CDM 3.1 site with them.
     *
     * @returns {jQuery.Deferred.Promise}
     *   The promise's done handler returns the CDM site object.
     *   In case an error occurred, the promise's fail handler returns an error message.
     *
     * @since 1.69.0
     * @private
     */
    PagesCommonDataModelAdapter.prototype.getSite = function () {
        var oDeferred = new jQuery.Deferred();

        Promise
            .all([
                sap.ushell.Container.getServiceAsync("NavigationDataProvider"),
                sap.ushell.Container.getServiceAsync("VisualizationDataProvider")
            ])
            .then(function (aService) {
                return Promise.all([
                    aService[0].getNavigationData(),
                    aService[1].getVisualizationData(),
                    sap.ushell.Container.getServiceAsync("URLParsing")
                ]);
            })
            .then(function (aResult) {
                var oNavigationData = aResult[0];
                var oVisualizationData = aResult[1];
                var oUrlParsing = aResult[2];

                var oNavigationDataHashMap = {};
                var aInbounds = oNavigationData.inbounds;
                for (var i = 0; i < aInbounds.length; i++) {
                    var sInboundPermanentKey = aInbounds[i].permanentKey || aInbounds[i].id;
                    oNavigationDataHashMap[sInboundPermanentKey] = aInbounds[i];
                }

                var oSite = {
                    _version: "3.1.0",
                    site: {},
                    catalogs: {},
                    groups: {},
                    visualizations: cdmSiteUtils.getVisualizations(oVisualizationData, oUrlParsing),
                    applications: cdmSiteUtils.getApplications(oNavigationDataHashMap),
                    vizTypes: cdmSiteUtils.getVizTypes(),
                    systemAliases: clone(oNavigationData.systemAliases),
                    pages: {}
                };

                this.fnSiteResolve(oSite);
                return oSite;
            }.bind(this))
            .then(oDeferred.resolve)
            .catch(function (error) {
                oDeferred.reject(error);
                this.fnSiteReject(error);
            }.bind(this));

        return oDeferred.promise();
    };

    /**
     * Retrieves the CDM Site of a specific page id.
     *
     * @param {string} pageId The ID of the page.
     * @returns {Promise}
     *   The Promise resolves with the CDM site object.
     *   The Promise rejects with an error message.
     * @since 1.72.0
     *
     * @private
     */
    PagesCommonDataModelAdapter.prototype.getPage = function (pageId) {
        if (!pageId) {
            var sErrorMessage = "PagesCommonDataModelAdapter: getPage was called without a pageId";
            Log.fatal(sErrorMessage, null, this._sComponent);
            return Promise.reject(sErrorMessage);
        }

        return this.oSitePromise.then(function (oSite) {
            if (oSite.pages[pageId]) {
                return oSite.pages[pageId];
            }

            return Promise.all([
                sap.ushell.Container.getServiceAsync("PagePersistence"),
                sap.ushell.Container.getServiceAsync("NavigationDataProvider")
            ])
                .then(function (aService) {
                    var oPagePersistenceService = aService[0];
                    var oNavigationDataProviderService = aService[1];
                    return Promise.all([
                        oPagePersistenceService.getPage(pageId),
                        oNavigationDataProviderService.getNavigationData()
                    ]);
                })
                .then(function (aResult) {
                    var oPage = aResult[0];
                    var oNavigationData = aResult[1];
                    this._addPageToSite(oSite, oPage, oNavigationData);
                    return oSite.pages[oPage.id];
                }.bind(this))
                .catch(function (vError) {
                    Log.fatal(
                        "PagesCommonDataModelAdapter encountered an error while fetching required services: ",
                        vError,
                        this._sComponent
                    );
                    return Promise.reject(vError);
                }.bind(this));
        }.bind(this));
    };

    /**
     * Inserts the provided page content into the CDM 3.1 site.
     *
     * @param {object} site CDM 3.1 site which should be updated
     * @param {object} page The page which should be inserted
     * @param {object} navigationData Navigation data which is provided by the NavigationDataProvider
     *
     * @since 1.75.0
     * @private
     */
    PagesCommonDataModelAdapter.prototype._addPageToSite = function (site, page, navigationData) {
        var oNavigationDataHashMap = {};
        var aInbounds = navigationData.inbounds;
        for (var i = 0; i < aInbounds.length; i++) {
            var sInboundPermanentKey = aInbounds[i].permanentKey || aInbounds[i].id;
            oNavigationDataHashMap[sInboundPermanentKey] = aInbounds[i];
        }

        // Insert page
        var oPage = site.pages[page.id] = {
            identification: {
                id: page.id,
                title: page.title
            },
            payload: {
                layout: {
                    sectionOrder: page.sections.map(function (section) {
                        return section.id;
                    })
                },
                sections: {}
            }
        };

        // Insert sections
        var oSection;
        var oPageSection;
        for (var j = 0; j < page.sections.length; j++) {
            oSection = page.sections[j];
            oPageSection = oPage.payload.sections[oSection.id] = {
                id: oSection.id,
                title: oSection.title,
                layout: {
                    vizOrder: oSection.viz.map(function (oViz) {
                        return oViz.id;
                    })
                },
                viz: {}
            };

            // Insert visualizations
            var oViz;
            for (var k = 0; k < oSection.viz.length; k++) {
                oViz = oSection.viz[k];
                // Skip invalid visualizations
                if (!site.visualizations[oViz.vizId]) {
                    // Remove the invalid visualization from the vizOrder
                    var aVizOrder = oPageSection.layout.vizOrder;
                    aVizOrder.splice(aVizOrder.indexOf(oViz.id), 1);
                    Log.error("Tile " + oViz.id + " with vizId " + oViz.vizId + " has no matching visualization. As the tile cannot be used to start an app it is removed from the page.");
                    continue;
                }
                oPageSection.viz[oViz.id] = {
                    id: oViz.id,
                    vizId: oViz.vizId
                };
            }
        }
    };

    /**
     * Triggers loading of all requested pages as part of a CDM 3.0 Site.
     *
     * @param {array} aPageIds the array of the page.
     * @returns {Promise}
     *   The Promise resolves with the CDM site object of all the Pages.
     *   The Promise rejects with an error message.
     * @since 1.75.0
     *
     * @private
     */
    PagesCommonDataModelAdapter.prototype.getPages = function (aPageIds) {
        if (!(aPageIds && Array.isArray(aPageIds) && aPageIds.length !== 0)) {
            var sErrorMessage = "PagesCommonDataModelAdapter: getPages is not an array or does not contain any Page id";
            Log.fatal(sErrorMessage, null, this._sComponent);
            return Promise.reject(sErrorMessage);
        }

        return this.oSitePromise.then(function (oSite) {
            var aPageIdsToLoad = [], sPageId;
            for (var i = 0; i < aPageIds.length; i++) {
                sPageId = aPageIds[i];
                if (!oSite.pages[sPageId]) {
                    aPageIdsToLoad.push(aPageIds[i]); // Only check for pages which have not been loaded already
                }
            }
            // return the existing pages if all the pages in array have already been loaded
            if (aPageIdsToLoad.length === 0) {
                return oSite.pages;
            }

            return Promise.all([
                sap.ushell.Container.getServiceAsync("PagePersistence"),
                sap.ushell.Container.getServiceAsync("NavigationDataProvider")
            ])
                .then(function (aService) {
                    var oPagePersistenceService = aService[0];
                    var oNavigationDataProviderService = aService[1];
                    return Promise.all([
                        oPagePersistenceService.getPages(aPageIdsToLoad),
                        oNavigationDataProviderService.getNavigationData()
                    ]);
                })
                .then(function (aResult) {
                    var aPages = aResult[0];
                    var oNavigationData = aResult[1];
                    for (var j = 0; j < aPages.length; j++) {
                        this._addPageToSite(oSite, aPages[j], oNavigationData);
                    }
                    return oSite.pages;
                }.bind(this))
                .catch(function (vError) {
                    Log.fatal(
                        "PagesCommonDataModelAdapter encountered an error while fetching required services: ",
                        vError,
                        this._sComponent
                    );
                    return Promise.reject(vError);
                }.bind(this));
        }.bind(this));
    };

    /**
     * Retrieves the personalization part of the CDM site
     *
     * @param {string} CDMVersion The version of the CDM in use
     *
     * @returns {jQuery.Deferred.Promise}
     *   The promise's done handler returns the personalization object of the CDM site.
     *   In case an error occurred, the promise's fail handler returns an error message.
     *
     * @since 1.69.0
     * @private
     */
    PagesCommonDataModelAdapter.prototype.getPersonalization = function (CDMVersion) {
        var oDeferred = new jQuery.Deferred();

        sap.ushell.Container.getServiceAsync("Personalization")
            .then(function (oPersonalizationService) {
                var oPersId;

                var oCDMSiteVersion = new Version(CDMVersion);

                oPersId = {
                    container: "sap.ushell.cdm.personalization",
                    item: "data"
                };

                if (oCDMSiteVersion.inRange("3.1.0", "4.0.0")) {
                    oPersId = {
                        container: "sap.ushell.cdm3-1.personalization",
                        item: "data"
                    };
                }

                var oScope = {
                    validity: "Infinity",
                    keyCategory: oPersonalizationService.constants.keyCategory.GENERATED_KEY,
                    writeFrequency: oPersonalizationService.constants.writeFrequency.HIGH,
                    clientStorageAllowed: false
                };

                oPersonalizationService.getPersonalizer(oPersId, oScope).getPersData()
                    .done(function (oPersonalizationContainer) {
                        oDeferred.resolve(oPersonalizationContainer || {});
                    })
                    .fail(oDeferred.reject);
            })
            .catch(function () {
                oDeferred.reject("Personalization Service could not be loaded");
            });

        return oDeferred.promise();
    };

    /**
     * Wraps the logic for storing the personalization data.
     *
     * @param {object} personalizationData
     *   Personalization data which should get stored.
     * @returns {jQuery.Deferred.Promise}
     *   The promise's done handler indicates successful storing of personalization data.
     *   In case an error occured, the promise's fail handler returns an error message.
     *
     * @since 1.69.0
     * @private
     */
    PagesCommonDataModelAdapter.prototype.setPersonalization = function (personalizationData) {
        var oDeferred = new jQuery.Deferred();

        sap.ushell.Container.getServiceAsync("Personalization")
            .then(function (oPersonalizationService) {
                var oPersId;

                var oCDMSiteVersion = new Version(personalizationData.version);

                oPersId = {
                    container: "sap.ushell.cdm.personalization",
                    item: "data"
                };

                if (oCDMSiteVersion.inRange("3.1.0", "4.0.0")) {
                    oPersId = {
                        container: "sap.ushell.cdm3-1.personalization",
                        item: "data"
                    };
                }
                var oScope = {
                    validity: "Infinity",
                    keyCategory: oPersonalizationService.constants.keyCategory.GENERATED_KEY,
                    writeFrequency: oPersonalizationService.constants.writeFrequency.HIGH,
                    clientStorageAllowed: false
                };

                oPersonalizationService.getPersonalizer(oPersId, oScope).setPersData(personalizationData)
                    .done(function () {
                        oDeferred.resolve(personalizationData);
                    })
                    .fail(oDeferred.reject);
            })
            .catch(function () {
                oDeferred.reject("Personalization Service could not be loaded");
            });

        return oDeferred.promise();
    };

    return PagesCommonDataModelAdapter;
}, /*export=*/ true);
