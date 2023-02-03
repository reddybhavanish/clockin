/*!
 * SAPUI5

		(c) Copyright 2009-2020 SAP SE. All rights reserved
	
 */
sap.ui.define(["sap/ui/core/Element","sap/ui/mdc/mixin/DelegateMixin"],function(C,D){"use strict";var E=C.extend("sap.ui.mdc.Element",{metadata:{library:"sap.ui.mdc",properties:{delegate:{type:"object",group:"Data"}}},renderer:C.renderer});D.call(E.prototype);return E;});
