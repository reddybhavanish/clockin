/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2020 SAP SE. All rights reserved
    
 */
/* global Promise */
sap.ui.define(
	["sap/fe/core/helpers/ValueListHelper", "sap/fe/core/CommonUtils", "sap/m/MessageToast", "sap/base/Log"],
	function(ValueListHelper, CommonUtils, MessageToast, Log) {
		"use strict";
		var waitForPromise = ValueListHelper.getWaitForPromise();
		var FEHelper = {
			launchValueHelpFromActionParameterDialog: function(propertyPath, oFVH, bSuggestion) {
				var oModel = oFVH.getModel(),
					oMetaModel = oModel.getMetaModel(),
					oWrapper = oFVH.getContent && oFVH.getContent(),
					sWrapperId = oWrapper.getId(),
					oTable = oWrapper && oWrapper.getTable && oWrapper.getTable(),
					oFilterBar = oFVH && oFVH.getFilterBar && oFVH.getFilterBar(),
					bExists = oTable && oFilterBar,
					sContextualWidth;
				if (oTable) {
					sContextualWidth = bSuggestion ? "416px" : "Auto";
					oTable.setContextualWidth(sContextualWidth);
				}
				if (waitForPromise[sWrapperId] || bExists) {
					return;
				} else {
					if (!oTable) {
						waitForPromise[sWrapperId] = true;
					}
					ValueListHelper.getValueListInfo(oFVH, oMetaModel, propertyPath)
						.then(function(oValueListInfo) {
							var oPropertyAnnotations,
								oCollectionAnnotations,
								mValueListInfo = oValueListInfo.valueListInfo;
							oPropertyAnnotations = mValueListInfo.$model.getMetaModel().getObject(oValueListInfo.fieldPropertyPath + "@");
							oCollectionAnnotations = mValueListInfo.$model
								.getMetaModel()
								.getObject("/" + mValueListInfo.CollectionPath + "/$Type@");
							var sDisplayMode = CommonUtils.computeDisplayMode(oPropertyAnnotations, oCollectionAnnotations);
							oFVH.getParent().setProperty("display", sDisplayMode);
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
				}
			},

			getTargetCollection: function(oContext) {
				var sPath = oContext.getPath();
				if (
					oContext.getObject("$kind") === "EntitySet" ||
					oContext.getObject("$kind") === "Action" ||
					oContext.getObject("0/$kind") === "Action"
				) {
					return sPath;
				}
				sPath =
					"/" +
					sPath
						.split("/")
						.filter(Boolean)
						.join("/$NavigationPropertyBinding/");
				return "/" + oContext.getObject(sPath);
			},

			/**
			 * Method to replace Local Properties with Semantic Object mappings
			 * @param {Object} oSelectionVariant - SelectionVariant consisting of filterbar, Table and Page Context
			 * @param {Object} sMappings - stringified version of semantic object mappinghs
			 * @return {Object} - Modified SelectionVariant with LocalProperty replaced with SemanticObjectProperties.
			 */
			setSemanticObjectMappings: function(oSelectionVariant, sMappings) {
				var oMappings = JSON.parse(sMappings);
				for (var i = 0; i < oMappings.length; i++) {
					var sLocalProperty = oMappings[i]["LocalProperty"]["$PropertyPath"];
					var sSemanticObjectProperty = oMappings[i]["SemanticObjectProperty"];
					if (oSelectionVariant.getSelectOption(sLocalProperty)) {
						var oSelectOption = oSelectionVariant.getSelectOption(sLocalProperty);
						var sSign = oSelectOption[0]["Sign"];
						var sLow = oSelectOption[0]["Low"];
						var sOption = oSelectOption[0]["Option"];
						var sHigh = oSelectOption[0]["High"];

						//Create a new SelectOption with sSemanticObjectProperty as the property Name and remove the older one
						oSelectionVariant.removeSelectOption(sLocalProperty);
						oSelectionVariant.addSelectOption(sSemanticObjectProperty, sSign, sOption, sLow, sHigh);
					}
				}
				return oSelectionVariant;
			}
		};
		return FEHelper;
	},
	/* bExport= */ true
);
