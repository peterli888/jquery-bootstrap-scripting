/*
 * Dialog2: Yet another dialog plugin for jQuery.
 * 
 * This time based on bootstrap styles with some nice ajax control features, 
 * zero dependencies to jQuery.UI and basic options to control it.
 * 
 * Licensed under the MIT license 
 * http://www.opensource.org/licenses/mit-license.php 
 * 
 * @version: 1.0.1 (05/09/2011)
 * 
 * @requires jQuery >= 1.4 
 * 
 * @requires jQuery.form plugin (http://jquery.malsup.com/form/) >= 2.8 for ajax form submit 
 * @requires jQuery.controls plugin (https://github.com/Nikku/jquery-controls) >= 0.9 for ajax link binding support
 * 
 * @requires bootstrap styles (twitter.github.com/bootstrap) to look nice
 * 
 * @author nico.rehwaldt
 */
(function($) {
    
    /** 
     * JQuery extension to load an element without cache; 
     * just slightly modified version of original jQuery 
     * implementation
     */
    $.fn.loadWithoutCache = function( url, params, callback ) {
        // Don't do a request if no elements are being requested
        if ( !this.length ) {
            return this;
        }

        var off = url.indexOf( " " );
        if ( off >= 0 ) {
            var selector = url.slice( off, url.length );
            url = url.slice( 0, off );
        }

        // Default to a GET request
        var type = "GET";

        // If the second parameter was provided
        if ( params ) {
            // If it's a function
            if ( jQuery.isFunction( params ) ) {
                // We assume that it's the callback
                callback = params;
                params = undefined;

            // Otherwise, build a param string
            } else if ( typeof params === "object" ) {
                params = jQuery.param( params, jQuery.ajaxSettings.traditional );
                type = "POST";
            }
        }

        var self = this;

        // Request the remote document
        jQuery.ajax({
            url: url,
            type: type,
            dataType: "html",
            cache: false, 
            data: params,
            // Complete callback (responseText is used internally)
            complete: function( jqXHR, status, responseText ) {
                // Store the response as specified by the jqXHR object
                responseText = jqXHR.responseText;
                // If successful, inject the HTML into all the matched elements
                if ( jqXHR.isResolved() ) {
                    // #4825: Get the actual response in case
                    // a dataFilter is present in ajaxSettings
                    jqXHR.done(function( r ) {
                        responseText = r;
                    });
                    // See if a selector was specified
                    self.html( selector ?
                        // Create a dummy div to hold the results
                        jQuery("<div>")
                            // inject the contents of the document in, removing the scripts
                            // to avoid any 'Permission Denied' errors in IE
                            .append(responseText.replace(rscript, ""))

                            // Locate the specified elements
                            .find(selector) :

                        // If not, just inject the full result
                        responseText );
                }

                if ( callback ) {
                    self.each( callback, [ responseText, status, jqXHR ] );
                }
            }
        });

        return this;
    };
    
    /**
     * Cached functions (to be memorized for some reason)
     */
    var __removeDialog = function(event) { $(this).remove(); };
    
    /**
     * Public api for dialog2
     */
    var dialog2 = {
        close: function() {
            var dialog = $(this);
            var overlay = dialog.parents(".modal-overlay");
            
            overlay.hide();
            dialog
                .trigger("dialog2-closed")
                .removeClass("opened");
        }, 
        open: function() {
            var dialog = $(this);
            
            if (!dialog.is(".opened")) {                
                dialog
                    .trigger("dialog2-before-open")
                    .parents(".modal-overlay")
                        .show()
                        .end()
                    .addClass("opened")
                    .trigger("dialog2-opened");
            }
        }, 
        addButton: function(name, options) {          
            addDialogButton(footer, name, options);
        }, 
        removeButton: function(name) {
            var footer = $(this).parent().find(".modal-footer");
                
            footer
                .find("a.btn")
                .filter(function(i, e) { return $(e).text() == name; })
                .remove();
        }, 
        options: function(options) {
            var self = $(this);
            var handle = self.parent();
            
            if (options.title) {
                $(".modal-header h3", handle).text(options.title);
            }
            
            if (options.buttons) {
                $(".modal-footer", handle).empty();
                
                $.each(options.buttons, function(name, value) {
                    addDialogButton(self, name, value);
                });
            }
            
            handle.unbind("click");
            
            if (options.closeOnOverlayClick) {
                handle.click(function(event) {
                    if ($(event.target).is(".modal-overlay")) {
                        self.dialog2("close");
                    }
                });
            }
            
            
            if (options.content) {
                self.trigger("dialog2.before-load")
                    .loadWithoutCache(options.content, loadComplete);
            }
            
            self.unbind("dialog2-closed", __removeDialog);
            
            if (options.removeOnClose) {
                self.bind("dialog2-closed", __removeDialog);
            }
            
            if (options.autoOpen) {
                self.dialog2("open");
            }
        }
    };
    
    /**************************************************************************
     * Private utility methods                                                *
     **************************************************************************/
    
    function addDialogButton(dialog, name, options) {
        var callback = $.isFunction(options) ? options : options.click;
        
        var footer = $(dialog).parent().find(".modal-footer");

        var button = $("<a href='#' class='btn'></a>")
                            .text(name)
                            .click(function(event) {
                                callback.apply(dialog, [event]);
                                event.preventDefault();
                            });
        
        if (options.primary) {
            button.addClass("primary");
        }
        
        footer.append(button);
    };
    
    var DIALOG_HTML = "<div class='overlay modal-overlay'>" + 
        "<div class='modal' style='position: relative; top: auto; left: auto; margin: 10% auto; z-index: 1'>" + 
        "<div class='modal-header'>" +
        "<h3></h3><span class='loader'></span>" + 
        "<a href='#' class='close'></a>" + 
        "</div>" + 
        "<div class='modal-body'>" + 
        "</div>" + 
        "<div class='modal-footer'>" + 
        "</div>" + 
        "</div>" + 
        "</div>";
    
    function checkCreateDialog(element, options) {
        
        /**
         * // selector is a dialog? Does essentially nothing
         * $(".selector").dialog2();
         * 
         * // .selector known?
         * // creates a dialog wrapped around .selector
         * $(".selector").dialog2();
         * 
         * // creates a dialog wrapped around .selector with id #foo
         * $(".selector").dialog2({id: "foo"});
         * 
         * // #foo not known? Creates a new dialog with id foo
         * $("#foo").dialog2({id: "foo"});
         */
        var selection = $(element);
        var dialog;
        
        if (!selection.is(".modal-body")) {
            var overlay = $(DIALOG_HTML).appendTo("body");
            
            $(".modal-header a.close", overlay)
                .text(unescape("%D7"))
                .click(function() {
                    $(this)
                        .parents(".modal")
                        .find(".modal-body")
                            .dialog2("close");
                });
            
            dialog = $(".modal-body", overlay);
            if (!dialog.length) {
                throw new Error("No dialog");
            }
            
            // Create dialog body from current jquery selection
            // If specified body is a div element and only one element is 
            // specified, make it the new modal dialog body
            // Allows us to do something like this 
            // $('<div id="foo"></div>').dialog2(); $("#foo").dialog2("open");
            if (selection.is("div") && selection.length == 1) {
                dialog.replaceWith(selection);
                selection.addClass("modal-body");
                dialog = selection;
            }
            // If not, append current selection to dialog body
            else {
                dialog.append(selection);
            }
            
            dialog.bind("dialog2.before-load", function() {
                $(this).dialog2({ buttons: localizedCancelButton() })
                       .parent().addClass("loading");
            });
            
            dialog.bind("dialog2.load-complete", function() {
                $(this).parent().removeClass("loading")
            });
            
            if (options.id) {
                dialog.attr("id", options.id);
            }
        } else {
            dialog = selection;
        }
        
        if (!dialog.is(".modal-body")) {
            throw new Error("Dialog is not a modal dialogs body");
        }
        
        return dialog;
    };
    
    /**
     * Localizes a given key using the selected language
     */
    function localize(key) {
        return lang[key];
    };
    
    /**
     * Returns a localized cancel button
     */
    function localizedCancelButton() {
        var option = {};
        option[localize("cancel")] = function() {
            $(this).dialog2("close");
        };
        
        return option;
    };
    
    /**
     * Load complete handler function to make the whole ajax stuff work
     */
    function loadComplete() {
        var dialog = $(this);
        
        dialog.trigger("dialog2.load-complete");
        
        dialog.find("a.ajax").click(function(event) {
            var url = $(this).attr("href");
            
            event.preventDefault();
            dialog
                .trigger("dialog2.before-load")
                .loadWithoutCache(url, function(data, status, request) {
                    $(dialog).html(data);
                    loadComplete.call(dialog, data, status, request);
                });
        });

        if ($.fn.ajaxForm) {
            // Add submit = OK button to dialog2
            // if submitable form is found
            var form = $("form.ajax", dialog).ajaxForm({
                target: dialog,
                success: loadComplete,
                beforeSubmit: function() {
                    dialog.trigger("dialog2.before-load");
                }, 
                cache: false
            });

            var submit = form
                            .find("input[type=submit]")
                                .parent()
                                .hide()
                            .end();

            if (form.length > 0 && submit.length > 0) {
                dialog.dialog2("addButton", submit.attr("value"), { 
                    primary: true, click: function() {
                        form.submit();
                    }
                });
            }
        }
        
        // set title if content contains a h1 element
        var titleElement = $(dialog).find("h1").hide();
        if (titleElement.length > 0) {
            $(dialog).dialog2({title: titleElement.text()});
        }

        // Focus first focusable element in dialog
        $(dialog)
            .find("input, select, textarea, button")
                .eq(0)
                    .focus();
    };
    
    $.extend($.fn, {
        
        /**
         * options = {
         *   title: "Some title", 
         *   id: "my-id", 
         *   buttons: {
         *     "Name": Object || function   
         *   }
         * };
         * 
         * $(".selector").dialog2(options);
         * 
         * or 
         * 
         * $(".selector").dialog2("method", arguments);
         */
        dialog2: function() {            
            var args = $.makeArray(arguments);
            
            var arg0 = args.shift();
            if (dialog2[arg0]) {
                return dialog2[arg0].apply(this, args);
            } else {
                var options = {};

                if ($.isPlainObject(arg0)) {
                    options = $.extend(true, {}, $.fn.dialog2.defaults, arg0);
                }            
                
                var dialog = checkCreateDialog(this, options);
                
                $(dialog).dialog2("options", options);
                
                return dialog;
            }
        }
    });
    
    $.fn.dialog2.defaults = {
        autoOpen: true, 
        closeOnOverlayClick: true, 
        removeOnClose: true
    };
    
    $.fn.dialog2.localization = {
        "de": {
            cancel: "Abbrechen"
        }, 
        
        "en": {
            cancel: "Cancel"
        }
    };
    
    var lang = $.fn.dialog2.localization["en"];
    
    $.fn.dialog2.localization.setDefault = function(key) {
        var localization = $.fn.dialog2.localization[key];
        
        if (localization == null) {
            throw new Error("No localizaton for language " + key);
        } else {
            lang = localization;
        }
    };
    
    /**
     * Register opening of a dialog on annotated links
     * (works only if jquery.controls plugin is installed). 
     */
    if ($.fn.controls && $.fn.controls.bindings) {
        $.extend($.fn.controls.bindings, {
            "a.ajax": function() {
                $(this).click(function(event) {
                    var a = $(this);
                    
                    var options = {
                        modal: true,
                        content: a.attr("href"),
                        id: a.attr("rel"),
                        
                        buttons: localizedCancelButton()
                    };

                    if (a.hasClass("open-lazy")) {
                        options.autoOpen = false;
                    }

                    if (a.attr("title")) {
                        options.title = a.attr("title");
                    }
                    
                    $("<div></div>").dialog2(options);
                    event.preventDefault();
                });
            }
        });
    };
})(jQuery);