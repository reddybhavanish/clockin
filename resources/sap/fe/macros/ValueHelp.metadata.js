/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2017 SAP SE. All rights reserved
    
 */
sap.ui.define(["./MacroMetadata"],function(M){"use strict";var V=M.extend("sap.fe.macros.ValueHelp",{name:"ValueHelp",namespace:"sap.fe.macros",fragment:"sap.fe.macros.ValueHelp",metadata:{stereotype:"xmlmacro",designtime:"sap/fe/macros/ValueHelp.designtime",properties:{idPrefix:{type:"string",defaultValue:"ValueHelp"},entitySet:{type:"sap.ui.model.Context",required:true,$kind:"EntitySet"},property:{type:"sap.ui.model.Context",required:true,$kind:"Property"},conditionModel:{type:"string",defaultValue:""},forceValueHelp:{type:"boolean",defaultValue:false},filterFieldValueHelp:{type:"boolean",defaultValue:false}},events:{}}});return V;});
