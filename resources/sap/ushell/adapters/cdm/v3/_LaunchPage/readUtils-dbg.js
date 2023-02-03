// Copyright (c) 2009-2020 SAP SE, All Rights Reserved
/**
 * @fileOverview Helper for accessing the read utils for the 'CDM' platform.
 *
 * @version 1.78.0
 * @private
 */
sap.ui.define([
    "sap/ushell/adapters/cdm/v3/_LaunchPage/readVisualizations",
    "sap/ushell/adapters/cdm/v3/_LaunchPage/readApplications",
    "sap/ushell/adapters/cdm/v3/_LaunchPage/readHome",
    "sap/ushell/adapters/cdm/v3/utilsCdm",
    "sap/ushell/Config",
    "sap/base/util/deepClone"
], function (
    readVisualizations,
    readApplications,
    readHome,
    utilsCdm,
    Config,
    deepClone
) {
    "use strict";

    var readUtils = {};

    /**
     * @typedef vizData
     * @type {object}
     * @property {string} id
     * @property {string} vizId
     * @property {string} vizTypeId
     * @property {string} title
     * @property {string} subtitle
     * @property {string} icon
     * @property {string} info
     * @property {string[]} keywords
     *    Search key words
     * @property {object} target
     *    Same format as in CDM RT schema in visualization/vizConfig/sap.flp/target.
     * @property {object} _instantiationData
     *    Platform-specific data for instantiation
     */

    /**
     * Returns the vizData for a vizReference
     * which is evaluated on the basis of the CDM parts
     *
     * @param {object} oSite The cdm site object
     * @param {object} oVizReference A reference to a visualization
     * @param {object} oURLParsingService The URLParsing service
     * @returns {vizData} The vizData with default values
     *
     * @since 1.78.0
     * @private
     */
    // eslint-disable-next-line complexity
    readUtils.getVizData = function (oSite, oVizReference, oURLParsingService) {
        var bVizInstantiationEnabled = Config.last("/core/spaces/vizInstantiation/enabled");

        if (oVizReference.isBookmark && oVizReference.url) {
            // convert old bookmarks to new
            oVizReference = deepClone(oVizReference);
            oVizReference.subTitle = oVizReference.subtitle;
            oVizReference.target = utilsCdm.toTargetFromHash(oVizReference.url, oURLParsingService);
        }

        var aCdmParts = this.getCdmParts(oSite, oVizReference);
        var oViz = readVisualizations.get(oSite, readHome.getTileVizId(oVizReference)) || {};
        var oVizData = {
            id: readHome.getTileId(oVizReference),
            vizId: readHome.getTileVizId(oVizReference) || "",
            vizType: readVisualizations.getTypeId(oViz) || "",
            title: readVisualizations.getTitle(aCdmParts) || "",
            subtitle: readVisualizations.getSubTitle(aCdmParts) || "",
            icon: readVisualizations.getIcon(aCdmParts) || "",
            keywords: readVisualizations.getKeywords(aCdmParts) || [],
            info: readVisualizations.getInfo(aCdmParts) || "",
            target: oVizReference.target || readVisualizations.getTarget(oViz) || {},
            indicatorDataSource: readVisualizations.getIndicatorDataSource(oViz),
            isBookmark: oVizReference.isBookmark || false,
            _instantiationData: readVisualizations.getInstantiationData(oViz)
        };
        oVizData.targetURL = utilsCdm.toHashFromVizData(oVizData, oSite.applications, oURLParsingService);

        if (oVizReference.isBookmark && !oVizData.vizType) {
            if (oVizData.indicatorDataSource) {
                oVizData.vizType = "sap.ushell.DynamicAppLauncher";
            } else {
                oVizData.vizType = "sap.ushell.StaticAppLauncher";
            }
        }

        if (!oVizData._instantiationData || !Object.keys(oVizData._instantiationData)) {
            oVizData._instantiationData = {
                platform: "CDM",
                vizType: readVisualizations.getType(oSite, oVizData.vizType)
            };
        }

        if (!bVizInstantiationEnabled && oVizData.isBookmark) {
            // convert new bookmarks to old
            oVizData.url = oVizData.targetURL;
        }

        return oVizData;
    };

    /**
     * Returns the vizReference for a vizData
     * which is evaluated on the basis of the CDM parts
     *
     * @param {vizData} oVizData The vizData
     * @returns {object} The vizReference
     *
     * @since 1.78.0
     * @private
     */
    readUtils.getVizRef = function (oVizData) {
        return {
            id: oVizData.id,
            vizId: oVizData.vizId,
            title: oVizData.title,
            subTitle: oVizData.subtitle,
            icon: oVizData.icon,
            keywords: oVizData.keywords,
            info: oVizData.info,
            target: oVizData.target,
            indicatorDataSource: oVizData.indicatorDataSource,
            isBookmark: oVizData.isBookmark
        };
    };

    /**
     * Returns an array based on a group tile
     * which contains the cdm parts containing the information about the tile
     *
     * @param {object} oSite A CDM Site
     * @param {object} oTile A tile
     * @returns {object[]} A fixed list containing the tile, the vizConfig, the inbound, and the app.
     *
     * @since 1.78.0
     * @private
     */
    readUtils.getCdmParts = function (oSite, oTile) {
        var oViz = readVisualizations.get(oSite, readHome.getTileVizId(oTile)) || {};
        var oVizConfig = readVisualizations.getConfig(oViz);
        var oApp = readVisualizations.getAppDescriptor(oSite, readVisualizations.getAppId(oViz));
        var oInbound = readApplications.getInbound(oApp, readVisualizations.getInboundId(oViz));
        return [oTile, oVizConfig, oInbound, oApp];
    };

    return readUtils;

}, /* bExport = */ true);
