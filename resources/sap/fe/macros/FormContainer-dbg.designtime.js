/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2017 SAP SE. All rights reserved
    
 */

// Provides the Design Time Metadata for the sap.fe.macros.FormContainer macro.
sap.ui.define(
	[],
	function() {
		"use strict";
		return {
			annotations: {
				/**
				 * Defines that the FormContainer is not displayed.
				 *
				 * <br>
				 * <i>Example in OData V4 notation with hidden ProductUUID</i>
				 *
				 * <pre>
				 *     &lt;Annotations Target=&quot;ProductCollection.Product/ProductUUID&quot;&gt;
				 *         &lt;Annotation Term=&quot;com.sap.vocabularies.UI.v1.Hidden&quot;/&gt;
				 *     &lt;/Annotations&gt;
				 * </pre>
				 * <br>
				 * <i><b><u>Documentation links</u></b></i>
				 * <ul>
				 *   <li>Term <b>{@link https://github.com/SAP/odata-vocabularies/blob/master/vocabularies/UI.md#Hidden com.sap.vocabularies.UI.v1.Hidden}</b><br/>
				 *   </li>
				 * </ul>
				 */
				hidden: {
					namespace: "com.sap.vocabularies.UI.v1",
					annotation: "Hidden",
					target: ["Property", "Record"],
					since: "1.75"
				}
			},
			actions: {
				remove: null,
				rename: null
			}
		};
	},
	/* bExport= */ false
);
