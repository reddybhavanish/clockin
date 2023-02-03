// Copyright (c) 2009-2020 SAP SE, All Rights Reserved

/* global sap */

/**
 * @fileOverview Constructor of a small HTTP client based on `XmlHttpRequest`.
 *
 * @version 1.78.0
 * @private
 */
sap.ui.define([
    "sap/ushell/utils/_HttpClient/internals",
    "sap/ushell/utils/_HttpClient/factory"
], function (oInternals, fnFactory) {
    "use strict";

    return fnFactory.bind(
        null,
        oInternals.getHttpRequestWrapper,
        oInternals.executeRequest
    );
}, /* bExport = */ true);