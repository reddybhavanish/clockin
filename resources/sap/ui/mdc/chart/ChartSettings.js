/*
 * ! SAPUI5

		(c) Copyright 2009-2020 SAP SE. All rights reserved
	
 */
sap.ui.define(["sap/ui/mdc/p13n/AdaptationController","sap/ui/mdc/p13n/FlexUtil"],function(A,F){"use strict";var C={showPanel:function(c,p,s,P){C["showP13n"+p](c,s);},_getAdaptationController:function(c){var r=sap.ui.getCore().getLibraryResourceBundle("sap.ui.mdc");if(!c._oAdaptationController){c._oAdaptationController=new A({liveMode:true,adaptationControl:c,stateRetriever:function(a,p){return C.getCurrentState(c);},afterChangesCreated:function(a,b){F.handleChanges(b);},itemConfig:{addOperation:"addItem",removeOperation:"removeItem",moveOperation:"moveItem",title:r.getText("chart.PERSONALIZATION_DIALOG_TITLE"),panelPath:"sap/ui/mdc/p13n/panels/ChartItemPanel"}});}return c._oAdaptationController;},getCurrentState:function(c){return{items:this._getVisibleProperties(c),sorter:this._getSortedProperties(c)};},_getVisibleProperties:function(c){var p=[];if(c){c.getItems().forEach(function(o,i){p.push({name:o.getKey(),id:o.getId(),label:o.getLabel(),role:o.getRole(),position:i});});}return p;},_getSortedProperties:function(c){return c.getSortConditions()?c.getSortConditions().sorters:[];},showP13nChart:function(c,s){var a=C._getAdaptationController(c);a.showP13n(s,"Item");},showP13nSort:function(c,s){var a=C._getAdaptationController(c);a.showP13n(s,"Sort");}};return C;});
