// Copyright (c) 2009-2020 SAP SE, All Rights Reserved
sap.ui.define([], function () {
    "use strict";

    var VizInstanceRenderer = {
        apiVersion: 2
    };

    VizInstanceRenderer.render = function (oRm, oVizInstance) {
        oRm.openStart("div", oVizInstance);
        oRm.class("sapUshellVizInstance");
        oRm.openEnd();

        if (oVizInstance.getEditable()) {
            VizInstanceRenderer._renderOverlay(oRm, oVizInstance);
        }
        VizInstanceRenderer._renderInnerControl(oRm, oVizInstance);

        oRm.close("div");
    };

    VizInstanceRenderer._renderOverlay = function (oRm, oVizInstance) {
        oRm.openStart("div");
        oRm.class("sapMPointer");
        oRm.class("sapUshellTileDeleteClickArea");
        oRm.openEnd();

        oRm.openStart("div");
        oRm.class("sapUshellTileDeleteIconOuterClass");
        oRm.openEnd();
        oRm.renderControl(oVizInstance.getAggregation("removeIcon"));
        oRm.close("div");

        oRm.close("div");
    };

    VizInstanceRenderer._renderInnerControl = function (oRm, oVizInstance) {
        oRm.openStart("div");
        oRm.class("sapUshellVizInstanceInnerControl");
        oRm.attr("id", oVizInstance.getId() + "-innerControl");
        oRm.openEnd();
        oRm.renderControl(oVizInstance.getInnerControl());
        oRm.close("div");
    };

    return VizInstanceRenderer;

});