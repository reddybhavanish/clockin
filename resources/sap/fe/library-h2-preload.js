//@ui5-bundle sap/fe/library-h2-preload.js
/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2017 SAP SE. All rights reserved
    
 */
sap.ui.predefine('sap/fe/library',["sap/m/Dialog","sap/m/Text","sap/m/Button"],function(D,T,B){"use strict";sap.ui.getCore().initLibrary({name:"sap.fe",dependencies:["sap.ui.core","sap.fe.templates"],types:[],interfaces:[],controls:[],elements:[],version:"1.78.0",noLibraryCSS:true});var d=new D({title:"Depreciation Notice",type:"Message",content:new T({text:"The sap.fe library will be deprecate in favor of sap.fe.template, please use `sap.fe.templates` instead"}),beginButton:new B({type:"Emphasized",text:"OK",press:function(){d.close();}}),afterClose:function(){d.destroy();}});d.open();return sap.fe;},false);
sap.ui.require.preload({
	"sap/fe/manifest.json":'{"_version":"1.21.0","sap.app":{"id":"sap.fe","type":"library","embeds":[],"applicationVersion":{"version":"1.78.0"},"title":"UI5 library: sap.fe","description":"UI5 library: sap.fe","resources":"resources.json","offline":true},"sap.ui":{"technology":"UI5","supportedThemes":[]},"sap.ui5":{"dependencies":{"minUI5Version":"1.78","libs":{"sap.f":{"minVersion":"1.78.0"},"sap.m":{"minVersion":"1.78.0"},"sap.suite.ui.microchart":{"minVersion":"1.78.0","lazy":true},"sap.ui.core":{"minVersion":"1.78.0"},"sap.ui.layout":{"minVersion":"1.78.0","lazy":true},"sap.ui.mdc":{"minVersion":"1.78.0","lazy":false},"sap.ushell":{"minVersion":"1.78.0"},"sap.uxap":{"minVersion":"1.78.0","lazy":true},"sap.ui.fl":{"minVersion":"1.78.0","lazy":true}}},"library":{"i18n":false,"css":false,"content":{"controls":[],"elements":[],"types":[],"interfaces":[]}}}}'
},"sap/fe/library-h2-preload"
);
sap.ui.loader.config({depCacheUI5:{
"sap/fe/AppComponent.js":["sap/base/Log.js","sap/fe/core/AppComponent.js","sap/m/Button.js","sap/m/Dialog.js","sap/m/Text.js"],
"sap/fe/library.js":["sap/m/Button.js","sap/m/Dialog.js","sap/m/Text.js"]
}});
//# sourceMappingURL=library-h2-preload.js.map