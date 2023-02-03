sap.ui.define(
	[
		"./FilterBarAPI",
		"sap/fe/test/Utils",
		"sap/fe/core/model/DraftEditState",
		"sap/fe/test/builder/FEBuilder",
		"sap/ui/test/Opa5",
		"sap/ui/test/OpaBuilder",
		"sap/fe/test/builder/VMBuilder"
	],
	function(FilterBarAPI, Utils, EditState, FEBuilder, Opa5, OpaBuilder, VMBuilder) {
		"use strict";

		/**
		 * Constructor.
		 * @param {sap.fe.test.builder.FilterBarBuilder} oFilterBarBuilder the filter bar builder instance to operate on
		 * @param {string} [vFilterBarDescription] the filter bar description (optional), used to log message
		 * @returns {sap.fe.test.api.FilterBarActions} the instance
		 * @constructor
		 * @public
		 * @sap-restricted
		 */
		var FilterBarActions = function(oFilterBarBuilder, vFilterBarDescription) {
			return FilterBarAPI.call(this, oFilterBarBuilder, vFilterBarDescription);
		};
		FilterBarActions.prototype = Object.create(FilterBarAPI.prototype);
		FilterBarActions.prototype.constructor = FilterBarActions;
		FilterBarActions.prototype.isAction = true;

		/**
		 * Changes the value of the defined filter field.
		 *
		 * @param {string | sap.fe.test.api.FilterFieldIdentifier} vFieldIdentifier The filter field identifier.
		 * @param {string} [vValue] The new target value.
		 * @param {boolean} [bClearFirst] Set to <code>true</code> to clear previous set filters first, else all previous set filters will be kept.
		 * @returns {object} an object extending a jQuery promise
		 * @public
		 * @sap-restricted
		 */
		FilterBarActions.prototype.iChangeFilterField = function(vFieldIdentifier, vValue, bClearFirst) {
			var aArguments = Utils.parseArguments([[String, Object], String, Boolean], arguments),
				oFieldBuilder = this.createFilterFieldBuilder(aArguments[0]);

			return this.prepareResult(
				oFieldBuilder
					.doChangeValue(aArguments[1], aArguments[2])
					.description(
						Utils.formatMessage(
							"Changing the filter field '{1}' of filter bar '{0}' by adding '{2}' (was cleared first: {3})",
							this.getIdentifier(),
							aArguments[0],
							aArguments[1],
							!!aArguments[2]
						)
					)
					.execute()
			);
		};

		/**
		 * Change the search field.
		 *
		 * @param {string} [sSearchText] the new search text
		 * @returns {object} an object extending a jQuery promise
		 *
		 * @public
		 * @sap-restricted
		 */
		FilterBarActions.prototype.iChangeSearchField = function(sSearchText) {
			var oFilterBarBuilder = this.getBuilder();
			return this.prepareResult(
				oFilterBarBuilder
					.doChangeSearch(sSearchText)
					.description(
						Utils.formatMessage(
							"Changing the search text on filter bar '{0}' to '{1}'",
							this.getIdentifier(),
							sSearchText || ""
						)
					)
					.execute()
			);
		};

		/**
		 * Resets the search field.
		 *
		 * @returns {object} an object extending a jQuery promise
		 *
		 * @public
		 * @sap-restricted
		 */
		FilterBarActions.prototype.iResetSearchField = function() {
			var oFilterBarBuilder = this.getBuilder();
			return this.prepareResult(
				oFilterBarBuilder
					.doResetSearch()
					.description(Utils.formatMessage("Resetting the search field on filter bar '{0}'", this.getIdentifier()))
					.execute()
			);
		};

		/**
		 * Change the editing status filter field.
		 *
		 * @param {sap.fe.test.api.FilterBarAPI.EditState} [sEditState] an edit state value
		 * @returns {object} an object extending a jQuery promise
		 *
		 * @public
		 * @sap-restricted
		 */
		FilterBarActions.prototype.iChangeEditingStatus = function(sEditState) {
			var oFilterBarBuilder = this.getBuilder();
			return this.prepareResult(
				oFilterBarBuilder
					.doChangeEditingStatus(sEditState && EditState[sEditState])
					.description(
						Utils.formatMessage(
							"Changing the editing status on filter bar '{0}' to '{1}'",
							this.getIdentifier(),
							sEditState && EditState[sEditState].display
						)
					)
					.execute()
			);
		};

		/**
		 * Executes the search with the current filters.
		 *
		 * @returns {object} an object extending a jQuery promise
		 *
		 * @public
		 * @sap-restricted
		 */
		FilterBarActions.prototype.iExecuteSearch = function() {
			var oFilterBarBuilder = this.getBuilder();
			return this.prepareResult(
				oFilterBarBuilder
					.doSearch()
					.description(Utils.formatMessage("Executing search on filter bar '{0}'", this.getIdentifier()))
					.execute()
			);
		};

		/**
		 * Adds a field as filter field.
		 * @param {string | sap.fe.test.api.FilterFieldIdentifier} vFieldIdentifier
		 *
		 * @public
		 * @sap-restricted
		 */
		FilterBarActions.prototype.iAddAdaptationFilterField = function(vFieldIdentifier) {
			return this.filterFieldAdaptation(
				vFieldIdentifier,
				{ selected: false },
				OpaBuilder.Actions.press("selectMulti"),
				Utils.formatMessage("Adding field '{1}' to filter bar '{0}'", this.getIdentifier(), vFieldIdentifier)
			);
		};

		/**
		 * Removes a field as filter field.
		 * @param {string | sap.fe.test.api.FilterFieldIdentifier} vFieldIdentifier
		 *
		 * @public
		 * @sap-restricted
		 */
		FilterBarActions.prototype.iRemoveAdaptationFilterField = function(vFieldIdentifier) {
			return this.filterFieldAdaptation(
				vFieldIdentifier,
				{ selected: true },
				OpaBuilder.Actions.press("selectMulti"),
				Utils.formatMessage("Removing field '{1}' to filter bar '{0}'", this.getIdentifier(), vFieldIdentifier)
			);
		};

		/**
		 * Executes a keyboard shortcut.
		 *
		 * @param {string} sShortcut the shortcut pattern
		 *
		 * @public
		 * @sap-restricted
		 */
		FilterBarActions.prototype.iExecuteKeyboardShortcut = function(sShortcut) {
			return this.prepareResult(
				this.getBuilder()
					.doPressKeyboardShortcut(sShortcut)
					.description(
						Utils.formatMessage("Execute keyboard shortcut '{1}' on filter bar '{0}'", this.getIdentifier(), sShortcut)
					)
					.execute()
			);
		};

		/**
		 * Saves a variant under given name, or overwrites the current one.
		 *
		 * @param {string} [sVariantName] the name of the new variant. If omitted, the current variant will be overwritten.
		 * @returns {object} an object extending a jQuery promise.
		 * The result corresponds to the result of {@link sap.ui.test.Opa5#waitFor}
		 *
		 * @public
		 * @sap-restricted
		 */
		FilterBarActions.prototype.iSaveVariant = function(sVariantName) {
			var fnSuccessFunction = Utils.isOfType(sVariantName, String)
				? function(oFilterBar) {
						return VMBuilder.create(this)
							.hasId(oFilterBar.getId() + "::VariantManagement")
							.doSaveAs(sVariantName)
							.description(Utils.formatMessage("Saving variant for '{0}' as '{1}'", this.getIdentifier(), sVariantName))
							.execute();
				  }
				: function(oFilterBar) {
						return VMBuilder.create(this)
							.hasId(oFilterBar.getId() + "::VariantManagement")
							.doSave()
							.description(Utils.formatMessage("Saving current variant for '{0}'", this.getIdentifier()))
							.execute();
				  };

			return this.prepareResult(
				this.getBuilder()
					.success(fnSuccessFunction.bind(this))
					.execute()
			);
		};

		return FilterBarActions;
	}
);
