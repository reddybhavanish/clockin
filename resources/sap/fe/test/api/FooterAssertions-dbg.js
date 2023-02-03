sap.ui.define(["./FooterAPI", "sap/fe/test/Utils", "sap/m/library", "sap/ui/test/OpaBuilder", "sap/fe/test/builder/FEBuilder"], function(
	FooterAPI,
	Utils,
	mLibrary,
	OpaBuilder,
	FEBuilder
) {
	"use strict";

	/**
	 * Constructor.
	 * @param {sap.fe.test.builder.OverflowToolbarBuilder} oOverflowToolbarBuilder the OverflowToolbarBuilder instance to operate on
	 * @param {string} [vFooterDescription] the footer description (optional), used to log message
	 * @returns {sap.fe.test.api.FooterAssertions} the instance
	 * @constructor
	 * @private
	 */
	var FooterAssertions = function(oOverflowToolbarBuilder, vFooterDescription) {
		return FooterAPI.call(this, oOverflowToolbarBuilder, vFooterDescription);
	};
	FooterAssertions.prototype = Object.create(FooterAPI.prototype);
	FooterAssertions.prototype.constructor = FooterAssertions;
	FooterAssertions.prototype.isAction = false;

	var DraftIndicatorState = mLibrary.DraftIndicatorState;

	function _checkDraftState(oOverflowToolbarBuilder, sState) {
		return oOverflowToolbarBuilder
			.hasAggregation("content", function(oObject) {
				return oObject.getMetadata().getName() === "sap.m.DraftIndicator" && oObject.getState() === sState;
			})
			.description("Draft Indicator on footer bar is in " + sState + " state")
			.execute();
	}

	/**
	 * Checks the state of footer actions. The action is identified either by id or by a string representing
	 * the label of the action.
	 * If <code>vActionIdentifier</code> is passed as an object, the following pattern will be considered:
	 * <code><pre>
	 * 	{
	 * 		<service>: <name of the service>
	 * 		<action>: <name of the action>
	 *  }
	 * </pre></code>
	 *
	 * Available action states are e.g.:
	 * <code><pre>
	 * 	{
	 * 		visible: true|false,
	 * 		enabled: true|false
	 * 	}
	 * </pre></code>
	 * @param {Object, String} [vActionIdentifier]
	 * @param {Object} [mState]
	 * @returns {object} an object extending a jQuery promise.
	 * The result corresponds to the result of {@link sap.ui.test.Opa5#waitFor}
	 *
	 * @private
	 * @experimental
	 */
	FooterAssertions.prototype.iCheckAction = function(vActionIdentifier, mState) {
		var aArguments = Utils.parseArguments([[Object, String], Object], arguments),
			oOverflowToolbarBuilder = this.getBuilder();

		return this.prepareResult(
			oOverflowToolbarBuilder
				.hasAggregation("content", [this.createActionMatcher(vActionIdentifier), FEBuilder.Matchers.states(mState)])
				.description(Utils.formatMessage("Checking footer action '{0}' with state='{1}'", aArguments[0], aArguments[1]))
				.execute()
		);
	};

	/**
	 * Checks the state of the footer action Apply.
	 * Available action states are e.g.:
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
	FooterAssertions.prototype.iCheckApply = function(mState) {
		var oOverflowToolbarBuilder = this.getBuilder();

		return this.prepareResult(
			oOverflowToolbarBuilder
				.hasAggregation("content", [
					OpaBuilder.Matchers.resourceBundle("text", "sap.fe.templates", "OBJECT_PAGE_APPLY_DRAFT"),
					FEBuilder.Matchers.states(mState)
				])
				.description(Utils.formatMessage("Checking footer action Apply with state='{0}'", mState))
				.execute()
		);
	};

	/**
	 * Checks for draft state 'Clear'.
	 *
	 * @returns {object} an object extending a jQuery promise.
	 * The result corresponds to the result of {@link sap.ui.test.Opa5#waitFor}
	 *
	 * @private
	 * @experimental
	 */
	FooterAssertions.prototype.iCheckDraftStateClear = function() {
		return this.prepareResult(_checkDraftState(this.getBuilder(), DraftIndicatorState.Clear));
	};
	/**
	 * Checks for draft state 'Saved'.
	 *
	 * @returns {object} an object extending a jQuery promise.
	 * The result corresponds to the result of {@link sap.ui.test.Opa5#waitFor}
	 *
	 * @private
	 * @experimental
	 */
	FooterAssertions.prototype.iCheckDraftStateSaved = function() {
		return this.prepareResult(_checkDraftState(this.getBuilder(), DraftIndicatorState.Saved));
	};

	return FooterAssertions;
});
