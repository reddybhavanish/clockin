/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2020 SAP SE. All rights reserved
    
 */
sap.ui.define(["sap/fe/core/TemplateComponent","sap/base/Log","sap/fe/templates/VariantManagement"],function(T,L,V){"use strict";var a=T.extend("sap.fe.templates.ListReport.Component",{metadata:{properties:{initialLoad:{type:"boolean",defaultValue:true},variantManagement:{type:"sap.fe.templates.VariantManagement",defaultValue:V.Page}},library:"sap.fe.templates",manifest:"json"},onBeforeBinding:function(c){},onAfterBinding:function(c,p){T.prototype.onAfterBinding.apply(this,arguments);this.getRootControl().getController().onAfterBinding(c,p);},getViewData:function(){var v=T.prototype.getViewData.apply(this,arguments);v.liveMode=false;return v;}});return a;},true);
