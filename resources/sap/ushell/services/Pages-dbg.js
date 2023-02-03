// Copyright (c) 2009-2020 SAP SE, All Rights Reserved

/**
 * @fileOverview This module exposes a model containing the pages hierarchy to its clients.
 * @version 1.78.0
 */
sap.ui.define([
    "sap/base/Log",
    "sap/ushell/utils/RestrictedJSONModel",
    "sap/base/util/deepClone",
    "sap/ushell/resources",
    "sap/ushell/utils",
    "sap/ushell/Config",
    "sap/ushell/adapters/cdm/v3/utilsCdm",
    "sap/ushell/adapters/cdm/v3/_LaunchPage/readUtils"
], function (
    Log,
    RestrictedJSONModel,
    deepClone,
    resources,
    ushellUtils,
    Config,
    utilsCdm,
    readUtils
) {
    "use strict";

    /**
     * This method MUST be called by the Unified Shell's container only, others MUST call
     * <code>sap.ushell.Container.getService("PageReferencing")</code>.
     * Constructs a new instance of the page referencing service.
     *
     * @namespace sap.ushell.services.PageReferencing
     *
     * @constructor
     * @class
     * @see {@link sap.ushell.services.Container#getService}
     * @since 1.72.0
     *
     * @private
     */
    var Pages = function () {
        this.COMPONENT_NAME = "sap/ushell/services/Pages";
        this._oCdmServicePromise = sap.ushell.Container.getServiceAsync("CommonDataModel");
        if (!Config.last("/core/spaces/vizInstantiation/enabled")) {
            this._oVisualizationLoadingServicePromise = sap.ushell.Container.getServiceAsync("VisualizationLoading");
        } else {
            this._oVisualizationLoadingServicePromise = Promise.resolve();
        }

        this._oPagesModel = new RestrictedJSONModel({
            pages: []
        });
    };

    /**
     * Generates a new id which is unique within a page for sections as well as for visualizations.
     *
     * @param {string} sPageId The ID of the page.
     * @returns {string} A pseudo-unique ID.
     *
     * @since 1.75.0
     * @private
     */
    Pages.prototype._generateId = function (sPageId) {
        var aIds = [];
        var oPage = this.getModel().getProperty(this.getPagePath(sPageId));

        oPage.sections.forEach(function (oSection) {
            aIds.push(oSection.id);
            oSection.visualizations.forEach(function (oVisualization) {
                aIds.push(oVisualization.id);
            });
        });

        return ushellUtils.generateUniqueId(aIds);
    };

    /**
     * Returns the model
     *
     * @returns {object} Read only model
     * @since 1.72.0
     *
     * @private
     */
    Pages.prototype.getModel = function () {
        return this._oPagesModel;
    };

    /**
     * Calculates the index of a specific page in the model.
     *
     * @param {string} sPageId The ID of a page.
     * @returns {int|undefined} The index of the page within the model or "undefined" if the page is not in the model.
     *
     * @since 1.75.0
     * @private
     */
    Pages.prototype.getPageIndex = function (sPageId) {
        var aPages = this._oPagesModel.getProperty("/pages");
        for (var iPageIndex = 0; iPageIndex < aPages.length; ++iPageIndex) {
            if (aPages[iPageIndex].id === sPageId) {
                return iPageIndex;
            }
        }
        return undefined;
    };

    /**
     * Calculates the path to a specific page in the model.
     *
     * @param {string} sPageId The ID of a page.
     * @returns {string} Path to the page in the model or an empty string ("") if the page is not in the model.
     * @since 1.72.0
     *
     * @private
     */
    Pages.prototype.getPagePath = function (sPageId) {
        var iPageIndex = this.getPageIndex(sPageId);
        if (typeof iPageIndex === "undefined") {
            return "";
        }
        return "/pages/" + iPageIndex;
    };

    /**
     * Loads a page into the model
     *
     * @param {string} sPageId id of the page
     * @returns {Promise<string>} promise resolves with the path to the model in the page after the page is loaded
     * @since 1.72.0
     *
     * @private
     */
    Pages.prototype.loadPage = function (sPageId) {
        var sPagePath = this.getPagePath(sPageId);

        if (sPagePath) {
            return Promise.resolve(sPagePath);
        }
        // Make sure the visualization loading service is loaded before the page model is updated. The page model update
        // triggers visualization instantiation. If the visualization loading service is not yet ready, the visualization
        // initialization fails. This usually happens when an app(e.g. App Finder) is cold started, and a new visualization
        // is added from this app to a page.
        return Promise.all([
            this._oCdmServicePromise,
            this._oVisualizationLoadingServicePromise
        ])
            .catch(function (oError) {
                Log.error("Pages - loadPage: Couldn't resolve CDM Service or Visualization Loading Service.", oError, this.COMPONENT_NAME);
                return Promise.reject(oError);
            }.bind(this))
            .then(function (aServices) {
                var oCdmService = aServices[0];
                var oVisualizationLoadingService = aServices[1];

                var aPromises = [
                    oCdmService.getPage(sPageId),
                    oCdmService.getVisualizations(),
                    oCdmService.getApplications(),
                    oCdmService.getVizTypes()
                ];

                if (oVisualizationLoadingService) {
                    // if the visualizationInstantiation service is active no data loading is required
                    aPromises.push(oVisualizationLoadingService.loadVisualizationData());
                }

                return Promise.all(aPromises)
                    .then(function (aResults) {
                        var oPage = aResults[0];
                        var oVisualizations = aResults[1];
                        var oApplications = aResults[2];
                        var oVizTypes = aResults[3];
                        return this._getModelForPage(oPage, oVisualizations, oApplications, oVizTypes);
                    }.bind(this))
                    .then(function (oModelForPage) {
                        var iPageCount = this._oPagesModel.getProperty("/pages/").length;
                        var sNewPagePath = "/pages/" + iPageCount;
                        this._oPagesModel._setProperty(sNewPagePath, oModelForPage);
                        return sNewPagePath;
                    }.bind(this))
                    .catch(function (oError) {
                        Log.error("Pages - loadPage: Failed to gather site data.", oError, this.COMPONENT_NAME);
                        return Promise.reject(oError);
                    }.bind(this));
            }.bind(this));
    };

    /**
     * @typedef {object} VisualizationLocation The location of a visualization within a page section.
     * @property {int} pageId The ID of the page where the section is.
     * @property {int} sectionIndex The section index within that page.
     * @property {int[]} vizIndexes The visualization indexes within that section.
     */

    /**
     * Find every index of a visualization within the sections of a page.
     *
     * @param {string} sPageId The "pageId" of the page to be searched on.
     * @param {string} [sSectionId] The "sectionId" of the page to be searched on. The optional parameter.
     *                              If sectionId is set, search is executed within the given section. Otherwise, within all sections.
     * @param {string} sVizId The "vizId" of the visualization to look for.
     *
     * @returns {VisualizationLocation[]} An array of {@link VisualizationLocation}, retrieving every index of a visualization within a page.
     */
    Pages.prototype.findVisualization = function (sPageId, sSectionId, sVizId) {
        return this._oCdmServicePromise
            .catch(function (oError) {
                Log.error("Pages - findVisualization: Personalization cannot be saved: CDM Service cannot be retrieved.", oError, this.COMPONENT_NAME);
                return Promise.reject(oError);
            }.bind(this))
            .then(function (oCdmService) {
                return Promise.all([
                    this.loadPage(sPageId),
                    oCdmService.getVisualizations(),
                    oCdmService.getApplications()
                ])
                    .then(function (aResults) {
                        var sPagePath = aResults[0];
                        var aPageSections = this.getModel().getProperty(sPagePath + "/sections") || [];
                        return aPageSections.reduce(function (accumulatorSections, section, sectionIndex) {
                            if (sSectionId && section.id !== sSectionId) {
                                return accumulatorSections;
                            }
                            var aVizIndexes = section.visualizations.reduce(function (accumulatorVisualizations, viz, vizIndex) {
                                if (viz.vizId === sVizId) { accumulatorVisualizations.push(vizIndex); }
                                return accumulatorVisualizations;
                            }, []);
                            if (aVizIndexes.length) {
                                accumulatorSections.push({
                                    pageId: sPageId,
                                    sectionIndex: sectionIndex,
                                    vizIndexes: aVizIndexes
                                });
                            }
                            return accumulatorSections;
                        }, []);
                    }.bind(this))
                    .catch(function (oError) {
                        Log.error("Pages - findVisualization: Couldn't load page, get visualizations or applications.", oError, this.COMPONENT_NAME);
                        return Promise.reject(oError);
                    }.bind(this));
                }.bind(this));
    };

    /**
     * Moves a visualization inside the model and updates the CDM site of the CDM service accordingly.
     *
     * @param {int} iPageIndex The index of the page containing the moved visualization.
     * @param {int} iSourceSectionIndex The index of the section from where the visualization is moved.
     * @param {int} iSourceVisualizationIndex The index of the moved visualization.
     * @param {int} iTargetSectionIndex The index of the section to which the visualization should be moved.
     * @param {int} iTargetVisualizationIndex The new index of the moved visualization. If -1 is passed, the visualization is moved to the last position.
     *
     * @returns {Promise<void>} Promise which resolves after the personalization was saved.
     * @since 1.75.0
     *
     * @private
     */
    Pages.prototype.moveVisualization = function (iPageIndex, iSourceSectionIndex, iSourceVisualizationIndex, iTargetSectionIndex, iTargetVisualizationIndex) {
        // Do nothing if visualization is moved on itself.
        if (iSourceSectionIndex === iTargetSectionIndex && iSourceVisualizationIndex === iTargetVisualizationIndex) {
            return Promise.resolve();
        }

        this.setPersonalizationActive(true);
        var oPageModel = this._oPagesModel.getProperty("/pages/" + iPageIndex);
        var sPageId = oPageModel.id;
        var oSourceSection = oPageModel.sections[iSourceSectionIndex];
        var oTargetSection = oPageModel.sections[iTargetSectionIndex];
        var sSourceSectionId = oSourceSection.id;
        var sTargetSectionId = oTargetSection.id;
        var oMovedVisualization = oSourceSection.visualizations[iSourceVisualizationIndex];
        var sMovedVisualizationId = oMovedVisualization.id;

        // Remove the visualization from the source section
        oSourceSection.visualizations.splice(iSourceVisualizationIndex, 1);

        // Insert the visualization into the target section
        if (iTargetVisualizationIndex === -1) {
            iTargetVisualizationIndex = oTargetSection.visualizations.length;
        } else if (iSourceSectionIndex === iTargetSectionIndex && iSourceVisualizationIndex < iTargetVisualizationIndex) {
            iTargetVisualizationIndex--;
        }
        oTargetSection.visualizations.splice(iTargetVisualizationIndex, 0, oMovedVisualization);

        // If the default section becomes empty, delete it
        if (oSourceSection.default && !oSourceSection.visualizations.length) {
            oPageModel.sections.splice(iSourceSectionIndex, 1);
        }

        this._oPagesModel.refresh();

        // Modify the personalized page in the CDM 3.1 site
        return this._oCdmServicePromise
            .then(function (oCdmService) {
                return oCdmService.getPage(sPageId);
            })
            .catch(function (oError) {
                Log.error("Pages - moveVisualization: Personalization cannot be saved: CDM Service or Page cannot be retrieved.", oError, this.COMPONENT_NAME);
                return Promise.reject(oError);
            }.bind(this))
            .then(function (oPage) {
                var oSourceSectionInPage = oPage.payload.sections[sSourceSectionId];
                var aSourceVizOrder = oSourceSectionInPage.layout.vizOrder;
                var oSourceViz = oSourceSectionInPage.viz;

                var oTargetSectionInPage = oPage.payload.sections[sTargetSectionId];
                var aTargetVizOrder = oTargetSectionInPage.layout.vizOrder;
                var oTargetViz = oTargetSectionInPage.viz;

                var oMovedVisualizationClone = deepClone(oSourceViz[sMovedVisualizationId]);

                aSourceVizOrder.splice(aSourceVizOrder.indexOf(sMovedVisualizationId), 1);
                aTargetVizOrder.splice(iTargetVisualizationIndex, 0, sMovedVisualizationId);

                if (sSourceSectionId !== sTargetSectionId) {
                    delete oSourceViz[sMovedVisualizationId];
                    oTargetViz[sMovedVisualizationId] = oMovedVisualizationClone;
                }

                // If the default section becomes empty, delete it
                if (oSourceSectionInPage.default && !Object.keys(oSourceViz).length) {
                    delete oPage.payload.sections[sSourceSectionId]; // delete section from sections
                    oPage.payload.layout.sectionOrder.splice(iSourceSectionIndex, 1); // delete index from sectionOrder
                }

                return this.savePersonalization(sPageId);
            }.bind(this))
            .catch(function (oError) {
                this.setPersonalizationActive(false);
                return Promise.reject(oError);
            }.bind(this));
    };

    /**
     * Deletes a visualization inside the model as well as inside the page of the CDM 3.1 site.
     *
     * @param {int} iPageIndex The index of the page containing the deleted visualization.
     * @param {int} iSourceSectionIndex The index of the section from where the visualization is deleted.
     * @param {int} iSourceVisualizationIndex The index of the deleted visualization.
     *
     * @returns {Promise<void>} Promise which resolves after the personalization was saved.
     *
     * @since 1.75.0
     * @private
     */
    Pages.prototype.deleteVisualization = function (iPageIndex, iSourceSectionIndex, iSourceVisualizationIndex) {
        var oPageModel = this._oPagesModel.getProperty("/pages/" + iPageIndex);
        var oSectionModel = oPageModel.sections[iSourceSectionIndex];

        // If the default section becomes empty, delete it
        if (oSectionModel.default && oSectionModel.visualizations.length < 2) {
            return this.deleteSection(iPageIndex, iSourceSectionIndex);
        }

        this.setPersonalizationActive(true);
        var aSourceSectionVisualizations = oSectionModel.visualizations;
        var oRemovedVisualization = aSourceSectionVisualizations[iSourceVisualizationIndex];
        aSourceSectionVisualizations.splice(iSourceVisualizationIndex, 1);
        this._oPagesModel.refresh();

        return this._oCdmServicePromise
            .then(function (oCDMService) {
                return oCDMService.getPage(oPageModel.id);
            })
            .catch(function (oError) {
                Log.error("Pages - deleteVisualization: Personalization cannot be saved: CDM Service or Page cannot be retrieved.", oError, this.COMPONENT_NAME);
                return Promise.reject(oError);
            }.bind(this))
            .then(function (oPage) {
                var aSectionVizOrder = oPage.payload.sections[oSectionModel.id].layout.vizOrder;
                var aVizRefs = oPage.payload.sections[oSectionModel.id].viz;
                Object.keys(aVizRefs).forEach(function (sVizRefId) {
                    if (aVizRefs[sVizRefId].vizId === oRemovedVisualization.vizId) {
                        delete aVizRefs[sVizRefId];
                        aSectionVizOrder.splice(iSourceVisualizationIndex, 1);
                    }
                });
                return this.savePersonalization(oPage.identification.id);
            }.bind(this))
            .catch(function (oError) {
                this.setPersonalizationActive(false);
                return Promise.reject(oError);
            }.bind(this));
    };

    /**
     * Returns the index of the section.
     *
     * @param {string} sPagePath The path of the page the section is on.
     * @param {string} sSectionId The id of the section that we want the index of.
     *
     * @returns {int} The index of the section with the given section id.
     *
     * @since 1.75.0
     *
     * @private
     */
    Pages.prototype._getSectionIndex = function (sPagePath, sSectionId) {
        var aSections = this.getModel().getProperty(sPagePath + "/sections") || [],
            i = 0;

        for (; i < aSections.length; i += 1) {
            if (aSections[i].id === sSectionId) {
                return i;
            }
        }
    };

    /**
     * Returns the visualization data for the given visualization id.
     *
     * @param {string} sPageId Id of the Page
     * @param {string} sVizId The visualization id of the visualization data that should be returned.
     * @param {object} oVisualizations A map of all visualization.
     * @param {object} [oAdditionalVizData] Additional visualization data that should overwrite the standard data.
     * @param {object} oApplications A map of all applications.
     * @param {object} oVizTypes The map of vizTypes
     * @param {object} oURLParsingService The URLParsing service
     *
     * @returns {object} The visualization data for the given visualization id.
     *
     * @since 1.75.0
     *
     * @private
     */
    Pages.prototype._getVisualizationData = function (sPageId, sVizId, oVisualizations, oAdditionalVizData, oApplications, oVizTypes, oURLParsingService) {
        var oVisualizationReference = oAdditionalVizData || {
            vizId: sVizId
        };
        var oSite = {
            applications: oApplications,
            visualizations: oVisualizations,
            vizTypes: oVizTypes
        };
        var oVizData = readUtils.getVizData(oSite, oVisualizationReference, oURLParsingService);
        if (!oVizData.id) {
            oVizData.id = this._generateId(sPageId);
        }
        return oVizData;
    };

    /**
     * Adds a new visualization to the model and to the CDM 3.1 site.
     *
     * @param {string} sPageId The id of the page the visualization should be added to.
     * @param {string} [sSectionId] The id of the section the visualization should be added to.
     * @param {string} sVizId The id of the visualization to add.
     *
     * @returns {Promise<void>} Promise which resolves after the personalization was saved.
     *
     * @since 1.75.0
     *
     * @protected
     */
    Pages.prototype.addVisualization = function (sPageId, sSectionId, sVizId) {
        return this._oCdmServicePromise
            .catch(function (oError) {
                Log.error("Pages - addVisualization: Personalization cannot be saved: CDM Service cannot be retrieved.", oError, this.COMPONENT_NAME);
                return Promise.reject(oError);
            }.bind(this))
            .then(function (oCdmService) {
                return Promise.all([
                    this.loadPage(sPageId),
                    oCdmService.getVisualizations(),
                    oCdmService.getApplications(),
                    oCdmService.getVizTypes(),
                    sap.ushell.Container.getServiceAsync("URLParsing")
                ])
                    .catch(function (oError) {
                        Log.error("Pages - addVisualization: Personalization cannot be saved: Failed to load page, get visualizations or get applications.", oError, this.COMPONENT_NAME);
                        return Promise.reject(oError);
                    }.bind(this))
                    .then(function (aResult) {
                        var sPagePath = aResult[0],
                            oURLParsingService = aResult[4],
                            iSectionIndex = this._getSectionIndex(sPagePath, sSectionId),
                            aSection = this.getModel().getProperty(sPagePath + "/sections") || [],
                            oVisualizationData = this._getVisualizationData(sPageId, sVizId, aResult[1], null, aResult[2], aResult[3], oURLParsingService);

                        // Find default section
                        var iDefaultSectionIndex;
                        for (var i = 0; i < aSection.length; i++) {
                            if (aSection[i].default) {
                                iDefaultSectionIndex = i;
                            }
                        }

                        // Add visualization to existing default section, update model & site, save personalization
                        if (iSectionIndex !== undefined || iDefaultSectionIndex !== undefined) {
                            this.setPersonalizationActive(true);
                            var iSectionPathIndex = iSectionIndex !== undefined ? iSectionIndex : iDefaultSectionIndex || 0,
                                sVisualizationsPath = sPagePath + "/sections/" + iSectionPathIndex + "/visualizations";

                            this.getModel().getProperty(sVisualizationsPath).push(oVisualizationData);
                            this.getModel().refresh();

                            return oCdmService.getPage(sPageId)
                                .catch(function (oError) {
                                    Log.error("Pages - addVisualization: Personalization cannot be saved: Failed to get page.", oError, this.COMPONENT_NAME);
                                    return Promise.reject(oError);
                                }.bind(this))
                                .then(function (oPage) {
                                    var oSection = oPage.payload.sections[sSectionId || oPage.payload.layout.sectionOrder[0]];

                                    oSection.layout.vizOrder.push(oVisualizationData.id);
                                    oSection.viz[oVisualizationData.id] = {
                                        id: oVisualizationData.id,
                                        vizId: sVizId
                                    };

                                    return this.savePersonalization(sPageId);
                                }.bind(this));
                        }

                        // Create a new default section together with the visualization if there is no default section yet
                        var iPageIndex = parseInt(sPagePath.split("/")[2], 10);
                        return this.addSection(iPageIndex, 0, {
                            title: resources.i18n.getText("DefaultSection.Title"),
                            default: true,
                            visualizations: [oVisualizationData]
                        });
                    }.bind(this));
            }.bind(this))
            .catch(function (oError) {
                this.setPersonalizationActive(false);
                return Promise.reject(oError);
            }.bind(this));
    };

    /**
     * Moves a section inside the model
     *
     * @param {int} iPageIndex The index of the page containing the moved section.
     * @param {int} iSourceSectionIndex The index of the moved section.
     * @param {int} iTargetSectionIndex The new index of the moved section.
     *
     * @returns {Promise<void>} Promise which resolves after the personalization was saved.
     *
     * @since 1.75.0
     *
     * @private
     */
    Pages.prototype.moveSection = function (iPageIndex, iSourceSectionIndex, iTargetSectionIndex) {
        if (iSourceSectionIndex === iTargetSectionIndex) {
            return Promise.resolve();
        }

        this.setPersonalizationActive(true);

        var sPageId = this._oPagesModel.getProperty("/pages/" + iPageIndex + "/id");
        var aSections = this._oPagesModel.getProperty("/pages/" + iPageIndex + "/sections");
        var oMovedSection = this._oPagesModel.getProperty("/pages/" + iPageIndex + "/sections/" + iSourceSectionIndex);
        var sMovedSectionId = oMovedSection.id;

        // Remove the section
        aSections.splice(iSourceSectionIndex, 1);

        // Updates indices because of removing sections
        if (iSourceSectionIndex < iTargetSectionIndex) {
            iTargetSectionIndex--;
        }

        // Insert the section
        aSections.splice(iTargetSectionIndex, 0, oMovedSection);

        this._oPagesModel.refresh();

        return this._oCdmServicePromise
            .then(function (oCdmService) {
                return oCdmService.getPage(sPageId);
            })
            .catch(function (oError) {
                Log.error("Pages - moveSection: Personalization cannot be saved: CDM Service or Page cannot be retrieved.", oError, this.COMPONENT_NAME);
                return Promise.reject(oError);
            }.bind(this))
            .then(function (oPage) {
                var aSectionOrder = oPage.payload.layout.sectionOrder;

                aSectionOrder.splice(aSectionOrder.indexOf(sMovedSectionId), 1);
                aSectionOrder.splice(iTargetSectionIndex, 0, sMovedSectionId);

                return this.savePersonalization(sPageId);
            }.bind(this))
            .catch(function (oError) {
                this.setPersonalizationActive(false);
                return Promise.reject(oError);
            }.bind(this));
    };

    /**
     * Adds an empty section to the model
     *
     * @param {int} iPageIndex The index of the page to which the section is added
     * @param {int} iSectionIndex The index of the added section.
     * @param {object} [oSectionProperties] Properties of the added section.
     *
     * @returns {Promise<void>} Promise which resolves after the personalization was saved.
     *
     * @since 1.75.0
     *
     * @private
     */
    Pages.prototype.addSection = function (iPageIndex, iSectionIndex, oSectionProperties) {
        this.setPersonalizationActive(true);

        var oSectionReference = oSectionProperties || {},
            aSections = this._oPagesModel.getProperty("/pages/" + iPageIndex + "/sections"),
            sPageId = this._oPagesModel.getProperty("/pages/" + iPageIndex + "/id");

        var oNewSection = {
            id: oSectionReference.id !== undefined ? oSectionReference.id : this._generateId(sPageId),
            title: oSectionReference.title !== undefined ? oSectionReference.title : "",
            visible: oSectionReference.visible !== undefined ? oSectionReference.visible : true,
            preset: oSectionReference.preset !== undefined ? oSectionReference.preset : false,
            locked: oSectionReference.locked !== undefined ? oSectionReference.locked : false,
            default: oSectionReference.default !== undefined ? oSectionReference.default : false,
            visualizations: oSectionReference.visualizations !== undefined ? oSectionReference.visualizations : []
        };

        aSections.splice(iSectionIndex, 0, oNewSection);

        this._oPagesModel.refresh();

        return this._oCdmServicePromise
            .then(function (oCdmService) {
                return oCdmService.getPage(sPageId);
            })
            .catch(function (oError) {
                Log.error("Pages - addSection: Personalization cannot be saved: CDM Service or Page cannot be retrieved.", oError, this.COMPONENT_NAME);
                return Promise.reject(oError);
            }.bind(this))
            .then(function (oPage) {
                var oSection = {
                    id: oNewSection.id,
                    title: oNewSection.title,
                    visible: oNewSection.visible,
                    preset: oNewSection.preset,
                    locked: oNewSection.locked,
                    default: oNewSection.default,
                    layout: {
                        vizOrder: []
                    },
                    viz: {}
                };

                if (oNewSection.visualizations) {
                    var i = 0,
                        oVizData;

                    for (; i < oNewSection.visualizations.length; i++) {
                        oVizData = oNewSection.visualizations[i];
                        oSection.layout.vizOrder.push(oVizData.id);
                        if (oVizData.isBookmark) {
                            oSection.viz[oVizData.id] = readUtils.getVizRef(oVizData);
                        } else {
                            oSection.viz[oVizData.id] = {
                                id: oVizData.id,
                                vizId: oVizData.vizId
                            };
                        }
                    }
                }

                oPage.payload.layout.sectionOrder.splice(iSectionIndex, 0, oNewSection.id);
                oPage.payload.sections[oNewSection.id] = oSection;

                return this.savePersonalization(sPageId);
            }.bind(this))
            .catch(function (oError) {
                this.setPersonalizationActive(false);
                return Promise.reject(oError);
            }.bind(this));
    };

    /**
     * Deletes a section out of the model.
     *
     * @param {int} iPageIndex The index of the page containing the deleted section.
     * @param {int} iSectionIndex The index of deleted section.
     *
     * @returns {Promise<void>} Promise which resolves after the personalization was saved.
     *
     * @since 1.75.0
     *
     * @private
     */
    Pages.prototype.deleteSection = function (iPageIndex, iSectionIndex) {
        this.setPersonalizationActive(true);

        var sPageId = this._oPagesModel.getProperty("/pages/" + iPageIndex + "/id");
        var aSections = this._oPagesModel.getProperty("/pages/" + iPageIndex + "/sections");
        var sSectionId = aSections[iSectionIndex].id;
        aSections.splice(iSectionIndex, 1);
        this._oPagesModel.refresh();

        return this._oCdmServicePromise
            .then(function (oCdmService) {
                return oCdmService.getPage(sPageId);
            })
            .catch(function (oError) {
                Log.error("Pages - deleteSection: Personalization cannot be saved: CDM Service or Page cannot be retrieved.", oError, this.COMPONENT_NAME);
                return Promise.reject(oError);
            }.bind(this))
            .then(function (oPage) {
                delete oPage.payload.sections[sSectionId];
                oPage.payload.layout.sectionOrder.splice(iSectionIndex, 1);
                return this.savePersonalization(sPageId);
            }.bind(this))
            .catch(function (oError) {
                this.setPersonalizationActive(false);
                return Promise.reject(oError);
            }.bind(this));
    };

    /**
     * Sets the visibility of a section.
     *
     * @param {int} iPageIndex The index of the page containing the section.
     * @param {int} iSectionIndex The index of the section.
     * @param {bool} bVisibility The new visibility value.
     *
     * @returns {Promise<void>} Promise which resolves after the personalization was saved.
     *
     * @since 1.75.0
     *
     * @private
     */
    Pages.prototype.setSectionVisibility = function (iPageIndex, iSectionIndex, bVisibility) {
        this.setPersonalizationActive(true);

        var sPageId = this._oPagesModel.getProperty("/pages/" + iPageIndex + "/id");
        var sSectionId = this._oPagesModel.getProperty("/pages/" + iPageIndex + "/sections/" + iSectionIndex + "/id");
        var oSection = this._oPagesModel.getProperty("/pages/" + iPageIndex + "/sections/" + iSectionIndex);

        if (oSection.visible === bVisibility) {
            return Promise.resolve();
        }

        oSection.visible = bVisibility;
        this._oPagesModel.refresh();

        return this._oCdmServicePromise
            .then(function (oCdmService) {
                return oCdmService.getPage(sPageId);
            })
            .catch(function (oError) {
                Log.error("Pages - setSectionVisibility: Personalization cannot be saved: CDM Service or Page cannot be retrieved.", oError, this.COMPONENT_NAME);
                return Promise.reject(oError);
            }.bind(this))
            .then(function (oPage) {
                oPage.payload.sections[sSectionId].visible = bVisibility;
                return this.savePersonalization(sPageId);
            }.bind(this))
            .catch(function (oError) {
                this.setPersonalizationActive(false);
                return Promise.reject(oError);
            }.bind(this));
    };

    /**
     * Sets the title of a section.
     *
     * @param {int} iPageIndex The index of the page containing the section.
     * @param {int} iSectionIndex The index of the section.
     * @param {string} sNewTitle The new title value.
     *
     * @returns {Promise<void>} Promise which resolves after the personalization was saved.
     *
     * @since 1.75.0
     * @private
     */
    Pages.prototype.renameSection = function (iPageIndex, iSectionIndex, sNewTitle) {
        this.setPersonalizationActive(true);

        var oPageModel = this._oPagesModel.getProperty("/pages/" + iPageIndex);
        var oSectionModel = oPageModel.sections[iSectionIndex];
        oSectionModel.title = sNewTitle;
        this._oPagesModel.refresh();

        return this._oCdmServicePromise
            .then(function (oCDMService) {
                return oCDMService.getPage(oPageModel.id);
            })
            .catch(function (oError) {
                Log.error("Pages - renameSection: Personalization cannot be saved: CDM Service or Page cannot be retrieved.", oError, this.COMPONENT_NAME);
                return Promise.reject(oError);
            }.bind(this))
            .then(function (oPage) {
                oPage.payload.sections[oSectionModel.id].title = sNewTitle;
                return this.savePersonalization(oPage.identification.id);
            }.bind(this))
            .catch(function (oError) {
                this.setPersonalizationActive(false);
                return Promise.reject(oError);
            }.bind(this));
    };

    /**
     * Resets a section in the pages model as well as inside the page of the CDM 3.1 site.
     *
     * @param {int} iPageIndex The index of the page containing the section.
     * @param {int} iSectionIndex The index of the section.
     *
     * @returns {Promise<void>} Promise which resolves after the personalization was saved.
     *
     * @since 1.75.0
     *
     * @private
     */
    Pages.prototype.resetSection = function (iPageIndex, iSectionIndex) {
        this.setPersonalizationActive(true);

        var sPageId = this._oPagesModel.getProperty("/pages/" + iPageIndex + "/id");
        var sSectionId = this._oPagesModel.getProperty("/pages/" + iPageIndex + "/sections/" + iSectionIndex + "/id");

        return this._oCdmServicePromise
            .then(function (oCdmService) {
                return Promise.all([
                    oCdmService.getVisualizations(),
                    oCdmService.getApplications(),
                    oCdmService.getPage(sPageId),
                    oCdmService.getOriginalPage(sPageId),
                    oCdmService.getVizTypes()
                ]);
            })
            .catch(function (oError) {
                Log.error("Pages - resetSection: Personalization cannot be saved: Failed to gather data from CDM Service.", oError, this.COMPONENT_NAME);
                return Promise.reject(oError);
            }.bind(this))
            .then(function (aResults) {
                var oVisualizations = aResults[0];
                var oApplications = aResults[1];
                var oCdmPage = aResults[2];
                var oOriginalCdmPage = aResults[3];
                var oVizTypes = aResults[4];

                return Promise.all([
                    this._getModelForPage(oOriginalCdmPage, oVisualizations, oApplications, oVizTypes),
                    oCdmPage,
                    oOriginalCdmPage
                ]);
            }.bind(this))
            .then(function (aResults) {
                var oOriginalPageModel = aResults[0];
                var oCdmPage = aResults[1];
                var oOriginalCdmPage = aResults[2];

                var oOriginalSectionModel = deepClone(oOriginalPageModel.sections.find(function (section) { return section.id === sSectionId; }), 20);

                var aOriginalVizIds = oOriginalSectionModel.visualizations.map(function (oVisualization) {
                    return oVisualization.id;
                });

                // the following loop ensures unique ids for viz references within a page according to adr-1011
                var oCurrentPageModel = this._oPagesModel.getProperty("/pages/" + iPageIndex);
                oCurrentPageModel.sections.forEach(function (oCurrentSectionModel) {
                    // Check in other sections if there is any visualization having a same id as in the reset section, if yes, generate a new id for this visualization.
                    if (oOriginalSectionModel.id !== oCurrentSectionModel.id) {
                        oCurrentSectionModel.visualizations.forEach(function (oVisualization) {
                            if (aOriginalVizIds.indexOf(oVisualization.id) !== -1) {
                                var sNewId = this._generateId(sPageId);

                                var oVizRef = deepClone(oCdmPage.payload.sections[oCurrentSectionModel.id].viz[oVisualization.id]);
                                delete oCdmPage.payload.sections[oCurrentSectionModel.id].viz[oVisualization.id];
                                var iVizOrderIndex = oCdmPage.payload.sections[oCurrentSectionModel.id].layout.vizOrder.indexOf(oVizRef.id);

                                oVizRef.id = sNewId;
                                oCdmPage.payload.sections[oCurrentSectionModel.id].viz[sNewId] = oVizRef;
                                oCdmPage.payload.sections[oCurrentSectionModel.id].layout.vizOrder[iVizOrderIndex] = sNewId;

                                oVisualization.id = sNewId;
                            }
                        }.bind(this));
                    }
                }.bind(this));

                this._oPagesModel._setProperty("/pages/" + iPageIndex + "/sections/" + iSectionIndex, oOriginalSectionModel);

                // Reset the CDM3.1 Site
                oCdmPage.payload.sections[oOriginalSectionModel.id] = oOriginalCdmPage.payload.sections[oOriginalSectionModel.id];
                return this.savePersonalization(oCdmPage.identification.id);
            }.bind(this))
            .catch(function (oError) {
                this.setPersonalizationActive(false);
                return Promise.reject(oError);
            }.bind(this));
    };

    /**
     * Resets a page in the model as well as inside the CDM 3.1 site.
     *
     * @param {int} iPageIndex The index of the page.
     *
     * @returns {Promise<void>} Promise which resolves after the personalization was saved.
     *
     * @since 1.75.0
     *
     * @private
     */
    Pages.prototype.resetPage = function (iPageIndex) {
        this.setPersonalizationActive(true);

        var sPageId = this._oPagesModel.getProperty("/pages/" + iPageIndex + "/id");

        return this._oCdmServicePromise
            .then(function (oCdmService) {
                return Promise.all([
                    oCdmService.getVisualizations(),
                    oCdmService.getApplications(),
                    oCdmService.getPage(sPageId),
                    oCdmService.getOriginalPage(sPageId),
                    oCdmService.getVizTypes()
                ]);
            })
            .catch(function (oError) {
                Log.error("Pages - resetPage: Personalization cannot be saved: Failed to gather data from CDM Service.", oError, this.COMPONENT_NAME);
                return Promise.reject(oError);
            }.bind(this))
            .then(function (aResults) {
                var oVisualizations = aResults[0];
                var oApplications = aResults[1];
                var oCdmPage = aResults[2];
                var oOriginalCdmPage = aResults[3];
                var oVizTypes = aResults[4];
                return Promise.all([
                    this._getModelForPage(oOriginalCdmPage, oVisualizations, oApplications, oVizTypes),
                    oCdmPage,
                    oOriginalCdmPage
                ]);
            }.bind(this))
            .then(function (aResults) {
                var oOriginalPageModel = aResults[0];
                var oCdmPage = aResults[1];
                var oOriginalCdmPage = aResults[2];
                this._oPagesModel._setProperty("/pages/" + iPageIndex, oOriginalPageModel);

                // Reset the CDM3.1 Site
                oCdmPage.payload = deepClone(oOriginalCdmPage.payload);
                return this.savePersonalization(oCdmPage.identification.id);
            }.bind(this))
            .catch(function (oError) {
                this.setPersonalizationActive(false);
                return Promise.reject(oError);
            }.bind(this));
    };

    /**
     * Handles the personalization state.
     * If set to true, initializes the model data used for personalization if it was not done already
     * If set to false, deletes the pending personalization changes by copying the original model
     *
     * @since 1.76.0
     *
     * @param {bool} bState The new personalization state
     *
     * @private
     */
    Pages.prototype.setPersonalizationActive = function (bState) {
        if (!this._bDirtyState && bState === true) {
            this._bDirtyState = true;
            this._oCopiedModelData = deepClone(this._oPagesModel.getProperty("/"), 20);
        } else if (this._bDirtyState && bState === false) {
            this._oPagesModel._setData(this._oCopiedModelData);
            this._bDirtyState = false;
        }
    };

    /**
     * Saves the personalization and resets the dirty state
     * @param {string} sPageId the id of the page which should be saved
     *
     * @returns {Promise<void>} Promise which resolves after the personalization was saved.
     *
     * @since 1.74.0
     * @private
     */
    Pages.prototype.savePersonalization = function (sPageId) {
        return this._oCdmServicePromise
            .then(function (oCDMService) {
                return oCDMService.save(sPageId);
            })
            .then(function () {
                this._bDirtyState = false;
            }.bind(this))
            .catch(function (oError) {
                Log.error("Pages - savePersonalization: Personalization cannot be saved: CDM Service cannot be retrieved or the save process encountered an error.", oError, this.COMPONENT_NAME);
                return Promise.reject(oError);
            }.bind(this));
    };

    /**
     * Returns an object which conforms to the JSON Model structure which is used by the
     * consumers of the Pages service to bind UI5 controls.
     *
     * @param {object} page A CDM 3.1 page
     * @param {object} visualizations All the visualizations of the CDM site
     * @param {object} applications All the applications of the CDM site
     * @param {object} vizTypes All the vizTypes of the CDM site
     *
     * @returns {Promise<object>} A promise that resolves to an object which represents the page inside the Pages Service JSON Model
     *
     * @since 1.75.0
     * @private
     */
    Pages.prototype._getModelForPage = function (page, visualizations, applications, vizTypes) {
        return Promise.all([
                sap.ushell.Container.getServiceAsync("ClientSideTargetResolution"),
                sap.ushell.Container.getServiceAsync("URLParsing")
            ])
            .catch(function (oError) {
                return Promise.reject(oError);
            })
            .then(function (aResults) {
                var oCSTRService = aResults[0];
                var oURLParsingService = aResults[1];
                var oPage = {
                    id: page.identification.id || "",
                    title: page.identification.title || "",
                    description: "",
                    sections: []
                };
                var bEnableHiddenGroup = Config.last("/core/catalog/enableHideGroups");

                return Promise.all(page.payload.layout.sectionOrder.map(function (sSectionId) {
                    var oCDMPageSection = page.payload.sections[sSectionId];
                    var oSection = {
                        id: oCDMPageSection.id || "",
                        title: oCDMPageSection.default ? resources.i18n.getText("DefaultSection.Title") : oCDMPageSection.title || "",
                        visualizations: [],
                        visible: !bEnableHiddenGroup || (oCDMPageSection.visible !== undefined ? oCDMPageSection.visible : true),
                        locked: oCDMPageSection.locked !== undefined ? oCDMPageSection.locked : false,
                        preset: oCDMPageSection.preset !== undefined ? oCDMPageSection.preset : true,
                        default: oCDMPageSection.default !== undefined ? oCDMPageSection.default : false
                    };
                    oPage.sections.push(oSection);

                    return Promise.all(oCDMPageSection.layout.vizOrder.map(function (id) {
                        var oVisualizationReference = oCDMPageSection.viz[id],
                            sVizId = oVisualizationReference.vizId,
                            oVizData = this._getVisualizationData(page.identification.id, sVizId, visualizations, oVisualizationReference, applications, vizTypes, oURLParsingService);
                            // In order to keep the order of the visualizations we have to add them first and remove them later asynchronously
                            oSection.visualizations.push(oVizData);

                        return this._isIntentSupported(oVizData, oCSTRService)
                            .then(function (bIntentIsSupported) {
                                if (!bIntentIsSupported) {
                                    var iIndex = oSection.visualizations.findIndex(function (oViz) {
                                        return oViz.id === oVizData.id;
                                    });
                                    oSection.visualizations.splice(iIndex, 1);
                                    Log.warning("The visualization " + oVizData.vizId + " is filtered out, because it does not have a supported intent.");
                                }
                            });
                    }.bind(this)));
                }.bind(this)))
                .then(function () {
                    return oPage;
                });
        }.bind(this));
    };

    /**
     * Checks whether a visualization can be resolved in the current context
     * @param {object} oVizData The vizData object which should be checked
     * @param {object} oCSTRService The resolved ClientSideTargetResolution service
     * @returns {Promise<boolean>} A Promise resolving a boolan indicating whether this visualization should be filtered out or not
     *
     * @since 1.78.0
     * @private
     */
    Pages.prototype._isIntentSupported = function (oVizData, oCSTRService) {
        if (oVizData.target === undefined) {
            return Promise.resolve(false);
        }
        if (oVizData.target.type === "URL") {
            return Promise.resolve(true);
        }
        return new Promise(function (resolve, reject) {
            oCSTRService.isIntentSupported([oVizData.targetURL])
                .then(function (oSupported) {
                    resolve(oSupported[oVizData.targetURL].supported);
                })
                .fail(function () {
                    resolve(false);
                });
        });
    };

    /**
     * Adds a new bookmark tile to the model and to the CDM 3.1 site.
     *
     * @param {string} pageId The id of the page to which the bookmark should be added.
     * @param {object} bookmark
     *   Bookmark parameters. In addition to title and URL, a bookmark might allow additional
     *   settings, such as an icon or a subtitle. Which settings are supported depends
     *   on the environment in which the application is running. Unsupported parameters will be ignored.
     * @param {string} bookmark.title
     *   The title of the bookmark.
     * @param {string} bookmark.url
     *   The URL of the bookmark. If the target application shall run in the Shell the URL has
     *   to be in the format <code>"#SO-Action~Context?P1=a&P2=x&/route?RPV=1"</code>.
     * @param {string} [bookmark.icon]
     *   The optional icon URL of the bookmark (e.g. <code>"sap-icon://home"</code>).
     * @param {string} [bookmark.info]
     *   The optional information text of the bookmark. This property is not relevant in the CDM context.
     * @param {string} [bookmark.subtitle]
     *   The optional subtitle of the bookmark.
     * @param {string} [bookmark.serviceUrl]
     *   The URL to a REST or OData service that provides some dynamic information for the bookmark.
     * @param {string} [bookmark.serviceRefreshInterval]
     *   The refresh interval for the <code>serviceUrl</code> in seconds.
     * @param {string} [bookmark.numberUnit]
     *   The unit for the number retrieved from <code>serviceUrl</code>.
     *   This property is not relevant in the CDM context.
     *
     * @returns {Promise<void>} Promise which resolves after the personalization was saved.
     *
     * @since 1.75.0
     *
     * @private
     */
    Pages.prototype.addBookmarkToPage = function (pageId, bookmark) {
        if (!pageId) {
            return Promise.reject("Pages - addBookmarkToPage: Adding bookmark tile failed: No page id is provided.");
        }

        this.setPersonalizationActive(true);

        // Ensure the target page is loaded
        return this._oCdmServicePromise
            .then(function (oCdmService) {
                return Promise.all([
                    this.loadPage(pageId),
                    sap.ushell.Container.getServiceAsync("URLParsing"),
                    oCdmService.getVizTypes()
                ]);
            }.bind(this))
            .catch(function (oError) {
                Log.error("Pages - addBookmarkToPage: Personalization cannot be saved: Could not load page.", oError, this.COMPONENT_NAME);
                return Promise.reject(oError);
            }.bind(this))
            .then(function (aResults) {
                var pagePath = aResults[0];
                var oURLParsingService = aResults[1];
                var oVizTypes = aResults[2];
                // Create visualization data for the model
                var oVizRef = {
                    id: this._generateId(pageId),
                    title: bookmark.title,
                    subTitle: bookmark.subtitle,
                    icon: bookmark.icon,
                    info: bookmark.info,
                    target: utilsCdm.toTargetFromHash(bookmark.url, oURLParsingService),
                    indicatorDataSource: {
                        path: bookmark.serviceUrl,
                        refresh: bookmark.serviceRefreshInterval
                    },
                    isBookmark: true
                };

                var oVizData = this._getVisualizationData(pageId, undefined, {}, oVizRef, {}, oVizTypes, oURLParsingService);

                // Find page & section
                var iPageIndex = parseInt(/pages\/(\d+)/.exec(pagePath)[1], 10);
                var oPage = this._oPagesModel.getProperty(pagePath);
                var oDefaultSection = oPage.sections.find(function (section) {
                    return section.default;
                });

                // Create a new default section together with the visualization if there is no default section yet
                if (!oDefaultSection) {
                    return this.addSection(iPageIndex, 0, {
                        title: resources.i18n.getText("DefaultSection.Title"),
                        default: true,
                        visualizations: [oVizData]
                    });
                }

                // Add visualization to existing default section, update model & site, save personalization
                oDefaultSection.visualizations.push(oVizData);
                this._oPagesModel.refresh();
                return this._oCdmServicePromise
                    .then(function (oCdmService) {
                        return oCdmService.getPage(pageId);
                    })
                    .catch(function (oError) {
                        Log.error("Pages - addBookmarkToPage: Personalization cannot be saved: CDM Service or Page cannot be retrieved.", oError, this.COMPONENT_NAME);
                        return Promise.reject(oError);
                    }.bind(this))
                    .then(function (page) {
                        var oSection = page.payload.sections[oDefaultSection.id];

                        oSection.layout.vizOrder.push(oVizRef.id);
                        oSection.viz[oVizRef.id] = oVizRef;
                        // Save
                        return this.savePersonalization(pageId);
                    }.bind(this));
            }.bind(this))
            .catch(function (oError) {
                this.setPersonalizationActive(false);
                return Promise.reject(oError);
            }.bind(this));
    };

    Pages.hasNoAdapter = true;
    return Pages;
}, /*export=*/ true);
