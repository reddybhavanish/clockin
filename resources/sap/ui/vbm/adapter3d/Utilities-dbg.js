/*!
 * SAP UI development toolkit for HTML5 (SAPUI5) (c) Copyright 2009-2012 SAP AG. All rights reserved
 */

// Provides the base visual object.
sap.ui.define([
	"jquery.sap.global", "sap/ui/base/Object", "./thirdparty/three"
], function(jQuery, BaseObject, THREE) {
	"use strict";

	var thisModule = "sap.ui.vbm.adapter3d.Utilities";
	var log = jQuery.sap.log;
	var Color = THREE.Color;
	var Vector3 = THREE.Vector3;

	var Utilities = BaseObject.extend("sap.ui.vbm.adapter3d.Utilities", /** @lends sap.ui.vbm.adapter3d.Utilities.prototype */ {
	});

	Utilities.toBoolean = function(value) {
		var firstChar = value.charAt(0);
		return firstChar === "t" || firstChar !== "" && firstChar !== "f" && firstChar !== " " && firstChar !== "0";
	};

	Utilities.toFloat = function(value) {
		return parseFloat(value);
	};

	Utilities.toVector3 = function(value) {
		var a = value.split(";");
		if (a.length !== 3) {
			return [ 0, 0, 0 ];
		}
		return a.map(parseFloat);
	};

	// from Three JS coordinate  to VB coordinate
	Utilities.threeJsToVb = function(point) {
		return new Vector3(-point.x, point.z, -point.y);
	};

	// from VB coordinate to ThreeJS coordinate
	Utilities.vbToThreeJs = function(point) {
		return new Vector3(-point.x, -point.z, point.y);
	};

	Utilities.toColor = (function() {
		var dec = "\\s*(\\d+)\\s*";
		var hex = "\\s*(?:0[xX])([\\da-fA-F]+)\\s*";

		// NB: we use back reference \2 to reference to , (comma) or ; (semicolon) to prevent their mixes.
		// Color components will be in 1, 3, 4, 5 capturing groups.
		var threeDec = dec + "(,|;)" + dec + "\\2" + dec;
		var fourDec  = dec + "(,|;)" + dec + "\\2" + dec + "\\2" + dec;
		var threeHex = hex + "(,|;)" + hex + "\\2" + hex;
		var fourHex  = hex + "(,|;)" + hex + "\\2" + hex + "\\2" + hex;

		var reRGB   = new RegExp("^\\s*RGB\\("  + threeDec + "\\)\\s*$");
		var reRGBx  = new RegExp("^\\s*RGB\\("  + threeHex + "\\)\\s*$");
		var reRGBA  = new RegExp("^\\s*RGBA\\(" + fourDec  + "\\)\\s*$");
		var reRGBAx = new RegExp("^\\s*RGBA\\(" + fourHex  + "\\)\\s*$");
		var reARGB  = new RegExp("^\\s*ARGB\\(" + fourDec  + "\\)\\s*$");
		var reARGBx = new RegExp("^\\s*ARGB\\(" + fourHex  + "\\)\\s*$");
		var reHLS   = new RegExp("^\\s*HLS\\("  + threeDec + "\\)\\s*$"); // eslint-disable-line no-unused-vars
		var reHLSx  = new RegExp("^\\s*HLS\\("  + threeHex + "\\)\\s*$"); // eslint-disable-line no-unused-vars
		var reHLSA  = new RegExp("^\\s*HLSA\\(" + fourDec  + "\\)\\s*$"); // eslint-disable-line no-unused-vars
		var reHLSAx = new RegExp("^\\s*HLSA\\(" + fourHex  + "\\)\\s*$"); // eslint-disable-line no-unused-vars
		var reDec   = new RegExp("^" + dec + "$");                        // eslint-disable-line no-unused-vars
		var reHex   = new RegExp("^" + hex + "$");                        // eslint-disable-line no-unused-vars

		return function(value) {
			var m;
			var rgb;
			var opacity = 1;

			if ((m = value.match(reRGB))) {
				rgb = new Color(parseInt(m[1], 10) / 255, parseInt(m[3], 10) / 255, parseInt(m[4], 10) / 255);
			} else if ((m = value.match(reRGBx))) {
				rgb = new Color(parseInt(m[1], 16) / 255, parseInt(m[3], 16) / 255, parseInt(m[4], 16) / 255);
			} else if ((m = value.match(reRGBA))) {
				rgb = new Color(parseInt(m[1], 10) / 255, parseInt(m[3], 10) / 255, parseInt(m[4], 10) / 255);
				opacity = m[5] / 255;
			} else if ((m = value.match(reRGBAx))) {
				rgb = new Color(parseInt(m[1], 16) / 255, parseInt(m[3], 16) / 255, parseInt(m[4], 16) / 255);
				opacity = m[5] / 255;
			} else if ((m = value.match(reARGB))) {
				rgb = new Color(parseInt(m[3], 10) / 255, parseInt(m[4], 10) / 255, parseInt(m[5], 10) / 255);
				opacity = m[1] / 255;
			} else if ((m = value.match(reARGBx))) {
				rgb = new Color(parseInt(m[3], 16) / 255, parseInt(m[4], 16) / 255, parseInt(m[5], 16) / 255);
				opacity = m[1] / 255;
			} else {
				// TODO: HLS, HLSA, decimal and hexadecimal representations are not handled yet
				log.warning("Cannot convert color, use default", value, thisModule);
				rgb = new Color(0.5, 0.5, 0.5);
			}
			return {
				rgb: rgb,
				opacity: opacity
			};
		};
	})();

	Utilities.toColorDelta = (function() {
		// HLSA components will be in 1, 2, 3, 4 capturing groups.
		var floatingPoint = "\\s*([-+]?\\d*\\.?\\d+(?:[eE][-+]?\\d+)?)\\s*";
		var reDeltaHLS  = new RegExp("^\\s*RHLS\\("  + floatingPoint + ";" + floatingPoint + ";" + floatingPoint + "\\)\\s*$");
		var reDeltaHLSA = new RegExp("^\\s*RHLSA\\(" + floatingPoint + ";" + floatingPoint + ";" + floatingPoint + ";" + floatingPoint + "\\)\\s*$");

		return function(delta) {
			var m;
			var hls;
			var opacity = 1;

			if ((m = delta.match(reDeltaHLS))) {
				hls = new Vector3(parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]));
			} else if ((m = delta.match(reDeltaHLSA))) {
				hls = new Vector3(parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]));
				opacity = parseFloat(m[4]);
			} else {
				log.warning("Cannot convert color delta, use default", delta, thisModule);
				hls = new Vector3(1,1,1);
			}
			return {
				hls: hls,
				opacity: opacity
			};
		};
	})();

	Utilities.multiplyColors = function(out, x, y) {
		out.r = Utilities.clamp(x.r * y.r, 0.0, 1.0);
		out.g = Utilities.clamp(x.g * y.g, 0.0, 1.0);
		out.b = Utilities.clamp(x.b * y.b, 0.0, 1.0);
	};

	Utilities.isColorDelta = function(value) {
		return jQuery.sap.startsWith(value, "RHLS");
	};

	Utilities.applyDeltaHLS = function(color, hls) {
		// IMPORTANT: VB uses (H,L,S) where ThreeJS uses (H,S,L)
		var hsl = color.getHSL({});
		// apply it in VB manner, see vbshader.fx for details
		hsl.h = hsl.h + hls.x;
		hsl.s = Utilities.clamp(hsl.s * hls.z, 0.0, 1.0);
		hsl.l = Utilities.clamp(hsl.l * hls.y, 0.0, 1.0);
		color.setHSL(hsl.h, hsl.s, hsl.l);
	};

	Utilities.applyColor = function(instance, hot) {
		if (!instance.object3D) {
			return;
		}
		// lazy collect all used materials: will be used when modifying material color if instance is selected of highlighted
		if (!instance._materials) {
			instance._materials = new Map();
			instance.object3D.traverse(function(node) {
				if (node.isMesh) {
					[].concat(node.material).forEach(function(material) { // node.material can be array
						instance._materials.set(material, {
							rgb: material.color.clone(),
							opacity: material.opacity
						});
					});
				}
			});	
		}
		var color = Utilities.toColor(instance.color);
		var selected = (Utilities.toBoolean(instance["VB:s"]));

		var hotDelta = Utilities.isColorDelta(instance.hotDeltaColor);
		var hotColor = hotDelta ? Utilities.toColorDelta(instance.hotDeltaColor) : Utilities.toColor(instance.hotDeltaColor);

		var selectDelta = Utilities.isColorDelta(instance.selectColor);
		var selectColor = selectDelta ? Utilities.toColorDelta(instance.selectColor) : Utilities.toColor(instance.selectColor);

		instance._materials.forEach(function(ref, material) {
			// calc diffuse color first: miltiply material color to instance color
			Utilities.multiplyColors(material.color, ref.rgb, color.rgb);
			material.opacity = Utilities.clamp(ref.opacity * color.opacity, 0.0, 1.0);
			// if direct color -> override current, if delta color -> apply on top
			if (selected) {
				if (selectDelta) {
					Utilities.applyDeltaHLS(material.color, selectColor.hls);
					material.opacity = Utilities.clamp(material.opacity * selectColor.opacity, 0.0, 1.0);
				} else {
					material.color.copy(selectColor.rgb);
					material.opacity = selectColor.opacity;
				}
			}
			// if direct color -> override current, if delta color -> apply on top
			if (hot) {
				if (hotDelta) {
					Utilities.applyDeltaHLS(material.color, hotColor.hls);
					material.opacity = Utilities.clamp(material.opacity * hotColor.opacity, 0.0, 1.0);
				} else {
					material.color.copy(hotColor.rgb);
					material.opacity = hotColor.opacity;
				}
			}
			material.transparent = material.opacity < 1;
		});
	};

	Utilities.applyColorBorder = function(instance, value) {
		if (value) {
			var color = Utilities.toColor(value);
			instance.object3D.traverse(function(node) {
				if (node.isLineSegments && node.material) {
					node.material.color = color.rgb;
					node.material.opacity = color.opacity;
					node.material.transparent = color.opacity < 1;
				}
			});
		}
		return this;
	};

	Utilities.clamp = function(value, min, max) {
		if (value < min) {
			return min;
		}
		if (value > max) {
			return max;
		}
		return value;
	};

	Utilities.swap = function(obj, a, b) {
		var tmp = obj[a];
		obj[a] = obj[b];
		obj[b] = tmp;
	};

	Utilities.makeDataUri = function(data) {
		return data && "data:text/plain;base64," + data;
	};

	Utilities.base64ToArrayBuffer = function(src) {
		var str = atob(src);
		var bytes = new Uint8Array(str.length);
		for (var i = 0; i < str.length; ++i) {
			bytes[i] = str.charCodeAt(i);
		}
		return bytes.buffer;
	};

	return Utilities;
});
