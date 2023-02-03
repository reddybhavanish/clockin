import { EntityType, AnnotationPath, SelectionVariantType, SelectOptionType, PropertyPath } from "@sap-ux/vocabularies-types";
import {
	FilterSelectionField,
	PageConverterContext,
	PresentationConfiguration,
	QuickSelectionVariantConfiguration,
	TableConfiguration,
	VisualizationConverterContext
} from "../ManifestSettings";
import { getTableActionsConfiguration, getTableAnnotationConfiguration, getTableManifestConfiguration } from "././TableConverter";
import { getChartProperties } from "././ChartConverter";
import {
	NavigationProperty,
	getTargetEntityType,
	getNavigationProperties,
	getOnlyAnnotation,
	getTemplateAnnotationPath
} from "./CommonConverter";

const _getSelectionFields = function(
	context: PageConverterContext,
	selectionVariants: QuickSelectionVariantConfiguration[] | undefined
): FilterSelectionField[] {
	const { entityType } = context;
	var selectionFields: FilterSelectionField[] = [];
	var oSelectionVariantFields: any = {};
	selectionVariants?.forEach((selectionVariant: QuickSelectionVariantConfiguration) => {
		selectionVariant.propertyNames.forEach((propertyName: string) => {
			if (!oSelectionVariantFields[propertyName]) {
				oSelectionVariantFields[propertyName] = true;
			}
		});
	});
	entityType.annotations?.UI?.SelectionFields?.forEach((selection: PropertyPath, selectionIndex: number) => {
		const selectionFieldValue: string = selection.value;
		if (!oSelectionVariantFields[selectionFieldValue]) {
			selectionFields.push({
				readablePath: selectionFieldValue,
				templatingPath: "/" + entityType.name + "/@com.sap.vocabularies.UI.v1.SelectionFields/" + selectionIndex + "/$PropertyPath"
			});
		}
	});
	return selectionFields;
};

/**
 * Get Page presentation properties (LineItem, SelectionFields, Chart configuration and Table configuration).
 * @param {PageConverterContext} [context] Page Context
 * @param {string} [presentationPath] relative annotation Path used for presentation (PResentation Variant or Line Item)
 * @returns {PresentationConfiguration} object containing LineItem, SelectionFields, Chart configuration and Table configuration
 */

export function getPresentation(context: PageConverterContext, presentationPath: string): PresentationConfiguration {
	const { entityType, manifestSettings } = context;
	var annotationPath: string = presentationPath;
	var result: { [k: string]: any } = {};
	const navigationInfo: NavigationProperty = getNavigationProperties(presentationPath, entityType);
	const defaultAnnotationPath: string = navigationInfo.prefix + "@com.sap.vocabularies.UI.v1.LineItem";
	var visualizationLineItemPath: string = "",
		visualizationChartPath: string = "";
	const oEntityType: Required<EntityType> = navigationInfo.property
		? getTargetEntityType(navigationInfo.property, entityType)
		: entityType;
	var visualizationPaths: string[] = [],
		selectionVariants: QuickSelectionVariantConfiguration[] = [],
		isCompliantPresentationVariant: boolean = false;

	const presentationVariant: any = oEntityType.annotations?.getAnnotation("UI")[getOnlyAnnotation(annotationPath)];
	if (presentationVariant && presentationVariant.$Type === "com.sap.vocabularies.UI.v1.PresentationVariantType") {
		// Presentation Variant
		const visualizations: AnnotationPath[] = presentationVariant.Visualizations;

		if (visualizations) {
			for (var i = 0; i < visualizations.length; i++) {
				const targetAnnotationPath: string = visualizations[i].value;
				const itemPath = navigationInfo.prefix + targetAnnotationPath;
				if (
					targetAnnotationPath &&
					targetAnnotationPath.indexOf("@com.sap.vocabularies.UI.v1.LineItem") > -1 &&
					!visualizationLineItemPath
				) {
					visualizationPaths.push(itemPath);
					isCompliantPresentationVariant = true;
					result.annotationPath = getTemplateAnnotationPath(presentationVariant.fullyQualifiedName, entityType);
					visualizationLineItemPath = itemPath;
				} else if (
					targetAnnotationPath &&
					targetAnnotationPath.indexOf("@com.sap.vocabularies.UI.v1.Chart") > -1 &&
					sap.ui.Device &&
					sap.ui.Device.system.desktop &&
					!navigationInfo.property && // Currently chart is not managed with navigation Property
					!visualizationChartPath
				) {
					visualizationPaths.push(itemPath);
					visualizationChartPath = itemPath;
				}
				if (visualizationLineItemPath && visualizationChartPath) {
					i = visualizations.length;
				}
			}
		}

		if (!isCompliantPresentationVariant) {
			visualizationLineItemPath = defaultAnnotationPath;
			visualizationPaths = [defaultAnnotationPath];
			annotationPath = defaultAnnotationPath;
		}
	} else {
		visualizationLineItemPath =
			annotationPath.indexOf("@com.sap.vocabularies.UI.v1.LineItem") > -1 ? annotationPath : defaultAnnotationPath;
		visualizationPaths = [visualizationLineItemPath];
	}

	//Calculate Threshold for Table
	if (isCompliantPresentationVariant && presentationVariant.MaxItems) {
		result.threshold = presentationVariant.MaxItems;
	} else {
		result.threshold = navigationInfo.property ? 10 : 30;
	}

	result.visualizationPaths = [];
	visualizationPaths.forEach(itemPath => {
		const visualization: any = oEntityType.annotations?.getAnnotation("UI")[getOnlyAnnotation(itemPath)];
		if (visualization) {
			const targetPath = "/" + entityType.name + "/" + itemPath;
			result.visualizationPaths.push(targetPath);
		}
	});

	if (!result.annotationPath) {
		result.annotationPath = result.visualizationPaths[0];
	}

	if (manifestSettings.controlConfiguration) {
		manifestSettings.controlConfiguration[visualizationLineItemPath]?.tableSettings?.quickVariantSelection?.paths?.forEach(
			(path: { annotationPath: string }) => {
				const selection: SelectionVariantType = oEntityType.annotations?.getAnnotation("UI")[
					getOnlyAnnotation(path.annotationPath)
				];
				if (selection) {
					var propertyNames: string[] = [];
					selection.SelectOptions?.forEach((selectOption: SelectOptionType) => {
						const propertyName: any = selectOption.PropertyName;
						const PropertyPath: string = propertyName.value;
						if (propertyNames.indexOf(PropertyPath) === -1) {
							propertyNames.push(PropertyPath);
						}
					});
					selectionVariants.push({
						text: selection.Text as string,
						key: path.annotationPath,
						propertyNames: propertyNames
					});
				}
			}
		);
	}

	var presentationConfiguration = {
		...result,
		...{
			selectionFields: navigationInfo.property ? undefined : _getSelectionFields(context, selectionVariants),
			lineItemPath: visualizationLineItemPath,
			entityName: entityType.name,
			targetEntityName: oEntityType.name,
			quickVariantSelection: selectionVariants
		}
	} as PresentationConfiguration;
	const visualizationContext: VisualizationConverterContext = { ...{ visualizationPath: visualizationLineItemPath }, ...context };
	var tableConfiguration: any = {
		annotation: getTableAnnotationConfiguration(visualizationContext),
		control: getTableManifestConfiguration(visualizationContext),
		actions: getTableActionsConfiguration(visualizationLineItemPath, entityType, manifestSettings)
	};

	presentationConfiguration = {
		...presentationConfiguration,
		...{
			tableConfiguration: tableConfiguration as TableConfiguration
		}
	};

	//Get Chart properties
	if (visualizationChartPath && isCompliantPresentationVariant) {
		visualizationContext.visualizationPath = visualizationChartPath;
		presentationConfiguration.chartConfiguration = getChartProperties(visualizationContext);
	}

	return presentationConfiguration;
}
