// Copyright (c) 2009-2020 SAP SE, All Rights Reserved
sinaDefine(['../core/core','./SinaObject'],function(c,S){"use strict";return S.derive({_meta:{properties:{id:{required:true},metadata:{required:true},groups:{required:false,defaul:function(){return[];}}}},toString:function(){return this.id;}});});
