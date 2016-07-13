
/*
 * 构造函数Schedule
 * 三个参数
 * moutdom 必须 类型为字符串或者HTMLElement
 * initstate 可选 类型为一个 7 * 24 的二维数组，默认初始数据都为0
 * lifehook 可选 生命周期hook
   componentMount 组件挂载之后触发
   beforeUpdate state更新之前触发
   afterUpdate state更新之后触发
 * 
 * 用法:
 * var s = new Schedule(".mount");
 * console.log(s.getdata());
 * s.setdata([[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0],[0,0,0,0,0,0,0]]);
 */
function Schedule(mountdom,initstate,lifehook){
	if(!(mountdom instanceof HTMLElement) && !(Object.prototype.toString.call(mountdom) === "[object String]")) throw Error("mountdom should be a HTMLElement or a query string");
	if(!(this instanceof Schedule)) return new Schedule(mountdom);
	this.$$state = [];
	this.$$mountdom = null;
	this.$$updateCount = 0;
	this.$$lifehook = lifehook;
	if(!Array.isArray(initstate)) this.$$lifehook = initstate ==  undefined ? {} : Object.assign({},initstate), initstate = undefined;
	this.init(mountdom,initstate == undefined ? Array(7).fill(0).map(function(item){
		return Array(24).fill(0).map(function(item){
			return item;
		})
	}) : initstate);
}

var proto = Schedule.prototype;

//初始化工作
proto.init = function(dom,initialstate){
	//验证初始状态
	if(!this.validstate(initialstate)) { 
		throw Error("initialstate is not valid"); 
	}else{
		this.$$state = initialstate;
	}
	//首先获得挂载的dom
	var dom = Object.prototype.toString.call(dom) === "[object String]" ? document.querySelector(dom) : dom;
	this.$$mountdom = dom;
	var html = this.template({
		w: dom.getBoundingClientRect().width,
		h: dom.getBoundingClientRect().height
	});
	dom.innerHTML = html;
	this.bindEvent();
	this.paintstate(true);
	if(typeof this.$$lifehook.componentMount == "function") this.$$lifehook.componentMount.call(this)
}	

//根据state来给方格涂色
proto.paintstate = function(isInit){
	if(!isInit) this.$$updateCount++;
	if(typeof this.$$lifehook.beforeUpdate == "function" && !isInit) this.$$lifehook.beforeUpdate.call(this,this.$$updateCount);
	this.$$state.forEach(function(item,day){
		item.forEach(function(item,moment){
			var box = document.querySelector(".ztc-schedule .ztc-schedule-body .body-moment[data-weekday='"+(day+1)+"'][data-moment='"+(moment+1)+"']");
			if(item == 1){
				box.classList.add("active")
			}else{
				box.classList.remove("active");
			}
		})
	});	
	if(typeof this.$$lifehook.afterUpdate == "function" && !isInit) this.$$lifehook.afterUpdate.call(this,this.$$updateCount)
}

//验证state合理性
proto.validstate = function(state){
	return Array.isArray(state) && state.length == 7 && state.map(function(day){
		return day.length == 24 ? 1 : 0
	}).reduce(function(p,n){
		return p + n;
	},0) == 7;
}


//给box绑定tap事件
proto.bindEvent = function(){
	var event = window.ontouch ? "touchend" : "click";
	//点击每个时间小方格toggle颜色，修改数组
	document.querySelector(".ztc-schedule .ztc-schedule-body .body-wrapper").addEventListener(event,function(e){
		var target = e.target
		if(!target.classList.contains("body-moment")) return;
		var weekday = parseInt(target.dataset["weekday"]);
		var moment = parseInt(target.dataset["moment"]);
		this.$$state[weekday-1][moment-1] = this.$$state[weekday-1][moment-1] == 1 ? 0 : 1;
		//target.classList.toggle("active");
		this.paintstate();
	}.bind(this));
	//点击header里面的日期点亮一列
	document.querySelector(".ztc-schedule .ztc-schedule-header .ztc-weekday-container").addEventListener(event,function(e){
		var target = e.target
		if(!target.classList.contains("ztc-weekday")) return;
		var weekday = parseInt(target.dataset["weekday"]);
		this.$$state[weekday] = Array(24).fill(1);
		this.paintstate();
	}.bind(this));
	//下方三个按钮绑定事件
	document.querySelector(".ztc-schedule .ztc-schedule-footer .full-invest").addEventListener(event,function(e){
		this.$$state = Array(7).fill(0).map(function(item){
			return Array(24).fill(1).map(function(item){
				return item;
			})
		});
		this.paintstate();
	}.bind(this));
	document.querySelector(".ztc-schedule .ztc-schedule-footer .weekday-invest").addEventListener(event,function(e){
		this.$$state = Array(7).fill(0).map(function(item,index){
			if(index <= 4) return Array(24).fill(1).map(function(item){
					return item;
				})
			return Array(24).fill(0).map(function(item){
					return item;
			})	
		});
		this.paintstate();
	}.bind(this));
	document.querySelector(".ztc-schedule .ztc-schedule-footer .weekend-invest").addEventListener(event,function(e){
		this.$$state = Array(7).fill(0).map(function(item,index){
			if(index > 4) return Array(24).fill(1).map(function(item){
					return item;
				})
			return Array(24).fill(0).map(function(item){
					return item;
			})	
		});
		this.paintstate();
	}.bind(this));
	window.onresize = this.resize.bind(this);
}

//返回模板
proto.template = function(wh){
	var week_width = Math.floor((wh.w - 25)/7);
	return '<div class="ztc-schedule">\
				<div class="ztc-schedule-header">\
					<div class="ztc-block">时刻</div>\
					<div class="ztc-weekday-container">\
					'+["星期一","星期二","星期三","星期四","星期五","星期六","星期日"].map(function(weekday,index){
						return '<div class="ztc-weekday" data-weekday="'+index+'"style="width:'+week_width+'px;">'+weekday+'</div>'
					}).join("") +'</div>\
					</div>\
				<div class="ztc-schedule-body" style="height: '+(wh.h - 76)+'px;"><div class="body-wrapper">\
					'+ Array(24).fill(1).map(function(item,index){
						var index_str = (index+1)+"";
						index_str = index_str.length > 1 ? index_str : "0"+index_str;
						return '<div class="body-moment-head" style="height:'+week_width+'px;line-height:'+week_width+'px">'+index_str+'</div>' + Array(7).fill(1).map(function(item,index2){
							return '<div class="body-moment" data-weekday='+(index2+1)+' data-moment='+(index+1)+' style="width:'+week_width+'px;height:'+week_width+'px"></div>'
						}).join("");
					}).join("") +'<div style="clear:both;"></div></div></div>\
				<div class="ztc-schedule-footer">\
					<div class="item full-invest">全周投放</div>\
					<div class="item weekday-invest">周一到周五投放</div>\
					<div class="item weekend-invest">周末投放</div>\
				</div>\
			</div>';
}

//返回数据 
proto.getdata = function(){
	return this.$$state;
}

//设置数据
proto.setdata = function(state){
	if(!this.validstate(initialstate)) { 
		throw Error("initialstate is not valid"); 
	}else{
		this.$$state = initialstate;
	}
}

proto.resize = function(){
	this.$$mountdom.innerHTML = "";
	this.init(this.$$mountdom,this.$$state);
}

/*下面是数组fill方法的polyfill*/
if ( ![].fill)  {
    Array.prototype.fill = function( value ) {

    var O = Object( this );
    var len = parseInt( O.length, 10 );
    var start = arguments[1];
    var relativeStart = parseInt( start, 10 ) || 0;
    var k = relativeStart < 0
            ? Math.max( len + relativeStart, 0) 
            : Math.min( relativeStart, len );
    var end = arguments[2];
    var relativeEnd = end === undefined
                      ? len 
                      : ( parseInt( end)  || 0) ;
    var final = relativeEnd < 0
                ? Math.max( len + relativeEnd, 0 )
                : Math.min( relativeEnd, len );

    for (; k < final; k++) {
        O[k] = value;
    }

    return O;
  };
}

//Object.assign polyfill

if (typeof Object.assign != 'function') {
  Object.assign = function(target) {
    'use strict';
    if (target == null) {
      throw new TypeError('Cannot convert undefined or null to object');
    }
    target = Object(target);
    for (var index = 1; index < arguments.length; index++) {
      var source = arguments[index];
      if (source != null) {
        for (var key in source) {
          if (Object.prototype.hasOwnProperty.call(source, key)) {
            target[key] = source[key];
          }
        }
      }
    }
    return target;
  };
}

