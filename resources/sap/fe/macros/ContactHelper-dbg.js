/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2017 SAP SE. All rights reserved
    
 */
sap.ui.define(
	[
		"sap/fe/macros/ResourceModel",
		"sap/ui/model/odata/v4/AnnotationHelper",
		"sap/base/Log",
		"sap/fe/core/helpers/StableIdHelper",
		"sap/ui/mdc/condition/ConditionModel",
		"sap/fe/core/CommonUtils",
		"sap/fe/navigation/SelectionVariant",
		"sap/ui/model/json/JSONModel"
	],
	function(ResourceModel, ODataModelAnnotationHelper, Log, StableIdHelper, ConditionModel, CommonUtils, SelectionVariant, JSONModel) {
		"use strict";
		var oRB = sap.ui.getCore().getLibraryResourceBundle("sap.ui.mdc");
		var Helper = {
			// emails: first preferred, then work
			// phones : first work, then cell, then fax, then preferred
			// address : first preferred, then work
			formatUri: function(itemType, value) {
				switch (itemType) {
					case "phone":
						return "tel:" + value;
					case "mail":
						return "mailto:" + value;
					default:
						return value;
				}
			},
			formatAddress: function(street, code, locality, region, country) {
				var textToWrite = [];
				if (street) {
					textToWrite.push(street);
				}
				if (code && locality) {
					textToWrite.push(code + " " + locality);
				} else {
					if (code) {
						textToWrite.push(code);
					}
					if (locality) {
						textToWrite.push(locality);
					}
				}
				if (region) {
					textToWrite.push(region);
				}
				if (country) {
					textToWrite.push(country);
				}
				textToWrite = textToWrite.join(", ");
				return textToWrite;
			},
			computeLabel: function(itemType, subType) {
				switch (itemType) {
					case "role":
						return oRB.getText("info.POPOVER_CONTACT_SECTION_ROLE");
					case "title":
						return oRB.getText("info.POPOVER_CONTACT_SECTION_JOBTITLE");
					case "org":
						return oRB.getText("info.POPOVER_CONTACT_SECTION_DEPARTMENT");
					case "phone":
						if (subType.indexOf("fax") > -1) {
							return oRB.getText("info.POPOVER_CONTACT_SECTION_FAX");
						} else if (subType.indexOf("work") > -1) {
							return oRB.getText("info.POPOVER_CONTACT_SECTION_PHONE");
						} else if (subType.indexOf("cell") > -1) {
							return oRB.getText("info.POPOVER_CONTACT_SECTION_MOBILE");
						} else if (subType.indexOf("preferred") > -1) {
							return oRB.getText("info.POPOVER_CONTACT_SECTION_PHONE");
						}
						break;
					case "mail":
						return oRB.getText("info.POPOVER_CONTACT_SECTION_EMAIL");
					case "address":
						return oRB.getText("info.POPOVER_CONTACT_SECTION_ADR");
					default:
						return "contactItem";
				}
			},
			getContactTitle: function() {
				return oRB.getText("info.POPOVER_CONTACT_SECTION_TITLE");
			},
			getAvatarInitials: function(oInitials) {
				return oInitials ? oInitials : "";
			}
		};

		return Helper;
	},
	/* bExport= */ true
);
