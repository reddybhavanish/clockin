// Copyright (c) 2009-2020 SAP SE, All Rights Reserved

sap.ui.define([
    "sap/base/Log",
    "sap/ui/core/mvc/XMLView",
    "sap/ushell/resources"
], function (
    Log,
    XMLView,
    resources
) {
    "use strict";

    return {
        getEntry: function () {
            var oViewInstance;
            return {
                id: "spacesEntry",
                entryHelpID: "spaces",
                title: resources.i18n.getText("spaces"),
                valueResult: null,
                contentResult: null,
                icon: "sap-icon://home",
                valueArgument: null,
                contentFunc: function () {
                    return XMLView.create({
                        id: "UserSettingsSpacesSettingsView",
                        viewName: "sap.ushell.components.shell.Settings.spaces.SpacesSetting"
                    }).then(function (oView) {
                        oViewInstance = oView;
                        return oViewInstance;
                    });
                },
                onSave: function () {
                    if (oViewInstance) {
                        return oViewInstance.getController().onSave();
                    }
                    Log.warning("Save operation for user account settings was not executed, because the spaces view was not initialized");
                    return Promise.resolve();

                },
                onCancel: function () {
                    if (oViewInstance) {
                        oViewInstance.getController().onCancel();
                        return;
                    }
                    Log.warning("Cancel operation for user account settings was not executed, because the spaces view was not initialized");
                },
                provideEmptyWrapper: false
            };
        }
    };

});
