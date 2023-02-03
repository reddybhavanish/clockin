// Copyright (c) 2009-2020 SAP SE, All Rights Reserved

/**
 * Initialization Code and shared classes of library sap.ushell.
 */
sap.ui.define([
    // library.js of the dependent library (sap/ui/core and sap/m)
    // need to be loaded from the module dependecy
    "sap/ui/core/library",
    "sap/m/library",
    "sap/ui/core/Core",
    "sap/ushell/ApplicationType"
], function (coreLib, mLib, Core, ApplicationType) {
    "use strict";

    /**
     * SAP library: sap.ushell
     *
     * @namespace
     * @name sap.ushell
     * @public
     */

    // library dependencies
    // delegate further initialization of this library to the Core
    Core.initLibrary({
        name: "sap.ushell",
        dependencies: ["sap.ui.core", "sap.m"],
        types: [
            "sap.ushell.AllMyAppsState",
            "sap.ushell.AppTitleState",
            "sap.ushell.components.container.ApplicationType",
            "sap.ushell.ui.launchpad.ViewPortState",
            "sap.ushell.ui.tile.State",
            "sap.ushell.ui.tile.StateArrow"
        ],
        interfaces: [],
        controls: [
            "sap.ushell.components.factsheet.controls.PictureTile",
            "sap.ushell.components.factsheet.controls.PictureViewer",
            "sap.ushell.components.factsheet.controls.PictureViewerItem",
            "sap.ushell.ui.appfinder.AppBox",
            "sap.ushell.ui.footerbar.AboutButton",
            "sap.ushell.ui.footerbar.AddBookmarkButton",
            "sap.ushell.ui.footerbar.ContactSupportButton",
            "sap.ushell.ui.footerbar.EndUserFeedback",
            "sap.ushell.ui.footerbar.JamDiscussButton",
            "sap.ushell.ui.footerbar.JamShareButton",
            "sap.ushell.ui.footerbar.LogoutButton",
            "sap.ushell.ui.footerbar.SettingsButton",
            "sap.ushell.ui.footerbar.UserPreferencesButton",
            "sap.ushell.ui.launchpad.ActionItem",
            "sap.ushell.ui.launchpad.AnchorItem",
            "sap.ushell.ui.launchpad.AnchorNavigationBar",
            "sap.ushell.ui.launchpad.DashboardGroupsContainer",
            "sap.ushell.ui.launchpad.EmbeddedSupportErrorMessage",
            "sap.ushell.ui.launchpad.GroupHeaderActions",
            "sap.ushell.ui.launchpad.GroupListItem",
            "sap.ushell.ui.launchpad.LinkTileWrapper",
            "sap.ushell.ui.launchpad.LoadingDialog",
            "sap.ushell.ui.launchpad.Panel",
            "sap.ushell.ui.launchpad.PlusTile",
            "sap.ushell.ui.launchpad.Tile",
            "sap.ushell.ui.launchpad.TileContainer",
            "sap.ushell.ui.launchpad.TileState",
            "sap.ushell.ui.tile.DynamicTile",
            "sap.ushell.ui.tile.ImageTile",
            "sap.ushell.ui.tile.StaticTile",
            "sap.ushell.ui.tile.TileBase"
        ],
        elements: [],
        version: "1.78.0",
        extensions: {
            "sap.ui.support": {
                diagnosticPlugins: [
                    "sap/ushell/support/plugins/flpConfig/FlpConfigurationPlugin"
                ]
            }
        }
    });

    /**
     * Denotes states for control parts and translates into standard SAP color codes
     *
     * @enum {string}
     * @public
     * @ui5-metamodel This enumeration also will be described in the UI5 (legacy) designtime metamodel
     */
    sap.ushell.ui.launchpad.ViewPortState = {
        /**
         * indicates state when only left content is in the viewport
         * @public
         */
        Left: "Left",

        /**
         * Indicates a state that is neutral, e.g. for standard display (Grey color)
         * @public
         */
        Center: "Center",

        /**
         * Alias for "Error"
         * @public
         */
        Right: "Right",

        /**
         * Indicates a state that is negative, e.g. marking an element that has to get attention urgently or indicates negative values (Red color)
         * @public
         */
        LeftCenter: "LeftCenter",

        /**
         * Alias for "Success"
         * @public
         */
        CenterLeft: "CenterLeft",

        /**
         * Indicates a state that is positive, e.g. marking a task successfully executed or a state where all is good (Green color)
         * @public
         */
        RightCenter: "RightCenter",

        /**
         * Alias for "Warning"
         * @public
         */
        CenterRight: "CenterRight"
    };

    /**
     * @name sap.ushell.ui.tile.State
     * @private
     */
    /**
     * Denotes states for control parts and translates into standard SAP color codes
     *
     * @enum {string}
     * @public
     * @ui5-metamodel This enumeration also will be described in the UI5 (legacy) designtime metamodel
     */
    sap.ushell.ui.tile.State = {
        /**
         * Alias for "None"
         * @public
         */
        Neutral: "Neutral",

        /**
         * Indicates a state that is neutral, e.g. for standard display (Grey color)
         * @public
         */
        None: "None",

        /**
         * Alias for "Error"
         * @public
         */
        Negative: "Negative",

        /**
         * Indicates a state that is negative, e.g. marking an element that has to get attention urgently or indicates negative values (Red color)
         * @public
         */
        Error: "Error",

        /**
         * Alias for "Success"
         * @public
         */
        Positive: "Positive",

        /**
         * Indicates a state that is positive, e.g. marking a task successfully executed or a state where all is good (Green color)
         * @public
         */
        Success: "Success",

        /**
         * Alias for "Warning"
         * @public
         */
        Critical: "Critical",

        /**
         * Indicates a state that is critical, e.g. marking an element that needs attention (Orange color)
         * @public
         */
        Warning: "Warning"
    };

    /**
     * Enumeration of possible VisualizationLoad statuses.
     *
     * @enum {string}
     * @private
     * @since 1.76.0
     * @ui5-metamodel This enumeration also will be described in the UI5 (legacy) designtime metamodel
     */
    sap.ushell.VisualizationLoadState = {
        /**
         * The control is loading.
         * @private
         */
        Loading: "Loading",

        /**
         * The control has loaded.
         * @private
         */
        Loaded: "Loaded",

        /**
         * The control failed to load, because it has insufficent roles.
         * @private
         */
        InsufficentRoles: "InsufficentRoles",

        /**
         * The control is out of the selected role context.
         * @private
         */
        OutOfRoleContext: "OutOfRoleContext",

        /**
         * The control has no resolved navigation target.
         * @private
         */
        NoNavTarget: "NoNavTarget",

        /**
         * The control failed to load.
         * @private
         */
        Failed: "Failed",

        /**
         * The control is disabled.
         * @private
         */
        Disabled: "Disabled"
    };

    /**
     * @name sap.ushell.ui.tile.StateArrow
     * @private
     */
    /**
     * The state of an arrow as trend direction indicator, pointing either up or down
     * @private
     *
     * @enum {string}
     * @public
     * @ui5-metamodel This enumeration also will be described in the UI5 (legacy) designtime metamodel
     */
    sap.ushell.ui.tile.StateArrow = {
        /**
         * The trend direction indicator is invisible
         * @public
         */
        None: "None",

        /**
         * The trend direction indicator points up
         * @public
         */
        Up: "Up",

        /**
         * The trend direction indicator points down
         * @public
         */
        Down: "Down"
    };

    /**
     * The state of the shell's App Title.
     * @private
     *
     * @enum {string}
     * @private
     * @ui5-metamodel This enumeration also will be described in the UI5 (legacy) designtime metamodel
     */
    sap.ushell.AppTitleState = {
        /**
         * Only the Shell Navigation menu is available.
         * @private
         */
        ShellNavMenuOnly: "ShellNavMenuOnly",

        /**
         * Only the All My Apps menu is available.
         * @private
         */
        AllMyAppsOnly: "AllMyAppsOnly",

        /**
         * The Shell Navigation menu is currently active.
         * This state is only relevant if both ShellNavMenu and AllMyApps are active
         * and the user can navigate between them.
         * @private
         */
        ShellNavMenu: "ShellNavMenu",

        /**
         * The All My Apps menu is currently active.
         * This state is only relevant if both ShellNavMenu and AllMyApps are active
         * and the user can navigate between them.
         * @private
         */
        AllMyApps: "AllMyApps"
    };

    /**
     * The state of the Shell App Title.
     * @private
     *
     * @enum {string}
     * @private
     * @ui5-metamodel This enumeration also will be described in the UI5 (legacy) designtime metamodel
     */
    sap.ushell.AllMyAppsState = {
        /**
         * Show first level.
         * @private
         */
        FirstLevel: "FirstLevel",

        /**
         * Show second level.
         * @private
         */
        SecondLevel: "SecondLevel",

        /**
         * Show details.
         * @private
         */
        Details: "Details",

        /**
         * Show first level.
         * @private
         */
        FirstLevelSpread: "FirstLevelSpread"
    };

    // shared.js is automatically appended to library.js

    // hiding (generated) types that are marked as @public by default

    /**
     * The application types supported by the embedding container.
     *
     * @since 1.15.0
     * @enum {String}
     * @private
     */
    sap.ushell.components.container.ApplicationType = ApplicationType.enum;

    return sap.ushell;
}, /* bExport= */ true);
