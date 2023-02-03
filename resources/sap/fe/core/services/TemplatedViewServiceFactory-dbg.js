sap.ui.define(
	[
		"sap/ui/core/service/Service",
		"sap/ui/core/service/ServiceFactory",
		"sap/ui/core/service/ServiceFactoryRegistry",
		"sap/ui/model/base/ManagedObjectModel",
		"sap/ui/core/cache/CacheManager",
		"sap/ui/model/resource/ResourceModel",
		"sap/ui/core/mvc/View",
		"sap/ui/core/Component",
		"sap/ui/model/json/JSONModel",
		"sap/base/Log",
		"sap/ui/core/routing/HashChanger",
		"sap/fe/core/TemplateModel",
		"sap/fe/core/converters/MetaModelConverter",
		"sap/fe/core/helpers/DynamicAnnotationPathHelper"
	],
	function(
		Service,
		ServiceFactory,
		ServiceFactoryRegistry,
		ManagedObjectModel,
		Cache,
		ResourceModel,
		View,
		Component,
		JSONModel,
		Log,
		HashChanger,
		TemplateModel,
		MetaModelConverter,
		DynamicAnnotationPathHelper
	) {
		"use strict";

		function MetaPath(name, initialPath) {
			this.name = name;
			this.currentPath = initialPath || "";
			this.lastPath = "";
			this.set = function(sNewPath) {
				while (sNewPath.indexOf("../") === 0) {
					this.currentPath = this.currentPath.substr(0, this.currentPath.lastIndexOf(this.lastPath) - 1);
					this.lastPath = this.currentPath.substr(this.currentPath.lastIndexOf("/") + 1);
					sNewPath = sNewPath.substr(3);
				}
				if (sNewPath) {
					this.lastPath = sNewPath;
				}
				this.currentPath += sNewPath;
				Log.info(this.name + " is now : " + this.currentPath);
			};
			this.get = function() {
				return this.currentPath;
			};
			this.delete = function() {
				this.currentPath = "";
				Log.info(this.name + " has been deleted");
			};
		}

		var TemplatedViewService = Service.extend("sap.fe.core.services.TemplatedViewService", {
			initPromise: null,
			init: function() {
				var that = this;
				var aServiceDependencies = [];
				var oContext = this.getContext();
				var oComponent = oContext.scopeObject;
				var oAppComponent = Component.getOwnerComponentFor(oComponent);
				var oMetaModel = oAppComponent.getMetaModel();
				var sStableId = oAppComponent.getMetadata().getComponentName() + "::" + oAppComponent.getLocalId(oComponent.getId());
				var aEnhanceI18n = oComponent.getEnhanceI18n() || [];

				if (aEnhanceI18n) {
					// the i18n URIs are only relative to the app component but the enhancement works with the path
					// relative to the document.uri
					for (var i = 0; i < aEnhanceI18n.length; i++) {
						aEnhanceI18n[i] = oAppComponent.getManifestObject().resolveUri(aEnhanceI18n[i], "manifest");
					}
				}

				var sCacheIdentifier =
					oAppComponent.getMetadata().getName() +
					"_" +
					sStableId +
					"_" +
					sap.ui
						.getCore()
						.getConfiguration()
						.getLanguageTag();
				aServiceDependencies.push(
					ServiceFactoryRegistry.get("sap.fe.core.services.ResourceModelService")
						.createInstance({
							scopeType: "component",
							scopeObject: oComponent,
							settings: {
								bundles: ["sap.fe.core", "sap.fe.templates"],
								enhanceI18n: aEnhanceI18n,
								modelName: "sap.fe.i18n"
							}
						})
						.then(function(oResourceModelService) {
							return oResourceModelService.getResourceModel();
						})
				);

				aServiceDependencies.push(
					ServiceFactoryRegistry.get("sap.fe.core.services.CacheHandlerService")
						.createInstance({
							settings: {
								metaModel: oMetaModel
							}
						})
						.then(function(oCacheHandlerService) {
							return oCacheHandlerService.validateCacheKey(sCacheIdentifier);
						})
				);

				this.initPromise = Promise.all(aServiceDependencies)
					.then(function(aDependenciesResult) {
						var oResourceModel = aDependenciesResult[0];
						var sCacheKey = aDependenciesResult[1];
						return that.createView(oResourceModel, sStableId, sCacheKey);
					})
					.then(function(sCacheKey) {
						var oCacheHandlerService = ServiceFactoryRegistry.get("sap.fe.core.services.CacheHandlerService").getInstance(
							oMetaModel
						);
						oCacheHandlerService.invalidateIfNeeded(sCacheKey, sCacheIdentifier);
					});
			},
			createView: function(oResourceModel, sStableId, sCacheKey) {
				var that = this;
				var oContext = this.getContext(),
					mServiceSettings = oContext.settings,
					sViewName = mServiceSettings.viewName,
					oComponent = oContext.scopeObject,
					sEntitySet = oComponent.getProperty("entitySet"),
					oAppComponent = Component.getOwnerComponentFor(oComponent),
					oMetaModel = oAppComponent.getMetaModel(),
					oDeviceModel = new JSONModel(sap.ui.Device).setDefaultBindingMode("OneWay"),
					oManifestModel = new JSONModel(oAppComponent.getManifest()),
					oMetaPathModel = new JSONModel({
						currentPath: new MetaPath(),
						navigationPath: new MetaPath("NavigationPath")
					});

				this.oFactory = oContext.factory;

				return oAppComponent
					.getService("routingService")
					.then(function(oRoutingService) {
						// Retrieve the viewLevel for the component
						var oTargetInfo = oRoutingService.getTargetInformationFor(oComponent);
						var mViewData = {
							navigation: oComponent.getNavigation(),
							viewLevel: oTargetInfo.viewLevel,
							stableId: sStableId
						};

						if (oComponent.getViewData) {
							Object.assign(mViewData, oComponent.getViewData());
						}

						var oViewDataModel = new JSONModel(mViewData),
							oPageConfigModel = new JSONModel(
								MetaModelConverter.convertPage(sViewName.split(".").pop(), oMetaModel, mViewData)
							),
							oTemplateModel = oContext.oTemplateModel,
							oGlobalConfigModel = oContext.oConfigModel,
							oGlobalConfigData = oGlobalConfigModel.getData();
						oGlobalConfigData[sStableId] = oPageConfigModel.getData();
						if (mViewData && mViewData.controlConfiguration) {
							Object.keys(mViewData.controlConfiguration).forEach(function(sAnnotationPath) {
								if (sAnnotationPath.indexOf("[") !== -1) {
									var sTargetAnnotationPath = DynamicAnnotationPathHelper.resolveDynamicExpression(
										sAnnotationPath,
										oMetaModel
									);
									mViewData.controlConfiguration[sTargetAnnotationPath] = mViewData.controlConfiguration[sAnnotationPath];
								}
							});
						}

						var oViewSettings = {
							type: "XML",
							preprocessors: {
								xml: {
									bindingContexts: {
										entitySet: sEntitySet
											? oTemplateModel.createBindingContext("/" + sEntitySet, null, {
													$$configModelPath: "/" + sStableId + "/" + sEntitySet
											  })
											: null,
										viewData: mViewData ? oViewDataModel.createBindingContext("/") : null
									},
									models: {
										entitySet: oTemplateModel,
										"sap.fe.i18n": oResourceModel,
										"sap.ui.mdc.metaModel": oMetaModel,
										"sap.fe.deviceModel": oDeviceModel, // TODO: discuss names here
										manifest: oManifestModel,
										viewData: oViewDataModel,
										metaPath: oMetaPathModel
									}
								}
							},
							id: sStableId,
							viewName: mServiceSettings.viewName,
							viewData: mViewData,
							cache: { keys: [sCacheKey] },
							height: "100%"
						};

						function createErrorPage(reason) {
							// just replace the view name and add an additional model containing the reason, but
							// keep the other settings
							Log.error(reason);
							oViewSettings.viewName = mServiceSettings.errorViewName || "sap.fe.core.services.view.TemplatingErrorPage";
							oViewSettings.preprocessors.xml.models["error"] = new JSONModel(reason);

							return oComponent.runAsOwner(function() {
								return View.create(oViewSettings);
							});
						}

						return oComponent.runAsOwner(function() {
							return View.create(oViewSettings)
								.catch(createErrorPage)
								.then(function(oView) {
									that.oView = oView;
									that.oView.setModel(new ManagedObjectModel(that.oView), "$view");
									oComponent.setAggregation("rootControl", that.oView);
									return sCacheKey;
								})
								.catch(Log.error);
						});
					})
					.catch(function(error) {
						throw new Error("Error while creating view : " + error);
					});
			},
			getView: function() {
				return this.oView;
			},
			exit: function() {
				// Deregister global instance
				this.oFactory.removeGlobalInstance();
			}
		});

		return ServiceFactory.extend("sap.fe.core.services.TemplatedViewServiceFactory", {
			_oInstanceRegistry: {},
			createInstance: function(oServiceContext) {
				var oAppComponent = Component.getOwnerComponentFor(oServiceContext.scopeObject);
				if (!this._oInstanceRegistry[oAppComponent]) {
					var oConfigModel = new JSONModel();
					this._oInstanceRegistry[oAppComponent] = {
						configModel: oConfigModel,
						templateModel: new TemplateModel(oAppComponent.getMetaModel(), oConfigModel)
					};
				}
				oServiceContext.oTemplateModel = this._oInstanceRegistry[oAppComponent].templateModel;
				oServiceContext.oConfigModel = this._oInstanceRegistry[oAppComponent].configModel;

				var oTemplatedViewService = new TemplatedViewService(Object.assign({ factory: this }, oServiceContext));
				return oTemplatedViewService.initPromise.then(function() {
					return oTemplatedViewService;
				});
			},
			removeGlobalInstance: function() {
				this._oInstanceRegistry = {};
			}
		});
	},
	true
);
