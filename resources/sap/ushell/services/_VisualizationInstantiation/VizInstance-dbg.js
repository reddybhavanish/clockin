// Copyright (c) 2009-2020 SAP SE, All Rights Reserved

sap.ui.define([
    "sap/m/library",
    "sap/ui/core/XMLComposite",
    "sap/ui/core/Icon",
    "sap/m/VBox",
    "sap/ui/events/PseudoEvents"
], function (mobileLibrary, XMLComposite, Icon, VBox, PseudoEvents) {
    "use strict";

    // shortcut for sap.m.LoadState
    var LoadState = mobileLibrary.LoadState;
    var TileSizeBehavior = mobileLibrary.TileSizeBehavior;

    /**
     * @constructor
     */
    var VizInstance = XMLComposite.extend("sap.ushell.ui.launchpad.VizInstance", /** @lends  sap.ushell.ui.launchpad.VizInstance.prototype*/ {
        metadata: {
            library: "sap.ushell",
            properties: {
                title: {
                    type: "string",
                    defaultValue: "",
                    bindable: true
                },
                subtitle: {
                    type: "string",
                    defaultValue: "",
                    bindable: true
                },
                height: {
                    type: "int",
                    defaultValue: 2
                },
                width: {
                    type: "int",
                    defaultValue: 2
                },
                info: {
                    type: "string",
                    defaultValue: "",
                    bindable: true
                },
                icon: {
                    type: "sap.ui.core.URI",
                    defaultValue: "",
                    bindable: true
                },
                state: {
                    type: "sap.m.LoadState",
                    defaultValue: LoadState.Loaded,
                    bindable: true
                },
                sizeBehavior: {
                    type: "sap.m.TileSizeBehavior",
                    defaultValue: TileSizeBehavior.Responsive,
                    bindable: true
                },
                editable: {
                    type: "boolean",
                    defaultValue: false,
                    bindable: true
                },
                active: {
                    type: "boolean",
                    defaultValue: false
                },
                targetURL: {
                    type: "string"
                },
                indicatorDataSource: {
                    type: "object",
                    defaultValue: undefined
                },
                keywords: {
                    type: "string[]",
                    defaultValue: []
                },
                instantiationData: {
                    type: "object",
                    defaultValue: {}
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
        fragment: "sap.ushell.services._VisualizationInstantiation.VizInstance"
    });

    /**
     * Returns the layout data for the Gridcontainer/Section
     *
     * @returns {object} oLayout the layout data in "columns x rows" format. E.g.: "2x2"
     * @since 1.77.0
     */
    VizInstance.prototype.getLayout = function () {
        return {
            columns: this.getWidth(),
            rows: this.getHeight()
        };
    };

    /**
     * Updates the content aggregation of the XML composite and recalculates its layout data
     *
     * @param {sap.ui.core.Control} content The control to be put inside the visualization
     * @since 1.77.0
     */
    VizInstance.prototype._setContent = function (content) {
        var oGridData = this.getLayoutData();
        if (oGridData && oGridData.isA("sap.f.GridContainerItemLayoutData")) {
            oGridData.setRows(this.getHeight());
            oGridData.setColumns(this.getWidth());
            this.getParent().invalidate();
        }

        // Replace the generic tile of the XML composite control with the actual content
        this.setAggregation("_content", content);
    };

    VizInstance.prototype.setEditable = function (bEditable) {
        var oContent = this.getAggregation("_content");
        if (bEditable) {
            if (!this.oRemoveIconVBox) {
                var oRemoveIcon = new Icon({
                    src: "sap-icon://decline",
                    press: [this._onRemoveIconPressed, this],
                    noTabStop: true
                });
                oRemoveIcon.addStyleClass("sapMPointer");
                oRemoveIcon.addStyleClass("sapUshellTileDeleteIconInnerClass");

                this.oRemoveIconVBox = new VBox({
                    items: [oRemoveIcon]
                });
                this.oRemoveIconVBox.addStyleClass("sapUshellTileDeleteIconOuterClass");
                this.oRemoveIconVBox.addStyleClass("sapUshellTileDeleteClickArea");
                this.oRemoveIconVBox.addStyleClass("sapMPointer");
            }

            var oEditModeVBox = new VBox({
                items: [this.oRemoveIconVBox, oContent]
            });
            oEditModeVBox.addStyleClass("sapUshellVizInstance");

            this.setAggregation("_content", oEditModeVBox);
        } else if (oContent.getItems) {
            this.setAggregation("_content", oContent.getItems()[1]);
        }
        return this.setProperty("editable", bEditable);
    };

    /**
     * Press handler for the remove icon. Fires a press event on the VizInstance which leads to the removal of the tile
     *
     * @since 1.78.0
     */
    VizInstance.prototype._onRemoveIconPressed = function () {
        this.firePress({
            scope: "Actions",
            action: "Remove"
        });
    };

    /**
     * Click handler. Prevents the navigation if the edit mode is active
     *
     * @param {Event} oEvent The Event object
     * @since 1.78.0
     */
    VizInstance.prototype.onclick = function (oEvent) {
        this._preventDefault(oEvent);
    };

    VizInstance.prototype.onBeforeRendering = function (oEvent) {
        var oDomRef = this.getDomRef();
        if (oDomRef) {
            oDomRef.removeEventListener("keyup", this._fnKeyupHandler);
            oDomRef.removeEventListener("touchend", this._fnTouchendHandler);
        }
    };

    /**
     * SAPUI5 Lifecycle hook which is called after the control is rendered.
     * Prevents the navigation on keyup events while in the edit mode.
     * Event Capturing is enabled for these as we have no direct control over
     * inner elements but need to prevent their actions in the edit mode.
     *
     * @override
     * @param {Event} oEvent The Event object
     * @since 1.78.0
     * @private
     */
    VizInstance.prototype.onAfterRendering = function (oEvent) {
        var oDomRef = this.getDomRef();
        this._fnKeyupHandler = this.onkeyup.bind(this);
        this._fnTouchendHandler = this.onclick.bind(this);

        oDomRef.addEventListener("keyup", this._fnKeyupHandler, true);
        oDomRef.addEventListener("touchend", this._fnTouchendHandler, true);
    };

    /**
     * Handles the keyup event while edit mode is active
     * If delete or backspace is pressed, the focused VizInstance gets removes.
     * If space or enter is pressed, the navigation gets prevented.
     *
     * @param {Event} oEvent Browser Keyboard event
     * @since 1.78.0
     * @private
     */
    VizInstance.prototype.onkeyup = function (oEvent) {
        if (this.getEditable()) {
            if ((PseudoEvents.events.sapdelete.fnCheck(oEvent) || PseudoEvents.events.sapbackspace.fnCheck(oEvent))) {
                this.firePress({
                    scope: "Actions",
                    action: "Remove"
                });
            }

            if (PseudoEvents.events.sapspace.fnCheck(oEvent) || PseudoEvents.events.sapenter.fnCheck(oEvent)) {
                this._preventDefault(oEvent);
            }
        }
    };

    /**
     * Stops the given event from bubbling up or down the DOM and prevents its default behavior.
     *
     * @param {Event} oEvent The browser event
     * @returns {boolean} False if the default behavior is prevented, otherwise true.
     * @since 1.78.0
     */
    VizInstance.prototype._preventDefault = function (oEvent) {
        if (this.getEditable()) {
            oEvent.preventDefault();
            oEvent.stopPropagation();
            oEvent.stopImmediatePropagation();
            return false;
        }
        return true;
    };

    /**
     * Loads the content of the VizInstance and resolves the returned Promise
     * when loading is completed.
     *
     * @returns {Promise<void>} Resolves when loading is completed
     * @abstract
     * @since 1.77.0
     */
    VizInstance.prototype.load = function () {
        // As this is the base control that doesn't load anything a resolved Promise is
        // returned always.
        return Promise.resolve();
    };

    return VizInstance;

});