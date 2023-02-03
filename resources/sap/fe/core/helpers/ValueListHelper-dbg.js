/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2020 SAP SE. All rights reserved
    
 */
/* global Promise */
sap.ui.define(
	[
		"sap/ui/thirdparty/jquery",
		"sap/ui/core/XMLTemplateProcessor",
		"sap/ui/model/json/JSONModel",
		"sap/ui/core/util/XMLPreprocessor",
		"sap/ui/core/Fragment",
		"sap/m/MessageToast",
		"sap/ui/mdc/field/InParameter",
		"sap/ui/mdc/field/OutParameter",
		"sap/base/Log",
		"sap/fe/core/CommonUtils"
		//Just to be loaded for templating
		//"sap/ui/mdc/field/FieldValueHelp"
	],
	function(
		jQuery,
		XMLTemplateProcessor,
		JSONModel,
		XMLPreprocessor,
		Fragment,
		MessageToast,
		InParameter,
		OutParameter,
		Log,
		CommonUtils
	) {
		"use strict";
		var waitForPromise = {};

		function _hasImportanceHigh(oValueListContext) {
			return oValueListContext.Parameters.some(function(oParameter) {
				return (
					oParameter["@com.sap.vocabularies.UI.v1.Importance"] &&
					oParameter["@com.sap.vocabularies.UI.v1.Importance"].$EnumMember === "com.sap.vocabularies.UI.v1.ImportanceType/High"
				);
			});
		}

		function _entityIsSearchable(oValueListInfo) {
			var oCollectionAnnotations = oValueListInfo.valueListInfo.$model
					.getMetaModel()
					.getObject("/" + oValueListInfo.valueListInfo.CollectionPath + "@"),
				bSearchable =
					oCollectionAnnotations["@Org.OData.Capabilities.V1.SearchRestrictions"] &&
					oCollectionAnnotations["@Org.OData.Capabilities.V1.SearchRestrictions"].Searchable;
			return bSearchable === undefined ? true : bSearchable;
		}

		var ValueListHelper = {
			getColumnVisibility: function(oValueList, oVLParameter) {
				if (!_hasImportanceHigh(oValueList)) {
					return undefined;
				} else if (
					oVLParameter &&
					oVLParameter["@com.sap.vocabularies.UI.v1.Importance"] &&
					oVLParameter["@com.sap.vocabularies.UI.v1.Importance"].$EnumMember === "com.sap.vocabularies.UI.v1.ImportanceType/High"
				) {
					return undefined;
				} else {
					return "{_VHUI>/showAllColumns}";
				}
			},
			hasImportance: function(oValueListContext) {
				return _hasImportanceHigh(oValueListContext.getObject()) ? "Importance/High" : "None";
			},
			getMinScreenWidth: function(oValueList) {
				return _hasImportanceHigh(oValueList) ? "{= ${_VHUI>/minScreenWidth}}" : "418px";
			},
			getPropertyPath: function(oParameters) {
				return !oParameters.UnboundAction
					? "/" + oParameters.EntitySet + "/" + oParameters.Action + "/" + oParameters.Property
					: "/" + oParameters.Action.substring(oParameters.Action.lastIndexOf(".") + 1) + "/" + oParameters.Property;
			},
			getWaitForPromise: function() {
				return waitForPromise;
			},
			getValueListCollectionEntitySet: function(oValueListContext) {
				var mValueList = oValueListContext.getObject();
				return mValueList.$model.getMetaModel().createBindingContext("/" + mValueList.CollectionPath);
			},
			getValueListProperty: function(oPropertyContext) {
				var oValueListModel = oPropertyContext.getModel();
				var mValueList = oValueListModel.getObject("/");
				return mValueList.$model
					.getMetaModel()
					.createBindingContext("/" + mValueList.CollectionPath + "/" + oPropertyContext.getObject());
			},
			getValueListInfo: function(oFVH, oMetaModel, propertyPath, sConditionModel) {
				var sKey,
					sDescriptionPath,
					sFilterFields = "",
					sPropertyName = oMetaModel.getObject(propertyPath + "@sapui.name"),
					sPropertyPath,
					aInParameters = [],
					aOutParameters = [],
					sFieldPropertyPath = "";
				// Adding bAutoExpandSelect (second parameter of requestValueListInfo) as true by default
				return oMetaModel
					.requestValueListInfo(propertyPath, true)
					.then(function(mValueListInfo) {
						var bProcessInOut = oFVH.getInParameters().length + oFVH.getOutParameters().length === 0;
						// take the "" one if exists, otherwise take the first one in the object TODO: to be discussed
						mValueListInfo = mValueListInfo[mValueListInfo[""] ? "" : Object.keys(mValueListInfo)[0]];

						// Determine the settings
						// TODO: since this is a static function we can't store the infos when filterbar is requested later
						mValueListInfo.Parameters.forEach(function(entry) {
							//All String fields are allowed for filter
							sPropertyPath = "/" + mValueListInfo.CollectionPath + "/" + entry.ValueListProperty;
							var oProperty = mValueListInfo.$model.getMetaModel().getObject(sPropertyPath) || {},
								oPropertyAnnotations = mValueListInfo.$model.getMetaModel().getObject(sPropertyPath + "@") || {};
							//Search for the *out Parameter mapped to the local property
							if (!sKey && entry.$Type.indexOf("Out") > 48 && entry.LocalDataProperty.$PropertyPath === sPropertyName) {
								//"com.sap.vocabularies.Common.v1.ValueListParameter".length = 49
								sFieldPropertyPath = sPropertyPath;
								sKey = entry.ValueListProperty;
								//Only the text annotation of the key can specify the description
								sDescriptionPath =
									oPropertyAnnotations["@com.sap.vocabularies.Common.v1.Text"] &&
									oPropertyAnnotations["@com.sap.vocabularies.Common.v1.Text"].$Path;
							}
							if (
								!sFilterFields &&
								oProperty.$Type === "Edm.String" &&
								!oPropertyAnnotations["@com.sap.vocabularies.UI.v1.HiddenFilter"] &&
								!oPropertyAnnotations["@com.sap.vocabularies.UI.v1.Hidden"]
							) {
								//TODO: Ask why I can only specify one filter field? Maybe , is the wrong syntax...
								sFilterFields =
									sFilterFields.length > 0 ? sFilterFields + "," + entry.ValueListProperty : entry.ValueListProperty;
							}
							//Collect In and Out Parameter (except the field in question)
							if (
								bProcessInOut &&
								entry.$Type !== "com.sap.vocabularies.Common.v1.ValueListParameterDisplayOnly" &&
								entry.LocalDataProperty.$PropertyPath !== sPropertyName
							) {
								var sValuePath = "";
								if (sConditionModel && sConditionModel.length > 0) {
									sValuePath = sConditionModel + ">/conditions/";
								}
								sValuePath = "{" + sValuePath + entry.LocalDataProperty.$PropertyPath + "}";
								//Out and InOut
								if (entry.$Type.indexOf("Out") > 48) {
									aOutParameters.push(
										new OutParameter({
											value: sValuePath,
											helpPath: entry.ValueListProperty
										})
									);
								}
								//In and InOut
								if (entry.$Type.indexOf("In") > 48) {
									aInParameters.push(
										new InParameter({
											value: sValuePath,
											helpPath: entry.ValueListProperty
										})
									);
								}
								//otherwise displayOnly and therefor not considered
							}
						});
						return {
							keyValue: sKey,
							descriptionValue: sDescriptionPath,
							fieldPropertyPath: sFieldPropertyPath,
							filters: sFilterFields,
							inParameters: aInParameters,
							outParameters: aOutParameters,
							valueListInfo: mValueListInfo
						};
					})
					.catch(function(exc) {
						var sMsg =
							exc.status && exc.status === 404
								? "Metadata not found (" + exc.status + ") for value help of property " + propertyPath
								: exc.message;
						Log.error(sMsg);
						MessageToast.show(sMsg);
					});
			},
			createValueHelpDialog: function(propertyPath, oFVH, oTable, oFilterBar, oValueListInfo, bSuggestion) {
				var sFVHClass = oFVH.getMetadata().getName(),
					oWrapper = oFVH.getContent && oFVH.getContent(),
					sWrapperId = oWrapper.getId(),
					sFilterFields = oValueListInfo.filters,
					aInParameters = oValueListInfo.inParameters,
					aOutParameters = oValueListInfo.outParameters;

				var sViewStableId = "";
				if (
					oFVH.getModel("$view") &&
					oFVH.getModel("$view").getObject() &&
					oFVH
						.getModel("$view")
						.getObject()
						.getViewData()
				) {
					sViewStableId = oFVH
						.getModel("$view")
						.getObject()
						.getViewData().stableId;
				}

				//Only do this the first time
				if (!oTable) {
					if (sFVHClass.indexOf("FieldValueHelp") > -1) {
						//Complete the field value help control
						oFVH.setTitle(oValueListInfo.valueListInfo.Label);
						//TODO Clarify setKeyPath and setDescriptionPath. They may be for the (F)Fields not for the value helps
						oFVH.setKeyPath(oValueListInfo.keyValue);
						oFVH.setDescriptionPath(oValueListInfo.descriptionValue);
						//TODO: We need $search as the setFilterFields is used for type ahead. If I don't set any field it type ahead doesn't work
						oFVH.setFilterFields(_entityIsSearchable(oValueListInfo) ? "$search" : "");
					}
				}

				function templateFragment(sFragmentName) {
					var oFragment = XMLTemplateProcessor.loadTemplate(sFragmentName, "fragment"),
						mValueListInfo = oValueListInfo.valueListInfo,
						oValueListModel = new JSONModel(mValueListInfo),
						oValueListServiceMetaModel = mValueListInfo.$model.getMetaModel(),
						oSourceModel = new JSONModel({
							id: oFVH.getId()
						});
					return Promise.resolve(
						XMLPreprocessor.process(
							oFragment,
							{ name: sFragmentName },
							{
								//querySelector("*")
								bindingContexts: {
									valueList: oValueListModel.createBindingContext("/"),
									entitySet: oValueListServiceMetaModel.createBindingContext("/" + mValueListInfo.CollectionPath, null, {
										$$configModelPath: "/" + sViewStableId + "/" + mValueListInfo.CollectionPath
									}),
									source: oSourceModel.createBindingContext("/")
								},
								models: {
									valueList: oValueListModel,
									entitySet: oValueListServiceMetaModel,
									source: oSourceModel
								}
							}
						)
					).then(function(oFragment) {
						var oLogInfo = { path: propertyPath, fragmentName: sFragmentName, fragment: oFragment };
						if (Log.getLevel() === Log.Level.DEBUG) {
							//In debug mode we log all generated fragments
							ValueListHelper.ALLFRAGMENTS = ValueListHelper.ALLFRAGMENTS || [];
							ValueListHelper.ALLFRAGMENTS.push(oLogInfo);
						}
						if (ValueListHelper.logFragment) {
							//One Tool Subscriber allowed
							setTimeout(function() {
								ValueListHelper.logFragment(oLogInfo);
							}, 0);
						}
						return Fragment.load({ definition: oFragment });
					});
				}

				oTable = oTable || templateFragment("sap.fe.macros.ValueListTable");

				//Create filter bar if not there and requested via bSuggestion===false
				if (sFilterFields.length) {
					oFilterBar = oFilterBar || (!bSuggestion && templateFragment("sap.fe.macros.ValueListFilterBar"));
				} else {
					oFilterBar = Promise.resolve();
				}
				return Promise.all([oTable, oFilterBar]).then(function(aControls) {
					var oTable = aControls[0],
						oFilterBar = aControls[1];
					if (oTable) {
						oTable.setModel(oValueListInfo.valueListInfo.$model);
						Log.info("Value List XML content created [" + propertyPath + "]", oTable.getMetadata().getName(), "MDC Templating");
					}
					if (oFilterBar) {
						oFilterBar.setModel(oValueListInfo.valueListInfo.$model);
						Log.info(
							"Value List XML content created [" + propertyPath + "]",
							oFilterBar.getMetadata().getName(),
							"MDC Templating"
						);
					}
					if (oTable !== oWrapper.getTable()) {
						oWrapper.setTable(oTable);
						delete waitForPromise[sWrapperId];
					}
					var sContextualWidth = bSuggestion ? "416px" : "Auto";
					oTable.setContextualWidth(sContextualWidth);
					if (oFilterBar && oFilterBar !== oFVH.getFilterBar()) {
						oFVH.setFilterBar(oFilterBar);
					}
					aOutParameters.forEach(function(oOutParameter) {
						oFVH.addOutParameter(oOutParameter);
					});
					aInParameters.forEach(function(oInParameter) {
						oFVH.addInParameter(oInParameter);
					});
				});
			},
			showValueListInfo: function(propertyPath, oFVH, bSuggestion, sConditionModel) {
				var oModel = oFVH.getModel(),
					oMetaModel = oModel.getMetaModel(),
					oWrapper = oFVH.getContent && oFVH.getContent(),
					sWrapperId = oWrapper.getId(),
					oTable = oWrapper && oWrapper.getTable && oWrapper.getTable(),
					oFilterBar = oFVH && oFVH.getFilterBar && oFVH.getFilterBar(),
					bExists = oTable && oFilterBar,
					oVHUIModel;

				// setting the _VHUI model evaluated in the ValueListTable fragment
				oVHUIModel = oFVH.getModel("_VHUI");
				if (!oVHUIModel) {
					oVHUIModel = new JSONModel({});
					oFVH.setModel(oVHUIModel, "_VHUI");
				}
				oVHUIModel.setProperty("/showAllColumns", !bSuggestion);
				oVHUIModel.setProperty("/minScreenWidth", !bSuggestion ? "418px" : undefined);

				if (waitForPromise[sWrapperId] || bExists) {
					return waitForPromise["promise" + sWrapperId];
				} else {
					if (!oTable) {
						waitForPromise[sWrapperId] = true;
					}
					var oPromise = ValueListHelper.getValueListInfo(oFVH, oMetaModel, propertyPath, sConditionModel)
						.then(function(oValueListInfo) {
							if (
								oFVH
									.getParent()
									.getMetadata()
									.getName() === "sap.ui.mdc.Field"
							) {
								var oPropertyAnnotations,
									oCollectionAnnotations,
									mValueListInfo = oValueListInfo.valueListInfo;
								oPropertyAnnotations = mValueListInfo.$model
									.getMetaModel()
									.getObject(oValueListInfo.fieldPropertyPath + "@");
								oCollectionAnnotations = mValueListInfo.$model
									.getMetaModel()
									.getObject("/" + mValueListInfo.CollectionPath + "/$Type@");
								var sDisplayMode = CommonUtils.computeDisplayMode(oPropertyAnnotations, oCollectionAnnotations);
								oFVH.getParent().setProperty("display", sDisplayMode);
							}
							return ValueListHelper.createValueHelpDialog(
								propertyPath,
								oFVH,
								oTable,
								oFilterBar,
								oValueListInfo,
								bSuggestion
							);
						})
						.catch(function(exc) {
							var sMsg =
								exc.status && exc.status === 404
									? "Metadata not found (" + exc.status + ") for value help of property " + propertyPath
									: exc.message;
							Log.error(sMsg);
							MessageToast.show(sMsg);
						});
					waitForPromise["promise" + sWrapperId] = oPromise;
					return oPromise;
				}
			},
			setValueListFilterFields: function(propertyPath, oFVH, bSuggestion, sConditionModel) {
				var oModel = oFVH.getModel(),
					oMetaModel = oModel.getMetaModel();

				return ValueListHelper.getValueListInfo(oFVH, oMetaModel, propertyPath, sConditionModel).then(function(oValueListInfo) {
					oFVH.setFilterFields(_entityIsSearchable(oValueListInfo) ? "$search" : "");
				});
			}
		};
		return ValueListHelper;
	},
	/* bExport= */ true
);
