// Copyright (c) 2009-2020 SAP SE, All Rights Reserved

sap.ui.define([
    "sap/ushell/services/_VisualizationInstantiation/VizInstance",
    "sap/m/library"
], function (VizInstance, mobileLibrary) {
    "use strict";

    var LoadState = mobileLibrary.LoadState;

    /**
     * @constructor for a VizInstance for ABAP data
     *
     * @extends sap.ushell.ui.launchpad.VizInstance
     * @param {object} vizData The visualization entity
     *
     * @name sap.ushell.ui.launchpad.VizInstanceAbap
     *
     * @since 1.77
     */
    var VizInstanceAbap = VizInstance.extend("sap.ushell.ui.launchpad.VizInstanceAbap", {
        metadata: {
            library: "sap.ushell"
        },
        constructor: function (vizData) {
            this._oVizData = vizData;
            VizInstance.prototype.constructor.call(this, vizData);
        },
        fragment: "sap.ushell.services._VisualizationInstantiation.VizInstanceAbap"
    });

    VizInstanceAbap.prototype.init = function () {
        this._oChipInstancePromise = sap.ushell.Container.getServiceAsync("PageBuilding")
            .then(function (oPageBuildingService) {
                var oFactory = oPageBuildingService.getFactory();
                return oFactory.createChipInstance({
                    chipId: this._oVizData.instantiationData.chip.id,
                    chip: this._oVizData.instantiationData.chip
                });
            }.bind(this));
    };

    /**
     * A function which sets the content of the VizInstance to a UI5 view
     *
     * @param {boolean} isPreview Load the tile in preview mode, i.e. dynamic tiles do not send requests
     * @returns {Promise<void>} Resolves when the chip instance is loaded
     * @since 1.77
     */
    VizInstanceAbap.prototype.load = function (isPreview) {
        return this._oChipInstancePromise
            .then(function (oResolvedChipInstance) {
                this._oChipInstance = oResolvedChipInstance;

                return new Promise(this._oChipInstance.load);
            }.bind(this))
            .then(function () {
                if (isPreview) {
                    var oPreviewContract = this._oChipInstance.getContract("preview");

                    if (!oPreviewContract) {
                        return Promise.reject(new Error("The chip instance has no preview contract"));
                    }

                    oPreviewContract.setEnabled(true);
                }
                var oView = this._oChipInstance.getImplementationAsSapui5();

                var iWidth = parseInt(this._oChipInstance.getConfigurationParameter("col"), 10) || 1;
                var iHeight = parseInt(this._oChipInstance.getConfigurationParameter("row"), 10) || 1;

                // The generic tiles have fixed sizes of e.g. 1x1 or 1x2 which refer to
                // 2:2 and 4:2 grid cells. As the width and the height of a vizInstance always
                // refers to grid cells the sizes are converted to the grid size.
                iWidth = iWidth * 2;
                iHeight = iHeight * 2;

                this.setWidth(iWidth);
                this.setHeight(iHeight);

                this._setContent(oView);
                return Promise.resolve();
            }.bind(this))
            .catch(function (oError) {
                this.setState(LoadState.Failed);
                return Promise.reject(oError);
            }.bind(this));
    };

    /**
     * Updates the chip instance's visibility if the contract is active.
     *
     * @param {boolean} visible The visibility state to be set
     * @since 1.78
     */
    VizInstanceAbap.prototype._setVisible = function (visible) {
        var oVisibleContract = this._oChipInstance && !this._oChipInstance.isStub() && this._oChipInstance.getContract("visible");

        if (oVisibleContract) {
            oVisibleContract.setVisible(visible);
        }
    };

    /**
     * Refreshes the chip instance's data
     *
     * @since 1.78
     */
    VizInstanceAbap.prototype.refresh = function () {
        // The CHIP instance is only available after the VizInstance was loaded
        if (this._oChipInstance) {
            // The refresh handler is provided directly on the CHIP instance and not as contract
            this._oChipInstance.refresh();
        }
    };

    /**
     * Updates the visualization's active state.
     * E.g. inactive dynamic tiles do not send requests
     *
     * @param {boolean} active The visualization's active state
     * @param {boolean} refresh Refresh the visualization immediately
     * @returns {object} The VizInstance
     * @since 1.78
     */
    VizInstanceAbap.prototype.setActive = function (active, refresh) {
        this._setVisible(active);

        if (refresh) {
            this.refresh();
        }

        return this.setProperty("active", active, false);
    };

    return VizInstanceAbap;
});