// Copyright (c) 2009-2020 SAP SE, All Rights Reserved

sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (
    Controller,
    Fragment,
    Filter,
    FilterOperator
) {
    "use strict";

    var _oFragmentPromise;

    var CatalogSelectorController = Controller.extend("sap.ushell.applications.PageComposer.controller.CatalogSelector.controller", {
        /**
         * Load the UI of the catalog selector.
         *
         * @param {sap.ui.core.mvc.View} oParentView The parent view.
         * @returns {Promise<sap.m.Dialog>} The promise that resolves to the dialog instance.
         *
         * @private
         */
        load: function (oParentView) {
            _oFragmentPromise = _oFragmentPromise || Fragment.load({
                    id: oParentView.getId(),
                    name: "sap.ushell.applications.PageComposer.view.CatalogSelector",
                    controller: this
                }).then(function (oDialog) {
                    oParentView.addDependent(oDialog);
                    return oDialog;
                });
            return _oFragmentPromise;
        },

        /**
         * Opens the catalog selector.
         *
         * @param {sap.ui.core.mvc.View} oParentView The parent view (edit page).
         * @private
         */
        open: function (oParentView) {
            this.load(oParentView).then(function (oDialog) {
                oDialog.getBinding("items").filter([]); // reset search filter
                oDialog.open();
            });
        },

        /**
         * Confirm button press handler: return the result to the caller.
         *
         * @param {sap.ui.base.Event} oEvent The event object.
         *
         * @private
         */
        onConfirm: function (oEvent) {
            var aContexts = oEvent.getParameter("selectedContexts");
            if (this._fnConfirm) {
                this._fnConfirm(aContexts.map(function (oContext) {
                    return oContext.getObject().id;
                }));
            }
            this._fnConfirm = null;
        },

        /**
         * Handle user search event.
         *
         * @param {sap.ui.base.Event} oEvent The event object.
         * @private
         */
        onSearch: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            var oFilter = new Filter([
                new Filter("id", FilterOperator.Contains, sValue),
                new Filter("title", FilterOperator.Contains, sValue)
            ]);
            oEvent.getSource().getBinding("items").filter([oFilter]);
        },

        /**
         * Select catalogs API.
         *
         * @param {sap.ui.core.mvc.View} oParentView The parent view (Page Editor).
         * @param {function} fnConfirm Callback function for the selection result.
         * Selection is returned as an array of selected catalog IDs.
         * @private
         */
        selectCatalogs: function (oParentView, fnConfirm) {
            this._fnConfirm = fnConfirm;
            this.open(oParentView);
        }
    });

    return new CatalogSelectorController();
});
