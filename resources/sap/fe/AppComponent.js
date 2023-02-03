/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2017 SAP SE. All rights reserved
    
 */
sap.ui.define(["sap/fe/core/AppComponent","sap/base/Log","sap/m/Dialog","sap/m/Text","sap/m/Button"],function(C,L,D,T,B){"use strict";return C.extend("sap.fe.AppComponent",{init:function(){var t='This class of the AppComponent is deprecated, please use "sap.fe.core.AppComponent" instead';L.error(t);var d=new D({title:"Depreciation Notice",type:"Message",content:new T({text:t}),beginButton:new B({type:"Emphasized",text:"OK",press:function(){d.close();}}),afterClose:function(){d.destroy();}});d.open();C.prototype.init.apply(this,arguments);}});});
