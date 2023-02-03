sap.ui.define(["sap/fe/test/Utils", "sap/ui/test/OpaBuilder", "sap/fe/test/builder/FEBuilder"], function(Utils, OpaBuilder, FEBuilder) {
	"use strict";

	/**
	 * An action identifier
	 *
	 * @typedef {Object} ActionIdentifier
	 * @property {string} service the name of the service
	 * @property {string} action the name of the action
	 * @property {boolean} [unbound] define whether the action is a bound action (default: false)
	 *
	 * @name sap.fe.test.api.ActionIdentifier
	 * @private
	 */

	function _findParentChainFunction(oResult, sChainKeyword) {
		var oAnd = oResult.and;
		if (sChainKeyword in oAnd) {
			return _findParentChainFunction(oAnd[sChainKeyword], sChainKeyword);
		}
		return oAnd;
	}

	var BaseApi = function(oOpaBuilder, vIdentifier) {
		this._oBuilder = oOpaBuilder;
		this._vIdentifier = vIdentifier;
	};

	/**
	 * Defines whether the current API is meant for actions (<code>true</code>) or assertions (<code>false</code>).
	 * It is used to enable parent chaining via <code>and.when</code> or <code>and.then</code> respectively.
	 * @type {boolean} define whether class is meant for actions, undefined will not add a parent chain keyword
	 * @public
	 * @sap-restricted
	 */
	BaseApi.prototype.isAction = undefined;

	/**
	 * Returns a new builder instance based on given one.
	 * @returns {object} an OpaBuilder instance
	 * @public
	 * @sap-restricted
	 */
	BaseApi.prototype.getBuilder = function() {
		// TODO uses internal OpaBuilder function - OpaBuilder needs some kind of copy-constructor or -function
		return new this._oBuilder.constructor(this.getOpaInstance(), this._oBuilder.build());
	};

	/**
	 * Returns the underlying Opa5 instance.
	 * @returns {sap.ui.test.Opa5} an OPA instance
	 * @public
	 * @sap-restricted
	 */
	BaseApi.prototype.getOpaInstance = function() {
		// TODO uses internal function
		return this._oBuilder._getOpaInstance();
	};

	BaseApi.prototype.getIdentifier = function() {
		return this._vIdentifier;
	};

	BaseApi.prototype.prepareResult = function(oWaitForResult) {
		var oParentChain = _findParentChainFunction(oWaitForResult, this.isAction ? "when" : "then");
		oWaitForResult.and = this;
		if (!Utils.isOfType(this.isAction, [null, undefined])) {
			oWaitForResult.and[this.isAction ? "when" : "then"] = oParentChain;
		}
		return oWaitForResult;
	};

	BaseApi.prototype.createActionMatcher = function(vActionIdentifier) {
		var vMatcher;

		if (!Utils.isOfType(vActionIdentifier, String)) {
			if (typeof vActionIdentifier.service === "string" && typeof vActionIdentifier.action === "string") {
				vActionIdentifier.id = vActionIdentifier.service + (vActionIdentifier.unbound ? "::" : ".") + vActionIdentifier.action;
				vMatcher = FEBuilder.Matchers.id(new RegExp(Utils.formatMessage("{0}$", vActionIdentifier.id)));
			} else {
				throw new Error(
					"not supported service and action parameters for creating a control id: " +
						vActionIdentifier.service +
						"/" +
						vActionIdentifier.action
				);
			}
		} else {
			vMatcher = OpaBuilder.Matchers.properties({ text: vActionIdentifier });
		}
		return vMatcher;
	};

	return BaseApi;
});
