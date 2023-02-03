import { EntitySet, EntityType } from "@sap-ux/vocabularies-types";

export enum Placement {
	After = "After",
	Before = "Before"
}

export enum SectionType {
	Annotation = "Annotation",
	Default = "Default", // TBD
	XMLFragment = "XMLFragment"
}

export enum FeFacetType {
	Chart = "Chart",
	Contact = "Contact",
	Form = "Form",
	HeaderContact = "HeaderContact",
	Table = "Table"
}

export enum ActionType {
	DataFieldForAction = "ForAction",
	DataFieldForIntentBasedNavigation = "ForNavigation",
	Default = "Default"
}

export type BaseFacet = {
	annotationPath: string;
	hidden: boolean;
	type: FeFacetType;
};

export type BaseManifestSettings = {
	controlConfiguration?: {
		[annotationPath: string]: ControlManifestConfiguration;
	};
	entitySet: string;
	initialLoad?: boolean;
	liveMode?: boolean;
	navigation: {
		[navigationPath: string]: navigationSettingsConfiguration;
	};
	variantManagement?: string;
};

export type BaseSection = Positionable<{
	id?: string;
	name?: string;
	showTitle?: boolean;
	title: BindingExpression<string>;
	type: SectionType;
	visible: BindingExpression<boolean>;
}>;

export type BaseSubSection = {
	actions?: SubSectionAction[];
	facets?: Facet[];
	moreFacets?: FormFacet[];
};

export type BaseAction = {
	press: string;
	text: string;
	type: ActionType;
	visible: string;
	enabled: string;
};

export type BindingExpression<T> = T | string | undefined;

export type ChartConfiguration = {
	id: string;
	collection: string;
	entityName: string;
	p13nMode?: string;
	navigationPath: string;
};

export type ChartFacet = UnmanagedFacet & {};

export type ContactFacet = UnmanagedFacet & {};

export type ControlManifestConfiguration = TableManifestConfiguration;

export type DataFieldForAction = BaseAction & {
	id: string;
};

export type DataFieldForIntentBasedNavigationAction = BaseAction & {};

export type DefaultAction = BaseAction & {
	handlerMethod: string;
	handlerModule: string;
	controlId: string;
};

export type ManifestAction = BaseAction & {
	handler: string;
	id: string;
};

export type Facet = FormFacet | TableFacet | ContactFacet | ChartFacet;

export type FilterSelectionField = {
	readablePath: string;
	templatingPath: string;
};
export type FormFacet = BaseFacet & {
	type: FeFacetType.Form;
	entitySet: string;
	facetPath: string;
	useFormContainerLabels: boolean;
	hasFacetsNotPartOfPreview: boolean;
};

export type HeaderSection = {
	subSection: BaseSubSection;
};

export type ManifestSection = BaseSection & {
	facetType: string;
	subSections: Record<string, SubSection>;
};

export type navigationSettingsConfiguration = {
	detail?: {
		outbound?: string;
		route?: string;
	};
	display?: {
		target?: string;
	};
};

export type ObjectPageManifestSettings = BaseManifestSettings & {
	content?: {
		body?: {
			sections?: Record<string, ManifestSection>;
		};
	};
	editableHeaderContent: boolean;
};

export type PageConverterContext = {
	entitySet: Required<EntitySet>;
	entityType: Required<EntityType>;
	manifestSettings: BaseManifestSettings;
};

export type Position = {
	anchor: string;
	placement?: Placement;
};

export type Positionable<T> = {
	position?: Position;
} & T;

export type PresentationConfiguration = {
	selectionFields: FilterSelectionField[];
	annotationPath: string;
	chartConfiguration?: ChartConfiguration;
	entityName: string;
	lineItemPath: string;
	threshold: number;
	quickVariantSelection?: QuickSelectionVariantConfiguration[];
	tableConfiguration?: TableConfiguration;
	targetEntityName: string;
	visualizationPaths: string[];
};

export type QuickSelectionVariantConfiguration = {
	key: string;
	propertyNames: string[];
	text: string;
};

export type TableControlConfiguration = {
	createAtEnd?: boolean;
	creationMode?: string;
	disableAddRowButtonForEmptyData?: boolean;
	enableExport?: boolean;
	headerVisible?: boolean;
	quickFilter?: string;
	type?: string;
};

export type Section = BaseSection & {
	subSections: SubSection[];
};

export type SubSection = BaseSection & BaseSubSection;

export type SubSectionAction = DataFieldForIntentBasedNavigationAction | DataFieldForAction;

export type TableAnnotationConfiguration = {
	autoBindOnInit: boolean;
	busy: string;
	createMode: string;
	collection: string;
	editMode: string;
	enableControlVM?: string;
	filterId?: string;
	id: string;
	isEntitySet: boolean;
	navigationOrCollectionName: string;
	navigationPath: string;
	p13nMode?: string;
	row?: {
		action?: string;
		press?: string;
	};
	selectionMode: string;
	show?: {
		create?: string;
		delete?: string | boolean;
	};
};

export type TableConfiguration = {
	annotation: TableAnnotationConfiguration;
	control: TableControlConfiguration;
	actions?: Record<string, DefaultAction>;
};

export type TableFacet = BaseFacet & {
	presentation: PresentationConfiguration;
};

export type TableManifestConfiguration = {
	tableSettings: TableManifestSettingsConfiguration;
	actions?: Record<string, ManifestAction>;
};

export type TableManifestSettingsConfiguration = {
	creationMode?: {
		createAtEnd?: boolean;
		name?: string;
		disableAddRowButtonForEmptyData?: boolean;
	};
	enableExport: boolean;
	quickVariantSelection: {
		paths: [
			{
				annotationPath: string;
			}
		];
		hideTableTitle?: boolean;
		showCounts?: boolean;
	};
	personalization: any;
	selectionMode: string;
	type: string;
};

export type UnmanagedFacet = BaseFacet & {
	text: string;
};

export type VisualizationConverterContext = PageConverterContext & {
	visualizationPath: string;
};
