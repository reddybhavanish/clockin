//@ui5-bundle sap/fe/navigation/library-h2-preload.js
/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2017 SAP SE. All rights reserved
    
 */
sap.ui.predefine('sap/fe/navigation/library',[],function(){"use strict";sap.ui.getCore().initLibrary({name:"sap.fe.navigation",version:"1.78.0",dependencies:["sap.ui.core"],types:["sap.fe.navigation.NavType","sap.fe.navigation.ParamHandlingMode","sap.fe.navigation.SuppressionBehavior"],interfaces:[],controls:[],elements:[],noLibraryCSS:true});sap.fe.navigation.ParamHandlingMode={SelVarWins:"SelVarWins",URLParamWins:"URLParamWins",InsertInSelOpt:"InsertInSelOpt"};sap.fe.navigation.NavType={initial:"initial",URLParams:"URLParams",xAppState:"xAppState",iAppState:"iAppState"};sap.fe.navigation.SuppressionBehavior={standard:0,ignoreEmptyString:1,raiseErrorOnNull:2,raiseErrorOnUndefined:4};return sap.fe.navigation;},false);
sap.ui.require.preload({
	"sap/fe/navigation/manifest.json":'{"_version":"1.21.0","sap.app":{"id":"sap.fe.navigation","type":"library","embeds":[],"applicationVersion":{"version":"1.78.0"},"title":"UI5 library: sap.fe.navigation","description":"UI5 library: sap.fe.navigation","resources":"resources.json","offline":true},"sap.ui":{"technology":"UI5","supportedThemes":[]},"sap.ui5":{"dependencies":{"minUI5Version":"1.78","libs":{"sap.ui.core":{"minVersion":"1.78.0"},"sap.ushell":{"minVersion":"1.78.0"}}},"library":{"i18n":false,"css":false,"content":{"controls":[],"elements":[],"types":["sap.fe.navigation.NavType","sap.fe.navigation.ParamHandlingMode","sap.fe.navigation.SuppressionBehavior"],"interfaces":[]}}}}'
},"sap/fe/navigation/library-h2-preload"
);
sap.ui.loader.config({depCacheUI5:{
"sap/fe/navigation/NavError.js":["sap/ui/base/Object.js"],
"sap/fe/navigation/NavigationHandler.js":["sap/base/Log.js","sap/base/assert.js","sap/base/util/extend.js","sap/base/util/isEmptyObject.js","sap/base/util/merge.js","sap/fe/navigation/NavError.js","sap/fe/navigation/NavigationHelper.js","sap/fe/navigation/SelectionVariant.js","sap/fe/navigation/library.js","sap/ui/base/Object.js","sap/ui/core/UIComponent.js","sap/ui/core/routing/HashChanger.js"],
"sap/fe/navigation/NavigationHelper.js":["sap/base/Log.js","sap/fe/navigation/NavError.js","sap/fe/navigation/SelectionVariant.js"],
"sap/fe/navigation/PresentationVariant.js":["sap/base/Log.js","sap/base/util/each.js","sap/base/util/extend.js","sap/fe/navigation/NavError.js","sap/ui/base/Object.js"],
"sap/fe/navigation/SelectionVariant.js":["sap/base/Log.js","sap/base/util/each.js","sap/fe/navigation/NavError.js","sap/ui/base/Object.js"]
}});
//# sourceMappingURL=library-h2-preload.js.map