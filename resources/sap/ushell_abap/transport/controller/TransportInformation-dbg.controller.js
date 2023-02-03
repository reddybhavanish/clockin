// Copyright (c) 2009-2017 SAP SE, All Rights Reserved

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
