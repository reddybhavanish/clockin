/*
 * ! SAP UI development toolkit for HTML5 (SAPUI5)
        (c) Copyright 2009-2020 SAP SE. All rights reserved
    
 */
sap.ui.define(["sap/fe/core/services/TemplatedViewServiceFactory","sap/fe/core/services/ResourceModelServiceFactory","sap/fe/core/services/CacheHandlerServiceFactory","sap/fe/core/services/DraftModelServiceFactory","sap/fe/core/services/NavigationServiceFactory","sap/fe/core/services/RoutingServiceFactory","sap/ui/core/service/ServiceFactoryRegistry"],function(T,R,C,D,N,a,S){"use strict";var c={init:function(){if(!sap.fe.core){sap.fe.core={};}sap.fe.core.CreationMode={NewPage:"NewPage",Sync:"Sync",Async:"Async",Deferred:"Deferred",Inline:"Inline",CreationRow:"CreationRow"};S.register("sap.fe.core.services.TemplatedViewService",new T());S.register("sap.fe.core.services.ResourceModelService",new R());S.register("sap.fe.core.services.CacheHandlerService",new C());S.register("sap.fe.core.services.DraftModelService",new D());S.register("sap.fe.core.services.NavigationService",new N());S.register("sap.fe.core.services.RoutingService",new a());}};return c;},false);
