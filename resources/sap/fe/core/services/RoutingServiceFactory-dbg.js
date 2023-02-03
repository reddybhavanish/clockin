sap.ui.define(
	[
		"sap/ui/core/service/Service",
		"sap/ui/core/service/ServiceFactory",
		"sap/ui/core/Component",
		"sap/ui/base/BindingParser",
		"sap/fe/core/helpers/SemanticKeyHelper",
		"sap/ui/model/Filter",
		"sap/ui/model/FilterOperator",
		"sap/ui/core/routing/HashChanger",
		"sap/base/Log"
	],
	function(Service, ServiceFactory, Component, BindingParser, SemanticKeyHelper, Filter, FilterOperator, HashChanger, Log) {
		"use strict";

		var RoutingService = Service.extend("sap.fe.core.services.RoutingService", {
			initPromise: Promise.resolve(this),

			/**
			 * Initialize the routing service
			 */
			init: function() {
				var that = this;
				var oContext = this.getContext();
				if (oContext.scopeType === "component") {
					this.oAppComponent = oContext.scopeObject;
					this.oModel = this.oAppComponent.getModel();
					this.oRouter = this.oAppComponent.getRouter();
					var oRoutingConfig = this.oAppComponent.getManifestEntry("/sap.ui5/routing");
					this._parseRoutingConfiguration(oRoutingConfig);
					this.initPromise = Promise.resolve(that);
				}
			},

			/**
			 * Parse a manifest routing configuration for internal usage
			 * @param oRoutingConfig
			 * @private
			 */
			_parseRoutingConfiguration: function(oRoutingConfig) {
				var that = this;

				// Information of targets
				this._mTargets = {};
				Object.keys(oRoutingConfig.targets).forEach(function(sTargetName) {
					that._mTargets[sTargetName] = Object.assign({ targetName: sTargetName }, oRoutingConfig.targets[sTargetName]);

					// View level for FCL cases is calculated from the target pattern
					if (that._mTargets[sTargetName].contextPattern !== undefined) {
						that._mTargets[sTargetName].viewLevel = that._getViewLevelFromPattern(that._mTargets[sTargetName].contextPattern);
					}
				});

				// Information of routes
				this._mRoutes = {};
				for (var sRouteKey in oRoutingConfig.routes) {
					var oRouteManifestInfo = oRoutingConfig.routes[sRouteKey];
					var sRouteName = Array.isArray(oRoutingConfig.routes) ? oRouteManifestInfo.name : sRouteKey;
					that._mRoutes[sRouteName] = {
						name: sRouteName,
						pattern: oRouteManifestInfo.pattern,
						targets: Array.isArray(oRouteManifestInfo.target) ? oRouteManifestInfo.target : [oRouteManifestInfo.target]
					};

					// View level for non-FCL cases is calculated from the route pattern
					if (!Array.isArray(oRouteManifestInfo.target)) {
						var viewLevel = that._getViewLevelFromPattern(oRouteManifestInfo.pattern);
						if (
							that._mTargets[oRouteManifestInfo.target].viewLevel === undefined ||
							that._mTargets[oRouteManifestInfo.target].viewLevel < viewLevel
						) {
							// There are cases when different routes point to the same target. We take the
							// largest viewLevel in that case.
							that._mTargets[oRouteManifestInfo.target].viewLevel = viewLevel;
						}
					}
				}
			},

			_getViewLevelFromPattern: function(sPattern) {
				sPattern = sPattern.replace(":?query:", "");
				if (sPattern && sPattern[0] !== "/" && sPattern[0] !== "?") {
					sPattern = "/" + sPattern;
				}
				return sPattern.split("/").length - 1;
			},

			/**
			 * Get route information for a given route name
			 * @param sRouteName
			 * @returns {*}
			 */
			getRouteInformation: function(sRouteName) {
				return this._mRoutes[sRouteName];
			},

			/**
			 * Get target information for a given target name
			 * @param sTargetName
			 * @returns {*}
			 */
			getTargetInformation: function(sTargetName) {
				return this._mTargets[sTargetName];
			},

			_getComponentId: function(sOwnerId, sComponentId) {
				if (sComponentId.indexOf(sOwnerId + "---") === 0) {
					return sComponentId.substr(sOwnerId.length + 3);
				}
				return sComponentId;
			},
			getTargetInformationFor: function(oComponentInstance) {
				var sTargetComponentId = this._getComponentId(oComponentInstance._sOwnerId, oComponentInstance.getId());
				var that = this;
				var sCorrectTargetName = null;
				Object.keys(this._mTargets).forEach(function(sTargetName) {
					if (that._mTargets[sTargetName].id === sTargetComponentId) {
						sCorrectTargetName = sTargetName;
					}
				});
				return this.getTargetInformation(sCorrectTargetName);
			},

			navigateTo: function(oContext, sRouteName, mParameterMapping, bPreserveHistory) {
				var sTargetURL;
				if (!mParameterMapping) {
					// if there is no parameter mapping define this mean we rely entirely on the binding context path
					sTargetURL = SemanticKeyHelper.getSemanticPath(oContext);
				} else {
					var mParameters = this.prepareParameters(mParameterMapping, sRouteName, oContext);
					sTargetURL = this.oRouter.getURL(sRouteName, mParameters);
				}
				this.oAppComponent.getRouterProxy().navToHash(sTargetURL, bPreserveHistory);
			},

			/**
			 * Will take a parameters map [k: string] : ComplexBindingSyntax
			 * and return a map where the binding syntax is resolved to the current model.
			 * Additionally, relative path are supported
			 *
			 * @param mParameters
			 * @param sTargetRoute
			 * @param oContext
			 * @returns {{}}
			 */
			prepareParameters: function(mParameters, sTargetRoute, oContext) {
				var oParameters;
				try {
					var sContextPath = oContext.getPath();
					var aContextPathParts = sContextPath.split("/");
					oParameters = Object.keys(mParameters).reduce(function(oReducer, sParameterKey) {
						var sParameterMappingExpression = mParameters[sParameterKey];
						// We assume the defined parameters will be compatible with a binding expression
						var oParsedExpression = BindingParser.complexParser(sParameterMappingExpression);
						var aParts = oParsedExpression.parts || [oParsedExpression];
						var aResolvedParameters = aParts.map(function(oPathPart) {
							var aRelativeParts = oPathPart.path.split("../");
							// We go up the current context path as many times as necessary
							var aLocalParts = aContextPathParts.slice(0, aContextPathParts.length - aRelativeParts.length + 1);
							aLocalParts.push(aRelativeParts[aRelativeParts.length - 1]);
							return oContext.getObject(aLocalParts.join("/"));
						});
						if (oParsedExpression.formatter) {
							oReducer[sParameterKey] = oParsedExpression.formatter.apply(this, aResolvedParameters);
						} else {
							oReducer[sParameterKey] = aResolvedParameters.join("");
						}
						return oReducer;
					}, {});
				} catch (error) {
					Log.error("Could not parse the parameters for the navigation to route " + sTargetRoute);
					oParameters = undefined;
				}
				return oParameters;
			}
		});

		return ServiceFactory.extend("sap.fe.core.services.RoutingServiceFactory", {
			createInstance: function(oServiceContext) {
				var oRoutingService = new RoutingService(oServiceContext);
				return oRoutingService.initPromise;
			}
		});
	},
	true
);
