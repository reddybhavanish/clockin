/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2020 SAP SE. All rights reserved
    
 */
sap.ui.define(["sap/ui/core/Fragment","sap/ui/core/XMLTemplateProcessor"],function(F,X){"use strict";sap.ui.getCore().initLibrary({name:"sap.fe.templates",dependencies:["sap.ui.core","sap.fe.core","sap.fe.macros"],types:["sap.fe.templates.VariantManagement","sap.fe.templates.ObjectPage.SectionLayout"],interfaces:[],controls:[],elements:[],version:"1.78.0",noLibraryCSS:true});sap.fe.templates.VariantManagement={None:"None",Page:"Page",Control:"Control"};if(!sap.fe.templates.ObjectPage){sap.fe.templates.ObjectPage={};}sap.fe.templates.ObjectPage.SectionLayout={Page:"Page",Tabs:"Tabs"};F.registerType("CUSTOM",{init:function(s){this._sExplicitId=this.getId();this._oContainingView=this;this.oController=s.containingView.getController().createExtensionAPI();this._aContent=X.parseTemplate(s.fragmentContent,this);}});return sap.fe.templates;},false);
