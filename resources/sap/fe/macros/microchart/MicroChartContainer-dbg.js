/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2017 SAP SE. All rights reserved
    
 */

sap.ui.define(
	[
		"sap/ui/core/Control",
		"sap/m/library",
		"sap/base/Log",
		"sap/m/Label",
		"sap/m/Title",
		"sap/m/FlexBox",
		"sap/ui/core/format/DateFormat",
		"sap/ui/core/format/NumberFormat",
		"sap/suite/ui/microchart/AreaMicroChart",
		"sap/suite/ui/microchart/ColumnMicroChart",
		"sap/suite/ui/microchart/LineMicroChart",
		"sap/ui/model/odata/v4/ODataListBinding",
		"sap/ui/model/odata/v4/ODataMetaModel"
	],
	function(
		Control,
		mobilelibrary,
		Log,
		Label,
		Title,
		FlexBox,
		DateFormat,
		NumberFormat,
		AreaMicroChart,
		ColumnMicroChart,
		LineMicroChart,
		ODataV4ListBinding,
		ODataMetaModel
	) {
		"use strict";

		/**
		 *  Container Control for Micro Chart and UoM.
		 *
		 * @private
		 * @experimental This module is only for internal/experimental use!
		 */

		var ValueColor = mobilelibrary.ValueColor;

		var MicroChartContainer = Control.extend("sap.fe.macros.microchart.MicroChartContainer", {
			metadata: {
				properties: {
					renderLabels: {
						type: "boolean",
						defaultValue: true
					},
					uomPath: {
						type: "string",
						defaultValue: undefined
					},
					measures: {
						type: "string[]",
						defaultValue: []
					},
					dimension: {
						type: "string",
						defaultValue: undefined
					},
					dataPointQualifiers: {
						type: "string[]",
						defaultValue: []
					},
					measurePrecision: {
						type: "int",
						defaultValue: undefined
					},
					measureScale: {
						type: "int",
						defaultValue: 1
					},
					dimensionPrecision: {
						type: "int",
						defaultValue: undefined
					},
					chartTitle: {
						type: "string",
						defaultValue: ""
					},
					chartDescription: {
						type: "string",
						defaultValue: ""
					}
				},
				events: {},
				defaultAggregation: "microChart",
				aggregations: {
					microChart: {
						type: "sap.ui.core.Control",
						multiple: false
					},
					_uomLabel: {
						type: "sap.m.Label",
						multiple: false
					}
				},
				publicMethods: []
			},

			renderer: {
				render: function(oRm, oControl) {
					oRm.write("<div");
					oRm.writeControlData(oControl);
					oRm.writeClasses();
					oRm.write(">");
					if (oControl.getRenderLabels()) {
						oRm.write("<div>");
						var ochartTitle = new Title({ text: oControl.getChartTitle() });
						oRm.renderControl(ochartTitle);
						oRm.write("</div>");
						oRm.write("<div>");
						var ochartDescription = new Label({ text: oControl.getChartDescription() });
						oRm.renderControl(ochartDescription);
						oRm.write("</div>");
					}
					var oMicroChart = oControl.getMicroChart();
					if (oMicroChart) {
						oMicroChart.addStyleClass("sapUiTinyMarginTopBottom");
						oRm.renderControl(oMicroChart);
						if (oControl.getRenderLabels() && oControl.getUomPath()) {
							var oSettings = oControl._checkIfChartRequiresRuntimeLabels()
									? undefined
									: { text: { path: oControl.getUomPath() } },
								oLabel = new Label(oSettings),
								oFlexBox = new FlexBox({
									alignItems: "Start",
									justifyContent: "End",
									items: [oLabel]
								});
							oRm.renderControl(oFlexBox);
							oControl.setAggregation("_uomLabel", oLabel);
						}
					}
					oRm.write("</div>");
				}
			}
		});

		MicroChartContainer.prototype.onBeforeRendering = function() {
			var that = this,
				oBinding = that._getListBindingForRuntimeLabels();

			if (oBinding) {
				oBinding.detachEvent("change", that._setRuntimeChartLabelsAndUnitOfMeasure, that);
				that._olistBinding = undefined;
			}
		};

		MicroChartContainer.prototype.onAfterRendering = function() {
			var that = this,
				oBinding = that._getListBindingForRuntimeLabels();

			if (!that.getRenderLabels() || !that._checkIfChartRequiresRuntimeLabels()) {
				return;
			}
			if (oBinding) {
				oBinding.attachEvent("change", that._setRuntimeChartLabelsAndUnitOfMeasure, that);
				that._olistBinding = oBinding;
			}
		};

		MicroChartContainer.prototype.setRenderLabels = function(sValue) {
			var that = this;
			if (!sValue && that._olistBinding) {
				that._olistBinding.detachEvent("change", that._setRuntimeChartLabelsAndUnitOfMeasure, that);
				that._setChartLabels();
			}
			this.setProperty("renderLabels", sValue, false /*re-rendering*/);
		};

		/**
		 * @return {boolean} If the chart labels need to be rendered based on the chart type
		 * @private
		 */
		MicroChartContainer.prototype._checkIfChartRequiresRuntimeLabels = function() {
			var that = this,
				oMicroChart = that.getMicroChart();

			return Boolean(
				oMicroChart instanceof AreaMicroChart || oMicroChart instanceof ColumnMicroChart || oMicroChart instanceof LineMicroChart
			);
		};

		/**
		 * @return {boolean} If the chart labels need to be rendered based on the chart type
		 * @private
		 */
		MicroChartContainer.prototype._checkForChartLabelAggregations = function() {
			var that = this,
				oMicroChart = that.getMicroChart();

			return Boolean(
				(oMicroChart instanceof AreaMicroChart &&
					oMicroChart.getAggregation("firstYLabel") &&
					oMicroChart.getAggregation("lastYLabel") &&
					oMicroChart.getAggregation("firstXLabel") &&
					oMicroChart.getAggregation("lastXLabel")) ||
					(oMicroChart instanceof ColumnMicroChart &&
						oMicroChart.getAggregation("leftTopLabel") &&
						oMicroChart.getAggregation("rightTopLabel") &&
						oMicroChart.getAggregation("leftBottomLabel") &&
						oMicroChart.getAggregation("rightBottomLabel")) ||
					oMicroChart instanceof LineMicroChart
			);
		};

		/**
		 *
		 * @return {sap.ui.model.odata.v4.ODataListBinding} Listbinding of to attach change handler
		 * @private
		 */
		MicroChartContainer.prototype._getListBindingForRuntimeLabels = function() {
			var that = this,
				oMicroChart = that.getMicroChart(),
				oBinding;
			if (oMicroChart instanceof AreaMicroChart) {
				var oChart = oMicroChart.getChart();
				oBinding = oChart && oMicroChart.getChart().getBinding("points");
			} else if (oMicroChart instanceof ColumnMicroChart) {
				oBinding = oMicroChart.getBinding("columns");
			} else if (oMicroChart instanceof LineMicroChart) {
				var aLines = oMicroChart.getLines();
				oBinding = aLines && aLines.length && aLines[0].getBinding("points");
			}
			return oBinding instanceof ODataV4ListBinding ? oBinding : false;
		};

		/**
		 * This method is used to set runtime labels for micro charts
		 * Runtime labels are required for the following micro chart types:
		 * 1. Area
		 * 2. Column
		 * 3. Line
		 * @private
		 * @returns
		 */
		MicroChartContainer.prototype._setRuntimeChartLabelsAndUnitOfMeasure = function() {
			var that = this,
				oListBinding = that._olistBinding,
				aContexts = oListBinding.getContexts(),
				aMeasures = that.getMeasures() || [],
				sDimension = that.getDimension(),
				sUnitOfMeasurePath = this.getUomPath(),
				oMicroChart = that.getMicroChart(),
				oUnitOfMeasureLabel = that.getAggregation("_uomLabel");

			if (sUnitOfMeasurePath && aContexts.length) {
				oUnitOfMeasureLabel.setText(aContexts[0].getObject(sUnitOfMeasurePath));
			}

			if (!that._checkForChartLabelAggregations()) {
				return;
			}

			if (!aContexts.length) {
				that._setChartLabels();
				return;
			}

			var oFirstContext = aContexts[0],
				oLastContext = aContexts[aContexts.length - 1],
				oMinX = { value: Infinity },
				oMaxX = { value: -Infinity },
				oMinY = { value: Infinity },
				oMaxY = { value: -Infinity },
				aLinesPomises = [],
				bLineChart = oMicroChart instanceof LineMicroChart,
				iCurrentMinX = oFirstContext.getObject(sDimension),
				iCurrentMaxX = oLastContext.getObject(sDimension),
				iCurrentMinY,
				iCurrentMaxY;

			oMinX = iCurrentMinX == undefined ? oMinX : { context: oFirstContext, value: iCurrentMinX };
			oMaxX = iCurrentMaxX == undefined ? oMaxX : { context: oLastContext, value: iCurrentMaxX };

			aMeasures.forEach(function(sMeasure, i) {
				iCurrentMinY = oFirstContext.getObject(sMeasure);
				iCurrentMaxY = oLastContext.getObject(sMeasure);
				oMaxY = iCurrentMaxY > oMaxY.value ? { context: oLastContext, value: iCurrentMaxY, index: bLineChart ? i : 0 } : oMaxY;
				oMinY = iCurrentMinY < oMinY.value ? { context: oFirstContext, value: iCurrentMinY, index: bLineChart ? i : 0 } : oMinY;
				if (bLineChart) {
					aLinesPomises.push(that._getCriticalityFromPoint({ context: oLastContext, value: iCurrentMaxY, index: i }));
				}
			});
			that._setChartLabels(oMinY.value, oMaxY.value, oMinX.value, oMaxX.value);
			if (bLineChart) {
				return Promise.all(aLinesPomises).then(function(aColors) {
					var aLines = oMicroChart.getLines();
					aLines.forEach(function(oLine, i) {
						oLine.setColor(aColors[i]);
					});
				});
			} else {
				return that._setChartLabelsColors(oMaxY, oMinY);
			}
		};

		/**
		 * Set the chart label colors. The chart types that use label colors:
		 * 1. Area
		 * 2. Line
		 * 3. Column
		 * @param {Object} oMaxY : The point to plot the maximum measure label.
		 * @param {Object} oMinY : The point to plot the minimum measure label.
		 * @private
		 * @returns
		 */
		MicroChartContainer.prototype._setChartLabelsColors = function(oMaxY, oMinY) {
			var that = this,
				oMicroChart = that.getMicroChart();

			return Promise.all([that._getCriticalityFromPoint(oMinY), that._getCriticalityFromPoint(oMaxY)]).then(function(aCriticality) {
				if (oMicroChart instanceof AreaMicroChart) {
					oMicroChart.getAggregation("firstYLabel").setProperty("color", aCriticality[0], true);
					oMicroChart.getAggregation("lastYLabel").setProperty("color", aCriticality[1], true);
				} else if (oMicroChart instanceof ColumnMicroChart) {
					oMicroChart.getAggregation("leftTopLabel").setProperty("color", aCriticality[0], true);
					oMicroChart.getAggregation("rightTopLabel").setProperty("color", aCriticality[1], true);
				}
			});
		};

		/**
		 * Setting Labels for MicroCharts. The chart types that use label colors:
		 * 1. Area
		 * 2. Line
		 * 3. Column
		 * @param {Object} leftTop : The point to plot the minimum measure label.
		 * @param {Object} rightTop : The point to plot the maximum measure label.
		 * @param {Object} leftBottom : The point to plot the minimum dimension label.
		 * @param {Object} rightBottom : The point to plot the maximum dimension label.
		 * @private
		 */
		MicroChartContainer.prototype._setChartLabels = function(leftTop, rightTop, leftBottom, rightBottom) {
			var that = this,
				oMicroChart = that.getMicroChart();

			leftTop = that._formatDateAndNumberValue(leftTop, that.getMeasurePrecision(), that.getMeasureScale());
			rightTop = that._formatDateAndNumberValue(rightTop, that.getMeasurePrecision(), that.getMeasureScale());
			leftBottom = that._formatDateAndNumberValue(leftBottom, that.getDimensionPrecision());
			rightBottom = that._formatDateAndNumberValue(rightBottom, that.getDimensionPrecision());

			if (oMicroChart instanceof AreaMicroChart) {
				oMicroChart.getAggregation("firstYLabel").setProperty("label", leftTop, false);
				oMicroChart.getAggregation("lastYLabel").setProperty("label", rightTop, false);
				oMicroChart.getAggregation("firstXLabel").setProperty("label", leftBottom, false);
				oMicroChart.getAggregation("lastXLabel").setProperty("label", rightBottom, false);
			} else if (oMicroChart instanceof ColumnMicroChart) {
				oMicroChart.getAggregation("leftTopLabel").setProperty("label", leftTop, false);
				oMicroChart.getAggregation("rightTopLabel").setProperty("label", rightTop, false);
				oMicroChart.getAggregation("leftBottomLabel").setProperty("label", leftBottom, false);
				oMicroChart.getAggregation("rightBottomLabel").setProperty("label", rightBottom, false);
			} else if (oMicroChart instanceof LineMicroChart) {
				oMicroChart.setProperty("leftTopLabel", leftTop, false);
				oMicroChart.setProperty("rightTopLabel", rightTop, false);
				oMicroChart.setProperty("leftBottomLabel", leftBottom, false);
				oMicroChart.setProperty("rightBottomLabel", rightBottom, false);
			}
		};

		/**
		 * Getting criticality for the point
		 *
		 * @param {Object} oPoint : The point to calculate criticality for. Object is of the format:
		 * {
		 *      context: <context of the point>,
		 *      value:  <value of the label>,
		 *      index: <index of the dataPoint qualifier>
		 * }
		 * @return {String} Criticality to be plotted
		 * @private
		 */
		MicroChartContainer.prototype._getCriticalityFromPoint = function(oPoint) {
			var that = this,
				oReturn = Promise.resolve(ValueColor.Neutral),
				oMetaModel = that.getModel() && that.getModel().getMetaModel(),
				aDataPointQualifiers = that.getDataPointQualifiers(),
				sMetaPath =
					oMetaModel instanceof ODataMetaModel &&
					oPoint &&
					oPoint.context &&
					oPoint.context.getPath() &&
					oMetaModel.getMetaPath(oPoint.context.getPath());

			if (typeof sMetaPath === "string") {
				oReturn = oMetaModel
					.requestObject(
						sMetaPath +
							"/@com.sap.vocabularies.UI.v1.DataPoint" +
							(aDataPointQualifiers[oPoint.index] ? "#" + aDataPointQualifiers[oPoint.index] : "")
					)
					.then(function(oDataPoint) {
						var sCriticality = ValueColor.Neutral,
							oContext = oPoint.context;
						if (oDataPoint.Criticality) {
							sCriticality = that._criticality(oDataPoint.Criticality, oContext);
						} else if (oDataPoint.CriticalityCalculation) {
							var oCriticalityCalculation = oDataPoint.CriticalityCalculation,
								oCC = {},
								fnGetValue = function(oProperty) {
									var sReturn;
									if (oProperty.$Path) {
										sReturn = oContext.getObject(oProperty.$Path);
									} else if (oProperty.hasOwnProperty("$Decimal")) {
										sReturn = oProperty.$Decimal;
									}
									return sReturn;
								};
							oCC.sAcceptanceHigh = oCriticalityCalculation.AcceptanceRangeHighValue
								? fnGetValue(oCriticalityCalculation.AcceptanceRangeHighValue)
								: undefined;
							oCC.sAcceptanceLow = oCriticalityCalculation.AcceptanceRangeLowValue
								? fnGetValue(oCriticalityCalculation.AcceptanceRangeLowValue)
								: undefined;
							oCC.sDeviationHigh = oCriticalityCalculation.DeviationRangeHighValue
								? fnGetValue(oCriticalityCalculation.DeviationRangeHighValue)
								: undefined;
							oCC.sDeviationLow = oCriticalityCalculation.DeviationRangeLowValue
								? fnGetValue(oCriticalityCalculation.DeviationRangeLowValue)
								: undefined;
							oCC.sToleranceHigh = oCriticalityCalculation.ToleranceRangeHighValue
								? fnGetValue(oCriticalityCalculation.ToleranceRangeHighValue)
								: undefined;
							oCC.sToleranceLow = oCriticalityCalculation.ToleranceRangeLowValue
								? fnGetValue(oCriticalityCalculation.ToleranceRangeLowValue)
								: undefined;
							oCC.sImprovementDirection = oCriticalityCalculation.ImprovementDirection.$EnumMember;

							sCriticality = that._criticalityCalculation(
								oCC.sImprovementDirection,
								oPoint.value,
								oCC.sDeviationLow,
								oCC.sToleranceLow,
								oCC.sAcceptanceLow,
								oCC.sAcceptanceHigh,
								oCC.sToleranceHigh,
								oCC.sDeviationHigh
							);
						}
						return sCriticality;
					});
			}
			return oReturn;
		};

		/**
		 * Getting criticality for the point
		 *
		 * @param {Object} oCriticality : Object that contains the criticality as path or decimal.
		 * @param {Object} oContext : the context to getCriticality from.
		 * @return {String} Criticality to be plotted.
		 * @private
		 */
		MicroChartContainer.prototype._criticality = function(oCriticality, oContext) {
			var iCriticality,
				sCriticality = ValueColor.Neutral;
			if (oCriticality.$Path) {
				var sCriticalityPath = oCriticality.$Path;
				iCriticality = oContext.getObject(sCriticalityPath);
				if (iCriticality === "Negative" || iCriticality === "1" || iCriticality === 1) {
					sCriticality = ValueColor.Error;
				} else if (iCriticality === "Critical" || iCriticality === "2" || iCriticality === 2) {
					sCriticality = ValueColor.Critical;
				} else if (iCriticality === "Positive" || iCriticality === "3" || iCriticality === 3) {
					sCriticality = ValueColor.Good;
				}
			} else if (oCriticality.$EnumMember) {
				iCriticality = oCriticality.$EnumMember;
				if (iCriticality.indexOf("com.sap.vocabularies.UI.v1.CriticalityType/Negative") > -1) {
					sCriticality = ValueColor.Error;
				} else if (iCriticality.indexOf("com.sap.vocabularies.UI.v1.CriticalityType/Positive") > -1) {
					sCriticality = ValueColor.Good;
				} else if (iCriticality.indexOf("com.sap.vocabularies.UI.v1.CriticalityType/Critical") > -1) {
					sCriticality = ValueColor.Critical;
				}
			} else {
				Log.warning("Case not supported, returning the default Value Neutral");
			}
			return sCriticality;
		};

		/**
		 * Getting criticality calculation for the point
		 *
		 * @param {String} sImprovementDirection to be used for getting the criticality
		 * @param {String} sValue from Datapoint to be measured
		 * @param {String} sDeviationLow value for Lower Deviation level
		 * @param {String} sToleranceLow value for Lower Tolerance level
		 * @param {String} sAcceptanceLow value for Lower Acceptance level
		 * @param {String} sAcceptanceHigh value for Higher Acceptance level
		 * @param {String} sToleranceHigh value for Higher Tolerance level
		 * @param {String} sDeviationHigh value for Higher Deviation level
		 * @return {String} Criticality to be plotted.
		 * @private
		 */
		MicroChartContainer.prototype._criticalityCalculation = function(
			sImprovementDirection,
			sValue,
			sDeviationLow,
			sToleranceLow,
			sAcceptanceLow,
			sAcceptanceHigh,
			sToleranceHigh,
			sDeviationHigh
		) {
			var sCriticalityExpression = ValueColor.Neutral; // Default Criticality State

			// Dealing with Decimal and Path based bingdings
			sDeviationLow = sDeviationLow == undefined ? -Infinity : sDeviationLow;
			sToleranceLow = sToleranceLow == undefined ? sDeviationLow : sToleranceLow;
			sAcceptanceLow = sAcceptanceLow == undefined ? sToleranceLow : sAcceptanceLow;
			sDeviationHigh = sDeviationHigh == undefined ? Infinity : sDeviationHigh;
			sToleranceHigh = sToleranceHigh == undefined ? sDeviationHigh : sToleranceHigh;
			sAcceptanceHigh = sAcceptanceHigh == undefined ? sToleranceHigh : sAcceptanceHigh;

			// Creating runtime expression binding from criticality calculation for Criticality State
			if (sImprovementDirection.indexOf("Minimize") > -1) {
				if (sValue <= sAcceptanceHigh) {
					sCriticalityExpression = ValueColor.Good;
				} else if (sValue <= sToleranceHigh) {
					sCriticalityExpression = ValueColor.Neutral;
				} else if (sDeviationHigh && sValue <= sDeviationHigh) {
					sCriticalityExpression = ValueColor.Critical;
				} else {
					sCriticalityExpression = ValueColor.Error;
				}
			} else if (sImprovementDirection.indexOf("Maximize") > -1) {
				if (sValue >= sAcceptanceLow) {
					sCriticalityExpression = ValueColor.Good;
				} else if (sValue >= sToleranceLow) {
					sCriticalityExpression = ValueColor.Neutral;
				} else if (sDeviationHigh && sValue >= sDeviationLow) {
					sCriticalityExpression = ValueColor.Critical;
				} else {
					sCriticalityExpression = ValueColor.Error;
				}
			} else if (sImprovementDirection.indexOf("Target") > -1) {
				if (sValue <= sAcceptanceHigh && sValue >= sAcceptanceLow) {
					sCriticalityExpression = ValueColor.Good;
				} else if ((sValue >= sToleranceLow && sValue < sAcceptanceLow) || (sValue > sAcceptanceHigh && sValue <= sToleranceHigh)) {
					sCriticalityExpression = ValueColor.Neutral;
				} else if (
					(sDeviationLow && sValue >= sDeviationLow && sValue < sToleranceLow) ||
					(sValue > sToleranceHigh && sDeviationHigh && sValue <= sDeviationHigh)
				) {
					sCriticalityExpression = ValueColor.Critical;
				} else {
					sCriticalityExpression = ValueColor.Error;
				}
			} else {
				Log.warning("Case not supported, returning the default Value Neutral");
			}

			return sCriticalityExpression;
		};

		MicroChartContainer.prototype._formatDateAndNumberValue = function(value, iPrecision, iScale) {
			var that = this;
			if (value instanceof Date) {
				return that._getLabelDateFormatter().format(value);
			} else if (!isNaN(value)) {
				return that._getLabelNumberFormatter(iPrecision, iScale).format(value);
			} else {
				return value;
			}
		};

		MicroChartContainer.prototype._getLabelDateFormatter = function() {
			if (!MicroChartContainer._dateFormatter) {
				MicroChartContainer._dateFormatter = DateFormat.getInstance({
					style: "short"
				});
			}
			return MicroChartContainer._dateFormatter;
		};

		MicroChartContainer.prototype._getLabelNumberFormatter = function(iPrecision, iScale) {
			return NumberFormat.getInstance({
				style: "short",
				showScale: true,
				precision: typeof iPrecision === "number" ? iPrecision : null,
				decimals: typeof iScale === "number" ? iScale : null
			});
		};

		return MicroChartContainer;
	},
	/* bExport= */ true
);
