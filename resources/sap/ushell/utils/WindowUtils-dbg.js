// Copyright (c) 2009-2020 SAP SE, All Rights Reserved

/**
 * @fileOverview This file contains miscellaneous utility functions for the window object.
 */
sap.ui.define([
    "sap/base/Log"
], function (Log) {
    "use strict";

    var WindowUtils = {};

    /**
     * Checks a given URL for non-http(s) protocols.
     *
     * @param {string} URL The URL to be checked
     * @returns {boolean} result - true if protocol is http(s), false if not
     *
     * @private
     * @since 1.73.0
     */
    WindowUtils.hasInvalidProtocol = function (URL) {
        // IE 11 does not support URL objects (new URL(URLString)). To achieve a similar result we make use of the browsers built in parser
        var oURL = document.createElement("a");
        oURL.setAttribute("href", URL);
        if (oURL.protocol === "javascript:") { // eslint-disable-line no-script-url
            return true;
        }
        return false;
    };

    /**
     * Opens the provided URL. If "safeMode" parameter is true (default) the URL will be validated beforehand to avoid using non-http(s) protocols
     * See https://developer.mozilla.org/en-US/docs/Web/API/Window/open for detailed parameter descriptions
     *
     * @param {string} URL The URL to be opened
     * @param {string} [windowName] The name of the browsing content of the new window
     * @param {array} [windowFeatures] List of window features
     * @param {boolean} [safeMode=true] Determines if only the http(s) protocol is allowed
     * @returns {object} The window object of the new tab
     *
     * @private
     * @since 1.73.0
     */
    WindowUtils.openURL = function (URL, windowName, windowFeatures, safeMode) {
        var bSafeMode = (safeMode === undefined) ? true : safeMode;
        if (bSafeMode && this.hasInvalidProtocol(URL)) {
            Log.fatal("Tried to open a URL with an invalid protocol");
            throw new Error("Tried to open a URL with an invalid protocol");
        }

        return window.open(URL, windowName, windowFeatures);
    };

    return WindowUtils;
});