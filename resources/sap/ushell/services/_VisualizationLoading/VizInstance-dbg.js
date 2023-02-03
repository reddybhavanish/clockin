// Copyright (c) 2009-2020 SAP SE, All Rights Reserved

// Provides control
sap.ui.define([
    "sap/m/library",
    "sap/ui/core/Control",
    "sap/ui/core/Icon",
    "sap/ui/events/PseudoEvents",
    "sap/ushell/library",
    "sap/ushell/services/_VisualizationLoading/VizInstanceRenderer"
], function (
    mobileLibrary,
    Control,
    Icon,
    PseudoEvents,
    ushellLibrary
) {
    "use strict";

    // shortcut for sap.m.LoadState
    var LoadState = mobileLibrary.LoadState;

    // shortcut for sap.ushell.VisualizationLoadState
    var VisualizationLoadState = ushellLibrary.VisualizationLoadState;

    /**
     * Constructor for a new
     *
     * @param {string} [sId] The ID for the new control, generated automatically if no ID is given
     * @param {object} [mSettings] The initial settings for the new control
     * @class A container that arranges Tile controls.
     * @extends sap.ui.core.Control
     *
     * @private
     * @constructor
     * @name sap.ushell.ui.launchpad.VizInstance
     */
    var VizInstance = Control.extend("sap.ushell.ui.launchpad.VizInstance", /** @lends  sap.ushell.ui.launchpad.VizInstance.prototype*/ {
        metadata: {
            library: "sap.ushell",
            properties: {
                visualizationId: { type: "string" },

                editable: {
                    type: "boolean",
                    defaultValue: false,
                    bindable: true
                },

                type: { type: "string" },

                vizType: { type: "string" },

                state: {
                    type: "sap.ushell.VisualizationLoadState",
                    defaultValue: VisualizationLoadState.Loading
                },

                previewMode: {
                    type: "boolean",
                    defaultValue: false
                },

                catalogTile: { type: "any" },

                title: { type: "string" },

                subtitle: { type: "string" },

                icon: { type: "string" },

                footer: { type: "string" },

                targetURL: { type: "string" },

                adapter: { type: "any" },

                keywords: {
                    type: "string[]",
                    defaultValue: []
                },

                width: {
                    type: "int",
                    defaultValue: 1
                },

                height: {
                    type: "int",
                    defaultValue: 1
                }
            },
            aggregations: {
                innerControl: {
                    type: "sap.ui.core.Control",
                    multiple: false,
                    hidden: true
                },
                removeIcon: {
                    type: "sap.ui.core.Icon",
                    multiple: false,
                    hidden: true
                }
            },
            events: {
                press: {
                    parameters: {
                        scope: { type: "sap.m.GenericTileScope" },
                        action: { type: "string" }
                    }
                }
            }
        },
        renderer: "sap.ushell.services._VisualizationLoading.VizInstanceRenderer"
    });

    /**
     * VizInstance initializer.
     *
     * @since 1.75
     * @private
     */
    VizInstance.prototype.init = function () {
        var oRemoveIcon = new Icon({
            src: "sap-icon://decline",
            press: [ this._onRemoveIconPressed, this ],
            noTabStop: true
        });

        oRemoveIcon.addStyleClass("sapMPointer");
        oRemoveIcon.addStyleClass("sapUshellTileDeleteIconInnerClass");
        this.setAggregation("removeIcon", oRemoveIcon);
    };

    /**
     * Handles the Remove icon's press event.
     *
     * @since 1.75
     * @private
     */
    VizInstance.prototype._onRemoveIconPressed = function () {
        this.firePress({
            scope: "Actions",
            action: "Remove"
        });
    };

    /**
     * Sets the visualizationLoadState of the visualization.
     *
     * @param {string} state The visualizationLoadState that should be set.
     *
     * @since 1.77
     * @public
     */
    VizInstance.prototype.setState = function (state) {
        this.setProperty("state", state);
        var oInnerControl = this.getInnerControl(),
            sInnerControlLoadState;

        switch (state) {
            case VisualizationLoadState.InsufficentRoles:
            case VisualizationLoadState.OutOfRoleContext:
                sInnerControlLoadState = LoadState.Failed;
                break;
            case VisualizationLoadState.NoNavTarget:
                sInnerControlLoadState = LoadState.Loaded;
                break;
            default:
                sInnerControlLoadState = state;
        }

        if (oInnerControl && oInnerControl.setState) {
            oInnerControl.setState(sInnerControlLoadState);
        } else {
            this._getInnerControlPromise().then(function (innerControl) {
                if (innerControl.setState) {
                    innerControl.setState(sInnerControlLoadState);
                }
            });
        }
    };

    /**
     * SAPUI5 Lifecycle hook which is called after the control
     * is rendered. Prevents the navigation on visualization click.
     *
     * @since 1.75
     * @private
     */
    VizInstance.prototype.onAfterRendering = function () {
        this.getDomRef("innerControl").onclick = function (oEvent) {
            return this._preventDefault(oEvent);
        }.bind(this);
    };

    /**
     * Prevents the cross app navigation which normally is executed by
     * clicking the space bar.
     *
     * @param {sap.ui.base.Event} oEvent SAPUI5 event object
     *
     * @returns {boolean} Boolean which indicates if the navigation should occur.
     *
     * @since 1.75
     * @private
     */
    VizInstance.prototype.onsapspace = function (oEvent) {
        return this._preventDefault(oEvent);
    };

    /**
     * Prevents the cross app navigation which normally is executed by
     * clicking enter.
     *
     * @param {sap.ui.base.Event} oEvent SAPUI5 event object
     *
     * @returns {boolean} Boolean which indicates if the navigation should occur.
     *
     * @since 1.75
     * @private
     */
    VizInstance.prototype.onsapenter = function (oEvent) {
        return this._preventDefault(oEvent);
    };

    /**
     * Handles the delete event which is triggered by the backspace
     * or delete key.
     *
     * @param {object} oEvent Browser Keyboard event
     *
     * @since 1.75
     * @private
     */
    VizInstance.prototype.onkeyup = function (oEvent) {
        if (this.getEditable() && (PseudoEvents.events.sapdelete.fnCheck(oEvent) || PseudoEvents.events.sapbackspace.fnCheck(oEvent))) {
            this.firePress({
                scope: "Actions",
                action: "Remove"
            });
        }
    };

    /**
     * Stops the given event from bubbling up the DOM and prevents its default behavior.
     *
     * @param {Event} oEvent The browser event
     * @returns {boolean} True if the default behavior is prevented, otherwise false.
     */
    VizInstance.prototype._preventDefault = function (oEvent) {
        if (this.getEditable()) {
            oEvent.preventDefault();
            oEvent.stopPropagation();
            return false;
        }

        return true;
    };

    /**
     * Returns the layout data for the Gridcontainer/Section
     *
     * @returns {object} oLayout the layout data in "columns x rows" format. E.g.: "2x2"
     * @since 1.72.0
     */
    VizInstance.prototype.getLayout = function () {
        var iWidth = this.getWidth(),
            iHeight = this.getHeight();

        // Legacy tiles use a different size that needs to be converted to
        // a grid one.
        var iSizeModifier = (Object.getPrototypeOf(this).getMetadata().getName() === "sap.ushell.ui.launchpad.VizInstanceCard") ? 1 : 2;

        var oLayout = {
            columns: iWidth * iSizeModifier,
            rows: iHeight * iSizeModifier
        };

        return oLayout;
    };

    /**
     * A function which returns UI5 view / control of the visualization
     *
     * @param {object} vizData The data required to load the visualization
     *
     * @returns {Promise<sap.ui.core.Control>} the UI5 representation
     * @since 1.72.0
     */
    VizInstance.prototype.load = function (vizData) {
        // Check if instantiation already happened (to avoid triggering it twice)
        // or was already started
        if (!this.oInnerControl && this.oControlPromise) {
            return this.oControlPromise;
        }

        return new Promise(function (resolve, reject) {
            if (this.oInnerControl) {
                resolve(this.oInnerControl);
                return;
            }

            this._setVizViewControlPromise(vizData);

            this.oControlPromise.then(function (oView) {
                this.setAggregation("innerControl", oView, false);
                resolve(oView);
            }.bind(this)).catch(reject);
        }.bind(this));
    };

    VizInstance.prototype._setVizViewControlPromise = function () {
        // Interface
        this.oControlPromise = Promise.resolve({});
    };

    VizInstance.prototype._getInnerControlPromise = function () {
        return this.oControlPromise;
    };

    return VizInstance;
});
