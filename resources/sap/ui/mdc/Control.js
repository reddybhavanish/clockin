/*!
 * SAPUI5

		(c) Copyright 2009-2020 SAP SE. All rights reserved
	
 */
sap.ui.define(["sap/ui/core/Control","sap/ui/mdc/mixin/DelegateMixin"],function(C,D){"use strict";var a=C.extend("sap.ui.mdc.Control",{metadata:{library:"sap.ui.mdc",properties:{width:{type:"sap.ui.core.CSSSize",group:"Dimension",defaultValue:"100%",invalidate:true},height:{type:"sap.ui.core.CSSSize",group:"Dimension",defaultValue:"100%",invalidate:true},delegate:{type:"object",group:"Data"},personalization:{type:"any",multiple:false}}},renderer:C.renderer});D.call(a.prototype);return a;});
