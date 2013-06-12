$.fn.serializeObject = function() {
	var o = {};
	var a = this.serializeArray();
	$.each(a, function() {
		if (o[this.name] !== undefined) {
			if (!o[this.name].push) {
				o[this.name] = [o[this.name]];
			}
			o[this.name].push(this.value || '');
		} else {
			o[this.name] = this.value || '';
		}
	});
	return o;
};

/**
 * A SIMPLE front end MVC framework using jquery
 *
 * SiMpVC plays very well with PhoneGap and Titanium.
 * It brings a lot of MVC greatness to the front end with a lot less overhead
 * compared to other solutions.
 *
 * Contribute here - 
 * Donate here - 
 *
 * Resources
 * jQuery - http://jquery.com/
 * underscore - http://underscorejs.org/
 *
 */
var SiMpVC = {
	
	/**
	 * Define if debug mode is active or not
	 */
	debug: false,
	/**
	 * SiMpVC logging method, used during debug mode
	 */
	log: function(data, title, type) {
		if(SiMpVC.debug && typeof console.log == 'function') {
			if(typeof type == 'undefined') var type = 'log';
			//console[type]('SiMpVC Log' + (typeof title != 'undefined' ? ' - ' + title : ''));	
			console[type](data);
		}
	},
	/**
	 * Default element to load the controller view into
	 *
	 * This can be overwritten on a controller basis by defining the
	 * SiMpVC.loadInto property.
	 *
	 * This value must a valid jquery selector
	 *
	 */
	defaultLoadInto: 'body',
	/**
	 * Current controller name
	 */
	currentController: null,
	/**
	 * Current controller object
	 */
	controller: null,
	/**
	 * Global methods shared across all controllers
	 */
	controllerMethods: {},
	/** 
	 * Load Controller callback
	 *
	 * This can be defined when calling SiMpVC.loadController()
	 * and passing the callback as the second parameter. If the callback
	 * is defined, it will be called immediately after the view is displayed
	 */
	controllerCallback: null,
	/**
	 * Current model object
	 */
	model: null,
	/**
	 * Global methods shared across all controllers
	 */
	modelMethods: {},
	/**
	 * Current view before template vars are parsed
	 */
	view: null,
	viewStates: {},
	/**
	 * Current view after template vars are parsed,
	 * null if rendering has not occured for this view yet
	 */
	renderedView: null,
	/**
	 * All loaded controllers
	 */
	controllers: {},
	/**
	 * All Loaded models
	 */
	models: {},
	/**
	 * All loaded views before templates vars are parsed
	 */
	views: {},
	
	init: function() {
		
		SiMpVC.log('Initializing SiMpVC');
		
		this.loadController('index');		
		
	},
	
	controllerTrigger: function() {

		SiMpVC.log('Binding triggers');
		
		// Unbind any previous clicks before binding again
		$(document).unbind('click').on('click', '.trigger', function(e) {
								
			e.preventDefault();
			e.stopPropagation();
			
			// Make sure we have an action to handle
			if(!$(this).is('[data-action]') || !$(this).data('action')) {
				SiMpVC.log('You must define the "data-action" attribute on any elements given the "trigger" class', 'Error: undefined data-action attribute', 'error');	
				return;
			}
			
			// Get the action name
			var actionName = $(this).data('action');
					
			// Get the event data
			var data = $(':input[data-action*=' + actionName + ']').serializeObject();

			// Does this event have an identifier?
			if(actionName.indexOf('_') != -1) {
				var actionSplit = actionName.split('_');
				actionName = actionSplit[0];
				data.key = actionSplit[1];
			}
			
			SiMpVC.log(data, 'Action name - ' + actionName);
			
			// Fire the action
			SiMpVC.fireAction(actionName, data);
			
		});
		
	},
	
	fireAction: function(action, data) {
		var caller = SiMpVC.controllers[SiMpVC.currentController][action];
		if(typeof caller == 'function') {
			SiMpVC.controllers[SiMpVC.currentController][action](data);
		} else {
			SiMpVC.log('Please define the "' + action + '" function in the "' + SiMpVC.currentController + '" controller', 'Error: undefined action', 'error');	
		}
	},
	
	/**
	 * Load a controller
	 *
	 * This will load the specified controllers model, view and
	 * controller files. Once all 3 are loaded, the models init method will be
	 * called. The init method may return a deferred object or array of deferred
	 * object to wait for. Or nothing. Once all deferred objects are resolved
	 * from the model.init method. The controller.init method will execute
	 * followed immediately by the rendering and display of the view.
	 *
	 * It's important to note if any ajax data is required before the view
	 * is rendered and displayed, it should be requested in one of the
	 * deferred objects returned from the model.init method.
	 *
	 * @param arg1(required) <string|object> The controller name or an object containing 
	 *     the loadController options.
	 *     Options Available:
	 *     - name(required): the controller name to load
	 *     - callback: a cotroller callback to be called at the end of controller init
	 *     - loadInto: the jquery selector to load the controller into
	 *     - renewView(default false): Whether to load the saved state of a previously loaded view or 
	 *       renew view with the defined vars in the model
	 */
	loadController: function () {

		// If first arg is object, then pull controllerName and callback and set opts
		if(typeof arguments[0] == 'object') {
			var opts = arguments[0];
			var callback = opts.callback;
			var controllerName = opts.name;
		// otherwise arg 1 should be controller name and arg 2 the controller callback
		} else {
			var controllerName = arguments[0];
			var callback = arguments[1];
			var opts = {};
		}
		
		// Make sure we have a controller to laod
		if(typeof controllerName != 'string') {
			SiMpVC.log('A controller name must be defined as the first parameter', 'undefined controllerName', 'error');	
		}
		
		SiMpVC.log('Load controller ' + controllerName);
		
		// Set the current controller
		SiMpVC.currentController = controllerName;

		// Set controllerCallback function if exits
		if(typeof callback != 'undefined') SiMpVC.controllerCallback = callback;
		
		// Load the model, view and controllers objects, once completed, execute the model init method
		SiMpVC.whenCompleted(SiMpVC.getModel(controllerName), SiMpVC.getController(controllerName), SiMpVC.getView(controllerName), function() {
						
			// Execute model init function
			// This allows us to wait on ajax requests ran from within the model.init method
			// Simply return the deferred ajax request from within the init method
			// or even an array of deferred objects will work
			// Once all are resolved/rejected, then the callback will be executed
			// Then the controller init method will run	and the view will be displayed
			SiMpVC.whenCompleted(SiMpVC.model.init(), function() {
			
				// Call the required controller init method
				SiMpVC.log('Initializing ' + controllerName + ' controller');
				
				// If a controller init method returns false, then cancel controller rendering
				if(SiMpVC.controller.init(SiMpVC.controller) === false) return;

				// Display the view
				SiMpVC.displayView({
					isController: true,
					view: SiMpVC.renderView(SiMpVC.view, SiMpVC.get()),
					loadInto: opts.loadInto ? opts.loadInto : SiMpVC.defaultLoadInto,
					renewView: opts.renewView ? true : false,
					callback: callback
				});
				
			});
		});
	
	},
	
	getView: function(name, loadInto, vars, callback) {
		
		// Store the url to request
		var url = name;
		// Rewrite / to _ to allow sub dirs
		name = name.replace('/', '_');
		
		SiMpVC.log('Loading view ' + url);
		
		// Get the view
		return $.ajax({
			url: 'views/'+url+'.html',
			cache: !SiMpVC.debug
		}).done(function(data, textStatus, jqXHR) {

			// Prepare the view template
			var ret = SiMpVC.views[name] = SiMpVC.template(data);
			
			// If this is the current controller, then store as the current view
			if(SiMpVC.currentController == name) {
			
				SiMpVC.view = ret;
			
			// Otherwise we are just loading a view 
			// so we should render it and display it
			} else {

				SiMpVC.displayView({
					isController: false,
					view: SiMpVC.renderView(ret, vars),
					loadInto: loadInto,
					callback: callback
				});
			}
			
		}).fail(function(jqXHR, textStatus, errorThrown) {

			// View was not found
			SiMpVC.log('The ' + name + ' view does not exist', 'Error: undefined view', 'error');
			if(typeof fail == 'function') fail(jqXHR, textStatus, errorThrown);

		}).always(function(data, textStatus, jqXHR) {

			if(typeof always == 'function') always(data, textStatus, jqXHR);
		});
	},
	
	renderView: function (view, vars) {
	
		var isController = typeof view == 'undefined';
		var view = (typeof view != 'undefined' ? view : SiMpVC.view);
		var vars = (typeof vars != 'undefined' ? vars : SiMpVC.model.vars);
		
		if(isController) SiMpVC.log('Rendering view for ' + SiMpVC.currentController + ' controller');
		
		// Render the view and store it temporarilly for display
		SiMpVC.renderedView = $('<div class="' + SiMpVC.currentController + '-rendered-wrap" />').html(view(vars));
		
		// Call afterRender hook if is controller
		if(isController) SiMpVC.controller.afterRender(SiMpVC.renderedView);
		
		// Return the rendered view
		return SiMpVC.renderedView;
		
	},

	displayView: function (opts) {

		var view = (typeof opts.view != 'undefined' ? opts.view : SiMpVC.renderedView);
		var loadInto = (typeof opts.loadInto != 'undefined' ? opts.loadInto : SiMpVC.controller.loadInto);
		
		if(opts.isController) {
			
			SiMpVC.log('Displaying view for ' + SiMpVC.currentController + ' controller');
			
			// If not renewing view state and previous view state exists, load previous
			if(!opts.renewView && typeof SiMpVC.viewStates[SiMpVC.currentController] != 'undefined') {
				view = SiMpVC.viewStates[SiMpVC.currentController];
				console.log('load cached state');
				console.log(view);
			} else {				
				// Cache previous view state
				SiMpVC.viewStates[SiMpVC.currentController] = view;
				console.log('cache state');
				console.log(view);
			}
		}
		
		SiMpVC.displayViewAnimation({
			view: view,
			loadInto: loadInto,
			complete: function() {
	
				// Setup trigger
				SiMpVC.controllerTrigger();
		
				// Call afterDisplay method if this is a controller view
				if(opts.isController) SiMpVC.controller.afterDisplay(SiMpVC.renderedView);
				
				// Execute callback
				if(typeof opts.callback == 'function') opts.callback(SiMpVC.controller);
			}
		});
	},
	
	/**
	 * The animation to use when loading a view
	 *
	 * This method may be rewritten to easily define a custom
	 * animation.
	 *
	 *
	 * @param opts <object>
	 * - view(required) - A rendered view using the SiMpVC.template method
	 *     or using underscores _.template mathod. Since they are the
	 *     same function, either will work fine.
	 *
	 * - loadInto - The target to load the view into. This will default to
	 *     SiMpVC.defaultLoadInto, but any valid jQuery selector will work.
	 *
	 * - complete - A callback function to be called once the animation
	 *     is completed and the view is displayed. The view will be passed
	 *     into the callback as a parameter
	 */
	displayViewAnimation: function(opts) {

		// Make sure we have a view
		if(typeof opts.view == 'undefined') {
			SiMpVC.log('Undefined view property', 'view property required', 'error');
			return;
		}
		
		// If we dont have a loadInto prop, use default
		if(typeof opts.loadInto == 'undefined') opts.loadInto = SiMpVC.defaultLoadInto;
		
		// Append the rendered view
		$(opts.loadInto).fadeOut(function() {
			$(this).empty().append( opts.view ).fadeIn(function() {
				// Execute callback if defined
				if(typeof opts.complete != 'undefined') opts.complete( opts.view );
			});
		});
	},
		
	createController: function(name, props) {
		
		var defaults = {
			loadInto: SiMpVC.defaultLoadInto,
			init: function() {},
			/**
			 * Use this hook to modify the DOM after temmplate vars have been parsed
			 * but before it has been shown to the user
			 */
			afterRender: function(renderedView) {},
			/**
			 * Use this to modify the DOM after it has been displayed to the user
			 */
			afterDisplay: function(displayedView) {}
		};
		
		$.extend(defaults, SiMpVC.controllerMethods, props);
		
		return window[name+'Controller'] = defaults;
	},
	
	getController: function(name, always) {
		
		SiMpVC.log('Loading controller ' + name);
		
		return $.ajax({
			url: 'controllers/'+name+'.js',
			dataType: 'script',
			cache: !SiMpVC.debug
		}).always(function(e) {
		
			// Cache the loaded controller if its defined, otherwise create a default controller	
			SiMpVC.controllers[name] = ( typeof window[name + 'Controller'] === 'object' ) ? window[name + 'Controller'] : SiMpVC.createController(name); 
				
			// If this is the current loaded controller, then store as the current controller
			if(SiMpVC.currentController == name) SiMpVC.controller = SiMpVC.controllers[name];

			// Execut callback
			if(typeof always != 'undefined') always(SiMpVC.controllers[name]);	
								
		});
					
	},

	createModel: function(name, props) {
		
		var defaults = {
			/**
			 * Defines if the model has been initialized yet
			 */ 
			initialized: false,
			/**
			 * Template vars used in parsing the view
			 */
			vars: {},
			init: function() {
				SiMpVC.models[name].initialized = true;
			}
		};
		
		$.extend(defaults, SiMpVC.modelMethods, props);
		
		return window[name+'Model'] = defaults;
	},

	getModel: function(name, callback) {
		
		SiMpVC.log('Loading model ' + name);
		
		return $.ajax({
			url: 'models/'+name+'.js',
			dataType: 'script',			
			cache: !SiMpVC.debug
		}).always(function(e) {

			// Cache the loaded controller if its defined, otherwise create a default controller	
			SiMpVC.models[name] = ( typeof window[name + 'Model'] === 'object' ) ? window[name + 'Model'] : SiMpVC.createModel(name); 

			// If this is the current loaded controller, then store as the current model
			if(SiMpVC.currentController == name) SiMpVC.model = SiMpVC.models[name];

		});
			
	},	
	/**
	 * Sets a value on the current model
	 *
	 * If a model is defined, then the var will be set on the
	 * specified model instead of the current model
	 *
	 * @return <mixed> The value just passed in - Useful for setting values on the fly
	 */
	set: function(name, val, model) {
		if(typeof name == 'undefined') {
			SiMpVC.log('The name of the value being set must be defined', 'undefined "name" param', 'error');
			return;
		}
		if(typeof model == 'undefined') {
			return SiMpVC.model.vars[name] = val;
		} else {
			return SiMpVC.models[model].vars[name] = val;
		}
	},	
	/**
	 * Gets a value from the current model or the specified model
	 *
	 * If name is === null or undefined, the whole var object for the model will be returned
	 */ 
	get: function(name, model) {
		if(name === null || typeof name === 'undefined') {
			var ret = SiMpVC.model.vars;
		} else if(typeof model == 'undefined') {
			var ret = SiMpVC.model.vars[name];
		} else {
			var ret = SiMpVC.models[model].vars[name];
		}
		return typeof ret == 'undefined' ? false : ret;	
	},	
	/**
	 * Execute a callback after all deferred objects have resolved OR rejected
	 *
	 * This fixes the issue with jquerys $.when().then()/always() methods
	 * This will allow you to run the callback completely after all deferred
	 * request objects have been completed. Whether they they fail or succeed.
	 *
	 * jsfiddle showing the issue with jquery default usage - http://jsfiddle.net/zZsxV/
	 * jsfiddle showing the solutions with the custom when method - http://jsfiddle.net/zZsxV/2/
	 *
	 * Thanks to @freakish on http://stackoverflow.com/users/645551/freakish
	 * for his help on this here - http://stackoverflow.com/questions/16780286/jquery-ajax-deferred-callback-orders
	 *
	 */
	whenCompleted: function() {
		// If this is an array then apply array as seperate args to whenCompelted
		if($.isArray(arguments[0])) {
			arguments[0].push(arguments[1]);
			SiMpVC.whenCompleted.apply(SiMpVC.whenCompleted, arguments[0]);
		} else {
			var args = Array.prototype.slice.call(arguments, 0);
			var callback = args.pop();
			var all = [];
			if(typeof callback == 'function') {
				$.each(args, function(index, def) {
					// If def is undefined, then make it a deferred object that resolves
					if(typeof def == 'undefined' || (!def.promise)) def = $.Deferred().resolve();
					def.always(function() {
						var idx = all.indexOf(def);
						if (idx !== -1) {
							all.splice(idx, 1);
						}
						if (!all.length) {
							callback();
						}
					});
					all.push(def);
				});
			}
		}
	},
	
	// By default, Underscore uses ERB-style template delimiters, change the
	// following template settings to use alternative delimiters.
	templateSettings: {
		evaluate    : /<%([\s\S]+?)%>/g,
		interpolate : /<%=([\s\S]+?)%>/g,
		escape      : /<%-([\s\S]+?)%>/g
	},
	// JavaScript micro-templating, similar to John Resig's implementation.
	// Underscore templating handles arbitrary delimiters, preserves whitespace,
	// and correctly escapes quotes within interpolated code.
	template: function(text, data, settings) {
		
		// When customizing `templateSettings`, if you don't want to define an
		// interpolation, evaluation or escaping regex, we need one that is
		// guaranteed not to match.
		var noMatch = /(.)^/;
		
		// Certain characters need to be escaped so that they can be put into a
		// string literal.
		var escapes = {
			"'":      "'",
			'\\':     '\\',
			'\r':     'r',
			'\n':     'n',
			'\t':     't',
			'\u2028': 'u2028',
			'\u2029': 'u2029'
		}
		
		var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

		var render;
		settings = $.extend(true, settings, SiMpVC.templateSettings);
		
		// Combine delimiters into one regular expression via alternation.
		var matcher = new RegExp([
			(settings.escape || noMatch).source,
			(settings.interpolate || noMatch).source,
			(settings.evaluate || noMatch).source
		].join('|') + '|$', 'g');
		
		// Compile the template source, escaping string literals appropriately.
		var index = 0;
		var source = "__p+='";
		text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
			source += text.slice(index, offset)
				.replace(escaper, function(match) { return '\\' + escapes[match]; });
			
			if (escape) {
				source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
			}
			if (interpolate) {
				source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
			}
			if (evaluate) {
				source += "';\n" + evaluate + "\n__p+='";
			}
			index = offset + match.length;
			return match;
		});
		source += "';\n";
		
		// If a variable is not specified, place data values in local scope.
		if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';
		
		source = "var __t,__p='',__j=Array.prototype.join," +
			"print=function(){__p+=__j.call(arguments,'');};\n" +
			source + "return __p;\n";
		
		try {
			render = new Function(settings.variable || 'obj', '_', source);
		} catch (e) {
			e.source = source;
			throw e;
		}
		
		if (data) return render(data, _);
		var template = function(data) {
			return render.call(this, data);
		};
		
		// Provide the compiled function source as a convenience for precompilation.
		template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';
		
		return template;
	},
	
	
};