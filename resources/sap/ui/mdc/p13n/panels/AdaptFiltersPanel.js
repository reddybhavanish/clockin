/*
 * ! SAPUI5

		(c) Copyright 2009-2020 SAP SE. All rights reserved
	
 */
sap.ui.define(["./BasePanel",'sap/ui/model/Filter','sap/m/ColumnListItem','sap/m/VBox','sap/m/HBox','sap/m/Label','sap/ui/core/Icon'],function(B,F,C,V,H,L,I){"use strict";var A=B.extend("sap.ui.mdc.p13n.panels.AdaptFiltersPanel",{library:"sap.ui.mdc",metadata:{},init:function(){B.prototype.init.apply(this,arguments);var p=new C({selected:"{selected}",cells:[new H({justifyContent:"SpaceBetween",width:"100%",alignItems:"Center",items:[new V({items:[new L({design:"Bold",required:"{required}",wrapping:true,tooltip:"{tooltip}",text:"{label}"}),new L({wrapping:true,tooltip:"{tooltip}",text:"{groupLabel}"})]}),new I({src:"sap-icon://filter",size:"1.25rem",visible:{path:"isFiltered",formatter:function(i){if(i){return true;}else{return false;}}}})]})]});this.setTemplate(p);this.setPanelColumns([this.getResourceText("filterbar.ADAPT_COLUMN_DESCRIPTION")]);},renderer:{}});A.prototype._onSearchFieldLiveChange=function(e){var f=new F([new F("label","Contains",e.getSource().getValue()),new F("groupLabel","Contains",e.getSource().getValue())]);this._oMTable.getBinding("items").filter(f,false);};return A;});
