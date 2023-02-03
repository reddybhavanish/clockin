// Copyright (c) 2009-2020 SAP SE, All Rights Reserved

sap.ui.define([
    "sap/ushell/services/_VisualizationInstantiation/VizInstance",
    "sap/m/library",
    "sap/ui/core/Component",
    "sap/base/util/ObjectPath",
    "sap/ui/core/ComponentContainer"
], function (VizInstance, mobileLibrary, Component, ObjectPath, ComponentContainer) {
    "use strict";

    var LoadState = mobileLibrary.LoadState;

    /**
     * @constructor for a VizInstance for CDM data
     *
     * @extends sap.ushell.ui.launchpad.VizInstance
     * @param {object} vizData The visualization entity
     *
     * @name sap.ushell.ui.launchpad.VizInstanceCDM
     *
     * @since 1.78
     */
    var VizInstanceCdm = VizInstance.extend("sap.ushell.ui.launchpad.VizInstanceCdm", {
        metadata: {
            library: "sap.ushell"
        },
        constructor: function (vizData) {
            this._oVizData = vizData;
            VizInstance.prototype.constructor.call(this, vizData);
        },
        fragment: "sap.ushell.services._VisualizationInstantiation.VizInstanceCdm"
    });

    /**
     * Creates the CDM visualization component and sets it as the content
     * of the VizInstance
     *
     * @returns {Promise<void>} Resolves when the component is loaded
     * @override
     * @since 1.78
     */
    VizInstanceCdm.prototype.load = function () {
        var oComponentData = this._getComponentConfiguration(this._oVizData);
        this._setSize(this._oVizData);

        return Component.create(oComponentData)
            .then(function (oComponent) {
                this._oComponent = oComponent;
                var oComponentContainer = new ComponentContainer({
                    component: oComponent,
                    height: "100%"
                });
                this._setContent(oComponentContainer);
            }.bind(this))
            .catch(function (oError) {
                this.setState(LoadState.Failed);
                return Promise.reject(oError);
            }.bind(this));
    };

    /**
     * Creates the configuration object for the component creation
     * from the visualization data
     *
     * @param {object} oVizData The visualization data
     * @returns {object} The component configuration
     * @since 1.78
     */
    VizInstanceCdm.prototype._getComponentConfiguration = function (oVizData) {
        var oVizType = ObjectPath.get(["instantiationData", "vizType"], oVizData);

        var oComponentConfiguration = {
            name: ObjectPath.get(["sap.ui5", "componentName"], oVizType),
            componentData: {
                properties: this._getComponentProperties(oVizData)
            },
            // this property can contain a URL from where the visualization type component
            // should be loaded
            url: ObjectPath.get(["sap.platform.runtime", "componentProperties", "url"], oVizType),
            // this property can contain a URL to a manifest that should be used instead of the
            // component's default manifest
            manifest: ObjectPath.get(["sap.platform.runtime", "componentProperties", "manifest"], oVizType)
        };

        if (ObjectPath.get(["sap.platform.runtime", "includeManifest"], oVizType)) {
            // the viz type already contains the component's complete manifest
            // so there is no need for the component factory to load it
            oComponentConfiguration.manifest = oVizType;
        }

        return oComponentConfiguration;
    };

    /**
     * Extracts those properties from the visualization data that are passed to the
     * visualization component as component data.
     *
     * @param {object} oVizData The visualization data
     * @returns {object} The properties for the component data
     * @since 1.78
     */
    VizInstanceCdm.prototype._getComponentProperties = function (oVizData) {
        return {
            title: oVizData.title,
            subtitle: oVizData.subtitle,
            icon: oVizData.icon,
            info: oVizData.info,
            indicatorDataSource: oVizData.indicatorDataSource,
            targetURL: oVizData.targetURL
        };
    };

    /**
     * Sets the size of the VizInstance based on the instantiation data
     *
     * @param {object} oVizData The visualization data
     * @since 1.78
     */
    VizInstanceCdm.prototype._setSize = function (oVizData) {
        // There is no vizInstance property for the tile size as the tiles don't react on it
        // It is only used to set the layout data for the grid correctly
        var sSize = ObjectPath.get(["instantiationData", "vizType", "sap.flp", "tileSize"], oVizData);

        if (sSize) {
            var aSize = sSize.split("x");
            var iHeight = parseInt(aSize[0], 10);
            var iWidth = parseInt(aSize[1], 10);

            // If not both dimensions are valid the VizInstance stays with its default size
            if (iWidth && iHeight) {
                // Convert from FLP tile size to grid size
                iWidth = iWidth * 2;
                iHeight = iHeight * 2;

                this.setWidth(iWidth);
                this.setHeight(iHeight);
            }
        }
    };

    /**
     * Updates the tile active state. Inactive dynamic tiles do not send requests
     *
     * @param {boolean} active The visualization's updated active state
     * @param {boolean} refresh The visualization's updated refresh state
     * @since 1.78.0
     */
    VizInstanceCdm.prototype.setActive = function (active, refresh) {
        if (this._oComponent && typeof this._oComponent.tileSetVisible === "function") {
            this._oComponent.tileSetVisible(active);
        }

        if (refresh) {
            this.refresh();
        }
        return this.setProperty("active", active, false);
    };

    /**
     * Updates the tile refresh state to determine if a tile needs to be updated
     *
     * @since 1.78.0
     */
    VizInstanceCdm.prototype.refresh = function () {
        if (this._oComponent && typeof this._oComponent.tileRefresh === "function") {
            this._oComponent.tileRefresh();
        }
    };

    return VizInstanceCdm;
});