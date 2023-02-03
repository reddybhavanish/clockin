// Copyright (c) 2009-2017 SAP SE, All Rights Reserved

/**
 * @fileOverview MenuAdapter for the ABAP platform.
 */

sap.ui.define([
    "sap/ushell/Config",
    "sap/base/Log"
], function (Config, Log) {
    "use strict";

    /**
    * Constructs a new instance of the MenuAdapter for the ABAP
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
        var bSpacesEnabled = Config.last("/core/spaces/enabled");
        var iAssignedSpacesCount = this._getAssignedSpaces().length;
        return Promise.resolve(bSpacesEnabled && iAssignedSpacesCount > 0);
    };

    /**
     * Gets the menu entries for the spaces assigned to the user.
     *
     * @returns {Promise<MenuEntry[]>} The menu entries, @see sap.ushell.services.menu#MenuEntry
     *
     * @since 1.72.0
     * @private
     */
    MenuAdapter.prototype.getMenuEntries = function () {

        // Create a 1st level menu entry for each user-assigned space
        // having 2nd level sub menu entries for its pages inside if needed
        var aMenuEntries = this._getAssignedSpaces()
            .filter(function (oSpace) {

                // No menu entry for a space, if no page assigned
                if (!oSpace.pages || oSpace.pages.length === 0) {
                    Log.warning("FLP space " + oSpace.id + " without page omitted in FLP menu.", "", "sap.ushell_abap.adapters.abap.MenuAdapter");
                    return false;
                }
                return true;
            })
            .map(function (oSpace) {
                var oTopMenuEntry = {
                    title: oSpace.title || oSpace.id,
                    description: oSpace.description,
                    icon: undefined,
                    type: "IBN",
                    target: {
                        semanticObject: "Launchpad",
                        action: "openFLPPage",
                        parameters: [
                            {
                                name: "spaceId",
                                value: oSpace.id
                            },
                            {
                                name: "pageId",
                                value: oSpace.pages[0].id
                            }
                        ],
                        innerAppRoute: undefined
                    },
                    menuEntries: []
                };

                var aSubMenuEntries = oSpace.pages.map(function (oPage) {
                    return {
                        title: oPage.title || oPage.id,
                        description: oPage.description,
                        icon: undefined,
                        type: "IBN",
                        target: {
                            semanticObject: "Launchpad",
                            action: "openFLPPage",
                            parameters: [
                                {
                                    name: "spaceId",
                                    value: oSpace.id
                                },
                                {
                                    name: "pageId",
                                    value: oPage.id
                                }
                            ],
                            innerAppRoute: undefined
                        },
                        menuEntries: []
                    };
                });

                if (aSubMenuEntries.length > 1) {
                    oTopMenuEntry.menuEntries = aSubMenuEntries;
                }

                return oTopMenuEntry;
            });

        return Promise.resolve(aMenuEntries);
    };

    /**
     * Gets the menu entries for the pages assigned to the user by querying the
     * content of the meta tag with the name' sap.ushell.assignedSpaces'.
     * Spaces without pages are not included in the result.
     *
     * @returns {object[]} The assigned spaces from the 'sap.ushell.assignedSpaces' meta tag
     *
     * @since 1.73.0
     * @private
     */
    MenuAdapter.prototype._getAssignedSpaces = function () {
        var oMetatag = document.querySelector("meta[name='sap.ushell.assignedSpaces']");
        if (!oMetatag) {
            return [];
        }
        return JSON.parse(oMetatag.getAttribute("content"));
    };

    return MenuAdapter;

}, true);