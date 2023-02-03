// Copyright (c) 2009-2020 SAP SE, All Rights Reserved
sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/model/json/JSONModel",
    "sap/ushell/Config"
], function (UIComponent, JSONModel, Config) {
    "use strict";

    return UIComponent.extend("sap.ushell.components.shell.MenuBar.Component", {
        metadata: {
            manifest: "json",
            library: "sap.ushell"
        },
        init: function () {

            UIComponent.prototype.init.apply(this, arguments);
            var oMenuModel = new JSONModel();
            this.setModel(oMenuModel, "menu");

            sap.ushell.Container.getServiceAsync("Menu")
                .then(function (oMenuService) {
                    return Promise.all([
                        oMenuService.isMenuEnabled(),
                        oMenuService.getMenuEntries()
                    ]);
                })
                .then(function (aResults) {
                    var oComponentContainer;
                    var bIsEnabled = aResults[0];
                    var aMenuEntries = aResults[1];
                    if (bIsEnabled) {
                        oComponentContainer = sap.ui.getCore().byId("menuBarComponentContainer");
                    }
                    if (oComponentContainer) {
                        oMenuModel.setProperty("/", this._limitListDepth(aMenuEntries, 3));
                        oComponentContainer.setComponent(this);
                    }
                    if (Config.last("/core/shell/model/currentState/stateName")!=="home") {
                        oComponentContainer.setVisible(false);
                    }
                }.bind(this));
        },

        /**
         * Reduces the object tree recursively to specific depth
         * @param {object[]} aList A list of objects representing a tree
         * @param {number} iDepthLimit The maximum depth of the object
         * @returns {object[]} The manipulated object tree
         *
         * @private
         * @since 1.77.0
         */
        _limitListDepth: function (aList, iDepthLimit) {
            if (iDepthLimit === 0) {
                return [];
            }
            return aList.reduce(function (aEntries, oEntry) {
                if (oEntry.menuEntries) {
                    oEntry.menuEntries = this._limitListDepth(oEntry.menuEntries, iDepthLimit - 1);
                }
                aEntries.push(oEntry);
                return aEntries;
            }.bind(this), []);
        }
    });
});