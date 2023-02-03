/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

        (c) Copyright 2009-2015 SAP SE. All rights reserved
    
 */
sap.ui.define([],function(){"use strict";var R={};R.render=function(r,c){r.write("<svg");r.writeControlData(c);r.addClass("sapUiVizkitRedlineTool");r.writeClasses();r.write(">");r.write("			<defs>				<filter id='halo' filterUnits='userSpaceOnUse' >					<feGaussianBlur in='SourceAlpha' stdDeviation='3' result='blur' />					<feMerge>						<feMergeNode in='blur' />						<feMergeNode in='SourceGraphic' />					</feMerge>				</filter>			</defs>		");c.getRedlineElements().forEach(function(e){e.render(r);});if(c._activeElement){c._activeElement.render(r);}r.write("</svg>");};return R;},true);
