/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2017 SAP SE. All rights reserved
    
 */
sap.ui.define(["../MacroMetadata"],function(M){"use strict";var Q=M.extend("sap.fe.macros.QuickViewForm",{name:"QuickViewForm",namespace:"sap.fe.macros.field",fragment:"sap.fe.macros.field.QuickViewForm",metadata:{stereotype:"xmlmacro",designtime:"sap/fe/macros/QuickViewForm.designtime",properties:{entityType:{type:"sap.ui.model.Context"},dataField:{type:"sap.ui.model.Context",required:true,$kind:"Property",$Type:["com.sap.vocabularies.UI.v1.DataField","com.sap.vocabularies.UI.v1.DataFieldWithUrl","com.sap.vocabularies.UI.v1.DataFieldForAnnotation"]}},events:{}}});return Q;});
