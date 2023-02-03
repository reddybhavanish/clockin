sap.ui.define(["sap/base/Log", "sap/ui/base/Object"], function(Log, BaseObject) {
	"use strict";

	return BaseObject.extend("sap.fe.core.Synchronization", {
		constructor: function() {
			this._fnResolve = null;
			this._isResolved = false;

			return BaseObject.apply(this, arguments);
		},

		waitFor: function() {
			var that = this;

			if (this._isResolved) {
				return Promise.resolve();
			} else {
				return new Promise(function(resolve, reject) {
					that._fnResolve = resolve;
				});
			}
		},

		resolve: function() {
			if (!this._isResolved) {
				this._isResolved = true;
				if (this._fnResolve) {
					this._fnResolve();
				}
			}
		}
	});
});
