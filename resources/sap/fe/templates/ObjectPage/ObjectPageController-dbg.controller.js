/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2020 SAP SE. All rights reserved
    
 */
sap.ui.define(
	[
		"sap/ui/core/mvc/Controller",
		"sap/ui/model/json/JSONModel",
		"sap/fe/core/controllerextensions/Routing",
		"sap/fe/core/controllerextensions/RoutingListener",
		"sap/fe/core/controllerextensions/FlexibleColumnLayout",
		"sap/fe/core/controllerextensions/EditFlow",
		"sap/ui/model/odata/v4/ODataListBinding",
		"sap/fe/macros/field/FieldRuntime",
		"sap/base/Log",
		"sap/base/util/merge",
		"sap/fe/core/CommonUtils",
		"sap/fe/navigation/SelectionVariant",
		"sap/fe/macros/CommonHelper",
		"sap/fe/macros/table/Utils",
		"sap/m/MessageBox",
		"sap/fe/core/BusyLocker",
		"sap/fe/navigation/NavigationHelper",
		"sap/fe/core/actions/messageHandling",
		"sap/fe/core/FEHelper",
		"sap/ui/core/routing/HashChanger",
		"sap/fe/macros/ResourceModel",
		"sap/m/Link",
		"sap/fe/macros/chart/ChartRuntime",
		"sap/fe/core/AppStateHandler",
		"sap/fe/templates/controls/Share/ShareUtils"
	],
	function(
		Controller,
		JSONModel,
		Routing,
		RoutingListener,
		Fcl,
		EditFlow,
		ODataListBinding,
		FieldRuntime,
		Log,
		merge,
		CommonUtils,
		SelectionVariant,
		CommonHelper,
		TableUtils,
		MessageBox,
		BusyLocker,
		NavigationHelper,
		messageHandling,
		FEHelper,
		HashChanger,
		ResourceModel,
		Link,
		ChartRuntime,
		AppStateHandler,
		ShareUtils
	) {
		"use strict";

		var iMessages;

		return Controller.extend("sap.fe.templates.ObjectPage.ObjectPageController", {
			routing: Routing,
			fcl: Fcl,
			editFlow: EditFlow,
			routingListener: RoutingListener,

			createExtensionAPI: function() {
				return {};
			},
			onInit: function() {
				var that = this,
					oObjectPage = this.byId("fe::ObjectPage");
				this.getView().setModel(this.editFlow.getTransactionHelper().getUIStateModel(), "ui");
				this.getView().setModel(
					this.editFlow.getUIStateModel({
						sessionOn: false,
						batchGroups: that._getBatchGroupsForView()
					}),
					"localUI"
				);
				// Adding model to store related apps data
				var oRelatedAppsModel = new JSONModel({
					visibility: false,
					items: null
				});

				this.getView().setModel(oRelatedAppsModel, "relatedAppsModel");

				if (oObjectPage.getEnableLazyLoading()) {
					//Attaching the event to make the subsection context binding active when it is visible.
					oObjectPage.attachEvent("subSectionEnteredViewPort", this._handleSubSectionEnteredViewPort.bind(this));
				}
			},
			onExit: function() {
				this.getView()
					.getModel("relatedAppsModel")
					.destroy();
			},
			getTableBinding: function(oTable) {
				return oTable && oTable._getRowBinding();
			},
			onAfterRendering: function(oEvent) {
				CommonUtils.updateDataFiledForIBNButtonsVisibility(this.getView().getModel("localUI"));
				var that = this;
				this.getView()
					.getModel("sap.fe.i18n")
					.getResourceBundle()
					.then(function(response) {
						that.oResourceBundle = response;
					});
			},

			onBeforeBinding: function(oContext, mParameters) {
				// TODO: we should check how this comes together with the transaction helper, same to the change in the afterBinding
				var that = this,
					aTables = this._findTables(),
					aCharts = this._findCharts(),
					oFastCreationRow,
					oObjectPage = this.byId("fe::ObjectPage"),
					oBinding = mParameters.listBinding,
					oLocalUIModel = that.getView().getModel("localUI"),
					aBatchGroups = oLocalUIModel.getProperty("/batchGroups");
				aBatchGroups.push("$auto");
				if (
					oObjectPage.getBindingContext() &&
					oObjectPage.getBindingContext().hasPendingChanges() &&
					!aBatchGroups.some(
						oObjectPage
							.getBindingContext()
							.getModel()
							.hasPendingChanges.bind(oObjectPage.getBindingContext().getModel())
					)
				) {
					/* 	In case there are pending changes for the creation row and no others we need to reset the changes
						TODO: this is just a quick solution, this needs to be reworked
				 	*/

					oObjectPage
						.getBindingContext()
						.getBinding()
						.resetChanges();
				}

				// For now we have to set the binding context to null for every fast creation row
				// TODO: Get rid of this coding or move it to another layer - to be discussed with MDC and model
				for (var i = 0; i < aTables.length; i++) {
					oFastCreationRow = aTables[i].getCreationRow();
					if (oFastCreationRow) {
						oFastCreationRow.setBindingContext(null);
					}
				}
				var aChartPromises = [];
				for (var j = 0; j < aCharts.length; j++) {
					aChartPromises.push(aCharts[j].oChartPromise);
				}
				Promise.all(aChartPromises).then(function(aInnerCharts) {
					for (var j = 0; j < aCharts.length; j++) {
						aInnerCharts[j].attachSelectData(ChartRuntime.fnUpdateChart.bind(ChartRuntime));
						aInnerCharts[j].attachDeselectData(ChartRuntime.fnUpdateChart.bind(ChartRuntime));
					}
				});

				// Scroll to present Section so that bindings are enabled during navigation through paginator buttons, as there is no view rerendering/rebind
				var fnScrollToPresentSection = function(oEvent) {
					if (!mParameters.bPersistOPScroll) {
						oObjectPage.setSelectedSection(null);
						oObjectPage.detachModelContextChange(fnScrollToPresentSection);
					}
				};

				oObjectPage.attachModelContextChange(fnScrollToPresentSection);

				//Set the Binding for Paginators using ListBinding ID
				if (oBinding && oBinding.isA("sap.ui.model.odata.v4.ODataListBinding")) {
					var oPaginator = that.byId("fe::Paginator");
					if (oPaginator) {
						oPaginator.setListBinding(oBinding);
					}
				}

				if (!mParameters.editable) {
					if (oLocalUIModel.getProperty("/sessionOn") === true) {
						oLocalUIModel.setProperty("/sessionOn", false);
					}
				}

				if (oObjectPage.getEnableLazyLoading()) {
					var aSections = oObjectPage.getSections(),
						bUseIconTabBar = oObjectPage.getUseIconTabBar(),
						iSkip = 2;
					for (var iSection = 0; iSection < aSections.length; iSection++) {
						var oSection = aSections[iSection];
						var aSubSections = oSection.getSubSections();
						for (var iSubSection = 0; iSubSection < aSubSections.length; iSubSection++, iSkip--) {
							if (iSkip < 1 || (bUseIconTabBar && iSection > 0)) {
								var oSubSection = aSubSections[iSubSection];
								oSubSection.setBindingContext(null);
							}
						}
					}
				}
			},

			_handleSubSectionEnteredViewPort: function(oEvent) {
				var oSubSection = oEvent.getParameter("subSection");
				oSubSection.setBindingContext(undefined);
			},

			onAfterBinding: function(oBindingContext, mParameters) {
				var oObjectPage = this.byId("fe::ObjectPage"),
					that = this,
					oModel = oBindingContext.getModel(),
					aTables = this._findTables(),
					oFinalUIState;

				// TODO: this is only a temp solution as long as the model fix the cache issue and we use this additional
				// binding with ownRequest
				oBindingContext = oObjectPage.getBindingContext();

				// Compute Edit Mode
				oFinalUIState = this.editFlow.computeEditMode(oBindingContext);

				// update related apps once Data is received in case of binding cache is not available
				// TODO: this is only a temp solution since we need to call _updateRelatedApps method only after data for Object Page is received (if there is no binding)
				if (oBindingContext.getBinding().oCache) {
					that._updateRelatedApps();
				} else {
					var fnUpdateRelatedApps = function() {
						that._updateRelatedApps();
						oBindingContext.getBinding().detachDataReceived(fnUpdateRelatedApps);
					};
					oBindingContext.getBinding().attachDataReceived(fnUpdateRelatedApps);
				}

				// TODO: this should be moved into an init event of the MDC tables (not yet existing) and should be part
				// of any controller extension
				function enableFastCreationRow(oTable, oListBinding) {
					var oFastCreationRow = oTable.getCreationRow(),
						oFastCreationListBinding,
						oFastCreationContext;

					if (oFastCreationRow) {
						oFinalUIState.then(function() {
							if (oFastCreationRow.getVisible()) {
								oFastCreationListBinding = oModel.bindList(oListBinding.getPath(), oListBinding.getContext(), [], [], {
									$$updateGroupId: "doNotSubmit",
									$$groupId: "doNotSubmit"
								});
								// Workaround suggested by OData model v4 colleagues
								oFastCreationListBinding.refreshInternal = function() {};
								/*
                                                                oFastCreationListBinding.hasPendingChanges = function() {
									return false;
								};
                                                                */

								oFastCreationContext = oFastCreationListBinding.create();
								oFastCreationRow.setBindingContext(oFastCreationContext);

								// this is needed to avoid console error
								oFastCreationContext.created().catch(function() {
									Log.trace("transient fast creation context deleted");
								});
							}
						});
					}
				}

				// this should not be needed at the all
				function handleTableModifications(oTable) {
					var oBinding = that.getTableBinding(oTable),
						fnHandleTablePatchEvents = function() {
							enableFastCreationRow(oTable, oBinding);
						};

					if (oBinding.oContext) {
						fnHandleTablePatchEvents();
					} else {
						var fnHandleChange = function() {
							if (oBinding.oContext) {
								fnHandleTablePatchEvents();
								oBinding.detachChange(fnHandleChange);
							}
						};
						oBinding.attachChange(fnHandleChange);
					}
				}

				// take care on message handling, draft indicator (in case of draft)
				var transactionHelper = this.editFlow.getTransactionHelper(),
					oTransactionStateModel = transactionHelper.getUIStateModel();
				oTransactionStateModel.setProperty("/draftStatus", "Clear");

				//Attach the patch sent and patch completed event to the object page binding so that we can react
				var oBinding = (oBindingContext.getBinding && oBindingContext.getBinding()) || oBindingContext;
				oBinding.attachEvent("patchSent", this.editFlow.handlePatchSent, this);
				oBinding.attachEvent("patchCompleted", this.editFlow.handlePatchCompleted, this);

				aTables.forEach(function(oTable) {
					oTable.done().then(handleTableModifications);
					if (oTable.data("quickFilterKey")) {
						TableUtils.handleQuickFilterCounts(oTable, oBindingContext);
					}
				});

				// should be called only after binding is ready hence calling it in onAfterBinding
				oObjectPage._triggerVisibleSubSectionsEvents();
				AppStateHandler.applyAppState(this);
			},

			onPageReady: function(mParameters) {
				var that = this;
				var aTables = this._findTables();
				var oLocalUIModel = this.getView().getModel("localUI");
				aTables.forEach(function(oTable) {
					if (
						oTable.data("creationMode") &&
						oTable.data("creationMode") === "CreationRow" &&
						oTable.getCreationRow().getApplyEnabled() === false
					) {
						oTable.getCreationRow().setApplyEnabled(false);
					}
					var sTableId = that.getView().getLocalId(oTable.getId());
					var selectedCtx = (oTable && oTable.getSelectedContexts()) || [];
					if (selectedCtx.length > 0) {
						// clear selected contexts in the table
						oTable.clearSelection();
						if (oLocalUIModel) {
							// disable bound actions
							oLocalUIModel.setProperty("/$contexts/" + sTableId, {});
						}
					}
				});
				var oLastFocusedControl = mParameters.lastFocusedControl;
				if (oLastFocusedControl && oLastFocusedControl.controlId && oLastFocusedControl.focusInfo) {
					var oView = this.getView();
					var oFocusControl = oView.byId(oLastFocusedControl.controlId);
					if (oFocusControl) {
						oFocusControl.applyFocusInfo(oLastFocusedControl.focusInfo);
						return;
					}
				}
				var oObjectPage = this.byId("fe::ObjectPage");
				// set the focus to the first action button, or to the first editable input if in editable mode
				var isInDisplayMode = oObjectPage.getModel("ui").getProperty("/editMode") === "Display";
				var firstElementClickable;
				if (isInDisplayMode) {
					var aActions = oObjectPage.getHeaderTitle().getActions();
					if (aActions.length) {
						firstElementClickable = aActions.find(function(action) {
							// do we need && action.mProperties["enabled"] ?
							return action.mProperties["visible"];
						});
						if (firstElementClickable) {
							firstElementClickable.focus();
						}
					}
				} else {
					var firstEditableInput = oObjectPage._getFirstEditableInput();
					if (firstEditableInput) {
						firstEditableInput.focus();
					}
				}
			},
			getPageTitleInformation: function() {
				var oObjectPage = this.byId("fe::ObjectPage");
				var oTitleInfo = {
					title: oObjectPage.data("ObjectPageTitle") || "",
					subtitle: "",
					intent: "",
					icon: ""
				};
				var oObjectPageSubtitle = oObjectPage.getCustomData().find(function(oCustomData) {
					return oCustomData.getKey() === "ObjectPageSubtitle";
				});

				// TODO we should not need to care about resolving the binding manually
				if (oObjectPageSubtitle && oObjectPageSubtitle.getBinding("value") !== undefined) {
					if (oObjectPageSubtitle.getBinding("value").isA("sap.ui.model.odata.v4.ODataPropertyBinding")) {
						return oObjectPageSubtitle
							.getBinding("value")
							.requestValue()
							.then(function(sValue) {
								oTitleInfo.subtitle = sValue;
								return oTitleInfo;
							});
					} else if (oObjectPageSubtitle.getBinding("value").isA("sap.ui.model.resource.ResourcePropertyBinding")) {
						oTitleInfo.subtitle = oObjectPageSubtitle.getBinding("value").getValue();
						return Promise.resolve(oTitleInfo);
					}
				} else {
					return Promise.resolve(oTitleInfo);
				}
			},

			executeHeaderShortcut: function(sId) {
				var sButtonId = this.getView().getId() + "--" + sId,
					oButton = this.byId("fe::ObjectPage")
						.getHeaderTitle()
						.getActions()
						.find(function(oElement) {
							return oElement.getId() === sButtonId;
						});
				CommonUtils.fireButtonPress(oButton);
			},

			executeFooterShortcut: function(sId) {
				var sButtonId = this.getView().getId() + "--" + sId,
					oButton = this.byId("fe::ObjectPage")
						.getFooter()
						.getContent()
						.find(function(oElement) {
							return oElement.getMetadata().getName() === "sap.m.Button" && oElement.getId() === sButtonId;
						});
				CommonUtils.fireButtonPress(oButton);
			},

			executeTabShortCut: function(oExecution) {
				var oObjectPage = this.byId("fe::ObjectPage"),
					iSelectedSectionIndex = oObjectPage.indexOfSection(this.byId(oObjectPage.getSelectedSection())),
					aSections = oObjectPage.getSections(),
					iSectionIndexMax = aSections.length - 1,
					sCommand = oExecution.oSource.getCommand(),
					newSection;
				if (iSelectedSectionIndex !== -1 && iSectionIndexMax > 0) {
					if (sCommand === "NextTab") {
						if (iSelectedSectionIndex <= iSectionIndexMax - 1) {
							newSection = aSections[++iSelectedSectionIndex];
						}
					} else {
						// PreviousTab
						if (iSelectedSectionIndex !== 0) {
							newSection = aSections[--iSelectedSectionIndex];
						}
					}
					if (newSection) {
						oObjectPage.setSelectedSection(newSection);
						newSection.focus();
					}
				}
			},

			getFooterVisiblity: function(oEvent) {
				iMessages = oEvent.getParameter("iMessageLength");
				var oLocalUIModel = this.getView().getModel("localUI");
				iMessages > 0
					? oLocalUIModel.setProperty("/showMessageFooter", true)
					: oLocalUIModel.setProperty("/showMessageFooter", false);
			},

			showMessagePopover: function(oMessageButton) {
				var oMessagePopover = oMessageButton.oMessagePopover,
					oItemBinding = oMessagePopover.getBinding("items");
				if (oItemBinding.getLength() > 0) {
					oMessagePopover.openBy(oMessageButton);
				}
			},

			editDocument: function() {
				var oModel = this.getView().getModel("ui");
				BusyLocker.lock(oModel);
				return this.editFlow.editDocument.apply(this.editFlow, arguments).finally(function() {
					BusyLocker.unlock(oModel);
				});
			},

			saveDocument: function(oContext) {
				var that = this,
					oModel = this.getView().getModel("ui"),
					aWaitCreateDocuments = [];
				BusyLocker.lock(oModel);
				this._findTables().forEach(function(oTable) {
					var oBinding = that.getTableBinding(oTable);
					var mParameters = {
						creationMode: oTable.data("creationMode"),
						creationRow: oTable.getCreationRow(),
						createAtEnd: oTable.data("createAtEnd") === "true"
					};
					var bCreateDocument =
						mParameters.creationRow &&
						mParameters.creationRow.getBindingContext() &&
						Object.keys(mParameters.creationRow.getBindingContext().getObject()).length > 1;
					if (bCreateDocument) {
						aWaitCreateDocuments.push(that.editFlow.createDocument(oBinding, mParameters));
					}
				});
				return Promise.all(aWaitCreateDocuments).then(function() {
					return that.editFlow
						.saveDocument(oContext)
						.then(function() {
							var oMessageButton = that.getView().byId("fe::FooterBar::MessageButton");
							var oDelegateOnAfter = {
								onAfterRendering: function(oEvent) {
									that.showMessagePopover(oMessageButton);
									oMessageButton.removeEventDelegate(that._oDelegateOnAfter);
									delete that._oDelegateOnAfter;
								}
							};
							that._oDelegateOnAfter = oDelegateOnAfter;
							oMessageButton.addEventDelegate(oDelegateOnAfter, that);
						})
						.catch(function(err) {
							var oMessageButton = that.getView().byId("fe::FooterBar::MessageButton");
							if (oMessageButton) {
								that.showMessagePopover(oMessageButton);
							}
						})
						.finally(function() {
							BusyLocker.unlock(oModel);
						});
				});
			},

			_updateRelatedApps: function() {
				var oObjectPage = this.byId("fe::ObjectPage");
				if (CommonUtils.resolveStringtoBoolean(oObjectPage.data("showRelatedApps"))) {
					CommonUtils.updateRelatedAppsDetails(oObjectPage);
				}
			},

			//TODO: This is needed for two workarounds - to be removed again
			_findTables: function() {
				var oObjectPage = this.byId("fe::ObjectPage"),
					aTables = [];

				function findTableInSubSection(aParentElement, aSubsection) {
					for (var element = 0; element < aParentElement.length; element++) {
						var oParent = aParentElement[element].getContent instanceof Function && aParentElement[element].getContent(),
							oViewSwitchContainerItem =
								oParent.getMetadata instanceof Function &&
								oParent.getMetadata().getName() === "sap.fe.templates.controls.ViewSwitchContainer" &&
								oParent.getItems().length &&
								oParent.getItems()[0],
							oElement = oViewSwitchContainerItem && oViewSwitchContainerItem.getContent();

						if (oElement && oElement.isA("sap.ui.mdc.Table")) {
							aTables.push(oElement);
							if (
								oElement.getType().isA("sap.ui.mdc.table.GridTableType") &&
								!aSubsection.hasStyleClass("sapUxAPObjectPageSubSectionFitContainer")
							) {
								aSubsection.addStyleClass("sapUxAPObjectPageSubSectionFitContainer");
							}
						}
					}
				}

				var aSections = oObjectPage.getSections();
				for (var section = 0; section < aSections.length; section++) {
					var aSubsections = aSections[section].getSubSections();
					for (var subSection = 0; subSection < aSubsections.length; subSection++) {
						findTableInSubSection(aSubsections[subSection].getBlocks(), aSubsections[subSection]);
						findTableInSubSection(aSubsections[subSection].getMoreBlocks(), aSubsections[subSection]);
					}
				}

				return aTables;
			},
			_findCharts: function() {
				var oObjectPage = this.byId("fe::ObjectPage"),
					aCharts = [];

				function findChartInSubSection(aParentElement, aSubsection) {
					for (var element = 0; element < aParentElement.length; element++) {
						var oParent = aParentElement[element].getAggregation("items") && aParentElement[element].getAggregation("items")[0],
							oElement = oParent && oParent.getAggregation("content");

						if (oElement && oElement.isA("sap.ui.mdc.Chart")) {
							aCharts.push(oElement);
						}
					}
				}

				var aSections = oObjectPage.getSections();
				for (var section = 0; section < aSections.length; section++) {
					var aSubsections = aSections[section].getSubSections();
					for (var subSection = 0; subSection < aSubsections.length; subSection++) {
						findChartInSubSection(aSubsections[subSection].getBlocks(), aSubsections[subSection]);
						findChartInSubSection(aSubsections[subSection].getMoreBlocks(), aSubsections[subSection]);
					}
				}

				return aCharts;
			},

			/**
			 * Method to merge selected contexts and filters
			 * @function
			 * @name _mergePageAndLineContext
			 * @param  {Object} oPageContextData Page context data
			 * @param  {Object/Array} oLineContext Selected Contexts
			 * @returns {object} Selection Variant Object
			 */
			_mergePageAndLineContext: function(oPageContextData, oLineContext) {
				var oMixedContext, oSelectionVariant;
				// Get single line context if necessary
				oLineContext = Array.isArray(oLineContext) && oLineContext.length === 1 ? oLineContext[0] : oLineContext;
				if (oLineContext && Array.isArray(oLineContext)) {
					var oSV = NavigationHelper.mixAttributesAndSelectionVariant(oPageContextData, new SelectionVariant());
					var aContextData = oLineContext.map(function(oC) {
						return oC.getObject();
					});
					oSelectionVariant = NavigationHelper.mixAttributesAndSelectionVariant(aContextData, oSV.toJSONString());
					oLineContext = oLineContext[0];
				} else {
					oMixedContext = merge({}, oPageContextData, oLineContext && oLineContext.getObject());
					oSelectionVariant = NavigationHelper.mixAttributesAndSelectionVariant(oMixedContext, new SelectionVariant());
				}
				return oLineContext ? NavigationHelper.removeSensitiveData(oLineContext, oSelectionVariant) : oSelectionVariant;
			},

			_getBatchGroupsForView: function() {
				var that = this,
					oViewData = that.getView().getViewData(),
					oConfigurations = oViewData.controlConfiguration,
					aConfigurations = oConfigurations && Object.keys(oConfigurations),
					aBatchGroups = ["$auto.Heroes", "$auto.Decoration", "$auto.Workers"];

				if (aConfigurations && aConfigurations.length > 0) {
					aConfigurations.forEach(function(sKey) {
						var oConfiguration = oConfigurations[sKey];
						if (oConfiguration.requestGroupId === "LongRunners") {
							aBatchGroups.push("$auto.LongRunners");
						}
					});
				}
				return aBatchGroups;
			},

			/*
			 * Reset Breadcrumb links
			 *
			 * @function
			 * @param {sap.m.Breadcrumbs} [oSource] parent control
			 * @description Used when context of the objectpage changes.
			 *              This event callback is attached to modelContextChange
			 *              event of the Breadcrumb control to catch context change.
			 *              Then element binding and hrefs are updated for each Link.
			 *
			 * @sap-restricted
			 * @experimental
			 */
			setBreadcrumbLinks: function(oSource) {
				var oContext = oSource.getBindingContext();
				var oAppComponent = CommonUtils.getAppComponent(this.getView());
				if (oContext) {
					var sNewPath = oContext.getPath(),
						aPathParts = sNewPath.split("/"),
						sPath = "";
					aPathParts.shift();
					aPathParts.splice(-1, 1);
					aPathParts.forEach(function(sPathPart, i) {
						sPath += "/" + sPathPart;
						var oRootViewController = oAppComponent.getRootViewController();
						var oTitleHierarchyCache = oRootViewController.getTitleHierarchyCache();
						var pWaitForTitleHiearchyInfo;
						if (!oTitleHierarchyCache[sPath]) {
							pWaitForTitleHiearchyInfo = oRootViewController.addNewEntryInCacheTitle(sPath, oAppComponent);
						} else {
							pWaitForTitleHiearchyInfo = Promise.resolve(oTitleHierarchyCache[sPath]);
						}
						pWaitForTitleHiearchyInfo.then(function(oTitleHiearchyInfo) {
							var oLink = oSource.getLinks()[i] ? oSource.getLinks()[i] : new Link();
							// sCurrentEntity is a fallback value in case of empty title
							var sCurrentEntity = sPathPart.replace(/ *\([^)]*\) */g, "");
							oLink.setText(oTitleHiearchyInfo.subtitle || sCurrentEntity);
							oLink.setHref(oTitleHiearchyInfo.intent);
							if (!oSource.getLinks()[i]) {
								oSource.addLink(oLink);
							}
						});
					});
				}
			},

			handlers: {
				onFieldValueChange: function(oEvent) {
					this.editFlow.syncTask(oEvent.getParameter("promise"));
					FieldRuntime.handleChange(oEvent);
				},
				onShareObjectPageActionButtonPress: function(oEvent, oController) {
					var oControl = oController.getView().byId("fe::Share");
					oController.getPageTitleInformation().then(function(pageTitleInfo) {
						if (oControl && (oControl.getVisible() || (oControl.getEnabled && oControl.getEnabled()))) {
							ShareUtils.onShareActionButtonPressImpl(oControl, oController, pageTitleInfo);
						}
					});
				},
				onRelatedAppsItemPressed: function(oEvent, oController) {
					var oControl = oEvent.getSource(),
						oBindingContext = oController && oController.getView() && oController.getView().getBindingContext();

					oController.editFlow.getProgrammingModel(oBindingContext).then(function(programmingModel) {
						var aCustomData = oControl.getCustomData(),
							targetSemObject,
							targetAction;

						for (var i = 0; i < aCustomData.length; i++) {
							var key = aCustomData[i].getKey();
							var value = aCustomData[i].getValue();
							if (key == "targetSemObject") {
								targetSemObject = value;
							} else if (key == "targetAction") {
								targetAction = value;
							}
						}
						var oTarget = {
							semanticObject: targetSemObject,
							action: targetAction
						};

						var mPageContextData = NavigationHelper.removeSensitiveData(
							oController
								.getView()
								.getAggregation("content")[0]
								.getBindingContext()
						);
						// Incident 2070145088 (v4) & 1980445541 (v2)
						var oSelectionVariant = NavigationHelper.mixAttributesAndSelectionVariant(mPageContextData, new SelectionVariant());
						CommonUtils.navigateToExternalApp(
							oController.getView(),
							oSelectionVariant,
							oTarget.semanticObject,
							oTarget.action,
							null,
							CommonUtils.isStickyEditMode(oControl, programmingModel)
						);
					});
				},
				/**
				 * Invokes an action - bound/unbound and sets the page dirty
				 * @function
				 * @static
				 * @param {string} sActionName The name of the action to be called
				 * @param {map} [mParameters] contains the following attributes:
				 * @param {sap.ui.model.odata.v4.Context} [mParameters.contexts] contexts Mandatory for a bound action, Either one context or an array with contexts for which the action shall be called
				 * @param {sap.ui.model.odata.v4.ODataModel} [mParameters.model] oModel Mandatory for an unbound action, An instance of an OData v4 model
				 * @sap-restricted
				 * @final
				 **/
				onCallActionFromFooter: function(oView, sActionName, mParameters) {
					var oController = oView.getController();
					var that = oController;
					return oController.editFlow
						.onCallAction(sActionName, mParameters)
						.then(function() {
							var oMessageButton = that.getView().byId("fe::FooterBar::MessageButton");
							if (oMessageButton.isActive()) {
								that.showMessagePopover(oMessageButton);
							} else if (iMessages) {
								that._oDelegateOnAfter = {
									onAfterRendering: function(oEvent) {
										that.showMessagePopover(oMessageButton);
										oMessageButton.removeEventDelegate(that._oDelegateOnAfter);
										delete that._oDelegateOnAfter;
									}
								};
								oMessageButton.addEventDelegate(that._oDelegateOnAfter, that);
							}
						})
						.catch(function(err) {
							var oMessageButton = that.getView().byId("fe::FooterBar::MessageButton");
							if (oMessageButton) {
								that.showMessagePopover(oMessageButton);
							}
						});
				},

				onDataFieldForIntentBasedNavigation: function(
					oController,
					sSemanticObject,
					sAction,
					sMappings,
					aLineContexts,
					bRequiresContext,
					bInline
				) {
					var oControl = oController && oController.getView(),
						oBindingContext = oControl && oControl.getBindingContext();

					if (bInline === "true" && (bRequiresContext === "false" || bRequiresContext === "undefined")) {
						MessageBox.show(ResourceModel.getText("navigation.CONTEXT_MESSAGE"), {
							title: ResourceModel.getText("navigation.ERROR_TITLE")
						});
					} else {
						oController.editFlow.getProgrammingModel(oBindingContext).then(function(programmingModel) {
							var oSelectionVariant;
							var mPageContextData = {};
							if (bRequiresContext || aLineContexts) {
								//If requirescontext is true then only consider passing contexts
								if (
									oController
										.getView()
										.getAggregation("content")[0]
										.getBindingContext()
								) {
									mPageContextData = NavigationHelper.removeSensitiveData(
										oController
											.getView()
											.getAggregation("content")[0]
											.getBindingContext()
									); // In OP we will always pass pagecontext when requirescontext is true
								}
								// Line context is considered if a context is selected in the table and also requirescontext is true
								oSelectionVariant = oController._mergePageAndLineContext(mPageContextData, aLineContexts);

								if (sMappings != "undefined") {
									oSelectionVariant = FEHelper.setSemanticObjectMappings(oSelectionVariant, sMappings);
								}
							}
							// Opening the IBN link in new tab if application is in sticky edit mode
							CommonUtils.navigateToExternalApp(
								oController.getView(),
								oSelectionVariant,
								sSemanticObject,
								sAction,
								null,
								CommonUtils.isStickyEditMode(oControl, programmingModel)
							);
						});
					}
				},

				/**
				 * Triggers an outbound navigation on Chevron Press
				 * @param {string} outboundTarget name of the outbound target (needs to be defined in the manifest)
				 * @param {sap.ui.model.odata.v4.Context} Context that contain the data for the target app
				 * @returns {Promise} Promise which is resolved once the navigation is triggered (??? maybe only once finished?)
				 */
				onChevronPressNavigateOutBound: function(oController, sOutboundTarget, oContext) {
					var oControl = oController && oController.getView(),
						oBindingContext = oControl && oControl.getBindingContext();

					return oController.editFlow.getProgrammingModel(oBindingContext).then(function(programmingModel) {
						var oOutbounds = oController.routing.getOutbounds(),
							oSelectionVariant,
							oDisplayOutbound = oOutbounds[sOutboundTarget],
							mPageContextData = NavigationHelper.removeSensitiveData(
								oController
									.getView()
									.getAggregation("content")[0]
									.getBindingContext()
							);

						if (oDisplayOutbound) {
							if (oContext) {
								oSelectionVariant = oController._mergePageAndLineContext(mPageContextData, oContext);
							}
							// Opening the IBN link in new tab if application is in sticky edit mode
							CommonUtils.navigateToExternalApp(
								oController.getView(),
								oSelectionVariant,
								oDisplayOutbound.semanticObject,
								oDisplayOutbound.action,
								CommonHelper.showNavigateErrorMessage,
								CommonUtils.isStickyEditMode(oControl, programmingModel)
							);

							return Promise.resolve();
						} else {
							throw new Error("outbound target " + sOutboundTarget + " not found in cross navigation definition of manifest");
						}
					});
				},
				onNavigateChange: function(oEvent) {
					//will be called always when we click on a section tab
					AppStateHandler.createAppState(this, oEvent);
					this.bSectionNavigated = true;
				},
				onVariantSelected: function(oEvent) {
					AppStateHandler.createAppState(this, oEvent);
				},
				onVariantSaved: function(oEvent) {
					var that = this;
					var oLocalEvent = merge({}, oEvent); //using merge to create a copy of oEvent because it is undefined once we enter setTimeOut
					//TODO: Should remove this setTimeOut once Variant Management provides an api to fetch the current variant key on save
					setTimeout(function() {
						AppStateHandler.createAppState(that, oLocalEvent);
					}, 500);
				}
			}
		});
	}
);
