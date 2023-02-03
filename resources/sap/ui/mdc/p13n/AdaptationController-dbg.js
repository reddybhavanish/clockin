/*
 * ! SAPUI5

		(c) Copyright 2009-2020 SAP SE. All rights reserved
	
 */

sap.ui.define([
	"sap/ui/base/ManagedObject", "sap/ui/mdc/p13n/FlexUtil", "sap/ui/fl/apply/api/FlexRuntimeInfoAPI", "sap/ui/mdc/condition/ConditionModel", "sap/base/util/merge", "sap/m/Button", "sap/base/Log"
], function (ManagedObject, FlexUtil, FlexRuntimeInfoAPI, ConditionModel, merge, Button, Log) {
	"use strict";

	var oResourceBundle = sap.ui.getCore().getLibraryResourceBundle("sap.ui.mdc");
	var AdaptationController = ManagedObject.extend("sap.ui.mdc.AdaptationController", {
		library: "sap.ui.mdc",
		metadata: {
			properties: {
				/**
				 * Control on which adaptation changes are going to be applied on
				 */
				adaptationControl: {
					type: "object"
				},
				/**
				 * Indicates whether a popover or modal dialog is going to be displayed
				 */
				liveMode: {
					type: "boolean",
					defaultValue: true
				},
				/**
				 * Control specific information which is being used to define the UI elements and specify additional information
				 */
				itemConfig: {
					type: "object"
				},
				/**
				 * Control specific information which is being used to define the UI elements and specify additional information
				 */
				sortConfig: {
					type: "object",
					defaultValue: {
						addOperation: "addSort",
						removeOperation: "removeSort",
						moveOperation: "moveSort",
						panelPath: "sap/ui/mdc/p13n/panels/SortPanel",
						title: oResourceBundle.getText("sort.PERSONALIZATION_DIALOG_TITLE")
					}
				},
				/**
				 * Callback which should be used to return the corresponding dataProperty/key of the item
				 */
				stateRetriever: {
					type: "function"
				},
				/**
				 * Callback which can be used to return a Promise which should resolve with
				 * the PropertyInfo in case the default "fetchProperties" is not sufficient
				 */
				retrievePropertyInfo: {
					type: "function"
				},
				/**
				 * Callback which will be executed after the changes have been created with an array of all calculated UI changes
				 */
				afterChangesCreated: {
					type: "function"
				}
			},
			events: {
				/**
				 * This event is being fired before the p13n container has been opened, this can be used to customize the p13n container
				 */
				beforeP13nContainerOpens: {
					container: {
						type: "object"
					}
				},
				/**
				 * This event is being fired after the p13n container has been closed, this can be used to implement custom logic after p13n
				 */
				afterP13nContainerCloses: {
					reason: {
						type: "string"
					}
				}
			}
		}
	});

	AdaptationController.prototype.init = function(){
		//initialize housekeeping
		this.oAdaptationModel = new ConditionModel();
		this.oAdaptationModel.setSizeLimit(10000);
		this.oState = {};
		this.bIsDialogOpen = false;
	};

	/************************************************ Public Methods *************************************************/

	/**
	 * @public
	 * @param {object} oSource Control which is being used as reference for the popover
	 * @param {string} sP13nType String which describes which config should be used,
	 * currently available options are: "Item" and "Sort"
	 * @returns {Promise} returns a Promise resolving in the P13nContainer
	 *
	 */
	AdaptationController.prototype.showP13n = function(oSource, sP13nType) {
		if (!this.bIsDialogOpen){
			return new Promise(function(resolve, reject){
				this._setP13nTypeSpecificInfo(sP13nType);
				this._retrievePropertyInfo().then(function(aPropertyInfo){
					var oP13nData = this._prepareAdaptationData(aPropertyInfo);
					this._setP13nModelData(oP13nData);
					this._createP13nControl(this.sTitle).then(function(oP13nControl){
						var oPanel = oP13nControl.getContent()[0];
						oPanel.setP13nModel(this.oAdaptationModel);
						this.getAdaptationControl().addDependent(oP13nControl);
						this._openP13nControl(oP13nControl, oSource);
						resolve(oP13nControl);
					}.bind(this));
				}.bind(this));
			}.bind(this));
		}
	};

	/**
	 * @public
	 * @param {array} aNewSorters array containing the information aobut the sorters
	 * which should be used to create set of delta based changes
	 *
	 * aNewSorters = [
	 * 		{name: "Country", descending: true},
	 * 		{name: "Category", descending: false}
	 * ]
	 *
	 * @returns {array} In case no callback is provided, this function will return the set of changes
	 *
	 */
	AdaptationController.prototype.createSortChanges = function(aNewSorters){
		return this._executeAfterAsyncActions(function(){
			var oAdaptationControl = this.getAdaptationControl();
			var oCurrentState = merge({},this.getStateRetriever().call(this.getAdaptationControl(), this.oAdaptationControlDelegate));
			var aPreviousSorters = oCurrentState.sorters;

			var oSortConfig = this.getSortConfig();
			var fnSymbol = function(o){
				return o.name + o.descending;
			};

			var aSortChanges = FlexUtil.getArrayDeltaChanges(aPreviousSorters, aNewSorters, fnSymbol, oAdaptationControl, oSortConfig.removeOperation, oSortConfig.addOperation, oSortConfig.moveOperation);
			if (this.getAfterChangesCreated()){
				this.getAfterChangesCreated()(this, aSortChanges);
			}
			return aSortChanges;
		}.bind(this));
	};

	/**
	/**
	 * @public
	 * @param {array} aNewItems array containing the information aobut the sorters
	 * which should be used to create set of delta based changes
	 *
	 * aNewItems = [
	 * 		{name: "Country", position: 0},
	 * 		{name: "Category", position: 1},
	 * 		{name: "Region", position: -1}
	 * ]
	 *
	 * @returns {array} In case no callback is provided, this function will return the set of changes
	 *
	 */
	AdaptationController.prototype.createItemChanges = function(aNewItems){
		return this._executeAfterAsyncActions(function(){
			//create clones as the original might be modified for delta calculation
			var aNewItemState = merge([], aNewItems);
			var oCurrentState = merge({}, this.getStateRetriever().call(this.getAdaptationControl(), this.oAdaptationControlDelegate));
			var aPreviousItems = oCurrentState.items;

			var oItemConfig = this.getItemConfig();
			var fnSymbol = function (o) {
				return o.name;
			};

			var mExistingItems = aPreviousItems.reduce(function (mMap, oItem, iIndex) {
				mMap[oItem.name] = oItem;
				mMap[oItem.name].position = iIndex;
				return mMap;
			}, {});

			var aNewItemsPrepared = merge([], aPreviousItems);
			aNewItemState.forEach(function (oItem, iIndex) {
				var oExistingItem = mExistingItems[oItem.name];
				if (!oItem.hasOwnProperty("visible") || oItem.visible) {
					var iNewPosition = oItem.position;
					if (oExistingItem){//move if it exists
						// do not reorder it in case it exists and no position is provided
						iNewPosition = iNewPosition > -1  ? iNewPosition : oExistingItem.position;
						var iOldPosition = oExistingItem.position;
						aNewItemsPrepared.splice(iNewPosition, 0, aNewItemsPrepared.splice(iOldPosition, 1)[0]);
					} else {//add if it does not exist the item will be inserted at the end
						iNewPosition = iNewPosition > -1 ? iNewPosition : aNewItemsPrepared.length;
						aNewItemsPrepared.splice(iNewPosition, 0, oItem);
					}
				} else if (oExistingItem) {//check if exists before delete
					aNewItemsPrepared[oExistingItem.position].visible = false;
				}
			});

			var fFilter = function (oItem) {
				return oItem.hasOwnProperty("visible") && oItem.visible === false ? false : true;
			};

			aNewItemsPrepared = aNewItemsPrepared.filter(fFilter);

			var aItemChanges = FlexUtil.getArrayDeltaChanges(aPreviousItems, aNewItemsPrepared, fnSymbol, this.getAdaptationControl(), oItemConfig.removeOperation, oItemConfig.addOperation, oItemConfig.moveOperation);
			if (this.getAfterChangesCreated()) {
				this.getAfterChangesCreated()(this, aItemChanges);
			}
			return aItemChanges;
		}.bind(this));
	};

	/**
	 * @public
	 * @param {map} mNewConditionState array containing the information aobut the sorters
	 * which should be used to create set of delta based changes
	 *
	 * mNewConditionState = {
	 * 		"Category": [
	 * 			{
	 * 				"operator": EQ,
	 * 				"values": [
	 * 					"Books"
	 * 				]
	 * 			}
	 * 		]
	 * }
	 *
	 * @returns {array} In case no callback is provided, this function will return the set of changes
	 *
	 */
	AdaptationController.prototype.createConditionChanges = function(mNewConditionState) {
		return this._executeAfterAsyncActions(function(){
			var aConditionChanges = [];
			var oCurrentState = merge({}, this.getStateRetriever().call(this.getAdaptationControl(), this.oAdaptationControlDelegate));
			var mPreviousConditionState = oCurrentState.filter;
			var oAdaptationControl = this.getAdaptationControl();
			for (var sFieldPath in mNewConditionState) {
				var bValidProperty = this._hasProperty(sFieldPath);
				if (!bValidProperty) {
					Log.warning("property '" + sFieldPath + "' not supported");
					continue;
				}
				aConditionChanges = aConditionChanges.concat(FlexUtil.getConditionDeltaChanges(sFieldPath, mNewConditionState[sFieldPath], mPreviousConditionState[sFieldPath], oAdaptationControl));
			}
			if (this.getAfterChangesCreated()){
				this.getAfterChangesCreated()(this, aConditionChanges);
			}
			return aConditionChanges;
		}.bind(this));
	};

	/************************************************ Async loading *************************************************/

	AdaptationController.prototype._retrievePropertyInfo = function(){

		//!TODO!: once every control is deriving from 'sap.ui.mdc.Control' we should check for mdc control

		//by default the "fetchProperties" call is being used to retrieve the property
		return new Promise(function(resolve,reject){

			//in case properties have already been fetched, return them
			if (this.aPropertyInfo) {
				resolve(this.aPropertyInfo);
			} else if (this.getRetrievePropertyInfo()){ //in case callback is provided, use it
					this.aPropertyInfo = this.getRetrievePropertyInfo().call(this.getAdaptationControl());
					resolve(this.aPropertyInfo);
			}else {// in case no properties are fetched or callback is provided, use general "fetchProperties"
				sap.ui.require([
					this.getAdaptationControl().getDelegate().name
				], function (oDelegate) {
					this.oAdaptationControlDelegate = oDelegate;
					oDelegate.fetchProperties(this.getAdaptationControl()).then(function (aPropertyInfo) {
						this.aPropertyInfo = aPropertyInfo;
						resolve(this.aPropertyInfo);
					}.bind(this));
				}.bind(this));
			}
		}.bind(this));
	};

	AdaptationController.prototype._executeAfterAsyncActions = function(fnCreate) {
		return new Promise(function (resolve, reject) {
			this._retrievePropertyInfo().then(function (aPropertyInfo) {
				resolve(fnCreate());
			});
		}.bind(this));
	};

	/************************************************ P13n related *************************************************/

	AdaptationController.prototype._setP13nTypeSpecificInfo = function(sP13nType) {
		this.sP13nType = sP13nType;
		this.sAddOperation = this["get" + sP13nType + "Config"]().addOperation;
		this.sRemoveOperation = this["get" + sP13nType + "Config"]().removeOperation;
		this.sMoveOperation = this["get" + sP13nType + "Config"]().moveOperation;
		this.sPanelPath = this["get" + sP13nType + "Config"]().panelPath;
		this.sTitle = this["get" + sP13nType + "Config"]().title;
	};

	AdaptationController.prototype._openP13nControl = function(oP13nControl, oSource){
		this.fireBeforeP13nContainerOpens({
			container: oP13nControl
		});
		if (this.getLiveMode()) {
			oP13nControl.openBy(oSource);
		} else {
			oP13nControl.open();
		}
		this.bIsDialogOpen = true;
	};

	AdaptationController.prototype._prepareAdaptationData = function(aPropertyInfo){

		var aItems = [];
		var oAdaptationControl = this.getAdaptationControl();
		var oControlState = merge({}, this.getStateRetriever().call(oAdaptationControl, this.oAdaptationControlDelegate, aPropertyInfo));

		var aItemState = oControlState.items || [];
		var aSortState = oControlState.sorters || [];

		var fnArrayToMap = function(aArray) {
			return aArray.reduce(function(mMap, oProp, iIndex){
				mMap[oProp.name] = oProp;
				mMap[oProp.name].position = iIndex;
				return mMap;
			}, {});
		};

		var mExistingProperties = fnArrayToMap(aItemState);
		var mExistingSorters = fnArrayToMap(aSortState);
		var mExistingFilters = oControlState.filter || {};

		aPropertyInfo.forEach(function (oProperty) {
			var mItem = {};

			var sKey = oProperty.path || oProperty.name;
			var oExistingProperty = mExistingProperties[sKey];

			//add general information
			mItem.selected = oExistingProperty ? true : false;
			mItem.position = oExistingProperty ? oExistingProperty.position : -1;
			mItem = merge(mItem, oProperty, oExistingProperty);
			mItem.label = oProperty.label || oProperty.name;
			mItem.name = oProperty.path ? oProperty.path : oProperty.name;//consider to rename this to 'key'

			//add binding relevant info
			if (this.sP13nType == "Sort") {
				mItem.isSorted = mExistingSorters[sKey] ? true : false;
				mItem.sortPosition = mExistingSorters[sKey] ? mExistingSorters[sKey].position : -1;
				mItem.descending = mExistingSorters[sKey] ? mExistingSorters[sKey].descending : false;
			}
			mItem.isFiltered = mExistingFilters[sKey] && mExistingFilters[sKey].length > 0 ? true : false;

			var bInclude = this._checkRestrictions(mItem);

			if (bInclude){
				aItems.push(mItem);
			}

		}.bind(this));


		return {
			items: aItems,
			filter: mExistingFilters
		};
	};

	AdaptationController.prototype._setP13nModelData = function(oP13nData){
		this._sortP13nData(oP13nData);
		this.oAdaptationModel.setProperty("/items",oP13nData.items);
		this.oAdaptationModel.setConditions(oP13nData.filter);
		//condition model will keep the conditions up to date itself
		this.oState = merge({}, oP13nData);
	};

	AdaptationController.prototype._createP13nControl = function (sTitle) {
		return new Promise(function (resolve, reject) {

			var bLiveMode = this.getLiveMode();

			// Load either sap.m.Dialog or sap.m.ResponsivePopover, depending on the setting
			sap.ui.require(bLiveMode ? [
				'sap/m/ResponsivePopover', this.sPanelPath
			] : [
				'sap/m/Dialog', this.sPanelPath
				], function (Container, Panel) {

					var oPanel = new Panel();

					oPanel.attachEvent("change", function(){
						if (bLiveMode){
							this._handleChange();
						}
					}.bind(this));

					var oDialog = this._createP13nContainer(Container, oPanel, sTitle);

					resolve(oDialog);
				}.bind(this));
		}.bind(this));
	};

	AdaptationController.prototype._createP13nContainer = function (Container, oPanel, sTitle) {

		var oContainer;

		if (this.getLiveMode()) {
			oContainer = this._createPopover(Container, oPanel, sTitle);
		} else {
			oContainer = this._createModalDialog(Container, oPanel, sTitle);
		}

		// Add custom style class in order to display marked items accordingly
		oContainer.addStyleClass("sapUiMdcPersonalizationDialog");
		// Set compact style class if the table is compact too
		oContainer.toggleStyleClass("sapUiSizeCompact", !!jQuery(this.getAdaptationControl()).closest(".sapUiSizeCompact").length);
		return oContainer;
	};

	AdaptationController.prototype._createPopover = function(Container, oPanel, sTitle){
		var oContainer = new Container({
			title: sTitle,
			horizontalScrolling: false,
			verticalScrolling: true,
			contentWidth: "26rem",
			resizable: true,
			contentHeight: "40rem",
			placement: "HorizontalPreferredRight",
			content: oPanel,
			afterClose: function () {
				// resolve the Promise with an empty array, to be able to reload the settings
				oContainer.destroy();
				this.fireAfterP13nContainerCloses({
					reason: "autoclose"
				});
				this.bIsDialogOpen = false;
			}.bind(this)
		});
		return oContainer;
	};

	AdaptationController.prototype._createModalDialog = function(Container, oPanel, sTitle){
		var oResourceBundle = sap.ui.getCore().getLibraryResourceBundle("sap.ui.mdc");
		var oContainer = new Container({
			title: sTitle,
			horizontalScrolling: false,
			verticalScrolling: true,
			contentWidth: "40rem",
			contentHeight: "55rem",
			draggable: true,
			resizable: true,
			stretch: "{device>/system/phone}",
			content: oPanel,
			buttons: [
				new Button({
					text: oResourceBundle.getText("p13nDialog.OK"),
					type: "Emphasized",
					press: function () {
						// Apply a diff to create changes for flex
						this._handleChange();
						oContainer.close();
						oContainer.destroy();
						this.bIsDialogOpen = false;
						this.fireAfterP13nContainerCloses({
							reason: "Ok"
						});
					}.bind(this)
				}), new Button({
					text: oResourceBundle.getText("p13nDialog.CANCEL"),
					press: function () {
						// Discard the collected changes
						oContainer.close();
						oContainer.destroy();
						this.bIsDialogOpen = false;
						this.fireAfterP13nContainerCloses({
							reason: "Cancel"
						});
					}.bind(this)
				})
			]
		});
		return oContainer;
	};

	AdaptationController.prototype._sortP13nData = function (oData) {

		var sPositionAttribute = this.sP13nType == "Item" ? "position" : "sortPosition";
		var sSelectedAttribute = this.sP13nType == "Item" ? "selected" : "isSorted";

		var sLocale = sap.ui.getCore().getConfiguration().getLocale().toString();

		var oCollator = window.Intl.Collator(sLocale, {});

		// group selected / unselected --> sort alphabetically in each group
		oData.items.sort(function (mField1, mField2) {
			if (mField1[sSelectedAttribute] && mField2[sSelectedAttribute]) {
				return (mField1[sPositionAttribute] || 0) - (mField2[sPositionAttribute] || 0);
			} else if (mField1[sSelectedAttribute]) {
				return -1;
			} else if (mField2[sSelectedAttribute]) {
				return 1;
			} else if (!mField1[sSelectedAttribute] && !mField2[sSelectedAttribute]) {
				return oCollator.compare(mField1.label, mField2.label);
			}
		});

	};

	/************************************************ delta calculation *************************************************/

	AdaptationController.prototype._checkRestrictions = function (mItem) {
		var bInclude = true;

		if (this.sP13nType == "Sort") {
			bInclude = mItem.sortable === false ? false : true;
		}

		return bInclude;
	};

	AdaptationController.prototype._handleChange = function(){
		var aChanges = [], aInitialState = [], aCurrentState = [];

		//TODO: generify
		var fFilter = function (oItem) {
			return this.sP13nType == "Sort" ? oItem.isSorted : oItem.selected;
		}.bind(this);

		aInitialState = this.oState.items.filter(fFilter);
		aCurrentState = this.oAdaptationModel.getData().items.filter(fFilter);

		var fnSymbol = function (o) {
			var sDiff = o.name;
			//TODO: needs to be generified here and in FlexUtil
			if (o.hasOwnProperty("descending")) {
				sDiff = sDiff + o.descending;
			}
			if (o.role) {
				sDiff = sDiff + o.role;
			}
			return sDiff;
		};

		aChanges = FlexUtil.getArrayDeltaChanges(aInitialState, aCurrentState, fnSymbol, this.getAdaptationControl(), this.sRemoveOperation, this.sAddOperation, this.sMoveOperation);

		this.oState = merge({}, this.oAdaptationModel.getData());

		//execute callback
		this.getAfterChangesCreated()(this, aChanges);

	};

	AdaptationController.prototype._hasProperty = function(sName) {
		return this.aPropertyInfo.some(function(oProperty){
			var bValid = oProperty.name === sName || sName == "$search";
			return bValid;
		});
	};

	AdaptationController.prototype.destroy = function(bSuppressInvalidate){

		ManagedObject.prototype.destroy.apply(this, arguments);

		if (this.oAdaptationModel){
			this.oAdaptationModel.destroy();
		}	this.oAdaptationModel = null;

		this.bIsDialogOpen = null;
		this.sP13nType = null;
		this.oAdaptationControlDelegate = null;
		this.sAddOperation = null;
		this.sRemoveOperation = null;
		this.sMoveOperation = null;
	};

	return AdaptationController;

});
