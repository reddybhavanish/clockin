/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2020 SAP SE. All rights reserved
    
 */
sap.ui.define(["sap/uxap/BlockBase"],function(B){"use strict";var S=B.extend("sap.fe.templates.ObjectPage.controls.SubSectionBlock",{metadata:{properties:{"columnLayout":{type:"sap.uxap.BlockBaseColumnLayout",group:"Behavior",defaultValue:4}},aggregations:{content:{type:"sap.ui.core.Control",multiple:false}}}});S.prototype._applyFormAdjustment=function(){var f=this.getFormAdjustment(),v=this._getSelectedViewContent(),p=this._oParentObjectPageSubSection,F;if(f!==sap.uxap.BlockBaseFormAdjustment.None&&v&&p){F=this._computeFormAdjustmentFields(f,p._oLayoutConfig);this._adjustForm(v,F);}};S.prototype.setMode=function(m){this.setProperty("mode",m);};S.prototype.connectToModels=function(){};S.prototype._getSelectedViewContent=function(){var c=this.getAggregation("content");return c;};return S;});
