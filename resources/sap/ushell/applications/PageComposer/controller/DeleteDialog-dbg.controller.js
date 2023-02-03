// Copyright (c) 2009-2020 SAP SE, All Rights Reserved

sap.ui.define([
    "sap/base/strings/formatMessage",
    "./BaseDialog.controller",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel"
], function (
    formatMessage,
    BaseDialogController,
    Fragment,
    JSONModel
) {
    "use strict";

    return BaseDialogController.extend("sap.ushell.applications.PageComposer.controller.DeleteDialog.controller", {
        constructor: function (oView) {
            this._oView = oView;
            this._createOrResetModel();

            this.sViewId = "deletePageDialog";
            this.sId = "sap.ushell.applications.PageComposer.view.DeleteDialog";
        },
        /**
         * Create model or reset if it doesn't exist.
         *
         * @private
         */
        _createOrResetModel: function () {
            if (!this._oModel) {
                this._oModel = new JSONModel();
            }
            this._oModel.setData({
                title: "",
                message: "",
                validation: {}
            });
        },
        /**
         * Destroys the control
         *
         * @private
         */
        destroy: function () {
            this._createOrResetModel();
            BaseDialogController.prototype.destroy.apply(this, arguments);
        }
    });
});