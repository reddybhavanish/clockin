/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2020 SAP SE. All rights reserved
    
 */

/**
 * @namespace reserved for Fiori Elements
 * @name sap.fe.core
 * @private
 * @experimental
 */

/**
 * Initialization Code and shared classes of library sap.fe.core
 */
sap.ui.define(
	[
		"sap/fe/core/services/TemplatedViewServiceFactory",
		"sap/fe/core/services/ResourceModelServiceFactory",
		"sap/fe/core/services/CacheHandlerServiceFactory",
		"sap/fe/core/services/DraftModelServiceFactory",
		"sap/fe/core/services/NavigationServiceFactory",
		"sap/fe/core/services/RoutingServiceFactory",
		"sap/ui/core/service/ServiceFactoryRegistry"
	],
	function(
		TemplatedViewServiceFactory,
		ResourceModelServiceFactory,
		CacheHandlerServiceFactory,
		DraftModelService,
		NavigationService,
		RoutingServiceFactory,
		ServiceFactoryRegistry
		// AppStateService
	) {
		"use strict";

		/**
		 * @namespace
		 * @name sap.fe.core.actions
		 * @private
		 * @sap-restricted
		 * @experimental
		 */

		/**
		 * @namespace
		 * @name sap.fe.core.controllerextensions
		 * @private
		 * @sap-restricted
		 * @experimental
		 */

		/**
		 * @namespace
		 * @name sap.fe.core.model
		 * @private
		 * @sap-restricted
		 * @experimental
		 */

		/**
		 * @namespace
		 * @name sap.fe.core.navigation
		 * @private
		 * @sap-restricted
		 * @experimental
		 */

		/**
		 * Fiori Elements Core Library
		 *
		 * @namespace
		 * @name sap.fe.core
		 * @private
		 * @experimental
		 */

		// library dependencies
		// delegate further initialization of this library to the Core
		sap.ui.getCore().initLibrary({
			name: "sap.fe.core",
			dependencies: ["sap.ui.core", "sap.fe.navigation"],
			types: [],
			interfaces: [],
			controls: [],
			elements: [],
			version: "1.78.0",
			noLibraryCSS: true
		});

		/**
		 * Available values for creation mode.
		 *
		 * @readonly
		 * @enum {String}
		 * @private
		 * @sap-restricted
		 */
		sap.fe.core.CreationMode = {
			/**
			 * New Page.
			 * @constant
			 * @type {string}
			 * @public
			 * @sap-restricted
			 */
			NewPage: "NewPage",
			/**
			 * Sync.
			 * @constant
			 * @type {string}
			 * @public
			 * @sap-restricted
			 */
			Sync: "Sync",
			/**
			 * Async.
			 * @constant
			 * @type {string}
			 * @public
			 * @sap-restricted
			 */
			Async: "Async",
			/**
			 * Deferred.
			 * @constant
			 * @type {string}
			 * @public
			 * @sap-restricted
			 */
			Deferred: "Deferred",
			/**
			 * Inline.
			 * @constant
			 * @type {string}
			 * @public
			 * @sap-restricted
			 */
			Inline: "Inline",
			/**
			 * Creation row.
			 * @constant
			 * @type {string}
			 * @public
			 * @sap-restricted
			 */
			CreationRow: "CreationRow"
		};

		ServiceFactoryRegistry.register("sap.fe.core.services.TemplatedViewService", new TemplatedViewServiceFactory());
		ServiceFactoryRegistry.register("sap.fe.core.services.ResourceModelService", new ResourceModelServiceFactory());
		ServiceFactoryRegistry.register("sap.fe.core.services.CacheHandlerService", new CacheHandlerServiceFactory());
		ServiceFactoryRegistry.register("sap.fe.core.services.DraftModelService", new DraftModelService());
		ServiceFactoryRegistry.register("sap.fe.core.services.NavigationService", new NavigationService());
		ServiceFactoryRegistry.register("sap.fe.core.services.RoutingService", new RoutingServiceFactory());

		return sap.fe.core;
	},
	/* bExport= */ false
);
