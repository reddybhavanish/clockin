// Copyright (c) 2009-2020 SAP SE, All Rights Reserved
/**
 * @fileOverview handle all the resources for the different applications.
 * @version 1.78.0
 */
sap.ui.define([
    "sap/ushell/components/applicationIntegration/application/Application",
    "sap/ushell/components/container/ApplicationContainer",
    "sap/ushell/EventHub",
    "sap/ui/thirdparty/URI",
    "sap/ushell/components/applicationIntegration/application/PostMessageAPI",
    "sap/ui/thirdparty/jquery"
], function (Application, ApplicationContainer, EventHub, URI, PostMessageAPI, jQuery) {
    "use strict";

    function BlueBoxHandler () {
        var oCacheStorage,
            oMapAgentCallbacks = {},
            that = this,
            AppLifeCycle,
            oCustomCapabilitiesHandlers = {
                "isStateful": {
                    handler: function (appCapabilities, oContainer) {
                        if (appCapabilities && (appCapabilities.enabled === true || appCapabilities === true)) {
                            return true;
                        }

                        return false;
                    }
                },
                "isGUI": {
                    handler: function (appCapabilities, oContainer) {
                        if (appCapabilities && appCapabilities.protocol === "GUI") {
                            return true;
                        }

                        return false;
                    }
                },
                "isGUIStateful": {
                    handler: function (appCapabilities, oContainer) {
                        return that.isCapUT(oContainer, "isGUI") && that.isCapUT(oContainer, "isStateful");
                    }
                },
                "isFLP": {
                    handler: function (appCapabilities, oContainer) {
                        return !that.isCapUT(oContainer, "isGUI") && that.isCapUT(oContainer, "isStateful");
                    }
                }
            },
            oBlueBoxContainer = {},
            oStartupPlugins = {},
            oSupportedTypes = {},
            oHandlers = {
            //Default is the base for every type
                "DEFAULT": {
                    //hash code generator.
                    storageIdentifier: function (sUrl) {
                        return this._stripURL(sUrl);
                    },
                    //Enables to alter and embed parameters to the URL for the Initialization process of the BLueBox
                    //parameters are the url of the container and the newly created container.
                    setup: function (oTarget, sStorageKey) {
                    },
                    //hash code generator.
                    //loading takes place in two steps, creating the container and then lcreating the application
                    //In some cases when we create the BlueBox RT it will load the initial application, in order to save performance
                    //true: will prevent from creating the application in the first interaction of creating the stateful container
                    //false: will perform the step of crating the application
                    //attributes
                    // oInnerControl: the Stateful container
                    isContentLoaded: function (oInnerControl) {
                        return false;
                    },
                    //define actions to perform in order to communicate the creation of the application
                    //attributes
                    // oInnerControl: the Stateful container
                    // sType: the content type
                    // url as created by the urlTemeplate to be passed to the BlueBox
                    // return:
                    // return a promise
                    create: function (oInnerControl, sUrl, sStorageKey) {
                        return Application.postMessageToIframeApp(oInnerControl, "sap.ushell.services.appLifeCycle", "create", {
                            sCacheId: sStorageKey,
                            sUrl: sUrl,
                            sHash: window.hasher.getHash()
                        });
                    },
                    //Defines message to pass, in order to send a destroy application massage to the bluebox.
                    //attributes
                    // oInnerControl: the Stateful container
                    // return:
                    // return a promise
                    destroy: function (oInnerControl) {
                        return Application.postMessageToIframeApp(oInnerControl, "sap.ushell.services.appLifeCycle", "destroy", {});
                    },
                    //Defines message to pass, in order to send a store request to the bluebox.
                    //attributes
                    // oInnerControl: the Stateful container
                    // return:
                    // return a promise
                    store: function (oInnerControl, sStorageKey) {
                        // return Application.postMessageToIframeApp(oInnerControl, "sap.ushell.services.appLifeCycle", "store", {});
                    },
                    //Defines message to pass, in order to send a restore request to the bluebox.
                    //attributes
                    // oInnerControl: the Stateful container
                    // return:
                    // return a promise
                    restore: function (oInnerControl, sStorageKey) {
                        // return Application.postMessageToIframeApp(oInnerControl, "sap.ushell.services.appLifeCycle", "restore", {});
                    }
                },
                "URL": {
                    setup: function (oTarget, sStorageKey) {
                        // var sUrl = oTarget.url,
                        //     oUrl = URI(sUrl);
                        //
                        // oUrl.addSearch("storage-key", sStorageKey);
                        // oTarget.url = oUrl.toString();
                    },
                    //we dont know the app Id we pass te hole url, in the Storage we manage it using sCacheId (this is for the keep alive)
                    create: function (oInnerControl, sUrl, sStorageKey, oTarget) {
                        var oPromise;
                        sUrl = ApplicationContainer.prototype._adjustURLForIsolationOpeningWithoutURLTemplate(sUrl);
                        sap.ui.getCore().getEventBus().publish("launchpad", "appOpening", oTarget);
                        oPromise = Application.postMessageToIframeApp(oInnerControl, "sap.ushell.services.appLifeCycle", "create", {
                            sCacheId: sStorageKey,
                            sUrl: sUrl,
                            sHash: window.hasher.getHash()
                        }, true);

                        oPromise.then(function () {
                            oBlueBoxContainer[oInnerControl].currentAppTarget = oTarget;
                            sap.ui.getCore().getEventBus().publish("sap.ushell", "appOpened", oTarget);
                        });
                        return oPromise;
                    },
                    destroy: function (oInnerControl, sStorageKey) {
                        var oPromise;

                        oPromise = Application.postMessageToIframeApp(oInnerControl, "sap.ushell.services.appLifeCycle", "destroy", {
                            sCacheId: sStorageKey
                        }, true);

                        oPromise.then(function () {
                            sap.ui.getCore().getEventBus().publish("sap.ushell", "appClosed", oBlueBoxContainer[oInnerControl].currentAppTarget);
                            oBlueBoxContainer[oInnerControl].currentAppTarget = undefined;
                        });
                        return oPromise;
                    },
                    store: function (oInnerControl, sStorageKey) {
                        var oPromise;

                        oPromise = Application.postMessageToIframeApp(oInnerControl, "sap.ushell.services.appLifeCycle", "store", {
                            sCacheId: sStorageKey
                        }, true);

                        oPromise.then(function () {
                            sap.ui.getCore().getEventBus().publish("sap.ushell", "appClosed", oBlueBoxContainer[oInnerControl].currentAppTarget);
                            oBlueBoxContainer[oInnerControl].currentAppTarget = undefined;
                        });
                        return oPromise;
                    },
                    restore: function (oInnerControl, sStorageKey, oTarget) {
                        var oPromise;

                        sap.ui.getCore().getEventBus().publish("launchpad", "appOpening", oTarget);
                        oPromise = Application.postMessageToIframeApp(oInnerControl, "sap.ushell.services.appLifeCycle", "restore", {
                            sCacheId: sStorageKey,
                            sHash: window.hasher.getHash()
                        }, true);

                        oPromise.then(function () {
                            oBlueBoxContainer[oInnerControl].currentAppTarget = oTarget;
                            sap.ui.getCore().getEventBus().publish("sap.ushell", "appOpened", oTarget);
                        });

                        return oPromise;
                    }
                }
            };

        this.subscribePluginAgents = function (aAgentsLst, fnCallback) {
            Object.keys(aAgentsLst).map(function (sKey) {
                if (!oMapAgentCallbacks[sKey]) {
                    oMapAgentCallbacks[sKey] = [];
                }

                oMapAgentCallbacks[sKey].push(fnCallback);
            });
        };

        this._managePluginAgents = function (aComponentsWithAgent) {
            var that = this;

            var fnHandlePluginLife = function (oBlueBox, oInst, oStatus, sPluginAgentName) {
                var oStateToInterfacesMap = {
                        "loading": {
                            sInterface: "agentLoading"
                        },
                        "started": {
                            sInterface: "agentStart"
                        },
                        "exit": {
                            sInterface: "agentExit"
                        }
                    },
                    oInterfaceEntry = oStateToInterfacesMap[oStatus.status];
                if (oInterfaceEntry) {
                    if (oInst[oInterfaceEntry.sInterface]) {
                        oInst[oInterfaceEntry.sInterface](oBlueBox, sPluginAgentName, oStatus);
                    }
                }
            };

            //subscribe
            aComponentsWithAgent.forEach(function (oManagedPlugin) {
                var oInst = oManagedPlugin.pluginComp.componentHandle.getInstance();

                // check in all BlueBox for the oManagedPlugin.agents and notify that plugin
                Object.keys(oBlueBoxContainer).map(function (sBBKey) {
                    Object.keys(oManagedPlugin.agents).map(function (sPluginAgentName) {
                        if (oBlueBoxContainer[sBBKey].PlugIns && oBlueBoxContainer[sBBKey].PlugIns[sPluginAgentName]) {
                            var oStatus = oBlueBoxContainer[sBBKey].PlugIns[sPluginAgentName];

                            fnHandlePluginLife(oBlueBoxContainer[sBBKey].BlueBox, oInst, oStatus, sPluginAgentName);
                        }
                    });
                });

                that.subscribePluginAgents(oManagedPlugin.agents, function (oBlueBox, sPluginAgentName, oStatus) {
                    fnHandlePluginLife(oBlueBox, oInst, oStatus, sPluginAgentName);
                });
            });
        };

        this.startPluginAgentsLifeCycle = function () {
            var that = this;

            sap.ushell.Container.getServiceAsync("PluginManager").then(function (oPluginManager) {
                oPluginManager.registerAgentLifeCycleManager(that._managePluginAgents.bind(that));
            });
        };

        //API:
        //
        //LRU(limit)
        //  Initialize LRU cache with default limit being 10 items
        this.init = function (oSetup, inConfig, inAppLifeCycle) {
            var that = this;

            oCacheStorage = {};
            Application.init(this);
            AppLifeCycle = inAppLifeCycle;

            EventHub.once("StepDone").do(function () {
                that.startPluginAgentsLifeCycle();
            });

            EventHub.once("pluginConfiguration").do(function (oConf) {
                var oStartupPlugins = {};

                Object.keys(oConf).forEach(function (sKey) {
                    if (oConf[sKey].config && oConf[sKey].config["sap-component-agents"]) {
                        oStartupPlugins = jQuery.extend(true, oStartupPlugins, oConf[sKey].config["sap-component-agents"]);
                    }
                });
                that.setStartupPlugins(oStartupPlugins);
            });

            if (inConfig) {
                oSupportedTypes = jQuery.extend(true, oSupportedTypes, inConfig.supportedTypes);
            }

            PostMessageAPI.registerShellCommunicationHandler({
                "sap.ushell.appRuntime": {
                    oServiceCalls: {
                        "startupPlugins": {
                            executeServiceCallFn: function (oServiceParams) {
                                return new jQuery.Deferred().resolve(oStartupPlugins).promise();
                            }
                        },
                        "shellCheck": {
                            executeServiceCallFn: function (oServiceParams) {
                                return new jQuery.Deferred().resolve({
                                    InShell: true
                                }).promise();
                            }
                        }
                    }
                },
                "sap.ushell.services.pluginManager": {
                    oServiceCalls: {
                        "status": {
                            executeServiceCallFn: function (oServiceParams) {
                                var oStatus = oServiceParams.oMessageData.body,
                                    aListSubscriptions;

                                if (oServiceParams.oContainer && oBlueBoxContainer[oServiceParams.oContainer] && oStatus && oStatus.name && oBlueBoxContainer[oServiceParams.oContainer].PlugIns[oStatus.name]) {
                                    oBlueBoxContainer[oServiceParams.oContainer].PlugIns[oStatus.name].status = oStatus.status;

                                    aListSubscriptions = oMapAgentCallbacks[oStatus.name];

                                    if (aListSubscriptions) {
                                        aListSubscriptions.map(function (fnCallback) {
                                            fnCallback(oServiceParams.oContainer, oStatus.name, oStatus);
                                        });
                                    }

                                    return new jQuery.Deferred().resolve(oBlueBoxContainer[oServiceParams.oContainer].PlugIns).promise();
                                }

                                return new jQuery.Deferred().resolve({}).promise();
                            }
                        }
                    }
                }
            });
        };

        this.setStartupPlugins = function (oConfiguraton) {
            oStartupPlugins = JSON.parse(JSON.stringify(oConfiguraton));

            Object.keys(oStartupPlugins).forEach(function(sKey) {
                oStartupPlugins[sKey].status = "unknown";
            });
        };

        this.getPluginAgentStatus = function (oBlueBox, sAgent) {
            return JSON.parse(JSON.stringify(oBlueBoxContainer[oBlueBox].PlugIns[sAgent]));
        };

        this.isStatefulContainerSupported = function  (oBlueBox) {
            var bIsSupported =
                this.isCapabilitySupported(oBlueBox, "sap.ushell.services.appLifeCycle", "create") &&
                this.isCapabilitySupported(oBlueBox, "sap.ushell.services.appLifeCycle", "destroy");

            return bIsSupported;
        };

        this.isKeepAliveSupported = function  (oBlueBox) {
            var bIsSupported =
                this.isCapabilitySupported(oBlueBox, "sap.ushell.services.appLifeCycle", "store") &&
                this.isCapabilitySupported(oBlueBox, "sap.ushell.services.appLifeCycle", "restore");

            return bIsSupported;
        };

        this.mapCapabilities= function (oContainer, aCaps) {
            this.setCapabilities(oContainer, aCaps);
        };

        this.getCapabilities = function (oBlueBox) {
            return oBlueBoxContainer[oBlueBox].oCapMap;
        };

        this.isCapabilitySupported = function (oBlueBox, sServiceName, sInterface) {
            if (oBlueBoxContainer[oBlueBox] && oBlueBoxContainer[oBlueBox].oCapMap && oBlueBoxContainer[oBlueBox].oCapMap[sServiceName]) {
                    return !!oBlueBoxContainer[oBlueBox].oCapMap[sServiceName][sInterface];
            }

            return false;
        };

        this.setCapabilities = function (oBlueBox, oCap) {
            var oCapMap;

            if (!oBlueBoxContainer[oBlueBox]) {
                this.InitBlueBoxBD(oBlueBox);
            }

            if (!oBlueBoxContainer[oBlueBox].oCapMap) {
                oBlueBoxContainer[oBlueBox].oCapMap = {};
            }

            oCapMap = oBlueBoxContainer[oBlueBox].oCapMap;

            Object.keys(oCap).forEach(function (key) {
                var  oCapEntry = oCap[key],
                    oCapMapService;

                if (!oCapMap[oCapEntry.service]) {
                    oCapMap[oCapEntry.service] = {};
                }

                oCapMapService = oCapMap[oCapEntry.service];

                oCapMapService[oCapEntry.action] = true;

            });

            // set stateful in order to disable rendering of container
            if (!oBlueBox.getIsStateful() && this.isStatefulContainerSupported(oBlueBox)) {
                oBlueBox.setIsStateful(true);
            }

        };

        this.removeCapabilities = function (oBlueBox) {
            if (oBlueBoxContainer[oBlueBox]) {
                oBlueBoxContainer[oBlueBox].oCapMap = {};
                oBlueBox.setIsStateful(false);
            }
        };

        this.hasIFrame = function (oBlueBox) {
            if (oBlueBox && oBlueBox._getIFrame) {
                return true;
            }

            return false;
        };

        this.getStorageKey = function (oBlueBox) {
            return oBlueBoxContainer[oBlueBox].sStorageKey;
        };

        this.InitBlueBoxBD = function (oBlueBox) {
            oBlueBoxContainer[oBlueBox] = {
                BlueBox: oBlueBox,
                PlugIns:  JSON.parse(JSON.stringify(oStartupPlugins))
            };

        };

        this.setAppCapabilities = function (oBlueBox, oTarget) {
            if (!oBlueBoxContainer[oBlueBox]) {
                this.InitBlueBoxBD(oBlueBox);
            }

            oBlueBoxContainer[oBlueBox].currentAppTarget = oTarget;
            oBlueBoxContainer[oBlueBox].appCapabilities = oTarget.appCapabilities;
        };

        this.forEach = function (callback) {
            var key;

            for (key in oBlueBoxContainer) {
                if (oBlueBoxContainer.hasOwnProperty(key)) {
                    callback(oBlueBoxContainer[key].BlueBox);
                }
            }
        };

        this.isCapByTarget = function (oTarget, attr) {
            // check if we have custom handling for this attribute
            if (oTarget.appCapabilities === undefined) {
                return false;
            }

            if (oCustomCapabilitiesHandlers[attr] && oTarget && oTarget.appCapabilities) {
                return oCustomCapabilitiesHandlers[attr].handler(oTarget.appCapabilities);
            }
            // get the attribute value from the appCapabilities
            // if not define return false
            return oTarget.appCapabilities[attr] || false;
        };

        this.isCapUT = function (oBlueBox, attr) {
            // check if we have custom handling for this attribute
            var oBBInstance = oBlueBoxContainer[oBlueBox];

            // check if we have custom handling for this attribute
            if (oBBInstance  === undefined|| oBBInstance.appCapabilities === undefined) {
                return false;
            }

            if (oCustomCapabilitiesHandlers[attr] && oBBInstance) {
                return oCustomCapabilitiesHandlers[attr].handler(oBBInstance.appCapabilities, oBlueBox);
            }
            // get the attribute value from the appCapabilities
            // if not define return false
            return oBBInstance.appCapabilities[attr] || false;
        };

        this.setStorageKey = function (oBlueBox, setStorageKey) {
            if (!oBlueBoxContainer[oBlueBox]) {
                this.InitBlueBoxBD(oBlueBox);
            }

            oBlueBoxContainer[oBlueBox].sStorageKey = setStorageKey;
        };

        this.getStorageKey = function (oBlueBox) {
            if (!oBlueBoxContainer[oBlueBox]) {
                return undefined;
            }
            return oBlueBoxContainer[oBlueBox].sStorageKey;
        };

        this.getHandler = function () {
            //Default is the base for every Type
            return jQuery.extend(true, oHandlers.DEFAULT, oHandlers["URL"]);
        };

        this._stripURL = function (sUrl) {
            var sHost;

            //special case for OPA tests
            if (sUrl === "../") {
                return sUrl;
            }

            sHost = new URI(sUrl).hostname();

            if (!sHost || sHost === "") {
                return sUrl;
            }
        };

        this.deleteStateFul = function (sUrl) {
            var sDomainUrl = this._stripURL(sUrl);

            return this.delete(sDomainUrl);
        };

        this.getStateFul = function (sUrl) {
            var sDomainUrl = this._stripURL(sUrl);

            return this.get(sDomainUrl);
        };

        // this.createCachedInstance = function (oConfig) {
        //     var oAppContainer = Application.createApplicationContainer(oConfig.setup.id, {
        //         additionalInformation: undefined,
        //         applicationConfiguration: undefined,
        //         applicationType: "URL",
        //         fullWidth: undefined,
        //         navigationMode: "embedded",
        //         targetNavigationMode: "explace",
        //         text: undefined,
        //         url: oConfig.setup.sUrl,
        //         shellUIService: oSetup.oShellUIService.getInterface(),
        //         appIsolationService: oSetup.oAppIsolationService.getInterface()
        //     }, this);
        //
        //     oCacheStorage[oConfig.setup.sUrl] = oAppContainer;
        //     AppLifeCycle.addControl(oAppContainer);
        // };

        this.destroyApp = function (sAppId) {
            AppLifeCycle.postMessageToIframeApp("sap.ushell.services.appLifeCycle", "destroy", {
                appId: sAppId
            });
        };

        this.openApp = function (sAppId) {
            AppLifeCycle.postMessageToIframeApp("sap.ushell.services.appLifeCycle", "create", {
                appId: sAppId,
                sHash: window.hasher.getHash()
            });
        };

        this.storeApp = function (sAppId) {
            AppLifeCycle.postMessageToIframeApp("sap.ushell.services.appLifeCycle", "store", {
                appId: sAppId,
                sHash: window.hasher.getHash()
            });
        };

        this.restoreApp = function (sAppId) {
            AppLifeCycle.postMessageToIframeApp("sap.ushell.services.appLifeCycle", "restore", {
                appId: sAppId,
                sHash: window.hasher.getHash()
            });
        };

        //delete(sUrl)
        //  delete a single entry from the cols start cache
        this.delete = function (sUrl) {
            if (oCacheStorage[sUrl]) {
                delete oCacheStorage[sUrl];
            }
        };


        //get(sUrl)
        //  Retrieve a single entry from the cols start cache
        this.get = function (sUrl) {
            return oCacheStorage[sUrl];
        };

        this.getById = function (sId) {
            for (var sKey in oCacheStorage) {
                if (oCacheStorage.hasOwnProperty(sKey)) {
                    var oEntry = oCacheStorage[sKey];

                    if (oEntry.sId === sId) {
                        return oEntry;
                    }
                }
            }
        };

        //set(key, value)
        //  Change or add a new value in the cache
        //  We overwrite the entry if it already exists
        this.set = function (sUrl, oIframe) {
            var sStripUrl = this._stripURL(sUrl);

            oCacheStorage[sStripUrl] = oIframe;
        };

        //forEach(function(){})
        //  Traverse through the cache elements using a callback function
        //  Returns args [node element, element number, cache instance] for the callback function to use
        // this.forEach = function (callback) {
        //     oCacheStorage.forEach(callback);
        // };

        //toJSON()
        //  Returns a JSON representation of the cache

        //toString()
        //  Returns a String representation of the cache

    }


    return new BlueBoxHandler();
}, /* bExport= */ true);