// Copyright (c) 2009-2020 SAP SE, All Rights Reserved

sap.ui.define([
    "sap/base/Log",
    "sap/base/util/UriParameters",
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/ui/Device",
    "sap/ushell/EventHub",
    "sap/ushell/resources",
    "sap/ushell/utils"
], function (
    Log,
    UriParameters,
    Controller,
    Fragment,
    JSONModel,
    Device,
    EventHub,
    resources,
    ushellUtils
) {
    "use strict";

    return Controller.extend("sap.ushell.components.shell.Settings.UserSettings", {
        /**
         * Initalizes the user settings dialog.
         *
         * @private
         */
        onInit: function () {
            this.getView().byId("userSettingEntryList").addEventDelegate({
                onAfterRendering: this._listAfterRendering.bind(this)
            });

            this.getView().byId("userSettingsDialog").addEventDelegate({
                onkeydown: this._keyDown.bind(this)
            });
        },

        /**
         * Handle focus after closing the dialog.
         * If the dialog was opened
         *  - from MeArea, should set focus to me area button, because me area popover is closed
         *  - from header button, the focus will automatically be set on the header button
         *
         * @private
         */
        _afterClose: function () {
            if (window.document.activeElement && window.document.activeElement.tagName === "BODY") {
                window.document.getElementById("meAreaHeaderButton").focus();
            }
        },

        /**
         * Handles the key down event on the Dialog
         *
         * @param {object} oEvent the event that was fired
         * @private
         */
        _keyDown: function (oEvent) {
            if (oEvent.keyCode === 27) { // ESC
                this._handleCancelButtonPress();
            }
        },

        /**
         * Handles after renderering code of the list.
         *
         * @private
         */
        _listAfterRendering: function () {
            var oMasterEntryList = this.getView().byId("userSettingEntryList");

            var aEntries = oMasterEntryList.getItems();
            // For each item in the list we need to execute the relevant function to get the entry value
            for (var i = 0; i < aEntries.length; i++) {
                var sPath = aEntries[i].getBindingContextPath();
                this._setEntryValueResult(sPath);
            }

            if (!Device.system.phone) {
                var oFirstEntry = oMasterEntryList.getItems()[0];
                if (oFirstEntry) {
                    oMasterEntryList.setSelectedItem(oFirstEntry);
                    this._toDetail(oFirstEntry);
                    //keep focus on the first item when reopen the dialog
                    oFirstEntry.getDomRef().focus();
                }
            }
        },

        /**
         * Tries to load the information for the list item of an entry async.
         *
         * @param {string} sEntryPath a speific path of one of the entries
         * @private
         */
        _setEntryValueResult: function (sEntryPath) {
            var oModel = this.getView().getModel(),
                valueArgument = oModel.getProperty(sEntryPath + "/valueArgument"),
                sValueResult = oModel.getProperty(sEntryPath + "/valueResult");

            if (typeof valueArgument === "function") {
                // Display "Loading..."
                oModel.setProperty(sEntryPath + "/valueResult", resources.i18n.getText("genericLoading"));
                valueArgument().then(
                    function (valueResult) {
                        //TODO think about interface
                        if (valueResult && valueResult.value !== undefined) {
                            oModel.setProperty(sEntryPath + "/visible", !!valueResult.value);
                        }

                        var sDisplayText;
                        if (typeof (valueResult) === "object") {
                            sDisplayText = valueResult.displayText || "";
                        } else {
                            sDisplayText = valueResult || "";
                        }
                        oModel.setProperty(sEntryPath + "/valueResult", sDisplayText);
                    }, function () {
                        oModel.setProperty(sEntryPath + "/valueResult", resources.i18n.getText("loadingErrorMessage"));
                    });
            } else if (sValueResult === null || sValueResult === undefined) { //Don't trigger check binding for the already set value
                oModel.setProperty(sEntryPath + "/valueResult", valueArgument || "");
            }
        },

        /**
         * Handles the Back button press
         *
         * @private
         */
        _navBackButtonPressHandler: function () {
            var oSplitApp = this.getView().byId("settingsApp");

            oSplitApp.backDetail();
            this._updateHeaderButtonVisibility(true);
        },

        /**
         * Handles the toggle button press in the header
         *
         * @private
         */
        _navToggleButtonPressHandler: function () {
            var oSplitApp = this.getView().byId("settingsApp"),
                bIsMasterShown = oSplitApp.isMasterShown();

            if (bIsMasterShown) {
                oSplitApp.hideMaster();
            } else {
                oSplitApp.showMaster();
            }
            this._updateHeaderButtonVisibility(!bIsMasterShown);
        },

        /**
         * Update header button
         *
         * @param {boolean} bIsMasterShown If master page is shown
         *
         * @private
         */
        _updateHeaderButtonVisibility: function (bIsMasterShown) {
            var oNavButton;
            if (Device.system.phone) {
                oNavButton = this.getView().byId("userSettingsNavBackButton");
                oNavButton.setVisible(!bIsMasterShown);
            } else if (Device.system.tablet) {
                oNavButton = this.getView().byId("userSettingsMenuButton");
                oNavButton.setVisible(true);
                oNavButton.setPressed(bIsMasterShown);
                oNavButton.setTooltip(resources.i18n.getText(bIsMasterShown ? "ToggleButtonHide" : "ToggleButtonShow"));
            }
        },

        /**
         * Handles the entry item press
         *
         * @param {object} oEvent the event that was fired
         * @private
         */
        _itemPress: function (oEvent) {
            this._toDetail(oEvent.getSource().getSelectedItem());
        },

        /**
         * Navigates to the detail page that belongs to the given selected item
         *
         * @param {object} oSelectedItem the entry control that should be handled
         * @private
         */
        _toDetail: function (oSelectedItem) {
            var oModel = this.getView().getModel(),
                sEntryPath = oSelectedItem.getBindingContextPath(),
                sDetailPageId = oModel.getProperty(sEntryPath + "/contentResult");

            // Clear selection from list.
            if (Device.system.phone) {
                oSelectedItem.setSelected(false);
            }

            if (sDetailPageId) {
                this._navToDetail(sDetailPageId, sEntryPath);
            } else {
                var oEntry = oModel.getProperty(sEntryPath);

                this._createEntryContent(oEntry).then(function (sNewDetailPageId) {
                    oModel.setProperty(sEntryPath + "/contentResult", sNewDetailPageId);
                    this._navToDetail(sNewDetailPageId, sEntryPath);
                }.bind(this));
            }
        },

        /**
         * Creates a detail page for the given Entry
         *
         * @param {object} oEntry that needs a detail page
         * @returns {Promise<string>} that resolves with the created Page id
         * @private
         */
        _createEntryContent: function (oEntry) {
            var that = this;
            var oCreateWrapperPromise = this._addContentWrapper(oEntry);

            if (typeof oEntry.contentFunc === "function") {
                oEntry.contentFunc().then(
                    function (oContentResult) {
                        if (oContentResult instanceof sap.ui.core.Control) {
                            oCreateWrapperPromise
                                .then(function (oPageWrapper) {
                                    oPageWrapper.addContent(oContentResult);
                                    oPageWrapper.setBusy(false);
                                });
                        } else {
                            oCreateWrapperPromise
                                .then(that._addErrorContentToWrapper.bind(null, resources.i18n.getText("loadingErrorMessage")));
                        }
                    }, function (error) {
                        Log.error("Can not load content for " + oEntry.title + " entry", error);
                        oCreateWrapperPromise
                            .then(that._addErrorContentToWrapper.bind(null, resources.i18n.getText("loadingErrorMessage")));
                    });
            } else {
                oCreateWrapperPromise
                    .then(this._addErrorContentToWrapper.bind(null, resources.i18n.getText("userSettings.noContent")));
            }

            return oCreateWrapperPromise.then(function (oPageWrapper) {
                return oPageWrapper.getId();
            });
        },

        _addContentWrapper: function (oEntry) {
            var that = this;
            return Fragment.load({
                name: "sap.ushell.components.shell.Settings.ContentWrapper"
            }).then(function (oPageWrapper) {
                var oModel = new JSONModel({
                    title: oEntry.title,
                    showHeader: !oEntry.provideEmptyWrapper
                });
                oPageWrapper.setModel(oModel, "entryInfo");
                that.getView().byId("settingsApp").addDetailPage(oPageWrapper);
                return oPageWrapper;
            });
        },

        _addErrorContentToWrapper: function (sMessage, oPageWrapper) {
            Fragment.load({
                name: "sap.ushell.components.shell.Settings.ErrorContent"
            }).then(function (oErrorFragment) {
                oPageWrapper.setBusy(false);
                oPageWrapper.getModel("entryInfo").setProperty("/errorMessage", sMessage);
                oPageWrapper.addContent(oErrorFragment);
            });
        },

        /**
         * Navigates to the corresponding detail Page
         *
         * @param {string} sId the id of the detail Page the AppSplit-Container schould navigate to
         * @param {string} sEntryPath the path ot the entry that should be navigated to
         * @private
         */
        _navToDetail: function (sId, sEntryPath) {
            var oSplitApp = this.getView().byId("settingsApp");

            oSplitApp.toDetail(sId);
            if (oSplitApp.getMode() === "ShowHideMode") {
                oSplitApp.hideMaster();
                this._updateHeaderButtonVisibility(false);
            }
            this._emitEntryOpened(sEntryPath);
        },

        /**
         * Emits an event to notify that the given entry needs to be saved.
         *
         * @param {string} sEntryPath the model path of the entry
         * @private
         */
        _emitEntryOpened: function (sEntryPath) {
            var aUserSettingsEntriesToSave = EventHub.last("UserSettingsOpened") || {},
                oEntry = this.getView().getModel().getProperty(sEntryPath),
                sId = oEntry.id;

            if (!sId) {
                sId = ushellUtils._getUid();
                this.getView().getModel().setProperty(sEntryPath + "/id", sId);
            }
            aUserSettingsEntriesToSave[sId] = true;
            EventHub.emit("UserSettingsOpened", aUserSettingsEntriesToSave);
        },

        /**
         * Triggers a refresh to the home page
         *
         * @param {array} aUrlParams url parameters which should be added to url
         *
         * @private
         * @since 1.72.0
         */
        _refreshBrowser: function (aUrlParams) {
            var sNewHref = ushellUtils.getLocationHref().replace(location.hash, ""),
                sNewLocationSearch = this._getAdjustedQueryString(aUrlParams);
            if (sNewLocationSearch) {
                sNewHref = sNewHref.replace(location.search, "?" + sNewLocationSearch);
            }
            document.location = sNewHref;
        },

        /**
         * Prepare the new query string which contain the parameter from url and also
         * parameters from aUrlParams
         *
         * For example,
         * current query string in browser: sap-client=010&sap-language=DE
         * aUrlParam = [{sap-language: "EN"}, {sap-theme: "sap_fiori_3"}]
         *
         * Result: sap-client=010&sap-language=EN&sap-theme=sap_fiori_3
         *
         * @param {array} aUrlParams url parameters which should be added to url
         *
         * @returns {string} new query string
         * @private
         * @since 1.78.0
         */
        _getAdjustedQueryString: function (aUrlParams) {
            if (aUrlParams && aUrlParams.length > 0) {
                var oOriginUriParameters = UriParameters.fromQuery(window.location.search);
                var oNewUrlParameter = Array.from(oOriginUriParameters.keys()).reduce(function (oResult, sParam) {
                    oResult[sParam] = oOriginUriParameters.getAll(sParam);
                    return oResult;
                }, {});
                aUrlParams.forEach(function (oParam) {
                    var sParamName = Object.keys(oParam)[0];
                    if (sParamName) {
                        oNewUrlParameter[sParamName] = oParam[sParamName];
                    }
                });
                return ushellUtils.urlParametersToString(oNewUrlParameter);
            }
            return null;
        },

        /**
         * Save and close User Settings Dialog.
         *
         * @private
         */
        _handleSaveButtonPress: function () {
            var that = this,
                oDialog = this.getView().byId("userSettingsDialog"),
                aEntries = this.getView().getModel().getProperty("/entries"),
                oOpenedEntries = EventHub.last("UserSettingsOpened") || {},
                aSavePromises;

            if (Object.keys(oOpenedEntries).length === 0) {
                this._handleSettingsDialogClose();
                this._showSuccessMessageToast();
                return;
            }
            oDialog.setBusy(true);

            aSavePromises = aEntries.reduce(function (aResult, oEntry) {
                if (oOpenedEntries[oEntry.id]) {
                    //onSave can be native Promise or jQuerry promise.
                    aResult.push(this._executeEntrySave(oEntry));
                }
                return aResult;
            }.bind(this), []);

            Promise.all(aSavePromises)
                .then(function (aResults) {
                    var aFailedExecutions = aResults.filter(function (oResult) {
                        return oResult.hasOwnProperty("error");
                    });

                    oDialog.setBusy(false);

                    if (aFailedExecutions.length > 0) {
                        var sErrMessageText = resources.i18n.getText(aFailedExecutions.length === 1 ? "savingEntryError": "savingEntriesError") + "\n";
                        var sErrMessageLog = "";
                        aFailedExecutions.forEach(function (oError) {
                            sErrMessageText += oError.entry + "\n";
                            sErrMessageLog += "Entry: " + oError.entry + " - Error message: " + oError.error + "\n";
                        });
                        that._showErrorMessageBox(sErrMessageText);
                        Log.error("Failed to save the following entries", sErrMessageLog);
                    } else {
                        that._handleSettingsDialogClose();
                        that._showSuccessMessageToast();
                        EventHub.emit("UserSettingsOpened", null);
                        var bRefresh = false;
                        var aUrlParams = [];
                        aResults.forEach(function (oResult) {
                            if (oResult.refresh) {
                                bRefresh = true;
                            }
                            if (oResult.urlParams && oResult.urlParams.length > 0) {
                                aUrlParams = aUrlParams.concat(oResult.urlParams);
                            }
                        });
                        if (bRefresh) {
                            that._refreshBrowser(aUrlParams);
                        }
                    }

                });
        },

        _executeEntrySave: function (oEntry) {
            var onSavePromise = oEntry.onSave(),
                oResultPromise;

            function onSuccess (params) {
                var oResult = {};
                if (params && params.refresh === true) {
                    oResult.refresh = true;
                }
                if (params && params.urlParams) {
                    oResult.urlParams = params.urlParams;
                }
                return oResult;
            }

            function onError (sErrorMessage) {
                return {
                    entry: oEntry.title,
                    error: sErrorMessage
                };
            }

            //jQuerry promise
            if (onSavePromise.promise) {
                Log.warning("jQuery.promise is used to save " + oEntry.title + " settings entry.\n"
                    + "The using of jQuery.promise for onSave is deprecated. Please use the native promise instead.");
                oResultPromise = new Promise(function (resolve) {
                    onSavePromise
                        .done(function (params) {
                            resolve(onSuccess(params));
                        })
                        .fail(function (sErrorMessage) {
                            resolve(onError(sErrorMessage));
                        });
                });
            } else {
                oResultPromise = onSavePromise.then(onSuccess, onError);
            }
             return oResultPromise;
        },

        _showSuccessMessageToast: function () {
            sap.ui.require(["sap/m/MessageToast"], function (MessageToast) {
                var sMessage = resources.i18n.getText("savedChanges");

                MessageToast.show(sMessage, {
                    width: "15em",
                    my: "center bottom",
                    at: "center bottom",
                    of: window,
                    offset: "0 -50",
                    collision: "fit fit"
                });
            });
        },

        _showErrorMessageBox: function (sErrMessageText) {
            sap.ui.require(["sap/m/MessageBox"], function (MessageBox) {
                MessageBox.show(sErrMessageText, {
                    icon: MessageBox.Icon.ERROR,
                    title: resources.i18n.getText("error"),
                    actions: [MessageBox.Action.OK]
                });
            });
        },

        /**
         * Close User Settings Dialog without saving.
         *
         * @private
         */
        _handleCancelButtonPress: function () {
            var aEntries = this.getView().getModel().getProperty("/entries");
            // Invoke onCancel function for opened entity
            var oInvokedEntities = EventHub.last("UserSettingsOpened") || {};
            if (oInvokedEntities) {
                aEntries.forEach(function (oEntry) {
                    if (oInvokedEntities[oEntry.id] && oEntry.onCancel) {
                        oEntry.onCancel();
                    }
                });
            }
            EventHub.emit("UserSettingsOpened", null);
            this._handleSettingsDialogClose();
        },

        /**
         * Close User Settings Dialog.
         *
         * @private
         */
        _handleSettingsDialogClose: function () {
            //to be sure that all user changes reset
            sap.ushell.Container.getUser().resetChangedProperties();
             // Clear selection from list.
             if (Device.system.phone) {
                this.getView().byId("settingsApp").toMaster("settingsView--userSettingMaster");
            }
            this.getView().byId("userSettingsDialog").close();
        }

    });

});
