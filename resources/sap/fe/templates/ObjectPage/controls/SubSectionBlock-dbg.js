/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2020 SAP SE. All rights reserved
    
 */

sap.ui.define(["sap/uxap/BlockBase"], function(BlockBase) {
	"use strict";

	var SubSectionBlock = BlockBase.extend("sap.fe.templates.ObjectPage.controls.SubSectionBlock", {
		metadata: {
			properties: {
				"columnLayout": { type: "sap.uxap.BlockBaseColumnLayout", group: "Behavior", defaultValue: 4 }
			},
			aggregations: {
				content: {
					type: "sap.ui.core.Control",
					multiple: false
				}
			}
		}
	});

	SubSectionBlock.prototype._applyFormAdjustment = function() {
		var sFormAdjustment = this.getFormAdjustment(),
			oView = this._getSelectedViewContent(),
			oParent = this._oParentObjectPageSubSection,
			oFormAdjustmentFields;

		if (sFormAdjustment !== sap.uxap.BlockBaseFormAdjustment.None && oView && oParent) {
			oFormAdjustmentFields = this._computeFormAdjustmentFields(sFormAdjustment, oParent._oLayoutConfig);

			this._adjustForm(oView, oFormAdjustmentFields);
		}
	};

	SubSectionBlock.prototype.setMode = function(sMode) {
		this.setProperty("mode", sMode);
		// OPTIONAL: this.internalModel.setProperty("/mode", sMode);
	};

	/// View is already connected to the UI5 model tree, hence no extra logic required here
	SubSectionBlock.prototype.connectToModels = function() {};

	/// SubSectionBlock use aggregation instead of a view, i.e. return that as the view content
	SubSectionBlock.prototype._getSelectedViewContent = function() {
		var oContent = this.getAggregation("content");
		return oContent;
	};

	return SubSectionBlock;
});
