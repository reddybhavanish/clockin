// Copyright (c) 2009-2020 SAP SE, All Rights Reserved

sap.ui.define([
    "sap/m/library",
    "sap/ushell/Config",
    "sap/ushell/EventHub",
    "sap/ushell/resources"
], function (mobileLibrary, Config, EventHub, resources) {
    "use strict";

    // shortcut for sap.m.ButtonType
    var ButtonType = mobileLibrary.ButtonType;
    var oInstance;

    /**
     * Helper function to get the "catalogView" of the AppFinder.
     *
     * @returns {sap.ui.core.mvc.View|undefined} The "catalogView" of the AppFinder or "undefined" if the view was not found.
     */
    function getCatalogView () {
        return sap.ui.getCore().byId("catalogView");
    }

    /**
     * VisualizationOrganizerHelper constructor.
     *
     * @constructor
     * @protected
     */
    function VisualizationOrganizerHelper () {
        var oVisualizationOrganizer,
            oVisualizationOrganizerPromise,
            oSectionContext = null;

        /**
         * Helper function to check whether "Spaces" setting is enabled or not.
         *
         * @returns {boolean} Whether "Spaces" setting is enabled (true) or not (false).
         */
        function isSpacesEnabled () {
            return Config.last("/core/spaces/enabled");
        }

        /**
         * Returns a promise that resolves to the VisualizationOrganizer.
         * If the VisualizationOrganizer was already loaded before, then it resolves to that same instance.
         *
         * @returns {Promise<sap.ushell.components.visualizationOrganizer.Component>} A promise that resolves to the VisualizationOrganizer.
         *
         * @see sap.ushell.components.visualizationOrganizer.Component
         */
        function loadVisualizationOrganizer () {
            if (oVisualizationOrganizer) {
                return Promise.resolve(oVisualizationOrganizer);
            }

            oVisualizationOrganizerPromise = oVisualizationOrganizerPromise || new Promise(function (resolve) {
                sap.ui.require(["sap/ushell/components/visualizationOrganizer/Component"], function (VisualizationOrganizer) {
                    oVisualizationOrganizer = new VisualizationOrganizer();
                    resolve(oVisualizationOrganizer);
                });
            });
            return oVisualizationOrganizerPromise;
        }

        if (isSpacesEnabled()) {
            this.oDoable = EventHub.on("trackHashChange").do(function (sHash) {
                if (isSpacesEnabled() && (sHash === "Shell-appFinder")) {
                    var oCatalogView = getCatalogView();
                    if (!oCatalogView) { return; }
                    oCatalogView.setBusy(true);
                    loadVisualizationOrganizer()
                        .then(function (visualizationOrganizer) {
                            return visualizationOrganizer.requestData();
                        })
                        .then(function () {
                            if (this.oModel) {
                                this.oModel.updateBindings(true);
                            }
                        }.bind(this))
                        .finally(function () {
                            oCatalogView.setBusy(false);
                        });
                }
            }.bind(this));
        }

        /**
         * Sets the model to have its bindings refreshed after loading and processing the data.
         *
         * @param {sap.ui.model.json.JSONModel} model The model to have its bindings refreshed after loading and processing the data.
         */
        this.setModel = function (model) {
            this.oModel = model;
        };

        /**
         * Determines the tooltip text of the "pin" button.
         * Checks if Spaces are enabled:
         * - Spaces disabled: forwards the call to the original handler with the array of group ids and the group context.
         * - Spaces enabled: forwards the call to the VisualizationOrganizer.
         *
         * @param {string[]} aGroupsIDs Array of group ids.
         * @param {object} oGroupContext The current group context.
         * @param {string} vizId The vizId of the visualization to be checked.
         * @returns {string} The formatted string.
         *
         * @since 1.75.0
         * @protected
         */
        this.formatPinButtonTooltip = function (aGroupsIDs, oGroupContext, vizId) {
            if (!isSpacesEnabled()) {
                return this.formatPinButtonTooltip(aGroupsIDs, oGroupContext);
            }
            return oVisualizationOrganizer.formatPinButtonTooltip(vizId, oSectionContext);
        };

        /**
         * Determines the "selected" state of the "pin" button.
         * Checks if Spaces are enabled:
         * - Spaces disabled: forwards the call to the original handler with original arguments.
         * - Spaces enabled: returns "false" ("pin" button should never be selected).
         *
         * @returns {boolean} The boolean result.
         *
         * @since 1.75.0
         * @protected
         */
        this.formatPinButtonSelectState = function () {
            if (!isSpacesEnabled()) {
                return this.formatPinButtonSelectState.apply(this, arguments);
            }
            return false;
        };

        /**
         * Forwarder function for the VisualizationOrganizer "formatPinButtonIcon" method.
         * Checks if Spaces are enabled:
         * - Spaces disabled: returns "sap-icon://pushpin-off".
         * - Spaces enabled: forwards the call to the VisualizationOrganizer.
         *
         * @param {string} vizId The vizId of the visualization to be checked.
         * @returns {sap.ui.core.URI} The icon that should be used for the "pin" button.
         *
         * @see shouldUseVisualizationOrganizer
         */
        this.formatPinButtonIcon = function (vizId) {
            if (!isSpacesEnabled()) {
                return "sap-icon://pushpin-off";
            }
            return oVisualizationOrganizer.formatPinButtonIcon(vizId, !!oSectionContext);
        };

        /**
         * Forwarder function for the VisualizationOrganizer "formatPinButtonType" method.
         * Checks if Spaces are enabled:
         * - Spaces disabled: returns "ButtonType.Default".
         * - Spaces enabled: forwards the call to the VisualizationOrganizer.
         *
         * @param {string} vizId The vizId of the visualization to be checked.
         * @returns {sap.m.ButtonType} The type that should be used for the "pin" button.
         *
         * @see shouldUseVisualizationOrganizer
         */
        this.formatPinButtonType = function (vizId) {
            if (!isSpacesEnabled()) {
                return ButtonType.Default;
            }
            return oVisualizationOrganizer.formatPinButtonType(vizId, !!oSectionContext);
        };

        /**
         * Forwarder function for the VisualizationOrganizer "onTilePinButtonClick" method.
         * Checks if Spaces are enabled:
         * - Spaces disabled: forwards the call to the original handler.
         * - Spaces enabled: forwards the call to the VisualizationOrganizer.
         *
         * @param {sap.ui.base.Event} oEvent The press event.
         *
         * @since 1.75.0
         * @protected
         */
        this.onTilePinButtonClick = function (oEvent) {
            if (!isSpacesEnabled()) {
                this.getController().onTilePinButtonClick(oEvent);
                return;
            }
            oVisualizationOrganizer.onTilePinButtonClick(oEvent, oSectionContext);
        };

        /**
         * Return the navigation context if app finder was opened in scope of a group or section.
         * Checks if Spaces are enabled:
         * - Spaces disabled: forwards the call to the original handler.
         * - Spaces enabled: return the object which contain pageID and sectionID.
         *
         * @returns {objest} Return navigation context object or null if no group/section scope
         *
         * @since 1.76.0
         * @protected
         */
        this.getNavigationContext = function () {
            if (!isSpacesEnabled()) {
                return this.getGroupContext.apply(this, arguments);
            }
            if (oSectionContext) {
                return {
                    pageID: encodeURIComponent(oSectionContext.pageID),
                    sectionID: encodeURIComponent(oSectionContext.sectionID)
                };
            }
            return null;
        };

        /**
         * Return the navigation context as a string if app finder was opened in scope of a group or section.
         * Checks if Spaces are enabled:
         * - Spaces disabled: forwards the call to the original handler.
         * - Spaces enabled: return string which contain pageID and sectionID.
         *
         * @returns {string} Return navigation context or null if no group/section scope
         *
         * @since 1.76.0
         * @protected
         */
        this.getNavigationContextAsText = function () {
            if (!isSpacesEnabled()) {
                return this.getGroupNavigationContext.apply(this, arguments);
            }
            if (oSectionContext) {
                return JSON.stringify({
                    pageID: encodeURIComponent(oSectionContext.pageID),
                    sectionID: encodeURIComponent(oSectionContext.sectionID)
                });
            }

            return null;
        };

        /**
         * Update the navigation scope in the model based on the router parameter
         * Checks if Spaces are enabled:
         * - Spaces disabled: forwards the call to the original handler.
         * - Spaces enabled: forwards the call to the VisualizationOrganizer.
         *
         * @param {object} [oDataParam] The navigation parameter.
         * @returns {Promise<undefined>} A promise that resolves when the popover is toggled.
         *
         * @since 1.76.0
         * @protected
         */
        this.updateModelWithContext = function (oDataParam) {
            if (!isSpacesEnabled()) {
                this._updateModelWithGroupContext.apply(this, arguments);
                return Promise.resolve();
            }

            return loadVisualizationOrganizer().then(function () {
                return oVisualizationOrganizer.loadSectionContext(oDataParam);
            }).then(function (oContext) {
                oSectionContext = oContext;
                //Should be before setting the title. Otherwise title will be not correct.
                this.oView.getModel().updateBindings(true);
                if (oSectionContext) {
                    var sTitle = resources.i18n.getText("VisualizationOrganizer.AppFinderSectionContextTitle", oSectionContext.sectionTitle);
                    this.oView.oPage.setTitle(sTitle);
                    if (this._updateShellHeader) {
                        this._updateShellHeader(sTitle);
                    }
                }
            }.bind(this));
        };

        /**
         * Load visualization organizer component
         *
         * @since 1.76.0
         * @private
         */
        this._loadVisualizationOrganizer = loadVisualizationOrganizer;
        /**
         * Update section context
         *
         * @param {object} oContext The new section context
         *
         * @since 1.76.0
         * @private
         */
        this._setSectionContext = function (oContext) {
            oSectionContext = oContext;
        };

        /**
         * This method should be called externally when exiting (destroying) the view where this helper is being used on.
         * Turns off the EventHub listener responsible for calling the data refresh handler.
         */
        this.exit = function () {
            if (this.oDoable) {
                this.oDoable.off();
                this.oDoable = null;
            }
        };
    }

    return {
        getInstance: function () {
            if (!oInstance) {
                oInstance = new VisualizationOrganizerHelper();
            }
            return oInstance;
        },
        destroy: function () {
            if (oInstance) {
                oInstance.exit();
            }
            oInstance = null;
        }
    };

});
