// Copyright (c) 2009-2017 SAP SE, All Rights Reserved

/**
 * @fileOverview PagePersistenceAdapter for the ABAP platform.
 * @version 1.78.0
 */
sap.ui.define([
    "sap/base/util/ObjectPath",
    "sap/ui/model/odata/v2/ODataModel",
    "sap/ushell/resources"
], function (ObjectPath, ODataModel, resources) {
    "use strict";

    /**
     * Gets the service url from window["sap-ushell-config"].services.PagePersistence.
     *
     * @returns {string} the service url.
     */
    function getServiceUrl () {
        var oServiceConfig = (window["sap-ushell-config"].services && window["sap-ushell-config"].services.PagePersistence) || {};
        return (ObjectPath.get("config.serviceUrl", oServiceConfig.adapter) || "").replace(/\/?$/, "/");
    }

    var oODataModel = new ODataModel({
        serviceUrl: getServiceUrl(),
        headers: {
            "sap-language": sap.ushell.Container.getUser().getLanguage(),
            "sap-client": sap.ushell.Container.getLogonSystem().getClient()
        },
        defaultCountMode: "None",
        skipMetadataAnnotationParsing: true,
        useBatch: false
    });

    var oMetaDataPromise = new Promise(function (resolve, reject) {
        oODataModel.attachMetadataLoaded(resolve);
        oODataModel.attachMetadataFailed(reject);
    });

    /**
     * Constructs a new instance of the PagePersistenceAdapter for the ABAP platform
     *
     * @constructor
     * @experimental Since 1.67.0
     * @private
     */
    var PagePersistenceAdapter = function () {
        this.S_COMPONENT_NAME = "sap.ushell_abap.adapters.abap.PagePersistenceAdapter";
    };

    /**
     * Returns the instance of ODataModel
     *
     * @returns {sap.ui.model.odata.v2.ODataModel} The OData model
     */
    PagePersistenceAdapter.prototype.getODataModel = function () {
        return oODataModel;
    };

    /**
     * Returns the instance of ODataModel
     *
     * @returns {sap.ui.model.odata.v2.ODataModel} The OData model
     */
    PagePersistenceAdapter.prototype.getMetadataPromise = function () {
        return oMetaDataPromise;
    };

    /**
     * Returns a page
     *
     * @param {string} pageId The page ID
     * @returns {Promise<object>} Resolves to a page
     *
     * @experimental Since 1.67.0
     * @private
     */
    PagePersistenceAdapter.prototype.getPage = function (pageId) {
        return this._readPage(pageId)
            .then(this._convertODataToReferencePage)
            .catch(this._rejectWithError.bind(this));
    };

    /**
     * Returns array of pages
     *
     * @param {string[]} aPageId The array of page ID
     * @returns {Promise<object[]>} Resolves to array of pages
     *
     * @experimental Since 1.75.0
     * @private
     */
    PagePersistenceAdapter.prototype.getPages = function (aPageId) {
        return this._readPages(aPageId)
            .then(function (page) {
                return page.results.map(this._convertODataToReferencePage);
            }.bind(this))
            .catch(this._rejectWithError.bind(this));
    };

    /**
     * Reads a page from the server
     *
     * @param {string} pageId The page ID
     * @returns {Promise<object>} Resolves to a page in the OData format
     *
     * @experimental Since 1.67.0
     * @private
     */
    PagePersistenceAdapter.prototype._readPage = function (pageId) {
        return this.getMetadataPromise().then(function () {
            return new Promise(function (resolve, reject) {
                this.getODataModel().read("/pageSet('" + encodeURIComponent(pageId) + "')", {
                    urlParameters: {
                        "$expand": "sections/viz"
                    },
                    success: resolve,
                    error: reject
                });
            }.bind(this));
        }.bind(this));
    };

    /**
     * Reads pages from the server
     *
     * @param {string[]} aPageId The array of page ID
     * @returns {Promise<object[]>} Resolves to a array of page in the OData format
     *
     * @experimental Since 1.75.0
     * @private
     */
    PagePersistenceAdapter.prototype._readPages = function (aPageId) {
        return this.getMetadataPromise().then(function () {
            return new Promise(function (resolve, reject) {
                sap.ui.require(["sap/ui/model/Filter", "sap/ui/model/FilterOperator"], function (Filter, FilterOperator) {
                    var aPageFilters = [],
                        oPageFilter;
                    for (var i = 0; i < aPageId.length; i++) {
                        oPageFilter = new Filter({
                            path: "id",
                            operator: FilterOperator.EQ,
                            value1: aPageId[i],
                            and: false
                        });
                        aPageFilters.push(oPageFilter);
                    }
                    this.getODataModel().read("/pageSet", {
                        urlParameters: {
                            "$expand": "sections/viz"
                        },
                        filters: aPageFilters,
                        success: resolve,
                        error: reject
                    });
                }.bind(this));
            }.bind(this));
        }.bind(this));
    };

    /**
     * Converts a reference page from the OData format to the FLP internal format.
     *
     * @param {object} page The page in the OData format.
     * @returns {object} The page in the FLP format.
     *
     * @experimental Since 1.67.0
     * @private
     */
    PagePersistenceAdapter.prototype._convertODataToReferencePage = function (page) {
        return {
            id: page.id,
            title: page.title,
            description: page.description,
            createdBy: page.createdBy,
            createdByFullname: page.createdByFullname || page.createdBy,
            modifiedBy: page.modifiedBy,
            modifiedByFullname: page.modifiedByFullname || page.modifiedBy,
            sections: page.sections.results.map(function (oSection) {
                return {
                    id: oSection.id,
                    sectionIndex: oSection.sectionIndex,
                    title: oSection.title,
                    viz: oSection.viz.results.map(function (oViz) {
                        return {
                            catalogTileId: oViz.catalogTileId,
                            id: oViz.id,
                            itemIndex: oViz.itemIndex,
                            targetMappingId: oViz.targetMappingId,
                            // rename both when frontend names match backend names
                            vizId: oViz.catalogTileId, // "catalogTileId" is the new "vizId"
                            inboundPermanentKey: oViz.targetMappingId // "targetMappingId" is the new "inboundPermanentKey"
                        };
                    }).sort(function (firstViz, secondViz) {
                        return firstViz.itemIndex - secondViz.itemIndex;
                    })
                };
            }).sort(function (firstSection, secondSection) {
                return firstSection.sectionIndex - secondSection.sectionIndex;
            })
        };
    };

    /**
     * @param {object} error The error object
     * @returns {Promise<object>} A rejected promise containing the error
     *
     * @experimental Since 1.67.0
     * @private
     */
    PagePersistenceAdapter.prototype._rejectWithError = function (error) {
        var oError = {
            component: this.S_COMPONENT_NAME,
            description: resources.i18n.getText("PagePersistenceAdapter.CannotLoadPage"),
            detail: error
        };
        return Promise.reject(oError);
    };

    return PagePersistenceAdapter;
}, true /* bExport */);
