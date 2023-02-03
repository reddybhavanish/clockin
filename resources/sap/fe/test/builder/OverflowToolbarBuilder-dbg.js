sap.ui.define(["sap/ui/test/OpaBuilder", "./FEBuilder", "sap/fe/test/Utils", "sap/ui/test/matchers/Interactable"], function(
	OpaBuilder,
	FEBuilder,
	Utils,
	Interactable
) {
	"use strict";

	var OverflowToolbarBuilder = function() {
		return FEBuilder.apply(this, arguments);
	};

	OverflowToolbarBuilder.create = function(oOpaInstance) {
		return new OverflowToolbarBuilder(oOpaInstance);
	};

	OverflowToolbarBuilder.prototype = Object.create(FEBuilder.prototype);
	OverflowToolbarBuilder.prototype.constructor = OverflowToolbarBuilder;

	OverflowToolbarBuilder._toggleOverflow = function(oBuilder, bOpen, sToolbarSuffix) {
		var sOverflowButtonId = "overflowButton";
		if (sToolbarSuffix) {
			sOverflowButtonId = sToolbarSuffix + "-" + sOverflowButtonId;
		}
		return oBuilder.doConditional(
			OpaBuilder.Matchers.childrenMatcher(
				OpaBuilder.create()
					.has(FEBuilder.Matchers.id(new RegExp(sOverflowButtonId + "$")))
					.hasProperties({ pressed: !bOpen })
					.has(new Interactable())
					.mustBeEnabled()
					.mustBeVisible()
			),
			OpaBuilder.Actions.press(sOverflowButtonId)
		);
	};

	OverflowToolbarBuilder.openOverflow = function(oBuilder, sToolbarSuffix) {
		return OverflowToolbarBuilder._toggleOverflow(oBuilder, true, sToolbarSuffix);
	};

	OverflowToolbarBuilder.closeOverflow = function(oBuilder, sToolbarSuffix) {
		return OverflowToolbarBuilder._toggleOverflow(oBuilder, false, sToolbarSuffix);
	};

	OverflowToolbarBuilder.prototype.doOpenOverflow = function() {
		return OverflowToolbarBuilder.openOverflow(this);
	};

	OverflowToolbarBuilder.prototype.doCloseOverflow = function() {
		return OverflowToolbarBuilder.closeOverflow(this);
	};

	OverflowToolbarBuilder.prototype.doOnContent = function(vContentMatcher, vContentAction) {
		var oSuccessBuilder = new OverflowToolbarBuilder(this._getOpaInstance(), this.build()).doOnAggregation(
			"content",
			[vContentMatcher, new Interactable()],
			vContentAction || OpaBuilder.Actions.press()
		);
		return this.doOpenOverflow().success(oSuccessBuilder);
	};

	OverflowToolbarBuilder.prototype.hasContent = function(vContentMatcher, mState) {
		var aMatchers = [vContentMatcher];
		if (mState) {
			aMatchers.push(FEBuilder.Matchers.states(mState));
		}
		var oSuccessBuilder = new OverflowToolbarBuilder(this._getOpaInstance(), this.build()).hasAggregation("content", aMatchers);
		return this.doOpenOverflow().success(oSuccessBuilder);
	};

	return OverflowToolbarBuilder;
});
