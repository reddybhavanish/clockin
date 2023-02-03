export const VOCABULARY_ALIAS: any = {
	"Org.OData.Capabilities.V1": "Capabilities",
	"Org.OData.Core.V1": "Core",
	"Org.OData.Measures.V1": "Measures",
	"com.sap.vocabularies.Common.v1": "Common",
	"com.sap.vocabularies.UI.v1": "UI",
	"com.sap.vocabularies.Analytics.v1": "Analytics",
	"com.sap.vocabularies.PersonalData.v1": "PersonalData",
	"com.sap.vocabularies.Communication.v1": "Communication"
};

const getReverseDictionary = function(dictionary: any): any {
	const reverse: any = {};
	Object.keys(dictionary).forEach(key => {
		reverse[dictionary[key]] = key;
	});
	return reverse;
};

export const VOCABULARY_REVERSE_ALIAS: any = getReverseDictionary(VOCABULARY_ALIAS);
