/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

        (c) Copyright 2009-2015 SAP SE. All rights reserved
    
 */
sap.ui.define(["sap/ui/thirdparty/URI"],function(U){"use strict";var W={};W.absoluteUri=function(s){var u=new U(sap.ui.require.toUrl(s));if(u.is("relative")){u=u.absoluteTo(new U(document.baseURI));}return u;};W.loadScript=function(w,a){var u=this.absoluteUri(w);var s=[];if(a&&a.length>0){a.forEach(function(b){s.push("'"+this.absoluteUri(b)+"'");},this);}if(sap.ui.Device.browser.internet_explorer){s.push("'"+this.absoluteUri("sap/ui/thirdparty/es6-promise.js")+"'");s.push("'"+this.absoluteUri("sap/ui/thirdparty/es6-string-methods.js")+"'");s.push("'"+this.absoluteUri("sap/ui/vk/thirdparty/ie-polyfills.js")+"'");}s.push("'"+u.toString()+"'");return new Worker((window.URL||window.webkitURL).createObjectURL(new Blob(["importScripts("+s.join()+");"],{"type":"application/javascript"})));};return W;});
