/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2020 SAP SE. All rights reserved
    
 */
/* global Promise */
sap.ui.define(
	[
		"sap/ui/core/mvc/ControllerExtension",
		"sap/fe/core/actions/messageHandling",
		"sap/ui/core/XMLTemplateProcessor",
		"sap/ui/core/util/XMLPreprocessor",
		"sap/ui/core/Fragment",
		"sap/fe/core/actions/sticky",
		"sap/fe/core/TransactionHelper",
		"sap/base/Log",
		"sap/m/Text",
		"sap/m/Button",
		"sap/m/Dialog",
		"sap/ui/model/json/JSONModel",
		"sap/ui/core/routing/HashChanger",
		"sap/fe/core/CommonUtils",
		"sap/fe/core/BusyLocker",
		"sap/base/util/merge",
		"sap/fe/core/helpers/SideEffectsUtil",
		"sap/fe/core/library"
	],
	function(
		ControllerExtension,
		messageHandling,
		XMLTemplateProcessor,
		XMLPreprocessor,
		Fragment,
		sticky,
		TransactionHelper,
		Log,
		Text,
		Button,
		Dialog,
		JSONModel,
		HashChanger,
		CommonUtils,
		BusyLocker,
		mergeObjects,
		SideEffectsUtil,
		FELibrary
	) {
		"use strict";

		// TODO: we can't create instances of any
		// controllerExtension within this controllerExtension - therefore as a first workaround we rely on the
		// existence of this.base.routing
		var CreationMode = FELibrary.CreationMode,
			sFragmentName = "sap.fe.core.controls.field.DraftPopOverAdminData",
			oPopoverFragment = XMLTemplateProcessor.loadTemplate(sFragmentName, "fragment"),
			mTransactionHelpers = {}; // Map AppID --> TransactionHelper

		var Extension = ControllerExtension.extend("sap.fe.core.controllerextensions.EditFlow", {
			override: {
				onExit: function() {
					this.getUIStateModel().destroy();
					ControllerExtension.prototype.destroy.apply(this, arguments);
				}
			},

			/**
			 * Performs a task in sync with other tasks created via this function.
			 * Returns the task promise chain.
			 *
			 * @function
			 * @name sap.fe.core.controllerextensions.EditFlow#syncTask
			 * @memberof sap.fe.core.controllerextensions.EditFlow
			 * @static
			 * @param {Promise|function} [vTask] Optional, a promise or function to be executed and waitFor
			 * @returns {Promise} Promise resolves with ???
			 *
			 * @sap-restricted
			 * @final
			 */
			syncTask: function(vTask) {
				var fnNewTask;
				if (vTask instanceof Promise) {
					fnNewTask = function() {
						return vTask;
					};
				} else if (typeof vTask === "function") {
					fnNewTask = vTask;
				}

				this._pTasks = this._pTasks || Promise.resolve();
				if (!!fnNewTask) {
					this._pTasks = this._pTasks.then(fnNewTask).catch(function() {
						return Promise.resolve();
					});
				}

				return this._pTasks;
			},

			getProgrammingModel: function(oContext) {
				return this.getTransactionHelper().getProgrammingModel(oContext);
			},

			/**
			 * Create new document
			 * @function
			 * @name createDocument
			 * @memberof sap.fe.core.controllerextensions.EditFlow
			 * @param {Promise|sap.ui.model.odata.v4.ODataListBinding} vListBinding  ODataListBinding object or a promise that resolve to it
			 * @param {map} [mParameters] Optional, can contain the following attributes:
			 * @param {String} creationMode the creation mode to be used
			 *                    NewPage - the created document is shown in a new page, depending on metadata Sync, Async or Deferred is used
			 *                    Sync - the creation is triggered, once the document is created the navigation is done
			 *                    Async - the creation and the navigation to the instance is done in parallel
			 *                    Deferred - the creation is done at the target page
			 *                    Inline - The creation is done inline (in a table)
			 *                    CreationRow - The creation is done with the special creation row
			 * @param {Object} creationRow instance of the creation row (TODO: get rid but use list bindings only)
			 * @returns {String} the draft admin owner string to be shown
			 */
			createDocument: function(vListBinding, mParameters) {
				var that = this,
					transactionHelper = this.getTransactionHelper(),
					oLockObject = transactionHelper.getUIStateModel(),
					oTable,
					iCountTableItems,
					oResourceBundle = that.base.getView().getController().oResourceBundle,
					bShouldBusyLock =
						!mParameters ||
						(mParameters.creationMode !== CreationMode.Inline && mParameters.creationMode !== CreationMode.CreationRow);
				if (mParameters.creationMode === CreationMode.CreationRow && mParameters.creationRow) {
					oTable = mParameters.creationRow.getParent();
				}
				if (mParameters.creationMode === CreationMode.Inline && mParameters.tableId) {
					oTable = this.getView().byId(mParameters.tableId);
				}

				if (
					mParameters.creationMode === CreationMode.CreationRow &&
					mParameters.creationRow &&
					mParameters.creationRow.getApplyEnabled() === false
				) {
					mParameters.creationRow.setApplyEnabled(false);
				}

				function handleSideEffects(oListBinding, oCreationPromise) {
					oCreationPromise.then(function(oNewContext) {
						var oBindingContext = that.base.getView().getBindingContext();

						// if there are transient contexts, we must avoid requesting side effects
						// this is avoid a potential list refresh, there could be a side effect that refreshes the list binding
						// if list binding is refreshed, transient contexts might be lost
						if (!CommonUtils.hasTransientContext(oListBinding)) {
							that.requestSideEffects(oListBinding.getPath(), oBindingContext);
						}
					});
				}

				bShouldBusyLock && BusyLocker.lock(oLockObject);
				return this.syncTask()
					.then(function() {
						return new Promise(function(resolve, reject) {
							var oGetListBinding, sProgrammingModel, oListBinding, oModel;

							mParameters = mParameters || {};

							if (typeof vListBinding === "object") {
								// we already get a list binding use this one
								oGetListBinding = Promise.resolve(vListBinding);
							} else {
								throw new Error("Binding object expected");
							}

							oGetListBinding
								.then(function(listBinding) {
									oListBinding = listBinding;
									oModel = oListBinding.getModel();
									iCountTableItems = oListBinding.iMaxLength || 0;
									var sCreationMode = mParameters.creationMode;

									// TODO: we will delete this once the UI change for the SD app is created and delivered
									// fow now get the inplace creation mode from the manifest, TODO: shall be a UI change
									if (
										(!sCreationMode || sCreationMode === CreationMode.NewPage) &&
										that.base.getView().getViewData()._creationMode === "Inplace"
									) {
										sCreationMode = CreationMode.Inline;
									}

									return transactionHelper.getProgrammingModel(oListBinding).then(function(programmingModel) {
										sProgrammingModel = programmingModel;
										if (sCreationMode && sCreationMode !== CreationMode.NewPage) {
											// use the passed creation mode
											return sCreationMode;
										} else {
											// we need to determine the creation mode
											switch (sProgrammingModel) {
												case "Draft":
												case "Sticky":
													// NewAction is not yet supported for NavigationProperty collection
													if (!oListBinding.isRelative()) {
														var oMetaModel = oModel.getMetaModel(),
															sPath = oListBinding.getPath(),
															// if NewAction with parameters is present, then creation is 'Deferred'
															// in the absence of NewAction or NewAction with parameters, creation is async
															sNewAction =
																sProgrammingModel === "Draft"
																	? oMetaModel.getObject(
																			sPath + "@com.sap.vocabularies.Common.v1.DraftRoot/NewAction"
																	  )
																	: oMetaModel.getObject(
																			sPath +
																				"@com.sap.vocabularies.Session.v1.StickySessionSupported/NewAction"
																	  ),
															aParameters =
																(sNewAction &&
																	oMetaModel.getObject(
																		"/" + sNewAction + "/@$ui5.overload/0/$Parameter"
																	)) ||
																[];
														// binding parameter (eg: _it) is not considered
														if (aParameters.length > 1) {
															return "Deferred";
														}
													}
													return CreationMode.Async;

												case "NonDraft":
													// TODO: to be checked - for now create them now and then navigate we might also switch to async
													return CreationMode.Sync;
											}
										}
									});
								})
								.then(function(sCreationMode) {
									var oCreation,
										mArgs,
										oCreationRow = mParameters.creationRow,
										oCreationRowContext,
										oValidationCheck = Promise.resolve(),
										oPayload,
										sMetaPath,
										oMetaModel = oModel.getMetaModel();

									if (sCreationMode !== CreationMode.Deferred) {
										if (sCreationMode === CreationMode.CreationRow) {
											oCreationRowContext = oCreationRow.getBindingContext();
											sMetaPath = oMetaModel.getMetaPath(oCreationRowContext.getPath());
											// prefill data from creation row
											oPayload = oCreationRowContext.getObject();
											mParameters.data = {};
											Object.keys(oPayload).forEach(function(sPropertyPath) {
												var oProperty = oMetaModel.getObject(sMetaPath + "/" + sPropertyPath);
												// ensure navigation properties are not part of the payload, deep create not supported
												if (oProperty && oProperty.$kind === "NavigationProperty") {
													return;
												}
												mParameters.data[sPropertyPath] = oPayload[sPropertyPath];
											});
											oValidationCheck = that.checkForValidationErrors(oCreationRowContext);
										}
										if (sCreationMode === CreationMode.CreationRow || sCreationMode === CreationMode.Inline) {
											// in case the creation failed we keep the failed context
											mParameters.keepTransientContextOnFailed = true;
											// busy handling shall be done locally only
											mParameters.busyMode = "Local";

											if (sCreationMode === CreationMode.CreationRow) {
												// currently the mdc table would also lock the creation row - therefore don't
												// lock at all for now
												mParameters.busyMode = "None";
											}
											if (sCreationMode === CreationMode.Inline) {
												// As the transient lines are not fully implemented and some input from UX is missing
												// we deactivate it for Inline and keep it only for the CreationRow which is anyway
												// not yet final
												mParameters.keepTransientContextOnFailed = false;
											}
											// take care on message handling, draft indicator (in case of draft)
											// Attach the create sent and create completed event to the object page binding so that we can react
											that.handleCreateEvents(oListBinding);
										}

										oCreation = oValidationCheck.then(function() {
											if (!mParameters.parentControl) {
												mParameters.parentControl = that.base.getView();
											}
											return transactionHelper.createDocument(oListBinding, mParameters, oResourceBundle);
										});
									}

									var oNavigation = new Promise(function(resolve) {
										switch (sCreationMode) {
											case CreationMode.Deferred:
												that.base.routing
													.navigateForwardToContext(oListBinding, {
														deferredContext: true,
														noHistoryEntry: mParameters.noHistoryEntry,
														editable: true
													})
													.then(function() {
														resolve();
													});
												break;
											case CreationMode.Async:
												that.base.routing
													.navigateForwardToContext(oListBinding, {
														asyncContext: oCreation,
														noHistoryEntry: mParameters.noHistoryEntry,
														editable: true
													})
													.then(function() {
														resolve();
													});
												break;
											case CreationMode.Sync:
												mArgs = {
													noHistoryEntry: mParameters.noHistoryEntry,
													editable: true
												};
												if (sProgrammingModel == "Sticky") {
													mArgs.transient = true;
												}
												oCreation.then(function(oNewDocumentContext) {
													if (!oNewDocumentContext) {
														var oResourceBundle, oNavContainer;
														oResourceBundle = sap.ui.getCore().getLibraryResourceBundle("sap.fe.core");
														oNavContainer = CommonUtils.getAppComponent(that.base.getView()).getRootControl();
														that.base.routing.navigateToMessagePage(
															oResourceBundle.getText("SAPFE_DATA_RECEIVED_ERROR"),
															{
																title: oResourceBundle.getText("SAPFE_ERROR"),
																description: oResourceBundle.getText("SAPFE_CREATION_FAILED_DESCRIPTION"),
																navContainer: oNavContainer
															}
														);
													} else {
														that.base.routing
															.navigateForwardToContext(oNewDocumentContext, mArgs)
															.then(function() {
																resolve();
															});
													}
												});
												break;
											case CreationMode.Inline:
												handleSideEffects(oListBinding, oCreation);
												resolve();
												break;
											case CreationMode.CreationRow:
												// the creation row shall be cleared once the validation check was successful and
												// therefore the POST can be sent async to the backend
												oValidationCheck.then(function() {
													var oCreationRowListBinding = oCreationRowContext.getBinding(),
														oNewTransientContext;

													handleSideEffects(oListBinding, oCreation);

													oNewTransientContext = oCreationRowListBinding.create();
													oCreationRow.setBindingContext(oNewTransientContext);

													// this is needed to avoid console errors TO be checked with model colleagues
													oNewTransientContext.created().catch(function() {
														Log.trace("transient fast creation context deleted");
													});
													oCreationRowContext.delete("$direct");
												});
												resolve();
												break;
											default:
												Log.error("Unhandled creationMode " + sCreationMode);
												break;
										}
									});
									var oLocalUIModel = that.base.getView().getModel("localUI");
									if (sProgrammingModel === "Sticky") {
										oLocalUIModel.setProperty("/sessionOn", true);
									}
									if (oCreation) {
										Promise.all([oCreation, oNavigation]).then(
											function(aParams) {
												that.setEditMode("Editable", true);
												var oNewDocumentContext = aParams[0];
												if (oNewDocumentContext) {
													that.base.routing.setUIStateDirty();

													if (sProgrammingModel === "Sticky") {
														that._handleStickyOn(oNewDocumentContext);
													}
												}
												resolve();
											},
											function() {
												reject();
											}
										);
									} else {
										// resolve directly
										resolve();
									}
								});
						});
					})
					.finally(function() {
						if (oTable && oTable.isA("sap.ui.mdc.Table")) {
							switch (mParameters.createAtEnd) {
								case true:
									if (mParameters.creationMode && mParameters.creationMode === "Inline" && oTable.getThreshold()) {
										oTable.scrollToIndex(oTable.getThreshold());
									} else {
										oTable.scrollToIndex(iCountTableItems + 1);
									}
									break;
								case false:
									oTable.scrollToIndex(0);
									break;
							}
						}
						bShouldBusyLock && BusyLocker.unlock(oLockObject);
					});
			},

			editDocument: function(oContext) {
				var that = this,
					transactionHelper = this.getTransactionHelper(),
					oTables = that.base
						.getView()
						.getController()
						._findTables();
				oTables.forEach(function(table) {
					if (
						table.data("creationMode") &&
						table.data("creationMode") === "CreationRow" &&
						table.getCreationRow().getApplyEnabled() === false
					) {
						table.getCreationRow().setApplyEnabled(false);
					}
				});

				return transactionHelper.editDocument(oContext).then(function(oNewDocumentContext) {
					transactionHelper.getProgrammingModel(oContext).then(function(sProgrammingModel) {
						var bNoHashChange;

						if (sProgrammingModel === "Sticky") {
							var oLocalUIModel = that.base.getView().getModel("localUI");
							oLocalUIModel.setProperty("/sessionOn", true);
							bNoHashChange = true;
						}
						that.setEditMode("Editable", false);

						if (oNewDocumentContext !== oContext) {
							that.handleNewContext(oNewDocumentContext, true, bNoHashChange, true, true, true).then(function() {
								if (sProgrammingModel === "Sticky") {
									// The stickyOn handler must be set after the navigation has been done,
									// as the URL may change in the case of FCL
									that._handleStickyOn(oNewDocumentContext);
								}
							});
						}
					});
				});
			},

			saveDocument: function(oContext) {
				var that = this,
					transactionHelper = this.getTransactionHelper(),
					oResourceBundle = that.base.getView().getController().oResourceBundle;

				// first of all wait until all key-match-requests are done
				return (
					this.syncTask()
						// submit any open changes if there any (although there are validation/parse errors)
						.then(this._submitOpenChanges.bind(this, oContext))
						// check if there are any validation/parse errors
						.then(this.checkForValidationErrors.bind(this, oContext))
						// and finally if all user changes are submitted and valid save the document
						.then(transactionHelper.saveDocument.bind(transactionHelper, oContext, oResourceBundle))
						.then(function(oActiveDocumentContext) {
							return transactionHelper.getProgrammingModel(oContext).then(function(sProgrammingModel) {
								var bNoHashChange;

								if (sProgrammingModel === "Sticky") {
									var oLocalUIModel = that.base.getView().getModel("localUI");
									oLocalUIModel.setProperty("/sessionOn", false);

									that._handleStickyOff(oContext);

									if (oContext.getPath() === oActiveDocumentContext.getPath()) {
										bNoHashChange = true;
									}
								}
								that.setEditMode("Display", false);

								if (oActiveDocumentContext !== oContext) {
									that.handleNewContext(oActiveDocumentContext, true, bNoHashChange, false, true, false);
								}
							});
						})
				);
			},

			cancelDocument: function(oContext, mParameters) {
				var that = this,
					transactionHelper = this.getTransactionHelper(),
					oResourceBundle = that.base.getView().getController().oResourceBundle;

				this.syncTask()
					.then(transactionHelper.cancelDocument.bind(transactionHelper, oContext, mParameters, oResourceBundle))
					.then(function(oActiveDocumentContext) {
						transactionHelper.getProgrammingModel(oContext).then(function(sProgrammingModel) {
							var bNoHashChange;

							if (sProgrammingModel === "Sticky") {
								var oLocalUIModel = that.base.getView().getModel("localUI");
								oLocalUIModel.setProperty("/sessionOn", false);
								that._handleStickyOff(oContext);
								bNoHashChange = true;
							}
							that.setEditMode("Display", false);

							//in case of a new document, the value of hasActiveEntity is returned. navigate back.
							if (!oActiveDocumentContext) {
								that.base.routing.setUIStateDirty();
								that.base.routing.navigateBackFromContext(oContext);
							} else {
								//active context is returned in case of cancel of existing document
								that.handleNewContext(oActiveDocumentContext, true, bNoHashChange, false, true, true);
							}
						});
					});
			},

			requestSideEffects: function(sNavigationProperty, oBindingContext) {
				var oMetaModel = this.base
						.getView()
						.getModel()
						.getMetaModel(),
					sBaseEntityType = "/" + oMetaModel.getObject(oMetaModel.getMetaPath(oBindingContext.getPath()))["$Type"],
					oAnnotations = oMetaModel.getObject(sBaseEntityType + "@"),
					aSideEffects = Object.keys(oAnnotations).filter(function(sAnnotation) {
						return sAnnotation.indexOf("@com.sap.vocabularies.Common.v1.SideEffects") > -1;
					}),
					aSideEffectsToRequest = [],
					aPathExpressions,
					aPropertiesToRequest = [],
					aEntitiesToRequest = [];

				// gather side effects which need to be requested
				aSideEffects.forEach(function(sSideEffect) {
					var oSideEffect = oAnnotations[sSideEffect];
					// if the navigation property is a source entity for any side effect
					if (oSideEffect.SourceEntities) {
						oSideEffect.SourceEntities.forEach(function(oSourceEntity) {
							if (oSourceEntity["$NavigationPropertyPath"] === sNavigationProperty) {
								aSideEffectsToRequest.push(sSideEffect);
							}
						});
					}
					// if at least one of the source properties belongs to the entity type via navigation property
					if (oSideEffect.SourceProperties && aSideEffectsToRequest.indexOf(sSideEffect) === -1) {
						oSideEffect.SourceProperties.forEach(function(oSourceProperty) {
							if (
								aSideEffectsToRequest.indexOf(sSideEffect) === -1 &&
								oSourceProperty["$PropertyPath"].indexOf(sNavigationProperty + "/") === 0
							) {
								aSideEffectsToRequest.push(sSideEffect);
							}
						});
					}
				});
				// assemble the path expressions to be GET from each side effect to be requested
				aSideEffectsToRequest.forEach(function(sSideEffect) {
					var aAdditionalPathExpressions = [],
						oSideEffect = oAnnotations[sSideEffect],
						aTargetProperties = oSideEffect.TargetProperties || [],
						aTargetEntities = oSideEffect.TargetEntities || [];
					// remove duplicate properties
					aTargetProperties = aTargetProperties
						.map(function(oPathExpression) {
							return oPathExpression["$PropertyPath"];
						})
						.filter(function(sPath) {
							return aPropertiesToRequest.indexOf(sPath) < 0;
						});
					// get additional text association values for the properties
					aTargetProperties.forEach(function(sPath) {
						var oTextAnnotation = oMetaModel.getObject(sBaseEntityType + "/" + sPath + "@com.sap.vocabularies.Common.v1.Text");
						if (oTextAnnotation && oTextAnnotation["$Path"]) {
							aAdditionalPathExpressions.push(oTextAnnotation["$Path"]);
						}
					});
					// remove duplicate entities
					aTargetEntities = aTargetEntities
						.map(function(oPathExpression) {
							return oPathExpression["$NavigationPropertyPath"];
						})
						.filter(function(sPath) {
							return aEntitiesToRequest.indexOf(sPath) < 0;
						});
					// add to list of paths to be requested
					aPropertiesToRequest = aPropertiesToRequest.concat(aTargetProperties).concat(aAdditionalPathExpressions);
					aEntitiesToRequest = aEntitiesToRequest.concat(aTargetEntities);
				});
				// gather all unique paths to request in the format of '$PropertyPath' and '$NavigationPropertyPath'
				aPathExpressions = aPropertiesToRequest
					.map(function(sPath) {
						return { "$PropertyPath": sPath };
					})
					.concat(
						aEntitiesToRequest.map(function(sPath) {
							return { "$NavigationPropertyPath": sPath };
						})
					);
				// request
				if (aPathExpressions.length) {
					aPathExpressions = SideEffectsUtil.replaceEmptyNavigationPaths(aPathExpressions);
					// Add additional text associations for the target properties
					aPathExpressions = SideEffectsUtil.addTextProperties(aPathExpressions, oMetaModel, sBaseEntityType);
					// log info for the request being attempted
					SideEffectsUtil.logRequest({ context: oBindingContext, pathExpressions: aPathExpressions });
					oBindingContext.requestSideEffects(aPathExpressions);
				}
			},

			deleteSingleDocument: function(oContext, mParameters) {
				var that = this;

				this._deleteDocumentTransaction(oContext, mParameters).then(function() {
					// Single objet deletion is triggered from an OP header button (not from a list)
					// --> Mark UI dirty and navigate back to dismiss the OP
					that.base.routing.setUIStateDirty();
					that.base.routing.navigateBackFromContext(oContext);
				});
			},

			deleteMultipleDocuments: function(oContext, mParameters) {
				var that = this;

				this._deleteDocumentTransaction(oContext, mParameters).then(function() {
					// Multiple object deletion is triggered from a list
					// First clear the selection in the table as it's not valid any more
					var oTable = that.getView().byId(mParameters.controlId);
					if (oTable && oTable.isA("sap.ui.mdc.Table")) {
						// This shall always be true, be let's be defensive
						oTable.clearSelection();
					}

					// Then require side-effects
					var oBindingContext = that.base.getView().getBindingContext();
					if (oBindingContext && Array.isArray(oContext)) {
						// oContext shall be an array, but let's be defensive
						var oListBinding = oContext[0].getBinding();
						// if there are transient contexts, we must avoid requesting side effects
						// this is avoid a potential list refresh, there could be a side effect that refreshes the list binding
						// if list binding is refreshed, transient contexts might be lost
						if (!CommonUtils.hasTransientContext(oListBinding)) {
							that.requestSideEffects(oListBinding.getPath(), oBindingContext);
						}
					}

					// deleting at least one object should also set the UI to dirty
					that.base.routing.setUIStateDirty();

					// Finally, check if the current state can be impacted by the deletion, i.e. if there's
					// an OP displaying a deleted object. If yes navigate back to dismiss the OP
					var oAppComponent = CommonUtils.getAppComponent(that.base.getView());
					var oRouterProxy = oAppComponent.getRouterProxy();
					var bImpacted = false;
					for (var index = 0; !bImpacted && index < oContext.length; index++) {
						if (oRouterProxy.isCurrentStateImpactedBy(oContext[index].getPath())) {
							bImpacted = true;
							that.base.routing.navigateBackFromContext(oContext[index]);
						}
					}
				});
			},

			_deleteDocumentTransaction: function(oContext, mParameters) {
				var that = this,
					oLocalUIModel = this.base.getView().getModel("localUI"),
					oResourceBundle = this.base.getView().getController().oResourceBundle,
					transactionHelper = this.getTransactionHelper();

				mParameters = mParameters || {};

				return this.syncTask()
					.then(transactionHelper.deleteDocument.bind(transactionHelper, oContext, mParameters, oLocalUIModel, oResourceBundle))
					.then(function() {
						var oLocalUIModel = that.base.getView().getModel("localUI");
						oLocalUIModel.setProperty("/sessionOn", false);
					});
			},

			applyDocument: function(oContext) {
				var that = this,
					oUIModel = this.getTransactionHelper().getUIStateModel(),
					oResourceBundle = this.base.getView().getController().oResourceBundle;

				BusyLocker.lock(oUIModel);

				return this._submitOpenChanges(oContext)
					.then(function() {
						messageHandling.showUnboundMessages();
						that.base.routing.navigateBackFromContext(oContext);
						return true;
					})
					.catch(function(err) {
						var aCustomMessages = [];
						aCustomMessages.push({
							text: CommonUtils.getTranslatedText("SAPFE_APPLY_ERROR", oResourceBundle),
							type: "Error"
						});
						messageHandling.showUnboundMessages(aCustomMessages);
						return false;
					})
					.finally(function() {
						BusyLocker.unlock(oUIModel);
					});
			},

			_submitOpenChanges: function(oContext) {
				var oModel = oContext.getModel(),
					oView = this.base && this.base.getView(),
					oLocalUIModel = oView && oView.getModel("localUI"),
					aBatchGroups = oLocalUIModel.getProperty("/batchGroups");

				if (!aBatchGroups.length) {
					return Promise.resolve();
				}

				// we submit all our known update batch groups
				var aPromises = [];
				aBatchGroups.forEach(function(sGroupId) {
					aPromises.push(oModel.submitBatch(sGroupId));
				});

				return Promise.all(aPromises).then(function() {
					if (aBatchGroups.some(oModel.hasPendingChanges.bind(oModel))) {
						// the submit was not successful
						return Promise.reject("submit of open changes failed");
					}
				});
			},

			_handleStickyOn: function(oContext) {
				var that = this,
					oAppComponent = CommonUtils.getAppComponent(this.base.getView());

				if (!this.bStickyOn) {
					this.bStickyOn = true;

					var sHashTracker = HashChanger.getInstance().getHash(),
						oLocalUIModel = this.base.getView().getModel("localUI");

					// Set a guard in the RouterProxy
					// A timeout is necessary, as with deferred creation the hashChanger is not updated yet with
					// the new hash, and the guard cannot be found in the managed history of the router proxy
					setTimeout(function() {
						oAppComponent.getRouterProxy().setNavigationGuard();
					}, 0);

					if (sap.ushell) {
						// Setting back navigation on shell service, to get the dicard message box in case of sticky
						oAppComponent.getService("ShellUIService").then(function(oShellService) {
							oShellService.setBackNavigation(that.onBackNavigationInSession.bind(that));
						});

						this.fnDirtyStateProvider = function() {
							var sTargetHash = HashChanger.getInstance().getHash(),
								oRouterProxy = oAppComponent.getRouterProxy(),
								bDirty,
								bSessionON = oLocalUIModel.getProperty("/sessionOn");

							// This if block is a workaround to not show the data loss popover in case of explace navigation
							// TODO : We need to remove the below if block once FLP provide the solution to FIORITECHP1-14400
							if (oLocalUIModel.getProperty("/IBN_OpenInNewTable")) {
								oLocalUIModel.setProperty("/IBN_OpenInNewTable", false);
								return;
							}

							if (!bSessionON) {
								// If the sticky session was terminated before hand.
								// Eexample in case of navigating away from application using IBN.
								return;
							}

							if (!oRouterProxy.isNavigationFinalized()) {
								// If navigation is currently happening in RouterProxy, it's a transient state
								// (not dirty)
								bDirty = false;
								sHashTracker = sTargetHash;
							} else if (sHashTracker === sTargetHash) {
								// the hash didn't change so either the user attempts to refresh or to leave the app
								bDirty = true;
							} else if (oRouterProxy.checkHashWithGuard(sTargetHash) || oRouterProxy.isGuardCrossAllowedByUser()) {
								// the user attempts to navigate within the root object
								// or crossing the guard has already been allowed by the RouterProxy
								sHashTracker = sTargetHash;
								bDirty = false;
							} else {
								// the user attempts to navigate within the app, for example back to the list report
								bDirty = true;
							}

							if (bDirty) {
								// the FLP doesn't call the dirty state provider anymore once it's dirty, as they can't
								// change this due to compatibility reasons we set it back to not-dirty
								setTimeout(function() {
									sap.ushell.Container.setDirtyFlag(false);
								}, 0);
							}

							return bDirty;
						};

						sap.ushell.Container.registerDirtyStateProvider(this.fnDirtyStateProvider);
					}

					var i18nModel = this.base.getView().getModel("sap.fe.i18n");

					this.fnHandleSessionTimeout = function() {
						// remove transient messages since we will showing our own message
						messageHandling.removeBoundTransitionMessages();
						messageHandling.removeUnboundTransitionMessages();

						var oDialog = new Dialog({
							title: "{sap.fe.i18n>OBJECT_PAGE_SESSION_EXPIRED_DIALOG_TITLE}",
							state: "Warning",
							content: new Text({ text: "{sap.fe.i18n>OBJECT_PAGE_SESSION_EXPIRED_DIALOG_MESSAGE}" }),
							beginButton: new Button({
								text: "{sap.fe.i18n>SAPFE_OK}",
								type: "Emphasized",
								press: function() {
									// remove sticky handling after navigation since session has already been terminated
									that._handleStickyOff();
									that.base.routing.navigateBackFromContext(oContext);
								}
							}),
							afterClose: function() {
								oDialog.destroy();
							}
						});
						oDialog.addStyleClass("sapUiContentPadding");
						oDialog.setModel(i18nModel, "sap.fe.i18n");
						that.base.getView().addDependent(oDialog);
						oDialog.open();
					};
					// handle session timeout
					this.base
						.getView()
						.getModel()
						.attachSessionTimeout(this.fnHandleSessionTimeout);

					this.fnStickyDiscardAfterNavigation = function() {
						var sCurrentHash = HashChanger.getInstance().getHash();
						// either current hash is empty so the user left the app or he navigated away from the object
						if (!sCurrentHash || !oAppComponent.getRouterProxy().checkHashWithGuard(sCurrentHash)) {
							that.fnStickyDiscard(oContext);
						}
					};
					this.base.routing.attachOnAfterNavigation(this.fnStickyDiscardAfterNavigation);
				}
			},
			_handleStickyOff: function() {
				var oAppComponent = CommonUtils.getAppComponent(this.base.getView());

				if (oAppComponent.getRouterProxy) {
					// If we have exited from the app, CommonUtils.getAppComponent doesn't return a
					// sap.fe.core.AppComponent, hence the 'if' above
					oAppComponent.getRouterProxy().discardNavigationGuard();
				}

				if (sap.ushell) {
					if (this.fnDirtyStateProvider) {
						sap.ushell.Container.deregisterDirtyStateProvider(this.fnDirtyStateProvider);
						this.fnDirtyStateProvider = null;
					}
				}

				if (this.base.getView().getModel() && this.fnHandleSessionTimeout) {
					this.base
						.getView()
						.getModel()
						.detachSessionTimeout(this.fnHandleSessionTimeout);
				}

				this.base.routing.detachOnAfterNavigation(this.fnStickyDiscardAfterNavigation);
				this.fnStickyDiscardAfterNavigation = null;

				this.setEditMode("Display", false);
				this.bStickyOn = false;
				if (oAppComponent.getService) {
					// If we have exited from the app, CommonUtils.getAppComponent doesn't return a
					// sap.fe.core.AppComponent, hence the 'if' above
					oAppComponent.getService("ShellUIService").then(function(oShellService) {
						oShellService.setBackNavigation();
					});
				}
			},

			handleNewContext: function(oContext, bNoHistoryEntry, bNoHashChange, bEditable, bPersistOPScroll, bUseHash) {
				this.base.routing.setUIStateDirty();

				return this.base.routing.navigateToContext(oContext, {
					noHistoryEntry: bNoHistoryEntry,
					noHashChange: bNoHashChange,
					editable: bEditable,
					bPersistOPScroll: bPersistOPScroll,
					useHash: bUseHash
				});
			},

			/**
			 * Invokes an action - bound/unbound and sets the page dirty
			 * @function
			 * @static
			 * @name sap.fe.core.controllerextensions.EditFlow.onCallAction
			 * @memberof sap.fe.core.controllerextensions.EditFlow
			 * @param {string} sActionName The name of the action to be called
			 * @param {map} [mParameters] contains the following attributes:
			 * @param {sap.ui.model.odata.v4.Context} [mParameters.contexts] contexts Mandatory for a bound action, Either one context or an array with contexts for which the action shall be called
			 * @param {sap.ui.model.odata.v4.ODataModel} [mParameters.model] oModel Mandatory for an unbound action, An instance of an OData v4 model
			 * @sap-restricted
			 * @final
			 **/
			onCallAction: function(sActionName, mParameters) {
				var that = this,
					transactionHelper = this.getTransactionHelper();
				mParameters.localUIModel = that.base.getView().getModel("localUI");

				if (!mParameters.parentControl) {
					mParameters.parentControl = this.base.getView();
				}

				return this.syncTask()
					.then(transactionHelper.onCallAction.bind(transactionHelper, sActionName, mParameters))
					.then(function() {
						/*
					 We set the (upper) pages to dirty after an execution of an action
					 TODO: get rid of this workaround
					 This workaround is only needed as long as the model does not support the synchronization.
					 Once this is supported we don't need to set the pages to dirty anymore as the context itself
					 is already refreshed (it's just not reflected in the object page)
					 we explicitly don't call this method from the list report but only call it from the object page
					 as if it is called in the list report it's not needed - as we anyway will remove this logic
					 we can live with this
					 we need a context to set the upper pages to dirty - if there are more than one we use the
					 first one as they are anyway siblings
					 */
						if (mParameters.contexts) {
							that.base.routing.setUIStateDirty();
						}
					});
			},

			/**
			 * Method to format the text of draft admin owner
			 * @function
			 * @name formatDraftOwnerText
			 * @memberof sap.fe.core.controllerextensions.EditFlow
			 * @param {String} sDraftInProcessByUser DraftInProcessByUser property of Draft DraftAdministrativeData
			 * @param {String} sDraftInProcessByUserDesc DraftInProcessByUserDesc property of Draft DraftAdministrativeData
			 * @param {String} sDraftLastChangedByUser DraftLastChangedByUser property of Draft DraftAdministrativeData
			 * @param {String} sDraftLastChangedByUserDesc DraftLastChangedByUserDesc property of Draft DraftAdministrativeData
			 * @param {String} sFlag flag to differanciate between the point of method calls
			 * @returns {String} the draft admin owner string to be shown
			 */
			formatDraftOwnerText: function(
				sDraftInProcessByUser,
				sDraftInProcessByUserDesc,
				sDraftLastChangedByUser,
				sDraftLastChangedByUserDesc,
				sFlag
			) {
				var sDraftOwnerDescription = "";

				var sUserDescription =
					sDraftInProcessByUserDesc || sDraftInProcessByUser || sDraftLastChangedByUserDesc || sDraftLastChangedByUser;
				if (sFlag) {
					sDraftOwnerDescription += sDraftInProcessByUser
						? CommonUtils.getTranslatedText("DRAFTINFO_GENERIC_LOCKED_OBJECT_POPOVER_TEXT") + " "
						: CommonUtils.getTranslatedText("DRAFTINFO_LAST_CHANGE_USER_TEXT") + " ";
				}
				sDraftOwnerDescription += sUserDescription
					? CommonUtils.getTranslatedText("DRAFTINFO_OWNER", null, [sUserDescription])
					: CommonUtils.getTranslatedText("DRAFTINFO_ANOTHER_USER");
				return sDraftOwnerDescription;
			},

			formatDraftOwnerTextInline: function(
				sDraftInProcessByUser,
				sDraftLastChangedByUser,
				sDraftInProcessByUserDesc,
				sDraftLastChangedByUserDesc
			) {
				return this.formatDraftOwnerText(
					sDraftInProcessByUser,
					sDraftInProcessByUserDesc,
					sDraftLastChangedByUser,
					sDraftLastChangedByUserDesc,
					false
				);
			},
			formatDraftOwnerTextInPopover: function(
				sDraftInProcessByUser,
				sDraftLastChangedByUser,
				sDraftInProcessByUserDesc,
				sDraftLastChangedByUserDesc
			) {
				return this.formatDraftOwnerText(
					sDraftInProcessByUser,
					sDraftInProcessByUserDesc,
					sDraftLastChangedByUser,
					sDraftLastChangedByUserDesc,
					true
				);
			},

			/**
			 * Method to be executed on click of the link
			 * @function
			 * @name onDraftLinkPressed
			 * @memberof sap.fe.core.controllerextensions.EditFlow
			 * @param {Event} oEvent event object passed from the click event
			 * @param {String} sEntitySet Name of the entity set for on the fly templating
			 */
			onDraftLinkPressed: function(oEvent, sEntitySet) {
				var that = this,
					oButton = oEvent.getSource(),
					oBindingContext = oButton.getBindingContext(),
					oView = this.base.getView(),
					oMetaModel = oView.getModel().getMetaModel(),
					oController = oView.getController(),
					fnOpenPopover = function() {
						var oPopoverDraftInfoModel = that._oPopover.getModel("draftInfo");
						oPopoverDraftInfoModel.setProperty("/bIsActive", oBindingContext.getProperty("IsActiveEntity"));
						oPopoverDraftInfoModel.setProperty("/bHasDraft", oBindingContext.getProperty("HasDraftEntity"));
						that._oPopover.getModel().bindContext(oBindingContext.getPath(), undefined, { $$groupId: "$auto.veryHigh" });
						that._oPopover.openBy(oButton);
					};
				if (!this._oPopover || !this._oPopover.oPopup) {
					Promise.resolve(
						that._oFragment ||
							XMLPreprocessor.process(
								oPopoverFragment,
								{ name: sFragmentName },
								{
									bindingContexts: {
										entitySet: oMetaModel.createBindingContext("/" + sEntitySet)
									},
									models: {
										entitySet: oMetaModel
									}
								}
							)
					)
						.then(function(oFragment) {
							//Remember as we can't template the same fragment twice
							that._oFragment = oFragment;
							return Fragment.load({ definition: oFragment, controller: oController });
						})
						.then(function(oPopover) {
							that._oPopover = oPopover;
							oView.addDependent(that._oPopover);
							var oPopoverDraftInfoModel = new JSONModel({
								bIsActive: undefined,
								bHasDraft: undefined
							});
							that._oPopover.setModel(oPopoverDraftInfoModel, "draftInfo");
							fnOpenPopover();
						});
				} else {
					fnOpenPopover();
				}
			},

			/**
			 * Method to be executed on click of the close button of the draft admin data popover
			 * @function
			 * @name closeDraftAdminPopover
			 * @memberof sap.fe.core.controllerextensions.EditFlow
			 */
			closeDraftAdminPopover: function() {
				this._oPopover.close();
			},

			/**
			 * handles the patchSent event: shows messages and in case of draft updates draft indicator
			 * @function
			 * @name handlePatchSent
			 * @memberof sap.fe.core.controllerextensions.EditFlow
			 */
			handlePatchSent: function(oEvent) {
				var transactionHelper = this.getTransactionHelper(),
					oTransactionStateModel = transactionHelper.getUIStateModel(),
					oBinding = oEvent.getSource();
				transactionHelper.handleDocumentModifications();
				// for the time being until the model does the synchronization we set the context to dirty
				// therefore the list report is refreshed. once the model does the synchronization this coding
				// needs to be removed
				this.base.routing.setUIStateDirty();
				return transactionHelper.getProgrammingModel(oBinding).then(function(sProgrammingModel) {
					if (sProgrammingModel === "Draft") {
						oTransactionStateModel.setProperty("/draftStatus", "Saving");
					}
				});
			},

			/**
			 * handles the patchCompleted event: shows messages and in case of draft updates draft indicator
			 * @function
			 * @name handlePatchCompleted
			 * @memberof sap.fe.core.controllerextensions.EditFlow
			 */
			handlePatchCompleted: function(oEvent) {
				var transactionHelper = this.getTransactionHelper(),
					oTransactionStateModel = transactionHelper.getUIStateModel(),
					oBinding = oEvent.getSource(),
					bSuccess = oEvent.getParameter("success");
				messageHandling.showUnboundMessages();
				return transactionHelper.getProgrammingModel(oBinding).then(function(sProgrammingModel) {
					if (sProgrammingModel === "Draft") {
						oTransactionStateModel.setProperty("/draftStatus", bSuccess ? "Saved" : "Clear");
					}
				});
			},

			/**
			 * handles the create event: shows messages and in case of draft updates draft indicator
			 * @function
			 * @name handleCreateEvents
			 * @memberof sap.fe.core.controllerextensions.EditFlow
			 * @param {Object} oBinding odata list binding object
			 */
			handleCreateEvents: function(oBinding) {
				var transactionHelper = this.getTransactionHelper(),
					oTransactionStateModel = transactionHelper.getUIStateModel();

				oTransactionStateModel.setProperty("/draftStatus", "Clear");

				return transactionHelper.getProgrammingModel(oBinding).then(function(sProgrammingModel) {
					oBinding = (oBinding.getBinding && oBinding.getBinding()) || oBinding;
					oBinding.attachEvent("createSent", function() {
						transactionHelper.handleDocumentModifications();
						if (sProgrammingModel === "Draft") {
							oTransactionStateModel.setProperty("/draftStatus", "Saving");
						}
					});
					oBinding.attachEvent("createCompleted", function(event) {
						if (sProgrammingModel === "Draft") {
							oTransactionStateModel.setProperty("/draftStatus", event.getParameter("success") ? "Saved" : "Clear");
						}
						messageHandling.showUnboundMessages();
					});
				});
			},

			/**
			 * handles the errors from the table in list report and object page
			 * @function
			 * @name handleErrorOfTable
			 * @memberof sap.fe.core.controllerextensions.EditFlow
			 * @param {Object} oEvent Event object
			 */
			handleErrorOfTable: function(oEvent) {
				if (oEvent.getParameter("error")) {
					// show the unbound messages but with a timeout as the messages are otherwise not yet in the message model
					setTimeout(messageHandling.showUnboundMessages, 0);
				}
			},

			/**
			 * Method to retrieve the UI State Model (public API of the model to be described)
			 * @function
			 * @name getUIStateModel
			 * @memberof sap.fe.core.controllerextensions.EditFlow
			 * @returns {sap.ui.model.json.JSONModel} One-Way-Binding UI State Model
			 */
			getUIStateModel: function(oInitialData) {
				if (!this.editFlowStateModel) {
					// create a local state model
					this.editFlowStateModel = new JSONModel({
						createMode: false
					});
				}
				if (oInitialData) {
					this.editFlowStateModel.setData(mergeObjects(this.editFlowStateModel.getData(), oInitialData));
				}
				return this.editFlowStateModel;
			},

			/**
			 * The method decided if a document is to be shown in display or edit mode
			 * @function
			 * @name computeEditMode
			 * @memberof sap.fe.core.controllerextensions.EditFlow
			 * @param {sap.ui.model.odata.v4.Context} context The context to be displayed / edited
			 * @returns {Promise} Promise resolves once the edit mode is computed
			 */

			computeEditMode: function(oContext) {
				var that = this;

				return new Promise(function(resolve, reject) {
					var oEditFlowStateModel = that.getUIStateModel();

					that.getTransactionHelper()
						.getProgrammingModel(oContext)
						.then(function(sProgrammingModel) {
							if (sProgrammingModel === "Draft") {
								oContext.requestObject("IsActiveEntity").then(function(bIsActiveEntity) {
									if (bIsActiveEntity === false) {
										// in case the document is draft set it in edit mode
										that.setEditMode("Editable");
										oContext.requestObject("HasActiveEntity").then(function(bHasActiveEntity) {
											// the create mode is only relevant for the local state model
											if (bHasActiveEntity) {
												oEditFlowStateModel.setProperty("/createMode", false);
											} else {
												oEditFlowStateModel.setProperty("/createMode", true);
											}
											resolve();
										});
									} else {
										// active document, stay on display mode
										that.setEditMode("Display");
										resolve();
									}
								});
							} else {
								// in sticky or non-draft nothing to be computed
								resolve();
							}
						});
				});
			},

			/**
			 * Sets the edit mode
			 * @function
			 * @name setEditMode
			 * @memberof sap.fe.core.controllerextensions.EditFlow
			 * @param {String} editMode
			 * @param {Boolean} createMode flag to identify the creation mode
			 */
			setEditMode: function(sEditMode, bCreationMode) {
				var oEditFlowStateModel = this.getUIStateModel(),
					oTransactionStateModel = this.getTransactionHelper().getUIStateModel();

				if (sEditMode) {
					// the edit mode has to be set globally
					oTransactionStateModel.setProperty("/editMode", sEditMode);
				}

				if (bCreationMode !== undefined) {
					// the creation mode is only relevant for the local state model
					oEditFlowStateModel.setProperty("/createMode", bCreationMode);
				}
			},

			/**
			 * Checks if there are validation (parse) errors for controls bound to a given context
			 * @function
			 * @name hasValidationError
			 * @memberof sap.fe.core.controllerextensions.EditFlow
			 * @param {sap.ui.model.odata.v4.Context} context which should be checked
			 * @returns {Promise} Promise resolves if there are no validation errors and rejects if there are any
			 */

			checkForValidationErrors: function(oContext) {
				return this.syncTask().then(function() {
					var sPath = oContext.getPath(),
						aMessages = sap.ui
							.getCore()
							.getMessageManager()
							.getMessageModel()
							.getData(),
						oControl,
						oMessage;

					for (var i = 0; i < aMessages.length; i++) {
						oMessage = aMessages[i];
						if (oMessage.validation) {
							oControl = sap.ui.getCore().byId(oMessage.getControlId());
							if (
								oControl &&
								oControl.getBindingContext() &&
								oControl
									.getBindingContext()
									.getPath()
									.indexOf(sPath) === 0
							) {
								return Promise.reject("validation errors exist");
							}
						}
					}
				});
			},

			getTransactionHelper: function() {
				if (!this._oTransactionHelper) {
					var oAppComponent = CommonUtils.getAppComponent(this.base.getView()),
						sAppComponentId = oAppComponent.getId();

					// check if a transactionHelper is already created for this app
					// TODO use factory pattern
					if (!mTransactionHelpers[sAppComponentId]) {
						var oHelper = new TransactionHelper();
						oHelper.initialize(oAppComponent);
						mTransactionHelpers[sAppComponentId] = oHelper;
					}

					this._oTransactionHelper = mTransactionHelpers[sAppComponentId];
				}

				return this._oTransactionHelper;
			},
			/**
			 * Method to bring discard popover in case of exiting sticky session.
			 * @function
			 * @name onBackNavigationInSession
			 * @memberof sap.fe.core.controllerextensions.EditFlow
			 */
			onBackNavigationInSession: function() {
				var that = this,
					oView = that.base.getView(),
					oAppComponent = CommonUtils.getAppComponent(oView),
					oRouterProxy = oAppComponent.getRouterProxy();

				if (oRouterProxy.checkIfBackIsOutOfGuard()) {
					var oBindingContext = oView && oView.getBindingContext();

					that.getTransactionHelper()
						.getProgrammingModel(oBindingContext)
						.then(function(programmingModel) {
							CommonUtils.processDataLossConfirmation(
								function() {
									that.fnStickyDiscard(oBindingContext);
									history.back();
								},
								oView,
								programmingModel
							);
						});
					return;
				}
				history.back();
			},
			fnStickyDiscard: function(oContext) {
				sticky.discardDocument(oContext);
				this._handleStickyOff();
			}
		});

		/**
		 * Deletes the TransactionHelper for a given application
		 */
		Extension.onExitApplication = function(sAppId) {
			var oTransactionHelper = mTransactionHelpers[sAppId];
			oTransactionHelper && oTransactionHelper.destroy();
			delete mTransactionHelpers[sAppId];
		};

		return Extension;
	}
);
