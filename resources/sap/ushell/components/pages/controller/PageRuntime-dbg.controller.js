//Copyright (c) 2009-2020 SAP SE, All Rights Reserved
/**
 * @fileOverview PageRuntime controller for PageRuntime view
 *
 * @version 1.78.0
 */

sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/GenericTile",
    "sap/ushell/resources",
    "sap/ui/model/json/JSONModel",
    "sap/ushell/Config",
    "sap/ushell/components/pages/formatter/PageRuntimeFormatter",
    "sap/m/library",
    "sap/m/MessageToast",
    "sap/ushell/components/pages/StateManager",
    "sap/base/util/ObjectPath",
    "sap/ushell/EventHub",
    "sap/ushell/utils"
], function (Controller, GenericTile, resources, JSONModel, Config, PageRuntimeFormatter, library, MessageToast, oStateManager, ObjectPath, EventHub, oUtils) {
    "use strict";

    /**
     * Controller of the PagesRuntime view.
     * It is responsible for navigating between different pages and combines the
     * Pages service (@see sap.ushell.services.Pages) with the
     * VisualizationLoading service (@see sap.ushell.services.VisualizationLoading) to create
     * the content area of the Fiori Launchpad.
     *
     * @param {string} sId Controller id
     * @param {object} oParams Controller parameters
     *
     * @class
     * @extends sap.ui.core.mvc.Controller
     *
     * @private
     * @since 1.72.0
     * @alias sap.ushell.components.pages.controller.Pages
     */
    return Controller.extend("sap.ushell.components.pages.controller.Pages", /** @lends sap.ushell.components.pages.controller.Pages.prototype */ {
        formatter: PageRuntimeFormatter,

        /**
         * UI5 lifecycle method which is called upon controller initialization.
         * It gets all the required UShell services and sets the Pages service
         * model to the view. It also sets a separate model to the view which includes
         * some settings which change the view behavior.
         *
         * @private
         * @since 1.72.0
         */
        onInit: function () {
            var bPersonalizationEnabled = Config.last("/core/shell/enablePersonalization");

            if (Config.last("/core/spaces/vizInstantiation/enabled")) {
                this._oVisualizationInstantiationServicePromise = sap.ushell.Container.getServiceAsync("VisualizationInstantiation");
            } else {
                this._oVisualizationInstantiationServicePromise = sap.ushell.Container.getServiceAsync("VisualizationLoading");
            }

            this._oURLParsingService = sap.ushell.Container.getServiceAsync("URLParsing");

            this._oViewSettingsModel = new JSONModel({
                sizeBehavior: Config.last("/core/home/sizeBehavior"),
                actionModeActive: false,
                showHideButton: Config.last("/core/catalog/enableHideGroups"),
                enableVisualizationReordering: bPersonalizationEnabled,
                showPageTitle: false
            });
            this.getView().setModel(this._oViewSettingsModel, "viewSettings");

            this._aConfigListeners = Config.on("/core/home/sizeBehavior").do(function (sSizeBehavior) {
                this._oViewSettingsModel.setProperty("/sizeBehavior", sSizeBehavior);
            }.bind(this));

            this._oErrorPageModel = new JSONModel({
                icon: "sap-icon://documents",
                text: "",
                description: "",
                details: ""
            });
            this.getView().setModel(this._oErrorPageModel, "errorPage");

            Promise.all([
                this._oVisualizationInstantiationServicePromise,
                this.getOwnerComponent().getPagesService()
            ]).then(function (aServices) {
                // bind the model only when the vizInstance service is loaded so that it
                // can be used in the factory function synchronously
                this._oVisualizationInstantiationService = aServices[0];
                this.getView().setModel(aServices[1].getModel());
            }.bind(this));

            this.sCurrentTargetPageId = "";
            this._openFLPPage();

            this.oContainerRouter = sap.ushell.Container.getRenderer().getRouter();
            this.oContainerRouter.getRoute("home").attachMatched(this._openFLPPage, this);
            this.oContainerRouter.getRoute("openFLPPage").attachMatched(this._openFLPPage, this);

            this.oErrorPage = this.byId("errorPage");
            this.oPagesNavContainer = this.byId("pagesNavContainer");
            this.oPagesRuntimeNavContainer = this.byId("pagesRuntimeNavContainer");
            // Handles the states(visible/invisible, active/inactive) of the visualizations
            oStateManager.init(this.oPagesRuntimeNavContainer, this.oPagesNavContainer);

            this.oEventHubListener = EventHub.once("PagesRuntimeRendered").do(function () {
                if (bPersonalizationEnabled) {
                    this._createActionModeButton();
                }
            }.bind(this));

            this._oEventBus = sap.ui.getCore().getEventBus();
            this._oEventBus.subscribe("launchpad", "shellFloatingContainerIsDocked", this._handleUshellContainerDocked, this);
            this._oEventBus.subscribe("launchpad", "shellFloatingContainerIsUnDocked", this._handleUshellContainerDocked, this);

            this.oVisualizationLoadingListener = EventHub.on("VizInstanceLoaded").do(function () {
                this._setPerformanceMark();
                //Should be adjusted after next iteration of the VisualizationLoading
                if (!this.oVisualizationLoadingListenerTimeout) {
                    //Currently there is no good place to mark TTI time, because all visualizations
                    //are loaded async and update visualizations views directly through setAggregation.
                    //For this reason, we listen to the loading of the all static and dynamic tiles
                    //and mark the last time. Timeout in 5 sec in order to avoid the cases when
                    //personalisation or other interaction  replace the TTI time
                    this.oVisualizationLoadingListenerTimeout = setTimeout(function () {
                        this.oVisualizationLoadingListener.off();
                    }.bind(this), 5000);
                }
            }.bind(this));
        },

        /**
         * Used to set performance mark related to the loading of the page runtime
         *
         * @private
         */
        _setPerformanceMark: function () {
            oUtils.setPerformanceMark("FLP-TTI-Homepage", {
                bUseUniqueMark: true,
                bUseLastMark: true
            });
        },

        /**
         * Gets the url parameters and returns the spaceId and pageId of the target page.
         *
         * @returns {Promise<object>} Resolves to an object contains the pageId and spaceId
         *
         * @private
         * @since 1.72.0
         */
        _getPageAndSpaceId: function () {
            return this._oURLParsingService.then(function (urlParsingService) {
                var oHash = urlParsingService.parseShellHash(window.hasher.getHash());
                var oIntent = {
                    semanticObject: oHash.semanticObject || "",
                    action: oHash.action || ""
                };
                var oHashPartsParams = oHash.params || {};
                var aPageId = oHashPartsParams.pageId || [];
                var aSpaceId = oHashPartsParams.spaceId || [];


               return this._parsePageAndSpaceId(aPageId, aSpaceId, oIntent);
            }.bind(this));
        },

        /**
         * Parses the given spaceId and pageId. When there are no pageId and spaceId given but the intent is Shell-home,
         * returns the spaceId and pageId of the default page. When there is no pageId and spaceId, only a pageId or a
         * spaceId, or more than one pageId or spaceId given, returns a rejected promise with an error message.
         *
         * @param {array} pageId An array that contains the page id of the page which should be displayed
         * @param {array} spaceId An array that contains the space id of the page which should be displayed
         * @param {object} intent An object that contains the semantic object and action of the page which
         * should be displayed
         *
         * @returns {Promise<object>} Resolves to an object contains the pageId and spaceId
         *
         * @private
         * @since 1.72.0
         */
        _parsePageAndSpaceId: function (pageId, spaceId, intent) {
            if (pageId.length < 1 && spaceId.length < 1) {
                if (intent.semanticObject === "Shell" && intent.action === "home") {
                    return this._getAssignedPage();
                }
                return Promise.reject(resources.i18n.getText("PageRuntime.NoPageIdAndSpaceIdProvided"));
            }

            if (pageId.length === 1 && spaceId.length === 0) {
                return Promise.reject(resources.i18n.getText("PageRuntime.OnlyPageIdProvided"));
            }

            if (pageId.length === 0 && spaceId.length === 1) {
                return Promise.reject(resources.i18n.getText("PageRuntime.OnlySpaceIdProvided"));
            }

            if (pageId.length > 1 || spaceId.length > 1) {
                return Promise.reject(resources.i18n.getText("PageRuntime.MultiplePageOrSpaceIdProvided"));
            }

            if (pageId[0] === "") {
                return Promise.reject(resources.i18n.getText("PageRuntime.InvalidPageId"));
            }

            if (spaceId[0] === "") {
                return Promise.reject(resources.i18n.getText("PageRuntime.InvalidSpaceId"));
            }

            return Promise.resolve({
                pageId: pageId[0],
                spaceId: spaceId[0]
            });
        },

        /**
         * Returns the default page of the current user.
         * It uses the Menu service to retrieve the first menu entry.
         * We currently interpret the first menu entry as the "default"
         * page.
         *
         * @returns {Promise<object>} Resolves to an object contains the pageId and spaceId of the page
         *
         * @private
         * @since 1.72.0
         */
        _getAssignedPage: function () {
            return sap.ushell.Container.getServiceAsync("Menu")
                .then(function (oMenuService) {
                    return oMenuService.getMenuEntries();
                })
                .then(function (aMenuEntries) {
                    if (aMenuEntries.length === 0) {
                        return Promise.reject(resources.i18n.getText("PageRuntime.NoAssignedPage"));
                    }

                    var oParams = {};

                    if (ObjectPath.get("target.parameters", aMenuEntries[0])) {
                        aMenuEntries[0].target.parameters.forEach(function (oParameter) {
                            if (oParameter.name && oParameter.value) {
                                oParams[oParameter.name] = oParameter.value;
                            }
                        });
                    }

                    if (!oParams.spaceId || !oParams.pageId) {
                        return Promise.reject(resources.i18n.getText("PageRuntime.CannotFindADefaultPage"));
                    }

                    return {
                        spaceId: oParams.spaceId,
                        pageId: oParams.pageId
                    };
                });
        },

        /**
         * Triggers the navigation to a specific page after the pageId is returned and the
         * VisualizationLoading service loaded all the visualization data
         * and the Pages service could successfully load the requested
         * page. Triggers the navigation to an error page when an error occurs.
         *
         * @returns {Promise<string>}
         *  A promise which resolves with the path to the page model after
         *  the page was successfully loaded.
         *
         * @private
         * @since 1.72.0
         */
        _openFLPPage: function () {
            var sPageId,
                sSpaceId;

            return this._getPageAndSpaceId().then(function (ids) {
                sPageId = ids.pageId;
                sSpaceId = ids.spaceId;

                // This property may be updated by consecutive calls to _openFLPPage and prevents race conditions when
                // opening pages.
                this.sCurrentTargetPageId = sPageId;

                return this.getOwnerComponent().getPagesService()
                    .then(function (pagesService) {
                        return pagesService.loadPage(sPageId);
                    })
                    .then(function () {
                        EventHub.emit("PagesRuntimeRendered");
                        if (this.sCurrentTargetPageId === sPageId) {
                            this._navigate(sPageId, sSpaceId);
                        }
                    }.bind(this))
                    .catch(function (error) {
                        EventHub.emit("PagesRuntimeRendered");
                        if (error instanceof Error) {
                            // E.g. UI5 modules cannot be loaded
                            this._oErrorPageModel.setProperty("/text", resources.i18n.getText("PageRuntime.GeneralError.Text"));
                        } else {
                            var sDescription = resources.i18n.getText("PageRuntime.CannotLoadPage.Description") + JSON.stringify(error);

                            this._oErrorPageModel.setProperty("/icon", "sap-icon://documents");
                            this._oErrorPageModel.setProperty("/text", resources.i18n.getText("PageRuntime.CannotLoadPage.Text", [sPageId, sSpaceId]));
                            this._oErrorPageModel.setProperty("/description", "");
                            this._oErrorPageModel.setProperty("/details", sDescription);
                        }

                        this.oPagesRuntimeNavContainer.to(this.oErrorPage);
                    }.bind(this));
            }.bind(this))
            .catch(function (error) {
                EventHub.emit("PagesRuntimeRendered");
                this._oErrorPageModel.setProperty("/icon", "sap-icon://documents");
                this._oErrorPageModel.setProperty("/text", error || "");
                this._oErrorPageModel.setProperty("/description", "");
                this._oErrorPageModel.setProperty("/details", "");

                this.oPagesRuntimeNavContainer.to(this.oErrorPage);
            }.bind(this));
        },

        /**
         * Loops through every page in the inner NavContainer and displays
         * the one which was specified. Also determines if the page title should be shown.
         *
         * @param {string} targetPageId The ID of the page which should be displayed
         * @param {string} spaceId The ID of the space to which the page is assigned to
         *
         * @returns {Promise<void>} Promise which is resolved after the navigation occurred
         *
         * @private
         * @since 1.72.0
         */
        _navigate: function (targetPageId, spaceId) {
            var oPageControl = this.oPagesNavContainer.getPages().find(function (oControl) {
                return targetPageId === oControl.data("pageId");
            });

            if (!oPageControl) {
                return Promise.reject();
            }

            return sap.ushell.Container.getServiceAsync("Menu")
                .then(function (oMenuService) {
                    return oMenuService.hasMultiplePages(spaceId);
                })
                .then(function (bHasMultiplePages) {
                    this._oViewSettingsModel.setProperty("/showPageTitle", bHasMultiplePages);
                    this.oPagesNavContainer.to(oPageControl);
                    this.oPagesRuntimeNavContainer.to(this.oPagesNavContainer);
                }.bind(this));
        },

         /**
          * Displays the description of the current error and hide the button after it is pressed.
          *
          * @since 1.73.0
          * @private
          */
        _pressViewDetailsButton: function () {
            var sErrorDetails = this._oErrorPageModel.getProperty("/details") || "";
            this._oErrorPageModel.setProperty("/description", sErrorDetails);
        },

        /**
         * Copies the content of the text provided to the clipboard and shows a MessageToast with a success or error message
         *
         * @param {string} text The text that should be copied to the clipboard
         *
         * @since 1.73.0
         * @private
         */
        _copyToClipboard: function () {
            var oTemporaryDomElement = document.createElement("textarea");
            try {
                oTemporaryDomElement.contentEditable = true;
                oTemporaryDomElement.readonly = false;
                oTemporaryDomElement.textContent = this._oErrorPageModel.getProperty("/description");
                document.documentElement.appendChild(oTemporaryDomElement);

                oTemporaryDomElement.select();
                document.execCommand("copy");
                MessageToast.show(resources.i18n.getText("PageRuntime.CannotLoadPage.CopySuccess"), {
                    closeOnBrowserNavigation: false
                });
            } catch (oException) {
                MessageToast.show(resources.i18n.getText("PageRuntime.CannotLoadPage.CopyFail"), {
                    closeOnBrowserNavigation: false
                });
            } finally {
                oTemporaryDomElement.parentNode.removeChild(oTemporaryDomElement);
            }
        },

        /**
         * UI5 factory function which is used by the sections control
         * inside the runtime view to fill the visualizations aggregation
         * (@see sap.ushell.ui.launchpad.Section)
         *
         * @param {string} id Control ID
         * @param {sap.ui.model.Context} context UI5 context
         * @returns {sap.ui.core.Control} The UI5 control
         *
         * @private
         * @since 1.72.0
         */
        _visualizationFactory: function (id, context) {
            if (this._oVisualizationInstantiationService) {
                var oData = context.getObject();
                var oVisualization = this._oVisualizationInstantiationService.instantiateVisualization(oData);

                oVisualization.attachPress(this.onVisualizationPress, this);
                oVisualization.bindEditable("viewSettings>/actionModeActive");

                return oVisualization;
            }
            return new GenericTile({
                state: library.LoadState.Failed
            });
        },

        /**
         * Press handler which is called upon visualization press
         *
         * @param {sap.ui.base.Event} oEvent SAPUI5 event object
         *
         * @returns {Promise<void>} Resolves with an empty value
         *
         * @since 1.75
         * @private
         */
        onVisualizationPress: function (oEvent) {
            var sScope = oEvent.getParameter("scope");
            var sAction = oEvent.getParameter("action");
            var oContext = oEvent.getSource().getBindingContext();
            var sPath = oContext.getPath();
            var aPathParts = sPath.split("/");

            if (sScope === "Actions" && sAction === "Remove") {
                return this.getOwnerComponent().getPagesService().then(function (oPagesService) {
                    // pageIndex, sectionIndex, visualizationIndex
                    oPagesService.deleteVisualization(aPathParts[2], aPathParts[4], aPathParts[6]);
                    MessageToast.show(resources.i18n.getText("PageRuntime.MessageToast.TileDeleted"));
                });
            }
            return Promise.resolve();
        },

        /**
         * UI5 lifecycle method which is called upon controller destruction.
         * It detaches the router events and config listeners.
         *
         * @private
         * @since 1.72.0
         */
        onExit: function () {
            this.oContainerRouter.getRoute("home").detachMatched(this._openFLPPage, this);
            this.oContainerRouter.getRoute("openFLPPage").detachMatched(this._openFLPPage, this);
            this._aConfigListeners.off();
            this.oEventHubListener.off();
            this._oEventBus.unsubscribe("launchpad", "shellFloatingContainerIsDocked", this._handleUshellContainerDocked, this);
            this._oEventBus.unsubscribe("launchpad", "shellFloatingContainerIsUnDocked", this._handleUshellContainerDocked, this);
            oStateManager.exit();
        },

        /**
         * Creates the user action menu entry for the actionmode
         *
         * @private
         * @since 1.74.0
         */
        _createActionModeButton: function () {
            var oActionButtonObjectData = {
                id: "ActionModeBtn",
                text: resources.i18n.getText("PageRuntime.EditMode.Activate"),
                icon: "sap-icon://edit",
                press: [ this.pressActionModeButton, this ]
            };

            // in case the edit home page button was moved to the shell header,
            // it was already created as an shell Head Item in Control Manager
            // only here we have access to the text and press method
            var oTileActionsButton = sap.ui.getCore().byId(oActionButtonObjectData.id);
            if (oTileActionsButton) {
                oTileActionsButton.setTooltip(oActionButtonObjectData.text);
                oTileActionsButton.setText(oActionButtonObjectData.text);
                oTileActionsButton.attachPress(oActionButtonObjectData.press);
            } else {
                var oAddActionButtonParameters = {
                    controlType: "sap.ushell.ui.launchpad.ActionItem",
                    oControlProperties: oActionButtonObjectData,
                    bIsVisible: true,
                    aStates: ["home"]
                };
                var oRenderer = sap.ushell.Container.getRenderer("fiori2");
                oRenderer.addUserAction(oAddActionButtonParameters).done(function (oActionButton) {
                    oTileActionsButton = oActionButton;
                    // if xRay is enabled
                    if (Config.last("/core/extension/enableHelp")) {
                        oTileActionsButton.addStyleClass("help-id-ActionModeBtn");// xRay help ID
                    }
                });
            }
        },

        /**
         * Handles the button press on the user action menu entry
         *
         * @private
         * @since 1.74.0
         */
        pressActionModeButton: function () {
            var bActionModeActive = this.getView().getModel("viewSettings").getProperty("/actionModeActive");
            sap.ui.require([
                "sap/ushell/components/pages/ActionMode"
            ], function (ActionMode) {
                if (bActionModeActive) {
                    ActionMode.cancel();
                } else {
                    ActionMode.start(this);
                }
            }.bind(this));
        },

        /**
         * Generic handler for action mode actions
         *
         * @param {string} sHandler Name of the handler within the action mode module
         * @param {sap.ui.base.Event} oEvent Event object
         * @param {sap.ui.core.Control} oSource Source control
         * @param {object} oParameters Event parameters
         *
         * @private
         * @since 1.74.0
         */
        handleEditModeAction: function (sHandler, oEvent, oSource, oParameters) {
            sap.ui.require([
                "sap/ushell/components/pages/ActionMode"
            ], function (ActionMode) {
                ActionMode[sHandler](oEvent, oSource, oParameters);
            });
        },

        /**
         * Finds the ancestor section control of a control
         * @param {sap.ui.core.Control} oControl a control
         *
         * @returns {sap.ushell.ui.launchpad.Section} the parent section or null
         *
         * @private
         * @since 1.75.0
         */
        _getAncestorSection: function (oControl) {
            if (oControl.isA("sap.ushell.ui.launchpad.Section")) {
                return oControl;
            } else if (oControl.getParent) {
                return this._getAncestorSection(oControl.getParent());
            }
            return null;
        },

        /**
         * Finds the ancestor page control of a control
         * @param {sap.ui.core.Control} oControl a control
         *
         * @returns {sap.ushell.ui.launchpad.Page} the parent page or null
         *
         * @private
         * @since 1.75.0
         */
        _getAncestorPage: function (oControl) {
            if (oControl.isA("sap.ushell.ui.launchpad.Page")) {
                return oControl;
            } else if (oControl.getParent) {
                return this._getAncestorPage(oControl.getParent());
            }
            return null;
        },

        /**
         * Connect two sections with a promise for moving visualizations
         * @param {sap.ushell.ui.launchpad.Section} oResolveSection the resolving section
         * @param {sap.ushell.ui.launchpad.Section} oPromiseSection the promise handling section
         *
         * @private
         * @since 1.75.0
         */
        _setPromiseInSection: function (oResolveSection, oPromiseSection) {
            var oVizMovePromise = new Promise(function (resolve, reject) {
                oResolveSection.setVizMoveResolve(resolve);
            });
            oPromiseSection.setVizMovePromise(oVizMovePromise);
        },

        /**
         * Handler for visualization drag and drop
         *
         * @param {sap.ui.base.Event} oEvent Event object
         * @param {sap.ui.core.Control} oSource Source control
         * @param {object} oParameters Event parameters
         *
         * @returns {Promise<void>} A promise that is resolved when the Pages service is retrieved.
         *
         * @private
         * @since 1.75.0
         */
        moveVisualization: function (oEvent, oSource, oParameters) {
            var sSourcePath = oParameters.draggedControl.getBindingContext().getPath();
            var sTargetPath = oParameters.droppedControl.getBindingContext().getPath();
            var sDropPosition = oParameters.dropPosition;

            // ["","pages","0","sections","0","visualizations","0"]
            var aTargetPathParts = sTargetPath.split("/");

            var iTargetVisualizationIndex = -1;
            if (aTargetPathParts.length > 5) {
                iTargetVisualizationIndex = parseInt(aTargetPathParts[6], 10);
            }

            // ["","pages","0","sections","0","visualizations","0"]
            var aSourcePathParts = sSourcePath.split("/");

            var iPageIndex = parseInt(aSourcePathParts[2], 10);
            var iSourceSectionIndex = parseInt(aSourcePathParts[4], 10);
            var iSourceVisualizationIndex = parseInt(aSourcePathParts[6], 10);
            var iTargetSectionIndex = parseInt(aTargetPathParts[4], 10);

            // Checks if the visualization is dropped on itself.
            if (iSourceSectionIndex === iTargetSectionIndex &&
                (iSourceVisualizationIndex === iTargetVisualizationIndex - 1 && sDropPosition === "Before" ||
                iSourceVisualizationIndex === iTargetVisualizationIndex + 1 && sDropPosition === "After" ||
                iSourceVisualizationIndex === iTargetVisualizationIndex)) {
                    return Promise.resolve();
            }

            //Needed to not pass the drop position to the service.
            if (sDropPosition === "After") {
                iTargetVisualizationIndex += 1;
            }

            var oSourceSection = this._getAncestorSection(oParameters.draggedControl);
            var oTargetSection = this._getAncestorSection(oParameters.droppedControl);
            // invalidate dragged control to unselect it by rerendering it
            oParameters.draggedControl.invalidate();

            this._setPromiseInSection(oSourceSection, oTargetSection);

            return this.getOwnerComponent().getPagesService().then(function (oPagesService) {
                oPagesService.moveVisualization(iPageIndex, iSourceSectionIndex, iSourceVisualizationIndex, iTargetSectionIndex, iTargetVisualizationIndex);
            });
        },

        /**
         * Handler for visualization drag and drop, when a dragged item enters a section.
         * Disables drop into a default section.
         * However, it is still possible to rearrange tiles inside of the default section.
         *
         * @param {sap.ui.base.Event} oEvent Event object
         *
         * @private
         * @since 1.75.0
         */
        onDragEnter: function (oEvent) {
            var oTargetSection = oEvent.getParameter("dragSession").getDropControl();
            if (oTargetSection.getDefault()) {
                oEvent.preventDefault();
            }
        },

        /**
         * Handles the resize event triggered by copilot docking, the grid container containerQuery must be enabled in
         * this case.
         *
         * @param {string} channel The channel name of the event
         * @param {string} event The name of the event
         *
         * @since 1.77.0
         *
         * @private
         */
        _handleUshellContainerDocked: function (channel, event) {
            this._oViewSettingsModel.setProperty("/ushellContainerDocked", event === "shellFloatingContainerIsDocked");
        }
    });
});
