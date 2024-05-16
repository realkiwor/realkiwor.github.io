/* global EE, google */

function distance(location1,location2) {
        var lat1 = location1.lat;
        var lon1 = location1.lng;
        var lat2 = location2.lat;
        var lon2 = location2.lng;

        var R = 6371; // km (change this constant to get miles) 
        var dLat = (lat2-lat1) * Math.PI / 180; 
        var dLon = (lon2-lon1) * Math.PI / 180;
        var a = Math.sin(dLat/2) * Math.sin(dLat/2) + 
                Math.cos(lat1 * Math.PI / 180 ) * Math.cos(lat2 * Math.PI / 180 ) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
        var d = R * c;
        return Math.round(d*1000);
}

function midPointGeoJson(pt1, pt2) {
    return [(pt1[0] + pt2[0]) / 2, (pt1[1] + pt2[1]) / 2];
}

function addMidPointsGeoJson(bounds) {
    var newBounds = [];
    for(var i = 0, l = (bounds.length - 1); i < l; i++) {
        newBounds.push(bounds[i]);
        newBounds.push(midPointGeoJson(bounds[i], bounds[i+1]));
    }

    newBounds.push(bounds[bounds.length - 1]);

    return newBounds;
}

EE.load = {
    load: function ()
    {
        // Load the icon image
        var icons = new Image;
        icons.src = EE.defaultUrl + 'img/icons.png';

        /* TODO: Evaluate if this can be done more efficiently, such as
         *       by only loading the listeners after all the html has
         *       been rendered. $(document).ready() may already do this.*/
        // Attach the page listeners
        EE.load.attachListeners();

        // Load data sets and shopping cart
        EE.load.loadDatasets();

        //Load the users current order counts
        EE.load.loadItemBasket();
    },
    loadDatasets: function (reload)
    {
        $.ajax({
            dataType: 'html',
            method: 'get',
            url: EE.defaultUrl + 'dataset/categories'
        }).fail(function () {
            // TODO: Let the generic error handler take care of errors?
        }).done(function (html) {
            DevConsole.logMessage('system', 'Dataset categories response loaded');

            $('#dataset-container').html(html);

            $("#dataset-menu").treeview({collapsed:true});

            $('#dataset-menu .dataset_checkbox:checked').each(function()
            {
                var datasetId = $(this).closest('span.collection').attr('data-datasetId');

                // Only select parents that are the category headings and not alreayd expanded
                var $parents = $('#coll_' + datasetId).parentsUntil('#dataset-menu').filter('li.expandable');

                // Expand each collapsed category selected
                $parents.children('div.hitarea').click();
            });

            $('#use_prefilter').attr('disabled', false);
            $('#dataSetPrefilter label').removeClass('disabled');

            $('#dataSetSearch').slideDown();
            EE.load.attachTab2Listeners(reload);

            EE.dataset.loaded = true;

            // Call a callback if it is set. Currently, only EE.tabs.results.load uses this functionality.
            if (EE.dataset.onLoad != null) {
                EE.dataset.onLoad();
            }

            DevConsole.logMessage('system', 'Dataset categories processing completed');
        });
    },
    loadItemBasket: function ()
    {
        //If this isn't an authenticated user then we don't have to load anything
        if (EE.auth === false) {
            return;
        }

        $.ajax({
            dataType: 'json',
            method: 'get',
            url: EE.defaultUrl + 'order/counts'
        }).fail(function () {
            // TODO: Let the generic error handler take care of errors?
        }).done(function (json) {
            EE.bulkDownload.numberScenes = json.numBulk;
            EE.order.numberScenes = json.numOrder;

            DevConsole.logMessage('order', 'Item basket has ' + json.numBulk + ' bulk scene(s) and ' + json.numOrder + ' order scene(s)');

            $('#shoppingCartLinkNumber').text(json.numBulk + json.numOrder);
        });
    },
    attachListeners: function ()
    {
        EE.load.attachPageListeners();
        EE.load.attachTab1Listeners();

        EE.load.attachTab3Listeners();
        EE.load.attachTab4Listeners();

        EE.tabs.tabInfo.getCurrent();
    },
    attachPageListeners: function ()
    {
        // Login listener for saving criteria
        $('a.manageCriteriaLink').click(function (event)
        {
            event.preventDefault();

            var callback = function (url) {
                window.location = url;
            };

            EE.tabs.save(EE.tabs.tabInfo.getCurrent(), callback($(this).attr('href')));
        });

        // $('#optionsControl').click(function (event)
        // {
        //     var eventTarget = $(event.target);
        //     var clicked = (eventTarget.is('span')) ? eventTarget : eventTarget.parents('span');

        //     if (eventTarget.is('span')) {
        //         // Select the input for the option
        //         var $element = clicked.children('input');

        //         if ($element.attr('type') === 'checkbox') {
        //             $element.prop('checked', !$element.prop('checked'));
        //         } else if ($element.attr('type') === 'radio') {
        //             $element.prop('checked', true);
        //         }
        //     }

        //     if (clicked.hasClass('polygonTool')) {
        //         var polygonType = clicked.children('input').attr('id');

        //         // Clear the previous area of interest
        //         EE.maps.coordinates.clear();

        //         $('#areaTabs div.tab').removeClass('selected');
        //         $('#tab1data .control-container .areaForm').hide();

        //         if (polygonType === 'polygonTypePolygon') {
        //             $('#polygonType').val('polygon');

        //             $('#tabPolygon').addClass('selected');
        //             $('#tabPolygonForm').show();
        //         } else if (polygonType === 'polygonTypeCircle') {
        //             $('#polygonType').val('circle');

        //             $('#tabCircle').addClass('selected');
        //             $('#tabCircleForm').show();
        //         } else if (polygonType === 'polygonTypeShape') {
        //             $('#polygonType').val('shape');
                    
        //             $('#tabPredefinedArea').addClass('selected');
        //             $('#tabPredefinedAreaForm').show();
        //         }

        //         if (getBrowserName() === 'IE') {
        //             window.scrollBy(0,1);
        //         }
        //     } else if (clicked.hasClass('decimalFormatToggle')) {
        //         //Simulate the click on tab 1 where the logic is already built into
        //         $('#lat_lon_section input:radio[value="' + clicked.children('input').val() + '"]').click();
        //     }
        // });

        $('#clearAllCriteria').click(function () {
            EE.controls.lock();
            EE.tabs.moveToTab(1);
            EE.tabs.clearAll();
            EE.searchSummary.clear();

            // Clear the session values
            $.ajax({
                dataType: 'text',
                method: 'post',
                url: EE.defaultUrl + 'tabs/clear'
            }).fail(function () {
                // TODO: Show some error message box?
            }).done(function () {
            });

            // Set tabs 1 and 2 to active
            EE.tabs.tabInfo.setActive([1,2]);

            EE.controls.unlock();
            createGrowl('Criteria Cleared','Your search criteria has been cleared.');
        });

        $("#searchCriteriaStatus").click(function ()
        {
            EE.searchSummary.toggle();
        });

        $('#tabs div.tab, .tabButtonContainer .tabButton').click(function ()
        {
            var currentTab = EE.tabs.tabInfo.getCurrent();
            var destinationTab = $(this).data('tab');

            if (EE.tabs.tabInfo.isActive(destinationTab)) {
                EE.tabs.moveToTab(destinationTab);
                EE.tabs.save(currentTab);
            }
        });

        $('#geoTabs div.tab, #areaTabs div.tab, #dateTabs div.tab').click(function ()
        {
            //Make sure we aren't re-selected an already selected tab
            if ($(this).hasClass('selected')) {
                return;
            }
            
            if ($(this).hasClass('disabled') === false) {
            	var tabId = $(this).attr('id');

                // Clear any results or errors for the geoForm if it is a geoTab
                if ($(this).parent().attr('id') === 'geoTabs') {
                    $('#geoClear').trigger('click');
                } else if ($(this).parent().attr('id') === 'areaTabs') {
                    if (tabId === 'tabCircle') {
                        $('#polygonTypeCircle').parent().trigger('click');
                    } else if (tabId === 'tabPolygon') {
                         $('#polygonTypePolygon').parent().trigger('click');
                    } else if (tabId === 'tabPredefinedArea') {
                         $('#polygonTypeShape').parent().trigger('click');
                    }

                    //Get out of here - we will handle tab issue through the click trigger
                    return;
                }

                var $currentTab = $(this).siblings('div.selected');
                $currentTab.removeClass('selected');
                $('#' + $currentTab.attr('id') + 'Form').hide();

                var $selectedTab = $(this);
                $selectedTab.addClass('selected');
                $('#' + $selectedTab.attr('id') + 'Form').show();
            }
        });

        $('#coordUseMap').click(function ()
        {
            EE.maps.coordinates.clear();

            // Create a polygon that is the map bounds
            var mapBounds = EE.maps.map.getBounds();
            
            var center = EE.maps.map.getCenter();
            var NE = mapBounds.getNorthEast();
            var SW = mapBounds.getSouthWest();
            var NW = mapBounds.getNorthWest();
            var SE = mapBounds.getSouthEast();

            var polygon = [NE, NW, SW, SE];

            // If the map is larger than a set size, draw extra points
            if (EE.maps.map.getZoom() <= 4)
            {
                if ($('#map').width() > 1020 && EE.maps.map.getZoom() >= 3 && $('#map').width() < 2047)
                {
                    var NC = new L.LatLng(NW.lat, center.lng);
                    var SC = new L.LatLng(SW.lat, center.lng);

                    polygon = [NW, NC, NE, SE, SC, SW];
                }
                else if ($('#map').width() >= 2047)
                {
                    $.blockUI({
                        theme:     true,
                        title:    'Notice',
                        message:  '<p>Searching the entire map requires no area of interest be defined.</p>',
                        timeout:   2500
                    });

                    polygon = null;
                }
            }

            if (polygon !== null)
            {
                for (var i = 0; i < polygon.length; i++)
                {
                    EE.maps.coordinates.add(polygon[i]);
                }
            }
        });
    },
    attachTab1Listeners: function ()
    {
        // Create the DMS/DD controlgroup
        $('#lat_lon_section').controlgroup();
        $('#lat_lon_section input[name="latlonfmt"]').checkboxradio({
            icon: false
        });

        // Create the WRS controlgroup
        $('#wrsTypeSet').controlgroup();
        $('#wrsTypeSet input[name="wrsType"]').checkboxradio({
            icon: false
        });

        // Create the Feature controlgroup
        $('#featureTypeSet').controlgroup();
        $('#featureTypeSet input[name="featureType"]').checkboxradio({
            icon: false
        });

        // Create the Search Type controlgroup
        $('#searchTypeSection').controlgroup();
        $('#searchTypeSection input[name="searchTypeButton"]').checkboxradio({
            icon: false
        });

        // Handle changing the Search Type
        $('#searchTypeSection input:radio').click(function () {
            var showSearchType = $(this).val();
            var hideSearchType = ($(this).val() === 'Std') ? 'Bulk' : 'Std';

            $('#searchTypeFormElements' + hideSearchType).hide();
            $('#searchTypeFormElements' + showSearchType).show();

            if (showSearchType == 'Bulk') {
                $.ajax({
                    dataType: 'json',
                    method: 'get',
                    url: EE.defaultUrl + 'media/datasets'
                }).fail(function () {
                    // TODO: Let the generic error handler take care of errors?
                }).done(function (dataSets) {
                    var selectedDataSets = EE.dataset.getCheckedDataSets();
                    var removedDataSets = [];

                    // Uncheck any selected data sets that are not available for Bulk Search
                    for (var i = 0; i < selectedDataSets.length; i++) {
                        if (in_array(selectedDataSets[i], dataSets) === false) {
                            $('#coll_' + selectedDataSets[i]).prop('checked', false);

                            removedDataSets.push($('#collLabel_' + selectedDataSets[i]).text());
                            //OLD
                            //removedDataSets.push(EE.dataset.datasets[selectedDataSets[i]].dataset_name);
                        }
                    }

                    // Check if the number of selected data sets is now 0 and disable tabs accordingly
                    if (!EE.dataset.anyChecked()) {
                        // Set tabs 1 & 2 to active
                        EE.tabs.tabInfo.setActive([1,2]);
                    }

                    if (removedDataSets.length > 0) {
                        createGrowl('Data Sets Removed', 'Bulk Searches are not allowed for the following datasets: ' + removedDataSets.join(', ') + '.');
                    }
                });
            }
        });

        // Handle changing the world feature class
        $('#featureWorldClass').change(function () {
            if ($('#featureWorldClass').val() != '') {
                $.ajax({
                    dataType: 'json',
                    method: 'post',
                    url: EE.defaultUrl + 'geocoder/feature/types',
                    data: {
                        'feature_class': $('#featureWorldClass').val()
                    },
                    async: true,
                    cache: false,
                    success: function (json) {
                        $('#featureWorldType').empty();

                        var options = '<option value="">All</option>';
                        for (var i in json.results) {
                            options += '<option value="' + json.results[i].featureCode + '">' + json.results[i].featureName + '</option>';
                        }

                        $('#featureWorldType').html(options);
                    }
                });
            } else {
                $('#featureWorldType').html('<option value="">All</option>');
            }
        });

        $('#googleAddress, #pathAddress, #rowAddress, #featureName').keypress(function (e) {
            if (e.which === 13) {
                $('#geoShow').click();
                return false;
            }
        });

        $('#googleRow, #featureRow').click(function (event) {
            var eventTarget = $(event.target);

            if (eventTarget.hasClass('address')) {
                var row = eventTarget.parent().parent();

                // Add the coordinate
                EE.maps.coordinates.add(new L.LatLng(row.children('td.lat').html(), row.children('td.lng').html()));

                // Center on the point
                EE.maps.centerMap();

                // Clear the form
                $('#geoClear').trigger('click');
            }
        });
        
        $('#circleEntryApply').click(function()
        {
            EE.maps.circleCoder.showLocation();
        });

        $('#calvalSiteClear').click(function () {
            EE.maps.calValCoder.clear();
        });

        $('#calvalSiteShow').click(function () {
            // Switch to the Circle polygon type
            $('#polygonTypePolygon').parent().trigger('click');

            EE.maps.calValCoder.showLocation();
        });
            
        $('#geoShow').click(function () {
            var tab = $('#geocoderSelection').val();

            if (tab === 'tabAddress') {
                // Switch to the Polygon polygon type
                $('#polygonTypePolygon').parent().trigger('click');

                $('#googleAddress').val($('#googleAddress').val().trim());

                EE.maps.googleCoder.codeAddress();
            } else if (tab === 'tabPathRow') {
                // Switch to the Polygon polygon type
                $('#polygonTypePolygon').parent().trigger('click');

                EE.maps.pathrowCoder.showLocation();
            } else if (tab === 'tabFeature') {
                // Switch to the Polygon polygon type
                $('#polygonTypePolygon').parent().trigger('click');

                $('#featureName').val($('#featureName').val().trim());

                EE.maps.featureCoder.codeAddress();
            }
        });

        $('#geoClear').click(function () {
            EE.maps.googleCoder.clear();
            EE.maps.pathrowCoder.clear();
            EE.maps.featureCoder.clear();
        });

        $('#geocoderSelection').change(function()
        {
            $('#tabGeocoderForm .geocodeForm').hide();
            $('#geoClear').click();
            $('#' + $(this).val() + 'Form').show();
        });

        $('#circleEntryClear').click(function () {
            EE.maps.coordinates.clear();
            EE.maps.circleCoder.clear();
        });

        $('#coordEntryClear').click(function () {
            EE.maps.coordinates.clear();
        });

        $('#shapeAdd').click(function () {
            if ($('#shapeAddForm').length > 0) {
                $('#shapeAddForm').dialog('open');
            } else {
                $.ajax({
                    dataType: 'html',
                    method: 'get',
                    url: EE.defaultUrl + 'geocoder/boundary'
                }).fail(function () {
                    // TODO: Let the generic error handler take care of errors?
                }).done(function (response) {
                    var shapeAddFormDiv = $(document.createElement('div'));
                    shapeAddFormDiv.attr('id', 'shapeAddForm');
                    shapeAddFormDiv.html(response);

                    shapeAddFormDiv.dialog({
                        modal: true,
                        autoOpen: true,
                        resizable: false,
                        width: '400px',
                        title: 'Add Shape',
                        buttons: {
                            'Add' : function () {
                                var stateId = $('#shapeState').val() | 0;
                                var type = $('#shapeType').val();
                                var areaId = $('#shapeArea').val() | 0;

                                if (stateId <= 0 || type == "-1" || areaId <= 0) {
                                	$('#shapeAddError').html('Please select state, area type, and area.');
                                    return false;
                                }

                                EE.maps.polygon.clear();

                                // Show the name of the shape in the control
                                $('#areaShapeSection').find('.boundaryName').text($('#shapeState option:selected').text() + ' - ' +
                                                                            $('#shapeArea option:selected').text()).data('boundaryId', areaId);
                                                                                     
                                EE.maps.polygon.redraw(true);

                                $(this).dialog('close');
                            },
                            'Cancel' : function () {
                                $(this).dialog('close');
                            }
                        },
                        open: function () {
                            if (!$('#shapeAddForm').hasClass('loaded')) {

                                $('#shapeState, #shapeType').change(function () {
                                    var type  = $('#shapeType').val();
                                    var state = $('#shapeState').val() | 0;

                                    if (type == "-1" || state <= 0) {
                                        return;
                                    }

                                    $.ajax({
                                        dataType: 'json',
                                        method: 'get',
                                        url: EE.defaultUrl + 'geocoder/boundary/' + type,
                                        data: {
                                            stateId: state
                                        }
                                    }).fail(function () {
                                        // TODO: Let the generic error handler take care of errors?
                                    }).done(function (json) {
                                        if (json.length > 0) {
                                            var optionsHtml = '';

                                            for (var result in json) {
                                                optionsHtml += '<option value="' + json[result].spatial_id + '">' + json[result].short_name + '</option>';
                                            }

                                            $('#shapeArea').html(optionsHtml);
                                        }
                                    });
                                });

                                $('#shapeAddForm').addClass('loaded');
                            }
                        },
                        close: function () {
                        	$('#shapeAddError').html('');
                            //$(this).dialog('destroy');
                        }
                    });
                });
            }
        });

        $('#shapeClear').click(function () {
            // Clear the shape
            EE.maps.coordinates.clear();

            // Empty the shape element
            $('#areaShapeSection').find('.boundaryName').text('No shape loaded.');
        });

        $('#calValSiteType').change(function () {
            var type = $(this).val() | 0;

            if (type === -1) {
                // Clear out the options for Cal/Val Sites
                $('#calValSiteList').html('');
            } else {
                $.ajax({
                    dataType: 'json',
                    method: 'get',
                    url: EE.defaultUrl + 'geocoder/calval/list',
                    data: {
                        type: type
                    }
                }).fail(function () {
                    // TODO: Let the generic error handler take care of errors?
                }).done(function (json) {
                    if (json.results.length > 0) {
                        var optionsHtml = '';

                        for (var index in json.results) {
                            optionsHtml += '<option value="' + json.results[index].id + '" data-latitude="' + json.results[index].latitude + '" data-longitude="' + json.results[index].longitude + '">' + json.results[index].name + '</option>';
                        }

                        $('#calValSiteList').html(optionsHtml);
                    }
                });
            }
        });

        $('#start_linked').datepicker({
            buttonImage: EE.defaultUrl + 'img/calendar.png',
            buttonImageOnly: true,
            buttonText: 'Select start date',
            changeMonth: true,
            changeYear: true,
            closeText: 'Close',
            dateFormat: 'mm/dd/yy',
            duration: 'fast',
            showButtonPanel: true,
            showOn: 'button',
            showOtherMonths: true,
            yearRange: '1800:+20',
            beforeShow: function (input) {
                if ($(this).attr('id') === 'start_linked') {
                    $('#start_linked').datepicker('option', 'maxDate', $('#end_linked').datepicker('getDate'));
                }
            }
        });

        $('#end_linked').datepicker({
            buttonImage: EE.defaultUrl + 'img/calendar.png',
            buttonImageOnly: true,
            buttonText: 'Select end date',
            changeMonth: true,
            changeYear: true,
            closeText: 'Close',
            dateFormat: 'mm/dd/yy',
            duration: 'fast',
            showButtonPanel: true,
            showOn: 'button',
            showOtherMonths: true,
            yearRange: '1800:+20',
            beforeShow: function (input) {
                if ($(this).attr('id') === 'end_linked') {
                    $('#end_linked').datepicker('option', 'minDate', $('#start_linked').datepicker('getDate'));
                }
            }
        });

        // Validate the data in case user manually entered it
        $('#start_linked, #end_linked').blur(function () {
            var dateText = $(this).val();

            // Validate the date format
            if (dateText !== '' && !/^(0?[1-9]|1?[0-2])\/(0?[1-9]|1?[0-9]|2?[0-9]|3?[0-1])\/\d{4}$/.test(dateText)) {
                alert("You entered an invalid date. Please use the format mm/dd/yyyy for dates.");

                $(this).val("");
            }

            // Validate the user did not enter an invalid range where the start is greater than the end
            if (new Date($('#start_linked').val()) > new Date($('#end_linked').val())) {
                alert("Start date cannot be greater than end date.");
                $('#end_linked').val(new Date($('#start_linked').val()).format('m/d/Y'));
            }
        });

        $('#monthSelector').click(function () {
            if ($('#monthSelectorDropPanel').is(':visible')) {
                $('#monthSelector span.ui-icon').attr('class', 'ui-icon ui-icon-triangle-1-s');
                $('#monthSelectorDropPanel').slideUp(75);
                EE.controls.bodyListener.removeListener();
            } else {
                $('#monthSelector span.ui-icon').attr('class', 'ui-icon ui-icon-triangle-1-n');
                $('#monthSelectorDropPanel').slideDown(75);
                EE.controls.bodyListener.addListener();
            }
        });

        $('#monthSelectorDropPanel span input').click(function () {
            $(this).parent().click();
        });

        $('#monthSelectorDropPanel span').click(function () {
            var $element = $(this).children('input');
            var selected = $element.prop('checked');
            var monthBoxesLength = document.monthForm.monthBoxes.length;

            if ($element.val() == '') {
                var allSelected = !$element.prop('checked');

                // The user is clicking (all) so check/uncheck them all
                for (var i = 0; i < monthBoxesLength; i++) {
                    document.monthForm.monthBoxes[i].checked = allSelected;
                }

                if (allSelected) {
                    $('#monthSelector span.text').html('(all)');
                } else {
                    $('#monthSelector span.text').html('(none)');
                }
            } else {
                var months = ['(all)', 'January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];

                $element.prop('checked', !selected);

                var selected = [];

                // Determine if all are selected
                for (var i = 1; i < monthBoxesLength; i++) {
                    if (document.monthForm.monthBoxes[i].checked === true) {
                        selected.push(i);
                    }
                }

                if (selected.length === 0) {
                    $('#monthSelector span.text').html('(none)');
                } else {
                    document.monthForm.monthBoxes[0].checked = (selected.length === (monthBoxesLength - 1));

                    if (document.monthForm.monthBoxes[0].checked === true) {
                        $('#monthSelector span.text').html('(all)');
                    } else {
                        var monthsChecked = [];

                        for (var i = 0; i < selected.length; i++) {
                            monthsChecked.push(months[selected[i]]);
                        }

                        $('#monthSelector span.text').html(monthsChecked.join(", "));
                    }
                }
            }
        });

        $("#cloudCoverSlider").slider({
            range: true,
            min: 0,
            max: 100,
            values: [$('#cloudCoverSlider').attr('data-defaultMin'), $('#cloudCoverSlider').attr('data-defaultMax')],
            slide: function( event, ui ) {
                $("#cloudCoverRange").text(ui.values[0] + "% - " + ui.values[1] + '%');
            }
        });

        $("#cloudCoverRange").text($("#cloudCoverSlider").slider("values", 0) + "% - " + $("#cloudCoverSlider").slider("values", 1) + '%');

        $('#lat_lon_section input:radio').click(function () {
            EE.maps.settings.format = $(this).val();

            var showFormat = $(this).val();
            var hideFormat = ($(this).val() === 'dd')? 'dms' : 'dd';

            EE.maps.gridOverlay.redraw();

            $('.decimalFormatToggle input:radio[value="' + showFormat + '"]').prop('checked', true);
            $('.decimalFormatToggle input:radio[value="' + hideFormat + '"]').prop('checked', false);
            
            $('#coordEntryArea').find('div.format_' + hideFormat).hide();
            $('#coordEntryArea').find('div.format_' + showFormat).show();
        });

        $('#featureTypeSet input:radio').click(function () {
            var showFeatureType = $(this).val();
            var hideFeatureType = ($(this).val() == 'US')? 'World' : 'US';

            $('#featureFormElements' + hideFeatureType).hide();
            $('#featureFormElements' + showFeatureType).show();
        });

        $('#coordEntryAdd').click(function () {
            if (EE.maps.coordinateList.length >= EE.maps.settings.maxPoints) {
                $.blockUI({
                    theme:     true,
                    title:    'Maximum Number of Points Exceeded',
                    message:  '<p>You may only add ' + EE.maps.settings.maxPoints + ' points to the map.</p>',
                    timeout:   4000
                });

                return;
            }

            // Don't let them add any more points - 2 in enough for a circle
            if ($('#polygonType').val() === 'circle' && EE.maps.coordinateList.length >= 2) {
                $.blockUI({
                    theme:     true,
                    title:    'Warning',
                    message:  '<p>Circles are limited to 2 points. Please clear your coordinates to draw a new circle.</p>',
                    timeout:   4000
                });

                return;
            }

            $('#coordEntryDialogArea').dialog({
                bgiframe: true,
                autoOpen: false,
                resizable: false,
                height: 140,
                width: 400,
                modal: true,
                buttons: {
                    'Add' : function () {
                        var error = '';
                        var response;
                        var format = EE.maps.settings.getFormat();
                        var latitude, longitude, response;

                        var $dialogContent = $('#coordEntryDialogArea');

                        if (format === 'dd') {
                            latitude = $dialogContent.find('input.latitude').val();
                            longitude = $dialogContent.find('input.longitude').val();

                            response = validateDialogInput(latitude, longitude, format);

                            // Make sure the input is numeric
                            if (response.valid) {
                                EE.maps.coordinates.add(new L.LatLng(latitude, longitude));
                            } else {
                                error = response.message;
                            }
                        } else {
                            latitude = ['', '', '', ''];
                            longitude = ['', '', '', ''];

                            latitude[0] = $dialogContent.find('input.degreesLat').val();
                            latitude[1] = $dialogContent.find('input.minutesLat').val();
                            latitude[2] = $dialogContent.find('input.secondsLat').val();
                            latitude[3] = $dialogContent.find('select.directionLat').val();
                            longitude[0] = $dialogContent.find('input.degreesLng').val();
                            longitude[1] = $dialogContent.find('input.minutesLng').val();
                            longitude[2] = $dialogContent.find('input.secondsLng').val();
                            longitude[3] = $dialogContent.find('select.directionLng').val();

                            response = validateDialogInput(latitude, longitude, format);

                            if (response.valid) {
                                var latitudeDec = convertDMSToDec(latitude);
                                var longitudeDec = convertDMSToDec(longitude);

                                EE.maps.coordinates.add(new L.LatLng(latitudeDec, longitudeDec));
                            } else {
                                error = response.message;
                            }
                        }

                        if (error.length < 1) {
                            $(this).dialog('close');
                        } else {
                            alert('Error: ' + error);
                        }

                        // Center the map on the new polygon
                        EE.maps.centerMap();
                    },
                    'Cancel' : function () {
                        $(this).dialog('close');
                    }
                },
                title: 'Add New Coordinate',
                open: function () {
                    var $dialogContent = $('#coordEntryDialogArea');

                    if (EE.maps.settings.getFormat() === 'dd') {
                        $dialogContent.html($('#coordEntryDialogTemplate div.dd').html());
                    } else {
                        $dialogContent.html($('#coordEntryDialogTemplate div.dms').html());
                    }
                },
                close: function () {
                    $(this).dialog('destroy');
                }
            });

            $('#coordEntryDialogArea').dialog('open');
        });

        $('#coordEntryArea').click(function (event) {
            var eventTarget = $(event.target);
            var clicked = (eventTarget.is('a'))? eventTarget : eventTarget.parents('a');

            if (clicked.attr('class') !== undefined) {
                var index = clicked.attr('id').split('_')[1] | 0;

                if (clicked.hasClass('edit')) {
                    $('#coordEntryDialogArea').dialog({
                        bgiframe: true,
                        autoOpen: false,
                        resizable: false,
                        height: 140,
                        width: 400,
                        modal: true,
                        buttons: {
                            'Save' : function () {
                                var error = '';
                                var response;
                                var format = EE.maps.settings.getFormat();
                                var latitude, longitude, response;

                                var $dialogContent = $('#coordEntryDialogArea');

                                if (format === 'dd') {
                                    latitude = $dialogContent.find('input.latitude').val();
                                    longitude = $dialogContent.find('input.longitude').val();

                                    response = validateDialogInput(latitude, longitude, format);

                                    // Make sure the input is numeric
                                    if (response.valid) {
                                        EE.maps.coordinates.update(index, new L.LatLng(latitude, longitude));
                                    } else {
                                        error = response.message;
                                    }
                                } else {
                                    latitude = ['', '', '', ''];
                                    longitude = ['', '', '', ''];

                                    latitude[0] = $dialogContent.find('input.degreesLat').val();
                                    latitude[1] = $dialogContent.find('input.minutesLat').val();
                                    latitude[2] = $dialogContent.find('input.secondsLat').val();
                                    latitude[3] = $dialogContent.find('select.directionLat').val();
                                    longitude[0] = $dialogContent.find('input.degreesLng').val();
                                    longitude[1] = $dialogContent.find('input.minutesLng').val();
                                    longitude[2] = $dialogContent.find('input.secondsLng').val();
                                    longitude[3] = $dialogContent.find('select.directionLng').val();

                                    response = validateDialogInput(latitude, longitude, format);

                                    if (response.valid) {
                                        var latitudeDec = convertDMSToDec(latitude);
                                        var longitudeDec = convertDMSToDec(longitude);

                                        EE.maps.coordinates.update(index, new L.LatLng(latitudeDec, longitudeDec));
                                    } else {
                                        error = response.message;
                                    }
                                }

                                if (error.length < 1) {
                                    $(this).dialog('close');
                                } else {
                                    alert('Error: ' + error);
                                }

                                // Center the map on the new polygon
                                EE.maps.centerMap();
                            },
                            'Cancel' : function () {
                                $(this).dialog('close');
                            }
                        },
                        title: 'Edit Coordinate #' + (index + 1).toString(),
                        open: function () {
                            var $dialogContent = $('#coordEntryDialogArea');
                            var latitude = EE.maps.coordinateList[index].lat.toFixed(EE.coordinatePrecision);
                            var longitude = EE.maps.coordinateList[index].lng.toFixed(EE.coordinatePrecision);

                            if (EE.maps.settings.getFormat() === 'dd') {
                                $dialogContent.html($('#coordEntryDialogTemplate div.dd').html());

                                $dialogContent.find('input.latitude').val(latitude);
                                $dialogContent.find('input.longitude').val(longitude);
                            } else {
                                $dialogContent.html($('#coordEntryDialogTemplate div.dms').html());

                                var dmsLatitude = convertDecToDMS(latitude, 'lat', false);
                                var dmsLongitude = convertDecToDMS(longitude, 'lng', false);

                                latitude = dmsLatitude.split(' ');
                                longitude = dmsLongitude.split(' ');

                                $dialogContent.find('input.degreesLat').val(latitude[0]);
                                $dialogContent.find('input.minutesLat').val(latitude[1]);
                                $dialogContent.find('input.secondsLat').val(latitude[2]);
                                $dialogContent.find('select.directionLat').val(latitude[3]);
                                $dialogContent.find('input.degreesLng').val(longitude[0]);
                                $dialogContent.find('input.minutesLng').val(longitude[1]);
                                $dialogContent.find('input.secondsLng').val(longitude[2]);
                                $dialogContent.find('select.directionLng').val(longitude[3]);
                            }
                        },
                        close: function () {
                            //$('#coordEntryDialogContainer_' + elementNum).hide();
                            $(this).dialog('destroy');
                        }
                    });
                    $('#coordEntryDialogArea').dialog('open');
                } else if (clicked.hasClass('delete')) {
                    EE.maps.coordinates.remove(index);

                    // Check if this was the last element
                    if ($('#coordEntryArea li').not('#coordinateElementEmpty').length === 0)
                    {
                        $('#coordinateElementEmpty').show();
                    }
                }
            }
        });

        $("#coordEntryArea").sortable({
            opacity: 0.8,
            axis: 'y',
            items: 'li:not(:first)',
            update: function (event, ui)
            {
                var order = $('#coordEntryArea').sortable('toArray');
                var pos = 0;

                // Locate the first location a change takes place
                for (var i = 0; i < order.length; i++) {
                    if (parseInt(order[i].split('_')[1],10) !== i) {
                        pos = i;
                        break;
                    }
                }

                var temp = [];

                // Push the coordinates into a temporary array for the new order
                for (var i = 0; i < order.length; i++) {
                    temp.push(EE.maps.coordinateList[parseInt(order[i].split('_')[1],10)]);
                }

                // Set the coordinateList to the temporary list
                EE.maps.coordinateList = temp;

                // Remove the coordinate elements after the change, inclusive
                EE.maps.coordinateElements.splice(pos, (temp.length - pos));

                // Starting from the first change, update all elements after
                for (var j = pos; j < temp.length; j++) {
                    // Add the coordinate element
                    EE.maps.coordinateElements.add(j);

                    // Update the marker
                    EE.maps.markers.update(j);
                }

                // Redraw the polygon
                EE.maps.polygon.redraw();
            }
        });
        $("#coordEntryArea").disableSelection();
        
        $('#resultsPerPageSave').click(function ()
        {
            if ($('#resultsPerPageSave').hasClass('disabled')) {
                return;
            }
            
            $('#response').html('');

            $.ajax({
                dataType: 'json',
                method: 'POST',
                data: {
                    resultsPerPage: $('#resultsPerPageSelect').val(),
                    operation     : 'save'
                },
                url: EE.defaultUrl + 'settings/saveresultsperpage'
            }).fail(function (jqXHR, textStatus, errorThrown) {
//                $('#response').html('<div class="alert alert-danger" style="margin: 12px 5px 0 5px;">Fail to save<br /></div>');
                  $('#response').html('<div class="alert alert-danger" style="margin: 10px 5px 0 5px;"><strong>' + jqXHR.status + ' ' + errorThrown + '</strong>');

            }).done(function (json) {
                if (json.error) {
                    $('#response').html('<div class="alert alert-danger" style="margin: 12px 5px 0 5px;">' + json.error + '</div>');
                } else {
                    $('#response').html('<div class="alert alert-success" style="margin: 12px 5px 0 5px;">Your setting has been saved<br /></div>');
                }
            });

        });       
    },
    attachTab2Listeners: function (reload)
    {
        if (reload === true) {
            $('#dataset-container').unbind('click');
        }

        $('#dataset-container').click(function (event)
        {
            var eventTarget = $(event.target);
            var isChecked = null;

            if (eventTarget.is('strong')) {
                eventTarget = eventTarget.parent();
            }

            if (eventTarget.hasClass('categoryHitArea')) {
                eventTarget.parent().trigger('click');
            }

            if (eventTarget.is('div')) {
                eventTarget = eventTarget.parent();
            }

            if (eventTarget.is('input')) {
                var id = eventTarget.attr("id").replace(/coll_/g, '');
                var activeTabs;

                if (eventTarget.prop('checked')) {
                    // Make sure all tabs are active
                    EE.tabs.tabInfo.setActive([1,2,3,4]);

                    // Remove disabled class from tab buttons
                    $('#tab1data, #tab2data').find('input.tabButton').removeClass('disabled');

                    // If the data set is commercial, check for notification
                    if (eventTarget.attr('data-notify') === 'Y') {
                        $.ajax({
                            dataType: 'json',
                            method: 'POST',
                            url: EE.defaultUrl + 'dataset/notification',
                            data: {
                                dataset_id: id
                            },
                            async: true,
                            cache: false,
                            success: function (json) {
                                // Only display the message if something came back
                                if (json.success) {
                                    $(json.message).dialog({
                                        modal: true,
                                        autoOpen: true,
                                        resizable: false,
                                        width: '640px',
                                        title: 'Data Set Message',
                                        buttons: {
                                            'OK': function () {
                                                eventTarget.removeAttr('data-notify');
                                                var $dialog = $(this);

                                                $.ajax({
                                                    dataType: 'json',
                                                    method: 'POST',
                                                    url: EE.defaultUrl + 'dataset/notification',
                                                    data: {
                                                        dataset_id: id,
                                                        operation: 'accept'
                                                    },
                                                    async: true,
                                                    cache: false,
                                                    success: function (json) {
                                                        // Only display the message if something came back
                                                        if (json.success) {
                                                            $dialog.dialog('destroy');
                                                        }
                                                    }
                                                });
                                            },
                                            'Cancel': function () {
                                                $(this).dialog('close');
                                            }
                                        },
                                        close: function () {
                                            $('#coll_' + id).prop('checked', false);

                                            if (EE.dataset.anyChecked() === false) {
                                                // De-activate tabs 3 and 4
                                                EE.tabs.tabInfo.setActive([1,2]);
                                            }

                                            $(this).dialog('destroy');
                                        }
                                    });
                                }
                            }
                        });
                    }
                } else {
                    eventTarget.closest('.collection').attr('data-resultPage', 1);
                    //OLD
                    //EE.dataset.datasets[id].pageNum = 1;

                    if (EE.dataset.anyChecked() === false) {
                        // Only tabs 1 and 2 should be active
                        EE.tabs.tabInfo.setActive([1,2]);

                        // Add disabled class from tab buttons
                        $('#tab1data, #tab2data').find('input.tabButton').not('input[data-tab="2"]').addClass('disabled');
                    }
                }
            } else if (eventTarget.hasClass('coverageSelector')) {
            	if (eventTarget.data('overlayOn') === undefined || eventTarget.data('overlayOn') === false) {
                    eventTarget.css('background-color', eventTarget.attr('data-overlayColor'));
                    eventTarget.data('overlayOn', true);

                    // Reduce the opacity of the icon so the background color is more prevalent
                    eventTarget.children('div.ee-icon').css('opacity', '0.5');

                    if (typeof eventTarget.data('coverageOverlay') === 'undefined') {
                        $.ajax({
                            dataType: 'json',
                            method: 'get',
                            url: EE.defaultUrl + 'dataset/coverage',
                            data: {
                                datasetName: eventTarget.closest('.collection').attr('data-datasetAlias')
                            }
                        }).fail(function () {
                            // TODO: Let the generic error handler take care of errors?
                        }).done(function (json) {
                            if (json.error) {
                                createGrowl('Coverage Map Unavailable', json.message);
                                return;
                            }

                            if (json.geoJson === null) {
                                createGrowl('Coverage Map Unavailable', 'Could not find coverage map');
                                return;
                            }

                            var options = {
                                color: eventTarget.attr('data-overlayColor'),
                                opacity: 0.8,
                                weight: 2,
                                fillColor: eventTarget.attr('data-overlayColor'),
                                fillOpacity: 0.5,
                                clickable: false,
                                pane: 'coveragePane'
                            };

                            eventTarget.data('coverageOverlay', new L.geoJSON(json.geoJson, options).addTo(EE.maps.map));
                            eventTarget.data('coverageBounds', eventTarget.data('coverageOverlay').getBounds());

                            if ($('#optionAutoCenter').is(':checked')) {
				                EE.maps.map.fitBounds(eventTarget.data('coverageBounds'));
                            }
                        });
                    } else {
                        eventTarget.data('coverageOverlay').addTo(EE.maps.map);

                        if ($('#optionAutoCenter').is(':checked') && eventTarget.data('coverageBounds') !== null) {
                            EE.maps.map.fitBounds(eventTarget.data('coverageBounds'));
                        }
                    }
            	} else if (eventTarget.data('overlayOn') === true) {
                    eventTarget.css('background-color', 'transparent');
                    eventTarget.data('overlayOn', false);

                    // Set the opacity back to full
                    eventTarget.children('div.ee-icon').css('opacity', '1.0');

                    //Remove the overlay
                    if (eventTarget.data('coverageOverlay')) {
                        eventTarget.data('coverageOverlay').remove();
                    }
            	}
            }
        });

        if (reload === undefined) {
            $('#use_prefilter').click(function ()
            {
                EE.dataset.prefilter.run();
            });

            $('#dataSetPrefilterToggle').click(function ()
            {
                EE.dataset.prefilter.toggle();
            });

            //Auto-Complete for dataset search
            $("#dataSetSearchInput").autocomplete({
                delay: 0,
                minLength: 1,
                source: function(request, response) {
                    response(EE.dataset.getAvailableDatasets(request.term));
                },
                select: function(event, ui)
                {
                    if(ui.item.value === 'all')
                    {
                        var values = EE.dataset.getAvailableDatasets($("#dataSetSearchInput").val());
                        var notifyDatasets = [];
                        $.each(values, function()
                        {
                            if(this.value !== 'all')
                            {
                                var $datasetCheckbox = $('#coll_' + this.value);

                                if($datasetCheckbox.prop('disabled'))
                                {
                                    return false;
                                }

                                if ($datasetCheckbox.attr('data-notify') === 'Y') {
                                    notifyDatasets.push(this.value);
                                } else {
                                    //The selector is on dataset-container so create an event for the trigger
                                    $datasetCheckbox.prop('checked',true);
                                    $('#dataset-container').trigger(jQuery.Event('click',{target: '#coll_' + this.value}));

                                    //Expand the categories
                                    // Only select parents that are the category headings and not already expanded
                                    // Expand each collapsed category selected
                                    var $parents = $datasetCheckbox.parentsUntil('#dataset-menu').filter('li.expandable');
                                    $parents.children('div.hitarea').click();
                                }

                            }
                        });

                        if (notifyDatasets.length > 0) {
                            $.ajax({
                                dataType: 'json',
                                method: 'POST',
                                url: EE.defaultUrl + 'dataset/groupnotification',
                                data: {
                                    dataset_ids: notifyDatasets
                                },
                                async: true,
                                cache: false,
                                success: function (json) {
                                    // Only display the message if something came back
                                    if (json.success) {
                                        $(json.message).dialog({
                                            modal: true,
                                            autoOpen: true,
                                            resizable: false,
                                            width: '700px',
                                            maxHeight: ($(window).height() - 200),
                                            title: 'Data Sets Message',
                                            buttons: {
                                                'OK': function () {
                                                    for (let i = 0; i < notifyDatasets.length; i++) {
                                                        $('#coll_' + notifyDatasets[i]).removeAttr('data-notify');
                                                        $('#coll_' + notifyDatasets[i]).prop('checked',true);
                                                        $('#dataset-container').trigger(jQuery.Event('click',{target: '#coll_' + notifyDatasets[i]}));
                                                        //Expand the categories
                                                        // Only select parents that are the category headings and not already expanded
                                                        // Expand each collapsed category selected
                                                        var $parents = $('#coll_' + notifyDatasets[i]).parentsUntil('#dataset-menu').filter('li.expandable');
                                                        $parents.children('div.hitarea').click();
                                                    }
                                                    var $dialog = $(this);
    
                                                    $.ajax({
                                                        dataType: 'json',
                                                        method: 'POST',
                                                        url: EE.defaultUrl + 'dataset/groupnotification',
                                                        data: {
                                                            dataset_ids: notifyDatasets,
                                                            operation: 'accept'
                                                        },
                                                        async: true,
                                                        cache: false,
                                                        success: function (json) {
                                                            // Only display the message if something came back
                                                            if (json.success) {
                                                                $dialog.dialog('destroy');
                                                            }
                                                        }
                                                    });
                                                },
                                                'Cancel': function () {
                                                    $(this).dialog('close');
                                                }
                                            },
                                            close: function () {
                                                for (let i = 0; i < notifyDatasets.length; i++) {
                                                    $('#coll_' + notifyDatasets[i]).prop('checked',false);
                                                }
    
                                                if (EE.dataset.anyChecked() === false) {
                                                    // De-activate tabs 3 and 4
                                                    EE.tabs.tabInfo.setActive([1,2]);
                                                }
    
                                                $(this).dialog('destroy');
                                            }
                                        });
                                    }
                                }
                            });
                        }
                    }
                    else
                    {
                        var $datasetCheckbox = $('#coll_' + ui.item.value);

                        if($datasetCheckbox.prop('disabled'))
                        {
                            return false;
                        }

                        //The selector is on dataset-container so create an event for the trigger
                        $datasetCheckbox.prop('checked',true);
                        $('#dataset-container').trigger(jQuery.Event('click',{target: '#coll_' + ui.item.value}));

                        //Expand the categories
                        // Only select parents that are the category headings and not already expanded
                        // Expand each collapsed category selected
                        var $parents = $datasetCheckbox.parentsUntil('#dataset-menu').filter('li.expandable');
                        $parents.children('div.hitarea').click();
                    }

                    //Prevent default behavior of populating text box with value and clear the textbox
                    $("#dataSetSearchInput").val('');
                    return false;
                },
                focus: function(event,ui)
                {
                        return false;
                }
            });

            // Tab 2 forms
            $('#tab2ClearAll').click(function ()
            {
                EE.tabs.dataSets.clear();

                // Set tabs 1 & 2 to active
                EE.tabs.tabInfo.setActive([1,2]);

                // Add disabled class from tab buttons
                $('#tab1data, #tab2data').find('input.tabButton').not('input[data-tab="2"]').addClass('disabled');

                // LASTCHANGE
                //EE.tabs.tabInfo.setLastChange([2]);
            });
        }
    },
    attachTab3Listeners: function ()
    {
        $('#add-criteria-container').click(function (event) {
            var target = $(event.target);

            // Verify the click event target is a button and not some descendant
            if (target.attr('type') !== 'button') {
                // Check if an ancestor is a button (for example, the click event may have targetted an icon inside a button element)
                if (target.closest('button').length > 0) {
                    target = target.closest('button');
                } else {
                    return;
                }
            }

            var form = target.closest('form');

            // Clear all the text inputs
            form.find('input[type="text"]').val('');

            // Reset all the selects to 'All' value
            form.find('select').val('');
        });

        $('#tab3ClearAll').click(function ()
        {
            EE.tabs.additionalCriteria.clear(false);
        });

        $('#add_crit_data').on('change', function ()
        {
            EE.tabs.additionalCriteria.loadForm();
        });
    },
    attachTab4Listeners: function ()
    {
        $('#browseOpacity').slider({
            min: 0,
            max: 100,
            value: 100,
            slide: function(event,ui)
            {
                $('#browseOpacityLabel').html(ui.value + '%');
            },
            stop: function(event,ui)
            {
                for (var sceneId in EE.maps.overlays.browse) {
                    EE.maps.overlays.browse[sceneId].setOpacity($('#browseOpacity').slider('value') / 100);
                }
            }
        });

        $('#browseOpacityLabel').html($('#browseOpacity').slider('value') + '%');
        $('#browseComparison').click(function()
        {
            var url = EE.defaultUrl + 'compare/browse/';
        	if ($('#browseSceneType').val() === 'collection') {
                var collection = $('#show_search_data').val().replace(/t4_dataset_/g, '');
                var datasetName = $('#dataset-menu span.collection[data-datasetId="' + collection + '"]').attr('data-datasetAlias');
                url += '?datasetName=' + datasetName;
            }

    		window.location = url;

    	});

        $('#eulaAgreeButton').click(function()
        {
            if (!$('#eulaAgreeButton').attr('data-downloadUrl')) {
                return;
            }

            $('#eulaModal').modal('hide');

            var url = decodeURI($('#eulaAgreeButton').attr('data-downloadUrl'));
            window.open(url);
        });

        $('#tab4ControlsToggle').click( function ()
        {
                if ($('#tab4Controls').is(':visible'))
                {
                        $('#tab4Controls').slideUp('fast', function ()
                        {
                                $('#tab4ControlsToggle').css('border-width','1px');
                                $('#tab4ControlsHeading').html('Show Result Controls');
                                $('#tab4ControlsStatus span').attr('title', 'Expand Controls')
                                   .attr('class', 'ui-icon ui-icon-triangle-1-s');
                        });
                }
                else
                {
                        $('#tab4Controls').slideDown('fast', function ()
                        {
                                $('#tab4ControlsToggle').css('border-width','1px 1px 0 1px');
                                $('#tab4ControlsHeading').html('Hide Result Controls');
                                $('#tab4ControlsStatus span').attr('title','Collapse Controls')
                                   .attr('class', 'ui-icon ui-icon-triangle-1-n');
                        });
                }
        });

        $('#invalidateResultButton').click(function()
        {
            var dataSetSelected = $('#show_search_data').val().replace(/t4_dataset_/g, '');

            EE.dataset.clearResults(dataSetSelected);
        });

        $('#saveStandingRequest').click(function(){
        	if($('#polygonType').val() === 'shape')
        	{
                    $.blockUI({
                        theme:     true,
                        title:    'Incompatible AOI',
                        message:  '<p>Standing Requests cannot be submitted with predefined areas.</p>',
                        timeout:   3500,
                        baseZ: 2000
                    });

                    return;
        	}

        	window.location = EE.defaultUrl + 'subscription/create/';
        });

        // TODO: Rewrite this
        $('#search-results-container').on('click', '.excludeReset', function ()
        {
            EE.dataset.includeAllResults();
        });

        $("#showAllFootprints").click(function ()
        {
            EE.maps.footprints.showAll($(this).prop('checked'));
        });

        $("#showAllBrowse").click(function ()
        {
            EE.maps.browse.showAll($(this).prop('checked'));
        });

        $('#addAllToBulk').click(function ()
        {
            EE.bulkDownload.toggleAll($(this).prop('checked'));
        });

        $('#addAllToOrder').click(function ()
        {
            EE.order.toggleAll($(this).prop('checked'));
        });

        // Handle icon clicking
        $('#search-results-container').click(
            function(e)
            {
                var eventTarget = $(e.target);
                var clicked = (eventTarget.is('a')) ? eventTarget : eventTarget.parents('a');

                $('#search-results-container .selectedResultRow').removeClass('selectedResultRow');
                clicked.closest('tr').addClass('selectedResultRow');

                if (clicked.attr('class') !== undefined)
                {
                    $row = clicked.closest('tr');
                    if (clicked.hasClass('browse'))
                    {
                        EE.maps.browse.toggle(
                            $row.attr('data-collectionId'),
                            $row.attr('data-entityId'),
                            $row.attr('data-displayId'),
                            $row.attr('data-corner-points'),
                            $row.attr('data-result-index'),
                            clicked.attr('data-overlay-options')
                        );
                    }
                    else if (clicked.hasClass('footprint'))
                    {
                        EE.maps.footprints.toggle(
                            $row.attr('data-collectionId'),
                            $row.attr('data-entityId'),
                            $row.attr('data-corner-points'),
                            $row.attr('data-result-index'),
                            clicked.attr('data-color'),
                            clicked.attr('data-luma'),
                            clicked.attr('data-footprint-type')
                        );
                    }
                    else if (clicked.hasClass('metadata'))
                    {
                        loadMetadataDialog(clicked);
                    }
                    else if (clicked.hasClass('approximationLink'))
                    {
                        $('#resultApproximationModal').modal('show');
                    }
                    else if (clicked.hasClass('pageLink'))
                    {
                        if (clicked.hasClass('disabled'))
                        {
                            return;
                        }

                        var parts = clicked.attr('id').split('_');
                        if (parseInt(parts[0], 10) === NaN){
                            return;
                        }

                        // Remove the browse and footprints from the map
                        EE.maps.footprints.clearAll();
                        EE.maps.browse.clearAll();

                        $("#tab4data a.footprint").removeClass('selected');
                        $("#tab4data a.browse").removeClass('selected');

                        // Remove info windows from the map
                        for (var i in EE.maps.infowindowsOverlay)
                        {
                            EE.maps.infowindowsOverlay[i].close();
                        }

                        if ($('#showAllFootprints').is(':checked'))
                        {
                            EE.maps.footprints.showAll(true);
                        }

                        if ($('#showAllBrowse').is(':checked'))
                        {
                            showAll(true, 'Show Browse Overlay', 35);
                        }

                        EE.dataset.getResultPage(parts[1],parts[0]);
                    }
                    else if (clicked.hasClass('order'))
                    {
                        var entityId = $row.attr('data-entityId');
                        var collectionId = $row.attr('data-collectionId');
                        var selected = $('#search-results-container').find('tr[data-entityId="' + entityId + '"][data-collectionId="' + collectionId + '"] a.order').hasClass('selected');

                        EE.order.toggle([entityId], collectionId, !selected);
                    }
                    else if (clicked.hasClass('bulk'))
                    {
                        var entityId = $row.attr('data-entityId');
                        var collectionId = $row.attr('data-collectionId');
                        var selected = $('#search-results-container').find('tr[data-entityId="' + entityId + '"][data-collectionId="' + collectionId + '"] a.bulk').hasClass('selected');

                        EE.bulkDownload.toggle([entityId], collectionId, !selected);
                    }
                    else if (clicked.hasClass('download'))
                    {
                        EE.download.getDownloadOptions($row.attr('data-collectionId'), $row.attr('data-entityId'));
                    }
                    else if (clicked.hasClass('browseCompareOption'))
                    {
                        EE.dataset.toggleBrowseComparison($row.attr('data-entityId'), $row.attr('data-collectionId'), clicked.hasClass('selected'));
                    }
                    else if (clicked.hasClass('excludeOption'))
                    {
                        var entityId = $row.attr('data-entityId');
                        var collectionId = $row.attr('data-collectionId');

                            if (clicked.hasClass('selected'))
                            {
                                    EE.dataset.includeResult(entityId, collectionId);
                            }
                            else
                            {
                                    EE.dataset.excludeResult(entityId, collectionId);
                            }
                    }
                    else if (clicked.hasClass('roll'))
                    {
                        var entity_id = $row.attr('data-entityId');
                        EE.dataset.showRoll(entity_id, $row.attr('data-displayId') ,1,true);
                    }
                }
            }
        );

        $('#rollDialogContent').click(
            function(e)
            {
                var eventTarget = $(e.target);
                var clicked = (eventTarget.is('a')) ? eventTarget : eventTarget.parents('a');

                if (clicked.attr('class') !== undefined)
                {
                    var $row = clicked.closest('tr');

                    if (clicked.hasClass('metadata'))
                    {
                        loadMetadataDialog(clicked);
                    }
                    else if (clicked.hasClass('order'))
                    {
                        var entityId = $row.attr('data-entityId');
                        var collectionId = $('#rollCollectionId').val();

                        EE.order.toggle([entityId], collectionId, !clicked.hasClass('selected'));
                    }
                    else if (clicked.hasClass('bulk'))
                    {
                        var entityId = $row.attr('data-entityId');
                        var collectionId = $('#rollCollectionId').val();
                        var selected = ($('#bulkroll_' + entityId).hasClass('selected'));

                        EE.bulkDownload.toggle([entityId], $('#rollCollectionId').val(), !selected);
                    }
                    else if (clicked.hasClass('download'))
                    {
                        EE.download.getDownloadOptions($row.attr('data-collectionId'),$row.attr('data-entityId'));
                    }
                }
            }
        );

        $('#resultApproximationModal').modal({show: false});
        $('#exportGenerationModal').modal({show: false});
        $('#exportRequestModal').modal({show: false});

        $("#metadataExportDialog").dialog({
            modal: true,
            autoOpen: false,
            resizable: false,
            buttons: {
                'Create Export': function ()
                {
                    $('#metadataExportError').hide().html('');
                    $('#exportRequestModal').modal('show');

                    $.ajax({
                        dataType: 'json',
                        method: 'POST',
                        url: EE.defaultUrl + 'export/create',
                        data: {
                            format: $('#exportFormatSelector').val(),
                            exportName: $('#exportName').val(),
                            datasetId: $('#show_search_data').val().split('_')[2]
                        }
                    }).fail(function (jqXHR, textStatus, errorThrown) {
                        $('#exportRequestModal').modal('hide');
                        $('#metadataExportError').text(jqXHR.status + ' ' + errorThrown).show();
                    }).done(function (json) {
                        $('#exportRequestModal').modal('hide');
                        if (json.success) {
                            $('#exportName').val('');
                            $("#metadataExportDialog").dialog('close');

                            $('#exportLogButton').attr('data-exportId', json.exportId);
                            $('#exportGenerationModal').modal('show');                            
                        } else {
                            $('#metadataExportError').text(json.error).show();
                        }
                    });
                },
                'Cancel': function () {
                    $(this).dialog('close');
                }
            },
            open: function ()
            {
                var dataSetSelected = $('#show_search_data').val().replace(/t4_dataset_/g, '');

				var resultsObj = EE.dataset.datasets[dataSetSelected].results;
				var exportFormatSelector = $('#exportFormatSelector');

				if (resultsObj.showAllFootprintsOption === false)
				{
				    // Disable both KML options and Shapefile option because this data set either lacks the spatial column
				    // necessary to build a KMZ or Shapefile or the spatial is too large to be useful.
				    exportFormatSelector.children('option[value="kmz_browse"]').prop('disabled', true);
				    exportFormatSelector.children('option[value="kmz_nobrowse"]').prop('disabled', true);
					exportFormatSelector.children('option[value="shapefile"]').prop('disabled', true);
				}
				else if (resultsObj.hasOverlays === false)
				{
				    // Disable the KML Include Browse option as there are no browse images associated with this data set.
				    exportFormatSelector.children('option[value="kmz_browse"]').prop('disabled', true);
				}

				// If the option the user previously had selected is now disabled...
				if (exportFormatSelector.children('option:selected').prop('disabled') == true)
				{
    				// Select the first option that is not disabled
    				exportFormatSelector.val(exportFormatSelector.children('option:not(:disabled)').val());
                }
            },
            close: function ()
            {
                $('#exportFormatSelector').children('option').siblings().prop('disabled', false);
                $('#metadataExportError').text('').hide();
            }
        });

        $('#metadataExportButton').click(function ()
        {
            if ($(this).hasClass('disabled'))
            {
                return;
            }

            var dataSetContainerId = $('#show_search_data').val();
            var collectionId = dataSetContainerId.replace(/t4_dataset_/g, '');

            if (!EE.dataset.datasets[collectionId].results.hasResults)
            {
                $.blockUI({
                    theme:     true,
                    title:    'Notice',
                    message:  '<p>There are no results to export.</p>',
                    timeout:   2000
                });
            }
            else
            {
                var noBrowseInKmzDatasets = $("#metadataExportDialog").attr('data-noBrowseInKmzDatasets').split(',');
                if (noBrowseInKmzDatasets.includes(collectionId)) {
                    $('#exportFormatSelector option[value="kmz_browse"]').hide();
                } else {
                    $('#exportFormatSelector option[value="kmz_browse"]').show();
                }
                $("#metadataExportDialog").dialog('open');
            }
        });

        $('#metadataDialog').dialog({
            bgiframe: true,
            autoOpen: false,
            resizable: false,
            width: 810,
            height: 600,
            modal: true,
            buttons: {
                'Open New Window': function ()
                {
                	var metadataLink = $('#metadataLink').attr('href');

                	if(metadataLink === undefined)
                	{
                		createGrowl('Scene Not Found','The scene you are looking for cannot be found!');
                		return;
                	}

                    window.open(metadataLink);
                    $(this).dialog('close');
                },
                'Close': function ()
                {
                    $(this).dialog('close');
                }
            },
            title: 'Metadata View',
            open: function ()
            {
            },
            close: function ()
            {
                $('#browseDiv').html('');
            }
        });

        $('#metadataDialogArea').click(function (event) {
            var eventTarget = $(event.target);

            if (!eventTarget.is('button')) {
                return;
            }

            if (eventTarget.attr('id') === 'toggleMetadataButton') {
                $.ajax({
                    dataType: 'html',
                    method: 'get',
                    url: $('#toggleMetadata').attr('href')
                }).fail(function () {
                    // TODO: Let the generic error handler take care of errors?
                }).done(function (response) {
                    $('#metadataDialogArea').html(response);

                    $('#metadataDialog').scrollTop(0);
                });
            }
        });

        $('#exportLogButton').click(function()
        {
            var exportId = $(this).attr('data-exportId');
            window.open(EE.defaultUrl + 'export/view/' + exportId + '/', '_export_' + exportId);
            $('#exportGenerationModal').modal('hide');
        });

        // TODO: This needs to be rewritten
        $('#show_search_data').change(function () {
            // Uncheck any of the result options
            $('#addAllToBulk').prop('checked', false);
            $('#addAllToOrder').prop('checked', false);
            $('#showAllFootprints').prop('checked', false);
            $('#showAllBrowse').prop('checked', false);

            // Remove the browse/footprints/infowindows from the map
            EE.maps.footprints.clearAll();
            EE.maps.browse.clearAll();
            EE.maps.infoWindows.clearAll();

            var dataSetContainerId = $('#show_search_data').val();
            var collectionId = dataSetContainerId.replace(/t4_dataset_/g, '');

            if (!EE.dataset.isResultLoaded(collectionId)) {
                EE.dataset.searchDataSet(collectionId);
            }

            // Hide all data set containers
            $('#search-results-container').children('div.t4_dataSelectContainer').each(function ()
            {
                $(this).hide();
            });

            // Show the selected data set container
            $('#' + dataSetContainerId).show();

            if (EE.dataset.isResultLoaded(collectionId)) {
                EE.dataset.handleResultOptions(collectionId);
            }

            // Show the selected data set container
            $('#' + dataSetContainerId).show();

            // Save the selected data set to the session
            $.ajax({
                dataType: 'json',
                method: 'POST',
                url: EE.defaultUrl + 'dataset/select',
                data: {
                    datasetId: collectionId
                }
            }).fail(function () {
                // TODO: Let the generic error handler take care of errors?
            }).done(function (json) {
                if (!json.success) {
                    alert('Error: ' + json.message);
                }
            });

            return false;
        });

        $('#search-results-container').on('change', '.pageSelector', function () {
            var previousValue = parseInt($(this).attr('data-currentValue'), 10);
            var maxValue = parseInt($(this).attr('max'), 10);

            var page = parseInt($(this).val(), 10);
            if (page < 1) {
                page = 1;
            }

            if (page > maxValue) {
                page = maxValue;
            }

            if (page == previousValue) {
                $(this).val(page);
                return;
            }

            var idParts = $(this).attr('id').split('_');

            // Remove the browse and footprints from the map
            EE.maps.footprints.clearAll();
            EE.maps.browse.clearAll();

            $("#tab4data a.footprint").css('background-color', 'transparent');
            $("#tab4data a.browse").css('background-color', 'transparent');

            // Remove info windows from the map
            for (var i in EE.maps.infowindowsOverlay) {
                EE.maps.infowindowsOverlay[i].close();
            }

            if ($('#showAllFootprints').prop('checked')) {
                EE.maps.footprints.showAll(true);
            }

            if ($('#showAllBrowse').prop('checked')) {
                EE.maps.browse.showAll(true);
            }

			EE.dataset.getResultPage(idParts[1], page);
        });
    }
};
