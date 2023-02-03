/*!
 * SAPUI5

		(c) Copyright 2009-2020 SAP SE. All rights reserved
	
 */
/**
 * Defines support rules of the SmartTable control of sap.ui.comp library.
 */
sap.ui.define(['sap/ui/support/library'],
	function(SupportLib) {
		'use strict';

		// shortcuts
		var Categories = SupportLib.Categories; // Accessibility, Performance, Memory, ...
		var Severity = SupportLib.Severity; // Hint, Warning, Error
		var Audiences = SupportLib.Audiences; // Control, Internal, Application

		//**********************************************************
		// Rule Definitions
		//**********************************************************

		/* eslint-disable no-lonely-if */

		var oSmartTableReservedKeywordsRule = {
			id: 'smartTableEntityFieldName',
			audiences: [Audiences.Application],
			categories: [Categories.DataModel],
			enabled: true,
			minversion: '1.52',
			title: 'SmartTable: Forbidden entity field name',
			description: 'The SmartTable entity uses reserved keywords as field names',
			resolution: 'Rename the field name of your OData entity that is using a reserved keyword',
			resolutionurls: [{
				text: 'API Reference: SmartTable -> properties -> entitySet ',
				href:'https://sapui5.hana.ondemand.com/#/api/sap.ui.comp.smarttable.SmartTable'
			}],
			check: function (oIssueManager, oCoreFacade, oScope) {
				oScope.getElementsByClassName('sap.ui.comp.smarttable.SmartTable')
					.forEach(function(oSmartTable) {
						var aReserved, sId = oSmartTable.getId();

						if (!oSmartTable._aTableViewMetadata) {
							return;
						}

						aReserved = [
							'variant',
							'btnFullScreen',
							'btnEditToggle',
							'header',
							'toolbarSeperator',
							'toolbarSpacer',
							'btnPersonalisation',
							'btnExcelExport',
							'persoController',
							'ui5table',
							'infoToolbarText'
						];

						oSmartTable._aTableViewMetadata.forEach(function (oField) {
							if (aReserved.indexOf(oField.name) > -1) {
								oIssueManager.addIssue({
									severity: Severity.High,
									details: 'SmartTable ' + sId + ' is assigned to an entity that is using a reserved keyword as field name. Please rename field ' + oField.name,
									context: {
										id: sId
									}
								});
							}
						});
					});
			}
		};

		return [
			oSmartTableReservedKeywordsRule
		];

	}, true);
