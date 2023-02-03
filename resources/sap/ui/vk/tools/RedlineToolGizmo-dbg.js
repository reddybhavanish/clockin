/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

        (c) Copyright 2009-2015 SAP SE. All rights reserved
    
 */

// Provides control sap.ui.vk.tools.RedlineToolGizmo
sap.ui.define([
	"./Gizmo",
	"./RedlineToolGizmoRenderer"
], function(
	Gizmo,
	RedlineToolGizmoRenderer
) {
	"use strict";

	/**
	 * Constructor for a new RedlineToolGizmo.
	 *
	 * @param {string} [sId] ID for the new control, generated automatically if no ID is given
	 * @param {object} [mSettings] Initial settings for the new control
	 *
	 * @class
	 * Provides UI to display tooltips
	 * @extends sap.ui.vk.tools.Gizmo
	 *
	 * @author SAP SE
	 * @version 1.78.0
	 *
	 * @constructor
	 * @private
	 * @alias sap.ui.vk.tools.RedlineToolGizmo
	 * @ui5-metamodel This control/element also will be described in the UI5 (legacy) designtime metamodel
	 */
	var RedlineToolGizmo = Gizmo.extend("sap.ui.vk.tools.RedlineToolGizmo", /** @lends sap.ui.vk.tools.RedlineToolGizmo.prototype */ {
		metadata: {
			library: "sap.ui.vk",
			aggregations: {
				redlineElements: {
					type: "sap.ui.vk.RedlineElement"
				},
				activeElement: {
					type: "sap.ui.vk.RedlineElement",
					multiple: false,
					visibility: "hidden"
				}
			}
		}
	});

	RedlineToolGizmo.prototype.init = function() {
		if (Gizmo.prototype.init) {
			Gizmo.prototype.init.apply(this);
		}

		this._activeElement = null;
		this._virtualLeft = 0;
		this._virtualTop = 0;
		this._virtualSideLength = 1;
	};

	RedlineToolGizmo.prototype.show = function() {
		this.getParent()._viewport.attachEvent("resize", null, this._onResize, this);
		this.addStyleClass("sapUiVizkitRedlineInteractionMode");
	};

	RedlineToolGizmo.prototype.hide = function() {
		this.getParent()._viewport.detachEvent("resize", this._onResize, this);
		this.removeStyleClass("sapUiVizkitRedlineDesignMode");
		this.removeStyleClass("sapUiVizkitRedlineInteractionMode");
	};

	RedlineToolGizmo.prototype._startAdding = function(elementInstance) {
		this._activeElement = elementInstance;
		this.setAggregation("activeElement", this._activeElement);

		this.removeStyleClass("sapUiVizkitRedlineInteractionMode");
		this.addStyleClass("sapUiVizkitRedlineDesignMode");
	};

	RedlineToolGizmo.prototype._stopAdding = function() {
		this.setAggregation("activeElement", null);
		this._activeElement = null;

		this.removeStyleClass("sapUiVizkitRedlineDesignMode");
		this.addStyleClass("sapUiVizkitRedlineInteractionMode");
	};

	/**
	 * Translates one or two values from the absolute pixel space to the relative values
	 * calculated in relation to the virtual viewport.
	 * @param {number} x A value in pixels.
	 * @param {number?} y A value in pixels.
	 * @returns {number | object} A relative value, or object containing two properties.
	 * @private
	 */
	RedlineToolGizmo.prototype._toVirtualSpace = function(x, y) {
		if (arguments.length === 1) {
			return x / this._virtualSideLength;
		} else {
			return {
				x: (x - this._virtualLeft) / this._virtualSideLength,
				y: (y - this._virtualTop) / this._virtualSideLength
			};
		}
	};

	/**
	 * Translates one or two values from the relative space to the absolute pixel space.
	 * @param {number} x A relative value.
	 * @param {number?} y A relative value.
	 * @returns {number | object} Absolute pixel value corresponding to the parameters.
	 * @private
	 */
	RedlineToolGizmo.prototype._toPixelSpace = function(x, y) {
		if (arguments.length === 1) {
			return x * this._virtualSideLength;
		} else {
			return {
				x: x * this._virtualSideLength + this._virtualLeft,
				y: y * this._virtualSideLength + this._virtualTop
			};
		}
	};

	RedlineToolGizmo.prototype._onResize = function() {
		if (this.getDomRef()) {
			this.rerender();
		}
	};

	/**
	 * Returns the panning ratio by making calculations based on virtual viewport size and actual viewport size.
	 * @returns {number} The paning ratio.
	 * @private
	 */
	RedlineToolGizmo.prototype._getPanningRatio = function() {
		var clientRect = this.getDomRef().getBoundingClientRect(),
			height = clientRect.height,
			width = clientRect.width;

		// Before broadcasting the pan event from within the redline gesture handler,
		// we need to apply a certain ratio to deltaX and deltaY.
		// Usually, the panning ratio is 1 which means no change, but we need to change the ratio when the
		// size of the virtual viewport is greater than the size of the actual viewport.
		if (this._virtualLeft === 0 && (height < width && this._virtualTop < 0 || (height > width && this._virtualTop > 0))) {
			return height / width;
		}

		return 1;
	};

	RedlineToolGizmo.prototype.onBeforeRendering = function() {
		var viewport = this.getParent()._viewport;
		if (viewport && viewport.getDomRef()) {
			var virtualViewportSize = viewport.getOutputSize();
			this._virtualLeft = virtualViewportSize.left;
			this._virtualTop = virtualViewportSize.top;
			this._virtualSideLength = virtualViewportSize.sideLength;
		}
	};

	return RedlineToolGizmo;

});
