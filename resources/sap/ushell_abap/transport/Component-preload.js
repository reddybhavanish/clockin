//@ui5-bundle Component-preload.js
sap.ui.require.preload({
	"sap/ushell_abap/transport/Component.js":function(){//Copyright (c) 2009-2017 SAP SE, All Rights Reserved

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
},
	"sap/ushell_abap/transport/controller/TransportInformation.controller.js":function(){// Copyright (c) 2009-2017 SAP SE, All Rights Reserved

sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/library",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Item"
], function (
    Controller,
    coreLibrary,
    JSONModel,
    Item
) {
    "use strict";

    // shortcut for sap.ui.core.ValueState
    var ValueState = coreLibrary.ValueState;

    return Controller.extend("sap.ushell_abap.transport.controller.TransportInformation", {
        onInit: function () {
            this.byId("transportInput").setSuggestionRowValidator(this._suggestionRowValidator);
        },

        /**
         * Returns an item for each row.
         *
         * @param {sap.m.ColumnListItem} oColumnListItem The column list item.
         * @return {sap.ui.core.Item} The created item.
         * @private
         */
        _suggestionRowValidator: function (oColumnListItem) {
            var aCells = oColumnListItem.getCells();

            return new Item({
                key: aCells[0].getText(),
                text: aCells[1].getText()
            });
        },

        /**
         * Called if the transport value is changed.
         * - validates the input
         * - sets the Id to the TransportInformation model
         */
        onTransportChange: function () {
            var sSelectedItemKey = this.byId("transportInput").getSelectedKey(),
                sInputValue = this.byId("transportInput").getValue(),
                bIsValid = this.validate(sSelectedItemKey, sInputValue),
                sTransportId = bIsValid ? sSelectedItemKey : null;
            this.getOwnerComponent().getModel("TransportInformation").setProperty("/transportId", sTransportId);
            this.getOwnerComponent().fireChange({
                valid: bIsValid,
                empty: !sInputValue,
                required: this.getOwnerComponent().getModel("TransportInformation").getProperty("/required")
            });
        },

        /**
         * Event is fired if a logical field group defined by <code>fieldGroupIds</code> of the Form was left
         * or when the user explicitly pressed the key combination that triggers validation.
         * @param {sap.ui.base.Event} event provided by UI5
         */
        onValidation: function (event) {
            var aFieldGroup = event.getParameters().fieldGroupIds;
            if (aFieldGroup.indexOf("transportGroup") > -1) {
                this.onTransportChange();
                event.bCancelBubble = true; //stop bubbling to the parent control
            }
        },

        /**
         * Validate the input values and call the change handler.
         *
         * @param {string} selectedItemId The suggestion item id.
         * @param {string} value Input value to determine if the entered value is not valid or nothing was entered.
         * @return {boolean} True if valid, else false.
         * @private
         */
        validate: function (selectedItemId, value) {
            var bIsValid = !!selectedItemId,
                bIsRequired = this.getOwnerComponent().getModel("TransportInformation").getProperty("/required");
            if (bIsRequired && !bIsValid) {
                this.getOwnerComponent().getModel("TransportInformation").setProperty("/valueState", ValueState.Error);
            } else if (!bIsRequired && !bIsValid) {
                bIsValid = !value;
                if (bIsValid) {
                    this.getOwnerComponent().getModel("TransportInformation").setProperty("/valueState", ValueState.Information);
                } else {
                    this.getOwnerComponent().getModel("TransportInformation").setProperty("/valueState", ValueState.Error);
                }
            } else {
                this.getOwnerComponent().getModel("TransportInformation").setProperty("/valueState", ValueState.None);
            }
            return bIsValid;
        }
    });
});
},
	"sap/ushell_abap/transport/i18n/i18n.properties":'# Translatable texts for the Transport Component used in the Fiori Launchpad Page Composer application\n# __ldi.translation.uuid=f9ae8208-ced0-4d3f-9c14-4ab34171c284\n\n#XTIT: Title for the Transport Component\nTransportInformation.Title=Customizing transport information\n#XMSG: Description for the Transport Component\nTransportInformation.Description=Component to display and validate the fields relevant for customizing transport\n#XFLD: Label for the transport input field\nLabel.Transport=Transport\n#XMSG: Validation message for the transport input field\nMessage.EmptyTransport=Please provide a valid transport. To create transport requests, please use SE09.\n#XCOL: The column heading for the description column\nColumn.Description=Description\n#XCOL: The column heading for the ID column\nColumn.ID=ID',
	"sap/ushell_abap/transport/manifest.json":'{\n  "_version": "1.1.0",\n  "sap.app": {\n    "_version": "1.1.0",\n    "i18n": "i18n/i18n.properties",\n    "id": "sap.ushell_abap.transport",\n    "type": "component",\n    "embeddedBy": "",\n    "title": "{{TransportInformation.Title}}",\n    "description": "{{TransportInformation.Description}}",\n    "ach": "CA-FLP-FE-UI",\n    "cdsViews": [],\n    "offline": false,\n    "dataSources": {\n      "TransportService": {\n        "uri": "/sap/opu/odata/UI2/FDM_TRANSPORT_SRV/",\n        "type": "OData",\n        "settings": {\n          "odataVersion": "2.0"\n        }\n      }\n    }\n  },\n  "sap.ui": {\n    "_version": "1.1.0",\n    "technology": "UI5",\n    "icons": {\n    },\n    "deviceTypes": {\n      "desktop": true,\n      "tablet": false,\n      "phone": false\n    },\n    "fullWidth": true\n  },\n  "sap.ui5": {\n    "_version": "1.1.0",\n    "resources": {\n      "js": [],\n      "css": []\n    },\n    "dependencies": {\n      "libs": {\n        "sap.m": {\n          "minVersion": "1.68"\n        },\n        "sap.ui.layout": {\n          "minVersion": "1.68"\n        }\n      }\n    },\n    "models": {\n      "i18n": {\n        "type": "sap.ui.model.resource.ResourceModel",\n        "uri": "i18n/i18n.properties"\n      },\n      "Transport": {\n        "dataSource": "TransportService",\n        "preload": true,\n        "settings": {\n          "defaultCountMode": "None",\n          "skipMetadataAnnotationParsing": true,\n          "useBatch": true,\n          "metadataUrlParams": {\n            "sap-value-list": "none"\n          }\n        }\n      }\n    },\n    "rootView": {\n      "viewName": "sap.ushell_abap.transport.view.TransportInformation",\n      "type": "XML",\n      "async": true,\n      "id": "app-transport"\n    },\n    "handleValidation": false,\n    "config": {\n      "fullWidth": true\n    },\n    "routing": {},\n    "contentDensities": {\n      "compact": true,\n      "cozy": true\n    }\n  }\n}\n',
	"sap/ushell_abap/transport/view/TransportInformation.view.xml":'<mvc:View\n        xmlns="sap.m"\n        xmlns:core="sap.ui.core"\n        xmlns:form="sap.ui.layout.form"\n        xmlns:mvc="sap.ui.core.mvc"\n        controllerName="sap.ushell_abap.transport.controller.TransportInformation">\n    <form:SimpleForm editable="true" validateFieldGroup=".onValidation">\n        <Label text="{i18n>Label.Transport}"/>\n        <Input id="transportInput"\n               maxLength="60"\n               textFormatMode="ValueKey"\n               required="{TransportInformation>/required}"\n               change=".onTransportChange"\n               valueStateText="{i18n>Message.EmptyTransport}"\n               valueState="{TransportInformation>/valueState}"\n               value="{TransportInformation>/value}"\n               startSuggestion="0"\n               filterSuggests="false"\n               showSuggestion="true"\n               showTableSuggestionValueHelp="false"\n               suggestionItemSelected=".onTransportChange"\n               suggestionRows="{TransportInformation>/transports}"\n               fieldGroupIds="transportGroup">\n            <suggestionColumns>\n                <Column width="40%">\n                    <Label text="{i18n>Column.ID}"/>\n                </Column>\n                <Column width="60%">\n                    <Label text="{i18n>Column.Description}"/>\n                </Column>\n            </suggestionColumns>\n            <suggestionRows>\n                <ColumnListItem>\n                    <cells>\n                        <Label text="{TransportInformation>id}"/>\n                        <Label text="{TransportInformation>description}"/>\n                    </cells>\n                </ColumnListItem>\n            </suggestionRows>\n        </Input>\n    </form:SimpleForm>\n</mvc:View>\n'
},"Component-preload"
);
