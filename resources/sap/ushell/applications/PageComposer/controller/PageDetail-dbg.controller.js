// Copyright (c) 2009-2020 SAP SE, All Rights Reserved

sap.ui.define([
    "./BaseController",
    "./Page",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/base/strings/formatMessage"
], function (
    BaseController,
    Page,
    JSONModel,
    MessageToast,
    formatMessage
) {
    "use strict";

    /**
     * @typedef {object} ContentCatalogs Contains the titles of each catalog, the tiles of each catalog and a map of vizIds to catalog tiles
     * @property {string} catalogTitles The catalog titles
     * @property {string} catalogTiles The catalog tiles in a catalog
     * @property {string} mCatalogTiles A map from vizId to tile
     */

    return BaseController.extend("sap.ushell.applications.PageComposer.controller.PageDetail", {
        /**
         * Called when controller is initialized.
         *
         * @private
         */
        onInit: function () {
            var oRouter = this.getRouter();
            oRouter.getRoute("view").attachPatternMatched(this._onPageMatched, this);
            this.setModel(new JSONModel({
                page: {},
                editMode: false,
                transportSupported: this.getOwnerComponent().isTransportSupported()
            }));

            this.getView().addEventDelegate({
                onBeforeHide: this.onRouteLeave.bind(this)
            });

            this.Page.init(this);
        },

        /**
         * Called when page detail view is exited.
         *
         * @private
         */
        onExit: function () {
            BaseController.prototype.onExit.apply(this, arguments);
            this.Page.exit();
        },

        Page: Page,
        formatMessage: formatMessage,

        /**
         * Called if the route matched the pattern for viewing a page.
         * Loads the page with the id given in the URL parameter.
         *
         * @param {sap.ui.base.Event} event The routing event
         *
         * @private
         */
        _onPageMatched: function (event) {
            var oArguments = event.getParameter("arguments");
            var sPageID = decodeURIComponent(oArguments.pageId);

            this.getView().setBusy(true);
            this.getModel().setProperty("/page", {});
            this._loadPage(sPageID)
                .then(function (oPage) {
                    this.getModel().setProperty("/page", oPage);
                    this.Page.init(this);
                    if (!this.getModel().getProperty("/page/code")) {
                        this.getPageRepository().getRoles(sPageID)
                            .then(function (aRoles) {
                                var aRoleIDs = aRoles.map(function (oRole) { return oRole.id; });
                                this._resetRolesModel({ available: aRoleIDs });
                                this.Page.collectMessages();
                            }.bind(this));
                    }
                }.bind(this))
                .catch(function () {
                    this.navigateToErrorPage(sPageID);
                }.bind(this))
                .finally(function () {
                    this.getView().setBusy(false);
                }.bind(this));
        },

        /**
         * Navigates to the page detail page
         *
         * @param {string} pageId The pageId to navigate to
         *
         * @private
         */
        _navigateToEdit: function (pageId) {
            this.getRouter().navTo("edit", {
                pageId: encodeURIComponent(pageId)
            });
        },

        /**
         * Called if the delete action has been confirmed
         *
         * @param {sap.ui.base.Event} oEvent The deletePage event
         * @returns {Promise<void>} A promise resolving when the page has been deleted
         *
         * @private
         */
        _deletePage: function (oEvent) {
            var oDialog = oEvent.getSource().getParent(),
                sTransportId = oEvent.transportId || "",
                sPageToDeleteId = this.getModel().getProperty("/page/id"),
                sSuccessMsg = this.getResourceBundle().getText("Message.SuccessDeletePage");

            return this.getPageRepository().deletePage(sPageToDeleteId, sTransportId)
                .then(function () {
                    this.navigateBack();
                    MessageToast.show(sSuccessMsg, { closeOnBrowserNavigation: false });
                    oDialog.close();
                }.bind(this))
                .catch(this.handleBackendError.bind(this));
        },

        /**
         * Called if the Edit button is clicked.
         * Loads the edit route
         *
         * @private
         */
        onEdit: function () {
            this._navigateToEdit(this.getModel().getProperty("/page/id"));
        },

        /**
         * Called if the delete button is clicked
         * Shows the Delete Dialog
         *
         * @private
         */
        onDelete: function () {
            var oPage = this.getModel().getProperty("/page");
            this.checkShowDeleteDialog(oPage, this._deletePage.bind(this));
        },

        /**
         * Called if the copy button is clicked
         * Copies the page and redirects to the new copy
         *
         * @private
         */
        onCopy: function () {
            var oPage = this.getModel().getProperty("/page");
            this.showCopyDialog(oPage, function (pageInfo) {
                sap.ushell.Container.getServiceAsync("PageReferencing")
                    .then(function (PageReferencing) {
                        return PageReferencing.createReferencePage(pageInfo);
                    })
                    .then(function (oReferencePage) {
                        return this.getPageRepository().copyPage(oReferencePage);
                    }.bind(this))
                    .then(function () {
                        this._navigateToEdit(pageInfo.targetId);
                        MessageToast.show(this.getResourceBundle().getText("Message.PageCreated"), {
                            closeOnBrowserNavigation: false
                        });
                    }.bind(this))
                    .catch(this.handleBackendError.bind(this));
            }.bind(this));
        },

        /**
         * Called when the error message icon is clicked to display more detailed error message.
         *
         * @private
         */
        onErrorMessageClicked: function () {
            var oPage = this.getModel().getProperty("/page");
            var sErrorMessageDetails = this.formatAssignmentDetailsMessage(oPage.code);
            this.showMessageBoxWarning(
                oPage.message,
                sErrorMessageDetails,
                false
            );
        }
    });
});
