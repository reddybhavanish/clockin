// Copyright (c) 2009-2020 SAP SE, All Rights Reserved
sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/model/json/JSONModel",
    "sap/ushell/Config",
    "sap/ushell/components/shell/UserSettings/UserPreferences",
    "sap/ushell/components/shell/UserSettings/UserSettings.controller" // Do not remove this
], function (
    UIComponent,
    JSONModel,
    Config,
    UserPreferences
) {
    "use strict";

    var aDoables = [];

    return UIComponent.extend("sap.ushell.components.shell.UserSettings.Component", {

        metadata: {
            rootView: {
                "viewName": "sap.ushell.components.shell.UserSettings.UserSettings",
                "type": "XML",
                "async": false,
                "id": "View"
            },
            version: "1.78.0",
            library: "sap.ushell",
            dependencies: {
                libs: ["sap.m"]
            }
        },

        createId: function (sId) {
            return "sapFlpUserSettings-" + sId;
        },

        /**
         * Initalizes the user settings by sett the models on the view and adding it as a dependent of the shell
         *
         * @private
         */
        init: function () {
            // call the init function of the parent
            UIComponent.prototype.init.apply(this, arguments);

            var oModel = new JSONModel({
                entries: Config.last("/core/userPreferences/entries"),
                profiling: Config.last("/core/userPreferences/profiling")
            });

            var oView = this.getRootControl();
            oView.setModel(oModel, "entries");

            aDoables.push(Config.on("/core/userPreferences/entries").do(function (aResult) {
                oView.getModel("entries").setProperty("/entries", aResult);
            }));

            aDoables.push(Config.on("/core/userPreferences/profiling").do(function (aResult) {
                oView.getModel("entries").setProperty("/profiling", aResult);
            }));
            //oView is added to the shell and from this point has shell model as default model: getModel()
            //shell model is used to render image for user account
            sap.ui.getCore().byId("shell").addDependent(oView);

            this._getSearchPrefs();
            UserPreferences.setModel();
        },

        /**
         * Load Search Settings.
         *
         * @private
         */
        _getSearchPrefs: function () {
            function isSearchButtonEnabled () {
                try {
                    return Config.last("/core/shellHeader/headEndItems").indexOf("sf") !== -1;
                } catch (err) {
                    jQuery.sap.log.debug("Shell controller._createWaitForRendererCreatedPromise: search button is not visible.");
                    return false;
                }
            }

            if (isSearchButtonEnabled()) {
                // search preferences (user profiling, concept of me)
                // entry is added async only if search is active
                sap.ui.require([
                    "sap/ushell/renderers/fiori2/search/userpref/SearchPrefs",
                    "sap/ushell/renderers/fiori2/search/SearchShellHelperAndModuleLoader"
                ], function (SearchPrefs) {
                    var searchPreferencesEntry = SearchPrefs.getEntry(),
                        oRenderer = sap.ushell.Container.getRenderer("fiori2");

                    searchPreferencesEntry.isSearchPrefsActive().done(function (isSearchPrefsActive) {
                        if (isSearchPrefsActive && oRenderer) {
                            // Add search as a profile entry
                            oRenderer.addUserProfilingEntry(searchPreferencesEntry);
                        }
                    });
                });
            }
        },

        /**
         * Turns the eventlistener in this component off.
         *
         * @private
         */
        exit: function () {
            for (var i = 0; i < aDoables.length; i++) {
                aDoables.off();
            }
        }
    });
});