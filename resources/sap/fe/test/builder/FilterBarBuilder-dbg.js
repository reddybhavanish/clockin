sap.ui.define(["./FEBuilder", "sap/ui/test/OpaBuilder"], function(FEBuilder, OpaBuilder) {
	"use strict";

	var FilterBarBuilder = function() {
		return FEBuilder.apply(this, arguments);
	};

	FilterBarBuilder.create = function(oOpaInstance) {
		return new FilterBarBuilder(oOpaInstance);
	};

	FilterBarBuilder.prototype = Object.create(FEBuilder.prototype);
	FilterBarBuilder.prototype.constructor = FilterBarBuilder;

	FilterBarBuilder.prototype.hasField = function(vFieldMatcher, bReturnField) {
		return bReturnField
			? this.has(OpaBuilder.Matchers.aggregation("filterItems", vFieldMatcher)).has(FEBuilder.Matchers.atIndex(0))
			: this.has(OpaBuilder.Matchers.aggregationMatcher("filterItems", vFieldMatcher));
	};

	FilterBarBuilder.prototype.hasEditingStatus = function(oEditState, mState) {
		var fnEditStateMatcher = OpaBuilder.Matchers.resourceBundle("label", "sap.fe.macros", "filterbar.EDITING_STATUS");
		if (mState && "visible" in mState && mState.visible === false) {
			return this.has(function(oFilterBar) {
				return !oFilterBar.getFilterItems().some(FEBuilder.Matchers.match(fnEditStateMatcher));
			});
		}

		var aFilterItemsMatchers = [fnEditStateMatcher];
		if (oEditState) {
			aFilterItemsMatchers.push(
				OpaBuilder.Matchers.hasAggregation("contentEdit", OpaBuilder.Matchers.properties("selectedKey", oEditState.id))
			);
		}
		if (mState && Object.keys(mState).length) {
			aFilterItemsMatchers.push(FEBuilder.Matchers.states(mState));
		}

		return this.hasAggregation("filterItems", aFilterItemsMatchers);
	};

	FilterBarBuilder.prototype.doChangeEditingStatus = function(vEditState) {
		var fnEditStateMatcher = OpaBuilder.Matchers.resourceBundle("label", "sap.fe.macros", "filterbar.EDITING_STATUS");
		return this.doOnAggregation("filterItems", fnEditStateMatcher, OpaBuilder.Actions.enterText(vEditState.display));
	};

	FilterBarBuilder.prototype.doChangeSearch = function(sSearchText) {
		return this.doOnAggregation("basicSearchField", OpaBuilder.Actions.enterText(sSearchText || ""));
	};

	FilterBarBuilder.prototype.doResetSearch = function() {
		return this.doOnAggregation("basicSearchField", OpaBuilder.Actions.press("inner-reset"));
	};

	FilterBarBuilder.prototype.doSearch = function() {
		return this.doPress("btnSearch");
	};

	FilterBarBuilder.prototype.doOpenSettings = function() {
		return this.doPress("btnAdapt");
	};

	return FilterBarBuilder;
});
