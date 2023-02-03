// Copyright (c) 2009-2020 SAP SE, All Rights Reserved

/**
 * @fileOverview
 *
 * Exposes functions to create the system context.
 *
 * <p>This is a dependency of ClientSideTargetResolution. Interfaces exposed
 * by this module may change at any time without notice.</p>
 *
 * @version 1.78.0
 */
sap.ui.define([
    "sap/base/util/ObjectPath",
    "sap/ui/thirdparty/URI"
], function (ObjectPath, URI) {
    "use strict";

    var SystemContext = {};

    /**
     * Returns the protocol currently used by the browser.
     * @returns {string} The current protocol.
     *
     * @private
     * @since 1.78.0
     */
    SystemContext._getProtocol = function () {
        return new URI(window.location.toString()).protocol();
    };

     /**
     * @typedef {object} SystemContext
     * An object representing the context of a system.
     * @property {function} getFullyQualifiedXhrUrl
     * A function that returns a URL to issue XHR requests to a service endpoint (existing on a specific system)
     * starting from the path to a service endpoint (existing on all systems).
     * The given path should not be fully qualified.
     * Any fully qualified path will be returned unchanged to support cases where the caller does not control the path (e.g., path argument coming from external data),
     * or a request should be issued to a specific system in the context of the current system.
     */

    /**
     * Returns the systemContext of a given contentProvider.
     * @param {object} systemAlias The SystemAlias of which the system context should be returned.
     * @returns {Promise<SystemContext>} A Promise that resolves to the systemContext of the given SystemAlias.
     *
     * @private
     * @since 1.78.0
     */
    SystemContext.createSystemContextFromSystemAlias = function (systemAlias) {
        return {
            getFullyQualifiedXhrUrl: function (sPath) {
                var sPathProtocol = new URI(sPath).protocol();

                //Absolute URLs are not changed
                if (sPathProtocol === "http" || sPathProtocol === "https") {
                    return sPath;
                }

                var sProtocol = this._getProtocol();
                var sPathPrefix = "";

                if (sProtocol === "https") {
                    sPathPrefix = ObjectPath.get("https.pathPrefix", systemAlias) || "";
                } else if (sProtocol === "http") {
                    sPathPrefix = ObjectPath.get("http.pathPrefix", systemAlias) || "";
                }

                if (sPathPrefix) {
                    return URI.joinPaths(sPathPrefix, sPath).path();
                }

                return sPath;
            }.bind(this)
        };
    };

    /**
     * Returns the default systemContext.
     * Calling 'getFullyQualifiedXhrUrl' of the default systemContext will always return the given path.
     * @returns {Promise<SystemContext>} A Promise that resolves to the default systemContext.
     *
     * @private
     * @since 1.78.0
     */
    SystemContext.createDefaultSystemContext = function () {
        return {
            getFullyQualifiedXhrUrl: function (sPath) {
                return sPath;
            }
        };
    };

    return SystemContext;
});
