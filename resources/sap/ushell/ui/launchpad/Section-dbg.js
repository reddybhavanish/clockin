//Copyright (c) 2009-2020 SAP SE, All Rights Reserved

/**
 * @fileOverview Provides control sap.ushell.ui.launchpad.Section
 *
 * @version 1.78.0
 */
sap.ui.define([
    "sap/f/GridContainerItemLayoutData",
    "sap/m/library",
    "sap/ui/core/XMLComposite",
    "sap/ushell/resources",
    "sap/ui/core/ResizeHandler",
    "sap/ui/base/ManagedObjectMetadata",
    "sap/base/util/deepClone"
], function (
    GridContainerItemLayoutData,
    library,
    XMLComposite,
    resources,
    ResizeHandler,
    ManagedObjectMetadata,
    deepClone
) {
    "use strict";

    var TileSizeBehavior = library.TileSizeBehavior;

    /**
     * Constructor for a new Section.
     *
     * @param {string} [sId] ID for the new control, generated automatically if no ID is given
     * @param {object} [mSettings] Initial settings for the new control
     *
     * @class
     * The Section represents a structured collection of visualizations.
     * @extends sap.ui.core.XMLComposite
     *
     * @author SAP SE
     * @version 1.78.0
     *
     * @private
     * @alias sap.ushell.ui.launchpad.Section
     * @ui5-metamodel This control/element also will be described in the UI5 (legacy) designtime metamodel
     */
    var Section = XMLComposite.extend("sap.ushell.ui.launchpad.Section", /** @lends sap.ushell.ui.launchpad.Section.prototype */ {
        metadata: {
            library: "sap.ushell",
            properties: {

                /**
                 * Specifies if the section should display in the edit mode.
                 */
                editable: { type: "boolean", group: "Misc", defaultValue: false },

                /**
                 * Specifies if the section is a default section.
                 * A default section contains tiles that are added to a page using the App Finder.
                 * The title of the default section is predefined and cannot be changed.
                 * Users cannot add tiles to a default section using drag and drop or keyboard keys.
                 * However, users can move or remove the tiles from, and rearrange the tiles inside of a default section.
                 * There should be only one default section on the page. It is always the topmost section and its position cannot be changed.
                 * An empty default section is not displayed.
                 */
                default: { type: "boolean", group: "Misc", defaultValue: false },

                /**
                 * Specifies if the 'Add Visualization' button should be shown during editing of the section. (See editable property)
                 * The 'Add Visualization' button triggers the addWigetButtonPressed event when it is pressed.
                 */
                enableAddButton: { type: "boolean", group: "Behavior", defaultValue: true },

                /**
                 * Specifies if the 'Delete Section' button should be shown during editing of the section. (See editable property)
                 * The 'Delete Section' button triggers the deleteButtonPressed event when it is pressed.
                 */
                enableDeleteButton: { type: "boolean", group: "Behavior", defaultValue: true },

                /**
                 * Specifies if the grid breakpoints are used.
                 * This is to limit the reordering during resizing, it might break certain layouts.
                 */
                enableGridBreakpoints: { type: "boolean", group: "Appearance", defaultValue: false },

                /**
                 * Specifies if the grid container query is used.
                 * This is to use the outer container size instead of the window size to calculate breakpoints.
                 */
                enableGridContainerQuery: { type: "boolean", group: "Appearance", defaultValue: false },

                /**
                 * Specifies if the 'Reset Section' button should be shown during editing of the section. (See editable property)
                 * The 'Reset Section' button triggers the resetButtonPressed event when it is pressed.
                 */
                enableResetButton: { type: "boolean", group: "Behavior", defaultValue: true },

                /**
                 * Specifies if the 'Show / Hide Section' button should be shown during editing of the section. (See editable property)
                 */
                enableShowHideButton: { type: "boolean", group: "Behavior", defaultValue: true },

                /**
                 * Specifies whether visualization reordering is enabled. Relevant only for desktop devices.
                 */
                enableVisualizationReordering: { type: "boolean", group: "Behavior", defaultValue: false },

                /**
                 * This text is displayed when the control contains no visualizations.
                 */
                noVisualizationsText: { type: "string", group: "Appearance", defaultValue: resources.i18n.getText("Section.NoVisualizationsText") },

                /**
                 * Specifies the title of the section.
                 */
                title: { type: "string", group: "Appearance", defaultValue: "" },

                /**
                 * Defines whether or not the text specified in the <code>noVisualizationsText</code> property is displayed.
                 */
                showNoVisualizationsText: { type: "boolean", group: "Behavior", defaultValue: false },

                /**
                 * Specifies if the section should be visible during non editing of the section. (See editable property)
                 */
                showSection: { type: "boolean", group: "Misc", defaultValue: true },

                /**
                 * Specifies the sizeBehavior of the grid.
                 */
                sizeBehavior: { type: "sap.m.TileSizeBehavior", group: "Misc", defaultValue: TileSizeBehavior.Responsive }
            },
            defaultAggregation: "visualizations",
            aggregations: {

                /**
                 * Defines the visualizations contained within this section.
                 */
                visualizations: {
                    type: "sap.ui.core.Control",
                    multiple: true,
                    forwarding: {
                        idSuffix: "--innerGrid",
                        aggregation: "items"
                    },
                    dnd: true
                }
            },
            events: {

                /**
                 * Fires when the add visualization button is pressed.
                 */
                "add": {},

                /**
                 * Fires when the delete button is pressed
                 */
                "delete": {},

                /**
                 * Fires when the reset button is pressed.
                 */
                "reset": {},

                /**
                 * Fires when the title is changed.
                 */
                "titleChange": {},

                /**
                 * Fires when a control is dropped on the grid.
                 */
                "visualizationDrop": {
                    parameters: {

                        /**
                         * The control that was dragged.
                         */
                        draggedControl: { type: "sap.ui.core.Control" },

                        /**
                         * The control where the dragged control was dropped.
                         */
                        droppedControl: { type: "sap.ui.core.Control" },

                        /**
                         * A string defining from what direction the dragging happend.
                         */
                        dropPosition: { type: "string" }
                    }
                },

                /**
                 * Fires when the section hides or unhides changed.
                 */
                "sectionVisibilityChange": {
                    parameters: {

                        /**
                         * Determines whether the section is now visible or invisible.
                         */
                        visible: { type: "boolean" }
                    }
                },

                /**
                 * Fires if the border of the visualizations is reached
                 * so that an application can react on this.
                 */
                "borderReached": {
                    parameters: {

                        /**
                         * Event that leads to the focus change.
                         */
                        event: { type: "jQuery.Event" }
                    }
                }
            }
        },
        resourceModel: resources.i18nModel
    });

    Section.prototype.init = function () {
        this.oVBox = this.byId("content");

        this.byId("innerGrid").addEventDelegate({
            onAfterRendering: function () {
                this.oVBox.toggleStyleClass("sapUshellSectionNoVisualizations", !this.getVisualizations().length);
            }.bind(this)
        });

        this.byId("innerGrid").attachBorderReached(function (oEvent) {
            this.fireBorderReached({
                event: oEvent,
                section: this,
                direction: oEvent.getParameter("event").type === "sapnext" ? "down": "up"
            });
        }.bind(this));

        this.bUseExtendedChangeDetection = true;
    };

    /**
     * Override of UI5 generated method
     * This method implements the diff logic for the extendedChangeDetection
     *
     * @returns {Promise<void>} a promise which is resolved after all operations are done
     *
     * @private
     * @since 1.75.0
     */
    Section.prototype.updateVisualizations = function () {
        var oBinding = this.getBinding("visualizations");
        var oBindingInfo = this.getBindingInfo("visualizations");

        var aLastVizKeys = oBinding.aLastContextData || [];
        aLastVizKeys = aLastVizKeys.map(function (oContextData) {
            return JSON.parse(oContextData)[oBindingInfo.key];
        });
        var aContexts = oBinding.getContexts();
        var aCurrentVizKeys = aContexts.map(function (oContext) {
            return oContext.getProperty(oBindingInfo.key);
        });

        // delta to handle multiple diffs in a section
        var iStartLength = aLastVizKeys.length;
        var aDiffObjects = aContexts.diff;
        var aCleanupPromises = [];
        var bBuildFromScratch = false;
        var oRemovedViz = {};

        aCleanupPromises[0] = this.oVizMovePromise || Promise.resolve();

        // aDiffObjects ==> undefined : New data we should build from scratch
        // aDiffObjects ==> [] : There is no diff, means data did not change at all
        // aDiffObjects ==> [{index: 0, type: "delete"}, {index: 1, type: "insert"},...] : Run the diff logic
        if (aDiffObjects) {
            aDiffObjects.forEach(function (oDiff, iIndex) {
                aCleanupPromises[iIndex + 1] = aCleanupPromises[iIndex].then(function (oPromisedItemMap) {
                    return oPromisedItemMap;
                });
                if (bBuildFromScratch) {
                    return;
                }

                if (oDiff.type === "delete") {
                    var iDeleteIndex = this._calcDeleteIndex(aDiffObjects, iStartLength, iIndex);
                    var oItem = this.getVisualizations()[iDeleteIndex];
                    this.removeVisualization(oItem);
                    var sRemovedVizKey = aLastVizKeys.splice(iDeleteIndex, 1);
                    oRemovedViz[sRemovedVizKey] = oItem;
                    oDiff.done = true;

                } else if (oDiff.type === "insert") {
                    if (this.oVizMovePromise) {
                        oDiff.done = false;

                        aCleanupPromises[iIndex + 1] = aCleanupPromises[iIndex].then(function (oPromisedItemMap) {
                            if (!this._insertVizFromPromise(oPromisedItemMap, aCurrentVizKeys, oDiff.index)) {
                                this._insertVizFromScratch(aContexts[oDiff.index], oBindingInfo, oDiff.index);
                            }
                            oDiff.done = true;
                            return oPromisedItemMap;
                        }.bind(this));
                    } else {
                        this._insertVizFromScratch(aContexts[oDiff.index], oBindingInfo, oDiff.index);
                        oDiff.done = true;
                    }
                } else {
                    // no delete, no insert ==> build from scratch
                    bBuildFromScratch = true;
                }
            }.bind(this));

        // append if there is no diff, but a promise
        } else if (this.oVizMovePromise) {
            aContexts.forEach(function (oContext, iIndex) {
                aCleanupPromises[iIndex + 1] = aCleanupPromises[iIndex].then(function (oPromisedItemMap) {
                    if (!this._insertVizFromPromise(oPromisedItemMap, aCurrentVizKeys, iIndex, true)) {
                        this._insertVizFromScratch(oContext, oBindingInfo, iIndex, true);
                    }
                    return oPromisedItemMap;
                }.bind(this));
            }.bind(this));
        } else {
            // no diff, no promise
            bBuildFromScratch = true;
        }

        if (bBuildFromScratch) {
            this._buildVisualizationsFromScratch(aContexts, oBindingInfo);
        }

        // destroy items when there is no resolver function
        this._resolveVizMovePromise(oRemovedViz);

        return this._cleanupAfterUpdateVisualizations(aCleanupPromises, aContexts, aCurrentVizKeys);
    };

    /** Destroys and rebuilds the visualization aggregation
     * @param {sap.ui.model.Context[]} aContexts current context of the section
     * @param {object} oBindingInfo the binding info of the new visualization
     *
     * @private
     * @since 1.75.0
     */
    Section.prototype._buildVisualizationsFromScratch = function (aContexts, oBindingInfo) {
        this.destroyVisualizations();
        aContexts.forEach(function (oContext, iIndex) {
            this._insertVizFromScratch(oContext, oBindingInfo, iIndex, true);
        }.bind(this));
    };

    /**
     * Removes unused visualizations and updates binding contexts
     * @param {Promise[]} aPromises promises to wait for
     * @param {sap.ui.model.Context[]} aContexts current context of the section
     * @param {string[]} aVizKeys array of visualization keys which the section contains
     *
     * @returns {Promise<void>} resolves after cleanup is done
     *
     * @private
     * @since 1.75.0
     */
    Section.prototype._cleanupAfterUpdateVisualizations = function (aPromises, aContexts, aVizKeys) {
        return Promise.all(aPromises).then(function (aResults) {
            //destroy all unused visualizations
            var oItemMap = aResults.pop();
            if (oItemMap) {
                Object.keys(oItemMap).forEach(function (sIndex) {
                    if (aVizKeys.indexOf(sIndex) === -1) {
                        oItemMap[sIndex].destroy();
                    }
                });
            }
            this.oVizMovePromise = null;
            this.fnVizMoveResolve = null;
            this._updateBindingContexts(aContexts);

            // Empty sections don't get rererendered and thererfore don't reach the attached onAfterRendering process
            if (aContexts.length === 0) {
                this.invalidate();
            }
        }.bind(this));
    };

    /**
     * Calculates the index with respect to the async insert operation
     * @param {object[]} aDiffObjects the diff which contains the actions
     * @param {int} iStartLength length of the aggregation at the beginning of the update
     * @param {int} iDiffIndex index of the current diff operation
     *
     * @returns {int} the index of the to be removed item
     *
     * @private
     * @since 1.75.0
     */
    Section.prototype._calcDeleteIndex = function (aDiffObjects, iStartLength, iDiffIndex) {
        var aAllActions = [];
        var aDoneActions = [];
        for (var i = 0; i < iStartLength; i++) {
            aAllActions.push(i);
            aDoneActions.push(i);
        }
        aDiffObjects.forEach(function (oDiff, iIndex) {
            if (oDiff.done === true || oDiff.done === false) {
                aAllActions = this._applyDiff(aAllActions, oDiff, iIndex + iStartLength);
            }
            if (oDiff.done === true) {
                aDoneActions = this._applyDiff(aDoneActions, oDiff, iIndex + iStartLength);
            }
        }.bind(this));
        var iItem = aAllActions[aDiffObjects[iDiffIndex].index];
        return aDoneActions.indexOf(iItem);
    };

    /**
     * Applies a diff operation to an array
     * @param {int[]} aArr the array to apply the operation
     * @param {object} oDiff a single diff operation
     * @param {int} iMaxIndex maximum of used indices
     *
     * @returns {int[]} returns the updated array
     *
     * @private
     * @since 1.75.0
     */
    Section.prototype._applyDiff = function (aArr, oDiff, iMaxIndex) {
        var aClonedArr = deepClone(aArr);
        if (oDiff.type === "delete") {
            aClonedArr.splice(oDiff.index, 1);
        } else if (oDiff.type === "insert") {
            iMaxIndex++;
            aClonedArr.splice(oDiff.index, 0, iMaxIndex);
        }
        return aClonedArr;
    };

    /**
     * Resolves the move visualization promise with the given resolver method
     * @param {object} oItemMap an item map containing the visualizations
     *
     * @private
     * @since 1.75.0
     */
    Section.prototype._resolveVizMovePromise = function (oItemMap) {
        if (this.fnVizMoveResolve) {
            this.fnVizMoveResolve(oItemMap);
            this.fnVizMoveResolve = null;
        } else {
            Object.keys(oItemMap).forEach(function (sIndex) {
                oItemMap[sIndex].destroy();
            });
        }
    };

    /**
     * Adds or Inserts a visualization from a map
     * @param {object} oPromisedItemMap the map of visualizations
     * @param {string[]} aVizKeys an array containing the keys of the visualizations
     * @param {int} iIndex index to insert and index of the key
     * @param {boolean} [bAppend] whether to append or insert the visualization
     *
     * @returns {boolean} whether the insert was successful or not
     *
     * @private
     * @since 1.75.0
     */
    Section.prototype._insertVizFromPromise = function (oPromisedItemMap, aVizKeys, iIndex, bAppend) {
        var sPromisedVizKey = aVizKeys[iIndex];
        var oPromisedItem = oPromisedItemMap[sPromisedVizKey];

        if (oPromisedItem) {
            if (bAppend) {
                this.addVisualization(oPromisedItem);
            } else {
                this.insertVisualization(oPromisedItem, iIndex);
            }
            return true;
        }
        return false;
    };

    /**
     * Creates a new visualization from the factory and inserts it with the given index
     * @param {sap.ui.model.Context} oContext the binding context of the new visualization
     * @param {object} oBindingInfo the binding info of the new visualization
     * @param {int} iIndex the index of the new visualization
     * @param {boolean} [bAppend] whether to append or insert the visualization
     *
     * @private
     * @since 1.75.0
     */
    Section.prototype._insertVizFromScratch = function (oContext, oBindingInfo, iIndex, bAppend) {
        var oItem = this._createViz(oContext, oBindingInfo);

        if (bAppend) {
            this.addVisualization(oItem);
        } else {
            this.insertVisualization(oItem, iIndex);
        }
    };

    /**
     * Creates a new visualization from the factory
     * @param {sap.ui.model.Context} oContext the binding context of the new visualization
     * @param {object} oBindingInfo the binding info of the new visualization
     *
     * @returns {object} a new visualization from the factory
     *
     * @private
     * @since 1.75.0
     */
    Section.prototype._createViz = function (oContext, oBindingInfo) {
        return oBindingInfo.factory(ManagedObjectMetadata.uid("clone"), oContext);
    };

    /**
     * Updates the binding contexts of all visualizations within the section
     * @param {sap.ui.model.Context[]} aContexts the current binding contexts
     *
     * @private
     * @since 1.75.0
     */
    Section.prototype._updateBindingContexts = function (aContexts) {
        if (!aContexts.length) {
            return;
        }

        var aItems = this.getVisualizations();
        var oItem;
        for (var i = 0; i < aItems.length; i++) {
            oItem = aItems[i];
            oItem.setBindingContext(aContexts[i]);
        }
    };

    /**
     * Sets the promise for moving a visualization
     * @param {Promise} oPromise a promise which is resolved with a visualization
     *
     * @private
     * @since 1.75.0
     */
    Section.prototype.setVizMovePromise = function (oPromise) {
        this.oVizMovePromise = oPromise;
    };

    /**
     * Sets the resolve method for moving a visualization
     * @param {function} fnResolve the resolve method
     *
     * @private
     * @since 1.75.0
     */
    Section.prototype.setVizMoveResolve = function (fnResolve) {
        this.fnVizMoveResolve = fnResolve;
    };

    Section.prototype.setEditable = function (value) {
        this.setProperty("editable", !!value);
        this.oVBox.toggleStyleClass("sapUshellSectionEdit", !!value);
    };

    Section.prototype.setShowSection = function (value, oEvent) {
        this.setProperty("showSection", !!value);
        this.oVBox.toggleStyleClass("sapUshellSectionHidden", !value);
        this.fireSectionVisibilityChange({visible: !!value});
    };

    /**
     * Delegates event to reorder visualizations
     *
     * @param {object} oInfo Drag and drop event data
     * @private
     */
    Section.prototype._reorderVisualizations = function (oInfo) {
        this.fireVisualizationDrop(oInfo.getParameters());
    };

    /**
     * Drag event listener to disable visualization drag into the default section.
     *
     * @param {object} oEvent Drag event object.
     * @private
     */
    Section.prototype._onDragEnter = function (oEvent) {
        var oDragSession = oEvent.getParameter("dragSession");
        var oTargetGrid = oDragSession.getDropControl();
        var oSourceGrid = oDragSession.getDragControl().getParent();
        if (oTargetGrid.data("default") && !oSourceGrid.data("default")) {
            oEvent.preventDefault();
        }
    };

    Section.prototype.addAggregation = function (sAggregationName, oObject) {
        if (sAggregationName === "visualizations") {
            this._addVisualizationLayoutData(oObject);
        }

        XMLComposite.prototype.addAggregation.apply(this, arguments);

        return this;
    };

    Section.prototype.insertAggregation = function (sAggregationName, oObject/*, iIndex*/) {
        if (sAggregationName === "visualizations") {
            this._addVisualizationLayoutData(oObject);
        }

        XMLComposite.prototype.insertAggregation.apply(this, arguments);

        return this;
    };

    /**
     * Returns the LayoutData for the given item.
     * Used both for DropIndicatorSize and grid sizing.
     *
     * @param {sap.ui.core.Control} oVisualization The visualization to retrieve the LayoutData from.
     * @returns {sap.ui.core.LayoutData} The LayoutData object.
     * @private
     */
    Section.prototype._getVisualizationLayoutData = function (oVisualization) {
        if (oVisualization.getLayout) {
            return oVisualization.getLayout();
        }
        // fallback for controls dragged from the TileSelector (that are not "grid visualizations" yet);
        // when TileSelector items are of the same type, then only "oVisualization.getLayout()" should be used.
        return { rows: 2, columns: 2 };
    };

    /**
     * Adds GridContainerItemLayoutData to a visualization
     *
     * @param {sap.ui.core.Control} oVisualization A visualization which gets a layout
     * @private
     */
    Section.prototype._addVisualizationLayoutData = function (oVisualization) {
        if (!oVisualization.getLayoutData()) {
            var oLayoutData = this._getVisualizationLayoutData(oVisualization);
            oVisualization.setLayoutData(new GridContainerItemLayoutData(oLayoutData));
        }
    };


    return Section;
});
