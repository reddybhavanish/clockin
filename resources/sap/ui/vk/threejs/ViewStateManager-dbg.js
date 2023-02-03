/*!
* SAP UI development toolkit for HTML5 (SAPUI5)

        (c) Copyright 2009-2015 SAP SE. All rights reserved
    
*/

// Provides the ViewStateManager class.
sap.ui.define([
	"../Core",
	"../ContentConnector",
	"../ViewStateManagerBase",
	"./thirdparty/three",
	"../cssColorToColor",
	"../colorToCSSColor",
	"../abgrToColor",
	"../colorToABGR",
	"./Scene",
	"../ObjectType",
	"../RotationType",
	"./NodesTransitionHelper",
	"./OutlineRenderer",
	"./HighlightPlayer",
	"../HighlightDisplayState",
	"../Highlight",
	"../AnimationTrackType",
	"../AnimationTrackValueType",
	"../AnimationMath"
], function(
	vkCore,
	ContentConnector,
	ViewStateManagerBase,
	three,
	cssColorToColor,
	colorToCSSColor,
	abgrToColor,
	colorToABGR,
	Scene,
	ObjectType,
	RotationType,
	NodesTransitionHelper,
	OutlineRenderer,
	HighlightPlayer,
	HighlightDisplayState,
	Highlight,
	AnimationTrackType,
	AnimationTrackValueType,
	AnimationMath
) {
	"use strict";

	var VisibilityTracker;

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
	* @alias sap.ui.vk.threejs.ViewStateManager
	* @since 1.32.0
	*/
	var ViewStateManager = ViewStateManagerBase.extend("sap.ui.vk.threejs.ViewStateManager", /** @lends sap.ui.vk.threejs.ViewStateManager.prototype */ {
		metadata: {
		}
	});

	var basePrototype = ViewStateManager.getMetadata().getParent().getClass().prototype;

	ViewStateManager.prototype.init = function() {
		if (basePrototype.init) {
			basePrototype.init.call(this);
		}

		this._channel = 0;
		this._layers = new THREE.Layers();
		this._layers.set(this._channel);
		this._nodeHierarchy = null;
		this._nodeStates = new Map();
		this._selectedNodes = new Set(); // a collection of selected nodes for quick access,
		// usually there are not many selected objects,
		// so it is OK to store them in a collection.
		this._outlineRenderer = new OutlineRenderer(1.0);
		this._outlinedNodes = new Set();
		this.setOutlineColor("rgba(255, 0, 255, 1.0)");
		this.setOutlineWidth(1.0);

		this._visibilityTracker = new VisibilityTracker();

		this._showSelectionBoundingBox = true;
		this._boundingBoxesScene = new THREE.Scene();
		this._selectionColor = new THREE.Color(0xC0C000);

		this.setHighlightColor("rgba(255, 0, 0, 1.0)");

		this._joints = [];
		this._customPositionedNodes = new Set();

		this._nodesTransitionHelper = new NodesTransitionHelper();
		this._nodesTransitionHelper.setViewStateManager(this);

		this._highlightPlayer = new HighlightPlayer();
		this._transitionHighlightPlayer = new HighlightPlayer();

		vkCore.getEventBus().subscribe("sap.ui.vk", "activateView", this._onViewActivated, this);
	};

	ViewStateManager.prototype.exit = function() {
		vkCore.getEventBus().unsubscribe("sap.ui.vk", "activateView", this._onViewActivated, this);
	};

	////////////////////////////////////////////////////////////////////////
	// Content connector handling begins.
	ViewStateManager.prototype._setContent = function(content) {
		var scene = null;
		if (content && content instanceof Scene) {
			scene = content;
		}
		this._setScene(scene);

		if (scene) {
			var initialView = scene.getInitialView();
			if (initialView) {
				this._currentView = initialView;
				this._resetNodesMaterialAndOpacityByCurrenView(this._currentView);
			}
		}
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
		var content = event.getParameter("newContent");
		this._setContent(content);
	};

	ViewStateManager.prototype._setScene = function(scene) {
		this._boundingBoxesScene = new THREE.Scene();
		this._setNodeHierarchy(scene ? scene.getDefaultNodeHierarchy() : null);
		if (scene) {
			scene.setViewStateManager(this);
		}
		this._scene = scene;
		return this;
	};

	ViewStateManager.prototype._setNodeHierarchy = function(nodeHierarchy) {
		var oldNodeHierarchy = this._nodeHierarchy;

		if (this._nodeHierarchy) {
			this._nodeHierarchy = null;
			this._nodeStates.clear();
			this._selectedNodes.clear();
			this._outlinedNodes.clear();
			this._visibilityTracker.clear();
		}

		if (nodeHierarchy) {
			this._nodeHierarchy = nodeHierarchy;

			this._nodeHierarchy.attachNodeReplaced(this._handleNodeReplaced, this);
			this._nodeHierarchy.attachNodeUpdated(this._handleNodeUpdated, this);
			this._nodeHierarchy.attachNodeRemoving(this._handleNodeRemoving, this);

			this._initialState = { visible: [], hidden: [] };
			var that = this;

			var allNodeRefs = nodeHierarchy.findNodesByName();
			allNodeRefs.forEach(function(nodeRef) {
				(nodeRef.layers.test(that._layers) ? that._initialState.visible : that._initialState.hidden).push(nodeRef);
			});

			this.fireVisibilityChanged({
				visible: this._initialState.visible,
				hidden: this._initialState.hidden
			});
		}

		if (nodeHierarchy !== oldNodeHierarchy) {
			this.fireNodeHierarchyReplaced({
				oldNodeHierarchy: oldNodeHierarchy,
				newNodeHierarchy: nodeHierarchy
			});
		}

		return this;
	};

	ViewStateManager.prototype._getJointByChildNode = function(nodeRef){
		var joint;
		if (this._jointCollection) {
			for (var i = 0; i < this._jointCollection.length; i++) {
				if (this._jointCollection[i].node === nodeRef) {
					joint = this._jointCollection[i];
					break;
				}
			}
		}
		return joint;
	};

	ViewStateManager.prototype._handleNodeReplaced = function(event) {
		var replacedNodeRef = event.getParameter("ReplacedNodeRef");
		var replacementNodeRef = event.getParameter("ReplacementNodeRef");

		if (this.getSelectionState(replacedNodeRef)){
			this.setSelectionState(replacementNodeRef, true);
			this.setSelectionState(replacedNodeRef, false);
		}
	};

	ViewStateManager.prototype._handleNodeUpdated = function(event) {
		var nodeRef = event.getParameter("nodeRef");

		if (this.getSelectionState(nodeRef)){
			this.setSelectionState(nodeRef, false);
			this.setSelectionState(nodeRef, true);
		}
	};

	ViewStateManager.prototype._handleNodeRemoving = function(event) {
		var nodeRef = event.getParameter("nodeRef");

		if (this._jointCollection) {
			for (var i = 0; i < this._jointCollection.length; i++) {
				if (this._jointCollection[i].node === nodeRef) {
					this._jointCollection[i].node = null;
					break;
				}

				if (this._jointCollection[i].parent === nodeRef) {
					this._jointCollection[i].parent = null;
					break;
				}
			}
		}
		// Node is removed from node hierarchy, remove it from list of selected nodes
		if (this.getSelectionState(nodeRef)){
			// Since this node is already removed from the scene don't send notification
			this.setSelectionState(nodeRef, false, true, true);
		}
	};

	ViewStateManager.prototype._renderOutline = function(renderer, scene, camera) {
		var c = abgrToColor(this._outlineColorABGR);
		var color = new THREE.Color(c.red / 255.0, c.green / 255.0, c.blue / 255.0);
		this._outlineRenderer.render(renderer, scene, camera, Array.from(this._outlinedNodes), color, this._jointCollection);
	};

	// Node hierarchy handling ends.
	////////////////////////////////////////////////////////////////////////

	/**
	* Gets the NodeHierarchy object associated with this ViewStateManager object.
	* @returns {sap.ui.vk.NodeHierarchy} The node hierarchy associated with this ViewStateManager object.
	* @public
	*/
	ViewStateManager.prototype.getNodeHierarchy = function() {
		return this._nodeHierarchy;
	};

	/**
	* Gets the visibility changes in the current ViewStateManager object.
	* @returns {string[]} The visibility changes are in the form of an array. The array is a list of node VE ids which suffered a visibility changed relative to the default state.
	* @public
	*/
	ViewStateManager.prototype.getVisibilityChanges = function() {
		return this.getShouldTrackVisibilityChanges() ? this._visibilityTracker.getInfo(this.getNodeHierarchy()) : null;
	};

	ViewStateManager.prototype.getCurrentView = function() {
		var viewManager = sap.ui.getCore().byId(this.getViewManager());
		if (!viewManager) {
			return null;
		}

		var currentView = viewManager.getActiveView();
		return currentView;
	};

	/**
	* Reset node property to the value defined by current view..
	*
	* @param {object} nodeRef reference to node.
	* @param {string} property node property
	* @public
	*/
	ViewStateManager.prototype.resetNodeProperty = function(nodeRef, property) {
		var currentView = this.getCurrentView();
		if (!currentView) {
			return;
		}

		var nodeInfo = currentView.getNodeInfos();

		if (nodeInfo) {

			var nodes = [];
			nodes.push(nodeRef);
			if (this._jointCollection && this._jointCollection.length > 0) {

				for (var ji = 0; ji < this._jointCollection.length; ji++) {
					var joint = this._jointCollection[ji];
					if (!joint.node || !joint.parent) {
						continue;
					}
					var parent = joint.parent;
					if (parent !== nodeRef) {
						break;
					}
					nodes.push(joint.node);
				}
			}

			nodeInfo.forEach(function(node) {

				if (!nodes.includes(node.target)) {
					return;
				}

				if (!property || property !== AnimationTrackType.Opacity) {

					var transforms = {
						nodeRefs: [],
						positions: []
					};

					var newPosition;
					var newRotation;
					var newScale;

					if (node.transform) {
						var position = new THREE.Vector3();
						var rotation = new THREE.Quaternion();
						var scale = new THREE.Vector3();
						var newMatrix = arrayToMatrixThree(node.transform);
						newMatrix.decompose(position, rotation, scale);
						newPosition = position.toArray();
						newRotation = rotation.toArray();
						newScale = scale.toArray();
					} else if (node[AnimationTrackType.Scale] && node[AnimationTrackType.Rotate] && node[AnimationTrackType.Translate]) {
						newPosition = node[AnimationTrackType.Translate].slice();
						newRotation = node[AnimationTrackType.Rotate].slice();
						newScale = node[AnimationTrackType.Scale].slice();
					}

					if (newPosition) {
						transforms.nodeRefs.push(node.target);
						transforms.positions.push({
							translation: newPosition,
							quaternion: newRotation,
							scale: newScale
						});

						this.setTransformation(transforms.nodeRefs, transforms.positions);
					}
				} else {
					nodeRef._vkSetOpacity(node.opacity, this._jointCollection);
					var eventParameters = {
						changed: nodeRef,
						opacity: nodeInfo.opacity
					};

					this.fireOpacityChanged(eventParameters);
				}
			}.bind(this));
		}
	};

	ViewStateManager.prototype.getVisibilityComplete = function() {
		var nodeHierarchy = this.getNodeHierarchy(),
			allNodeRefs = nodeHierarchy.findNodesByName(),
			visible = [],
			hidden = [];

		allNodeRefs.forEach(function(nodeRef) {
			// create node proxy based on dynamic node reference
			var nodeProxy = nodeHierarchy.createNodeProxy(nodeRef);
			var veId = nodeProxy.getVeId();
			// destroy the node proxy
			nodeHierarchy.destroyNodeProxy(nodeProxy);
			if (veId) {
				// push the ve id to either visible/hidden array
				if (this.getVisibilityState(nodeRef)) {
					visible.push(veId);
				} else {
					hidden.push(veId);
				}
			}
		}, this);

		return {
			visible: visible,
			hidden: hidden
		};
	};

	ViewStateManager.prototype.resetVisibility = function() {
		this.setVisibilityState(this._initialState.visible, true, false);
		this.setVisibilityState(this._initialState.hidden, false, false);
		this._visibilityTracker.clear();
	};

	/**
	* Gets the visibility state of nodes.
	*
	* If a single node is passed to the method then a single visibility state is returned.<br/>
	* If an array of nodes is passed to the method then an array of visibility states is returned.
	*
	* @param {any|any[]} nodeRefs The node reference or the array of node references.
	* @returns {boolean|boolean[]} A single value or an array of values where the value is <code>true</code> if the node is visible, <code>false</code> otherwise.
	* @public
	*/
	ViewStateManager.prototype.getVisibilityState = function(nodeRefs) {
		var layers = this._layers;
		if (Array.isArray(nodeRefs)) {
			return nodeRefs.map(function(nodeRef) {
				return nodeRef ? nodeRef.layers.test(layers) : false;
			});
		}

		return nodeRefs ? nodeRefs.layers.test(layers) : false; // NB: The nodeRefs argument is a single nodeRef.
	};

	/**
	* Sets the visibility state of the nodes.
	* @param {any|any[]} nodeRefs The node reference or the array of node references.
	* @param {boolean|boolean[]} visible The new visibility state or array of states of the nodes.
	* @param {boolean} recursive The flags indicates if the change needs to propagate recursively to child nodes.
	* @returns {sap.ui.vk.ViewStateManager} <code>this</code> to allow method chaining.
	* @public
	*/
	ViewStateManager.prototype.setVisibilityState = function(nodeRefs, visible, recursive) {
		// normalize parameters to have array of nodeRefs and array of visibility values
		if (!Array.isArray(nodeRefs)) {
			nodeRefs = [ nodeRefs ];
		}

		// check if we got an array of booleans as visibility change
		var isBulkChange = Array.isArray(visible);

		var recursiveVisibility = [];
		var allNodeRefs = nodeRefs;

		if (recursive) {
			allNodeRefs = [];
			nodeRefs.forEach(function(nodeRef, idx) {
				var collected = this._collectNodesRecursively(nodeRef);
				allNodeRefs = allNodeRefs.concat(collected);

				var length = recursiveVisibility.length;
				recursiveVisibility.length = length + collected.length;
				recursiveVisibility.fill(isBulkChange ? visible[idx] : visible, length);
			}, this);
		} else if (!isBulkChange) {
			// not recursive, visible is a scalar
			recursiveVisibility.length = allNodeRefs.length;
			recursiveVisibility.fill(visible);
		} else {
			// not recursive, visible is an array
			recursiveVisibility = visible;
		}

		// filter out unchanged visibility and duplicate nodes
		var changedVisibility = [];
		var usedNodeRefs = new Set();
		var layers = this._layers, channel = this._channel;
		var changed = allNodeRefs.filter(function(nodeRef, index) {
			if (usedNodeRefs.has(nodeRef)) {
				return false;
			}

			usedNodeRefs.add(nodeRef);

			var changed = nodeRef ? nodeRef.layers.test(layers) != recursiveVisibility[index] : false;
			if (changed) {
				changedVisibility.push(recursiveVisibility[index]);
			}

			return changed;
		}, this);

		if (changed.length > 0) {

			var eventParameters = {
				visible: [],
				hidden: []
			};

			changed.forEach(function(nodeRef, idx) {
				if (changedVisibility[ idx ]) {
					nodeRef.layers.enable(channel);
					eventParameters.visible.push(nodeRef);
				} else {
					nodeRef.layers.disable(channel);
					eventParameters.hidden.push(nodeRef);
				}
			}, this);

			if (this.getShouldTrackVisibilityChanges()) {
				changed.forEach(this._visibilityTracker.trackNodeRef, this._visibilityTracker);
			}

			this.fireVisibilityChanged(eventParameters);
		}
		return this;
	};

	/**
	* Enumerates IDs of the selected nodes.
	*
	* @param {function} callback A function to call when the selected nodes are enumerated. The function takes one parameter of type <code>string</code>.
	* @returns {sap.ui.vk.ViewStateManager} <code>this</code> to allow method chaining.
	* @public
	*/
	ViewStateManager.prototype.enumerateSelection = function(callback) {
		this._selectedNodes.forEach(callback);
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
		this._outlinedNodes.forEach(callback);
		return this;
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
		var selectionSet = this._selectedNodes;
		function isSelected(nodeRef) {
			return selectionSet.has(nodeRef);
		}

		return Array.isArray(nodeRefs) ?
			nodeRefs.map(isSelected) : isSelected(nodeRefs); // NB: The nodeRefs argument is a single nodeRef.
	};

	ViewStateManager.prototype._isAChild = function(childNodeRef, nodeRefs) {
		var ancestor = childNodeRef.parent;
		while (ancestor) {
			if (nodeRefs.has(ancestor)) {
				return true;
			}
			ancestor = ancestor.parent;
		}
		return false;
	};

	ViewStateManager.prototype._AddBoundingBox = function(nodeRef) {
		if (nodeRef.userData.boundingBox === undefined) {
			nodeRef.userData.boundingBox = new THREE.Box3();
			nodeRef._vkCalculateObjectOrientedBoundingBox();
		}

		if (!nodeRef.userData.boundingBox.isEmpty() && this._boundingBoxesScene && nodeRef.userData.boxHelper === undefined) {
			var boxHelper = new THREE.Box3Helper(nodeRef.userData.boundingBox, 0xffff00);
			boxHelper.material.color = this._selectionColor;
			this._boundingBoxesScene.add(boxHelper);
			boxHelper.parent = nodeRef;
			nodeRef.userData.boxHelper = boxHelper;
		}
	};

	ViewStateManager.prototype._RemoveBoundingBox = function(nodeRef) {
		if (nodeRef.userData.boundingBox !== undefined) {
			delete nodeRef.userData.boundingBox;
		}

		if (nodeRef.userData.boxHelper !== undefined){
			this._boundingBoxesScene.remove(nodeRef.userData.boxHelper);
			delete nodeRef.userData.boxHelper;
		}
	};

	ViewStateManager.prototype._updateBoundingBoxesIfNeeded = function() {
		var updateSet = new Set();
		this._selectedNodes.forEach(function(nodeRef) {
			var parent = nodeRef.parent;
			while (parent) {
				if (this._selectedNodes.has(parent)) {
					updateSet.add(parent); // need to update parent bounding box
				}
				parent = parent.parent;
			}
		}.bind(this));

		updateSet.forEach(function(nodeRef) {
			nodeRef._vkCalculateObjectOrientedBoundingBox();
		});
	};

	ViewStateManager.prototype._updateBoundingBoxes = function() {
		this._selectedNodes.forEach(function(nodeRef) {
			if (nodeRef.userData.boundingBox) {
				nodeRef._vkCalculateObjectOrientedBoundingBox();
			}
		});
	};


	/**
	 * Sets if showing the bounding box when nodes are selected
	 *
	 * @param {boolean} val <code>true</code> if bounding boxes of selected nodes are shown, <code>false</code> otherwise.
	 * @public
	 */
	ViewStateManager.prototype.setShowSelectionBoundingBox = function(val){
		this._showSelectionBoundingBox  = val;
		if (this._showSelectionBoundingBox){
			this._selectedNodes.forEach(function(node){this._AddBoundingBox(node); }.bind(this));
		} else {
			this._selectedNodes.forEach(function(node){this._RemoveBoundingBox(node); }.bind(this));
		}

		this.fireSelectionChanged({
			selected: this._selectedNodes,
			unselected: []
		});
	};

	/**
	 * Gets if showing the bounding box when nodes are selected
	 *
	 * @returns {boolean} <code>true</code> if bounding boxes of selected nodes are shown, <code>false</code> otherwise.
	 * @public
	 */
	ViewStateManager.prototype.getShowSelectionBoundingBox = function(){
		return this._showSelectionBoundingBox;
	};

	ViewStateManager.prototype._isAncestorSelected = function(nodeRef) {
		nodeRef = nodeRef.parent;
		while (nodeRef) {
			if (this._selectedNodes.has(nodeRef)) {
				return true;
			}

			nodeRef = nodeRef.parent;
		}

		return false;
	};

	ViewStateManager.prototype._updateHighlightColor = function(nodeRef, parentSelected) {
		var selected = parentSelected || this._selectedNodes.has(nodeRef);

		nodeRef.userData.highlightColor = selected ? this._highlightColorABGR : undefined;
		nodeRef._vkUpdateMaterialColor();
		var children = nodeRef.children;
		for (var i = 0, l = children.length; i < l; i++) {
			var userData = children[i].userData;
			if (userData && userData.objectType === ObjectType.Hotspot){
				continue;
			}
			this._updateHighlightColor(children[i], selected);
		}
	};

	/**
	* Sets the selection state of the nodes.
	* @param {any|any[]} nodeRefs The node reference or the array of node references.
	* @param {boolean} selected The new selection state of the nodes.
	* @param {boolean} recursive The flags indicates if the change needs to propagate recursively to child nodes.
	* @param {boolean} blockNotification The flag to suppress selectionChanged event.
	* @returns {sap.ui.vk.ViewStateManager} <code>this</code> to allow method chaining.
	* @deprecated Since version 1.56.3.
	* @public
	*/
	ViewStateManager.prototype.setSelectionState = function(nodeRefs, selected, recursive, blockNotification) {
		if (!Array.isArray(nodeRefs)) {
			nodeRefs = [ nodeRefs ];
		}

		nodeRefs = (recursive || this.getRecursiveSelection() ? this._collectNodesRecursively(nodeRefs) : nodeRefs).filter(function(value, index, self) {
			return self.indexOf(value) === index;
		});

		if (this.getRecursiveSelection() && !selected) {
			nodeRefs = this._nodeHierarchy._appendAncestors(nodeRefs);
		}

		var changed = nodeRefs.filter(function(nodeRef) {
			return this._selectedNodes.has(nodeRef) !== selected;
		}, this);

		if (changed.length > 0) {
			changed.forEach(function(nodeRef) {
				if (nodeRef) {
					this._selectedNodes[ selected ? "add" : "delete" ](nodeRef);
					if (this._showSelectionBoundingBox) {
						this[ selected ? "_AddBoundingBox" : "_RemoveBoundingBox" ](nodeRef);
					}
				}
			}, this);

			// we need to update this._selectedNodes before updating nodes highlight color
			changed.forEach(function(nodeRef) {
				if (nodeRef) {
					this._updateHighlightColor(nodeRef, selected || this._isAncestorSelected(nodeRef));
				}
			}, this);

			if (!blockNotification) {
				this.fireSelectionChanged({
					selected: selected ? changed : [],
					unselected: selected ? [] : changed
				});
			}
		}

		return this;
	};

	/**
	 * Sets or resets the selection state of the nodes.
	 * @param {any|any[]} selectedNodeRefs The node reference or the array of node references of selected nodes.
	 * @param {any|any[]} unselectedNodeRefs The node reference or the array of node references of unselected nodes.
	 * @param {boolean} recursive The flags indicates if the change needs to propagate recursively to child nodes.
	 * @param {boolean} blockNotification The flag to suppress selectionChanged event.
	 * @returns {sap.ui.vk.ViewStateManager} <code>this</code> to allow method chaining.
	 * @public
	 */
	ViewStateManager.prototype.setSelectionStates = function(selectedNodeRefs, unselectedNodeRefs, recursive, blockNotification) {
		if (!Array.isArray(selectedNodeRefs)) {
			selectedNodeRefs = [ selectedNodeRefs ];
		}

		if (!Array.isArray(unselectedNodeRefs)) {
			unselectedNodeRefs = [ unselectedNodeRefs ];
		}

		selectedNodeRefs = (recursive || this.getRecursiveSelection() ? this._collectNodesRecursively(selectedNodeRefs) : selectedNodeRefs);
		unselectedNodeRefs = (recursive || this.getRecursiveSelection() ? this._collectNodesRecursively(unselectedNodeRefs) : unselectedNodeRefs);

		if (this.getRecursiveSelection()) {
			unselectedNodeRefs = this._nodeHierarchy._appendAncestors(unselectedNodeRefs, selectedNodeRefs);
		}

		var selected = selectedNodeRefs.filter(function(nodeRef) {
			return this._selectedNodes.has(nodeRef) === false;
		}, this);

		var unselected = unselectedNodeRefs.filter(function(nodeRef) {
			return this._selectedNodes.has(nodeRef) === true;
		}, this);

		if (selected.length > 0 || unselected.length > 0) {
			selected.forEach(function(nodeRef) {
				this._selectedNodes.add(nodeRef);
				this._updateHighlightColor(nodeRef, true);
				if (this._showSelectionBoundingBox) {
					this._AddBoundingBox(nodeRef);
				}
			}, this);

			unselected.forEach(function(nodeRef) {
				this._selectedNodes.delete(nodeRef);
				if (this._showSelectionBoundingBox) {
					this._RemoveBoundingBox(nodeRef);
				}
			}, this);

			// we need to remove all unselected nodes from this._selectedNodes before updating unselected nodes highlight color
			unselected.forEach(function(nodeRef) {
				this._updateHighlightColor(nodeRef, this._isAncestorSelected(nodeRef));
			}, this);

			if (!blockNotification) {
				this.fireSelectionChanged({
					selected: selected,
					unselected: unselected
				});
			}
		}

		return this;
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
		switch (typeof color) {
			case "number":
				this._outlineColorABGR = color;
				break;
			case "string":
				if (sap.ui.core.CSSColor.isValid(color)) {
					this._outlineColorABGR = colorToABGR(cssColorToColor(color));
				}
				break;
			default:
				return this;
		}

		this.fireOutlineColorChanged({
			outlineColor: colorToCSSColor(abgrToColor(this._outlineColorABGR)),
			outlineColorABGR: this._outlineColorABGR
		});

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
		return inABGRFormat ? this._outlineColorABGR : colorToCSSColor(abgrToColor(this._outlineColorABGR));
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
		var outliningSet = this._outlinedNodes;
		function isOutlined(nodeRef) {
			return outliningSet.has(nodeRef);
		}

		return Array.isArray(nodeRefs) ?
			nodeRefs.map(isOutlined) : isOutlined(nodeRefs); // NB: The nodeRefs argument is a single no
	};


	/**
	 * Sets or resets the outlining state of the nodes.
	 * @param {any|any[]} outlinedNodeRefs The node reference or the array of node references of outlined nodes.
	 * @param {any|any[]} unoutlinedNodeRefs The node reference or the array of node references of un-outlined nodes.
	 * @param {boolean} recursive The flags indicates if the change needs to propagate recursively to child nodes.
	 * @param {boolean} blockNotification The flag to suppress outlineChanged event.
	 * @returns {sap.ui.vk.ViewStateManager} <code>this</code> to allow method chaining.
	 * @public
	 */
	ViewStateManager.prototype.setOutliningStates = function(outlinedNodeRefs, unoutlinedNodeRefs, recursive, blockNotification) {
		if (!Array.isArray(outlinedNodeRefs)) {
			outlinedNodeRefs = [ outlinedNodeRefs ];
		}

		if (!Array.isArray(unoutlinedNodeRefs)) {
			unoutlinedNodeRefs = [ unoutlinedNodeRefs ];
		}

		outlinedNodeRefs = (recursive || this.getRecursiveOutlining() ? this._collectNodesRecursively(outlinedNodeRefs) : outlinedNodeRefs);
		unoutlinedNodeRefs = (recursive || this.getRecursiveOutlining() ? this._collectNodesRecursively(unoutlinedNodeRefs) : unoutlinedNodeRefs);

		if (this.getRecursiveOutlining()) {
			unoutlinedNodeRefs = this._nodeHierarchy._appendAncestors(unoutlinedNodeRefs, outlinedNodeRefs);
		}

		var outlined = outlinedNodeRefs.filter(function(nodeRef) {
			return this._outlinedNodes.has(nodeRef) === false;
		}, this);

		var unoutlined = unoutlinedNodeRefs.filter(function(nodeRef) {
			return this._outlinedNodes.has(nodeRef) === true;
		}, this);

		if (outlined.length > 0 || unoutlined.length > 0) {
			outlined.forEach(function(nodeRef) {
				this._outlinedNodes.add(nodeRef);
			}, this);

			unoutlined.forEach(function(nodeRef) {
				this._outlinedNodes.delete(nodeRef);
			}, this);

			if (!blockNotification) {
				this.fireOutliningChanged({
					outlined: outlined,
					unoutlined: unoutlined
				});
			}
		}

		return this;
	};

	/**
	 * Sets the outline width
	 * @function
	 * @param {float} width           			width of outline
	 * @returns {sap.ui.vk.ViewStateManager} 	<code>this</code> to allow method chaining.
	 * @public
	 */
	ViewStateManager.prototype.setOutlineWidth = function(width) {
		this._outlineWidth = width;
		this._outlineRenderer.setOutlineWidth(width);
		this.fireOutlineWidthChanged({
			width: width
		});
		return this;
	};

	/**
	 * Gets the outline width
	 * @function
	 * @returns {float} width of outline
	 * @public
	 */
	ViewStateManager.prototype.getOutlineWidth = function() {
		return this._outlineWidth;
	};

	ViewStateManager.prototype._collectNodesRecursively = function(nodeRefs) {
		var result = [],
			that = this;

		if (!Array.isArray(nodeRefs)) {
			nodeRefs = [ nodeRefs ];
		}

		nodeRefs.forEach(function collectChildNodes(nodeRef) {
			result.push(nodeRef);
			that._nodeHierarchy.enumerateChildren(nodeRef, collectChildNodes, false, true);
		});
		return result;
	};

	/**
	* Gets the opacity of the node.
	*
	* A helper method to ensure the returned value is either <code>float</code> or <code>null</code>.
	*
	* @param {any} nodeRef The node reference.
	* @returns {float|null} The opacity or <code>null</code> if no opacity set.
	* @private
	*/
	ViewStateManager.prototype._getOpacity = function(nodeRef) {
		return nodeRef.userData.opacity !== undefined ? nodeRef.userData.opacity : null;
	};

	/**
	* Gets the opacity of the node.
	*
	* If a single node is passed to the method then a single value is returned.<br/>
	* If an array of nodes is passed to the method then an array of values is returned.
	*
	* @param {any|any[]}	nodeRefs	The node reference or the array of node references.
	* @returns {float|float[]} A single value or an array of values. Value <code>null</code> means that the node's own opacity should be used.
	* @public
	*/
	ViewStateManager.prototype.getOpacity = function(nodeRefs) {
		if (Array.isArray(nodeRefs)) {
			return nodeRefs.map(this._getOpacity, this);
		} else {
			return this._getOpacity(nodeRefs); // NB: The nodeRefs argument is a single nodeRef.
		}
	};

	/**
	* Sets the opacity of the nodes.
	*
	* @param {any|any[]}               nodeRefs          The node reference or the array of node references.
	* @param {float|float[]|null}      opacity           The new opacity of the nodes. If <code>null</code> is passed then the opacity is reset
	*                                                    and the node's own opacity should be used.
	* @param {boolean}         [recursive=false] This flag is not used, as opacity is always recursively applied to the offspring nodes by multiplication
	* @returns {sap.ui.vk.ViewStateManager} <code>this</code> to allow method chaining.
	* @public
	*/
	ViewStateManager.prototype.setOpacity = function(nodeRefs, opacity, recursive) {
		// normalize parameters to have array of nodeRefs and array of visibility values
		if (!Array.isArray(nodeRefs)) {
			nodeRefs = [ nodeRefs ];
		}

		// check if we got an array as opacity
		var isBulkChange = Array.isArray(opacity);

		if (opacity == null) {
			opacity = undefined;
		} else if (isBulkChange) {
			opacity.forEach(function(value, idx) {
				if (value == null) {
					opacity[idx] = undefined;
				}
			});
		}

		var recursiveOpacity = [];
		var allNodeRefs = nodeRefs;

		if (!isBulkChange) {
			// not recursive, opacity is a scalar
			recursiveOpacity.length = allNodeRefs.length;
			recursiveOpacity.fill(opacity);
		} else {
			// not recursive, opacity is an array
			recursiveOpacity = opacity;
		}

		// filter out unchanged opacity and duplicate nodes
		var changedOpacity = [];
		var usedNodeRefs = new Set();
		var changed = allNodeRefs.filter(function(nodeRef, index) {
			if (usedNodeRefs.has(nodeRef)) {
				return false;
			}

			usedNodeRefs.add(nodeRef);

			var changed = nodeRef ? nodeRef.userData.opacity !== recursiveOpacity[index] : false;
			if (changed) {
				changedOpacity.push(recursiveOpacity[index]);
			}

			return changed;
		}, this);

		if (changed.length > 0) {
			changed.forEach(function(nodeRef, idx) {
				nodeRef._vkSetOpacity(changedOpacity[idx], this._jointCollection);
			}, this);

			var eventParameters = {
				changed: changed,
				opacity: isBulkChange ? changedOpacity : changedOpacity[0]
			};

			this.fireOpacityChanged(eventParameters);
		}

		return this;
	};

	/**
	* Gets the tint color of the node in the ABGR format.
	*
	* A helper method to ensure that the returned value is either <code>int</code> or <code>null</code>.
	*
	* @param {any} nodeRef The node reference.
	* @returns {int|null} The color in the ABGR format or <code>null</code> if no tint color is set.
	* @private
	*/
	ViewStateManager.prototype._getTintColorABGR = function(nodeRef) {
		return nodeRef.userData.tintColor !== undefined ? nodeRef.userData.tintColor : null;
	};

	/**
	* Gets the tint color in the CSS color format.
	*
	* A helper method to ensure that the returned value is either {@link sap.ui.core.CSSColor} or <code>null</code>.
	*
	* @param {any} nodeRef The node reference.
	* @returns {sap.ui.core.CSSColor|null} The color in the CSS color format or <code>null</code> if no tint color is set.
	* @private
	*/
	ViewStateManager.prototype._getTintColor = function(nodeRef) {
		return nodeRef.userData.tintColor !== undefined ?
			colorToCSSColor(abgrToColor(nodeRef.userData.tintColor)) : null;
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
		var getTintColorMethodName = inABGRFormat ? "_getTintColorABGR" : "_getTintColor";
		if (Array.isArray(nodeRefs)) {
			return nodeRefs.map(this[ getTintColorMethodName ], this);
		} else {
			return this[ getTintColorMethodName ](nodeRefs); // NB: The nodeRefs argument is a single nodeRef.
		}
	};

	/**
	* Sets the tint color of the nodes.
	* @param {any|any[]}                   nodeRefs          The node reference or the array of node references.
	* @param {sap.ui.vk.CSSColor|int|sap.ui.vk.CSSColor[]|int[]|null} tintColor The new tint color of the nodes.
	*                                                        The value can be defined as a string in the CSS color format or as an integer in the ABGR format or
	*                                                        it could be array of these values. If <code>null</code>
	*                                                        is passed then the tint color is reset and the node's own tint color should be used.
	* @param {boolean}                     [recursive=false] This flag indicates if the change needs to propagate recursively to child nodes.
	* @returns {sap.ui.vk.ViewStateManager} <code>this</code> to allow method chaining.
	* @public
	*/
	ViewStateManager.prototype.setTintColor = function(nodeRefs, tintColor, recursive) {
		if (!Array.isArray(nodeRefs)) {
			nodeRefs = [ nodeRefs ];
		}

		var toABGR = function(color) {
			var result = null;
			switch (typeof color) {
				case "number":
					result = color;
					break;
				case "string":
					if (sap.ui.core.CSSColor.isValid(color)) {
						result = colorToABGR(cssColorToColor(color));
					}
					break;
				default:
					result = undefined; // The color is invalid, reset it to null.
					break;
			}

			return result;
		};

		// check if we got an array as tint color
		var isBulkChange = Array.isArray(tintColor);

		var recursiveColor = [];
		var allNodeRefs = nodeRefs;

		if (recursive) {
			allNodeRefs = [];
			nodeRefs.forEach(function(nodeRef, idx) {
				var collected = this._collectNodesRecursively(nodeRef);
				allNodeRefs = allNodeRefs.concat(collected);

				var length = recursiveColor.length;
				recursiveColor.length = length + collected.length;
				recursiveColor.fill(isBulkChange ? tintColor[idx] : tintColor, length);
			}, this);
		} else if (!isBulkChange) {
			// not recursive, opacity is a scalar
			recursiveColor.length = allNodeRefs.length;
			recursiveColor.fill(tintColor);
		} else {
			// not recursive, opacity is an array
			recursiveColor = tintColor;
		}

		// filter out unchanged opacity and duplicate nodes
		var changedColor = [];
		var usedNodeRefs = new Set();
		var changed = allNodeRefs.filter(function(nodeRef, index) {
			if (usedNodeRefs.has(nodeRef)) {
				return false;
			}

			usedNodeRefs.add(nodeRef);
			var changed = nodeRef ? nodeRef.userData.tintColor !== toABGR(recursiveColor[index]) : false;
			if (changed) {
				changedColor.push(recursiveColor[index]);
			}

			return changed;
		}, this);

		if (changed.length > 0) {
			var changedABGR = [];
			changed.forEach(function(nodeRef, idx) {
				var color = toABGR(changedColor[idx]);
				nodeRef._vkSetTintColor(color);
				changedABGR.push(color);
			}, this);

			var eventParameters = {
				changed: changed,
				tintColor: isBulkChange ? changedColor : changedColor[0],
				tintColorABGR: isBulkChange ? changedABGR : changedABGR[0]
			};

			this.fireTintColorChanged(eventParameters);
		}

		return this;
	};

	/**
	* Sets the default highlighting color
	* @param {sap.ui.vk.CSSColor|string|int} color           The new highlighting color. The value can be defined as a string
	*                                                        in the CSS color format or as an integer in the ABGR format. If <code>null</code>
	*                                                        is passed then the tint color is reset and the node's own tint color should be used.
	* @returns {sap.ui.vk.ViewStateManager} <code>this</code> to allow method chaining.
	* @public
	*/
	ViewStateManager.prototype.setHighlightColor = function(color) {

		switch (typeof color) {
			case "number":
				this._highlightColorABGR = color;
				break;
			case "string":
				if (sap.ui.core.CSSColor.isValid(color)) {
					this._highlightColorABGR = colorToABGR(cssColorToColor(color));
				}
				break;
			default:
				return this;
		}

		if (this._selectedNodes.size > 0) {
			this._selectedNodes.forEach(function(nodeRef) {
				this._updateHighlightColor(nodeRef, true);
			}, this);
		}

		this.fireHighlightColorChanged({
			highlightColor: colorToCSSColor(abgrToColor(this._highlightColorABGR)),
			highlightColorABGR: this._highlightColorABGR
		});

		return this;
	};


	/**
	* Gets the default highlighting color
	*
	* @param {boolean}         [inABGRFormat=false] This flag indicates to return the highlighting color in the ABGR format,
	*                                               if it equals <code>false</code> then the color is returned in the CSS color format.
	* @returns {sap.ui.core.CSSColor|string|int}
	*                                               A single value or an array of values. Value <code>null</code> means that
	*                                               the node's own tint color should be used.
	* @public
	*/
	ViewStateManager.prototype.getHighlightColor = function(inABGRFormat) {
		return inABGRFormat ? this._highlightColorABGR : colorToCSSColor(abgrToColor(this._highlightColorABGR));
	};

	/**
	 * Gets the decomposed node rest transformation matrix if node is not linked to a joint, otherwise return decomposed joint transformation
	 *
	 * @param {any} nodeRef The node reference
	 * @returns {any} object that contains <code>translation</code>, <code>scale</code> and <code>quaternion</code> components.
	 * @private
	 */
	ViewStateManager.prototype.getRestTransformationUsingJoint = function(nodeRef) {
		var joint = this._getJointByChildNode(nodeRef);
		if (joint && joint.translation && joint.scale && joint.quaternion) {
			return joint;
		} else {
			return this.getRestTransformation(nodeRef);
		}
	};

	/**
	 * Gets the decomposed node local transformation matrix relative to node rest position
	 *
	 * @param {any|any[]} nodeRefs The node reference or array of nodes.
	 * @returns {any|any[]} object that contains <code>translation</code>, <code>scale</code> and <code>quaternion</code> components.
	 * @private
	 */
	ViewStateManager.prototype.getRelativeTransformation = function(nodeRefs) {
		var forReversedPlaybacks = false;
		var currentView = this.getCurrentView();
		if (currentView) {
			var playback = currentView.getPlayback(0);
			if (playback && playback.getReversed()) {
				forReversedPlaybacks = true;
			}
		}

		var getData = function(node){
			var restPosition = this.getRestTransformation(node, forReversedPlaybacks);

			var rTranslation = [ node.position.x - restPosition.translation[0],
								node.position.y - restPosition.translation[1],
								node.position.z - restPosition.translation[2] ];

			var startQ = new THREE.Quaternion(restPosition.quaternion[0], restPosition.quaternion[1], restPosition.quaternion[2], restPosition.quaternion[3]);
			var startRMatrix = new THREE.Matrix4().makeRotationFromQuaternion(startQ);
			var invStartRMatrix = new THREE.Matrix4().getInverse(startRMatrix);
			var aMatrix = new THREE.Matrix4();
			var rMatrix = new THREE.Matrix4();
			aMatrix.makeRotationFromQuaternion(node.quaternion);
			rMatrix.multiplyMatrices(aMatrix, invStartRMatrix);
			var offsetQ = new THREE.Quaternion().setFromRotationMatrix(rMatrix);
			var rQuaternion = offsetQ.toArray();

			var rScale = [ node.scale.x / restPosition.scale[0],
							node.scale.y / restPosition.scale[1],
							node.scale.z / restPosition.scale[2] ];

			return { translation: rTranslation, quaternion: rQuaternion, scale: rScale };
		}.bind(this);

		if (!Array.isArray(nodeRefs)) {
			return getData(nodeRefs);
		}

		var result = [];
		nodeRefs.forEach(function(node) {
			result.push(getData(node));
		});

		return result;
	};

	/**
	 * Gets the decomposed node transformation matrix under world coordinates.
	 *
	 * @param {any|any[]} nodeRef The node reference or array of nodes.
	 * @returns {any|any[]} object that contains <code>translation</code>, <code>scale</code> and <code>quaternion</code> components.
	 * @private
	 */
	ViewStateManager.prototype.getTransformationWorld = function(nodeRef) {
		var getData = function(node) {

			var position = new THREE.Vector3();
			var scale = new THREE.Vector3();
			var quaternion = new THREE.Quaternion();
			node.updateMatrixWorld();
			node.matrixWorld.decompose(position, quaternion, scale);
			return {
				translation: position.toArray(),
				quaternion: quaternion.toArray(),
				scale: scale.toArray()
			};
		};

		if (!Array.isArray(nodeRef)) {
			return getData(nodeRef);
		}

		var result = [];
		nodeRef.forEach(function(node) {
			result.push(getData(node));
		});

		return result;
	};

	/**
	 * Gets the decomposed node local transformation matrix.
	 *
	 * @param {any|any[]} nodeRef The node reference or array of nodes.
	 * @returns {any|any[]} object that contains <code>translation</code>, <code>scale</code> and <code>quaternion</code> components.
	 * @private
	 */
	ViewStateManager.prototype.getTransformation = function(nodeRef) {
		var getData = function(node) {


			return {
				translation: this.getTranslation(node),
				quaternion: this.getRotation(node, RotationType.Quaternion),
				scale: this.getScale(node)
			};
		}.bind(this);

		if (!Array.isArray(nodeRef)) {
			return getData(nodeRef);
		}

		var result = [];
		nodeRef.forEach(function(node) {
			result.push(getData(node));
		});

		return result;
	};

	/**
	 * Gets the node transformation translation component.
	 *
	 * @param {any|any[]} nodeRef The node reference or array of nodes.
	 * @returns {float[]|Array<Array<float>>} A translation component of node's transformation matrix or array of components.
	 * @private
	 */
	ViewStateManager.prototype.getTranslation = function(nodeRef) {
		var getComponent = function(node) {
			// return !node.userData.position ? node.position.toArray() : node.userData.position.toArray();
			return node.position.toArray();
		};

		if (!Array.isArray(nodeRef)) {
			return getComponent(nodeRef);
		}

		var result = [];
		nodeRef.forEach(function(node) {
			result.push(getComponent(node));
		});

		return result;
	};

	/**
	 * Gets the node transformation scale component.
	 *
	 * @param {any|any[]} nodeRef The node reference or array of nodes.
	 * @returns {float[]|Array<Array<float>>} A scale component of node's transformation matrix or array of components.
	 * @private
	 */
	ViewStateManager.prototype.getScale = function(nodeRef) {
		var getComponent = function(node) {
			// return !node.userData.scale ? node.scale.toArray() : node.userData.scale.toArray();
			return node.scale.toArray();
		};

		if (!Array.isArray(nodeRef)) {
			return getComponent(nodeRef);
		}

		var result = [];
		nodeRef.forEach(function(node) {
			result.push(getComponent(node));
		});

		return result;
	};


	ViewStateManager.prototype._convertQuaternionToAngleAxis = function(quaternion) {
		if (quaternion.w > 1) {
			quaternion.normalize();
		}

		if (quaternion.w > 0.9999 && quaternion.x < 0.0001 && quaternion.y < 0.0001 && quaternion.z < 0.0001) {
			quaternion.w = 1;
			quaternion.x = 0;
			quaternion.y = 0;
			quaternion.z = 0;
		}

		var angle = 2 * Math.acos(quaternion.w);
		var x;
		var y;
		var z;
		var s = Math.sqrt(1 - quaternion.w * quaternion.w); // assuming quaternion normalised then w is less than 1, so term always positive.
		if (s < 0.0001) { // test to avoid divide by zero, s is always positive due to sqrt
			// if s close to zero then direction of axis not important
			x = 1;
			y = 0;
			z = 0;
		} else {
			x = quaternion.x / s; // normalise axis
			y = quaternion.y / s;
			z = quaternion.z / s;
		}

		return [ x, y, z, angle ];
	};

	/**
	 * Gets the node transformation rotation component.
	 *
	 * @param {any|any[]} nodeRef The node reference or array of nodes.
	 * @param {sap.ui.vk.RotationType} rotationType Rotation representation type.
	 * @returns {float[]|Array<Array<float>>} A rotation component of node's transformation matrix or array of components in specified format.
	 * @private
	 */
	ViewStateManager.prototype.getRotation = function(nodeRef, rotationType) {
		var getComponent = function(node) {
			// var quaternion = !node.userData.quaternion ? node.quaternion : node.userData.quaternion;
			var quaternion = node.quaternion;
			var result;
			switch (rotationType) {
				case RotationType.AngleAxis:
					result = this._convertQuaternionToAngleAxis(quaternion);
					break;
				case RotationType.Euler:
					var euler = new THREE.Euler();
					euler.setFromQuaternion(quaternion);

					result = euler.toArray();
					break;
				default:
					result = quaternion.toArray();
			}
			return result;
		};

		if (!Array.isArray(nodeRef)) {
			return getComponent(nodeRef);
		}

		var result = [];
		nodeRef.forEach(function(node) {
			result.push(getComponent(node));
		});

		return result;

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
		var isBulkChange = Array.isArray(nodeRefs);

		if (!Array.isArray(nodeRefs)) {
			nodeRefs = [ nodeRefs ];
		}

		var eventParameters = {
			changed: [],
			transformation: []
		};

		var getTransformParametersForEvent = function(node) {
			return {
				position: node.position.toArray(),
				quaternion: node.quaternion.toArray(),
				scale: node.scale.toArray()
			};
		};

		if (!transformations) {

			nodeRefs.forEach(function(nodeRef) {
				if (nodeRef.userData.position && nodeRef.userData.quaternion && nodeRef.userData.scale) {
					nodeRef.position = nodeRef.userData.position;
					nodeRef.quaternion = nodeRef.userData.quaternion;
					nodeRef.scale = nodeRef.userData.scale;
					nodeRef.updateMatrix();

					delete nodeRef.userData.position;
					delete nodeRef.userData.quaternion;
					delete nodeRef.userData.scale;
				}

				this._customPositionedNodes.delete(nodeRef);

				eventParameters.changed.push(nodeRef);
				eventParameters.transformation.push(getTransformParametersForEvent(nodeRef));
			}, this);

		} else {

			if (!Array.isArray(transformations)) {
				transformations = [ transformations ];
			}

			nodeRefs.forEach(function(nodeRef, idx) {
				var userData = nodeRef.userData;

				if (!userData) {
					return;
				}

				if (!userData.position)  {
					userData.position = nodeRef.position.clone();
				}

				if (!userData.quaternion) {
					userData.quaternion = nodeRef.quaternion.clone();
				}

				if (!userData.scale) {
					userData.scale = nodeRef.scale.clone();
				}

				var transformation = transformations[idx];

				if (transformation.transform) {
					var newMatrix = arrayToMatrixThree(transformation.transform);
					newMatrix.decompose(nodeRef.position, nodeRef.quaternion, nodeRef.scale);
				} else {
					nodeRef.position.fromArray(transformation.translation);

					nodeRef.scale.fromArray(transformation.scale);

					if (transformation.quaternion) {
						nodeRef.quaternion.fromArray(transformation.quaternion);
					} else if (transformation.angleAxis) {
						var axis = new THREE.Vector3(transformation.angleAxis[0], transformation.angleAxis[1], transformation.angleAxis[2]);
						nodeRef.quaternion.setFromAxisAngle(axis, transformation.angleAxis[3]);
					} else if (transformation.euler) {
						var euler = new THREE.Euler();
						euler.fromArray(transformation.euler[0], transformation.euler[1], transformation.euler[2], transformation.euler[3]);
						nodeRef.quaternion.setFromEuler(euler);
					}
				}

				nodeRef.updateMatrix();
				this._customPositionedNodes.add(nodeRef);

				eventParameters.changed.push(nodeRef);
				eventParameters.transformation.push(getTransformParametersForEvent(nodeRef));
			}, this);
		}

		if (!isBulkChange) {
			eventParameters.changed = eventParameters.changed[0];
			eventParameters.transformation = eventParameters.transformation[0];
		}

		this.fireTransformationChanged(eventParameters);

		return this;
	};

	ViewStateManager.prototype.getJoints = function() {
		return this._jointCollection;
	};

	ViewStateManager.prototype.setJoints = function(joints, sequence) {
		this._jointCollection = [];
		this._sequenceAssociatedWithJoints = null;

		if (!joints) {
			return this;
		}

		var jointSet = new Set();
		var jointMap = new Map();
		joints.forEach(function(joint) {
			if (!joint.node || !joint.parent) {
				return;
			}
			jointSet.add(joint.node);
			jointMap.set(joint.node, joint);
		});

		while (jointSet.size > 0) {
			var node = jointSet.values().next().value;
			jointSet.delete(node);
			var joint = jointMap.get(node);
			var jointSequence = [ joint ];

			var intermediateNodes = [];
			var ancestor = joint.parent;
			while (ancestor) {
				joint = jointMap.get(ancestor);
				if (joint !== undefined) {
					if (jointSet.delete(ancestor)) {
						jointSequence.push(joint);
					}

					if (intermediateNodes.length > 0) {
						joint.nodesToUpdate = joint.nodesToUpdate || [];
						while (intermediateNodes.length > 0) {
							var imNode = intermediateNodes.pop();
							if (joint.nodesToUpdate.indexOf(imNode) >= 0) {
								break;
							}
							joint.nodesToUpdate.push(imNode); // add intermediate node
						}
					}

					intermediateNodes.length = 0;
					ancestor = joint.parent;
				} else {
					intermediateNodes.push(ancestor);
					ancestor = ancestor.parent;
				}
			}

			while (jointSequence.length > 0) {
				this._jointCollection.push(jointSequence.pop());
			}
		}

		if (this._jointCollection && this._jointCollection.length > 0) {
			this._sequenceAssociatedWithJoints = sequence;
			this._jointCollection.forEach(function(joint) {
				if (!joint.node || !joint.parent) {
					return;
				}
				joint.translation = null;
				joint.scale = null;
				joint.quaternion = null;
				if (joint.node.userData) {
					joint.node.userData.offsetTranslation = null;
					joint.node.userData.offsetQuaternion = null;
					joint.node.userData.offsetScale = null;
					joint.node.userData.originalRotationType = null;
				}
			});

			this._jointCollection.forEach(function(joint) {
				this._updateJointNode(joint, this._sequenceAssociatedWithJoints);
			}.bind(this));
		}

		return this;
	};

	ViewStateManager.prototype._updateJointNode = function(joint, sequence) {
		if (!joint.node || !joint.parent) {
			return;
		}

		if (joint.translation && joint.quaternion && joint.scale) {
			return;
		}

		var jointMap = new Map();
		if (this._jointCollection && this._jointCollection.length > 0) {
			this._jointCollection.forEach(function(joint) {
				if (!joint.node || !joint.parent) {
					return;
				}
				jointMap.set(joint.node, joint);
			});
		}

		var forReversedPlaybacks = false;
		var currentView = this.getCurrentView();
		if (currentView) {
			var playback = currentView.getPlayback(0);
			if (playback && playback.getReversed()) {
				forReversedPlaybacks = true;
			}
		}

		var position, scale, quaternion, nodeMatrix, restTransformation;

		var node = joint.node;
		var worldMatrix = new THREE.Matrix4();
		while (node) {
			restTransformation = this.getRestTransformation(node, forReversedPlaybacks);
			if (!restTransformation) {
				node = node.parent;
				continue;
			}

			position = new THREE.Vector3(restTransformation.translation[0],
												restTransformation.translation[1],
												restTransformation.translation[2]);
			scale = new THREE.Vector3(restTransformation.scale[0],
											restTransformation.scale[1],
											restTransformation.scale[2]);
			quaternion = new THREE.Quaternion(restTransformation.quaternion[0],
													restTransformation.quaternion[1],
													restTransformation.quaternion[2],
													restTransformation.quaternion[3]);
			if (sequence) {
				var offsetTrans = this._getEndPropertyInPreviousSequence(node, AnimationTrackType.Translate, sequence);
				if (offsetTrans) {
					position.x += offsetTrans[0];
					position.y += offsetTrans[1];
					position.z += offsetTrans[2];
				}

				var offsetScale = this._getEndPropertyInPreviousSequence(node, AnimationTrackType.Scale, sequence);
				if (offsetScale) {
					scale.x *= offsetScale[0];
					scale.y *= offsetScale[1];
					scale.z *= offsetScale[2];
				}

				var offsetRotate = this._getEndPropertyInPreviousSequence(node, AnimationTrackType.Rotate, sequence);
				if (offsetRotate) {
					var offsetQ = new THREE.Quaternion(offsetRotate[0], offsetRotate[1], offsetRotate[2], offsetRotate[3]);
					quaternion = offsetQ.multiply(quaternion);
				}
			}
			nodeMatrix = new THREE.Matrix4().compose(position, quaternion, scale);
			worldMatrix.premultiply(nodeMatrix);
			node = node.parent;
		}

		var parent = joint.parent;
		var jParentWorldMatrix = new THREE.Matrix4();

		while (parent) {
			var parentJoint = jointMap.get(parent);
			if (parentJoint) {
				if (!parentJoint.translation) {
					this._updateJointNode(parentJoint);
				}

				position = new THREE.Vector3(parentJoint.translation[0],
											parentJoint.translation[1],
											parentJoint.translation[2]);
				scale = new THREE.Vector3(parentJoint.scale[0],
											parentJoint.scale[1],
											parentJoint.scale[2]);
				quaternion = new THREE.Quaternion(parentJoint.quaternion[0],
											parentJoint.quaternion[1],
											parentJoint.quaternion[2],
											parentJoint.quaternion[3]);
				parent = parentJoint.parent;
			} else {
				restTransformation = this.getRestTransformation(parent, forReversedPlaybacks);
				if (!restTransformation) {
					parent = parent.parent;
					continue;
				}

				position = new THREE.Vector3(restTransformation.translation[0],
												restTransformation.translation[1],
												restTransformation.translation[2]);
				scale = new THREE.Vector3(restTransformation.scale[0],
												restTransformation.scale[1],
												restTransformation.scale[2]);
				quaternion = new THREE.Quaternion(restTransformation.quaternion[0],
												restTransformation.quaternion[1],
												restTransformation.quaternion[2],
												restTransformation.quaternion[3]);
				parent = parent.parent;
			}

			nodeMatrix = new THREE.Matrix4().compose(position, quaternion, scale);
			jParentWorldMatrix.premultiply(nodeMatrix);
		}

		var jointMatrix = jParentWorldMatrix.getInverse(jParentWorldMatrix).multiply(worldMatrix);
		jointMatrix.decompose(position, quaternion, scale);

		joint.translation = position.toArray();
		joint.quaternion = quaternion.toArray();
		joint.scale = scale.toArray();
	};

	/////////////////////////////////////////////////////////////////////////////////////////////////////////
	//
	// Moved from Viewport class: view activation - related
	//
	/////////////////////////////////////////////////////////////////////////////////////////////////////////
	ViewStateManager.prototype._updateMaterialInNode = function(nodeInfo) {

		var node = nodeInfo.target;

		for (var i = 0, l = node.children.length; i < l; i++) {
			var child = node.children[ i ];
			if (child.userData.animatedColor) {
				child._vkUpdateMaterialColor();
			}
		}

		var materialId = nodeInfo.materialId;
		if (node.userData.materialId !== materialId) {
			node.userData.materialId = materialId;
			this._scene._setNodeMaterial(node, materialId);
		}
	};

	function arrayToMatrixThree(array) {
		return new THREE.Matrix4().set(array[0], array[1], array[2], array[3], array[4], array[5], array[6], array[7], array[8], array[9], array[10], array[11], 0, 0, 0, 1);
	}

	ViewStateManager.prototype._resetNodesStatusByCurrenView = function(view, setVisibility, animationNodeTransition) {

		var nodeHierarchy = this.getNodeHierarchy();
		if (nodeHierarchy) {

			var playbacks;
			if (view) {
				playbacks = view.getPlaybacks();
			}

			var nodeInfo = view.getNodeInfos();

			if (nodeInfo) {  // for totaraLoader
				this._nodesTransitionHelper.clear();
				var transforms = {
					nodeRefs: [],
					positions: []
				};
				var newPosition = new THREE.Vector3();
				var newRotation = new THREE.Quaternion();
				var newScale = new THREE.Vector3();

				nodeInfo.forEach(function(node) {
					if (node.target === null) {
						return;
					}

					function equalMatrices(matrix1, matrix2, error){
						for (var ei = 0; ei < matrix1.elements.length; ei++){
							if (Math.abs(matrix1.elements[ei] - matrix2.elements[ei]) > error){
								return false;
							}
						}
						return true;
					}

					if (node.transform) {
						var newMatrix = arrayToMatrixThree(node.transform);
						if (!equalMatrices(newMatrix, node.target.matrix, 1e-6)){
							// Transition node to its view position as it differs from original node position
							if ((!playbacks || !playbacks.length) && animationNodeTransition) {
								// If view does not have animations then we will perform an interpolation animation for node transform
								var nodeProxy = nodeHierarchy.createNodeProxy(node.target);
								this._nodesTransitionHelper.setNodeForDisplay(nodeProxy, newMatrix);
							} else {

								newMatrix.decompose(newPosition, newRotation, newScale);
								transforms.nodeRefs.push(node.target);
								transforms.positions.push({
									translation: newPosition.toArray(),
									quaternion: newRotation.toArray(),
									scale: newScale.toArray()
								});
							}
						}
					} else if (node[AnimationTrackType.Scale] && node[AnimationTrackType.Rotate] && node[AnimationTrackType.Translate]) {
						transforms.nodeRefs.push(node.target);
						transforms.positions.push({
							translation: node[AnimationTrackType.Translate].slice(),
							quaternion: node[AnimationTrackType.Rotate].slice(),
							scale: node[AnimationTrackType.Scale].slice()
						});
					}
				}.bind(this));

				if (view.userData && view.userData.nodeStartDataByAnimation) {
					view.userData.nodeStartDataByAnimation.forEach(function(data, nodeRef) {
						if (data[AnimationTrackType.Translate] && data[AnimationTrackType.Rotate] && data[AnimationTrackType.Scale]) {
							transforms.nodeRefs.push(nodeRef);
							transforms.positions.push({
								translation: data[AnimationTrackType.Translate].slice(),
								quaternion: data[AnimationTrackType.Rotate].slice(),
								scale: data[AnimationTrackType.Scale].slice()
							});
						}
					}, this);
				}

				if (transforms.nodeRefs.length) {
					this.setTransformation(transforms.nodeRefs, transforms.positions);
				}

				if (setVisibility) {
					// Apply nodes visibility for the current view
					var nodeVisible = [];
					var nodeInvisible = [];
					nodeInfo.forEach(function(info) {
						(info.visible ? nodeVisible : nodeInvisible).push(info.target);
					});

					// Hide all root nodes. The roots that have visible nodes will be made visible when these nodes visibility changes.
					this.setVisibilityState(nodeHierarchy.getChildren()[0].children, false, true);
					this.setVisibilityState(nodeVisible, true, false);
					this.setVisibilityState(nodeInvisible, false, false);

					this._startViewChangeNodeTransition();

					// TODO

				}
			}
		}
	};

	ViewStateManager.prototype._startViewChangeNodeTransition = function() {

		this._nodesTransitionHelper.startDisplay(500);

		var displaying = true;

		this._nodesTransitionHelper.attachEventOnce("displayed", function() {
			displaying = false;
		});

		var display = function() {
			if (displaying) {
				this._nodesTransitionHelper.displayNodesMoving();
				window.requestAnimationFrame(display);
			}
		}.bind(this);

		window.requestAnimationFrame(display);
	};

	ViewStateManager.prototype._resetNodesMaterialAndOpacityByCurrenView = function(view) {

		if (!view) {
			return;
		}

		var nodeInfo = view.getNodeInfos();

		if (nodeInfo) {  // for totaraLoader
			nodeInfo.forEach(function(node) {
				if (!node.target) {
					return;
				}

				this._updateMaterialInNode(node);
			}.bind(this));

			nodeInfo.forEach(function(node) {
				if (!node.target || !node.target.userData) {
					return;
				}

				node.target.userData.opacity = node.opacity;
			});

			var nativeScene = this._scene.getSceneRef();
			nativeScene._vkSetOpacity(undefined, this._jointCollection);
		}

		this._selectedNodes.forEach(function(nodeRef) {
			this._updateHighlightColor(nodeRef);
		}.bind(this));
	};

	ViewStateManager.prototype._onViewActivated = function(channel, eventId, event) {
		var viewManager = this.getViewManager();
		if (!viewManager || event.source.getId() !== viewManager) {
			return;
		}
		this.activateView(event.view, false, event.playViewGroup, event.notAnimateCameraChange);
	};

	/**
	 * Activate specified view
	 *
	 * @param {sap.ui.vk.View} view view object definition
	 * @param {boolean} ignoreAnimationPosition when set to true, initial animation state is not applied to the view
	 * @param {boolean} playViewGroup true if view activation is part of playing view group
	 * @param {boolean} notAnimateCameraChange do not animate the change of camera
	 * @returns {sap.ui.vk.ViewStateManager} return this
	 * @private
	 */
	ViewStateManager.prototype.activateView = function(view, ignoreAnimationPosition, playViewGroup, notAnimateCameraChange) {

		this.fireViewStateApplying({
			view: view
		});

		// remove joints
		this.setJoints(undefined);

		this._customPositionedNodes.clear();

		this._resetNodesMaterialAndOpacityByCurrenView(view);
		this._resetTransitionHighlight(view);
		this._resetNodesStatusByCurrenView(view, true, true);
		this._highlightPlayer.reset(view, this._scene);

		this.fireViewStateApplied({
			view: view,
			ignoreAnimationPosition: ignoreAnimationPosition,
			notAnimateCameraChange: notAnimateCameraChange,
			playViewGroup: playViewGroup
		});

		vkCore.getEventBus().publish("sap.ui.vk", "viewStateApplied", {
			source: this,
			view: view,
			ignoreAnimationPosition: ignoreAnimationPosition,
			notAnimateCameraChange: notAnimateCameraChange,
			playViewGroup: playViewGroup
		});

		return this;
	};

	/**
	 * Set highlight display state.
	 *
	 * @function
	 * @name sap.ui.vk.ViewStateManagerBase#setHighlightDisplayState
	 * @param {sap.ui.vk.HighlightDisplayState} state for playing highlight - playing, pausing, and stopped
	 * @returns {sap.ui.vk.ViewStateManagerBase} <code>this</code> to allow method chaining.
	 * @public
	 */
	ViewStateManager.prototype.setHighlightDisplayState = function(state) {

		if (state === HighlightDisplayState.playing) {
			this._highlightPlayer.start((new Date()).getTime());
		} else if (state === HighlightDisplayState.stopped) {
			this._highlightPlayer.stop();
		} else if (state === HighlightDisplayState.pausing) {
			this._highlightPlayer.pause((new Date()).getTime());
		}

		this.fireHighlightColorChanged({
			highlightColor: colorToCSSColor(abgrToColor(this._highlightColorABGR)),
			highlightColorABGR: this._highlightColorABGR
		});
		return this;
	};

	ViewStateManager.prototype._startHighlight = function() {

		this._highlightPlayer.start((new Date()).getTime());
		return this;
	};

	ViewStateManager.prototype._playHighlight = function() {

		return this._highlightPlayer.play((new Date()).getTime());
	};

	ViewStateManager.prototype._resetTransitionHighlight = function(view) {
		this._transitionHighlightPlayer.reset();
		this._transitionHighlightPlayer.fadeInNodes = [];
		this._transitionHighlightPlayer.fadeOutNodes = [];
		this._transitionHighlightPlayer.setViewStateManager(this);

		var nodeInfos = view.getNodeInfos();
		if (!nodeInfos) {
			return;
		}

		var getAllMeshNodes = function(nodes, meshNodes, nodesToExclude) {
			if (!nodes || !nodes.length) {
				return;
			}
			for (var i = 0;  i < nodes.length; i++) {
				var node = nodes[i];
				if (node.type === "Mesh" && (!nodesToExclude || (nodesToExclude && !nodesToExclude.includes(node)))) {
					meshNodes.push(node);
				}
				getAllMeshNodes(node.children, meshNodes, nodesToExclude);
			}
		};

		var fadeOutNodes = [];
		var fadeInNodes = [];

		var that = this;
		nodeInfos.forEach(function(info) {
			var node = info.target;

			var visible = node.layers.test(that._layers);

			if (visible && !info.visible) {
				fadeOutNodes.push(node);
			}

			if (!visible && info.visible) {
				fadeInNodes.push(node);
			}
		});

		getAllMeshNodes(fadeInNodes, this._transitionHighlightPlayer.fadeInNodes);
		getAllMeshNodes(fadeOutNodes, this._transitionHighlightPlayer.fadeOutNodes, this._transitionHighlightPlayer.fadeInNodes);
	};

	ViewStateManager.prototype._startTransitionHighlight = function(timeInterval) {
		var fadeInNodes = this._transitionHighlightPlayer.fadeInNodes;
		var fadeOutNodes = this._transitionHighlightPlayer.fadeOutNodes;

		if (fadeInNodes && fadeInNodes.length) {
			var fadeInHighlight = new Highlight("FadeIn", { duration: timeInterval / 500.0,
															opacities: [ 0.0, 1.0 ],
															cycles: 1 });
			this._transitionHighlightPlayer.addHighlights(fadeInHighlight, fadeInNodes);
		}

		if (fadeOutNodes && fadeOutNodes.length) {
			var fadeOutHighlight = new Highlight("FadeOut", { duration: timeInterval / 500.0,
															opacities: [ 1.0, 0.0 ],
															cycles: 1,
															fadeOut: true });
			this._transitionHighlightPlayer.addHighlights(fadeOutHighlight, fadeOutNodes);
		}

		if ((fadeInNodes && fadeInNodes.length) || (fadeOutNodes && fadeOutNodes.length)) {
			this._transitionHighlightPlayer.start((new Date()).getTime());
			this._transitionHighlightPlayer.play((new Date()).getTime());
			return timeInterval;
		} else {
			return 0;
		}

		return 0;
	};

	ViewStateManager.prototype._playTransitionHighlight = function() {

		return this._transitionHighlightPlayer.play((new Date()).getTime());
	};


	/**
	 * Copy node's current transformation into its rest transformation stored in active view.
	 *
	 * @function
	 * @name sap.ui.vk.three.ViewStateManager#updateRestTransformation
	 * @param {any} nodeRef The node reference.
	 * @returns {sap.ui.vk.three.ViewStateManager} <code>this</code> to allow method chaining.
	 * @public
	 */
	ViewStateManager.prototype.updateRestTransformation = function(nodeRef) {
		var currentView = this.getCurrentView();
		if (!currentView) {
			return this;
		}

		var nodeInfo = currentView.getNodeInfos();

		if (nodeInfo) {

			nodeInfo.forEach(function(node) {

				if (node.target !== nodeRef) {
					return;
				}

				nodeRef.updateMatrix();

				var te = nodeRef.matrix.elements;
				var transform = [ te[0], te[4], te[8], te[12], te[1], te[5], te[9], te[13], te[2], te[6], te[10], te[14] ];
				node.transform = transform;
			});
		}

		if (this._jointCollection && this._jointCollection.length > 0) {
			this._jointCollection.forEach(function(joint) {
				if (!joint.node || !joint.parent) {
					return;
				}

				if (joint.parent === nodeRef || joint.node === nodeRef) {
					joint.translation = null;
					joint.scale = null;
					joint.quaternion = null;

					if (joint.node.userData) {
						joint.node.userData.offsetTranslation = null;
						joint.node.userData.offsetQuaternion = null;
						joint.node.userData.offsetScale = null;
						joint.node.userData.originalRotationType = null;
					}
				}
			});

			this._jointCollection.forEach(function(joint) {
				if (!joint.node || !joint.parent) {
					return;
				}
				if (joint.parent === nodeRef) {
					this._updateJointNode(joint, this._sequenceAssociatedWithJoints);
					this.restoreRestTransformation(joint.node);
				}
			}.bind(this));

			this._jointCollection.forEach(function(joint) {
				if (!joint.node || !joint.parent) {
					return;
				}
				if (joint.node === nodeRef) {
					this._updateJointNode(joint, this._sequenceAssociatedWithJoints);
					// this.restoreRestTransformation(joint.node);
				}
			}, this);
		}

		return this;
	};

	 /**
	 * Replace node's current transformation with its rest transformation stored in active view..
	 *
	 * @function
	 * @name sap.ui.vk.three.ViewStateManager#restoreRestTransformation
	 * @param {any} nodeRef The node reference.
	 * @returns {sap.ui.vk.three.ViewStateManager} <code>this</code> to allow method chaining.
	 * @public
	 */
	ViewStateManager.prototype.restoreRestTransformation = function(nodeRef) {
		var currentView = this.getCurrentView();
		if (!currentView) {
			return this;
		}

		var nodeInfo = currentView.getNodeInfos();

		if (nodeInfo) {

			nodeInfo.forEach(function(node) {

				if (node.target !== nodeRef) {
					return;
				}

				if (node.transform) {
					var newMatrix = arrayToMatrixThree(node.transform);
					newMatrix.decompose(nodeRef.position, nodeRef.quaternion, nodeRef.scale);
				} else if (node[AnimationTrackType.Scale] && node[AnimationTrackType.Rotate] && node[AnimationTrackType.Translate]) {
					nodeRef.position.set(node[AnimationTrackType.Translate][0],
											node[AnimationTrackType.Translate][1],
											node[AnimationTrackType.Translate][2]);

					nodeRef.quaternion.set(node[AnimationTrackType.Rotate][0],
											node[AnimationTrackType.Rotate][1],
											node[AnimationTrackType.Rotate][2],
											node[AnimationTrackType.Rotate][3]);

					nodeRef.scale.set(node[AnimationTrackType.Scale][0],
										node[AnimationTrackType.Scale][1],
										node[AnimationTrackType.Scale][2]);
				}

				nodeRef.updateMatrix();
			});
		}

		var eventParameters = {
			changed: [ nodeRef ],
			transformation: [ { position: nodeRef.position.toArray(),
								quaternion: nodeRef.quaternion.toArray(),
								scale: nodeRef.scale.toArray()
								} ]
		};

		this.fireTransformationChanged(eventParameters);
		return this;
	};


	 /**
	 * Set node's rest transformation stored in active view.
	 *
	 * @function
	 * @name sap.ui.vk.three.ViewStateManager#setRestTransformation
	 * @param {any} nodeRef The node reference.
	 * @param {float[]} translation vector for position, array of size 3, if null current rest translation is used
	 * @param {float[]} quaternion quaternion for rotation, array of size 4, if null current rest quaternion is used
	 * @param {float[]} scale vector for scaling, array of size 3, if null current rest scale is used
	 * @returns {sap.ui.vk.three.ViewStateManager} <code>this</code> to allow method chaining.
	 * @private
	 */
	ViewStateManager.prototype.setRestTransformation = function(nodeRef, translation, quaternion, scale) {
		var currentView = this.getCurrentView();
		if (!currentView) {
			return this;
		}

		var nodeInfo = currentView.getNodeInfos();

		if (nodeInfo) {

			nodeInfo.forEach(function(node) {

				if (node.target !== nodeRef) {
					return;
				}

				if (!translation || !quaternion || !scale) {
					if (node.transform) {
						var po = new THREE.Vector3();
						var ro = new THREE.Quaternion();
						var sc = new THREE.Vector3();
						var mat = arrayToMatrixThree(node.transform);
						mat.decompose(po, ro, sc);
						if (!translation) {
							translation = [ po.x, po.y, po.z ];
						}

						if (!scale) {
							scale = [ sc.x, sc.y, sc.z ];
						}

						if (!quaternion) {
							quaternion = [ ro.x, ro.y, ro.z, ro.w ];
						}
					} else if (node[AnimationTrackType.Scale] && node[AnimationTrackType.Rotate] && node[AnimationTrackType.Translate]) {
						if (!translation) {
							translation = node[AnimationTrackType.Translate].slice();
						}

						if (!scale) {
							scale = node[AnimationTrackType.Scale].slice();
						}

						if (!quaternion) {
							quaternion = node[AnimationTrackType.Rotate].slice();
						}
					}
				}

				var positionThree = new THREE.Vector3(translation[0], translation[1], translation[2]);
				var quaternionThree = new THREE.Quaternion(quaternion[0], quaternion[1], quaternion[2], quaternion[3]);
				var scaleThree = new THREE.Vector3(scale[0], scale[1], scale[2]);

				var newMatrix = new THREE.Matrix4();
				newMatrix.compose(positionThree, quaternionThree, scaleThree);

				var te = newMatrix.elements;
				node.transform = [ te[0], te[4], te[8], te[12], te[1], te[5], te[9], te[13], te[2], te[6], te[10], te[14] ];
			});
		}

		if (this._jointCollection && this._jointCollection.length > 0) {
			this._jointCollection.forEach(function(joint) {
				if (!joint.node || !joint.parent) {
					return;
				}

				if (joint.parent === nodeRef || joint.node === nodeRef) {
					joint.translation = null;
					joint.scale = null;
					joint.quaternion = null;

					if (joint.node.userData) {
						joint.node.userData.offsetTranslation = null;
						joint.node.userData.offsetQuaternion = null;
						joint.node.userData.offsetScale = null;
						joint.node.userData.originalRotationType = null;
					}
				}
			});

			this._jointCollection.forEach(function(joint) {
				if (!joint.node || !joint.parent) {
					return;
				}
				if (joint.parent === nodeRef) {
					this._updateJointNode(joint, this._sequenceAssociatedWithJoints);
					this.restoreRestTransformation(joint.node);
				}
			}, this);

			this._jointCollection.forEach(function(joint) {
				if (!joint.node || !joint.parent) {
					return;
				}
				if (joint.node === nodeRef) {
					this._updateJointNode(joint, this._sequenceAssociatedWithJoints);
					// this.restoreRestTransformation(joint.node);
				}
			}, this);
		}

		return this;
	};

	/**
	 * Get node's opacity stored in active view.
	 *
	 * @function
	 * @name sap.ui.vk.three.ViewStateManager#getRestOpacity
	 * @param {any} nodeRef The node reference.
	 * @returns {float} node opacity
	 * @private
	 */
	ViewStateManager.prototype.getRestOpacity = function(nodeRef) {
		var nodeInfo;
		var currentView = this.getCurrentView();
		if (currentView) {
			nodeInfo = currentView.getNodeInfos();
		}

		var result = 1;

		if (nodeInfo && nodeInfo.length) {

			for (var i = 0; i < nodeInfo.length; i++) {
				var node = nodeInfo[i];
				if (node.target !== nodeRef) {
					continue;
				}

				if (node.opacity !== undefined && node.opacity !== null) {
					result = node.opacity;
				}
				break;
			}
		}
		return result;
	};

	/**
	 * Set node's opacity stored in active view.
	 *
	 * @function
	 * @name sap.ui.vk.three.ViewStateManager#setRestOpacity
	 * @param {any} nodeRef The node reference.
	 * @param {float} opacity The node opacity
	 * @returns {sap.ui.vk.three.ViewStateManager} <code>this</code> to allow method chaining.
	 * @private
	 */
	ViewStateManager.prototype.setRestOpacity = function(nodeRef, opacity) {
		var nodeInfo;
		var currentView = this.getCurrentView();
		if (currentView) {
			nodeInfo = currentView.getNodeInfos();
		}

		if (nodeInfo) {

			nodeInfo.forEach(function(node) {

				if (node.target !== nodeRef) {
					return;
				}
				node.opacity = opacity;
			});
		}
		return this;
	};

	/**
	 * Replace node's current opacity with its rest opacity stored in active view..
	 *
	 * @function
	 * @name sap.ui.vk.three.ViewStateManager#restoreRestOpacity
	 * @param {any} nodeRef The node reference.
	 * @returns {sap.ui.vk.three.ViewStateManager} <code>this</code> to allow method chaining.
	 * @private
	 */
	ViewStateManager.prototype.restoreRestOpacity = function(nodeRef) {
		var nodeInfo;
		var currentView = this.getCurrentView();
		if (currentView) {
			nodeInfo = currentView.getNodeInfos();
		}

		if (nodeInfo) {

			nodeInfo.forEach(function(node) {

				if (node.target !== nodeRef) {
					return;
				}

				var opacity = 1;
				if (node.opacity !== undefined) {
					opacity = node.opacity;
				}
				this.setOpacity(nodeRef, opacity);

			}.bind(this));
		}

		return this;
	};

	/**
	 * Copy node's current opacity into its rest opacity stored in active view.
	 *
	 * @function
	 * @name sap.ui.vk.three.ViewStateManager#updateRestOpacity
	 * @param {any} nodeRef The node reference.
	 * @returns {sap.ui.vk.three.ViewStateManager} <code>this</code> to allow method chaining.
	 * @private
	 */
	ViewStateManager.prototype.updateRestOpacity = function(nodeRef) {
		var nodeInfo;
		var currentView = this.getCurrentView();
		if (currentView) {
			nodeInfo = currentView.getNodeInfos();
		}

		if (nodeInfo) {

			nodeInfo.forEach(function(node) {

				if (node.target !== nodeRef) {
					return;
				}
				if (nodeRef.userData && nodeRef.userData.opacity !== undefined && nodeRef.userData.opacity !== null) {
					node.opacity = nodeRef.userData.opacity;
				} else {
					delete node.opacity;
				}
			});
		}

		return this;
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
		var nodeInfo;
		var currentView = this.getCurrentView();
		if (currentView) {
			nodeInfo = currentView.getNodeInfos();
		}

		var result;
		if (nodeInfo) {
			var wMat = new THREE.Matrix4();
			while (nodeRef) {
				for (var i = 0; i < nodeInfo.length; i++) {
					var node = nodeInfo[i];

					if (node.target !== nodeRef) {
						continue;
					}

					var newMatrix;
					if (node.transform) {
						newMatrix = arrayToMatrixThree(node.transform);
					} else if (node[AnimationTrackType.Scale] && node[AnimationTrackType.Rotate] && node[AnimationTrackType.Translate]) {
						var position = new THREE.Vector3(node[AnimationTrackType.Translate][0],
															node[AnimationTrackType.Translate][1],
															node[AnimationTrackType.Translate][2]);

						var rotation = new THREE.Quaternion(node[AnimationTrackType.Rotate][0],
															node[AnimationTrackType.Rotate][1],
															node[AnimationTrackType.Rotate][2],
															node[AnimationTrackType.Rotate][3]);

						var scale = new THREE.Vector3(node[AnimationTrackType.Scale][0],
															node[AnimationTrackType.Scale][1],
															node[AnimationTrackType.Scale][2]);

						newMatrix = new THREE.Matrix4().compose(position, rotation, scale);
					}

					if (newMatrix) {
						wMat.premultiply(newMatrix);
					}

					break;
				}
				nodeRef = nodeRef.parent;
			}
			var po = new THREE.Vector3();
			var ro = new THREE.Quaternion();
			var sc = new THREE.Vector3();
			wMat.decompose(po, ro, sc);
			result = {};
			result.translation = po.toArray();
			result.quaternion = ro.toArray();
			result.scale = sc.toArray();
		}

		if (!result) {
			result = this.getTransformationWorld(nodeRef);
		}
		return result;
	};


	 /**
	 * Get node's rest transformation stored in active view.
	 *
	 * @function
	 * @name sap.ui.vk.three.ViewStateManager#getRestTransformation
	 * @param {any} nodeRef The node reference.
	 * @param {boolean} forReversedPlaybacks optional, if true rest position is moved to the beginning of the first playback
	 * @returns {any} object that contains <code>translation</code>, <code>scale</code>, <code>quaternion</code> components.
	 * 				<code>transformRowWise<code> 12-element array representing 4 x 3 transformation matrix stored row-wise if defined in current view
	 * 				<code>transformColumnWise<code> 12-element array representing 4 x 3 transformation matrix stored column-wise if defined in current view
	 *
	 * @private
	 */
	ViewStateManager.prototype.getRestTransformation = function(nodeRef, forReversedPlaybacks) {
		var nodeInfo;
		var currentView = this.getCurrentView();
		if (currentView) {
			nodeInfo = currentView.getNodeInfos();
		}

		var result;
		if (nodeInfo) {

			nodeInfo.forEach(function(node) {

				if (node.target !== nodeRef) {
					return;
				}

				if (node.transform) {
					var transform = node.transform;
					var position = new THREE.Vector3();
					var rotation = new THREE.Quaternion();
					var scale = new THREE.Vector3();
					var newMatrix = arrayToMatrixThree(node.transform);
					newMatrix.decompose(position, rotation, scale);

					if (forReversedPlaybacks) {
						var offsetTrans = this._getEndPropertyInLastSequence(nodeRef, AnimationTrackType.Translate);
						if (offsetTrans) {
							position.x -= offsetTrans[0];
							position.y -= offsetTrans[1];
							position.z -= offsetTrans[2];
						}

						var offsetScale = this._getEndPropertyInLastSequence(nodeRef, AnimationTrackType.Scale);
						if (offsetScale) {
							scale.x /= offsetScale[0];
							scale.y /= offsetScale[1];
							scale.z /= offsetScale[2];
						}

						var offsetRotate = this._getEndPropertyInLastSequence(nodeRef, AnimationTrackType.Rotate);
						if (offsetRotate) {
							var offsetQ = new THREE.Quaternion(offsetRotate[0], offsetRotate[1], offsetRotate[2], offsetRotate[3]);

							rotation = offsetQ.inverse().normalize().multiply(rotation);
						}

						newMatrix.compose(position, rotation, scale);
						var te = newMatrix.elements;
						transform = [ te[0], te[4], te[8], te[12], te[1], te[5], te[9], te[13], te[2], te[6], te[10], te[14] ];
					}

					result = {};
					result.translation = position.toArray();
					result.quaternion = rotation.toArray();
					result.scale = scale.toArray();
					result.transformRowWise = transform;
					result.transformColumnWise = [ transform[ 0 ], transform[ 4 ], transform[ 8 ],
														transform[ 1 ], transform[ 5 ], transform[ 9 ],
														transform[ 2 ], transform[ 6 ], transform[ 10 ],
														transform[ 3 ], transform[ 7 ], transform[ 11 ] ];
				} else if (node[AnimationTrackType.Scale] && node[AnimationTrackType.Rotate] && node[AnimationTrackType.Translate]) {
					result = {};
					result.translation = node[AnimationTrackType.Translate].slice();
					result.quaternion = node[AnimationTrackType.Rotate].slice();
					result.scale = node[AnimationTrackType.Scale].slice();
				}
			}.bind(this));
		}

		if (!result && nodeRef) {
			result = {};
			result.translation = nodeRef.userData.position ? nodeRef.userData.position.toArray() : nodeRef.position.toArray();
			result.quaternion = nodeRef.userData.quaternion ? nodeRef.userData.quaternion.toArray() : nodeRef.quaternion.toArray();
			result.scale = nodeRef.userData.scale ? nodeRef.userData.scale.toArray() : nodeRef.scale.toArray();
			result.matrix = nodeRef.matrix.clone();
		}
		return result;
	};

	ViewStateManager.prototype._addToTransformation = function(position, translation, quaternion, scale, originalRotationType) {

		var result = {};

		var i;
		if (translation) {
			result.translation = [ ];
			for (i = 0; i < 3; i++) {
				result.translation.push(translation[i] + position.translation[i]);
			}
		} else {
			result.translation = position.translation;
		}

		if (scale) {
			result.scale = [ ];
			for (i = 0; i < 3; i++) {
				result.scale.push(scale[i] * position.scale[i]);
			}
		} else {
			result.scale = position.scale;
		}

		if (quaternion) {
			var quata = new THREE.Quaternion(quaternion[0], quaternion[1], quaternion[2], quaternion[3]);
			var matrixa = new THREE.Matrix4().makeRotationFromQuaternion(quata);

			var quat = new THREE.Quaternion(position.quaternion[0], position.quaternion[1], position.quaternion[2], position.quaternion[3]);
			var matrix = new THREE.Matrix4().makeRotationFromQuaternion(quat);

			matrix.premultiply(matrixa);

			quat.setFromRotationMatrix(matrix);

			result.quaternion = [ quat.x, quat.y, quat.z, quat.w ];

		} else {
			result.quaternion = position.quaternion;
		}

		return result;
	};

	/**
	 * Add translation/scale/rotation to node's rest transformation stored in active view, and return the resulting transformation
	 *
	 * @function
	 * @name sap.ui.vk.ViewStateManager#addToRestTransformation
	 * @param {any} nodeRef The node reference.
	 * @param {float[]} translation vector for additional position, array of size 3, optional, if null, rest translation is return
	 * @param {float[]} quaternion quaternion for additional rotation, array of size 3, optional, if null, rest quaternion is return
	 * @param {float[]} scale vector for additional scaling, array of size 3, optional, if null, rest scale is return
	 * @param {sap.ui.vk.AnimationTrackValueType} originalRotationType AngleAxis, Euler, Quaternion
	 * @returns {any} resulting transformation, object that contains <code>translation</code>, <code>scale</code> and <code>quaternion</code> components.
	 * @private
	 */
	ViewStateManager.prototype.addToRestTransformation = function(nodeRef, translation, quaternion, scale, originalRotationType) {
		var forReversedPlaybacks = false;
		var currentView = this.getCurrentView();
		if (currentView) {
			var playback = currentView.getPlayback(0);
			if (playback && playback.getReversed()) {
				forReversedPlaybacks = true;
			}
		}
		var position = this.getRestTransformation(nodeRef, forReversedPlaybacks);

		if (!nodeRef.userData){
			nodeRef.userData = { };
		}

		if (translation) {
			nodeRef.userData.offsetTranslation = translation;
		} else {
			nodeRef.userData.offsetTranslation = null;
		}

		if (scale) {
			nodeRef.userData.offsetScale = scale;
		} else {
			nodeRef.userData.offsetScale = null;
		}

		if (quaternion) {
			nodeRef.userData.offsetQuaternion = quaternion;
			nodeRef.userData.originalRotationType = originalRotationType;
		} else {
			nodeRef.userData.offsetQuaternion = null;
			nodeRef.userData.originalRotationType = null;
		}

		return this._addToTransformation(position, translation, quaternion, scale, originalRotationType);
	};

	ViewStateManager.prototype._setJointNodeMatrix = function() {
		if (this._jointCollection && this._jointCollection.length > 0) {
			this._jointCollection.forEach(function(joint) {
				if (!joint.node || !joint.parent) {
					return;
				}

				var node = joint.node;

				if (node.userData.skipUpdateJointNode) {
					return;
				}

				var position = { };
				position.translation = joint.translation.slice();
				position.scale = joint.scale.slice();
				position.quaternion = joint.quaternion.slice();
				var newTransformation = this._addToTransformation(position, node.userData.offsetTranslation,
																	node.userData.offsetQuaternion,
																	node.userData.offsetScale,
																	node.userData.originalRotationType);

				node.position.fromArray(newTransformation.translation);
				node.scale.fromArray(newTransformation.scale);
				node.quaternion.fromArray(newTransformation.quaternion);
				node.updateMatrix();

				var jointQuaternion = node.quaternion.clone();

				var jointParentMatrix = new THREE.Matrix4();
				if (joint.parent) {
					joint.parent.updateMatrixWorld();
					jointParentMatrix = joint.parent.matrixWorld.clone();
					node.matrixWorld.multiplyMatrices(joint.parent.matrixWorld, node.matrix);
				} else {
					node.matrixWorld.copy(node.matrix);
				}

				var nodeParentMatrix = new THREE.Matrix4();
				if (node.parent) {
					nodeParentMatrix = node.parent.matrixWorld.clone();
					node.matrix.getInverse(node.parent.matrixWorld).multiply(node.matrixWorld);
				} else {
					node.matrix.copy(node.matrixWorld);
				}

				node.matrix.decompose(node.position, node.quaternion, node.scale);
				// node.matrixWorldNeedsUpdate = false;

				var scale = [ node.scale.x, node.scale.y, node.scale.z ];
				this._adjustQuaternionAndScale(jointParentMatrix, nodeParentMatrix, jointQuaternion, node.quaternion, newTransformation.scale, scale);
				node.scale.x = scale[0];
				node.scale.y = scale[1];
				node.scale.z = scale[2];

				if (joint.nodesToUpdate) {// update dependent intermediate nodes
					joint.nodesToUpdate.forEach(function(subnode) {
						if (subnode.matrixAutoUpdate) { subnode.updateMatrix(); }
						subnode.matrixWorld.multiplyMatrices(subnode.parent.matrixWorld, subnode.matrix);
						// subnode.matrixWorldNeedsUpdate = false;
					});
				}
			}.bind(this));
		}
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

		var propertyValue;

		var currentView = this.getCurrentView();
		if (!currentView) {
			return propertyValue;
		}

		var playbacks = currentView.getPlaybacks();
		if (!playbacks || !playbacks.length) {
			return propertyValue;
		}

		for (var k = playbacks.length - 1; k >= 0; k--) {
			var lastPlayback = playbacks[k];
			var lastSequence = lastPlayback.getSequence();
			if (lastSequence._convertedFromAbsolute) { // old sequence
				return propertyValue;
			}
			if (lastSequence) {
				propertyValue = lastSequence.getNodeBoundaryProperty(nodeRef, property, true);
				if (propertyValue) {
					break;
				}
			}
		}

		return propertyValue;
	};

	/**
	 * Get node property relative to rest position, defined by the last key of previous sequence.
	 *
	 * @function
	 * @name sap.ui.vk.ViewStateManager#_getEndPropertyInPreviousSequence
	 * @param {any} nodeRef node reference
	 * @param {sap.ui.vk.AnimationTrackType} property translate/rotate/scale/opacity
	 * @param {sap.ui.vk.AnimationSequence} sequence current sequence, if undefined/null, get the property of last sequence
	 * @returns {float[] | float} translate/rotate/scale/opacity
	 * @private
	 */
	ViewStateManager.prototype._getEndPropertyInPreviousSequence = function(nodeRef, property, sequence) {

		var propertyValue;
		if (sequence && sequence._convertedFromAbsolute) {
			return propertyValue;
		}

		var currentView = this.getCurrentView();
		if (!currentView) {
			return propertyValue;
		}

		var playbacks = currentView.getPlaybacks();
		for (var i = 1; i < playbacks.length; i++) {
			var playback = playbacks[i];
			var seq = playback.getSequence();
			if (seq !== sequence) {
				continue;
			}

			for (var j = i - 1; j >= 0; j--){
				var previousPlayback = playbacks[j];
				var previousSequence = previousPlayback.getSequence();
				if (previousSequence) {
					propertyValue = previousSequence.getNodeBoundaryProperty(nodeRef, property, true);
					if (propertyValue) {
						break;
					}
				}
			}
		}

		return propertyValue;
	};


	/**
	 * Convert translate, rotate, and scale tracks in absolute values to the values relative to the rest position defined with active view.
	 *
	 * @function
	 * @name sap.ui.vk.ViewStateManager#_convertTracksToRelative
	 * @param {sap.ui.vk.AnimationSequence} sequence animation sequence
	 * @param {boolean} reversedPlayback true if sequence is in reversed playback
	 * @returns {sap.ui.vk.ViewStateManager} <code>this</code> to allow method chaining.
	 * @private
	 */
	ViewStateManager.prototype._convertTracksToRelative = function(sequence, reversedPlayback) {

		if ((reversedPlayback && sequence._convertionDoneForReversed) || (!reversedPlayback && sequence._convertionDone)) {
			return this;
		}

		sequence._convertedFromAbsolute = false;

		var currentView = this.getCurrentView();
		if (!currentView) {
			return this;
		}

		var nodesAnimation = sequence.getNodeAnimation();
		if (!nodesAnimation || !nodesAnimation.length) {
			return this;
		}

		var nodeInfo = currentView.getNodeInfos();

		if (nodeInfo) {

			nodeInfo.forEach(function(node) {

				var nodeAnimation;
				for (var i = 0; i < nodesAnimation.length; i++) {
					if (node.target === nodesAnimation[i].nodeRef) {
						nodeAnimation = nodesAnimation[i];
						break;
					}
				}

				if (!nodeAnimation) {
					return;
				}

				var startT = [ 0, 0, 0 ];
				var startS = [ 1, 1, 1 ];
				var	startQ = new THREE.Quaternion();
				var position = new THREE.Vector3();
				var scale = new THREE.Vector3();

				if (node.transform) {
					var newMatrix = arrayToMatrixThree(node.transform);
					newMatrix.decompose(position, startQ, scale);
					startT = position.toArray();
					startS = scale.toArray();
				} else if (node[AnimationTrackType.Scale] && node[AnimationTrackType.Rotate] && node[AnimationTrackType.Translate]) {
					startT = node[AnimationTrackType.Translate].slice();
					startQ = new THREE.Quaternion(node[AnimationTrackType.Rotate][0], node[AnimationTrackType.Rotate][1],
														node[AnimationTrackType.Rotate][2], node[AnimationTrackType.Rotate][3]);
					startS = node[AnimationTrackType.Scale].slice();
				} else {
					node.target.matrix.decompose(position, startQ, scale);
					startT = position.toArray();
					startS = scale.toArray();
				}

				var j, count, key, value;
				var translateTrack = nodeAnimation[AnimationTrackType.Translate];
				if (translateTrack && translateTrack.getIsAbsoluteValue()) {
					count = translateTrack.getKeysCount();
					for (j = 0; j < count; j++) {
						key = translateTrack.getKey(j);
						value = [ key.value[0] - startT[0], key.value[1] - startT[1], key.value[2] - startT[2] ];
						translateTrack.updateKey(j, value, true);
					}
					translateTrack.setIsAbsoluteValue(false);
					sequence._convertedFromAbsolute = true;
				}

				var scaleTrack = nodeAnimation[AnimationTrackType.Scale];
				if (scaleTrack && scaleTrack.getIsAbsoluteValue()) {
					count = scaleTrack.getKeysCount();
					for (j = 0; j < count; j++) {
						key = scaleTrack.getKey(j);
						value = [ key.value[0] / startS[0], key.value[1] / startS[1], key.value[2] / startS[2] ];
						scaleTrack.updateKey(j, value, true);
					}
					scaleTrack.setIsAbsoluteValue(false);
					sequence._convertedFromAbsolute = true;
				}

				var opacityTrack = nodeAnimation[AnimationTrackType.Opacity];
				if (opacityTrack && opacityTrack.getIsAbsoluteValue()) {
					var restOpacity = this.getRestOpacity(node.target);
					// assuming rest opacity as 1, rely on opacity track at time 0 for correct opacity in rest position
					if (!restOpacity) {
							restOpacity = 1.0;
					}

					count = opacityTrack.getKeysCount();
					for (j = 0; j < count; j++) {
						key = opacityTrack.getKey(j);
						value = key.value / restOpacity;
						opacityTrack.updateKey(j, value, true);
					}
					opacityTrack.setIsAbsoluteValue(false);
					sequence._convertedFromAbsolute = true;
				}

				var getModulatedAngularValue = function(original) {
					var difference = 0;
					var twoPI = 2 * Math.PI;
					if (original > 0) {
						while (original > twoPI - 0.0001) {
							difference += twoPI;
							original -= twoPI;
						}
					} else if (original < 0) {
						while (original < -twoPI + 0.0001) {
							difference -= twoPI;
							original += twoPI;
						}
					}

					return difference;
				};


				var rotateTrack = nodeAnimation[AnimationTrackType.Rotate];
				if (rotateTrack && rotateTrack.getIsAbsoluteValue()) {

					var quaternion;
					var startRMatrix = new THREE.Matrix4().makeRotationFromQuaternion(startQ);
					var invStartRMatrix = new THREE.Matrix4().getInverse(startRMatrix);
					var aMatrix = new THREE.Matrix4();
					var rMatrix = new THREE.Matrix4();
					count = rotateTrack.getKeysCount();
					var valueType = rotateTrack.getKeysType();

					for (j = 0; j < count; j++) {
						key = rotateTrack.getKey(j);
						if (valueType === AnimationTrackValueType.Quaternion) {

							quaternion = new THREE.Quaternion(key.value[0], key.value[1], key.value[2], key.value[3]);
							aMatrix.makeRotationFromQuaternion(quaternion);
							rMatrix.multiplyMatrices(aMatrix, invStartRMatrix);
							quaternion.setFromRotationMatrix(rMatrix);
							value = quaternion.toArray();
							rotateTrack.updateKey(j, value, true);

						} else if (valueType === AnimationTrackValueType.Euler) {

							var q = AnimationMath.neutralEulerToGlMatrixQuat(key.value);
							var r = AnimationMath.glMatrixQuatToNeutral(q);
							quaternion = new THREE.Quaternion(r[0], r[1], r[2], r[3]);
							aMatrix = new THREE.Matrix4().makeRotationFromQuaternion(quaternion);
							rMatrix.multiplyMatrices(aMatrix, invStartRMatrix);
							quaternion.setFromRotationMatrix(rMatrix);
							var rvalue = AnimationMath.neutralQuatToNeutralEuler(quaternion, key.value[3]);

							value = [ rvalue[0] + getModulatedAngularValue(key.value[0]),
									  rvalue[1] + getModulatedAngularValue(key.value[1]),
									  rvalue[2] + getModulatedAngularValue(key.value[2]),
										key.value[3] ];
							rotateTrack.updateKey(j, value, true);

						} else if (j === 0){ // only change first key of angular axis

							var axis = new THREE.Vector3(key.value[0], key.value[1], key.value[2]);
							aMatrix.makeRotationAxis(axis, key.value[3]);
							rMatrix.multiplyMatrices(aMatrix, invStartRMatrix);
							quaternion = new THREE.Quaternion().setFromRotationMatrix(rMatrix);
							value = this._convertQuaternionToAngleAxis(quaternion);
							rotateTrack.updateKey(j, value, true);
							break;
						}
					}
					rotateTrack.setIsAbsoluteValue(false);
					sequence._convertedFromAbsolute = true;
				}
			}.bind(this));
		}

		if (!reversedPlayback) {
			sequence._convertionDone = true;
			sequence._convertionDoneForReversed = false;
		} else {
			sequence._convertionDone = false;
			sequence._convertionDoneForReversed = true;
		}

		return this;
	};

	ViewStateManager.prototype._getTrackKeys = function(track) {
		var keys = [];
		var count = track.getKeysCount();

		for (var j = 0; j < count; j++) {
			var key = track.getKey(j);
			var value;
			if (Array.isArray(key.value)) {
				value = key.value.slice();
			} else {
				value = key.value;
			}

			keys.push({ time: key.time,
							value: value });

		}

		return keys;
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
		var joint = this._getJointByChildNode(nodeRef);
		if (joint) {
			var nodeParentMatrix = new THREE.Matrix4();
			if (nodeRef.parent) {
				nodeParentMatrix = nodeRef.parent.matrixWorld.clone();
			}

			var nodeMatrix = new THREE.Matrix4();
			nodeRef.updateMatrixWorld();
			var jointParentMatrix = new THREE.Matrix4();
			if (joint.parent) {
				joint.parent.updateMatrixWorld();
				jointParentMatrix = joint.parent.matrixWorld.clone();
				nodeMatrix.getInverse(joint.parent.matrixWorld).multiply(nodeRef.matrixWorld);
			} else {
				nodeMatrix.copy(nodeRef.matrixWorld);
			}

			var position = new THREE.Vector3();
			var scale = new THREE.Vector3();
			var quaternion = new THREE.Quaternion();
			nodeMatrix.decompose(position, quaternion, scale);

			if (trackType === AnimationTrackType.Translate) {
				var currentTranslation = position.toArray();
				nodeRef.userData.offsetTranslation = [ currentTranslation[0] - joint.translation[0],
														currentTranslation[1] - joint.translation[1],
														currentTranslation[2] - joint.translation[2] ];
			} else if (trackType === AnimationTrackType.Scale) {

				var currentScale = scale.toArray();

				this._adjustQuaternionAndScale(nodeParentMatrix, jointParentMatrix, nodeRef.quaternion, quaternion, nodeRef.scale.toArray(), currentScale);

				nodeRef.userData.offsetScale = [ currentScale[0] / joint.scale[0],
													currentScale[1] / joint.scale[1],
													currentScale[2] / joint.scale[2] ];

			} else {
				this._adjustQuaternionAndScale(nodeParentMatrix, jointParentMatrix, nodeRef.quaternion, quaternion, nodeRef.scale.toArray(), scale.toArray());

				var startQ = new THREE.Quaternion(joint.quaternion[0], joint.quaternion[1], joint.quaternion[2], joint.quaternion[3]);
				var startRMatrix = new THREE.Matrix4().makeRotationFromQuaternion(startQ);
				var invStartRMatrix = new THREE.Matrix4().getInverse(startRMatrix);
				var aMatrix = new THREE.Matrix4().makeRotationFromQuaternion(quaternion);
				var rMatrix = new THREE.Matrix4().multiplyMatrices(aMatrix, invStartRMatrix);
				var offsetQ = new THREE.Quaternion().setFromRotationMatrix(rMatrix);
				nodeRef.userData.offsetQuaternion = offsetQ.toArray();
			}
		}

		return this;
	};

	/**
	 * Add key to a translation track according to the current node position
	 *
	 * @function
	 * @name sap.ui.vk.ViewStateManager#setTranslationKey
	 * @param {any} nodeRef The node reference of the translation track
	 * @param {float} time The time for the key
	 * @param {sap.ui.vk.AnimationSequence} sequence The animation sequence containing the translate track
	 * @returns {any} object contains the follow fields
	 * 			{float[]} <code>keyValue</code> translation relative to end position of previous sequence
	 * 			{float[]} <code>offset</code> translation of end position of previous sequence relative to rest position
	 *   		{float[]} <code>absoluteValue</code> node translation
	 * 			{any} <code>PreviousTrack</code> array of keys (time and value)
	 * 			{any} <code>CurrentTrack</code> array of keys (time and value)
	 * @private
	 */
	ViewStateManager.prototype.setTranslationKey = function(nodeRef, time, sequence) {
		var restTranslation;

		var forReversedPlaybacks = false;
		var currentView = this.getCurrentView();
		if (currentView) {
			var playback = currentView.getPlayback(0);
			if (playback && playback.getReversed()) {
				forReversedPlaybacks = true;
			}
		}

		var position = new THREE.Vector3();
		nodeRef.matrix.decompose(position, new THREE.Quaternion(), new THREE.Vector3());

		var joint = this._getJointByChildNode(nodeRef);
		if (joint) {
			restTranslation = joint.translation.slice();
			nodeRef.updateMatrixWorld();
			var nodeMat = new THREE.Matrix4();
			if (joint.parent) {
				joint.parent.updateMatrixWorld();
				nodeMat.getInverse(joint.parent.matrixWorld).multiply(nodeRef.matrixWorld);
			} else {
				nodeMat.matrix.copy(nodeRef.matrixWorld);
			}
			nodeMat.decompose(position, new THREE.Quaternion(), new THREE.Vector3());

		} else {
			var restTrans = this.getRestTransformation(nodeRef, forReversedPlaybacks);
			restTranslation = restTrans.translation;
		}

		var currentTranslation = position.toArray();
		var value = [ currentTranslation[0] - restTranslation[0],
						currentTranslation[1] - restTranslation[1],
						currentTranslation[2] - restTranslation[2] ];

		var offset = this._getEndPropertyInPreviousSequence(nodeRef, AnimationTrackType.Translate, sequence);
		if (offset) {
			value[0] -= offset[0];
			value[1] -= offset[1];
			value[2] -= offset[2];
		}

		var track = sequence.getNodeAnimation(nodeRef, AnimationTrackType.Translate);

		var oldTrack;
		if (!track) {
			track = this._scene.createTrack(null, {
				trackValueType: AnimationTrackValueType.Vector3,
				isAbsoluteValue: false
			});
			sequence.setNodeAnimation(nodeRef, AnimationTrackType.Translate, track, true);
		} else {
			oldTrack = this._getTrackKeys(track);
		}

		track.insertKey(time, value);
		var newTrack = this._getTrackKeys(track);

		return { KeyValue: value, absoluteValue: currentTranslation, offset: offset, PreviousTrack: oldTrack, CurrentTrack: newTrack };
	};

	// For maintaining the signs of scale components when converting between scale under joint parent and under scene parent
	// To overcome the problem caused by threejs decompose function, which always puts negative sign in x scale.
	ViewStateManager.prototype._adjustQuaternionAndScale = function(parentMatrix1, parentMatrix2, quaternion1, quaternion2, scale1, scale2) {
		function getClosestAligned(v, v1, v2, v3) {
			var d1 = Math.abs(v.dot(v1));
			var d2 = Math.abs(v.dot(v2));
			var d3 = Math.abs(v.dot(v3));

			if (d1 >= d2 && d1 >= d3) {
				return 0;
			} else if (d2 >= d1 && d2 >= d3) {
				return 1;
			} else {
				return 2;
			}
		}

		if (scale1[0] > 0 && scale1[1] > 0 && scale1[2] > 0) {
			return;
		}
		var mat1 = parentMatrix1.clone().multiply(new THREE.Matrix4().makeRotationFromQuaternion(quaternion1));
		var rotMat2 = new THREE.Matrix4().makeRotationFromQuaternion(quaternion2);
		var mat2 = parentMatrix2.clone().multiply(rotMat2);

		var vx1 = new THREE.Vector3();
		var vy1 = new THREE.Vector3();
		var vz1 = new THREE.Vector3();
		mat1.extractBasis(vx1, vy1, vz1);
		var basis1 = [ vx1, vy1, vz1 ];

		var vx2 = new THREE.Vector3();
		var	vy2 = new THREE.Vector3();
		var vz2 = new THREE.Vector3();
		mat2.extractBasis(vx2, vy2, vz2);

		var scale = [ 1, 1, 1 ];
		for (var i = 0; i < 3; i++) {
			var index = getClosestAligned(basis1[i], vx2, vy2, vz2);
			if (scale1[i] * scale2[index] < 0) {
				scale[index] = -1;
				scale2[index] = -scale2[index];
			}
		}

		rotMat2.scale(new THREE.Vector3(scale[0], scale[1], scale[2]));

		var quat2 = new THREE.Quaternion().setFromRotationMatrix(rotMat2);
		quaternion2.x = quat2.x;
		quaternion2.y = quat2.y;
		quaternion2.z = quat2.z;
		quaternion2.w = quat2.w;
	};

	 /**
	 * Add key to a scale track according to the current node scale
	 *
	 * @function
	 * @name sap.ui.vk.ViewStateManager#setScaleKey
	 * @param {any} nodeRef The node reference of the scale track
	 * @param {float} time The time for the key
	 * @param {sap.ui.vk.AnimationSequence} sequence The animation sequence containing the scale track
	 * @returns {any} object contains the follow fields
	 * 			{float[]} <code>keyValue</code> scale relative to end position of previous sequence
	 * 			{float[]} <code>offset</code> scale of end position of previous sequence relative to rest position
	 *   		{float[]} <code>absoluteValue</code> scale
	 * 			{any} <code>PreviousTrack</code> array of keys (time and value)
	 * 			{any} <code>CurrentTrack</code> array of keys (time and value)
	 * @private
	 */
	ViewStateManager.prototype.setScaleKey = function(nodeRef, time, sequence) {
		var restScale;

		var forReversedPlaybacks = false;
		var currentView = this.getCurrentView();
		if (currentView) {
			var playback = currentView.getPlayback(0);
			if (playback && playback.getReversed()) {
				forReversedPlaybacks = true;
			}
		}

		var currentScale = nodeRef.scale.toArray();
		var nodeQuaternion = nodeRef.quaternion.clone();
		// nodeRef.matrix.decompose(new THREE.Vector3(), quaternion, scale);

		var joint = this._getJointByChildNode(nodeRef);
		if (joint) {
			var nodeParentMatrix = new THREE.Matrix4();
			if (nodeRef.parent) {
				nodeParentMatrix = nodeRef.parent.matrixWorld.clone();
			}

			restScale = joint.scale.slice();

			nodeRef.updateMatrixWorld();
			var nodeMat = new THREE.Matrix4();

			var jointParentMatrix = new THREE.Matrix4();
			if (joint.parent) {
				joint.parent.updateMatrixWorld();
				jointParentMatrix = joint.parent.matrixWorld.clone();
				nodeMat.getInverse(joint.parent.matrixWorld).multiply(nodeRef.matrixWorld);
			} else {
				nodeMat.copy(nodeRef.matrixWorld);
			}

			var quaternion = new THREE.Quaternion();
			var scale = new THREE.Vector3();
			nodeMat.decompose(new THREE.Vector3(), quaternion, scale);

			var qScaleArray = scale.toArray();
			this._adjustQuaternionAndScale(nodeParentMatrix,
											jointParentMatrix,
											nodeQuaternion,
											quaternion,
											currentScale,
											qScaleArray);
			currentScale = qScaleArray;

		} else {
			var restTrans = this.getRestTransformation(nodeRef, forReversedPlaybacks);
			restScale = restTrans.scale;
		}

		var value = [ currentScale[0] / restScale[0],
					currentScale[1] / restScale[1],
					currentScale[2] / restScale[2] ];

		var offset = this._getEndPropertyInPreviousSequence(nodeRef, AnimationTrackType.Scale, sequence);
		if (offset) {
			value[0] /= offset[0];
			value[1] /= offset[1];
			value[2] /= offset[2];
		}

		var track = sequence.getNodeAnimation(nodeRef, AnimationTrackType.Scale);

		var oldTrack;
		if (!track) {
			track = this._scene.createTrack(null, {
				trackValueType: AnimationTrackValueType.Vector3,
				isAbsoluteValue: false
			});
			sequence.setNodeAnimation(nodeRef, AnimationTrackType.Scale, track, true);
		} else {
			oldTrack = this._getTrackKeys(track);
		}

		track.insertKey(time, value);
		var newTrack = this._getTrackKeys(track);

		return { KeyValue: value, absoluteValue: currentScale, offset: offset, PreviousTrack: oldTrack, CurrentTrack: newTrack };
	};

	/**
	 * Add key to a scale track according to the current node scale
	 *
	 * @function
	 * @name sap.ui.vk.ViewStateManager#setRotationKey
	 * @param {any} nodeRef The node reference of the scale track
	 * @param {float} time The time for the key
	 * @param {float[]} euler The euler rotation relative to the end position of previous sequence or rest position for the first sequence
	 * @param {sap.ui.vk.AnimationSequence} sequence The animation sequence containing the scale track
	 * @returns {any} null if existing track is not euler, if no existing track or existing track is euler, object contains the follow fields
	 * 			{float[]} <code>keyValue</code> euler rotation relative to end position of previous sequence
	 * 			{float[]} <code>offset</code> quaternion of end position of previous sequence relative to rest position
	 *   		{float[]} <code>absoluteValue</code> quaternion rotation
	 * 			{any} <code>PreviousTrack</code> array of keys (time and value)
	 * 			{any} <code>CurrentTrack</code> array of keys (time and value)
	 *
	 * @private
	 */
	ViewStateManager.prototype.setRotationKey = function(nodeRef, time, euler, sequence) {
		var order = 36; // "XYZ"
		var value = [ euler[0], euler[1], euler[2], order ];


		var track = sequence.getNodeAnimation(nodeRef, AnimationTrackType.Rotate);

		if (track && track.getKeysType() !== AnimationTrackValueType.Euler) {
			return null;
		}

		var oldTrack;
		if (!track) {
			track = this._scene.createTrack(null, {
				trackValueType: AnimationTrackValueType.Euler,
				isAbsoluteValue: false
			});
			sequence.setNodeAnimation(nodeRef, AnimationTrackType.Rotate, track, true);
		} else {
			oldTrack = this._getTrackKeys(track);
		}

		track.insertKey(time, value);
		var newTrack = this._getTrackKeys(track);

		var quat = new THREE.Quaternion();
		var eulerRotation = new THREE.Euler(euler[0], euler[1], euler[2]);
		quat.setFromEuler(eulerRotation);
		var offset = this._getEndPropertyInPreviousSequence(nodeRef, AnimationTrackType.Rotate, sequence);
		if (offset) {
			var offsetQuat = new THREE.Quaternion(offset[0], offset[1], offset[2], offset[3]);
			quat.multiply(offsetQuat);
		}

		var restQuat = new THREE.Quaternion();

		var joint = this._getJointByChildNode(nodeRef);
		if (joint) {
			restQuat.fromArray(joint.quaternion);
		} else {
			var forReversedPlaybacks = false;
			var currentView = this.getCurrentView();
			if (currentView) {
				var playback = currentView.getPlayback(0);
				if (playback && playback.getReversed()) {
					forReversedPlaybacks = true;
				}
			}
			var restTrans = this.getRestTransformation(nodeRef, forReversedPlaybacks);
			restQuat.fromArray(restTrans.quaternion);
		}

		quat.multiply(restQuat);

		return { KeyValue: value, absoluteValue: quat.toArray(), offset: offset, PreviousTrack: oldTrack, CurrentTrack: newTrack };
	};

	 /**
	 * Get total opacity - product of all the ancestors' opacities and its own opacity
	 *
	 * @function
	 * @name sap.ui.vk.ViewStateManager#getTotalOpacity
	 * @param {any} nodeRef The node reference of the opacity track
	 * @returns {float} total opacity
	 * @private
	 */
	ViewStateManager.prototype.getTotalOpacity = function(nodeRef) {
		return nodeRef._vkGetTotalOpacity(this._jointCollection);
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
	 * @private
	 */
	ViewStateManager.prototype.setTotalOpacity = function(nodeRef, totalOpacity) {

		var parentTotal = 1;
		var joint = this._getJointByChildNode(nodeRef);
		if (joint && joint.parent) {
			parentTotal = joint.parent._vkGetTotalOpacity(this._jointCollection);
		} else if (nodeRef.parent) {
			parentTotal = nodeRef.parent._vkGetTotalOpacity(this._jointCollection);
		}

		if (!nodeRef.userData) {
			nodeRef.userData = {};
		}

		var opacity = this.getOpacity(nodeRef);

		if (parentTotal !== 0.0) {
			opacity = totalOpacity / parentTotal;
		} else {
			totalOpacity = 0.0;
		}

		nodeRef._vkSetOpacity(opacity, this._jointCollection);

		var eventParameters = {
			changed: nodeRef,
			opacity: opacity
		};

		this.fireOpacityChanged(eventParameters);

		return { opacity: opacity, totalOpacity: totalOpacity };
	};

	 /**
	 * Add key to a opacity track according to the opacity of current node
	 *
	 * @function
	 * @name sap.ui.vk.ViewStateManager#setOpacityKey
	 * @param {any} nodeRef The node reference of the opacity track
	 * @param {float} time The time for the key
	 * @param {sap.ui.vk.AnimationSequence} sequence The animation sequence containing the opacity track
	 * @returns {any} null if existing track is not euler, if no existing track or existing track is euler, object contains the follow fields
	 * 			{float} <code>keyValue</code> scale relative to rest position
	 *   		{float} <code>totalOpacity</code> scale
	 * 			{any} <code>PreviousTrack</code> array of keys (time and value)
	 * 			{any} <code>CurrentTrack</code> array of keys (time and value)
	 * @private
	 */
	ViewStateManager.prototype.setOpacityKey = function(nodeRef, time, sequence) {
		var value = 1;
		if (nodeRef.userData && nodeRef.userData.opacity !== undefined && nodeRef.userData.opacity !== null) {
			value = nodeRef.userData.opacity;
		}

		var restOpacity = this.getRestOpacity(nodeRef);
		// for converted absolute track, 0 rest opacity is assumed to be 1 when being converted to relative track
		if (!restOpacity && sequence._convertedFromAbsolute){
			restOpacity = 1;
		}
		value /= restOpacity;

		var offsetOpacity = this._getEndPropertyInPreviousSequence(nodeRef, AnimationTrackType.Opacity, sequence);
		if (offsetOpacity) {
			value /= offsetOpacity;
		}

		var track = sequence.getNodeAnimation(nodeRef, AnimationTrackType.Opacity);

		var oldTrack;
		if (!track) {
			track = this._scene.createTrack(null, {
				trackValueType: AnimationTrackValueType.Opacity
			});
			sequence.setNodeAnimation(nodeRef, AnimationTrackType.Opacity, track, true);
		} else {
			oldTrack = this._getTrackKeys(track);
		}

		track.insertKey(time, value);
		var newTrack = this._getTrackKeys(track);

		return { KeyValue: value, totalOpacity: this.getTotalOpacity(nodeRef), PreviousTrack: oldTrack, CurrentTrack: newTrack };
	};

	////////////////////////////////////////////////////////////////////////////
	// BEGIN: VisibilityTracker

	// Visibility Tracker is an object which keeps track of visibility changes.
	// These changes will be used in Viewport getViewInfo/setViewInfo
	VisibilityTracker = function() {
		// all visibility changes are saved in a Set. When a node changes visibility,
		// we add that id to the Set. When the visibility is changed back, we remove
		// the node reference from the set.
		this._visibilityChanges = new Set();
	};

	// It returns an object with all the relevant information about the node visibility
	// changes. In this case, we need to retrieve a list of all nodes that suffered changes
	// and an overall state against which the node visibility changes is applied.
	// For example: The overall visibility state is ALL VISIBLE and these 2 nodes changed state.
	VisibilityTracker.prototype.getInfo = function(nodeHierarchy) {
		// converting the collection of changed node references to ve ids
		var changedNodes = [];
		this._visibilityChanges.forEach(function(nodeRef) {
			// create node proxy based on dynamic node reference
			var nodeProxy = nodeHierarchy.createNodeProxy(nodeRef);
			var veId = nodeProxy.getVeId();
			// destroy the node proxy
			nodeHierarchy.destroyNodeProxy(nodeProxy);
			if (veId) {
				changedNodes.push(veId);
			} else {
				changedNodes.push(nodeHierarchy.getScene().nodeRefToPersistentId(nodeRef));
			}
		});

		return changedNodes;
	};

	// It clears all the node references from the _visibilityChanges set.
	// This action can be performed for example, when a step is activated or
	// when the nodes are either all visible or all not visible.
	VisibilityTracker.prototype.clear = function() {
		this._visibilityChanges.clear();
	};

	// If a node suffers a visibility change, we check if that node is already tracked.
	// If it is, we remove it from the list of changed nodes. If it isn't, we add it.
	VisibilityTracker.prototype.trackNodeRef = function(nodeRef) {
		if (this._visibilityChanges.has(nodeRef)) {
			this._visibilityChanges.delete(nodeRef);
		} else {
			this._visibilityChanges.add(nodeRef);
		}
	};

	// END: VisibilityTracker
	////////////////////////////////////////////////////////////////////////////

	ContentConnector.injectMethodsIntoClass(ViewStateManager);

	return ViewStateManager;
});
