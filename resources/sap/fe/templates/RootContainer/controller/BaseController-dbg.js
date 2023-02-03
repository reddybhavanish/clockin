sap.ui.define(
	[
		"sap/ui/model/json/JSONModel",
		"sap/ui/core/mvc/Controller",
		"sap/ui/core/Component",
		"sap/ui/core/routing/HashChanger",
		"sap/fe/core/CommonUtils",
		"sap/base/Log"
	],
	function(JSONModel, Controller, Component, HashChanger, CommonUtils, Log) {
		"use strict";

		return Controller.extend("sap.fe.templates.RootContainer.controller.BaseController", {
			onInit: function() {
				this.shellTitleHandler();
			},
			/**
			 * function waiting for the Right most view to be ready
			 * @name sap.fe.templates.RootContainer.controller.BaseController#waitForRightMostViewReady
			 * @memberof sap.fe.templates.RootContainer.controller.BaseController
			 * @param {*} oEvent reference an Event parameter coming from routeMatched event
			 */
			waitForRightMostViewReady: function(oEvent) {
				return new Promise(function(resolve, reject) {
					var aContainers = oEvent.getParameter("views");
					var oViewCtr = aContainers[aContainers.length - 1].getComponentInstance();
					var oView = oViewCtr.getRootControl();
					if (oViewCtr.isPageReady()) {
						resolve(oView);
					} else {
						oViewCtr.attachEventOnce("pageReady", function() {
							resolve(oView);
						});
					}
				});
			},

			/**
			 * This function is updating the shell title after each navigation
			 * @name sap.fe.templates.RootContainer.controller.BaseController#shellTitleHandler
			 * @memberof sap.fe.templates.RootContainer.controller.BaseController
			 */
			shellTitleHandler: function() {
				var that = this;
				var oRootView = this.getView();
				var oAppComponent = CommonUtils.getAppComponent(oRootView);
				var oRouter = oAppComponent.getRouter();
				var fnRouteMatched = function(oEvent) {
					that.waitForRightMostViewReady(oEvent)
						.then(function(oView) {
							var oAppComponent = CommonUtils.getAppComponent(oView);
							var oRouterProxy = oAppComponent.getRouterProxy();
							var oData = { oView: oView, oAppComponent: oAppComponent };
							that.computeTitleHierarchy(oData);
							var oHistory = oRouterProxy._oManagedHistory;
							var sCurrenthash = window.location.hash;
							var oLastFocusedControl;
							for (var i = oHistory.length - 1; i > -1; i--) {
								var sHash = "#" + oHistory[i].hash;
								if (sCurrenthash === sHash || sHash === sCurrenthash + "&/") {
									oLastFocusedControl = oHistory[i].oLastFocusControl;
									break;
								} else {
									oHistory[i].oLastFocusControl = undefined;
								}
							}
							if (oView.getController().onPageReady) {
								oView.getParent().onPageReady({ lastFocusedControl: oLastFocusedControl });
							}
						})
						.catch(function() {
							Log.error("An error occurs while computing the title hierarchy and calling focus method");
						});
				};
				oRouter.attachRouteMatched(fnRouteMatched);
			},

			/**
			 * This function returns the TitleHierarchy cache ( or initializes it if undefined)
			 * @name sap.fe.templates.RootContainer.controller.BaseController#getTitleHierarchyCache
			 * @memberof sap.fe.templates.RootContainer.controller.BaseController
			 *
			 * @returns {object}  returns the TitleHierarchy cache
			 */
			getTitleHierarchyCache: function() {
				if (!this.oTitleHierarchyCache) {
					this.oTitleHierarchyCache = {};
				}
				return this.oTitleHierarchyCache;
			},

			/**
			 * This function returns a titleInfo object
			 * @name sap.fe.templates.RootContainer.controller.BaseController#_computeTitleInfo
			 * @memberof sap.fe.templates.RootContainer.controller.BaseController
			 * @param {*} title
			 * @param {*} subtitle
			 * @param {*} intent path to be redirected to
			 *
			 * @returns {object}  oTitleinformation
			 */
			_computeTitleInfo: function(title, subtitle, intent) {
				return {
					title: title,
					subtitle: subtitle,
					intent: intent,
					icon: ""
				};
			},

			/**
			 * This function is updating the cache to store Title Information
			 * @name sap.fe.templates.RootContainer.controller.BaseController#addNewEntryINCacheTitle
			 * @memberof sap.fe.templates.RootContainer.controller.BaseController
			 * @param {*} sPath path of the context to retrieve title information from MetaModel
			 * @param {*} oAppComponent reference to the oAppComponent
			 *
			 * @returns {promise}  oTitleinformation returned as promise
			 */

			addNewEntryInCacheTitle: function(sPath, oAppComponent) {
				var oTitleModel = this.getView().getModel("title");
				if (!oTitleModel) {
					var sServiceUrl = oAppComponent.getMetadata().getManifestEntry("/sap.app/dataSources/mainService/uri");
					oTitleModel = new sap.ui.model.odata.v4.ODataModel({
						serviceUrl: sServiceUrl,
						synchronizationMode: "None"
					});
				}
				var that = this;
				var sEntityPath = sPath.replace(/ *\([^)]*\) */g, "");
				var oTitle = oAppComponent.getMetaModel().getProperty(sEntityPath + "/@com.sap.vocabularies.UI.v1.HeaderInfo/Title/Value");
				var sTypeName = oAppComponent.getMetaModel().getProperty(sEntityPath + "/@com.sap.vocabularies.UI.v1.HeaderInfo/TypeName");
				var oBindingViewContext = oTitleModel.createBindingContext(sPath);
				var oPropertyBinding = oTitleModel.bindProperty(oTitle["$Path"], oBindingViewContext);
				oAppComponent.getRootControl().setModel(oTitleModel, "title");
				oPropertyBinding.initialize();
				return new Promise(function(resolve, reject) {
					var sAppSpecificHash = HashChanger.getInstance().hrefForAppSpecificHash("");
					var sIntent = sAppSpecificHash + sPath.slice(1);
					var fnChange = function(oEvent) {
						var oTitleHierarchyCache = that.getTitleHierarchyCache();
						oTitleHierarchyCache[sPath] = that._computeTitleInfo(sTypeName, oEvent.getSource().getValue(), sIntent);
						resolve(oTitleHierarchyCache[sPath]);
						oPropertyBinding.detachChange(fnChange);
					};
					oPropertyBinding.attachChange(fnChange);
				});
			},

			/**
			 * This function is updating the shell title after each navigation
			 * @name sap.fe.templates.RootContainer.controller.BaseController#computeTitleHierarchy
			 * @memberof sap.fe.templates.RootContainer.controller.BaseController
			 * @param {*} object containing reference to view and to oAppComponent
			 */
			computeTitleHierarchy: function(oData) {
				var that = this,
					oView = oData.oView,
					oAppComponent = oData.oAppComponent,
					oContext = oView.getBindingContext(),
					oCurrentPage = oView.getParent(),
					aTitleInformationPromises = [],
					sAppSpecificHash = HashChanger.getInstance().hrefForAppSpecificHash(""),
					sAppTitle = oAppComponent.getMetadata().getManifestEntry("sap.app").title || "",
					sAppSubTitle = oAppComponent.getMetadata().getManifestEntry("sap.app").appSubTitle || "",
					sAppRootPath = sAppSpecificHash,
					oPageTitleInformationPromise,
					sNewPath;

				if (this.bIsComputingTitleHierachy === true) {
					Log.warning("computeTitleHierarchy already running ... this call is canceled");
					return;
				}
				this.bIsComputingTitleHierachy = true;

				if (oCurrentPage && oCurrentPage.getPageTitleInformation) {
					if (oContext) {
						sNewPath = oContext.getPath();
						var aPathParts = sNewPath.split("/"),
							sTargetType,
							sPath = "",
							iNbPathParts = aPathParts.length;
						aPathParts.splice(-1, 1);

						aPathParts.forEach(function(sPathPart, i) {
							if (i === 0) {
								var aRoutes = oAppComponent.getManifestEntry("/sap.ui5/routing/routes"),
									aTargets = oAppComponent.getManifestEntry("/sap.ui5/routing/targets");
								var fnTargetTypeEval = function(sTarget) {
									if (typeof aRoutes[this.index].target === "string") {
										return sTarget === aRoutes[this.index].target;
									} else if (typeof aRoutes[this.index].target === "object") {
										for (var k = 0; k < aRoutes[this.index].target.length; k++) {
											return sTarget === aRoutes[this.index].target[k];
										}
									}
								};
								for (var j = 0; j < aRoutes.length; j++) {
									var oRoute = oAppComponent.getRouter().getRoute(aRoutes[j].name);
									if (oRoute.match(aPathParts[i])) {
										var sTarget = Object.keys(aTargets).find(fnTargetTypeEval, { index: j });
										sTargetType = oAppComponent.getRouter().getTarget(sTarget)._oOptions.name;
										break;
									}
								}
								if (sTargetType === "sap.fe.templates.ListReport") {
									aTitleInformationPromises.push(
										Promise.resolve(that._computeTitleInfo(sAppTitle, sAppSubTitle, sAppRootPath))
									);
								}
							} else if (i < iNbPathParts) {
								sPath += "/" + sPathPart;
								if (!that.getTitleHierarchyCache()[sPath]) {
									aTitleInformationPromises.push(that.addNewEntryInCacheTitle(sPath, oAppComponent));
								} else {
									aTitleInformationPromises.push(Promise.resolve(that.getTitleHierarchyCache()[sPath]));
								}
							}
						});
					}
					oPageTitleInformationPromise = oCurrentPage.getPageTitleInformation().then(function(oPageTitleInformation) {
						oPageTitleInformation.intent = sAppSpecificHash + HashChanger.getInstance().getHash();
						if (oContext) {
							that.getTitleHierarchyCache()[sNewPath] = oPageTitleInformation;
						} else {
							that.getTitleHierarchyCache()[sAppRootPath] = oPageTitleInformation;
						}
						return oPageTitleInformation;
					});
					aTitleInformationPromises.push(oPageTitleInformationPromise);
				} else {
					aTitleInformationPromises.push(Promise.reject("Title information missing in HeaderInfo"));
				}
				Promise.all(aTitleInformationPromises)
					.then(function(aTitleInfoHierarchy) {
						oAppComponent.getService("ShellUIService").then(
							function(oService) {
								var sTitle = aTitleInfoHierarchy[aTitleInfoHierarchy.length - 1].title;
								oService.setHierarchy(aTitleInfoHierarchy.reverse());
								oService.setTitle(sTitle);
							},
							function(oError) {
								Log.warning("No ShellService available");
							}
						);
					})
					.catch(function(sErrorMessage) {
						Log.error(sErrorMessage);
					})
					.finally(function() {
						that.bIsComputingTitleHierachy = false;
					});
			}
		});
	}
);
