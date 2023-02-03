sap.ui.define(
	[
		"sap/ui/core/service/Service",
		"sap/ui/core/service/ServiceFactory",
		"sap/ui/model/resource/ResourceModel",
		"sap/base/i18n/ResourceBundle"
	],
	function(Service, ServiceFactory, ResourceModel, ResourceBundle) {
		"use strict";

		var ResourceModelService = Service.extend("sap.fe.core.services.ResourceModelService", {
			initPromise: Promise.resolve(),
			init: function() {
				var oContext = this.getContext();
				var mSettings = oContext.settings;
				this.oFactory = oContext.factory;

				var aBundles = mSettings.bundles.concat(mSettings.enhanceI18n || []).map(function(sBundleName) {
					return sBundleName.indexOf("/") !== -1 ? { bundleUrl: sBundleName } : { bundleName: sBundleName + ".messagebundle" };
				});

				this.oResourceModel = new ResourceModel({
					bundleName: aBundles[0].bundleName,
					enhanceWith: aBundles.slice(1),
					async: true
				});

				if (oContext.scopeType === "component") {
					var oComponent = oContext.scopeObject;
					oComponent.setModel(this.oResourceModel, mSettings.modelName);
				}

				this.initPromise = this.oResourceModel.getResourceBundle().then(
					function() {
						return this;
					}.bind(this)
				);
			},

			getResourceModel: function() {
				return this.oResourceModel;
			},
			exit: function() {
				// Deregister global instance
				this.oFactory.removeGlobalInstance();
			}
		});

		return ServiceFactory.extend("sap.fe.core.services.ResourceModelServiceFactory", {
			_oInstances: {},
			createInstance: function(oServiceContext) {
				var sKey =
					oServiceContext.settings.bundles.join(",") +
					(oServiceContext.settings.enhanceI18n ? "," + oServiceContext.settings.enhanceI18n.join(",") : "");

				if (!this._oInstances[sKey]) {
					this._oInstances[sKey] = new ResourceModelService(Object.assign({ factory: this }, oServiceContext));
				}

				return this._oInstances[sKey].initPromise;
			},
			removeGlobalInstance: function() {
				this._oInstances = {};
			}
		});
	},
	true
);
