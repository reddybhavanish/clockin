/*!
 * SAPUI5

		(c) Copyright 2009-2020 SAP SE. All rights reserved
	
 */

// sap.ui.mdc.mixin.DelegateMixin
sap.ui.define([], function () {
	"use strict";

	var init = function (fnInit) {
		return function () {
			this.oDelegatePromise = new Promise(function (resolve, reject) {
				this.fnResolveDelegate = resolve;
				this.fnRejectDelegate = reject;
			}.bind(this));
			this._bLoading = false;
			fnInit.apply(this, arguments);
		};
	};

	var _cleanupDelegatePromise = function () {
		delete this.fnResolveDelegate;
		delete this.fnRejectDelegate;
	};

	var loadDelegateModule = function () {

		var oDelegate = this.getDelegate();

		if (!oDelegate || !oDelegate.name) {
			throw new Error("Delegate configuration invalid");
		}

		if (this._sDelegatePath && this._sDelegatePath != oDelegate.name) {
			throw new Error("Delegate configuration changes are not allowed");
		}

		if (this.DELEGATE) {
			return this.oDelegatePromise;
		}

		if (!this._bLoading) {
			this.DELEGATE = sap.ui.require(oDelegate.name);
			if (this.DELEGATE) {
				this._sDelegatePath = oDelegate.name;
				this.fnResolveDelegate(this.DELEGATE);
				_cleanupDelegatePromise.apply(this);
			} else {
				this._bLoading = true;
				this._sDelegatePath = oDelegate.name;
				sap.ui.require([
					oDelegate.name
				], function (oDelegateModule) {
					this.DELEGATE = oDelegateModule;
					this.fnResolveDelegate(oDelegateModule);
					_cleanupDelegatePromise.apply(this);
					this._bLoading = false;
				}.bind(this), function () {
					this.fnRejectDelegate("Module '" + oDelegate.name + "' not found control is not ready to use");
					_cleanupDelegatePromise.apply(this);
					this._bLoading = false;
				}.bind(this));
			}
		}

		return this.oDelegatePromise;
	};

	var exit = function (fnExit) {
		return function () {
			this.oDelegatePromise = undefined;
			this.DELEGATE = undefined;
			fnExit.apply(this, arguments);
		};
	};

	/**
	 * Applying the Delegate to a Control's prototype augments the loadDelegateModule function to provide a consolidated async handling for delegate modules
	 *
	 * @protected
	 * @alias sap.ui.mdc.mixin.DelegateMixin
	 * @mixin
	 * @since 1.76.0
	 */

	var DelegateMixin = function () {
		this.init = init(this.init);
		this.loadDelegateModule = loadDelegateModule;
		this.exit = exit(this.exit);
	};

	return DelegateMixin;
}, /* bExport= */ true);
