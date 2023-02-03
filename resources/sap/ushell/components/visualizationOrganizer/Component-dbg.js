// Copyright (c) 2009-2020 SAP SE, All Rights Reserved

sap.ui.define([
    "sap/m/library",
    "sap/ui/core/UIComponent",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/json/JSONModel",
    "sap/base/Log",
    "sap/ushell/resources"
], function (
    mobileLibrary,
    UIComponent,
    Filter,
    FilterOperator,
    JSONModel,
    Log,
    resources
) {
    "use strict";

    // shortcut for sap.m.ButtonType
    var ButtonType = mobileLibrary.ButtonType;

    /* global Map, Set */

    // visualizationOrganizer Component
    return UIComponent.extend("sap.ushell.components.visualizationOrganizer.Component", {
        metadata: {
            version: "1.78.0",
            library: "sap.ushell",
            dependencies: { libs: ["sap.m"] }
        },

        /**
         * Initializes the VisualizationOrganizer and requests the required data.
         */
        init: function () {
            UIComponent.prototype.init.apply(this, arguments); // call the init function of the parent

            this.mVizIdInPages = new Map(); // a vizId map of sets of Pages (to check if a vizId is in a Page)
            this.stVizIdInSection = new Set(); // a set of every viz IDs in Section (used if AppFinder starts within section context)
        },

        /**
         * Requests the Spaces, Pages, and Visualizations data.
         * Populates the Maps and Sets to contain this data in a structured way.
         *
         * @returns {Promise<undefined>} A promise that resolves when the data request and processing is done.
         *
         * @see _fillVizIdMaps
         */
        requestData: function () {
            return sap.ushell.Container.getServiceAsync("CommonDataModel")
                .then(function (oCommonDataModelService) {
                    return oCommonDataModelService.getAllPages();
                })
                .then(function (aMyPages) {
                    this._fillVizIdMaps(aMyPages);
                }.bind(this));
        },

        /**
         * Collects the data from the given Pages and populates "mVizIdInPages".
         * This is used by {@link requestData}.
         *
         * @param {object[]} aPages The Pages to gather data from.
         *
         * @see requestData
         */
        _fillVizIdMaps: function (aPages) {
            this.mVizIdInPages = new Map();
            aPages.forEach(function (oPage) {
                Object.keys(oPage.payload.sections).forEach(function (sId) {
                    Object.keys(oPage.payload.sections[sId].viz).forEach(function (vId) {
                        var vizId = oPage.payload.sections[sId].viz[vId].vizId;
                        if (this.mVizIdInPages.has(vizId)) {
                            this.mVizIdInPages.get(vizId).add(oPage.identification.id);
                        } else {
                            this.mVizIdInPages.set(vizId, new Set([oPage.identification.id]));
                        }
                    }.bind(this));
                }.bind(this));
            }.bind(this));
        },

        /**
         * Check if a visualization is within any Page.
         *
         * @param {string} vizId The vizId of the visualization to check.
         * @param {boolean} [bSectionContext] The flag if AppFinder is started in section context
         * @returns {boolean} Whether the visualization is within some Page (true) or not (false).
         */
        isVizIdPresent: function (vizId, bSectionContext) {
            if (bSectionContext) {
                return this.stVizIdInSection.has(vizId);
            }
            var stPages = this.mVizIdInPages.get(vizId);
            return !!(stPages && stPages.size);
        },

        /**
         * @param {string} vizId The vizId of a visualization.
         * @param {boolean} [bSectionContext] The flag if AppFinder is started in section context
         * @returns {sap.ui.core.URI} The icon that should be used for that visualization "pin" button.
         *
         * @see isVizIdPresent
         */
        formatPinButtonIcon: function (vizId, bSectionContext) {
            return (this.isVizIdPresent(decodeURIComponent(vizId), bSectionContext) ? "sap-icon://accept" : "sap-icon://add");
        },

        /**
         * @param {string} vizId The vizId of a visualization.
         * @param {boolean} [bSectionContext] The flag if AppFinder is started in section context
         * @returns {sap.m.ButtonType} The type that should be used for that visualization "pin" button.
         *
         * @see isVizIdPresent
         */
        formatPinButtonType: function (vizId, bSectionContext) {
            return (this.isVizIdPresent(decodeURIComponent(vizId), bSectionContext) ? ButtonType.Emphasized : ButtonType.Default);
        },

        /**
         * @param {string} vizId The vizId of a visualization.
         * @param {object} [sectionContext] The section context the AppFinder is started in.
         * @returns {sap.m.ButtonType} The tooltip that should be used for that visualization "pin" button.
         *
         * @see isVizIdPresent
         */
        formatPinButtonTooltip: function (vizId, sectionContext) {
            var bIsVizIdPresent = this.isVizIdPresent(decodeURIComponent(vizId), !!sectionContext),
                sText,
                sSectionTitle;

            if (sectionContext) {
                sSectionTitle = sectionContext.sectionTitle;
                if (bIsVizIdPresent) {
                    sText = "VisualizationOrganizer.Button.Tooltip.RemoveFromSection";
                } else {
                    sText = "VisualizationOrganizer.Button.Tooltip.AddToSection";
                }
            } else if (bIsVizIdPresent) {
                sText = "EasyAccessMenu_PinButton_Toggled_Tooltip";
            } else {
                sText = "EasyAccessMenu_PinButton_UnToggled_Tooltip";
            }

            return resources.i18n.getText(sText, sSectionTitle);
        },

        /**
         * @typedef {object} SectionContext Information about page and section if app finder if open in a section scope
         * @property {string} pageID The page ID where a visualization should be changed.
         * @property {string} pageTitle The page title where a visualization should be changed.
         * @property {string} sectionID The section ID where a visualization should be changed.
         * @property {string} sectionTitle The section title where a visualization should be changed.
         */

        /**
         * Collects event data from the given event and calls {@link toggle} with it.
         *
         * @param {sap.ui.base.Event} oEvent The event that raised the "onTilePinButtonClick" handler.
         * @param {SectionContext} [oSectionContext] The section context if the visualzation is added to special section.
         * @returns {Promise<undefined>} A promise that resolves when the popover is toggled.
         *
         * @see toggle
         */
        onTilePinButtonClick: function (oEvent, oSectionContext) {
            var oSource = oEvent.getSource(),
                oTileData = oSource.getBindingContext().getProperty();

            if (oSectionContext) {
                return this._applyOrganizationChangeToSection(oSource, oTileData, oSectionContext);
            }
            return this.toggle(oSource, oTileData);
        },

        /**
         * Method to open the visualizationOrganizer popover.
         *
         * @param {sap.ui.core.Control} oOpenBy The ui5 control, the popover should be opened by.
         * @param {object} oVizInfo The information of the visualization, that should be added.
         * @returns {Promise<undefined>} A promise that resolves when the popover opens.
         *
         * @since 1.75.0
         * @protected
         */
        open: function (oOpenBy, oVizInfo) {
            var oPopover = sap.ui.getCore().byId("sapUshellVisualizationOrganizerPopover");

            if (!oPopover) {
                oPopover = sap.ui.xmlfragment("sap.ushell.components.visualizationOrganizer.VisualizationOrganizerPopover", this);
                oPopover.setModel(new JSONModel({ pages: [], searchTerm: "" }));
                oPopover.setModel(resources.i18nModel, "i18n");
            }

            this.oOpenBy = oOpenBy;
            this.sVisualizationId = decodeURIComponent(oVizInfo.id);
            this.sVisualizationTitle = oVizInfo.title;
            this.fnOrganizeVisualizations = this._organizeVisualizations.bind(this);
            this.fnResetPopup = this._resetPopup.bind(this);
            oPopover.attachBeforeClose(this.fnOrganizeVisualizations);
            oPopover.attachAfterClose(this.fnResetPopup);

            return Promise.all([
                sap.ushell.Container.getServiceAsync("Menu"),
                sap.ushell.Container.getServiceAsync("CommonDataModel")
            ]).then(function (aResults) {
                return Promise.all([
                    aResults[0].getSpacesPagesHierarchy(),
                    aResults[1].getAllPages()
                ]);
            }).then(function (aResults) {
                var oPageIds = this.mVizIdInPages.get(this.sVisualizationId),
                    aSpaces = aResults[0].spaces,
                    aAllPages = aResults[1],
                    mPageIdToTitle = {};

                aAllPages.forEach(function (oPage) {
                    mPageIdToTitle[oPage.identification.id] = oPage.identification.title;
                });

                var aPages = [];
                aSpaces.forEach(function (space) {
                    space.pages.forEach(function (page) {
                        var sPageTitle = mPageIdToTitle[page.id];
                        if (!sPageTitle) {
                            // We cannot organize visualizations of unknown pages.
                            // So the page is disregarded.
                            return;
                        }
                        aPages.push({
                            id: page.id,
                            title: mPageIdToTitle[page.id],
                            space: space.title,
                            selected: oPageIds && oPageIds.has(page.id)
                        });
                    });
                });

                var oPopoverModel = oPopover.getModel();
                oPopoverModel.setProperty("/pages", aPages);
                oPopoverModel.setProperty("/pinnedPages", oPageIds);

                oPopover.openBy(oOpenBy);
            }.bind(this));
        },

        /**
         * Method to close the visualizationOrganizer popover.
         *
         * @since 1.75.0
         * @protected
         */
        close: function () {
            var oPopover = sap.ui.getCore().byId("sapUshellVisualizationOrganizerPopover");
            if (oPopover) {
                oPopover.close();
            }
        },

        /**
         * Method to handle the toggling of pin button
         *
         * @param {sap.ui.core.Control} oOpenBy The ui5 control, the popover should be toggled by.
         * @param {object} oVizInfo The information of the visualization, that should be added.
         * @returns {Promise<undefined>} A promise that resolves when the popover is toggled.
         *
         * @since 1.75.0
         * @protected
         */
        toggle: function (oOpenBy, oVizInfo) {
            var oPopover = sap.ui.getCore().byId("sapUshellVisualizationOrganizerPopover");
            // To really make the visualizationOrganizer toggleable, we need to know the last openBy control.
            if (oPopover && oPopover.isOpen() && oPopover._oOpenBy && oPopover._oOpenBy.getId() === oOpenBy.getId()) {
                this.close();
                return Promise.resolve();
            }
            return this.open(oOpenBy, oVizInfo);
        },

        /**
         * Adds and removes visualizations to the specific section of the page and generates a MessageToast.
         *
         * @param {sap.ui.Control} oOpenBy The ui5 control, the popover should be toggled by.
         * @param {object} oVizInfo The information of the visualization, that should be added.
         * @param {SectionContext} oSectionContext The information used to check where a visualization is.
         * @returns {Promise<undefined>} A promise that resolves when the popover is toggled.
         *
         * @since 1.76.0
         * @private
         */
        _applyOrganizationChangeToSection: function (oOpenBy, oVizInfo, oSectionContext) {
            var sVizId = decodeURIComponent(oVizInfo.id),
                sVisualizationTitle = oVizInfo.title,
                sPageId = oSectionContext.pageID,
                sSectionId = oSectionContext.sectionID,
                oPageService = sap.ushell.Container.getService("Pages"),
                oVizChangeChain,
                sMessageToUser;
            if (this.stVizIdInSection.has(sVizId)) {
                sMessageToUser = resources.i18n.getText(
                    "VisualizationOrganizer.MessageToastSectionContextRemove",
                    [sVisualizationTitle || sVizId, oSectionContext.sectionTitle, oSectionContext.pageTitle]
                );
                oVizChangeChain = oPageService.findVisualization(sPageId, sSectionId, sVizId).then(function (aVisualizationLocations) {
                    if (aVisualizationLocations.length === 0) {
                        return Promise.resolve();
                    }
                    var oVisualizationLocation = aVisualizationLocations[0],
                        iPageIndex = oPageService.getPageIndex(sPageId),
                        iSectionIndex = oVisualizationLocation.sectionIndex,
                        oVizDeleteChain;
                    var aSortedVizIndexes = oVisualizationLocation.vizIndexes.sort(function (a, b) { return b - a; });
                    aSortedVizIndexes.forEach(function (iVizIndex) {
                        if (!oVizDeleteChain) {
                            oVizDeleteChain = oPageService.deleteVisualization(iPageIndex, iSectionIndex, iVizIndex);
                        } else {
                            oVizDeleteChain = oVizDeleteChain.then(function () {
                                return oPageService.deleteVisualization(iPageIndex, iSectionIndex, iVizIndex);
                            });
                        }
                    });
                    return oVizDeleteChain;
                }).then(function () {
                    this.stVizIdInSection.delete(sVizId);
                }.bind(this));
            } else {
                sMessageToUser = resources.i18n.getText(
                    "VisualizationOrganizer.MessageToastSectionContextAdd",
                    [sVisualizationTitle || sVizId, oSectionContext.sectionTitle, oSectionContext.pageTitle]
                );
                oVizChangeChain = oPageService.addVisualization(sPageId, sSectionId, sVizId).then(function () {
                    this.stVizIdInSection.add(sVizId);
                }.bind(this));
            }
            return oVizChangeChain.then(function () {

                oOpenBy.getBinding("icon").refresh(true);
                oOpenBy.getBinding("type").refresh(true);
                oOpenBy.getBinding("tooltip").refresh(true);

                sap.ui.require(["sap/m/MessageToast"], function (MessageToast) {
                    MessageToast.show(sMessageToUser, { offset: "0 -50" });
                });
            });
        },

        /**
         * Adds and removes visualizations to the selected Spaces/Pages and generates a MessageToast.
         *
         * @param {sap.ui.base.Event} oEvent The before close event of the popup.
         * @returns {Promise<undefined>} A promise that resolves when the visualization organization is done.
         *
         * @see _applyOrganizationChange
         * @since 1.75.0
         * @private
         */
        _organizeVisualizations: function (oEvent) {
            var oPopover = oEvent.getSource(),
                oPagesList = oPopover.getContent()[1],
                oPopoverModel = oPopover.getModel(),
                stInitialPages = oPopoverModel.getProperty("/pinnedPages") || new Set(),
                aAddToItems = [],
                aDeleteFromItems = [];
            // reset the filter, as some selected items might be hidden
            oPagesList.getBinding("items").filter(null);

            // filter groupHeaderItems (spaces) out of the result.
            var aItems = oPagesList.getItems().filter(function (oItem) {
                return oItem.isA("sap.m.StandardListItem");
            });

            aItems.forEach(function (oItem) {
                var sItemId = oItem.getBindingContext().getProperty("id");
                if (oItem.getSelected() && !stInitialPages.has(sItemId)) {
                    aAddToItems.push(oItem);
                } else if (!oItem.getSelected() && stInitialPages.has(sItemId)) {
                    aDeleteFromItems.push(oItem);
                }
            });

            return this._applyOrganizationChange({ addToItems: aAddToItems, deleteFromItems: aDeleteFromItems });
        },

        /**
         * @typedef {object} VisualizationChanges Collected changes done for a visualization in a "sapUshellVisualizationOrganizerPopover".
         * @property {object[]} addToItems The popover items representing where the visualization should be added to.
         * @property {object[]} deleteFromItems The popover items representing where the visualization should be deleted from.
         */

        /**
         * Applies the given visualization organization changes.
         * This is used by {@link _organizeVisualizations}.
         * When done, shows a {@link sap.m.MessageToast} informing the total number of organized visualizations.
         *
         * @param {VisualizationChanges} oVizualizationChanges The items representing where a visualization should be added and deleted.
         * @return {Promise<undefined>} A promise that resolves after every organization change.
         *
         * @see _organizeVisualizations
         */
        _applyOrganizationChange: function (oVizualizationChanges) {
            var iChangedVisualizations = (oVizualizationChanges.addToItems.length + oVizualizationChanges.deleteFromItems.length);
            if (!iChangedVisualizations) { return Promise.resolve(); }
            var sVizId = this.sVisualizationId;
            var stAlreadyRemovedFromPageId = new Set();
            var oPagesService;
            var oVizChangeChain = sap.ushell.Container.getServiceAsync("Pages").then(function (PagesService) {
                oPagesService = PagesService;
            });

            function buildVizDeleteChain (aVisualizationLocations) {
                var oVizDeleteChain;
                // indexes must be in descending order for correct iterative removal (last one first)
                var aSortedVisualizationLocations = aVisualizationLocations.sort(function (a, b) { return b.sectionIndex - a.sectionIndex; });
                aSortedVisualizationLocations.forEach(function (visualizationLocation) {
                    // indexes must be in descending order for correct iterative removal (last one first)
                    var aSortedVizIndexes = visualizationLocation.vizIndexes.sort(function (a, b) { return b - a; });
                    aSortedVizIndexes.forEach(function (vizIndex) {
                        if (!oVizDeleteChain) {
                            oVizDeleteChain = oPagesService.deleteVisualization(oPagesService.getPageIndex(visualizationLocation.pageId), visualizationLocation.sectionIndex, vizIndex);
                        } else {
                            oVizDeleteChain = oVizDeleteChain.then(function () {
                                return oPagesService.deleteVisualization(oPagesService.getPageIndex(visualizationLocation.pageId), visualizationLocation.sectionIndex, vizIndex);
                            });
                        }
                    });
                });
                return oVizDeleteChain || Promise.resolve();
            }

            oVizualizationChanges.deleteFromItems.forEach(function (oRemoveFromItem) {
                var sPageId = oRemoveFromItem.getBindingContext().getProperty("id");
                if (!stAlreadyRemovedFromPageId.has(sPageId)) {
                    stAlreadyRemovedFromPageId.add(sPageId);
                    oVizChangeChain = oVizChangeChain.then(function () {
                        return oPagesService.findVisualization(sPageId, null, sVizId).then(buildVizDeleteChain);
                    });
                }
                this.mVizIdInPages.get(sVizId).delete(sPageId);
            }.bind(this));

            oVizualizationChanges.addToItems.forEach(function (oAddToItem) {
                var sPageId = oAddToItem.getBindingContext().getProperty("id");
                oVizChangeChain = oVizChangeChain.then(function () {
                    return oPagesService.addVisualization(sPageId, null, sVizId);
                });
                if (this.mVizIdInPages.has(sVizId)) {
                    this.mVizIdInPages.get(sVizId).add(sPageId);
                } else {
                    this.mVizIdInPages.set(sVizId, new Set([sPageId]));
                }
            }.bind(this));

            oVizChangeChain.then(function () {
                if (this.oOpenBy) {
                    this.oOpenBy.getBinding("icon").refresh(true);
                    this.oOpenBy.getBinding("type").refresh(true);
                    this.oOpenBy.getBinding("tooltip").refresh(true);
                }
                sap.ui.require(["sap/m/MessageToast"], function (MessageToast) {
                    MessageToast.show(resources.i18n.getText("VisualizationOrganizer.MessageToast", [iChangedVisualizations]));
                });
            }.bind(this));

            return oVizChangeChain;
        },

        /**
         * Resets the changes to the content of the popover.
         *
         * @param {sap.ui.base.Event} oEvent The after close event of the popup.
         *
         * @since 1.75.0
         * @private
         */
        _resetPopup: function (oEvent) {
            var oPopover = oEvent.getSource(),
                oSearchField = oPopover.getContent()[0],
                oPagesList = oPopover.getContent()[1];

            oPopover.detachBeforeClose(this.fnOrganizeVisualizations);
            oPopover.detachAfterClose(this.fnResetPopup);

            oSearchField.setValue("");

            oPagesList.removeSelections();

            delete this.fnOrganizeVisualizations;
            delete this.fnResetPopup;
            delete this.sVisualizationId;
            delete this.sVisualizationTitle;
        },

        /**
         * Handles the Page press event.
         * On press the Page should toggle its selection.
         *
         * @param {sap.ui.base.Event} oEvent The press event.
         *
         * @since 1.75.0
         * @private
         */
        pagePressed: function (oEvent) {
            var oSLI = oEvent.getSource();
            oSLI.setSelected(!oSLI.getSelected());
        },

        /**
         * Filters the list of Spaces.
         *
         * @param {sap.ui.base.Event} oEvent The search event.
         *
         * @since 1.75.0
         * @private
         */
        _onSearch: function (oEvent) {
            var oPopover = sap.ui.getCore().byId("sapUshellVisualizationOrganizerPopover"),
                oPagesList = oPopover.getContent()[1],
                oBinding = oPagesList.getBinding("items"),
                sSearchValue = oEvent.getSource().getValue();

            oBinding.filter(new Filter({
                filters: [
                    new Filter({
                        path: "title",
                        operator: FilterOperator.Contains,
                        value1: sSearchValue
                    }),
                    new Filter({
                        path: "space",
                        operator: FilterOperator.Contains,
                        value1: sSearchValue
                    })
                ],
                and: false
            }));

            if (oBinding.getLength() === 0) { // Adjust empty list of pages message in case all pages are filtered out.
                oPagesList.setNoDataText(resources.i18n.getText(sSearchValue
                    ? "VisualizationOrganizer.PagesList.NoResultsText"
                    : "VisualizationOrganizer.PagesList.NoDataText"
                ));
            }
        },


        /**
         * @typedef {object} NavigationScopeFilter Information used to check where a visualization exists.
         * @property {set} pageID The page IDs where a visualization exists.
         * @property {set} sectionID The section IDs where a visualization exists.
         */

        /**
         * Requests the visualizations data for the given section of the given page and
         * updates the sets with new data or cleans the set if page or section are not found.
         *
         * @param {NavigationScopeFilter} oContext Navigation context. If there is no pageID or sectionID, promise resolves null.
         * @returns {Promise<SectionContext|null>} A promise that resolves when the data request and processing is done.
         *
         * @see _fillVizIdMaps
         */
        loadSectionContext: function (oContext) {
            this.stVizIdInSection.clear();
            if (!oContext || !oContext.pageID || !oContext.sectionID) {
                return Promise.resolve(null);
            }

            return sap.ushell.Container.getServiceAsync("Pages").then(function (oPageService) {
                var sPageId = decodeURIComponent(oContext.pageID),
                    sSelectedSectionId = decodeURIComponent(oContext.sectionID);

                return oPageService.loadPage(sPageId).then(function (sPagePath) {
                    var oPage = oPageService.getModel().getProperty(sPagePath),
                        oSelectedSection,
                        oSectionContext;

                    for (var i = 0; i<oPage.sections.length; i++) {
                        if (oPage.sections[i].id === sSelectedSectionId) {
                            oSelectedSection = oPage.sections[i];
                            break;
                        }
                    }
                    if (!oSelectedSection) {
                        return Promise.resolve(null);
                    }

                    oSelectedSection.visualizations.forEach(function (oVisualization) {
                        this.stVizIdInSection.add(oVisualization.vizId);
                    }.bind(this));

                    oSectionContext = {
                        pageID: sPageId,
                        sectionID: sSelectedSectionId,
                        pageTitle: oPage.title,
                        sectionTitle: oSelectedSection.title
                    };

                    return Promise.resolve(oSectionContext);
                }.bind(this))
                .catch(function () {
                    Log.warning(sPageId + " cannot be loaded. Please, check the id of the page.");
                    return Promise.resolve(null);
                });
            }.bind(this));
        },

        exit: function () {
            var oPopover = sap.ui.getCore().byId("sapUshellVisualizationOrganizerPopover");
            if (oPopover) {
                oPopover.destroy();
            }
        }
    });
});
