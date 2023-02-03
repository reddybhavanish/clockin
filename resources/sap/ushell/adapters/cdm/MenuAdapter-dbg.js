// Copyright (c) 2009-2020 SAP SE, All Rights Reserved

/**
 * @fileOverview MenuAdapter for the CDM platform.
 */

sap.ui.define([], function () {
    "use strict";

    /**
     * @typedef {object} MenuEntry A Menu Entry
     * @property {string} text The text of the menu entry
     * @property {string} intent The intent of the menu entry
     */

    /**
     * Constructs a new instance of the MenuAdapter for the CDM
     * platform
     *
     * @constructor
     * @since 1.72.0
     *
     * @private
     */
    var MenuAdapter = function () {};

    /**
     * Returns whether the menu is enabled
     *
     * @returns {Promise<boolean>} True if the menu is enabled
     *
     * @since 1.72.0
     * @private
     */
    MenuAdapter.prototype.isMenuEnabled = function () {
        return sap.ushell.Container.getServiceAsync("CommonDataModel").then(function (oCdmService) {
            return oCdmService.getMenuEntries("main").then(function (aMenuEntries) {
                return aMenuEntries.length > 0;
            });
        });
    };

    /**
     * Gets the menu entries for the pages assigned to the user
     *
     * @returns {Promise<MenuEntry[]>} The menu entries
     *
     * @since 1.72.0
     * @private
     */
    MenuAdapter.prototype.getMenuEntries = function () {
        return sap.ushell.Container.getServiceAsync("CommonDataModel").then(function (oCdmService) {
            return oCdmService.getMenuEntries("main");
        });
    };

    return MenuAdapter;
}, true);