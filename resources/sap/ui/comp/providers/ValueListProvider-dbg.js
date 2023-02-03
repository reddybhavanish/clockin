/*
 * ! SAPUI5

		(c) Copyright 2009-2020 SAP SE. All rights reserved
	
 */

// -----------------------------------------------------------------------------
// Retrieves the data for a value list from the OData metadata to bind to a given control/aggregation
//
// -----------------------------------------------------------------------------
sap.ui.define([
	'sap/ui/core/library', 'sap/ui/comp/library', 'sap/m/library', 'sap/ui/comp/odata/MetadataAnalyser', 'sap/ui/core/SeparatorItem', 'sap/m/GroupHeaderListItem', 'sap/m/Column', 'sap/m/ColumnListItem', 'sap/m/Text', 'sap/m/Token', './BaseValueListProvider', 'sap/ui/core/ListItem', 'sap/ui/model/Filter', 'sap/ui/model/Sorter', 'sap/ui/model/json/JSONModel', 'sap/ui/model/FilterOperator', 'sap/ui/comp/util/FormatUtil', 'sap/ui/comp/smartfilterbar/FilterProvider', 'sap/ui/comp/historyvalues/HistoryValuesProvider', 'sap/ui/comp/historyvalues/HistoryOptOutProvider', 'sap/ui/comp/historyvalues/Constants', 'sap/m/ComboBox', 'sap/m/MultiComboBox', 'sap/base/util/deepEqual', 'sap/ui/Device', 'sap/base/Log', 'sap/base/util/values'
], function(coreLibrary, library, mLibrary, MetadataAnalyser, SeparatorItem, GroupHeaderListItem, Column, ColumnListItem, Text, Token, BaseValueListProvider, ListItem, Filter, Sorter, JSONModel, FilterOperator, FormatUtil, FilterProvider, HistoryValuesProvider, HistoryOptOutProvider, HistoryConstants, ComboBox, MultiComboBox, deepEqual, Device, Log, values) {
	"use strict";

	// shortcut for sap.ui.comp.smartfilterbar.DisplayBehaviour
	var DisplayBehaviour = library.smartfilterbar.DisplayBehaviour;

	// shortcut for sap.m.PopinDisplay
	var PopinDisplay = mLibrary.PopinDisplay;

	var WrappingType = mLibrary.WrappingType;

	// shortcut for sap.ui.core.ValueState
	var ValueState = coreLibrary.ValueState;

	var HEADER_GROUPS = {
		Recommendations: 10,
		RecentlyUsed: 20,
		Others: 30
	};
	var SUGGESTIONS_MODEL_NAME = "list";

	/**
	 * Retrieves the data for a collection from the OData metadata to bind to a given control/aggregation
	 *
	 * @constructor
	 * @experimental This module is only for internal/experimental use!
	 * @public
	 * @param {object} mParams - map containing the control,aggregation,annotation and the oODataModel
	 * @param {string} mParams.aggregation - name of the control aggregation which shows the value list (items or suggestRows)
	 * @param {boolean} mParams.typeAheadEnabled - enable typeAhead (default false)
	 * @param {boolean} [mParams.enableShowTableSuggestionValueHelp] - makes the Show More on the suggest drop down visible (default true)
	 * @param {} mParams.dropdownItemKeyType - type of the suggest item key part
	 * @param {} mParams.deferredGroupId
	 * @param {string} [mParams.context] context for which ValueListProvider is initiated. For example: "SmartFilterBar", "SmartField", "ValueHelp" ...
	 * @author SAP SE
	 */
	var ValueListProvider = BaseValueListProvider.extend("sap.ui.comp.providers.ValueListProvider", {
		constructor: function(mParams) {
			if (!FilterProvider) {
				FilterProvider = sap.ui.require("sap/ui/comp/smartfilterbar/FilterProvider"); // because of cycle in define
			}

			if (mParams) {
				this.sAggregationName = mParams.aggregation;
				this.bTypeAheadEnabled = !!mParams.typeAheadEnabled;
				this.bEnableShowTableSuggestionValueHelp = mParams.enableShowTableSuggestionValueHelp === undefined ? true : mParams.enableShowTableSuggestionValueHelp;
				this.dropdownItemKeyType = mParams.dropdownItemKeyType;
				this.sDeferredGroupId = mParams.deferredGroupId;
				this.sContext = mParams.context;

			}
			this._aRecommendations = [];
			this._oRecommendationListPromise = Promise.resolve();
			this._oResourceBundle = sap.ui.getCore().getLibraryResourceBundle("sap.ui.comp");
			this._groupHeaderFactory = this._groupHeaderFactory.bind(this);

			BaseValueListProvider.apply(this, arguments);
			this._onInitialise();
		}
	});


	/**
	 * Initialise the relevant stuff
	 *
	 * @private
	 */
	ValueListProvider.prototype._onInitialise = function() {
		if (!this.bTypeAheadEnabled) {

			/**
			 * Delay the fetch of data for standard dropdowns until the rendering is done! This inherently causes only the relevant data to be fetched
			 * from the backend!
			 */
			this.oAfterRenderingEventDelegate = {
				onAfterRendering: this._onMetadataInitialised
			};
			this.oControl.addEventDelegate(this.oAfterRenderingEventDelegate, this);

		} else if (this.oControl.attachSuggest) {

			// Check if Suggest is supported by the control
			this._fSuggest = function(oEvent) {
				this.oControl = oEvent.getSource();
				if (!this.bInitialised) {
					return;
				}
				if (!this._oTemplate || !this.oControl.data("_hassuggestionTemplate")) {
					this._createSuggestionTemplate();
				}
				var sSearchText = oEvent.getParameter("suggestValue");
				this._fetchData(sSearchText);
			}.bind(this);
			this.oControl.attachSuggest(this._fSuggest);

			if (!this.oFilterModel) {
				var that = this;

				// store original reference to the ManagedObject.prototype.setParent() method
				var fnSetParent = this.oControl.setParent;

				// decorate the .setParent() method of the this.oControl control instance to detect when the control is removed
				// from the control tree
				this.oControl.setParent = function(oNewParent, sAggregationName, bSuppressInvalidate) {

					// get the current parent
					var oOldParent = this.getParent();

					// call the ManagedObject.prototype.setParent() method with the same arguments passed to this function
					var oReturn = fnSetParent.apply(this, arguments);

					// get the possible new parent
					oNewParent = this.getParent();

					var bAggregationChanged = !(oNewParent && (oOldParent === null));

					// unbind the aggregation only if the parent changes
					if ((oNewParent !== oOldParent) && bAggregationChanged) {
						that.unbindAggregation();
					}

					return oReturn;
				};
			}

			this._handleSelect();
		}

		this.oControl.setModel(new JSONModel(), SUGGESTIONS_MODEL_NAME);
		this._setupHistoryValues();
		this._setupRecommendations();
	};

	/**
	 * Metadata is available --> Initialise the relevant stuff
	 *
	 * @private
	 */
	ValueListProvider.prototype._onMetadataInitialised = function() {
		if (this.bInitialised) {

			if (this.oAfterRenderingEventDelegate) {
				this.oControl.removeEventDelegate(this.oAfterRenderingEventDelegate);
			}

			if (this.oPrimaryValueListAnnotation) {
				if (this.sAggregationName && this.sAggregationName == "suggestionRows") {
					this._createSuggestionTemplate();
				} else {
					this._createDropDownTemplate();
				}
				this._fetchData();

				// add handler for fixed-values with InOut Parameters
				if (this._isControlDropdown()) {
					if (this.mOutParams && Object.keys(this.mOutParams).length > 1) {
						this._handleOutParameters();
					}
					if (this.mInParams && Object.keys(this.mInParams).length > 1) {
						this._handleInParameters();
					}
				}
			} else {
				Log.error("ValueListProvider", "Missing primary ValueListAnnotation for " + (this._sFullyQualifiedFieldName || this.sFieldName));
			}

			if (this.oAfterRenderingEventDelegate) {
				delete this.oAfterRenderingEventDelegate;
			}
		}
	};

	ValueListProvider.prototype._onAnnotationLoad = function (mValueList) {
		BaseValueListProvider.prototype._onAnnotationLoad.call(this, mValueList);

		if (this._shouldHaveRecommendations() || this._shouldHaveHistory()) {
			this._bindInnerControlSuggestions();
			this._setupSuggestionInteractions();
		}
	};

	ValueListProvider.prototype._isSortable = function(sName) {
		if (this.oPrimaryValueListAnnotation) {
			for (var i = 0; i < this.oPrimaryValueListAnnotation.valueListFields.length; i++) {
				if (this.oPrimaryValueListAnnotation.valueListFields[i].name === sName) {
					return this.oPrimaryValueListAnnotation.valueListFields[i].sortable !== false;
				}
			}

			return false;
		}

		return false;
	};

	/**
	 * Creates a template for drop down fields
	 *
	 * @private
	 */
	ValueListProvider.prototype._createDropDownTemplate = function() {
		this._oTemplate = new ListItem({
			key: {
				path: this._resolveSuggestionBindingPath(this.sKey),
				type: this.dropdownItemKeyType
			},
			text: {
				parts: [
					{
						path: this._resolveSuggestionBindingPath(this.sKey),
						type: this.dropdownItemKeyType
					}, {
						path: this._resolveSuggestionBindingPath(this.sDescription)
					}
				],
				formatter: FormatUtil.getFormatterFunctionFromDisplayBehaviour(this.sDDLBDisplayBehaviour)
			}
		});

		if (this._oRecommendationListAnnotation) {
			this._oTemplate.bindProperty("additionalText", {
				path: this._resolveSuggestionBindingPath(this._oRecommendationListAnnotation.rankProperty)
			});
		}

		this._oSorter = null;

		// ComboBox/MultiComboBox:
		// Sort based on key if displayBehaviour is based on id
		if (this.sDDLBDisplayBehaviour === DisplayBehaviour.idOnly || this.sDDLBDisplayBehaviour === DisplayBehaviour.idAndDescription) {

			if (this._isSortable(this.sKey)) {
				this._oSorter = new Sorter(this.sKey);
			}
		} else {
			// Sort based on description by default
			if (this._isSortable(this.sDescription)) {
				this._oSorter = new Sorter(this.sDescription);
			} else if ((this.sDescription !== this.sKey) && this._isSortable(this.sKey)) {
				this._oSorter = new Sorter(this.sKey);
			}
		}
	};

	/**
	 * Creates a template for multi-column suggest
	 *
	 * @private
	 */
	ValueListProvider.prototype._createSuggestionTemplate = function() {
		var i = 0, iLen = 0, fSuggestWidth = 0,
			aCols = this._aHighImportanceCols || this._aRecommendationCols || this._aCols;
		// Create a template
		this._oTemplate = new ColumnListItem();
		if (aCols) {
			// remove any exiting columns
			this.oControl.removeAllSuggestionColumns();
			iLen = aCols.length;
			for (i = 0; i < iLen; i++) {
				var bDemandPopin = false, sMinScreenWidth = "1px", sWidth = aCols[i].width;
				// In the phone mode don't set a fixed width for columns;
				// instead enable demand popin when there are over 2 columns, and not enough space
				if (Device.system.phone) {
					sWidth = undefined;
					if (i >= 2) {
						bDemandPopin = true;
						sMinScreenWidth = (i + 1) * 10 + "rem";
					}
				}
				// add Column headers
				this.oControl.addSuggestionColumn(new Column({
					header: new Text({
						wrapping: true,
						wrappingType: WrappingType.Hyphenated,
						text: aCols[i].label
					}),
					demandPopin: bDemandPopin,
					popinDisplay: PopinDisplay.Inline,
					minScreenWidth: sMinScreenWidth,
					width: sWidth
				}));

				// Add cells to the template
				this._oTemplate.addCell(new Text({
					wrapping: true,
					text: {
						path: this._resolveSuggestionBindingPath(aCols[i].template),
						type: aCols[i].oType
					}
				}));

				// we calculate the sum of all columns width (assumption is that the sWidth is always given in em)
				if (sWidth) {
					fSuggestWidth += parseFloat(sWidth.substring(0, sWidth.length - 2));
				}
			}

			// set the total width of all columns as Width for the suggest popover.
			// Add a small delta based on number of columns since there seems to be a padding added for some browsers
			if (fSuggestWidth > 0) {
				// BCP: 1770294638
				// this.oControl.setMaxSuggestionWidth(fSuggestWidth + iLen + "em");
				this.oControl.setProperty('maxSuggestionWidth', fSuggestWidth + iLen + "em", true);
			}
		}
		this.oControl.data("_hassuggestionTemplate", true);
	};

	/**
	 * @private
	 */
	ValueListProvider.prototype._handleRowSelect = function(oDataModelRow, fCallback) {
		var sKey, sText, oToken;
		if (oDataModelRow) {
			sKey = oDataModelRow[this.sKey];
			sText = oDataModelRow[this.sDescription];
		}
		// Key found
		if (sKey || (sKey === "")) {
			// MultiInput field --> Create a token with the selected key
			if (this.oControl.addToken) {
				// Format the text as per the displayBehaviour
				sText = FormatUtil.getFormattedExpressionFromDisplayBehaviour(this.sTokenDisplayBehaviour, sKey, sText);
				oToken = new Token();
				oToken.setKey(sKey);
				oToken.setText(sText);
				oToken.setTooltip(sText);
				oToken.data("row", oDataModelRow);
				if (fCallback) {
					fCallback(oToken);
				}

				// BCP: 1980361768 Upon creating the token from suggest sometimes the model binding is not updated when
				// the element in the suggest is highlighted and than the focus moves -> a token is created but the value
				// in the model is not reset to an empty string. By setting the value again in this case we force the
				// control to update the model.
				// Note: This should be removed only when the issue is fully resolved by the MultiInput control.
				if (this.oControl.getValue() === "") {
					this.oControl.setValue("");
				}

				// Clear the ValidationText
				delete this.oControl.__sValidationText;
			} else {
				// normal input field --> just set the value
				this.oControl.setValue(sKey);
				// Manually trigger the change event on sapUI5 control since it doesn't do this internally on setValue!
				this.oControl.fireChange({
					value: sKey,
					validated: true
				});
			}
		}
		// do this last --> since when used in an aggregation - some model updates (setting IN/OUT params to ODataModel) destroy this
		// instance/control!
		this._calculateAndSetFilterOutputData([
			oDataModelRow
		]);

	};

	/**
	 * @private
	 */
	ValueListProvider.prototype._multiInputValidator = function(oData) {
		if (!this.bInitialised) {
			return;
		}

		// queue the validator calls
		if (this._aValidators) {
			var oToken;
			this._aValidators.some(function(fValidator) {
				oToken = fValidator(oData);
				return oToken;
			}, this);

			if (oToken) {
				return oToken;
			}
		}

		var oRow = oData.suggestionObject, oDataModelRow, sInput = oData.text;
		// Selection via suggestion row --> no round trip needed
		if (oRow) {
			// Get the actual datamodel row
			// BCP: 0020751294 0000254992 2019
			// because the this.oOdataModel instance can be old and the controls has a different model attached,
			// we always have to fetch the Data from the current model attached to the control/row.
			var sModelName = this._getSuggestionsModelName(),
				oBindingContext = oRow.getBindingContext(sModelName);
			oDataModelRow = oBindingContext.getObject();
			this._handleRowSelect(oDataModelRow, oData.asyncCallback);
		} else if (sInput) {
			// Validation required from backend
			this._validateInput(sInput, oData.asyncCallback);
		}
	};

	/**
	 * @private
	 */
	ValueListProvider.prototype._validateInput = function (sInput, fAsyncCallback) {
		var aFilters = [],
			oControl = this.oControl,
			mParams;

		// Check if input needs to be converted to upper case
		if (this.sDisplayFormat === "UpperCase") {
			sInput = sInput.toUpperCase();
		}

		// Check if the entered input text is same as the ValidationText
		if (oControl.__sValidationText !== sInput) {
			// Store the input as Validation text
			oControl.__sValidationText = sInput;

			if (sInput === this._truncateSearchText(sInput)) {
				// Set flag to indicate token validation is in progress
				oControl.__bValidatingToken = true;
				this._calculateFilterInputData();
				if (this.mFilterInputData && this.aFilterField) {
					aFilters = FilterProvider.generateFilters(this.aFilterField, this.mFilterInputData);
				}

				aFilters.push(new Filter(this.sKey, FilterOperator.EQ, sInput));
				if (this.bSupportBasicSearch) {
					mParams = {
						"search-focus": this.sKey
					};
				}
				this.oODataModel.read("/" + this.sValueListEntitySetName, {
					filters: aFilters,
					urlParameters: mParams,
					success: function(oResponseData) {

						if (!this.oControl || !this.oControl.hasOwnProperty("__bValidatingToken")) {
							// ignore the result completely
							return;
						}
						var oResultRow = oResponseData;
						// first remove the token validation flag
						delete this.oControl.__bValidatingToken;
						if (oResponseData) {
							// Check if result has rows
							if (oResponseData.results && oResponseData.results.length >= 1) {
								// handle response for creating tokens only if 1 unique result exists!
								if (oResponseData.results.length === 1) {
									oResultRow = oResponseData.results[0];
								}
								if (this.oControl.data("__validationError")) {
									this.oControl.data("__validationError", null);
									this.oControl.setValueState("None");
								}
							} else {
								this.oControl.setValueState("Error");
								this.oControl.data("__validationError", true);
							}
							// If returned row has the key do the selection!
							if (oResultRow && oResultRow[this.sKey]) {
								this._handleRowSelect(oResultRow, fAsyncCallback);
							}
						}
						// Trigger after token validation handling
						this._afterTokenValidate();
					}.bind(this),
					error: function() {
						// Clear previous validation error state if current validation fails!
						if (this.oControl.data("__validationError")) {
							this.oControl.setValueState("None");
						}
						// Remove the token validation flag
						delete this.oControl.__bValidatingToken;
						// Trigger after token validation handling
						this._afterTokenValidate();
					}.bind(this)
				});
			}
		} else {
			// Re-set the error state if same value is entered again!
			if (oControl.data("__validationError")) {
				oControl.setValueState(ValueState.Error);
			}
		}
	};

	/**
	 * This method is used to validate string single field with value list
	 * @private
	 */
	ValueListProvider.prototype._validateStringSingleWithValueList = function (oEvent) {
		var sValue;

		// In case the event object is already validated (from suggest row) we don't do any further validation
		if (oEvent.getParameter("validated")) {
			return;
		}

		// In case the value is equal to empty string or it is undefined we don't do any further validation
		sValue = oEvent.getParameter("value");
		if (sValue === "" || sValue === undefined) {
			return;
		}

		this._validateInput(sValue);
	};

	/**
	 * @private
	 */
	ValueListProvider.prototype._afterTokenValidate = function() {
		// trigger search on the SmartFilter if search was pending
		if (this.oFilterProvider && this.oFilterProvider._oSmartFilter && this.oFilterProvider._oSmartFilter.bIsSearchPending && this.oFilterProvider._oSmartFilter.search) {
			if (this.oFilterProvider._oSmartFilter.getLiveMode && this.oFilterProvider._oSmartFilter.getLiveMode()) {
				return;
			}

			this.oFilterProvider._oSmartFilter.search();
		}
	};

	/**
	 * @private
	 */
	ValueListProvider.prototype._onSuggestionItemSelected = function(oEvent) {
		var oRow = oEvent.getParameter("selectedRow");
		// MultiColumn Suggest
		if (oRow) {
			// Get the actual data model row
			var sModelName = this._getSuggestionsModelName();
			this._handleRowSelect(oRow.getBindingContext(sModelName).getObject());
		}
	};

	ValueListProvider.prototype._setFilterOutputDataFromSelectedRow = function(oRow) {
		var sModelName, oBindingContext, oDataModelRow;
		if (oRow) {
			// Get the actual data model row
			sModelName = this._getSuggestionsModelName();
			oBindingContext = oRow.getBindingContext(sModelName);
			oDataModelRow = oBindingContext.getObject();
			this._calculateAndSetFilterOutputData([
				oDataModelRow
			]);
		}
	};

	/**
	 * Called when MultiComboBox selectionChange is fired to handle Out parameters
	 * @private
	 */
	ValueListProvider.prototype._onMultiComboBoxItemSelected = function(oEvent) {

		// For MultiComboBox when item is deselected do not set filter output data
		if (!oEvent.getParameter("selected")) {
			return;
		}

		var oRow = oEvent.getParameter("changedItem");

		this._setFilterOutputDataFromSelectedRow(oRow);
	};

	/**
	 * Called when ComboBox change event is fired to handle Out parameters
	 * @private
	 */
	ValueListProvider.prototype._onComboBoxItemSelected = function(oEvent) {
		var sValue = oEvent.getParameter("value"),
			sNewValue = oEvent.getParameter("newValue"),
			sFilterChangeReason = oEvent.getParameter("filterChangeReason");

		// When ComboBox is used in SmartFilterBar, the Change event is fired by the SelectionChange event in FIlterProvider
		// In that case do not set filter output data
		if (sFilterChangeReason && !sValue && !sNewValue) {
			return;
		}

		var oRow = this.oControl.getSelectedItem();

		this._setFilterOutputDataFromSelectedRow(oRow);
	};

	/**
	 * Handle validation/selection of Item
	 *
	 * @private
	 */
	ValueListProvider.prototype._handleSelect = function() {
		// Selection handling has to be done manually for Multi-Column suggest!
		// add Validators --> Only available for Multi-Input
		if (this.oControl.addValidator) {
			this._aValidators = this.oControl._tokenizer ? this.oControl._tokenizer._aTokenValidators.slice() : [];
			this.oControl.removeAllValidators();

			this._fValidator = this._multiInputValidator.bind(this);
			this.oControl.addValidator(this._fValidator);
		} else if (this.oControl.attachSuggestionItemSelected) {
			// Single-Input --> just enable selection handling
			this.oControl.attachSuggestionItemSelected(this._onSuggestionItemSelected, this);

			// Attach validation against value list key
			if (this.sContext === "SmartFilterBar" &&
				this._fieldViewMetadata &&
				this._fieldViewMetadata.hasValueListAnnotation
			) {
				this.oControl.attachChange(this._validateStringSingleWithValueList, this);
			}
		}
		// custom result filter function for tabular suggestions - selection text;
		// the returned result will be shown on the input when the user uses the arrow key on suggest
		if (this.oControl.setRowResultFunction) {
			this.oControl.setRowResultFunction(function (oSelectedItem) {
				var oContext, sResult = "", sModelName = this._getSuggestionsModelName();
				if (oSelectedItem) {
					oContext = oSelectedItem.getBindingContext(sModelName);
				}
				if (oContext && this.sKey) {
					sResult = oContext.getProperty(this.sKey);
				}
				return sResult;
			}.bind(this));
		}
	};

	ValueListProvider.prototype._filterDropdownRowsByInParameters = function () {
		var aFilters = [];
		this._calculateFilterInputData();

		if (this.mFilterInputData && this.aFilterField) {
			this._bFiltering = true;

			aFilters = FilterProvider.generateFilters(this.aFilterField, this.mFilterInputData, {
				dateSettings: this._oDateFormatSettings
			});

			// Filter
			this.oControl.getBinding("items").filter(aFilters);

			// Cache last executed filters
			this._mLastFilterInputData = this.mFilterInputData;

			// Clean existing control selection
			this._cleanupControlSelection();
		}
	};

	ValueListProvider.prototype.isInSmartFilterBar = function () {
		return !!this.oFilterModel;
	};

	ValueListProvider.prototype._isControlDropdown = function (oControl) {
		if (!oControl) {
			oControl = this.oControl;
		}
		return !!(oControl.isA("sap.m.MultiComboBox") || oControl.isA("sap.m.ComboBox"));
	};

	ValueListProvider.prototype._cleanupControlSelection = function () {
		if (this.isInSmartFilterBar() &&
			this.oControl.isA("sap.m.MultiComboBox") &&
			this.mFilterInputData &&
			Object.keys(this.mFilterInputData).length !== 0) {

			// For MultiComboBox clear the model and selected keys, because when changing the In field,
			this.oFilterModel.setProperty("/" + this.sFieldName + "/items", []);
			this.oControl.setSelectedKeys(null);
		}
	};

	ValueListProvider.prototype._openDropdownWhenFiltered = function (oEvent) {
		// Handler to be executed after the filtering of the binding is done
		if (oEvent.getParameter("reason") === "filter") {
			this.oControl.getBinding("items").detachChange(this._openDropdownWhenFiltered, this);
			this.oControl.setBusy(false);

			this._bFiltering = false;

			if (this._bOpenControlWhenFiltered) {
				this._bOpenControlWhenFiltered = false;
				this._openDropdown();
			}
		}
	};

	ValueListProvider.prototype._openDropdown = function() {
		if (this.oControl.isA("sap.m.MultiComboBox")) {
			MultiComboBox.prototype.open.apply(this.oControl, arguments);
		} else if (this.oControl.isA("sap.m.ComboBox")) {
			ComboBox.prototype.open.apply(this.oControl, arguments);
		}
	};

	ValueListProvider.prototype._handleOutParameters = function() {
		if (this.oControl.isA("sap.m.MultiComboBox")) {
			this.oControl.attachSelectionChange(this._onMultiComboBoxItemSelected, this);
		} else if (this.oControl.isA("sap.m.ComboBox")) {
			// for ComboBox attach change instead of selectionChange, because selectionchange is called
			// each time when typing is finding a match among the items
			this.oControl.attachChange(this._onComboBoxItemSelected, this);
		}
	};

	ValueListProvider.prototype._handleInParameters = function() {

		// When toggle display/edit mode of the SmartField, control gets invalidated and filter is lost
		if (!this.isInSmartFilterBar() && this.oControl.getEditable()) {
			this.oControl.getParent().attachContextEditableChanged(function() {
				this._bControlIsFiltered = false;
			}, this);
		}

		this.oControl.setBusyIndicatorDelay(50);

		this.oControl.open = function () {
			if (this._bFiltering) {
				return;
			}

			this._calculateFilterInputData();

			// Prevent double filtering if the filter values have not changed
			if (deepEqual(this._mLastFilterInputData, this.mFilterInputData) && this._bControlIsFiltered) {
				this._openDropdown();
				return;
			}

			this.oControl.setBusy(true);
			this.oControl.getBinding("items").attachChange(this._openDropdownWhenFiltered, this);

			// Set the flag as upon successful event firing we should open the picker
			this._bOpenControlWhenFiltered = true;

			// Filter the drop down list
			this._filterDropdownRowsByInParameters();

			// Reset last editable mode
			this._bControlIsFiltered = true;
		}.bind(this);

		this.oControl.addEventDelegate({

			onmousedown: function (oEvent) {
				if (
					oEvent.target === this.oControl.getIcon().getFocusDomRef() // The focus target is the icon dom reference
				) {
					// We should skip filtering on focus in when the mouse down is in the icon dom reference
					this._bSkipFocusIn = true;
				}
			}.bind(this),

			onmouseup: function (oEvent) {
				if (
					this._bSkipFocusIn && // We had skipped the focus in event
					oEvent.target === this.oControl.getIcon().getFocusDomRef() // The focus target is the icon dom reference
				) {
					this.oControl.open();
				}
				this._bSkipFocusIn = false;
			}.bind(this),

			onfocusin: function (oEvent) {

				if (this._bSkipFocusIn || this._bFiltering) {
					return oEvent;
				}

				// Reset the flag upon pure focus in
				this._bOpenControlWhenFiltered = false;

				setTimeout(function () {

					this._calculateFilterInputData();

					// Prevent double filtering if the filter values have not changed
					if (deepEqual(this._mLastFilterInputData, this.mFilterInputData) && this._bControlIsFiltered) {
						return;
					}

					// set the busy state and attach the binding change handler
					this.oControl.setBusy(true);
					this.oControl.getBinding("items").attachChange(this._openDropdownWhenFiltered, this);

					// Filter the drop down list
					this._filterDropdownRowsByInParameters();
					this._bControlIsFiltered = true;
				}.bind(this));

				return oEvent;

			}.bind(this)

		});
	};

	/**
	 * This method requests data from all data sets (suggestion and recommendations and history values),
	 * than combine only the unique once and set them to a custom JSON model to which inner control is binded.
	 *
	 * @param {object} sSearchText - the optional search text
	 * @private
	 */
	ValueListProvider.prototype._fetchData = function (sSearchText) {
		var mParams = {},
			aFilters = [],
			length = this._getBindingLength(),
			sSearchTextTruncated = "",
			oValueListPromise;

		sSearchText = sSearchText || "";
		if (this.bTypeAheadEnabled) {
			// Convert search text to UpperCase if displayFormat = "UpperCase"
			if (sSearchText && this.sDisplayFormat === "UpperCase") {
				sSearchText = sSearchText.toUpperCase();
			}
			if (this.bSupportBasicSearch) {
				if (this._shouldHaveRecommendations() || this._shouldHaveHistory()) {
					mParams = {
						"search-focus": this.sKey,
						"search": sSearchText
					};
				} else {
					mParams.custom = {
						"search-focus": this.sKey,
						"search": sSearchText
					};
				}
			}
			this._calculateFilterInputData();
			if (this.mFilterInputData && this.aFilterField) {
				aFilters = FilterProvider.generateFilters(this.aFilterField, this.mFilterInputData, {
					dateSettings: this._oDateFormatSettings
				});
			}
			// If SearchSupported = false; create a $filter for the keyfield with a StartsWith operator for the typed in/search text
			if (!this.bSupportBasicSearch) {

				if (this._fieldViewMetadata && this._fieldViewMetadata.filterType === "numc") {
					aFilters.push(new Filter(this.sKey, FilterOperator.Contains, sSearchText));
				} else {
					sSearchTextTruncated = this._truncateSearchText(sSearchText);
					if (sSearchTextTruncated === sSearchText) {
						aFilters.push(new Filter(this.sKey, FilterOperator.StartsWith, sSearchTextTruncated));
					} else {
						this.oControl.closeSuggestions();
						return;
					}
				}
			}

			length = 10;
		}

		mParams["$top"] = length;
		mParams["$skip"] = 0;

		if (!this.sValueListEntitySetName) {
			Log.error("ValueListProvider", "Empty sValueListEntitySetName for " + this.sAggregationName + " binding! (missing primaryValueListAnnotation)");
		}

		if (this.sDeferredGroupId) {
			// notice according to documentation, of sap.ui.model.odata.v2.ODataListBinding, it really is called "batchGroupId" and not "groupId"
			mParams["batchGroupId"] = this.sDeferredGroupId;
		}

		if (this.aSelect && this.aSelect.length) {
			mParams["$select"] = this.aSelect.toString();
		}

		if (!(this._shouldHaveRecommendations() || this._shouldHaveHistory())) {
			if (this.bTypeAheadEnabled && this.bEnableShowTableSuggestionValueHelp) {
				// Hide the Show All Items button if the number if items is less than the length (restriction)
				var oEvents = {
					dataReceived: function(oEvent) {
						var oBinding = oEvent.getSource(), iBindingLength;
						if (oBinding) {
							iBindingLength = oBinding.getLength();
							if (iBindingLength && iBindingLength <= length) {
								this.oControl.setShowTableSuggestionValueHelp(false);
							} else {
								this.oControl.setShowTableSuggestionValueHelp(true);
							}
						}
					}.bind(this)
				};
			} else if (this.bTypeAheadEnabled) {
				// Hide the Show All Items as per configuration
				this.oControl.setShowTableSuggestionValueHelp(false);
			}

			this.oControl.bindAggregation(this.sAggregationName, {
				path: "/" + this.sValueListEntitySetName,
				length: length,
				parameters: mParams,
				filters: aFilters,
				sorter: this._oSorter,
				events: oEvents,
				template: this._oTemplate,
				templateShareable: true
			});

			return;
		}

		var that = this;
		oValueListPromise = new Promise(function (resolve, reject) {
			if (!that.sValueListEntitySetName) {
				resolve({ results: [] });
			}

			that.oODataModel.read("/" + that.sValueListEntitySetName, {
				urlParameters: mParams,
				filters: aFilters,
				sorters: that._oSorter && [that._oSorter],
				success: function (oData) {
					resolve(oData);
				},
				error: function (oData) {
					reject(oData);
				}
			});
		});

		var oHistoryPromise = Promise.resolve([]);

		if (this._shouldHaveHistory()) {
			oHistoryPromise = that._oHistoryValuesProvider.getFieldData();
		}

		Promise.all([oValueListPromise, this._oRecommendationListPromise, oHistoryPromise]).then(function (aResults) {
			var aData = [],
				aSuggestions = [],
				aRecommendations = [],
				aHistoryData = [],
				sModelName = that._getSuggestionsModelName(),
				oControl = that.oControl,
				oModel = oControl.getModel(sModelName);

			if (!oControl) {
				return;
			}

			if (Array.isArray(aResults[0] && aResults[0].results)) {
				aSuggestions = that._addSuggestionsToGroup(aResults[0].results, HEADER_GROUPS.Others);
			}

			if (Array.isArray(aResults[1] && aResults[1].results)) {
				aRecommendations = that._addSuggestionsToGroup(aResults[1].results, HEADER_GROUPS.Recommendations);
			}

			if (that._shouldHaveHistory() && Array.isArray(aResults[2])) {
				aHistoryData = that._addSuggestionsToGroup(aResults[2], HEADER_GROUPS.RecentlyUsed);
			}

			aData = aData.concat(aRecommendations).concat(aHistoryData).concat(aSuggestions);
			aData = that._getDistinctSuggestions(aData);

			that._showSuggestionsMoreButton(aSuggestions.length >= length);

			oModel.setData(aData);
		});
	};

	ValueListProvider.prototype._sortRecommendations = function (a, b) {
		var sRankPropertyName = this._oRecommendationListAnnotation.rankProperty,
			aRank = parseFloat(a[sRankPropertyName]),
			bRank = parseFloat(b[sRankPropertyName]);

		return bRank - aRank;
	};

	ValueListProvider.prototype._showSuggestionsMoreButton = function (bShow) {
		if (!this.bTypeAheadEnabled) {
			return;
		}

		if (this.bEnableShowTableSuggestionValueHelp) {
			// Hide the Show All Items button if the number if items is less than the length (restriction)
			this.oControl.setShowTableSuggestionValueHelp(bShow);
		} else {
			// Hide the Show All Items as per configuration
			this.oControl.setShowTableSuggestionValueHelp(false);
		}
	};

	ValueListProvider.prototype._addSuggestionsToGroup = function (aSuggestions, iGroupIndex) {
		if (!aSuggestions) {
			return [];
		}

		return aSuggestions.map(function (oSuggestion) {
			var oGroupObject = {};
			oGroupObject[HistoryConstants.getSuggestionsGroupPropertyName()] = iGroupIndex;

			return Object.assign({}, oSuggestion, oGroupObject);
		});
	};

	ValueListProvider.prototype._groupHeaderFactory = function (oGroup) {
		var sTitle = this._getGroupHeaderTitle(oGroup.key);

		if (this._isControlDropdown()) {
			return new SeparatorItem({
				key: HistoryConstants.getHistoryPrefix() + oGroup.key + ".key",
				text: sTitle
			});
		}

		return new GroupHeaderListItem({
			title: sTitle
		});
	};

	ValueListProvider.prototype._getGroupHeaderTitle = function (sGroupKey) {
		switch (sGroupKey) {
			case HEADER_GROUPS.Recommendations:
				return this._oResourceBundle.getText("VALUELIST_RECOMMENDATIONS_TITLE");
			case HEADER_GROUPS.RecentlyUsed:
				return this._oResourceBundle.getText("VALUELIST_RECENTLY_USED_TITLE");
			default:
				return this._oResourceBundle.getText("VALUELIST_OTHERS_TITLE");
		}
	};

	ValueListProvider.prototype._getGroupHeaderSorter = function () {
		if (this._groupHeaderSorter) {
			return this._groupHeaderSorter;
		}

		this._groupHeaderSorter = new Sorter({
			path: HistoryConstants.getSuggestionsGroupPropertyName(),
			descending: false,
			group: function (oContext) {
				return oContext.getProperty(HistoryConstants.getSuggestionsGroupPropertyName());
			}
		});

		return this._groupHeaderSorter;
	};

	ValueListProvider.prototype._getDistinctSuggestions = function (aData) {
		var oUnique = {},
			aDistinct = [];

		aData.forEach(function (x) {
			var oCloneObject = Object.assign({}, x);
			delete oCloneObject[HistoryConstants.getSuggestionsGroupPropertyName()];
			delete oCloneObject.__metadata;
			var sKey = values(oCloneObject).join();

			if (!oUnique[sKey]) {
				aDistinct.push(x);
				oUnique[sKey] = true;
			}
		}, this);

		return aDistinct;
	};

	ValueListProvider.prototype._resolveRecommendationListAnnotationData = function (oRecommendationListAnnotation) {
		var aColumns = oRecommendationListAnnotation.fieldsToDisplay,
			oField,
			oColumnConfig,
			oRankField;

		this._aRecommendationCols = [];
		this.aRecommendationSelect = [];

		for (var i = 0; i < aColumns.length; i++) {
			oField = aColumns[i];
			oColumnConfig = this._getColumnConfigFromField(oField);

			if (oField.visible) {
				this._aRecommendationCols.push(oColumnConfig);
				this.aRecommendationSelect.push(oField.name);
			}
		}
		if (this._aHighImportanceCols && this._oRecommendationListAnnotation) {
			oRankField = this._oRecommendationListAnnotation.rankField[0];
			oRankField = this._getColumnConfigFromField(oRankField);
			this._aHighImportanceCols.push(oRankField);
		}
	};

	ValueListProvider.prototype._setupRecommendations = function () {
		if (!this._shouldHaveRecommendations()) {
			return;
		}

		this._resolveRecommendationListAnnotationData(this._getRecommendationListAnnotation());
		this._fetchRecommendations();
	};

	ValueListProvider.prototype._shouldHaveRecommendations = function () {
		return MetadataAnalyser.isRecommendationList(this._fieldViewMetadata);
	};

	ValueListProvider.prototype._getRecommendationListAnnotation = function () {
		if (!this._oRecommendationListAnnotation) {
			var oRecommendationListAnnotation = this._oMetadataAnalyser._getRecommendationListAnnotation(this._sFullyQualifiedFieldName);
			this._oRecommendationListAnnotation = this._oMetadataAnalyser._enrichRecommendationListAnnotation(oRecommendationListAnnotation);
		}

		return this._oRecommendationListAnnotation;
	};

	ValueListProvider.prototype._fetchRecommendations = function () {
		var that = this;
		this._oRecommendationListPromise = new Promise(function (resolve, reject) {
			that.oODataModel.read("/" + that._oRecommendationListAnnotation.path, {
				urlParameters: { $skip: 0, $top: 5, $select: that.aRecommendationSelect.toString() },
				sorter: that._oSorter,
				success: function (aData) {
					var aRecommendations = that._addSuggestionsToGroup(aData.results, HEADER_GROUPS.Recommendations),
						sModelName = that._getSuggestionsModelName(),
						oModel = that.oControl.getModel(sModelName),
						aCurrentData = oModel.getData(),
						aDataToSet = aRecommendations.sort(that._sortRecommendations.bind(that));

					that._aRecommendations = aDataToSet;

					if (Array.isArray(aCurrentData)) {
						aDataToSet = [].concat(aCurrentData).concat(aDataToSet);
					}

					oModel.setData(aDataToSet);
					that._showSuggestionsMoreButton(false);
					resolve(aData);
				},
				error: function (oData) {
					reject(oData);
				}
			});
		});
	};

	ValueListProvider.prototype._createHistoryValuesProvider = function () {
		return new HistoryValuesProvider(this.oControl, this._sFullyQualifiedFieldName);
	};

	ValueListProvider.prototype._createHistoryOptOutProvider = function () {
		return HistoryOptOutProvider.createOptOutSettingPage();
	};

	ValueListProvider.prototype._setupHistoryValues = function () {
		if (!this._shouldHaveHistory()) {
			return;
		}

		this._oHistoryValuesProvider = this._createHistoryValuesProvider();
		this._createHistoryOptOutProvider();

		this._oHistoryValuesProvider.getHistoryEnabled().then(function (bEnabled) {
			if (!bEnabled) {
				return;
			}

			this._oHistoryValuesProvider.attachChangeListener();
			this._oHistoryValuesProvider.attachEvent("fieldUpdated", this._onHistoryFieldUpdated, this);
			this._oHistoryValuesProvider.getFieldData()
				.then(this._onHistoryDataInitialized.bind(this));
		}.bind(this));
	};

	ValueListProvider.prototype._onHistoryDataInitialized = function (aData) {
		this._updateModelHistoryData(aData);

		return aData;
	};

	ValueListProvider.prototype._onHistoryFieldUpdated = function (oEvent) {
		var aData = oEvent.getParameter("fieldData") || [];

		this._updateModelHistoryData(aData);

		if (this.oControl.isA("sap.m.Input")) {
			// close the suggestions popover
			// when the value is selected the focus is returned in the input
			// which triggers our onfocusin logic to open the history values.
			// TODO: check if this is still needed if onfocusin logic
			// in _setupComboBoxSuggestionInteractions/_setupInputSuggestionInteractions is removed
			setTimeout(function () {
				this.oControl._oSuggPopover._oPopover.close();
			}.bind(this));
		}

		if (this.oControl.isA("sap.m.ComboBox")) {
			// close the suggestions popover
			// when the value is selected the focus is returned in the comboBox
			// which triggers our onfocusin logic to open the history values.
			// TODO: check if this is still needed if onfocusin logic
			// in _setupComboBoxSuggestionInteractions/_setupInputSuggestionInteractions is removed
			setTimeout(function () {
				this.oControl._oSuggestionPopover._oPopover.close();
			}.bind(this));
		}
	};

	ValueListProvider.prototype._updateModelHistoryData = function (aData) {
		var aDataToSet = [],
			aRecentlyUsed = this._addSuggestionsToGroup(aData, HEADER_GROUPS.RecentlyUsed),
			sModelName = this._getSuggestionsModelName(),
			oModel = this.oControl.getModel(sModelName),
			oOldData = oModel.getData();

		if (!Array.isArray(oOldData)) {
			oOldData = [];
		}

		aDataToSet = this._getDistinctSuggestions(aDataToSet.concat(aRecentlyUsed).concat(oOldData));

		oModel.setData(aDataToSet);
		this._showSuggestionsMoreButton(false);
	};

	ValueListProvider.prototype._shouldHaveHistory = function () {

		if (!this._fieldViewMetadata || !this._sFullyQualifiedFieldName || !this.oControl) {
			return false;
		}

		var oShellConfig = window["sap-ushell-config"],
			oShellAppsConfig,
			oInputFieldHistory,
			bEnabled;

		if (oShellConfig) {
			oShellAppsConfig = oShellConfig.apps;
		}

		if (oShellAppsConfig) {
			oInputFieldHistory = oShellAppsConfig.inputFieldHistory;
		}

		if (oInputFieldHistory) {
			bEnabled = oInputFieldHistory.enabled;
		}

		return sap.ushell && sap.ushell.Container && bEnabled && !MetadataAnalyser.isPotentiallySensitive(this._fieldViewMetadata);
	};

	ValueListProvider.prototype._bindInnerControlSuggestions = function () {
		if (this.sAggregationName && this.sAggregationName === "suggestionRows") {
			this._createSuggestionTemplate();
		} else {
			this._createDropDownTemplate();
		}

		var oBindingParams = {
			path: this._getSuggestionsModelName() + ">/" ,
			template: this._oTemplate,
			templateShareable: true,
			length: this._getBindingLength()
		};

		oBindingParams.groupHeaderFactory = this._groupHeaderFactory;
		oBindingParams.sorter = this._getGroupHeaderSorter();

		if (this.sAggregationName) {
			// Bind the specified aggregation with valueList path in the model
			this.oControl.bindAggregation(this.sAggregationName, oBindingParams);
		}
	};

	ValueListProvider.prototype._setupSuggestionInteractions = function () {
		if (this.sAggregationName === "suggestionRows") {
			this._setupInputSuggestionInteractions();
			return;
		}

		this._setupComboBoxSuggestionInteractions();
	};

	ValueListProvider.prototype._setupInputSuggestionInteractions = function () {
		var oInput = this.oControl;

		oInput.setFilterSuggests(true);
		oInput.setFilterFunction(function (sValue, oItem) {
			var sModelName = this._getSuggestionsModelName(),
				oItemData = oItem.getBindingContext(sModelName).getObject(),
				sKey = oItemData[this.sKey],
				sDescription = oItemData[this.sDescription],
				fnFormatter = FormatUtil.getFormatterFunctionFromDisplayBehaviour(this.sDDLBDisplayBehaviour),
				sItemText = fnFormatter(sKey, sDescription);

			// remove * from the start or end of the string. They are used for wildfire search, which
			// is handled on the oData service. Locally we do not want to filter by this text
			sValue = sValue.replace(/\*$/, "");
			sValue = sValue.replace(/^\*/, "");

			var bValueInOneProperty = Object.keys(oItemData).some(function (sKey) {
				var sPropertyData = oItemData[sKey] + "";

				return sPropertyData.toLowerCase().indexOf(sValue.toLowerCase()) !== -1;
			});

			var bValueInFormattedText = sItemText.toLowerCase().indexOf(sValue.toLowerCase()) !== -1;

			return bValueInOneProperty || bValueInFormattedText;
		}.bind(this));

		// Handles the state of the Input while input
		oInput.attachLiveChange(function(oEvent) {
			var sValue = oEvent.getParameter("value"),
				aAllowedGroups = [HEADER_GROUPS.RecentlyUsed, HEADER_GROUPS.Recommendations];

			if (sValue === "") {
				this.oControl._oSuggPopover._oPopover.close();
				this._showInitialSuggestions(aAllowedGroups);
			}
		}, this);

		oInput.addEventDelegate({
			onfocusin: function () {
				var aAlowedGroups = [HEADER_GROUPS.RecentlyUsed, HEADER_GROUPS.Recommendations],
					aAllowedHistory = [HEADER_GROUPS.RecentlyUsed];

				if (this._isNotRecommendationItemSelected("suggestionRows", oInput.getValue())) {
					this._showInitialSuggestions(aAlowedGroups);
				} else if (this._shouldHaveHistory()) {
					this._showInitialSuggestions(aAllowedHistory);
				}
			}
		}, this);

		if (oInput.isA("sap.m.MultiInput") || !this._shouldHaveRecommendations()) {
			// Skip Value state setting
			return;
		}

		// Handles the state of the Input after suggestion item selection
		oInput.attachSuggestionItemSelected(function (oEvent) {
			var sModelName = this._getSuggestionsModelName(),
				oSelectedRow = oEvent.getParameter("selectedRow"),
				oItemText;

			if (oSelectedRow) {
				var oSelectedRowData = oSelectedRow.getBindingContext(sModelName).getObject();
				oItemText = oSelectedRowData && oSelectedRowData[this.sKey];
			}

			if (this._isNotRecommendationItemSelected("suggestionRows", oItemText)) {
				this._setControlValueState(ValueState.Warning);
			} else {
				this._setControlValueState(ValueState.None);
			}
		}, this);
	};

	ValueListProvider.prototype._setupComboBoxSuggestionInteractions = function () {
		var oComboBox = this.oControl;

		oComboBox.setShowSecondaryValues(true);

		oComboBox.addEventDelegate({
			onmousedown: function (oEvent) {
				var oTargetControl = oEvent.srcControl;

				// In input controls the "main" HTML element is the input. In reality it's the one that
				// holds the focus. Getting its UI5 control class and checking if it's the same class name
				// ensures that the click happened over the input field.
				oComboBox._isTargetControlInputField = !(this._isControlDropdown(oTargetControl));
				oComboBox._isTargetControlIcon = oTargetControl.isA("sap.ui.core.Icon");
				oComboBox._isMouseDown = true;
			},
			onmouseup: function () {
				// The focusin event is executed in async manner
				// So, just wait a tick before setting mousedown to FALSE
				setTimeout(function () {
					oComboBox._isMouseDown = false;
				});
			},
			onfocusin: function () {
				// These checks are needed in order to ensure keyboard navigation,
				// mouse clicks or a mix of them.
				if (oComboBox._isTargetControlInputField && (oComboBox._isMouseDown || oComboBox._isTargetControlIcon)) {
					return;
				}

				var aAlowedGroups = [HEADER_GROUPS.RecentlyUsed, HEADER_GROUPS.Recommendations],
					aAllowedHistory = [HEADER_GROUPS.RecentlyUsed];

				if (this._isNotRecommendationItemSelected("items", oComboBox.getValue())) {
					this._showInitialSuggestions(aAlowedGroups);
				} else if (this._shouldHaveHistory()) {
					this._showInitialSuggestions(aAllowedHistory);
				}
			}
		}, this);

		if (oComboBox.isA("sap.m.MultiComboBox") || !this._shouldHaveRecommendations()) {
			// Skip Value state setting
			return;
		}
		// Resets the state of the ComboBox after interraction with the control
		oComboBox.attachChange(function (oEvent) {
			if (this._isNotRecommendationItemSelected("items", oEvent.getParameter("value"))) {
				this._setControlValueState(ValueState.Warning);
			} else {
				this._setControlValueState(ValueState.None);
			}
		}, this);
	};

	ValueListProvider.prototype._isNotRecommendationItemSelected = function (sAggregationName, sValue) {
		return this._findSuggestionItemGroup(sAggregationName, sValue) !== HEADER_GROUPS.Recommendations;
	};

	ValueListProvider.prototype._findSuggestionItemGroup = function (sAggregationName, sValue) {
		var aItemContexts = this.oControl.getBinding(sAggregationName).getCurrentContexts(),
			oSelectedItem;

		for (var i = 0; i < aItemContexts.length; i++) {
			var oCurrentItem = aItemContexts[i].getObject(),
				sKey = oCurrentItem[this.sKey],
				sDescription = oCurrentItem[this.sDescription];

			if (sKey === sValue || sDescription === sValue) {
				oSelectedItem = oCurrentItem;
				break;
			}
		}

		return oSelectedItem ? oSelectedItem[HistoryConstants.getSuggestionsGroupPropertyName()] : null;
	};

	ValueListProvider.prototype._setControlValueState = function (sState) {
		this.oControl.setValueState(sState ? sState : ValueState.None);
		this.oControl.setValueStateText(" ");
	};

	ValueListProvider.prototype._showInitialSuggestions = function (aAllowedGroups) {
		var that = this;

		this.oControl.showItems(function (sValue, oItem) {
			var sModelName = that._getSuggestionsModelName(),
				iOrder = oItem.getBindingContext(sModelName).getObject()[HistoryConstants.getSuggestionsGroupPropertyName()];

			return aAllowedGroups.indexOf(iOrder) !== -1;
		});
	};

	ValueListProvider.prototype._getSuggestionsModelName = function () {
		var sPath;

		if (this._shouldHaveRecommendations() || this._shouldHaveHistory()) {
			sPath = SUGGESTIONS_MODEL_NAME;
		}

		return sPath;
	};

	ValueListProvider.prototype._resolveSuggestionBindingPath = function (sPath) {
		var sModelName = this._getSuggestionsModelName();

		if (sModelName) {
			sPath = sModelName + ">" + sPath;
		}

		return sPath;
	};

	ValueListProvider.prototype._getBindingLength = function () {
		var iLength = 300;

		if (this.oODataModel && this.oODataModel.iSizeLimit && this.oODataModel.iSizeLimit > iLength) {
			iLength = this.oODataModel.iSizeLimit;
		}

		return iLength;
	};

	/**
	 * check if a maxLength is given for the field and truncate the entered searchText if length > maxLength
	 *
	 * @param {string} sSearchText - the search text
	 * @return {string} new truncated sSearchText
	 * @private
	 */
	ValueListProvider.prototype._truncateSearchText = function(sSearchText) {
		// because the Field itself allow to enter many characters, but the fieldMetadata has set a maxLength, we truncate the SearchText when we
		// reach the maxLength
		var iMaxLength = -1;
		if (this._sMaxLength) {
			// maxLength can be given as property (SmartField)
			iMaxLength = parseInt(this._sMaxLength);
		} else if (this._fieldViewMetadata && this._fieldViewMetadata.maxLength) {
			// or as part of the metadat object (for Filterbar fields)
			iMaxLength = parseInt(this._fieldViewMetadata.maxLength);
		}

		if (iMaxLength > -1 && sSearchText.length > iMaxLength) {
			sSearchText = sSearchText.substr(0, iMaxLength);
		}
		return sSearchText;
	};

	/**
	 * Unbind the aggregation from the model.
	 *
	 * @returns {sap.ui.comp.providers.ValueListProvider} The <code>this</code> instance to allow method chaining
	 * @protected
	 * @since 1.54
	 */
	ValueListProvider.prototype.unbindAggregation = function() {
		if (this.oControl) {
			this.oControl.unbindAggregation(this.sAggregationName);
		}

		return this;
	};

	/**
	 * Destroys the object
	 */
	ValueListProvider.prototype.destroy = function() {
		if (this.oControl) {
			if (this.oControl.detachSuggest && this._fSuggest) {
				this.oControl.detachSuggest(this._fSuggest);
				this._fSuggest = null;
			}
			if (this.oControl.removeValidator && this._fValidator) {
				this.oControl.removeValidator(this._fValidator);
				this._fValidator = null;
			} else if (this.oControl.detachSuggestionItemSelected) {
				this.oControl.detachSuggestionItemSelected(this._onSuggestionItemSelected, this);
			}
			if (this.oControl.detachChange) {
				this.oControl.detachChange(this._validateStringSingleWithValueList, this);
			}
			this.oControl.unbindAggregation(this.sAggregationName);
			this.oControl.data("_hassuggestionTemplate", false);
			delete this.oControl.__sValidationText;
			delete this.oControl.__bValidatingToken;
		}

		if (this._oHistoryValuesProvider) {
			this._oHistoryValuesProvider.destroy();
			this._oHistoryValuesProvider = null;
		}

		BaseValueListProvider.prototype.destroy.apply(this, arguments);
		// Destroy other local data
		if (this.oJsonModel) {
			this.oJsonModel.destroy();
			this.oJsonModel = null;
		}

		if (this._oTemplate) {
			this._oTemplate.destroy();
		}

		this._oTemplate = null;
		this.sAggregationName = null;
		this.bTypeAheadEnabled = null;
		this._oSorter = null;
	};

	return ValueListProvider;

});
