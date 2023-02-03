/*!
 * SAPUI5

		(c) Copyright 2009-2020 SAP SE. All rights reserved
	
 */
/**
 * Adds support rules of the sap.ui.comp library to the support infrastructure.
 */
sap.ui.define([
	'./rules/SmartForm.support',
	'./rules/SmartLink.support',
	'./rules/SmartFilterBar.support',
	"./rules/SmartField.support",
	"./rules/SmartTable.support"
], function(
		SmartFormSupport,
		SmartLinkSupport,
		SmartFilterBarSupport,
		SmartFieldSupport,
		SmartTableSupport
) {
	"use strict";

	return {
		name: "sap.ui.comp",
		niceName: "UI5 Smart Controls Library",
		ruleset: [
			SmartFormSupport,
			SmartLinkSupport,
			SmartFilterBarSupport,
			SmartFieldSupport,
			SmartTableSupport
		]
	};

}, true);
