/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2020 SAP SE. All rights reserved
    
 */
/* eslint-disable no-alert */

/* global Promise */
sap.ui.define(["sap/base/Log", "sap/ui/base/Object", "sap/ui/model/Context"], function(Log, BaseObject, Context) {
	"use strict";

	var PREFIX = "@FE.";
	var replaceRegEx = new RegExp(PREFIX, "g");

	return BaseObject.extend("sap.fe.core.TemplateModel", {
		oMetaModel: null,
		oConfigModel: null,

		constructor: function(oMetaModel, oConfigModel) {
			this.oMetaModel = oMetaModel;
			this.oConfigModel = oConfigModel;

			this.fnCreateMetaBindingContext = this.oMetaModel.createBindingContext.bind(this.oMetaModel);
			this.fnCreateConfigBindingContext = this.oConfigModel.createBindingContext.bind(this.oConfigModel);
			this.fnMetaModelResolve = this.oMetaModel.resolve.bind(this.oMetaModel);
			this.fnConfigModelResolve = this.oConfigModel.resolve.bind(this.oConfigModel);

			var fnGetObject = this.oConfigModel._getObject.bind(this.oConfigModel);
			this.oConfigModel._getObject = function(sPath, oContext) {
				var sResolvedPath = "";
				if (oContext) {
					sResolvedPath = oContext.getPath();
				}
				if (sPath) {
					sResolvedPath = sResolvedPath + (sResolvedPath ? "/" : "") + sPath;
				}

				sResolvedPath = sResolvedPath.replace(replaceRegEx, "");
				return fnGetObject(sResolvedPath);
			};
			this.oMetaModel.resolve = this.resolve.bind(this);
			this.oConfigModel.resolve = this.resolve.bind(this);
			this.oMetaModel.createBindingContext = this.createBindingContext.bind(this);
			this.oConfigModel.createBindingContext = this.createBindingContext.bind(this);
			return this.oMetaModel;
		},
		isConfig: function(sPath) {
			if (!sPath) {
				return false;
			}
			var aSections = sPath.split("/"),
				_isAnyFEPrefix = function(aPathSections) {
					if (Array.isArray(aPathSections)) {
						for (var i = 0; i < aPathSections.length; i++) {
							if (aPathSections[i].indexOf(PREFIX) === 0) {
								return true;
							}
						}
					}
					return false;
				};

			return aSections && _isAnyFEPrefix(aSections);
		},
		resolve: function(sPath, oContext) {
			if (this.isConfig(sPath)) {
				return this.fnConfigModelResolve(sPath, (oContext && oContext.$$configModelContext) || oContext);
			} else {
				return this.fnMetaModelResolve(sPath, oContext);
			}
		},
		createBindingContext: function(sPath, oContext, mParameters, fnCallBack) {
			var oBindingContext, sResolvedPath;

			if (this.isConfig(sPath)) {
				oBindingContext = this.fnCreateConfigBindingContext(sPath, oContext, mParameters, fnCallBack);
				sResolvedPath = oBindingContext.getObject();
				if (sResolvedPath && typeof sResolvedPath === "string" && !this.isConfig(sResolvedPath)) {
					oBindingContext = this.fnCreateMetaBindingContext(sResolvedPath, oContext, mParameters, fnCallBack);
				}
			} else {
				oBindingContext = this.fnCreateMetaBindingContext.apply(this.oMetaModel, arguments);
				var sConfigModelPath = mParameters && mParameters.$$configModelPath;
				if (sConfigModelPath) {
					// If a configModelPath is provided we are at top level so no context is ok
					// On top of that we cannot call the metamodel for this as it will cache the result
					oBindingContext = new Context(this.oMetaModel, sPath);
					oBindingContext.$$configModelContext = this.fnCreateConfigBindingContext(
						sConfigModelPath,
						oContext,
						mParameters,
						fnCallBack
					);
				}
			}

			return oBindingContext;
		}
	});
});
