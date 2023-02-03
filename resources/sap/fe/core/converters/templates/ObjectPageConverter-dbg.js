sap.ui.define(["sap/fe/core/helpers/StableIdHelper", "sap/ui/model/odata/v4/AnnotationHelper", "../ManifestSettings", "../controls/PresentationConverter", "../ConverterUtil"], function (StableIdHelper, AnnotationHelper, ManifestSettings, PresentationConverter, ConverterUtil) {
  "use strict";

  var getPresentation = PresentationConverter.getPresentation;
  var ActionType = ManifestSettings.ActionType;
  var SectionType = ManifestSettings.SectionType;
  var Placement = ManifestSettings.Placement;
  var FeFacetType = ManifestSettings.FeFacetType;

  function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

  function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

  function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

  var createFacet = function (context, currentTarget, type, facetDefinition, parentFacetDefinition) {
    var _defintion$Target$$ta, _defintion$Target$$ta2, _defintion$Target$$ta3, _defintion$Target$$ta4;

    var entityType = context.entityType,
        oManifestSettings = context.manifestSettings;
    var entityPath = "/" + entityType.name,
        myFacet = {
      type: type,
      annotationPath: entityPath + "/@" + currentTarget
    };

    switch (type) {
      case FeFacetType.Form:
        myFacet = _objectSpread({}, myFacet, {}, {
          id: getFacetID([], facetDefinition, currentTarget),
          entitySet: "/" + entityType.name,
          useFormContainerLabels: !!(parentFacetDefinition && parentFacetDefinition.Facets),
          hasFacetsNotPartOfPreview: parentFacetDefinition && parentFacetDefinition.Facets ? parentFacetDefinition.Facets.some(function (childFacet) {
            var _childFacet$annotatio, _childFacet$annotatio2;

            return ((_childFacet$annotatio = childFacet.annotations) === null || _childFacet$annotatio === void 0 ? void 0 : (_childFacet$annotatio2 = _childFacet$annotatio.UI) === null || _childFacet$annotatio2 === void 0 ? void 0 : _childFacet$annotatio2.PartOfPreview) === false;
          }) : false,
          hidden: false
        });
        break;

      case FeFacetType.Table:
        myFacet = _objectSpread({}, myFacet, {}, {
          presentation: getPresentation(context, facetDefinition.Target.value)
        });
        break;

      case FeFacetType.HeaderContact:
        var defintion = facetDefinition;
        myFacet = _objectSpread({}, myFacet, {}, {
          contact: myFacet.annotationPath + "/Target/$AnnotationPath",
          text: (_defintion$Target$$ta = defintion.Target.$target.fn) === null || _defintion$Target$$ta === void 0 ? void 0 : (_defintion$Target$$ta2 = _defintion$Target$$ta.$target) === null || _defintion$Target$$ta2 === void 0 ? void 0 : (_defintion$Target$$ta3 = _defintion$Target$$ta2.annotations) === null || _defintion$Target$$ta3 === void 0 ? void 0 : (_defintion$Target$$ta4 = _defintion$Target$$ta3.Common) === null || _defintion$Target$$ta4 === void 0 ? void 0 : _defintion$Target$$ta4.Label
        });
        break;

      case FeFacetType.Contact:
        myFacet = _objectSpread({}, myFacet, {}, {
          text: "For Contacts Fragment"
        });
        break;

      case FeFacetType.Chart:
        myFacet = _objectSpread({}, myFacet, {}, {
          text: "For Chart Fragment"
        });
        break;
    }

    return myFacet;
  };

  var getActionsFromSubSection = function (context, oMetaModelContext, facetDefinition) {
    var entityType = context.entityType;
    var actions = [];

    var _addActions = function (_facetDefinition) {
      var buttons = getButtonsFromReferenceFacet(entityType, oMetaModelContext, _facetDefinition);

      if (buttons.length > 0) {
        actions = actions.concat(buttons);
      }
    };

    if (facetDefinition.$Type === "com.sap.vocabularies.UI.v1.CollectionFacet" && facetDefinition.Facets) {
      facetDefinition.Facets.forEach(function (nestedFacetDefinition) {
        _addActions(nestedFacetDefinition);
      });
    } else {
      _addActions(facetDefinition);
    }

    return actions;
  };

  var getBindingExpression = function (annotationValue, currentContext, defaultValue) {
    if (!annotationValue) {
      return defaultValue;
    } else if (isPathExpression(annotationValue)) {
      return AnnotationHelper.format({
        $Path: annotationValue.path
      }, {
        context: currentContext
      });
    } else {
      return AnnotationHelper.format(annotationValue, {
        context: currentContext
      });
    }
  };

  var getButtonsFromReferenceFacet = function (entityType, oMetaModelContext, facetDefinition) {
    var buttonFacet = facetDefinition;
    var targetAnnotationPath = buttonFacet.Target.value;
    var buttons = [];

    if (targetAnnotationPath && /.*com\.sap\.vocabularies\.UI\.v1\.(Identification#|FieldGroup|StatusInfo).*/.test(targetAnnotationPath)) {
      var targetAnnotation = buttonFacet.Target.$target;

      if (targetAnnotation) {
        var collection = targetAnnotation.Data ? targetAnnotation.Data : targetAnnotation;
        collection.forEach(function (field) {
          if (field.$Type === "com.sap.vocabularies.UI.v1.DataFieldForIntentBasedNavigation") {
            buttons.push({
              id: StableIdHelper.generate(["fe", "Form", {
                Facet: buttonFacet
              }, field]),
              type: ActionType.DataFieldForIntentBasedNavigation,
              text: field.Label,
              visible: field.RequiresContext ? "true" : "{= ${localUI>/IBNActions/" + field.SemanticObject + "-" + field.Action + "} === undefined ? false : ${localUI>/IBNActions/" + field.SemanticObject + "-" + field.Action + "} }",
              press: ".handlers.onDataFieldForIntentBasedNavigation($controller, '" + field.SemanticObject + "','" + field.Action + "', '" + JSON.stringify(field.Mapping) + "', undefined ," + field.RequiresContext + ")"
            });
          } else if (field.$Type === "com.sap.vocabularies.UI.v1.DataFieldForAction") {
            var _field$annotations, _field$annotations$UI, _field$annotations$UI2;

            var action = entityType.actions[field.Action];
            var HiddenPath = (_field$annotations = field.annotations) === null || _field$annotations === void 0 ? void 0 : (_field$annotations$UI = _field$annotations.UI) === null || _field$annotations$UI === void 0 ? void 0 : (_field$annotations$UI2 = _field$annotations$UI.Hidden) === null || _field$annotations$UI2 === void 0 ? void 0 : _field$annotations$UI2.path;

            var _getEnabledBinding = function () {
              var _action$annotations, _action$annotations$C;

              if (action.isBound !== true) {
                return "true";
              }

              var operationAvailable = (_action$annotations = action.annotations) === null || _action$annotations === void 0 ? void 0 : (_action$annotations$C = _action$annotations.Core) === null || _action$annotations$C === void 0 ? void 0 : _action$annotations$C.OperationAvailable;

              if (operationAvailable) {
                var bindingExpression = getBindingExpression(operationAvailable, oMetaModelContext);

                if (bindingExpression) {
                  var _action$parameters, _action$parameters$;

                  /**
                   * Action Parameter is ignored by the formatter when trigger by templating
                   * here it's done manually
                   **/
                  var paramSuffix = (_action$parameters = action.parameters) === null || _action$parameters === void 0 ? void 0 : (_action$parameters$ = _action$parameters[0]) === null || _action$parameters$ === void 0 ? void 0 : _action$parameters$.fullyQualifiedName;

                  if (paramSuffix) {
                    paramSuffix = paramSuffix.replace(action.fullyQualifiedName + "/", "");
                    bindingExpression = bindingExpression.replace(paramSuffix + "/", "");
                  }

                  return bindingExpression;
                }

                return "true";
              }

              return "true";
              /*
                 FIXME Disable failing music tests
              	Due to limitation on CAP the following binding (which is the good one) generates error:
              			   return "{= !${#" + field.Action + "} ? false : true }";
              	CAP tries to read the action as property and doesn't find it
              */
            };

            buttons.push({
              id: StableIdHelper.generate(["fe", "Form", {
                Facet: buttonFacet
              }, field]),
              enabled: _getEnabledBinding(),
              type: ActionType.DataFieldForAction,
              text: field.Label,
              visible: HiddenPath ? "{= !%{" + HiddenPath + "}}" : "true",
              press: ".editFlow.onCallAction('" + field.Action + "', { contexts: ${$view>/#fe::ObjectPage/}.getBindingContext(), invocationGrouping : '" + (field.InvocationGrouping === "UI.OperationGroupingType/ChangeSet" ? "ChangeSet" : "Isolated") + "', label: '" + field.Label + "', model: ${$source>/}.getModel()})"
            });
          }
        });
      }
    }

    return buttons;
  };

  var getFacetID = function (stableIdParts, facetDefinition, currentTarget) {
    var idParts = stableIdParts.concat();

    if (facetDefinition.ID) {
      idParts.push(facetDefinition.ID);
    } else {
      switch (facetDefinition.$Type) {
        case "com.sap.vocabularies.UI.v1.ReferenceURLFacet":
          idParts.push(currentTarget);
          break;

        case "com.sap.vocabularies.UI.v1.ReferenceFacet":
          idParts.push(facetDefinition.Target.value);
          break;

        case "com.sap.vocabularies.UI.v1.CollectionFacet":
          idParts.push(currentTarget);
          break;
      }
    }

    return StableIdHelper.generate(idParts);
  };

  var getFacetRefKey = function (facetDefinition, fallback) {
    var _facetDefinition$ID, _facetDefinition$Labe;

    return ((_facetDefinition$ID = facetDefinition.ID) === null || _facetDefinition$ID === void 0 ? void 0 : _facetDefinition$ID.toString()) || ((_facetDefinition$Labe = facetDefinition.Label) === null || _facetDefinition$Labe === void 0 ? void 0 : _facetDefinition$Labe.toString()) || fallback;
  };

  var getFacetsFromSubSection = function (context, subSectionFacetDefinition, currentTarget) {
    var entityType = context.entityType;

    var _getFinalFacets = function (finalCurrentTarget, finalFacetDefinition) {
      var _finalFacetDefinition, _finalFacetDefinition2;

      var finalFacet = [];

      if (((_finalFacetDefinition = finalFacetDefinition.annotations) === null || _finalFacetDefinition === void 0 ? void 0 : (_finalFacetDefinition2 = _finalFacetDefinition.UI) === null || _finalFacetDefinition2 === void 0 ? void 0 : _finalFacetDefinition2.Hidden) !== true) {
        switch (finalFacetDefinition.$Type) {
          case "com.sap.vocabularies.UI.v1.CollectionFacet":
            finalFacet.push(createFacet(context, "".concat(finalCurrentTarget), FeFacetType.Form, finalFacetDefinition, subSectionFacetDefinition));
            break;

          case "com.sap.vocabularies.UI.v1.ReferenceFacet":
            var annotationtionPath = finalFacetDefinition.Target.value;
            var oAnnotation = entityType.resolvePath(annotationtionPath);

            if (isFacetFormCompliant(finalFacetDefinition)) {
              finalFacet.push(createFacet(context, finalCurrentTarget, FeFacetType.Form, finalFacetDefinition, subSectionFacetDefinition));
            } else {
              var isPresentation = oAnnotation !== undefined && /.*com\.sap\.vocabularies\.UI\.v1\.(LineItem|Presentation).*/.test(annotationtionPath);

              if (isPresentation) {
                finalFacet.push(createFacet(context, finalCurrentTarget, FeFacetType.Table, finalFacetDefinition));
              } else if (annotationtionPath.indexOf("com.sap.vocabularies.Communication.v1.Contact") > -1) {
                finalFacet.push(createFacet(context, finalCurrentTarget, FeFacetType.Contact, finalFacetDefinition));
              } else if (annotationtionPath.indexOf("com.sap.vocabularies.Communication.v1.Chart") > -1) {
                finalFacet.push(createFacet(context, finalCurrentTarget, FeFacetType.Chart, finalFacetDefinition));
              }
            }

            break;

          case "com.sap.vocabularies.UI.v1.ReferenceURLFacet":
            //Not currently managed
            break;
        }
      }

      return finalFacet;
    };

    if (subSectionFacetDefinition.$Type === "com.sap.vocabularies.UI.v1.CollectionFacet" && !subSectionFacetDefinition.Facets.every(isFacetFormCompliant)) {
      var facets = [];
      subSectionFacetDefinition.Facets.forEach(function (nestedFacetDefinition, nestedFacetIndex) {
        facets = facets.concat(_getFinalFacets("".concat(currentTarget, "/Facets/").concat(nestedFacetIndex), nestedFacetDefinition));
      });
      return facets;
    } else {
      return _getFinalFacets(currentTarget, subSectionFacetDefinition);
    }
  };

  var getHeaderSubSectionFacets = function (context, facetDefinition, currentTarget) {
    var facets = [];

    var _addFacet = function (finalFacetDefinition, finalCurrentTarget, finalParentFacetDefinition) {
      var _finalFacetDefinition3, _finalFacetDefinition4;

      if (((_finalFacetDefinition3 = finalFacetDefinition.annotations) === null || _finalFacetDefinition3 === void 0 ? void 0 : (_finalFacetDefinition4 = _finalFacetDefinition3.UI) === null || _finalFacetDefinition4 === void 0 ? void 0 : _finalFacetDefinition4.Hidden) !== true) {
        var feFacetType = finalFacetDefinition.Target.$target.$Type === "com.sap.vocabularies.Communication.v1.ContactType" ? FeFacetType.HeaderContact : FeFacetType.Form;
        facets.push(createFacet(context, finalCurrentTarget, feFacetType, finalFacetDefinition, finalParentFacetDefinition));
      }
    };

    if (facetDefinition.Facets) {
      var _Facets;

      (_Facets = facetDefinition.Facets) === null || _Facets === void 0 ? void 0 : _Facets.forEach(function (nestedFacetDefinition, nestedFacetIndex) {
        _addFacet(nestedFacetDefinition, "".concat(currentTarget, "/Facets/").concat(nestedFacetIndex), facetDefinition);
      });
    } else {
      _addFacet(facetDefinition, currentTarget);
    }

    return facets;
  };

  var getInverseBindingExpression = function (annotationValue, currentContext, defaultValue) {
    if (!annotationValue) {
      return defaultValue;
    }

    var bindingExpression = getBindingExpression(annotationValue, currentContext, defaultValue);
    return "{= !$".concat(bindingExpression, "}");
  };

  var getSection = function (context, facetDefinition, oMetaModelContext, stableIdParts, currentTarget) {
    var _facetDefinition$anno, _facetDefinition$anno2;

    var section = {
      id: getFacetID(stableIdParts, facetDefinition, currentTarget),
      title: getBindingExpression(facetDefinition.Label, oMetaModelContext),
      visible: getInverseBindingExpression((_facetDefinition$anno = facetDefinition.annotations) === null || _facetDefinition$anno === void 0 ? void 0 : (_facetDefinition$anno2 = _facetDefinition$anno.UI) === null || _facetDefinition$anno2 === void 0 ? void 0 : _facetDefinition$anno2.Hidden, oMetaModelContext, true),
      subSections: {},
      facetType: facetDefinition.$Type,
      type: SectionType.Annotation
    };
    section.showTitle = section.title !== undefined;

    var _getSubSection = function (subSectionFacetDefinition, subSectionTarget, subSectionTitle, ParentSection) {
      var idPart = "FacetSubSection";
      var commonsubSection = {
        type: SectionType.Annotation,
        visible: ParentSection.visible
      };
      var allFacets = getFacetsFromSubSection(context, subSectionFacetDefinition, subSectionTarget);
      return _objectSpread({}, {
        title: subSectionTitle,
        id: getFacetID(["fe", idPart], subSectionFacetDefinition, subSectionTarget),
        facets: allFacets,
        moreFacets: allFacets.filter(function (facetDefinition) {
          return facetDefinition.type === "Form" && facetDefinition.hasFacetsNotPartOfPreview;
        }),
        actions: getActionsFromSubSection(context, oMetaModelContext, subSectionFacetDefinition)
      }, {}, commonsubSection);
    };

    if (facetDefinition.$Type === "com.sap.vocabularies.UI.v1.CollectionFacet" && facetDefinition.Facets.find(function (facetDefinition) {
      return facetDefinition.$Type === "com.sap.vocabularies.UI.v1.CollectionFacet";
    })) {
      // We have a Collection of Collection
      var sectionKey, subSection;
      facetDefinition.Facets.forEach(function (subFacetDefinition, subFacetIndex) {
        subSection = _getSubSection(subFacetDefinition, "".concat(currentTarget, "/Facets/").concat(subFacetIndex), getBindingExpression(subFacetDefinition.Label, oMetaModelContext), section);

        if (sectionKey !== undefined) {
          subSection.position = {
            anchor: sectionKey,
            placement: Placement.After
          };
        }

        sectionKey = getFacetRefKey(subFacetDefinition, subFacetIndex.toString());
        section.subSections[sectionKey] = subSection;
      });
    } else {
      section.subSections[getFacetRefKey(facetDefinition, getFacetID(["fe", "Section"], facetDefinition, currentTarget))] = _getSubSection(facetDefinition, currentTarget, section.title, section);
    }

    return section;
  };

  var isFacetFormCompliant = function (facet) {
    return facet.Target && /.*com\.sap\.vocabularies\.UI\.v1\.(FieldGroup|Identification|DataPoint|StatusInfo).*/.test(facet.Target.value);
  };

  var isPathExpression = function (expression) {
    return expression.type !== undefined && expression.type === "Path";
  };

  var prepareSection = function (section, key) {
    if (!section) {
      throw new Error("undefined section");
    }

    if (section.visible === undefined || section.visible === null) {
      section.visible = true;
    }

    section.showTitle = section.title !== undefined;

    if (!section.type) {
      section.type = SectionType.Default;
    }

    if ((section.type === SectionType.XMLFragment || section.type === SectionType.Default) && (!section.subSections || !Object.keys(section.subSections).length)) {
      section.subSections = {
        "default": _objectSpread({}, section, {}, {
          visible: true,
          showTitle: false,
          position: undefined,
          id: StableIdHelper.generate(["fe", "CustomSubSection", key])
        })
      };
    }

    return section;
  };

  return {
    convertPage: function (entitySet, oMetaModelContext, oManifestSettings, unaliasFn) {
      var _entityType$annotatio4, _entityType$annotatio5, _entityType$annotatio6;

      var sections = {};
      var entityType = entitySet.entityTypeInstance;
      var context = {
        entitySet: entitySet,
        entityType: entityType,
        manifestSettings: oManifestSettings
      };
      var optionalKey = {};
      var sectionKey;
      var Headerfacets = [];

      if (oManifestSettings.editableHeaderContent) {
        var _entityType$annotatio, _entityType$annotatio2, _entityType$annotatio3;

        (_entityType$annotatio = entityType.annotations) === null || _entityType$annotatio === void 0 ? void 0 : (_entityType$annotatio2 = _entityType$annotatio.UI) === null || _entityType$annotatio2 === void 0 ? void 0 : (_entityType$annotatio3 = _entityType$annotatio2.HeaderFacets) === null || _entityType$annotatio3 === void 0 ? void 0 : _entityType$annotatio3.forEach(function (facetDefinition, facetIndex) {
          var newFacets = getHeaderSubSectionFacets(context, facetDefinition, "".concat(unaliasFn("UI.HeaderFacets"), "/").concat(facetIndex));

          if (newFacets.length > 0) {
            Headerfacets = Headerfacets.concat(newFacets);
          }
        });

        if (Headerfacets.length > 0) {
          optionalKey.headerSection = {
            subSection: {
              facets: Headerfacets
            }
          };
        }
      }

      (_entityType$annotatio4 = entityType.annotations) === null || _entityType$annotatio4 === void 0 ? void 0 : (_entityType$annotatio5 = _entityType$annotatio4.UI) === null || _entityType$annotatio5 === void 0 ? void 0 : (_entityType$annotatio6 = _entityType$annotatio5.Facets) === null || _entityType$annotatio6 === void 0 ? void 0 : _entityType$annotatio6.forEach(function (facetDefinition, facetIndex) {
        var section = getSection(context, facetDefinition, oMetaModelContext, ["fe", "FacetSection"], "".concat(unaliasFn("UI.Facets"), "/").concat(facetIndex));

        if (sectionKey != null) {
          section.position = {
            anchor: sectionKey,
            placement: Placement.After
          };
        }

        sectionKey = getFacetRefKey(facetDefinition, facetIndex.toString());
        sections[sectionKey] = section;
      });

      for (var key in (_oManifestSettings$co = oManifestSettings.content) === null || _oManifestSettings$co === void 0 ? void 0 : (_oManifestSettings$co2 = _oManifestSettings$co.body) === null || _oManifestSettings$co2 === void 0 ? void 0 : _oManifestSettings$co2.sections) {
        var _oManifestSettings$co, _oManifestSettings$co2, _oManifestSettings$co3, _oManifestSettings$co4;

        var customSection = (_oManifestSettings$co3 = oManifestSettings.content) === null || _oManifestSettings$co3 === void 0 ? void 0 : (_oManifestSettings$co4 = _oManifestSettings$co3.body) === null || _oManifestSettings$co4 === void 0 ? void 0 : _oManifestSettings$co4.sections[key];
        sections[key] = prepareSection(_objectSpread({}, {
          id: StableIdHelper.generate(["fe", "CustomSection", key])
        }, {}, sections[key], {}, customSection), key);
      } // the "final" structure is different, e.g. resolve before/after ordering into arrays
      // TODO the final transform mechanism from the human readable form to "template ready" should happen at the very end, not here


      var parsedSections = ConverterUtil.orderByPosition(sections).filter(function (section) {
        return section.visible;
      }).map(function (section) {
        section.subSections = ConverterUtil.orderByPosition(section.subSections);
        return section;
      });
      return _objectSpread({}, {
        sections: parsedSections
      }, {}, optionalKey);
    }
  };
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIk9iamVjdFBhZ2VDb252ZXJ0ZXIudHMiXSwibmFtZXMiOlsiY3JlYXRlRmFjZXQiLCJjb250ZXh0IiwiY3VycmVudFRhcmdldCIsInR5cGUiLCJmYWNldERlZmluaXRpb24iLCJwYXJlbnRGYWNldERlZmluaXRpb24iLCJlbnRpdHlUeXBlIiwib01hbmlmZXN0U2V0dGluZ3MiLCJtYW5pZmVzdFNldHRpbmdzIiwiZW50aXR5UGF0aCIsIm5hbWUiLCJteUZhY2V0IiwiYW5ub3RhdGlvblBhdGgiLCJGZUZhY2V0VHlwZSIsIkZvcm0iLCJpZCIsImdldEZhY2V0SUQiLCJlbnRpdHlTZXQiLCJ1c2VGb3JtQ29udGFpbmVyTGFiZWxzIiwiRmFjZXRzIiwiaGFzRmFjZXRzTm90UGFydE9mUHJldmlldyIsInNvbWUiLCJjaGlsZEZhY2V0IiwiYW5ub3RhdGlvbnMiLCJVSSIsIlBhcnRPZlByZXZpZXciLCJoaWRkZW4iLCJUYWJsZSIsInByZXNlbnRhdGlvbiIsImdldFByZXNlbnRhdGlvbiIsIlRhcmdldCIsInZhbHVlIiwiSGVhZGVyQ29udGFjdCIsImRlZmludGlvbiIsImNvbnRhY3QiLCJ0ZXh0IiwiJHRhcmdldCIsImZuIiwiQ29tbW9uIiwiTGFiZWwiLCJDb250YWN0IiwiQ2hhcnQiLCJnZXRBY3Rpb25zRnJvbVN1YlNlY3Rpb24iLCJvTWV0YU1vZGVsQ29udGV4dCIsImFjdGlvbnMiLCJfYWRkQWN0aW9ucyIsIl9mYWNldERlZmluaXRpb24iLCJidXR0b25zIiwiZ2V0QnV0dG9uc0Zyb21SZWZlcmVuY2VGYWNldCIsImxlbmd0aCIsImNvbmNhdCIsIiRUeXBlIiwiZm9yRWFjaCIsIm5lc3RlZEZhY2V0RGVmaW5pdGlvbiIsImdldEJpbmRpbmdFeHByZXNzaW9uIiwiYW5ub3RhdGlvblZhbHVlIiwiY3VycmVudENvbnRleHQiLCJkZWZhdWx0VmFsdWUiLCJpc1BhdGhFeHByZXNzaW9uIiwiQW5ub3RhdGlvbkhlbHBlciIsImZvcm1hdCIsIiRQYXRoIiwicGF0aCIsImJ1dHRvbkZhY2V0IiwidGFyZ2V0QW5ub3RhdGlvblBhdGgiLCJ0ZXN0IiwidGFyZ2V0QW5ub3RhdGlvbiIsImNvbGxlY3Rpb24iLCJEYXRhIiwiZmllbGQiLCJwdXNoIiwiU3RhYmxlSWRIZWxwZXIiLCJnZW5lcmF0ZSIsIkZhY2V0IiwiQWN0aW9uVHlwZSIsIkRhdGFGaWVsZEZvckludGVudEJhc2VkTmF2aWdhdGlvbiIsInZpc2libGUiLCJSZXF1aXJlc0NvbnRleHQiLCJTZW1hbnRpY09iamVjdCIsIkFjdGlvbiIsInByZXNzIiwiSlNPTiIsInN0cmluZ2lmeSIsIk1hcHBpbmciLCJhY3Rpb24iLCJIaWRkZW5QYXRoIiwiSGlkZGVuIiwiX2dldEVuYWJsZWRCaW5kaW5nIiwiaXNCb3VuZCIsIm9wZXJhdGlvbkF2YWlsYWJsZSIsIkNvcmUiLCJPcGVyYXRpb25BdmFpbGFibGUiLCJiaW5kaW5nRXhwcmVzc2lvbiIsInBhcmFtU3VmZml4IiwicGFyYW1ldGVycyIsImZ1bGx5UXVhbGlmaWVkTmFtZSIsInJlcGxhY2UiLCJlbmFibGVkIiwiRGF0YUZpZWxkRm9yQWN0aW9uIiwiSW52b2NhdGlvbkdyb3VwaW5nIiwic3RhYmxlSWRQYXJ0cyIsImlkUGFydHMiLCJJRCIsImdldEZhY2V0UmVmS2V5IiwiZmFsbGJhY2siLCJ0b1N0cmluZyIsImdldEZhY2V0c0Zyb21TdWJTZWN0aW9uIiwic3ViU2VjdGlvbkZhY2V0RGVmaW5pdGlvbiIsIl9nZXRGaW5hbEZhY2V0cyIsImZpbmFsQ3VycmVudFRhcmdldCIsImZpbmFsRmFjZXREZWZpbml0aW9uIiwiZmluYWxGYWNldCIsImFubm90YXRpb250aW9uUGF0aCIsIm9Bbm5vdGF0aW9uIiwicmVzb2x2ZVBhdGgiLCJpc0ZhY2V0Rm9ybUNvbXBsaWFudCIsImlzUHJlc2VudGF0aW9uIiwidW5kZWZpbmVkIiwiaW5kZXhPZiIsImV2ZXJ5IiwiZmFjZXRzIiwibmVzdGVkRmFjZXRJbmRleCIsImdldEhlYWRlclN1YlNlY3Rpb25GYWNldHMiLCJfYWRkRmFjZXQiLCJmaW5hbFBhcmVudEZhY2V0RGVmaW5pdGlvbiIsImZlRmFjZXRUeXBlIiwiZ2V0SW52ZXJzZUJpbmRpbmdFeHByZXNzaW9uIiwiZ2V0U2VjdGlvbiIsInNlY3Rpb24iLCJ0aXRsZSIsInN1YlNlY3Rpb25zIiwiZmFjZXRUeXBlIiwiU2VjdGlvblR5cGUiLCJBbm5vdGF0aW9uIiwic2hvd1RpdGxlIiwiX2dldFN1YlNlY3Rpb24iLCJzdWJTZWN0aW9uVGFyZ2V0Iiwic3ViU2VjdGlvblRpdGxlIiwiUGFyZW50U2VjdGlvbiIsImlkUGFydCIsImNvbW1vbnN1YlNlY3Rpb24iLCJhbGxGYWNldHMiLCJtb3JlRmFjZXRzIiwiZmlsdGVyIiwiZmluZCIsInNlY3Rpb25LZXkiLCJzdWJTZWN0aW9uIiwic3ViRmFjZXREZWZpbml0aW9uIiwic3ViRmFjZXRJbmRleCIsInBvc2l0aW9uIiwiYW5jaG9yIiwicGxhY2VtZW50IiwiUGxhY2VtZW50IiwiQWZ0ZXIiLCJmYWNldCIsImV4cHJlc3Npb24iLCJwcmVwYXJlU2VjdGlvbiIsImtleSIsIkVycm9yIiwiRGVmYXVsdCIsIlhNTEZyYWdtZW50IiwiT2JqZWN0Iiwia2V5cyIsImNvbnZlcnRQYWdlIiwidW5hbGlhc0ZuIiwic2VjdGlvbnMiLCJlbnRpdHlUeXBlSW5zdGFuY2UiLCJvcHRpb25hbEtleSIsIkhlYWRlcmZhY2V0cyIsImVkaXRhYmxlSGVhZGVyQ29udGVudCIsIkhlYWRlckZhY2V0cyIsImZhY2V0SW5kZXgiLCJuZXdGYWNldHMiLCJoZWFkZXJTZWN0aW9uIiwiY29udGVudCIsImJvZHkiLCJjdXN0b21TZWN0aW9uIiwicGFyc2VkU2VjdGlvbnMiLCJDb252ZXJ0ZXJVdGlsIiwib3JkZXJCeVBvc2l0aW9uIiwibWFwIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7QUE0Q0EsTUFBTUEsV0FBVyxHQUFHLFVBQ25CQyxPQURtQixFQUVuQkMsYUFGbUIsRUFHbkJDLElBSG1CLEVBSW5CQyxlQUptQixFQUtuQkMscUJBTG1CLEVBTVI7QUFB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LENBQy9CLFVBQUFmLE9BQU87QUFBQSxlQUFJQSxPQUFPLENBQUNwRCxPQUFaO0FBQUEsT0FEd0IsRUFFdEN3RyxHQUZzQyxDQUVsQyxVQUFBcEQsT0FBTyxFQUFJO0FBQ2JBLFFBQUFBLE9BQUYsQ0FBa0NFLFdBQWxDLEdBQWdEZ0QsYUFBYSxDQUFDQyxlQUFkLENBQThCbkQsT0FBTyxDQUFDRSxXQUF0QyxDQUFoRDtBQUNBLGVBQU9GLE9BQVA7QUFDQSxPQUxzQyxDQUF4QztBQU9BLCtCQUFZO0FBQUVxQyxRQUFBQSxRQUFRLEVBQUVZO0FBQVosT0FBWixNQUE2Q1YsV0FBN0M7QUFDQTtBQWxFYSxHIiwic291cmNlUm9vdCI6Ii4iLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuXHRBbm5vdGF0aW9uVGVybSxcblx0QXBwbHlBbm5vdGF0aW9uRXhwcmVzc2lvbixcblx0Q29sbGVjdGlvbkZhY2V0LFxuXHRFbnRpdHlTZXQsXG5cdEVudGl0eVR5cGUsXG5cdEZhY2V0VHlwZXMsXG5cdEZpZWxkR3JvdXAsXG5cdFBhdGhBbm5vdGF0aW9uRXhwcmVzc2lvbixcblx0UmVmZXJlbmNlRmFjZXRcbn0gZnJvbSBcIkBzYXAtdXgvdm9jYWJ1bGFyaWVzLXR5cGVzXCI7XG5pbXBvcnQgeyBTdGFibGVJZEhlbHBlciB9IGZyb20gXCJzYXAvZmUvY29yZS9oZWxwZXJzXCI7XG5pbXBvcnQgeyBBbm5vdGF0aW9uSGVscGVyLCBDb250ZXh0IH0gZnJvbSBcInNhcC91aS9tb2RlbC9vZGF0YS92NFwiO1xuaW1wb3J0IHtcblx0QmFzZVN1YlNlY3Rpb24sXG5cdEJpbmRpbmdFeHByZXNzaW9uLFxuXHRDaGFydEZhY2V0LFxuXHRDb250YWN0RmFjZXQsXG5cdERhdGFGaWVsZEZvckFjdGlvbixcblx0RGF0YUZpZWxkRm9ySW50ZW50QmFzZWROYXZpZ2F0aW9uQWN0aW9uLFxuXHRGYWNldCxcblx0RmVGYWNldFR5cGUsXG5cdEZvcm1GYWNldCxcblx0TWFuaWZlc3RTZWN0aW9uLFxuXHRPYmplY3RQYWdlTWFuaWZlc3RTZXR0aW5ncyxcblx0UGFnZUNvbnZlcnRlckNvbnRleHQsXG5cdFBsYWNlbWVudCxcblx0U2VjdGlvbixcblx0U2VjdGlvblR5cGUsXG5cdFN1YlNlY3Rpb24sXG5cdFN1YlNlY3Rpb25BY3Rpb24sXG5cdEFjdGlvblR5cGUsXG5cdFRhYmxlRmFjZXRcbn0gZnJvbSBcIi4uL01hbmlmZXN0U2V0dGluZ3NcIjtcbmltcG9ydCB7IGdldFByZXNlbnRhdGlvbiB9IGZyb20gXCIuLi9jb250cm9scy9QcmVzZW50YXRpb25Db252ZXJ0ZXJcIjtcbmltcG9ydCBDb252ZXJ0ZXJVdGlsIGZyb20gXCIuLi9Db252ZXJ0ZXJVdGlsXCI7XG5cbnR5cGUgT2JqZWN0UGFnZURlZmluaXRpb24gPSB7XG5cdGhlYWRlclNlY3Rpb246IHtcblx0XHRzdWJTZWN0aW9uOiBCYXNlU3ViU2VjdGlvbjtcblx0fTtcblx0c2VjdGlvbnM/OiBNYW5pZmVzdFNlY3Rpb25bXTtcbn07XG5cbmNvbnN0IGNyZWF0ZUZhY2V0ID0gKFxuXHRjb250ZXh0OiBQYWdlQ29udmVydGVyQ29udGV4dCxcblx0Y3VycmVudFRhcmdldDogc3RyaW5nLFxuXHR0eXBlOiBGZUZhY2V0VHlwZSxcblx0ZmFjZXREZWZpbml0aW9uOiBGYWNldFR5cGVzLFxuXHRwYXJlbnRGYWNldERlZmluaXRpb24/OiBGYWNldFR5cGVzXG4pOiBGYWNldCA9PiB7XG5cdGNvbnN0IHsgZW50aXR5VHlwZSwgbWFuaWZlc3RTZXR0aW5nczogb01hbmlmZXN0U2V0dGluZ3MgfSA9IGNvbnRleHQ7XG5cdHZhciBlbnRpdHlQYXRoID0gXCIvXCIgKyBlbnRpdHlUeXBlLm5hbWUsXG5cdFx0bXlGYWNldDogRmFjZXQgPSB7IHR5cGU6IHR5cGUsIGFubm90YXRpb25QYXRoOiBlbnRpdHlQYXRoICsgXCIvQFwiICsgY3VycmVudFRhcmdldCB9IGFzIEZhY2V0O1xuXHRzd2l0Y2ggKHR5cGUpIHtcblx0XHRjYXNlIEZlRmFjZXRUeXBlLkZvcm06XG5cdFx0XHRteUZhY2V0ID0ge1xuXHRcdFx0XHQuLi5teUZhY2V0LFxuXHRcdFx0XHQuLi57XG5cdFx0XHRcdFx0aWQ6IGdldEZhY2V0SUQoW10sIGZhY2V0RGVmaW5pdGlvbiwgY3VycmVudFRhcmdldCksXG5cdFx0XHRcdFx0ZW50aXR5U2V0OiBcIi9cIiArIGVudGl0eVR5cGUubmFtZSxcblx0XHRcdFx0XHR1c2VGb3JtQ29udGFpbmVyTGFiZWxzOiAhIShwYXJlbnRGYWNldERlZmluaXRpb24gJiYgKHBhcmVudEZhY2V0RGVmaW5pdGlvbiBhcyBDb2xsZWN0aW9uRmFjZXQpLkZhY2V0cyksXG5cdFx0XHRcdFx0aGFzRmFjZXRzTm90UGFydE9mUHJldmlldzpcblx0XHRcdFx0XHRcdHBhcmVudEZhY2V0RGVmaW5pdGlvbiAmJiAocGFyZW50RmFjZXREZWZpbml0aW9uIGFzIENvbGxlY3Rpb25GYWNldCkuRmFjZXRzXG5cdFx0XHRcdFx0XHRcdD8gKHBhcmVudEZhY2V0RGVmaW5pdGlvbiBhcyBDb2xsZWN0aW9uRmFjZXQpLkZhY2V0cy5zb21lKFxuXHRcdFx0XHRcdFx0XHRcdFx0Y2hpbGRGYWNldCA9PiBjaGlsZEZhY2V0LmFubm90YXRpb25zPy5VST8uUGFydE9mUHJldmlldyA9PT0gZmFsc2Vcblx0XHRcdFx0XHRcdFx0ICApXG5cdFx0XHRcdFx0XHRcdDogZmFsc2UsXG5cdFx0XHRcdFx0aGlkZGVuOiBmYWxzZVxuXHRcdFx0XHR9XG5cdFx0XHR9IGFzIEZvcm1GYWNldDtcblx0XHRcdGJyZWFrO1xuXHRcdGNhc2UgRmVGYWNldFR5cGUuVGFibGU6XG5cdFx0XHRteUZhY2V0ID0ge1xuXHRcdFx0XHQuLi5teUZhY2V0LFxuXHRcdFx0XHQuLi57XG5cdFx0XHRcdFx0cHJlc2VudGF0aW9uOiBnZXRQcmVzZW50YXRpb24oY29udGV4dCwgKGZhY2V0RGVmaW5pdGlvbiBhcyBSZWZlcmVuY2VGYWNldCkuVGFyZ2V0LnZhbHVlKVxuXHRcdFx0XHR9XG5cdFx0XHR9IGFzIFRhYmxlRmFjZXQ7XG5cdFx0XHRicmVhaztcblx0XHRjYXNlIEZlRmFjZXRUeXBlLkhlYWRlckNvbnRhY3Q6XG5cdFx0XHRjb25zdCBkZWZpbnRpb246IFJlZmVyZW5jZUZhY2V0ID0gZmFjZXREZWZpbml0aW9uIGFzIFJlZmVyZW5jZUZhY2V0O1xuXHRcdFx0bXlGYWNldCA9IHtcblx0XHRcdFx0Li4ubXlGYWNldCxcblx0XHRcdFx0Li4ue1xuXHRcdFx0XHRcdGNvbnRhY3Q6IG15RmFjZXQuYW5ub3RhdGlvblBhdGggKyBcIi9UYXJnZXQvJEFubm90YXRpb25QYXRoXCIsXG5cdFx0XHRcdFx0dGV4dDogZGVmaW50aW9uLlRhcmdldC4kdGFyZ2V0LmZuPy4kdGFyZ2V0Py5hbm5vdGF0aW9ucz8uQ29tbW9uPy5MYWJlbFxuXHRcdFx0XHR9XG5cdFx0XHR9IGFzIENvbnRhY3RGYWNldDtcblx0XHRcdGJyZWFrO1xuXHRcdGNhc2UgRmVGYWNldFR5cGUuQ29udGFjdDpcblx0XHRcdG15RmFjZXQgPSB7XG5cdFx0XHRcdC4uLm15RmFjZXQsXG5cdFx0XHRcdC4uLntcblx0XHRcdFx0XHR0ZXh0OiBcIkZvciBDb250YWN0cyBGcmFnbWVudFwiXG5cdFx0XHRcdH1cblx0XHRcdH0gYXMgQ29udGFjdEZhY2V0O1xuXHRcdFx0YnJlYWs7XG5cdFx0Y2FzZSBGZUZhY2V0VHlwZS5DaGFydDpcblx0XHRcdG15RmFjZXQgPSB7XG5cdFx0XHRcdC4uLm15RmFjZXQsXG5cdFx0XHRcdC4uLntcblx0XHRcdFx0XHR0ZXh0OiBcIkZvciBDaGFydCBGcmFnbWVudFwiXG5cdFx0XHRcdH1cblx0XHRcdH0gYXMgQ2hhcnRGYWNldDtcblx0XHRcdGJyZWFrO1xuXHR9XG5cdHJldHVybiBteUZhY2V0O1xufTtcblxuY29uc3QgZ2V0QWN0aW9uc0Zyb21TdWJTZWN0aW9uID0gKFxuXHRjb250ZXh0OiBQYWdlQ29udmVydGVyQ29udGV4dCxcblx0b01ldGFNb2RlbENvbnRleHQ6IENvbnRleHQsXG5cdGZhY2V0RGVmaW5pdGlvbjogRmFjZXRUeXBlc1xuKTogU3ViU2VjdGlvbkFjdGlvbltdID0+IHtcblx0Y29uc3QgeyBlbnRpdHlUeXBlIH0gPSBjb250ZXh0O1xuXHR2YXIgYWN0aW9uczogU3ViU2VjdGlvbkFjdGlvbltdID0gW107XG5cdGNvbnN0IF9hZGRBY3Rpb25zID0gKF9mYWNldERlZmluaXRpb246IEZhY2V0VHlwZXMpID0+IHtcblx0XHRjb25zdCBidXR0b25zID0gZ2V0QnV0dG9uc0Zyb21SZWZlcmVuY2VGYWNldChlbnRpdHlUeXBlLCBvTWV0YU1vZGVsQ29udGV4dCwgX2ZhY2V0RGVmaW5pdGlvbik7XG5cdFx0aWYgKGJ1dHRvbnMubGVuZ3RoID4gMCkge1xuXHRcdFx0YWN0aW9ucyA9IGFjdGlvbnMuY29uY2F0KGJ1dHRvbnMpO1xuXHRcdH1cblx0fTtcblx0aWYgKGZhY2V0RGVmaW5pdGlvbi4kVHlwZSA9PT0gXCJjb20uc2FwLnZvY2FidWxhcmllcy5VSS52MS5Db2xsZWN0aW9uRmFjZXRcIiAmJiBmYWNldERlZmluaXRpb24uRmFjZXRzKSB7XG5cdFx0ZmFjZXREZWZpbml0aW9uLkZhY2V0cy5mb3JFYWNoKChuZXN0ZWRGYWNldERlZmluaXRpb246IEZhY2V0VHlwZXMpID0+IHtcblx0XHRcdF9hZGRBY3Rpb25zKG5lc3RlZEZhY2V0RGVmaW5pdGlvbik7XG5cdFx0fSk7XG5cdH0gZWxzZSB7XG5cdFx0X2FkZEFjdGlvbnMoZmFjZXREZWZpbml0aW9uKTtcblx0fVxuXHRyZXR1cm4gYWN0aW9ucztcbn07XG5cbmNvbnN0IGdldEJpbmRpbmdFeHByZXNzaW9uID0gZnVuY3Rpb248VD4oXG5cdGFubm90YXRpb25WYWx1ZTogVCB8IFBhdGhBbm5vdGF0aW9uRXhwcmVzc2lvbjxUPiB8IEFwcGx5QW5ub3RhdGlvbkV4cHJlc3Npb248VD4gfCB1bmRlZmluZWQsXG5cdGN1cnJlbnRDb250ZXh0OiBDb250ZXh0LFxuXHRkZWZhdWx0VmFsdWU/OiBUXG4pOiBCaW5kaW5nRXhwcmVzc2lvbjxUPiB7XG5cdGlmICghYW5ub3RhdGlvblZhbHVlKSB7XG5cdFx0cmV0dXJuIGRlZmF1bHRWYWx1ZTtcblx0fSBlbHNlIGlmIChpc1BhdGhFeHByZXNzaW9uKGFubm90YXRpb25WYWx1ZSkpIHtcblx0XHRyZXR1cm4gQW5ub3RhdGlvbkhlbHBlci5mb3JtYXQoeyAkUGF0aDogYW5ub3RhdGlvblZhbHVlLnBhdGggfSwgeyBjb250ZXh0OiBjdXJyZW50Q29udGV4dCB9KTtcblx0fSBlbHNlIHtcblx0XHRyZXR1cm4gQW5ub3RhdGlvbkhlbHBlci5mb3JtYXQoYW5ub3RhdGlvblZhbHVlLCB7IGNvbnRleHQ6IGN1cnJlbnRDb250ZXh0IH0pO1xuXHR9XG59O1xuXG5jb25zdCBnZXRCdXR0b25zRnJvbVJlZmVyZW5jZUZhY2V0ID0gKFxuXHRlbnRpdHlUeXBlOiBSZXF1aXJlZDxFbnRpdHlUeXBlPixcblx0b01ldGFNb2RlbENvbnRleHQ6IENvbnRleHQsXG5cdGZhY2V0RGVmaW5pdGlvbjogRmFjZXRUeXBlc1xuKTogU3ViU2VjdGlvbkFjdGlvbltdID0+IHtcblx0dmFyIGJ1dHRvbkZhY2V0ID0gZmFjZXREZWZpbml0aW9uIGFzIFJlZmVyZW5jZUZhY2V0O1xuXHR2YXIgdGFyZ2V0QW5ub3RhdGlvblBhdGggPSBidXR0b25GYWNldC5UYXJnZXQudmFsdWU7XG5cdGNvbnN0IGJ1dHRvbnM6IFN1YlNlY3Rpb25BY3Rpb25bXSA9IFtdO1xuXHRpZiAodGFyZ2V0QW5ub3RhdGlvblBhdGggJiYgLy4qY29tXFwuc2FwXFwudm9jYWJ1bGFyaWVzXFwuVUlcXC52MVxcLihJZGVudGlmaWNhdGlvbiN8RmllbGRHcm91cHxTdGF0dXNJbmZvKS4qLy50ZXN0KHRhcmdldEFubm90YXRpb25QYXRoKSkge1xuXHRcdGNvbnN0IHRhcmdldEFubm90YXRpb246IGFueSA9IGJ1dHRvbkZhY2V0LlRhcmdldC4kdGFyZ2V0O1xuXHRcdGlmICh0YXJnZXRBbm5vdGF0aW9uKSB7XG5cdFx0XHRjb25zdCBjb2xsZWN0aW9uID0gKHRhcmdldEFubm90YXRpb24gYXMgRmllbGRHcm91cCkuRGF0YSA/IHRhcmdldEFubm90YXRpb24uRGF0YSA6IHRhcmdldEFubm90YXRpb247XG5cdFx0XHRjb2xsZWN0aW9uLmZvckVhY2goKGZpZWxkOiBhbnkpID0+IHtcblx0XHRcdFx0aWYgKGZpZWxkLiRUeXBlID09PSBcImNvbS5zYXAudm9jYWJ1bGFyaWVzLlVJLnYxLkRhdGFGaWVsZEZvckludGVudEJhc2VkTmF2aWdhdGlvblwiKSB7XG5cdFx0XHRcdFx0YnV0dG9ucy5wdXNoKHtcblx0XHRcdFx0XHRcdGlkOiBTdGFibGVJZEhlbHBlci5nZW5lcmF0ZShbXCJmZVwiLCBcIkZvcm1cIiwgeyBGYWNldDogYnV0dG9uRmFjZXQgfSwgZmllbGRdKSxcblx0XHRcdFx0XHRcdHR5cGU6IEFjdGlvblR5cGUuRGF0YUZpZWxkRm9ySW50ZW50QmFzZWROYXZpZ2F0aW9uLFxuXHRcdFx0XHRcdFx0dGV4dDogZmllbGQuTGFiZWwsXG5cdFx0XHRcdFx0XHR2aXNpYmxlOiBmaWVsZC5SZXF1aXJlc0NvbnRleHRcblx0XHRcdFx0XHRcdFx0PyBcInRydWVcIlxuXHRcdFx0XHRcdFx0XHQ6IFwiez0gJHtsb2NhbFVJPi9JQk5BY3Rpb25zL1wiICtcblx0XHRcdFx0XHRcdFx0ICBmaWVsZC5TZW1hbnRpY09iamVjdCArXG5cdFx0XHRcdFx0XHRcdCAgXCItXCIgK1xuXHRcdFx0XHRcdFx0XHQgIGZpZWxkLkFjdGlvbiArXG5cdFx0XHRcdFx0XHRcdCAgXCJ9ID09PSB1bmRlZmluZWQgPyBmYWxzZSA6ICR7bG9jYWxVST4vSUJOQWN0aW9ucy9cIiArXG5cdFx0XHRcdFx0XHRcdCAgZmllbGQuU2VtYW50aWNPYmplY3QgK1xuXHRcdFx0XHRcdFx0XHQgIFwiLVwiICtcblx0XHRcdFx0XHRcdFx0ICBmaWVsZC5BY3Rpb24gK1xuXHRcdFx0XHRcdFx0XHQgIFwifSB9XCIsXG5cdFx0XHRcdFx0XHRwcmVzczpcblx0XHRcdFx0XHRcdFx0XCIuaGFuZGxlcnMub25EYXRhRmllbGRGb3JJbnRlbnRCYXNlZE5hdmlnYXRpb24oJGNvbnRyb2xsZXIsICdcIiArXG5cdFx0XHRcdFx0XHRcdGZpZWxkLlNlbWFudGljT2JqZWN0ICtcblx0XHRcdFx0XHRcdFx0XCInLCdcIiArXG5cdFx0XHRcdFx0XHRcdGZpZWxkLkFjdGlvbiArXG5cdFx0XHRcdFx0XHRcdFwiJywgJ1wiICtcblx0XHRcdFx0XHRcdFx0SlNPTi5zdHJpbmdpZnkoZmllbGQuTWFwcGluZykgK1xuXHRcdFx0XHRcdFx0XHRcIicsIHVuZGVmaW5lZCAsXCIgK1xuXHRcdFx0XHRcdFx0XHRmaWVsZC5SZXF1aXJlc0NvbnRleHQgK1xuXHRcdFx0XHRcdFx0XHRcIilcIlxuXHRcdFx0XHRcdH0gYXMgRGF0YUZpZWxkRm9ySW50ZW50QmFzZWROYXZpZ2F0aW9uQWN0aW9uKTtcblx0XHRcdFx0fSBlbHNlIGlmIChmaWVsZC4kVHlwZSA9PT0gXCJjb20uc2FwLnZvY2FidWxhcmllcy5VSS52MS5EYXRhRmllbGRGb3JBY3Rpb25cIikge1xuXHRcdFx0XHRcdGNvbnN0IGFjdGlvbjogYW55ID0gZW50aXR5VHlwZS5hY3Rpb25zW2ZpZWxkLkFjdGlvbl07XG5cdFx0XHRcdFx0Y29uc3QgSGlkZGVuUGF0aDogYW55ID0gZmllbGQuYW5ub3RhdGlvbnM/LlVJPy5IaWRkZW4/LnBhdGg7XG5cdFx0XHRcdFx0dmFyIF9nZXRFbmFibGVkQmluZGluZyA9ICgpOiBzdHJpbmcgPT4ge1xuXHRcdFx0XHRcdFx0aWYgKGFjdGlvbi5pc0JvdW5kICE9PSB0cnVlKSB7XG5cdFx0XHRcdFx0XHRcdHJldHVybiBcInRydWVcIjtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGNvbnN0IG9wZXJhdGlvbkF2YWlsYWJsZSA9IGFjdGlvbi5hbm5vdGF0aW9ucz8uQ29yZT8uT3BlcmF0aW9uQXZhaWxhYmxlO1xuXHRcdFx0XHRcdFx0aWYgKG9wZXJhdGlvbkF2YWlsYWJsZSkge1xuXHRcdFx0XHRcdFx0XHR2YXIgYmluZGluZ0V4cHJlc3Npb24gPSBnZXRCaW5kaW5nRXhwcmVzc2lvbjxzdHJpbmc+KG9wZXJhdGlvbkF2YWlsYWJsZSwgb01ldGFNb2RlbENvbnRleHQpO1xuXHRcdFx0XHRcdFx0XHRpZiAoYmluZGluZ0V4cHJlc3Npb24pIHtcblx0XHRcdFx0XHRcdFx0XHQvKipcblx0XHRcdFx0XHRcdFx0XHQgKiBBY3Rpb24gUGFyYW1ldGVyIGlzIGlnbm9yZWQgYnkgdGhlIGZvcm1hdHRlciB3aGVuIHRyaWdnZXIgYnkgdGVtcGxhdGluZ1xuXHRcdFx0XHRcdFx0XHRcdCAqIGhlcmUgaXQncyBkb25lIG1hbnVhbGx5XG5cdFx0XHRcdFx0XHRcdFx0ICoqL1xuXHRcdFx0XHRcdFx0XHRcdHZhciBwYXJhbVN1ZmZpeCA9IGFjdGlvbi5wYXJhbWV0ZXJzPy5bMF0/LmZ1bGx5UXVhbGlmaWVkTmFtZTtcblx0XHRcdFx0XHRcdFx0XHRpZiAocGFyYW1TdWZmaXgpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHBhcmFtU3VmZml4ID0gcGFyYW1TdWZmaXgucmVwbGFjZShhY3Rpb24uZnVsbHlRdWFsaWZpZWROYW1lICsgXCIvXCIsIFwiXCIpO1xuXHRcdFx0XHRcdFx0XHRcdFx0YmluZGluZ0V4cHJlc3Npb24gPSBiaW5kaW5nRXhwcmVzc2lvbi5yZXBsYWNlKHBhcmFtU3VmZml4ICsgXCIvXCIsIFwiXCIpO1xuXHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gYmluZGluZ0V4cHJlc3Npb247XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0cmV0dXJuIFwidHJ1ZVwiO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0cmV0dXJuIFwidHJ1ZVwiO1xuXHRcdFx0XHRcdFx0Lypcblx0XHRcdFx0XHRcdCAgIEZJWE1FIERpc2FibGUgZmFpbGluZyBtdXNpYyB0ZXN0c1xuXHRcdFx0XHRcdFx0XHREdWUgdG8gbGltaXRhdGlvbiBvbiBDQVAgdGhlIGZvbGxvd2luZyBiaW5kaW5nICh3aGljaCBpcyB0aGUgZ29vZCBvbmUpIGdlbmVyYXRlcyBlcnJvcjpcblx0XHRcdFx0XHRcdFx0XHRcdCAgIHJldHVybiBcIns9ICEkeyNcIiArIGZpZWxkLkFjdGlvbiArIFwifSA/IGZhbHNlIDogdHJ1ZSB9XCI7XG5cdFx0XHRcdFx0XHRcdENBUCB0cmllcyB0byByZWFkIHRoZSBhY3Rpb24gYXMgcHJvcGVydHkgYW5kIGRvZXNuJ3QgZmluZCBpdFxuXHRcdFx0XHRcdFx0Ki9cblx0XHRcdFx0XHR9O1xuXG5cdFx0XHRcdFx0YnV0dG9ucy5wdXNoKHtcblx0XHRcdFx0XHRcdGlkOiBTdGFibGVJZEhlbHBlci5nZW5lcmF0ZShbXCJmZVwiLCBcIkZvcm1cIiwgeyBGYWNldDogYnV0dG9uRmFjZXQgfSwgZmllbGRdKSxcblx0XHRcdFx0XHRcdGVuYWJsZWQ6IF9nZXRFbmFibGVkQmluZGluZygpLFxuXHRcdFx0XHRcdFx0dHlwZTogQWN0aW9uVHlwZS5EYXRhRmllbGRGb3JBY3Rpb24sXG5cdFx0XHRcdFx0XHR0ZXh0OiBmaWVsZC5MYWJlbCxcblx0XHRcdFx0XHRcdHZpc2libGU6IEhpZGRlblBhdGggPyBcIns9ICEle1wiICsgSGlkZGVuUGF0aCArIFwifX1cIiA6IFwidHJ1ZVwiLFxuXHRcdFx0XHRcdFx0cHJlc3M6XG5cdFx0XHRcdFx0XHRcdFwiLmVkaXRGbG93Lm9uQ2FsbEFjdGlvbignXCIgK1xuXHRcdFx0XHRcdFx0XHRmaWVsZC5BY3Rpb24gK1xuXHRcdFx0XHRcdFx0XHRcIicsIHsgY29udGV4dHM6ICR7JHZpZXc+LyNmZTo6T2JqZWN0UGFnZS99LmdldEJpbmRpbmdDb250ZXh0KCksIGludm9jYXRpb25Hcm91cGluZyA6ICdcIiArXG5cdFx0XHRcdFx0XHRcdChmaWVsZC5JbnZvY2F0aW9uR3JvdXBpbmcgPT09IFwiVUkuT3BlcmF0aW9uR3JvdXBpbmdUeXBlL0NoYW5nZVNldFwiID8gXCJDaGFuZ2VTZXRcIiA6IFwiSXNvbGF0ZWRcIikgK1xuXHRcdFx0XHRcdFx0XHRcIicsIGxhYmVsOiAnXCIgK1xuXHRcdFx0XHRcdFx0XHRmaWVsZC5MYWJlbCArXG5cdFx0XHRcdFx0XHRcdFwiJywgbW9kZWw6ICR7JHNvdXJjZT4vfS5nZXRNb2RlbCgpfSlcIlxuXHRcdFx0XHRcdH0gYXMgRGF0YUZpZWxkRm9yQWN0aW9uKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fVxuXHR9XG5cdHJldHVybiBidXR0b25zO1xufTtcblxuY29uc3QgZ2V0RmFjZXRJRCA9IChzdGFibGVJZFBhcnRzOiBzdHJpbmdbXSwgZmFjZXREZWZpbml0aW9uOiBGYWNldFR5cGVzLCBjdXJyZW50VGFyZ2V0OiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuXHRsZXQgaWRQYXJ0czogc3RyaW5nW10gPSBzdGFibGVJZFBhcnRzLmNvbmNhdCgpO1xuXHRpZiAoZmFjZXREZWZpbml0aW9uLklEKSB7XG5cdFx0aWRQYXJ0cy5wdXNoKGZhY2V0RGVmaW5pdGlvbi5JRCBhcyBzdHJpbmcpO1xuXHR9IGVsc2Uge1xuXHRcdHN3aXRjaCAoZmFjZXREZWZpbml0aW9uLiRUeXBlKSB7XG5cdFx0XHRjYXNlIFwiY29tLnNhcC52b2NhYnVsYXJpZXMuVUkudjEuUmVmZXJlbmNlVVJMRmFjZXRcIjpcblx0XHRcdFx0aWRQYXJ0cy5wdXNoKGN1cnJlbnRUYXJnZXQpO1xuXHRcdFx0XHRicmVhaztcblx0XHRcdGNhc2UgXCJjb20uc2FwLnZvY2FidWxhcmllcy5VSS52MS5SZWZlcmVuY2VGYWNldFwiOlxuXHRcdFx0XHRpZFBhcnRzLnB1c2goZmFjZXREZWZpbml0aW9uLlRhcmdldC52YWx1ZSk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdFx0Y2FzZSBcImNvbS5zYXAudm9jYWJ1bGFyaWVzLlVJLnYxLkNvbGxlY3Rpb25GYWNldFwiOlxuXHRcdFx0XHRpZFBhcnRzLnB1c2goY3VycmVudFRhcmdldCk7XG5cdFx0XHRcdGJyZWFrO1xuXHRcdH1cblx0fVxuXHRyZXR1cm4gU3RhYmxlSWRIZWxwZXIuZ2VuZXJhdGUoaWRQYXJ0cyk7XG59O1xuXG5jb25zdCBnZXRGYWNldFJlZktleSA9IChmYWNldERlZmluaXRpb246IEZhY2V0VHlwZXMsIGZhbGxiYWNrOiBzdHJpbmcpOiBzdHJpbmcgPT4ge1xuXHRyZXR1cm4gZmFjZXREZWZpbml0aW9uLklEPy50b1N0cmluZygpIHx8IGZhY2V0RGVmaW5pdGlvbi5MYWJlbD8udG9TdHJpbmcoKSB8fCBmYWxsYmFjaztcbn07XG5cbmNvbnN0IGdldEZhY2V0c0Zyb21TdWJTZWN0aW9uID0gKGNvbnRleHQ6IFBhZ2VDb252ZXJ0ZXJDb250ZXh0LCBzdWJTZWN0aW9uRmFjZXREZWZpbml0aW9uOiBGYWNldFR5cGVzLCBjdXJyZW50VGFyZ2V0OiBzdHJpbmcpOiBGYWNldFtdID0+IHtcblx0Y29uc3QgeyBlbnRpdHlUeXBlIH0gPSBjb250ZXh0O1xuXHRjb25zdCBfZ2V0RmluYWxGYWNldHMgPSAoZmluYWxDdXJyZW50VGFyZ2V0OiBzdHJpbmcsIGZpbmFsRmFjZXREZWZpbml0aW9uOiBGYWNldFR5cGVzKTogRmFjZXRbXSA9PiB7XG5cdFx0dmFyIGZpbmFsRmFjZXQ6IEZhY2V0W10gPSBbXTtcblx0XHRpZiAoZmluYWxGYWNldERlZmluaXRpb24uYW5ub3RhdGlvbnM/LlVJPy5IaWRkZW4gIT09IHRydWUpIHtcblx0XHRcdHN3aXRjaCAoZmluYWxGYWNldERlZmluaXRpb24uJFR5cGUpIHtcblx0XHRcdFx0Y2FzZSBcImNvbS5zYXAudm9jYWJ1bGFyaWVzLlVJLnYxLkNvbGxlY3Rpb25GYWNldFwiOlxuXHRcdFx0XHRcdGZpbmFsRmFjZXQucHVzaChcblx0XHRcdFx0XHRcdGNyZWF0ZUZhY2V0KGNvbnRleHQsIGAke2ZpbmFsQ3VycmVudFRhcmdldH1gLCBGZUZhY2V0VHlwZS5Gb3JtLCBmaW5hbEZhY2V0RGVmaW5pdGlvbiwgc3ViU2VjdGlvbkZhY2V0RGVmaW5pdGlvbilcblx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIFwiY29tLnNhcC52b2NhYnVsYXJpZXMuVUkudjEuUmVmZXJlbmNlRmFjZXRcIjpcblx0XHRcdFx0XHRjb25zdCBhbm5vdGF0aW9udGlvblBhdGg6IHN0cmluZyA9IGZpbmFsRmFjZXREZWZpbml0aW9uLlRhcmdldC52YWx1ZTtcblx0XHRcdFx0XHRjb25zdCBvQW5ub3RhdGlvbjogYW55ID0gZW50aXR5VHlwZS5yZXNvbHZlUGF0aChhbm5vdGF0aW9udGlvblBhdGgpO1xuXHRcdFx0XHRcdGlmIChpc0ZhY2V0Rm9ybUNvbXBsaWFudChmaW5hbEZhY2V0RGVmaW5pdGlvbiBhcyBSZWZlcmVuY2VGYWNldCkpIHtcblx0XHRcdFx0XHRcdGZpbmFsRmFjZXQucHVzaChcblx0XHRcdFx0XHRcdFx0Y3JlYXRlRmFjZXQoY29udGV4dCwgZmluYWxDdXJyZW50VGFyZ2V0LCBGZUZhY2V0VHlwZS5Gb3JtLCBmaW5hbEZhY2V0RGVmaW5pdGlvbiwgc3ViU2VjdGlvbkZhY2V0RGVmaW5pdGlvbilcblx0XHRcdFx0XHRcdCk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGNvbnN0IGlzUHJlc2VudGF0aW9uOiBib29sZWFuID1cblx0XHRcdFx0XHRcdFx0b0Fubm90YXRpb24gIT09IHVuZGVmaW5lZCAmJlxuXHRcdFx0XHRcdFx0XHQvLipjb21cXC5zYXBcXC52b2NhYnVsYXJpZXNcXC5VSVxcLnYxXFwuKExpbmVJdGVtfFByZXNlbnRhdGlvbikuKi8udGVzdChhbm5vdGF0aW9udGlvblBhdGgpO1xuXG5cdFx0XHRcdFx0XHRpZiAoaXNQcmVzZW50YXRpb24pIHtcblx0XHRcdFx0XHRcdFx0ZmluYWxGYWNldC5wdXNoKGNyZWF0ZUZhY2V0KGNvbnRleHQsIGZpbmFsQ3VycmVudFRhcmdldCwgRmVGYWNldFR5cGUuVGFibGUsIGZpbmFsRmFjZXREZWZpbml0aW9uKSk7XG5cdFx0XHRcdFx0XHR9IGVsc2UgaWYgKGFubm90YXRpb250aW9uUGF0aC5pbmRleE9mKFwiY29tLnNhcC52b2NhYnVsYXJpZXMuQ29tbXVuaWNhdGlvbi52MS5Db250YWN0XCIpID4gLTEpIHtcblx0XHRcdFx0XHRcdFx0ZmluYWxGYWNldC5wdXNoKGNyZWF0ZUZhY2V0KGNvbnRleHQsIGZpbmFsQ3VycmVudFRhcmdldCwgRmVGYWNldFR5cGUuQ29udGFjdCwgZmluYWxGYWNldERlZmluaXRpb24pKTtcblx0XHRcdFx0XHRcdH0gZWxzZSBpZiAoYW5ub3RhdGlvbnRpb25QYXRoLmluZGV4T2YoXCJjb20uc2FwLnZvY2FidWxhcmllcy5Db21tdW5pY2F0aW9uLnYxLkNoYXJ0XCIpID4gLTEpIHtcblx0XHRcdFx0XHRcdFx0ZmluYWxGYWNldC5wdXNoKGNyZWF0ZUZhY2V0KGNvbnRleHQsIGZpbmFsQ3VycmVudFRhcmdldCwgRmVGYWNldFR5cGUuQ2hhcnQsIGZpbmFsRmFjZXREZWZpbml0aW9uKSk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHRjYXNlIFwiY29tLnNhcC52b2NhYnVsYXJpZXMuVUkudjEuUmVmZXJlbmNlVVJMRmFjZXRcIjpcblx0XHRcdFx0XHQvL05vdCBjdXJyZW50bHkgbWFuYWdlZFxuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gZmluYWxGYWNldDtcblx0fTtcblxuXHRpZiAoXG5cdFx0c3ViU2VjdGlvbkZhY2V0RGVmaW5pdGlvbi4kVHlwZSA9PT0gXCJjb20uc2FwLnZvY2FidWxhcmllcy5VSS52MS5Db2xsZWN0aW9uRmFjZXRcIiAmJlxuXHRcdCEoc3ViU2VjdGlvbkZhY2V0RGVmaW5pdGlvbi5GYWNldHMgYXMgUmVmZXJlbmNlRmFjZXRbXSkuZXZlcnkoaXNGYWNldEZvcm1Db21wbGlhbnQpXG5cdCkge1xuXHRcdHZhciBmYWNldHM6IEZhY2V0W10gPSBbXTtcblx0XHRzdWJTZWN0aW9uRmFjZXREZWZpbml0aW9uLkZhY2V0cy5mb3JFYWNoKChuZXN0ZWRGYWNldERlZmluaXRpb246IEFubm90YXRpb25UZXJtPEZhY2V0VHlwZXM+LCBuZXN0ZWRGYWNldEluZGV4OiBudW1iZXIpID0+IHtcblx0XHRcdGZhY2V0cyA9IGZhY2V0cy5jb25jYXQoX2dldEZpbmFsRmFjZXRzKGAke2N1cnJlbnRUYXJnZXR9L0ZhY2V0cy8ke25lc3RlZEZhY2V0SW5kZXh9YCwgbmVzdGVkRmFjZXREZWZpbml0aW9uKSk7XG5cdFx0fSk7XG5cdFx0cmV0dXJuIGZhY2V0cztcblx0fSBlbHNlIHtcblx0XHRyZXR1cm4gX2dldEZpbmFsRmFjZXRzKGN1cnJlbnRUYXJnZXQsIHN1YlNlY3Rpb25GYWNldERlZmluaXRpb24pO1xuXHR9XG59O1xuXG5jb25zdCBnZXRIZWFkZXJTdWJTZWN0aW9uRmFjZXRzID0gKGNvbnRleHQ6IFBhZ2VDb252ZXJ0ZXJDb250ZXh0LCBmYWNldERlZmluaXRpb246IEZhY2V0VHlwZXMsIGN1cnJlbnRUYXJnZXQ6IHN0cmluZyk6IEZhY2V0W10gPT4ge1xuXHR2YXIgZmFjZXRzOiBGYWNldFtdID0gW107XG5cdGNvbnN0IF9hZGRGYWNldCA9IChmaW5hbEZhY2V0RGVmaW5pdGlvbjogUmVmZXJlbmNlRmFjZXQsIGZpbmFsQ3VycmVudFRhcmdldDogc3RyaW5nLCBmaW5hbFBhcmVudEZhY2V0RGVmaW5pdGlvbj86IEZhY2V0VHlwZXMpID0+IHtcblx0XHRpZiAoZmluYWxGYWNldERlZmluaXRpb24uYW5ub3RhdGlvbnM/LlVJPy5IaWRkZW4gIT09IHRydWUpIHtcblx0XHRcdGNvbnN0IGZlRmFjZXRUeXBlID1cblx0XHRcdFx0ZmluYWxGYWNldERlZmluaXRpb24uVGFyZ2V0LiR0YXJnZXQuJFR5cGUgPT09IFwiY29tLnNhcC52b2NhYnVsYXJpZXMuQ29tbXVuaWNhdGlvbi52MS5Db250YWN0VHlwZVwiXG5cdFx0XHRcdFx0PyBGZUZhY2V0VHlwZS5IZWFkZXJDb250YWN0XG5cdFx0XHRcdFx0OiBGZUZhY2V0VHlwZS5Gb3JtO1xuXHRcdFx0ZmFjZXRzLnB1c2goY3JlYXRlRmFjZXQoY29udGV4dCwgZmluYWxDdXJyZW50VGFyZ2V0LCBmZUZhY2V0VHlwZSwgZmluYWxGYWNldERlZmluaXRpb24sIGZpbmFsUGFyZW50RmFjZXREZWZpbml0aW9uKSk7XG5cdFx0fVxuXHR9O1xuXG5cdGlmICgoZmFjZXREZWZpbml0aW9uIGFzIENvbGxlY3Rpb25GYWNldCkuRmFjZXRzKSB7XG5cdFx0KGZhY2V0RGVmaW5pdGlvbiBhcyBDb2xsZWN0aW9uRmFjZXQpLkZhY2V0cz8uZm9yRWFjaCgobmVzdGVkRmFjZXREZWZpbml0aW9uOiBGYWNldFR5cGVzLCBuZXN0ZWRGYWNldEluZGV4OiBudW1iZXIpID0+IHtcblx0XHRcdF9hZGRGYWNldChuZXN0ZWRGYWNldERlZmluaXRpb24gYXMgUmVmZXJlbmNlRmFjZXQsIGAke2N1cnJlbnRUYXJnZXR9L0ZhY2V0cy8ke25lc3RlZEZhY2V0SW5kZXh9YCwgZmFjZXREZWZpbml0aW9uKTtcblx0XHR9KTtcblx0fSBlbHNlIHtcblx0XHRfYWRkRmFjZXQoZmFjZXREZWZpbml0aW9uIGFzIFJlZmVyZW5jZUZhY2V0LCBjdXJyZW50VGFyZ2V0KTtcblx0fVxuXHRyZXR1cm4gZmFjZXRzO1xufTtcblxuY29uc3QgZ2V0SW52ZXJzZUJpbmRpbmdFeHByZXNzaW9uID0gZnVuY3Rpb248VD4oXG5cdGFubm90YXRpb25WYWx1ZTogVCB8IFBhdGhBbm5vdGF0aW9uRXhwcmVzc2lvbjxUPiB8IEFwcGx5QW5ub3RhdGlvbkV4cHJlc3Npb248VD4gfCB1bmRlZmluZWQsXG5cdGN1cnJlbnRDb250ZXh0OiBDb250ZXh0LFxuXHRkZWZhdWx0VmFsdWU/OiBUXG4pOiBCaW5kaW5nRXhwcmVzc2lvbjxUPiB7XG5cdGlmICghYW5ub3RhdGlvblZhbHVlKSB7XG5cdFx0cmV0dXJuIGRlZmF1bHRWYWx1ZTtcblx0fVxuXHRjb25zdCBiaW5kaW5nRXhwcmVzc2lvbiA9IGdldEJpbmRpbmdFeHByZXNzaW9uKGFubm90YXRpb25WYWx1ZSwgY3VycmVudENvbnRleHQsIGRlZmF1bHRWYWx1ZSk7XG5cdHJldHVybiBgez0gISQke2JpbmRpbmdFeHByZXNzaW9ufX1gO1xufTtcblxuY29uc3QgZ2V0U2VjdGlvbiA9IChcblx0Y29udGV4dDogUGFnZUNvbnZlcnRlckNvbnRleHQsXG5cdGZhY2V0RGVmaW5pdGlvbjogRmFjZXRUeXBlcyxcblx0b01ldGFNb2RlbENvbnRleHQ6IENvbnRleHQsXG5cdHN0YWJsZUlkUGFydHM6IHN0cmluZ1tdLFxuXHRjdXJyZW50VGFyZ2V0OiBzdHJpbmdcbik6IE1hbmlmZXN0U2VjdGlvbiA9PiB7XG5cdGNvbnN0IHNlY3Rpb246IE1hbmlmZXN0U2VjdGlvbiA9IHtcblx0XHRpZDogZ2V0RmFjZXRJRChzdGFibGVJZFBhcnRzLCBmYWNldERlZmluaXRpb24sIGN1cnJlbnRUYXJnZXQpLFxuXHRcdHRpdGxlOiBnZXRCaW5kaW5nRXhwcmVzc2lvbjxzdHJpbmc+KGZhY2V0RGVmaW5pdGlvbi5MYWJlbCwgb01ldGFNb2RlbENvbnRleHQpLFxuXHRcdHZpc2libGU6IGdldEludmVyc2VCaW5kaW5nRXhwcmVzc2lvbjxib29sZWFuPihmYWNldERlZmluaXRpb24uYW5ub3RhdGlvbnM/LlVJPy5IaWRkZW4sIG9NZXRhTW9kZWxDb250ZXh0LCB0cnVlKSxcblx0XHRzdWJTZWN0aW9uczoge30sXG5cdFx0ZmFjZXRUeXBlOiBmYWNldERlZmluaXRpb24uJFR5cGUsXG5cdFx0dHlwZTogU2VjdGlvblR5cGUuQW5ub3RhdGlvblxuXHR9O1xuXG5cdHNlY3Rpb24uc2hvd1RpdGxlID0gc2VjdGlvbi50aXRsZSAhPT0gdW5kZWZpbmVkO1xuXHRjb25zdCBfZ2V0U3ViU2VjdGlvbiA9IChcblx0XHRzdWJTZWN0aW9uRmFjZXREZWZpbml0aW9uOiBGYWNldFR5cGVzLFxuXHRcdHN1YlNlY3Rpb25UYXJnZXQ6IHN0cmluZyxcblx0XHRzdWJTZWN0aW9uVGl0bGU6IHN0cmluZyB8IHVuZGVmaW5lZCxcblx0XHRQYXJlbnRTZWN0aW9uOiBNYW5pZmVzdFNlY3Rpb25cblx0KTogU3ViU2VjdGlvbiA9PiB7XG5cdFx0Y29uc3QgaWRQYXJ0OiBzdHJpbmcgPSBcIkZhY2V0U3ViU2VjdGlvblwiO1xuXHRcdHZhciBjb21tb25zdWJTZWN0aW9uOiBhbnkgPSB7XG5cdFx0XHR0eXBlOiBTZWN0aW9uVHlwZS5Bbm5vdGF0aW9uLFxuXHRcdFx0dmlzaWJsZTogUGFyZW50U2VjdGlvbi52aXNpYmxlXG5cdFx0fTtcblx0XHRjb25zdCBhbGxGYWNldHMgPSBnZXRGYWNldHNGcm9tU3ViU2VjdGlvbihjb250ZXh0LCBzdWJTZWN0aW9uRmFjZXREZWZpbml0aW9uLCBzdWJTZWN0aW9uVGFyZ2V0KTtcblx0XHRyZXR1cm4ge1xuXHRcdFx0Li4ue1xuXHRcdFx0XHR0aXRsZTogc3ViU2VjdGlvblRpdGxlLFxuXHRcdFx0XHRpZDogZ2V0RmFjZXRJRChbXCJmZVwiLCBpZFBhcnRdLCBzdWJTZWN0aW9uRmFjZXREZWZpbml0aW9uLCBzdWJTZWN0aW9uVGFyZ2V0KSxcblx0XHRcdFx0ZmFjZXRzOiBhbGxGYWNldHMsXG5cdFx0XHRcdG1vcmVGYWNldHM6IGFsbEZhY2V0cy5maWx0ZXIoXG5cdFx0XHRcdFx0ZmFjZXREZWZpbml0aW9uID0+IGZhY2V0RGVmaW5pdGlvbi50eXBlID09PSBcIkZvcm1cIiAmJiAoZmFjZXREZWZpbml0aW9uIGFzIEZvcm1GYWNldCkuaGFzRmFjZXRzTm90UGFydE9mUHJldmlld1xuXHRcdFx0XHQpLFxuXHRcdFx0XHRhY3Rpb25zOiBnZXRBY3Rpb25zRnJvbVN1YlNlY3Rpb24oY29udGV4dCwgb01ldGFNb2RlbENvbnRleHQsIHN1YlNlY3Rpb25GYWNldERlZmluaXRpb24pXG5cdFx0XHR9LFxuXHRcdFx0Li4uY29tbW9uc3ViU2VjdGlvblxuXHRcdH07XG5cdH07XG5cblx0aWYgKFxuXHRcdGZhY2V0RGVmaW5pdGlvbi4kVHlwZSA9PT0gXCJjb20uc2FwLnZvY2FidWxhcmllcy5VSS52MS5Db2xsZWN0aW9uRmFjZXRcIiAmJlxuXHRcdGZhY2V0RGVmaW5pdGlvbi5GYWNldHMuZmluZChmYWNldERlZmluaXRpb24gPT4gZmFjZXREZWZpbml0aW9uLiRUeXBlID09PSBcImNvbS5zYXAudm9jYWJ1bGFyaWVzLlVJLnYxLkNvbGxlY3Rpb25GYWNldFwiKVxuXHQpIHtcblx0XHQvLyBXZSBoYXZlIGEgQ29sbGVjdGlvbiBvZiBDb2xsZWN0aW9uXG5cdFx0bGV0IHNlY3Rpb25LZXk6IHN0cmluZywgc3ViU2VjdGlvbjogU3ViU2VjdGlvbjtcblxuXHRcdGZhY2V0RGVmaW5pdGlvbi5GYWNldHMuZm9yRWFjaCgoc3ViRmFjZXREZWZpbml0aW9uOiBBbm5vdGF0aW9uVGVybTxGYWNldFR5cGVzPiwgc3ViRmFjZXRJbmRleDogbnVtYmVyKSA9PiB7XG5cdFx0XHRzdWJTZWN0aW9uID0gX2dldFN1YlNlY3Rpb24oXG5cdFx0XHRcdHN1YkZhY2V0RGVmaW5pdGlvbixcblx0XHRcdFx0YCR7Y3VycmVudFRhcmdldH0vRmFjZXRzLyR7c3ViRmFjZXRJbmRleH1gLFxuXHRcdFx0XHRnZXRCaW5kaW5nRXhwcmVzc2lvbjxzdHJpbmc+KHN1YkZhY2V0RGVmaW5pdGlvbi5MYWJlbCwgb01ldGFNb2RlbENvbnRleHQpLFxuXHRcdFx0XHRzZWN0aW9uXG5cdFx0XHQpO1xuXHRcdFx0aWYgKHNlY3Rpb25LZXkgIT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRzdWJTZWN0aW9uLnBvc2l0aW9uID0geyBhbmNob3I6IHNlY3Rpb25LZXksIHBsYWNlbWVudDogUGxhY2VtZW50LkFmdGVyIH07XG5cdFx0XHR9XG5cdFx0XHRzZWN0aW9uS2V5ID0gZ2V0RmFjZXRSZWZLZXkoc3ViRmFjZXREZWZpbml0aW9uLCBzdWJGYWNldEluZGV4LnRvU3RyaW5nKCkpO1xuXHRcdFx0c2VjdGlvbi5zdWJTZWN0aW9uc1tzZWN0aW9uS2V5XSA9IHN1YlNlY3Rpb247XG5cdFx0fSk7XG5cdH0gZWxzZSB7XG5cdFx0c2VjdGlvbi5zdWJTZWN0aW9uc1tcblx0XHRcdGdldEZhY2V0UmVmS2V5KGZhY2V0RGVmaW5pdGlvbiwgZ2V0RmFjZXRJRChbXCJmZVwiLCBcIlNlY3Rpb25cIl0sIGZhY2V0RGVmaW5pdGlvbiwgY3VycmVudFRhcmdldCkpXG5cdFx0XSA9IF9nZXRTdWJTZWN0aW9uKGZhY2V0RGVmaW5pdGlvbiwgY3VycmVudFRhcmdldCwgc2VjdGlvbi50aXRsZSwgc2VjdGlvbik7XG5cdH1cblx0cmV0dXJuIHNlY3Rpb247XG59O1xuXG5jb25zdCBpc0ZhY2V0Rm9ybUNvbXBsaWFudCA9IGZ1bmN0aW9uKGZhY2V0OiBSZWZlcmVuY2VGYWNldCkge1xuXHRyZXR1cm4gZmFjZXQuVGFyZ2V0ICYmIC8uKmNvbVxcLnNhcFxcLnZvY2FidWxhcmllc1xcLlVJXFwudjFcXC4oRmllbGRHcm91cHxJZGVudGlmaWNhdGlvbnxEYXRhUG9pbnR8U3RhdHVzSW5mbykuKi8udGVzdChmYWNldC5UYXJnZXQudmFsdWUpO1xufTtcblxuY29uc3QgaXNQYXRoRXhwcmVzc2lvbiA9IGZ1bmN0aW9uPFQ+KGV4cHJlc3Npb246IGFueSk6IGV4cHJlc3Npb24gaXMgUGF0aEFubm90YXRpb25FeHByZXNzaW9uPFQ+IHtcblx0cmV0dXJuIGV4cHJlc3Npb24udHlwZSAhPT0gdW5kZWZpbmVkICYmIGV4cHJlc3Npb24udHlwZSA9PT0gXCJQYXRoXCI7XG59O1xuXG5jb25zdCBwcmVwYXJlU2VjdGlvbiA9IChzZWN0aW9uOiBNYW5pZmVzdFNlY3Rpb24gfCB1bmRlZmluZWQgfCBudWxsLCBrZXk6IHN0cmluZyk6IE1hbmlmZXN0U2VjdGlvbiA9PiB7XG5cdGlmICghc2VjdGlvbikge1xuXHRcdHRocm93IG5ldyBFcnJvcihcInVuZGVmaW5lZCBzZWN0aW9uXCIpO1xuXHR9XG5cdGlmIChzZWN0aW9uLnZpc2libGUgPT09IHVuZGVmaW5lZCB8fCBzZWN0aW9uLnZpc2libGUgPT09IG51bGwpIHtcblx0XHRzZWN0aW9uLnZpc2libGUgPSB0cnVlO1xuXHR9XG5cdHNlY3Rpb24uc2hvd1RpdGxlID0gc2VjdGlvbi50aXRsZSAhPT0gdW5kZWZpbmVkO1xuXHRpZiAoIXNlY3Rpb24udHlwZSkge1xuXHRcdHNlY3Rpb24udHlwZSA9IFNlY3Rpb25UeXBlLkRlZmF1bHQ7XG5cdH1cblx0aWYgKFxuXHRcdChzZWN0aW9uLnR5cGUgPT09IFNlY3Rpb25UeXBlLlhNTEZyYWdtZW50IHx8IHNlY3Rpb24udHlwZSA9PT0gU2VjdGlvblR5cGUuRGVmYXVsdCkgJiZcblx0XHQoIXNlY3Rpb24uc3ViU2VjdGlvbnMgfHwgIU9iamVjdC5rZXlzKHNlY3Rpb24uc3ViU2VjdGlvbnMpLmxlbmd0aClcblx0KSB7XG5cdFx0c2VjdGlvbi5zdWJTZWN0aW9ucyA9IHtcblx0XHRcdFwiZGVmYXVsdFwiOiB7XG5cdFx0XHRcdC4uLnNlY3Rpb24sXG5cdFx0XHRcdC4uLntcblx0XHRcdFx0XHR2aXNpYmxlOiB0cnVlLFxuXHRcdFx0XHRcdHNob3dUaXRsZTogZmFsc2UsXG5cdFx0XHRcdFx0cG9zaXRpb246IHVuZGVmaW5lZCxcblx0XHRcdFx0XHRpZDogU3RhYmxlSWRIZWxwZXIuZ2VuZXJhdGUoW1wiZmVcIiwgXCJDdXN0b21TdWJTZWN0aW9uXCIsIGtleV0pXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9O1xuXHR9XG5cdHJldHVybiBzZWN0aW9uO1xufTtcblxuZXhwb3J0IGRlZmF1bHQge1xuXHRjb252ZXJ0UGFnZShcblx0XHRlbnRpdHlTZXQ6IFJlcXVpcmVkPEVudGl0eVNldD4sXG5cdFx0b01ldGFNb2RlbENvbnRleHQ6IENvbnRleHQsXG5cdFx0b01hbmlmZXN0U2V0dGluZ3M6IE9iamVjdFBhZ2VNYW5pZmVzdFNldHRpbmdzLFxuXHRcdHVuYWxpYXNGbjogRnVuY3Rpb25cblx0KTogT2JqZWN0UGFnZURlZmluaXRpb24ge1xuXHRcdGNvbnN0IHNlY3Rpb25zOiBSZWNvcmQ8c3RyaW5nLCBNYW5pZmVzdFNlY3Rpb24+ID0ge307XG5cdFx0Y29uc3QgZW50aXR5VHlwZTogUmVxdWlyZWQ8RW50aXR5VHlwZT4gPSBlbnRpdHlTZXQuZW50aXR5VHlwZUluc3RhbmNlIGFzIFJlcXVpcmVkPEVudGl0eVR5cGU+O1xuXHRcdGNvbnN0IGNvbnRleHQ6IFBhZ2VDb252ZXJ0ZXJDb250ZXh0ID0ge1xuXHRcdFx0ZW50aXR5U2V0LFxuXHRcdFx0ZW50aXR5VHlwZSxcblx0XHRcdG1hbmlmZXN0U2V0dGluZ3M6IG9NYW5pZmVzdFNldHRpbmdzXG5cdFx0fTtcblx0XHR2YXIgb3B0aW9uYWxLZXk6IGFueSA9IHt9O1xuXHRcdGxldCBzZWN0aW9uS2V5OiBzdHJpbmc7XG5cdFx0dmFyIEhlYWRlcmZhY2V0czogRmFjZXRbXSA9IFtdO1xuXHRcdGlmIChvTWFuaWZlc3RTZXR0aW5ncy5lZGl0YWJsZUhlYWRlckNvbnRlbnQpIHtcblx0XHRcdGVudGl0eVR5cGUuYW5ub3RhdGlvbnM/LlVJPy5IZWFkZXJGYWNldHM/LmZvckVhY2goKGZhY2V0RGVmaW5pdGlvbjogRmFjZXRUeXBlcywgZmFjZXRJbmRleDogbnVtYmVyKSA9PiB7XG5cdFx0XHRcdHZhciBuZXdGYWNldHMgPSBnZXRIZWFkZXJTdWJTZWN0aW9uRmFjZXRzKGNvbnRleHQsIGZhY2V0RGVmaW5pdGlvbiwgYCR7dW5hbGlhc0ZuKFwiVUkuSGVhZGVyRmFjZXRzXCIpfS8ke2ZhY2V0SW5kZXh9YCk7XG5cdFx0XHRcdGlmIChuZXdGYWNldHMubGVuZ3RoID4gMCkge1xuXHRcdFx0XHRcdEhlYWRlcmZhY2V0cyA9IEhlYWRlcmZhY2V0cy5jb25jYXQobmV3RmFjZXRzKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0XHRpZiAoSGVhZGVyZmFjZXRzLmxlbmd0aCA+IDApIHtcblx0XHRcdFx0b3B0aW9uYWxLZXkuaGVhZGVyU2VjdGlvbiA9IHtcblx0XHRcdFx0XHRzdWJTZWN0aW9uOiB7XG5cdFx0XHRcdFx0XHRmYWNldHM6IEhlYWRlcmZhY2V0c1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRlbnRpdHlUeXBlLmFubm90YXRpb25zPy5VST8uRmFjZXRzPy5mb3JFYWNoKChmYWNldERlZmluaXRpb246IEZhY2V0VHlwZXMsIGZhY2V0SW5kZXg6IG51bWJlcikgPT4ge1xuXHRcdFx0Y29uc3Qgc2VjdGlvbjogTWFuaWZlc3RTZWN0aW9uID0gZ2V0U2VjdGlvbihcblx0XHRcdFx0Y29udGV4dCxcblx0XHRcdFx0ZmFjZXREZWZpbml0aW9uLFxuXHRcdFx0XHRvTWV0YU1vZGVsQ29udGV4dCxcblx0XHRcdFx0W1wiZmVcIiwgXCJGYWNldFNlY3Rpb25cIl0sXG5cdFx0XHRcdGAke3VuYWxpYXNGbihcIlVJLkZhY2V0c1wiKX0vJHtmYWNldEluZGV4fWBcblx0XHRcdCk7XG5cdFx0XHRpZiAoc2VjdGlvbktleSAhPSBudWxsKSB7XG5cdFx0XHRcdHNlY3Rpb24ucG9zaXRpb24gPSB7IGFuY2hvcjogc2VjdGlvbktleSwgcGxhY2VtZW50OiBQbGFjZW1lbnQuQWZ0ZXIgfTtcblx0XHRcdH1cblx0XHRcdHNlY3Rpb25LZXkgPSBnZXRGYWNldFJlZktleShmYWNldERlZmluaXRpb24sIGZhY2V0SW5kZXgudG9TdHJpbmcoKSk7XG5cdFx0XHRzZWN0aW9uc1tzZWN0aW9uS2V5XSA9IHNlY3Rpb247XG5cdFx0fSk7XG5cblx0XHRmb3IgKGxldCBrZXkgaW4gb01hbmlmZXN0U2V0dGluZ3MuY29udGVudD8uYm9keT8uc2VjdGlvbnMpIHtcblx0XHRcdGxldCBjdXN0b21TZWN0aW9uOiBNYW5pZmVzdFNlY3Rpb24gfCB1bmRlZmluZWQgPSBvTWFuaWZlc3RTZXR0aW5ncy5jb250ZW50Py5ib2R5Py5zZWN0aW9uc1trZXldO1xuXHRcdFx0c2VjdGlvbnNba2V5XSA9IHByZXBhcmVTZWN0aW9uKFxuXHRcdFx0XHR7IC4uLnsgaWQ6IFN0YWJsZUlkSGVscGVyLmdlbmVyYXRlKFtcImZlXCIsIFwiQ3VzdG9tU2VjdGlvblwiLCBrZXldKSB9LCAuLi5zZWN0aW9uc1trZXldLCAuLi5jdXN0b21TZWN0aW9uIH0sXG5cdFx0XHRcdGtleVxuXHRcdFx0KTtcblx0XHR9XG5cblx0XHQvLyB0aGUgXCJmaW5hbFwiIHN0cnVjdHVyZSBpcyBkaWZmZXJlbnQsIGUuZy4gcmVzb2x2ZSBiZWZvcmUvYWZ0ZXIgb3JkZXJpbmcgaW50byBhcnJheXNcblx0XHQvLyBUT0RPIHRoZSBmaW5hbCB0cmFuc2Zvcm0gbWVjaGFuaXNtIGZyb20gdGhlIGh1bWFuIHJlYWRhYmxlIGZvcm0gdG8gXCJ0ZW1wbGF0ZSByZWFkeVwiIHNob3VsZCBoYXBwZW4gYXQgdGhlIHZlcnkgZW5kLCBub3QgaGVyZVxuXHRcdGxldCBwYXJzZWRTZWN0aW9uczogTWFuaWZlc3RTZWN0aW9uW10gPSBDb252ZXJ0ZXJVdGlsLm9yZGVyQnlQb3NpdGlvbihzZWN0aW9ucylcblx0XHRcdC5maWx0ZXIoc2VjdGlvbiA9PiBzZWN0aW9uLnZpc2libGUpXG5cdFx0XHQubWFwKHNlY3Rpb24gPT4ge1xuXHRcdFx0XHQoKHNlY3Rpb24gYXMgdW5rbm93bikgYXMgU2VjdGlvbikuc3ViU2VjdGlvbnMgPSBDb252ZXJ0ZXJVdGlsLm9yZGVyQnlQb3NpdGlvbihzZWN0aW9uLnN1YlNlY3Rpb25zKSBhcyBTdWJTZWN0aW9uW107XG5cdFx0XHRcdHJldHVybiBzZWN0aW9uO1xuXHRcdFx0fSk7XG5cblx0XHRyZXR1cm4geyAuLi57IHNlY3Rpb25zOiBwYXJzZWRTZWN0aW9ucyB9LCAuLi5vcHRpb25hbEtleSB9O1xuXHR9XG59O1xuIl19