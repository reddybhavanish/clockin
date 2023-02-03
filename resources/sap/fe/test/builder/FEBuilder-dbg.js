sap.ui.define(
	[
		"sap/ui/test/OpaBuilder",
		"sap/fe/test/Utils",
		"sap/ui/test/Opa5",
		"sap/ui/test/matchers/Matcher",
		"sap/ui/core/util/ShortcutHelper",
		"sap/base/util/deepEqual"
	],
	function(OpaBuilder, Utils, Opa5, Matcher, ShortcutHelper, deepEqual) {
		"use strict";

		var ElementStates = {
			// TODO rename focus to focused in Journeys
			focus: function(bFocused) {
				var fnFocusedMatcher = OpaBuilder.Matchers.focused(true);
				return bFocused ? fnFocusedMatcher : OpaBuilder.Matchers.not(fnFocusedMatcher);
			},
			focused: function(bFocused) {
				var fnFocusedMatcher = OpaBuilder.Matchers.focused(true);
				return bFocused ? fnFocusedMatcher : OpaBuilder.Matchers.not(fnFocusedMatcher);
			},
			type: function(vType) {
				return function(oControl) {
					return oControl && oControl.isA(vType);
				};
			},
			p13nMode: function(aMode) {
				if (!Array.isArray(aMode)) {
					aMode = [];
				}
				aMode.sort();
				return function(oControl) {
					var p13nMode = oControl.getP13nMode();
					if (!Array.isArray(p13nMode)) {
						p13nMode = [];
					}
					p13nMode.sort();
					return deepEqual(aMode, p13nMode);
				};
			}
		};

		var FEBuilder = function() {
			return OpaBuilder.apply(this, arguments);
		};

		FEBuilder.create = function(oOpaInstance) {
			return new FEBuilder(oOpaInstance);
		};

		FEBuilder.prototype = Object.create(OpaBuilder.prototype);
		FEBuilder.prototype.constructor = FEBuilder;

		/**
		 * Returns the matcher for states, which might be control specific. This function is meant to be overridden
		 * by concrete control builder if necessary.
		 * @param mState
		 * @return {function} state matcher function
		 *
		 * @protected
		 */
		FEBuilder.prototype.getStatesMatcher = function(mState) {
			return FEBuilder.Matchers.states(mState);
		};

		FEBuilder.prototype.hasState = function(mState) {
			if (!mState) {
				return this;
			}
			// check explicitly for boolean 'false', falsy value does not suffice
			if (mState.visible === false) {
				this.mustBeVisible(false);
				this.mustBeEnabled(false);
			}
			if (mState.enabled === false) {
				this.mustBeEnabled(false);
			}
			return this.has(this.getStatesMatcher(mState));
		};

		FEBuilder.prototype.doPressKeyboardShortcut = function(sShortcut) {
			return this.do(function(oElement) {
				var oNormalizedShortCut = ShortcutHelper.parseShortcut(sShortcut);
				oNormalizedShortCut.type = "keydown";
				oElement.$().trigger(oNormalizedShortCut);
			});
		};

		FEBuilder.getControls = function(vBuilder, bSingle) {
			var oOptions = vBuilder.build(),
				vControls = Opa5.getPlugin().getMatchingControls(oOptions),
				aControls = OpaBuilder.Matchers.filter(oOptions.matchers)(vControls);
			if (bSingle) {
				if (aControls.length > 1) {
					throw new Error("found ambiguous results");
				}
				return aControls.length ? aControls[0] : null;
			}
			return aControls;
		};

		FEBuilder.controlsExist = function(vBuilder) {
			return !!FEBuilder.getControls(vBuilder).length;
		};

		FEBuilder.createClosePopoverBuilder = function(oOpaInstance, vPopoverMatchers, bStrict) {
			return OpaBuilder.create(oOpaInstance).success(function() {
				var bPopoverClosed = false,
					fnCloseCallback = function() {
						bPopoverClosed = true;
					},
					oBuilder = FEBuilder.createPopoverBuilder(oOpaInstance, vPopoverMatchers);

				if (bStrict || FEBuilder.controlsExist(oBuilder)) {
					return oBuilder
						.do(function(oPopover) {
							oPopover.attachEventOnce("afterClose", fnCloseCallback);
							oPopover.close();
						})
						.success(
							OpaBuilder.create(oOpaInstance).check(function() {
								return bPopoverClosed;
							})
						)
						.execute();
				}
			});
		};

		FEBuilder.createPopoverBuilder = function(oOpaInstance, vPopoverMatchers) {
			var oBuilder = OpaBuilder.create(oOpaInstance)
				.hasType("sap.m.Popover")
				.isDialogElement(true)
				.has(function(oPopover) {
					return oPopover.isOpen();
				})
				.checkNumberOfMatches(1);

			if (vPopoverMatchers) {
				oBuilder.has(vPopoverMatchers || []);
			}

			return oBuilder;
		};

		FEBuilder.createMessageToastBuilder = function(sText) {
			return OpaBuilder.create()
				.check(function() {
					var oWindow = Opa5.getWindow();
					return (
						oWindow.sapFEStubs && oWindow.sapFEStubs.getLastToastMessage && oWindow.sapFEStubs.getLastToastMessage() === sText
					);
				})
				.description("Toast message '" + sText + "' was displayed");
		};

		FEBuilder.Matchers = {
			state: function(sName, vValue) {
				if (sName in ElementStates) {
					return ElementStates[sName](vValue);
				}
				var mProperties = {};
				mProperties[sName] = vValue;
				return OpaBuilder.Matchers.properties(mProperties);
			},
			states: function(mStateMap) {
				if (!Utils.isOfType(mStateMap, Object)) {
					return OpaBuilder.Matchers.TRUE;
				}
				return FEBuilder.Matchers.match(
					Object.keys(mStateMap).map(function(sProperty) {
						return FEBuilder.Matchers.state(sProperty, mStateMap[sProperty]);
					})
				);
			},
			match: function(vMatchers) {
				var fnMatch = OpaBuilder.Matchers.match(vMatchers);
				return function(oControl) {
					// ensure that the result is a boolean
					return !!fnMatch(oControl);
				};
			},
			bound: function() {
				return function(oControl) {
					return oControl && !!oControl.getBindingContext();
				};
			},
			allMatch: function(vMatchers) {
				var fnFilterMatcher = OpaBuilder.Matchers.filter(vMatchers);
				return function(aItems) {
					var iExpectedLength = (aItems && aItems.length) || 0;
					return iExpectedLength === fnFilterMatcher(aItems).length;
				};
			},
			someMatch: function(vMatchers) {
				var fnFilterMatcher = OpaBuilder.Matchers.filter(vMatchers);
				return function(aItems) {
					return fnFilterMatcher(aItems).length > 0;
				};
			},
			/**
			 * Creates a matcher function that is identifying a control by id.
			 * The result will be true in case of the string was found, otherwise false.
			 *
			 * @param {string|RegExp} vId string/RegExp to be used for identifying the control
			 * @returns {function} matcher function returning true/false
			 * @public
			 * @static
			 */
			id: function(vId) {
				return function(oControl) {
					if (Utils.isOfType(vId, String)) {
						return oControl.getId() === vId;
					} else {
						return vId.test(oControl.getId());
					}
				};
			},
			/**
			 * Creates a matcher that returns the element at <code>iIndex</code> from input array.
			 * @param {number} iIndex the index of the element to be returned
			 * @returns {function(*=): *}
			 */
			atIndex: function(iIndex) {
				return function(vInput) {
					if (Utils.isOfType(vInput, [null, undefined])) {
						return null;
					}
					vInput = [].concat(vInput);
					return vInput.length > iIndex ? vInput[iIndex] : null;
				};
			}
		};

		FEBuilder.Actions = {};

		return FEBuilder;
	}
);
