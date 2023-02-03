// Copyright (c) 2009-2020 SAP SE, All Rights Reserved

sap.ui.define([
    "sap/m/MessagePopover",
    "sap/m/MessageItem",
    "./BaseController",
    "./Page",
    "./TileSelector",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/base/Log",
    "./ConfirmChangesDialog.controller"
], function (
    MessagePopover,
    MessageItem,
    BaseController,
    Page,
    TileSelector,
    Fragment,
    JSONModel,
    MessageBox,
    MessageToast,
    Log,
    ConfirmChangesDialog
) {
    "use strict";

    /**
     * Convenience method to reset the page model
     *
     * @param {object} model Page model to be initialized
     * @property {object} model.page Page of the model
     * @property {boolean} model.edit Whether the page is in edit mode
     * @property {array} model.errors The errors on the page
     * @property {array} model.warnings The warnings on the page
     * @property {array} model.messages The combined errors and warnings on the page
     * @property {boolean} model.headerExpanded Whether the page header is expanded
     *
     * @private
     */
    function _resetModelData (model) {
        model.setData({
            page: {},
            edit: false,
            dirtyPage: false,
            errors: [],
            warnings: [],
            messages: [],
            headerExpanded: true,
            catalogsExpanded: true
        });
    }

    var oModel = new JSONModel();

    var Controller = BaseController.extend("sap.ushell.applications.PageComposer.controller.PageDetailEdit", {
        _setDirtyFlag: function (bValue) {
            sap.ushell.Container.setDirtyFlag(bValue);
            oModel.setProperty("/dirtyPage", bValue);
        },

        /**
         * Called when controller is initialized.
         *
         * @private
         */
        onInit: function () {
            var oLayoutContent = this.getView().byId("layoutContent"),
                oToggleCatalogsButton = this.getView().byId("toggleCatalogsButton"),
                oRouter = this.getRouter();
            oRouter.getRoute("edit").attachPatternMatched(this._onPageMatched, this);
            this.setModel(oModel);

            this.Page.init(this);

            this.getView().addEventDelegate({
                onBeforeHide: this.onRouteLeave.bind(this)
            });

            oLayoutContent.attachBreakpointChanged(function (oEvent) {
                // hides the "toggleCatalogsButton" when the TileSelector has not enough space to be rendered
                oToggleCatalogsButton.setVisible(oEvent.getParameters().currentBreakpoint !== "S");
            });
        },

        /**
         * Called when exiting the page detail view.
         *
         * @private
         */
        onExit: function () {
            BaseController.prototype.onExit.apply(this, arguments);
            this.Page.exit();
        },

        Page: Page,
        TileSelector: new TileSelector(),
        oMessagePopover: new MessagePopover("layoutMessagePopover", {
            items: {
                path: "/messages",
                template: new MessageItem({
                    type: "{type}",
                    title: "{title}",
                    activeTitle: "{active}",
                    description: "{description}",
                    subtitle: "{subTitle}",
                    counter: "{counter}"
                })
            },
            beforeOpen: function () { this.addStyleClass("sapUshellMessagePopoverNoResize"); }
        }).setModel(oModel),

        /**
         * Handles the message popover press in the footer bar.
         *
         * @param {sap.ui.base.Event} oEvent The press event.
         *
         * @private
         */
        handleMessagePopoverPress: function (oEvent) {
            this.oMessagePopover.toggle(oEvent.getSource());
        },

        /**
         * Called if the show/hide catalogs button is called.
         * Used to show or hide the side content.
         *
         * @private
         */
        onUpdateSideContentVisibility: function () {
            oModel.setProperty("/catalogsExpanded", !oModel.getProperty("/catalogsExpanded"));
        },

        /**
         * Handles error messages retrieved when trying to save a page.
         * It either opens the ConfirmChangesDialog or shows a MessageBoxError.
         * Additionally, it sets the dirty flag to true
         *
         * @param {object} simpleError An object containing error information.
         * @property {string} simpleError.message The error message.
         * @property {int} simpleError.statusCode The status code.
         * @property {string} simpleError.statusText The status text.
         * @param {string} [modifiedBy=undefined] The name of the person who modified the page last.
         * If not given, the name from the page model will be read out and used.
         *
         * @private
         */
        _handlePageSaveError: function (simpleError, modifiedBy) {
            if (simpleError.statusCode === "412" || simpleError.statusCode === "400") {
                this._showConfirmChangesDialog(simpleError, modifiedBy);
            } else {
                this.showMessageBoxError(simpleError.message, false);
            }
            this._setDirtyFlag(true);
        },

        /**
         * Called if the save button is pressed.
         * MessageToast will confirm that the changes have been successfully saved
         *
         * @private
         */
        onSave: function () {
            var oResourceBundle = this.getResourceBundle(),
                fnSave = function (sClickedAction) {
                    if (sClickedAction === MessageBox.Action.OK) {
                        this._setDirtyFlag(false); // Disable the Save button immediately to prohibit users pressing it twice
                        this.getView().setBusy(true);
                        this.savePageAndUpdateModel(oModel.getProperty("/page"))
                            .then(function () {
                                MessageToast.show(oResourceBundle.getText("Message.SavedChanges"), { closeOnBrowserNavigation: false });
                                this._setDirtyFlag(false); // Disable save button (again) in case the page was reloaded
                            }.bind(this))
                            .catch(function (oSimpleError) {
                                this.getPageRepository().getPageWithoutStoringETag(oModel.getProperty("/page/id"))
                                    .then(function (reloadedPage) {
                                        this._handlePageSaveError(
                                            oSimpleError,
                                            reloadedPage.modifiedByFullname || reloadedPage.modifiedBy
                                        );
                                    }.bind(this))
                                    .catch(function () {
                                        this._handlePageSaveError(oSimpleError);
                                    }.bind(this));
                            }.bind(this))
                            .finally(function () {
                                this.getView().setBusy(false);
                            }.bind(this));
                    }
                }.bind(this);

            if (!oModel.getProperty("/page/title")) {
                this.showMessageBoxError(oResourceBundle.getText("Message.EmptyTitle"));
                oModel.setProperty("/headerExpanded", true);
                return;
            }

            if (!window.navigator.onLine) {
                this.showMessageBoxError(oResourceBundle.getText("Message.NoInternetConnection"));
                return;
            }

            if (oModel.getProperty("/errors").length > 0) {
                var sTitle = oResourceBundle.getText("Title.TilesHaveErrors"),
                    sMessage = oResourceBundle.getText("Message.TilesHaveErrors");
                sap.ushell.Container.getService("Message").confirm(sMessage, fnSave, sTitle);
                return;
            }

            fnSave(MessageBox.Action.OK);
        },

        _showConfirmChangesDialog: function (oSimpleError, sModifiedByName) {
            if (!this.byId("confirmChangesDialog")) {
                Fragment.load({
                    name: "sap.ushell.applications.PageComposer.view.ConfirmChangesDialog",
                    controller: new ConfirmChangesDialog(this.getView(), this.getResourceBundle())
                }).then(function (oDialog) {
                    if (oSimpleError.statusCode === "412") {
                        var oConfirmChangesModifiedByText = sap.ui.getCore().byId("confirmChangesModifiedByText");
                        oConfirmChangesModifiedByText.setVisible(true);
                    }
                    var sModifiedBy = sModifiedByName || this.getModel().getProperty("/page/modifiedByFullname");
                    this.getModel().setProperty("/simpleError", {
                        message: oSimpleError.message,
                        statusCode: oSimpleError.statusCode,
                        modifiedBy: sModifiedBy
                    });
                    this.getView().addDependent(oDialog);
                    oDialog.open();
                }.bind(this));
            } else {
                this.byId("confirmChangesDialog").open();
            }
        },

        /**
         * Called if the cancel button is pressed.
         * Navigates to the page overview without saving changes.
         *
         * @private
         */
        onCancel: function () {
            this.navigateBack();
        },

        /**
         * Intended to be called by the view for handling "open tile info" events.
         *
         * @param {sap.ui.base.Event} oEvent The event object.
         */
        onOpenTileInfo: function (oEvent) {
            var oEventSource = oEvent.getSource();
            this._openTileInfoPopover(oEventSource, oEventSource.getBindingContext());
        },

        /**
         * Shows the ContextSelector dialog.
         *
         * @param {function} onConfirm The function executed when confirming the selection.
         * @protected
         */
        showContextSelector: function (onConfirm) {
            sap.ui.require([
                "sap/ushell/applications/PageComposer/controller/ContextSelector.controller"
            ], function (ContextSelector) {
                var sPageId = this.getModel().getProperty("/page/id");
                this.getPageRepository().getRoles(sPageId)
                    .then(function (roles) {
                        if (!this.oContextSelectorController) {
                            this.oContextSelectorController = new ContextSelector(this.getRootView(), this.getResourceBundle());
                        }
                        var aSelectedRoles = this.getModel("roles").getProperty("/selected");
                        this.oContextSelectorController.openSelector(roles, aSelectedRoles, onConfirm)
                            .catch(function (error) {
                                this.oContextSelectorController.destroy();
                                this.handleBackendError(error);
                            }.bind(this));
                    }.bind(this))
                    .catch(function (sErrorMsg) {
                        this.showMessageBoxError(sErrorMsg, false);
                    }.bind(this));
            }.bind(this));
        },

        /**
         * Opens a dialog to select the role context for the page/space.
         *
         * @private
         */
        onOpenContextSelector: function () {
            this.showContextSelector(function (oSelectedRolesInfo) {
                this._resetRolesModel(oSelectedRolesInfo);
                this.collectPageMessages();
                this.TileSelector.refreshRoleContext();
            }.bind(this));
        },

        /**
         * Formatter used for extracting the "length" property of an object.
         *
         * @param {object} object The object to have its "length" property retrieved from.
         * @returns {*} The "length" property of the object parameter or "undefined" if the object is falsy.
         * @private
         */
        _formatLength: function (object) {
            return (object ? object.length : undefined);
        },

        /**
         * Set the new transportId to the page object
         *
         * @param {sap.ui.base.Event} event The object containing the metadata
         *
         * @private
         */
        _updatePageWithMetadata: function (event) {
            if (event && event.transportId) {
                oModel.setProperty("/page/transportId", event.transportId);
                this._setDirtyFlag(true);
            }
        },

        /**
         * - Loads the page data
         * - checks if user is allowed to edit the page
         * - initializes the page editor control
         *
         * @param {string} sPageId The id of the page to load
         * @returns {Promise<undefined>} A promise resolving when the page editor has been initialized
         * @private
         */
        _loadAndInitPage: function (sPageId) {
            return this._loadPage(sPageId).then(function (oPage) {
                this._pageEditAllowed(oPage).then(function (editAllowed) {
                    if (!editAllowed) {
                        return;
                    }

                    oModel.setProperty("/page", oPage);
                    oModel.setProperty("/edit", true);

                    this.checkShowEditDialog(
                        oPage,
                        this._updatePageWithMetadata.bind(this),
                        this.navigateBack.bind(this)
                    );

                    this.Page.init(this);

                    if (!oModel.getProperty("/page/sections").length) {
                        this.Page.addSection();
                    } else {
                        this._setDirtyFlag(false);
                    }
                }.bind(this));
            }.bind(this));
        },

        /**
         * Called if the route matched the pattern for editing a page.
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
            _resetModelData(oModel);
            this._loadAndInitPage(sPageID)
                .then(function () { return this.getPageRepository().getRoles(sPageID); }.bind(this))
                .then(function (aRoles) {
                    var aRoleIDs = aRoles.map(function (oRole) { return oRole.id; });
                    this._resetRolesModel({ available: aRoleIDs });
                    this.TileSelector.init(this);
                    this.TileSelector.initTiles();
                    this.TileSelector.setAddTileHandler(this.addVisualizationToSection.bind(this));
                    this.collectPageMessages();
                }.bind(this))
                .catch(function () {
                    this.navigateToErrorPage(sPageID);
                }.bind(this))
                .finally(function () {
                    this.getView().setBusy(false);
                }.bind(this));
        },

        /**
         * Checks if the user is allowed to edit the page.
         *
         * @param {object} page The page to edit.
         * @returns {Promise<boolean>} A promise which resolves to true/false depending on if editing is allowed for the user.
         * @private
         */
        _pageEditAllowed: function (page) {
            var bEditAllowed = !this.checkMasterLanguageMismatch(page);
            return Promise.resolve(bEditAllowed);
        },

        /**
         * Saves the page object to the backend using the PagePersistence service and updates the local model with the backend response.
         * Updating the local model with the backend response allows access to the most recent information. This is relevant for example
         * for updating the displayed "Changed By" and "Changed On" properties without having to reload.
         *
         * @param {object} page The page object to save
         * @returns {Promise<undefined>} A promise
         *
         * @private
         */
        savePageAndUpdateModel: function (page) {
            return this.getPageRepository().updatePage(page).then(function (oResponsePage) {
                oModel.setProperty("/page", oResponsePage);
            });
        },

        /**
         * Collects errors and warnings that occurred on the page.
         *
         * @private
         */
        collectPageMessages: function () {
            var oMessages = this.Page.collectMessages(),
                aErrors = oMessages.errors,
                aWarnings = oMessages.warnings,
                aMessages = aErrors.concat(aWarnings);

            oModel.setProperty("/errors", aErrors);
            oModel.setProperty("/warnings", aWarnings);
            oModel.setProperty("/messages", aMessages);
        },
        /**
        * On section title is changed.
        *
        * @private
        */
        onSectionTitleChange: function () {
            this._setDirtyFlag(true);
            this.collectPageMessages();
        },

        /* Section - Model API */

        /**
         * Adds a section to the model at the given index.
         *
         * @param {int} sectionIndex The index of where to add the section in the array
         *
         * @protected
         */
        addSectionAt: function (sectionIndex) {
            var aSections = this.getModel().getProperty("/page/sections");
            if (!aSections) {
                Log.warning("The Model is not ready yet.");
                return;
            }

            if ((!sectionIndex && sectionIndex !== 0) || sectionIndex > aSections.length) {
                sectionIndex = aSections.length;
            }
            aSections.splice(sectionIndex, 0, {
                title: "",
                viz: []
            });

            this.getModel().setProperty("/page/sections", aSections);

            var oPage = this.getView().byId("page");

            if (sectionIndex === aSections.length - 1) {
                var oDelegate = {
                    onAfterRendering: function () {
                        setTimeout(function () {
                            oPage.getSections()[sectionIndex].byId("title-edit").focus();
                        }, 0);
                        oPage.removeEventDelegate(oDelegate);
                    }
                };
                oPage.addEventDelegate(oDelegate);
            } else {
                oPage.getSections()[sectionIndex].byId("title-edit").focus();
            }

            this.collectPageMessages();
            this._setDirtyFlag(true);
        },

        /**
         * Handles the deletion of a section using and updating the model
         *
         * @param {int} sectionIndex The index of the section, that should be deleted
         *
         * @protected
         */
        deleteSection: function (sectionIndex) {
            if ((!sectionIndex && sectionIndex !== 0) || sectionIndex < 0) {
                return;
            }

            var aSections = this.getModel().getProperty("/page/sections");

            if (sectionIndex < aSections.length) {
                aSections.splice(sectionIndex, 1);
                this.getModel().setProperty("/page/sections", aSections);

                MessageToast.show(this.getResourceBundle().getText("Message.SectionDeleted"));

                var oPage = this.getView().byId("page"),
                    aPageSections = oPage.getSections();

                if (aSections.length) {
                    aPageSections = oPage.getDomRef().getElementsByClassName("sapUshellPageSection");
                    aPageSections[sectionIndex !== 0 ? sectionIndex - 1 : sectionIndex].focus();
                } else {
                    var oDelegate = {
                        onAfterRendering: function () {
                            oPage.focus();
                            oPage.removeEventDelegate(oDelegate);
                        }
                    };
                    oPage.addEventDelegate(oDelegate);
                }

                this.collectPageMessages();
                this._setDirtyFlag(true);
            }
        },

        /**
         * Handles the moving of a section using and updating the model
         *
         * @param {int} originalSectionIndex The old index of the section, that should be moved
         * @param {int} newSectionIndex The new index of the section, that should be moved
         *
         * @protected
         */
        moveSection: function (originalSectionIndex, newSectionIndex) {
            if (!originalSectionIndex && originalSectionIndex !== 0
                || !newSectionIndex && newSectionIndex !== 0) {
                return;
            }

            var aSections = oModel.getProperty("/page/sections"),
                oSectionToBeMoved = aSections.splice(originalSectionIndex, 1)[0];

            aSections.splice(newSectionIndex, 0, oSectionToBeMoved);
            oModel.setProperty("/page/sections", aSections);
            this.collectPageMessages();
            this._setDirtyFlag(true);
        },

        /* Visualization - Model API */

        /**
         * Handles the addition of a visualization to a section using and updating the model
         *
         * @param {string} visualizationData The visualization data of the visualization being added.
         * @param {int[]} sectionIndices The indices of sections where the content should be added to.
         * @param {int} [visualizationIndex] The index within the section where the visualization should be added at.
         *   If not provided, the visualization will be added at the end of the section.
         *
         * @protected
         */
        addVisualizationToSection: function (visualizationData, sectionIndices, visualizationIndex) {
            if (!visualizationData || !sectionIndices.length) {
                return;
            }

            sectionIndices.forEach(function (iSectionIndex) {
                var aVisualizations = oModel.getProperty("/page/sections/" + iSectionIndex + "/viz");
                if (!aVisualizations) {
                    Log.warning("The Model is not ready yet.");
                    return;
                }

                if (typeof visualizationIndex === "undefined") {
                    visualizationIndex = aVisualizations.length;
                }

                aVisualizations.splice(visualizationIndex, 0, visualizationData);
                oModel.setProperty("/page/sections/" + iSectionIndex + "/viz", aVisualizations);
                this.collectPageMessages();
                this._setDirtyFlag(true);
            }.bind(this));
        },

        /**
         * Handles the deletion of a visualization inside a section using and updating the model
         *
         * @param {int} visualizationIndex The index of the visualization, that should be deleted
         * @param {int} sectionIndex The index of the section, the visualization is in
         *
         * @protected
         */
        deleteVisualizationInSection: function (visualizationIndex, sectionIndex) {
            var sPath = "/page/sections/" + sectionIndex + "/viz",
                aVisualizations = oModel.getProperty(sPath);
            aVisualizations.splice(visualizationIndex, 1);
            oModel.setProperty(sPath, aVisualizations);
            MessageToast.show(this.getResourceBundle().getText("Message.VisualizationDeleted"));
            this.collectPageMessages();
            this._setDirtyFlag(true);
        },

        /**
         * Handles the movement of a visualization inside a section and between different sections,
         * using and updating the model
         *
         * @param {int} originalVisualizationIndex The old index, where the visualization was from
         * @param {int} newVisualizationIndex The new index, where the visualization should go
         * @param {int} originalSectionIndex The index of the section, the visualization was in
         * @param {int} newSectionIndex The index of the section, where the visualization should be added
         *
         * @protected
         */
        moveVisualizationInSection: function (originalVisualizationIndex, newVisualizationIndex, originalSectionIndex, newSectionIndex) {
            if (!originalVisualizationIndex && originalVisualizationIndex !== 0
                || !newVisualizationIndex && newVisualizationIndex !== 0
                || !originalSectionIndex && originalSectionIndex !== 0
                || !newSectionIndex && newSectionIndex !== 0) {
                return;
            }

            var sOriginalVisualizationPath = "/page/sections/" + originalSectionIndex + "/viz",
                sNewVisualizationPath = "/page/sections/" + newSectionIndex + "/viz",
                aOriginalVisualizations = oModel.getProperty(sOriginalVisualizationPath),
                aNewVisualizations = oModel.getProperty(sNewVisualizationPath),
                oContent = aOriginalVisualizations.splice(originalVisualizationIndex, 1);

            aNewVisualizations.splice(newVisualizationIndex, 0, oContent[0]);
            oModel.setProperty(sOriginalVisualizationPath, aOriginalVisualizations);
            oModel.setProperty(sNewVisualizationPath, aNewVisualizations);
            this.collectPageMessages();
            this._setDirtyFlag(true);
        },

        /**
         * Instantiates and opens the dialog for editing the header
         */
        openEditPageHeaderDialog: function () {
            sap.ui.require([
                "sap/ushell/applications/PageComposer/controller/EditPageHeaderDialog.controller"
            ], function (EditPageHeaderDialogController) {
                if (!this.oEditPageHeaderDialogController) {
                    this.oEditPageHeaderDialogController = new EditPageHeaderDialogController(this.getRootView());
                }
                this.oEditPageHeaderDialogController.attachConfirm(this.editPageHeaderConfirm.bind(this));
                this.oEditPageHeaderDialogController.load().then(function () {
                    this.oEditPageHeaderDialogController.open();
                    this.oEditPageHeaderDialogController.getModel().setProperty("/id", oModel.getProperty("/page/id"));
                    this.oEditPageHeaderDialogController.getModel().setProperty("/title", oModel.getProperty("/page/title"));
                    this.oEditPageHeaderDialogController.getModel().setProperty("/description", oModel.getProperty("/page/description"));
                    this.oEditPageHeaderDialogController.initialTitleValidation();
                }.bind(this));
            }.bind(this));
        },

        /**
         * Persists the values from the Edit Page Header Dialog box
         * @param {object} oResults gets the changed values from the Edit Page header dialog
         */
        editPageHeaderConfirm: function (oResults) {
            if (oModel.getProperty("/page/title") !== oResults.title) {
                oModel.setProperty("/page/title", oResults.title);
            }
            if (oModel.getProperty("/page/description") !== oResults.description) {
                oModel.setProperty("/page/description", oResults.description || "");
            }
            this._setDirtyFlag(true);
        },

        /**
         * Checks if the page has error messages.
         * Shows error message box when the page has errors and navigates to page overview.
         *
         * @param {object} oPage The page to check
         * @return {boolean} The result - true if there are errors, false if there is none
         * @private
         */
        _checkPageHasErrors: function (oPage) {
            if (oPage.code !== "") {
                var sErrorMessageDetails = this.formatAssignmentDetailsMessage(oPage.code);
                this.showMessageBoxWarning(oPage.message, sErrorMessageDetails, true);
                return true;
            }
            return false;
        }
    });

    return Controller;
});
