/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2017 SAP SE. All rights reserved
    
 */
sap.ui.define([],function(){"use strict";sap.ui.getCore().initLibrary({name:"sap.fe.navigation",version:"1.78.0",dependencies:["sap.ui.core"],types:["sap.fe.navigation.NavType","sap.fe.navigation.ParamHandlingMode","sap.fe.navigation.SuppressionBehavior"],interfaces:[],controls:[],elements:[],noLibraryCSS:true});sap.fe.navigation.ParamHandlingMode={SelVarWins:"SelVarWins",URLParamWins:"URLParamWins",InsertInSelOpt:"InsertInSelOpt"};sap.fe.navigation.NavType={initial:"initial",URLParams:"URLParams",xAppState:"xAppState",iAppState:"iAppState"};sap.fe.navigation.SuppressionBehavior={standard:0,ignoreEmptyString:1,raiseErrorOnNull:2,raiseErrorOnUndefined:4};return sap.fe.navigation;},false);
