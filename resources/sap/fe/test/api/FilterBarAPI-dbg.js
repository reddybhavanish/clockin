sap.ui.define(
	[
		"./BaseAPI",
		"sap/fe/test/Utils",
		"sap/ui/test/OpaBuilder",
		"sap/ui/test/actions/Action",
		"sap/fe/test/builder/FEBuilder",
		"sap/fe/test/builder/FilterBarBuilder",
		"sap/fe/test/builder/FilterFieldBuilder",
		"./FieldActions",
		"./FieldAssertions",
		"sap/fe/core/model/DraftEditState"
	],
	function(
		BaseAPI,
		Utils,
		OpaBuilder,
		Action,
		FEBuilder,
		FilterBarBuilder,
		FilterFieldBuilder,
		FieldActions,
		FieldAssertions,
		EditState
	) {
		"use strict";

		/**
		 * A filter field identifier
		 *
		 * @typedef {Object} FilterFieldIdentifier
		 * @property {string} property the name of the property
		 *
		 * @name sap.fe.test.api.FilterFieldIdentifier
		 * @private
		 */

		/**
		 * Constructor.
		 * @param {sap.fe.test.builder.FilterBarBuilder} oFilterBarBuilder the filter bar builder instance to operate on
		 * @param {string} [vFilterBarDescription] the filter bar description (optional), used to log message
		 * @returns {sap.fe.test.api.FilterBarAPI} the instance
		 * @constructor
		 * @public
		 * @sap-restricted
		 */
		var FilterBarAPI = function(oFilterBarBuilder, vFilterBarDescription) {
			if (!Utils.isOfType(oFilterBarBuilder, FilterBarBuilder)) {
				throw new Error("oFilterBarBuilder parameter must be a FilterBarBuilder instance");
			}
			return BaseAPI.call(this, oFilterBarBuilder, vFilterBarDescription);
		};
		FilterBarAPI.prototype = Object.create(BaseAPI.prototype);
		FilterBarAPI.prototype.constructor = FilterBarAPI;

		/**
		 * Available values for editing states.
		 *
		 * @enum {String}
		 * @public
		 * @sap-restricted
		 */
		FilterBarAPI.EditState = {
			/**
			 * All.
			 * @constant
			 * @type {string}
			 * @public
			 * @sap-restricted
			 */
			All: EditState.ALL.id,
			/**
			 * Unchanged.
			 * @constant
			 * @type {string}
			 * @public
			 * @sap-restricted
			 */
			Unchanged: EditState.UNCHANGED.id,
			/**
			 * Own Draft.
			 * @constant
			 * @type {string}
			 * @public
			 * @sap-restricted
			 */
			OwnDraft: EditState.OWN_DRAFT.id,
			/**
			 * Locked by Another User.
			 * @constant
			 * @type {string}
			 * @public
			 * @sap-restricted
			 */
			Locked: EditState.LOCKED.id,
			/**
			 * Unsaved Changes by Another User.
			 * @constant
			 * @type {string}
			 * @public
			 * @sap-restricted
			 */
			UnsavedChanges: EditState.UNSAVED_CHANGES.id
		};

		/**
		 * Retrieve a filter field by its identifier.
		 *
		 * @param {string | sap.fe.test.api.FilterFieldIdentifier} vFieldIdentifier Identifier for field in the filter bar.
		 * If the identifier is a string, the label of the filter field is validated.
		 * Should not be used for testing against productive backend service.
		 * @returns {sap.fe.test.builder.FilterFieldBuilder} the FieldBuilder instance
		 *
		 * @public
		 * @sap-restricted
		 */
		FilterBarAPI.prototype.createFilterFieldBuilder = function(vFieldIdentifier) {
			var oFilterBarBuilder = this.getBuilder(),
				vFieldMatcher;

			if (Utils.isOfType(vFieldIdentifier, String)) {
				vFieldMatcher = OpaBuilder.Matchers.properties({ label: vFieldIdentifier });
			} else {
				vFieldMatcher = FEBuilder.Matchers.id(RegExp(Utils.formatMessage("::FilterField::{0}$", vFieldIdentifier.property)));
			}
			oFilterBarBuilder.hasField(vFieldMatcher, true);

			return FilterFieldBuilder.create(this.getOpaInstance()).options(oFilterBarBuilder.build());
		};

		/**
		 * Opens the filter bar adaptation. It can be used in action as well as assertion chain.
		 *
		 * @public
		 * @sap-restricted
		 */
		FilterBarAPI.prototype.iOpenFilterAdaptation = function() {
			var oFilterBarBuilder = this.getBuilder();
			return this.prepareResult(
				oFilterBarBuilder
					.doOpenSettings()
					.description(Utils.formatMessage("Opening the filter bar adaptation dialog for '{0}'", this.getIdentifier()))
					.execute()
			);
		};

		/**
		 * Closes the filter bar adaptation. It can be used in action as well as assertion chain.
		 *
		 * @public
		 * @sap-restricted
		 */
		FilterBarAPI.prototype.iCloseFilterAdaptation = function() {
			return this.prepareResult(
				FEBuilder.createClosePopoverBuilder(
					this.getOpaInstance(),
					OpaBuilder.Matchers.resourceBundle("title", "sap.ui.mdc", "filterbar.ADAPT_TITLE")
				)
					.description(Utils.formatMessage("Closing the filter bar adaptation dialog for '{0}'", this.getIdentifier()))
					.execute()
			);
		};

		/**
		 * Helper method to adapt filter fields. If no actions are given, this function can be used for checking only.
		 * During execution it checks for an already open adaptation popover. If it does not exist, it is opened before
		 * the check/interaction of the filter fields, and closed directly afterwards.
		 *
		 * @param {string | sap.fe.test.api.FilterFieldIdentifier} vFieldIdentifier the field identifier
		 * @param {object} [mState] the state of the adaptation field. The following states are supported:
		 * <code><pre>
		 * 	{
		 * 		selected: true|false,
		 * 		filtered: true|false
		 * 	}
		 * </pre></code>
		 * @param {function | array | sap.ui.test.actions.Action} [vActions] actions to be executed on found adaptation field
		 * @param {string} sDescription the description of the check or adaptation
		 * @returns {*}
		 *
		 * @sap-restricted
		 */
		FilterBarAPI.prototype.filterFieldAdaptation = function(vFieldIdentifier, mState, vActions, sDescription) {
			var aArguments = Utils.parseArguments([[String, Object], Object, [Function, Array, Action], String], arguments),
				oBuilder = FEBuilder.create(this.getOpaInstance()),
				bPopoverOpen,
				oAdaptColumnBuilder = FEBuilder.create(this.getOpaInstance())
					.hasType("sap.m.ColumnListItem")
					.isDialogElement(),
				oPopoverBuilder = FEBuilder.createPopoverBuilder(
					this.getOpaInstance(),
					OpaBuilder.Matchers.resourceBundle("title", "sap.ui.mdc", "filterbar.ADAPT_TITLE")
				);

			vFieldIdentifier = aArguments[0];
			if (Utils.isOfType(vFieldIdentifier, String)) {
				oAdaptColumnBuilder.has(OpaBuilder.Matchers.bindingProperties(undefined, { label: vFieldIdentifier }));
			} else {
				oAdaptColumnBuilder.has(OpaBuilder.Matchers.bindingProperties(undefined, { name: vFieldIdentifier.property }));
			}

			mState = aArguments[1];
			if (!Utils.isOfType(mState, [null, undefined])) {
				if ("filtered" in mState) {
					oAdaptColumnBuilder.has(OpaBuilder.Matchers.bindingProperties(undefined, { isFiltered: mState.filtered }));
					delete mState.filtered;
				}
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
								this.iOpenFilterAdaptation();
							}

							if (!bPopoverOpen) {
								oPopoverBuilder.success(this.iCloseFilterAdaptation.bind(this));
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

		return FilterBarAPI;
	}
);
