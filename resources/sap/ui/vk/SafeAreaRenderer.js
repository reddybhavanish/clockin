/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

        (c) Copyright 2009-2015 SAP SE. All rights reserved
    
 */
sap.ui.define([],function(){"use strict";var S={};S.render=function(r,c){r.write("<div");r.writeControlData(c);var v=c.getParent();if(v){if(v.getShowSafeArea()){r.addClass("sapVizKitSafeAreaVisible");}else{r.addClass("sapVizKitSafeAreaNotVisible");}}r.writeClasses();r.write(">");if(c.getSettingsControl()){r.renderControl(c.getSettingsControl());}r.write("</div>");};return S;},true);
