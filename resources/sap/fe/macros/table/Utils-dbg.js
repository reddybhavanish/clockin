/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2017 SAP SE. All rights reserved
    
 */

sap.ui.define(["sap/ui/model/Filter", "sap/ui/core/format/NumberFormat"], function(Filter, NumberFormat) {
	"use strict";

	function getFiltersInfoforSV(oTable, sSvKey) {
		var sEntitySetPath = oTable.data("targetCollectionName"),
			oSelectionVariant = oTable
				.getModel()
				.getMetaModel()
				.getObject(sEntitySetPath + "/@" + sSvKey),
			aFitlers = [];

		for (var i in oSelectionVariant.SelectOptions) {
			var oSelectOption = oSelectionVariant.SelectOptions[i];
			if (oSelectOption && oSelectOption.PropertyName) {
				var sPath = oSelectOption.PropertyName.$PropertyPath;
				for (var j in oSelectOption.Ranges) {
					var oRange = oSelectOption.Ranges[j];
					aFitlers.push(new Filter(sPath, oRange.Option.$EnumMember.split("/").pop(), oRange.Low, oRange.High));
				}
			}
		}
		return {
			filters: aFitlers,
			text: oSelectionVariant.Text
		};
	}

	function initializeQuickFilterKey(oTable) {
		var oSvControl = oTable.getQuickFilter();
		if (oSvControl) {
			var oSvItems = oSvControl.getItems();
			if (oSvItems.length > 0) {
				var sKey = oSvItems[0].getKey();
				oSvControl.setSelectedKey(sKey);
				oTable.data("quickFilterKey", sKey);
			}
		}
	}

	function handleQuickFilterCounts(oTable, oPageBinding) {
		var sSelectedSVKey = oTable.data("quickFilterKey"),
			oBindingInfo = oTable.getRowsBindingInfo();

		if (sSelectedSVKey) {
			var oSvControl = oTable.getQuickFilter();

			//Needs to create a bindList for each Selection Variant if "counts" is requested
			if (oSvControl.data("showCounts") === "true") {
				var oDataModel = oTable.getModel(),
					oSvItems = oSvControl.getItems(),
					oOtherTableFilters,
					aBindingPromises = [],
					aInitialItemTexts = [],
					sFilterId = oTable.getFilter(),
					oFilterBar = sFilterId ? sap.ui.getCore().byId(sFilterId) : undefined;

				// Need to remove Filter if no filterBar
				// Hack to get FitlerInfo during Page initialisation  > Filters are not into oBindingInfo since bindRows has not been executed
				if (oFilterBar && typeof oFilterBar.getFilters === "function") {
					var oFilters = oFilterBar.getFilters();
					oOtherTableFilters = oFilters ? [oFilters] : [];
				} else {
					oOtherTableFilters = [];
				}

				for (var k in oSvItems) {
					var sItemKey = oSvItems[k].getKey(),
						oListBinding,
						oTableSvFilter,
						oFilterInfos = getFiltersInfoforSV(oTable, sItemKey),
						aFilters = oOtherTableFilters.concat(oFilterInfos.filters);
					aInitialItemTexts.push(oFilterInfos.text);
					oTableSvFilter = new Filter({
						filters: aFilters,
						and: true
					});

					oListBinding = oDataModel.bindList(
						(oPageBinding ? oPageBinding.getPath() + "/" : "") + oBindingInfo.path,
						oTable.getBindingContext(),
						null,
						oTableSvFilter,
						{
							$count: true,
							$$groupId: oSvControl.data("batchGroupId") || ""
						}
					);
					aBindingPromises.push(oListBinding.requestContexts(0, 1));
				}

				Promise.all(aBindingPromises).then(function(aContexts) {
					var oCountFormatter = NumberFormat.getIntegerInstance({ groupingEnabled: true });
					for (var k in aContexts) {
						var iCount = aContexts[k] && aContexts[k].length ? aContexts[k][0].getBinding().getLength() : 0;
						oSvItems[k].setText(aInitialItemTexts[k] + " (" + oCountFormatter.format(iCount) + ")");
					}
				});
			}
		}
	}

	var oTableUtils = {
		initializeQuickFilterKey: initializeQuickFilterKey,
		getFiltersInfoforSV: getFiltersInfoforSV,
		handleQuickFilterCounts: handleQuickFilterCounts
	};

	return oTableUtils;
});
