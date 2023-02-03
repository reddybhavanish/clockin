/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2020 SAP SE. All rights reserved
    
 */

/* global hasher */
sap.ui.define(
	[
		"sap/ui/core/mvc/Controller",
		"sap/ui/model/json/JSONModel",
		"sap/fe/core/controllerextensions/Routing",
		"sap/fe/core/controllerextensions/FlexibleColumnLayout",
		"sap/fe/core/controllerextensions/EditFlow",
		"sap/fe/macros/field/FieldRuntime",
		"sap/fe/macros/CommonHelper",
		"sap/fe/core/AnnotationHelper",
		"sap/fe/core/actions/messageHandling",
		"sap/base/Log",
		"sap/base/util/ObjectPath",
		"sap/fe/navigation/SelectionVariant",
		"sap/m/MessageBox",
		"sap/fe/core/CommonUtils",
		"sap/fe/navigation/NavigationHelper",
		"sap/fe/navigation/library",
		"sap/fe/core/FEHelper",
		"sap/fe/core/AppStateHandler",
		"sap/ui/mdc/p13n/StateUtil",
		"sap/fe/macros/table/Utils",
		"sap/fe/macros/ResourceModel",
		"sap/fe/core/controllerextensions/RoutingListener",
		"sap/ui/model/Filter",
		"sap/ui/model/FilterOperator",
		"sap/fe/macros/chart/ChartRuntime",
		"sap/fe/templates/controls/Share/ShareUtils"
		//"sap/fe/core/controllerextensions/AppState" The AppState is currently deactivated
	],
	function(
		Controller,
		JSONModel,
		Routing,
		FlexibleColumnLayoutExt,
		EditFlow,
		FieldRuntime,
		CommonHelper,
		AnnotationHelper,
		messageHandling,
		Log,
		ObjectPath,
		SelectionVariant,
		MessageBox,
		CommonUtils,
		NavigationHelper,
		NavLibrary,
		FEHelper,
		AppStateHandler,
		StateUtil,
		TableUtils,
		ResourceModel,
		RoutingListener,
		Filter,
		FilterOperator,
		ChartRuntime,
		ShareUtils
	) {
		"use strict";

		return Controller.extend("sap.fe.templates.ListReport.ListReportController", {
			routing: Routing,
			routingListener: RoutingListener,
			editFlow: EditFlow,
			fcl: FlexibleColumnLayoutExt,

			//appState : AppState, The AppState is currently deactivated

			// TODO: get rid of this
			// it's currently needed to show the transient messages after the table request fails
			// we assume that the table should show those messages in the future
			messageHandling: messageHandling,

			onInit: function() {
				var that = this;
				// set filter bar to disabled until app state is loaded
				// TODO: there seems to be a big in the filter layout - to be checked
				//this.oFilterBar.setEnabled(false);

				// disable for now - TODO: enable with actions again
				//this.setShareModel();

				// store the controller for later use
				// Set internal UI model and model from transaction controller
				this.getView().setModel(this.editFlow.getTransactionHelper().getUIStateModel(), "ui");
				this.getView().setModel(
					this.editFlow.getUIStateModel({
						sessionOn: false,
						appliedFilters: ""
					}),
					"localUI"
				);
				// Store conditions from filter bar
				// this is later used before navigation to get conditions applied on the filter bar
				this.filterBarConditions = {};
				//temporary workaround until mdc chart provides a way to raect on chart selection and chart rebind
				var oMdcChart = this._getChartControl();
				if (oMdcChart) {
					oMdcChart.oChartPromise.then(function(oChart) {
						that._chartInfo = {
							bChartSelectionsChanged: false,
							aChartFilters: []
						};
						var oChartBinding = oChart.getBinding("data");
						var oFilterBar = that._getFilterBarControl();
						if (oChartBinding) {
							// applying iappstate filters
							// since the chart binding is created after the search event is triggered
							// temporary workaround
							oChartBinding.filter(oFilterBar.getFilters());
							oChartBinding.attachDataReceived(that.handlers.fnOnChartDataReceived.bind(that));
						}
						oChart.attachSelectData(that.handlers.fnOnChartSelectionChanged.bind(that));
						oChart.attachDeselectData(that.handlers.fnOnChartSelectionChanged.bind(that));
					});
				}
				// request a new appState Model for the view
				/*
						// The AppState is currently deactivated
						this.appState.requestAppStateModel(this.getView().getId()).then(function(oAppStateModel){
							that.getView().setModel(oAppStateModel, "sap.fe.appState");

							// This is only a workaround as the controls do not yet support binding the appState
							var oAppState = oAppStateModel.getData();
							if (oAppState && oAppState.filterBar) {
								// an app state exists, apply it
								that.applyAppStateToFilterBar().then(function () {
									// enable filterbar once the app state is applied
									that.oFilterBar.setEnabled(true);
								});
							} else {
								that.oFilterBar.setEnabled(true);
							}

							// attach to further app state changed
							//oAppStateModel.bindList("/").attachChange(that.applyAppStateToFilterBar.bind(that));
						});
						*/
				Promise.all([this._getFilterBarControl().waitForInitialization(), this._getTableControl().done()]).then(function() {
					AppStateHandler.init();
					AppStateHandler.applyAppState(that);
				});
			},
			onExit: function() {
				delete this.filterBarConditions;
				delete this._oListReportControl;
			},
			onAfterBinding: function(oBindingContext, mParameters) {
				if (this.routing.isUIStateDirty()) {
					var oTableBinding = this.getTableBinding();
					var oLocalUIModel = this.getView().getModel("localUI");
					if (oTableBinding) {
						oTableBinding.refresh();
						if (oLocalUIModel) {
							// clear any previous selection to disable bound actions
							oLocalUIModel.setProperty("/$contexts", {});
						}
					}
					this.routing.setUIStateProcessed();
				}
			},

			onAfterRendering: function(oEvent) {
				var that = this;
				this.getView()
					.getModel("sap.fe.i18n")
					.getResourceBundle()
					.then(function(response) {
						that.oResourceBundle = response;
					});
			},

			onPageReady: function(mParameters) {
				var oLastFocusedControl = mParameters.lastFocusedControl;
				var oView = this.getView();
				// set the focus to the first action button, or to the first editable input if in editable mode
				if (oLastFocusedControl && oLastFocusedControl.controlId && oLastFocusedControl.focusInfo) {
					var oFocusControl = oView.byId(oLastFocusedControl.controlId);
					if (oFocusControl) {
						oFocusControl.applyFocusInfo(oLastFocusedControl.focusInfo);
					}
				}
			},

			getPageTitleInformation: function() {
				var that = this;
				return new Promise(function(resolve, reject) {
					var oTitleInfo = { title: "", subtitle: "", intent: "", icon: "" };
					oTitleInfo.title = that
						.getView()
						.getContent()[0]
						.data().ListReportTitle;
					oTitleInfo.subtitle = that
						.getView()
						.getContent()[0]
						.data().ListReportSubtitle;
					resolve(oTitleInfo);
				});
			},
			_getFilterBarControl: function() {
				return this.getView().byId(this._getFilterBarControlId());
			},
			_getFilterBarControlId: function() {
				return this.getView()
					.getContent()[0]
					.data("filterBarId");
			},
			_getChartControlId: function() {
				return this.getView()
					.getContent()[0]
					.data("reportChartId");
			},

			_getChartControl: function() {
				return this.getView().byId(this._getChartControlId());
			},
			_getInnerChartControl: function() {
				return this._getChartControl().getAggregation("_chart");
			},
			_getTableControlId: function() {
				return this.getView()
					.getContent()[0]
					.data("reportTableId");
			},
			_getTableControl: function() {
				if (!this._oListReportControl) {
					this._oListReportControl = this.getView().byId(this._getTableControlId());
				}
				return this._oListReportControl;
			},

			getTableBinding: function() {
				var oTableControl = this._getTableControl(),
					oBinding = oTableControl && oTableControl._getRowBinding();

				return oBinding;
			},

			/**
			 * Method to merge selected contexts and filters
			 * @function
			 * @name _getMergedContext
			 * @param  {Object/Array} oContext Array or single Context
			 * @param  {Object} filterBarConditions FilterBar conditions
			 * @returns {object} Selection Variant Object
			 */
			_getMergedContext: function(oContext, filterBarConditions) {
				var oFilterBarSV, oSelectionVariant;
				oFilterBarSV = CommonUtils.addExternalStateFiltersToSelectionVariant(new SelectionVariant(), filterBarConditions);
				// Get single from array if necessary
				oContext = Array.isArray(oContext) && oContext.length === 1 ? oContext[0] : oContext;
				if (Array.isArray(oContext)) {
					var aContextData = oContext.map(function(oC) {
						return oC.getObject();
					});
					oSelectionVariant = NavigationHelper.mixAttributesAndSelectionVariant(aContextData, oFilterBarSV.toJSONString());
					oContext = oContext[0];
				} else {
					oSelectionVariant = NavigationHelper.mixAttributesAndSelectionVariant(
						oContext.getObject(),
						oFilterBarSV.toJSONString()
					);
				}
				return NavigationHelper.removeSensitiveData(oContext, oSelectionVariant);
			},

			// This is only a workaround as the filterBar does not yet support binding the appState
			/*
		 // The AppState is currently deactivated
		createAppStateFromFilterBar: function () {
			var sFilterBarAppState = this.oFilterBar.getAppState();

			if (!sFilterBarAppState) {
				// no app state exists and filter bar does not have any app state relevant changes, there is
				// no need to generate an app state
				return;
			}

			var oAppState = {
				filterBar: sFilterBarAppState
			};

			this.getView().getModel("sap.fe.appState").setData(oAppState);
		},

		// This is only a workaround as the filterBar does not yet support binding the appState
		applyAppStateToFilterBar: function () {
			var	oAppState = this.getView().getModel("sap.fe.appState").getData();

			if (oAppState && oAppState.filterBar) {
				return this.oFilterBar.setAppState(oAppState.filterBar);
			}
		},
		*/
			setShareModel: function() {
				// TODO: deactivated for now - currently there is no _templPriv anymore, to be discussed
				// this method is currently not called anymore from the init method

				var fnGetUser = ObjectPath.get("sap.ushell.Container.getUser");
				//var oManifest = this.getOwnerComponent().getAppComponent().getMetadata().getManifestEntry("sap.ui");
				//var sBookmarkIcon = (oManifest && oManifest.icons && oManifest.icons.icon) || "";

				//shareModel: Holds all the sharing relevant information and info used in XML view
				var oShareInfo = {
					bookmarkTitle: document.title, //To name the bookmark according to the app title.
					bookmarkCustomUrl: function() {
						var sHash = hasher.getHash();
						return sHash ? "#" + sHash : window.location.href;
					},
					/*
								To be activated once the FLP shows the count - see comment above
								bookmarkServiceUrl: function() {
									//var oTable = oTable.getInnerTable(); oTable is already the sap.fe table (but not the inner one)
									// we should use table.getListBindingInfo instead of the binding
									var oBinding = oTable.getBinding("rows") || oTable.getBinding("items");
									return oBinding ? fnGetDownloadUrl(oBinding) : "";
								},*/
					isShareInJamActive: !!fnGetUser && fnGetUser().isJamActive()
				};

				var oTemplatePrivateModel = this.getOwnerComponent().getModel("_templPriv");
				oTemplatePrivateModel.setProperty("/listReport/share", oShareInfo);
			},
			_getChartSelections: function(oChart) {
				var aSelectedPoints = [];
				switch (oChart.getSelectionBehavior()) {
					case "DATAPOINT":
						aSelectedPoints = oChart.getSelectedDataPoints().dataPoints;
						break;
					case "CATEGORY":
						aSelectedPoints = oChart.getSelectedCategories().categories;
						break;
					case "SERIES":
						aSelectedPoints = oChart.getSelectedSeries().series;
						break;
				}
				return aSelectedPoints;
			},
			handlers: {
				onShareListReportActionButtonPress: function(oEvent, oController) {
					var oControl = oController.getView().byId("fe::Share");
					if (oControl && (oControl.getVisible() || (oControl.getEnabled && oControl.getEnabled()))) {
						ShareUtils.onShareActionButtonPressImpl(oControl, oController, null);
					}
				},
				onFiltersChanged: function(oEvent) {
					var oFilterBar = oEvent.getSource(),
						oModel = this.getView().getModel("localUI");
					var oMdcChart = this._getChartControl();
					var that = this;
					if (oMdcChart) {
						oMdcChart.setBlocked(true);
					}
					oModel.setProperty("/appliedFilters", oFilterBar.getAssignedFiltersText());
					Promise.all([oFilterBar.waitForInitialization(), this._getTableControl().done()]).then(function() {
						AppStateHandler.createAppState(that);
					});
				},
				onVariantSelected: function(oEvent) {
					AppStateHandler.createAppState(this);
				},
				onVariantSaved: function(oEvent) {
					var that = this;
					//TODO: Should remove this setTimeOut once Variant Management provides an api to fetch the current variant key on save
					setTimeout(function() {
						AppStateHandler.createAppState(that);
					}, 500);
				},
				onSearch: function(oEvent) {
					var that = this;
					var oTable = this._getTableControl();
					var oPageBindingContext = this.getView().getBindingContext();

					TableUtils.handleQuickFilterCounts(oTable, oPageBindingContext);
					var oFilterBar = oEvent.getSource();
					// store filter bar conditions to use later while navigation
					StateUtil.retrieveExternalState(oFilterBar).then(function(oExternalState) {
						that.filterBarConditions = oExternalState.filter;
						// temporary workaround until mdc chart implements an association to the mdc filterbar
						var oMdcChart = that._getChartControl();
						if (oMdcChart) {
							oMdcChart.setBlocked(false);
							var oBinding = oMdcChart.getBinding("data");
							if (oBinding) {
								that._chartInfo.bChartSelectionsChanged = false;
								oBinding.filter(oFilterBar.getFilters());
							}
						}
					});
				},
				onFieldValueChange: function(oEvent) {
					this.editFlow.syncTask(oEvent.getParameter("promise"));
					FieldRuntime.handleChange(oEvent);
				},
				onDataFieldForIntentBasedNavigation: function(
					oController,
					sSemanticObject,
					sAction,
					sMappings,
					vContext,
					bRequiresContext,
					bInline
				) {
					// 1. Also consider FilterBar conditions
					// 2. convert them into SV
					// 3. Merge both oContext and SV from FilterBar (2)
					// if there is no FilterBar conditions then simply use oContext to create a SelectionVariant
					var oSelectionVariant;

					if (bInline === "true" && (bRequiresContext === "false" || bRequiresContext === "undefined")) {
						sap.m.MessageBox.show(ResourceModel.getText("navigation.CONTEXT_MESSAGE"), {
							title: ResourceModel.getText("navigation.ERROR_TITLE")
						});
					} else {
						if (vContext) {
							oSelectionVariant = oController._getMergedContext(vContext, oController.filterBarConditions);
							if (sMappings != "undefined") {
								oSelectionVariant = FEHelper.setSemanticObjectMappings(oSelectionVariant, sMappings);
							}
						}

						CommonUtils.navigateToExternalApp(oController.getView(), oSelectionVariant, sSemanticObject, sAction);
					}
				},
				/**
				 * Triggers an outbound navigation on Chevron Press
				 * @param {string} outboundTarget name of the outbound target (needs to be defined in the manifest)
				 * @param {sap.ui.model.odata.v4.Context} Context that contain the data for the target app
				 * @returns {Promise} Promise which is resolved once the navigation is triggered (??? maybe only once finished?)
				 *
				 * @sap-restricted
				 * @final
				 */
				onChevronPressNavigateOutBound: function(oController, sOutboundTarget, oContext) {
					var oOutbounds = oController.routing.getOutbounds(),
						oSelectionVariant,
						oDisplayOutbound = oOutbounds[sOutboundTarget];
					if (oDisplayOutbound) {
						if (oContext) {
							oSelectionVariant = oController._getMergedContext(oContext, oController.filterBarConditions);
						}
						CommonUtils.navigateToExternalApp(
							oController.getView(),
							oSelectionVariant,
							oDisplayOutbound.semanticObject,
							oDisplayOutbound.action,
							CommonHelper.showNavigateErrorMessage
						);

						return Promise.resolve();
					} else {
						throw new Error("outbound target " + sOutboundTarget + " not found in cross navigation definition of manifest");
					}
				},
				fnOnChartDataReceived: function(oEvent) {
					var oTable = this._getTableControl(),
						oChart = this._getInnerChartControl(),
						aChartFilters = this._chartInfo.aChartFilters,
						bChartSelectionsChanged = this._chartInfo.bChartSelectionsChanged,
						bSelectionsExistInCurrentDrill = this._getChartSelections(oChart).length > 0,
						oBinding = oChart.getBinding("data");

					// apply drillstack
					if (oBinding && bChartSelectionsChanged && !bSelectionsExistInCurrentDrill) {
						this._chartInfo.bChartSelectionsChanged = false;
						oBinding.filter(aChartFilters);
						if (oTable) {
							oTable.rebindTable();
							oTable.getRowsBindingInfo().binding.filter(new Filter(aChartFilters, true));
						}
					}
				},
				fnOnChartSelectionChanged: function(oEvent) {
					var oChart = oEvent.getSource(),
						oTable = this._getTableControl(),
						oFilterBar = this._getFilterBarControl(),
						visibleDimensions = oChart.getVisibleDimensions(),
						aSelectedPoints,
						allFilters = [],
						aChartFilters = [],
						oFilterBarFilters = oFilterBar.getFilters(),
						aVizSelections = oChart._getVizFrame().vizSelection() || [];
					if (oEvent.getParameter("data")) {
						// update action buttons enablement / disablement
						ChartRuntime.fnUpdateChart(oEvent, oChart);
						this._chartInfo.bChartSelectionsChanged = true;
					}
					if (aVizSelections.length > 0) {
						aSelectedPoints = this._getChartSelections(oChart);
						for (var i in visibleDimensions) {
							aChartFilters = [];
							var sPath = visibleDimensions[i];
							for (var item in aSelectedPoints) {
								var oSelectedItem = aSelectedPoints[item];
								var oSelectedContext = oSelectedItem.context;
								aChartFilters.push(
									new Filter({
										path: sPath,
										operator: FilterOperator.EQ,
										value1: oSelectedContext.getProperty(sPath)
									})
								);
							}
							if (aChartFilters.length > 0) {
								allFilters.push(new Filter(aChartFilters, false));
							}
						}
					}
					if (oFilterBarFilters) {
						allFilters.push(new Filter(oFilterBarFilters, false));
					}
					if (oTable) {
						this._chartInfo.aChartFilters = allFilters;
						oTable.rebindTable();
						if (aVizSelections.length > 0) {
							oTable.getRowsBindingInfo().binding.filter(new Filter(allFilters, true));
						}
					}
				}
			}
		});
	}
);
