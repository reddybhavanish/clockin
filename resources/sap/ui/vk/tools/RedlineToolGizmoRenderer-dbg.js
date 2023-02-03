/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

        (c) Copyright 2009-2015 SAP SE. All rights reserved
    
 */

sap.ui.define([
], function() {
	"use strict";

	/**
	 * RedlineToolGizmoRenderer renderer.
	 * @namespace
	 */
	var RedlineToolGizmoRenderer = {};

	/**
	 * Renders the HTML for the given control, using the provided {@link sap.ui.core.RenderManager}.
	 *
	 * @param {sap.ui.core.RenderManager} rm    the RenderManager that can be used for writing to the Render-Output-Buffer
	 * @param {sap.ui.core.Control} control     the control to be rendered
	 */
	RedlineToolGizmoRenderer.render = function(rm, control) {
		rm.write("<svg");
		rm.writeControlData(control);
		rm.addClass("sapUiVizkitRedlineTool");
		rm.writeClasses();
		rm.write(">");

		// SVG style to add a "halo" effect
		rm.write("\
			<defs>\
				<filter id='halo' filterUnits='userSpaceOnUse' >\
					<feGaussianBlur in='SourceAlpha' stdDeviation='3' result='blur' />\
					<feMerge>\
						<feMergeNode in='blur' />\
						<feMergeNode in='SourceGraphic' />\
					</feMerge>\
				</filter>\
			</defs>\
		");

		control.getRedlineElements().forEach(function(element) {
			element.render(rm);
		});

		if (control._activeElement) {
			control._activeElement.render(rm);
		}

		rm.write("</svg>");
	};

	return RedlineToolGizmoRenderer;

}, /* bExport= */ true);
