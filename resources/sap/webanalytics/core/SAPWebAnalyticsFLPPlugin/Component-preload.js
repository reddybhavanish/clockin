//@ui5-bundle Component-preload.js
sap.ui.require.preload({
	"sap/webanalytics/core/SAPWebAnalyticsFLPPlugin/Component.js":function(){/*!
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
},
	"sap/webanalytics/core/SAPWebAnalyticsFLPPlugin/i18n/i18n.properties":'#This is the resource bundle for the SAP Web Analytics FLP Plugin\n#__ldi.translation.uuid=f5920e4f-7289-4372-a9cc-8d3cd50431ef\n\n#XTIT: Application name\nAPP_TITLE=SAP Web Analytics - FLP Plugin\n\n#YDES: Application description\nAPP_DESCRIPTION=SAP Web Analytics plugin for tracking Fiori Launchpad\n',
	"sap/webanalytics/core/SAPWebAnalyticsFLPPlugin/i18n/i18n_ar.properties":'#This is the resource bundle for the SAP Web Analytics FLP Plugin\n#\n\n#XTIT: Application name\nAPP_TITLE=SAP Web Analytics - \\u0627\\u0644\\u0628\\u0631\\u0646\\u0627\\u0645\\u062C \\u0627\\u0644\\u0625\\u0636\\u0627\\u0641\\u064A FLP\n\n#YDES: Application description\nAPP_DESCRIPTION=\\u0627\\u0644\\u0628\\u0631\\u0646\\u0627\\u0645\\u062C \\u0627\\u0644\\u0625\\u0636\\u0627\\u0641\\u064A SAP Web Analytics \\u0644\\u062A\\u062A\\u0628\\u0639 \\u0644\\u0648\\u062D\\u0629 \\u062A\\u0634\\u063A\\u064A\\u0644 SAP Fiori\n',
	"sap/webanalytics/core/SAPWebAnalyticsFLPPlugin/i18n/i18n_bg.properties":'#This is the resource bundle for the SAP Web Analytics FLP Plugin\n#\n\n#XTIT: Application name\nAPP_TITLE=SAP Web Analytics - FLP Plug-In\n\n#YDES: Application description\nAPP_DESCRIPTION=SAP Web Analytics plug-in \\u0437\\u0430 \\u0442\\u0440\\u0430\\u0441\\u0438\\u0440\\u0430\\u043D\\u0435 \\u043D\\u0430 SAP Fiori Launchpad \\u043A\\u043E\\u043D\\u0442\\u0440\\u043E\\u043B\\u0435\\u043D \\u043F\\u0430\\u043D\\u0435\\u043B\n',
	"sap/webanalytics/core/SAPWebAnalyticsFLPPlugin/i18n/i18n_ca.properties":'#This is the resource bundle for the SAP Web Analytics FLP Plugin\n#\n\n#XTIT: Application name\nAPP_TITLE=SAP Web Analytics\\: connector de FLP\n\n#YDES: Application description\nAPP_DESCRIPTION=Connector de SAP Web Analytics per a realitzar el seguiment de la plataforma de llan\\u00E7ament de SAP Fiori.\n',
	"sap/webanalytics/core/SAPWebAnalyticsFLPPlugin/i18n/i18n_cs.properties":'#This is the resource bundle for the SAP Web Analytics FLP Plugin\n#\n\n#XTIT: Application name\nAPP_TITLE=SAP Web Analytics - Plug-In FLP\n\n#YDES: Application description\nAPP_DESCRIPTION=Ptlug-in SAP Web Analytics pro sledov\\u00E1n\\u00ED launchpadu SAP Fiori\n',
	"sap/webanalytics/core/SAPWebAnalyticsFLPPlugin/i18n/i18n_da.properties":'#This is the resource bundle for the SAP Web Analytics FLP Plugin\n#\n\n#XTIT: Application name\nAPP_TITLE=SAP Web Analytics - FLP-plug-in\n\n#YDES: Application description\nAPP_DESCRIPTION=SAP Web Analytics-plug-in til sporing af SAP Fiori Launchpad\n',
	"sap/webanalytics/core/SAPWebAnalyticsFLPPlugin/i18n/i18n_de.properties":'#This is the resource bundle for the SAP Web Analytics FLP Plugin\n#\n\n#XTIT: Application name\nAPP_TITLE=SAP Web Analytics - FLP-Plug-In\n\n#YDES: Application description\nAPP_DESCRIPTION=SAP-Web-Analytics-Plug-In f\\u00FCr das Tracking des SAP Fiori Launchpad\n',
	"sap/webanalytics/core/SAPWebAnalyticsFLPPlugin/i18n/i18n_el.properties":'#This is the resource bundle for the SAP Web Analytics FLP Plugin\n#\n\n#XTIT: Application name\nAPP_TITLE=SAP Web Analytics - FLP Plug-In\n\n#YDES: Application description\nAPP_DESCRIPTION=SAP Web Analytics plug-in \\u03B3\\u03B9\\u03B1 \\u03C0\\u03B1\\u03C1\\u03B1\\u03BA\\u03BF\\u03BB\\u03BF\\u03CD\\u03B8\\u03B7\\u03C3\\u03B7 SAP Fiori Launchpad\n',
	"sap/webanalytics/core/SAPWebAnalyticsFLPPlugin/i18n/i18n_en.properties":'#This is the resource bundle for the SAP Web Analytics FLP Plugin\n#\n\n#XTIT: Application name\nAPP_TITLE=SAP Web Analytics - FLP Plug-In\n\n#YDES: Application description\nAPP_DESCRIPTION=SAP Web Analytics plug-in for tracking SAP Fiori Launchpad\n',
	"sap/webanalytics/core/SAPWebAnalyticsFLPPlugin/i18n/i18n_en_US_sappsd.properties":'#This is the resource bundle for the SAP Web Analytics FLP Plugin\n#\n\n#XTIT: Application name\nAPP_TITLE=[[[\\u015C\\u0100\\u01A4 \\u0174\\u0113\\u0183 \\u0100\\u014B\\u0105\\u013A\\u0177\\u0163\\u012F\\u010B\\u015F - \\u0191\\u013B\\u01A4 \\u01A4\\u013A\\u0171\\u011F\\u012F\\u014B\\u2219\\u2219\\u2219\\u2219\\u2219\\u2219\\u2219\\u2219\\u2219]]]\n\n#YDES: Application description\nAPP_DESCRIPTION=[[[\\u015C\\u0100\\u01A4 \\u0174\\u0113\\u0183 \\u0100\\u014B\\u0105\\u013A\\u0177\\u0163\\u012F\\u010B\\u015F \\u03C1\\u013A\\u0171\\u011F\\u012F\\u014B \\u0192\\u014F\\u0157 \\u0163\\u0157\\u0105\\u010B\\u0137\\u012F\\u014B\\u011F \\u0191\\u012F\\u014F\\u0157\\u012F \\u013B\\u0105\\u0171\\u014B\\u010B\\u0125\\u03C1\\u0105\\u018C\\u2219\\u2219\\u2219\\u2219\\u2219\\u2219\\u2219\\u2219\\u2219\\u2219\\u2219\\u2219\\u2219\\u2219\\u2219\\u2219\\u2219\\u2219\\u2219\\u2219\\u2219]]]\n',
	"sap/webanalytics/core/SAPWebAnalyticsFLPPlugin/i18n/i18n_en_US_saptrc.properties":'#This is the resource bundle for the SAP Web Analytics FLP Plugin\n#\n\n#XTIT: Application name\nAPP_TITLE=Z0Qpu29gsOT4m0gW0UUmTg_SAP Web Analytics - FLP Plugin\n\n#YDES: Application description\nAPP_DESCRIPTION=qDserj9JW5QzZLsShSGKMw_SAP Web Analytics plugin for tracking Fiori Launchpad\n',
	"sap/webanalytics/core/SAPWebAnalyticsFLPPlugin/i18n/i18n_es.properties":'#This is the resource bundle for the SAP Web Analytics FLP Plugin\n#\n\n#XTIT: Application name\nAPP_TITLE=SAP Web Analytics - Plug-In FLP\n\n#YDES: Application description\nAPP_DESCRIPTION=Plug-in de SAP Web Analytics para realizar el seguimiento de la rampa de lanzamiento de SAP Fiori\n',
	"sap/webanalytics/core/SAPWebAnalyticsFLPPlugin/i18n/i18n_et.properties":'#This is the resource bundle for the SAP Web Analytics FLP Plugin\n#\n\n#XTIT: Application name\nAPP_TITLE=SAP Web Analytics - FLP lisandmoodul\n\n#YDES: Application description\nAPP_DESCRIPTION=Lisandmoodul SAP Web Analytics SAP Fiori k\\u00E4ivituspaani j\\u00E4lgimiseks\n',
	"sap/webanalytics/core/SAPWebAnalyticsFLPPlugin/i18n/i18n_fi.properties":'#This is the resource bundle for the SAP Web Analytics FLP Plugin\n#\n\n#XTIT: Application name\nAPP_TITLE=SAP Web Analytics - FLP Plug-In\n\n#YDES: Application description\nAPP_DESCRIPTION=SAP Web Analytics -plug-in SAP Fiori Launchpadin seurantaa varten\n',
	"sap/webanalytics/core/SAPWebAnalyticsFLPPlugin/i18n/i18n_fr.properties":'#This is the resource bundle for the SAP Web Analytics FLP Plugin\n#\n\n#XTIT: Application name\nAPP_TITLE=SAP Web Analytics - Plug-in FLP\n\n#YDES: Application description\nAPP_DESCRIPTION=Plug-in SAP Web Analytics pour le suivi de la barre de lancement SAP Fiori\n',
	"sap/webanalytics/core/SAPWebAnalyticsFLPPlugin/i18n/i18n_hi.properties":'#This is the resource bundle for the SAP Web Analytics FLP Plugin\n#\n\n#XTIT: Application name\nAPP_TITLE=SAP \\u0935\\u0947\\u092C \\u090F\\u0928\\u093E\\u0932\\u093F\\u091F\\u093F\\u0915\\u094D\\u0938 - FLP \\u092A\\u094D\\u0932\\u0917-\\u0907\\u0928\n\n#YDES: Application description\nAPP_DESCRIPTION=SAP Fiori \\u0932\\u0949\\u0928\\u094D\\u091A\\u092A\\u0948\\u0921 \\u0915\\u094B \\u091F\\u094D\\u0930\\u0948\\u0915 \\u0915\\u0930\\u0928\\u0947 \\u0915\\u0947 \\u0932\\u093F\\u090F SAP \\u0935\\u0947\\u092C \\u090F\\u0928\\u093E\\u0932\\u093F\\u091F\\u093F\\u0915\\u094D\\u0938 \\u092A\\u094D\\u0932\\u0917-\\u0907\\u0928\n',
	"sap/webanalytics/core/SAPWebAnalyticsFLPPlugin/i18n/i18n_hr.properties":'#This is the resource bundle for the SAP Web Analytics FLP Plugin\n#\n\n#XTIT: Application name\nAPP_TITLE=SAP Web Analytics - FLP Plug-In\n\n#YDES: Application description\nAPP_DESCRIPTION=SAP Web Analytics plug-in za pra\\u0107enje SAP Fiori Launchpad\n',
	"sap/webanalytics/core/SAPWebAnalyticsFLPPlugin/i18n/i18n_hu.properties":'#This is the resource bundle for the SAP Web Analytics FLP Plugin\n#\n\n#XTIT: Application name\nAPP_TITLE=SAP Web Analytics - FLP Plug-In\n\n#YDES: Application description\nAPP_DESCRIPTION=SAP Web Analytics plug-in SAP Fiori-ind\\u00EDt\\u00F3pult nyomon k\\u00F6vet\\u00E9s\\u00E9hez\n',
	"sap/webanalytics/core/SAPWebAnalyticsFLPPlugin/i18n/i18n_it.properties":'#This is the resource bundle for the SAP Web Analytics FLP Plugin\n#\n\n#XTIT: Application name\nAPP_TITLE=SAP Web Analytics - plug-in FLP\n\n#YDES: Application description\nAPP_DESCRIPTION=Plug-in SAP Web Analytics per tracciare SAP Fiori Launchpad\n',
	"sap/webanalytics/core/SAPWebAnalyticsFLPPlugin/i18n/i18n_iw.properties":'#This is the resource bundle for the SAP Web Analytics FLP Plugin\n#\n\n#XTIT: Application name\nAPP_TITLE=SAP Web Analytics - FLP Plug-In\n\n#YDES: Application description\nAPP_DESCRIPTION=SAP Web Analytics - FLP Plug-In \\u05DC\\u05DE\\u05E2\\u05E7\\u05D1 \\u05D0\\u05D7\\u05E8\\u05D9 \\u05DC\\u05D5\\u05D7 \\u05D4\\u05E4\\u05E2\\u05DC\\u05D4 \\u05E9\\u05DC SAP Fiori\n',
	"sap/webanalytics/core/SAPWebAnalyticsFLPPlugin/i18n/i18n_ja.properties":'#This is the resource bundle for the SAP Web Analytics FLP Plugin\n#\n\n#XTIT: Application name\nAPP_TITLE=SAP Web Analytics - FLP \\u30D7\\u30E9\\u30B0\\u30A4\\u30F3\n\n#YDES: Application description\nAPP_DESCRIPTION=SAP Fiori \\u30E9\\u30A6\\u30F3\\u30C1\\u30D1\\u30C3\\u30C9\\u306E\\u8FFD\\u8DE1\\u7528 SAP Web Analytics \\u30D7\\u30E9\\u30B0\\u30A4\\u30F3\n',
	"sap/webanalytics/core/SAPWebAnalyticsFLPPlugin/i18n/i18n_kk.properties":'#This is the resource bundle for the SAP Web Analytics FLP Plugin\n#\n\n#XTIT: Application name\nAPP_TITLE=SAP Web Analytics - FLP \\u043F\\u043B\\u0430\\u0433\\u0438\\u043D\\u0456\n\n#YDES: Application description\nAPP_DESCRIPTION=SAP Fiori \\u0456\\u0441\\u043A\\u0435 \\u049B\\u043E\\u0441\\u0443 \\u043F\\u0430\\u043D\\u0435\\u043B\\u0456\\u043D \\u049B\\u0430\\u0434\\u0430\\u0493\\u0430\\u043B\\u0430\\u0443\\u0493\\u0430 \\u0430\\u0440\\u043D\\u0430\\u043B\\u0493\\u0430\\u043D SAP Web Analytics \\u043F\\u043B\\u0430\\u0433\\u0438\\u043D\\u0456\n',
	"sap/webanalytics/core/SAPWebAnalyticsFLPPlugin/i18n/i18n_ko.properties":'#This is the resource bundle for the SAP Web Analytics FLP Plugin\n#\n\n#XTIT: Application name\nAPP_TITLE=SAP Web Analytics - FLP \\uD50C\\uB7EC\\uADF8\\uC778\n\n#YDES: Application description\nAPP_DESCRIPTION=SAP Fiori LaunchPad \\uCD94\\uC801\\uC744 \\uC704\\uD55C SAP Web Analytics \\uD50C\\uB7EC\\uADF8\\uC778\n',
	"sap/webanalytics/core/SAPWebAnalyticsFLPPlugin/i18n/i18n_lt.properties":'#This is the resource bundle for the SAP Web Analytics FLP Plugin\n#\n\n#XTIT: Application name\nAPP_TITLE=\\u201ESAP Web Analytics\\u201C - FLP priedas\n\n#YDES: Application description\nAPP_DESCRIPTION=\\u201ESAP Web Analytics\\u201C priedas, skirtas \\u201ESAP Fiori\\u201C paleidimo skydeliui\n',
	"sap/webanalytics/core/SAPWebAnalyticsFLPPlugin/i18n/i18n_lv.properties":'#This is the resource bundle for the SAP Web Analytics FLP Plugin\n#\n\n#XTIT: Application name\nAPP_TITLE=SAP t\\u012Bmek\\u013Ca anal\\u012Btika - FLP spraudnis\n\n#YDES: Application description\nAPP_DESCRIPTION=SAP t\\u012Bmek\\u013Ca anal\\u012Btikas spraudnis SAP Fiori palai\\u0161anas pane\\u013Ca izseko\\u0161anai\n',
	"sap/webanalytics/core/SAPWebAnalyticsFLPPlugin/i18n/i18n_ms.properties":'#This is the resource bundle for the SAP Web Analytics FLP Plugin\n#\n\n#XTIT: Application name\nAPP_TITLE=SAP Web Analytics - FLP Plug-In\n\n#YDES: Application description\nAPP_DESCRIPTION=Pasang masuk SAP Web Analytics untuk penjejakan SAP Fiori Launchpad\n',
	"sap/webanalytics/core/SAPWebAnalyticsFLPPlugin/i18n/i18n_nl.properties":'#This is the resource bundle for the SAP Web Analytics FLP Plugin\n#\n\n#XTIT: Application name\nAPP_TITLE=SAP Web Analytics - FLP-plug-in\n\n#YDES: Application description\nAPP_DESCRIPTION=SAP Web Analytics-plug-in voor tracering van launchpad voor SAP Fiori\n',
	"sap/webanalytics/core/SAPWebAnalyticsFLPPlugin/i18n/i18n_no.properties":'#This is the resource bundle for the SAP Web Analytics FLP Plugin\n#\n\n#XTIT: Application name\nAPP_TITLE=SAP Web Analytics - FLP-plug-in\n\n#YDES: Application description\nAPP_DESCRIPTION=SAP Web Analytics-plug-in for sporing av SAP Fiori-startfelt\n',
	"sap/webanalytics/core/SAPWebAnalyticsFLPPlugin/i18n/i18n_pl.properties":'#This is the resource bundle for the SAP Web Analytics FLP Plugin\n#\n\n#XTIT: Application name\nAPP_TITLE=SAP Web Analytics - plug-in FLP\n\n#YDES: Application description\nAPP_DESCRIPTION=Dodatek plug-in SAP Web Analytics do \\u015Bledzenia okna wywo\\u0142a\\u0144 SAP Fiori\n',
	"sap/webanalytics/core/SAPWebAnalyticsFLPPlugin/i18n/i18n_pt.properties":'#This is the resource bundle for the SAP Web Analytics FLP Plugin\n#\n\n#XTIT: Application name\nAPP_TITLE=SAP Web Analytics - Plug-in FLP\n\n#YDES: Application description\nAPP_DESCRIPTION=Plug-in SAP Web Analytics para rastrear o launchpad do SAP Fiori\n',
	"sap/webanalytics/core/SAPWebAnalyticsFLPPlugin/i18n/i18n_ro.properties":'#This is the resource bundle for the SAP Web Analytics FLP Plugin\n#\n\n#XTIT: Application name\nAPP_TITLE=SAP Web Analytics - plug-In FLP\n\n#YDES: Application description\nAPP_DESCRIPTION=Plug-in SAP Web Analytics pt.urm\\u0103rire launchpad SAP Fiori\n',
	"sap/webanalytics/core/SAPWebAnalyticsFLPPlugin/i18n/i18n_ru.properties":'#This is the resource bundle for the SAP Web Analytics FLP Plugin\n#\n\n#XTIT: Application name\nAPP_TITLE=SAP Web Analytics - \\u043F\\u043B\\u0430\\u0433\\u0438\\u043D FLP\n\n#YDES: Application description\nAPP_DESCRIPTION=\\u041F\\u043B\\u0430\\u0433\\u0438\\u043D SAP Web Analytics \\u0434\\u043B\\u044F \\u043E\\u0442\\u0441\\u043B\\u0435\\u0436\\u0438\\u0432\\u0430\\u043D\\u0438\\u044F \\u043F\\u0430\\u043D\\u0435\\u043B\\u0438 \\u0437\\u0430\\u043F\\u0443\\u0441\\u043A\\u0430 SAP Fiori\n',
	"sap/webanalytics/core/SAPWebAnalyticsFLPPlugin/i18n/i18n_sh.properties":'#This is the resource bundle for the SAP Web Analytics FLP Plugin\n#\n\n#XTIT: Application name\nAPP_TITLE=SAP Web Analytics - plug-in FLP\n\n#YDES: Application description\nAPP_DESCRIPTION=SAP Web Analytics plug-in za pra\\u0107enje SAP Fiori launchpad-a\n',
	"sap/webanalytics/core/SAPWebAnalyticsFLPPlugin/i18n/i18n_sk.properties":'#This is the resource bundle for the SAP Web Analytics FLP Plugin\n#\n\n#XTIT: Application name\nAPP_TITLE=SAP Web Analytics - FLP Plug-In\n\n#YDES: Application description\nAPP_DESCRIPTION=SAP Web Analytics plug-in pre sledovanie SAP Fiori Launchpad\n',
	"sap/webanalytics/core/SAPWebAnalyticsFLPPlugin/i18n/i18n_sl.properties":'#This is the resource bundle for the SAP Web Analytics FLP Plugin\n#\n\n#XTIT: Application name\nAPP_TITLE=SAP Web Analytics - FLP plug-In\n\n#YDES: Application description\nAPP_DESCRIPTION=SAP Web Analytics plug-in za sledenje SAP Fiori Launchpada\n',
	"sap/webanalytics/core/SAPWebAnalyticsFLPPlugin/i18n/i18n_sv.properties":'#This is the resource bundle for the SAP Web Analytics FLP Plugin\n#\n\n#XTIT: Application name\nAPP_TITLE=SAP Web Analytics - FLP-plug-in\n\n#YDES: Application description\nAPP_DESCRIPTION=SAP Web Analytics-plug-in f\\u00F6r sp\\u00E5rning av SAP Fiori-launchpad\n',
	"sap/webanalytics/core/SAPWebAnalyticsFLPPlugin/i18n/i18n_th.properties":'#This is the resource bundle for the SAP Web Analytics FLP Plugin\n#\n\n#XTIT: Application name\nAPP_TITLE=SAP Web Analytics - FLP Plug-In\n\n#YDES: Application description\nAPP_DESCRIPTION=SAP Web Analytics Plug-In \\u0E2A\\u0E33\\u0E2B\\u0E23\\u0E31\\u0E1A\\u0E01\\u0E32\\u0E23\\u0E15\\u0E34\\u0E14\\u0E15\\u0E32\\u0E21 SAP Fiori Launchpad\n',
	"sap/webanalytics/core/SAPWebAnalyticsFLPPlugin/i18n/i18n_tr.properties":'#This is the resource bundle for the SAP Web Analytics FLP Plugin\n#\n\n#XTIT: Application name\nAPP_TITLE=SAP Web Analytics - FLP eklentisi\n\n#YDES: Application description\nAPP_DESCRIPTION=SAP Fiori Launchpad izleme i\\u00E7in SAP Web Analytics eklentisi\n',
	"sap/webanalytics/core/SAPWebAnalyticsFLPPlugin/i18n/i18n_uk.properties":'#This is the resource bundle for the SAP Web Analytics FLP Plugin\n#\n\n#XTIT: Application name\nAPP_TITLE=SAP Web Analytics - \\u043F\\u043B\\u0430\\u0433\\u0456\\u043D FLP\n\n#YDES: Application description\nAPP_DESCRIPTION=\\u041F\\u043B\\u0430\\u0433\\u0456\\u043D SAP Web Analytics \\u0434\\u043B\\u044F \\u043F\\u0430\\u043D\\u0435\\u043B\\u0456 \\u0437\\u0430\\u043F\\u0443\\u0441\\u043A\\u0443 \\u0432\\u0456\\u0434\\u0441\\u0442\\u0435\\u0436\\u0435\\u043D\\u043D\\u044F SAP Fiori\n',
	"sap/webanalytics/core/SAPWebAnalyticsFLPPlugin/i18n/i18n_vi.properties":'#This is the resource bundle for the SAP Web Analytics FLP Plugin\n#\n\n#XTIT: Application name\nAPP_TITLE=SAP Web Analytics - FLP Plug-In\n\n#YDES: Application description\nAPP_DESCRIPTION=Plug-in SAP Web Analytics \\u0111\\u00EA\\u0309 theo do\\u0303i SAP Fiori Launchpad\n',
	"sap/webanalytics/core/SAPWebAnalyticsFLPPlugin/i18n/i18n_zh_CN.properties":'#This is the resource bundle for the SAP Web Analytics FLP Plugin\n#\n\n#XTIT: Application name\nAPP_TITLE=SAP Web Analytics - FLP \\u63D2\\u4EF6\n\n#YDES: Application description\nAPP_DESCRIPTION=\\u7528\\u4E8E\\u8DDF\\u8E2A SAP Fiori \\u5FEB\\u901F\\u542F\\u52A8\\u677F\\u7684 SAP Web Analytics \\u63D2\\u4EF6\n',
	"sap/webanalytics/core/SAPWebAnalyticsFLPPlugin/i18n/i18n_zh_TW.properties":'#This is the resource bundle for the SAP Web Analytics FLP Plugin\n#\n\n#XTIT: Application name\nAPP_TITLE=SAP Web Analytics - FLP Plug-In\n\n#YDES: Application description\nAPP_DESCRIPTION=\\u7528\\u65BC\\u8FFD\\u8E64 SAP Fiori Launchpad \\u7684 SAP Web Analytics Plug-In\n',
	"sap/webanalytics/core/SAPWebAnalyticsFLPPlugin/manifest.json":'{\n\t"_version": "1.5.0",\n\t"sap.app": {\n\t\t"id": "SAPWebAnalyticsFLPPlugin",\n\t\t"type": "application",\n\t\t"applicationVersion": {\n\t\t\t"version": "1.0.0"\n\t\t},\n\t\t"i18n": "i18n/i18n.properties",\n\t\t"title": "{{APP_TITLE}}",\n\t\t"description": "{{APP_DESCRIPTION}}"\n\t},\n\t"sap.ui": {\n\t\t"technology": "UI5",\n\t\t"deviceTypes": {\n\t\t\t"desktop": true,\n\t\t\t"tablet": true,\n\t\t\t"phone": true\n\t\t}\n\t},\n\t"sap.ui5": {\n\t\t"dependencies": {\n\t\t\t"minUI5Version": "1.71.0",\n\t\t\t"libs": {\n\t\t\t\t"sap.ui.core": {}\n\t\t\t}\n\t\t},\n\t\t"contentDensities": {\n\t\t\t"compact": false,\n\t\t\t"cozy": false\n\t\t}\n\t},\n\t"sap.platform.hcp": {\n\t\t"uri": "webapp",\n\t\t"_version": "1.1.0"\n\t}\n}'
},"Component-preload"
);
