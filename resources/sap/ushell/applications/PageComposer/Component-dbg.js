// Copyright (c) 2009-2020 SAP SE, All Rights Reserved

sap.ui.define([
    "sap/ui/core/UIComponent",
    "./controller/ErrorDialog",
    "sap/ui/model/json/JSONModel",
    "./util/PagePersistence"
], function (UIComponent, ErrorDialog, JSONModel, PagePersistence) {
    "use strict";

    return UIComponent.extend("sap.ushell.applications.PageComposer.Component", {
        metadata: { "manifest": "json" },
        _oTransportPromise: null,

        /**
         * Initializes the component
         *
         * @protected
         */
        init: function () {
            UIComponent.prototype.init.apply(this, arguments);
            this.getRouter().initialize();

            var oComponentData = this.getComponentData();
            var oStartupParams = oComponentData && oComponentData.startupParameters;

            this._handleStartupParams(oStartupParams || {});

            this.getModel("PageRepository").setHeaders({
                "sap-language": sap.ushell.Container.getUser().getLanguage(),
                "sap-client": sap.ushell.Container.getLogonSystem().getClient()
            });

            this.getModel("PageRepository").getMetaModel().loaded().then(this.setMetaModelData.bind(this));

            this.getModel("PageRepository").attachMetadataFailed(function (oError) {
                this.getRouter().navTo("ODataError", oError, true);
            }.bind(this));

            // set message model
            this.setModel(sap.ui.getCore().getMessageManager().getMessageModel(), "message");
        },

        /**
         * Instantiates the page persistence utility and returns the created instance.
         *
         * @returns {sap.ushell.applications.PageComposer.util.PagePersistence} An instance of the page persistence utility.
         * @protected
         */
        getPageRepository: function () {
            if (!this.oPagePersistenceInstance) {
                this.oPagePersistenceInstance = new PagePersistence(
                    this.getModel("PageRepository"),
                    this.getModel("i18n").getResourceBundle(),
                    this.getModel("message")
                );
            }
            return this.oPagePersistenceInstance;
        },

        /**
         * Returns whether there is an entry for transport in the manifest entry sap.ui5/componentUsages
         * @returns {boolean} True if transport is supported / false if not
         */
        isTransportSupported: function () {
            return true;
        },

        /**
         * Handles startup parameters for pageId and mode
         * If there is a pageId set, navigate to that pageId in edit|view mode
         *
         * @param {object} startupParameters The parameters passed as startup params to the application via URL
         *
         * @private
         */
        _handleStartupParams: function (startupParameters) {
            var sPageId = startupParameters.pageId && startupParameters.pageId[0];
            var sMode = startupParameters.mode && startupParameters.mode[0];

            if (sPageId) {
                sMode = ["edit", "view"].indexOf(sMode) > -1 ? sMode : "view";
                this.getRouter().navTo(sMode, { pageId: encodeURIComponent(sPageId) }, true);
            }
        },

        /**
         * Shows an error dialog
         *
         * @param {object} oError The error object
         * @protected
         */
        showErrorDialog: function (oError) {
            ErrorDialog.open(oError, this.getModel("i18n"));
        },

        /**
         * Get the component defined in the metadata "componentUsages" property
         *
         * @param {string} [pagePackage] The page package name
         * @returns {Promise<sap.ui.core.Component>} Promise resolving to the component instance or void if
         * no component is declared
         * Rejected if transport is not supported
         * @protected
         */
        createTransportComponent: function (pagePackage) {
            if (this.isTransportSupported()) {
                if (!this._oTransportPromise) {
                    this._oTransportPromise = this.createComponent({
                        async: true,
                        usage: "transportInformation"
                    });
                }

                return this._oTransportPromise.then(function (transportComponent) {
                    transportComponent.reset({
                        "package": pagePackage
                    });
                    return transportComponent;
                });
            }

            return Promise.reject();
        },

        /**
         * set the function import information from metadata to a global model
         *
         * @protected
         */
        setMetaModelData: function () {
            var oMetaModel = this.getModel("PageRepository").getMetaModel(),
                oMetaModelData = {
                    copySupported: !!oMetaModel.getODataFunctionImport("copyPage"),
                    deleteSupported: !!oMetaModel.getODataFunctionImport("deletePage"),
                    createSupported: this.getMetadata().getConfig().enableCreate
                };

            this.setModel(new JSONModel(oMetaModelData), "SupportedOperationModel");
        },

        /**
         * casts a string "false" or "true" to its boolean value
         * in case of undefined the boolean true is returned. This is to fulfill spec for oData.
         * Remark: strings that are numbers like '1' are converted to numbers.
         * @param {string} sFalseTrueOrFalsy String that has value "false" or "true"
         *                 or undefined
         * @returns {boolean} representing the result of the cast
         */
        castBoolean: function (sFalseTrueOrFalsy) {
            return JSON.parse(sFalseTrueOrFalsy || "true");
        },

        /**
         * set the function import information from metadata to a global model
         *
         * @protected
         */
        setMetaModelDataSapDelivered: function () {
            var oMetaModel = this.getModel("PageRepository").getMetaModel(),
                oMetaModelData = {
                    copySupported: this.castBoolean(oMetaModel.getODataEntitySet("pagesMasterSet")["sap:creatable"])
                    || !!oMetaModel.getODataFunctionImport("copyPage"),
                    deleteSupported: this.castBoolean(oMetaModel.getODataEntitySet("pagesMasterSet")["sap:deletable"]),
                    createSupported: this.castBoolean(oMetaModel.getODataEntitySet("pagesMasterSet")["sap:creatable"]),
                    updateSupported: this.castBoolean(oMetaModel.getODataEntitySet("pagesMasterSet")["sap:updatable"])
                };

            this.setModel(new JSONModel(oMetaModelData), "SupportedOperationModel");
        }
    });
});

