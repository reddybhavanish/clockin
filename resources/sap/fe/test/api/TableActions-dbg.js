sap.ui.define(
	[
		"./TableAPI",
		"sap/fe/test/Utils",
		"sap/ui/test/OpaBuilder",
		"sap/fe/test/builder/FEBuilder",
		"sap/ui/test/matchers/Interactable",
		"sap/fe/test/builder/VMBuilder"
	],
	function(TableAPI, Utils, OpaBuilder, FEBuilder, Interactable, VMBuilder) {
		"use strict";

		/**
		 * Constructor.
		 * @param {sap.fe.test.builder.TableBuilder} oTableBuilder the table builder instance to operate on
		 * @param {string} [vTableDescription] the table description (optional), used to log message
		 * @returns {sap.fe.test.api.TableActions} the instance
		 * @constructor
		 * @private
		 */
		var Actions = function(oBuilderInstance, vTableDescription) {
			return TableAPI.call(this, oBuilderInstance, vTableDescription);
		};
		Actions.prototype = Object.create(TableAPI.prototype);
		Actions.prototype.constructor = Actions;
		Actions.prototype.isAction = true;

		/**
		 * Press the specified column. The given value map must match exactly one row and column name should exist.
		 * @param {object} [mRowValues] a map of columns (either name or index) to its value, e.g. <code>{ 0: "Max", "Last Name": "Mustermann" }</code>
		 * @param {string} vColumn Column information
		 *
		 * @public
		 * @sap-restricted
		 */
		Actions.prototype.iPressCell = function(mRowValues, vColumn) {
			var oTableBuilder = this.getBuilder();
			return this.prepareResult(
				oTableBuilder
					.checkNumberOfMatches(1)
					.doClickOnCell(this.createRowMatchers(mRowValues), vColumn)
					.description(
						Utils.formatMessage(
							"Pressing cell of table '{0}' with row value = '{1}' and column {2} = '{3}' ",
							this.getIdentifier(),
							mRowValues,
							isNaN(vColumn) ? "header" : "index",
							vColumn
						)
					)
					.execute()
			);
		};

		/**
		 * Selects the specified rows.
		 *
		 * @param {object} [mRowValues] a map of columns (either name or index) to its value, e.g. <code>{ 0: "Max", "Last Name": "Mustermann" }</code>
		 * @param {object} [mRowState] a map of states. Supported row states are
		 * <code><pre>
		 * 	{
		 * 		selected: true|false,
		 * 		focused: true|false
		 * 	}
		 * </pre></code>
		 *
		 * @private
		 */
		Actions.prototype.iSelectRows = function(mRowValues, mRowState) {
			var aArguments = Utils.parseArguments([Object, Object], arguments),
				oTableBuilder = this.getBuilder();
			return this.prepareResult(
				oTableBuilder
					.doSelect(this.createRowMatchers(aArguments[0], aArguments[1]))
					.description(
						Utils.formatMessage(
							"Selecting rows of table '{0}' with values='{1}' and state='{2}'",
							this.getIdentifier(),
							aArguments[0],
							aArguments[1]
						)
					)
					.execute()
			);
		};

		/**
		 * Press the specified row. The given value map must match exactly one row.
		 *
		 * @param {object} [mRowValues] a map of columns (either name or index) to its value, e.g. <code>{ 0: "Max", "Last Name": "Mustermann" }</code>
		 * @returns {object} an object extending a jQuery promise.
		 * The result corresponds to the result of {@link sap.ui.test.Opa5#waitFor}
		 *
		 * @public
		 * @sap-restricted
		 */
		Actions.prototype.iPressRow = function(mRowValues) {
			var oTableBuilder = this.getBuilder();
			return this.prepareResult(
				oTableBuilder
					.checkNumberOfMatches(1)
					.doNavigate(this.createRowMatchers(mRowValues))
					.description(Utils.formatMessage("Pressing row of table '{0}' with values='{1}'", this.getIdentifier(), mRowValues))
					.execute()
			);
		};

		/**
		 * Changes the specified row. The given value map must match exactly one row. The target columns are independent of
		 * the once defined in the current value map, which is just used for identifying the row only.
		 * If only one parameter is provided, it must be the <code>mTargetValues</code> and <code>mRowValues</code> is considered undefined.
		 * If <code>mRowValues</code> are not defined, then the targetValues are inserted in the creationRow.
		 *
		 * @param {object} [mRowValues]  a map of columns (either name or index) to its value, e.g. <code>{ 0: "Max", "Last Name": "Mustermann" }</code>
		 * @param {object} mTargetValues a map of columns (either name or index) to its new value. The columns do not need to match the ones defined in <code>mRowValues</code>.
		 * @returns {object} an object extending a jQuery promise.
		 * The result corresponds to the result of {@link sap.ui.test.Opa5#waitFor}
		 *
		 * @public
		 * @sap-restricted
		 */
		Actions.prototype.iChangeRow = function(mRowValues, mTargetValues) {
			var oTableBuilder = this.getBuilder(),
				bIsCreationRow = false;

			if (arguments.length === 1) {
				bIsCreationRow = true;
				mTargetValues = mRowValues;
			}

			if (!bIsCreationRow) {
				oTableBuilder.checkNumberOfMatches(1).doEditValues(this.createRowMatchers(mRowValues), mTargetValues);
			} else {
				oTableBuilder.checkNumberOfMatches(1).doEditCreationRowValues(mTargetValues);
			}

			return this.prepareResult(
				oTableBuilder
					.description(
						Utils.formatMessage(
							"Changing row values of table '{0}' with old values='{1}' to new values='{2}'",
							this.getIdentifier(),
							bIsCreationRow ? "<CreationRow>" : mRowValues,
							mTargetValues
						)
					)
					.execute()
			);
		};

		/**
		 * Executes a table actions. The action is identified either by id or by a string representing
		 * the label of the action.
		 * If <code>vActionIdentifier</code> is passed as an object, the following pattern will be considered:
		 * <code><pre>
		 * 	{
		 * 		<service>: <name of the service>
		 * 		<action>: <name of the action>
		 * 		<unbound>: <true|false depending on whether or not the action is a bound action, default: unbound=false>
		 *  }
		 * </pre></code>
		 *
		 * @param {Object, String} [vActionIdentifier]
		 * @returns {object} an object extending a jQuery promise.
		 * The result corresponds to the result of {@link sap.ui.test.Opa5#waitFor}
		 *
		 * @private
		 * @experimental
		 */
		Actions.prototype.iExecuteAction = function(vActionIdentifier) {
			var aArguments = Utils.parseArguments([[Object, String]], arguments),
				oTableBuilder = this.getBuilder();

			return this.prepareResult(
				oTableBuilder
					.doExecuteAction(this.createActionMatcher(vActionIdentifier))
					.description(Utils.formatMessage("Executing table action '{0}'", aArguments[0]))
					.execute()
			);
		};

		/**
		 * Execute the table delete action.
		 *
		 * @private
		 */
		Actions.prototype.iExecuteDelete = function() {
			var oTableBuilder = this.getBuilder(),
				sDeleteId = "::StandardAction::Delete";

			return this.prepareResult(
				oTableBuilder
					.doExecuteAction(FEBuilder.Matchers.id(new RegExp(Utils.formatMessage("{0}$", sDeleteId))))
					.description(Utils.formatMessage("Pressing delete action of table '{0}'", this.getIdentifier()))
					.execute()
			);
		};

		/**
		 * Select Table QuickFilter Item. The QuickFilter item is identified either by a string representing
		 * the text of item or by object matching with key.
		 * If <code>vItemIdentifier</code> is passed as an object, the following pattern will be considered:
		 * <code><pre>
		 * 	{
		 * 		<annotationPath>: <name of the key>
		 *  }
		 * </pre></code>
		 *
		 * @param {Object, String} [vItemIdentifier]
		 * @returns {object} an object extending a jQuery promise.
		 * The result corresponds to the result of {@link sap.ui.test.Opa5#waitFor}
		 *
		 * @private
		 * @experimental
		 */

		Actions.prototype.iSelectQuickFilterItem = function(vItemIdentifier) {
			var oPropertyMatcher;
			if (Utils.isOfType(vItemIdentifier, String)) {
				oPropertyMatcher = { text: vItemIdentifier };
			} else if (Utils.isOfType(vItemIdentifier, Object)) {
				oPropertyMatcher = { key: vItemIdentifier.annotationPath };
			}
			return this.prepareResult(
				this.getBuilder()
					.doSelectQuickFilter(OpaBuilder.Matchers.properties(oPropertyMatcher))
					.description(
						Utils.formatMessage(
							"Selecting on table '{0}' quickFilter Item  with text '{1}'",
							this.getIdentifier(),
							vItemIdentifier
						)
					)
					.execute()
			);
		};

		/**
		 * Execute the table create action.
		 *
		 * @private
		 */
		Actions.prototype.iExecuteCreate = function() {
			var oTableBuilder = this.getBuilder(),
				sCreateId = "::StandardAction::Create";

			return this.prepareResult(
				oTableBuilder
					.doExecuteAction(FEBuilder.Matchers.id(new RegExp(Utils.formatMessage("{0}$", sCreateId))))
					.description(Utils.formatMessage("Pressing create action of table '{0}'", this.getIdentifier()))
					.execute()
			);
		};

		/**
		 * Execute the table inline create action.
		 *
		 * @private
		 */
		Actions.prototype.iExecuteInlineCreate = function() {
			var oTableBuilder = this.getBuilder();

			return this.prepareResult(
				oTableBuilder
					.doOnChildren(
						OpaBuilder.create(this)
							.hasType("sap.ui.table.CreationRow")
							.has(FEBuilder.Matchers.bound())
							.checkNumberOfMatches(1)
							.doPress("applyBtn")
					)
					.description(Utils.formatMessage("Pressing inline create action of table '{0}'", this.getIdentifier()))
					.execute()
			);
		};

		/**
		 * Executes an inline action on table rows/columns. The given row value map must match exactly one row. To identify the action to be executed
		 * the column index or the label of the action button can be provided.
		 *
		 * @param {object} mRowValues a map of columns (either name or index) to its value, e.g. <code>{ 0: "Max", "Last Name": "Mustermann" }</code>
		 * @param {string | int} vColumn identifies the inline action button to be clicked either by label of button or column-index
		 * @returns {object} an object extending a jQuery promise.
		 * The result corresponds to the result of {@link sap.ui.test.Opa5#waitFor}
		 *
		 * @public
		 * @sap-restricted
		 */
		Actions.prototype.iExecuteInlineAction = function(mRowValues, vColumn) {
			var aArguments = Utils.parseArguments([Object, [String, Number]], arguments),
				oTableBuilder = this.getBuilder();

			return this.prepareResult(
				oTableBuilder
					.checkNumberOfMatches(1)
					.doExecuteInlineAction(this.createRowMatchers(aArguments[0]), aArguments[1])
					.description(
						Utils.formatMessage(
							"Pressing inline action of table '{0}' for row '{1}' and action " +
								(Utils.isOfType(aArguments[1], Number) ? "with column index '{2}'" : "'{2}'"),
							this.getIdentifier(),
							aArguments[0],
							aArguments[1]
						)
					)
					.execute()
			);
		};

		/**
		 * Executes a keyboard shortcut.
		 *
		 * @param {string} sShortcut the shortcut pattern
		 * @returns {object} an object extending a jQuery promise.
		 * The result corresponds to the result of {@link sap.ui.test.Opa5#waitFor}
		 *
		 * @public
		 * @sap-restricted
		 */
		Actions.prototype.iExecuteKeyboardShortcut = function(sShortcut) {
			return this.prepareResult(
				this.getBuilder()
					.doPressKeyboardShortcut(sShortcut)
					.description(Utils.formatMessage("Execute keyboard shortcut '{1}' on table '{0}'", this.getIdentifier(), sShortcut))
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
		Actions.prototype.iSaveVariant = function(sVariantName) {
			var fnSuccessFunction = Utils.isOfType(sVariantName, String)
				? function(oTable) {
						return VMBuilder.create(this)
							.hasId(oTable.getId ? oTable.getId() + "::VM" : oTable[0].getId() + "::VM")
							.doSaveAs(sVariantName)
							.description(Utils.formatMessage("Saving variant for '{0}' as '{1}'", this.getIdentifier(), sVariantName))
							.execute();
				  }
				: function(oTable) {
						return VMBuilder.create(this)
							.hasId(oTable.getId ? oTable.getId() + "::VM" : oTable[0].getId() + "::VM")
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

		/**
		 * Removes the variant of given name.
		 *
		 * @param {string} sVariantName the name of the variant to remove. If omitted, the current variant will be overwritten.
		 * @returns {object} an object extending a jQuery promise.
		 * The result corresponds to the result of {@link sap.ui.test.Opa5#waitFor}
		 *
		 * @public
		 * @sap-restricted
		 */
		Actions.prototype.iRemoveVariant = function(sVariantName) {
			return this.prepareResult(
				this.getBuilder()
					.success(
						function(oTable) {
							return VMBuilder.create(this)
								.hasId(oTable.getId() + "::VM")
								.doRemoveVariant(sVariantName)
								.description(Utils.formatMessage("Removing variant '{1}' for '{0}'", this.getIdentifier(), sVariantName))
								.execute();
						}.bind(this)
					)
					.execute()
			);
		};

		/**
		 * Select the variant of given name.
		 *
		 * @param {string} sVariantName the name of the variant to remove. If omitted, the current variant will be overwritten.
		 * @returns {object} an object extending a jQuery promise.
		 * The result corresponds to the result of {@link sap.ui.test.Opa5#waitFor}
		 *
		 * @public
		 * @sap-restricted
		 */
		Actions.prototype.iSelectVariant = function(sVariantName) {
			return this.prepareResult(
				this.getBuilder()
					.success(
						function(oTable) {
							return VMBuilder.create(this)
								.hasId(oTable.getId() + "::VM")
								.doSelectVariant(sVariantName)
								.description(Utils.formatMessage("Selecting variant '{1}' for '{0}'", this.getIdentifier(), sVariantName))
								.execute();
						}.bind(this)
					)
					.execute()
			);
		};

		/**
		 * Adds a field as column in table.
		 * @param {string | sap.fe.test.api.ColumnIdentifier} vColumnIdentifier the column to add
		 * @returns {object} an object extending a jQuery promise.
		 * The result corresponds to the result of {@link sap.ui.test.Opa5#waitFor}
		 *
		 * @public
		 * @sap-restricted
		 */
		Actions.prototype.iAddAdaptationColumn = function(vColumnIdentifier) {
			return this.columnAdaptation(
				vColumnIdentifier,
				{ selected: false },
				OpaBuilder.Actions.press("selectMulti"),
				Utils.formatMessage("Adding column '{1}' to table '{0}'", this.getIdentifier(), vColumnIdentifier)
			);
		};

		/**
		 * Removes a field as column in table.
		 * @param {string | sap.fe.test.api.ColumnIdentifier} vColumnIdentifier the column to remove
		 * @returns {object} an object extending a jQuery promise.
		 * The result corresponds to the result of {@link sap.ui.test.Opa5#waitFor}
		 *
		 * @public
		 * @sap-restricted
		 */
		Actions.prototype.iRemoveAdaptationColumn = function(vColumnIdentifier) {
			return this.columnAdaptation(
				vColumnIdentifier,
				{ selected: true },
				OpaBuilder.Actions.press("selectMulti"),
				Utils.formatMessage("Removing field '{1}' to table '{0}'", this.getIdentifier(), vColumnIdentifier)
			);
		};

		return Actions;
	}
);
