/*!
 * SAPUI5

		(c) Copyright 2009-2020 SAP SE. All rights reserved
	
 */
sap.ui.define([
	"sap/ui/core/Component"
], function(Component) {
	"use strict";

	var SWAComponent = Component.extend("sap.webanalytics.core.SAPWebAnalyticsFLPPlugin.Component", {

		metadata: {
			manifest: "json"
		},
        /*global window, sap , document*/
		// Init function called on initialization
		init: function () {
			var oPluginParameters = this.getComponentData().config; // obtain plugin parameters
			var SWA_PUB_TOKEN = "", TRACKING_URL = "", USR = "";
			//Read the variables and pass them
			SWA_PUB_TOKEN = oPluginParameters.SWA_PUB_TOKEN;
			TRACKING_URL = oPluginParameters.SWA_BASE_URL;
			if (oPluginParameters.SWA_USER === true)
                        USR = sap.ushell.Container.getUser().getEmail();
			this.loadSWAObject(SWA_PUB_TOKEN, TRACKING_URL, true, USR);
			this.loadWebGUI();
		},

		// create SWA object and load track.js
		loadSWAObject: function(SWA_PUB_TOKEN, TRACKING_URL, LOGGING, usr) {
			window.swa = {
				pubToken: SWA_PUB_TOKEN,
				baseUrl: TRACKING_URL,
				loggingEnabled: LOGGING,
				subSiteId: this.setSubSiteId,
				owner: usr
			};

			var d = document, g = d.createElement("script"), s = d.getElementsByTagName("script")[0];
			g.type = "text/javascript";
			g.defer = true;
			g.async = true;
			g.src = window.swa.baseUrl + "js/track.js";
			s.parentNode.insertBefore(g, s);
			if ((typeof sap !== "undefined" && typeof sap.ui !== "undefined") && sap.ui.version < "1.65.0") {
				window.onhashchange = function () {
					window.swa.trackLoad();
				};
			}
		},

		/*Method which listens to web gui announce event and then send the postmessage with baseurl,pubtoken and type as request*/
		loadWebGUI: function () {
			if (window.addEventListener) {
				window.addEventListener("message", function (e) {
					var guiresponse = JSON.parse(e.data);
					if (guiresponse.service === "sap.its.readyToListen" && guiresponse.type === "announce") {
						var swaCookies = escape(window.parent.document.cookie);                         
                   var body = {
                   "type": "request",
                   "service": "sap.its.trackSWA",
                   "pubToken":window.swa.pubToken,
                   "baseUrl":window.swa.baseUrl,
                   "message":"Response from SWA",
                   "isConsentGiven":true,
                   "cookieVal": swaCookies
                   };
						//post the message with pub token and base url
						e.source.postMessage(JSON.stringify(body), e.origin);
					}
				});
			}
		},

		
		
		//Set the subsiteid as each FLP tile where a system acts as a site
		setSubSiteId: function() {
			var subSite = "";

			if (window.location.href.substring(window.location.href.indexOf("#")) !== -1) {
				subSite = window.location.href.substring(window.location.href.indexOf("#") + 1);
			}
			if (subSite.indexOf("&") !== -1) {
				subSite = subSite.substring(0, subSite.indexOf("&"));
			}

			return (subSite !== "") ? subSite : undefined;
		}

	});

	return SWAComponent;

});
