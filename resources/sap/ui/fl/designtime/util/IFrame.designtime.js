/*!
 * OpenUI5
 * (c) Copyright 2009-2020 SAP SE or an SAP affiliate company.
 * Licensed under the Apache License, Version 2.0 - see LICENSE.txt.
 */
sap.ui.define(["sap/ui/rta/plugin/iframe/AddIFrameDialog","sap/ui/core/IconPool","sap/m/library"],function(A,I){"use strict";I.registerFont({collectionName:"tnt",fontFamily:"SAP-icons-TNT",fontURI:sap.ui.require.toUrl("sap/tnt/themes/base/fonts"),lazy:true});function e(i){var a=new A();var s=i.get_settings();var d={parameters:A.buildUrlBuilderParametersFor(i),frameUrl:s.url,frameWidth:s.width,frameHeight:s.height,updateMode:true};return a.open(d).then(function(S){if(!S){return[];}var w;var h;if(S.frameWidth){w=S.frameWidth+S.frameWidthUnit;}else{w="100%";}if(S.frameHeight){h=S.frameHeight+S.frameHeightUnit;}else{h="100%";}return[{selectorControl:i,changeSpecificData:{changeType:"updateIFrame",content:{url:S.frameUrl,width:w,height:h}}}];});}return{actions:{settings:function(){return{icon:"sap-icon://tnt/content-enricher",name:"CTX_EDIT_IFRAME",isEnabled:true,handler:e};},remove:{changeType:"hideControl"}}};});
