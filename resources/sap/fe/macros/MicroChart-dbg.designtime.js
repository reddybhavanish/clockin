/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2017 SAP SE. All rights reserved
    
 */

// Provides the Design Time Metadata for the sap.fe.macros.MicroChart macro.
sap.ui.define(
	[],
	function() {
		"use strict";
		return {
			annotations: {
				/**
				 * Renders a MicroChart based on the information that is provided within the <code>Chart</code> annotation. The <code>Chart</code> annotation
				 * contains the <code>ChartType</code> property that must be defined. Supported chart types are Area, Bar, BarStacked, Bullet, Column, Donut, Line and Pie.
				 *
				 * <br>
				 * <i>XML Example of using Chart annotation with Column ChartType</i>
				 *
				 * <pre>
				 *    &lt;Annotations Target=&quot;SmartMicroChart.ProductType&quot; xmlns=&quot;http://docs.oasis-open.org/odata/ns/edm&quot;&gt;
				 *      &lt;Annotation Term=&quot;com.sap.vocabularies.UI.v1.Chart&quot; Qualifier=&quot;ColumnChartQualifier&quot;&gt;
				 *        &lt;Record Type=&quot;com.sap.vocabularies.UI.v1.ChartDefinitionType&quot;&gt;
				 *          &lt;PropertyValue Property=&quot;ChartType&quot; EnumMember=&quot;com.sap.vocabularies.UI.v1.ChartType/Column&quot; /&gt;
				 *          &lt;PropertyValue Property=&quot;Title&quot; String=&quot;ProductTitle&quot; /&gt;
				 *          &lt;PropertyValue Property=&quot;Description&quot; String=&quot;ProductDescription&quot; /&gt;
				 *          &lt;PropertyValue Property="Dimensions"&gt;
				 *              &lt;Collection&gt;
				 *                  &lt;PropertyPath&gt;Month&lt;/PropertyPath&gt;
				 *              &lt;/Collection&gt;
				 *          &lt;/PropertyValue&gt;
				 *          &lt;PropertyValue Property=&quot;Measures&quot;&gt;
				 *            &lt;Collection&gt;
				 *              &lt;PropertyPath&gt;Price&lt;/PropertyPath&gt;
				 *            &lt;/Collection&gt;
				 *          &lt;/PropertyValue&gt;
				 *          &lt;PropertyValue Property=&quot;MeasureAttributes&quot;&gt;
				 *            &lt;Collection&gt;
				 *              &lt;Record Type=&quot;com.sap.vocabularies.UI.v1.ChartMeasureAttributeType&quot;&gt;
				 *                &lt;PropertyValue Property=&quot;Measure&quot; PropertyPath=&quot;Price&quot; /&gt;
				 *                &lt;PropertyValue Property=&quot;Role&quot; EnumMember=&quot;com.sap.vocabularies.UI.v1.ChartMeasureRoleType/Axis1&quot; /&gt;
				 *                &lt;PropertyValue Property=&quot;DataPoint&quot; AnnotationPath=&quot;@com.sap.vocabularies.UI.v1.DataPoint#ColumnChartDataPoint&quot; /&gt;
				 *              &lt;/Record&gt;
				 *            &lt;/Collection&gt;
				 *          &lt;/PropertyValue&gt;
				 *        &lt;/Record&gt;
				 *      &lt;/Annotation&gt;
				 *    &lt;/Annotations&gt;
				 * </pre>
				 *
				 * <br>
				 * <i><b><u>Documentation links</u></b></i>
				 * <ul>
				 *   <li>Term <b>{@link https://github.com/SAP/odata-vocabularies/blob/master/vocabularies/UI.md#Chart  com.sap.vocabularies.UI.v1.Chart}</b><br/>
				 *   </li>
				 * </ul>
				 */
				chart: {
					namespace: "com.sap.vocabularies.UI.v1",
					annotation: "Chart",
					target: ["EntityType"],
					defaultValue: null,
					since: "1.75"
				},

				/**
				 * The <code>ChartDefinitionType</code> is a <code>ComplexType</code> that is used to describe the <code>Chart</code> annotation.
				 * See XML Example for Chart annotation for reference.
				 *
				 * <br>
				 * <i><b><u>Documentation links</u></b></i>
				 * <ul>
				 *   <li>Term <b>{@link https://github.com/SAP/odata-vocabularies/blob/master/vocabularies/UI.md#ChartDefinitionType  com.sap.vocabularies.UI.v1.ChartDefinitionType}</b><br/>
				 *   </li>
				 * </ul>
				 */
				chartDefinitionType: {
					namespace: "com.sap.vocabularies.UI.v1",
					annotation: "ChartDefinitionType",
					target: ["EntityType"],
					defaultValue: null,
					since: "1.75"
				},

				/**
				 * The <code>ChartType</code> is an <code>EnumType</code> that is provided within the <code>Chart</code> annotation to define the chart type.
				 * Supported chart types are Area, Bar, BarStacked, Bullet, Column, Donut, Line and Pie.
				 *
				 * <br>
				 * <i>XML Example of using ChartType property with Bullet</i>
				 *
				 * <pre>
				 *    &lt;Annotation Term=&quot;com.sap.vocabularies.UI.v1.Chart&quot; Qualifier=&quot;BulletChartQualifier&quot;&gt;
				 *      &lt;Record Type=&quot;com.sap.vocabularies.UI.v1.ChartDefinitionType&quot;&gt;
				 *        &lt;PropertyValue Property=&quot;ChartType&quot; EnumMember=&quot;com.sap.vocabularies.UI.v1.Chart/Bullet&quot; /&gt;
				 *      &lt;/Record&gt;
				 *    &lt;/Annotation&gt;
				 * </pre>
				 *
				 * <br>
				 * <i><b><u>Documentation links</u></b></i>
				 * <ul>
				 *   <li>Term <b>{@link https://github.com/SAP/odata-vocabularies/blob/master/vocabularies/UI.md#ChartType  com.sap.vocabularies.UI.v1.ChartType}</b><br/>
				 *   </li>
				 * </ul>
				 */
				chartType: {
					namespace: "com.sap.vocabularies.UI.v1",
					annotation: "ChartType",
					target: ["Property"],
					defaultValue: null,
					since: "1.75"
				},
				/**
				 * The <code>ChartMeasureAttributeType</code> is a <code>ComplexType</code> that is used to describe the Chart annotation property MeasureAttributes.
				 * See XML Example for Chart annotation for reference.
				 *
				 * <br>
				 * <i><b><u>Documentation links</u></b></i>
				 * <ul>
				 *   <li>Term <b>{@link https://github.com/SAP/odata-vocabularies/blob/master/vocabularies/UI.md#ChartMeasureAttributeType  com.sap.vocabularies.UI.v1.ChartMeasureAttributeType}</b><br/>
				 *   </li>
				 * </ul>
				 */
				chartMeasureAttributeType: {
					namespace: "com.sap.vocabularies.UI.v1",
					annotation: "ChartMeasureAttributeType",
					since: "1.75"
				},
				/**
				 * Based on the <code>DataPoint</code> annotation that is provided by <code>MeasureAttributes</code>, the values and colors of the chart are defined
				 * by using the <code>Value</code> property and <code>Criticality</code> property.
				 * The data point's <code>Value</code> must be the same property as in <code>Measure</code>.
				 *
				 * <br>
				 * <i>XML Example of using DataPoint annotation (see also XML Example for Chart annotation)</i>
				 *
				 * <pre>
				 *    &lt;Annotation Term=&quot;com.sap.vocabularies.UI.v1.DataPoint&quot; Qualifier=&quot;ColumnChartDataPoint&quot; &gt;
				 *      &lt;Record Type=&quot;com.sap.vocabularies.UI.v1.DataPointType&quot;&gt;
				 *        &lt;PropertyValue Property=&quot;Value&quot; Path=&quot;Price&quot; /&gt;
				 *        &lt;PropertyValue Property=&quot;Title&quot; Path=&quot;Title&quot; /&gt;
				 *        &lt;PropertyValue Property=&quot;Criticality&quot; Path=&quot;Criticality&quot;/&gt;
				 *      &lt;/Record&gt;
				 *    &lt;/Annotation&gt;
				 * </pre>
				 *
				 * <br>
				 * <i><b><u>Documentation links</u></b></i>
				 * <ul>
				 *   <li>Term <b>{@link https://github.com/SAP/odata-vocabularies/blob/master/vocabularies/UI.md#DataPoint  com.sap.vocabularies.UI.v1.DataPoint}</b><br/>
				 *   </li>
				 * </ul>
				 */
				dataPoint: {
					namespace: "com.sap.vocabularies.UI.v1",
					annotation: "DataPoint",
					target: ["EntityType"],
					defaultValue: null,
					since: "1.75"
				},
				/**
				 * The <code>DataPointType</code> is a <code>ComplexType</code> that is used to define the type of the <code>DataPoint</code> annotation.
				 *
				 * <br>
				 * <i><b><u>Documentation links</u></b></i>
				 * <ul>
				 *   <li>Term <b>{@link https://github.com/SAP/odata-vocabularies/blob/master/vocabularies/UI.md#DataPointType  com.sap.vocabularies.UI.v1.DataPointType}</b><br/>
				 *   </li>
				 * </ul>
				 */
				dataPointType: {
					namespace: "com.sap.vocabularies.UI.v1",
					annotation: "DataPointType",
					target: ["EntityType"],
					defaultValue: null,
					since: "1.75"
				},
				/**
				 * The <code>CriticalityType</code> is an <code>EnumType</code> that is used to define the type of
				 * <code>Criticality</code> property in the <code>DataPoint</code> annotation.
				 * The property defines a service-calculated criticality and is an alternative to <code>CriticalityCalculation</code>.
				 *
				 * <br>
				 * <i>XML Example of using Criticality property with the CriticalityType</i>
				 *
				 * <pre>
				 *    &lt;Record Type=&quot;com.sap.vocabularies.UI.v1.DataPointType&quot;&gt;
				 *      &lt;PropertyValue Property=&quot;Title&quot; Path=&quot;Actual Cost&quot;/&gt;
				 *      &lt;PropertyValue Property=&quot;Value&quot; Path=&quot;ActualCost&quot;/&gt;
				 *      &lt;PropertyValue Property=&quot;Criticality&quot; EnumMember=&quot;com.sap.vocabularies.UI.v1.CriticalityType/Positive&quot; /&gt;
				 *    &lt;/Record&gt;
				 * </pre>
				 *
				 * <br>
				 * <i><b><u>Documentation links</u></b></i>
				 * <ul>
				 *   <li>Term <b>{@link https://github.com/SAP/odata-vocabularies/blob/master/vocabularies/UI.md#CriticalityType  com.sap.vocabularies.UI.v1.CriticalityType}</b><br/>
				 *   </li>
				 * </ul>
				 */
				criticalityType: {
					namespace: "com.sap.vocabularies.UI.v1",
					annotation: "CriticalityType",
					target: ["Property"],
					defaultValue: null,
					since: "1.75"
				},
				/**
				 * The <code>CriticalityCalculationType</code> is a <code>ComplexType</code> that is used to define the
				 * type of <code>CriticalityCalculation</code> property in the <code>DataPoint</code> annotation.
				 * These parameters are used for client-calculated criticality and are an alternative to <code>Criticality</code>.
				 *
				 * <br>
				 * <i>XML Example of using CriticalityCalculation property with the CriticalityCalculationType type</i>
				 *
				 * <pre>
				 *    &lt;PropertyValue Property=&quot;CriticalityCalculation&quot;&gt;
				 *      &lt;Record Type=&quot;com.sap.vocabularies.UI.v1.CriticalityCalculationType&quot;&gt;
				 *        &lt;PropertyValue Property=&quot;ImprovementDirection&quot; EnumMember=&quot;com.sap.vocabularies.UI.v1.ImprovementDirectionType/Target&quot; /&gt;
				 *        &lt;PropertyValue Property=&quot;DeviationRangeLowValue&quot; Path=&quot;PriceDeviationLowerBound&quot;/&gt;
				 *        &lt;PropertyValue Property=&quot;ToleranceRangeLowValue&quot; Path=&quot;PriceToleranceLowerBound&quot;/&gt;
				 *        &lt;PropertyValue Property=&quot;ToleranceRangeHighValue&quot; Path=&quot;PriceToleranceUpperBound&quot;/&gt;
				 *        &lt;PropertyValue Property=&quot;DeviationRangeHighValue&quot; Path=&quot;PriceDeviationUpperBound&quot;/&gt;
				 *      &lt;/Record&gt;
				 *    &lt;/PropertyValue&gt;
				 * </pre>
				 *
				 * <br>
				 * <i><b><u>Documentation links</u></b></i>
				 * <ul>
				 *   <li>Term <b>{@link https://github.com/SAP/odata-vocabularies/blob/master/vocabularies/UI.md#CriticalityCalculationType  com.sap.vocabularies.UI.v1.CriticalityCalculationType}</b><br/>
				 *   </li>
				 * </ul>
				 */
				criticalityCalculationType: {
					namespace: "com.sap.vocabularies.UI.v1",
					annotation: "CriticalityCalculationType",
					target: ["Property"],
					defaultValue: null,
					since: "1.75"
				},
				/**
				 * The <code>Text</code> annotation describes the display value of the <code>Value</code> property in the <code>DataPoint</code> annotation.
				 *
				 * <br>
				 * <i>XML Example of using Text annotation</i>
				 *
				 * <pre>
				 *    &lt;Annotations Target=&quot;SalesOrderItem/Price&quot; xmlns=&quot;http://docs.oasis-open.org/odata/ns/edm&quot;&gt;
				 *       &lt;Annotation Term=&quot;com.sap.vocabularies.Common.v1.Text&quot; Path=&quot;DisplayValue&quot; /&gt;
				 *    &lt;/Annotations&gt;
				 *    &lt;Property Name=&quot;DisplayValue&quot; type=&quot;Edm.String&quot; /&gt;
				 * </pre>
				 *
				 * <br>
				 * <i><b><u>Documentation links</u></b></i>
				 * <ul>
				 *   <li>Term <b>{@link https://github.com/SAP/odata-vocabularies/blob/master/vocabularies/Common.md#Text  com.sap.vocabularies.Common.v1.Text}</b><br/>
				 *   </li>
				 * </ul>
				 */
				text: {
					namespace: "com.sap.vocabularies.Common.v1",
					annotation: "Text",
					target: ["Property"],
					defaultValue: null,
					since: "1.75"
				},
				/**
				 * Defines that a property is not displayed.
				 * If the property <code>Value</code> of the <code>DataPoint</code> in the <code>MeasureAttribute</code>
				 * of the Chart is annotated as hidden, the Chart is not rendered.
				 *
				 * <br>
				 * <i>Example in OData V4 notation with hidden ProductUUID</i>
				 *
				 * <pre>
				 *     &lt;Annotations Target=&quot;ProductCollection.Product/ProductUUID &quot;&gt;
				 *         &lt;Annotation Term=&quot;com.sap.vocabularies.UI.v1.Hidden&quot;/&gt;
				 *     &lt;/Annotations&gt;
				 * </pre>
				 *
				 * <br>
				 * <i><b><u>Documentation links</u></b></i>
				 * <ul>
				 *   <li>Term <b>{@link https://github.com/SAP/odata-vocabularies/blob/master/vocabularies/UI.md#Hidden  com.sap.vocabularies.UI.v1.Hidden}</b><br/>
				 *   </li>
				 * </ul>
				 */
				hidden: {
					namespace: "com.sap.vocabularies.UI.v1",
					annotation: "Hidden",
					target: ["Property", "Record"],
					since: "1.75"
				},
				/**
				 * Defines a currency code for an amount according to the ISO 4217 standard. The <code>ISOCurrency</code> annotation can point to a
				 * <code>Property</code>, which can also be <code>null</code>.
				 * The currency code is rendered in the footer of the container containing the MicroChart, if renderLabels is true.
				 *
				 * <br>
				 * <i>XML Example of OData V4 with Price and CurrencyCode as ISOCurrency</i>
				 *
				 * <pre>
				 *    &lt;Annotations Target=&quot;SalesOrderItem/Price&quot; xmlns=&quot;http://docs.oasis-open.org/odata/ns/edm&quot;&gt;
				 *      &lt;Annotation Term=&quot;Org.OData.Measures.V1.ISOCurrency&quot; Path=&quot;CurrencyCode&quot; /&gt;
				 *    &lt;/Annotations&gt;
				 *    &lt;Property Name=&quot;CurrencyCode&quot; type=&quot;Edm.String&quot; /&gt;
				 * </pre>
				 *
				 * <br>
				 * <i><b><u>Documentation links</u></b></i>
				 * <ul>
				 *   <li>Term <b>{@link https://github.com/oasis-tcs/odata-vocabularies/blob/master/vocabularies/Org.OData.Measures.V1.md#ISOCurrency  Org.OData.Measures.V1.ISOCurrency}</b><br/>
				 *   </li>
				 * </ul>
				 */
				currencyCode: {
					namespace: "Org.OData.Measures.V1",
					annotation: "ISOCurrency",
					target: ["Property"],
					defaultValue: null,
					since: "1.75"
				},

				/**
				 * The unit of measure for this measured quantity, for example cm for centimeters. Renders the value associated with the Unit annotation
				 * of a <code>Property</code>, which can be <code>null</code>.
				 * The unit of measure is rendered in the footer of the container containing the MicroChart, if renderLabels is true.
				 *
				 * <br>
				 * <i>XML Example of OData V4 with OrderedQuantity and OrderedUnit as Unit</i>
				 *
				 * <pre>
				 *    &lt;Annotations Target=&quot;SalesOrderItem/OrderedQuantity&quot; xmlns=&quot;http://docs.oasis-open.org/odata/ns/edm&quot;&gt;
				 *      &lt;Annotation Term=&quot;Org.OData.Measures.V1.Unit&quot; Path=&quot;OrderedUnit&quot; /&gt;
				 *    &lt;/Annotations&gt;
				 *    &lt;Property Name=&quot;OrderedUnit&quot; type=&quot;Edm.String&quot; /&gt;
				 * </pre>
				 *
				 * <br>
				 * <i><b><u>Documentation links</u></b></i>
				 * <ul>
				 *   <li>Term <b>{@link https://github.com/oasis-tcs/odata-vocabularies/blob/master/vocabularies/Org.OData.Measures.V1.md#Unit  Org.OData.Measures.V1.Unit}</b><br/>
				 *   </li>
				 * </ul>
				 */
				unitOfMeasure: {
					namespace: "Org.OData.Measures.V1",
					annotation: "Unit",
					target: ["Property"],
					defaultValue: null,
					since: "1.75"
				}
			}
		};
	},
	/* bExport= */ false
);
