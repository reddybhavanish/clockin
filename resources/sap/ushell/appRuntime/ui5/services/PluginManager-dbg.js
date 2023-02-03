// Copyright (c) 2009-2020 SAP SE, All Rights Reserved
sap.ui.define([
    "sap/ushell/services/PluginManager",
    "sap/ushell/appRuntime/ui5/AppRuntimeService",
    "sap/ushell/appRuntime/ui5/AppRuntime"
], function (PluginManager, AppRuntimeService, AppRuntime) {
    "use strict";

    function PluginManagerProxy (oContainerInterface, sParameter, oServiceProperties) {
        PluginManager.call(this, oContainerInterface, sParameter, oServiceProperties);

        var orgRegisterPlugins = this.registerPlugins,
            orgHandlePluginCreation = this._handlePluginCreation;

        this.isPluginAgentSupported = function (sSapAgentId) {
            var oStartupPlugins = AppRuntime.getStartupPlugins();

            return !!oStartupPlugins[sSapAgentId];
        };

        this._handlePluginCreation = function (sPluginCategory, sPluginName, oPluginDeferred) {
            // set plugin state as loading
            var oPlugin = this._oPluginCollection[sPluginCategory][sPluginName],
                sAgentId = oPlugin.config["sap-plugin-agent-id"];

            orgHandlePluginCreation.call(this, sPluginCategory, sPluginName, oPluginDeferred);
            AppRuntimeService.sendMessageToOuterShell(
                "sap.ushell.services.pluginManager.status", {
                    name: sAgentId,
                    status: "loading"
                });

            oPluginDeferred.then(function (oLoadedComponent) {
                var oInst = oLoadedComponent.componentHandle.getInstance(),
                    orgExit = oInst.exit;

                // set plugin state as started
                AppRuntimeService.sendMessageToOuterShell(
                    "sap.ushell.services.pluginManager.status", {
                        name: sAgentId,
                        status: "started"
                    });

                //AOP, bind Exit life cycle post message
                oInst.exit = function () {
                    orgExit(arguments);

                    // set plugin state as started
                    AppRuntimeService.sendMessageToOuterShell(
                        "sap.ushell.services.pluginManager.status", {
                            name: sAgentId,
                            status: "exit"
                        });
                };
            }).fail(function (oErr) {
                // set plugin state as failed
                AppRuntimeService.sendMessageToOuterShell(
                    "sap.ushell.services.pluginManager.status", {
                        name: sAgentId,
                        status: "failed"
                    });
            });
        };

        this.registerPlugins = function (oPlugins) {
            orgRegisterPlugins.call(this, oPlugins);
        };

    }

    PluginManagerProxy.prototype = Object.create(PluginManager.prototype);
    PluginManagerProxy.hasNoAdapter = PluginManager.hasNoAdapter;

    return PluginManagerProxy;
}, true);
