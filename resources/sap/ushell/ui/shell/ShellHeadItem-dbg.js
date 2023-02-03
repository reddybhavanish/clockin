// Copyright (c) 2009-2020 SAP SE, All Rights Reserved

sap.ui.define([
    "sap/base/util/ObjectPath",
    "sap/ui/core/Control",
    "sap/ui/core/IconPool",
    "sap/ui/core/InvisibleText",
    "sap/ushell/resources"
], function (
    ObjectPath,
    Control,
    IconPool,
    InvisibleText,
    resources
) {
    "use strict";

    /**
     * Constructor for a new ShellHeadItem.
     *
     * @param {string} [sId] id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @class Header Action item of the Shell.
     * @extends sap.ui.core.Control
     *
     * @author SAP SE
     * @version 1.78.0
     *
     * @constructor
     * @private
     * @since 1.15.1
     * @alias sap.ushell.ui.shell.ShellHeadItem
     * @ui5-metamodel This control/element also will be described in the UI5 (legacy) designtime metamodel
     */
    var ShellHeadItem = Control.extend("sap.ushell.ui.shell.ShellHeadItem", /** @lends sap.ushell.ui.shell.ShellHeadItem.prototype */ {
        metadata: {
            properties: {
                /**
                 * If set to true, a divider is displayed before the item.
                 * @deprecated Since version 1.18.
                 * Dividers are not supported anymore.
                 * @private
                 */
                startsSection: {
                    type: "boolean",
                    group: "Appearance",
                    defaultValue: false,
                    deprecated: true
                },
                /**
                 * If set to true, a separator is displayed after the item.
                 * @since 1.22.5
                 * @deprecated since version 1.62, this property is never used in Fiori 2+ and is ignored
                 * @private
                 */
                showSeparator: {
                    type: "boolean",
                    group: "Appearance",
                    defaultValue: false,
                    deprecated: true
                },
                /**
                 * If set to false, the button isn't clickable and displayed as disabled.
                 * @since 1.38
                 * @private
                 */
                enabled: {
                    type: "boolean",
                    group: "Appearance",
                    defaultValue: true
                },
                /**
                 * If set to true, the item gets a special design.
                 * @private
                 */
                selected: {
                    type: "boolean",
                    group: "Appearance",
                    defaultValue: false
                },
                /**
                 * If set to true, a theme dependent marker is shown on the item.
                 * @deprecated Since version 1.18.
                 * Markers should not be used anymore.
                 * @private
                 */
                showMarker: {
                    type: "boolean",
                    group: "Appearance",
                    defaultValue: false,
                    deprecated: true
                },
                /**
                 * The icon of the item, either defined in the sap.ui.core.IconPool or an URI to a custom image. An icon must be set.
                 */
                icon: {
                    type: "sap.ui.core.URI",
                    group: "Appearance",
                    defaultValue: null
                },
                target: {
                    type: "sap.ui.core.URI",
                    group: "Appearance",
                    defaultValue: null
                },
                ariaLabel: {
                    type: "string",
                    group: "Accessibility",
                    defaultValue: null
                },
                ariaHidden: {
                    type: "boolean",
                    group: "Accessibility",
                    defaultValue: false
                },
                ariaHaspopup: {
                    type: "string",
                    group: "Accessibility",
                    defaultValue: ""
                },
                /**
                 * The text of the item. Text is only visible if the item is not rendered as part of the Header
                 * i.e. if it is rendered as part of an overflow button in a Popover
                 * @since 1.38
                 */
                text: {
                    type: "string",
                    group: "Appearance",
                    defaultValue: null
                },
                floatingNumber: {
                    type: "int",
                    group: "Appearance",
                    defaultValue: null
                },
                floatingNumberMaxValue: {
                    type: "int",
                    group: "Appearance",
                    defaultValue: 999
                },
                floatingNumberType: {
                    type: "string",
                    group: "Appearance",
                    defaultValue: "None"
                }
            },
            events: {
                /**
                 * Event is fired when the user presses the item.
                 */
                press: {}
            }
        },
        renderer: {
            apiVersion: 2,
            render: function (rm, shellHeadItem) {
                var sTarget = shellHeadItem.getTarget() || "";
                rm.openStart("a", shellHeadItem);
                rm.attr("tabindex", "0");
                if (sTarget !== "") {
                    rm.attr("href", shellHeadItem.getTarget());
                }

                rm.accessibilityState({
                    role: sTarget ? "link" : "button",
                    label: shellHeadItem.getAriaLabel() || undefined,
                    hidden: shellHeadItem.getAriaHidden() || undefined,
                    haspopup: shellHeadItem.getAriaHaspopup() || undefined,
                    describedby: { value: shellHeadItem._oAriaDescribedbyText.getId(), append: true }
                });

                if (shellHeadItem.getFloatingNumber() > 0) {
                    rm.class("sapUshellShellHeadItmCounter");
                    rm.attr("data-counter-content", shellHeadItem.floatingNumberFormatter());
                }

                rm.class("sapUshellShellHeadItm");

                if (!shellHeadItem.getEnabled()) {
                    rm.class("sapUshellShellHeadItmDisabled");
                }

                if (!shellHeadItem.getVisible()) {
                    rm.class("sapUshellShellHidden");
                }

                if (shellHeadItem.getSelected()) {
                    rm.class("sapUshellShellHeadItmSel");
                }

                if (shellHeadItem.getTooltip_AsString()) {
                    rm.attr("title", shellHeadItem.getTooltip_AsString());
                }
                rm.openEnd(); // a - tag

                rm.openStart("span"); // actual icon is placed into the span
                rm.class("sapUshellShellHeadItmCntnt");

                var oIcon = shellHeadItem.getIcon();
                var oIconInfo = IconPool.isIconURI(oIcon) && IconPool.getIconInfo(oIcon);
                if (oIconInfo) {
                    rm.style("font-family", oIconInfo.fontFamily);
                    rm.openEnd(); // span - tag
                    rm.text(oIconInfo.content);
                } else {
                    rm.openEnd(); // span - tag
                    rm.voidStart("img");
                    rm.attr("id", shellHeadItem.getId() + "-img-inner");
                    rm.attr("src", oIcon);
                    rm.voidEnd(); // img - tag
                }

                rm.close("span");
                rm.close("a");
            }
        }
    });

    /**
     * Types for the "floatingNumber".
     *
     * @enum {string}
     */
    ShellHeadItem.prototype.FloatingNumberType = {
        /**
         * Used when the "floatingNumber" should be disregarded.
         */
        None: "None",
        /**
         * Used when the "floatingNumber" should represent the number of new notifications.
         */
        Notifications: "Notifications",
        /**
         * Used when the "floatingNumber" should represent the number of new notifications,
         * but is displayed in an "overflow" button instead of the "notifications" button itself.
         */
        OverflowButton: "OverflowButton"
    };

    ShellHeadItem.prototype.init = function () {
        // this method is also called by "sap.ushell.ui.shell.OverflowListItem"
        this._oAriaDescribedbyText = new InvisibleText(this.getId() + "-describedby").toStatic();
        this.addDependent(this._oAriaDescribedbyText);
    };

    ShellHeadItem.prototype.onBeforeRendering = function () {
        // this method is also called by "sap.ushell.ui.shell.OverflowListItem"
        switch (this.getFloatingNumberType()) {
            case this.FloatingNumberType.None:
                this._oAriaDescribedbyText.setText("");
                break;
            default:
                var count = this.getFloatingNumber();
                if (!count) {
                    this._oAriaDescribedbyText.setText("");
                } else {
                    var maxValue = this.getFloatingNumberMaxValue();
                    this._oAriaDescribedbyText.setText((count > maxValue)
                        ? resources.i18n.getText("NotificationToggleButton.NewNotifications.MaxExceeded", maxValue)
                        : resources.i18n.getText("NotificationToggleButton.NewNotifications", count)
                    );
                }
                break;
        }
    };

    /**
     * Returns the final string to be used as the tooltip.
     *
     * @param {int} [floatingNumber] If provided, this argument value will be used instead of "this.getFloatingNumber()".
     *   Providing this argument might be useful, for example, when calling this method from inside of a formatter,
     *   where the value returned from "this.getFloatingNumber()" might still be outdated at that point.
     * @returns {string} The final string to be used as the tooltip.
     */
    ShellHeadItem.prototype.tooltipFormatter = function (floatingNumber) {
        // this method is also called by "sap.ushell.ui.shell.OverflowListItem"
        var count = ((typeof floatingNumber !== "undefined") ? floatingNumber : this.getFloatingNumber());
        var maxValue = this.getFloatingNumberMaxValue();
        switch (this.getFloatingNumberType()) {
            default:
            case this.FloatingNumberType.None:
                return "";
            case this.FloatingNumberType.Notifications:
                if (!count) { return resources.i18n.getText("NotificationToggleButton.NoNewNotifications"); }
                return (count > maxValue
                    ? resources.i18n.getText("NotificationToggleButton.NewNotifications.MaxExceeded", maxValue)
                    : resources.i18n.getText("NotificationToggleButton.NewNotifications", count));
            case this.FloatingNumberType.OverflowButton:
                var sTooltip = resources.i18n.getText("shellHeaderOverflowBtn_tooltip");
                if (!count) { return sTooltip; }
                sTooltip += " (" + (count > maxValue
                    ? resources.i18n.getText("NotificationToggleButton.NewNotifications.MaxExceeded", maxValue)
                    : resources.i18n.getText("NotificationToggleButton.NewNotifications", count)) + ")";
                return sTooltip;
        }
    };

    /**
     * Returns the final string to be used as the floating number badge.
     *
     * @param {int} [floatingNumber] If provided, this argument value will be used instead of "this.getFloatingNumber()".
     *   Providing this argument might be useful, for example, when calling this method from inside of a formatter,
     *   where the value returned from "this.getFloatingNumber()" might still be outdated at that point.
     * @returns {string} The final string to be used as the floating number badge.
     */
    ShellHeadItem.prototype.floatingNumberFormatter = function (floatingNumber) {
        // this method is also called by "sap.ushell.ui.shell.OverflowListItem"
        var count = ((typeof floatingNumber !== "undefined") ? floatingNumber : this.getFloatingNumber());
        var maxValue = this.getFloatingNumberMaxValue();
        return (count > maxValue ? maxValue + "+" : count.toString());
    };

    ShellHeadItem.prototype.onclick = function (oEvent) {
        if (this.getEnabled()) {
            this.firePress();
            // IE always interprets a click on an anker as navigation and thus triggers the
            // beforeunload-event on the window. Since a ShellHeadItem never has a valid href-attribute,
            // the default behavior should never be triggered
            if (!this.getTarget()) {
                oEvent.preventDefault();
            }
        }
    };

    ShellHeadItem.prototype.onsapspace = ShellHeadItem.prototype.onclick;
    ShellHeadItem.prototype.onsapenter = ShellHeadItem.prototype.onclick;

    // in case someone already using the API sap.ushell.renderers.fiori2.RendererExtensions.addHeaderItem
    // with sap.ui.unified.ShellHeadItem() instance
    ObjectPath.set("sap.ui.unified.ShellHeadItem", ShellHeadItem);

    return ShellHeadItem;
}, true /* bExport */);
