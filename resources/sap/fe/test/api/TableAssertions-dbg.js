sap.ui.define(
	["./TableAPI", "sap/fe/test/Utils", "sap/ui/test/OpaBuilder", "sap/fe/test/builder/FEBuilder", "sap/fe/test/builder/TableBuilder"],
	function(TableAPI, Utils, OpaBuilder, FEBuilder, TableBuilder) {
		"use strict";

		/**
		 * Constructor.
		 * @param {sap.fe.test.builder.TableBuilder} oTableBuilder the table builder instance to operate on
		 * @param {string} [vTableDescription] the table description (optional), used to log message
		 * @returns {sap.fe.test.api.TableAssertions} the instance
		 * @constructor
		 * @private
		 */
		var TableAssertions = function(oBuilderInstance, vTableDescription) {
			return TableAPI.call(this, oBuilderInstance, vTableDescription);
		};
		TableAssertions.prototype = Object.create(TableAPI.prototype);
		TableAssertions.prototype.constructor = TableAssertions;
		TableAssertions.prototype.isAction = false;

		/**
		 * Checks the table.
		 * @param {Object} [mTableState] the state of the table. Available states are:
		 * <code><pre>
		 * 	{
		 * 		focused: true|false // check includes all elements inside the table
		 * 	}
		 * </pre></code>
		 * @private
		 */
		TableAssertions.prototype.iCheckState = function(mTableState) {
			var oTableBuilder = this.getBuilder();
			return this.prepareResult(
				oTableBuilder
					.hasState(mTableState)
					.description(Utils.formatMessage("Checking table '{0}' having state='{1}'", this.getIdentifier(), mTableState))
					.execute()
			);
		};

		/**
		 * Checks the rows of a table.
		 * If <code>mRowValues</code> is provided, only rows with the corresponding values are considered.
		 * If <code>iNumberOfRows</code> is provided, the number of rows are checked with respect to the provided <code>mRowValues</code> (if set) or in total.
		 * If <code>iNumberOfRows</code> is omitted, it checks for at least one matching row.
		 * If <code>mRowState</code> is provided, the row must be in the given state.
		 *
		 * @param {Object} [mRowValues] defines the expected row values. The pattern is:
		 * <code><pre>
		 * 	{
		 * 		<column-name-or-index>: <expected-value>
		 *  }
		 * </pre></code>
		 * @param {int} [iExpectedNumberOfRows]
		 * @param {Object} [mRowState] the states to check. Available row states are:
		 * <code><pre>
		 * 	{
		 * 		selected: true|false,
		 * 		focused: true|false
		 * 	}
		 * </pre></code>
		 * @returns {object} an object extending a jQuery promise.
		 * The result corresponds to the result of {@link sap.ui.test.Opa5#waitFor}
		 *
		 * @private
		 * @experimental
		 */
		TableAssertions.prototype.iCheckRows = function(mRowValues, iExpectedNumberOfRows, mRowState) {
			var aArguments = Utils.parseArguments([Object, Number, Object], arguments),
				iNumberOfRows = aArguments[1],
				aRowMatcher = this.createRowMatchers(aArguments[0], aArguments[2]),
				oTableBuilder = this.getBuilder();

			// the order of the matchers matters here
			if (aRowMatcher.length) {
				// if matchers are defined, first match rows then check number of results
				oTableBuilder.hasRows(aRowMatcher, true).has(function(aRows) {
					return Utils.isOfType(iNumberOfRows, Number) ? aRows.length === iNumberOfRows : aRows.length > 0;
				});
			} else {
				// if no row matchers are defined, check the numbers of row based on table (binding)
				oTableBuilder
					.hasNumberOfRows(iNumberOfRows)
					// but still ensure that matcher returns the row aggregation
					.hasRows(null, true);
			}

			return this.prepareResult(
				oTableBuilder
					.description(
						Utils.formatMessage(
							"Checking table '{0}' having {1} rows with values='{2}' and state='{3}'",
							this.getIdentifier(),
							iNumberOfRows === undefined ? "> 0" : iNumberOfRows,
							aArguments[0],
							aArguments[2]
						)
					)
					.execute()
			);
		};

		/**
		 * Checks the number of items into the quickFitler
		 * @param {int} [iExpectedNumberOfColumns] the expected number of quickFilter items
		 * @returns {object} an object extending a jQuery promise.
		 * The result corresponds to the result of {@link sap.ui.test.Opa5#waitFor}
		 *
		 * @private
		 * @experimental
		 */
		TableAssertions.prototype.iCheckQuickFilterItems = function(iExpectedNumberOfItems) {
			return this.prepareResult(
				this.getBuilder()
					.hasQuickFilterItems(iExpectedNumberOfItems)
					.description(
						Utils.formatMessage("checking table '{0}' having  '{1}' item(s)", this.getIdentifier(), iExpectedNumberOfItems)
					)
					.execute()
			);
		};

		/**
		 * Checks the state of the columns of a table.
		 *
		 * @param {int} [iExpectedNumberOfColumns] the expected number of columns
		 * @param {object} [mColumnStateMap] a map of columns to their state. The map looks like
		 * <code><pre>
		 * 	{
		 * 		<columnName | columnIndex>: {
		 *			header: "My header"
		 * 		}
		 * 	}
		 * </pre></code>
		 * @returns {object} an object extending a jQuery promise.
		 * The result corresponds to the result of {@link sap.ui.test.Opa5#waitFor}
		 *
		 * @public
		 * @sap-restricted
		 */
		TableAssertions.prototype.iCheckColumns = function(iExpectedNumberOfColumns, mColumnStateMap) {
			var aArguments = Utils.parseArguments([Number, Object], arguments),
				mColumns = aArguments[1],
				iNumberOfColumns = aArguments[0],
				oTableBuilder = this.getBuilder();

			if (iNumberOfColumns !== undefined) {
				oTableBuilder.hasAggregationLength("columns", iNumberOfColumns);
			} else {
				oTableBuilder.hasAggregation("columns");
			}
			oTableBuilder.hasColumns(mColumns);

			return this.prepareResult(
				oTableBuilder
					.description(
						Utils.formatMessage(
							"Checking table '{0}' having {1} columns and column states='{2}'",
							this.getIdentifier(),
							iNumberOfColumns === undefined ? "> 0" : iNumberOfColumns,
							mColumns
						)
					)
					.execute()
			);
		};

		/**
		 * Checks the state of the cells of a table.
		 *
		 * @param {int} [mRowValues] a map of column names to their value. Example:
		 * <code><pre>
		 * 	{
		 * 		<column-name-or-index>: <expected-value>
		 *  }
		 * </pre></code>
		 * @param {object} mColumnStateMap a map of columns to their state. The map looks like
		 * <code><pre>
		 * 	{
		 * 		<column-name-or-index>: {
		 *			header: "My header"
		 * 		}
		 * 	}
		 * </pre></code>
		 * @returns {object} an object extending a jQuery promise.
		 * The result corresponds to the result of {@link sap.ui.test.Opa5#waitFor}
		 *
		 * @public
		 * @sap-restricted
		 */
		TableAssertions.prototype.iCheckCells = function(mRowValues, mColumnStateMap) {
			var mRows = arguments.length > 1 ? arguments[0] : undefined,
				mColumns = arguments.length > 1 ? arguments[1] : arguments[0],
				aRowMatcher = this.createRowMatchers(mRows, TableBuilder.Row.Matchers.cellProperties(mColumns)),
				oTableBuilder = this.getBuilder();

			return this.prepareResult(
				oTableBuilder
					.hasRows(aRowMatcher)
					.description(
						Utils.formatMessage(
							"Checking table '{0}' having cells properties '{2}' of rows with values '{1}'",
							this.getIdentifier(),
							mRows,
							mColumns
						)
					)
					.execute()
			);
		};

		/**
		 * Checks the state of table actions. The action is identified either by id or by a string representing
		 * the label of the action.
		 *
		 * @param {string | sap.fe.test.api.ActionIdentifier} vActionIdentifier an action identifier
		 * @param {Object} [mState] the states to check. Available action states are:
		 * <code><pre>
		 * 	{
		 * 		visible: true|false,
		 * 		enabled: true|false
		 * 	}
		 * </pre></code>
		 * @returns {object} an object extending a jQuery promise.
		 * The result corresponds to the result of {@link sap.ui.test.Opa5#waitFor}
		 *
		 * @private
		 * @experimental
		 */
		TableAssertions.prototype.iCheckAction = function(vActionIdentifier, mState) {
			var aArguments = Utils.parseArguments([[Object, String], Object], arguments),
				oTableBuilder = this.getBuilder();

			return this.prepareResult(
				oTableBuilder
					.hasAggregation("actions", [this.createActionMatcher(vActionIdentifier), FEBuilder.Matchers.states(mState)])
					.description(
						Utils.formatMessage(
							"Checking table '{0}' having action '{1}' with state='{2}'",
							this.getIdentifier(),
							aArguments[0],
							aArguments[1]
						)
					)
					.execute()
			);
		};

		/**
		 * Checks the state of the table delete action.
		 *
		 * @param {Object} [mState] the states to check. Available states are:
		 * <code><pre>
		 * 	{
		 * 		visible: true|false,
		 * 		enabled: true|false
		 * 	}
		 * </pre></code>
		 * @returns {object} an object extending a jQuery promise.
		 * The result corresponds to the result of {@link sap.ui.test.Opa5#waitFor}
		 *
		 * @private
		 * @experimental
		 */
		TableAssertions.prototype.iCheckDelete = function(mState) {
			var oTableBuilder = this.getBuilder(),
				sDeleteId = "::StandardAction::Delete";
			return this.prepareResult(
				oTableBuilder
					.hasAggregation("actions", [
						FEBuilder.Matchers.id(new RegExp(Utils.formatMessage("{0}$", sDeleteId))),
						FEBuilder.Matchers.states(mState)
					])
					.description(
						Utils.formatMessage("Checking table '{0}' having 'Delete' action with state='{1}'", this.getIdentifier(), mState)
					)
					.execute()
			);
		};

		/**
		 * Checks the state of the table CreationRow button.
		 *
		 * @param {Object} [mState] the state of the CreationRow to check. Available states are:
		 * <code><pre>
		 * 	{
		 *  	applyEnabled: true|false
		 * 	}
		 * </pre></code>
		 * @returns {object} an object extending a jQuery promise.
		 * @private
		 * @experimental
		 */
		TableAssertions.prototype.iCheckCreationRow = function(mState) {
			var oTableBuilder = this.getBuilder();
			return this.prepareResult(
				oTableBuilder
					.doOnChildren(
						FEBuilder.create(this)
							.hasType("sap.ui.table.CreationRow")
							.checkNumberOfMatches(1)
							.hasState(mState)
					)
					.description(
						Utils.formatMessage("Checking table '{0}' having a CreationRow with state='{1}'", this.getIdentifier(), mState)
					)
					.execute()
			);
		};

		/**
		 * Checks the state of the table create action.
		 * Available states are e.g.:
		 * <code><pre>
		 * 	{
		 * 		visible: true|false,
		 * 		enabled: true|false
		 * 	}
		 * </pre></code>
		 * @param {Object} [mState]
		 * @returns {object} an object extending a jQuery promise.
		 * The result corresponds to the result of {@link sap.ui.test.Opa5#waitFor}
		 *
		 * @private
		 * @experimental
		 */
		TableAssertions.prototype.iCheckCreate = function(mState) {
			var oTableBuilder = this.getBuilder(),
				sCreateId = "::StandardAction::Create";
			return this.prepareResult(
				oTableBuilder
					.hasAggregation("actions", [
						FEBuilder.Matchers.id(new RegExp(Utils.formatMessage("{0}$", sCreateId))),
						FEBuilder.Matchers.states(mState)
					])
					.description(Utils.formatMessage("Checking action '{0}' with state='{1}'", sCreateId, mState))
					.execute()
			);
		};

		/**
		 * Checks whether column adaptation dialog is available/opened.
		 * @returns {object} an object extending a jQuery promise
		 *
		 * @public
		 * @sap-restricted
		 */
		TableAssertions.prototype.iCheckColumnAdaptation = function() {
			var oAdaptationPopoverBuilder = FEBuilder.createPopoverBuilder(
				this.getOpaInstance(),
				OpaBuilder.Matchers.resourceBundle("title", "sap.ui.mdc", "table.SETTINGS_COLUMN")
			);
			return this.prepareResult(
				oAdaptationPopoverBuilder
					.description(Utils.formatMessage("Checking column adaptation dialog for table '{0}'", this.getIdentifier()))
					.execute()
			);
		};

		/**
		 * Checks a field in the adaptation dialog.
		 * @param {string | sap.fe.test.api.ColumnIdentifier} vColumnIdentifier the column identifier
		 * @param {object} [mAdaptationState] the state of the adaptation field. The following states are supported:
		 * <code><pre>
		 * 	{
		 * 		selected: true|false
		 * 	}
		 * </pre></code>
		 * @returns {object} an object extending a jQuery promise
		 *
		 * @public
		 * @sap-restricted
		 */
		TableAssertions.prototype.iCheckAdaptationColumn = function(vColumnIdentifier, mAdaptationState) {
			return this.columnAdaptation(
				vColumnIdentifier,
				mAdaptationState,
				Utils.formatMessage(
					"Checking '{1}' on table '{0}' for state='{2}'",
					this.getIdentifier(),
					vColumnIdentifier,
					mAdaptationState
				)
			);
		};

		return TableAssertions;
	}
);
