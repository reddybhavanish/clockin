/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2020 SAP SE. All rights reserved
    
 */
sap.ui.define(["sap/fe/macros/MacroMetadata"],function(M){"use strict";var C=M.extend("sap.fe.templates.fpm.CustomSection",{name:"CustomSection",namespace:"sap.fe.fpm",fragment:"sap.fe.templates.fpm.CustomSection",metadata:{properties:{entitySet:{type:"sap.ui.model.Context",required:true},id:{type:"string",required:true},fragmentName:{type:"string",required:true},fragmentType:{type:"string",required:true},editMode:{type:"string",defaultValue:"Display"}},events:{}},create:function(p,a){p.fragmentInstanceName=p.fragmentName+"-JS".replace(/\//g,".");return p;}});return C;});
