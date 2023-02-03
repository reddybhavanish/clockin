/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2020 SAP SE. All rights reserved
    
 */

// ----------------------------------------------------------------------------------
// Provides base class sap.fe.core.AppComponent for all generic app components
// ----------------------------------------------------------------------------------
sap.ui.define(
	[
		"sap/ui/core/UIComponent",
		"sap/m/NavContainer",
		"sap/f/FlexibleColumnLayout",
		"sap/fe/core/controllerextensions/Routing",
		"sap/fe/core/RouterProxy",
		"sap/base/Log",
		"sap/base/util/merge",
		"sap/fe/core/controllerextensions/EditFlow",
		"sap/ui/mdc/field/FieldValueHelp"
	],
	function(UIComponent, NavContainer, FlexibleColumnLayout, Routing, RouterProxy, Log, merge, EditFlow, FieldValueHelp) {
		"use strict";

		var fieldValueHelpProtoFn = FieldValueHelp.prototype.init;
		FieldValueHelp.prototype.init = function() {
			var oBindingContext = this.getBindingContext();

			fieldValueHelpProtoFn.apply(this, arguments);

			this.setBindingContext(oBindingContext);
		};

		var NAVCONF = {
			FCL: {
				VIEWNAME: "sap.fe.templates.RootContainer.view.Fcl",
				ROUTERCLASS: "sap.f.routing.Router"
			},
			NAVCONTAINER: {
				VIEWNAME: "sap.fe.templates.RootContainer.view.NavContainer",
				ROUTERCLASS: "sap.m.routing.Router"
			}
		};

		var AppComponent = UIComponent.extend("sap.fe.core.AppComponent", {
			metadata: {
				config: {
					fullWidth: true
				},
				manifest: {
					"sap.ui5": {
						services: {
							resourceModel: {
								factoryName: "sap.fe.core.services.ResourceModelService",
								"startup": "waitFor",
								"settings": {
									"bundles": ["sap.fe.core"],
									"modelName": "sap.fe.i18n"
								}
							},
							draftModel: {
								"factoryName": "sap.fe.core.services.DraftModelService",
								"startup": "waitFor"
							},
							routingService: {
								factoryName: "sap.fe.core.services.RoutingService",
								"startup": "waitFor"
							},
							ShellUIService: {
								factoryName: "sap.ushell.ui5service.ShellUIService"
							},
							navigation: {
								factoryName: "sap.fe.core.services.NavigationService"
							}
						},
						rootView: {
							viewName: NAVCONF.NAVCONTAINER.VIEWNAME,
							type: "XML",
							async: true,
							id: "appRootView"
						},
						routing: {
							config: {
								controlId: "appContent",
								routerClass: NAVCONF.NAVCONTAINER.ROUTERCLASS,
								viewType: "XML",
								controlAggregation: "pages",
								async: true,
								containerOptions: {
									propagateModel: true
								}
							}
						}
					}
				},
				designtime: "sap/fe/core/designtime/AppComponent.designtime",

				library: "sap.fe.core"
			},

			_oRouterProxy: null,

			/**
			 * get a reference to the RouterProxy
			 *
			 * @function
			 * @name sap.fe.core.AppComponent#getRouterProxy
			 * @memberof sap.fe.core.AppComponent
			 * @returns {oObject} reference to the outerProxy
			 *
			 * @sap-restricted
			 * @final
			 */
			getRouterProxy: function() {
				return this._oRouterProxy;
			},

			/**
			 * get a reference to the nav/FCL Controller
			 *
			 * @function
			 * @name sap.fe.core.AppComponent#getRootViewController
			 * @memberof sap.fe.core.AppComponent
			 * @returns {oObject} reference to the FCL Controller
			 *
			 * @sap-restricted
			 * @final
			 */
			getRootViewController: function() {
				return this.getRootControl().getController();
			},

			/**
			 * get the NavContainer control or the FCL control
			 *
			 * @function
			 * @name sap.fe.core.AppComponent#getRootContainer
			 * @memberof sap.fe.core.AppComponent
			 * @returns {oObject} reference to  NavContainer control or the FCL control
			 *
			 * @sap-restricted
			 * @final
			 */
			getRootContainer: function() {
				return this.getRootControl().getContent()[0];
			},

			// oManifest is usefull to overwrite Manifest file (eg : Qunit tests)
			// bInitializeRouting is used to disable Routing initialization ( for Qunit tests)
			constructor: function(_oManifest, bInitializeRouting) {
				this.bInitializeRouting = bInitializeRouting !== undefined ? bInitializeRouting : true;
				var oManifest = this.getManifestObject()._oManifest;
				merge(oManifest, _oManifest);

				this._oRouting = new Routing();
				this._oTemplateContract = {
					oAppComponent: this
				};
				this._oRouterProxy = new RouterProxy();

				UIComponent.apply(this, arguments);
				return this.getInterface();
			},

			init: function() {
				var that = this;
				var oModel = this.getModel();
				if (oModel) {
					// upgrade the model to a named binding model
					oModel
						.getMetaModel()
						.requestObject("/$EntityContainer/")
						.catch(
							function(oError) {
								// Error handling for erroneous metadata request
								var oRootContainer = this.getRootContainer(),
									oResourceBundle = sap.ui.getCore().getLibraryResourceBundle("sap.fe.core");

								that._oRouting.navigateToMessagePage(oResourceBundle.getText("SAPFE_APPSTART_TECHNICAL_ISSUES"), {
									title: oResourceBundle.getText("SAPFE_ERROR"),
									description: oError.message,
									navContainer: oRootContainer
								});
							}.bind(this)
						);
				}

				var oManifestUI5 = this.getMetadata().getManifestEntry("/sap.ui5", true);
				if (
					oManifestUI5.rootView.viewName === NAVCONF.FCL.VIEWNAME &&
					oManifestUI5.routing.config.routerClass === NAVCONF.FCL.ROUTERCLASS
				) {
					Log.info('Rootcontainer: "' + NAVCONF.FCL.VIEWNAME + '" - Routerclass: "' + NAVCONF.FCL.ROUTERCLASS + '"');
				} else if (
					oManifestUI5.rootView.viewName === NAVCONF.NAVCONTAINER.VIEWNAME &&
					oManifestUI5.routing.config.routerClass === NAVCONF.NAVCONTAINER.ROUTERCLASS
				) {
					Log.info(
						'Rootcontainer: "' + NAVCONF.NAVCONTAINER.VIEWNAME + '" - Routerclass: "' + NAVCONF.NAVCONTAINER.ROUTERCLASS + '"'
					);
				} else {
					throw Error(
						"\nWrong configuration for the couple (rootView/routerClass) in manifest file.\n" +
							"Current values are :(" +
							oManifestUI5.rootView.viewName +
							"/" +
							oManifestUI5.routing.config.routerClass +
							")\n" +
							"Expected values are \n" +
							"\t - (" +
							NAVCONF.NAVCONTAINER.VIEWNAME +
							"/" +
							NAVCONF.NAVCONTAINER.ROUTERCLASS +
							")\n" +
							"\t - (" +
							NAVCONF.FCL.VIEWNAME +
							"/" +
							NAVCONF.FCL.ROUTERCLASS +
							")"
					);
				}

				// the init fonction configures the routing according to the settings above
				// it will call the createContent function to instanciate the RootView and add it to the UIComponent aggregations
				UIComponent.prototype.init.apply(that, arguments);

				//router must be started once the roocontainer is initialized
				//starting of the router
				if (this.bInitializeRouting) {
					that._oRouting
						.initializeRouting(that)
						.then(function() {
							var isfclEnabled = NAVCONF.FCL.VIEWNAME === oManifestUI5.rootView.viewName;
							that.getRouterProxy().init(that, isfclEnabled);
						})
						.catch(function(err) {
							Log.error("cannot cannot initialize routing: " + err);
						});

					if (oModel) {
						that.getService("draftModel")
							.then(function(oDraftModelService) {
								if (oDraftModelService.isDraftModel()) {
									that.setModel(oDraftModelService.getDraftAccessModel(), "$draft");
								}
							})
							.catch(function() {
								Log.error("cannot load draftModel");
							});
					}
				}
			},
			exit: function() {
				this._oRouting.fireOnAfterNavigation();
				EditFlow.onExitApplication(this.getId());
			},
			getMetaModel: function() {
				return this.getModel().getMetaModel();
			},
			exitApplication: function() {
				this._oRouting.fireOnAfterNavigation();
				EditFlow.onExitApplication(this.getId());
			},
			destroy: function() {
				this.exitApplication();
				//WORKAROUND for sticky discard request : due to async callback, request triggered by the exitApplication will be send after the UIComponent.prototype.destroy
				//so we need to copy the Requestor headers as it will be destroy
				var oMainModel = this.oModels[undefined];
				var oHeaders = jQuery.extend({}, oMainModel.oRequestor.mHeaders);
				// As we need to cleanup the application / handle the dirty object we need to call our cleanup before the models are destroyed
				UIComponent.prototype.destroy.apply(this, arguments);
				oMainModel.oRequestor.mHeaders = oHeaders;
			}
		});

		return AppComponent;
	}
);
