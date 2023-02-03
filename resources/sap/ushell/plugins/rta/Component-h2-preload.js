//@ui5-bundle sap/ushell/plugins/rta/Component-h2-preload.js
// Copyright (c) 2009-2020 SAP SE, All Rights Reserved
sap.ui.predefine('sap/ushell/plugins/rta/Component',["sap/ushell/plugins/BaseRTAPlugin"],function(B){"use strict";var R=B.extend("sap.ushell.plugins.rta.Component",{sType:"rta",metadata:{manifest:"json",library:"sap.ushell"},init:function(){var c={sComponentName:"sap.ushell.plugins.rta",layer:"CUSTOMER",developerMode:false,id:"RTA_Plugin_ActionButton",text:"RTA_BUTTON_TEXT",icon:"sap-icon://wrench",visible:true};B.prototype.init.call(this,c);}});return R;},true);
sap.ui.require.preload({
	"sap/ushell/plugins/rta/manifest.json":'{"_version":"1.1.0","sap.app":{"_version":"1.1.0","i18n":"i18n/i18n.properties","id":"sap.ushell.plugins.rta","title":"{{APP_TITLE}}","type":"component","applicationVersion":{"version":"1.0.0"},"ach":"CA-UI5-FL-RTA","embeddedBy":"../../","resources":"resources.json"},"sap.ui":{"_version":"1.1.0","technology":"UI5","supportedThemes":["sap_hcb","sap_bluecrystal"],"deviceTypes":{"desktop":true,"tablet":false,"phone":false}},"sap.ui5":{"_version":"1.1.0","contentDensities":{"compact":true,"cozy":false},"dependencies":{"minUI5Version":"1.30.1","libs":{"sap.ui.core":{"minVersion":"1.30.1"},"sap.m":{"minVersion":"1.30.1"},"sap.ui.dt":{"minVersion":"1.30.1","lazy":true},"sap.ui.rta":{"minVersion":"1.30.1","lazy":true}}},"models":{"i18n":{"type":"sap.ui.model.resource.ResourceModel","uri":"i18n/i18n.properties"}}},"sap.flp":{"type":"plugin"}}'
},"sap/ushell/plugins/rta/Component-h2-preload"
);
sap.ui.loader.config({depCacheUI5:{
"sap/ushell/plugins/rta/Component.js":["sap/ushell/plugins/BaseRTAPlugin.js"]
}});
//# sourceMappingURL=Component-h2-preload.js.map