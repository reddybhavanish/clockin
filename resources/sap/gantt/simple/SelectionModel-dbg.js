/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

		(c) Copyright 2009-2015 SAP SE. All rights reserved
	
 */

// Provides class sap.gantt.ShapeSelectionModel
sap.ui.define([
	"sap/gantt/library",
	"sap/ui/base/EventProvider"
], function (library, EventProvider) {
	"use strict";

	var SelectionMode = library.SelectionMode;

	/**
	 * Constructs an instance of a sap.gantt.simple.SelectionModel.
	 *
	 * @class
	 * @extends sap.ui.base.EventProvider
	 *
	 * @author SAP SE
	 * @version {version}
	 *
	 * @param {sap.gantt.SelectionMode} [sSelectionMode=Single]
	 *
	 * @constructor
	 * @private
	 * @alias SelectionModel
	 */
	var SelectionModel = EventProvider.extend("sap.gantt.simple.SelectionModel", /** @lends sap.gantt.ShapeSelectionModel.prototype */ {

		constructor: function (sSelectionMode) {
			EventProvider.apply(this, arguments);

			this.sSelectionMode = sSelectionMode || SelectionMode.Single;

			this.mSelected = {
				"uid": {}
			};
		}
	});

	SelectionModel.prototype.getSelectionMode = function() {
		return this.sSelectionMode;
	};

	SelectionModel.prototype.setSelectionMode = function(sSelectionMode) {
		this.sSelectionMode = sSelectionMode || SelectionMode.Single;
		return this;
	};

	SelectionModel.prototype.updateShape = function (sUid, mParam) {
		var sShapeSelectionMode = this.getSelectionMode();
		if (sShapeSelectionMode === "None") { return; }

		// 1. If sUid is not present, means user clicked on an empty area in the Gantt Chart
		if (!sUid) {
			if (sShapeSelectionMode === SelectionMode.Single ||
				sShapeSelectionMode === SelectionMode.Multiple ||
				sShapeSelectionMode === SelectionMode.MultiWithKeyboard && !mParam.ctrl) {
				// clear all selection and fire selection changed event on following cases
				// 1. Single selection
				// 2. MultiWithKeyboard but w/o ctrl/meta key
				// 3. Multiple
				this.clear(false);
			}
			return; // stop right here
		}

		// 2. Continue process if user clicked on an actual shape
		if (mParam.selected && !this.mSelected.uid[sUid]) {
			// Shall mark as selected but the UID haven't been stored
			var aDeselected = Object.keys(this.mSelected.uid);
			if (this.sSelectionMode === SelectionMode.Single) {
				this.mSelected.uid = {};
			} else if (this.sSelectionMode === SelectionMode.MultiWithKeyboard) {
				// ctrl or meta key has to pressed
				if (mParam.ctrl) {
					aDeselected = [];
				} else {
					this.mSelected.uid = {};
				}
			} else if (this.sSelectionMode === SelectionMode.Multiple) {
				aDeselected = [];
			}
			this._updateSelectedShape(sUid, mParam);
			this._fireSelectionChanged(aDeselected);
		} else if (!mParam.selected && this.mSelected.uid[sUid]) {
			// click on the same shape to mark it as deselected
			delete this.mSelected.uid[sUid];
			this._fireSelectionChanged([sUid]);
		}
	};

	SelectionModel.prototype.updateShapes = function (mShape) {
		if (!mShape) {
			return;
		}

		var aDeselectedShapeUids = [];
		var aKeys = Object.keys(mShape);

		for (var i = 0; i < aKeys.length; i++) {
			var sUid = aKeys[i];
			var mParam = mShape[aKeys[i]];

			if (mParam.selected && !this.mSelected.uid[sUid]) {
				this._updateSelectedShape(sUid, mParam);
			} else if (!mParam.selected && this.mSelected.uid[sUid]) {
				delete this.mSelected.uid[sUid];
				aDeselectedShapeUids.push(sUid);
			}
		}

		this._fireSelectionChanged(aDeselectedShapeUids);
	};

	SelectionModel.prototype.updateProperties = function (sUid, mParam) {
		if (this.mSelected.uid[sUid]) {
			this.mSelected.uid[sUid].draggable = mParam.draggable;
			this.mSelected.uid[sUid].time = mParam.time;
			this.mSelected.uid[sUid].endTime = mParam.endTime;
		}
	};

	SelectionModel.prototype._updateSelectedShape = function (sUid, mParam) {
		this.mSelected.uid[sUid] = {
			shapeUid  : sUid,
			draggable : mParam.draggable,
			time      : mParam.time,
			endTime   : mParam.endTime
		};
	};

	SelectionModel.prototype._fireSelectionChanged = function (aDeselectedUid, bSilent) {
		var mParams = {
			shapeUid: Object.keys(this.mSelected.uid),
			deselectedUid: aDeselectedUid,
			silent: !!bSilent
		};

		if (mParams.shapeUid.length > 0 || mParams.deselectedUid.length > 0) {
			this.fireSelectionChanged( mParams );
		}
	};

	SelectionModel.prototype.existed = function (sUid) {
		return !!this.mSelected.uid[sUid];
	};

	/**
	 * Clears selected uids, but doesn't fire selectionChanged event to the Gantt chart.
	 *
	 * @param {boolean} bFireChangeEvent if true, the shapeSelectionChange event will be fired.
	 * @return {boolean} true if the shape selection has changed.
	 */
	SelectionModel.prototype.clear = function (bFireChangeEvent) {
		if (this.mSelected.uid.length === 0) {
			return false;
		}

		var aUid = this.allUid();
		this.mSelected.uid = {};
		this._fireSelectionChanged(aUid, bFireChangeEvent);
		return true;
	};

	SelectionModel.prototype.allUid = function() {
		return Object.keys(this.mSelected.uid);
	};

	// number of selected and draggable shapes
	SelectionModel.prototype.numberOfSelectedDraggableShapes = function() {
		return this.allSelectedDraggableUid().length;
	};

	SelectionModel.prototype.allSelectedDraggableUid = function() {
		return Object.keys(this.mSelected.uid).filter(function (sUid) {
			return this.mSelected.uid[sUid].draggable;
		}.bind(this));
	};

	SelectionModel.prototype.getSelectedShapeDataByUid = function(sUid) {
		return this.mSelected.uid[sUid];
	};

	SelectionModel.prototype.attachSelectionChanged = function(oData, fnFunction, oListener) {
		this.attachEvent("selectionChanged", oData, fnFunction, oListener);
	};

	SelectionModel.prototype.detachSelectionChanged = function(fnFunction, oListener) {
		this.detachEvent("selectionChanged", fnFunction, oListener);
	};

	SelectionModel.prototype.fireSelectionChanged = function(mArguments) {
		this.fireEvent("selectionChanged", mArguments);
		return this;
	};

	return SelectionModel;

}, true /**bExport*/);
