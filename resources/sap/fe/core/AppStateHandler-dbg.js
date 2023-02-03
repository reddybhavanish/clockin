/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2020 SAP SE. All rights reserved
    
 */
/* global Promise */
sap.ui.define(
	[
		"sap/ui/mdc/p13n/StateUtil",
		"sap/fe/navigation/library",
		"sap/fe/core/CommonUtils",
		"sap/ui/fl/apply/api/ControlVariantApplyAPI",
		"sap/fe/navigation/NavigationHelper",
		"sap/ui/core/routing/HashChanger",
		"sap/base/Log",
		"sap/base/util/merge"
	],
	function(StateUtil, NavLibrary, CommonUtils, ControlVariantApplyAPI, NavigationHelper, HashChanger, Log, merge) {
		"use strict";
		var AppStateHandler = {
			bIsAppStateReady: false,
			sNavType: null,
			bNoRouteChange: false,
			mInnerAppDataForFCL: {},
			mInnerAppDataForOP: {},
			getAppData: Promise.resolve(),
			init: function() {
				this.bIsAppStateReady = false;
			},
			/**
			 * Creates an appstate on every filter change and also variant change.
			 * @function
			 * @static
			 * @name sap.fe.core.AppStateHandler.
			 * @memberof sap.fe.core.AppStateHandler
			 * @param {object} oController Instance of the controller passed
			 * @private
			 * @sap-restricted
			 **/
			createAppState: function(oController, oEvent) {
				/* currently we are passing the controller of the view for which we need to create the app state but in future this can also be used to create
				appstate for storing the control level data by passing the control */
				var oComponent = oController.getOwnerComponent();
				this.bNoRouteChange = false;
				if (oComponent.isA("sap.fe.templates.ListReport.Component") && this._getIsAppStateReady()) {
					this._fnCreateAppStateForLR(oController);
				} else if (oComponent.isA("sap.fe.templates.ObjectPage.Component") && this._getIsAppStateReady()) {
					//code for storing appstate for OP and SUB OP to be placed here
					this._fnCreateAppStateForOP(oController, oEvent);
				}
			},

			/**
			 * Applies an appstate by fetching appdata and passing it to _applyAppstateToPage.
			 * @function
			 * @static
			 * @name sap.fe.core.AppStateHandler.
			 * @memberof sap.fe.core.AppStateHandler
			 * @param {object} oController Instance of the controller passed
			 * @private
			 * @sap-restricted
			 **/
			applyAppState: function(oController) {
				var that = this;
				var oAppComponent = CommonUtils.getAppComponent(oController.getView());
				that.getAppData = oAppComponent.getService("navigation").then(function(oNavigationService) {
					return oNavigationService
						.parseNavigation()
						.done(function(oAppData, oStartupParameters, sNavType) {
							that.sNavType = sNavType;
							if (sNavType) {
								that._applyAppStateToPage(oController, oAppData, oStartupParameters, sNavType);
							} else {
								//if navtype is not iAppState then set the app state ready to true
								that._setIsAppStateReady(true, oController);
							}
						})
						.fail(function() {
							that._setIsAppStateReady(true, oController);
							Log.warning("Parse Navigation failed");
						});
				});
			},

			/**
			 * Applies appstate to the page.
			 * @function
			 * @static
			 * @name sap.fe.core.AppStateHandler.
			 * @memberof sap.fe.core.AppStateHandler
			 * @param {object} oController Instance of the controller passed
			 * @param {object} oAppData Object containing the appdata fetched from parse navigation promise
			 * @param {object} oStartupParameters Object containing the startupparameters of the component fetched from parse navigation promise
			 * @param {string} sNavType Type of the navigation
			 * @private
			 * @sap-restricted
			 **/
			_applyAppStateToPage: function(oController, oAppData, oStartupParameters, sNavType) {
				var that = this,
					oConditions,
					oFilterBar,
					oAppComponent = CommonUtils.getAppComponent(oController.getView()),
					oMetaModel = oAppComponent.getMetaModel(),
					oViewData = oController.getView().getViewData(),
					sEntitySet = oViewData.entitySet,
					oComponent = oController.getOwnerComponent();

				if (sNavType !== "iAppState" && oComponent.isA("sap.fe.templates.ListReport.Component")) {
					oConditions = {};
					oFilterBar = oController.getView().byId(
						oController
							.getView()
							.getContent()[0]
							.data("filterBarId")
					);
					if (oAppData.oSelectionVariant) {
						var aMandatoryFilterFields = CommonUtils.getMandatoryFilterFields(oMetaModel, sEntitySet);
						NavigationHelper.addDefaultDisplayCurrency(aMandatoryFilterFields, oAppData);
						CommonUtils.addSelectionVariantToConditions(oAppData.oSelectionVariant, oConditions, oMetaModel, sEntitySet);
						var oVariant, oVariantKey;
						switch (oController.getView().getViewData().variantManagement) {
							case "Page":
								oVariant = oController.getView().byId("fe::PageVariantManagement");
								if (oAppData.bNavSelVarHasDefaultsOnly) {
									oVariantKey = oVariant.getDefaultVariantKey();
								} else {
									oVariantKey = oVariant.getStandardVariantKey();
								}
								if (oVariantKey === null) {
									oVariantKey = oVariant.getId();
								}
								ControlVariantApplyAPI.activateVariant({
									element: oAppComponent,
									variantReference: oVariantKey
								}).then(function() {
									if (
										!(
											oAppData.bNavSelVarHasDefaultsOnly &&
											oVariant.getDefaultVariantKey() !== oVariant.getStandardVariantKey()
										)
									) {
										that._fnClearFilterAndReplaceWithAppState(oConditions, oController, oFilterBar, oVariant);
									} else {
										that._setIsAppStateReady(true, oController);
									}
								});
								break;
							case "Control":
								oVariant = oController.getView().byId(
									oController
										.getView()
										.getContent()[0]
										.data("filterBarVariantId")
								);
								if (oAppData.bNavSelVarHasDefaultsOnly) {
									oVariantKey = oVariant.getDefaultVariantKey();
								} else {
									oVariantKey = oVariant.getStandardVariantKey();
								}
								if (oVariantKey === null) {
									oVariantKey = oVariant.getId();
								}
								ControlVariantApplyAPI.activateVariant({
									element: oAppComponent,
									variantReference: oVariantKey
								})
									.then(function() {
										if (
											!(
												oAppData.bNavSelVarHasDefaultsOnly &&
												oVariant.getDefaultVariantKey() !== oVariant.getStandardVariantKey()
											)
										) {
											that._fnClearFilterAndReplaceWithAppState(oConditions, oController, oFilterBar, oVariant);
										} else {
											that._setIsAppStateReady(true, oController);
										}
									})
									.catch(function() {
										that._setIsAppStateReady(true, oController);
										Log.warning("Activate Variant failed");
									});
								break;
							case "None":
								that._fnClearFilterAndReplaceWithAppState(oConditions, oController, oFilterBar);
								break;
							default:
								that._fnClearFilterAndReplaceWithAppState(oConditions, oController, oFilterBar);
								Log.error(
									"Variant Management not correctly defined, variable wrongly set to: " +
										oController.getView().getViewData().variantManagement
								);
								break;
						}
					} else {
						that._setIsAppStateReady(true, oController);
					}
				} else if (oComponent.isA("sap.fe.templates.ListReport.Component")) {
					this._fnApplyAppStatetoLR(oController, oAppData);
				} else {
					this._fnApplyAppStatetoOP(oController, oAppData);
				}
			},

			/**
			 * Creates key to store app data
			 * @function
			 * @static
			 * @name sap.fe.core.AppStateHandler.
			 * @memberof sap.fe.core.AppStateHandler
			 * @param {array} aEntitySet Array of EntitySets to be concatenated
			 * @param {sControl} sControl name of the control for which the appdata needs to be stored
			 * @returns {string} key for the app state data
			 * @private
			 * @sap-restricted
			 **/

			createKeyForAppStateData: function(sView, aEntitySet, sControl) {
				/* EG: sView = OP
						aEntitySet = ["SalesOrderManage","_Item"]
						sControl = Table
						Now the key should be "OP_SalesOrderManage/_Item/Table" which means we are storing appdata for the OP table _Item
				*/
				var sKey = "";
				sKey = sKey + sView + "_" + aEntitySet[0] + "/";
				if (aEntitySet.length > 1) {
					for (var i = 1; i < aEntitySet.length; i++) {
						sKey = sKey + aEntitySet[i] + "/";
					}
				}
				sKey = sKey + sControl;
				return sKey;
			},

			_setIsAppStateReady: function(bIsAppStateReady, oController) {
				this.bIsAppStateReady = bIsAppStateReady;
				if (oController && oController.getOwnerComponent().isA("sap.fe.templates.ListReport.Component")) {
					if (this._getNavType() !== "iAppState") {
						this.createAppState(oController);
					}
					var oFilterBar = oController.getView().byId(
						oController
							.getView()
							.getContent()[0]
							.data("filterBarId")
					);
					var oInitialLoad = oController.getView().getViewData().initialLoad;
					var oLiveMode = oController.getView().getViewData().liveMode;
					if (
						(oLiveMode === true && Object.keys(oFilterBar.getFilterConditions()).length === 0) ||
						(oLiveMode === false &&
							(this._getNavType() === "xAppState" ||
								this._getNavType() === "URLParams" ||
								((this._getNavType() === "initial" || this._getNavType() === "iAppState") && oInitialLoad === true)))
					) {
						oFilterBar.fireSearch();
					}
				}
			},
			_getIsAppStateReady: function() {
				return this.bIsAppStateReady;
			},
			removeSensitiveDataForIAppState: function(oData, oMetaModel, sEntitySet) {
				var aPropertyAnnotations;
				var sKey = "LR_" + sEntitySet + "/FilterBar";
				var oFilterData = oData.appState[sKey].filter;
				var aKeys = Object.keys(oFilterData);
				aKeys.map(function(sProp) {
					if (sProp !== "$editState") {
						aPropertyAnnotations = oMetaModel && oMetaModel.getObject("/" + sEntitySet + "/" + sProp + "@");
						if (aPropertyAnnotations) {
							if (NavigationHelper._checkPropertyAnnotationsForSensitiveData(aPropertyAnnotations)) {
								delete oFilterData[sProp];
							}
						}
					}
				});
				oData.appState[sKey].filter = oFilterData;
				return oData;
			},
			_fnCreateAppStateForLR: function(oController) {
				//if we are in LR and also if appstate is ready and also navtype is iAppState then only create an appstate
				var that = this;
				return new Promise(function(resolve) {
					var oAppComponent = CommonUtils.getAppComponent(oController.getView());
					var oViewData = oController.getView().getViewData();
					var oModel = oController.getView().getModel();
					var oMetaModel = oModel && oModel.getMetaModel();
					var sEntitySet = oViewData.entitySet;
					var bIsFclEnabled = oAppComponent.getRootViewController().isFclEnabled();
					var oRouterProxy = oAppComponent.getRouterProxy();
					var sHash = HashChanger.getInstance().getHash();
					var sTemplate = "LR";
					var sFilterBarKey = that.createKeyForAppStateData(sTemplate, [sEntitySet], "FilterBar");
					var mInnerAppData = {};
					if (bIsFclEnabled) {
						that.mInnerAppDataForFCL = that.mInnerAppDataForFCL || {};
						mInnerAppData = merge({}, that.mInnerAppDataForFCL);
					}
					var sVariantKey, sTableKey, oVariant, oVariantFilterBar, oVariantReportTable;
					var oFilterBar = oController.getView().byId(
						oController
							.getView()
							.getContent()[0]
							.data("filterBarId")
					);
					StateUtil.retrieveExternalState(oFilterBar)
						.then(function(mExtConditions) {
							oAppComponent.getService("navigation").then(function(oNavigationService) {
								mInnerAppData[sFilterBarKey] = mExtConditions;
								switch (oController.getView().getViewData().variantManagement) {
									case "Page":
										oVariant = oController.getView().byId("fe::PageVariantManagement");
										sVariantKey = that.createKeyForAppStateData(sTemplate, [sEntitySet], "Variant");
										var sVariantId = oVariant.getModified()
											? oVariant.getStandardVariantKey()
											: oVariant.getCurrentVariantKey();
										//Sometimes getCurrentVariantKey and getStandardKey return null while creating i-appstate initially while loading app. So setting the variant id to standard in that case
										sVariantId = that.fnCheckForNullVariantId(oVariant, sVariantId);
										mInnerAppData[sVariantKey] = {
											"variantId": sVariantId
										};
										break;
									case "Control":
										sTableKey = that.createKeyForAppStateData(sTemplate, [sEntitySet], "@UI.LineItem");
										oVariantFilterBar = oController.getView().byId(
											oController
												.getView()
												.getContent()[0]
												.data("filterBarVariantId")
										);
										oVariantReportTable = oController
											.getView()
											.byId(
												oController
													.getView()
													.getContent()[0]
													.data("reportTableId")
											)
											.getVariant();
										var sTableVariantId = oVariantReportTable.getCurrentVariantKey();
										//Sometimes getCurrentVariantKey and getStandardKey return null while creating i-appstate initially while loading app. So setting the variant id to standard in that case
										sTableVariantId = that.fnCheckForNullVariantId(oVariantReportTable, sTableVariantId);
										var sFilterBarVariantId = oVariantFilterBar.getModified()
											? oVariantFilterBar.getStandardVariantKey()
											: oVariantFilterBar.getCurrentVariantKey();
										sFilterBarVariantId = that.fnCheckForNullVariantId(oVariantFilterBar, sFilterBarVariantId);
										mInnerAppData[sFilterBarKey].variantId = sFilterBarVariantId;
										mInnerAppData[sTableKey] = {
											"variantId": sTableVariantId
										};
										break;
									case "None":
										break;
									default:
										Log.error(
											"Variant Management not correctly defined, variable wrongly set to: " +
												oController.getView().getViewData().variantManagement
										);
										break;
								}
								var oStoreData = {
									appState: mInnerAppData
								};
								oStoreData = that.removeSensitiveDataForIAppState(oStoreData, oMetaModel, sEntitySet, bIsFclEnabled);
								var oAppState = oNavigationService.storeInnerAppStateWithImmediateReturn(
									oStoreData,
									true,
									sEntitySet,
									true
								);
								var sAppStateKey = oAppState.appStateKey;
								var sNewHash = oNavigationService.replaceInnerAppStateKey(sHash, sAppStateKey);
								oRouterProxy.navToHash(sNewHash);
								if (bIsFclEnabled) {
									that.mInnerAppDataForFCL = merge({}, mInnerAppData);
								}
								resolve({ appState: mInnerAppData });
							});
						})
						.catch(function() {
							Log.warning("Retrieve External State failed");
							if (that._getIsAppStateReady() === false) {
								that._setIsAppStateReady(true, oController);
							}
						});
				});
			},
			_fnCreateAppStateForOP: function(oController, oEvent) {
				var that = this;
				return new Promise(function(resolve) {
					var oAppComponent = CommonUtils.getAppComponent(oController.getView());
					var oViewData = oController.getView().getViewData();
					var sEntitySet = oViewData.entitySet;
					var bIsFclEnabled = oAppComponent.getRootViewController().isFclEnabled();
					var oRouterProxy = oAppComponent.getRouterProxy();
					var sHash = HashChanger.getInstance().getHash();
					var sSelectedSection;
					var sNavigationProperty;
					var sTemplate = "OP";
					var sSectionKey = that.createKeyForAppStateData(sTemplate, [sEntitySet], "Section");
					var oLocalEvent = merge({}, oEvent);
					oAppComponent.getService("navigation").then(function(oNavigationService) {
						var mInnerAppOPData = {};
						if (bIsFclEnabled) {
							mInnerAppOPData = merge({}, that.mInnerAppDataForFCL);
						} else {
							mInnerAppOPData = merge({}, that.mInnerAppDataForOP);
						}
						//var oObjectPageLayout = oController.getView().byId("fe::op");
						if (oLocalEvent && oLocalEvent.getSource().isA("sap.uxap.ObjectPageLayout")) {
							sSelectedSection = oLocalEvent.getParameter("section").getId();
							mInnerAppOPData[sSectionKey] = {
								"selectedSection": sSelectedSection
							};
						}
						if (oLocalEvent && oLocalEvent.getSource().isA("sap.ui.fl.variants.VariantManagement")) {
							var sTableId = oLocalEvent
								.getSource()
								.getId()
								.split("::VM")[0];
							sNavigationProperty = oController
								.getView()
								.byId(sTableId)
								.getRowsBindingInfo().path;
							var sQualifier = "";
							if (sTableId.indexOf("LineItem::") > -1) {
								sQualifier = sTableId.split("::")[sTableId.split("::").length - 1];
							}
							var sTableKey;
							if (sQualifier) {
								sTableKey = that.createKeyForAppStateData(
									sTemplate,
									[sEntitySet, sNavigationProperty],
									"@UI.LineItem#" + sQualifier
								);
							} else {
								sTableKey = that.createKeyForAppStateData(sTemplate, [sEntitySet, sNavigationProperty], "@UI.LineItem");
							}
							var sTableVariantId = oLocalEvent.getSource().getCurrentVariantKey();
							//Sometimes getCurrentVariantKey and getStandardKey return null while creating i-appstate initially loading app. So setting the variant id to standard in that case
							sTableVariantId = that.fnCheckForNullVariantId(oLocalEvent.getSource(), sTableVariantId);
							mInnerAppOPData[sTableKey] = {
								"variantId": sTableVariantId
							};
						}
						var oStoreData = {
							appState: mInnerAppOPData
						};
						var oAppState = oNavigationService.storeInnerAppStateWithImmediateReturn(oStoreData, true, sEntitySet, true);
						var sAppStateKey = oAppState.appStateKey;
						var sNewHash = oNavigationService.replaceInnerAppStateKey(sHash, sAppStateKey);
						if (sNewHash !== sHash) {
							oRouterProxy.navToHash(sNewHash);
							that.bNoRouteChange = true;
						}
						if (bIsFclEnabled) {
							that.mInnerAppDataForFCL = merge({}, mInnerAppOPData);
						} else {
							that.mInnerAppDataForOP = merge({}, mInnerAppOPData);
						}
						resolve(oStoreData);
					});
				});
			},
			_fnApplyAppStatetoLR: function(oController, oAppData) {
				var that = this,
					sTemplate,
					oFilterBar,
					oAppComponent = CommonUtils.getAppComponent(oController.getView()),
					oViewData = oController.getView().getViewData(),
					sEntitySet = oViewData.entitySet,
					bIsFclEnabled = oAppComponent.getRootViewController().isFclEnabled();
				if (bIsFclEnabled) {
					if (oAppData && oAppData.appState) {
						that.mInnerAppDataForFCL = merge({}, oAppData.appState, that.mInnerAppDataForFCL);
					}
				}
				sTemplate = "LR";
				var sFilterBarKey = that.createKeyForAppStateData(sTemplate, [sEntitySet], "FilterBar");
				var sVariantKey, sTableKey;
				oFilterBar = oController.getView().byId(
					oController
						.getView()
						.getContent()[0]
						.data("filterBarId")
				);
				var oVariant;

				if (oAppData && oAppData.appState) {
					//First apply the variant from the appdata
					switch (oController.getView().getViewData().variantManagement) {
						case "Page":
							oVariant = oController.getView().byId("fe::PageVariantManagement");
							sVariantKey = that.createKeyForAppStateData(sTemplate, [sEntitySet], "Variant");
							if (oAppData.appState[sVariantKey] && oAppData.appState[sVariantKey].variantId) {
								ControlVariantApplyAPI.activateVariant({
									element: oAppComponent,
									variantReference: oAppData.appState[sVariantKey].variantId
								})
									.then(function() {
										that._fnClearFilterAndReplaceWithAppState(
											oAppData.appState[sFilterBarKey].filter,
											oController,
											oFilterBar,
											oVariant
										);
									})
									.catch(function() {
										that._fnClearFilterAndReplaceWithAppState(
											oAppData.appState[sFilterBarKey].filter,
											oController,
											oFilterBar,
											oVariant
										);
										Log.warning("Activate Variant failed");
									});
							} else {
								if (oAppData.appState[sFilterBarKey] && oAppData.appState[sFilterBarKey].filter) {
									that._fnClearFilterAndReplaceWithAppState(
										oAppData.appState[sFilterBarKey].filter,
										oController,
										oFilterBar,
										oVariant
									);
								}
							}
							break;
						case "Control":
							oVariant = oController.getView().byId(
								oController
									.getView()
									.getContent()[0]
									.data("filterBarVariantId")
							);
							sTableKey = that.createKeyForAppStateData(sTemplate, [sEntitySet], "@UI.LineItem");
							if (
								oAppData.appState[sFilterBarKey] &&
								oAppData.appState[sFilterBarKey].variantId &&
								oAppData.appState[sTableKey] &&
								oAppData.appState[sTableKey].variantId
							) {
								Promise.all([
									ControlVariantApplyAPI.activateVariant({
										element: oAppComponent,
										variantReference: oAppData.appState[sFilterBarKey].variantId
									}),
									ControlVariantApplyAPI.activateVariant({
										element: oAppComponent,
										variantReference: oAppData.appState[sTableKey].variantId
									})
								])
									.then(function() {
										that._fnClearFilterAndReplaceWithAppState(
											oAppData.appState[sFilterBarKey].filter,
											oController,
											oFilterBar,
											oVariant
										);
									})
									.catch(function() {
										that._fnClearFilterAndReplaceWithAppState(
											oAppData.appState[sFilterBarKey].filter,
											oController,
											oFilterBar,
											oVariant
										);
										Log.warning("Activate Variant failed");
									});
							} else {
								if (oAppData.appState[sFilterBarKey] && oAppData.appState[sFilterBarKey].filter) {
									that._fnClearFilterAndReplaceWithAppState(
										oAppData.appState[sFilterBarKey].filter,
										oController,
										oFilterBar,
										oVariant
									);
								}
							}
							break;
						case "None":
							if (oAppData.appState[sFilterBarKey] && oAppData.appState[sFilterBarKey].filter) {
								StateUtil.applyExternalState(oFilterBar, {
									filter: oAppData.appState[sFilterBarKey].filter
								})
									.then(function() {
										that._setIsAppStateReady(true, oController);
									})
									.catch(function() {
										Log.warning("Apply External State Failed");
										that._setIsAppStateReady(true, oController);
									});
							}
							break;
						default:
							that._fnClearFilterAndReplaceWithAppState(oAppData.appState[sFilterBarKey].filter, oController, oFilterBar);
							Log.error(
								"Variant Management not correctly defined, variable wrongly set to: " +
									oController.getView().getViewData().variantManagement
							);
							break;
					}
				}
			},
			_fnApplyAppStatetoOP: function(oController, oAppData) {
				var that = this,
					sTemplate,
					oAppComponent = CommonUtils.getAppComponent(oController.getView()),
					oViewData = oController.getView().getViewData(),
					sEntitySet = oViewData.entitySet,
					bIsFclEnabled = oAppComponent.getRootViewController().isFclEnabled();
				sTemplate = "OP";
				if (bIsFclEnabled) {
					if (oAppData && oAppData.appState) {
						that.mInnerAppDataForFCL = merge({}, oAppData.appState, that.mInnerAppDataForFCL);
					}
				} else if (oAppData && oAppData.appState) {
					that.mInnerAppDataForOP = merge({}, oAppData.appState, that.mInnerAppDataForOP);
				}
				var aTables = oController._findTables();
				var sSectionKey = that.createKeyForAppStateData(sTemplate, [sEntitySet], "Section");
				var oObjectPageLayout = oController.getView().byId("fe::ObjectPage");
				var aAppStateDataKeys = (oAppData && oAppData.appState && Object.keys(oAppData.appState)) || [];
				var aActivateVariantPromises = [];
				var sQualifier, oVariantTable, sNavigationProperty;
				var fnRetrieveTableVariant = function() {
					for (var j = 0; j < aTables.length; j++) {
						if (aTables[j].getRowsBindingInfo().path === sNavigationProperty) {
							var sId = aTables[j].getId();
							if (sQualifier) {
								if (sId.indexOf("LineItem::") > -1 && sId.split("::")[sId.split("::").length - 1] === sQualifier) {
									oVariantTable = aTables[j];
									break;
								}
							} else if (aTables[j].getId().indexOf("LineItem::") === -1) {
								oVariantTable = aTables[j];
								break;
							}
						}
					}
				};
				var fnApplySectionAndSetAppStateReady = function() {
					if (oAppData && oAppData.appState && oAppData.appState[sSectionKey]) {
						oObjectPageLayout.setSelectedSection(oAppData.appState[sSectionKey].selectedSection);
						that._setIsAppStateReady(true);
					} else {
						that._setIsAppStateReady(true);
					}
				};
				for (var i = 0; i < aAppStateDataKeys.length; i++) {
					if (aAppStateDataKeys[i].indexOf("OP_" + sEntitySet) > -1 && aAppStateDataKeys[i].indexOf("@UI.LineItem") > -1) {
						var sTableKey = aAppStateDataKeys[i];
						sNavigationProperty = aAppStateDataKeys[i].split("/")[aAppStateDataKeys[i].split("/").length - 2];
						if (sTableKey.indexOf("#") > -1) {
							sQualifier = sTableKey.split("#")[1];
							fnRetrieveTableVariant();
						} else {
							fnRetrieveTableVariant();
						}
						if (oVariantTable) {
							aActivateVariantPromises.push(
								ControlVariantApplyAPI.activateVariant({
									element: oVariantTable,
									variantReference: oAppData.appState[sTableKey].variantId
								})
							);
						}
					}
				}
				if (aActivateVariantPromises.length) {
					Promise.all(aActivateVariantPromises)
						.then(function() {
							fnApplySectionAndSetAppStateReady();
						})
						.catch(function() {
							fnApplySectionAndSetAppStateReady();
							Log.warning("Activate Variant failed");
						});
				} else {
					fnApplySectionAndSetAppStateReady();
				}
			},
			_fnClearFilterAndReplaceWithAppState: function(oConditions, oController, oFilterBar, oVariant) {
				var oAppComponent = CommonUtils.getAppComponent(oController.getView()),
					oMetaModel = oAppComponent.getMetaModel(),
					oViewData = oController.getView().getViewData(),
					sEntitySet = oViewData.entitySet;
				var oEntityType = oMetaModel.getObject("/" + sEntitySet + "/");
				var that = this;
				var oClearConditions = {};
				var oObj;
				for (var sKey in oEntityType) {
					oObj = oEntityType[sKey];
					if (oObj) {
						if (oObj.$kind === "Property") {
							//Remove non filterable properties
							if (
								that.sNavType === "iAppState" &&
								!CommonUtils.isPropertyFilterable(oMetaModel, "/" + sEntitySet, sKey, false)
							) {
								continue;
							}
							oClearConditions[sKey] = [];
						}
					}
				}

				//After applying the variant , clear all the filterable properties
				//TODO: Currently we are fetching all the filterable properties from the entitytype and explicitly clearing the state by setting its value to []
				//This is just a workaround till StateUtil provides an api to clear the state.
				StateUtil.applyExternalState(oFilterBar, {
					filter: oClearConditions
				}).then(function() {
					//Now apply the filters fetched from the appstate
					var oState = {
						filter: oConditions
					};

					if (that.sNavType !== "iAppState") {
						oState.items = Object.keys(oConditions).reduce(function(aCumulativeItems, sPropertyName) {
							if (
								!oMetaModel.getObject("/" + sEntitySet + "/" + sPropertyName + "@com.sap.vocabularies.UI.v1.HiddenFilter")
							) {
								aCumulativeItems.push({
									name: sPropertyName
								});
							}
							return aCumulativeItems;
						}, []);
					}
					StateUtil.applyExternalState(oFilterBar, oState)
						.then(function() {
							if (oVariant && oVariant.getStandardVariantKey() !== oVariant.getCurrentVariantKey()) {
								oVariant.setModified(false);
							}
							that._setIsAppStateReady(true, oController); //once the filters are applied and appstate is applied then set appstate ready to true
						})
						.catch(function() {
							Log.warning("Apply External State failed");
							that._setIsAppStateReady(true, oController);
						});
				});
			},
			_getNavType: function() {
				return this.sNavType;
			},

			/**
			 * To check is route is changed by change in the iAPPState
			 * @function
			 **/
			checkIfRouteChangedByIApp: function() {
				return this.bNoRouteChange;
			},
			/**
			 * Reset the route changed by iAPPState.
			 * @function
			 **/
			resetRouteChangedByIApp: function() {
				if (this.bNoRouteChange) {
					this.bNoRouteChange = false;
				}
			},
			fnCheckForNullVariantId: function(oVariant, sVariantId) {
				if (sVariantId === null) {
					sVariantId = oVariant.getId();
				}
				return sVariantId;
			}
		};
		return AppStateHandler;
	},
	/* bExport= */
	true
);
