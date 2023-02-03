sap.ui.define(
	[
		"./BaseAPI",
		"sap/fe/test/Utils",
		"sap/fe/test/builder/FEBuilder",
		"sap/fe/test/builder/TableBuilder",
		"sap/ui/test/OpaBuilder",
		"sap/ui/test/actions/Action"
	],
	function(BaseAPI, Utils, FEBuilder, TableBuilder, OpaBuilder, Action) {
		"use strict";

		/**
		 * A column identifier
		 *
		 * @typedef {Object} ColumnIdentifier
		 * @property {string} property the name of the property
		 *
		 * @name sap.fe.test.api.ColumnIdentifier
		 * @private
		 */

		/**
		 * Constructor.
		 * @param {sap.fe.test.builder.TableBuilder} oTableBuilder the table builder instance to operate on
		 * @param {string} [vTableDescription] the table description (optional), used to log message
		 * @returns {sap.fe.test.api.TableAPI} the instance
		 * @constructor
		 * @private
		 */
		var TableAPI = function(oTableBuilder, vTableDescription) {
			if (!Utils.isOfType(oTableBuilder, TableBuilder)) {
				throw new Error("oTableBuilder parameter must be an TableBuilder instance");
			}
			return BaseAPI.call(this, oTableBuilder, vTableDescription);
		};
		TableAPI.prototype = Object.create(BaseAPI.prototype);
		TableAPI.prototype.constructor = TableAPI;

		TableAPI.prototype.createRowMatchers = function(mRowValues, mRowState, vAdditionalMatchers) {
			var aArguments = Utils.parseArguments([Object, Object, [Array, Function]], arguments),
				aRowMatchers = [];
			if (Utils.isOfType(aArguments[0], Object)) {
				aRowMatchers.push(TableBuilder.Row.Matchers.cellValues(aArguments[0]));
			}
			if (Utils.isOfType(aArguments[1], Object)) {
				aRowMatchers.push(TableBuilder.Row.Matchers.states(aArguments[1]));
			}
			if (!Utils.isOfType(aArguments[2], [null, undefined])) {
				aRowMatchers = aRowMatchers.concat(aArguments[2]);
			}
			return aRowMatchers;
		};

		/**
		 * Opens the column adaptation dialog.
		 *
		 * @returns {object} an object extending a jQuery promise
		 * @public
		 * @sap-restricted
		 */
		TableAPI.prototype.iOpenColumnAdaptation = function() {
			var oTableBuilder = this.getBuilder();
			return this.prepareResult(
				oTableBuilder
					.doOpenColumnAdaptation()
					.description(
						Utils.formatMessage("Opening the column adaptation dialog for '{0}' (if not open yet)", this.getIdentifier())
					)
					.execute()
			);
		};

		/**
		 * Closes the column adaptation dialog.
		 *
		 * @returns {object} an object extending a jQuery promise
		 * @public
		 * @sap-restricted
		 */
		TableAPI.prototype.iCloseColumnAdaptation = function() {
			return this.prepareResult(
				FEBuilder.createClosePopoverBuilder(
					this.getOpaInstance(),
					OpaBuilder.Matchers.resourceBundle("title", "sap.ui.mdc", "table.SETTINGS_COLUMN")
				)
					.description(
						Utils.formatMessage("Closing the column adaptation dialog for '{0}' (if currently open)", this.getIdentifier())
					)
					.execute()
			);
		};

		/**
		 * Helper method to adapt columns fields. If no actions are given, this function can be used for checking only.
		 * During execution it checks for an already open adaptation popover. If it does not exist, it is opened before
		 * the check/interaction of the columns, and closed directly afterwards.
		 *
		 * @param {string | sap.fe.test.api.ColumnIdentifier} vColumnIdentifier the field identifier
		 * @param {object} [mState] the state of the adaptation field. The following states are supported:
		 * <code><pre>
		 * 	{
		 * 		selected: true|false
		 * 	}
		 * </pre></code>
		 * @param {function | array | sap.ui.test.actions.Action} [vActions] actions to be executed on found adaptation field
		 * @param {string} sDescription the description of the check or adaptation
		 * @returns {*}
		 *
		 * @private
		 * @sap-restricted
		 */
		TableAPI.prototype.columnAdaptation = function(vColumnIdentifier, mState, vActions, sDescription) {
			var aArguments = Utils.parseArguments([[String, Object], Object, [Function, Array, Action], String], arguments),
				oBuilder = FEBuilder.create(this.getOpaInstance()),
				bPopoverOpen,
				oAdaptColumnBuilder = FEBuilder.create(this.getOpaInstance())
					.hasType("sap.m.ColumnListItem")
					.isDialogElement(),
				oPopoverBuilder = FEBuilder.createPopoverBuilder(
					this.getOpaInstance(),
					OpaBuilder.Matchers.resourceBundle("title", "sap.ui.mdc", "table.SETTINGS_COLUMN")
				);

			vColumnIdentifier = aArguments[0];
			if (Utils.isOfType(vColumnIdentifier, String)) {
				oAdaptColumnBuilder.has(OpaBuilder.Matchers.bindingProperties(undefined, { label: vColumnIdentifier }));
			} else {
				oAdaptColumnBuilder.has(
					OpaBuilder.Matchers.bindingProperties(undefined, {
						name: vColumnIdentifier.property
					})
				);
			}

			mState = aArguments[1];
			if (!Utils.isOfType(mState, [null, undefined])) {
				oAdaptColumnBuilder.hasState(mState);
			}

			vActions = aArguments[2];
			if (!Utils.isOfType(vActions, [null, undefined])) {
				oPopoverBuilder.do(vActions);
			}

			sDescription = aArguments[3];
			return this.prepareResult(
				oBuilder
					.success(
						function() {
							bPopoverOpen = FEBuilder.controlsExist(oPopoverBuilder);

							if (!bPopoverOpen) {
								this.iOpenColumnAdaptation();
							}

							if (!bPopoverOpen) {
								oPopoverBuilder.success(this.iCloseColumnAdaptation.bind(this));
							}

							return oPopoverBuilder
								.has(OpaBuilder.Matchers.children(oAdaptColumnBuilder))
								.has(FEBuilder.Matchers.atIndex(0))
								.checkNumberOfMatches(1)
								.description(sDescription)
								.execute();
						}.bind(this)
					)
					.execute()
			);
		};

		return TableAPI;
	}
);
