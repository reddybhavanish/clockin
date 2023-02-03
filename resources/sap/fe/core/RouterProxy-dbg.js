/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2020 SAP SE. All rights reserved
    
 */
/* eslint-disable no-alert */

/* global Promise */
sap.ui.define(
	[
		"sap/base/Log",
		"sap/ui/base/Object",
		"sap/ushell/components/applicationIntegration/AppLifeCycle",
		"sap/ui/core/routing/HashChanger",
		"sap/ui/base/EventProvider",
		"sap/fe/core/Synchronization"
	],
	function(Log, BaseObject, AppLifeCycle, HashChanger, EventProvider, Synchronization) {
		"use strict";

		var enumState = {
			EQUAL: 0,
			COMPATIBLE: 1,
			ANCESTOR: 2,
			DIFFERENT: 3
		};

		var enumURLParams = {
			LAYOUTPARAM: "layout",
			IAPPSTATEPARAM: "sap-iapp-state"
		};

		return BaseObject.extend("sap.fe.core.RouterProxy", {
			bIsRebuildHistoryRunning: false,
			bIsComputingTitleHierachy: false,
			oNavigationGuardState: null,
			bIsGuardCrossAllowed: false,
			sIAppStateKey: null,

			init: function(oAppComponent, isfclEnabled) {
				// Save the name of the app (including startup parameters) for rebuilding full hashes later
				var sFlpAppName = sap.ushell.Container.getService("URLParsing").splitHash(window.location.hash).shellPart;

				this.initRaw(oAppComponent.getRouter(), sFlpAppName);
				// We want to wait until the initial routeMatched is done before doing any navigation
				this._oRouteMatchSynchronization = new Synchronization();
				this._bActivateRouteMatchSynchro = false;

				// Set feLevel=0 for the first Application page in the history
				history.replaceState(Object.assign({ feLevel: 0 }, history.state), null, window.location);
				this.fclEnabled = isfclEnabled;
			},

			/**
			 * Raw initialization for unit tests
			 * @param {*} oRouter
			 * @param {*} sFlpAppName
			 */
			initRaw: function(oRouter, sFlpAppName) {
				this._oRouter = oRouter;
				this._oManagedHistory = [];
				this._sFlpAppName = sFlpAppName;

				var sCurrentAppHash = this._oRouter.getHashChanger().getHash();
				this._oManagedHistory.push(this._extractStateFromHash(sCurrentAppHash));

				// Set the iAppState if the initial hash contains one
				this.sIAppStateKey = this._findAppStateInHash(sCurrentAppHash);
			},

			/**
			 * Navigates to a specific hash
			 *
			 * @function
			 * @name sap.fe.core.RouterProxy#navToHash
			 * @memberof sap.fe.core.RouterProxy
			 * @static
			 * @param {String} sHash to be navigated to
			 * @param {boolean} bPreserveHistory If set to true, non-ancestor entries in history will be retained
			 *
			 * @sap-restricted
			 */
			navToHash: function(sHash, bPreserveHistory) {
				var that = this;

				if (this._oRouteMatchSynchronization) {
					return this._oRouteMatchSynchronization.waitFor().then(function() {
						that._oRouteMatchSynchronization = null;
						return that._internalNavToHash(sHash, bPreserveHistory);
					});
				} else {
					if (this._bActivateRouteMatchSynchro) {
						this._oRouteMatchSynchronization = new Synchronization();
						this._bActivateRouteMatchSynchro = false;
					}
					return that._internalNavToHash(sHash, bPreserveHistory);
				}
			},

			_internalNavToHash: function(sHash, bPreserveHistory) {
				var that = this,
					sLastFocusControlId = sap.ui.getCore().getCurrentFocusedControlId(),
					sLastFocusInfo =
						sLastFocusControlId && sap.ui.getCore().byId(sLastFocusControlId)
							? sap.ui
									.getCore()
									.byId(sLastFocusControlId)
									.getFocusInfo()
							: null,
					shashBeforeRoutechanged = window.location.hash;

				// Add the app state in the hash if needed
				if (this.fclEnabled && this.sIAppStateKey && !this._findAppStateInHash(sHash)) {
					sHash = this._setAppStateInHash(sHash, this.sIAppStateKey);
				}
				var oNewState = this._extractStateFromHash(sHash);

				if (!this._checkNavigationGuard(oNewState)) {
					if (!this.oResourceBundle) {
						this.oResourceBundle = sap.ui.getCore().getLibraryResourceBundle("sap.fe.core");
					}

					// We have to use a confirm here for UI consistency reasons, as with some scenarios
					// in the EditFlow we rely on a UI5 mechanism that displays a confirm dialog.
					if (!confirm(this.oResourceBundle.getText("SAPFE_EXIT_NOTSAVED_MESSAGE"))) {
						// The user clicked on Cancel --> cancel navigation
						return Promise.resolve();
					}
					this.bIsGuardCrossAllowed = true;
				}
				this._pushNewState(oNewState, bPreserveHistory);

				return this._rebuildBrowserHistory(sHash).then(function() {
					that.storeFocusForHash(sLastFocusControlId, sLastFocusInfo, shashBeforeRoutechanged);
				});
			},

			/**
			 * Cleans browser history if entries have been added without using the RouterProxy
			 * Updates the internal history accordingly
			 */
			restoreHistory: function() {
				var sTargetHash = HashChanger.getInstance().getHash(),
					oNewState = this._extractStateFromHash(sTargetHash);

				this._pushNewState(oNewState);
				this._rebuildBrowserHistory(sTargetHash, true);
			},

			storeFocusForHash: function(sLastFocusControlId, sLastFocusInfo, shashBeforeRoutechanged) {
				var oManagedhistory = this._oManagedHistory;
				for (var i = 0; i < oManagedhistory.length; i++) {
					var sHash = "#" + oManagedhistory[i].hash;
					if (shashBeforeRoutechanged === sHash || sHash === shashBeforeRoutechanged + "&/") {
						oManagedhistory[i].oLastFocusControl = {
							controlId: sLastFocusControlId,
							focusInfo: sLastFocusInfo
						};
						break;
					}
				}
			},

			/**
			 * Navigates to a route with parameters
			 *
			 * @param {String} sRouteName to be navigated to
			 * @param {map} oParameters parameters for the navigation
			 *
			 * @sap-restricted
			 */
			navTo: function(sRouteName, oParameters) {
				var sHash = this._oRouter.getURL(sRouteName, oParameters);
				return this.navToHash(sHash);
			},

			/**
			 * Exits from the current app by navigating back
			 * to the previous app (if any) or the FLP
			 * @returns {Promise} promise that's resolved when we've exited from the app
			 */
			exitFromApp: function() {
				return new Promise(function(resolve, reject) {
					var oXAppNavService = sap.ushell.Container.getService("CrossApplicationNavigation");
					oXAppNavService.backToPreviousApp();
					resolve();
				});
			},

			/**
			 * Checks whether a given hash can have an impact on the current state
			 * i.e. if the hash is equal, compatible or an ancestor of the current state
			 *
			 * @param {*} sHash true if there's an impact
			 */
			isCurrentStateImpactedBy: function(sHash) {
				var oState = this._extractStateFromHash(sHash);
				return this._compareCacheStates(oState, this._oManagedHistory[this._oManagedHistory.length - 1]) !== enumState.DIFFERENT;
			},

			/**
			 * Returns false if a navigation has been triggered in the
			 * RouterProxy and is not yet finalized
			 * (e.g. due to browser history manipulations being done)
			 */
			isNavigationFinalized: function() {
				return !this.bIsRebuildHistoryRunning;
			},

			/**
			 * Sets the last state as a guard
			 * Each future navigation will be checked against this guard, and a confirmation dialog will
			 * be displayed before the navigation crosses the guard (i.e. goes to an ancestor of the guard)
			 */
			setNavigationGuard: function() {
				var sCurrentHash = this._sFlpAppName + "&/" + this._oRouter.getHashChanger().getHash();
				var index = -1;
				this._oManagedHistory.forEach(function(oHistoryEntry, _index) {
					if (oHistoryEntry.hash === sCurrentHash) {
						index = _index;
					}
				});

				if (index !== -1) {
					// Use the oldest state in history that has the same object keys as the current one
					while (index > 0 && this._compareStateKeys(this._oManagedHistory[index - 1], this._oManagedHistory[index])) {
						index--;
					}

					this.oNavigationGuardState = this._oManagedHistory[index];
					this.bIsGuardCrossAllowed = false;
				} else {
					throw new Error("current hash has no entry in Managed cache !!!");
				}
			},

			/**
			 * Disables the navigation guard
			 */
			discardNavigationGuard: function() {
				this.oNavigationGuardState = null;
			},

			/**
			 * Tests a hash against the navigation guard
			 * @param {String} sHash : the hash to be tested
			 * @returns {Boolean} true if navigating to the hash doesn't cross the guard
			 */
			checkHashWithGuard: function(sHash) {
				if (this.oNavigationGuardState === null) {
					return true; // No guard
				}

				var oNewState = this._extractStateFromHash(sHash);
				return this._checkNavigationGuard(oNewState);
			},

			/**
			 * Returns true if crossing the guard has been allowed by the user
			 */
			isGuardCrossAllowedByUser: function() {
				return this.bIsGuardCrossAllowed;
			},

			_checkNavigationGuard: function(oState) {
				if (this.oNavigationGuardState === null) {
					return true; // No guard
				}

				var compare = this._compareCacheStates(this.oNavigationGuardState, oState);
				return compare !== enumState.DIFFERENT;
			},

			/**
			 * Activates the synchronization for routeMatchedEvent
			 * The next NavToHash call will create a Synchronization object that will be resolved
			 * by the corresponding onRouteMatched event, preventing another NavToHash to happen in parallel
			 */
			activateRouteMatchSynchronization: function() {
				this._bActivateRouteMatchSynchro = true;
			},

			/**
			 * Resolve the routeMatch synchronization object, unlocking potential pending NavToHash calls
			 */
			resolveRouteMatch: function() {
				if (this._oRouteMatchSynchronization) {
					this._oRouteMatchSynchronization.resolve();
				}
			},

			/**
			 * Builds a state from a hash
			 *
			 * @param {sHash} sHash the hash to be used as entry
			 * @returns {state} the state
			 *
			 * @sap-restricted
			 */
			_extractStateFromHash: function(sHash) {
				var oState = {
					keys: []
				};

				// Retrieve object keys
				var sHashNoParams = sHash.split("?")[0];
				var sTokens = sHashNoParams.split("/");
				sTokens.forEach(function(sToken) {
					var regexKey = /[^\(\)]+\([^\(\)]+\)/; // abc(def)
					if (regexKey.test(sToken)) {
						// We have a key for an object
						sToken = sToken.substring(0, sToken.length - 1); // remove trailing ')'
						var newKey = { keyID: sToken.split("(")[0] };
						var keyValues = sToken.split("(")[1].split(",");
						if (keyValues.length > 1) {
							keyValues.forEach(function(value) {
								var kv = value.split("=");
								newKey[kv[0]] = kv[1];
							});
						} else {
							newKey["ID"] = sToken.split("(")[1];
						}
						oState.keys.push(newKey);
					}
				});

				// Retrieve layout (if any)
				var aLayout = sHash.match(new RegExp("\\?.*" + enumURLParams.LAYOUTPARAM + "=([^&]*)"));
				oState.sLayout = aLayout && aLayout.length > 1 ? aLayout[1] : null;
				if (oState.sLayout === "MidColumnFullScreen") {
					oState.screenMode = 1;
				} else if (oState.sLayout === "EndColumnFullScreen") {
					oState.screenMode = 2;
				} else {
					oState.screenMode = 0;
				}

				oState.hash = this._sFlpAppName + "&/" + sHash;

				return oState;
			},

			/**
			 * Adds a new state into the internal history structure
			 * Makes sure this new state is added after an ancestor
			 * Also sets the iAppState key in the whole history
			 *
			 * @function
			 * @name sap.fe.core.RouterProxy#_pushNewState
			 * @memberof sap.fe.core.RouterProxy
			 * @param  {Object} oNewState the new state to be added
			 * @param  {boolean} bPreserveHistory If set to true, non-ancestor entries in history will be retained
			 * @sap-restricted
			 * @final
			 *
			 */
			_pushNewState: function(oNewState, bPreserveHistory) {
				// In case the user has navigated back in the browser history, we need to remove
				// the states ahead in history and make sure the top state corresponds to the current page
				var oCurrentState = this._extractStateFromHash(this._oRouter.getHashChanger().getHash()),
					lastIndex = this._oManagedHistory.length - 1,
					that = this;

				while (lastIndex >= 0 && this._compareCacheStates(this._oManagedHistory[lastIndex], oCurrentState) !== enumState.EQUAL) {
					this._oManagedHistory.pop();
					lastIndex--;
				}

				if (this._oManagedHistory.length === 0) {
					// We couldn't find the current location in the history. This can happen if a browser reload
					// happened, causing a reinitialization of the managed history.
					// In that case, we use the current location as the new starting point in the managed history
					this._oManagedHistory.push(oCurrentState);

					history.replaceState(Object.assign({ feLevel: 0 }, history.state), null, window.location);
				}

				// Then we remove all states that are not ancestors of the new state
				var oLastFocusControl;
				var oLastRemovedItem;
				while (
					this._oManagedHistory.length > 0 &&
					this._compareCacheStates(this._oManagedHistory[this._oManagedHistory.length - 1], oNewState) !== enumState.ANCESTOR &&
					!bPreserveHistory
				) {
					oLastFocusControl = this._oManagedHistory[this._oManagedHistory.length - 1].oLastFocusControl;
					oLastRemovedItem = this._oManagedHistory.pop();
				}

				// Retrieve iAppState (if any)
				this.sIAppStateKey = this._findAppStateInHash(oNewState.hash);
				if (this.fclEnabled && this.sIAppStateKey) {
					// We have a new app state --> replace in the whole history
					this._oManagedHistory.forEach(function(oManagedState) {
						oManagedState.hash = that._setAppStateInHash(oManagedState.hash, that.sIAppStateKey);
					});
				} else if (!this.fclEnabled && oLastRemovedItem) {
					var sPreviousIAppStateKey = this._findAppStateInHash(oLastRemovedItem.hash);
					var oComparisonStateResult = this._compareCacheStates(oLastRemovedItem, oNewState);
					//if current state doesn't contain a i-appsate and this state should replace a state containing a i-appsate
					//then the previous i-appstate is preserved
					if (
						!this.sIAppStateKey &&
						sPreviousIAppStateKey &&
						(oComparisonStateResult === enumState.EQUAL || oComparisonStateResult === enumState.COMPATIBLE)
					) {
						oNewState.hash = that._setAppStateInHash(oNewState.hash, sPreviousIAppStateKey);
					}
				}

				// Now we can push the state at the top of the internal history
				oNewState.oLastFocusControl = oLastFocusControl;
				this._oManagedHistory.push(oNewState);
			},

			_findAppStateInHash: function(sHash) {
				var aAppState = sHash.match(new RegExp("\\?.*" + enumURLParams.IAPPSTATEPARAM + "=([^&]*)"));
				return aAppState && aAppState.length > 1 ? aAppState[1] : null;
			},

			_setAppStateInHash: function(sHash, sAppStateKey) {
				var sNewHash;

				if (sHash.indexOf(enumURLParams.IAPPSTATEPARAM) >= 0) {
					// If there's already an iAppState parameter in the hash, replace it
					sNewHash = sHash.replace(
						new RegExp(enumURLParams.IAPPSTATEPARAM + "=[^&]*"),
						enumURLParams.IAPPSTATEPARAM + "=" + sAppStateKey
					);
				} else {
					/*
					 * FLP AppName can contain ? when there are startup parameters so
					 * it's mandatory to remove it from Hash before checking if '?' is  already set
					 * and add either ? or & according to result
					 */
					// Add the iAppState parameter in the hash
					if (sHash.replace(this._sFlpAppName, "").indexOf("?") < 0) {
						sNewHash = sHash + "?";
					} else {
						sNewHash = sHash + "&";
					}
					sNewHash += enumURLParams.IAPPSTATEPARAM + "=" + sAppStateKey;
				}

				return sNewHash;
			},

			/**
			 * disable the routing by calling the router stop method
			 *
			 * @function
			 * @name sap.fe.core.RouterProxy#_disableEventOnHashChange
			 * @memberof sap.fe.core.RouterProxy
			 *
			 * @sap-restricted
			 * @final
			 */
			_disableEventOnHashChange: function() {
				this._oRouter.stop();
			},

			/**
			 * enable the routing by calling the router initialize method
			 *
			 * @function
			 * @name sap.fe.core.RouterProxy#_enableEventOnHashChange
			 * @memberof sap.fe.core.RouterProxy
			 * @param {Array} [bIgnoreCurrentHash] ignore the last hash event triggered before the router has initialized
			 *
			 * @sap-restricted
			 * @final
			 */
			_enableEventOnHashChange: function(bIgnoreCurrentHash) {
				this._oRouter.initialize(bIgnoreCurrentHash);
			},

			/**
			 * rebuilds the browser history from the app root page
			 *
			 * @function
			 * @name sap.fe.core.RouterProxy#_rebuildBrowserHistory
			 * @memberof sap.fe.core.RouterProxy
			 * @param {String} [sNewHash] the current hash that needs to be added at the end of history and displayed
			 *
			 * @sap-restricted
			 * @final
			 */
			_rebuildBrowserHistory: function(sNewHash, bRebuildOnly) {
				var that = this;
				return new Promise(function(resolve, reject) {
					// The condition below prevents the "parallel" execution of the _rebuildBrowserHistory and force to execute if sequentially by using a pool
					if (that.bIsRebuildHistoryRunning === true) {
						Log.warning("_rebuildBrowserHistory already running ... Add this call to the pool");
						if (!that.rebuildHistoryPool) {
							that.rebuildHistoryPool = [];
						}
						that.rebuildHistoryPool.push(sNewHash);
						resolve();
						return;
					}
					that.bIsRebuildHistoryRunning = true;

					function rebuild() {
						//we should normalized the value of the hash in the history for the Home App
						if (that._oManagedHistory[0].hash.indexOf("&/") === -1) {
							that._oManagedHistory[0].hash += "&/";
						}

						var oState = Object.assign({}, history.state);
						oState.sap = Object.assign({}, history.state.sap);
						if (!oState.sap.history) {
							oState.sap.history = [];
						}

						if (that._oManagedHistory.length === 1) {
							if (window.location.hash === "#" + that._oManagedHistory[0].hash) {
								// We're already at the right location --> just restart the router
								that._enableEventOnHashChange(!!bRebuildOnly);
							} else {
								if (!bRebuildOnly) {
									that._enableEventOnHashChange(true);
								}
								window.location.replace("#" + that._oManagedHistory[0].hash);
								history.replaceState(Object.assign(oState, { feLevel: 0 }), null, "#" + that._oManagedHistory[0].hash);
								if (bRebuildOnly) {
									setTimeout(function() {
										// Timeout to let 'hashchange' event be processed before by the HashChanger, so that
										// onRouteMatched notification isn't raised
										that._enableEventOnHashChange(true);
									}, 0);
								}
							}
						} else {
							history.replaceState(Object.assign(oState, { feLevel: 0 }), null, "#" + that._oManagedHistory[0].hash);

							// Add intermediate hashes without triggering reload
							var index = 1;
							while (index < that._oManagedHistory.length - 1) {
								oState.sap.history = oState.sap.history.concat(); //copy array
								oState.sap.history.push(that._oManagedHistory[index].hash);
								history.pushState(Object.assign(oState, { feLevel: index }), null, "#" + that._oManagedHistory[index].hash);
								index++;
							}

							// Add last hash
							if (!bRebuildOnly) {
								that._enableEventOnHashChange(true);
							}
							window.location = "#" + that._oManagedHistory[index].hash;
							oState.sap.history = oState.sap.history.concat(); //copy array
							oState.sap.history.push(that._oManagedHistory[index].hash);
							history.replaceState(
								Object.assign(oState, { feLevel: that._oManagedHistory.length - 1 }),
								null,
								"#" + that._oManagedHistory[index].hash
							);
							if (bRebuildOnly) {
								setTimeout(function() {
									// Timeout to let 'hashchange' event be processed before by the HashChanger, so that
									// onRouteMatched notification isn't raised
									that._enableEventOnHashChange(true);
								}, 0);
							}
						}
						that.bIsRebuildHistoryRunning = false;
						//execute the defered calls of _rebuildBrowserHistory in case of "parallel" executions detected
						if (that.rebuildHistoryPool && that.rebuildHistoryPool.length > 0) {
							var sLaterHash = that.rebuildHistoryPool[0];
							that.rebuildHistoryPool.shift();
							that._rebuildBrowserHistory(sLaterHash);
						}

						resolve();
					}

					// Async call of rebuild(), in order to let all notifications and events get processed
					function rebuildAsync() {
						if (!history.state) {
							resolve();
						} else if (history.state.feLevel === 0) {
							window.removeEventListener("popstate", rebuildAsync);
							setTimeout(function() {
								// Timeout to let 'hashchange' event be processed before by the HashChanger
								rebuild();
							}, 0);
						} else {
							history.back();
						}
					}

					that._disableEventOnHashChange();

					//history.state.feLevel can be undefined if deeplink is used without switching to another application
					if (!history.state || history.state.feLevel === undefined) {
						window.addEventListener("popstate", rebuildAsync);
						history.back();
					} else if (history.state.feLevel !== 0) {
						// Call rebuild when the navigation back is done
						// Asynchronous call to ensure all events/notifications have been processed before
						window.addEventListener("popstate", rebuildAsync);
						history.go(-history.state.feLevel);
					} else {
						// Call rebuild immediately (no back nav required)
						rebuild();
					}
				});
			},

			/**
			 * Navigate back to previous page and rebuild the browser history
			 *
			 * @function
			 * @name sap.fe.core.RouterProxy#navigateBack
			 * @memberof sap.fe.core.RouterProxy
			 * @param {object} [params]  Optional, can contain the following attributes:
			 * @param {bool} [params.rebuildHistory]  force to rebuild the browser history
			 *
			 * @sap-restricted
			 * @final
			 */
			navigateBack: function(params) {
				if (
					params &&
					params.rebuildHistory === true &&
					history.state.sap &&
					history.state.sap.history &&
					history.state.sap.history.length > 1
				) {
					var sNewHash = history.state.sap.history[history.state.sap.history.length - 2];
					sNewHash = sNewHash.replace(new RegExp(this._sFlpAppName + "(&/){0,1}"), "");
					this.navToHash(sNewHash);
				} else {
					window.history.back();
				}
			},

			/**
			 * Compares 2 states
			 *
			 * @param {*} oState1
			 * @param {*} oState2
			 * @returns {comparison} The result of the comparison:
			 *        - enumState.EQUAL if oState1 and oState2 are equal
			 *        - enumState.COMPATIBLE if oState1 and oState2 are compatible
			 *        - enumState.ANCESTOR if oState1 is an ancestor of oState2
			 *        - enumState.DIFFERENT if the 2 states are different
			 */

			_compareCacheStates: function(oState1, oState2) {
				// First compare object keys
				if (oState1.keys.length > oState2.keys.length) {
					return enumState.DIFFERENT;
				}
				var equal = true;
				var index;
				for (index = 0; equal && index < oState1.keys.length; index++) {
					if (oState1.keys[index].keyID !== oState2.keys[index].keyID || oState1.keys[index].ID !== oState2.keys[index].ID) {
						equal = false;
					}
				}
				if (!equal) {
					// Some objects keys are different
					return enumState.DIFFERENT;
				}

				// All keys from oState1 are in oState2 --> check if ancestor
				if (oState1.keys.length < oState2.keys.length || oState1.screenMode < oState2.screenMode) {
					return enumState.ANCESTOR;
				}
				if (oState1.screenMode > oState2.screenMode) {
					return enumState.DIFFERENT; // Not sure this case can happen...
				}

				// At this stage, the 2 states have the same object keys (in the same order) and same screenmode
				// They can be either compatible or equal
				for (index = 0; equal && index < oState1.keys.length; index++) {
					if (oState1.keys[index].IsActiveEntity !== oState2.keys[index].IsActiveEntity) {
						equal = false;
					}
				}

				if (!equal || oState1.sLayout !== oState2.sLayout) {
					return enumState.COMPATIBLE;
				} else {
					return enumState.EQUAL;
				}
			},

			/**
			 * Compares the object keys in 2 states
			 * @param {*} oState1
			 * @param {*} oState2
			 * @returns {Boolean} true if the object keys are the same, else false
			 */
			_compareStateKeys: function(oState1, oState2) {
				if (oState1.keys.length != oState2.keys.length) {
					return false;
				}

				var equal = true;
				var index;
				for (index = 0; equal && index < oState1.keys.length; index++) {
					if (oState1.keys[index].keyID !== oState2.keys[index].keyID || oState1.keys[index].ID !== oState2.keys[index].ID) {
						equal = false;
					}
				}

				return equal;
			},

			/**
			 * Checks if back exits the present guard set
			 * @param {String}} sPresentHash the current hash. Only used for unit tests.
			 * @returns {Boolean} true if back exits there is a guard exit on back
			 */
			checkIfBackIsOutOfGuard: function(sPresentHash) {
				var that = this,
					sPrevHash;

				if (sPresentHash === undefined) {
					// We use window.location.hash instead of HashChanger.getInstance().getHash() because the latter
					// replaces characters in the URL (e.g. %24 replaced by $) and it causes issues when comparing
					// with the URLs in the managed history
					sPresentHash = window.location.hash.substring(1); // To remove the '#'
				}

				if (that.oNavigationGuardState && that._oManagedHistory) {
					for (var i = that._oManagedHistory.length - 1; i > 0; i--) {
						if (that._oManagedHistory[i].hash === sPresentHash) {
							sPrevHash = that._oManagedHistory[i - 1].hash;
							break;
						}
					}

					return !sPrevHash || !that.checkHashWithGuard(sPrevHash.split(this._sFlpAppName + "&/")[1]);
				}
				return false;
			}
		});
	}
);
