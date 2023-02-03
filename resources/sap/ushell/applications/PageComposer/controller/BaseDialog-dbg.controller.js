// Copyright (c) 2009-2020 SAP SE, All Rights Reserved

sap.ui.define([
    "sap/ui/core/library",
    "sap/base/util/merge",
    "./BaseController",
    "sap/ui/core/Fragment"
], function (
    coreLibrary,
    merge,
    BaseController,
    Fragment
) {
    "use strict";

    // shortcut for sap.ui.core.ValueState
    var ValueState = coreLibrary.ValueState;

    return BaseController.extend("sap.ushell.applications.PageComposer.controller.BaseDialog.controller", {
        /**
         * Destroys the control.
         *
         * @protected
         */
        destroy: function () {
            if (this._oView.byId(this.sViewId)) {
                this._oView.byId(this.sViewId).destroy();
            }
        },

        /**
         * Closes the dialog.
         *
         * @protected
         */
        onCancel: function () {
            this._oView.byId(this.sViewId).close();

            if (this._fnCancel) {
                this._fnCancel();
            }
        },

        /**
         * Attaches a confirm function which is called when dialog confirm button is pressed.
         *
         * @param {function} confirm The confirm function.
         * @protected
         */
        attachConfirm: function (confirm) {
            this._fnConfirm = confirm;
        },

        /**
         * Called when the user presses the confirm button.
         * Calls the attached confirm function if there is one.
         *
         * @param {sap.ui.base.Event} event The press event.
         * @protected
         */
        onConfirm: function (event) {
            if (this._fnConfirm) {
                this._fnConfirm(event);
            }
        },

        /**
         * Returns the model of this dialog instance.
         *
         * @returns {sap.ui.model.json.JSONModel} The JSONModel.
         * @protected
         */
        getModel: function () {
            return this._oModel;
        },

        /**
         * Returns "true" if all values of the given object are truthy.
         *
         * @param {object} validation The object whose properties values are booleans.
         * @returns {boolean} The validation result.
         * @private
         */
        validate: function (validation) {
            for (var i in validation) {
                if (!validation[i]) {
                    return false;
                }
            }
            return true;
        },

        /**
         * Attaches a cancel function which is called when dialog cancel button is pressed.
         *
         * @param {function} cancel The cancel function.
         * @protected
         */
        attachCancel: function (cancel) {
            this._fnCancel = cancel;
        },

        /**
         * Inserts the given component into the ComponentContainer control with id "transportContainer".
         *
         * @param {object} component The component to insert.
         * @protected
         */
        transportExtensionPoint: function (component) {
            this._oView.byId("transportContainer").setComponent(component);
        },

        /**
         * Loads the dialog fragment without displaying it.
         *
         * @returns {Promise<void>} Promise resolving when the fragment is loaded.
         * @protected
         */
        load: function () {
            var oFragmentLoadOptions = {
                id: this._oView.getId(),
                name: this.sId,
                controller: this
            };

            return Fragment.load(oFragmentLoadOptions).then(function (fragment) {
                fragment.setModel(this._oModel);
            }.bind(this));
        },

        /**
         * Shows the dialog.
         *
         * @protected
         */
        open: function () {
            var oDialog = this._oView.byId(this.sViewId);
            this._oView.addDependent(oDialog);

            oDialog.open();
        },

        /**
         * Pre-filters available packages by the page ID namespace.
         * If a namespace is detected in the page ID, it is then copied to the package input field if it is empty.
         * Does nothing if the package input field is not empty or if the dialog is not enhanced with transport information.
         *
         * @param {string} sPageID The page ID to check if it contains a namespace and extract it.
         * @param {boolean} [bFetchSuggestionOnly] If "true", will only fetch package suggestions;
         *   otherwise, will set the detected namespace into the package input field and trigger validations.
         */
        handlePackageNamespaceChange: function (sPageID, bFetchSuggestionOnly) {
            var oTransportComponent = this._oView.byId("transportContainer").getComponentInstance(),
                oPackageInput = oTransportComponent && oTransportComponent.getRootControl().byId("packageInput");
            if (oPackageInput && !oPackageInput.getValue().length) {
                var sPackageNamespace = sPageID.split("/"); sPackageNamespace.pop(); sPackageNamespace = sPackageNamespace.join("/");
                if (sPackageNamespace) {
                    if (bFetchSuggestionOnly) {
                        oPackageInput.fireLiveChange({ value: sPackageNamespace });
                    } else {
                        oPackageInput.setValue(sPackageNamespace);
                        oPackageInput.fireChange({ value: sPackageNamespace });
                    }
                }
            }
        },

        /**
         * Called on the live change event of the description field
         *
         * @param {sap.ui.base.Event} oEvent The livechange event
         */
        onDescriptionLiveChange: function (oEvent) {
            var oInput = oEvent.getSource(),
                oModel = this.getModel(),
                bIsValid = this.isValidTitleOrDescription(oInput.getValue().trim()),
                oValidation = merge({}, oModel.getProperty("/validation"), { description: bIsValid }),
                sValueState = bIsValid ? ValueState.None : ValueState.Error;
            oModel.setProperty("/validation", oValidation);
            oInput.setValueState(sValueState);
        },

        /**
         * Called on the live change event of the title field
         *
         * @param {sap.ui.base.Event} oEvent The livechange event
         */
        onTitleLiveChange: function (oEvent) {
            var oInput = oEvent.getSource(),
                oModel = this.getModel(),
                bIsValid = this.isValidTitleOrDescription(oInput.getValue().trim()),
                oValidation = merge({}, oModel.getProperty("/validation"), { title: bIsValid }),
                sValueState = bIsValid ? ValueState.None : ValueState.Error;
            oModel.setProperty("/validation", oValidation);
            oInput.setValueState(sValueState);
        },

        /**
         * Called on the live change of the page ID.
         *
         * @param {sap.ui.base.Event} oEvent The change event.
         * @private
         */
        onPageIDLiveChange: function (oEvent) {
            var oInput = oEvent.getSource(),
                oModel = this.getModel(),
                sInputValue = oInput.getValue(),
                bIsValid = this.isValidID(sInputValue),
                oValidation = merge({}, oModel.getProperty("/validation"), { id: bIsValid }),
                sValueState = bIsValid ? ValueState.None : ValueState.Error;
            oModel.setProperty("/validation", oValidation);
            oInput.setValueState(sValueState);
            if (sInputValue.length > 0) {
                oInput.setValueStateText(this._oResourceBundle.getText("Message.InvalidPageID"));
            } else {
                oInput.setValueStateText(this._oResourceBundle.getText("Message.EmptyPageID"));
            }
            this.handlePackageNamespaceChange(sInputValue, true);
        },

        /**
         * Check if transport is required by calling showTransport on the transport component.
         * In the CUST scenario, this will trigger a backend query to check if the ID namespace requires a transportId
         * and set the field to required / not required
         *
         * @param {string} id The page id
         */
        handleNameSpaceChange: function (id) {
            var oTransportComponent = this._oView.byId("transportContainer").getComponentInstance();
            if (!oTransportComponent) { return; }
            oTransportComponent.showTransport({
                id: id
            });
        },

        /**
         * Called on the change of the page ID.
         *
         * @param {sap.ui.base.Event} oEvent The change event.
         * @private
         */
        onPageIDChange: function (oEvent) {
            var sNewId = oEvent.getParameters().value;
            this.handlePackageNamespaceChange(sNewId, false);
            this.handleNameSpaceChange(sNewId);
        },

        /**
         * Returns "true" if the entered ID is valid, "false" otherwise.
         *
         * @param {string} id The ID to check its validity.
         * @returns {boolean} The result boolean.
         * @private
         */
        isValidID: function (id) {
            return /^[a-z_/]{1}[a-z0-9_/]{0,34}$/gi.test(id);
        },

        /**
         * Returns "true" if the entered text is a valid title or description, "false" otherwise.
         *
         * @param {string} text The text to check its validity.
         * @returns {boolean} The result boolean.
         * @private
         */
        isValidTitleOrDescription: function (text) {
            return !!text.length;
        }
    });
});
