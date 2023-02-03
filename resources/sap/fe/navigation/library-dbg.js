/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2017 SAP SE. All rights reserved
    
 */

/**
 * @namespace reserved for Fiori Elements
 * @name sap.fe.navigation
 * @private
 * @experimental
 */

/**
 * Initialization Code and shared classes of library sap.fe.navigation
 */
sap.ui.define(
	[],
	function() {
		"use strict";

		/**
		 * Fiori Elements Navigation Library
		 *
		 * @namespace
		 * @name sap.fe.navigation
		 * @private
		 * @experimental
		 */

		// library dependencies
		sap.ui.getCore().initLibrary({
			name: "sap.fe.navigation",
			version: "1.78.0",
			dependencies: ["sap.ui.core"],
			types: ["sap.fe.navigation.NavType", "sap.fe.navigation.ParamHandlingMode", "sap.fe.navigation.SuppressionBehavior"],
			interfaces: [],
			controls: [],
			elements: [],
			noLibraryCSS: true
		});

		/**
		 * A static enumeration type which indicates the conflict resolution method when merging URL parameters into select options
		 * @enum {string}
		 * @name sap.fe.navigation.ParamHandlingMode
		 * @readonly
		 * @private
		 * @ui5-restricted
		 */
		sap.fe.navigation.ParamHandlingMode = {
			/**
			 * The conflict resolution favors the SelectionVariant over URL parameters
			 * @private
			 * @ui5-restricted
			 */
			SelVarWins: "SelVarWins",

			/**
			 * The conflict resolution favors the URL parameters over the SelectionVariant. Caution: In case of cross-app navigation
			 * a navigation parameter value from the source app is overwritten by a default, if a default is maintained in the launchpad
			 * designer for this parameter in the target app!
			 * @private
			 * @ui5-restricted
			 */
			URLParamWins: "URLParamWins",

			/**
			 * The conflict resolution adds URL parameters to the SelectionVariant
			 * @private
			 * @ui5-restricted
			 */
			InsertInSelOpt: "InsertInSelOpt"
		};

		/**
		 * A static enumeration type which indicates the type of inbound navigation
		 * @enum {string}
		 * @readonly
		 * @private
		 * @ui5-restricted
		 */
		sap.fe.navigation.NavType = {
			/**
			 * Initial startup without any navigation or default parameters
			 * @private
			 * @ui5-restricted
			 */
			initial: "initial",

			/**
			 * Basic cross-app navigation with URL parameters only (without sap-xapp-state) or initial start with default parameters
			 * @private
			 * @ui5-restricted
			 */
			URLParams: "URLParams",

			/**
			 * Cross-app navigation with sap-xapp-state parameter (and URL parameters), defaulted parameters may be added
			 * @private
			 * @ui5-restricted
			 */
			xAppState: "xAppState",

			/**
			 * Back navigation with sap-iapp-state parameter
			 * @private
			 * @ui5-restricted
			 */
			iAppState: "iAppState"
		};

		/**
		 * A static enumeration type which indicates whether semantic attributes with values <code>null</code>,
		 * <code>undefined</code> or <code>""</code> (empty string) shall be suppressed, before they are mixed in to the selection variant in the
		 * method {@link sap.fe.navigation.NavigationHandler.mixAttributesAndSelectionVariant mixAttributesAndSelectionVariant}
		 * of the {@link sap.fe.navigation.NavigationHandler NavigationHandler}
		 * @enum {int}
		 * @name sap.fe.navigation.SuppressionBehavior
		 * @readonly
		 * @private
		 * @ui5-restricted
		 */
		sap.fe.navigation.SuppressionBehavior = {
			/**
			 * Standard suppression behavior: semantic attributes with a <code>null</code> or an <code>undefined</code> value are ignored,
			 * the remaining attributes are mixed in to the selection variant
			 * @private
			 * @ui5-restricted
			 */
			standard: 0,

			/**
			 * Semantic attributes with an empty string are ignored, the remaining attributes are mixed in to the selection variant.
			 * Warning! Consider the impact on Boolean variable values!
			 * @private
			 * @ui5-restricted
			 */
			ignoreEmptyString: 1,

			/**
			 * Semantic attributes with a <code>null</code> value lead to an {@link sap.fin.central.lib.error.Error error} of type NavigationHandler.INVALID_INPUT
			 * @private
			 * @ui5-restricted
			 */
			raiseErrorOnNull: 2,

			/**
			 * Semantic attributes with an <code>undefined</code> value lead to an {@link sap.fin.central.lib.error.Error error} of type NavigationHandler.INVALID_INPUT
			 * @private
			 * @ui5-restricted
			 */
			raiseErrorOnUndefined: 4
		};

		return sap.fe.navigation;
	},
	/* bExport= */ false
);
