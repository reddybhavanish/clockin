// Copyright (c) 2009-2020 SAP SE, All Rights Reserved

sap.ui.define([
    "sap/ui/core/mvc/XMLView",
    "sap/ui/core/Locale",
    "sap/ui/core/LocaleData",
    "sap/base/Log",
    "sap/ushell/resources"
], function (
    XMLView,
    Locale,
    LocaleData,
    Log,
    resources
) {
    "use strict";

    function getEntry () {
        var oViewInstance;

        var oEntry = {
            id: "language",
            entryHelpID: "language",
            title: resources.i18n.getText("languageRegionTit"),
            valueResult: null,
            contentResult: null,
            icon: "sap-icon://globe",
            valueArgument: function () {
                var sUserLanguage = sap.ushell.Container.getUser().getLanguage().toUpperCase(),
                    oLocaleData = LocaleData.getInstance(new Locale(sUserLanguage)),
                    sTimeFormat = oLocaleData.getTimePattern("medium").indexOf("H") === -1 ? "12h" : "24h";
                if (sUserLanguage.indexOf("-") > -1) {
                    sUserLanguage = sUserLanguage.replace("-", " (").concat(")");
                }

                return Promise.resolve(sUserLanguage + " | " + resources.i18n.getText("timeFormatFld") + ": " + sTimeFormat);
            },
            contentFunc: function () {
                return XMLView.create({
                    id: "languageRegionSelector",
                    viewName: "sap.ushell.components.shell.Settings.userLanguageRegion.LanguageRegionSelector"
                }).then(function (oView) {
                    oViewInstance = oView;
                    return oView;
                });
            },
            onSave: function () {
                if (oViewInstance) {
                    return oViewInstance.getController().onSave();
                }
                Log.warning(
                    "Save operation for language settings was not executed, because the languageRegionSelector view was not initialized"
                );
                return Promise.resolve();

            },
            onCancel: function () {
                if (oViewInstance) {
                    oViewInstance.getController().onCancel();
                    return;
                }
                Log.warning(
                    "Cancel operation for language settings was not executed, because the languageRegionSelector view was not initialized"
                );
            }
        };

        return oEntry;
    }



    return {
        getEntry: getEntry
    };

});
