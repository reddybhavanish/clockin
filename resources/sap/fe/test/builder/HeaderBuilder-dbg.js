sap.ui.define(["./FEBuilder", "sap/ui/test/OpaBuilder"], function(FEBuilder, OpaBuilder) {
	"use strict";

	var HeaderBuilder = function() {
		return FEBuilder.apply(this, arguments);
	};

	HeaderBuilder.create = function(oOpaInstance) {
		return new HeaderBuilder(oOpaInstance);
	};

	HeaderBuilder.prototype = Object.create(FEBuilder.prototype);
	HeaderBuilder.prototype.constructor = HeaderBuilder;

	return HeaderBuilder;
});
