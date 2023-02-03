//Copyright (c) 2009-2020 SAP SE, All Rights Reserved
/**
 * @fileOverview NWBCInterface for NWBC client
 *
 * @version 1.78.0
 */
sap.ui.define([
    "sap/ushell/EventHub"
], function (EventHub) {
    "use strict";

    /**
     * The NWBCInterface provides interfaces for the NWBC client to access FLP functionality
     */
    var NWBCInterface = {};

    /**
     * Notifies FLP that the user is active in the NWBC client application so FLP
     * should client session
     *
     * @private
     * @since 1.76.0
     */
    NWBCInterface.notifyUserActivity = function () {
        EventHub.emit("nwbcUserIsActive", Date.now());
    };

    return NWBCInterface;
});