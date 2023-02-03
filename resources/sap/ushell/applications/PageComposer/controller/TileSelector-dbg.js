// Copyright (c) 2009-2020 SAP SE, All Rights Reserved

/**
 * @fileoverview Provides functionality for "sap/ushell/applications/PageComposer/view/TileSelector.fragment.xml"
 */
sap.ui.define([
    "sap/m/Button",
    "sap/m/library",
    "sap/m/List",
    "sap/m/ResponsivePopover",
    "sap/m/StandardListItem",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Sorter",
    "sap/ushell/utils/clone",
    "sap/ushell/services/Container" // required for "sap.ushell.Container.getServiceAsync()"
], function (
    Button,
    mobileLibrary,
    List,
    ResponsivePopover,
    StandardListItem,
    Filter,
    FilterOperator,
    JSONModel,
    Sorter,
    fnClone
    // Container
) {
    "use strict";

    // shortcut for sap.m.ButtonType
    var ButtonType = mobileLibrary.ButtonType;

    // shortcut for sap.m.PlacementType
    var PlacementType = mobileLibrary.PlacementType;

    // shortcut for sap.m.ListMode
    var ListMode = mobileLibrary.ListMode;

    // shortcut for sap.m.ListSeparators
    var ListSeparators = mobileLibrary.ListSeparators;

    /**
     * TileSelector constructor
     *
     * @constructor
     *
     * @protected
     */
    return function () {
        var oParentView,
            oFragment,
            oToolbar,
            oList,
            oCatalogTilesList,
            oIconTabBar,
            oAddSelectedTilesButton,
            oModel,
            oRolesModel,
            resources = {},
            oAddSingleTileItem,
            oSectionList,
            oSectionSelectionPopover,
            fnAddTileHandler;

        /**
         * Helper function to get the currently active list.
         *
         * @returns {sap.m.List} The currently active list.
         * @private
         */
        function _getActiveList () {
            return oIconTabBar.getSelectedKey() === "catalogs" ? oCatalogTilesList : oList;
        }

        /**
         * Intended to be called by the view (e.g. a List) for handling selection change events.
         *
         * @param {sap.ui.base.Event} [oEvent] The event object.
         * @private
         */
        function _onSelectionChange (/*oEvent*/) {
            oAddSelectedTilesButton.setEnabled(!!_getActiveList().getSelectedItems().length);
        }

        /**
         * Initializes the TileSelector, must be called before calling any other TileSelector's method.
         * The controller's view "default" (unnamed) and "roles" model must already be set.
         *
         * @param {sap.ui.core.mvc.Controller} oController A reference to the controller it is going to be used on.
         *
         * @private
         */
        this.init = function (oController) {
            oParentView = oController.getView();
            oFragment = oParentView.byId("tileSelector");
            oToolbar = oParentView.byId("tileSelectorToolbar");
            oList = oParentView.byId("tileSelectorList");
            oCatalogTilesList = oParentView.byId("catalogTilesList");
            oIconTabBar = oParentView.byId("contextSwitch");
            oAddSelectedTilesButton = oParentView.byId("tileSelectorAddButton");
            resources.i18n = oController.getResourceBundle();

            oList.setBusy(true);

            oModel = new JSONModel({ searchText: "", descending: false, vizReferenceHierarchySet: undefined });
            oModel.setSizeLimit(Infinity); // allow more list bindings than the model default limit of 100 entries
            oFragment.setModel(oModel);
            oRolesModel = oParentView.getModel("roles");

            oSectionList = new List({
                mode: ListMode.MultiSelect,
                showSeparators: ListSeparators.None,
                includeItemInSelection: true,
                selectionChange: function () { oSectionSelectionPopover.getBeginButton().setEnabled(!!oSectionList.getSelectedItem()); },
                items: {
                    path: "/page/sections",
                    template: new StandardListItem({ title: "{title}" })
                },
                noDataText: resources.i18n.getText("Message.NoSections")
            }).setModel(oParentView.getModel());

            oAddSelectedTilesButton.setEnabled(false);
            // Toggle the Add button during selection or tab change
            oList.attachSelectionChange(_onSelectionChange);
            oCatalogTilesList.attachSelectionChange(_onSelectionChange);
            oIconTabBar.attachSelect(_onSelectionChange);
        };

        /**
         * Helper function to get the Binding Info for both lists.
         *
         * @returns {object} The BindingInfo object.
         *
         * @private
         */
        function _createBindingInfo () {
            var oBindingInfo = {};
            oBindingInfo.parameters = { expand: "vizReferences" };

            oBindingInfo.path = "/vizReferenceHierarchySet";
            oBindingInfo.sorter = _getSortersArray(oModel.getProperty("/descending")); // to keep user's current sort order
            oBindingInfo.factory = function (sID, oBindingContext) {
                switch (oBindingContext.getProperty("type")) {
                    default:
                    case "catalog":
                        return oParentView.byId("tileSelectorGroupHeader").clone();
                    case "visualization":
                        return oParentView.byId("tileSelectorCustomListItem").clone()
                            .bindObject(oBindingContext.getPath() + "/vizReferences");
                }
            };
            return oBindingInfo;
        }

        /**
         * Fill the catalog tiles list with tiles from selected catalogs.
         *
         * @param {string[]} [aCatalogIds] Array of selected catalog IDs.
         *
         * @private
         */
        function _loadCatalogTiles (aCatalogIds) {
            if (aCatalogIds && aCatalogIds.length) {
                var oBindingInfo = _createBindingInfo();
                oCatalogTilesList.setModel(oParentView.getModel("PageRepository"));
                oCatalogTilesList.bindItems(oBindingInfo);
                var aFilters = (aCatalogIds || []).map(function (sCatalogId) {
                    return new Filter("catalogId", FilterOperator.EQ, sCatalogId);
                });
                oCatalogTilesList.getBinding("items").filter(aFilters);
            } else {
                oCatalogTilesList.unbindItems();
            }
        }

        /**
         * Update the catalog tiles list after the user changed the manual selection of catalogs.
         * Callback function for the CatalogSelector.
         *
         * @param {string[]} [aCatalogIds] Array of selected catalog IDs.
         *
         * @private
         */
        function _onCatalogsSelected (aCatalogIds) {
            _loadCatalogTiles(aCatalogIds);
            // switch to the Manually Added tab
            oIconTabBar.setSelectedKey("catalogs");
            _onSelectionChange(); // IconTabBar does not fire the selectionChange event when changed from code
        }

        /**
         * Sets the TileSelectorList model with the provided TileSelector hierarchy items.
         * This method can be called an arbitrary number of times.
         *
         * @param {object[]} [aVizReferenceHierarchy] The TileSelector hierarchy to be set on the List model.
         *   If not provided, the "PageRepository" model will be used (should be defined in the application manifest),
         *   assuming that it is connected to a data source providing the "vizReferenceHierarchySet" service.
         *
         * @private
         */
        this.initTiles = function (aVizReferenceHierarchy) {
            // switch to the Derived from Roles tab
            oIconTabBar.setSelectedKey("roles");

            var oBindingInfo = _createBindingInfo();
            oAddSelectedTilesButton.setEnabled(false);
            if (typeof aVizReferenceHierarchy !== "undefined") {
                oModel.setProperty("/vizReferenceHierarchySet", aVizReferenceHierarchy);
                oList.setModel(undefined);
                delete oBindingInfo.parameters;
            } else {
                oModel.setProperty("/vizReferenceHierarchySet", undefined);
                oList.setModel(oParentView.getModel("PageRepository"));
            }
            oList.bindItems(oBindingInfo);
            oList.getBinding("items").filter(_getFiltersArray()); // only after binding it is possible to add non-permanent filters!
            oList.setBusy(false);
        };

        /**
         * Method to be called externally to notify the TileSelector that the role context selection has changed and must be refreshed.
         */
        this.refreshRoleContext = function () {
            oList.getBinding("items").filter(_getFiltersArray());
        };

        /**
         * Intended to be called by the view (e.g. a SearchField) for handling tile search events.
         *
         * @param {sap.ui.base.Event} [oEvent] The event object.
         *
         * @private
         */
        this.onSearchTiles = function (/*oEvent*/) {
            oList.getBinding("items").filter(_getFiltersArray());
        };

        /**
         * Intended to be called by the view (e.g. a Button) for handling add tile events.
         *
         * @param {sap.ui.base.Event} oEvent The event object.
         *
         * @private
         */
        this.onAddTiles = function (oEvent) {
            var aSectionListItems = oSectionList.getItems(),
                oBindingContext = oEvent.getSource().getBindingContext();
            if (oBindingContext) {
                var sBindingContextPath = oBindingContext.getPath();
                oAddSingleTileItem = _getActiveList().getItems().filter(function (item) {
                    return (item.getBindingContextPath() === sBindingContextPath);
                })[0];
            } else {
                oAddSingleTileItem = undefined;
            }
            if (aSectionListItems.length === 1) { // skip asking to which section(s) if there is only one section
                aSectionListItems[0].setSelected(true);
                _addTiles();
            } else {
                _openSectionSelectionPopover(oEvent);
            }
        };

        /**
         * Intended to be called by the view (e.g. a Button) for handling add catalogs event.
         *
         * @private
         */
        this.onAddCatalogs = function () {
            sap.ui.require(["sap/ushell/applications/PageComposer/controller/CatalogSelector.controller"], function (controller) {
                controller.selectCatalogs(oParentView, _onCatalogsSelected);
            });
        };

        /**
         * Intended to be called by the view (e.g. a Button) for handling sort catalogs toggle events.
         *
         * @param {sap.ui.base.Event} [oEvent] The event object.
         *
         * @private
         */
        this.onSortCatalogsToggle = function (/*oEvent*/) {
            _sortCatalogsToggle();
        };

        /**
         * Sets a callback function for the add tiles event.
         * Usually set to call {@link sap.ushell.applications.PageComposer.controller.PageDetailEdit#addVisualizationToSection}.
         *
         * @param {function} newAddTileHandler The callback function to be called when adding tiles.
         *   This function is called with the following arguments, in the following order:
         *     1. {object} The visualization data of the visualization being added.
         *     2. {int[]} The indices of sections where the content should be added to.
         *     3. {int} Optional. The index within the section where the visualization should be added at.
         *              If not provided, the visualization will be added at the end of the section.
         *
         * @private
         */
        this.setAddTileHandler = function (newAddTileHandler) {
            fnAddTileHandler = function (itemData, selectedSectionsIndexes, tileIndex) {
                var oClonedItemData = fnClone(itemData);

                oClonedItemData.catalogTileId = oClonedItemData.id; // entity difference: unlike "Viz", "VizReference" has no "catalogTileId"
                oClonedItemData.vizId = oClonedItemData.catalogTileId; // remove when frontend names match backend names
                delete oClonedItemData.id;
                newAddTileHandler(oClonedItemData, selectedSectionsIndexes, tileIndex);
            };
        };

        /**
         * Called when starting to drag a tile.
         *
         * @param {sap.ui.base.Event} oEvent The event object.
         *
         * @private
         */
        this.onDragStart = function (oEvent) {
            var oItemData = oEvent.getParameter("target").getBindingContext().getProperty();
            if (oItemData.type === "catalog") { // prevent dragging catalog items
                oEvent.preventDefault();
                return;
            }
            oEvent.getParameter("dragSession").setComplexData("callback", function (tileIndex, sectionIndex) {
                fnAddTileHandler(oItemData, [sectionIndex], tileIndex);
            });
        };

        /**
         * Helper function to get the Filters array for {@link sap.ui.model.ListBinding.prototype.filter}.
         * Takes into account the current context selected and the text currently in the SearchField.
         *
         * @returns {sap.ui.model.Filter[]} The resulting array of Filters.
         *
         * @private
         */
        function _getFiltersArray () {
            var aFilters = [];
            var sSearchText = oModel.getProperty("/searchText");
            if (!oModel.getProperty("/vizReferenceHierarchySet")) {
                var aSelectedRoles = oRolesModel.getProperty("/selected") || [];
                aSelectedRoles.forEach(function (sRole) {
                    aFilters.push(new Filter("roleId", FilterOperator.EQ, sRole));
                });
            }
            if (sSearchText) {
                aFilters.push(new Filter([
                    new Filter("title", FilterOperator.Contains, sSearchText),
                    new Filter("vizReferences/title", FilterOperator.Contains, sSearchText),
                    new Filter("vizReferences/subTitle", FilterOperator.Contains, sSearchText)
                ], false)); // filter combining: "AND" (true) or "OR" (false));
            }
            return aFilters;
        }

        /**
         * Helper function to get the Sorters array for {@link sap.ui.model.ListBinding.prototype.sort}.
         *
         * @param {boolean} bSortDescending Whether to sort "descending" (true) or "ascending" (false).
         * @returns {sap.ui.model.Sorter[]} The resulting array of Sorters.
         *
         * @private
         */
        function _getSortersArray (bSortDescending) {
            return [
                new Sorter("title", bSortDescending),
                new Sorter("vizReferences/title", false) // visualizations are always sorted in ascending lexicographical order
            ];
        }

        /**
         * Toggles the lexicographical sort order of the List items between "ascending" and "descending".
         * Sorting is done based on the "title" property of the items.
         *
         * @param {boolean} [bForceDescending] Whether to force "descending" (true) or "ascending" (false).
         *
         * @private
         */
        function _sortCatalogsToggle (bForceDescending) {
            var bSortDescending = ((typeof bForceDescending !== "undefined") ? bForceDescending : !oModel.getProperty("/descending"));
            var oCatalogTilesListBinding = oCatalogTilesList.getBinding("items");
            var aSorterArray = _getSortersArray(bSortDescending);
            oList.getBinding("items").sort(aSorterArray);
            if (oCatalogTilesListBinding) {
                oCatalogTilesListBinding.sort(aSorterArray);
            }
            oModel.setProperty("/descending", bSortDescending);
        }

        /**
         * Get the item data of every selected List item.
         * This is needed because "getSelectedItems()" do not always return all selected items (e.g. within collapsed parents).
         *
         * @returns {object[]} An array of selected List item data.
         *
         * @private
         */
        function _getSelectedListItemsData () {
            var oActiveList = _getActiveList();
            if (oActiveList.indexOfItem(oAddSingleTileItem) > -1) {
                // should add a single tile (from its own "Add" button)
                return [oAddSingleTileItem.getBindingContext().getProperty()];
            }
            var oListModel = oActiveList.getModel();
            // should add all selected tiles (from header "Add" button)
            return oActiveList.getSelectedContextPaths().map(function (sSelectedItemContextPath) {
                return oListModel.getContext(sSelectedItemContextPath).getProperty();
            });
        }

        /**
         * Opens the add tiles popover, containing the section list for selection of the tiles target sections.
         *
         * @param {sap.ui.base.Event} oEvent The event that raised the operation (e.g. a click on the "Add" button).
         *
         * @private
         */
        function _openSectionSelectionPopover (oEvent) {
            if (!oSectionSelectionPopover || oSectionSelectionPopover.bIsDestroyed) {
                _createSectionSelectionPopover();
            }
            oSectionList.removeSelections(true);
            oSectionSelectionPopover.getBeginButton().setEnabled(false);
            oSectionSelectionPopover.getEndButton().setEnabled(true);
            if (!oAddSingleTileItem && _isOverflownInOverflowToolbar(oAddSelectedTilesButton)) {
                oSectionSelectionPopover.openBy(oToolbar.getAggregation("_overflowButton"));
            } else {
                oSectionSelectionPopover.openBy(oEvent.getSource());
            }
        }

        /**
         * Checks if a control is currently overflown inside of an OverflowToolbar.
         *
         * @param {sap.ui.core.Control} oControl The control to check.
         * @returns {boolean} Whether the control is or is not overflown inside of an OverflowToolbar.
         *
         * @private
         */
        function _isOverflownInOverflowToolbar (oControl) {
            return (oControl.hasStyleClass("sapMOTAPButtonNoIcon") || oControl.hasStyleClass("sapMOTAPButtonWithIcon"));
        }

        /**
         * Creates the section selection popover, used to select to which section(s) the tile(s) should go to.
         *
         * @private
         */
        function _createSectionSelectionPopover () {
            oSectionSelectionPopover = new ResponsivePopover({
                placement: PlacementType.Auto,
                title: resources.i18n.getText("Tooltip.AddToSections"),
                beginButton: new Button({
                    type: ButtonType.Emphasized,
                    text: resources.i18n.getText("Button.Add"),
                    press: function () { this.setEnabled(false); oSectionSelectionPopover.close(); _addTiles(); }
                }),
                endButton: new Button({
                    text: resources.i18n.getText("Button.Cancel"),
                    press: function () { this.setEnabled(false); oSectionSelectionPopover.close(); }
                }),
                content: oSectionList,
                initialFocus: oSectionList
            }).attachAfterClose(function () { oAddSingleTileItem = undefined; }).addStyleClass("sapContrastPlus");
            oFragment.addDependent(oSectionSelectionPopover);
        }

        /**
         * Calls the handler for adding tiles. Does nothing if no function is set for the add tiles handler.
         *
         * @see setAddTileHandler
         *
         * @private
         */
        function _addTiles () {
            if (typeof fnAddTileHandler !== "function") {
                return;
            }
            var aSelectedSectionsIndexes = oSectionList.getSelectedItems().map(function (oSelectedSection) {
                return oSectionList.indexOfItem(oSelectedSection);
            });
            var aSelectedTilesData = _getSelectedListItemsData();
            aSelectedTilesData.forEach(function (oSelectedTileData) {
                fnAddTileHandler(oSelectedTileData, aSelectedSectionsIndexes);
            });

            if (oAddSingleTileItem) {
                oAddSingleTileItem.setSelected(false);
                oAddSingleTileItem = undefined;
            } else { // unselect all tiles when adding through the header "Add" button
                _getActiveList().removeSelections(true);
            }
            _onSelectionChange(); // toggle the Add button
        }
    };
});
