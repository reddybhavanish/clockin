// Copyright (c) 2009-2020 SAP SE, All Rights Reserved
sap.ui.define(["sap/ushell/plugins/BaseRTAPlugin"], function (BaseRTAPlugin) {
	"use strict";

	var RTAPlugin = BaseRTAPlugin.extend("sap.ushell.plugins.rta.Component", {
		sType: "rta",
		metadata: {
			manifest: "json",
			library: "sap.ushell"
		},

		init: function () {
			var oConfig = {
				sComponentName: "sap.ushell.plugins.rta",
				layer: "CUSTOMER",
				developerMode: false,
				id: "RTA_Plugin_ActionButton",
				text: "RTA_BUTTON_TEXT",
				icon: "sap-icon://wrench",
				visible: true
			};
			BaseRTAPlugin.prototype.init.call(this, oConfig);
		}

	});
	return RTAPlugin;

}, true /* bExport */);