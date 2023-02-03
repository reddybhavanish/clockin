//@ui5-bundle sap/webanalytics/core/library-h2-preload.js
/*!
 * SAPUI5

		(c) Copyright 2009-2020 SAP SE. All rights reserved
	
 */
sap.ui.predefine('sap/webanalytics/core/library',['jquery.sap.global','sap/ui/core/library'],function(q,l){"use strict";sap.ui.getCore().initLibrary({name:"sap.webanalytics.core",dependencies:["sap.ui.core"],types:[],interfaces:[],controls:[],elements:[],noLibraryCSS:true,version:"1.78.0"});return sap.webanalytics.core;});
sap.ui.require.preload({
	"sap/webanalytics/core/manifest.json":'{"_version":"1.21.0","sap.app":{"id":"sap.webanalytics.core","type":"library","embeds":["SAPWebAnalyticsFLPPlugin"],"applicationVersion":{"version":"1.78.0"},"title":"UI5 library: sap.webanalytics.core","description":"UI5 library: sap.webanalytics.core","resources":"resources.json","offline":true},"sap.ui":{"technology":"UI5","supportedThemes":[]},"sap.ui5":{"dependencies":{"minUI5Version":"1.78","libs":{"sap.ui.core":{"minVersion":"1.78.0"}}},"library":{"i18n":false,"css":false,"content":{"controls":[],"elements":[],"types":[],"interfaces":[]}}}}'
},"sap/webanalytics/core/library-h2-preload"
);
sap.ui.loader.config({depCacheUI5:{
"sap/webanalytics/core/SAPWebAnalyticsFLPPlugin/Component.js":["sap/ui/core/Component.js"],
"sap/webanalytics/core/library.js":["jquery.sap.global.js","sap/ui/core/library.js"]
}});
//# sourceMappingURL=library-h2-preload.js.map