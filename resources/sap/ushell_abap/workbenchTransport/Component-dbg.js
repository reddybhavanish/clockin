//Copyright (c) 2009-2017 SAP SE, All Rights Reserved

sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/model/json/JSONModel",
    "sap/ushell_abap/workbenchTransport/util/Transport"
], function (UIComponent, JSONModel, TransportHelper) {
    "use strict";

    return UIComponent.extend("sap.ushell_abap.workbenchTransport.Component", {
        metadata: {
            manifest: "json",
            events: {
                change: {
                    parameters: {
                        valid: { type: "Boolean" }
                    }
                }
            }
        },

        init: function () {
            UIComponent.prototype.init.apply(this, arguments);
            this.getModel("Transport").setHeaders({
                "sap-language": sap.ushell.Container.getUser().getLanguage(),
                "sap-client": sap.ushell.Container.getLogonSystem().getClient()
            });
        },

        /**
         * Returns the transportHelper utility instance
         *
         * @returns {object} The transportHelper instance
         */
        getTransportHelper: function () {
            if (!this._oTransportHelper) {
                this._oTransportHelper = new TransportHelper(this.getModel("Transport"));
            }
            return this._oTransportHelper;
        },

        /**
         * Merge the existing componentData object with the given object
         *
         * @param {object} componentData Data to merge into the existing componentData
         */
        _setComponentData: function (componentData) {
            this.oComponentData = Object.assign({}, this.oComponentData, componentData);
        },

        /**
         * Resets the models to initial values
         *
         * @param {object} componentData The componentData to set
         * @return {Promise} Resolves when the component has been reset.
         */
        reset: function (componentData) {
            var oView = this.getRootControl();
            this._setComponentData(componentData);
            oView.setModel(this.getModel("Transport"), "PackageModel");
            oView.setModel(new JSONModel({
                packageInputReadOnly: false,
                package: "",
                workbenchRequest: "",
                workbenchRequired: false
            }));
            return Promise.resolve();
        },

        /**
         * Decorates the result object by adding transport-specific properties
         *
         * @param {object} pageInfo The result object
         * @returns {object} The enhanced object
         */
        decorateResultWithTransportInformation: function (pageInfo) {
            if (!pageInfo) {
                pageInfo = {};
            }
            pageInfo.devclass = this.getRootControl().getModel().getProperty("/package");
            pageInfo.transportId = this.getRootControl().getModel().getProperty("/workbenchRequest");
            return pageInfo;
        },

        /**
         * Checks if the transport information needs to be shown
         *
         * @param {object} page The page to check
         * @returns {Promise<boolean>} A promise resolving to the boolean result
         */
        showTransport: function (page) {
            return this.getTransportHelper().checkShowTransport(page);
        },

        /**
         * Checks if the page is locked by another user
         *
         * @param {object} page The page to edit
         * @returns {Promise<boolean|object>} A promise with the transport information or false if the page is not locked
         */
        showLockedMessage: function (page) {
            return this.getTransportHelper().checkShowLocked(page);
        }
    });
});
