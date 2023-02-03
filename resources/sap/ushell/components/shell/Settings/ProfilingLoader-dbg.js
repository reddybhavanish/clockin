// Copyright (c) 2009-2020 SAP SE, All Rights Reserved

sap.ui.define([
    "sap/ushell/Config"
], function (Config) {
    "use strict";

    /**
     * Load Search Settings.
     *
     * @returns {Promise<undefined>} Resolves when SearchProfiling is loaded or disabled
     * @private
     */
    function _loadSearchProfiling () {

        var oShellConfig = sap.ushell.Container.getRenderer("fiori2").getShellConfig() || {},
            isSearchEnabled = oShellConfig.enableSearch;

        if (isSearchEnabled) {
            // search preferences (user profiling, concept of me)
            // entry is added async only if search is active
            return new Promise(function (resolve) {
                sap.ui.require([
                    "sap/ushell/renderers/fiori2/search/userpref/SearchPrefs",
                    "sap/ushell/renderers/fiori2/search/SearchShellHelperAndModuleLoader"
                ], function (SearchPrefs) {
                    var oSearchPreferencesEntry = SearchPrefs.getEntry(),
                        oRenderer = sap.ushell.Container.getRenderer("fiori2");

                    oSearchPreferencesEntry.isSearchPrefsActive().done(function (isSearchPrefsActive) {
                        if (isSearchPrefsActive && oRenderer) {
                            // Add search as a profile entry
                            oRenderer.addUserProfilingEntry(oSearchPreferencesEntry);
                        }
                    }).always(resolve);
                });
            });
        }
        return Promise.resolve();
    }

    /**
     * Load UsageAnalytics Profiling
     *
     * @returns {Promise<undefined>} Resolves when UsageAnalyticsProfiling is loaded or disabled
     * @private
     */
    function _loadUsageAnalyticsProfiling () {
        return new Promise(function (resolve) {
            sap.ushell.Container.getServiceAsync("UsageAnalytics").then(function (UsageAnalyticsService) {
                if (UsageAnalyticsService.systemEnabled() && UsageAnalyticsService.isSetUsageAnalyticsPermitted()) {
                    sap.ui.require([
                        "sap/ushell/components/shell/Settings/userProfiling/UsageAnalyticsProfiling"
                    ], function (UsageAnalyticsProfiling) {
                        var aProfiles = Config.last("/core/userPreferences/profiling");
                        aProfiles.push(UsageAnalyticsProfiling.getProfiling());
                        Config.emit("/core/userPreferences/profiling", aProfiles);
                        resolve();
                    });
                } else {
                    resolve();
                }
            });
        });
    }

    return function loadProfiling () {
        return Promise.all([
            _loadUsageAnalyticsProfiling(),
            _loadSearchProfiling()
        ]);
    };
});