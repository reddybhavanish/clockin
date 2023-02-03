//@ui5-bundle sap/ui/mdc/designtime/library-preload.designtime.js
/*
 * ! SAPUI5

		(c) Copyright 2009-2020 SAP SE. All rights reserved
	
 */
sap.ui.predefine('sap/ui/mdc/designtime/field/FieldInfo.designtime',[],function(){"use strict";return{aggregations:{contentHandler:{ignore:true}},tool:{start:function(f){if(f.getContentHandler()){f.getContentHandler().setEnablePersonalization(false);}},stop:function(f){if(f.getContentHandler()){f.getContentHandler().setEnablePersonalization(true);}}}};});
sap.ui.predefine('sap/ui/mdc/designtime/filterbar/FilterBar.designtime',[],function(){"use strict";return{actions:{settings:function(){return{handler:function(c,p){return new Promise(function(r,a){var A=c._getAdaptationController();A.setLiveMode(false);var R=A.getAfterChangesCreated();var e=function(E){var C=E.getParameter("container");C.isPopupAdaptationAllowed=function(){return false;};C.addStyleClass(p.styleClass);};A.attachEvent("beforeP13nContainerOpens",e);A.setAfterChangesCreated(function(o,C){r(C);});var f=function(E){var s=E.getParameter("reason");if(s=="Cancel"){r([]);}A.setAfterChangesCreated(R);A.setLiveMode(true);A.detachEvent("beforeP13nContainerOpens",e);A.detachEvent("afterP13nContainerCloses",f);};A.attachEvent("afterP13nContainerCloses",f);A.showP13n(c,"Item");});}};}}};});
sap.ui.predefine('sap/ui/mdc/designtime/link/Panel.designtime',[],function(){"use strict";return{tool:{start:function(p){p.setEnablePersonalization(false);},stop:function(p){p.setEnablePersonalization(true);}}};});
sap.ui.predefine('sap/ui/mdc/designtime/link/PanelItem.designtime',[],function(){"use strict";return{domRef:function(p){var $=jQuery.find(".mdcbaseinfoPanelListItem");var a=$.filter(function(P){return jQuery(P).control(0).getParent().getKey()===p.getId();});return a[0];},name:{singular:"p13nDialog.PANEL_ITEM_NAME",plural:"p13nDialog.PANEL_ITEM_NAME_PLURAL"},actions:{remove:function(p){if(p.getIsMain()){return null;}return{changeType:"hideItem"};},reveal:function(p){if(p.getIsMain()){return null;}return{changeType:"revealItem"};}},isVisible:function(p){return p.getVisible();}};});
sap.ui.predefine('sap/ui/mdc/designtime/table/Table.designtime',["sap/ui/mdc/table/TableSettings"],function(T){"use strict";return{name:"{name}",description:"{description}",actions:{settings:function(){return{handler:function(c,p){return new Promise(function(r,a){var A=T._getAdaptationController(c);A.setLiveMode(false);var R=A.getAfterChangesCreated();var e=function(E){var C=E.getParameter("container");C.isPopupAdaptationAllowed=function(){return false;};C.addStyleClass(p.styleClass);};A.attachEvent("beforeP13nContainerOpens",e);A.setAfterChangesCreated(function(o,C){r(C);});var f=function(E){var s=E.getParameter("reason");if(s=="Cancel"){r([]);}A.setAfterChangesCreated(R);A.setLiveMode(true);A.detachEvent("beforeP13nContainerOpens",e);A.detachEvent("afterP13nContainerCloses",f);};A.attachEvent("afterP13nContainerCloses",f);A.showP13n(c,"Item");});}};}}};});
/*!
 * SAPUI5

		(c) Copyright 2009-2020 SAP SE. All rights reserved
	
 */
sap.ui.predefine('sap/ui/mdc/designtime/library.designtime',[],function(){"use strict";return{};});
//# sourceMappingURL=library-preload.designtime.js.map