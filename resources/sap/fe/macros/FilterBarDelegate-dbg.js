/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2017 SAP SE. All rights reserved
    
 */

// ---------------------------------------------------------------------------------------
// Helper class used to help create content in the FilterBar and fill relevant metadata
// ---------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------
sap.ui.define(
	[
		"sap/ui/mdc/FilterBarDelegate",
		"sap/ui/core/XMLTemplateProcessor",
		"sap/ui/core/util/XMLPreprocessor",
		"sap/ui/core/Fragment",
		"sap/ui/model/json/JSONModel",
		"sap/fe/macros/CommonHelper",
		"sap/fe/core/helpers/StableIdHelper",
		"sap/fe/macros/field/FieldHelper",
		"sap/base/util/ObjectPath",
		"sap/ui/mdc/odata/v4/FieldBaseDelegate",
		"sap/ui/model/odata/type/String",
		"sap/fe/macros/ResourceModel",
		"sap/base/util/merge",
		"sap/fe/macros/DelegateUtil",
		"sap/fe/macros/FilterBarHelper"
	],
	function(
		FilterBarDelegate,
		XMLTemplateProcessor,
		XMLPreprocessor,
		Fragment,
		JSONModel,
		CommonHelper,
		StableIdHelper,
		FieldHelper,
		ObjectPath,
		FieldBaseDelegate,
		StringType,
		ResourceModel,
		mergeObjects,
		DelegateUtil,
		FilterBarHelper
	) {
		"use strict";
		var ODataFilterBarDelegate = Object.assign({}, FilterBarDelegate),
			aVisitedEntityTypes = [],
			mDefaultTypeForEdmType = {
				"Edm.Boolean": {
					modelType: "Bool"
				},
				"Edm.Byte": {
					modelType: "Int"
				},
				"Edm.Date": {
					modelType: "Date"
				},
				"Edm.DateTime": {
					modelType: "Date"
				},
				"Edm.DateTimeOffset": {
					modelType: "DateTimeOffset"
				},
				"Edm.Decimal": {
					modelType: "Decimal"
				},
				"Edm.Double": {
					modelType: "Float"
				},
				"Edm.Float": {
					modelType: "Float"
				},
				"Edm.Guid": {
					modelType: "Guid"
				},
				"Edm.Int16": {
					modelType: "Int"
				},
				"Edm.Int32": {
					modelType: "Int"
				},
				"Edm.Int64": {
					modelType: "Int"
				},
				"Edm.SByte": {
					modelType: "Int"
				},
				"Edm.Single": {
					modelType: "Float"
				},
				"Edm.String": {
					modelType: "String"
				},
				"Edm.Time": {
					modelType: "TimeOfDay"
				},
				"Edm.TimeOfDay": {
					modelType: "TimeOfDay"
				},
				"Edm.Stream": {
					//no corresponding modelType - ignore for filtering
				}
			},
			EDIT_STATE_PROPERTY_NAME = "$editState",
			SEARCH_PROPERTY_NAME = "$search";

		function _isMultiValue(oProperty) {
			var bIsMultiValue = true;

			//SingleValue | MultiValue | SingleRange | MultiRange | SearchExpression | MultiRangeOrSearchExpression

			switch (oProperty.filterExpression) {
				case "SearchExpression":
				case "SingleRange":
				case "SingleValue":
					bIsMultiValue = false;
					break;
			}

			if (oProperty.type && oProperty.type.indexOf("Boolean") > 0) {
				bIsMultiValue = false;
			}

			return bIsMultiValue;
		}

		function _getSearchFilterPropertyInfo() {
			return {
				name: SEARCH_PROPERTY_NAME,
				path: SEARCH_PROPERTY_NAME,
				type: "sap.ui.model.odata.type.String",
				baseType: new StringType(),
				maxConditions: 1
			};
		}

		function _getEditStateFilterPropertyInfo() {
			return {
				name: EDIT_STATE_PROPERTY_NAME,
				path: EDIT_STATE_PROPERTY_NAME,
				groupLabel: null,
				group: null,
				label: ResourceModel.getText("filterbar.EDITING_STATUS"),
				tooltip: null,
				hiddenFilter: false,
				type: "sap.ui.model.odata.type.String",
				baseType: new StringType(),
				defaultFilterConditions: [
					{
						fieldPath: "$editState",
						operator: "DRAFT_EDIT_STATE",
						values: ["0"]
					}
				]
			};
		}

		function fnTemplateEditState(oFilterBar, oModifier) {
			var oThis = new JSONModel({
					id: DelegateUtil.getCustomData(oFilterBar, "localId"),
					draftEditStateModelName: DelegateUtil.getCustomData(oFilterBar, "draftEditStateModelName")
				}),
				oPreprocessorSettings = {
					bindingContexts: {
						"this": oThis.createBindingContext("/")
					},
					models: {
						"this.i18n": ResourceModel.getModel(),
						"this": oThis
					}
				};

			return DelegateUtil.templateControlFragment(
				"sap.fe.macros.ValueHelp",
				oPreprocessorSettings,
				undefined,
				oModifier.targets === "xmlTree"
			);
		}

		function _fetchPropertyInfo(oProperty, sNavigationProperty, sKey, sBindingPath, oMetaModel) {
			var oPropertyAnnotations = oMetaModel.getObject(sNavigationProperty + "/" + sKey + "@"),
				oCollectionAnnotations = oMetaModel.getObject(sNavigationProperty + "/@"),
				oFilterDefaultValue,
				oFilterDefaultValueAnnotation,
				bIsHidden,
				bIsHiddenFilter,
				bIsFilterableType,
				bIsDigitSequence,
				oConstraints,
				oPropertyInfo,
				sGroupLabel =
					sNavigationProperty !== sBindingPath
						? oMetaModel.getObject(sNavigationProperty + "@com.sap.vocabularies.Common.v1.Label") ||
						  oMetaModel.getObject(sNavigationProperty + "/@com.sap.vocabularies.Common.v1.Label") ||
						  oMetaModel.getObject(sNavigationProperty + "@sapui.name")
						: "",
				sLabel = oPropertyAnnotations["@com.sap.vocabularies.Common.v1.Label"] || sKey,
				sPath = sNavigationProperty.substr(sBindingPath.length);

			// check if hidden
			bIsHidden = CommonHelper.getBoolAnnotationValue(oPropertyAnnotations["@com.sap.vocabularies.UI.v1.Hidden"]);

			// check if type can be used for filtering, unsupported types are eg. Edm.Stream, field control, messages -> they have no sap.ui.model.type correspondence
			bIsFilterableType =
				oProperty.$Type && oProperty.$Type in mDefaultTypeForEdmType && !!mDefaultTypeForEdmType[oProperty.$Type].modelType;
			if (bIsHidden || !bIsFilterableType) {
				return false;
			}

			//check if hidden filter
			bIsHiddenFilter = CommonHelper.getBoolAnnotationValue(oPropertyAnnotations["@com.sap.vocabularies.UI.v1.HiddenFilter"]);

			// check digit sequence
			bIsDigitSequence = CommonHelper.getBoolAnnotationValue(oPropertyAnnotations["@com.sap.vocabularies.Common.v1.IsDigitSequence"]);

			// handle constraints
			if (oProperty.$MaxLength || oProperty.$Precision || oProperty.$Scale || bIsDigitSequence) {
				oConstraints = {};
				if (oProperty.$MaxLength) {
					oConstraints.maxLength = oProperty.$MaxLength;
				}
				if (oProperty.$Precision) {
					oConstraints.precision = oProperty.$Precision;
				}
				if (oProperty.$Scale) {
					oConstraints.scale = oProperty.$Scale;
				}
				if (bIsDigitSequence) {
					oConstraints.isDigitSequence = bIsDigitSequence;
				}
			} else {
				oConstraints = null;
			}

			oFilterDefaultValueAnnotation = oPropertyAnnotations["@com.sap.vocabularies.Common.v1.FilterDefaultValue"];
			if (oFilterDefaultValueAnnotation) {
				oFilterDefaultValue = oFilterDefaultValueAnnotation["$" + mDefaultTypeForEdmType[oProperty.$Type].modelType];
			}

			// /_NavigationProperty1/_NavigationProperty2/Property
			if (sPath.indexOf("/") === 0) {
				sPath = sPath.substr(1);
			}

			// Show the labels of previous two navigations if there
			var sFirstLabel, sSecondLabel, sSecondToLastNavigation;
			if (sPath.split("/").length > 1) {
				sSecondToLastNavigation = sBindingPath + "/" + sPath.substr(0, sPath.lastIndexOf("/"));
				sFirstLabel =
					oMetaModel.getObject(sSecondToLastNavigation + "@com.sap.vocabularies.Common.v1.Label") ||
					oMetaModel.getObject(sSecondToLastNavigation + "/@com.sap.vocabularies.Common.v1.Label");
				sSecondLabel = sGroupLabel;
				sGroupLabel = sFirstLabel + " > " + sSecondLabel;
			}

			if (sPath) {
				sPath = sPath + "/";
			}
			sPath = sPath + sKey;

			oPropertyInfo = {
				name: sPath,
				path: sPath,
				groupLabel: sGroupLabel || null,
				group: sNavigationProperty,
				label: sLabel,
				tooltip: oPropertyAnnotations["@com.sap.vocabularies.Common.v1.QuickInfo"] || null,
				hiddenFilter: bIsHiddenFilter,
				type: FieldBaseDelegate.getDataTypeClass({}, oProperty.$Type)
			};

			if (oProperty.$Type === "Edm.DateTimeOffset") {
				if (!oConstraints) {
					oConstraints = {};
				}

				oConstraints.V4 = true;
			}

			if (oConstraints) {
				oPropertyInfo.constraints = oConstraints;
			}

			if (oFilterDefaultValue) {
				oPropertyInfo.defaultFilterConditions = [
					{
						fieldPath: sKey,
						operator: "EQ",
						values: [oFilterDefaultValue]
					}
				];
			}

			var vDataType = ObjectPath.get(oPropertyInfo.type || "");
			if (vDataType) {
				oPropertyInfo.baseType = new vDataType(oPropertyInfo.formatOptions, oPropertyInfo.constraints);
			}

			oPropertyInfo.display = FieldHelper.displayMode(oPropertyAnnotations, oCollectionAnnotations);

			return oPropertyInfo;
		}

		function _fetchPropertiesForEntity(sEntitySetPath, sNavigationProperty, sBindingPath, oMetaModel) {
			return Promise.all([
				DelegateUtil.fetchPropertiesForEntity(sBindingPath, oMetaModel),
				DelegateUtil.fetchAnnotationsForEntity(sBindingPath, oMetaModel)
			]).then(function(aResults) {
				var oEntityType = aResults[0],
					mEntitySetAnnotations = aResults[1];
				if (!oEntityType) {
					return Promise.resolve([]);
				}
				var oObj,
					oPropertyInfo,
					aFetchedProperties = [],
					aNonFilterableProps = [],
					aRequiredProps = [],
					aSelectionFields = [],
					mAllowedExpressions = {},
					oAnnotation = mEntitySetAnnotations["@Org.OData.Capabilities.V1.FilterRestrictions"];

				if (oAnnotation) {
					if (oAnnotation.NonFilterableProperties) {
						aNonFilterableProps = oAnnotation.NonFilterableProperties.map(function(oProperty) {
							return oProperty.$PropertyPath;
						});
					}

					if (oAnnotation.RequiredProperties) {
						aRequiredProps = oAnnotation.RequiredProperties.map(function(oProperty) {
							return oProperty.$PropertyPath;
						});
					}

					if (oAnnotation.FilterExpressionRestrictions) {
						oAnnotation.FilterExpressionRestrictions.forEach(function(oProperty) {
							//SingleValue | MultiValue | SingleRange | MultiRange | SearchExpression | MultiRangeOrSearchExpression
							mAllowedExpressions[oProperty.Property.$PropertyPath] = oProperty.AllowedExpressions;
						});
					}
				}

				// find selection fields
				oAnnotation = oMetaModel.getObject(sEntitySetPath + "/" + "@com.sap.vocabularies.UI.v1.SelectionFields");
				if (oAnnotation) {
					aSelectionFields = oAnnotation.map(function(oProperty) {
						return oProperty.$PropertyPath;
					});
				}

				for (var sKey in oEntityType) {
					oObj = oEntityType[sKey];
					if (oObj) {
						if (oObj.$kind === "Property") {
							// skip non-filterable property
							if (aNonFilterableProps.indexOf(sKey) >= 0) {
								continue;
							}
							oPropertyInfo = _fetchPropertyInfo(oObj, sNavigationProperty, sKey, sBindingPath, oMetaModel);
							if (oPropertyInfo !== false) {
								oPropertyInfo.required = aRequiredProps.indexOf(sKey) >= 0;
								oPropertyInfo.visible = aSelectionFields.indexOf(sKey) >= 0;
								if (mAllowedExpressions[sKey]) {
									oPropertyInfo.filterExpression = mAllowedExpressions[sKey];
								} else {
									oPropertyInfo.filterExpression = "auto"; // default
								}
								oPropertyInfo.maxConditions = _isMultiValue(oPropertyInfo) ? -1 : 1;

								aFetchedProperties.push(oPropertyInfo);
							}
						}
					}
				}
				return aFetchedProperties;
			});
		}

		/**
		 * Method responsible for providing information about current filter field added to filter bar via 'Adapt Filters' UI.
		 * @param sPropertyName {string} Name of the property being added as filter field
		 * @param oFilterBar {object}	FilterBar control instance
		 * @param mPropertyBag {map}	Instance of property bag from Flex change API
		 * @returns {Promise} once resolved a filter field definition is returned
		 */
		ODataFilterBarDelegate.beforeAddFilterFlex = function(sPropertyName, oFilterBar, mPropertyBag) {
			var oModifier = mPropertyBag.modifier;

			if (sPropertyName === EDIT_STATE_PROPERTY_NAME) {
				return fnTemplateEditState(oFilterBar, oModifier);
			}
			if (sPropertyName === SEARCH_PROPERTY_NAME) {
				return Promise.resolve();
			}

			var oMetaModel = mPropertyBag.appComponent && mPropertyBag.appComponent.getModel().getMetaModel(),
				bIsXml = oModifier.targets === "xmlTree",
				sEntitySetPath;

			if (!oMetaModel) {
				return Promise.resolve(null);
			}

			sEntitySetPath = "/" + DelegateUtil.getCustomData(oFilterBar, "entitySet");

			var sPropertyPath = sEntitySetPath + "/" + sPropertyName,
				vhIdPrefix,
				idPrefix,
				sNavigationPrefix = sPropertyName.indexOf("/") >= 0 ? sPropertyName.substring(0, sPropertyName.lastIndexOf("/")) : "";

			idPrefix = sNavigationPrefix
				? StableIdHelper.generate([oModifier.getId(oFilterBar), "FilterField", sNavigationPrefix])
				: StableIdHelper.generate([oModifier.getId(oFilterBar), "FilterField"]);

			vhIdPrefix = sNavigationPrefix
				? StableIdHelper.generate([oModifier.getId(oFilterBar), "FilterFieldValueHelp", sNavigationPrefix])
				: StableIdHelper.generate([oModifier.getId(oFilterBar), "FilterFieldValueHelp"]);

			var oPropertyContext = oMetaModel.createBindingContext(sPropertyPath),
				mTemplateSettings = {
					bindingContexts: {
						"entitySet": oMetaModel.createBindingContext(sEntitySetPath),
						"property": oPropertyContext
					},
					models: {
						"entitySet": oMetaModel,
						"property": oMetaModel
					},
					isXml: bIsXml
				};

			var oParameters = {
				sPropertyName: sPropertyName,
				sBindingPath: sEntitySetPath,
				sVHIdPrefix: "FilterFieldValueHelp",
				oControl: oFilterBar,
				oMetaModel: oMetaModel,
				oModifier: oModifier
			};

			function fnTemplateValueHelp(mSettings) {
				DelegateUtil.isValueHelpRequired(oParameters).then(function(bValueHelpRequired) {
					var oThis = new JSONModel({
							idPrefix: vhIdPrefix,
							conditionModel: "$filters>/conditions/" + sPropertyName,
							navigationPrefix: sNavigationPrefix ? "/" + sNavigationPrefix : "",
							forceValueHelp: !bValueHelpRequired
						}),
						oPreprocessorSettings = mergeObjects({}, mSettings, {
							bindingContexts: {
								"this": oThis.createBindingContext("/")
							},
							models: {
								"this": oThis
							}
						});

					return DelegateUtil.templateControlFragment(
						"sap.fe.macros.ValueHelp",
						oPreprocessorSettings,
						undefined,
						oModifier.targets === "xmlTree"
					).then(function(oVHElement) {
						if (oVHElement) {
							oModifier.insertAggregation(oFilterBar, "dependents", oVHElement, 0);
						}
					});
				});
			}

			function fnTemplateFragment(mSettings) {
				var oThis = new JSONModel({
						idPrefix: idPrefix,
						vhIdPrefix: vhIdPrefix,
						propertyPath: sPropertyName,
						navigationPrefix: sNavigationPrefix ? "/" + sNavigationPrefix : ""
					}),
					oPreprocessorSettings = mergeObjects({}, mSettings, {
						bindingContexts: {
							"this": oThis.createBindingContext("/")
						},
						models: {
							"this": oThis
						}
					});

				return DelegateUtil.templateControlFragment(
					"sap.fe.macros.FilterField",
					oPreprocessorSettings,
					undefined,
					oModifier.targets === "xmlTree"
				);
			}

			return DelegateUtil.doesValueHelpExist(oParameters)
				.then(function(bValueHelpExists) {
					if (!bValueHelpExists) {
						return fnTemplateValueHelp(mTemplateSettings);
					}
					return Promise.resolve();
				})
				.then(fnTemplateFragment.bind(this, mTemplateSettings));
		};

		/**
		 * Fetches the relevant metadata for the filter bar and returns property info array.
		 * @param {sap.ui.mdc.FilterBar} oFilterBar - the instance of filter bar
		 * @returns {Promise} once resolved an array of property info is returned
		 */
		ODataFilterBarDelegate.fetchProperties = function(oFilterBar) {
			var sEntitySet = oFilterBar.data("entitySet"),
				sEntitySetPath = "/" + sEntitySet,
				oMetaModel;

			return DelegateUtil.fetchModel(oFilterBar).then(function(oModel) {
				if (!oModel) {
					return [];
				}

				oMetaModel = oModel.getMetaModel();
				if (oFilterBar.getBindingContext()) {
					sEntitySetPath = CommonHelper.getTargetCollection(oFilterBar.getBindingContext(), sEntitySet);
				}

				//track to avoid circular repeats
				aVisitedEntityTypes.push(oMetaModel.getObject(sEntitySetPath + "/@sapui.name"));
				return _fetchPropertiesForEntity(sEntitySetPath, sEntitySetPath, sEntitySetPath, oMetaModel).then(function(aProperties) {
					if (oFilterBar.data("draftEditStateModelName")) {
						aProperties.push(_getEditStateFilterPropertyInfo());
					}
					if (
						FilterBarHelper.checkIfBasicSearchIsVisible(
							oFilterBar.data("hideBasicSearch") === "true",
							oMetaModel.getObject(sEntitySetPath + "@Org.OData.Capabilities.V1.SearchRestrictions")
						)
					) {
						aProperties.push(_getSearchFilterPropertyInfo());
					}
					return aProperties;
				});
			});
		};

		return ODataFilterBarDelegate;
	},
	/* bExport= */ false
);
