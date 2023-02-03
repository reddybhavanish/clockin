//@ui5-bundle sap/webanalytics/core/library-preload.js
/*!
 * SAPUI5

		(c) Copyright 2009-2020 SAP SE. All rights reserved
	
 */
sap.ui.predefine('sap/webanalytics/core/SAPWebAnalyticsFLPPlugin/Component',["sap/ui/core/Component"],function(C){"use strict";
var S=C.extend("sap.webanalytics.core.SAPWebAnalyticsFLPPlugin.Component",{
metadata:{manifest:"json"},
init:function(){var p=this.getComponentData().config;var a="",T="",U="";a=p.SWA_PUB_TOKEN;T=p.SWA_BASE_URL;if(p.SWA_USER===true)U=sap.ushell.Container.getUser().getEmail();this.loadSWAObject(a,T,true,U);this.loadWebGUI();},
loadSWAObject:function(a,T,L,u){window.swa={pubToken:a,baseUrl:T,loggingEnabled:L,subSiteId:this.setSubSiteId,owner:u};var d=document,g=d.createElement("script"),s=d.getElementsByTagName("script")[0];g.type="text/javascript";g.defer=true;g.async=true;g.src=window.swa.baseUrl+"js/track.js";s.parentNode.insertBefore(g,s);if((typeof sap!=="undefined"&&typeof sap.ui!=="undefined")&&sap.ui.version<"1.65.0"){window.onhashchange=function(){window.swa.trackLoad();};}},
loadWebGUI:function(){if(window.addEventListener){window.addEventListener("message",function(e){var g=JSON.parse(e.data);if(g.service==="sap.its.readyToListen"&&g.type==="announce"){var s=escape(window.parent.document.cookie);var b={"type":"request","service":"sap.its.trackSWA","pubToken":window.swa.pubToken,"baseUrl":window.swa.baseUrl,"message":"Response from SWA","isConsentGiven":true,"cookieVal":s};e.source.postMessage(JSON.stringify(b),e.origin);}});}},
setSubSiteId:function(){var s="";if(window.location.href.substring(window.location.href.indexOf("#"))!==-1){s=window.location.href.substring(window.location.href.indexOf("#")+1);}if(s.indexOf("&")!==-1){s=s.substring(0,s.indexOf("&"));}return(s!=="")?s:undefined;}
});
return S;});
sap.ui.predefine('sap/webanalytics/core/library',['jquery.sap.global','sap/ui/core/library'],function(q,l){"use strict";sap.ui.getCore().initLibrary({name:"sap.webanalytics.core",dependencies:["sap.ui.core"],types:[],interfaces:[],controls:[],elements:[],noLibraryCSS:true,version:"1.78.0"});return sap.webanalytics.core;});
sap.ui.require.preload({
	"sap/webanalytics/core/SAPWebAnalyticsFLPPlugin/manifest.json":'{"_version":"1.5.0","sap.app":{"id":"SAPWebAnalyticsFLPPlugin","type":"application","applicationVersion":{"version":"1.0.0"},"i18n":"i18n/i18n.properties","title":"{{APP_TITLE}}","description":"{{APP_DESCRIPTION}}"},"sap.ui":{"technology":"UI5","deviceTypes":{"desktop":true,"tablet":true,"phone":true}},"sap.ui5":{"dependencies":{"minUI5Version":"1.71.0","libs":{"sap.ui.core":{}}},"contentDensities":{"compact":false,"cozy":false}},"sap.platform.hcp":{"uri":"webapp","_version":"1.1.0"}}',
	"sap/webanalytics/core/manifest.json":'{"_version":"1.21.0","sap.app":{"id":"sap.webanalytics.core","type":"library","embeds":["SAPWebAnalyticsFLPPlugin"],"applicationVersion":{"version":"1.78.0"},"title":"UI5 library: sap.webanalytics.core","description":"UI5 library: sap.webanalytics.core","resources":"resources.json","offline":true},"sap.ui":{"technology":"UI5","supportedThemes":[]},"sap.ui5":{"dependencies":{"minUI5Version":"1.78","libs":{"sap.ui.core":{"minVersion":"1.78.0"}}},"library":{"i18n":false,"css":false,"content":{"controls":[],"elements":[],"types":[],"interfaces":[]}}}}'
},"sap/webanalytics/core/library-preload"
);
//# sourceMappingURL=library-preload.js.map