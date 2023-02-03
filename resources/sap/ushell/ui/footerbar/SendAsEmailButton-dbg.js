/*!
 * Copyright (c) 2009-2020 SAP SE, All Rights Reserved
 */

// Provides control sap.ushell.ui.footerbar.SendAsEmailButton.
sap.ui.define([
    "sap/m/Button",
    "sap/ushell/library",
    "sap/ushell/resources",
    "./SendAsEmailButtonRenderer",
    "sap/ushell/appRuntime/ui5/AppRuntimeService"
], function (Button, library, resources, SendAsEmailButtonRenderer, AppRuntimeService) {
    "use strict";

    /**
     * Constructor for a new ui/footerbar/SendAsEmailButton.
     *
     * @param {string} [sId] id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @class
     * Add your documentation for the newui/footerbar/SendAsEmailButton
     * @extends sap.m.Button
     *
     * @constructor
     * @public
     * @name sap.ushell.ui.footerbar.SendAsEmailButton
     * @ui5-metamodel This control/element also will be described in the UI5 (legacy) designtime metamodel
     */
    var SendAsEmailButton = Button.extend("sap.ushell.ui.footerbar.SendAsEmailButton",
        /** @lends sap.ushell.ui.footerbar.SendAsEmailButton.prototype */ { metadata: {
            library: "sap.ushell",
            properties: {
                beforePressHandler: {type: "any", group: "Misc", defaultValue: null},
                afterPressHandler: {type: "any", group: "Misc", defaultValue: null}
            }
        }});

    /**
     * SendAsEmailButton
     *
     * @name sap.ushell.ui.footerbar.SendAsEmailButton
     * @private
     * @since 1.71.0
     */
    SendAsEmailButton.prototype.init = function () {
        var that = this;

        this.setIcon("sap-icon://email");
        this.setText(resources.i18n.getText("sendEmailBtn"));
        this.setTooltip(resources.i18n.getText("sendEmailBtn_tooltip"));

        this.attachPress(function () {
            if (that.getBeforePressHandler()) {
                that.getBeforePressHandler()();
            }
            this.sendAsEmailPressed(that.getAfterPressHandler());
        });

        //call the parent sap.m.Button init method
        if (Button.prototype.init) {
            Button.prototype.init.apply(this, arguments);
        }
    };

    /**
     *
     * @param cb
     */
    SendAsEmailButton.prototype.sendAsEmailPressed = function (cb) {
        //If we're running over an IFrame...
        if (sap.ushell.Container.runningInIframe && sap.ushell.Container.runningInIframe()) {
            AppRuntimeService.sendMessageToOuterShell(
                "sap.ushell.services.ShellUIService.sendEmailWithFLPButton",
                {"bSetAppStateToPublic": true});
        } else {
            sap.m.URLHelper.triggerEmail(
                null,
                "Link to application",
                document.URL
            );
        }

        if (cb) {
            cb();
        }
    };

    return SendAsEmailButton;

}, true /* bExport */);
