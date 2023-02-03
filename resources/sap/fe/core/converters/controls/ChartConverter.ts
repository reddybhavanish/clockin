import { ChartConfiguration, VisualizationConverterContext } from "../ManifestSettings";
import { getNavigationProperties, getPVisualizationP13nMode } from "./CommonConverter";
import { StableIdHelper } from "sap/fe/core/helpers";

/**
 * Get properties required to build a chart via SAP FE chart fragment.
 * @param {VisualizationConverterContext} [context] Chart Context
 * @returns {ChartConfiguration} object containing chart properties
 */

export function getChartProperties(context: VisualizationConverterContext): ChartConfiguration {
	const { entityType, visualizationPath } = context,
		navigationInfo = getNavigationProperties(visualizationPath, entityType),
		entityName: string = entityType.name,
		isEntitySet: boolean = !navigationInfo.property,
		navProperty: string = navigationInfo.property,
		navigationOrCollectionName = navProperty ? navProperty : entityType.name;

	return {
		id: StableIdHelper.generate(["fe", "Chart", navigationOrCollectionName, visualizationPath]),
		collection: "/" + entityName + (!isEntitySet ? "/" + navProperty : ""),
		entityName: entityName,
		p13nMode: getPVisualizationP13nMode(context),
		navigationPath: navProperty
	};
}
