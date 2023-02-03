sap.ui.define(
	["./FilterBarAPI", "sap/fe/test/Utils", "sap/fe/test/builder/FEBuilder", "sap/ui/test/OpaBuilder", "sap/fe/core/model/DraftEditState"],
	function(FilterBarAPI, Utils, FEBuilder, OpaBuilder, EditState) {
		"use strict";

		/**
		 * Constructor.
		 * @param {sap.fe.test.builder.FilterBarBuilder} oFilterBarBuilder the filter bar builder instance to operate on
		 * @param {string} [vFilterBarDescription] the filter bar description (optional), used to log message
		 * @returns {sap.fe.test.api.FilterBarAssertions} the instance
		 * @constructor
		 * @public
		 * @sap-restricted
		 */
		var FilterBarAssertions = function(oFilterBarBuilder, vFilterBarDescription) {
			return FilterBarAPI.call(this, oFilterBarBuilder, vFilterBarDescription);
		};
		FilterBarAssertions.prototype = Object.create(FilterBarAPI.prototype);
		FilterBarAssertions.prototype.constructor = FilterBarAssertions;
		FilterBarAssertions.prototype.isAction = false;

		/**
		 * Checks the filter bar.
		 * @param {Object} [mFilterBarState] the state of the filter bar. Available states are:
		 * <code><pre>
		 * 	{
		 * 		focused: true|false // check includes all elements inside the filter bar
		 * 	}
		 * </pre></code>
		 * @returns {object} an object extending a jQuery promise
		 *
		 * @public
		 * @sap-restricted
		 */
		FilterBarAssertions.prototype.iCheckState = function(mFilterBarState) {
			var oFilterBarBuilder = this.getBuilder(),
				sDescription = this.getIdentifier();

			if (sDescription) {
				oFilterBarBuilder.description(
					Utils.formatMessage("Checking filter bar '{0}' for state='{1}'", this.getIdentifier(), mFilterBarState)
				);
			}

			return this.prepareResult(oFilterBarBuilder.hasState(mFilterBarState).execute());
		};

		/**
		 * Checks a filter field.
		 * If <code>vConditionValues</code> is provided, the current condition value(s) of the filter is validated.
		 * If <code>mFieldState</code> is provided, the filter fields state is checked.
		 * @param {object | sap.fe.test.api.FilterFieldIdentifier} vFieldIdentifier the field identifier
		 * @param {string | object| array} [vConditionValues] the expected value(s) of the filter field
		 * @param {string} [sOperator] the expected operator
		 * @param {object} [mFieldState] the state of the filter field. Available states are:
		 * <code><pre>
		 * 	{
		 * 		focused: true|false
		 * 	}
		 * </pre></code>
		 * @returns {object} an object extending a jQuery promise
		 *
		 * @public
		 * @sap-restricted
		 */
		FilterBarAssertions.prototype.iCheckFilterField = function(vFieldIdentifier, vConditionValues, sOperator, mFieldState) {
			var aArguments = Utils.parseArguments([[String, Object], [String, Array, Object], String, Object], arguments),
				oFieldBuilder = this.createFilterFieldBuilder(aArguments[0]);

			return this.prepareResult(
				oFieldBuilder
					.hasValue(aArguments[1], aArguments[2])
					.hasState(aArguments[3])
					.description(
						Utils.formatMessage(
							"Checking the field '{1}' of filter bar '{0}' for condition values='{2}' and operator='{3}' and state='{4}'",
							this.getIdentifier(),
							aArguments[0],
							aArguments[1],
							aArguments[2],
							aArguments[3]
						)
					)
					.execute()
			);
		};

		/**
		 * Check the editing status filter field.
		 *
		 * @param {sap.fe.test.api.FilterBarAPI.EditState} [sEditState] an edit state value
		 * @param {object} [mFieldState] the field state. The following states are supported:
		 * <code><pre>
		 * 	{
		 * 		visible: true|false,
		 * 		focused: true|false
		 * 	}
		 * </pre></code>
		 * @returns {object} an object extending a jQuery promise
		 *
		 * @public
		 * @sap-restricted
		 */
		FilterBarAssertions.prototype.iCheckEditingStatus = function(sEditState, mFieldState) {
			var aArguments = Utils.parseArguments([String, Object], arguments),
				oFilterBarBuilder = this.getBuilder();
			return this.prepareResult(
				oFilterBarBuilder
					.hasEditingStatus(aArguments[0] && EditState[aArguments[0]], aArguments[1])
					.description(
						Utils.formatMessage(
							"Checking the editing status of filter bar '{0}' for value='{1}' and state='{2}'",
							this.getIdentifier(),
							aArguments[0] && EditState[aArguments[0]].display,
							aArguments[1]
						)
					)
					.execute()
			);
		};

		/**
		 * Checks the search button.
		 *
		 * @param {object} [mSearchState] the search state. The following states are supported:
		 * <code><pre>
		 * 	{
		 * 		visible: true|false
		 * 	}
		 * </pre></code>
		 * @returns {object} an object extending a jQuery promise
		 *
		 * @public
		 * @sap-restricted
		 */
		FilterBarAssertions.prototype.iCheckSearch = function(mSearchState) {
			var oFilterBarBuilder = this.getBuilder();
			return this.prepareResult(
				oFilterBarBuilder
					.hasProperties({ showGoButton: !mSearchState || mSearchState.visible === undefined ? true : mSearchState.visible })
					.description(
						Utils.formatMessage("Checking search on filter bar '{0}' for state='{1}'", this.getIdentifier(), mSearchState)
					)
					.execute()
			);
		};

		/**
		 * Checks whether filter adaptation dialog is available/opened.
		 * @returns {object} an object extending a jQuery promise
		 *
		 * @public
		 * @sap-restricted
		 */
		FilterBarAssertions.prototype.iCheckFilterAdaptation = function() {
			var oAdaptationPopoverBuilder = FEBuilder.createPopoverBuilder(
				this.getOpaInstance(),
				OpaBuilder.Matchers.resourceBundle("title", "sap.ui.mdc", "filterbar.ADAPT_TITLE")
			);
			return this.prepareResult(
				oAdaptationPopoverBuilder
					.description(Utils.formatMessage("Checking filter adaptation dialog for filter bar '{0}'", this.getIdentifier()))
					.execute()
			);
		};

		/**
		 * Checks a field in the adaptation dialog.
		 * @param {string | sap.fe.test.api.FilterFieldIdentifier} vFieldIdentifier the field identifier
		 * @param {object} [mAdaptationState] the state of the adaptation field. The following states are supported:
		 * <code><pre>
		 * 	{
		 * 		selected: true|false,
		 * 		filtered: true|false
		 * 	}
		 * </pre></code>
		 * @returns {object} an object extending a jQuery promise
		 *
		 * @public
		 * @sap-restricted
		 */
		FilterBarAssertions.prototype.iCheckAdaptationFilterField = function(vFieldIdentifier, mAdaptationState) {
			return this.filterFieldAdaptation(
				vFieldIdentifier,
				mAdaptationState,
				Utils.formatMessage(
					"Checking '{1}' on filter bar '{0}' for state='{2}'",
					this.getIdentifier(),
					vFieldIdentifier,
					mAdaptationState
				)
			);
		};

		return FilterBarAssertions;
	}
);
