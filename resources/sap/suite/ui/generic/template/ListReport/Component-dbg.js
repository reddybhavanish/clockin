sap.ui.define(["sap/ui/core/mvc/OverrideExecution", "sap/suite/ui/generic/template/lib/TemplateAssembler",
	"sap/suite/ui/generic/template/ListReport/controller/ControllerImplementation", "sap/suite/ui/generic/template/ListReport/controllerFrameworkExtensions",
	"sap/suite/ui/generic/template/lib/testableHelper", "sap/suite/ui/generic/template/ListReport/semanticDateRangeTypeHelper", "sap/suite/ui/generic/template/ListReport/staticChecksHelper", 
	"sap/suite/ui/generic/template/js/preparationHelper", "sap/base/util/deepExtend"
], function(OverrideExecution, TemplateAssembler, ControllerImplementation, controllerFrameworkExtensions, testableHelper, semanticDateRangeTypeHelper, staticChecksHelper, preparationHelper, deepExtend) {
	"use strict";

	function getMethods(oComponent, oComponentUtils) {
		var oViewProxy = {};

		return {
			oControllerSpecification: {
				getMethods: ControllerImplementation.getMethods.bind(null, oViewProxy),
				oControllerDefinition: controllerFrameworkExtensions,
				oControllerExtensionDefinition: { // callbacks for controller extensions
					// will be called when the SmartFilterbar has been initialized
					onInitSmartFilterBar: function(oEvent) {},
					// allows extensions to store their specific state. Therefore, the implementing controller extension must call fnSetAppStateData(oControllerExtension, oAppState).
					// oControllerExtension must be the ControllerExtension instance for which the state should be stored. oAppState is the state to be stored.
					// Note that the call is ignored if oAppState is faulty
					provideExtensionAppStateData: function(fnSetAppStateData){},
					// asks extensions to restore their state according to a state which was previously stored.
					// Therefore, the implementing controller extension can call fnGetAppStateData(oControllerExtension) in order to retrieve the state information which has been stored in the current state for this controller extension.
					// undefined will be returned by this function if no state or a faulty state was stored.
					restoreExtensionAppStateData: function(fnGetAppStateData){},
					// gives extensions the possibility to make sure that certain fields will be contained in the select clause of the table binding.
					// This should be used, when custom logic of the extension depends on these fields.
					// For each custom field the extension must call fnEnsureSelectionProperty(oControllerExtension, sFieldname).
					// oControllerExtension must be the ControllerExtension instance which ensures the field to be part of the select clause.
					// sFieldname must specify the field to be selected. Note that this must either be a field of the entity set itself or a field which can be reached via a :1 navigation property.
					// In the second case sFieldname must contain the relative path.
					ensureFieldsForSelect: function(fnEnsureSelectionProperty, sControlId){},
					// allows extension to add filters. They will be combined via AND with all other filters
					// For each filter the extension must call fnAddFilter(oControllerExtension, oFilter)
					// oControllerExtension must be the ControllerExtension instance which adds the filter
					// oFilter must be an instance of sap.ui.model.Filter
					addFilters: function(fnAddFilter, sControlId){}
				}
			},
			init: function() {
				var oTemplatePrivate = oComponent.getModel("_templPriv");
				oTemplatePrivate.setProperty("/listReport", {}); // Note that component properties are not yet available here
			},
			onActivate: function() {
				oViewProxy.onComponentActivate();
			},
			refreshBinding: function(bUnconditional, mRefreshInfos) {
				oViewProxy.refreshBinding(bUnconditional, mRefreshInfos);
			},
			getUrlParameterInfo: function() {
				return oViewProxy.getUrlParameterInfo();
			},
			getItems: function(){
				return oViewProxy.getItems();
			},
			displayNextObject: function(aOrderObjects){
				return oViewProxy.displayNextObject(aOrderObjects);
			},
			getTemplateSpecificParameters: function(oMetaModel, oSettings, Device, sLeadingEntitySet) {
				function checkIfSmartChart(sEntitySet, oTabItem) {
					var oEntitySet = oMetaModel.getODataEntitySet(sEntitySet);
					var oEntityType = oMetaModel.getODataEntityType(oEntitySet.entityType);
					var sAnnotation, sAnnotationPath, oVariant;
					sAnnotationPath = oTabItem.annotationPath;
					oVariant = !!sAnnotationPath && oEntityType[sAnnotationPath];
					if (oVariant && oVariant.PresentationVariant) {
						// oVariant is SelectionPresentationVariant
						if (oVariant.PresentationVariant.Visualizations) {
							sAnnotation =  oVariant.PresentationVariant.Visualizations[0].AnnotationPath;
						} else if (oVariant.PresentationVariant.Path) {
							var sPresentationVariantPath = oVariant.PresentationVariant.Path.split("@")[1];
							var oPresentationVariantAnnotation = sPresentationVariantPath && oEntityType[sPresentationVariantPath];
							sAnnotation =  oPresentationVariantAnnotation.Visualizations[0].AnnotationPath;
						}

					} else if (oVariant && oVariant.Visualizations) {
						// oVariant is PresentationVariant
						sAnnotation =  oVariant.Visualizations[0].AnnotationPath;
					}
					return !!(sAnnotation && sAnnotation.indexOf("com.sap.vocabularies.UI.v1.Chart") > -1);
				}

				var oLrSettings = deepExtend({}, oSettings);
				

				if (oLrSettings.quickVariantSelectionX) {
					// tableSettings for component used as default for variants
					var oDefaultTableSettings = preparationHelper.getNormalizedTableSettigs(oMetaModel, oLrSettings, Device, sLeadingEntitySet);

					//for multiple variants
					var oVariants = oLrSettings.quickVariantSelectionX.variants || {};
					for (var sKey in oVariants) {
						oVariants[sKey].isSmartChart = checkIfSmartChart(oVariants[sKey].entitySet || sLeadingEntitySet, oVariants[sKey]);
						if (!oVariants[sKey].isSmartChart) {
							oVariants[sKey].tableSettings = oVariants[sKey].tableSettings || oDefaultTableSettings;
							oVariants[sKey].tableSettings = preparationHelper.getNormalizedTableSettigs(oMetaModel, oVariants[sKey], Device, oVariants[sKey].entitySet || sLeadingEntitySet);
							
							if (oLrSettings.isResponsiveTable === undefined){
								oLrSettings.isResponsiveTable = oVariants[sKey].tableSettings.type === "ResponsiveTable";
							} else if (oLrSettings.isResponsiveTable !== (oVariants[sKey].tableSettings.type === "ResponsiveTable")) {
								throw new Error("Variant with key " + sKey + " resulted in invalid Table Type combination. Please check documentation and update manifest.json.");
							}
						}
					}
					
					delete oLrSettings.tableSettings;
					//handle where variants contain only charts
					if (oLrSettings.isResponsiveTable === undefined){
						oLrSettings.isResponsiveTable = true;
					}
				} else {
					//for single  variant
					oLrSettings.tableSettings = preparationHelper.getNormalizedTableSettigs(oMetaModel, oSettings, Device, sLeadingEntitySet); 
					oLrSettings.isResponsiveTable = oLrSettings.tableSettings.type === "ResponsiveTable";
				}
				var oEntitySet = oMetaModel.getODataEntitySet(sLeadingEntitySet);
				var oEntityType = oMetaModel.getODataEntityType(oEntitySet.entityType);
				oLrSettings.allControlConfiguration = oEntityType["com.sap.vocabularies.UI.v1.SelectionFields"] ? oEntityType["com.sap.vocabularies.UI.v1.SelectionFields"].slice() : [];
				oLrSettings.datePropertiesSettings = semanticDateRangeTypeHelper.setSemanticDateRangeSettingsForDateProperties(oLrSettings, oEntityType);

				if (oEntityType && oEntityType.property && oSettings && oSettings.createWithParameterDialog && oSettings.createWithParameterDialog.fields) {
					staticChecksHelper.checkErrorforCreateWithDialog(oEntityType, oSettings);
				}

				return oLrSettings;
			}
		};
	}

	testableHelper.testableStatic(getMethods, "Component_getMethods");

	return TemplateAssembler.getTemplateComponent(getMethods,
		"sap.suite.ui.generic.template.ListReport", {
			metadata: {
				library: "sap.suite.ui.generic.template",
				properties: {
					"templateName": {
						"type": "string",
						"defaultValue": "sap.suite.ui.generic.template.ListReport.view.ListReport"
					},
					// hide chevron for unauthorized inline external navigation?
					"hideChevronForUnauthorizedExtNav": {
						"type": "boolean",
						"defaultValue": "false"
					},
					treeTable: { // obsolete - use tableSettings.type instead
						type: "boolean",
						defaultValue: false
					},
					gridTable: { // obsolete - use tableSettings.type instead
						type: "boolean",
						defaultValue: false
					},
					tableType: { // obsolete - use tableSettings.type instead
						type: "string",
						defaultValue: undefined
					},
					multiSelect: { // obsolete - use tableSettings.multiSelect instead
						type: "boolean",
						defaultValue: false
					},
					tableSettings: {
						type: "object",
						properties: { 	// Unfortunately, managed object does not provide any specific support for type "object". We use just properties, and define everything below exactly like the properties of the component.
										// Currently, everything here is just for documentation, but has no functionality. In future, a mechanism to fill default values shall be added
							type: { // Defines the type of table to be used. Possible values: ResponsiveTable, GridTable, TreeTable, AnalyticalTable.
								type: "string",
								defaultValue: undefined // If sap:semantics=aggregate, and device is not phone, AnalyticalTable is used by default, otherwise ResponsiveTable
							},
							multiSelect: { // Defines, whether selection of multiple entries is possible. Only relevant, if actions exist.
								type: "boolean",
								defaultValue: false
							},
							inlineDelete: { // Defines whether, if a row can be deleted, this possibility should be provided inline
								type: "boolean",
								defaultValue: false
							},
							selectAll: { // Defines, whether a button to select all entries is available. Only relevant for table type <> ResponsiveTable, and if multiSelect is true.
								type: "boolean",
								defaultValue: false
							},
							selectionLimit: { // Defines the maximal number of lines to be loaded by a range selection from the backend. Only relevant for table type <> ResponsiveTable, if multiSelect is true, and selectAll is false.
								type: "int",
								defaultValue: 200
							}
						}
					},
					"createWithFilters": "object",
					"condensedTableLayout": "boolean",
					smartVariantManagement: { // true = one variant for filter bar and table, false = separate variants for filter and table
						type: "boolean",
						defaultValue: false
					},
					hideTableVariantManagement: { // obsolete - use variantManagementHidden instead
						type: "boolean",
						defaultValue: false
					},
					variantManagementHidden: { // hide Variant Management from SmartFilterBar. Use together with smartVariantManagement to create a ListReport without Variant Management
						type: "boolean",
						defaultValue: false
					},
					createWithParameterDialog : {
						type: "object",
						properties: {
							fields : {
								type: "object"
							}
						}
					},
					"creationEntitySet": "string",
					"enableTableFilterInPageVariant":{
						"type": "boolean",
						"defaultValue": false
					},
					"multiContextActions": "object",
					"isWorklist": "boolean",
					"designtimePath": {
						"type": "string",
						"defaultValue": "sap/suite/ui/generic/template/designtime/ListReport.designtime"
					},
					"flexibilityPath": {
						"type": "string",
						"defaultValue": "sap/suite/ui/generic/template/ListReport/flexibility/ListReport.flexibility"
					},
					filterSettings: {
						type: "object",
						dateSettings: semanticDateRangeTypeHelper.getDateSettingsMetadata()
					},
					dataLoadSettings: {
						type: "object",
						properties: {
							loadDataOnAppLaunch: {
								type:"string",
								defaultValue: "ifAnyFilterExist"  //can contain 3 values always/never/ifAnyFilterExist
							}
						}
					},
					quickVariantSelectionX: {
						type: "object",
						properties: { // Currently, everything here is just for documentation, but has no functionality. In future, a mechanism to fill default values shall be added
							showCounts: {
								type: "boolean",
								defaultValue: false
							},
							variants: { // A map -  keys to be defined by the application.
								type: "object",
								mapEntryProperties: { // describes how the entries of the map should look like
									key: {
										type: "string",
										optional: true
									},
									annotationPath: { // annotation path pointing to SelectionPresentationVariant or SelectionVariant
										type: "string"
									},
									entitySet: {
										type: "string",
										optional: true
									},
									tableSettings: {
										type: "object",
										properties: { 	// Unfortunately, managed object does not provide any specific support for type "object". We use just properties, and define everything below exactly like the properties of the component.
														// Currently, everything here is just for documentation, but has no functionality. In future, a mechanism to fill default values shall be added
											type: { // Defines the type of table to be used. Possible values: ResponsiveTable, GridTable, TreeTable, AnalyticalTable.
												type: "string",
												defaultValue: undefined // If sap:semantics=aggregate, and device is not phone, AnalyticalTable is used by default, otherwise ResponsiveTable
											},
											multiSelect: { // Defines, whether selection of multiple entries is possible. Only relevant, if actions exist.
												type: "boolean",
												defaultValue: false
											},
											inlineDelete: { // Defines whether, if a row can be deleted, this possibility should be provided inline
												type: "boolean",
												defaultValue: false
											},
											selectAll: { // Defines, whether a button to select all entries is available. Only relevant for table type <> ResponsiveTable, and if multiSelect is true.
												type: "boolean",
												defaultValue: false
											},
											selectionLimit: { // Defines the maximal number of lines to be loaded by a range selection from the backend. Only relevant for table type <> ResponsiveTable, if multiSelect is true, and selectAll is false.
												type: "int",
												defaultValue: 200
											}
										}
									}
								}
							}
						}
					},
					quickVariantSelection: {
						type: "object",
						properties: { // Currently, everything here is just for documentation, but has no functionality. In future, a mechanism to fill default values shall be added
							showCounts: {
								type: "boolean",
								defaultValue: false
							},
							variants: {
								type: "object",
								mapEntryProperties: {
									key: {
										type: "string",
										optional: true
									},
									annotationPath: { // annotation path pointing to SelectionVariant
										type: "string"
									}
								}
							}
						}
					}
				},
				"manifest": "json"
			}
		});
});
