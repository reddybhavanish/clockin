// Copyright (c) 2009-2020 SAP SE, All Rights Reserved

/**
 * @fileOverview This module deals with the instantiation of visualizations in a platform independent way.
 * @version 1.78.0
 */
sap.ui.define([
    "sap/ushell/services/_VisualizationInstantiation/VizInstance",
    "sap/ushell/services/_VisualizationInstantiation/VizInstanceAbap",
    "sap/ushell/services/_VisualizationInstantiation/VizInstanceCdm",
    "sap/m/library",
    "sap/base/util/ObjectPath",
    "sap/ushell/EventHub",
    "sap/ushell/adapters/cdm/v3/_LaunchPage/readVisualizations"
], function (VizInstance, VizInstanceAbap, VizInstanceCdm, MobileLibrary, ObjectPath, EventHub, readVisualizations) {
    "use strict";

    var LoadState = MobileLibrary.LoadState;

    /**
     * This method MUST be called by the Unified Shell's container only, others MUST call
     * <code>sap.ushell.Container.getService("VisualizationInstantiation")</code>.
     * Constructs a new instance of the VisualizationInstantiation service.
     *
     * @namespace sap.ushell.services.VisualizationInstantiation
     *
     * @constructor
     * @class
     * @see {@link sap.ushell.services.Container#getService}
     * @since 1.77.0
     *
     * @private
     */
     function VisualizationInstantiation () {}

    /**
     * A factory function to create a VizInstance of type corresponding to source platform {ABAP|CDM}
     *
     * @param {object} vizData VisualizationData for one single visualization
     * @returns {object} A VizInstance of one of {VizInstanceAbap|VizInstanceCdm|null} based on source platform
     * @since 1.77
     */
    VisualizationInstantiation.prototype.instantiateVisualization = function (vizData) {
        var oVizInstance;
        var sPlatform = ObjectPath.get("_instantiationData.platform", vizData);

        var oVizInstanceData = {
            title: vizData.title,
            subtitle: vizData.subtitle,
            info: vizData.info,
            icon: vizData.icon,
            targetURL: vizData.targetURL,
            keywords: vizData.keywords,
            instantiationData: vizData._instantiationData,
            indicatorDataSource: vizData.indicatorDataSource
        };

        // This prevents the path to be used as a binding path... yes its ugly... deal with it!
        if (oVizInstanceData.indicatorDataSource) {
            oVizInstanceData.indicatorDataSource.ui5object = true;
        }

        switch (sPlatform) {
            case "ABAP":
                oVizInstance = new VizInstanceAbap(oVizInstanceData);
                break;
            case "CDM":
                oVizInstance = new VizInstanceCdm(oVizInstanceData);
                break;
            default:
                oVizInstance = new VizInstance({
                    state: LoadState.Failed
                });
        }

        if (readVisualizations.isStandardVizType(vizData.vizType)) {
            oVizInstance.load().then(function () {
                // this event is currenly only used to measure the TTI for which only standard VizTypes are relevant
                EventHub.emit("VizInstanceLoaded", vizData.id);
            });
        } else {
            // load custom visualizations only after the core-ext modules have been loaded
            // to prevent that the custom visualizations trigger single requests
            EventHub.once("CoreResourcesComplementLoaded").do(oVizInstance.load.bind(oVizInstance));
        }

        return oVizInstance;
    };

    VisualizationInstantiation.hasNoAdapter = true;

    return VisualizationInstantiation;
});