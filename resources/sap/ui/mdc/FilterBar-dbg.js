/*
 * ! SAPUI5

		(c) Copyright 2009-2020 SAP SE. All rights reserved
	
 */
sap.ui.define([
	'sap/ui/core/library', 'sap/ui/mdc/p13n/AdaptationController', 'sap/ui/mdc/p13n/FlexUtil', 'sap/ui/Device', 'sap/ui/core/Control', 'sap/base/util/merge', 'sap/base/util/deepEqual', 'sap/ui/model/base/ManagedObjectModel', 'sap/ui/base/ManagedObjectObserver', 'sap/base/Log', 'sap/ui/mdc/filterbar/FilterItemLayout', 'sap/ui/mdc/condition/ConditionModel', 'sap/ui/mdc/condition/Condition', 'sap/ui/mdc/util/IdentifierUtil', 'sap/ui/mdc/condition/ConditionConverter', 'sap/ui/layout/AlignedFlowLayout', 'sap/m/library', 'sap/m/MessageBox', 'sap/m/Button', 'sap/ui/model/json/JSONModel', "sap/ui/fl/write/api/ControlPersonalizationWriteAPI", "sap/ui/fl/apply/api/FlexRuntimeInfoAPI", "sap/ui/mdc/p13n/StateUtil", "sap/ui/mdc/condition/FilterConverter"
], function(coreLibrary, AdaptationController, FlexUtil, Device, Control, merge, deepEqual, ManagedObjectModel, ManagedObjectObserver, Log, FilterItemLayout, ConditionModel, Condition, IdentifierUtil, ConditionConverter, AlignedFlowLayout, mLibrary, MessageBox, Button, JSONModel, ControlPersonalizationWriteAPI, FlexRuntimeInfoAPI, StateUtil, FilterConverter) {
	"use strict";

	var ButtonType = mLibrary.ButtonType;
	var ValueState = coreLibrary.ValueState;

	/**
	 * Constructor for a new FilterBar.
	 * @param {string} [sId] ID for the new control, generated automatically if no ID is given
	 * @param {object} [mSettings] initial settings for the new control
	 * @class The <code>FilterBar</code> control is used to display filter properties in a user-friendly manner to populate values for a query.
	 * The filters are arranged in a logical row that is divided depending on the space available and the width of the filters.
	 * The Go button triggers the search event, and the Advanced Filters button shows the filter dialog.<br>
	 * The <code>FilterBar</code> control creates and handles the filters based on the provided metadata information.
	 * The metadata information is provided via the {@link sap.ui.mdc.FilterBarDelegate FilterBarDelegate} implementation. This implementation has to be provided by the application.
	 * @extends sap.ui.core.Control
	 * @author SAP SE
	 * @version 1.78.0
	 * @constructor
	 * @private
	 * @since 1.61.0
	 * @alias sap.ui.mdc.FilterBar
	 * @ui5-metamodel This control/element also will be described in the UI5 (legacy) designtime metamodel
	 */
	var FilterBar = Control.extend("sap.ui.mdc.FilterBar", /** @lends sap.ui.mdc.FilterBar.prototype */
	{
		metadata: {
			library: "sap.ui.mdc",
			designtime: "sap/ui/mdc/designtime/filterbar/FilterBar.designtime",
			defaultAggregation: "filterItems",
			interfaces : [
				"sap.ui.mdc.IFilter",
				"sap.ui.mdc.IxState"
			],
			properties: {

				/**
				 * Defines the path to the metadata retrieval class for the <code>FilterBar</code> control.
				 * It basically identifies the {@link sap.ui.mdc.FilterBarDelegate FilterBarDelegate} file that provides the required APIs to create the filter bar content.<br>
				 * <b>Note:</b> Ensure that the related file can be requested (any required library has to be loaded before that).<br>
				 * <b>Note:</b> This property must not be bound.
				 * @since 1.74
				 */
				delegate: {
					type: "object",
					defaultValue: {

						/**
						 * Contains the class name which implements the {@link sap.ui.mdc.FilterBarDelegate FilterBarDelegate} class.
						 */
						name: "sap/ui/mdc/FilterBarDelegate",

						/**
						 * Contains the mandatory information about the metamodel name <code>modelName</code> and the main data part in its <code>collectionName</code>.<br>
						 * <b>Note:</b> Additional information relevant for the specific {@link sap.ui.mdc.FilterBarDelegate FilterBarDelegate} implementation might be included but is of no relevance for the filter bar itself.
						 */
						payload: {
							modelName: undefined,
							collectionName: ""
						}}
				},

				/**
				 * Triggers a search automatically after a filter value has been changed.<br>
				 * <b>Note:</b> The <code>liveMode</code> property only operates in non-mobile scenarios.<br>
				 * Additionally, if the <code>liveMode</code> property is active, the following applies:<br>
				 * The error message box is not displayed, and the <code>showMessages</code> property is ignored.
				 * @since 1.74
				 */
				liveMode: {
					type: "boolean",
					defaultValue: false
				},

				/**
				 * Displays possible errors during the search in a message box.
				 * @since 1.74
				 */
				showMessages: {
					type: "boolean",
					group: "Misc",
					defaultValue: true
				},

				/**
				 * Determines whether the Go button is visible in the filter bar.<br>
				 * <b>Note</b>: If the <code>liveMode</code> property is set to <code>true</code>, it is ignored.
				 */
				showGoButton: {
					type: "boolean",
					defaultValue: true
				},

				/**
				 * Determines whether the Adapt Filters button is visible in the filter bar.<br>
				 * <b>Note</b>: If the <code>p13nMode</code> property does not contain the value <code>Item</code>, it is ignored.
				 */
				showAdaptFiltersButton: {
					type: "boolean",
					defaultValue: true
				},

				/**
				 * Specifies the personalization options for the filter bar.
				 *
				 * @since 1.74
				 */
				p13nMode: {
					type: "sap.ui.mdc.FilterBarP13nMode[]"
				},

				/**
				 * Specifies the filter conditions.<br>
				 * <b>Note</b>: This property must not be bound.<br>
				 * <b>Note</b>: This property is used exclusively for SAPUI5 flexibility. Do not use it otherwise.
				 *
				 * @since 1.66.0
				 */
				filterConditions: {
					type: "object",
					defaultValue: {}
				},

				/**
				 * Binds the text of the Adapt Filters button.
				 */
				_filterCount: {
					type: "string",
					visibility: "hidden"
				},

				/**
				 * Specifies if the personalization mode for filter items is supported.
				 */
				_p13nModeItem: {
					type: "boolean",
					visibility: "hidden",
					defaultValue: false
				},

				/**
				 * Specifies if the personalization mode for filter conditions is supported.
				 */
				_p13nModeValue: {
					type: "boolean",
					visibility: "hidden",
					defaultValue: false
				}
			},
			aggregations: {

				/**
				 * Contains all the displayed {@link sap.ui.mdc.FilterField filter fields} of the <code>FilterBar</code> control.
				 */
				filterItems: {
					type: "sap.ui.mdc.FilterField",
					multiple: true
				},

				/**
				 * Contains the optional basic search field.
				 */
				basicSearchField: {
					type: "sap.ui.mdc.FilterField",
					multiple: false
				},

				/**
				 * Internal hidden aggregation to hold the inner layout.
				 */
				layout: {
					type: "sap.ui.layout.AlignedFlowLayout",
					multiple: false,
					visibility: "hidden"
				}
			},
			events: {

				/**
				 * This event is fired when the Go button is pressed.
				 */
				search: {
					conditions: {
						type: "object"
					}
				},

				/**
				 * This event is fired after either a filter value or the visibility of a filter item has been changed.
				 */
				filtersChanged: {
					filtersText: { // optional
						type: "string"
					}
				}
			}
		},
		renderer: {
			apiVersion: 2,
			render: function(oRm, oControl) {
				oRm.openStart("div", oControl);
				oRm.class("sapUiMdcBaseFilterBar");
				oRm.openEnd();
				oRm.renderControl(oControl.getAggregation("layout"));
				oRm.close("div");
			}
		}
	});

	FilterBar.INNER_MODEL_NAME = "$sap.ui.mdc.FilterBar";
	FilterBar.CONDITION_MODEL_NAME = "$filters";

	var ErrorState = {
			NoError: -1,
			RequiredHasNoValue: 0,
			FieldInErrorState: 1,
			AsyncValidation: 2
	};

	FilterBar.prototype.init = function() {
		this._oRb = sap.ui.getCore().getLibraryResourceBundle("sap.ui.mdc");

		this._createInnerModel();

		this._oObserver = new ManagedObjectObserver(this._observeChanges.bind(this));

		this._oObserver.observe(this, {
			aggregations: [
				"filterItems"
			]
		});

		this._oFilterBarLayout = new AlignedFlowLayout();
		this.setAggregation("layout", this._oFilterBarLayout, true);
		this._addButtons();

		this._aProperties = null;

		this._fResolveInitialFiltersApplied = undefined;
		this._oInitialFiltersAppliedPromise = new Promise(function(resolve) {
			this._fResolveInitialFiltersApplied  = resolve;
		}.bind(this));

		this._bIgnoreChanges = false;
		this._oAdaptationController = null;
	};

	FilterBar.prototype._isPhone = function() {
		return (Device.system.phone) ? true : false;
	};

	FilterBar.prototype._isLiveMode = function() {
		if (this._isPhone()) {
			return false;
		}

		return this.getLiveMode();
	};

	FilterBar.prototype._getConditionModel = function() {
		return this._oConditionModel;
	};

	/**
	 * Returns the name of the inner <code>FilterBar</code> condition model.
	 * @returns {string} Name of the inner <code>FilterBar</code> condition model
	 */
	FilterBar.prototype.getConditionModelName = function() {
		return this._getConditionModelName();
	};

	FilterBar.prototype._getConditionModelName = function() {
		return  FilterBar.CONDITION_MODEL_NAME;
	};

	FilterBar.prototype._createConditionModel = function() {
		this._oConditionModel = new ConditionModel();
		this.setModel(this._oConditionModel, this._getConditionModelName());
	};

	FilterBar.prototype._getMetaModelName = function() {
		var oDelegate = this.getDelegate();
		if (oDelegate && oDelegate.payload && oDelegate.payload.hasOwnProperty("modelName")) {

			return this.getDelegate().payload.modelName === null ? undefined : this.getDelegate().payload.modelName;
		}
		return null;
	};
	FilterBar.prototype._getEntitySetName = function() {
		var oDelegate = this.getDelegate();
		if (oDelegate && oDelegate.payload && oDelegate.payload.collectionName) {
			return this.getDelegate().payload.collectionName;
		}
		return null;
	};


	FilterBar.prototype.applySettings = function(mSettings, oScope) {
		var oFiltersRestriction;

		Control.prototype.applySettings.apply(this, arguments);

		this._createConditionModel();
		this._oConditionModel.attachPropertyChange(this._handleConditionModelPropertyChange, this);

		this._retrieveMetadata();
		oFiltersRestriction = this.getFilterConditions();
		if (oFiltersRestriction && Object.keys(oFiltersRestriction).length > 0) {
			this._oMetadataAppliedPromise.then(function() {
				this._applyInitialFilterConditions();
			}.bind(this));
		} else {
			this._fResolveInitialFiltersApplied();
		}
	};

	FilterBar.prototype.setP13nMode = function(aMode) {
		var aOldMode = this.getP13nMode();
		this.setProperty("p13nMode", aMode || [], false);

		aMode && aMode.forEach(function(sMode) {
			if (!aOldMode || aOldMode.indexOf(sMode) < 0) {
				this._setP13nMode(sMode, true);
			}
		}.bind(this));
		aOldMode && aOldMode.forEach(function(sMode) {
			if (!aMode || aMode.indexOf(sMode) < 0) {
				this._setP13nMode(sMode, false);
			}
		}.bind(this));

		return this;
	};

	FilterBar.prototype._setP13nMode = function(sMode, bValue) {
		switch (sMode) {
			case "Item":  this._setP13nModeItem(bValue); break;
			case "Value": this._setP13nModeValue(bValue); break;
		}
	};

	FilterBar.prototype._getP13nModeItem = function() {
		return this._oModel.getProperty("/_p13nModeItem");
	};
	FilterBar.prototype._setP13nModeItem = function(bValue) {
		this._oModel.setProperty("/_p13nModeItem", bValue, true);
	};
	FilterBar.prototype._getP13nModeValue = function() {
		return this._oModel.getProperty("/_p13nModeValue");
	};
	FilterBar.prototype._setP13nModeValue = function(bValue) {
		this._oModel.setProperty("/_p13nModeValue", bValue, false);
	};


	FilterBar.prototype._createInnerModel = function() {
		this._oModel = new ManagedObjectModel(this);
		this.setModel(this._oModel, FilterBar.INNER_MODEL_NAME);
		return this;
	};

	FilterBar.prototype._addButtons = function() {

		if (this._oFilterBarLayout) {

			this.setProperty("_filterCount", this._oRb.getText("filterbar.ADAPT"), false);

			this._btnAdapt = new Button(this.getId() + "-btnAdapt", {
				type: ButtonType.Transparent,
				text: "{" + FilterBar.INNER_MODEL_NAME + ">/_filterCount}",
				press: this.onAdaptFilters.bind(this)
			});
			this._btnAdapt.setModel(this._oModel, FilterBar.INNER_MODEL_NAME);

			this._btnAdapt.bindProperty("visible", {
				parts: [
					{
						path: '/showAdaptFiltersButton',
						model: FilterBar.INNER_MODEL_NAME
					}, {
						path: "/_p13nModeItem",
						model: FilterBar.INNER_MODEL_NAME
					}
				],
				formatter: function(bValue1, bValue2) {
					return bValue1 && bValue2;
				}
			});
			this._btnAdapt.addStyleClass("sapUiMdcBaseFilterBarButtonPaddingRight");

			this._oFilterBarLayout.addEndContent(this._btnAdapt);

			this._btnSearch = new Button(this.getId() + "-btnSearch", {
				text: this._oRb.getText("filterbar.GO"),
				press: this.onSearch.bind(this),
				type: ButtonType.Emphasized
			});
			this._btnSearch.setModel(this._oModel, FilterBar.INNER_MODEL_NAME);
			this._btnSearch.bindProperty("visible", {
				parts: [
					{
						path: '/showGoButton',
						model: FilterBar.INNER_MODEL_NAME
					}, {
						path: "/liveMode",
						model: FilterBar.INNER_MODEL_NAME
					}
				],
				formatter: function(bValue1, bValue2) {
					return bValue1 && ((this._isPhone()) ? true : !bValue2);
				}.bind(this)
			});
			this._oFilterBarLayout.addEndContent(this._btnSearch);
		}
	};


	FilterBar.prototype._initializeProvider = function() {
		var oDelegate = this.getDelegate();
		if (oDelegate) {
			var sDelegatePath = oDelegate.name;
			if (!sDelegatePath) {
				return Promise.resolve(null);
			}

			return this._loadProvider(sDelegatePath);
		} else {
			Log.error("not able to obtain the delegate.");
			return Promise.resolve(null);
		}
	};

	FilterBar.prototype._loadProvider = function(sDelegate) {
		return new Promise(function(fResolve) {
			sap.ui.require([
				sDelegate
			], function(Provider) {
				fResolve(Provider);
			});
		});
	};

	FilterBar.prototype.onAdaptFilters = function(oEvent) {
		return this._oMetadataAppliedPromise.then(function() {
			return this._getAdaptationController().showP13n(this._btnAdapt, "Item");
		}.bind(this));
	};

	FilterBar.prototype.setFilterConditions = function(mValue, bSuppressInvalidate) {
		StateUtil.checkConditionOperatorSanity(mValue);
		this.setProperty("filterConditions", mValue, bSuppressInvalidate);
		return this;
	};

	/**
	 * Returns the externalized conditions of the inner condition model.
	 * This method may only be called, once the <code>waitForInitialization</code> is resolved.
	 * @protected
	 * @returns {object} object containing the current status of the FilterBar
	 */
	FilterBar.prototype.getCurrentState = function() {
		//return this.waitForInitialization().then(function() {
			var aFilterItems = this.getFilterItems();
			var aItems = [];
			aFilterItems.forEach(function(oFilterField, iIndex){
				aItems.push({
					name: oFilterField.getFieldPath()
				});
			});
			var aIgnoreFieldNames = [];
			var mConditions = this.getFilterConditions();
			for (var sKey in mConditions) {
				if (!this._getPropertyByName(sKey)) {
					aIgnoreFieldNames.push(sKey);
				}
			}

			aIgnoreFieldNames.forEach(function(sKey) {
				delete mConditions[sKey];
			});

			return {
				filter: mConditions,
				items: aItems
			};
		//}.bind(this));
	};

	FilterBar.prototype._getAdaptationController = function() {
		if (!this._oAdaptationController) {
			this._oAdaptationController = new AdaptationController({
				liveMode: true,
				stateRetriever: function(FilterBarDelegate, aPropertyInfo){
					return this.getCurrentState(aPropertyInfo);
				},
				adaptationControl: this,
				afterChangesCreated: function (oAdaptationController, aChanges) {
					FlexUtil.handleChanges(aChanges);
				},
				retrievePropertyInfo: this._getNonHiddenPropertyInfoSet,
				itemConfig: {
					addOperation: "addFilter",
					removeOperation: "removeFilter",
					moveOperation: "moveFilter",
					panelPath: "sap/ui/mdc/p13n/panels/AdaptFiltersPanel",
					title: this._oRb.getText("filterbar.ADAPT_TITLE")
				}
			});
		}
		return this._oAdaptationController;
	};

	FilterBar.prototype._getAssignedFilterNames = function() {
		var sName, aFilterNames = null, oModel = this._getConditionModel();
		if (oModel) {
			aFilterNames = [];

			var aConditions = oModel.getConditions("$search");
			if (aConditions && aConditions.length > 0) {
				aFilterNames.push(this._oRb.getText("filterbar.ADAPT_SEARCHTERM"));
			}

			this._getNonHiddenPropertyInfoSet().forEach(function(oProperty) {
				sName = IdentifierUtil.getPropertyKey(oProperty);
				var aConditions = oModel.getConditions(sName);
				if (aConditions && aConditions.length > 0) {
					aFilterNames.push(oProperty.label || sName);
				}
			});
		}

		return aFilterNames;
	};


	FilterBar.prototype._getAssignedFiltersText = function(aFilterNames) {
		var sAssignedFiltersText, aMaxFilterNames;

		aFilterNames = aFilterNames || [];

		// if basic search is available - first entry
		if (aFilterNames.length > 5) {
			aMaxFilterNames = aFilterNames.slice(0, 5);
			aMaxFilterNames.push("...");
		} else {
			aMaxFilterNames = aFilterNames;
		}

		sAssignedFiltersText = Object.keys(aMaxFilterNames).map(function(i) {return aMaxFilterNames[i];}).join(", ");

		if (aFilterNames.length) {
			return this._oRb.getText("filterbar.ADAPT_FILTERED", [
				aFilterNames.length, sAssignedFiltersText
			]);
		}

		return this._oRb.getText("filterbar.ADAPT_NOTFILTERED");
	};

	/**
	 * Returns a summary string that contains information about the filters currently assigned. The string starts with "Filtered By", followed by the number of set filters and their labels.<br>
	 * <b>Example</b>:<br>
	 * <i>Filtered By (3): Company Code, Fiscal Year, Customer</i>
	 * @public
	 * @returns {string} A string that contains the number of set filters and their names
	 */
	FilterBar.prototype.getAssignedFiltersText = function() {
		return this._getAssignedFiltersText(this._getAssignedFilterNames());
	};

	FilterBar.prototype._reportModelChange = function(oEvent) {
		this._handleAssignedFilterNames();

		if (this.getLiveMode()) {
			this.triggerSearch();
		}
	};

	FilterBar.prototype._isFlexSupported = function(oEvent) {
		return FlexRuntimeInfoAPI.isFlexSupported({element: this});
	};

	FilterBar.prototype._handleConditionModelPropertyChange = function(oEvent) {

		if (!this._bIgnoreChanges) {

			var sPath = oEvent.getParameter("path");
			if (sPath.indexOf("/conditions/") === 0) {

				var sFieldPath = sPath.substring("/conditions/".length);

				if (this._getP13nModeValue() && this._isFlexSupported()) {
					var mOrigConditions = {};
					mOrigConditions[sFieldPath] = this._stringifyConditions(sFieldPath, oEvent.getParameter("value"));
					this._cleanupConditions(mOrigConditions[sFieldPath]);
					this._getAdaptationController().createConditionChanges(mOrigConditions);
				} else {
					this._reportModelChange();
				}
			}
		}
	};


	FilterBar.prototype._toExternal = function(oProperty, oCondition) {
		var oConditionExternal = merge({}, oCondition);
		oConditionExternal = ConditionConverter.toString(oConditionExternal, oProperty.baseType);

		this._cleanupCondition(oConditionExternal);


		if (oCondition.inParameters && (Object.keys(oCondition.inParameters).length > 0)) {
			Object.keys(oCondition.inParameters).forEach(function(sKey) {
				var oInParamProperty = this._getPropertyByName(sKey);
				if (oInParamProperty) {
					var oInConditionNonCov = Condition.createCondition("EQ", [oCondition.inParameters[sKey]]);
					var oInCondition = ConditionConverter.toString(oInConditionNonCov, oInParamProperty.baseType);
					if (!oConditionExternal.inParameters) {
						oConditionExternal.inParameters = {};
					}
					oConditionExternal.inParameters[sKey] = oInCondition.values[0];
				} else {
					Log.error("mdc.FilterBar._toExternal: could not find property info for " + sKey);
				}
			}.bind(this));
		}

		if (oCondition.outParameters && (Object.keys(oCondition.outParameters).length > 0)) {
			Object.keys(oCondition.outParameters).forEach(function(sKey) {
				var oOutParamProperty = this._getPropertyByName(sKey);
				if (oOutParamProperty) {
					var oOutConditionNonCov = Condition.createCondition("EQ", [oCondition.outParameters[sKey]]);
					var oOutCondition = ConditionConverter.toString(oOutConditionNonCov, oOutParamProperty.baseType);
					if (!oConditionExternal.outParameters) {
						oConditionExternal.outParameters = {};
					}
					oConditionExternal.outParameters[sKey] = oOutCondition.values[0];
				} else {
					Log.error("mdc.FilterBar._toExternal: could not find property info for " + sKey);
				}
			}.bind(this));
		}

		return oConditionExternal;
	};

	FilterBar.prototype._toInternal = function(oProperty, oCondition) {
		var oConditionInternal = merge({}, oCondition);
		oConditionInternal = ConditionConverter.toType(oConditionInternal, oProperty.baseType);

		if (oCondition.inParameters && (Object.keys(oCondition.inParameters).length > 0)) {
			Object.keys(oCondition.inParameters).forEach(function(sKey) {
				var oInParamProperty = this._getPropertyByName(sKey);
				if (oInParamProperty) {
					var oInCondition = Condition.createCondition("EQ", [oCondition.inParameters[sKey]]);
					var vValue = ConditionConverter.toType(oInCondition, oInParamProperty.baseType);
					if (!oConditionInternal.inParameters) {
						oConditionInternal.inParameters = {};
					}
					oConditionInternal.inParameters[sKey] = vValue.values[0];
				} else {
					Log.error("mdc.FilterBar._toInternal: could not find property info for " + sKey);
				}
			}.bind(this));
		}
		if (oCondition.outParameters && (Object.keys(oCondition.outParameters).length > 0)) {
			Object.keys(oCondition.outParameters).forEach(function(sKey) {
				var oOutParamProperty = this._getPropertyByName(sKey);
				if (oOutParamProperty) {
					var oOutCondition = Condition.createCondition("EQ", [oCondition.outParameters[sKey]]);
					var vValue = ConditionConverter.toType(oOutCondition, oOutParamProperty.baseType);
					if (!oConditionInternal.outParameters) {
						oConditionInternal.outParameters = {};
					}
					oConditionInternal.outParameters[sKey] = vValue.values[0];
				} else {
					Log.error("mdc.FilterBar._toInternal: could not find property info for " + sKey);
				}
			}.bind(this));
		}
		return oConditionInternal;
	};

	FilterBar.prototype._cleanupCondition = function(oCondition) {
		if (oCondition) {
			if (oCondition.hasOwnProperty("isEmpty")) {
				delete oCondition.isEmpty;
			}
		}
	};

	FilterBar.prototype._cleanupConditions = function(aConditions) {
		if (aConditions) {
			aConditions.forEach( function(oCondition) {
				this._cleanupCondition(oCondition);
			}, this);
		}
	};

	FilterBar.prototype._stringifyCondition = function(oProperty, oCondition) {
		var oResultCondition = oCondition;
		if (oCondition && oCondition.values && oCondition.values.length > 0) {
			oResultCondition = this._toExternal(oProperty, oCondition);
		}

		return oResultCondition;
	};


	FilterBar.prototype._stringifyConditions = function(sFieldPath, aConditions) {


		var oProperty = this._getPropertyByName(sFieldPath);
		var aResultConditions = aConditions;

		if (oProperty && aConditions) {
			aResultConditions = [];

			aConditions.forEach( function(oCondition) {
				if (oCondition && oCondition.values && oCondition.values.length > 0) {
					aResultConditions.push(this._stringifyCondition(oProperty, oCondition));
				}
			}, this);
		}

		return aResultConditions;
	};


	FilterBar.prototype._removeSameConditions = function(aConditions, aShadowConditions) {
		var bRunAgain;

		do  {
			bRunAgain = false;

			for (var i = 0; i < aConditions.length; i++) {
				for (var j = 0; j < aShadowConditions.length; j++) {
					if (deepEqual(aConditions[i], aShadowConditions[j])) {
						aConditions.splice(i, 1);
						aShadowConditions.splice(j, 1);
						bRunAgain = true;
						break;
					}
				}

				if (bRunAgain) {
					break;
				}
			}
		}  while (bRunAgain);
	};

	FilterBar.prototype._handleAssignedFilterNames = function() {

		this._oMetadataAppliedPromise.then(function() {

			var oObj = {}, aFilterNames = this._getAssignedFilterNames();
			if (aFilterNames) {
				if (this._btnAdapt) {
					this.setProperty("_filterCount", this._oRb.getText(aFilterNames.length ? "filterbar.ADAPT_NONZERO" : "filterbar.ADAPT", aFilterNames.length), false);
				}

				oObj.filtersText = this._getAssignedFiltersText(aFilterNames);
				this.fireFiltersChanged(oObj);
			}
		}.bind(this));
	};

	FilterBar.prototype.onReset = function(oEvent) {
		this._getConditionModel().oConditionModel.removeAllConditions();
	};
	FilterBar.prototype.onSearch = function(oEvent) {
		this.triggerSearch();
	};

	FilterBar.prototype.fireSearch = function(oEvent) {
		var mConditions = this.getConditions();
		this.fireEvent("search", {conditions: mConditions });
	};

	/**
	 * Triggers the search.
	 * @public
	 */
	FilterBar.prototype.triggerSearch = function() {
		this.waitForInitialization().then(function() {
			if (!this._oSearchPromise) {

				this._oSearchPromise = new Promise(function(resolve) {
					this._fResolvedSearchPromise = resolve;
				}.bind(this));

				var fDelayedFunction = function() {
					this._search();
					this._fResolvedSearchPromise();
					this._oSearchPromise = null;
				};
				setTimeout(fDelayedFunction.bind(this), 0);
			}

			return this._oSearchPromise;



		}.bind(this));
	};

	FilterBar.prototype._clearDelayedSearch = function() {
		if (this._iDelayedSearchId) {
			clearTimeout(this._iDelayedSearchId);
			this._iDelayedSearchId = null;
		}
	};


	FilterBar.prototype._getRequiredFieldsWithoutValues = function() {
		var aReqFiltersWithoutValue = [];
		this._getRequiredPropertyNames().forEach(function(sName) {
			var aConditions = this._getConditionModel().getConditions(sName);
			if (!aConditions || aConditions.length === 0) {
				aReqFiltersWithoutValue.push(sName);
			}
		}.bind(this));

		return aReqFiltersWithoutValue;
	};

	FilterBar.prototype._checkAsyncValidation = function() {
		var vRetErrorState = ErrorState.NoError;

		if (this._aFIChanges && this._aFIChanges.length > 0) {
			vRetErrorState = ErrorState.AsyncValidation;
		}

		return vRetErrorState;
	};


	FilterBar.prototype._checkRequiredFields = function() {
		var vRetErrorState = ErrorState.NoError;

		var aReqFiltersWithoutValue = this._getRequiredFieldsWithoutValues();
		aReqFiltersWithoutValue.forEach(function(sName) {
			var oFilterField = this._getFilterField(sName);
			if (oFilterField) {
				if (oFilterField.getValueState() === ValueState.None) {
					oFilterField.setValueState(ValueState.Error);
					oFilterField.setValueStateText(this._oRb.getText("filterbar.REQUIRED_FILTER_VALUE_MISSING"));
				}
			} else {
				Log.error("Mandatory filter field '" + sName + "' not visible on FilterBar has no value.");
			}

			vRetErrorState = ErrorState.RequiredHasNoValue;
		}.bind(this));

		return vRetErrorState;
	};

	FilterBar.prototype._checkFieldsInErrorState = function() {
		var vRetErrorState = ErrorState.NoError;

		this._getNonRequiredPropertyNames().some(function(sName) {
			var oFilterField = this._getFilterField(sName);
			if (oFilterField && (oFilterField.getValueState() !== ValueState.None)) {
				vRetErrorState = ErrorState.FieldInErrorState;
			}

			return vRetErrorState !== ErrorState.NoError;
		}.bind(this));

		return vRetErrorState;
	};

	FilterBar.prototype._handleFilterItemChanges = function(oEvent) {

		if (this._bIgnoreChanges) {
			return;
		}

		var oFilterField = oEvent.oSource;
		if (oFilterField.getRequired() && (oFilterField.getValueState() === ValueState.Error) && oEvent.getParameter("valid")) {
			oFilterField.setValueState(ValueState.None);
			return;
		}

		if (!this._aFIChanges) {
			this._aFIChanges = [];
		}

		this._aFIChanges.push({ name: oFilterField.getFieldPath(), promise: oEvent.getParameter("promise")});
	};

	FilterBar.prototype._checkFilters = function() {
		var vRetErrorState = this._checkAsyncValidation();
		if (vRetErrorState !== ErrorState.NoError) {
			return vRetErrorState;
		}

		vRetErrorState = this._checkRequiredFields();
		if (vRetErrorState !== ErrorState.NoError) {
			return vRetErrorState;
		}

		vRetErrorState = this._checkFieldsInErrorState();
		if (vRetErrorState !== ErrorState.NoError) {
			return vRetErrorState;
		}

		return vRetErrorState;
	};

	FilterBar.prototype._setFocusOnFirstErroneousField = function() {
		this.getFilterItems().some(function(oFilterItem) {
			if (oFilterItem.getValueState() !== ValueState.None) {
				setTimeout(oFilterItem["focus"].bind(oFilterItem), 0);
				return true;
			}
			return false;
		});
	};

	FilterBar.prototype._handleAsyncValidation = function() {
		if (this._aFIChanges && (this._aFIChanges.length > 0)) {

			var aNamePromisesArray = this._aFIChanges.slice();
			this._aFIChanges = null;

			var aChangePromises = [];
			aNamePromisesArray.forEach(function(oNamePromise) {
				aChangePromises.push(oNamePromise.promise);
			});

			Promise.all(aChangePromises).then(function(aConditionsArray) {

				aConditionsArray.forEach(function(aConditions, nIdx) {
					var oFF = this._getFilterField(aNamePromisesArray[nIdx].name);
					if (oFF && oFF.getRequired() && (oFF.getValueState() === ValueState.Error)) {
						oFF.setValueState(ValueState.None); //valid existing value -> clear missing required error
					}
				}, this);
				this._search();
			}.bind(this), function(aConditionsArray) {
				this._search();
			}.bind(this));
		}
	};

	/**
	 * Executes the search.
	 * @private
	 */
	 FilterBar.prototype._search = function() {
		var sErrorMessage, vRetErrorState;

		// First check for validation errors or if search should be prevented
		vRetErrorState = this._checkFilters();

		if (vRetErrorState === ErrorState.AsyncValidation) {
			this._handleAsyncValidation();
			return;
		}

		if (vRetErrorState === ErrorState.NoError) {
			this.fireSearch();

		} else {
			if (vRetErrorState === ErrorState.RequiredHasNoValue) {
				sErrorMessage = this._oRb.getText("filterbar.REQUIRED_CONDITION_MISSING");
			} else {
				sErrorMessage = this._oRb.getText("filterbar.VALIDATION_ERROR");
			}

			if (this.getShowMessages() && !this._isLiveMode()) {
				try {
					MessageBox.error(sErrorMessage, {
						styleClass: (this.$() && this.$().closest(".sapUiSizeCompact").length) ? "sapUiSizeCompact" : "",
						onClose: this._setFocusOnFirstErroneousField.bind(this)
					});
				} catch (x) {
					Log.error(x.message);
				}
			} else {
				Log.warning("search was not triggered. " + sErrorMessage);
			}
		}
	};

	/**
	 * Returns the conditions of the inner condition model.<br>
	 * <b>Note:</b>This method must only be used for value help scenarios.
	 * @protected
	 * @returns {map} A map containing the conditions
	 */
	FilterBar.prototype.getConditions = function() {
		return this._getModelConditions(this._getConditionModel(), true);
	};

	FilterBar.prototype.hasProperty = function(sName) {
		return this._getPropertyByName(sName);
	};

	FilterBar.prototype.waitForInitialization = function() {
		return Promise.all([this._oInitialFiltersAppliedPromise, this._oMetadataAppliedPromise]);
	};

	/**
	 * Returns the conditions of the inner condition model.
	 * @private
	 * @param {object} oModel containing the conditions.
	 * @param {boolean} bDoNotExternalize Indicates if the returned conditions are in an external format
	 * @returns {map} A map containing the conditions
	 */
	FilterBar.prototype._getModelConditions = function(oModel, bDoNotExternalize) {
		var mConditions = {};
		if (oModel) {
			var aAllConditions = oModel.getAllConditions();
			for (var sFieldPath in aAllConditions) {
				if (aAllConditions[sFieldPath] && (aAllConditions[sFieldPath].length > 0)) {
					mConditions[sFieldPath] = merge([], aAllConditions[sFieldPath]);
					if (!bDoNotExternalize && this._getP13nModeValue()) {
						this._cleanupConditions(mConditions[sFieldPath]);
						var aFieldConditions = this._stringifyConditions(sFieldPath, mConditions[sFieldPath]);
						mConditions[sFieldPath] = aFieldConditions;
					}
				}
			}
		}

		return mConditions;
	};

	FilterBar.prototype.removeCondition = function(sFieldPath, oXCondition) {

		return this.waitForInitialization().then(function() {
			var oCM = this._getConditionModel();
			if (oCM) {
				var oProperty = this._getPropertyByName(sFieldPath);
				if (oProperty) {
					var oCondition = this._toInternal(oProperty, oXCondition);
					if (oCM.indexOf(sFieldPath, oCondition) >= 0) {
						oCM.removeCondition(sFieldPath, oCondition);
					}
				}
			}
		}.bind(this));

	};

	FilterBar.prototype.addCondition = function(sFieldPath, oXCondition) {

		return this.waitForInitialization().then(function() {
			var oCM = this._getConditionModel();
			if (oCM) {
				var oProperty = this._getPropertyByName(sFieldPath);
				if (oProperty) {
					var oCondition = this._toInternal(oProperty, oXCondition);
					if (oCM.indexOf(sFieldPath, oCondition) < 0) {
						var aCondition = [{sFieldPath: oProperty}];
						StateUtil.checkConditionOperatorSanity(aCondition); //check if the single condition's operator is valid
						if (aCondition && aCondition.length > 0){
							oCM.addCondition(sFieldPath, oCondition);
						}
					}
				}
			}
		}.bind(this));

	};


	/**
	 * Assigns conditions to the inner condition model.
	 * This method is only called for filling the in parameters for value help scenarios.
	 * @protected
	 * @param {map} mConditions A map containing the conditions
	 */
	FilterBar.prototype.setConditions = function(mConditions) {
		var oModel = this._getConditionModel();
		if (oModel) {
			oModel.setConditions(mConditions);
		}
	};

	FilterBar.prototype._setXConditions = function(aConditionsData, bRemoveBeforeApplying) {
		var oProperty, aConditions, oConditionModel = this._getConditionModel();

		if (bRemoveBeforeApplying) {
			oConditionModel.removeAllConditions();
		}

		if (aConditionsData) {
			for ( var sFieldPath in aConditionsData) {
				aConditions = aConditionsData[sFieldPath];

				oProperty = this._getPropertyByName(sFieldPath);
				if (oProperty) {

					if (aConditions.length === 0) {
						oConditionModel.removeAllConditions(sFieldPath);
					} else {
						/* eslint-disable no-loop-func */
						aConditions.forEach(function(oCondition) {
							if (oProperty.maxConditions !== -1) {
								oConditionModel.removeAllConditions(sFieldPath);
							}

							var oNewCondition = this._toInternal(oProperty, oCondition);
							oConditionModel.addCondition(sFieldPath, oNewCondition);
						}.bind(this));
						/* eslint-enabled no-loop-func */
					}
				}
			}
		}
	};

	FilterBar.prototype._storeChanges = function(aChanges) {
		if (aChanges && aChanges.length) {
			var bHasVariantManagement = FlexRuntimeInfoAPI.hasVariantManagement({element: this});

			try {

				ControlPersonalizationWriteAPI.add({
					changes: aChanges,
					ignoreVariantManagement: !bHasVariantManagement
				});
			} catch (ex) {
				Log.error("error while saving changes - " + ex.message);
			}
		}
	};


	FilterBar.prototype._getRequiredPropertyNames = function() {
		var aReqFilterNames = [];

		this._getNonHiddenPropertyInfoSet().forEach(function(oProperty) {
			if (oProperty.required) {
				aReqFilterNames.push(IdentifierUtil.getPropertyKey(oProperty));
			}
		});

		return aReqFilterNames;
	};


	FilterBar.prototype._getNonRequiredPropertyNames = function() {
		var aNonReqFilterNames = [];

		this._getNonHiddenPropertyInfoSet().forEach(function(oProperty) {
			if (!oProperty.required) {
				aNonReqFilterNames.push(IdentifierUtil.getPropertyKey(oProperty));
			}
		});

		return aNonReqFilterNames;
	};

	FilterBar.prototype._insertFilterFieldtoContent = function(oFilterItem, nIdx) {

		if (!FilterItemLayout) {
			return;
		}

		var oLayoutItem = new FilterItemLayout();
		oLayoutItem.setFilterField(oFilterItem);

		this._oFilterBarLayout.insertContent(oLayoutItem, nIdx);
	};

	FilterBar.prototype._filterItemInserted = function(oFilterField) {

		if (!oFilterField.getVisible()) {
			return;
		}

		if (oFilterField.setWidth) {
			oFilterField.setWidth("");
		}

		this._applyFilterItemInserted(oFilterField);
	};

	FilterBar.prototype._applyFilterItemInserted = function(oFilterField) {
		var nIndex, iIndex;

		iIndex = this.indexOfAggregation("filterItems", oFilterField);
		if (this.getAggregation("basicSearchField")) {
			iIndex++;
		}

		nIndex = iIndex;
		var aFilterFields = this.getFilterItems();
		for (var i = 0; i < nIndex; i++) {
			if (!aFilterFields[i].getVisible()) {
				iIndex--;
			}
		}

		this._insertFilterFieldtoContent(oFilterField, iIndex);

		if (!this._oObserver.isObserved(oFilterField, {properties: ["visible"]})) {
			this._oObserver.observe(oFilterField, {properties: ["visible"]});
		}
	};

	FilterBar.prototype._filterItemRemoved = function(oFilterItem) {
		this._applyFilterItemRemoved(oFilterItem.getFieldPath());
	};

	FilterBar.prototype._applyFilterItemRemoved = function(sFieldPath) {
		this._removeFilterFieldFromContentByName(sFieldPath);
	};

	FilterBar.prototype._removeFilterFieldFromContent = function(oFilterItem) {
		this._removeFilterFieldFromContentByName(oFilterItem.getFieldPath());
	};

	FilterBar.prototype._removeFilterFieldFromContentByName = function(sFieldPath) {
		var oLayoutItem = this._getFilterItemLayoutByName(sFieldPath);

		if (oLayoutItem) {
			this._oFilterBarLayout.removeContent(oLayoutItem);
			oLayoutItem.destroy();
		}
	};

	FilterBar.prototype._observeChanges = function(oChanges) {

		if (oChanges.type === "aggregation" && oChanges.name === "filterItems") {

			switch (oChanges.mutation) {
				case "insert":
					oChanges.child.attachChange(this._handleFilterItemChanges, this);
					this._filterItemInserted(oChanges.child);
					break;
				case "remove":
					oChanges.child.detachChange(this._handleFilterItemChanges, this);
					this._filterItemRemoved(oChanges.child);
					break;
				default:
					Log.error("operation " + oChanges.mutation + " not yet implemented");
			}
		} else if (oChanges.type === "property") {
			var oFilterField;

			if (oChanges.object.isA && oChanges.object.isA("sap.ui.mdc.FilterField")) { // only visible is considered
				oFilterField = oChanges.object; //this._getFilterField(oChanges.object.getFieldPath());
				if (oFilterField) {
					if (oChanges.current) {
						this._filterItemInserted(oFilterField);
					} else {
						this._filterItemRemoved(oFilterField);
					}

					this._oFilterBarLayout.rerender();
				}
			}
		}
	};

	FilterBar.prototype._getFilterItemLayout = function(oFilterField) {
		return this._getFilterItemLayoutByName(oFilterField.getFieldPath());
	};
	FilterBar.prototype._getFilterItemLayoutByName = function(sFieldPath) {
		var oFilterItemLayout = null;

		this._oFilterBarLayout.getContent().some(function(oItemLayout) {
			if (oItemLayout._getFieldPath() === sFieldPath) {
				oFilterItemLayout = oItemLayout;
			}

			return oFilterItemLayout !== null;
		});

		return oFilterItemLayout;
	};

	FilterBar.prototype._getFilterField = function(sName) {
		var oFilterField = null;
		this.getFilterItems().some(function(oFilterItem) {
			if (oFilterItem && oFilterItem.getFieldPath && (oFilterItem.getFieldPath() === sName)) {
				oFilterField = oFilterItem;
			}

			return oFilterField !== null;
		});

		return oFilterField;
	};


	FilterBar.prototype._retrieveMetadata = function() {

		if (this._oMetadataAppliedPromise) {
			return this._oMetadataAppliedPromise;
		}

		this._fResolveMetadataApplied = undefined;
		this._oMetadataAppliedPromise = new Promise(function(resolve) {
			this._fResolveMetadataApplied = resolve;
		}.bind(this));


		Promise.all([ this._initializeProvider()]).then(function(aArgs) {

			if (!this._bIsBeingDestroyed) {

				this._oDelegate = aArgs[0];
				this._aProperties = [];

				if (this._oDelegate && this._oDelegate.fetchProperties) {
					try {
						this._oDelegate.fetchProperties(this).then(function(aProperties) {
							this._aProperties = aProperties;
							this._fResolveMetadataApplied();
						}.bind(this), function(sMsg) {
							Log.error(sMsg);
							this._fResolveMetadataApplied();
						}.bind(this));
					} catch (ex) {
						Log.error("Exception during fetchProperties occured: " + ex.message);
						this._fResolveMetadataApplied();
					}
				} else {
					Log.error("Provided delegate '" + this.getDelegate().path + "' not valid.");
					this._fResolveMetadataApplied();
				}
			}
		}.bind(this));

		return this._oMetadataAppliedPromise;
	};

	FilterBar.prototype.setBasicSearchField = function(oBasicSearchField) {

		var oOldBasicSearchField = this.getAggregation("basicSearchField");
		if (oOldBasicSearchField) {
			this._removeFilterFieldFromContent(oOldBasicSearchField);
		}

		this.setAggregation("basicSearchField", oBasicSearchField);

		if (oBasicSearchField) {

			if (!this._oObserver.isObserved(oBasicSearchField, {properties: ["visible"]})) {
				this._oObserver.observe(oBasicSearchField, {properties: ["visible"]});
			}

			this._insertFilterFieldtoContent(oBasicSearchField, 0);
		}

		return this;
	};


	FilterBar.prototype.getPropertyInfoSet = function() {
		return this._aProperties || [];
	};

	FilterBar.prototype._getNonHiddenPropertyInfoSet = function() {
		var aVisibleProperties = [];
		this.getPropertyInfoSet().every(function(oProperty) {
			if (!oProperty.hiddenFilter) {

				if (IdentifierUtil.getPropertyKey(oProperty) !== "$search") {
					aVisibleProperties.push(oProperty);
				}
			}

			return true;
		});

		return aVisibleProperties;
	};


	FilterBar.prototype._getNonHiddenPropertyByName = function(sName) {
		var oProperty = null;
		this._getNonHiddenPropertyInfoSet().some(function(oProp) {
			if (IdentifierUtil.getPropertyKey(oProp) === sName) {
				oProperty = oProp;
			}

			return oProperty != null;
		});

		return oProperty;
	};

	FilterBar.prototype._getPropertyByName = function(sName) {
		var oProperty = null;
		this.getPropertyInfoSet().some(function(oProp) {
			if (IdentifierUtil.getPropertyKey(oProp) === sName) {
				oProperty = oProp;
			}

			return oProperty != null;
		});

		return oProperty;
	};

	FilterBar.prototype._cleanUpFilterFieldsinErrorState = function() {

		var aFilterFields = this.getFilterItems();
		aFilterFields.forEach( function(oFilterField) {

			//cleanup fields in error state
			if (oFilterField.getRequired() && (oFilterField.getValueState() !== ValueState.None)) {
				oFilterField.setValueState(ValueState.None);
			}
		});
	};

	FilterBar.prototype.applyConditionsAfterChangesApplied = function() {
		if (this._isChangeApplying()) {
			return;
		}
		this._bIgnoreChanges = true;

		//clean-up fields in error state
		this._cleanUpFilterFieldsinErrorState();

		// Wait until all changes have been applied
		this._oFlexPromise = FlexRuntimeInfoAPI.waitForChanges({element: this});

		Promise.all([this._oFlexPromise, this._oInitialFiltersAppliedPromise, this._oMetadataAppliedPromise]).then(function(vArgs) {

			this._oFlexPromise = null;
			this._changesApplied();

		}.bind(this));
	};

	FilterBar.prototype._suspendBinding = function(oFilterField) {

		if (oFilterField) {
			var oBinding = oFilterField.getBinding("conditions");
			if (oBinding) {
				if (!this._aBindings) {
					this._aBindings = [];
				}
				oBinding.suspend();
				this._aBindings.push(oFilterField);
			}
		}
	};

	FilterBar.prototype._resumeBindings = function() {
		if (this._aBindings) {
			this._aBindings.forEach(function(oFilterField) {
				if (!oFilterField.bIsDestroyed) {
					var oBinding = oFilterField.getBinding("conditions");
					if (oBinding) {
						oBinding.resume();
					}
				}
			});

			this._aBindings = null;
		}
	};


	FilterBar.prototype._isChangeApplying = function() {
		return  !!this._oFlexPromise;
	};

	FilterBar.prototype._applyInitialFilterConditions = function() {

		this._bIgnoreChanges = true;

		this._applyFilterConditionsChanges();

		this._changesApplied();
		this._fResolveInitialFiltersApplied();
	};

	FilterBar.prototype._applyFilterConditionsChanges = function() {

		var aConditionsData;

		var mSettings = this.getProperty("filterConditions");
		if (Object.keys(mSettings).length > 0) {

			aConditionsData = merge([], mSettings);
			this._setXConditions(aConditionsData, true, true);
		}
	};


	FilterBar.prototype._changesApplied = function() {

		this._bIgnoreChanges = false;

		this._reportModelChange();
	};

	FilterBar.prototype._getView = function() {
		return IdentifierUtil.getView(this);
	};

	/**
	 * Returns an array of model filter instances.
	 *
	 * @public
	 * @returns {sap.ui.model.Filter[]} Array containing model filters or empty.
	 */
	FilterBar.prototype.getFilters = function() {
		var fConvertCallback = function(oCondition, sFilterPath, oDataType, oProposedFilter) {
			Log.info("FilterConverterCallback", "convert '" + sFilterPath + "' into Filter. Values=" + oCondition.values.toString());
			// can be used to change the conversion of a single condition
			// This callback only make sense when the filterbar is not internal converting the conditions into filters. We should return the conditions and use the filterConverter outside the filterbar.
			//
			// if (sFilterPath === "title" && oCondition.operator === "EMPTY") {
			// 	var oOperator = FilterOperatorUtil.getOperator(oCondition.operator);
			// 	// you can not create and/or modify the condition or filter....
			// 	var oFilter = oOperator.getModelFilter(oCondition, sFilterPath, oDataType);
			// 	return oFilter;
			// }
			return oProposedFilter;
		};

		if (!this._getConditionModel()) {
			return [];
		}
		var oConditions = this._getConditionModel().getAllConditions(undefined /* ["title", "createdAt"] */);
		var oConditionTypes = FilterConverter.createConditionTypesMapFromFilterBar( oConditions, this);
		return FilterConverter.createFilters( oConditions, oConditionTypes, fConvertCallback);
	};

	/**
	 * Returns the value of the basic search condition.
	 *
	 * @public
	 * @returns {string} Value of search condition or empty
	 */
	FilterBar.prototype.getSearch = function() {
		var aSearchConditions = this._getConditionModel() ? this._getConditionModel().getConditions("$search") : [];
		return aSearchConditions[0] ? aSearchConditions[0].values[0] : "";
	};

	FilterBar.prototype.exit = function() {

		Control.prototype.exit.apply(this, arguments);

		this._clearDelayedSearch();

		this._oFilterBarLayout = null;
		this._btnAdapt = undefined;
		this._btnSearch = undefined;

		this._oRb = null;

		if (this._oModel) {
			this._oModel.destroy();
			this._oModel = null;
		}

		if (this._oAdaptationController) {
			this._oAdaptationController.destroy();
			this._oAdaptationController = null;
		}

		if (this._oConditionModel) {
			this._oConditionModel.detachPropertyChange(this._handleConditionModelPropertyChange, this);
			this._oConditionModel.destroy();
			this._oConditionModel = null;
		}

		this._oObserver.disconnect();
		this._oObserver = undefined;

		if (this._oDelegate && this._oDelegate.cleanup) {
			this._oDelegate.cleanup(this);
		}

		this._oDelegate = null;
		this._aProperties = null;

		this._oFlexPromise = null;

		this._fResolveMetadataApplied = undefined;
		this._oMetadataAppliedPromise = null;

		this._fResolveInitialFiltersApplied = undefined;
		this._oInitialFiltersAppliedPromise = null;

		this._fResolveSearchPromis = undefined;
		this._oSearchPromise = null;

		this._aBindings = null;
	};

	return FilterBar;

});
