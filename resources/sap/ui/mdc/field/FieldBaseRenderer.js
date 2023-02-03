/*!
 * SAPUI5

		(c) Copyright 2009-2020 SAP SE. All rights reserved
	
 */
sap.ui.define(['sap/ui/core/Renderer','sap/ui/core/IconPool'],function(R,I){"use strict";I.insertFontFaceStyle();var F=R.extend("sap.ui.mdc.field.FieldBaseRenderer");F=Object.assign(F,{apiVersion:2});F.render=function(r,f){var c=f._getContent();var w=f.getWidth();r.openStart("div",f);r.class("sapUiMdcBaseField");if(c.length>1){r.class("sapUiMdcBaseFieldMoreFields");}r.style("width",w);r.openEnd();for(var i=0;i<c.length;i++){var C=c[i];r.renderControl(C);}r.close("div");};return F;});
