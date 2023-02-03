/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

        (c) Copyright 2009-2015 SAP SE. All rights reserved
    
 */

// Provides the ViewStateManager class.
sap.ui.define([
	"sap/base/util/ObjectPath",
	"./ContentConnector",
	"./Scene",
	"./ViewStateManagerBase",
	"./Core"
], function(
	ObjectPath,
	ContentConnector,
	Scene,
	ViewStateManagerBase,
	vkCore
) {
	"use strict";

	/**
	 * Constructor for a new ViewStateManager.
	 *
	 * @class
	 * Manages the visibility and selection states of nodes in the scene.
	 *
	 * @param {string} [sId] ID for the new ViewStateManager object. Generated automatically if no ID is given.
	 * @param {object} [mSettings] Initial settings for the new ViewStateManager object.
	 * @public
	 * @author SAP SE
	 * @version 1.78.0
	 * @extends sap.ui.vk.ViewStateManagerBase
	 * @alias sap.ui.vk.ViewStateManager
	 * @since 1.32.0
	 */
	var ViewStateManager = ViewStateManagerBase.extend("sap.ui.vk.ViewStateManager", /** @lends sap.ui.vk.ViewStateManager.prototype */ {
		metadata: {
		}
	});

	var basePrototype = ViewStateManager.getMetadata().getParent().getClass().prototype;

	ViewStateManager.prototype.init = function() {
		if (basePrototype.init) {
			basePrototype.init.call(this);
		}

		this._implementation = null;
	};

	ViewStateManager.prototype.exit = function() {
		this._destroyImplementation();

		if (basePrototype.exit) {
			basePrototype.exit.call(this);
		}
	};

	ViewStateManager.prototype._destroyImplementation = function() {
		if (this._implementation) {
			this._implementation.destroy();
			this._implementation = null;
		}
		return this;
	};

	ViewStateManager.prototype.getImplementation = function() {
		return this._implementation;
	};

	////////////////////////////////////////////////////////////////////////
	// Content connector handling begins.
	ViewStateManager.prototype._setContent = function(content) {
		var scene = null;
		if (content && content instanceof Scene) {
			scene = content;
		}
		this._setScene(scene);
	};

	ViewStateManager.prototype._onAfterUpdateContentConnector = function() {
		this._setContent(this._contentConnector.getContent());
	};

	ViewStateManager.prototype._onBeforeClearContentConnector = function() {
		this._setScene(null);
	};

	// Content connector handling ends.
	////////////////////////////////////////////////////////////////////////

	////////////////////////////////////////////////////////////////////////
	// Node hierarchy handling begins.

	ViewStateManager.prototype._handleContentReplaced = function(event) {
		this._setContent(event.getParameter("newContent"));
	};

	ViewStateManager.prototype._setScene = function(scene) {
		if (scene && scene instanceof Scene) {
			var sceneType = scene.getMetadata().getName(),
				implementationType = this._implementation && this._implementation.getMetadata().getName(),
				reuseImplemenation = sceneType === "sap.ui.vk.dvl.Scene" && implementationType === "sap.ui.vk.dvl.ViewStateManager" ||
					sceneType === "sap.ui.vk.threejs.Scene" && implementationType === "sap.ui.vk.threejs.ViewStateManager";

			if (!reuseImplemenation) {
				this._destroyImplementation();
				var newImplementationType;
				if (sceneType === "sap.ui.vk.dvl.Scene") {
					newImplementationType = "sap.ui.vk.dvl.ViewStateManager";
				} else if (sceneType === "sap.ui.vk.threejs.Scene") {
					newImplementationType = "sap.ui.vk.threejs.ViewStateManager";
				}

				if (newImplementationType) {
					var that = this;
					// The ViewStateManager implementation classes from `dvl` and `threejs` namespaces are loaded by
					// the corresponding content managers, so there is no need to load them here. We can safely
					// assume that thery are available at this point.
					var Class = ObjectPath.get(newImplementationType);
					this._implementation = new Class({
						shouldTrackVisibilityChanges: this.getShouldTrackVisibilityChanges(),
						recursiveSelection: this.getRecursiveSelection(),
						contentConnector: this.getContentConnector(),
						viewManager: this.getViewManager(),
						visibilityChanged: function(event) {
							that.fireVisibilityChanged({
								visible: event.getParameter("visible"),
								hidden: event.getParameter("hidden")
							});
						},
						selectionChanged: function(event) {
							that.fireSelectionChanged({
								selected: event.getParameter("selected"),
								unselected: event.getParameter("unselected")
							});
						},
						outliningChanged: function(event) {
							that.fireOutliningChanged({
								outlined: event.getParameter("outlined"),
								unoutlined: event.getParameter("unoutlined")
							});
						},
						opacityChanged: function(event) {
							that.fireOpacityChanged({
								changed: event.getParameter("changed"),
								opacity: event.getParameter("opacity")
							});
						},
						tintColorChanged: function(event) {
							that.fireTintColorChanged({
								changed: event.getParameter("changed"),
								tintColor: event.getParameter("tintColor"),
								tintColorABGR: event.getParameter("tintColorABGR")
							});
						},
						nodeHierarchyReplaced: function(event) {
							that.fireNodeHierarchyReplaced({
								oldNodeHierarchy: event.getParameter("oldNodeHierarchy"),
								newNodeHierarchy: event.getParameter("newNodeHierarchy")
							});
						},
						viewStateApplying: function(event) {
							that.fireViewStateApplying({
								view: event.getParameter("view")
							});
						},
						viewStateApplied: function(event) {
							that.fireViewStateApplied({
								view: event.getParameter("view")
							});
						},
						transformationChanged: function(event) {
							that.fireTransformationChanged(event.getParameters());
						},
						highlightColorChanged: function(event) {
							that.fireHighlightColorChanged(event.getParameters());
						}
					});

					var viewManager = sap.ui.getCore().byId(this.getViewManager());
                    if (viewManager) {
                        var animationPlayer = sap.ui.getCore().byId(viewManager.getAnimationPlayer());
                        if (animationPlayer){
                            animationPlayer.setViewStateManager(this._implementation);
                        }
                    }
				}
			}
		} else {
			this._destroyImplementation();
		}

		return this;
	};

	// Node hierarchy handling ends.
	////////////////////////////////////////////////////////////////////////


	/**
	 * Gets the Animation player associated with viewManager.
	 * @returns {sap.ui.vk.AnimationPlayer} animation player
	 * @public
	 */
	ViewStateManager.prototype.getAnimationPlayer = function() {
		var animationPlayer;
		var viewManager = sap.ui.getCore().byId(this.getViewManager());
        if (viewManager) {
            animationPlayer = sap.ui.getCore().byId(viewManager.getAnimationPlayer());
		 }
		 return animationPlayer;
	};

	/**
	 * Gets the NodeHierarchy object associated with this ViewStateManager object.
	 * @returns {sap.ui.vk.NodeHierarchy} The node hierarchy associated with this ViewStateManager object.
	 * @public
	 */
	ViewStateManager.prototype.getNodeHierarchy = function() {
		return this._implementation && this._implementation.getNodeHierarchy();
	};

	/**
	 * Gets the visibility changes in the current ViewStateManager object.
	 * @returns {string[]} The visibility changes are in the form of an array. The array is a list of node VE ids which suffered a visibility changed relative to the default state.
	 * @public
	 */
	ViewStateManager.prototype.getVisibilityChanges = function() {
		return this._implementation && this._implementation.getVisibilityChanges();
	};

	/**
	 * Gets the visibility state of all nodes.
	 * @function
	 * @name sap.ui.vk.ViewStateManager#getVisibilityComplete
	 * @returns {object} An object with following structure.
	 * <pre>
	 * {
	 *     visible: [string, ...] - an array of VE IDs of visible nodes
	 *     hidden:  [string, ...] - an array of VE IDs of hidden nodes
	 * }
	 * </pre>
	 */
	ViewStateManager.prototype.getVisibilityComplete = function() {
		return this._implementation && this._implementation.getVisibilityComplete();
	};

	/**
	 * Gets the visibility state of nodes.
	 *
	 * If a single node reference is passed to the method then a single visibility state is returned.<br/>
	 * If an array of node references is passed to the method then an array of visibility states is returned.
	 *
	 * @param {any|any[]} nodeRefs The node reference or the array of node references.
	 * @returns {boolean|boolean[]} A single value or an array of values where the value is <code>true</code> if the node is visible, <code>false</code> otherwise.
	 * @public
	 */
	ViewStateManager.prototype.getVisibilityState = function(nodeRefs) {
		return this._implementation && this._implementation.getVisibilityState(nodeRefs);
	};

	/**
	 * Sets the visibility state of the nodes.
	 * @param {any|any[]} nodeRefs The node reference or the array of node references.
	 * @param {boolean} visible The new visibility state of the nodes.
	 * @param {boolean} recursive The flags indicates if the change needs to propagate recursively to child nodes.
	 * @returns {sap.ui.vk.ViewStateManager} <code>this</code> to allow method chaining.
	 * @public
	 */
	ViewStateManager.prototype.setVisibilityState = function(nodeRefs, visible, recursive) {
		if (this._implementation) {
			this._implementation.setVisibilityState(nodeRefs, visible, recursive);
		}
		return this;
	};

	/**
	 * Resets the visibility states of all nodes to the initial states.
	 * @function
	 * @name sap.ui.vk.ViewStateManager#resetVisibility
	 * @returns {sap.ui.vk.ViewStateManagerBase} <code>this</code> to allow method chaining.
	 * @public
	 */
	ViewStateManager.prototype.resetVisibility = function() {
		return this._implementation && this._implementation.resetVisibility();
	};

	/**
	 * Enumerates IDs of the selected nodes.
	 *
	 * @param {function} callback A function to call when the selected nodes are enumerated. The function takes one parameter of type <code>string</code>.
	 * @returns {sap.ui.vk.ViewStateManager} <code>this</code> to allow method chaining.
	 * @public
	 */
	ViewStateManager.prototype.enumerateSelection = function(callback) {
		if (this._implementation) {
			this._implementation.enumerateSelection(callback);
		}
		return this;
	};


	/**
	 * Enumerates IDs of the outlined nodes.
	 *
	 * @param {function} callback A function to call when the outlined nodes are enumerated. The function takes one parameter of type <code>string</code>.
	 * @returns {sap.ui.vk.ViewStateManager} <code>this</code> to allow method chaining.
	 * @public
	 */
	ViewStateManager.prototype.enumerateOutlinedNodes = function(callback) {
		if (this._implementation && this._implementation.enumerateOutlinedNodes) {
			this._implementation.enumerateOutlinedNodes(callback);
		}
		return this;
	};

	/**
	 * Sets if showing the bounding box when nodes are selected
	 *
	 * @param {boolean} val <code>true</code> if bounding boxes of selected nodes are shown, <code>false</code> otherwise.
	 * @public
	 */
	ViewStateManager.prototype.setShowSelectionBoundingBox = function(val){
		if (this._implementation) {
			this._implementation.setShowSelectionBoundingBox(val);
		}
	};

	/**
	 * Gets if showing the bounding box when nodes are selected
	 *
	 * @returns {boolean} <code>true</code> if bounding boxes of selected nodes are shown, <code>false</code> otherwise.
	 * @public
	 */
	ViewStateManager.prototype.getShowSelectionBoundingBox = function(){
		if (this._implementation) {
			return this._implementation.getShowSelectionBoundingBox();
		}
	};

	/**
	 * Gets the selection state of the node.
	 *
	 * If a single node reference is passed to the method then a single selection state is returned.<br/>
	 * If an array of node references is passed to the method then an array of selection states is returned.
	 *
	 * @param {any|any[]} nodeRefs The node reference or the array of node references.
	 * @returns {boolean|boolean[]} A single value or an array of values where the value is <code>true</code> if the node is selected, <code>false</code> otherwise.
	 * @public
	 */
	ViewStateManager.prototype.getSelectionState = function(nodeRefs) {
		return this._implementation && this._implementation.getSelectionState(nodeRefs);
	};

	/**
	 * Sets the selection state of the nodes.
	 * @param {any|any[]} nodeRefs The node reference or the array of node references.
	 * @param {boolean} selected The new selection state of the nodes.
	 * @param {boolean} recursive The flags indicates if the change needs to propagate recursively to child nodes.
	 * @returns {sap.ui.vk.ViewStateManager} <code>this</code> to allow method chaining.
	 * @deprecated Since version 1.56.3.
	 * @public
	 */
	ViewStateManager.prototype.setSelectionState = function(nodeRefs, selected, recursive) {
		if (this._implementation) {
			this._implementation.setSelectionState(nodeRefs, selected, recursive);
		}
		return this;
	};

	/**
	 * Sets or resets the selection state of the nodes.
	 * @param {any|any[]} selectedNodeRefs The node reference or the array of node references of selected nodes.
	 * @param {any|any[]} unselectedNodeRefs The node reference or the array of node references of unselected nodes.
	 * @param {boolean} recursive The flags indicates if the change needs to propagate recursively to child nodes.
	 * @returns {sap.ui.vk.ViewStateManager} <code>this</code> to allow method chaining.
	 * @public
	 */
	ViewStateManager.prototype.setSelectionStates = function(selectedNodeRefs, unselectedNodeRefs, recursive) {
		if (this._implementation) {
			this._implementation.setSelectionStates(selectedNodeRefs, unselectedNodeRefs, recursive);
		}
		return this;
	};

	/**
	 * Gets the outlining state of the node.
	 *
	 * If a single node reference is passed to the method then a single outlining state is returned.<br/>
	 * If an array of node references is passed to the method then an array of outlining states is returned.
	 *
	 * @param {any|any[]} nodeRefs The node reference or the array of node references.
	 * @returns {boolean|boolean[]} A single value or an array of values where the value is <code>true</code> if the node is selected, <code>false</code> otherwise.
	 * @public
	 */
	ViewStateManager.prototype.getOutliningState = function(nodeRefs) {
		if (this._implementation && this._implementation.getOutliningState) {
			return this._implementation.getOutliningState(nodeRefs);
		} else {
			return false;
		}
	};


	/**
	 * Sets or resets the outlining state of the nodes.
	 * @param {any|any[]} outlinedNodeRefs The node reference or the array of node references of selected nodes.
	 * @param {any|any[]} unoutlinedNodeRefs The node reference or the array of node references of unselected nodes.
	 * @param {boolean} recursive The flags indicates if the change needs to propagate recursively to child nodes.
	 * @returns {sap.ui.vk.ViewStateManager} <code>this</code> to allow method chaining.
	 * @public
	 */
	ViewStateManager.prototype.setOutliningStates = function(outlinedNodeRefs, unoutlinedNodeRefs, recursive) {
		if (this._implementation && this._implementation.setOutliningStates) {
			this._implementation.setOutliningStates(outlinedNodeRefs, unoutlinedNodeRefs, recursive);
		}
		return this;
	};

	/**
	 * Retrieves list of current joints
	 * @returns {any[]} array of joints or <code>undefined</code>
	 * @see {@link sap.ui.vk.AnimationSequence.getJoint} for joint definition
	 *
	 * @experimental Since 1.71.0 This class is experimental and might be modified or removed in future versions.
	 * @private
	 */
	ViewStateManager.prototype.getJoints = function() {
		if (this._implementation && this._implementation.getJoints) {
			return this._implementation.getJoints();
		}
		return undefined;
	};

	/**
	 * Sets list of current joints
	 * @param {any[]} joints Array of joint objects or <code>undefined</code>.
	 * @param {sap.ui.vk.AnimationSequence} sequence animation sequence the joints belong to, optional
	 * @see {@link sap.ui.vk.AnimationSequence.setJoint} for joint definition
	 * @returns {sap.ui.vk.ViewStateManager} <code>this</code> to allow method chaining.
	 *
	 * @experimental Since 1.71.0 This class is experimental and might be modified or removed in future versions.
	 * @private
	 */
	ViewStateManager.prototype.setJoints = function(joints, sequence) {
		if (this._implementation && this._implementation.setJoints) {
			this._implementation.setJoints(joints, sequence);
		}
		return this;
	};

	/**
	 * Gets the opacity of the node.
	 *
	 * If a single node reference is passed to the method then a single value is returned.<br/>
	 * If an array of node references is passed to the method then an array of values is returned.
	 *
	 * @param {any|any[]} nodeRefs The node reference or the array of node references.
	 * @returns {float|float[]} A single value or an array of values. Value <code>null</code> means that the node's own opacity should be used.
	 * @public
	 */
	ViewStateManager.prototype.getOpacity = function(nodeRefs) {
		return this._implementation && this._implementation.getOpacity(nodeRefs);
	};

	/**
	 * Sets the opacity of the nodes.
	 *
	 * @param {any|any[]}       nodeRefs          The node reference or the array of node references.
	 * @param {float|null}      opacity           The new opacity of the nodes. If <code>null</code> is passed then the opacity is reset
	 *                                            and the node's own opacity should be used.
	 * @param {boolean}         [recursive=false] The flags indicates if the change needs to propagate recursively to child nodes.
	 * @returns {sap.ui.vk.ViewStateManager} <code>this</code> to allow method chaining.
	 * @public
	 */
	ViewStateManager.prototype.setOpacity = function(nodeRefs, opacity, recursive) {
		if (this._implementation) {
			this._implementation.setOpacity(nodeRefs, opacity, recursive);
		}
		return this;
	};

	/**
	 * Get total opacity - product of all the ancestors' opacities and its own opacity
	 *
	 * @function
	 * @name sap.ui.vk.ViewStateManager#getTotalOpacity
	 * @param {any} nodeRef The node reference of the opacity track
	 * @returns {float} total opacity
	 * @public
	 */
	ViewStateManager.prototype.getTotalOpacity = function(nodeRef) {
		if (this._implementation && this._implementation.getTotalOpacity) {
			return this._implementation.getTotalOpacity(nodeRef);
		}
		return 1;
	};

	/**
	 * Set total opacity using current opacity - product of all the ancestors' opacities and its own opacity
	 * The node's opacity is re-calculated based on the total opacity
	 * if the parent's total opacity is zero, the node's total opacity is zero, the node's opacity is not changed
	 *
	 * @function
	 * @name sap.ui.vk.ViewStateManager#setTotalOpacity
	 * @param {any} nodeRef The node reference of the opacity track
	 * @param {float} totalOpacity product of all the ancestors' opacities and its own opacity
	 * @returns {any} object contains <code>opacity</code> and <code>totalOpacity</code>
	 * @public
	 */
	ViewStateManager.prototype.setTotalOpacity = function(nodeRef, totalOpacity) {
		if (this._implementation && this._implementation.setTotalOpacity) {
			return this._implementation.setTotalOpacity(nodeRef, totalOpacity);
		}
		return null;
	};


	/**
	 * Get node's opacity stored in active view.
	 *
	 * @function
	 * @name sap.ui.vk.ViewStateManager#getRestOpacity
	 * @param {any} nodeRef The node reference.
	 * @returns {float} node opacity
	 * @public
	 */
	ViewStateManager.prototype.getRestOpacity = function(nodeRef) {
		if (this._implementation && this._implementation.getRestOpacity) {
			return this._implementation.getRestOpacity(nodeRef);
		}
		return null;
	};

	/**
	 * Set node's opacity stored in active view.
	 *
	 * @function
	 * @name sap.ui.vk.ViewStateManager#setRestOpacity
	 * @param {any} nodeRef The node reference.
	 * @param {float} opacity The node opacitu
	 * @returns {sap.ui.vk.ViewStateManager} <code>this</code> to allow method chaining.
	 * @public
	 */
	ViewStateManager.prototype.setRestOpacity = function(nodeRef, opacity) {
		if (this._implementation && this._implementation.setRestOpacity) {
			this._implementation.setRestOpacity(nodeRef, opacity);
		}
		return this;
	};

	/**
	 * Replace node's current opacity with its rest opacity stored in active view..
	 *
	 * @function
	 * @name sap.ui.vk.ViewStateManager#restoreRestOpacity
	 * @param {any} nodeRef The node reference.
	 * @returns {sap.ui.vk.ViewStateManager} <code>this</code> to allow method chaining.
	 * @public
	 */
	ViewStateManager.prototype.restoreRestOpacity = function(nodeRef) {
		if (this._implementation && this._implementation.restoreRestOpacity) {
			this._implementation.restoreRestOpacity(nodeRef);
		}
		return this;
	};

	/**
	 * Copy node's current opacity into its rest opacity stored in active view.
	 *
	 * @function
	 * @name sap.ui.vk.ViewStateManager#updateRestOpacity
	 * @param {any} nodeRef The node reference.
	 * @returns {sap.ui.vk.ViewStateManager} <code>this</code> to allow method chaining.
	 * @public
	 */
	ViewStateManager.prototype.updateRestOpacity = function(nodeRef) {
		if (this._implementation && this._implementation.updateRestOpacity) {
			this._implementation.updateRestOpacity(nodeRef);
		}
		return this;
	};

	/**
	 * Gets the tint color of the node.
	 *
	 * If a single node reference is passed to the method then a single value is returned.<br/>
	 * If an array of node references is passed to the method then an array of values is returned.
	 *
	 * @param {any|any[]}       nodeRefs             The node reference or the array of node references.
	 * @param {boolean}         [inABGRFormat=false] This flag indicates to return the tint color in the ABGR format,
	 *                                               if it equals <code>false</code> then the color is returned in the CSS color format.
	 * @returns {sap.ui.core.CSSColor|sap.ui.core.CSSColor[]|int|int[]}
	 *                                               A single value or an array of values. Value <code>null</code> means that
	 *                                               the node's own tint color should be used.
	 * @public
	 */
	ViewStateManager.prototype.getTintColor = function(nodeRefs, inABGRFormat) {
		return this._implementation && this._implementation.getTintColor(nodeRefs, inABGRFormat);
	};

	/**
	 * Sets the tint color of the nodes.
	 * @param {any|any[]}                   nodeRefs          The node reference or the array of node references.
	 * @param {sap.ui.vk.CSSColor|int|null} tintColor         The new tint color of the nodes. The value can be defined as a string
	 *                                                        in the CSS color format or as an integer in the ABGR format. If <code>null</code>
	 *                                                        is passed then the tint color is reset and the node's own tint color should be used.
	 * @param {boolean}                     [recursive=false] This flag indicates if the change needs to propagate recursively to child nodes.
	 * @returns {sap.ui.vk.ViewStateManager} <code>this</code> to allow method chaining.
	 * @public
	 */
	ViewStateManager.prototype.setTintColor = function(nodeRefs, tintColor, recursive) {
		if (this._implementation) {
			this._implementation.setTintColor(nodeRefs, tintColor, recursive);
		}
		return this;
	};

	/**
	 * Sets the default highlighting color
	 * @param {sap.ui.vk.CSSColor|string|int} color           The new default highlighting color. The value can be defined as a string
	 *                                                        in the CSS color format or as an integer in the ABGR format. If <code>null</code>
	 *                                                        is passed then the tint color is reset and the node's own tint color should be used.
	 * @returns {sap.ui.vk.ViewStateManager} <code>this</code> to allow method chaining.
	 * @public
	 */
	ViewStateManager.prototype.setHighlightColor = function(color) {
		if (this._implementation && this._implementation.setHighlightColor) {
			this._implementation.setHighlightColor(color);
		}
		return this;
	};


	/**
	 * Gets the default highlighting color
	 *
	 * @param {boolean}         [inABGRFormat=false] This flag indicates to return the default highlighting color in the ABGR format,
	 *                                               if it equals <code>false</code> then the color is returned in the CSS color format.
	 * @returns {sap.ui.core.CSSColor|string|int}
	 *                                               A single value or an array of values. Value <code>null</code> means that
	 *                                               the node's own tint color should be used.
	 * @public
	 */
	ViewStateManager.prototype.getHighlightColor = function(inABGRFormat) {
		if (this._implementation && this._implementation.getHighlightColor) {
			return this._implementation.getHighlightColor(inABGRFormat);
		}
	};

	/**
	 * Sets the outline color
	 * @param {sap.ui.vk.CSSColor|string|int} color           The new outline color. The value can be defined as a string
	 *                                                        in the CSS color format or as an integer in the ABGR format. If <code>null</code>
	 *                                                        is passed then the tint color is reset and the node's own tint color should be used.
	 * @returns {sap.ui.vk.ViewStateManager} <code>this</code> to allow method chaining.
	 * @public
	 */
	ViewStateManager.prototype.setOutlineColor = function(color) {
		if (this._implementation && this._implementation.setOutlineColor) {
			this._implementation.setOutlineColor(color);
		}
		return this;
	};


	/**
	 * Gets the outline color
	 *
	 * @param {boolean}         [inABGRFormat=false] This flag indicates to return the outline color in the ABGR format,
	 *                                               if it equals <code>false</code> then the color is returned in the CSS color format.
	 * @returns {sap.ui.core.CSSColor|string|int}
	 *                                               A single value or an array of values. Value <code>null</code> means that
	 *                                               the node's own tint color should be used.
	 * @public
	 */
	ViewStateManager.prototype.getOutlineColor = function(inABGRFormat) {
		if (this._implementation && this._implementation.getOutlineColor) {
			return this._implementation.getOutlineColor(inABGRFormat);
		} else {
			return null;
		}
	};

	 /**
	 * Sets the outline width
	 * @function
	 * @param {float} width           			width of outline
	 * @returns {sap.ui.vk.ViewStateManager} 	<code>this</code> to allow method chaining.
	 * @public
	 */
	ViewStateManager.prototype.setOutlineWidth = function(width) {
		if (this._implementation && this._implementation.setOutlineWidth) {
			this._implementation.setOutlineWidth(width);
		}
		return this;
	};

	/**
	 * Gets the outline width
	 * @function
	 * @returns {float} width of outline
	 * @public
	 */
	ViewStateManager.prototype.getOutlineWidth = function() {
		if (this._implementation && this._implementation.getOutlineWidth) {
			return this._implementation.getOutlineWidth();
		} else {
			return 0.0;
		}
	};

	ViewStateManager.prototype.setRecursiveOutlining = function(oProperty) {
		this.setProperty("recursiveOutlining", oProperty, true);
		if (this._implementation && this._implementation.setRecursiveOutlining) {
			this._implementation.setRecursiveOutlining(oProperty);
		}
		return this;
	};

	ViewStateManager.prototype.setRecursiveSelection = function(oProperty) {
		this.setProperty("recursiveSelection", oProperty, true);
		if (this._implementation) {
			this._implementation.setRecursiveSelection(oProperty);
		}
		return this;
	};

	/**
	 * Set highlight display state.
	 *
	 * @function
	 * @name sap.ui.vk.ViewStateManagerBase#setHighlightDisplayState
	 * @param {sap.ui.vk.HighlightDisplayState} state for playing highlight - playing, pausing, and stopped
	 * @returns {sap.ui.vk.ViewStateManager} <code>this</code> to allow method chaining.
	 * @public
	 */
	ViewStateManager.prototype.setHighlightDisplayState = function(state) {
		if (this._implementation && this._implementation.setHighlightDisplayState) {
			this._implementation.setHighlightDisplayState(state);
		}

		return this;
	};

	/**
	 * Sets the node transformation components.
	 *
	 * @function
	 * @name sap.ui.vk.ViewStateManager#setTransformation
	 * @param {any|any[]} nodeRefs The node reference or array of node references.
	 * @param {any|any[]} transformations Node's transformation matrix or it components or array of such.
	 * 									  Each object should contain one transform matrix or exactly one of angleAxis, euler or quaternion components.
     * @param {float[]} [transformation.transform] 12-element array representing 4 x 3 transformation matrix stored row-wise, or
	 * @param {float[]} transformation.translation translation component.
	 * @param {float[]} transformation.scale scale component.
	 * @param {float[]} [transformation.angleAxis] rotation component as angle-axis, or
	 * @param {float[]} [transformation.euler] rotation component as Euler angles, or
	 * @param {float[]} [transformation.quaternion] rotation component as quaternion.
	 * @returns {sap.ui.vk.ViewStateManager} <code>this</code> to allow method chaining.
	 * @private
	 */
	ViewStateManager.prototype.setTransformation = function(nodeRefs, transformations) {
		if (this._implementation && this._implementation.setTransformation) {
			this._implementation.setTransformation(nodeRefs, transformations);
		}

		return this;
	};

	/**
	 * Gets the decomposed node local transformation matrix.
	 *
	 * @param {any|any[]} nodeRef The node reference or array of nodes.
	 * @returns {any|any[]} object that contains <code>translation</code>, <code>scale</code> and <code>quaternion</code> components.
	 * @private
	 */
	ViewStateManager.prototype.getTransformation = function(nodeRef) {
		if (this._implementation && this._implementation.getTransformation) {
			return this._implementation.getTransformation(nodeRef);
		}

		return null;
	};

	/**
	 * Gets the decomposed node transformation matrix under world coordinates
	 *
	 * @param {any|any[]} nodeRef The node reference or array of nodes.
	 * @returns {any|any[]} object that contains <code>translation</code>, <code>scale</code> and <code>quaternion</code> components.
	 * @private
	 */
	ViewStateManager.prototype.getTransformationWorld = function(nodeRef) {
		if (this._implementation && this._implementation.getTransformationWorld) {
			return this._implementation.getTransformationWorld(nodeRef);
		}

		return null;
	};

	/**
	 * Get node's rest transformation in world coordinates stored in active view.
	 *
	 * @function
	 * @name sap.ui.vk.three.ViewStateManager#getRestTransformationWorld
	 * @param {any} nodeRef The node reference.
	 * @returns {any} object that contains <code>translation</code>, <code>scale</code>, <code>quaternion</code> components.
	 * @private
	 */
	ViewStateManager.prototype.getRestTransformationWorld = function(nodeRef) {
		if (this._implementation && this._implementation.getRestTransformationWorld) {
			return this._implementation.getRestTransformationWorld(nodeRef);
		}

		return null;
	};

	/**
	 * Gets the decomposed node rest transformation matrix if node is not linked to a joint, otherwise return decopmosed joint transformation
	 *
	 * @param {any} nodeRef The node reference
	 * @returns {any} object that contains <code>translation</code>, <code>scale</code> and <code>quaternion</code> components.
	 * @private
	 */
	ViewStateManager.prototype.getRestTransformationUsingJoint = function(nodeRef) {
		if (this._implementation && this._implementation.getRestTransformationUsingJoint) {
			return this._implementation.getRestTransformationUsingJoint(nodeRef);
		}

		return null;
	};

	/**
	 * Copy node's current transformation into its rest transformation stored in active view.
	 *
	 * @function
	 * @name sap.ui.vk.ViewStateManager#updateRestTransformation
	 * @param {any} nodeRef The node reference.
	 * @returns {sap.ui.vk.ViewStateManager} <code>this</code> to allow method chaining.
	 * @public
	 */
	ViewStateManager.prototype.updateRestTransformation = function(nodeRef) {
		if (this._implementation && this._implementation.updateRestTransformation) {
			this._implementation.updateRestTransformation(nodeRef);
		}
		return this;
	};

	 /**
	 * Replace node's current transformation with its rest transformation stored in active view..
	 *
	 * @function
	 * @name sap.ui.vk.ViewStateManager#restoreRestTransformation
	 * @param {any} nodeRef The node reference.
	 * @returns {sap.ui.vk.ViewStateManager} <code>this</code> to allow method chaining.
	 * @public
	 */
	ViewStateManager.prototype.restoreRestTransformation = function(nodeRef) {
		if (this._implementation && this._implementation.restoreRestTransformation) {
			this._implementation.restoreRestTransformation(nodeRef);
		}
		return this;
	};


	 /**
	 * Set node's rest transformation stored in active view.
	 *
	 * @function
	 * @name sap.ui.vk.ViewStateManager#setRestTransformation
	 * @param {any} nodeRef The node reference.
	 * @param {float[]} translation vector for postion, array of size 3.
	 * @param {float[]} quaternion quaternion for rotation, array of size 3.
	 * @param {float[]} scale vector for scaling, array of size 3.
	 * @returns {sap.ui.vk.ViewStateManager} <code>this</code> to allow method chaining.
	 * @public
	 */
	ViewStateManager.prototype.setRestTransformation = function(nodeRef, translation, quaternion, scale) {
		if (this._implementation && this._implementation.setRestTransformation) {
			this._implementation.setRestTransformation(nodeRef, translation, quaternion, scale);
		}
		return this;
	};

	/**
	 * Gets the decomposed node local transformation matrix relative to node rest position
	 *
	 * @param {any|any[]} nodeRefs The node reference or array of nodes.
	 * @returns {any|any[]} object that contains <code>translation</code>, <code>scale</code> and <code>quaternion</code> components.
	 * @private
	 */
	ViewStateManager.prototype.getRelativeTransformation = function(nodeRefs) {
		if (this._implementation && this._implementation.getRelativeTransformation) {
			return this._implementation.getRelativeTransformation(nodeRefs);
		}
		return null;
	};

	 /**
	 * Get node's rest transformation stored in active view.
	 *
	 * @function
	 * @name sap.ui.vk.ViewStateManager#getRestTransformation
	 * @param {any} nodeRef The node reference.
	 * @returns {any} object that contains <code>translation</code>, <code>scale</code> and <code>quaternion</code> components.
	 * 				<code>transformRowWise<code> 12-element array representing 4 x 3 transformation matrix stored row-wise if defined in currentview
	 * 				<code>transformColumnWise<code> 12-element array representing 4 x 3 transformation matrix stored column-wise if defined in current view
 	 * @public
	 */
	ViewStateManager.prototype.getRestTransformation = function(nodeRef) {
		if (this._implementation && this._implementation.getRestTransformation) {
			return this._implementation.getRestTransformation(nodeRef);
		}
		return null;
	};

	/**
	 * Add translation/scale/roation to node's rest transformation stored in active view, and return the resulting transformation
	 *
	 * @function
	 * @name sap.ui.vk.ViewStateManager#addToRestTransformation
	 * @param {any} nodeRef The node reference.
	 * @param {float[]} translation vector for additional postion, array of size 3, optinal, if null, rest translation is return
	 * @param {float[]} quaternion quaternion for additional rotation, array of size 3, optional, if null, rest quaternion is return
	 * @param {float[]} scale vector for additional scaling, array of size 3, optional, if null, rest scale is return
	 * @param {sap.ui.vk.AnimationTrackValueType} originalRotationType AngleAxis, Euler, Quaternion
	 * @returns {any} resulting transfomation, object that contains <code>translation</code>, <code>scale</code> and <code>quaternion</code> components.
	 * @public
	 */
	ViewStateManager.prototype.addToRestTransformation = function(nodeRef, translation, quaternion, scale, originalRotationType) {
		if (this._implementation && this._implementation.addToRestTransformation) {
			return this._implementation.addToRestTransformation(nodeRef, translation, quaternion, scale, originalRotationType);
		}
		return null;
	};

	/**
	 * Get node property relative to rest position, defined by the last key in last sequence.
	 *
	 * @function
	 * @name sap.ui.vk.ViewStateManager#_getEndPropertyInLastSequence
	 * @param {any} nodeRef node reference
	 * @param {sap.ui.vk.AnimationTrackType} property translate/rotate/scale/opacity
	 * @returns {float[] | float} translate/rotate/scale/opacity
	 * @private
	 */
	ViewStateManager.prototype._getEndPropertyInLastSequence = function(nodeRef, property) {
		if (this._implementation && this._implementation._getEndPropertyInLastSequence) {
			return this._implementation._getEndPropertyInLastSequence(nodeRef, property);
		}
		return null;
	};

	/**
	 * Get node property relative to rest position, defined by the last key of previous sequence.
	 *
	 * @function
	 * @name sap.ui.vk.ViewStateManager#_getEndPropertyInPreviousSequence
	 * @param {any} nodeRef node reference
	 * @param {sap.ui.vk.AnimationTrackType} property translate/rotate/scale/opacity
	 * @param {sap.ui.vk.AnimationSequence} sequence current sequence, if undefine/null, get the property of last sequence
	 * @returns {float[] | float} translate/rotate/scale/opacity
	 * @private
	 */
	ViewStateManager.prototype._getEndPropertyInPreviousSequence = function(nodeRef, property, sequence) {
		if (this._implementation && this._implementation._getEndPropertyInPreviousSequence) {
			return this._implementation._getEndPropertyInPreviousSequence(nodeRef, property, sequence);
		}
		return null;
	};

	/**
	 * Convert translate, rotate, and scale tracks in absolute values to the values relative to the rest position defined with active view.
	 *
	 * @function
	 * @name sap.ui.vk.ViewStateManager#_convertTracksToRelative
	 * @param {sap.ui.vk.Animation.sequence} sequence animation sequence
	 * @returns {sap.ui.vk.ViewStateManager} <code>this</code> to allow method chaining.
	 * @private
	 */
	ViewStateManager.prototype._convertTracksToRelative = function(sequence) {
		if (this._implementation && this._implementation._convertTracksToRelative) {
			this._implementation._convertTracksToRelative(sequence);
		}
		return this;
	};

	/**
	 * Reset joint node offsets, which are scale/translation/quaternion relative to rest position in animation track.
	 * Called by scale/move/rotate tools to evaluate offset values under joint, as tools only make changes under scene tree
	 *
	 * @function
	 * @name sap.ui.vk.ViewStateManager#_setJointNodeOffsets
	 * @param {any} nodeRef node reference
	 * @param {sap.ui.vk.AnimationTrackType} trackType animation track type
	 * @returns {sap.ui.vk.ViewStateManager} <code>this</code> to allow method chaining.
	 * @private
	 */
	ViewStateManager.prototype._setJointNodeOffsets = function(nodeRef, trackType) {
		if (this._implementation && this._implementation._setJointNodeOffsets) {
			this._implementation._setJointNodeOffsets(nodeRef, trackType);
		}
		return this;
	};

	ViewStateManager.prototype._setJointNodeMatrix = function() {
		if (this._implementation && this._implementation._setJointNodeMatrix) {
			this._implementation._setJointNodeMatrix();
		}
		return this;
	};

	/**
	 * Add key to a translation track according to the current node postion
	 *
	 * @function
	 * @name sap.ui.vk.ViewStateManager#setTranslationKey
	 * @param {any} nodeRef The node reference of the translation track
	 * @param {float} time The time for the key
	 * @param {sap.ui.vk.AnimationSequence} sequence The animation sequence conatining the translate track
	 * @returns {any} object contains the follow fileds
	 * 			{float | float[]} <code>keyValue</code> translation relative to rest position
	 *   		{float | float[]} <code>absoluteValue</code> translation
	 * 			{any} <code>PreviousTrack</code> array of keys (time and value)
	 * 			{any} <code>CurrentTrack</code> array of keys (time and value)
	 * @private
	 */
	ViewStateManager.prototype.setTranslationKey = function(nodeRef, time, sequence) {
		if (this._implementation && this._implementation.setTranslationKey) {
			this._implementation.setTranslationKey(nodeRef, time, sequence);
		}
		return this;
	};

	 /**
	 * Add key to a scale track according to the current node scale
	 *
	 * @function
	 * @name sap.ui.vk.ViewStateManager#setScaleKey
	 * @param {any} nodeRef The node reference of the scale track
	 * @param {float} time The time for the key
	 * @param {sap.ui.vk.AnimationSequence} sequence The animation sequence conatining the scale track
	 * @returns {any} object contains the follow fileds
	 * 			{float[]} <code>keyValue</code> scale relative to end position of previous sequence
	 *   		{float[]} <code>absoluteValue</code> scale
	 * 			{any} <code>PreviousTrack</code> array of keys (time and value)
	 * 			{any} <code>CurrentTrack</code> array of keys (time and value)
	 * @private
	 */
	ViewStateManager.prototype.setScaleKey = function(nodeRef, time, sequence) {
		if (this._implementation && this._implementation.setScaleKey) {
			this._implementation.setScaleKey(nodeRef, time, sequence);
		}
		return this;
	};

	/**
	 * Add key to a scale track according to the current node scale
	 *
	 * @function
	 * @name sap.ui.vk.ViewStateManager#setRotationKey
	 * @param {any} nodeRef The node reference of the scale track
	 * @param {float} time The time for the key
	 * @param {float[]} euler The euler rotation relative to the end position of previous sequence or rest position for the first sequence
	 * @param {sap.ui.vk.AnimationSequence} sequence The animation sequence conatining the scale track
	 * @returns {any} null if existing track is not euler, if no existing track or existing track is euler, object contains the follow fileds
	 * 			{float[]} <code>keyValue</code> euler rotation relative to end position of previous sequence
	 * 			{float[]} <code>offset</code> quaternion of end position of previous sequence relative to rest position
	 *   		{float[]} <code>absoluteValue</code> quaternion rotation
	 * 			{any} <code>PreviousTrack</code> array of keys (time and value)
	 * 			{any} <code>CurrentTrack</code> array of keys (time and value)
	 *
	 * @private
	 */
	ViewStateManager.prototype.setRotationKey = function(nodeRef, time, euler, sequence) {
		if (this._implementation && this._implementation.setRotationKey) {
			this._implementation.setRotationKey(nodeRef, time, euler, sequence);
		}
		return this;
	};

	 /**
	 * Add key to a opacity track according to the opacity of current node
	 *
	 * @function
	 * @name sap.ui.vk.ViewStateManager#setOpacityKey
	 * @param {any} nodeRef The node reference of the opacity track
	 * @param {float} time The time for the key
	 * @param {sap.ui.vk.AnimationSequence} sequence The animation sequence conatining the opacity track
	 * @returns {any} null if existing track is not euler, if no existing track or existing track is euler, object contains the follow fileds
	 * 			{float} <code>keyValue</code> scale relative to rest position
	 *   		{float} <code>totalOpacity</code> scale
	 * 			{any} <code>PreviousTrack</code> array of keys (time and value)
	 * 			{any} <code>CurrentTrack</code> array of keys (time and value)
	 * @private
	 */
	ViewStateManager.prototype.setOpacityKey = function(nodeRef, time, sequence) {
		if (this._implementation && this._implementation.setOpacityKey) {
			this._implementation.setOpacityKey(nodeRef, time, sequence);
		}
		return this;
	};


	var fullClassName = ViewStateManager.getMetadata().getName();

	var mixin = {
		init: function() {
			this._viewStateManager = null;
			vkCore
				.attachEvent(fullClassName + "-created", this._handleViewStateManagerCreated, this)
				.attachEvent(fullClassName + "-destroying", this._handleViewStateManagerDestroying, this);
		},

		exit: function() {
			this.setViewStateManager(null);
			vkCore
				.detachEvent(fullClassName + "-destroying", this._handleViewStateManagerDestroying, this)
				.detachEvent(fullClassName + "-created", this._handleViewStateManagerCreated, this);
		},

		setViewStateManager: function(viewStateManager) {
			this.setAssociation("viewStateManager", viewStateManager, true);
			this._updateViewStateManager();
			return this;
		},

		_updateViewStateManager: function() {
			var newViewStateManagerId = this.getViewStateManager(),
				// sap.ui.getCore() returns 'undefined' if cannot find an element,
				// getViewStateManager() returns 'null' if there is no connector.
				newViewStateManager = newViewStateManagerId && sap.ui.getCore().byId(newViewStateManagerId) || null;

			if (this._viewStateManager !== newViewStateManager) {
				this._clearViewStateManager();
				if (newViewStateManager) {
					if (this._handleNodeHierarchyReplaced) {
						newViewStateManager.attachNodeHierarchyReplaced(this._handleNodeHierarchyReplaced, this);
					}
					if (this._handleVisibilityChanged) {
						newViewStateManager.attachVisibilityChanged(this._handleVisibilityChanged, this);
					}
					if (this._handleSelectionChanged) {
						newViewStateManager.attachSelectionChanged(this._handleSelectionChanged, this);
					}
					if (this._handleOutliningChanged) {
						newViewStateManager.attachOutliningChanged(this._handleOutliningChanged, this);
					}
					if (this._handleOutlineColorChanged) {
						newViewStateManager.attachOutlineColorChanged(this._handleOutlineColorChanged, this);
					}
					if (this._handleOutlineWidthChanged) {
						newViewStateManager.attachOutlineWidthChanged(this._handleOutlineWidthChanged, this);
					}
					if (this._handleOpacityChanged) {
						newViewStateManager.attachOpacityChanged(this._handleOpacityChanged, this);
					}
					if (this._handleHighlightColorChanged) {
						newViewStateManager.attachHighlightColorChanged(this._handleHighlightColorChanged, this);
					}
					if (this._handleTintColorChanged) {
						newViewStateManager.attachTintColorChanged(this._handleTintColorChanged, this);
					}
					if (this._handleTransformationChanged) {
						newViewStateManager.attachTransformationChanged(this._handleTransformationChanged, this);
					}
					if (this._handleViewStateApplied) {
						newViewStateManager.attachViewStateApplied(this._handleViewStateApplied, this);
					}
						this._viewStateManager = newViewStateManager;
					if (this._onAfterUpdateViewStateManager) {
						this._onAfterUpdateViewStateManager();
					}
				}
			}
			return this;
		},

		_clearViewStateManager: function() {
			if (this._viewStateManager) {
				if (this._onBeforeClearViewStateManager) {
					this._onBeforeClearViewStateManager();
				}
				if (this._handleTransformationChanged) {
					this._viewStateManager.detachTransformationChanged(this._handleTransformationChanged, this);
				}
				if (this._handleTintColorChanged) {
					this._viewStateManager.detachTintColorChanged(this._handleTintColorChanged, this);
				}
				if (this._handleHighlightColorChanged) {
					this._viewStateManager.detachHighlightColorChanged(this._handleHighlightColorChanged, this);
				}
				if (this._handleSelectionChanged) {
					this._viewStateManager.detachSelectionChanged(this._handleSelectionChanged, this);
				}
				if (this._handleOutliningChanged) {
					this._viewStateManager.detachOutliningChanged(this._handleOutliningChanged, this);
				}
				if (this._handleOutlineColorChanged) {
					this._viewStateManager.detachOutlineColorChanged(this._handleOutlineColorChanged, this);
				}
				if (this._handleOutlineWidthChanged) {
					this._viewStateManager.detachOutlineWidthChanged(this._handleOutlineWidthChanged, this);
				}
				if (this._handleVisibilityChanged) {
					this._viewStateManager.detachVisibilityChanged(this._handleVisibilityChanged, this);
				}
				if (this._handleNodeHierarchyReplaced) {
					this._viewStateManager.detachNodeHierarchyReplaced(this._handleNodeHierarchyReplaced, this);
				}
				if (this._handleViewStateApplied) {
					this._viewStateManager.detachViewStateApplied(this._handleViewStateApplied, this);
				}
				this._viewStateManager = null;
			}
			return this;
		},

		_handleViewStateManagerCreated: function(event) {
			if (this.getViewStateManager() === event.getParameter("object").getId()) {
				this._updateViewStateManager();
			}
		},

		_handleViewStateManagerDestroying: function(event) {
			if (this.getViewStateManager() === event.getParameter("object").getId()) {
				this._clearViewStateManager();
			}
		}
	};

	ViewStateManager.injectMethodsIntoClass = function(classObject) {
		var prototype = classObject.prototype,
			init = prototype.init,
			exit = prototype.exit;

		prototype.init = function() {
			if (init) {
				init.call(this);
			}
			mixin.init.call(this);
		};

		prototype.exit = function() {
			mixin.exit.call(this);
			if (exit) {
				exit.call(this);
			}
		};

		prototype.setViewStateManager = mixin.setViewStateManager;
		prototype._updateViewStateManager = mixin._updateViewStateManager;
		prototype._clearViewStateManager = mixin._clearViewStateManager;
		prototype._handleViewStateManagerCreated = mixin._handleViewStateManagerCreated;
		prototype._handleViewStateManagerDestroying = mixin._handleViewStateManagerDestroying;
	};

	vkCore.registerClass(ViewStateManager);
	ContentConnector.injectMethodsIntoClass(ViewStateManager);

	return ViewStateManager;
});
