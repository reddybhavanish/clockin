// Copyright (c) 2009-2020 SAP SE, All Rights Reserved

/**
 * @fileOverview PagePersistenceAdapter for the local platform.
 * @version 1.78.0
 */
sap.ui.define([
    "sap/ushell/utils",
    "sap/ui/util/Storage",
    "sap/base/util/ObjectPath"
], function (utils, Storage, ObjectPath) {
    "use strict";

    /**
     * Constructs a new instance of the PagePersistenceAdapter for the local platform
     *
     * @param {object} system The system information. This is not used in a local environment.
     * @param {string} parameter The Adapter parameter.
     * @param {object} adapterConfiguration The Adapter configuration.
     *
     * @constructor
     * @experimental Since 1.67.0
     * @private
     */
    var PagePersistenceAdapter = function (system, parameter, adapterConfiguration) {
        var sStorageType = ObjectPath.get("config.storageType", adapterConfiguration) || Storage.Type.local;
        if (sStorageType !== Storage.Type.local && sStorageType !== Storage.Type.session) {
            throw new utils.Error("PagePersistence Adapter Local Platform: unsupported storage type: '" + sStorageType + "'");
        }
        this._oAdapterConfiguration = adapterConfiguration;
    };

    /**
     * Gets a promise resolved with a page, that matches the given id.
     *
     * @param {string[]} id The id of a page.
     * @returns {Promise<object[]>} A Promise resolved with a page or rejected if no page matched the given id.
     *
     * @private
     */
    PagePersistenceAdapter.prototype.getPage = function (id) {
        var that = this;
        return new Promise(function (resolve, reject) {
            var aPages = that._oAdapterConfiguration.config.pages || [];
            aPages.forEach(function (page) {
                if (page.id === id) {
                    resolve(page);
                }
            });
            reject({ error: "No page with id '" + id + "' was found." });
        });
    };

    /**
     * Gets a promise resolved with an array of pages, that match the given array of ids.
     *
     * @param {string[]} ids The array of page ids.
     * @returns {Promise<object[]>} A Promise resolved with an array of pages.
     *
     * @private
     */
    PagePersistenceAdapter.prototype.getPages = function (ids) {
        var aPages = this._oAdapterConfiguration.config.pages || [],
            mPages = {};

        aPages.forEach(function (page) {
            mPages[page.id] = page;
        });

        return Promise.resolve(ids.map(function (id) {
                return mPages[id];
            }).filter(function (page) {
                return !!page;
            }));
    };

    return PagePersistenceAdapter;
}, true /* bExport */);
