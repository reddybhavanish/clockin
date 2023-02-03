//Copyright (c) 2009-2020 SAP SE, All Rights Reserved
/**
 * @fileOverview PageRuntimeFormatter consists of formatter functions
 * which are use throughout the PagesRuntime.
 *
 * @version 1.78.0
 */

sap.ui.define([
    "sap/ui/Device"
], function (Device) {
    "use strict";
    var PageRuntimeFormatter = {};

    /**
     * Returns the section visibility depending on the used device, visualization count
     * and the state of the action mode.
     *
     * @param {object[]} visualizations An array of visualizations which are inside the section
     * @param {boolean} actionModeActive A boolean value indicating if the action mode is active for the Page.
     * @returns {boolean} The section visibility
     *
     * @since 1.73.0
     * @private
     */
    PageRuntimeFormatter._sectionVisibility = function (visualizations, actionModeActive) {
        return !(!actionModeActive && visualizations.length === 0 && (Device.system.phone || (Device.system.tablet && !Device.system.desktop)));
    };

    return PageRuntimeFormatter;
});