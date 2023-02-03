// Copyright (c) 2009-2020 SAP SE, All Rights Reserved

/**
 * @fileOverview Controller of the PageOverview fragment.
 */
sap.ui.define([
    "./BaseController",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (
    BaseController,
    MessageToast,
    JSONModel,
    Filter,
    FilterOperator
) {
    "use strict";

    /**
     * @typedef {object} ButtonStateModel The model for the button states (e.g. delete button)
     * @property {boolean} isDeleteAndCopyEnabled Whether the delete and copy buttons are enabled
     */

    return BaseController.extend("sap.ushell.applications.PageComposer.controller.Main", {
        aPropertiesToFilterCustomerCreated: [ // used for the SearchField in the headerToolbar
            "id",
            "title",
            "description",
            "createdByFullname",
            "modifiedByFullname",
            "BusinessRoleId",
            "BusinessRole"
        ],
        aPropertiesToFilterSapDelivered: [ // used for the SearchField in the headerToolbar
            "id",
            "title",
            "description"
        ],

        oDialogFactory: null,
        sCurrentTableId: "customerCreatedTable",
        aPropertiesToFilter: [],
        aSearchFilter: [],
        mViewSettingsFilters: [],

        /**
         * Called when controller is initialized.
         *
         * @private
         */
        onInit: function () {
            this.setModel(new JSONModel({
                busy: false,
                pages: [],
                transportSupported: this.getOwnerComponent().isTransportSupported()
            }));
            this.getRouter().getRoute("overview").attachPatternMatched(this._onPageOverviewMatched, this);
            this.setModel(this._createInitialButtonStateModel(), "buttonStates");
            this.aPropertiesToFilter = this.aPropertiesToFilterCustomerCreated;
        },

        /**
         * Called if a list item in the pageOverview table is pressed.
         *
         * @param {sap.ui.base.Event} oEvent The press event
         *
         * @private
         */
        onItemPress: function (oEvent) {
            var oPage = this.getPageInTable(oEvent.getParameter("listItem"));
            this._navigateToDetail(oPage.id);
        },

        /**
         * Called if the route is entered. Refreshes the model.
         *
         * @private
         */
        _onPageOverviewMatched: function () {
            this._refreshModel();
        },

        /**
         * Navigates to the page edit page.
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
         * Navigates to the page detail page
         *
         * @param {string} pageId The page ID to navigate to
         *
         * @private
         */
        _navigateToDetail: function (pageId) {
            this.getRouter().navTo("view", {
                pageId: encodeURIComponent(pageId)
            });
        },

        /**
         * Called if a list item in the pageOverview table is selected
         * Sets the state of the Delete button and Copy button to enabled.
         *
         * @param {sap.ui.base.Event} oEvent The select event
         *
         * @private
         */
        onSelectionChange: function (oEvent) {
            this._setDeleteAndCopyButtonEnabled(true);
        },

        onTabChange: function (oEvent) {
            var sSelectedTabKey = this.byId("iconTabBar").getProperty("selectedKey");
            if (sSelectedTabKey === "iconTabBarSapDelivered") {
                this.getOwnerComponent().setMetaModelDataSapDelivered();
                this.sCurrentTableId = "sapDeliveredTable";
                this.aPropertiesToFilter = this.aPropertiesToFilterSapDelivered;
            } else {
                this.getOwnerComponent().setMetaModelData();
                this.sCurrentTableId = "customerCreatedTable";
                this.aPropertiesToFilter = this.aPropertiesToFilterCustomerCreated;
            }
        },
        onEdit: function (oEvent) {
            var oPage = this.getPageInTable(oEvent.getSource());
            this._navigateToEdit(oPage.id);
        },
        /**
        * Called if the add button is clicked
        * Creates and saves (!) a new page, then sets the config values and navigates to the dashboard
        *
        * @private
        */
        onAdd: function () {
            var oResourceBundle = this.getResourceBundle();
            this.showCreateDialog(function (pageInfo) {
                sap.ushell.Container.getServiceAsync("PageReferencing")
                    .then(function (PageReferencing) {
                        return PageReferencing.createReferencePage(pageInfo);
                    })
                    .then(function (oReferencePage) {
                        return this.getPageRepository().createPage(oReferencePage);
                    }.bind(this))
                    .then(function () {
                        this._navigateToDetail(pageInfo.id);
                        MessageToast.show(oResourceBundle.getText("Message.PageCreated"), { closeOnBrowserNavigation: false });
                    }.bind(this))
                    .catch(this.handleBackendError.bind(this));
            }.bind(this));
        },

        /**
         * Called if the delete dialog is confirmed
         * Deletes the selected page and refreshes the model to display the change in the pageOverview table
         *
         * @param {sap.ui.base.Event} oEvent The press event
         * @returns {Promise<void>} The delete promise
         *
         * @private
         */
        _deletePage: function (oEvent) {
            var oResourceBundle = this.getResourceBundle(),
                oDialog = oEvent.getSource().getParent(),
                sTransportId = oEvent.transportId || "",
                oTable = this.byId(this.sCurrentTableId),
                aItemsToDelete = oTable.getSelectedItems().map(function (item) {
                    return item.getBindingContext().getObject();
                }),
                sSuccessMsg = oResourceBundle.getText("Message.SuccessDeletePage"),
                aDeletePromises = aItemsToDelete.map(function (oItemToDelete) {
                    return this.getPageRepository().deletePage(oItemToDelete.id, sTransportId);
                }.bind(this));

            return Promise.all(aDeletePromises)
                .then(function () {
                    return this._refreshModel();
                }.bind(this))
                .then(function () {
                    oTable.removeSelections();
                    this._setDeleteAndCopyButtonEnabled(false);
                    oTable.fireSelectionChange();
                    MessageToast.show(sSuccessMsg, { closeOnBrowserNavigation: false });
                    oDialog.close();
                }.bind(this))
                .catch(this.handleBackendError.bind(this));
        },

        /**
         * Called if the delete button is clicked
         * Displays the delete dialog with the pages to delete
         * on confirmation deletes the pages
         * on cancel closes the dialog
         *
         * @private
         */
        onDelete: function () {
            var oTable = this.byId(this.sCurrentTableId),
                oSelectedItem = oTable.getSelectedItem();
            if (!oSelectedItem) {
                return;
            }

            this.checkShowDeleteDialog(
                oSelectedItem.getBindingContext().getObject(),
                this._deletePage.bind(this)
            );
        },

        getPageInTable: function (oSelectedItem) {
            return oSelectedItem.getBindingContext(
                this.sCurrentTableId === "customerCreatedTable" ? undefined : "PageRepository").getObject();
        },
        /**
         * Called if the copy button is clicked.
         * Calls the copy dialog with the page to copy and navigates to the dashboard.
         *
         * @private
         */
        onCopy: function () {
            var oTable = this.byId(this.sCurrentTableId),
                oSelectedItem = oTable.getSelectedItem(),
                oResourceBundle = this.getResourceBundle();
            if (!oSelectedItem) {
                return;
            }

            var oPage = this.getPageInTable(oSelectedItem);
            this.showCopyDialog(oPage, function (pageInfo) {
                this.pageInfo = pageInfo;
                sap.ushell.Container.getServiceAsync("PageReferencing")
                    .then(function (PageReferencing) {
                        return PageReferencing.createReferencePage(pageInfo);
                    })
                    .then(function (oReferencePage) {
                        return this.getPageRepository().copyPage(oReferencePage);
                    }.bind(this))
                    .then(function () {
                        return this._refreshModel();
                    }.bind(this))
                    .then(function (/*oResolvedResult*/) {
                        this._navigateToDetail(this.pageInfo.targetId);
                        MessageToast.show(oResourceBundle.getText("Message.PageCreated"), { closeOnBrowserNavigation: false });
                    }.bind(this))
                    .catch(this.handleBackendError.bind(this));
            }.bind(this));
        },

        /**
         * Filters the Table
         *
         * @param {sap.ui.base.Event} oEvent The press event
         *
         * @private
         */
        onSearch: function (oEvent) {
            var oTable = this.byId(this.sCurrentTableId),
                oBinding = oTable.getBinding("items"),
                oResourceBundle = this.getResourceBundle(),
                sSearchValue = oEvent.getSource().getValue(),
                aFilters = this.aPropertiesToFilter.map(
                    function (sPropertyToFilter) {
                        return new Filter({
                            path: sPropertyToFilter,
                            operator: FilterOperator.Contains,
                            value1: sSearchValue
                        });
                    }
                );
            this.aSearchFilter[this.sCurrentTableId] = new Filter({
                filters: aFilters,
                and: false
            });

            this._applyCombinedFilters();

            if (oBinding.getLength() === 0) { // Adjust empty table message in case all pages are filtered out.
                if (sSearchValue) {
                    oTable.setNoDataText(oResourceBundle.getText("Message.NoPagesFound"));
                } else {
                    oTable.setNoDataText(oResourceBundle.getText("Message.NoPages"));
                }
            }
        },

        /**
         * Loads available pages and sets the model
         *
         * @returns {Promise<void>} Promise that resolves when the pages have been loaded
         *
         * @private
         */
        _refreshModel: function () {
            this.getModel().setProperty("/busy", true);
            return this._loadAvailablePages().then(function (pages) {
                this.getModel().setSizeLimit(pages.pages.length);
                this.getModel().setProperty("/pages", pages.pages);
                this.getModel().setProperty("/busy", false);
            }.bind(this), function (sErrorMsg) {
                this.getModel().setProperty("/busy", false);
                this.showMessageBoxError(sErrorMsg);
            }.bind(this));
        },

        /**
         * Called when table was updated, for example, filter items via search
         *
         * @private
         */
        onTableUpdate: function () {
            var oTable = this.byId(this.sCurrentTableId);
            // if filter hides selected item,
            // we need to reset copy button and delete button and selected item
            if (oTable.getSelectedItems().length === 0) {
                // true -> remove all selections (also hidden by filter)
                oTable.removeSelections(true);
                this._setDeleteAndCopyButtonEnabled(false);
            }
        },

        /**
         * Load available pages from the page persistence
         *
         * @returns {Promise<{pages: array}>} A promise which contains an object with the pages
         *
         * @private
         */
        _loadAvailablePages: function () {
            return this.getPageRepository().getPages().then(function (aPages) {
                return { pages: aPages };
            });
        },

        /**
         * Creates the model for the state of the delete button
         *
         * @returns {ButtonStateModel} The Model for storing the button
         *
         * @private
         */
        _createInitialButtonStateModel: function () {
            return new JSONModel({
                isDeleteAndCopyEnabledCustomerCreated: false,
                isDeleteAndCopyEnabledSapDelivered: false
            });
        },

        /**
         * Changes the state model of the delete and copy button.
         *
         * @param {boolean} bEnabled Whether the delete and copy buttons should be enabled.
         *
         * @private
         */
        _setDeleteAndCopyButtonEnabled: function (bEnabled) {
            this.getView().getModel("buttonStates").setProperty(
                this.sCurrentTableId === "customerCreatedTable" ?
                    "/isDeleteAndCopyEnabledCustomerCreated" :
                    "/isDeleteAndCopyEnabledSapDelivered",
                bEnabled
            );
        },

        /**
         * Called when the error message is clicked to display more detailed error message.
         * @param {sap.ui.base.Event} oEvent The press event
         * @private
         */
        onErrorMessageClicked: function (oEvent) {
            var oSelectedObject = oEvent.getSource().getBindingContext().getObject(),
                oErrorMsg = oSelectedObject.message,
                sErrorMessageDetails = this.formatAssignmentDetailsMessage(oSelectedObject.code);
            this.showMessageBoxWarning(
                oErrorMsg,
                sErrorMessageDetails,
                false
            );
        },

        /**
         * Returns an array of all different values of a given property name from a given array of pages.
         *
         * @param {object[]} aPages Array of pages.
         * @param {string} sPropertyName Name of the property.
         * @returns {string[]} an array of all different values
         *
         * @private
         */
        _removeDuplicates: function (aPages, sPropertyName) {
            var mKeys = {},
                aKeys = [];

            aPages.forEach(function (oPage) {
                var sName = oPage[sPropertyName];
                if (!mKeys[sName]) {
                    mKeys[sName] = true;
                    aKeys.push({ key: sName });
                }
            });

            return aKeys;
        },

        /**
         * Opens and creates the ViewSettingsDialog for customer created table
         *
         * @param {string} sTabKey The key of the tab to be displayed.
         *                         It can have values filter, sort, group
         * @private
         */
        showViewSettingsCustomerCreatedDialog: function (sTabKey) {
            if (this._oViewSettingsCustomerCreatedDialog) {
                this._oViewSettingsCustomerCreatedDialog.open(sTabKey);
                return;
            }

            sap.ui.require([
                "sap/ui/core/Fragment",
                "sap/ui/Device",
                "sap/ushell/applications/PageComposer/controller/ViewSettingsCustomerCreatedDialog.controller"
            ], function (Fragment, Device, ViewSettingsCustomerCreatedDialogController) {
                Fragment.load({
                    name: "sap.ushell.applications.PageComposer.view.ViewSettingsCustomerCreatedDialog",
                    type: "XML",
                    controller: new ViewSettingsCustomerCreatedDialogController(this)
                }).then(function (oFragment) {
                    this._oViewSettingsCustomerCreatedDialog = oFragment;
                    if (Device.system.desktop) {
                        oFragment.addStyleClass("sapUiSizeCompact");
                    }
                    var aPages = this.getModel().getProperty("/pages");
                    oFragment.setModel(new JSONModel({
                        assignmentCodeStatus: this._removeDuplicates(aPages, "assignmentCodeStatus"),
                        assignmentState: this._removeDuplicates(aPages, "assignmentState"),
                        devclass: this._removeDuplicates(aPages, "devclass", true),
                        transportId: this._removeDuplicates(aPages, "transportId", true),
                        createdByFullname: this._removeDuplicates(aPages, "createdByFullname"),
                        modifiedByFullname: this._removeDuplicates(aPages, "modifiedByFullname")
                    }), "uniqueValues");

                    // there is no transport in the cloud scenario, therefore we don't show the corresponding filters
                    if (!this.getModel().getData().transportSupported) {
                        oFragment.removeFilterItem("CustomerCreatedPackageFilter");
                        oFragment.removeFilterItem("CustomerCreatedWorkbenchRequestFilter");
                        oFragment.removeSortItem("CustomerCreatedPackageSort");
                        oFragment.removeSortItem("CustomerCreatedWorkbenchRequestSort");
                        oFragment.removeGroupItem("CustomerCreatedPackageGroup");
                        oFragment.removeGroupItem("CustomerCreatedWorkbenchRequestGroup");
                    }

                    this.getView().addDependent(oFragment);
                    oFragment.open(sTabKey);
                }.bind(this));
            }.bind(this));
        },


        /**
         * Opens and creates the ViewSettingsDialog for SAP delivered content
         *
         * @param {string} sTabKey The key of the tab to be displayed.
         *                         It can have values filter, sort, group
         *
         * @private
         */
        showViewSettingsSapDeliveredDialog: function (sTabKey) {
            if (this._oViewSettingsSapDeliveredDialog) {
                this._oViewSettingsSapDeliveredDialog.open(sTabKey);
                return;
            }

            sap.ui.require([
                "sap/ui/core/Fragment",
                "sap/ui/Device",
                "sap/ushell/applications/PageComposer/controller/ViewSettingsSapDeliveredDialog.controller"
            ], function (Fragment, Device, ViewSettingsSapDeliveredDialogController) {
                Fragment.load({
                    name: "sap.ushell.applications.PageComposer.view.ViewSettingsSapDeliveredDialog",
                    type: "XML",
                    controller: new ViewSettingsSapDeliveredDialogController(this)
                }).then(function (oFragment) {
                    this._oViewSettingsSapDeliveredDialog = oFragment;
                    var aPages = this.getModel().getProperty("/pages");
                    oFragment.setModel(new JSONModel({
                        id: this._removeDuplicates(aPages, "id"),
                        title: this._removeDuplicates(aPages, "title", true),
                        description: this._removeDuplicates(aPages, "description", true)
                    }), "uniqueValues");

                    // there is no transport in the cloud scenario, therefore we don't show the corresponding filters
                    if (!this.getModel().getData().transportSupported) {
                        oFragment.removeFilterItem("SapDeliveredPackageFilter");
                        oFragment.removeFilterItem("SapDeliveredWorkbenchRequestFilter");
                        oFragment.removeSortItem("SapDeliveredPackageSort");
                        oFragment.removeSortItem("SapDeliveredWorkbenchRequestSort");
                        oFragment.removeGroupItem("SapDeliveredPackageGroup");
                        oFragment.removeGroupItem("SapDeliveredWorkbenchRequestGroup");
                    }

                    this.getView().addDependent(oFragment);
                    oFragment.open(sTabKey);
                }.bind(this));
            }.bind(this));
        },



        /**
         * Combines the filters from the viewSettingsDialog and the filters from the search and applies them together.
         *
         * Filter categories, like "createdBy" or "createdOn" will be connected via AND.
         * Filter properties of such categories, like "Marie Curie" and "Albert Einstein"
         * or "14.03.1903" and "14.03.1921" will be connected via OR.
         * This allows for example to filter for pages created by "Marie Curie" or "Albert Einstein" on 03.14.1903 or the 03.14.1921.
         *
         * @private
         */
        _applyCombinedFilters: function () {
            var mFilters = this.mViewSettingsFilters[this.sCurrentTableId] || {},
                oBinding = this.byId(this.sCurrentTableId).getBinding("items");

            var aCategoryFilters = [];
            var aPropertyFilters = [];

            for (var filter in mFilters) {
                aPropertyFilters.push(
                    new Filter({
                        filters: mFilters[filter],
                        and: false
                    })
                );
            }
            aCategoryFilters = aCategoryFilters.concat(aPropertyFilters);

            if (this.aSearchFilter[this.sCurrentTableId]) {
                aCategoryFilters = aCategoryFilters.concat(this.aSearchFilter[this.sCurrentTableId]);
            }

            if (aCategoryFilters.length === 0) {
                oBinding.filter(
                    new Filter({
                        path: "id",
                        operator: FilterOperator.Contains,
                        value1: ""
                    })
                );
            } else {
                oBinding.filter(new Filter({
                    filters: aCategoryFilters,
                    and: true
                }));
            }
        }
    });
});
