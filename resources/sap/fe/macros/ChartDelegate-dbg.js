/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2017 SAP SE. All rights reserved
    
 */

// ---------------------------------------------------------------------------------------
// Helper class used to help create content in the chart/item and fill relevant metadata
// ---------------------------------------------------------------------------------------
// ---------------------------------------------------------------------------------------
sap.ui.define(
	["sap/ui/mdc/library", "sap/ui/mdc/ChartDelegate", "sap/fe/macros/ODataMetaModelUtil", "sap/base/util/merge"],
	function(MDCLib, BaseChartDelegate, util, merge) {
		"use strict";
		var AGGREGATION_ANNO = "@Org.OData.Aggregation.V1";

		function fillHeadData(aHeadData) {
			this.name = aHeadData[0];
			this.label = aHeadData[1] || this.name;
			this.textProperty = aHeadData[2];
			this.type = util.getType(aHeadData[3]);
			if (aHeadData[4] || aHeadData[5]) {
				var sCalendarTag = aHeadData[4],
					sFiscalTag = aHeadData[5];

				if (sFiscalTag) {
					//fiscal tag is stronger than calendarTag
					switch (sFiscalTag) {
						case "year":
							this.timeUnit = "fiscalyear";
							break;
						case "yearPeriod":
							this.timeUnit = "fiscalyearperiod";
							break;
						default:
							this.timeUnit = undefined;
							break;
					}
				}
				if (sCalendarTag && !this.timeUnit) {
					switch (sCalendarTag) {
						case "yearMonth":
							this.timeUnit = "yearmonth";
							break;
						case "date":
							this.timeUnit = "yearmonthday";
							break;
						case "yearQuarter":
							this.timeUnit = "yearquarter";
							break;
						case "yearWeek":
							this.timeUnit = "yearweek";
							break;
						default:
							this.timeUnit = undefined;
							break;
					}
				}
			}

			this.criticality = aHeadData[6];

			return this;
		}

		function handleProperty(aResults) {
			var bGroupable = aResults[0],
				bAggregatable = aResults[1];

			var oHeadItem = {},
				oProperty = {},
				oItem;

			oProperty.inChart = bGroupable || bAggregatable || false;
			if (oProperty.inChart) {
				oProperty.chartItems = [];

				if (bGroupable) {
					oHeadItem.kind = MDCLib.ChartItemType.Dimension;
					oHeadItem.role = MDCLib.ChartItemRoleType.category;
					oItem = Object.assign({}, oHeadItem);
					oProperty.chartItems.push(oItem);
				}

				if (bAggregatable) {
					oHeadItem.kind = MDCLib.ChartItemType.Measure;
					oHeadItem.role = MDCLib.ChartItemRoleType.axis1;
					oHeadItem.contextDefiningProperties = aResults[4] || [];

					var aSupportedAggregationMethods = aResults[2] || [];
					var sDefaultAggregationMethod = aResults[3];

					for (var i = 0; i < aSupportedAggregationMethods.length; i++) {
						oItem = Object.assign({}, oHeadItem);
						oItem.aggregationMethod = aSupportedAggregationMethods[i];
						oItem.default = oItem.aggregationMethod == sDefaultAggregationMethod;
						oProperty.chartItems.push(oItem);
					}
				}
			}

			var oMetaModel = this.getModel();

			return Promise.all([
				oMetaModel.requestObject("@sapui.name", this),
				oMetaModel.requestObject("@com.sap.vocabularies.Common.v1.Label", this),
				oMetaModel.requestObject("@com.sap.vocabularies.Common.v1.Text/$Path", this),
				oMetaModel.requestObject("$Type", this),
				util.fetchCalendarTag(oMetaModel, this),
				util.fetchFiscalTag(oMetaModel, this),
				util.fetchCriticality(oMetaModel, this)
			]).then(fillHeadData.bind(oProperty));
		}

		function retrieveItems(mEntity, sPath, oMetaModel, mAnnos) {
			var sKey,
				oProperty,
				aPropertyPromise = [],
				aItems = [],
				sPrefix,
				aProperties = [],
				bSetFilterable,
				bSetSortable,
				mKnownAggregatableProps = {};

			var mCustomAggregates = util.getAllCustomAggregates(mAnnos);
			//Collect custom aggegates
			for (var sCustom in mCustomAggregates) {
				aItems.push(
					merge({}, mCustomAggregates[sCustom], {
						propertyPath: sCustom,
						kind: MDCLib.ChartItemType.Measure,
						role: MDCLib.ChartItemRoleType.axis1,
						sortable: mCustomAggregates[sCustom].sortable,
						filterable: mCustomAggregates[sCustom].filterable
					})
				);
			}

			var mTypeAggregatableProps = util.getAllAggregatableProperties(mAnnos);

			for (var sAggregatable in mTypeAggregatableProps) {
				sKey = mTypeAggregatableProps[sAggregatable].propertyPath;
				mKnownAggregatableProps[sKey] = mKnownAggregatableProps[sKey] || {};
				mKnownAggregatableProps[sKey][mTypeAggregatableProps[sAggregatable].aggregationMethod] = {
					name: mTypeAggregatableProps[sAggregatable].name,
					label: mTypeAggregatableProps[sAggregatable].label
				};
			}

			var oSortRestrictionsInfo = util.getSortRestrictionsInfo(mAnnos["@Org.OData.Capabilities.V1.SortRestrictions"]);
			var oFilterRestrictionsInfo = util.getFilterRestrictionsInfo(mAnnos["@Org.OData.Capabilities.V1.FilterRestrictions"]);

			function push(oProperty) {
				aProperties.push(oProperty);
				//calculate Sortable/filterable
				util.addSortInfoForProperty(oProperty, oSortRestrictionsInfo);
				util.addFilterInfoForProperty(oProperty, oFilterRestrictionsInfo);
				if (oProperty.inChart) {
					for (var i = 0; i < oProperty.chartItems.length; i++) {
						var oItem = oProperty.chartItems[i];
						oItem.propertyPath = oProperty.name;
						oItem.type = oProperty.type;
						oItem.timeUnit = oProperty.timeUnit;
						oItem.criticality = oProperty.criticality;
						if (oItem.kind == MDCLib.ChartItemType.Measure) {
							if (
								mKnownAggregatableProps[oItem.propertyPath] &&
								mKnownAggregatableProps[oItem.propertyPath][oItem.aggregationMethod]
							) {
								oItem.name = mKnownAggregatableProps[oItem.propertyPath][oItem.aggregationMethod].name;
								oItem.label = mKnownAggregatableProps[oItem.propertyPath][oItem.aggregationMethod].label;
							} else {
								oItem.name = oItem.aggregationMethod + oItem.propertyPath;
								oItem.label = oProperty.label + " (" + oItem.aggregationMethod + ")";
							}

							oItem.customAggregate = false;
							//in the first wave let us only sort by used items
							oItem.sortable = true;
							oItem.sortDirection = "both";
							oItem.filterable = true;
						} else {
							oItem.name = oProperty.name;
							oItem.textProperty = oProperty.textProperty;
							oItem.label = oProperty.label;
							//in the first wave let us only sort by used items
							oItem.sortable = oProperty.sortable;
							oItem.sortDirection = oProperty.sortDirection;
							//Allow filtering on each possible dimension
							oItem.filterable = oProperty.filterable;
							oItem.allowedExpressions = oProperty.allowedExpressions;
						}
						aItems.push(oItem);
					}
				}
			}

			for (sKey in mEntity) {
				if (sKey[0] !== "$") {
					// no special annotation
					oProperty = mEntity[sKey];
					if (oProperty && oProperty.$kind) {
						if (oProperty.$kind == "Property") {
							sPrefix = sPath + sKey + AGGREGATION_ANNO;
							aPropertyPromise.push(
								Promise.all([
									oMetaModel.requestObject(sPrefix + ".Groupable"),
									oMetaModel.requestObject(sPrefix + ".Aggregatable"),
									oMetaModel.requestObject(sPrefix + ".SupportedAggregationMethods"),
									oMetaModel.requestObject(sPrefix + ".RecommendedAggregationMethod"),
									oMetaModel.requestObject(sPrefix + ".ContextDefiningProperties")
								])
									.then(handleProperty.bind(oMetaModel.getMetaContext(sPath + sKey)))
									.then(push)
							);
						}
					}
				}
			}

			return Promise.all(aPropertyPromise).then(function() {
				return [bSetSortable, bSetFilterable, aProperties, aItems];
			});
		}

		/**
		 * Helper class for sap.ui.mdc.Chart.
		 * <h3><b>Note:</b></h3>
		 * The class is experimental and the API/behaviour is not finalised
		 * and hence this should not be used for productive usage.
		 * Especially this class is not intended to be used for the FE scenario,
		 * here we shall use sap.fe.macros.ChartDelegate that is especially tailored for V4
		 * meta model
		 *
		 * @author SAP SE
		 * @private
		 * @experimental
		 * @since 1.62
		 * @alias sap.fe.macros.ChartDelegate
		 */
		var ChartDelegate = Object.assign({}, BaseChartDelegate);

		ChartDelegate.retrieveAggregationItem = function(sAggregationName, oMetadata) {
			var oSettings;
			var oAggregation = {
				className: "",
				settings: {
					key: oMetadata.name,
					label: oMetadata.label || oMetadata.name,
					type: oMetadata.type
				}
			};

			switch (oMetadata.kind) {
				case MDCLib.ChartItemType.Dimension:
					oAggregation.className = "sap.ui.mdc.chart.DimensionItem";

					oSettings = {
						textProperty: oMetadata.textProperty,
						timeUnit: oMetadata.timeUnit,
						displayText: true,
						criticality: oMetadata.criticality
					};

					break;

				case MDCLib.ChartItemType.Measure:
					oAggregation.className = "sap.ui.mdc.chart.MeasureItem";

					oSettings = {
						propertyPath: oMetadata.propertyPath,
						aggregationMethod: oMetadata.aggregationMethod
					};

					break;

				// no default
			}

			oAggregation.settings = Object.assign(oAggregation.settings, oSettings);
			return oAggregation;
		};
		// base chart delegate returns a generic property metadata and does not invoke retrieveAllMetadata
		// custom implementation of fe is required.
		ChartDelegate.fetchProperties = function(oChart) {
			return ChartDelegate.retrieveAllMetadata(oChart).then(function(mMetadata) {
				return mMetadata.properties;
			});
		};

		/**
		 *  Fetches the relevant metadata for the Chart and returns property info array
		 *
		 * @param {Object} oModel The model instance
		 * @param {String} sPath The path
		 * @returns {Promise<{filterable: *, attributes: *, sortable: *, properties: *}>} oPromise of property info
		 */
		ChartDelegate.retrieveAllMetadata = function(oChart) {
			var oMetaModel, oModel, sSetPath, sTypePath;

			oModel = oChart.getModel();
			oMetaModel = oModel && oModel.getMetaModel();
			sSetPath = oChart.data("targetCollectionName") || oChart.oDataInfo.path;
			sTypePath = sSetPath + "/";
			if (sSetPath.endsWith("/")) {
				throw new Error("The leading path for metadata calculation is the entity set not the path");
			}

			function resolve(aResult) {
				var mMetadata = {
					sortable: aResult[0],
					filterable: aResult[1],
					attributes: aResult[2],
					properties: aResult[3]
				};

				return mMetadata;
			}
			if (oMetaModel) {
				var aSetAndTypePromise = [oMetaModel.requestObject(sTypePath), oMetaModel.requestObject(sSetPath)];
				//request object for entity

				return Promise.all(aSetAndTypePromise)
					.then(function(aTypeAndSet) {
						var mEntity = aTypeAndSet[0];
						var aAnnoPromises = [
							util.fetchAllAnnotations(oMetaModel, sTypePath),
							util.fetchAllAnnotations(oMetaModel, sSetPath)
						];

						return Promise.all(aAnnoPromises).then(function(aAnnos) {
							//merge the annotations of set and type and let set overrule
							var mAnnos = Object.assign(aAnnos[0], aAnnos[1]);
							return retrieveItems(mEntity, sTypePath, oMetaModel, mAnnos);
						});
					})
					.then(resolve);
			} else {
				return Promise.resolve({ properties: [] });
			}
		};

		return ChartDelegate;
	},
	/* bExport= */ false
);
