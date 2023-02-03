//Copyright (c) 2009-2017 SAP SE, All Rights Reserved

sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/model/json/JSONModel",
    "sap/base/Log",
    "sap/ui/core/library",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (UIComponent, JSONModel, Log, coreLibrary, Filter, FilterOperator) {
    "use strict";

    var ValueState = coreLibrary.ValueState;

    var Modes = {
        off: "OFF",
        manual: "MANUAL",
        auto: "AUTOMATIC"
    };

    return UIComponent.extend("sap.ushell_abap.transport.Component", {
        metadata: {
            manifest: "json",
            events: {
                change: {
                    parameters: {
                        valid: { type: "Boolean" },
                        required: { type: "Boolean" }
                    }
                }
            }
        },

        /**
         * Initializes the component.
         */
        init: function () {
            UIComponent.prototype.init.apply(this, arguments);
            var oTransportModel = this.getModel("Transport");

            this._initModels();

            this._oMetadataPromise = new Promise(function (resolve, reject) {
                if (oTransportModel.isMetadataLoadingFailed()) { reject("Metadata failed to load."); }
                oTransportModel.attachMetadataFailed(reject);
                oTransportModel.metadataLoaded().then(resolve);
            });

            this._oMetadataPromise.then(this._initialize.bind(this)).catch(Log.error);
        },

        /**
         * Initializes the 'Mode' and 'TransportInformation' models.
         *
         * @private
         */
        _initModels: function () {
            this.setModel(new JSONModel({
                mode: null
            }), "Mode");
            this.setModel(new JSONModel({
                transportId: null,
                required: true,
                valueState: ValueState.None,
                value: "",
                transports: []
            }), "TransportInformation");
        },

        /**
         * Retrieves the mode and saves it. If retrieve fails, saves 'OFF'.
         *
         * @return {Promise<void>} Resolves when the mode is set.
         * @private
         */
        _saveMode: function () {
            var oPromise;
            if (this.getModel("Mode").getProperty("/mode") !== null) {
                oPromise = Promise.resolve(this.getModel("Mode").getProperty("/mode"));
            } else {
                oPromise = this._getMode().then(function (oResult) {
                    return oResult && oResult.mode && oResult.mode ? oResult.mode.transportMode : Modes.off;
                }).catch(function () {
                    return Modes.off;
                });
            }
            return oPromise.then(this._setMode.bind(this));
        },

        /**
         * Sets the mode string to the Mode model.
         *
         * @param {string} sMode The mode string: OFF|AUTOMATIC|MANUAL.
         * @private
         */
        _setMode: function (sMode) {
            this.getModel("Mode").setProperty("/mode", sMode);
            if (sMode === Modes.auto) {
                this.getModel("TransportInformation").setProperty("/required", true);
            } else {
                this.getModel("TransportInformation").setProperty("/required", false);
            }
        },

        /**
         * Reads the mode from the server, resolves to the mode string.
         *
         * @return {Promise<string>} Resolves to the mode string.
         * @private
         */
        _getMode: function () {
            return new Promise(function (resolve, reject) {
                this.getModel("Transport").callFunction("/mode", {
                    method: "POST",
                    success: resolve,
                    error: reject
                });
            }.bind(this));
        },

        /**
         * Reads the transports from the server filted by objectId and sets the model entries for the Input field.
         * Rejects with ODataModel error.
         *
         * @return {Promise} Resolves with no value.
         * @private
         */
        _getTransports: function (objectId) {
            return new Promise(function (resolve, reject) {
                this.getModel("Transport").read("/transportSet", {
                    success: resolve,
                    error: reject,
                    filters: [
                        new Filter("objectId", FilterOperator.EQ, objectId.toUpperCase())
                    ]
                });
            }.bind(this));
        },

        /**
         * Called if the OData Requests is done to set the transport data and
         * the component state based on OData message container.
         *
         * @param {object} result OData Result object
         * @param {object} spaceOrPage The Page or Space object, depending on surrounding app
         * @private
         */
        _setTransportData: function (result, spaceOrPage) {
            function checkMessages (messages, model) {
                for (var i = 0; i < messages.length; i++) {
                    if (messages[i].getCode() === "/UI2/PAGE/055") {
                        model.setProperty("/required", false);
                    } else {
                        model.setProperty("/required", true);
                    }
                }

            }
            var aMessages = this.getModel("Transport").getMessages({sDeepPath: "/transportSet"});
            this.getModel("TransportInformation").setProperty("/transports", result.results);
            if (!spaceOrPage) {
                return;
            } else {
                if (aMessages.length !== 0 && this.getModel("Mode").getProperty("/mode") === Modes.auto) { // If AUTO + Messages --> no transport required
                    checkMessages(aMessages, this.getModel("TransportInformation"));
                } else if (aMessages.length === 0 && this.getModel("Mode").getProperty("/mode") === Modes.auto) { // If AUTO + no Messages --> transport required
                    this.getModel("TransportInformation").setProperty("/required", true);
                } else if (aMessages.length === 0 && this.getModel("Mode").getProperty("/mode") === Modes.manual) { // If MANUAL + no Messages --> transport required
                    this.getModel("TransportInformation").setProperty("/required", true);
                } else if (aMessages.length !== 0 && this.getModel("Mode").getProperty("/mode") === Modes.manual) { // If MANUAL + Messages --> no transport required
                    checkMessages(aMessages, this.getModel("TransportInformation"));
                }
                this.getRootControl().getController().validate();
            }
        },

        /**
         * Initial setup.
         * - Saves the mode
         *
         * @return {Promise<void>} Resolves when the mode is saved.
         * @private
         */
        _initialize: function () {
            return this._saveMode();
        },

        /**
         * Reset the component to its initial state
         *
         * - Resets the models to initial values.
         * - Calls initialize to save the mode.
         *
         * @return {Promise<void>} Resolves when the component was reset and the mode was saved.
         */
        reset: function () {
            this.getModel("TransportInformation").setProperty("/transportId", null);
            this.getModel("TransportInformation").setProperty("/value", "");
            this.getModel("TransportInformation").setProperty("/required", true);
            this.getModel("TransportInformation").setProperty("/valueState", ValueState.None);
            return Promise.resolve();
        },

        /**
         * Decorates the spaceOrPage object by adding transport-specific properties.
         *
         * @param {object} [spaceOrPage] The Page or Space object, depending on surrounding app
         * @returns {object} The enhanced object or a new object.
         */
        decorateResultWithTransportInformation: function (spaceOrPage) {
            var sTransportId = this.getModel("TransportInformation").getProperty("/transportId");

            if (!spaceOrPage) {
                spaceOrPage = {};
            }

            if (sTransportId) {
                spaceOrPage.transportId = sTransportId;
            }

            return spaceOrPage;
        },

        /**
         * Checks if the transport information needs to be shown.
         * - Shown if the metadata is loaded and the mode is saved and not 'OFF'.
         *
         * @param {object} spaceOrPage The space or page object
         * @returns {Promise<boolean>} A promise resolving to the boolean result.
         */
        showTransport: function (spaceOrPage) {
            this.getRootControl().setBusy(true);
            this.fireChange({
                valid: false,
                empty: true,
                required: true
            });
            return Promise.all([
                this._getTransports(spaceOrPage ? spaceOrPage.id : ""),
                this._oMetadataPromise,
                this._saveMode()
            ]).then(function (aResult) {
                this._setTransportData(aResult[0], spaceOrPage);
                var bShow = this.getModel("Mode").getProperty("/mode") !== Modes.off;
                this.fireChange({
                    valid: !this.getModel("TransportInformation").getProperty("/required"),
                    empty: true,
                    required: !!this.getModel("TransportInformation").getProperty("/required")
                });
                return bShow;
            }.bind(this)).catch(function (oError) {
                Log.error(oError);
                return false;
            }).finally(function () {
                this.getRootControl().setBusy(false);
            }.bind(this));
        },

        /**
         * Dummy API Method to be compatible
         *
         * @returns {Promise<boolean|object>} A promise with the transport information or false if the page is not locked
         */
        showLockedMessage: function () {
            return Promise.resolve(false);
        }
    });
});
