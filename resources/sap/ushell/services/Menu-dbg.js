// Copyright (c) 2009-2020 SAP SE, All Rights Reserved

/**
 * @fileOverview The menu service provides the entries for the menu bar
 * @version 1.78.0
 */
sap.ui.define([
    "sap/ushell/utils"
], function (
    UShellUtils
) {
    "use strict";

    /**
     * This method MUST be called by the Unified Shell's container only, others MUST call
     * <code>sap.ushell.Container.getService("Menu")</code>.
     * Constructs a new instance of the menu service.
     *
     * @namespace sap.ushell.services.Menu
     * @constructor
     * @see sap.ushell.services.Container#getService
     * @since 1.71.0
     * @private
     */
    function Menu () {
        this._init.apply(this, arguments);
    }

    /**
     * Private initializer.
     *
     * @param {object} adapter The menu adapter for the frontend server.
     *
     * @since 1.72.0
     * @private
     */
    Menu.prototype._init = function (adapter) {
        this.oAdapter = adapter;
    };

    /**
     * Returns whether the menu is enabled.
     *
     * @returns {Promise<boolean>} True if menu is enabled
     *
     * @since 1.71.0
     * @private
     */
    Menu.prototype.isMenuEnabled = function () {
        return this.oAdapter.isMenuEnabled();
    };

    /**
     * @typedef {object} MenuEntry A Menu Entry
     * @property {string} title The text of the menu entry
     * @property {string} description The description of a the menu entry
     * @property {string} type
     *    The type of a the menu entry. May be, for example "IBN" (trigger an intent based navigation when clicked)
     *    or "text" (May be used to display a sub menu).
     * @property {string} target Describes the navigation target if type is "IBN"
     * @property {MenuEntry[]} menuEntries Contains a list of sub menu entries
     */

    /**
     * Gets the menu entries for the current user.
     *
     * The menu offers access to the spaces and its pages the current user may access
     * via intent based navigation. Each menu entry has a unique ID.
     *
     * @returns {Promise<MenuEntry[]>} The menu entries
     *
     * @since 1.71.0
     * @private
     */
    Menu.prototype.getMenuEntries = function () {
        if (!this._oMenuEntriesPromise) {
            this._oMenuEntriesPromise = this.oAdapter.getMenuEntries().then(function (aMenuEntries) {
                return aMenuEntries
                    .map(function (oMenuEntry) {

                        // Attach unique ID to all 1st and 2nd level entries
                        oMenuEntry.uid = UShellUtils.generateUniqueId([]);
                        if (oMenuEntry.menuEntries) {
                            oMenuEntry.menuEntries.forEach(function (oSubMenuEntry) {
                                oSubMenuEntry.uid = UShellUtils.generateUniqueId([]);
                            });
                        }

                        return oMenuEntry;
                    });
            });
        }
        return this._oMenuEntriesPromise;
    };

    /**
     * @typedef {object} SpacePagesHierarchyEntry
     *    An entry in the space-spages-hierarchy which briefly describes a space and its pages
     * @property {string} title Text of the space
     * @property {string} id ID of the space
     * @property {array} pages
     *    Contains an array of pages which contribute to the space
     */

    /**
     * Gets the hierarchy of spaces and subordinate pages a user may access via the menu.
     *
     * This function is used, for example, in the app finder to populate a dialog for page selection
     * when a user is about to pin an app on a page in a space.
     *
     * For performance reasons the promise response of <code>Menu.prototype.getSpacesPagesHierarchy</code>
     * is cached, similiar to <code>Menu.prototype.getMenuEntries</code>. As a consequence dynamic
     * menus and a dynamic changing of the spaces/pages structure, e.g. in a design time scenario,
     * is not supported.
     *
     * @returns {Promise<SpacePagesHierarchyEntry[]>}
     *    The space pages hierarchy entries indicate which pages belong to a space.
     *    In case there is a 1:1 relation between a space and a page, the title for the page is
     *    the space title. This is consistent with the menu.
     *
     * @since 1.75.0
     * @private
     */
    Menu.prototype.getSpacesPagesHierarchy = function () {
        if (!this._oSpacesPagesHierarchyPromise) {

            // Calculate hierarchy from the menu
            this._oSpacesPagesHierarchyPromise = this.getMenuEntries()
                .then(function (aMenuEntries) {

                    return {
                        spaces:
                            // Calculate an array of spaces, which contain a list of their pages each
                            aMenuEntries.reduce(function (aSpaces, oMenuEntry) {

                                // Get pages that can be accessed by the current menu entry
                                var aPages;
                                if (oMenuEntry.menuEntries && oMenuEntry.menuEntries.length) {
                                    aPages = this._getAccessiblePages(oMenuEntry.menuEntries);
                                } else {
                                    aPages = this._getAccessiblePages([oMenuEntry]);
                                }

                                // Calculate space and add it to spaces array
                                // ... but only if it has at least one page
                                if (aPages.length) {
                                    aSpaces.push({
                                        title: oMenuEntry.title,
                                        id: aPages[0].spaceId,
                                        pages: aPages
                                            .map(function (oPage) {
                                                return {
                                                    title: oPage.title,
                                                    id: oPage.id
                                                };
                                            })
                                    });
                                }

                                return aSpaces;

                            }.bind(this), [])
                    };

                }.bind(this)).catch(function () {
                    return { spaces: [] };
                });
        }

        return this._oSpacesPagesHierarchyPromise;
    };

    /**
     * Extracts the accessible pages from an array of menu entries
     * ignoring sub menu entries
     *
     * @param  {MenuEntry[]} aMenuEntries
     *    An array of menu entries
     * @returns {object[]}
     *    An array indicating pages which are accessible via 1st level menu entries in <code>aMenuEntries</code>
     *
     * @since 1.77.0
     * @private
     */
    Menu.prototype._getAccessiblePages = function (aMenuEntries) {

        return aMenuEntries
            .filter(function (oMenuEntry) {
                return oMenuEntry
                    && oMenuEntry.type === "IBN"
                    && oMenuEntry.target
                    && oMenuEntry.target.semanticObject === "Launchpad"
                    && oMenuEntry.target.action === "openFLPPage";
            })
            .map(function (oMenuEntry) {
                var oSpaceParam = oMenuEntry.target.parameters.find(function (oParam) {
                    return oParam.name === "spaceId";
                });
                var oPageParam = oMenuEntry.target.parameters.find(function (oParam) {
                    return oParam.name === "pageId";
                });
                return {
                    title: oMenuEntry.title,
                    id: oPageParam && oPageParam.value,
                    spaceId: oSpaceParam && oSpaceParam.value
                };
            });
    };

    /**
     * Searches the spaces/pages hierarchy for the specified space and
     * checks if the space has multiple pages assigned to it.
     *
     * @param {string} spaceId ID of the space which should be checked
     * @returns {Promise<boolean>}
     *  A promise resolving with 'true' if the specified space has multiple pages
     *
     * @since 1.78.0
     * @private
     */
    Menu.prototype.hasMultiplePages = function (spaceId) {
        return this.getSpacesPagesHierarchy()
            .then(function (oHierarchy) {
                var oSpace = oHierarchy.spaces.find(function (space) {
                    return space.id === spaceId;
                });

                return oSpace && oSpace.pages.length > 1;
            });
    };

    // Return menu service from this module
    Menu.hasNoAdapter = false;
    return Menu;
});
