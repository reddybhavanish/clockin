// Copyright (c) 2009-2020 SAP SE, All Rights Reserved

sap.ui.define([], function () {
    "use strict";

    /**
     * @constructor
     */
    var TransportHelper = function () {};

    /**
     * Returns a function to call when the transport information is changed
     * The returned function adds the transport validation to the given dialog's model
     *
     * @param {sap.ushell.applications.PageComposer.controller.CreatePageDialog} oDialog The dialog controller
     * @returns {function} The change handler function
     *
     * @private
     */
    TransportHelper.prototype._changeHandler = function (oDialog) {
        return function (event) {
            var oModel = oDialog.getModel();
            var oValidation = jQuery.extend({}, oModel.getProperty("/validation"), {
                transport: event && event.getParameter("valid")
            });
            oModel.setProperty("/validation", oValidation);
        };
    };

    /**
     * Adds the transportComponent to the extension point and adds the relevant handlers.
     *
     * @param {sap.ushell.applications.PageComposer.controller.CreatePageDialog} dialog The dialog controller
     * @param {object} transportComponent The component with the transport fields
     * @param {function} onConfirm The confirm function
     * @returns {sap.ushell.applications.PageComposer.controller.CreatePageDialog} The enhanced dialog
     *
     * @protected
     */
    TransportHelper.prototype.enhanceDialogWithTransport = function (dialog, transportComponent, onConfirm) {
        var fnChangeHandler = this._changeHandler(dialog);
        fnChangeHandler(false);
        var fnConfirmHandler = function (pageInfo) {
            var oPageInfo = transportComponent.decorateResultWithTransportInformation(pageInfo);
            onConfirm(oPageInfo);
        };
        transportComponent.attachChange(fnChangeHandler);
        dialog.attachConfirm(fnConfirmHandler);
        dialog.transportExtensionPoint(transportComponent);

        return dialog;
    };

    return TransportHelper;
});