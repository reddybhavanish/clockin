// Copyright (c) 2009-2020 SAP SE, All Rights Reserved

/**
 * @fileOverview PagePersistence utility to interact with the /UI2/FDM_PAGE_REPOSITORY_SRV service on ABAP
 * @version 1.78.0
 */
sap.ui.define([
    "sap/ushell/utils/clone"
], function (fnClone) {
    "use strict";

    /**
     * Constructs a new instance of the PagePersistence utility.
     *
     * @param {sap.ui.model.odata.v2.ODataModel} oDataModel The ODataModel for the PageRepositoryService
     * @param {sap.base.i18n.ResourceBundle} oResourceBundle The translation bundle
     * @param {sap.ui.model.message.MessageModel} oMessageModel The sap-message model
     *
     * @constructor
     * @since 1.70.0
     * @private
     */
    var PagePersistence = function (oDataModel, oResourceBundle, oMessageModel) {
        this._oODataModel = oDataModel;
        this._oResourceBundle = oResourceBundle;
        this._oEtags = {};
        this._oMessageModel = oMessageModel;
    };

    /**
     * Returns a promise which resolves to an array of page headers of all available pages.
     *
     * @returns {Promise<object[]>} Resolves to an array of page headers.
     *
     * @since 1.70.0
     * @protected
     */
    PagePersistence.prototype.getPages = function () {
        return this._readPages()
            .then(function (pages) {
                for (var i = 0; i < pages.results.length; i++) {
                    this._storeETag(pages.results[i]);
                }
                return pages;
            }.bind(this))
            .then(this._convertODataToPageList.bind(this))
            .catch(this._rejectWithErrorMessage.bind(this));
    };

    /**
     * Returns a page and stores its ETag
     *
     * @param {string} sPageId The page ID
     * @returns {Promise<object>} Resolves to a page
     *
     * @since 1.70.0
     * @protected
     */
    PagePersistence.prototype.getPage = function (sPageId) {
        return this._readPage(sPageId)
            .then(function (page) {
                this._storeETag(page);
                return page;
            }.bind(this))
            .then(this._convertODataToReferencePage.bind(this))
            .catch(this._rejectWithErrorMessage.bind(this));
    };

    /**
     * Returns a page without storing its ETag.
     * This is useful for concurrent work on a page since it allows access to the information of the page with the given ID
     * without storing the ETag.
     *
     * @param {string} sPageId The page ID
     * @returns {Promise<object>} Resolves to a page
     *
     * @since 1.75.0
     * @protected
     */
    PagePersistence.prototype.getPageWithoutStoringETag = function (sPageId) {
        return this._readPage(sPageId)
            .then(function (page) {
                return page;
            })
            .then(this._convertODataToReferencePage.bind(this))
            .catch(this._rejectWithErrorMessage.bind(this));
    };

    /**
     * Creates a new page
     *
     * @param {object} oPageToCreate The new page
     * @returns {Promise<undefined>} Resolves when the page has been created successfully
     *
     * @since 1.70.0
     * @protected
     */
    PagePersistence.prototype.createPage = function (oPageToCreate) {
        var pageToCreate = this._convertReferencePageToOData(oPageToCreate);
        return this._createPage(pageToCreate).then(this._storeETag.bind(this));
    };

    /**
     * Updates a page. This method expects to get the complete page. Sections and tiles
     * that are left out will be deleted.
     *
     * @param {object} oUpdatedPage The updated page data
     * @returns {Promise<object>} Resolves into backend response page (in FLP style) after the page has been updated successfully
     *
     * @since 1.70.0
     * @protected
     */
    PagePersistence.prototype.updatePage = function (oUpdatedPage) {
        var oUpdatedODataPage = this._convertReferencePageToOData(oUpdatedPage);
        oUpdatedODataPage.modifiedOn = this._oEtags[oUpdatedPage.id].modifiedOn;

        return this._createPage(oUpdatedODataPage)
            .then(function (page) {
                this._storeETag(page);
                return this._convertODataToReferencePage(page);
            }.bind(this))
            .catch(this._rejectWithErrorMessage.bind(this));
    };

    /**
     * Deletes a  page
     *
     * @param {string} sPageId The ID of the page to be deleted
     * @param {string} sTransportId The transport workbench
     * @returns {Promise<object>} Resolves when the page has been deleted successfully
     *
     * @since 1.70.0
     * @protected
     */
    PagePersistence.prototype.deletePage = function (sPageId, sTransportId) {
        return new Promise(function (resolve, reject) {
            this._oODataModel.callFunction("/deletePage", {
                method: "POST",
                urlParameters: {
                    pageId: sPageId,
                    transportId: sTransportId,
                    modifiedOn: this._oEtags[sPageId].modifiedOn
                },
                success: resolve,
                error: reject
            });
        }.bind(this));
    };

    /**
     * Copy a page
     *
     * @param {object} oPageToCreate The page data to copy
     * @returns {Promise<object>} Resolves when the page has been deleted successfully
     *
     * @since 1.70.0
     * @protected
     */
    PagePersistence.prototype.copyPage = function (oPageToCreate) {
        return new Promise(function (resolve, reject) {
            this._oODataModel.callFunction("/copyPage", {
                method: "POST",
                urlParameters: {
                    targetId: oPageToCreate.targetId.toUpperCase(),
                    sourceId: oPageToCreate.sourceId,
                    title: oPageToCreate.title,
                    description: oPageToCreate.description,
                    devclass: oPageToCreate.devclass || "",
                    transportId: oPageToCreate.transportId || ""
                },
                success: resolve,
                error: reject
            });
        }.bind(this));
    };

    /**
     * Fetches the catalog information.
     *
     * @param {string} pageId The page ID by which to scope the catalogs.
     * @param {string[]} [aRoleIds=undefined] The roles by which to scope the catalogs, will override the scoping by page ID if passed.
     * @returns {Promise<object[]>} A promise that resolves to an array of objects containing the visualization catalogs.
     *
     * @private
     */
    PagePersistence.prototype.getCatalogs = function (pageId, aRoleIds) {
        var bDoFilter = Array.isArray(aRoleIds) && aRoleIds[0];
        return this._fetchCatalogs(pageId).then(function (aRoles) {
            var aCatalogs = aRoles.reduce(function (catalogs, role) {
                if (bDoFilter && aRoleIds.indexOf(role.id) < 0) {
                    return catalogs; // do not add the catalog to the result
                }
                return catalogs.concat(role.catalogs.results); // add catalog to the result
            }, []);
            return aCatalogs;
        });
    };

    /**
     * Reads the headers of the available pages from the server
     *
     * @returns {Promise<object>} Resolves to the page headers in the OData format
     *
     * @since 1.70.0
     * @private
     */
    PagePersistence.prototype._readPages = function () {
        return new Promise(function (resolve, reject) {
            this._oODataModel.read("/pageSet", {
                success: resolve,
                error: reject
            });
        }.bind(this));
    };

    /**
     * Reads a page from the server
     *
     * @param {string} sPageId The page ID
     * @returns {Promise<object>} Resolves to a page in the OData format
     *
     * @since 1.70.0
     * @private
     */
    PagePersistence.prototype._readPage = function (sPageId) {
        this._sCurrentPageId = null; // reset previously fetched catalog data
        this._catalogData = null;
        return new Promise(function (resolve, reject) {
            this._oODataModel.read("/pageSet('" + encodeURIComponent(sPageId) + "')", {
                urlParameters: { "$expand": "sections/viz" },
                success: resolve,
                error: reject
            });
        }.bind(this));
    };

    /**
     * Creates a page on the server
     *
     * @param {object} oNewPage The page data
     * @returns {Promise<object>} Page the OData format
     *
     * @since 1.70.0
     * @private
     */
    PagePersistence.prototype._createPage = function (oNewPage) {
        return new Promise(function (resolve, reject) {
            this._oODataModel.create("/pageSet", oNewPage, {
                success: resolve,
                error: reject
            });
        }.bind(this));
    };

    /**
     * Converts a list of page headers from the OData format into the FLP internal format
     *
     * @param {object[]} aPages The page headers in the OData format
     * @returns {object[]} The page headers in the FLP-internal format
     *
     * @since 1.70.0
     * @private
     */
    PagePersistence.prototype._convertODataToPageList = function (aPages) {
        return aPages.results.map(function (oPage) {
            return this._convertODataToReferencePage(oPage);
        }.bind(this));
    };

    /**
     * Converts a reference page from the OData format to the FLP internal format.
     *
     * @param {object} page The page in the OData format.
     * @returns {object} The page in the FLP format.
     *
     * @since 1.70.0
     * @private
     */
    PagePersistence.prototype._convertODataToReferencePage = function (page) {
        var oPage = fnClone(page);
        delete oPage.__metadata;
        if (oPage.sections && oPage.sections.results) {
            oPage.sections = oPage.sections.results;
            oPage.sections.forEach(function (section) {
                delete section.__metadata;
                section.viz = section.viz.results;
                section.viz.forEach(function (oViz) {
                    delete oViz.__metadata;
                    // remove both when frontend names match backend names
                    oViz.vizId = oViz.catalogTileId; // "catalogTileId" is the new "vizId"
                    oViz.inboundPermanentKey = oViz.targetMappingId; // "targetMappingId" is the new "inboundPermanentKey"
                });
                // Sort according to the itemIndex order
                var iMax = section.viz.length;
                section.viz.sort(function (oViz1, oViz2) {
                    var i1 = oViz1.itemIndex || iMax;
                    var i2 = oViz2.itemIndex || iMax;
                    return i1 - i2;
                });
            });
        }
        if (!oPage.createdByFullname && oPage.createdBy) { oPage.createdByFullname = oPage.createdBy; }
        if (!oPage.modifiedByFullname && oPage.modifiedBy) { oPage.modifiedByFullname = oPage.modifiedBy; }
        var aODataMessages = this.checkErrorMessage(oPage.id);
        oPage.editAllowed = !!aODataMessages.length;
        oPage.code = (aODataMessages.length !== 0) ? aODataMessages[0].code : "";
        oPage.message = (aODataMessages.length !== 0) ? aODataMessages[0].message : "";
        oPage.assignmentCodeStatus = this.formatAssignmentStatusMessage(oPage.code);
        oPage.assignmentState = this._getAssignmentState(oPage.code);
        return oPage;
    };

    /**
     * Converts the reference page from the FLP internal format to the OData format
     *
     * @param {object} oPage The page in the FLP format
     * @returns {object} The page in the OData format
     *
     * @since 1.70.0
     * @private
     */
    PagePersistence.prototype._convertReferencePageToOData = function (oPage) {
        var oODataPage = {
            id: oPage.id,
            title: oPage.title,
            description: oPage.description,
            devclass: oPage.devclass,
            transportId: oPage.transportId,
            sections: (oPage.sections || []).map(function (section) {
                return {
                    id: section.id,
                    title: section.title,
                    viz: (section.viz || []).map(function (oViz, i) {
                        return {
                            id: oViz.id,
                            catalogTileId: oViz.catalogTileId,
                            targetMappingId: oViz.targetMappingId,
                            itemIndex: i + 1 // itemIndex starts from 1
                        };
                    })
                };
            })
        };
        return oODataPage;
    };

    /**
     * Stores the etag for a newly retrieved
     *
     * @param {object} oPage The newly retrieved
     *
     * @since 1.70.0
     * @private
     */
    PagePersistence.prototype._storeETag = function (oPage) {
        this._oEtags[oPage.id] = {
            modifiedOn: oPage.modifiedOn, // this is used as an etag for the deep update
            etag: oPage.__metadata.etag // this etag is used for deletion
        };
    };

    /**
     * Aborts all the pending requests
     * @since 1.72.0
     */
    PagePersistence.prototype.abortPendingBackendRequests = function () {
        if (this._oODataModel.hasPendingRequests()) {
            for (var i = 0; i < this._oODataModel.aPendingRequestHandles.length; i++) {
                this._oODataModel.aPendingRequestHandles[i].abort();
            }
        }
    };

    /**
     * Extracts the error message from an error object
     *
     * @param {object} oError The error object
     * @returns {Promise<object>} A rejected promise containing the error message
     *
     * @since 1.70.0
     * @private
     */
    PagePersistence.prototype._rejectWithErrorMessage = function (oError) {
        var sErrorMessage,
            oSimpleError = {};

        if (oError.statusCode === "412") {
            sErrorMessage = this._oResourceBundle.getText("Message.OverwriteChanges");
        } else if (oError.statusCode === "400") {
            sErrorMessage = this._oResourceBundle.getText("Message.OverwriteRemovedPage");
        } else {
            try {
                sErrorMessage = JSON.parse(oError.responseText).error.message.value || oError.message;
            } catch (error) {
                sErrorMessage = oError.message;
            }
        }
        oSimpleError.message = sErrorMessage;
        oSimpleError.statusCode = oError.statusCode;
        oSimpleError.statusText = oError.statusText;
        return Promise.reject(oSimpleError);
    };

    /**
     * Extracts the error message(s) from a message model.
     *
     * @param {string} sPageId The ID of the page to check for error messages.
     * @returns {object[]} Returns sap message for the page.
     *
     * @since 1.74.0
     * @private
     */
    PagePersistence.prototype.checkErrorMessage = function (sPageId) {
        function filterItems (arr, query) {
            if (!arr) {
                return [];
            }
            return arr.filter(function (obj) {
                return obj.target.toLowerCase().indexOf(query.toLowerCase()) !== -1;
            });
        }
        var oMessageModelData = this._oMessageModel ? this._oMessageModel.getData() : null;
        return filterItems(oMessageModelData, "/pageSet('" + sPageId + "')");

    };

    /**
     * Formatter to  Assignment Status Message based on the message code.
     *
     * @param {string} sCode The error message code.
     * @returns {string} The error message description.
     * @private
     */
    PagePersistence.prototype.formatAssignmentStatusMessage = function (sCode) {
        if (sCode === "/UI2/PAGE/050" || sCode === "/UI2/PAGE/028") {
            return this._oResourceBundle.getText("Label.NotAssignedToSpace");
        } else if (sCode === "/UI2/PAGE/051" || sCode === "/UI2/PAGE/029") {
            return this._oResourceBundle.getText("Label.NotAssignedToRole");
        }
        return this._oResourceBundle.getText("Label.StatusAssigned");
    };

    /**
     * Get the page assigment state.
     *
     * @param {string} sCode The error message code.
     * @returns {string} The assignment state (Success or Warning).
     * @private
     */
    PagePersistence.prototype._getAssignmentState = function (sCode) {
        if (sCode === "/UI2/PAGE/050" || sCode === "/UI2/PAGE/028" || sCode === "/UI2/PAGE/051" || sCode === "/UI2/PAGE/029") {
            return "Warning";
        }
        return "Success";
    };

    /**
     * Fetch all related visualization catalogs for the given page, according to the assigned roles.
     *
     * @param {string} pageId The Page ID.
     * @returns {Promise<object[]>} A promise containing the catalog data in the form roles -> catalogs -> visualizations.
     *
     * @since 1.75.0
     * @private
     */
    PagePersistence.prototype._fetchCatalogs = function (pageId) {
        if (this._sCurrentPageId === pageId && this._catalogData) {
            return Promise.resolve(this._catalogData);
        }
        return new Promise(function (resolve, reject) {
            this._oODataModel.read("/pageSet('" + encodeURIComponent(pageId) + "')", {
                urlParameters: { "$expand": "roles/catalogs/vizReferences" },
                success: function (pageSet) {
                    this._sCurrentPageId = pageId;
                    this._catalogData = pageSet.roles.results; // roles -> catalogs -> visualizations
                    // In addition, associate visualizations with roles for scope selector
                    this._catalogData.forEach(function (role) {
                        role.visualizationIds = [];
                        role.catalogs.results.forEach(function (catalog) {
                            catalog.vizReferences.results.forEach(function (oVizReference) {
                                role.visualizationIds.push(oVizReference.id);
                            });
                        });
                    });
                    resolve(this._catalogData);
                }.bind(this),
                error: reject
            });
        }.bind(this));
    };

    /**
     * Get array of visualization IDs from the catalogs that correspond to the given roles.
     *
     * @param {string[]} [aRoleIds=undefined] The roles by which to scope the catalogs.
     * @returns {string[]} Array of the visualization IDs.
     *
     * @since 1.75.0
     * @private
     */
    PagePersistence.prototype.getVizIds = function (aRoleIds) {
        var aVizIds = [],
            bFilter = Array.isArray(aRoleIds) && aRoleIds[0];
        if (this._catalogData) {
            this._catalogData.forEach(function (role) {
                if (!bFilter || aRoleIds.indexOf(role.id) > -1) {
                    Array.prototype.push.apply(aVizIds, role.visualizationIds);
                }
            });
        }
        return aVizIds;
    };

    /**
     * @typedef {object} RoleObject Object expanded from the oData model containing role information.
     * @property {string} title Title of the role.
     * @property {string} id The ID of the role.
     * @property {object} catalogs A deferred object to the page catalogs.
     * @property {object} __metadata The metadata for this role object.
     */
    /**
     * Expand the oData model to get the available roles.
     *
     * @param {string} pageId The ID of the page the roles need to be read from.
     * @returns {Promise<RoleObject[]>} An array of roles available for the given page.
     *
     * @private
     */
    PagePersistence.prototype.getRoles = function (pageId) {
        return this._fetchCatalogs(pageId).then(function (catalogData) {
            return catalogData.map(function (role) {
                return {
                    id: role.id,
                    title: role.title
                };
            });
        });
    };

    return PagePersistence;
}, true /* bExport */);
