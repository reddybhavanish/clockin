/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2017 SAP SE. All rights reserved
    
 */
sap.ui.define(["sap/m/Dialog","sap/m/Text","sap/m/Button"],function(D,T,B){"use strict";sap.ui.getCore().initLibrary({name:"sap.fe",dependencies:["sap.ui.core","sap.fe.templates"],types:[],interfaces:[],controls:[],elements:[],version:"1.78.0",noLibraryCSS:true});var d=new D({title:"Depreciation Notice",type:"Message",content:new T({text:"The sap.fe library will be deprecate in favor of sap.fe.template, please use `sap.fe.templates` instead"}),beginButton:new B({type:"Emphasized",text:"OK",press:function(){d.close();}}),afterClose:function(){d.destroy();}});d.open();return sap.fe;},false);
