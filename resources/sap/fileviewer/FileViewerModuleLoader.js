/*!
 * SAP UI development toolkit for HTML5 (SAPUI5)

		(c) Copyright 2009-2016 SAP SE. All rights reserved
	
 */
sap.ui.define(['./viewer/sap-fpt/pdf2text/pdf2text','./viewer/sap-fpt/util/removeoperlaps','./viewer/sap-fpt/viewer/pdfhighlighter','./viewer/sap-fpt/suv/suv','./viewer/web/compatibility','./viewer/web/l10n','./viewer/build/pdf','./viewer/build/pdf.worker','./viewer/web/pdf_viewer'],function(){"use strict";var F={};F.PDFJS=PDFJS;PDFJS.workerSrc=sap.ui.resource("sap.fileviewer","viewer/build/pdf.worker.js");return F;},true);
