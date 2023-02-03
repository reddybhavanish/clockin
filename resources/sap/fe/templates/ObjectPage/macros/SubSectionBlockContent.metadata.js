/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2020 SAP SE. All rights reserved
    
 */
sap.ui.define(["sap/fe/macros/MacroMetadata"],function(M){"use strict";var S=M.extend("sap.fe.templates.ObjectPage.macros.SubSectionBlockContent",{name:"SubSectionBlockContent",namespace:"sap.fe.templates.ObjectPage.macros",fragment:"sap.fe.templates.ObjectPage.macros.SubSectionBlockContent",metadata:{stereotype:"xmlmacro",properties:{id:{type:"string"},facet:{type:"sap.ui.model.Context"},metaPath:{type:"sap.ui.model.Context"},entitySet:{type:"sap.ui.model.Context",required:true,$kind:["NavigationProperty","EntitySet"]},viewData:{type:"sap.ui.model.Context",required:true},partOfPreview:{type:"boolean",defaultValue:true}}}});return S;});
