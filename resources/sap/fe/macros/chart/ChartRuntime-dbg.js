/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2017 SAP SE. All rights reserved
    
 */
sap.ui.define(
	["sap/ui/model/json/JSONModel", "sap/fe/macros/CommonHelper"],
	function(JSONModel, CommonHelper) {
		"use strict";
		/**
		 * Static class used by MDC Chart during runtime
		 *
		 * @private
		 * @experimental This module is only for internal/experimental use!
		 */
		var ChartRuntime = {
			/**
			 * Updates the chart after selection or deselection of datapoints
			 * @function
			 * @static
			 * @name sap.fe.macros.chart.ChartRuntime.fnUpdateChart
			 * @memberof sap.fe.macros.chart.ChartRuntime
			 * @param {object} oEvent Event triggered after selection or deselection of datapoints on chart
			 * @param {object} oChart Object containing the Chart instance
			 * @sap-restricted
			 **/
			fnUpdateChart: function(oEvent, oChart) {
				var oInnerChart = oChart || oEvent.getSource(),
					oMdcChart = oInnerChart.getParent(),
					sSelectedContextModelName,
					oActionOperationAvailableMap,
					sActionsMultiselectDisabled,
					aActionsMultiselectDisabled;
				// changing drill stack changes order of custom data, looping through all
				oMdcChart.getCustomData().forEach(function(oCustomData) {
					if (oCustomData.getKey() === "selectedContextsModel") {
						sSelectedContextModelName = oCustomData.getValue();
					} else if (oCustomData.getKey() === "operationAvailableMap") {
						oActionOperationAvailableMap = JSON.parse(oCustomData.getValue());
					} else if (oCustomData.getKey() === "multiSelectDisabledActions") {
						sActionsMultiselectDisabled = oCustomData.getValue();
						aActionsMultiselectDisabled = sActionsMultiselectDisabled ? sActionsMultiselectDisabled.split(",") : [];
					}
				});
				if (sSelectedContextModelName) {
					var oContextModel = oMdcChart.getModel(sSelectedContextModelName);
					var sContextCollectionName =
						"/$contexts/" + oMdcChart.getId().substr(oMdcChart.getId().indexOf("fe::chart"), oMdcChart.getId().length);
					oContextModel.setProperty("/$contexts", {});
					var aSelectedContexts = [];
					var oModelObject;
					var aSelectedDataPoints = oInnerChart.getSelectedDataPoints().dataPoints;
					for (var i = 0; i < aSelectedDataPoints.length; i++) {
						aSelectedContexts.push(aSelectedDataPoints[i].context);
					}
					oContextModel.setProperty(sContextCollectionName, {
						selectedContexts: aSelectedContexts,
						numberOfSelectedContexts: oInnerChart.getSelectedDataPoints().count
					});
					for (var j = 0; j < aSelectedContexts.length; j++) {
						var oSelectedContext = aSelectedContexts[j];
						var oContextData = oSelectedContext.getObject();
						for (var key in oContextData) {
							if (key.indexOf("#") === 0) {
								var sActionPath = key;
								sActionPath = sActionPath.substring(1, sActionPath.length);
								oModelObject = oContextModel.getProperty(sContextCollectionName);
								oModelObject[sActionPath] = true;
								oContextModel.setProperty(sContextCollectionName, oModelObject);
							}
						}
						oModelObject = oContextModel.getProperty(sContextCollectionName);
					}
					this.setActionEnablement(oContextModel, oActionOperationAvailableMap, sContextCollectionName, aSelectedContexts);

					if (aSelectedContexts.length > 1) {
						this.disableAction(oContextModel, aActionsMultiselectDisabled, sContextCollectionName);
					}
				}
			},
			/**
			 * sets the action enablement
			 * @function
			 * @static
			 * @name sap.fe.macros.chart.ChartRuntime.setActionEnablement
			 * @memberof sap.fe.macros.chart.ChartRuntime
			 * @param {object} oContextModel Object containing the context model
			 * @param {object} oActionOperationAvailableMap Map containing the operation availability of actions
			 * @param {string} sContextCollectionName String containing name of the chart on which the action enablement needs to be set
			 * @param {array} aSelectedContexts Array containing selected contexts of the chart
			 * @sap-restricted
			 **/
			setActionEnablement: function(oContextModel, oActionOperationAvailableMap, sContextCollectionName, aSelectedContexts) {
				for (var sAction in oActionOperationAvailableMap) {
					oContextModel.setProperty(sContextCollectionName + "/" + sAction, false);
					var sProperty = oActionOperationAvailableMap[sAction];
					for (var i = 0; i < aSelectedContexts.length; i++) {
						var oSelectedContext = aSelectedContexts[i];
						var oContextData = oSelectedContext.getObject();
						if (sProperty === null && !!oContextData["#" + sAction]) {
							//look for action advertisement if present and its value is not null
							oContextModel.setProperty(sContextCollectionName + "/" + sAction, true);
							break;
						} else if (!!oSelectedContext.getObject(sProperty)) {
							oContextModel.setProperty(sContextCollectionName + "/" + sAction, true);
							break;
						}
					}
				}
			},
			/**
			 * disables the action on the chart based on the multiselection
			 * @function
			 * @static
			 * @name sap.fe.macros.chart.ChartRuntime.disableAction
			 * @memberof sap.fe.macros.chart.ChartRuntime
			 * @param {object} oContextModel Object containing the context model
			 * @param {array} aActionsMultiselectDisabled Array containing actions
			 * @param {string} sContextCollectionName String containing name of the chart on which the action enablement needs to be set
			 * @sap-restricted
			 **/
			disableAction: function(oContextModel, aActionsMultiselectDisabled, sContextCollectionName) {
				aActionsMultiselectDisabled.forEach(function(sAction) {
					oContextModel.setProperty(sContextCollectionName + "/" + sAction, false);
				});
			}
		};
		return ChartRuntime;
	},
	/* bExport= */
	true
);
