//@ui5-bundle sap/makit/library-h2-preload.js
/*!
 * SAPUI5

(c) Copyright 2009-2020 SAP SE. All rights reserved
 */
sap.ui.predefine('sap/makit/library',["sap/ui/core/Core","sap/ui/core/library"],function(C,c){"use strict";sap.ui.getCore().initLibrary({name:"sap.makit",dependencies:["sap.ui.core"],types:["sap.makit.ChartType","sap.makit.LegendPosition","sap.makit.SortOrder","sap.makit.ValueBubblePosition","sap.makit.ValueBubbleStyle"],interfaces:[],controls:["sap.makit.Chart","sap.makit.CombinationChart"],elements:["sap.makit.Axis","sap.makit.Category","sap.makit.CategoryAxis","sap.makit.Column","sap.makit.Layer","sap.makit.MakitLib","sap.makit.Row","sap.makit.Series","sap.makit.Value","sap.makit.ValueAxis","sap.makit.ValueBubble"],version:"1.78.0"});sap.makit.ChartType={Column:"Column",Line:"Line",Bubble:"Bubble",Bar:"Bar",Pie:"Pie",Donut:"Donut",StackedColumn:"StackedColumn",HundredPercentStackedColumn:"HundredPercentStackedColumn",WaterfallColumn:"WaterfallColumn",WaterfallBar:"WaterfallBar"};sap.makit.LegendPosition={Top:"Top",Left:"Left",Bottom:"Bottom",Right:"Right",None:"None"};sap.makit.SortOrder={Ascending:"Ascending",Descending:"Descending",Partial:"Partial",None:"None"};sap.makit.ValueBubblePosition={Top:"Top",Side:"Side"};sap.makit.ValueBubbleStyle={Top:"Top",Float:"Float",FloatTop:"FloatTop"};return sap.makit;});
sap.ui.require.preload({
	"sap/makit/manifest.json":'{"_version":"1.21.0","sap.app":{"id":"sap.makit","type":"library","embeds":[],"applicationVersion":{"version":"1.78.0"},"title":"Mobile Chart controls based on the Sybase MAKIT charting lib.","description":"Mobile Chart controls based on the Sybase MAKIT charting lib.","resources":"resources.json","offline":true},"sap.ui":{"technology":"UI5","supportedThemes":["base","sap_bluecrystal"]},"sap.ui5":{"dependencies":{"minUI5Version":"1.78","libs":{"sap.ui.core":{"minVersion":"1.78.0"}}},"library":{"i18n":{"bundleUrl":"messagebundle.properties","supportedLocales":["","ar","bg","ca","cs","da","de","el","en","en-US-sappsd","en-US-saptrc","es","et","fi","fr","hi","hr","hu","it","iw","ja","kk","ko","lt","lv","ms","nl","no","pl","pt","ro","ru","sh","sk","sl","sv","th","tr","uk","vi","zh-CN","zh-TW"]},"content":{"controls":["sap.makit.Chart","sap.makit.CombinationChart"],"elements":["sap.makit.Axis","sap.makit.Category","sap.makit.CategoryAxis","sap.makit.Column","sap.makit.Layer","sap.makit.MakitLib","sap.makit.Row","sap.makit.Series","sap.makit.Value","sap.makit.ValueAxis","sap.makit.ValueBubble"],"types":["sap.makit.ChartType","sap.makit.LegendPosition","sap.makit.SortOrder","sap.makit.ValueBubblePosition","sap.makit.ValueBubbleStyle"],"interfaces":[]}}}}'
},"sap/makit/library-h2-preload"
);
sap.ui.loader.config({depCacheUI5:{
"sap/makit/Axis.js":["sap/makit/library.js","sap/ui/core/Element.js"],
"sap/makit/Category.js":["sap/makit/library.js","sap/ui/core/Element.js"],
"sap/makit/CategoryAxis.js":["sap/makit/Axis.js","sap/makit/library.js"],
"sap/makit/Chart.js":["sap/base/Log.js","sap/base/assert.js","sap/makit/CategoryAxis.js","sap/makit/ChartRenderer.js","sap/makit/MakitLib.js","sap/makit/Row.js","sap/makit/ValueAxis.js","sap/makit/ValueBubble.js","sap/makit/library.js","sap/ui/core/Control.js","sap/ui/core/Element.js","sap/ui/core/RenderManager.js","sap/ui/core/ResizeHandler.js","sap/ui/thirdparty/jquery.js"],
"sap/makit/Column.js":["sap/makit/library.js","sap/ui/core/Element.js"],
"sap/makit/CombinationChart.js":["sap/base/assert.js","sap/makit/CategoryAxis.js","sap/makit/CombinationChartRenderer.js","sap/makit/MakitLib.js","sap/makit/ValueAxis.js","sap/makit/ValueBubble.js","sap/makit/library.js","sap/ui/core/Control.js","sap/ui/core/Element.js","sap/ui/core/RenderManager.js","sap/ui/core/ResizeHandler.js","sap/ui/thirdparty/jquery.js"],
"sap/makit/Layer.js":["sap/base/Log.js","sap/base/assert.js","sap/makit/MakitLib.js","sap/makit/Row.js","sap/makit/library.js","sap/ui/core/Element.js"],
"sap/makit/MakitLib.js":["sap/base/Log.js","sap/makit/js/SybaseMA.js","sap/makit/library.js","sap/makit/localization/jQueryCoreLang.js","sap/makit/localization/jQueryGlobalization.js","sap/ui/core/Element.js"],
"sap/makit/Row.js":["sap/makit/library.js","sap/ui/core/Element.js"],
"sap/makit/Series.js":["sap/makit/library.js","sap/ui/core/Element.js"],
"sap/makit/Value.js":["sap/makit/library.js","sap/ui/core/Element.js"],
"sap/makit/ValueAxis.js":["sap/makit/Axis.js","sap/makit/library.js"],
"sap/makit/ValueBubble.js":["sap/makit/library.js","sap/ui/core/Element.js"],
"sap/makit/library.js":["sap/ui/core/Core.js","sap/ui/core/library.js"]
}});
//# sourceMappingURL=library-h2-preload.js.map