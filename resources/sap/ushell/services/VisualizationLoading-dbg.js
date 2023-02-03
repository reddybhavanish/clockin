// Copyright (c) 2009-2020 SAP SE, All Rights Reserved

/**
 * @fileOverview This module deals with the instantiation of visualizations in a platform independent way.
 * @version 1.78.0
 */
sap.ui.define([
    "sap/ui/thirdparty/URI",
    "sap/m/library",
    "sap/ushell/services/_VisualizationLoading/VizInstanceLocal",
    "sap/ushell/services/_VisualizationLoading/VizInstanceDefault",
    "sap/ushell/services/_VisualizationLoading/VizInstanceEmpty"
], function (
    URI,
    mobileLibrary,
    VizLocal,
    VizDefault,
    VizEmpty
) {
    "use strict";

    // shortcut for sap.m.LoadState
    var LoadState = mobileLibrary.LoadState;

    var VISUALIZATION_TYPES = {
        ABAP: "ABAP",
        local: "local",
        default: "default",
        card: "card",
        empty: "empty"
    };

    /**
     * This method MUST be called by the Unified Shell's container only, others MUST call
     * <code>sap.ushell.Container.getService("VisualizationLoading")</code>.
     * Constructs a new instance of the visualization loading service.
     *
     * @namespace sap.ushell.services.VisualizationLoading
     * @constructor
     * @see sap.ushell.services.Container#getService
     * @since 1.72.0
     *
     * @private
     */
    function VisualizationLoading () {
        this._init.apply(this, arguments);
    }

    /**
     * Private initializer.
     *
     * @param {object} launchPageAdapter The LaunchPageAdapter for the specific platform.
     * @since 1.72.0
     *
     * @private
     */
    VisualizationLoading.prototype._init = function () { };

    /**
     * Instantiation - WIP
     *
     * @param {object} vizData The instantiation information.
     * @param {string} vizData.vizId The visualization id.
     * @param {string} vizData.properties Additional initialization data - Only "local" - experimental
     *
     * @returns {Promise<void>} the visualization instance
     * @since 1.72.0
     * @private
     */
    VisualizationLoading.prototype.loadVisualizationData = function () {
        if (this.oCatalogTileRequest) {
            return this.oCatalogTileRequest;
        }

        this.oCatalogTileRequest = sap.ushell.Container.getService("VisualizationDataProvider")._getCatalogTiles()
            .then(function (oCatalogTiles) {
                this._oCatalogTiles = oCatalogTiles;
                return Promise.resolve();
            }.bind(this)).catch(function (error) {
                return Promise.reject(error);
            });

        return this.oCatalogTileRequest;
    };

    /**
     * Instantiation - WIP
     *
     * @param {object} vizData The instantiation information.
     * @param {string} vizData.vizId The visualization id.
     * @param {boolean} [vizData.localLoad] Whether to load the tile locally using a "VizInstanceLocal".
     *   If set to "true", then "tileType" and "properties" data will be used to instantiate the tile. Default is "false".
     * @param {string} [vizData.tileType] Only used when "localLoad" is set to "true", contains the tile type.
     * @param {object} [vizData.properties] Only used when "localLoad" is set to "true", contains the tile properties data.
     * @param {string} [vizData.isBookmark] Only used when "isBookmark=true" for loading a bookmark tile
     * @param {string} [vizData.title] Only used when "isBookmark=true", bookmark tile tile
     * @param {string} [vizData.subtitle] Only used when "isBookmark=true", bookmark tile subtitle
     * @param {string} [vizData.url] Only used when "isBookmark=true", bookmark tile url
     * @param {string} [vizData.icon] Only used when "isBookmark=true", bookmark tile icon
     * @param {string} [vizData.info] Only used when "isBookmark=true", bookmark tile info
     * @param {string} [vizData.numberUnit] Only used when "isBookmark=true", bookmark tile number unit
     * @param {string} [vizData.serviceUrl] Only used when "isBookmark=true", bookmark tile service url
     * @param {string} [vizData.serviceRefreshInterval] Only used when "isBookmark=true", bookmark tile service refresh interval
     * @param {string} [vizData.keywords] Only used when "isBookmark=true", bookmark tile keywords
     * @param {string} [vizData.id] Only used when "isBookmark=true", bookmark tile id
     * @returns {sap.ui.core.Control} the visualization instance
     * @since 1.72.0
     * @private
     */
    VisualizationLoading.prototype.instantiateVisualization = function (vizData) {
        var oVizInstance, oVizConfig, oCatalogTile;
        try {
            if (vizData.isBookmark) {
                oCatalogTile = this._getBookmarkChipInstance(vizData);
                oVizConfig = this._prepareDefaultConfig(vizData, oCatalogTile);
                oVizInstance = new VizDefault(oVizConfig.oInitData);
                oVizInstance.load({
                    isBookmark: true,
                    chip: oCatalogTile
                });
                return oVizInstance;
            }
        } catch (oError) {
            oVizInstance = new VizEmpty({
                visualizationId: vizData.vizId,
                vizType: VISUALIZATION_TYPES.empty,
                state: LoadState.Failed
            });
            oVizInstance.load();
            return oVizInstance;
        }
        if (!vizData.localLoad) {
            if (!vizData.vizId) {
                return {};
            }

            if (!this._oCatalogTiles) {
                // start the loading if not yet the case
                this.loadVisualizationData();
                // assume the request is still ongoing and return a loading vizInstance
                oVizInstance = new VizEmpty({
                    visualizationId: vizData.vizId,
                    vizType: VISUALIZATION_TYPES.empty,
                    state: LoadState.Loaded
                });
                oVizInstance.load();
                return oVizInstance;
            }
            oCatalogTile = this._oCatalogTiles[vizData.vizId];
            if (!oCatalogTile) {
                oVizInstance = new VizEmpty({
                    visualizationId: vizData.vizId,
                    vizType: VISUALIZATION_TYPES.empty,
                    state: LoadState.Error
                });
                oVizInstance.load();
                return oVizInstance;
            }
        }

        var sType = this._getPlatform(oCatalogTile, vizData);
        switch (sType) {
            case VISUALIZATION_TYPES.local:
                oVizConfig = this._prepareLocalConfig(vizData, oCatalogTile);
                oVizInstance = new VizLocal(oVizConfig.oInitData);
                break;
            default:
                oVizConfig = this._prepareDefaultConfig(vizData, oCatalogTile);
                oVizInstance = new VizDefault(oVizConfig.oInitData);
                break;
        }

        if (!vizData.deferLoading) {
            oVizInstance.load(oVizConfig.oAdditionalData);
        }

        return oVizInstance;
    };

    VisualizationLoading.prototype._getPlatform = function (oCatalogTile, oVizData) {
        var sType = VISUALIZATION_TYPES.default;

        if (oCatalogTile) {
            if (oCatalogTile.getChip !== undefined) {
                // TODO: is this ever relevantly used? AFAIK only "local" leads to something else than VizInstanceDefault
                sType = VISUALIZATION_TYPES.ABAP;
            } else if (oCatalogTile.namespace || oCatalogTile.tileType || oCatalogTile.properties || oVizData.properties) {
                sType = VISUALIZATION_TYPES.local;
            }
        } else if (oVizData.localLoad && oVizData.properties) {
            sType = VISUALIZATION_TYPES.local;
        }

        return sType;
    };

    VisualizationLoading.prototype._prepareDefaultConfig = function (vizData, catalogTile) {
        var oVizConfig = {
            oInitData: {
                catalogTile: catalogTile,
                visualizationId: vizData.vizId,
                vizType: VISUALIZATION_TYPES.default
            }
        };

        return oVizConfig;
    };

    VisualizationLoading.prototype._prepareLocalConfig = function (vizData, catalogTile) {
        var oVizConfig = {
            oInitData: {
                catalogTile: catalogTile,
                visualizationId: vizData.vizId,
                vizType: VISUALIZATION_TYPES.local
            }
        };
        if (vizData.properties) {
            oVizConfig.oAdditionalData = {};
            oVizConfig.oAdditionalData.properties = vizData.properties;
            oVizConfig.oAdditionalData.mode = vizData.mode;
            oVizConfig.oAdditionalData.namespace = vizData.namespace;
            oVizConfig.oAdditionalData.path = vizData.path;
            oVizConfig.oAdditionalData.moduleType = vizData.moduleType;
            oVizConfig.oAdditionalData.moduleName = vizData.moduleName;
            oVizConfig.oAdditionalData.tileType = vizData.tileType || "sap.ushell.ui.tile.StaticTile";
            oVizConfig.oAdditionalData.keywords = vizData.keywords || [];
        }
        return oVizConfig;
    };

    VisualizationLoading.prototype._getBookmarkChipInstance = function (vizData) {
        var sDYNAMIC_BASE_CHIP_ID = "X-SAP-UI2-CHIP:/UI2/DYNAMIC_APPLAUNCHER",
            sSTATIC_BASE_CHIP_ID = "X-SAP-UI2-CHIP:/UI2/STATIC_APPLAUNCHER",
            sDYNAMIC_CHIP_URL = "/sap/bc/ui5_ui5/ui2/ushell/chips/applauncher_dynamic.chip.xml",
            sSTATIC_CHIP_URL = "/sap/bc/ui5_ui5/ui2/ushell/chips/applauncher.chip.xml",
            sChipId = sSTATIC_BASE_CHIP_ID,
            sChipUrl = sSTATIC_CHIP_URL,
            oConfiguration = {
                display_icon_url: vizData.icon || "",
                display_info_text: vizData.info || "",
                display_subtitle_text: vizData.subtitle || "",
                display_title_text: vizData.title,
                navigation_target_url: vizData.url,
                navigation_use_semantic_object: false
            },
            oFactory = sap.ushell.Container.getService("PageBuilding").getFactory(),
            oChipInstance,
            oUrlParsing,
            oLocationUri = new URI(),
            oBookmarkUri,
            oHash,
            oTargetMappingSupport = sap.ushell.Container.getService("VisualizationDataProvider")._getAdapter().getTargetMappingSupport();

            // note: mandatory parameters have been checked by the service
            oBookmarkUri = new URI(vizData.url); // http://medialize.github.io/URI.js/about-uris.html
            // check and process vizData.url
            if (vizData.url && (vizData.url[0] === "#" || oBookmarkUri.host() + oBookmarkUri.path() === oLocationUri.host() + oLocationUri.path())) {
                // try to figure out if SO navigation is used to enable form factor filtering but only if bookmark URL points
                // to the same domain. Foreign domains are not expected to use intent based navigation.
                oUrlParsing = sap.ushell.Container.getService("URLParsing");
                oHash = oUrlParsing.parseShellHash(oUrlParsing.getShellHash(vizData.url));
                if (oHash && // note: oTargetMappingSupport#get may return false
                    oTargetMappingSupport.get(oHash.semanticObject + "-" + oHash.action) !== undefined) {
                    // User has a target mapping matching the URL, so add this information to the bookmark for form factor based filtering
                    oConfiguration.navigation_use_semantic_object = true;
                    oConfiguration.navigation_semantic_object = oHash.semanticObject;
                    oConfiguration.navigation_semantic_action = oHash.action;
                    oConfiguration.navigation_semantic_parameters = oUrlParsing.paramsToString(oHash.params);
                }
        }

        if (vizData.serviceUrl) {
            sChipUrl = sDYNAMIC_CHIP_URL;
            sChipId = sDYNAMIC_BASE_CHIP_ID;
            oConfiguration.display_number_unit = vizData.numberUnit;
            oConfiguration.service_refresh_interval = vizData.serviceRefreshInterval || 0;
            oConfiguration.service_url = vizData.serviceUrl;
        }

        oChipInstance = oFactory.createChipInstance({
            chipId: sChipId,
            Chip: {
                id: sChipId,
                baseChipId: sChipId,
                catalogId: "/UI2/CATALOG_ALL",
                url: sChipUrl
            },
            pageId: "",
            title: vizData.title,
            configuration: JSON.stringify({
                tileConfiguration: JSON.stringify(oConfiguration)
            }),
            layoutData: ""
        });

        // Bags are created as the tiles read them and attach event handlers, but are not saved to
        // the server. E.g. when the visual tile properties (like title) are updated. This can happen via updateBookmark
        // calls or via Edit Tile Data dialog.
        oChipInstance.getBag("tileProperties").setText("display_title_text", oConfiguration.display_title_text || "");
        oChipInstance.getBag("tileProperties").setText("display_subtitle_text", oConfiguration.display_subtitle_text || "");
        oChipInstance.getBag("tileProperties").setText("display_info_text", oConfiguration.display_info_text || "");

        return oChipInstance;
    };

    VisualizationLoading.hasNoAdapter = true;

    return VisualizationLoading;
});
