/* global Promise */
sap.ui.define(
	[
		"sap/ui/base/Object",
		"sap/fe/core/actions/draft",
		"sap/fe/core/actions/sticky",
		"sap/fe/core/actions/operations",
		"sap/fe/core/model/DraftModel",
		"sap/ui/model/json/JSONModel",
		"sap/fe/core/actions/messageHandling",
		"sap/m/Popover",
		"sap/m/VBox",
		"sap/m/CheckBox",
		"sap/m/Text",
		"sap/m/Button",
		"sap/m/MessageToast",
		"sap/m/Dialog",
		"sap/ui/model/BindingMode",
		"sap/base/Log",
		"sap/ui/core/message/Message",
		"sap/fe/core/CommonUtils",
		"sap/fe/core/BusyLocker",
		"sap/fe/core/helpers/SideEffectsUtil"
	],
	function(
		BaseObject,
		draft,
		sticky,
		operations,
		DraftModel,
		JSONModel,
		messageHandling,
		Popover,
		VBox,
		CheckBox,
		Text,
		Button,
		MessageToast,
		Dialog,
		BindingMode,
		Log,
		Message,
		CommonUtils,
		BusyLocker,
		SideEffectsUtil
	) {
		"use strict";

		/* Constants for Programming models */
		var enumProgrammingModel = {
			DRAFT: "Draft",
			STICKY: "Sticky",
			NON_DRAFT: "NonDraft"
		};

		/* Make sure that the mParameters is not the oEvent */
		function getParameters(mParameters) {
			if (mParameters && mParameters.getMetadata && mParameters.getMetadata().getName() === "sap.ui.base.Event") {
				mParameters = {};
			}
			return mParameters || {};
		}

		return BaseObject.extend("sap.fe.core.TransactionHelper", {
			_bIsModified: false,
			_bCreateMode: false,
			_oAppComponent: null,
			_oResourceBundle: null,

			initialize: function(oAppComponent) {
				this._oAppComponent = oAppComponent;
			},

			destroy: function() {
				this.getUIStateModel().destroy();
				BaseObject.prototype.destroy.apply(this, arguments);
			},

			getProgrammingModel: function(oBinding) {
				var that = this,
					oModel = oBinding.getModel(),
					sMetaPath = oBinding
						.getModel()
						.getMetaModel()
						.getMetaPath(oBinding.getPath()),
					oEntityContainer;

				if (!this.sProgrammingModel) {
					return DraftModel.upgradeOnDemand(oModel).then(function(bIsDraft) {
						if (bIsDraft) {
							that.sProgrammingModel = enumProgrammingModel.DRAFT;
						} else if (oModel.getMetaModel().getObject(sMetaPath + "@com.sap.vocabularies.Session.v1.StickySessionSupported")) {
							that.sProgrammingModel = enumProgrammingModel.STICKY;
						} else {
							// if the entity set of the binding is not sticky we have to scan through all entity sets as sticky is annotated only on the root
							oEntityContainer = oBinding
								.getModel()
								.getMetaModel()
								.getObject("/");
							for (var sEntitySet in oEntityContainer) {
								if (oEntityContainer[sEntitySet].$kind === "EntitySet") {
									if (
										oModel
											.getMetaModel()
											.getObject("/" + sEntitySet + "@com.sap.vocabularies.Session.v1.StickySessionSupported")
									) {
										that.sProgrammingModel = enumProgrammingModel.STICKY;
										return that.sProgrammingModel;
									}
								}
							}

							that.sProgrammingModel = enumProgrammingModel.NON_DRAFT;
						}

						return that.sProgrammingModel;
					});
				} else {
					return Promise.resolve(this.sProgrammingModel);
				}
			},

			/**
			 * returns the UI State model and creates it if not yet existing
			 *
			 * @function
			 * @name sap.fe.core.TransactionHelper#getUIStateModel
			 * @memberof sap.fe.core.TransactionHelper
			 * @static
			 * @returns {sap.ui.model.json.JSONModel} Instance of the UI-State Model
			 *
			 * @sap-restricted
			 * @final
			 */
			getUIStateModel: function() {
				if (!this.uiModel) {
					this.uiModel = new JSONModel({
						editMode: "Display",
						busy: false,
						busyLocal: {},
						draftStatus: "Clear"
					});
					// we expose it as an OneWay-Binding model
					this.uiModel.setDefaultBindingMode(BindingMode.OneWay);
				}
				return this.uiModel;
			},

			/**
			 * sets the UI State model to be used
			 *
			 * @function
			 * @name sap.fe.core.TransactionHelper#setUIStateModel
			 * @memberof sap.fe.core.TransactionHelper
			 * @static
			 * @param {sap.ui.model.json.JSONModel} Instance of the UI-State Model
			 *
			 * @sap-restricted
			 * @final
			 */
			setUIStateModel: function(oUIStateModel) {
				this.uiModel = oUIStateModel;
			},

			// Slim Busy Helper Functions
			isBusy: function(sMode, sLocalId) {
				var oUIModel = this.getUIStateModel();
				return BusyLocker.isLocked(oUIModel, sMode === "Global" ? undefined : sLocalId);
			},
			busyHandler: function(sMode, sLocalId, bOn) {
				var sCommand = bOn ? "lock" : "unlock";
				if (sMode === "Global" || sMode === "Local") {
					BusyLocker[sCommand](this.getUIStateModel(), sMode === "Global" ? "/busy" : "/busyLocal/" + sLocalId);
				}
			},
			busyOn: function(sMode, sLocalId) {
				this.busyHandler(sMode, sLocalId, true);
			},
			busyOff: function(sMode, sLocalId) {
				this.busyHandler(sMode, sLocalId, false);
			},

			/**
			 * Creates a new document
			 *
			 * @function
			 * @name sap.fe.core.TransactionHelper#createDocument
			 * @memberof sap.fe.core.TransactionHelper
			 * @static
			 * @param {sap.ui.model.odata.v4.ODataListBinding} OData v4 ListBinding object
			 * @param {map} [mParameters] Optional, can contain the following attributes:
			 * @param {boolean} [mParameters.refreshList] control if the list shall be refreshed immediately after creating the instance
			 * @param {map} [mParameters.data] a map of data that should be sent within the POST
			 * @param {string} [mParameters.busyMode] Global (default), Local, None TODO: to be refactored
			 * @param {map} [mParameters.keepTransientContextOnFailed] if set the context stays in the list if the POST failed and POST will be repeated with next change
			 * @returns {Promise} Promise resolves with New Binding Context
			 *
			 * @sap-restricted
			 * @final
			 */
			createDocument: function(oListBinding, mParameters, oResourceBundle) {
				var oNewDocumentContext,
					that = this,
					bSkipRefresh,
					sBindingName,
					oModel = oListBinding.getModel(),
					oMetaModel = oModel.getMetaModel(),
					sMetaPath = oMetaModel.getMetaPath(oListBinding.getHeaderContext().getPath()),
					sNewAction =
						!oListBinding.isRelative() &&
						(oMetaModel.getObject(sMetaPath + "@com.sap.vocabularies.Session.v1.StickySessionSupported/NewAction") ||
							oMetaModel.getObject(sMetaPath + "@com.sap.vocabularies.Common.v1.DraftRoot/NewAction")),
					oCreationPromise,
					mBindingParameters = { "$$patchWithoutSideEffects": true },
					sMessagesPath = oMetaModel.getObject(sMetaPath + "/@com.sap.vocabularies.Common.v1.Messages/$Path");
				if (sMessagesPath) {
					mBindingParameters["$select"] = sMessagesPath;
				}

				mParameters = getParameters(mParameters);

				if (!oListBinding) {
					return Promise.reject("Binding required for new document creation");
				}

				if (mParameters.busyMode === "Local") {
					// in case of local busy mode we use the list binding name
					// there's no APY yet so we have to use the .sId TODO provide a public method?
					sBindingName = oListBinding.sId;
				}

				bSkipRefresh = !mParameters.refreshList;

				that.busyOn(mParameters.busyMode, sBindingName);
				var oResourceBundleCore = sap.ui.getCore().getLibraryResourceBundle("sap.fe.core");

				if (sNewAction) {
					oCreationPromise = this.onCallAction(sNewAction, {
						contexts: oListBinding.getHeaderContext(),
						showActionParameterDialog: true,
						label: oResourceBundleCore.getText("SAPFE_ACTION_CREATE"),
						bindingParameters: mBindingParameters,
						parentControl: mParameters.parentControl,
						bIsCreateAction: true
					});
				} else {
					oNewDocumentContext = oListBinding.create(mParameters.data, bSkipRefresh, mParameters.createAtEnd);
					oCreationPromise = oNewDocumentContext.created();

					// TODO: this shall be improved so we only attach once to the events
					var fnCreateCompleted = function(oEvent) {
						var oContext = oEvent.getParameter("context"),
							oMessageManager = sap.ui.getCore().getMessageManager(),
							sTarget,
							aMessages,
							oMessage,
							bBoundMessageExists;

						if (oContext === oNewDocumentContext) {
							oListBinding.detachCreateCompleted(fnCreateCompleted);

							if (!oEvent.getParameter("success")) {
								if (mParameters.keepTransientContextOnFailed) {
									// the context shall stay as a transient one in the list binding
									// this one is automatically sent from the model once the user changed any property
									// we have to attach to the events to ensure the table is busy and errors are shown

									/*	TODO: this is just a temp solution
                                        as long as we don't have the row highlighting to identify the transient entries
                                        we add a bound message if no one exists so far (means the backend did not return
                                        a bound message) explaining why a few functions don't work and how to resolve them.
                                     */

									// get the target of the transient context
									sTarget = oNewDocumentContext.getPath();

									// check if bound message already exists for the transient context
									aMessages = oMessageManager.getMessageModel().getData();
									bBoundMessageExists = false;
									for (var i = 0; i < aMessages.length; i++) {
										if (aMessages[0].target === sTarget) {
											bBoundMessageExists = true;
											break;
										}
									}

									if (!bBoundMessageExists) {
										// add a bound message for this transient context
										oMessage = new Message({
											message: CommonUtils.getTranslatedText("TRANSIENT_CONTEXT_MESSAGE", oResourceBundle),
											description: CommonUtils.getTranslatedText("TRANSIENT_CONTEXT_DESCRIPTION", oResourceBundle),
											target: sTarget,
											persistent: false,
											type: "Error"
										});
										oMessageManager.addMessages(oMessage);

										oNewDocumentContext.created().then(
											function() {
												oMessageManager.removeMessages(oMessage);
											},
											function() {
												oMessageManager.removeMessages(oMessage);
											}
										);
									}

									var fnCreateCompleteRepeat = function(oEvent) {
										if (oEvent.getParameter("context") === oNewDocumentContext) {
											messageHandling.showUnboundMessages();

											if (oEvent.getParameter("success")) {
												oListBinding.detachCreateCompleted(fnCreateCompleteRepeat);
											}
										}
									};

									oListBinding.attachCreateCompleted(fnCreateCompleteRepeat);

									messageHandling.showUnboundMessages();
								} else {
									// the context is deleted

									// this is needed to avoid console errors TO be checked with model colleagues
									oContext.created().then(undefined, function() {
										Log.trace("transient creation context deleted");
									});
									oContext.delete();

									// if current state is transient (...), browser will come back to previous state
									var oRouting = that._getRouting();
									oRouting.navigateBackFromTransientState(that._getAppComponent(), {
										unLockObject: that.getUIStateModel()
									});
								}
							}
						}
					};
					oListBinding.attachCreateCompleted(fnCreateCompleted);
				}

				return oCreationPromise
					.then(function(oResult) {
						if (!oListBinding.isRelative()) {
							// the create mode shall currently only be set on creating a root document
							that._bCreateMode = true;
						}
						oNewDocumentContext = oNewDocumentContext || (oResult && oResult.response);

						// TODO: where does this one coming from???
						if (oResult && oResult.bConsiderDocumentModified) {
							that.handleDocumentModifications();
						}
						return messageHandling.showUnboundMessages().then(function() {
							return oNewDocumentContext;
						});
					})
					.catch(function(err) {
						return messageHandling.showUnboundMessages().then(function() {
							// for instance, on cancel of create dialog, the promise is rejected
							// a return here would restore the promise chain and result in errors while routing
							// solution -  reject here as well
							return Promise.reject(err);
						});
					})
					.finally(function() {
						that.busyOff(mParameters.busyMode, sBindingName);
					});
			},

			/**
			 * Delete one or multiple document(s)
			 *
			 * @function
			 * @name sap.fe.core.TransactionHelper#deleteDocument
			 * @memberof sap.fe.core.TransactionHelper
			 * @static
			 * @param {sap.ui.model.odata.v4.Context} contexts Either one context or an array with contexts to be deleted
			 * @param {map} [mParameters] Optional, can contain the following attributes:
			 * @param {string} title, Title of the object to be deleted
			 * @param {string} description, Description of the object to be deleted
			 * @param {string} numberOfSelectedContexts, Number of objects selected
			 **/
			deleteDocument: function(vContexts, mParameters, oLocalUIModel, oResourceBundle) {
				var oUIModel = this.getUIStateModel(),
					fnReject,
					fnResolve,
					aDeletableContexts = [],
					isCheckBoxVisible = false,
					isLockedTextVisible = false,
					cannotBeDeletedTextVisible = false,
					isCheckBoxSelected,
					that = this;
				var oResourceBundleCore = sap.ui.getCore().getLibraryResourceBundle("sap.fe.core");

				var aParams,
					oDeleteMessage = {
						title: oResourceBundleCore.getText("OBJECT_PAGE_DELETE")
					};
				BusyLocker.lock(oUIModel);
				if (mParameters) {
					if (!mParameters.numberOfSelectedContexts) {
						mParameters = getParameters(mParameters);
						if (mParameters.title) {
							if (mParameters.description) {
								aParams = [mParameters.title, mParameters.description];
								oDeleteMessage.text = CommonUtils.getTranslatedText(
									"OBJECT_PAGE_CONFIRM_DELETE_WITH_OBJECTINFO",
									oResourceBundle,
									aParams,
									mParameters.entitySetName
								);
							} else {
								oDeleteMessage.text = CommonUtils.getTranslatedText(
									"OBJECT_PAGE_CONFIRM_DELETE_WITH_OBJECTTITLE_SINGULAR",
									oResourceBundle,
									null,
									mParameters.entitySetName
								);
							}
						} else {
							oDeleteMessage.text = CommonUtils.getTranslatedText("OBJECT_PAGE_CONFIRM_GENERIC_DELETE", oResourceBundle);
						}
						aDeletableContexts = vContexts;
					} else {
						oDeleteMessage = {
							title: oResourceBundleCore.getText("OBJECT_PAGE_DELETE")
						};
						if (mParameters.numberOfSelectedContexts === 1 && mParameters.numberOfSelectedContexts === vContexts.length) {
							aDeletableContexts = vContexts;
							oDeleteMessage.text = CommonUtils.getTranslatedText(
								"OBJECT_PAGE_CONFIRM_DELETE_WITH_OBJECTTITLE_SINGULAR",
								oResourceBundle,
								null,
								mParameters.entitySetName
							);
						} else if (mParameters.numberOfSelectedContexts === 1 && mParameters.unSavedContexts.length === 1) {
							//only one unsaved object
							aDeletableContexts = mParameters.unSavedContexts;
							var sLastChangedByUser = aDeletableContexts[0].getObject()["DraftAdministrativeData"]
								? aDeletableContexts[0].getObject()["DraftAdministrativeData"]["LastChangedByUserDescription"]
								: "";
							aParams = [sLastChangedByUser];
							oDeleteMessage.text = CommonUtils.getTranslatedText(
								"OBJECT_PAGE_CONFIRM_DELETE_WITH_UNSAVED_CHANGES",
								oResourceBundle,
								aParams
							);
						} else if (mParameters.numberOfSelectedContexts === mParameters.unSavedContexts.length) {
							//only multiple unsaved objects
							aDeletableContexts = mParameters.unSavedContexts;
							oDeleteMessage.text = CommonUtils.getTranslatedText(
								"OBJECT_PAGE_CONFIRM_DELETE_WITH_UNSAVED_CHANGES_MULTIPLE_OBJECTS",
								oResourceBundle
							);
						} else if (
							mParameters.numberOfSelectedContexts ===
							vContexts.concat(mParameters.unSavedContexts.concat(mParameters.lockedContexts)).length
						) {
							//only unsaved, locked ,deletable objects but not non-deletable objects
							aDeletableContexts = vContexts.concat(mParameters.unSavedContexts);
							oDeleteMessage.text =
								aDeletableContexts.length === 1
									? CommonUtils.getTranslatedText(
											"OBJECT_PAGE_CONFIRM_DELETE_WITH_OBJECTTITLE_SINGULAR",
											oResourceBundle,
											null,
											mParameters.entitySetName
									  )
									: CommonUtils.getTranslatedText(
											"OBJECT_PAGE_CONFIRM_DELETE_WITH_OBJECTTITLE_PLURAL",
											oResourceBundle,
											null,
											mParameters.entitySetName
									  );
						} else {
							//if non-deletable objects exists along with any of unsaved ,deletable objects
							aDeletableContexts = vContexts.concat(mParameters.unSavedContexts);
							cannotBeDeletedTextVisible = true;
							oDeleteMessage.text =
								aDeletableContexts.length === 1
									? CommonUtils.getTranslatedText(
											"OBJECT_PAGE_CONFIRM_DELETE_WITH_OBJECTTITLE_PLURAL",
											oResourceBundle,
											null,
											mParameters.entitySetName
									  )
									: CommonUtils.getTranslatedText(
											"OBJECT_PAGE_CONFIRM_DELETE_WITH_OBJECTTITLE_SINGULAR",
											oResourceBundle,
											null,
											mParameters.entitySetName
									  );
							oDeleteMessage.nonDeletableText = CommonUtils.getTranslatedText(
								"OBJECT_PAGE_CONFIRM_DELETE_WITH_OBJECTINFO_AND_FEW_OBJECTS_NON_DELETABLE",
								oResourceBundle,
								[
									mParameters.numberOfSelectedContexts - vContexts.concat(mParameters.unSavedContexts).length,
									mParameters.numberOfSelectedContexts
								]
							);
						}
						if (mParameters.lockedContexts.length > 0) {
							//setting the locked text if locked objects exist
							isLockedTextVisible = true;
							oDeleteMessage.nonDeletableText = CommonUtils.getTranslatedText(
								"OBJECT_PAGE_CONFIRM_DELETE_WITH_OBJECTINFO_AND_FEW_OBJECTS_LOCKED",
								oResourceBundle,
								[mParameters.lockedContexts.length, mParameters.numberOfSelectedContexts]
							);
						}
						if (
							mParameters.unSavedContexts.length > 0 &&
							mParameters.unSavedContexts.length !== mParameters.numberOfSelectedContexts
						) {
							if (
								(cannotBeDeletedTextVisible || isLockedTextVisible) &&
								aDeletableContexts.length === mParameters.unSavedContexts.length
							) {
								//if only unsaved and either or both of locked and non-deletable objects exist then we hide the check box
								isCheckBoxVisible = false;
								aDeletableContexts = mParameters.unSavedContexts;
								if (mParameters.unSavedContexts.length === 1) {
									oDeleteMessage.text = CommonUtils.getTranslatedText(
										"OBJECT_PAGE_CONFIRM_DELETE_WITH_UNSAVED_AND_FEW_OBJECTS_LOCKED_SINGULAR",
										oResourceBundle
									);
								} else {
									oDeleteMessage.text = CommonUtils.getTranslatedText(
										"OBJECT_PAGE_CONFIRM_DELETE_WITH_UNSAVED_AND_FEW_OBJECTS_LOCKED_PLURAL",
										oResourceBundle
									);
								}
							} else {
								if (mParameters.unSavedContexts.length === 1) {
									oDeleteMessage.checkBoxText = CommonUtils.getTranslatedText(
										"OBJECT_PAGE_CONFIRM_DELETE_WITH_OBJECTINFO_AND_FEW_OBJECTS_UNSAVED_SINGULAR",
										oResourceBundle
									);
								} else {
									oDeleteMessage.checkBoxText = CommonUtils.getTranslatedText(
										"OBJECT_PAGE_CONFIRM_DELETE_WITH_OBJECTINFO_AND_FEW_OBJECTS_UNSAVED_PLURAL",
										oResourceBundle
									);
								}
								isCheckBoxVisible = true;
							}
						}
						if (cannotBeDeletedTextVisible && isLockedTextVisible) {
							//if both locked and non-deletable objects exist along with deletable objects
							oDeleteMessage.nonDeletableText = CommonUtils.getTranslatedText(
								"OBJECT_PAGE_CONFIRM_DELETE_WITH_OBJECTINFO_AND_FEW_OBJECTS_LOCKED_AND_NON_DELETABLE",
								oResourceBundle,
								[
									mParameters.numberOfSelectedContexts -
										vContexts.concat(mParameters.unSavedContexts).length -
										mParameters.lockedContexts.length,
									mParameters.lockedContexts.length,
									mParameters.numberOfSelectedContexts
								]
							);
						}
					}
				}
				var oContent = new VBox({
					items: [
						new Text({
							text: oDeleteMessage.nonDeletableText,
							visible: isLockedTextVisible || cannotBeDeletedTextVisible
						}),
						new Text({
							text: oDeleteMessage.text
						}),
						new CheckBox({
							text: oDeleteMessage.checkBoxText,
							selected: true,
							select: function(oEvent) {
								var selected = oEvent.getSource().getSelected();
								if (selected) {
									aDeletableContexts = vContexts.concat(mParameters.unSavedContexts);
									isCheckBoxSelected = true;
								} else {
									aDeletableContexts = vContexts;
									isCheckBoxSelected = false;
								}
							},
							visible: isCheckBoxVisible
						})
					]
				});
				var sTitle = mParameters.numberOfSelectedContexts
					? CommonUtils.getTranslatedText("OBJECT_PAGE_DELETE_DIALOG", oResourceBundle, [mParameters.numberOfSelectedContexts])
					: oResourceBundleCore.getText("OBJECT_PAGE_DELETE");
				var oDialog = new Dialog({
					title: sTitle,
					state: "Warning",
					content: [oContent],
					beginButton: new Button({
						text: oResourceBundleCore.getText("OBJECT_PAGE_DELETE"),
						type: "Emphasized",
						press: function() {
							BusyLocker.lock(oUIModel);
							var aContexts = Array.isArray(aDeletableContexts) ? aDeletableContexts : [aDeletableContexts];
							oDialog.close();
							return Promise.all(
								aContexts.map(function(oContext) {
									oContext
										.delete()
										.then(function() {
											if (oLocalUIModel.getProperty("/$contexts/" + mParameters.id + "/deleteEnabled") != undefined) {
												if (isCheckBoxVisible === true && isCheckBoxSelected === false) {
													//if unsaved objects are not deleted then we need to set the enabled to true and update the model data for next deletion
													oLocalUIModel.setProperty("/$contexts/" + mParameters.id + "/deleteEnabled", true);
													var obj = Object.assign(oLocalUIModel.getProperty("/$contexts/" + mParameters.id), {});
													obj.selectedContexts = obj.selectedContexts.filter(function(element) {
														return obj.deletableContexts.indexOf(element) === -1;
													});
													obj.deletableContexts = [];
													obj.selectedContexts = [];
													obj.numberOfSelectedContexts = obj.selectedContexts.length;
													oLocalUIModel.setProperty("/$contexts/" + mParameters.id, obj);
												} else {
													oLocalUIModel.setProperty("/$contexts/" + mParameters.id + "/deleteEnabled", false);
													oLocalUIModel.setProperty("/$contexts/" + mParameters.id + "/selectedContexts", []);
													oLocalUIModel.setProperty(
														"/$contexts/" + mParameters.id + "/numberOfSelectedContexts",
														0
													);
												}
											}
											if (aContexts.length === 1) {
												MessageToast.show(
													CommonUtils.getTranslatedText("OBJECT_PAGE_DELETE_TOAST_SINGULAR", oResourceBundle)
												);
											} else {
												MessageToast.show(
													CommonUtils.getTranslatedText("OBJECT_PAGE_DELETE_TOAST_PLURAL", oResourceBundle)
												);
											}
											// remove existing bound transition messages
											messageHandling.removeBoundTransitionMessages();
											that._bIsModified = true;
											return messageHandling.showUnboundMessages().then(fnResolve);
										})
										.catch(function(oError) {
											return messageHandling.showUnboundMessages().then(fnReject);
										});
								})
							).finally(function() {
								BusyLocker.unlock(oUIModel);
							});
						}
					}),
					endButton: new Button({
						text: CommonUtils.getTranslatedText("OBJECT_PAGE_CANCEL", oResourceBundle),
						press: function() {
							oDialog.close();
						}
					}),
					afterClose: function() {
						oDialog.destroy();
					}
				});
				oDialog.addStyleClass("sapUiContentPadding");
				BusyLocker.unlock(oUIModel);
				oDialog.open();

				return new Promise(function(resolve, reject) {
					fnReject = reject;
					fnResolve = resolve;
				});
			},

			/**
			 * Edit a document
			 *
			 * @function
			 * @name sap.fe.core.TransactionHelper#editDocument
			 * @memberof sap.fe.core.TransactionHelper
			 * @static
			 * @param {sap.ui.model.odata.v4.Context} Context of the active document
			 * @returns {Promise} Promise resolves with the new Draft Context in case of draft programming model
			 *
			 * @sap-restricted
			 * @final
			 */
			editDocument: function(oContext) {
				this._bIsModified = false;
				var that = this;
				var oUIModel = this.getUIStateModel();
				if (!oContext) {
					return Promise.reject(new Error("Binding context to active document is required"));
				}
				BusyLocker.lock(oUIModel);
				return this.getProgrammingModel(oContext)
					.then(function(sProgrammingModel) {
						switch (sProgrammingModel) {
							case enumProgrammingModel.DRAFT:
								// store the active context as it can be used in case of deleting the draft
								that.activeContext = oContext;
								return draft.createDraftFromActiveDocument(oContext, {
									bPreserveChanges: true
								});
							case enumProgrammingModel.NON_DRAFT:
								return oContext;
							case enumProgrammingModel.STICKY:
								return sticky.editDocumentInStickySession(oContext);
						}
					})
					.then(function(oNewContext) {
						oUIModel.setProperty("/editMode", "Editable");
						that._bCreateMode = false;
						return messageHandling.showUnboundMessages().then(function() {
							return oNewContext;
						});
					})
					.catch(function(err) {
						return messageHandling.showUnboundMessages().then(function() {
							return Promise.reject(err);
						});
					})
					.finally(function() {
						BusyLocker.unlock(oUIModel);
					});
			},

			/**
			 * Update document
			 *
			 * @function
			 * @name sap.fe.core.TransactionHelper#updateDocument
			 * @memberof sap.fe.core.TransactionHelper
			 * @static
			 * @param {map} [mParameters] Optional, can contain the following attributes:
			 * @param {sap.ui.model.odata.v4.Context} [mParameters.context] Context of the active document
			 * @returns {Promise} Promise resolves with ???
			 *
			 * @sap-restricted
			 * @final
			 */
			updateDocument: function() {
				return Promise.resolve();
			},

			/**
			 * Cancel edit of a document
			 *
			 * @function
			 * @name sap.fe.core.TransactionHelper#cancelDocument
			 * @memberof sap.fe.core.TransactionHelper
			 * @static
			 * @param {sap.ui.model.odata.v4.Context} {oContext} Context of the document to be canceled / deleted
			 * @param {map} [mParameters] Optional, can contain the following attributes:
			 * @param {sap.m.Button} {mParameters.cancelButton} Cancel Button of the discard popover (mandatory for now)
			 * @returns {Promise} Promise resolves with ???
			 *
			 * @sap-restricted
			 * @final
			 */
			cancelDocument: function(oContext, mParameters, oResourceBundle) {
				var that = this,
					oUIModel = that.getUIStateModel(),
					sProgrammingModel,
					oMessageManager = sap.ui.getCore().getMessageManager();

				//context must always be passed - mandatory parameter
				if (!oContext) {
					return Promise.reject("No context exists. Pass a meaningful context");
				} else {
					oMessageManager.removeMessages(oMessageManager.getMessageModel().getData());
				}

				BusyLocker.lock(oUIModel);

				mParameters = getParameters(mParameters);
				var oParamsContext = oContext,
					oCancelButton = mParameters.cancelButton,
					oModel = oParamsContext.getModel(),
					sCanonicalPath;

				return this.getProgrammingModel(oContext)
					.then(function(sPModel) {
						sProgrammingModel = sPModel;
						if (sPModel === enumProgrammingModel.DRAFT) {
							var draftDataContext = oModel
								.bindContext(oParamsContext.getPath() + "/DraftAdministrativeData")
								.getBoundContext();
							if (!that._bIsModified) {
								return draftDataContext.requestObject().then(function(draftAdminData) {
									that._bIsModified = !(draftAdminData.CreationDateTime === draftAdminData.LastChangeDateTime);
								});
							}
							//} else if (sPModel === "Sticky") {
							// Using bIsModified for now.
						} else if (sPModel === enumProgrammingModel.NON_DRAFT) {
							that._bIsModified = oParamsContext.hasPendingChanges();
						}
					})
					.then(function() {
						return that._showDiscardPopover(oCancelButton, that._bIsModified, oResourceBundle);
					})
					.then(function() {
						switch (sProgrammingModel) {
							case enumProgrammingModel.DRAFT:
								return oParamsContext.requestObject("HasActiveEntity").then(function(bHasActiveEntity) {
									if (!bHasActiveEntity) {
										if (oParamsContext && oParamsContext.hasPendingChanges()) {
											oParamsContext.getBinding().resetChanges();
										}
										oParamsContext.delete();
										return false;
									} else {
										var oActiveContext =
											that.activeContext ||
											oModel.bindContext(oParamsContext.getPath() + "/SiblingEntity").getBoundContext();
										return oActiveContext
											.requestCanonicalPath()
											.then(function(sPath) {
												sCanonicalPath = sPath;
												if (oParamsContext && oParamsContext.hasPendingChanges()) {
													oParamsContext.getBinding().resetChanges();
												}
												oParamsContext.delete();
											})
											.then(function() {
												//oParamsContext.delete() in the previous promise doesnt return anything upon success.
												if (oActiveContext.getPath() !== sCanonicalPath) {
													// the active context is using the sibling entity - this path is not accessible anymore as we deleted the draft
													// document - therefore we need to create a new context with the canonical path
													oActiveContext = oModel.bindContext(sCanonicalPath).getBoundContext();
												}
												return oActiveContext;
											});
									}
								});

							case enumProgrammingModel.STICKY:
								return sticky.discardDocument(oContext).then(function(oContext) {
									if (oContext) {
										if (oContext.hasPendingChanges()) {
											oContext.getBinding().resetChanges();
										}
										if (!that._bCreateMode) {
											oContext.refresh();
											return oContext;
										}
									}
									return false;
								});

							case enumProgrammingModel.NON_DRAFT:
								if (oParamsContext === oContext && that._bIsModified) {
									oContext.getBinding().resetChanges();
								}
								break;
						}
					})
					.then(function(context) {
						that._bIsModified = false;
						oUIModel.setProperty("/editMode", "Display");
						// remove existing bound transition messages
						messageHandling.removeBoundTransitionMessages();
						// show unbound messages
						return messageHandling.showUnboundMessages().then(function() {
							return context;
						});
					})
					.catch(function(err) {
						return messageHandling.showUnboundMessages().then(function() {
							return Promise.reject(err);
						});
					})
					.finally(function() {
						BusyLocker.unlock(oUIModel);
					});
			},

			/**
			 * Save document
			 *
			 * @function
			 * @name sap.fe.core.TransactionHelper#saveDocument
			 * @memberof sap.fe.core.TransactionHelper
			 * @static
			 * @param {sap.ui.model.odata.v4.Context} Context of the document that should be saved
			 * @returns {Promise} Promise resolves with ???
			 *
			 * @sap-restricted
			 * @final
			 */
			saveDocument: function(oContext, oResourceBundle) {
				var oUIModel = this.getUIStateModel(),
					oModel,
					that = this;

				if (!oContext) {
					return Promise.reject(new Error("Binding context to draft document is required"));
				}
				// in case of saving / activating the bound transition messages shall be removed before the PATCH/POST
				// is sent to the backend
				messageHandling.removeBoundTransitionMessages();

				BusyLocker.lock(oUIModel);
				return this.getProgrammingModel(oContext)
					.then(function(sProgrammingModel) {
						switch (sProgrammingModel) {
							case enumProgrammingModel.DRAFT:
								return draft.activateDocument(oContext);
							case enumProgrammingModel.STICKY:
								return sticky.activateDocument(oContext);
							case enumProgrammingModel.NON_DRAFT:
								//This is submitting the in saved changes to backend
								oModel = oContext.getModel();
								oModel.submitBatch(oModel.getUpdateGroupId());
								return oContext;
							/* oUIModel.setProperty("/editMode", 'Display');
						 break; */
						}
					})
					.then(function(oActiveDocument) {
						that._bIsModified = false;
						oUIModel.setProperty("/editMode", "Display");
						MessageToast.show(CommonUtils.getTranslatedText("OBJECT_SAVED", oResourceBundle));
						return messageHandling.showUnboundMessages().then(function() {
							return oActiveDocument;
						});
					})
					.catch(function(err) {
						return messageHandling.showUnboundMessages().then(function() {
							return Promise.reject(err);
						});
					})
					.finally(function() {
						BusyLocker.unlock(oUIModel);
					});
			},

			/**
			 * Calls a bound/unbound action
			 * @function
			 * @static
			 * @name sap.fe.core.TransactionHelper.onCallAction
			 * @memberof sap.fe.core.TransactionHelper
			 * @param {string} sActionName The name of the action to be called
			 * @param {map} [mParameters] contains the following attributes:
			 * @param {sap.ui.model.odata.v4.Context} [mParameters.contexts] contexts Mandatory for a bound action, Either one context or an array with contexts for which the action shall be called
			 * @param {sap.ui.model.odata.v4.ODataModel} [mParameters.model] oModel Mandatory for an unbound action, An instance of an OData v4 model
			 * @param {string} [mParameters.invocationGrouping] [Isolated] mode how actions shall be called: Changeset to put all action calls into one changeset, Isolated to put them into separate changesets (TODO: create enum)
			 * @param {string} [mParameters.label] a human-readable label for the action
			 * @returns {Promise} Promise resolves with an array of response objects (TODO: to be changed)
			 * @sap-restricted
			 * @final
			 **/
			onCallAction: function(sActionName, mParameters) {
				mParameters = getParameters(mParameters);
				var oUIModel = this.getUIStateModel(),
					that = this,
					oContext,
					oModel,
					oPromise,
					sName,
					mBindingParameters = mParameters.bindingParameters;
				if (!sActionName) {
					return Promise.reject("Provide name of action to be executed");
				}
				// action imports are not directly obtained from the metaModel by it is present inside the entityContainer
				// and the acions it refers to present outside the entitycontainer, hence to obtain kind of the action
				// split() on its name was required
				sName = sActionName.split("/")[1];
				sActionName = sName || sActionName;
				oContext = sName ? undefined : mParameters.contexts;
				//checking whether the context is an array with more than 0 length or not an array(create action)
				if (oContext && ((Array.isArray(oContext) && oContext.length) || !Array.isArray(oContext))) {
					oContext = Array.isArray(oContext) ? oContext[0] : oContext;
					oModel = oContext.getModel();
				}
				if (mParameters.model) {
					oModel = mParameters.model;
				}
				if (!oModel) {
					return Promise.reject("Pass a context for a bound action or pass the model for an unbound action");
				}
				// get the binding parameters $select and $expand for the side effect on this action
				// also gather additional property paths to be requested such as text associations
				var mSideEffectsParameters = that._getBindingParameters(sActionName, oContext) || {},
					oAppComponent = that._getAppComponent(),
					bSubmitted = false;
				if (oContext && oModel) {
					oPromise = operations.callBoundAction(sActionName, mParameters.contexts, oModel, {
						invocationGrouping: mParameters.invocationGrouping,
						label: mParameters.label,
						showActionParameterDialog: true,
						mBindingParameters: mBindingParameters,
						additionalSideEffect: mSideEffectsParameters.aAdditionalPropertyPaths,
						onSubmitted: function() {
							bSubmitted = true;
							BusyLocker.lock(oUIModel);
						},
						parentControl: mParameters.parentControl,
						ownerComponent: oAppComponent,
						localUIModel: mParameters.localUIModel,
						operationAvailableMap: mParameters.operationAvailableMap,
						prefix: mParameters.prefix,
						bIsCreateAction: mParameters.bIsCreateAction
					});
				} else {
					// TODO: confirm if action import needs side effects
					oPromise = operations.callActionImport(sActionName, oModel, {
						label: mParameters.label,
						showActionParameterDialog: true,
						bindingParameters: mBindingParameters,
						entitySetName: mParameters.entitySetName,
						onSubmitted: function() {
							bSubmitted = true;
							BusyLocker.lock(oUIModel);
						},
						parentControl: mParameters.parentControl,
						localUIModel: mParameters.localUIModel,
						operationAvailableMap: mParameters.operationAvailableMap,
						prefix: mParameters.prefix,
						ownerComponent: oAppComponent
					});
				}
				return oPromise
					.then(function(oResult) {
						// Succeeded
						return messageHandling.showUnboundMessages().then(function() {
							return oResult;
						});
					})
					.catch(function(err) {
						return messageHandling.showUnboundMessages().then(function() {
							return Promise.reject(err);
						});
					})
					.finally(function() {
						if (bSubmitted) {
							BusyLocker.unlock(oUIModel);
						}
					});
			},

			/**
			 * Get the query parameters for bound action from side effect, if annotated for provided action
			 * TODO: Add support for $expand when the backend supports it.
			 * @function
			 * @static
			 * @name sap.fe.core.TransactionHelper._getBindingParameters
			 * @memberof sap.fe.core.TransactionHelper
			 * @param {string} sActionName The name of the bound action for which to get the side effects
			 * @param {sap.ui.model.odata.v4.Context} oContext Binding Context of the view
			 * @returns {map} Map of query parameters with $select and $expand
			 * @private
			 * @sap-restricted
			 */
			_getBindingParameters: function(sActionName, oContext) {
				var oMetaModel = oContext && oContext.getModel().getMetaModel(),
					oMetaModelContext = oMetaModel && oMetaModel.getMetaContext(oContext.getPath()),
					oSideEffect =
						oMetaModelContext &&
						oMetaModel.getObject(sActionName + "@com.sap.vocabularies.Common.v1.SideEffects", oMetaModelContext);
				if (!oSideEffect) {
					return {};
				}
				var /* mParameters = {},*/
					aTargetProperties = oSideEffect.TargetProperties || [],
					aTargetEntities = oSideEffect.TargetEntities || [],
					// '/EntityType' for this view
					sEntityType = oMetaModelContext.getPath(),
					aAdditionalPropertyPaths = [];

				aAdditionalPropertyPaths = aAdditionalPropertyPaths.concat(aTargetProperties).concat(aTargetEntities);

				//add $select, $expand for properties
				//gather additional property paths to request -- text associations
				aTargetProperties.forEach(function(oTargetProperty) {
					var oTextAnnotation = oMetaModel.getObject(
						sEntityType + "/" + oTargetProperty["$PropertyPath"] + "@com.sap.vocabularies.Common.v1.Text"
					);
					if (oTextAnnotation && oTextAnnotation["$Path"]) {
						var sProp = oTargetProperty["$PropertyPath"],
							sNavPropPrefix = sProp.indexOf("/") > -1 ? sProp.replace(/[^\/]+$/, "") : "";
						aAdditionalPropertyPaths.push({ "$PropertyPath": sNavPropPrefix + oTextAnnotation["$Path"] });
					}
				});
				/*** Use $select, $expand with POST only if the return type of the action is the entity type
				 * Otherwise, it must be via v4.Context#requestSideEffects as a separate GET request
				 * TODO: Add check for return type of action
				mParameters['$select'] = "";
				aTargetProperties.forEach(function (oProperty) {
					var sPropertyPath = oProperty['$PropertyPath'];
					if (sPropertyPath.indexOf('_it/') !== 0) {
						mParameters['$select'] += (sPropertyPath + ',');
					} else {
						mParameters['$expand'] = mParameters['$expand'] || "";
						mParameters['$expand'] += (sPropertyPath.slice(4) + ','); //remove '_it/' from the property path
					}
				});
				//remove trailing ','
				mParameters['$select'] = mParameters['$select'].slice(0, -1);
				mParameters['$expand'] = mParameters['$expand'] ? mParameters['$expand'].slice(0, -1) : undefined;
				 */
				//add $expand for entity
				//Not supported for now

				// mBindingParameters go as part of $select and $expand with POST of the action
				// aAdditionalPropertyPaths requested with the POST separately with a GET (v4.Context#requestSideEffects)
				// return {
				// 	aAdditionalPropertyPaths: aAdditionalPropertyPaths,
				// 	mBindingParameters: mParameters
				// };

				// replace empty nav prop path with prop path *
				aAdditionalPropertyPaths = SideEffectsUtil.replaceEmptyNavigationPaths(aAdditionalPropertyPaths);
				// Add additional text associations for the target properties
				aAdditionalPropertyPaths = SideEffectsUtil.addTextProperties(aAdditionalPropertyPaths, oMetaModel, sEntityType);
				return {
					aAdditionalPropertyPaths: aAdditionalPropertyPaths
				};
			},

			/**
			 * Shows a popover if it needs to be shown.
			 * TODO: Popover is shown if user has modified any data.
			 * TODO: Popover is shown if there's a difference from draft admin data.
			 * @function
			 * @static
			 * @name sap.fe.core.TransactionHelper._showDiscardPopover
			 * @memberof sap.fe.core.TransactionHelper
			 * @param {sap.ui.core.Control} oCancelButton The control which will open the popover
			 * @returns {Promise} Promise resolves if user confirms discard, rejects if otherwise, rejects if no control passed to open popover
			 * @sap-restricted
			 * @final
			 */
			_showDiscardPopover: function(oCancelButton, bIsModified, oResourceBundle) {
				// TODO: Implement this popover as a fragment as in v2??
				var that = this;

				that._bContinueDiscard = false;
				// to be implemented
				return new Promise(function(resolve, reject) {
					if (!oCancelButton) {
						reject("Cancel button not found");
					}
					//Show popover only when data is changed.
					if (bIsModified) {
						var fnOnAfterDiscard = function() {
							oCancelButton.setEnabled(true);
							if (that._bContinueDiscard) {
								resolve();
							} else {
								reject("Discard operation was rejected. Document has not been discarded");
							}
							that._oPopover.detachAfterClose(fnOnAfterDiscard);
						};
						if (!that._oPopover) {
							that._oPopover = new Popover({
								showHeader: false,
								placement: "Top",
								content: [
									new VBox({
										items: [
											new Text({
												//This text is the same as LR v2.
												//TODO: Display message provided by app developer???
												text: CommonUtils.getTranslatedText("SAPFE_DRAFT_DISCARD_MESSAGE", oResourceBundle)
											}),
											new Button({
												text: CommonUtils.getTranslatedText("SAPFE_DRAFT_DISCARD_BUTTON", oResourceBundle),
												width: "100%",
												press: function() {
													that._bContinueDiscard = true;
													that._oPopover.close();
												}
											})
										]
									})
								],
								beforeOpen: function() {
									// make sure to NOT trigger multiple cancel flows
									oCancelButton.setEnabled(false);
									that._oPopover.setInitialFocus(that._oPopover);
								}
							});
							that._oPopover.addStyleClass("sapUiContentPadding");
						}
						that._oPopover.attachAfterClose(fnOnAfterDiscard);
						that._oPopover.openBy(oCancelButton);
					} else {
						resolve();
					}
				});
			},
			/**
			 * Sets the document to modified state on patch event
			 * @function
			 * @static
			 * @name sap.fe.core.TransactionHelper.handleDocumentModifications
			 * @memberof sap.fe.core.TransactionHelper
			 * @sap-restricted
			 * @final
			 */
			handleDocumentModifications: function() {
				this._bIsModified = true;
			},

			/**
			 * retrieves the owner component
			 * @function
			 * @static
			 * @private
			 * @name sap.fe.core.TransactionHelper._getOwnerComponent
			 * @memberof sap.fe.core.TransactionHelper
			 * @sap-restricted
			 * @final
			 **/
			_getAppComponent: function() {
				return this._oAppComponent;
			},

			/**
			 * retrieves the Routing controller extention associated with the owner component
			 * @function
			 * @static
			 * @private
			 * @name sap.fe.core.TransactionHelper._getRouting
			 * @memberof sap.fe.core.TransactionHelper
			 * @sap-restricted
			 * @final
			 **/

			_getRouting: function() {
				return this._getAppComponent()._oRouting;
			}
		});
	}
);
