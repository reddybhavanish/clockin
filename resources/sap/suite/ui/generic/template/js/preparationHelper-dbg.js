sap.ui.define(["sap/base/util/deepExtend"], function(deepExtend) {
	"use strict";

	function fnGetNormalizedTableSettings(oMetaModel, oOriginalSettings, Device, sEntitySet){
		var oSettings = deepExtend({}, oOriginalSettings);
		// 1. map boolean settings gridTable and treeTable to tableType
		oSettings.tableType = oSettings.tableType || (oSettings.gridTable ? "GridTable" : undefined);
		oSettings.tableType = oSettings.tableType || (oSettings.treeTable ? "TreeTable" : undefined);

		// 2. map flat settings to structured ones
		oSettings.tableSettings = oSettings.tableSettings || {};
		oSettings.tableSettings.type = oSettings.tableSettings.type || oSettings.tableType;
		oSettings.tableSettings.multiSelect = (oSettings.tableSettings.multiSelect === undefined ? oSettings.multiSelect : oSettings.tableSettings.multiSelect);

		// 3. set defaults, as suggested in Component.js
		oSettings.tableSettings.selectAll = (oSettings.tableSettings.selectAll === undefined ? false : oSettings.tableSettings.selectAll);
		oSettings.tableSettings.inlineDelete = !!oSettings.tableSettings.inlineDelete;
		oSettings.tableSettings.multiSelect = !!oSettings.tableSettings.multiSelect;
		oSettings.tableSettings.selectionLimit = oSettings.tableSettings.selectionLimit || 200;

		// 4. determine type
		if (Device.system.phone) {
			oSettings.tableSettings.type = "ResponsiveTable";
		} else if (sEntitySet){
			var oEntitySet = oMetaModel.getODataEntitySet(sEntitySet);
			var oEntityType = oMetaModel.getODataEntityType(oEntitySet.entityType);
			oSettings.tableSettings.type = oSettings.tableSettings.type || (oEntityType["sap:semantics"] === "aggregate" ? "AnalyticalTable" : "ResponsiveTable");
			if (oSettings.tableSettings.type === "AnalyticalTable" && !(oEntityType["sap:semantics"] === "aggregate")){
				oSettings.tableSettings.type = "GridTable";
			}
		}

		// check for invalid combinations
		if (oSettings.tableSettings.multiSelect && oSettings.tableSettings.inlineDelete) {
			throw new Error("Both inlineDelete and multiSelect options for table are not possible");
		}

		if (oSettings.tableSettings.type !== "ResponsiveTable" && oSettings.tableSettings.inlineDelete) {
			throw new Error("InlineDelete property is not supported for " + oSettings.tableSettings.type + " type table");
		}

		// 5. remove deprecated settings (to avoid new code to rely on them)
		delete oSettings.gridTable;
		delete oSettings.treeTable;
		delete oSettings.tableType;
		delete oSettings.multiSelect;
		return oSettings.tableSettings;
	}

	return {		
		getNormalizedTableSettigs: fnGetNormalizedTableSettings
	};
});
