/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2017 SAP SE. All rights reserved
    
 */
sap.ui.define(
	[
		"sap/ui/mdc/link/Panel",
		"sap/ui/mdc/link/PanelItem",
		"sap/ui/mdc/LinkDelegate",
		"sap/ui/mdc/link/LinkItem",
		"sap/ui/mdc/link/Factory",
		"sap/ui/mdc/link/Log",
		"sap/base/Log",
		"sap/ui/core/util/XMLPreprocessor",
		"sap/ui/core/XMLTemplateProcessor",
		"sap/ui/core/Fragment",
		"sap/fe/macros/field/FieldHelper",
		"sap/base/util/isPlainObject",
		"sap/ui/mdc/link/SemanticObjectMapping",
		"sap/ui/mdc/link/SemanticObjectMappingItem",
		"sap/ui/mdc/link/SemanticObjectUnavailableAction",
		"sap/fe/core/CommonUtils",
		"sap/fe/navigation/NavigationHelper",
		"sap/base/util/merge",
		"sap/fe/navigation/SelectionVariant",
		"sap/fe/core/CommonUtils"
	],
	function(
		Panel,
		PanelItem,
		LinkDelegate,
		LinkItem,
		Factory,
		Log,
		SapBaseLog,
		XMLPreprocessor,
		XMLTemplateProcessor,
		Fragment,
		FieldHelper,
		isPlainObject,
		SemanticObjectMapping,
		SemanticObjectMappingItem,
		SemanticObjectUnavailableAction,
		CommonHelper,
		NavigationHelper,
		merge,
		SelectionVariant,
		CommonUtils
	) {
		"use strict";
		var SimpleLinkDelegate = Object.assign({}, LinkDelegate);

		/**
		 * This will return an array of the SemanticObjects as strings given by the payload.
		 * @private
		 * @param {Object} oPayload defined by the application
		 * @param {Object} oMetaModel received from the Link
		 * @returns {String[]} containing SemanticObjects based of the payload
		 */
		SimpleLinkDelegate._getEntityType = function(oPayLoad, oMetaModel) {
			if (oMetaModel) {
				return oMetaModel.createBindingContext(oPayLoad.entityType);
			}
		};

		/**
		 * This will return an array of the SemanticObjects as strings given by the payload.
		 * @private
		 * @param {Object} oPayload defined by the application
		 * @param {Object} oMetaModel received from the Link
		 * @returns {String[]} containing SemanticObjects based of the payload
		 */
		SimpleLinkDelegate._getDataField = function(oPayLoad, oMetaModel) {
			return oMetaModel.createBindingContext(oPayLoad.dataField);

			// return oPayLoad.dataField;
		};

		/**
		 * This will return an array of the SemanticObjects as strings given by the payload.
		 * @private
		 * @param {Object} oPayload defined by the application
		 * @param {Object} oMetaModel received from the Link
		 * @returns {String[]} containing SemanticObjects based of the payload
		 */
		SimpleLinkDelegate._getContact = function(oPayLoad, oMetaModel) {
			return oMetaModel.createBindingContext(oPayLoad.contact);
		};

		SimpleLinkDelegate.fnTemplateFragment = function(sFragmentName) {
			var oFragment = XMLTemplateProcessor.loadTemplate(sFragmentName, "fragment");
			var oFragmentModel = {};
			if (this.payLoad.entityType && this._getEntityType(this.payLoad, this.oMetaModel)) {
				oFragmentModel.bindingContexts = {
					"entityType": this._getEntityType(this.payLoad, this.oMetaModel)
				};
				oFragmentModel.models = {
					"entityType": this.oMetaModel
				};
			} else if (this.payLoad.dataField && this._getDataField(this.payLoad, this.oMetaModel)) {
				oFragmentModel.bindingContexts = {
					"dataField": this._getDataField(this.payLoad, this.oMetaModel)
				};
				oFragmentModel.models = {
					"dataField": this.oMetaModel
				};
			} else if (this.payLoad.contact && this._getContact(this.payLoad, this.oMetaModel)) {
				oFragmentModel.bindingContexts = {
					"contact": this._getContact(this.payLoad, this.oMetaModel)
				};
				oFragmentModel.models = {
					"contact": this.oMetaModel
				};
			}

			return Promise.resolve(XMLPreprocessor.process(oFragment, { name: sFragmentName }, oFragmentModel)).then(function(oFragment) {
				return Fragment.load({
					definition: oFragment
				});
			});
		};

		SimpleLinkDelegate.fetchAdditionalContent = function(oPayLoad, oBindingContext) {
			this.payLoad = oPayLoad;
			if (oBindingContext) {
				this.oMetaModel = oBindingContext.getModel().getMetaModel();
				return this.fnTemplateFragment("sap.fe.macros.field.QuickViewLinkDelegate").then(function(oPopoverContent) {
					return [oPopoverContent];
				});
			}
			return Promise.resolve([]);
		};

		/**
		 * Fetches the relevant {@link sap.ui.mdc.link.LinkItem} for the Link and returns them.
		 * @public
		 * @param {Object} oPayload - The Payload of the Link given by the application
		 * @param {Object} oBindingContext - The ContextObject of the Link
		 * @param {Object} oInfoLog - The InfoLog of the Link
		 * @returns {Promise} once resolved an array of {@link sap.ui.mdc.link.LinkItem} is returned
		 */
		SimpleLinkDelegate.fetchLinkItems = function(oPayload, oBindingContext, oInfoLog) {
			if (oBindingContext && SimpleLinkDelegate._getSemanticObjects(oPayload)) {
				var oContextObject = oBindingContext.getObject();
				var aItemsToReturn = [];
				if (oInfoLog) {
					oInfoLog.initialize(SimpleLinkDelegate._getSemanticObjects(oPayload));
					aItemsToReturn.forEach(function(oItem) {
						oInfoLog.addIntent(Log.IntentType.API, {
							text: oItem.getText(),
							intent: oItem.getHref()
						});
					});
				}
				var oSemanticAttributes = SimpleLinkDelegate._calculateSemanticAttributes(oContextObject, oPayload, oInfoLog);
				return SimpleLinkDelegate._retrieveNavigationTargets("", oSemanticAttributes, oPayload, oInfoLog).then(function(
					aLinks,
					oOwnNavigationLink
				) {
					return aLinks;
				});
			} else {
				return Promise.resolve([]);
			}
		};
		/**
		 * Enables the modification of LinkItems before the popover opens. This enables additional parameters
		 * to be added to the link
		 * @param {Object} oPayload - The payload of the Link given by the application
		 * @param {Object} oBindingContext - The binding context of the Link
		 * @param {sap.ui.mdc.link.LinkItem} aLinkItems - The LinkItems of the Link that can be modified
		 * @returns {Promise} once resolved an array of {@link sap.ui.mdc.link.LinkItem} is returned
		 */
		SimpleLinkDelegate.modifyLinkItems = function(oPayload, oBindingContext, aLinkItems) {
			if (aLinkItems.length !== 0) {
				var oLink = aLinkItems[0].getParent();
				var oView = sap.ui.fl.Utils.getViewForControl(oLink);
				var oAppComponent = CommonHelper.getAppComponent(oView);
				var mLineContext = oLink.getBindingContext();
				var oSelectionVariant;
				if (oView.getAggregation("content")[0] && oView.getAggregation("content")[0].getBindingContext()) {
					var mPageContextData = NavigationHelper.removeSensitiveData(oView.getAggregation("content")[0].getBindingContext());
					var oMixedContext = merge({}, mPageContextData, mLineContext.getObject());
					oSelectionVariant = NavigationHelper.mixAttributesAndSelectionVariant(oMixedContext, new SelectionVariant());
				} else {
					var oController = oView.getController();
					var oConditions = oController.filterBarConditions;
					oSelectionVariant = SimpleLinkDelegate._getMergedContext(mLineContext, oConditions);
				}
				return new Promise(function(resolve) {
					oAppComponent.getService("navigation").then(function(oNavigationService) {
						var oURLParsing = Factory.getService("URLParsing");
						if (!oURLParsing) {
							SapBaseLog.error("QuickViewLinkDelegate: Service 'URLParsing' could not be obtained");
							return Promise.reject();
						}
						var sAppStateKey = oNavigationService.saveAppStateWithImmediateReturn(oSelectionVariant);
						var oParams = oNavigationService.getUrlParametersFromSelectionVariant(oSelectionVariant);
						var oShellHash, oNewShellHash;
						aLinkItems.forEach(function(oLink) {
							oShellHash = oURLParsing.parseShellHash(oLink.getHref());
							oNewShellHash = {
								target: { semanticObject: oShellHash.semanticObject, action: oShellHash.action },
								params:
									oShellHash.params["sap-intent-param"] !== undefined
										? Object.assign({ "sap-intent-param": oShellHash.params["sap-intent-param"] }, oParams)
										: oParams,
								appStateKey: sAppStateKey
							};
							oNewShellHash.params = Object.assign(oNewShellHash.params, oShellHash.params);
							delete oNewShellHash.params["sap-xapp-state"];
							oLink.setHref("#" + oURLParsing.constructShellHash(oNewShellHash));
						});
						resolve(aLinkItems);
					});
				});
			} else {
				return Promise.resolve(aLinkItems);
			}
		};

		SimpleLinkDelegate._getMergedContext = function(oContext, oConditions) {
			var oConditionsSV, oSelectionVariant;
			oConditionsSV = CommonUtils.addExternalStateFiltersToSelectionVariant(new SelectionVariant(), oConditions);
			oSelectionVariant = NavigationHelper.mixAttributesAndSelectionVariant(oContext.getObject(), oConditionsSV.toJSONString());
			return NavigationHelper.removeSensitiveData(oContext, oSelectionVariant);
		};

		/**
		 * Checks which attributes of the ContextObject belong to which SemanticObject and maps them into a two dimensional array.
		 * @private
		 * @param {Object} oContextObject the BindingContext of the SourceControl of the Link / of the Link itself if not set
		 * @param {Object} oPayload given by the application
		 * @param {Object} oInfoLog of type {@link sap.ui.mdc.link.Log} - the corresponding InfoLog of the Link
		 * @returns {Object} two dimensional array which maps a given SemanticObject name together with a given attribute name to the value of that given attribute
		 */
		SimpleLinkDelegate._calculateSemanticAttributes = function(oContextObject, oPayload, oInfoLog) {
			var aSemanticObjects = SimpleLinkDelegate._getSemanticObjects(oPayload);
			var mSemanticObjectMappings = SimpleLinkDelegate._convertSemanticObjectMapping(
				SimpleLinkDelegate._getSemanticObjectMappings(oPayload)
			);
			if (!aSemanticObjects.length) {
				aSemanticObjects.push("");
			}

			var oResults = {};
			aSemanticObjects.forEach(function(sSemanticObject) {
				if (oInfoLog) {
					oInfoLog.addContextObject(sSemanticObject, oContextObject);
				}
				oResults[sSemanticObject] = {};
				for (var sAttributeName in oContextObject) {
					var oAttribute = null,
						oTransformationAdditional = null;
					if (oInfoLog) {
						oAttribute = oInfoLog.getSemanticObjectAttribute(sSemanticObject, sAttributeName);
						if (!oAttribute) {
							oAttribute = oInfoLog.createAttributeStructure();
							oInfoLog.addSemanticObjectAttribute(sSemanticObject, sAttributeName, oAttribute);
						}
					}
					// Ignore undefined and null values
					if (oContextObject[sAttributeName] === undefined || oContextObject[sAttributeName] === null) {
						if (oAttribute) {
							oAttribute.transformations.push({
								value: undefined,
								description: "\u2139 Undefined and null values have been removed in SimpleLinkDelegate."
							});
						}
						continue;
					}
					// Ignore plain objects (BCP 1770496639)
					if (isPlainObject(oContextObject[sAttributeName])) {
						if (oAttribute) {
							oAttribute.transformations.push({
								value: undefined,
								description: "\u2139 Plain objects has been removed in SimpleLinkDelegate."
							});
						}
						continue;
					}

					// Map the attribute name only if 'semanticObjectMapping' is defined.
					// Note: under defined 'semanticObjectMapping' we also mean an empty annotation or an annotation with empty record
					var sAttributeNameMapped =
						mSemanticObjectMappings &&
						mSemanticObjectMappings[sSemanticObject] &&
						mSemanticObjectMappings[sSemanticObject][sAttributeName]
							? mSemanticObjectMappings[sSemanticObject][sAttributeName]
							: sAttributeName;

					if (oAttribute && sAttributeName !== sAttributeNameMapped) {
						oTransformationAdditional = {
							value: undefined,
							description:
								"\u2139 The attribute " +
								sAttributeName +
								" has been renamed to " +
								sAttributeNameMapped +
								" in SimpleLinkDelegate.",
							reason:
								"\ud83d\udd34 A com.sap.vocabularies.Common.v1.SemanticObjectMapping annotation is defined for semantic object " +
								sSemanticObject +
								" with source attribute " +
								sAttributeName +
								" and target attribute " +
								sAttributeNameMapped +
								". You can modify the annotation if the mapping result is not what you expected."
						};
					}

					// If more then one local property maps to the same target property (clash situation)
					// we take the value of the last property and write an error log
					if (oResults[sSemanticObject][sAttributeNameMapped]) {
						SapBaseLog.error(
							"SimpleLinkDelegate: The attribute " +
								sAttributeName +
								" can not be renamed to the attribute " +
								sAttributeNameMapped +
								" due to a clash situation. This can lead to wrong navigation later on."
						);
					}

					// Copy the value replacing the attribute name by semantic object name
					oResults[sSemanticObject][sAttributeNameMapped] = oContextObject[sAttributeName];

					if (oAttribute) {
						if (oTransformationAdditional) {
							oAttribute.transformations.push(oTransformationAdditional);
							var aAttributeNew = oInfoLog.createAttributeStructure();
							aAttributeNew.transformations.push({
								value: oContextObject[sAttributeName],
								description:
									"\u2139 The attribute " +
									sAttributeNameMapped +
									" with the value " +
									oContextObject[sAttributeName] +
									" has been added due to a mapping rule regarding the attribute " +
									sAttributeName +
									" in SimpleLinkDelegate."
							});
							oInfoLog.addSemanticObjectAttribute(sSemanticObject, sAttributeNameMapped, aAttributeNew);
						}
					}
				}
			});
			return oResults;
		};

		/**
		 * Retrieves the actual targets for the navigation of the link. This uses the UShell loaded by the {@link sap.ui.mdc.link.Factory} to retrieve
		 * the navigation targets from the FLP service.
		 * @private
		 * @param {String} sAppStateKey key of the appstate (not used yet)
		 * @param {Object} oSemanticAttributes calculated by _calculateSemanticAttributes
		 * @param {Object} oPayload given by the application
		 * @param {Object} oInfoLog of type {@link sap.ui.mdc.link.Log} - the corresponding InfoLog of the Link
		 * @returns {Promise} resolving into availableAtions and ownNavigation containing an array of {@link sap.ui.mdc.link.LinkItem}
		 */
		SimpleLinkDelegate._retrieveNavigationTargets = function(sAppStateKey, oSemanticAttributes, oPayload, oInfoLog) {
			if (!oPayload.semanticObjects) {
				return new Promise(function(resolve) {
					resolve([]);
				});
			}
			var aSemanticObjects = oPayload.semanticObjects;
			var sSourceControlId = oPayload.sourceControl;
			var oNavigationTargets = {
				ownNavigation: undefined,
				availableActions: []
			};
			return sap.ui
				.getCore()
				.loadLibrary("sap.ui.fl", {
					async: true
				})
				.then(function() {
					return new Promise(function(resolve) {
						sap.ui.require(["sap/ui/fl/Utils"], function(Utils) {
							var oCrossApplicationNavigation = Factory.getService("CrossApplicationNavigation");
							var oURLParsing = Factory.getService("URLParsing");
							if (!oCrossApplicationNavigation || !oURLParsing) {
								SapBaseLog.error(
									"SimpleLinkDelegate: Service 'CrossApplicationNavigation' or 'URLParsing' could not be obtained"
								);
								return resolve(oNavigationTargets.availableActions, oNavigationTargets.ownNavigation);
							}
							var oControl = sap.ui.getCore().byId(sSourceControlId);
							var oAppComponent = Utils.getAppComponentForControl(oControl);
							var aParams = aSemanticObjects.map(function(sSemanticObject) {
								return [
									{
										semanticObject: sSemanticObject,
										params: oSemanticAttributes ? oSemanticAttributes[sSemanticObject] : undefined,
										appStateKey: sAppStateKey,
										ui5Component: oAppComponent,
										sortResultsBy: "text"
									}
								];
							});

							return new Promise(function() {
								// We have to wrap getLinks method into Promise. The returned jQuery.Deferred.promise brakes the Promise chain.
								oCrossApplicationNavigation.getLinks(aParams).then(
									function(aLinks) {
										if (!aLinks || !aLinks.length) {
											return resolve(oNavigationTargets.availableActions, oNavigationTargets.ownNavigation);
										}
										var aSemanticObjectUnavailableActions = SimpleLinkDelegate._getSemanticObjectUnavailableActions(
											oPayload
										);
										var oUnavailableActions = SimpleLinkDelegate._convertSemanticObjectUnavailableAction(
											aSemanticObjectUnavailableActions
										);
										var sCurrentHash = oCrossApplicationNavigation.hrefForExternal();
										if (sCurrentHash && sCurrentHash.indexOf("?") !== -1) {
											// sCurrentHash can contain query string, cut it off!
											sCurrentHash = sCurrentHash.split("?")[0];
										}
										if (sCurrentHash) {
											// BCP 1770315035: we have to set the end-point '?' of action in order to avoid matching of "#SalesOrder-manage" in "#SalesOrder-manageFulfillment"
											sCurrentHash += "?";
										}
										// var fnGetDescription = function(sSubTitle, sShortTitle) {
										// 	if (sSubTitle && !sShortTitle) {
										// 		return sSubTitle;
										// 	} else if (!sSubTitle && sShortTitle) {
										// 		return sShortTitle;
										// 	} else if (sSubTitle && sShortTitle) {
										// 		return sSubTitle + " - " + sShortTitle;
										// 	}
										// };

										var fnIsUnavailableAction = function(sSemanticObject, sAction) {
											return (
												!!oUnavailableActions &&
												!!oUnavailableActions[sSemanticObject] &&
												oUnavailableActions[sSemanticObject].indexOf(sAction) > -1
											);
										};
										var fnAddLink = function(oLink) {
											var oShellHash = oURLParsing.parseShellHash(oLink.intent);
											if (fnIsUnavailableAction(oShellHash.semanticObject, oShellHash.action)) {
												return;
											}
											var sHref = oCrossApplicationNavigation.hrefForExternal(
												{ target: { shellHash: oLink.intent } },
												oAppComponent
											);

											if (oLink.intent && oLink.intent.indexOf(sCurrentHash) === 0) {
												// Prevent current app from being listed
												// NOTE: If the navigation target exists in
												// multiple contexts (~XXXX in hash) they will all be skipped
												oNavigationTargets.ownNavigation = new LinkItem({
													href: sHref,
													text: oLink.text
												});
												return;
											}
											var oLinkItem = new LinkItem({
												// As the retrieveNavigationTargets method can be called several time we can not create the LinkItem instance with the same id
												key:
													oShellHash.semanticObject && oShellHash.action
														? oShellHash.semanticObject + "-" + oShellHash.action
														: undefined,
												text: oLink.text,
												description: undefined,
												href: sHref,
												// target: not supported yet
												icon: undefined, //oLink.icon,
												isSuperior: oLink.tags && oLink.tags.indexOf("superiorAction") > -1
											});
											oNavigationTargets.availableActions.push(oLinkItem);

											if (oInfoLog) {
												oInfoLog.addSemanticObjectIntent(oShellHash.semanticObject, {
													intent: oLinkItem.getHref(),
													text: oLinkItem.getText()
												});
											}
										};
										for (var n = 0; n < aSemanticObjects.length; n++) {
											aLinks[n][0].forEach(fnAddLink);
										}
										return resolve(oNavigationTargets.availableActions, oNavigationTargets.ownNavigation);
									},
									function() {
										SapBaseLog.error(
											"SimpleLinkDelegate: '_retrieveNavigationTargets' failed executing getLinks method"
										);
										return resolve(oNavigationTargets.availableActions, oNavigationTargets.ownNavigation);
									}
								);
							});
						});
					});
				});
		};

		/**
		 * This will return an array of the SemanticObjects as strings given by the payload.
		 * @private
		 * @param {Object} oPayload defined by the application
		 * @returns {String[]} containing SemanticObjects based of the payload
		 */
		SimpleLinkDelegate._getSemanticObjects = function(oPayload) {
			return oPayload.semanticObjects ? oPayload.semanticObjects : [];
		};

		/**
		 * This will return an array of {@link sap.ui.mdc.link.SemanticObjectUnavailableAction} depending on the given payload.
		 * @private
		 * @param {Object} oPayload defined by the application
		 * @returns {Object[]} of type {@link sap.ui.mdc.link.SemanticObjectUnavailableAction}
		 */
		SimpleLinkDelegate._getSemanticObjectUnavailableActions = function(oPayload) {
			var aSemanticObjectUnavailableActions = [];
			if (oPayload.semanticObjectUnavailableActions) {
				oPayload.semanticObjectUnavailableActions.forEach(function(oSemanticObjectUnavailableAction) {
					aSemanticObjectUnavailableActions.push(
						new SemanticObjectUnavailableAction({
							semanticObject: oSemanticObjectUnavailableAction.semanticObject,
							actions: oSemanticObjectUnavailableAction.actions
						})
					);
				});
			}
			return aSemanticObjectUnavailableActions;
		};

		/**
		 * This will return an array of {@link sap.ui.mdc.link.SemanticObjectMapping} depending on the given payload.
		 * @private
		 * @param {Object} oPayload defined by the application
		 * @returns {Object[]} of type {@link sap.ui.mdc.link.SemanticObjectMapping}
		 */
		SimpleLinkDelegate._getSemanticObjectMappings = function(oPayload) {
			var aSemanticObjectMappings = [];
			var aSemanticObjectMappingItems = [];
			if (oPayload.semanticObjectMappings) {
				oPayload.semanticObjectMappings.forEach(function(oSemanticObjectMapping) {
					aSemanticObjectMappingItems = [];
					if (oSemanticObjectMapping.items) {
						oSemanticObjectMapping.items.forEach(function(oSemanticObjectMappingItem) {
							aSemanticObjectMappingItems.push(
								new SemanticObjectMappingItem({
									key: oSemanticObjectMappingItem.key,
									value: oSemanticObjectMappingItem.value
								})
							);
						});
					}
					aSemanticObjectMappings.push(
						new SemanticObjectMapping({
							semanticObject: oSemanticObjectMapping.semanticObject,
							items: aSemanticObjectMappingItems
						})
					);
				});
			}
			return aSemanticObjectMappings;
		};

		/**
		 * Converts a given array of SemanticObjectMapping into a Map containing SemanticObjects as Keys and a Map of it's corresponding SemanticObjectMappings as values.
		 * @private
		 * @param {Object[]} aSemanticObjectMappings of type {@link sap.ui.mdc.link.SemanticObjectMapping}
		 * @returns {Map<String, Map<String, String>>} mSemanticObjectMappings
		 */
		SimpleLinkDelegate._convertSemanticObjectMapping = function(aSemanticObjectMappings) {
			if (!aSemanticObjectMappings.length) {
				return undefined;
			}
			var mSemanticObjectMappings = {};
			aSemanticObjectMappings.forEach(function(oSemanticObjectMapping) {
				if (!oSemanticObjectMapping.getSemanticObject()) {
					throw Error(
						"SimpleLinkDelegate: 'semanticObject' property with value '" +
							oSemanticObjectMapping.getSemanticObject() +
							"' is not valid"
					);
				}
				mSemanticObjectMappings[oSemanticObjectMapping.getSemanticObject()] = oSemanticObjectMapping
					.getItems()
					.reduce(function(oMap, oItem) {
						oMap[oItem.getKey()] = oItem.getValue();
						return oMap;
					}, {});
			});
			return mSemanticObjectMappings;
		};

		/**
		 * Converts a given array of SemanticObjectUnavailableActions into a Map containing SemanticObjects as Keys and a Map of it's corresponding SemanticObjectUnavailableActions as values.
		 * @private
		 * @param {Object[]} aSemanticObjectUnavailableActions of type {@link sap.ui.mdc.link.SemanticObjectUnavailableAction}
		 * @returns {Map<String, Map<String, String>>} mSemanticObjectUnavailableActions
		 */
		SimpleLinkDelegate._convertSemanticObjectUnavailableAction = function(aSemanticObjectUnavailableActions) {
			if (!aSemanticObjectUnavailableActions.length) {
				return undefined;
			}
			var mSemanticObjectUnavailableActions = {};
			aSemanticObjectUnavailableActions.forEach(function(oSemanticObjectUnavailableActions) {
				if (!oSemanticObjectUnavailableActions.getSemanticObject()) {
					throw Error(
						"SimpleLinkDelegate: 'semanticObject' property with value '" +
							oSemanticObjectUnavailableActions.getSemanticObject() +
							"' is not valid"
					);
				}
				mSemanticObjectUnavailableActions[
					oSemanticObjectUnavailableActions.getSemanticObject()
				] = oSemanticObjectUnavailableActions.getActions();
			});
			return mSemanticObjectUnavailableActions;
		};

		return SimpleLinkDelegate;
	},
	/* bExport= */ true
);
