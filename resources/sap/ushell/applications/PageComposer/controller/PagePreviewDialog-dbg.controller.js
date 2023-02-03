// Copyright (c) 2009-2020 SAP SE, All Rights Reserved

sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ushell/Config"
], function (
    Controller,
    Fragment,
    JSONModel,
    Filter,
    Config
) {
    "use strict";

    var _oDialog,
        _oParentView,
        _sAllText = "";

    /**
     * Show only visualizations that are selected in the current role scope.
     * If the scope is not set, all visualizations are shown.
     * Array of available visualization IDs is provided by the scope selector in the "roles" model.
     *
     * @private
     */
    function _filterRoles () {
        var aAvailableIds,
            oFilter = new Filter({
                path: "vizId",
                caseSensitive: true,
                test: function (vizId) {
                    return !aAvailableIds || aAvailableIds.indexOf(vizId) >= 0;
                }
            }),
            oPage = _oDialog && _oDialog.getContent()[0];
        if (oPage) {
            var aRoles = _oDialog.getModel("roleContext").getProperty("/selectedRoles") || [];
            aAvailableIds = _oParentView.getController().getPageRepository().getVizIds(aRoles);
            oPage.getSections().forEach(function (oSection) {
                oSection.getBinding("visualizations").filter(oFilter);
            });
        }
    }

    /**
     * Sets the given role context for the page preview.
     *
     * @param {string[]} aRoles Array of role IDs that are assigned to the page.
     * @param {string[]} aSelectedRoles Array of role IDs that are currently selected for display.
     * @private
     */
    function _setRoleContext (aRoles, aSelectedRoles) {
        if (_oDialog) {
            var oModel = _oDialog.getModel("roleContext");
            aSelectedRoles = aSelectedRoles || oModel.getProperty("/selectedRoles") || [];
            aRoles = aRoles || oModel.getProperty("/allRoles") || [];

            var bAllSelected = !aSelectedRoles.length || aSelectedRoles.length === aRoles.length,
                sSelectedCountText = bAllSelected ? _sAllText : aSelectedRoles.length || "";

            oModel.setData({
                allRoles: aRoles,
                selectedRoles: aSelectedRoles,
                selectedCountText: sSelectedCountText
            });
            if (aRoles.length) {
                _filterRoles(); // filter visualizations according to the currently selected scope
            }
        }
    }

    var PagePreviewDialogController = Controller.extend("sap.ushell.applications.PageComposer.controller.PagePreviewDialog.controller", {
        /**
         * Load the UI of the page preview dialog.
         *
         * @param {string} sParentId The ID of the parent view.
         * @returns {Promise} The dialog instance.
         *
         * @private
         */
        load: function (sParentId) {
            return _oDialog ? Promise.resolve(_oDialog) : Fragment.load({
                id: sParentId,
                name: "sap.ushell.applications.PageComposer.view.PagePreviewDialog",
                controller: this
            });
        },

        /**
         * Opens the page preview dialog.
         *
         * @param {object} oParentView The parent view (detail or edit page).
         * @private
         */
        open: function (oParentView) {
            _oParentView = oParentView;
            var sPageId = oParentView.getModel().getProperty("/page/id");
            _sAllText = oParentView.getController().getResourceBundle().getText("Message.AllRolesSelected");

            this.load(oParentView.getId()).then(function (oDialog) {
                _oDialog = oDialog;
                _oDialog._oParentView = _oParentView; // for OPA
                oParentView.addDependent(oDialog);

                oDialog.setModel(new JSONModel({
                    sizeBehavior: Config.last("/core/home/sizeBehavior")
                }), "viewSettings");

                var oParentRolesModel = oParentView.getModel("roles"),
                    oParentData = oParentRolesModel && oParentRolesModel.getData() || {},
                    sSelectedCountText = oParentData.selectedCountText || _sAllText,
                    aSelectedRoles = oParentData.selected || [],
                    oRolesModel = new JSONModel({
                        allRoles: [],
                        selectedRoles: aSelectedRoles,
                        selectedCountText: sSelectedCountText
                    });
                oDialog.setModel(oRolesModel, "roleContext");
                oDialog.open();

                oParentView.getController().getPageRepository().getRoles(sPageId).then(function (aRoles) {
                    _setRoleContext(aRoles, null);
                });
            });
        },

        /**
         * Closes the page preview dialog.
         *
         * @private
         */
        close: function () {
            if (_oDialog) {
                _oDialog.close();
            }
        },

        /**
         * Clean up everything after close.
         *
         * @private
         */
        onAfterClose: function () {
            if (_oDialog) {
                _oDialog.destroy();
                _oDialog = null;
            }

            if (this.oContextSelectorController) {
                this.oContextSelectorController.destroy();
                this.oContextSelectorController = null;
            }
        },

        /**
         * Event handler for the scope selector.
         *
         * @param {object} oSelectedRolesInfo selected scope.
         * @private
         */
        onRolesSelected: function (oSelectedRolesInfo) {
            _setRoleContext(null, oSelectedRolesInfo.selected);
        },

        /**
         * Opens a dialog to select the role context for the page/space.
         *
         * @private
         */
        onOpenContextSelector: function () {
            sap.ui.require([
                "sap/ushell/applications/PageComposer/controller/ContextSelector.controller"
            ], function (ContextSelector) {
                if (!this.oContextSelectorController) {
                    var oParentController = _oParentView.getController();
                    this.oContextSelectorController = new ContextSelector(
                        oParentController.getRootView(),
                        oParentController.getResourceBundle());
                }
                var oModel = _oDialog.getModel("roleContext"),
                    aSelectedRoles = oModel.getProperty("/selectedRoles"),
                    aAllRoles = oModel.getProperty("/allRoles");
                this.oContextSelectorController.openSelector(aAllRoles, aSelectedRoles, this.onRolesSelected);
            }.bind(this));
        }
    });

    return new PagePreviewDialogController();
});
