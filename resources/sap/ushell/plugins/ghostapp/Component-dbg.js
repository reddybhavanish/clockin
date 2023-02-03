// Copyright (c) 2009-2020 SAP SE, All Rights Reserved
sap.ui.define(["sap/ui/generic/app/AppComponent"], function (AppComponent) {
  "use strict";
  sap.ui.getCore().loadLibrary("sap.ui.generic.app");
  return AppComponent.extend("sap.ushell.plugins.ghostapp.Component", {
    metadata: {
      "manifest": "json",
      "library": "sap.ushell"
    }
  });
});
