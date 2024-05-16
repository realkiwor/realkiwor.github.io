// Convert decimal coordinate to degrees/minutes/seconds
// Optimized
function convertDecToDMS(coordinate, type, symbols)
{
    // Make sure the coordinate is a string
    coordinate = '' + coordinate;

    if (coordinate.lastIndexOf('.', 0) === false)
    {
        coordinate += ".0";
    }

    var parts = coordinate.split('.');

    var degrees = Math.abs(parts[0]);
    var temp = "0." + parts[1];
    temp *= 3600;

    var minutes = (temp / 60) | 0;
    var seconds = (EE.truncateSeconds)? (temp - (minutes * 60)) | 0 : (temp - (minutes * 60)).toFixed(EE.coordinatePrecision);

    var direction = '';

    if (type === 'lat')
    {
        degrees = padNumber(degrees, 2);
        direction = (coordinate < 0)? 'S' : 'N';
    }
    else
    {
        degrees = padNumber(degrees, 3);
        direction = (coordinate < 0)? 'W' : 'E';
    }

    minutes = padNumber(minutes, 2);
    seconds = padNumber(seconds, 2);

    coordinate = (symbols === false)? degrees + ' ' + minutes + ' ' + seconds + ' ' + direction :
        degrees + '\u00B0 ' + minutes + '\u0027 ' + seconds + '\u0022' + ' ' + direction;

    return coordinate;
}

// Convert degrees/minutes/seconds coordinate to decimal
// Optimized
function convertDMSToDec(coordinate)
{
    // If the user didn't put a value, assume it is zero
    for (var i = 0; i < coordinate.length; i++)
    {
        if (coordinate[i].length < 1)
        {
            coordinate[i] = 0;
        }
    }

    var degrees = parseFloat(coordinate[0]);
    var minutes = parseFloat(coordinate[1]);
    var seconds = parseFloat(coordinate[2]);
    var direction = coordinate[3];

    coordinate = degrees + minutes/60 + seconds/3600;
    coordinate = (direction == 'W' || direction == 'S')? coordinate * -1.0 : coordinate;

    return coordinate.toFixed(EE.coordinatePrecision);
}

// Increase the color values for RGB to a lighter shade
// Optimized
function brightenColor(color)
{
    var rgb = parseInt(color.substring(1, 7), 16);
    var rVal = (rgb & 0xff0000) >> 16;
    rVal = ((rVal * 1.4 > 255) ? 255 : rVal * 1.4 | 0).toString(16);

    var gVal = (rgb & 0x00ff00) >> 8;
    gVal = ((gVal * 1.4 > 255) ? 255 : gVal * 1.4 | 0).toString(16);

    var bVal = (rgb & 0x0000ff);
    bVal = ((bVal * 1.4 > 255) ? 255 : bVal * 1.4 | 0).toString(16);

    return '#' + padNumber(rVal, 2) +
        padNumber(gVal, 2) +
        padNumber(bVal, 2);
}

EE.maps = {
    coordinateList: [],
    geocoder: null,
    enableDebugOverlays: false,
    map: null,
    overlayMap: null,
    gridOverlay: null,
    tileGridOverlay: null,
    /* worldBoundariesLayer: null, */
    overlays: {
        browse: [],
        footprints: [],
        grid: null,
        infoWindows: [],
        markers: [],
        polygon: null
    },
    results: {
        datasets: 0
    },
    settings: {
        dragLock: false,
        footprintDisplayDefaults: {
            strokeWeight: 1,
            strokeOpacity: 0.9,
            fillColor: '#00FF00',
            fillOpacity: 0.5,
            geodesic: false
        },
        areaOfInterest : {
            strokeColor: '#ff0000',
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: '#ff0000',
            fillOpacity: 0.35
        },
        showRealCoordinates: false,
        format: null,
        getFormat: function ()
        {
            //return ($('#latlonfmtdeg').is(':checked'))? 'dms' : 'dd';
            if (EE.maps.settings.format === null)
            {
                EE.maps.settings.format = ($('#latlonfmtdeg').prop('checked'))? 'dms' : 'dd';

                return EE.maps.settings.format;
            }
            else
            {
                return EE.maps.settings.format;
            }
        },
        geodesic: false,
        latPan: 200,
        lngPan: 450,
        maxPoints: 30,
        resultsPerPage: 10
    },
    // TODO: Rewrite
    // Centers the map on the current polygon
    centerMap: function(){
        if (EE.maps.coordinateList.length < 1) {
            return;
        }

        var bounds = EE.maps.overlays.polygon.getBounds();

        if (EE.maps.coordinateList.length === 1) {
            // Center the map according to the bounds
            EE.maps.map.setView(bounds.getCenter(), (EE.maps.map.getZoom() < 10) ? EE.maps.map.getZoom()  : 10);
        } else {
            // Center the map according to the bounds
            EE.maps.map.fitBounds(bounds);
        }
    },
    buildMap: function(basemapLayerConfig)
    {
        var overlays = EE.maps.buildOverlays();
        
        var basemaps = {
            basemapList: {},
            default: null
        };

        var firstBasemapTitle = false;
        $.each(basemapLayerConfig, function(key, basemapConfig)
        {
            firstBasemapTitle = basemapConfig.mapTitle;
            basemaps.basemapList[basemapConfig.mapTitle] = new L.tileLayer(basemapConfig.uri, basemapConfig.layerOptions);

            if (basemapConfig.isDefault) {
                basemaps.default = basemaps.basemapList[basemapConfig.mapTitle];
            }
        });

        //What if we couldn't fine a default? select the first in the list, otherwise it will default to OSM
        if (basemaps.default === null) {
            if (basemaps.basemapList) {
                basemaps.default = basemaps.basemapList[firstBasemapTitle];
            }
        }
        
        EE.maps.map = new L.Map('map', {
            boxZoom: false,
            attributionControl: false,
            doubleClickZoom: false,
            inertia: false,
            preferCanvas: true,
            trackResize: true,
            updateWhenIdle: true,
            updateWhenZooming: false,
            zoomControl: false,
            minZoom: 3
        });
        
        EE.maps.map.on('baselayerchange', function(event)
        {
            if (event.layer.options.gridColor !== undefined) {
                EE.maps.gridOverlay.options.color = event.layer.options.gridColor;
                EE.maps.gridOverlay.redraw();
                
                if (EE.maps.tileGridOverlay !== null) {
                    EE.maps.tileGridOverlay.options.color = event.layer.options.gridColor;
                    EE.maps.tileGridOverlay.redraw();
                }
            }
        });

        if (basemapLayerConfig === undefined) {
            var osmBasemap = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(EE.maps.map); 

            var baseLayers = {
                "OpenStreetMap": osmBasemap
            };
        } else {
            basemaps.default.addTo(EE.maps.map);
            baseLayers = basemaps.basemapList;
            
           // EE.maps.worldBoundariesLayer.addTo(EE.maps.map);
        } 
        
        //Add the layer control to the upper left corner
        L.control.layers(baseLayers, overlays, {
            position: 'topleft'
        }).addTo(EE.maps.map);

        // Add the zoom control to the upper right corner
        L.control.zoom({
            position: 'topright'
        }).addTo(EE.maps.map);

        EE.maps.map.createPane('coveragePane');
        EE.maps.map.getPane('coveragePane').style.zIndex = 400;

        EE.maps.map.createPane('aoiPane');
        EE.maps.map.getPane('aoiPane').style.zIndex = 449;

        EE.maps.map.createPane('footprintPane');
        EE.maps.map.getPane('footprintPane').style.zIndex = 450;
        
        EE.maps.map.createPane('browseOverlayPane');
        EE.maps.map.getPane('browseOverlayPane').style.zIndex = 402;

        // Set the default map center and zoom level
        EE.maps.map.setView(new L.LatLng(60, 30), 7);
    },
    buildOverlays: function()
    {
        // Add the grid overlay listeners
        var GridOverlay = L.GridLayer.extend({
            createTile: function(coords){
                var error;
                
                // create a <canvas> element for drawing
                var tile = L.DomUtil.create('div', 'leaflet-tile');
                
                // setup tile width and height according to the options
                var size = this.getTileSize();
                tile.width = size.x;
                tile.height = size.y;

                //This gives us the center point of the tile
                //We can't let the map object run this because the new zoom level (if zooming) is not set, so it will give bad coordinates
                var pointlatlng = this._map.options.crs.pointToLatLng(coords.scaleBy(size), coords.z);
                var latitude = pointlatlng.lat.toFixed(EE.coordinatePrecision);
                var longitude = pointlatlng.lng.toFixed(EE.coordinatePrecision);

                if (EE.maps.settings.getFormat() == 'dms') {
                    var dmsLatitude = convertDecToDMS(latitude, 'lat', true);
                    var dmsLongitude = convertDecToDMS(longitude, 'lng', true);

                    latitude = dmsLatitude;
                    longitude = dmsLongitude;
                }

                tile.innerHTML = '<div class="gridCell" style="color: ' + this.options.color + '; border-color: ' + this.options.color + ';">' 
                                    + '<div class="gridCellLat" style="">' + latitude + '</div>'
                                    + '<div class="gridCellLng" style="top: ' + (size.y / 2) + 'px;">' + longitude + '</div>'
                                + '</div>';

                return tile;
            }
        });

        EE.maps.gridOverlay = new GridOverlay({tileSize: 256, pane: 'overlayPane', color: '#000000'});

       /* EE.maps.worldBoundariesLayer = L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
                attribution: 'ESRI'
        });
	*/ 

        var overlays = {
        /*   "World Boundaries and Places": EE.maps.worldBoundariesLayer, */
            "Lat/Lng Overlay": EE.maps.gridOverlay
        };
        
        if (EE.maps.enableDebugOverlays) {
            var TileGridOverlay = L.GridLayer.extend({
                createTile: function(coords){
                    var error;

                    // create a <canvas> element for drawing
                    var tile = L.DomUtil.create('div', 'leaflet-tile');

                    // setup tile width and height according to the options
                    var size = this.getTileSize();
                    tile.width = size.x;
                    tile.height = size.y;

                    tile.innerHTML = '<div class="gridCell" style="color: ' + this.options.color + '; border-color: ' + this.options.color + ';">' 
                                        + '<div class="gridCellLat" style="top: ' + (size.y / 2) + 'px;">' + coords.x + '/' + coords.y + '/' + coords.z + '</div>'
                                    + '</div>';

                    return tile;
                }
            });

            EE.maps.tileGridOverlay = new TileGridOverlay({tileSize: 256, pane: 'overlayPane', color: '#000000'});
            
            overlays["Map Tile Grid Overlay"] = EE.maps.tileGridOverlay;
        }
        
        
        return overlays;
    },
    loadMap: function (basemapConfig)
    {
        EE.maps.buildMap(basemapConfig);
        
        EE.maps.map.on('click', function(event) {
            // Check if the user is on tab 1
            if (EE.tabs.tabInfo.getCurrent() == 1) {
                // Check if the user is on the coordinates tab
                if ($('#tabPolygon').hasClass('selected') === false && $('#tabCircle').hasClass('selected') === false) {
                    return;
                }

                var draw = true;

                if (EE.maps.coordinateList.length >= EE.maps.settings.maxPoints) {
                    $.blockUI({
                        theme:     true,
                        title:    'Maximum Number of Points Exceeded',
                        message:  '<p>You may only add ' + EE.maps.settings.maxPoints + ' points to the map.</p>',
                        timeout:   4000
                    });

                    return;
                }

                if (EE.maps.overlays.polygon !== null && $('#polygonType').val() === 'circle') {
                    if (EE.maps.coordinateList.length === 2) {
                        draw = false;
                        $.blockUI({
                            theme:     true,
                            title:    'Warning',
                            message:  '<p>Circles are limited to 2 points. Please clear your coordinates to draw a new circle.</p>',
                            timeout:   4000
                        });
                    }
                }

                if (draw === true) {
                    // Add the new coordinate
                    EE.maps.coordinates.add(event.latlng);
                }
            }
        });

        // Add the mousemove listener
        EE.maps.map.on('mousemove', function(event) {
            EE.maps.updateMouseLocation(event.latlng);
        });

        // Show the coordinates, options, and overlays controls
        $('#mouseLatLng').show();
        $('#optionsControl').show();

        var coordinates = [];

        // Load the coordinates from the coordEntryArea
        $('#coordEntryArea li.coordinate').not('#coordinateElementEmpty').each(function ()
        {
            coordinates.push(
                new L.LatLng($(this).children('div.format_dd ').children('span.latitude').html(),
                    $(this).children('div.format_dd').children('span.longitude').html()));

        });

        if (coordinates.length > 0) {
            // Save the coordinates in javascript
            EE.maps.coordinateList = coordinates;

            // Redraw the polygon
            EE.maps.polygon.redraw(true);

            // Load the markers
            for (var index = 0; index < coordinates.length; index++)
            {
                EE.maps.markers.create(index);
            }

            // If not on tab 1, handle the map changes
            if (EE.tabs.tabInfo.getCurrent() > 1) {
                EE.maps.polygon.decreaseOpacity();

                if (EE.maps.overlays.markers.length > 1) {
                    EE.maps.markers.hide();
                }
            }
        } 
        
        // Load the tab (this just prepares tab data and settings)
        setTimeout(function()
        {
            if ($('#polygonType').val() === 'shape' && $('#areaShapeSection').find('.boundaryName').data('boundaryId') !== undefined) {
                //Need to wait for the page to be loaded before attempting this request - otherwis CSRF headers are not loaded

                EE.maps.polygon.redraw(true);
            }
            
           EE.tabs.load(EE.tabs.tabInfo.getCurrent()); 
        }, 100);
    },
    browse: {
        allChecked: function()
        {
            var result = true;
            var containerId = $('#show_search_data').val();
            var collectionId = containerId.replace(/t4_dataset_/g, '');

            if (!EE.dataset.isResultLoaded(collectionId))
            {
                return false;
            }

            $('#' + containerId + ' table:visible tbody tr').not('.excludedResultRow').find('a.browse').each(function () {
                var sceneId = $(this).closest('tr').attr('data-scene-id');

                if (EE.maps.overlays.browse[sceneId] === undefined || EE.maps.map.hasLayer(EE.maps.overlays.browse[sceneId]) === false)
                {
                    return result = false;
                }
            });

            return result;
        },
        clearAll: function () {
            EE.maps.browse.hideAll();

            EE.maps.overlays.browse.length = 0;
            EE.maps.overlays.browse = [];
        },
        create: function (collectionId, entityId, displayId, cornerPoints, resultNum, browseInfo, ignoreTab)
        {
            ignoreTab = (ignoreTab !== undefined && ignoreTab === true)
            if (!ignoreTab && EE.tabs.tabInfo.getCurrent() !== 4) {
                return;
            }

            browseInfo = JSON.parse(browseInfo);
            
            if (cornerPoints === '') {
                $.blockUI({
                    theme: true,
                    title: 'Browse Overlay Unavailable',
                    message: 'Unable to display overlay due to missing corner coordinates',
                    timeout: 3000
                });

                return false;
            }

            if (browseInfo.length === 0) {
                $.blockUI({
                    theme: true,
                    title: 'Browse Overlay Unavailable',
                    message: 'Unable to display overlay due to missing overlay options',
                    timeout: 3000
                });

                return false;
            }

            var sceneId = collectionId + '_' + entityId;

            var browse = browseInfo[0];

            var imageBounds = L.latLngBounds();
            var latlngs = [];

            if (cornerPoints.includes(";")) {
                var index = cornerPoints.indexOf(";");  // Gets the first index where a space occours
                var polyOne = cornerPoints.substr(0, index); // Gets the first part
                var polyTwo = cornerPoints.substr(index + 1);

                for (var x = 0; x < 2; x ++)
                {
                    if (x == 0) {
                        var boundPoints = polyOne.split(',');
                    } else {
                        var boundPoints = polyTwo.split(',');
                    }

                    for (var i = 0; i < boundPoints.length; i += 2)
                    {
                        if (x == 1 && boundPoints[i+1] > -180) {
                            imageBounds.extend(new L.LatLng(boundPoints[i], boundPoints[i+1]));
                            latlngs.push(new L.LatLng(boundPoints[i], boundPoints[i+1]));
                        } else if (x == 0 && boundPoints[i+1] < 180) {
                            lng = 180 - boundPoints[i+1];
                            lng = -180 - lng;
                            imageBounds.extend(new L.LatLng(boundPoints[i], lng));
                            latlngs.push(new L.LatLng(boundPoints[i], lng));
                        }
                    }
                }   
            } else {
                var boundPoints = cornerPoints.split(',');

                for (var i=0 ; i < boundPoints.length ; i+=2) {
                    imageBounds.extend(new L.LatLng(boundPoints[i], boundPoints[i+1]));
                    latlngs.push(new L.LatLng(boundPoints[i], boundPoints[i+1]));
                }
            }

            if (browse.overlayType === 'dmid_wms' || browse.overlayType === 'ims_wms') {
                DevConsole.logMessage('overlay', sceneId + ' - ' + browse.overlayType + ' - ' + browse.overlayPath);

                EE.maps.overlays.browse[sceneId] = new L.tileLayer.wms.dmid(browse.overlayPath, latlngs);
            } else if (browse.overlayType === 'ls_chs' || browse.overlayType === 'l9_chs') {
                DevConsole.logMessage('overlay', sceneId + ' - ' + browse.overlayType + ' - ' + browse.overlayPath);

                EE.maps.overlays.browse[sceneId] =  new L.tileLayer(browse.overlayPath, {
                    bounds: imageBounds,
                    opacity: $('#browseOpacity').slider('value'),
                    pane: 'browseOverlayPane'
                });
            } else {
                //Do we need to rotate the image? Make sure we have 8 points - assuming correct order
                if (browse.overlayPath.indexOf('browse/eo') === -1 && (latlngs.length === 4 || (latlngs.length === 5 && latlngs[0].lat === latlngs[4].lat && latlngs[0].lng === latlngs[4].lng))) {
                    var topLeft = latlngs[3];
                    var topRight = latlngs[2];
                    var bottomRight = latlngs[1];
                    var bottomLeft = latlngs[0];

                    //Are we upside down?
                    if (topLeft.lng > topRight.lng) {
                        console.log('flip - untested');
                        topLeft = latlngs[1];
                        topRight = latlngs[0];
                        bottomRight = latlngs[3];
                        bottomLeft = latlngs[0];
                    }

                    DevConsole.logMessage('overlay', sceneId + '- ROTATED - ' + browse.overlayPath);

                    EE.maps.overlays.browse[sceneId] = L.imageOverlay.rotated(browse.overlayPath, topLeft, topRight, bottomLeft, {
                        opacity: $('#browseOpacity').slider('value'),
                        pane: 'browseOverlayPane'
                    });
                } else {
                    DevConsole.logMessage('overlay', sceneId + ' - ' + browse.overlayType + ' - ' + browse.overlayPath);

                    EE.maps.overlays.browse[sceneId] = L.imageOverlay(browse.overlayPath, imageBounds, {
                        opacity: $('#browseOpacity').slider('value'),
                        pane: 'browseOverlayPane'
                    });
                }
            }

            EE.maps.overlays.browse[sceneId].bounds = imageBounds;
            EE.maps.overlays.browse[sceneId].browseId = browse.id;

            if (ignoreTab === true) {
                EE.maps.overlays.browse[sceneId].addTo(EE.maps.map);
            } else {
                EE.maps.browse.show(sceneId);
            }

            return (EE.maps.overlays.browse[sceneId] !== undefined);
        },
        hide: function (sceneId)
        {
            var $browseCell = $('#search-results-container').find('tr[data-scene-id="' + sceneId + '"] a.browse');

            $browseCell.removeClass('selected');

            EE.maps.overlays.browse[sceneId].remove();

            if ( $('#showAllBrowse').hasClass('showAll') === false)
            {
                if (EE.maps.browse.allChecked())
                {
                    $('#showAllBrowse').prop('checked', true);
                }
                else
                {
                    $('#showAllBrowse').prop('checked', false);
                }
            }
        },
        hideAll: function ()
        {
            for (var sceneId in EE.maps.overlays.browse)
            {
                EE.maps.browse.hide(sceneId);
            }

            $('#showAllBrowse').prop('checked', false);
        },
        show: function (sceneId)
        {
            // Check if it is excluded first
            if ( $('#resultRow_' + sceneId).hasClass('excludedResultRow'))
            {
                return;
            }

            var $browseCell = $('#search-results-container').find('tr[data-scene-id="' + sceneId + '"] a.browse');

            $browseCell.addClass('selected');

            EE.maps.overlays.browse[sceneId].addTo(EE.maps.map);

            if ( $('#showAllBrowse').hasClass('showAll') === false)
            {
                EE.maps.centerOnFootprintAndBrowse();

                if (EE.maps.browse.allChecked())
                {
                    $('#showAllBrowse').prop('checked', true);
                }
                else
                {
                    $('#showAllBrowse').prop('checked', false);
                }
            }
        },
        showAll: function (isChecked)
        {
            if (isChecked === true)
            {
                $('#showAllBrowse').addClass('showAll');
            }

            var unloaded = [];

            $('#search-results-container a.browse:visible').each(function ()
            {
                var $row = $(this).closest('tr');

                var collectionId = $('#show_search_data').val().replace(/t4_dataset_/g, '');
                var entityId = $row.attr('data-entityId');
                var sceneId = $row.attr('data-scene-id');

                if (isChecked) {
                    // Show them all
                    if (EE.maps.overlays.browse[sceneId] === undefined) {
                        EE.maps.browse.create(
                            collectionId,
                            entityId,
                            $row.attr('data-displayId'),
                            $row.attr('data-corner-points'),
                            $row.attr('data-result-index'),
                            $(this).attr('data-overlay-options')
                        );
                    } else if (EE.maps.map.hasLayer(EE.maps.overlays.browse[sceneId]) === false) {
                        $(this).trigger('click');
                    }
                } else {
                    // Hide them all
                    if (EE.maps.overlays.browse[sceneId] !== undefined && EE.maps.map.hasLayer(EE.maps.overlays.browse[sceneId]) === true) {
                        $(this).trigger('click');
                    }
                }
            });

            $('#showAllBrowse').removeClass('showAll');

            EE.maps.centerOnFootprintAndBrowse();
        },
        toggle: function (collectionId, entityId, displayId, cornerPoints, resultNum, overlayOptions) {
            var sceneId = collectionId + '_' + entityId;

            if (EE.maps.overlays.browse[sceneId] === undefined) {
                EE.maps.browse.create(collectionId, entityId, displayId, cornerPoints, resultNum, overlayOptions);
                return;
            }

            if (EE.maps.map.hasLayer(EE.maps.overlays.browse[sceneId]) === false) {
                EE.maps.browse.show(sceneId);
            } else {
                EE.maps.browse.hide(sceneId);
            }
        }
    },
    coordinates: {
        add: function (latLng)
        {
            if ($('#tabPolygon').hasClass('selected') === true || $('#tabCircle').hasClass('selected') === true)
            {
                // Add the coordinate to the coordinateList
                EE.maps.coordinateList.push(latLng.wrap());

                var index = EE.maps.coordinateList.length - 1;

                // Add the coordinate element to the html
                EE.maps.coordinateElements.add(index);

                // Redraw the polygon
                EE.maps.polygon.redraw();

                // Add the marker to the map
                EE.maps.markers.create(index);
            } else {
                console.log('Adding point to something other than polygon or circle');
            }
        },
        clear: function () {
            // Clear the coordinateList
            EE.maps.coordinateList.length = 0;

            // Clear the coordinate elements
            EE.maps.coordinateElements.clear();

            // Clear the polygon
            EE.maps.polygon.clear();

            // Clear the markers
            EE.maps.markers.clear();
        },
        remove: function (index) {
            // Delete the coordinate from the coordinateList
            EE.maps.coordinateList.splice(index, 1);

            // Remove the coordinate element
            EE.maps.coordinateElements.remove(index);

            // Redraw the polygon
            EE.maps.polygon.redraw();

            // Remove the marker from the map
            EE.maps.markers.remove(index);
        },
        update: function (index, latLng) {
            // Update the coordinate in the coordinateList
            EE.maps.coordinateList[index] = latLng;

            // Update the coordinate element
            EE.maps.coordinateElements.update(index);

            // Redraw the polygon
            EE.maps.polygon.redraw();

            // Update the marker
            EE.maps.markers.update(index);
        }
    },
    coordinateElements: {
        add: function (index) {
            // Hide the "no coordinates" element
            $('#coordinateElementEmpty').hide();

            var template = $('#coordEntryTemplate').html();

            var showFormat = EE.maps.settings.getFormat();
            var hideFormat = (showFormat == 'dms')? 'dd' : 'dms';

            var latitude = EE.maps.coordinateList[index].lat.toFixed(EE.coordinatePrecision);
            var longitude = EE.maps.coordinateList[index].lng.toFixed(EE.coordinatePrecision);

            var dmsLatitude = convertDecToDMS(latitude, 'lat', true);
            var dmsLongitude = convertDecToDMS(longitude, 'lng', true);

            var fillValues = {
                "coordinateNum" : (index + 1),
                "decLat" : latitude,
                "decLng" : longitude,
                "dmsLat" : dmsLatitude,
                "dmsLng" : dmsLongitude,
                "format" : showFormat,
                "index" : index
            };

            var content = $(template.replace(/!%([^%]*)%!/mg, function ($1, $2) {
                return fillValues[$2];
            }));

            content.find('.coordinateNum').text(index + 1);
            content.find('.format_dms span.latitude').text(dmsLatitude);
            content.find('.format_dms span.longitude').text(dmsLongitude);
            content.find('.format_dd span.latitude').text(latitude);
            content.find('.format_dd span.longitude').text(longitude);

            $('#coordEntryArea').append(content);
            $('#coordinate_' + index).children('div.format_' + hideFormat).hide();
        },
        clear: function () {
            $('#coordEntryArea li').not('#coordinateElementEmpty').remove();
            $('#coordinateElementEmpty').show();
        },
        remove: function (index) {
            // Remove the HTML element
            $('#coordinate_' + index).remove();

            // If this wasn't the last element, have to do some redrawing
            if (index < EE.maps.coordinateList.length)
            {
                // Redo index to ending
                for (var i = index + 1; i < EE.maps.coordinateList.length + 1; i++)
                {
                    var $coordinateElement = $('#coordinate_' + i);
                    index = (i - 1);

                    $coordinateElement.find('span.coordinateNum').html(i);
                    $coordinateElement.attr('id', 'coordinate_' + index);
                    $('#edit_' + i).attr('id', 'edit_' + index);
                    $('#delete_' + i).attr('id', 'delete_' + index);
                }
            }
        },
        splice: function (index, length)
        {
            for (var i = 0; i < length; i++, index++)
            {
                $('#coordinate_' + index).remove();
            }
        },
        update: function (index) {
            var latitude = EE.maps.coordinateList[index].lat.toFixed(EE.coordinatePrecision);
            var longitude = EE.maps.coordinateList[index].lng.toFixed(EE.coordinatePrecision);

            var dmsLatitude = convertDecToDMS(latitude, 'lat', true);
            var dmsLongitude = convertDecToDMS(longitude, 'lng', true);
            var $coordinateElement = $('#coordinate_' + index);

            $coordinateElement.children('div.format_dms').children('span.latitude').html(dmsLatitude);
            $coordinateElement.children('div.format_dms').children('span.longitude').html(dmsLongitude);

            $coordinateElement.children('div.format_dd').children('span.latitude').html(latitude);
            $coordinateElement.children('div.format_dd').children('span.longitude').html(longitude);
        }
    },
    footprints: {
        allChecked: function()
        {
            var result = true;
            var containerId = $('#show_search_data').val();
            var collectionId = containerId.replace(/t4_dataset_/g, '');

            if (!EE.dataset.isResultLoaded(collectionId))
            {
                return false;
            }

            $('#' + containerId + ' table:visible tbody tr').not('.excludedResultRow').each(function () {
                var sceneId = $(this).attr('data-scene-id');

                if (EE.maps.overlays.footprints[sceneId] === undefined || EE.maps.map.hasLayer(EE.maps.overlays.footprints[sceneId]) === false)
                {
                    return result = false;
                }
            });

            return result;
        },
        attachFootprintClickEvent: function (footprint, collectionId, entityId, resultNum)
        {
            var sceneId = collectionId + '_' + entityId;

            footprint.on('click', function (event)
            {
                if (EE.tabs.tabInfo.getCurrent() == 4 && EE.maps.map.hasLayer(footprint) === true)
                {
                    // Putting the info window where the user clicks, not the center any more
                    if (EE.maps.overlays.infoWindows[sceneId].getContent() == null)
                    {
                        EE.maps.overlays.infoWindows[sceneId].setContent(
                            $.ajax({
                                type: 'GET',
                                url: EE.defaultUrl + 'scene/metadata/info/' + collectionId + '/' + entityId + '/',
                                async: false
                            }).responseText
                        );
                    }

                    EE.maps.overlays.infoWindows[sceneId].setLatLng(event.latlng)
                                                         .openOn(EE.maps.map);
                }
            });
        },
        clearAll: function ()
        {
            EE.maps.footprints.hideAll();

            EE.maps.overlays.footprints.length = 0;
            EE.maps.overlays.footprints = [];
        },
        create: function (collectionId, entityId, cornerPoints, resultNum, color, luma, fpType)
        {
            if (cornerPoints === '') {
                $.blockUI({
                    theme: true,
                    title: 'Scene Footprint Unavailable',
                    message: 'Unable to display footprint due to missing corner coordinates.',
                    timeout: 3000
                });

                return false;
            }

            if (color === null)
            {
                color = '#526e87';
            }

            var coordinates = [];

            if (fpType != 'multipolygon') {
                cornerPoints = cornerPoints.split(',');

                for (var i = 0; i < cornerPoints.length; i += 2)
                {
                    coordinates.push(new L.LatLng(cornerPoints[i], cornerPoints[i + 1]));
                }
            }

            var sceneId = collectionId + '_' + entityId;

            //For point types we make a diamond polygon
            //Per Ryan - he didn't like the diamond so it has been converted to points
            if (fpType == 'point')
            {
                
                var marker = L.marker(coordinates[0], {
                    alt: '' + entityId,
                    title: '' + entityId,
                    pane: 'footprintPane'
                }).addTo(EE.maps.map);
                
                /* TODO :: Add marker color using variable color
                var markerTextColor = (luma < 100) ? 'FFFFFF' : '000000';
                //color variable is color*/
                EE.maps.overlays.footprints[sceneId] = marker;
                
                EE.maps.overlays.footprints[sceneId].on('mousemove', function (event)
                {
                    EE.maps.updateMouseLocation(event.latlng);
                });

                // Highlight effect for the footprints
                EE.maps.overlays.footprints[sceneId].on('mouseover', function (event)
                {
                    // Increase the opacity and brighten the color
                    EE.maps.overlays.footprints[sceneId].setStyle({
                        fillOpacity : EE.maps.settings.footprintDisplayDefaults.fillOpacity + 0.3,
                        fillColor: brightenColor(EE.maps.overlays.footprints[sceneId].color)
                    });
                });

                EE.maps.overlays.footprints[sceneId].on('mouseout', function (event)
                {
                    // Reset the opacity and color to default
                    EE.maps.overlays.footprints[sceneId].setStyle({
                        fillOpacity : EE.maps.settings.footprintDisplayDefaults.fillOpacity,
                        fillColor: EE.maps.overlays.footprints[sceneId].color
                    });
                });

                EE.maps.overlays.footprints[sceneId].color = color;
                EE.maps.overlays.footprints[sceneId].resultNum = resultNum;
                EE.maps.overlays.footprints[sceneId].remove();
                EE.maps.overlays.footprints[sceneId].luma = luma;
                EE.maps.overlays.footprints[sceneId].fpType = fpType;

                // Create the info window for this polygon
                EE.maps.overlays.infoWindows[sceneId] = L.popup({
                    maxHeight: 500
                });

                EE.maps.footprints.attachFootprintClickEvent(EE.maps.overlays.footprints[sceneId], collectionId, entityId, resultNum);
            } else if (fpType == 'multipolygon') 
            {
                var index = cornerPoints.indexOf(";");
                var polyOne = cornerPoints.substr(0, index);
                var polyTwo = cornerPoints.substr(index + 1);

                for (var x = 0; x < 2; x ++)
                {
                    if (x == 0) {
                        var cornerPointsMulti = polyOne.split(',');
                    } else {
                        var cornerPointsMulti = polyTwo.split(',');
                    }

                    for (var i = 0; i < cornerPointsMulti.length; i += 2)
                    {
                        if (x == 1 && cornerPointsMulti[i + 1] > -180) {
                            coordinates.push(new L.LatLng(cornerPointsMulti[i], cornerPointsMulti[i + 1]));
                        } else if (x == 0 && cornerPointsMulti[i + 1] < 180) {
                            lng = 180 - cornerPointsMulti[i + 1];
                            lng = -180 - lng;
                            coordinates.push(new L.LatLng(cornerPointsMulti[i], lng));
                        }
                    }
                }
                var polygonSettings = EE.maps.settings.footprintDisplayDefaults;

                //Using the wrapped version because if we don't it draws the polygon incorrectly
                //EE.maps.overlays.footprints[sceneId] = L.polygon(coordinates, {
                EE.maps.overlays.footprints[sceneId] = new L.Wrapped.Polygon(coordinates, {
                    color: color,
                    fillColor: color,
                    fillOpacity: polygonSettings.fillOpacity,
                    opacity: polygonSettings.strokeOpacity,
                    weight: polygonSettings.strokeWeight,
                    pane: 'footprintPane'
                }).addTo(EE.maps.map);

                // Add the mousemove listener to the footprint
                EE.maps.overlays.footprints[sceneId].on('mousemove', function (event)
                {
                    EE.maps.updateMouseLocation(event.latlng);
                });

                // Highlight effect for the footprints
                EE.maps.overlays.footprints[sceneId].on('mouseover', function (event)
                {
                    // Increase the opacity and brighten the color
                    EE.maps.overlays.footprints[sceneId].setStyle({
                        fillOpacity : EE.maps.settings.footprintDisplayDefaults.fillOpacity + 0.3,
                        fillColor: brightenColor(EE.maps.overlays.footprints[sceneId].color)
                    });
                });

                EE.maps.overlays.footprints[sceneId].on('mouseout', function (event)
                {
                    // Reset the opacity and color to default
                    EE.maps.overlays.footprints[sceneId].setStyle({
                        fillOpacity : EE.maps.settings.footprintDisplayDefaults.fillOpacity,
                        fillColor: EE.maps.overlays.footprints[sceneId].color
                    });
                });

                EE.maps.overlays.footprints[sceneId].color = color;
                EE.maps.overlays.footprints[sceneId].resultNum = resultNum;
                EE.maps.overlays.footprints[sceneId].remove();
                EE.maps.overlays.footprints[sceneId].luma = luma;
                EE.maps.overlays.footprints[sceneId].fpType = fpType;

                // Create the info window for this polygon
                EE.maps.overlays.infoWindows[sceneId] = L.popup({
                    maxHeight: 500
                });

                EE.maps.footprints.attachFootprintClickEvent(EE.maps.overlays.footprints[sceneId], collectionId, entityId, resultNum);
            } else
            {
                var polygonSettings = EE.maps.settings.footprintDisplayDefaults;
                //Using the wrapped version because if we don't it draws the polygon incorrectly
                //EE.maps.overlays.footprints[sceneId] = L.polygon(coordinates, {
                EE.maps.overlays.footprints[sceneId] = new L.Wrapped.Polygon(coordinates, {
                    color: color,
                    fillColor: color,
                    fillOpacity: polygonSettings.fillOpacity,
                    opacity: polygonSettings.strokeOpacity,
                    weight: polygonSettings.strokeWeight,
                    pane: 'footprintPane'
                }).addTo(EE.maps.map);

                // Add the mousemove listener to the footprint
                EE.maps.overlays.footprints[sceneId].on('mousemove', function (event)
                {
                    EE.maps.updateMouseLocation(event.latlng);
                });

                // Highlight effect for the footprints
                EE.maps.overlays.footprints[sceneId].on('mouseover', function (event)
                {
                    // Increase the opacity and brighten the color
                    EE.maps.overlays.footprints[sceneId].setStyle({
                        fillOpacity : EE.maps.settings.footprintDisplayDefaults.fillOpacity + 0.3,
                        fillColor: brightenColor(EE.maps.overlays.footprints[sceneId].color)
                    });
                });

                EE.maps.overlays.footprints[sceneId].on('mouseout', function (event)
                {
                    // Reset the opacity and color to default
                    EE.maps.overlays.footprints[sceneId].setStyle({
                        fillOpacity : EE.maps.settings.footprintDisplayDefaults.fillOpacity,
                        fillColor: EE.maps.overlays.footprints[sceneId].color
                    });
                });

                EE.maps.overlays.footprints[sceneId].color = color;
                EE.maps.overlays.footprints[sceneId].resultNum = resultNum;
                EE.maps.overlays.footprints[sceneId].remove();
                EE.maps.overlays.footprints[sceneId].luma = luma;
                EE.maps.overlays.footprints[sceneId].fpType = fpType;

                // Create the info window for this polygon
                EE.maps.overlays.infoWindows[sceneId] = L.popup({
                    maxHeight: 500
                });

                EE.maps.footprints.attachFootprintClickEvent(EE.maps.overlays.footprints[sceneId], collectionId, entityId, resultNum);
            }

            return (EE.maps.overlays.footprints[sceneId] !== undefined);
        },     
        hide: function (sceneId)
        {
            // Remove the icon background color
            var $footCell = $('#search-results-container').find('tr[data-scene-id="' + sceneId + '"] a.footprint');

            $footCell.css('background-color', 'transparent');

            // Switch back to the black footprint if luma is below threshold
            if (EE.maps.overlays.footprints[sceneId].luma < 100)
            {
                $footCell.children('div.ee-icon').attr('class', 'ee-icon ee-icon-footprint');
            }

            EE.maps.overlays.footprints[sceneId].remove();
            EE.maps.overlays.infoWindows[sceneId].remove();

            if ( $('#showAllFootprints').hasClass('showAll') === false)
            {
                if (EE.maps.footprints.allChecked())
                {
                    $('#showAllFootprints').prop('checked', true);
                }
                else
                {
                    $('#showAllFootprints').prop('checked', false);
                }
            }
        },
        hideAll: function ()
        {
            for (var sceneId in EE.maps.overlays.footprints)
            {
                EE.maps.footprints.hide(sceneId);
            }

            $('#showAllFootprints').prop('checked', false);
        },
        show: function (sceneId)
        {
            // Check if it is excluded first
            if ( $('#resultRow_' + sceneId).hasClass('excludedResultRow'))
            {
                return;
            }

            var $footCell = $('#search-results-container').find('tr[data-scene-id="' + sceneId + '"] a.footprint');

            $footCell.css('background-color', EE.maps.overlays.footprints[sceneId].color);

            // Check if the white footprint should be displayed
            if (EE.maps.overlays.footprints[sceneId].luma < 100)
            {
                $footCell.children('div.ee-icon').attr('class', 'ee-icon ee-icon-footprint-white');
            }

            EE.maps.overlays.footprints[sceneId].addTo(EE.maps.map);
            if ( $('#showAllFootprints').hasClass('showAll') === false)
            {
                EE.maps.centerOnFootprintAndBrowse();

                if (EE.maps.footprints.allChecked())
                {
                    $('#showAllFootprints').prop('checked', true);
                }
                else
                {
                    $('#showAllFootprints').prop('checked', false);
                }
            }
        },
        showAll: function (isChecked)
        {
            if (isChecked === true)
            {
                $('#showAllFootprints').addClass('showAll');
            }

            $('#search-results-container a.footprint:visible').each(function ()
            {
                // DATA-REPLACE var entityId = $(this).attr("id").substring(3);
                var sceneId = $(this).closest('tr').attr('data-scene-id');

                if (isChecked)
                {
                    // Show them all
                    if (EE.maps.overlays.footprints[sceneId] === undefined || EE.maps.map.hasLayer(EE.maps.overlays.footprints[sceneId]) === false)
                    {
                        $(this).trigger('click');
                    }
                }
                else
                {
                    // Hide them all
                    if (EE.maps.overlays.footprints[sceneId] !== undefined && EE.maps.map.hasLayer(EE.maps.overlays.footprints[sceneId]) === true)
                    {
                        $(this).trigger('click');
                    }
                }
            });

            $('#showAllFootprints').removeClass('showAll');

            // Center the map on the footprints
            EE.maps.centerOnFootprintAndBrowse();
        },
        toggle: function (collectionId, entityId, cornerPoints, resultNum, color, luma, type)
        {
            var sceneId = collectionId + '_' + entityId;

            if (EE.maps.overlays.footprints[sceneId] === undefined) {
                if (EE.maps.footprints.create(collectionId, entityId, cornerPoints, resultNum, color, luma, type) === false) {
                    return;
                }
            }

            if (EE.maps.map.hasLayer(EE.maps.overlays.footprints[sceneId]) === false) {
                EE.maps.footprints.show(sceneId);
            } else {
                EE.maps.footprints.hide(sceneId);
            }
        }
    },
    infoWindows: {
        clearAll: function ()
        {
            EE.maps.infoWindows.hideAll();

            EE.maps.overlays.infoWindows.length = 0;
            EE.maps.overlays.infoWindows = [];
        },
        hideAll: function ()
        {
            for (var sceneId in EE.maps.overlays.infoWindows)
            {
                EE.maps.overlays.infoWindows[sceneId].closePopup();
            }
        }
    },
    mapOverlays: {
    	addOverlay: function(url, id, wmsLayer, projection, style)
    	{
            //var index = EE.maps.map.overlayMapTypes.getLength();
            //EE.maps.map.overlayMapTypes.insertAt(index, new WMSMapType(url, id, wmsLayer, projection, style));

            //return index;
    	},
    	removeOverlay: function(id)
    	{
            EE.maps.map.overlayMapTypes.forEach(function(element, index)
            {
                if(element !== undefined && element.getLayerId() == id)
                {
                    //EE.maps.map.overlayMapTypes.removeAt(index);
                }
            });
    	}
    },
    mapTypes: {
    	availableMapTypes : [],
    	addMapType: function(mapTypeKey, url, wmsLayer, projection)
    	{
    		//Only add the layer if it doesn't already exist
    		if(EE.maps.mapTypes.availableMapTypes.indexOf(mapTypeKey) == -1)
    		{
	    		EE.maps.mapTypes.availableMapTypes.push(mapTypeKey);
				EE.maps.map.mapTypes.set(mapTypeKey, new WMSMapType(url, wmsLayer, projection));
			}
    	},
    	selectMapType: function(mapTypeKey)
    	{
    		//Make sure it exists before we try selecting it
    		if(EE.maps.mapTypes.availableMapTypes.indexOf(mapTypeKey) != -1)
    		{
    			EE.maps.map.setMapTypeId(mapTypeKey);
    			return true;
    		}
    		else
    		{
    			return false;
    		}
    	}
    },
    markers: {
        attachDragEndListener: function (marker, index) {
            marker.on('dragend', function(event)
            {
                var mouseLocation = event.target.getLatLng().wrap();

                EE.maps.coordinateList[index] = mouseLocation;

                EE.maps.polygon.redraw();

                // Update the coordinates entry area
                var $coordinateElement = $('#coordinate_' + index);
                var latitude = mouseLocation.lat;
                var longitude = mouseLocation.lng;

                $coordinateElement.children('div.format_dd').children('span.latitude').html(parseFloat(latitude).toFixed(EE.coordinatePrecision));
                $coordinateElement.children('div.format_dd').children('span.longitude').html(parseFloat(longitude).toFixed(EE.coordinatePrecision));

                var dmsLatitude = convertDecToDMS(latitude, 'lat', true);
                var dmsLongitude = convertDecToDMS(longitude, 'lng', true);

                $coordinateElement.children('div.format_dms').children('span.latitude').html(dmsLatitude);
                $coordinateElement.children('div.format_dms').children('span.longitude').html(dmsLongitude);
                EE.maps.settings.dragLock = false;
            });
        },
        clear: function ()
        {
            var markers = EE.maps.overlays.markers;

            for (var i = 0; i < markers.length; i++)
            {
                markers[i].remove();
            }

            EE.maps.overlays.markers.length = 0;
        },
        create: function (index)
        {
            // Create the numbered marker
            var marker = L.marker(EE.maps.coordinateList[index], {
                alt: '' + (index + 1),
                title: '' + (index + 1),
                draggable: (EE.tabs.tabInfo.getCurrent() == 1),
            }).addTo(EE.maps.map);

            // Attach the dragstart event
            marker.on('dragstart', function()
            {
                EE.maps.settings.dragLock = true;
            });

            EE.maps.overlays.markers.push(marker);
            EE.maps.markers.attachDragEndListener(marker, index);
        },
        detachDragEndListener: function (index) {
            EE.maps.overlays.markers[index].off('dragend');
        },
        hide: function() {
            for (var i in EE.maps.overlays.markers)
            {
                EE.maps.overlays.markers[i].remove();
            }
        },
        redraw: function () {
            var currentTab = EE.tabs.tabInfo.getCurrent();
            var markerLength = EE.maps.overlays.markers.length;

            if (markerLength == 1)
            {
                if (currentTab == 1) {
                    EE.maps.overlays.markers[0].dragging.enable();
                } else {
                    EE.maps.overlays.markers[0].dragging.disable();
                }

                EE.maps.overlays.markers[0].options.title = (currentTab == 1)? '1' : 'Area of Interest';
                EE.maps.overlays.markers[0].addTo(EE.maps.map);
            }
            else
            {
                for (var index = 0; index < markerLength; index++)
                {
                    if (currentTab == 1) {
                        EE.maps.overlays.markers[index].addTo(EE.maps.map);
                    } else {
                        EE.maps.overlays.markers[index].remove();
                    }
                }
            }
        },
        remove: function (index) {
            EE.maps.overlays.markers[index].remove();
            EE.maps.overlays.markers.splice(index, 1);

            var length = EE.maps.overlays.markers.length;

            // If this wasn't the last marker, have to do some reordering
            if (index < length)
            {
                for (var i = index; i < length; i++)
                {
                    EE.maps.overlays.markers[i].options.title = '' + (i + 1);

                    // Reset the listener
                    EE.maps.markers.detachDragEndListener(i);
                    EE.maps.markers.attachDragEndListener(EE.maps.overlays.markers[i], i);
                }
            }
        },
        show: function () {
            for (var i in EE.maps.overlays.markers)
            {
                EE.maps.overlays.markers[i].addTo(EE.maps.map);
            }
        },
        update: function (index) {
            EE.maps.overlays.markers[index].setLatLng(EE.maps.coordinateList[index]);
        }
    },
    polygon: {
        clear: function () {
            if (EE.maps.overlays.polygon !== null) {
                EE.maps.overlays.polygon.remove();
                EE.maps.overlays.polygon = null;
            }
            
            var type = $('#polygonType').val();

            if (type === 'shape') {
                // Empty the shape control box
                $('#areaShapeSection').find('.boundaryName').text('No shape loaded.');
            } else if (type === 'circle') {
                //cmay - Is this covered by the redraw fun
                $('#centerLat').val('');
                $('#centerLng').val('');
                $('#circleRadius').val('');
                $('#unitType').val('m');
            }
        },
        decreaseOpacity: function () {
            if (EE.maps.overlays.polygon !== null && EE.maps.overlays.polygon.map !== undefined) {
                EE.maps.overlays.polygon.setStyle({
                    fillOpacity: EE.maps.settings.areaOfInterest.fillOpacity * 0.6,
                    opacity: EE.maps.settings.areaOfInterest.strokeOpacity * 0.625
                });
            }
        },
        hide: function () {
        },
        increaseOpacity: function () {
            if (EE.maps.overlays.polygon !== null && EE.maps.overlays.polygon.map !== undefined) {
                EE.maps.overlays.polygon.setStyle({
                    fillOpacity: EE.maps.settings.areaOfInterest.fillOpacity,
                    opacity: EE.maps.settings.areaOfInterest.strokeOpacity
                });
            }
        },
        redraw: function (centerOnMap) {
            centerOnMap = (centerOnMap !== undefined && centerOnMap === true);
            var polygonType = $('#polygonType').val();
            
            var styleOptions = {                         
                    color: EE.maps.settings.areaOfInterest.strokeColor,
                    opacity: EE.maps.settings.areaOfInterest.strokeOpacity,
                    weight: EE.maps.settings.areaOfInterest.strokeWeight,
                    fillColor: EE.maps.settings.areaOfInterest.fillColor,
                    fillOpacity: EE.maps.settings.areaOfInterest.fillOpacity,
                    pane: 'aoiPane',
                    clickable: false
            };
            
            //First we need to make sure we have an AOI object - if not try to create it
            if (EE.maps.overlays.polygon === null) {
                if (polygonType === 'circle') {
                    if (EE.maps.coordinateList.length === 0) {
                        EE.maps.circleCoder.updateLocation(null, 0, null);
                        
                        //No coordinates so nothing to draw
                        return;
                    }
                    
                    styleOptions.radius = 0;
                    if (EE.maps.coordinateList.length === 2) {
                        styleOptions.radius = distance(EE.maps.coordinateList[0], EE.maps.coordinateList[1]);
                    }
                    
                    EE.maps.circleCoder.updateLocation(EE.maps.coordinateList[0], styleOptions.radius, null);
                    EE.maps.overlays.polygon = new L.Circle(EE.maps.coordinateList[0], styleOptions).addTo(EE.maps.map);
                } else if (polygonType === 'polygon') {
                    if (EE.maps.coordinateList.length === 0) {
                        //No coordinates so nothing to draw
                        return;
                    }
                    
                    EE.maps.overlays.polygon = new L.polygon(EE.maps.coordinateList, styleOptions).addTo(EE.maps.map); 
                    //EE.maps.overlays.polygon = new L.Wrapped.Polygon(EE.maps.coordinateList, styleOptions).addTo(EE.maps.map);  
                } else {
                    var spatialId = $('#areaShapeSection').find('.boundaryName').data('boundaryId');

                    $.ajax({
                        dataType: 'json',
                        method: 'get',
                        url: EE.defaultUrl + 'geocoder/boundary/spatial',
                        data: {
                            spatialId: spatialId
                        }
                    }).fail(function () {
                        // TODO: Let the generic error handler take care of errors?
                    }).done(function (json) {
                        if (json.error) {
                            createGrowl('Predefined Spatial Unavailable', json.message);
                            return;
                        }

                        if (json.geoJson === null) {
                            createGrowl('Predefined Spatial Unavailable', 'Could not find spatial definition');
                            return;
                        }

                        EE.maps.overlays.polygon = new L.geoJSON(json.geoJson, styleOptions).addTo(EE.maps.map);
                        
                        if (centerOnMap) {
                            EE.maps.map.fitBounds(EE.maps.overlays.polygon.getBounds());
                        }
                    });
                    
                    return;
                }
            } else {
                //Just an update
                if (polygonType === 'circle') {
                    var radius = 0;
                    var center = EE.maps.coordinateList[0];
                    
                    if (EE.maps.coordinateList.length == 2) {
                        radius = distance(center, EE.maps.coordinateList[1]);
                    }
                    
                    EE.maps.circleCoder.updateLocation(center, radius, null);
                    EE.maps.overlays.polygon.setLatLng(center);
                    EE.maps.overlays.polygon.setRadius(radius);
                } else if (polygonType === 'polygon') {               
                    EE.maps.overlays.polygon.setLatLngs(EE.maps.coordinateList);
                }

                EE.maps.overlays.polygon.redraw();
            }
            
            if (centerOnMap) {
                EE.maps.centerMap();
            }
        },
        show: function () {
        }
    },

    // TODO: See if you can improve this!!
    updateMouseLocation: function (latLng)
    {
        // To increase performance, do not update mouse location while dragging
        if (EE.maps.settings.dragLock === true)
        {
            return;
        }

        //Make sure we're in the projection space
        if (EE.maps.settings.showRealCoordinates === false) {
            latLng = latLng.wrap();
        }

        var latitude = latLng.lat.toFixed(EE.coordinatePrecision);
        var longitude = latLng.lng.toFixed(EE.coordinatePrecision);

        if (EE.maps.settings.getFormat() == 'dms')
        {
            var dmsLatitude = convertDecToDMS(latitude, 'lat', true);
            var dmsLongitude = convertDecToDMS(longitude, 'lng', true);

            latitude = dmsLatitude;
            longitude = dmsLongitude;
        }

        $('#mouseLatLng').html("(" + latitude + ", " + longitude + ")");
    },
    googleCoder: {
        clear: function () {
            $('#googleAddress').val('');
            $('#googleResults').stop(true, true).hide();//slideUp(EE.resultsSlideSpeed);
            $('#geoErrorMessage').stop(true, true).hide();
        },
        codeAddress: function()
        {
            //If the user isn't logged in, this should be done
            if (EE.auth === false) {
                return;
            }

            // Hide the previous results
            $('#googleResults').stop(true, true).hide();

            var address = $("#googleAddress").val();

            if (EE.maps.geocoder === null) {
                // Load the Geocoder
                EE.maps.geocoder = new google.maps.Geocoder();
            }

            $.ajax({
                url: EE.defaultUrl + 'geocoder/google',
                type: 'POST',
                cache: false,
                async: true,
                data: {searchTerm: address},
                dataType: 'json',
                success: function (response)
                {
                    if (response.success) {
                        EE.maps.geocoder.geocode({'address': address}, function (results, status)
                        {
                            if (status == google.maps.GeocoderStatus.OK)
                            {
                                $('#googleRow').hide().html('');
                                $('#geoErrorMessage').stop(true, true).hide();

                                var place, html = '';

                                for (var i = 0; i < results.length; i++)
                                {
                                    place = results[i];
                                    html += '<tr' + (((i + 1) % 2 === 0)? ' class="even"' : '') + '>';
                                    html += '<td class="resultNum">' + (i + 1) + '</td>';
                                    html += '<td><a class="address">' + place.formatted_address + '</a></td>';
                                    html += '<td nowrap="nowrap" class="lat">' + place.geometry.location.lat().toFixed(EE.coordinatePrecision) + '</td>';
                                    html += '<td nowrap="nowrap" class="lng">' + place.geometry.location.lng().toFixed(EE.coordinatePrecision) + '</td>';
                                    html += '</tr>';
                                }
                                $('#googleRow').html(html).show();
                                $('#googleResults').stop(true, true).show();//slideDown(EE.resultsSlideSpeed);
                            }
                            else
                            {
                                if (status == google.maps.GeocoderStatus.ZERO_RESULTS)
                                {
                                    $('#geoErrorMessage').html('There were no results for your search query.');
                                }
                                else
                                {
                                    $('#geoErrorMessage').html('We were unable to locate the address or place you specified. Please make sure it is a valid location.');
                                }

                                $('#geoErrorMessage').stop(true, true).show();//slideDown(EE.resultsSlideSpeed);
                            }
                        });

                    } else {
                        $('#geoErrorMessage').html(response.message);
                        $('#geoErrorMessage').stop(true, true).show();
                    }
                },
                fail: function()
                {
                    $('#geoErrorMessage').html('Geocoding Failed');
                    $('#geoErrorMessage').stop(true, true).show();
                }
            });
        }
    },
    pathrowCoder: {
        clear: function ()
        {
            $('#pathAddress').val('');
            $('#rowAddress').val('');
            $('#typeAddress').val('WRS2');
            $('#geoErrorMessage').stop(true, true).hide();
        },
        showLocation: function ()
        {
            var path = $('#pathAddress').val();
            var row = $('#rowAddress').val();
            var type = $('#typeAddress').val();
            var wrsType = ($('#wrsTypePoint').prop('checked'))? 'Point' : 'Polygon';

            $('#geoErrorMessage').stop(true, true).hide();

            $.ajax({
                url: EE.defaultUrl + 'geocoder/wrs',
                type: 'GET',
                cache: false,
                async: true,
                data: {path: path, row: row, type: type, wrsType: wrsType},
                dataType: 'json',
                success: function (response)
                {
                    if (response.success) {
                        EE.maps.displayCoderResult(response.coordinates);
                        EE.maps.pathrowCoder.clear();
                    } else {
                        $('#geoErrorMessage').html(response.message);
                        $('#geoErrorMessage').stop(true, true).show();
                    }
                }
            });
        }
    },
    featureCoder: {
        clear: function ()
        {
            $('#featureName').val('');
            $('#featureUSState').val('');
            $('#featureUSType').val('');
            $('#featureWorldCountry').val('');
            $('#featureWorldClass').val('');
            $('#featureWorldType').val('');

            $('#featureResults').stop(true, true).hide();
            $('#geoErrorMessage').stop(true, true).hide();
        },
        codeAddress: function()
        {
            // Hide the previous results
            $('#featureResults').stop(true, true).hide();

            var featureType = ($('#featureTypeUS').is(':checked'))? 'US' : 'World';

            var data = {
                featureType: featureType,
                name: $('#featureName').val()
            };

            if (featureType == 'US')
            {
                data.state = $('#featureUSState').val();
                data.type = $('#featureUSType').val();
            } else {
                data.country = $('#featureWorldCountry').val();
                data.featureClass = $('#featureWorldClass').val();
                data.type = $('#featureWorldType').val();
            }

            $('#geoErrorMessage').stop(true, true).hide();

            $('#geoErrorMessage').html('<i class="far fa-lg fa-spinner fa-spin" title="Loading Results"></i> Loading results...').show();

            $.ajax({
                url: EE.defaultUrl + 'geocoder/feature/search',
                type: 'GET',
                cache: false,
                async: true,
                data: data,
                dataType: 'json',
                success: function (response)
                {
                    if (response.results.length > 0)
                    {
                        $('#featureRow').hide().html('');
                        $('#geoErrorMessage').stop(true, true).hide();

                        var place, html = '';

                        for (var i = 0; i < response.results.length; i++)
                        {
                            place = response.results[i];

                            if (data.featureType === 'US') {
                                html += '<tr' + (((i + 1) % 2 === 0)? ' class="even"' : '') + '>';
                                html += '<td><a class="address">' + place.placename + '</a></td>';
                                html += '<td>' + place.feature_type + '</td>';
                                html += '<td>' + place.state_name + '</td>';
                                html += '<td nowrap="nowrap" class="lat">' + parseFloat(place.lat_dd).toFixed(EE.coordinatePrecision) + '</td>';
                                html += '<td nowrap="nowrap" class="lng">' + parseFloat(place.lon_dd).toFixed(EE.coordinatePrecision) + '</td>';
                                html += '</tr>';
                            } else {
                                html += '<tr' + (((i + 1) % 2 === 0)? ' class="even"' : '') + '>';
                                html += '<td><a class="address">' + place.placename + '</a></td>';
                                html += '<td>' + place.feature_name + '</td>';
                                html += '<td>' + place.country_name + '</td>';
                                html += '<td nowrap="nowrap" class="lat">' + parseFloat(place.latitude).toFixed(EE.coordinatePrecision) + '</td>';
                                html += '<td nowrap="nowrap" class="lng">' + parseFloat(place.longitude).toFixed(EE.coordinatePrecision) + '</td>';
                                html += '</tr>';
                            }
                        }
                        $('#featureRow').html(html).show();
                        $('#featureResults').stop(true, true).show();
                    }
                    else
                    {
                        $('#geoErrorMessage').html('We were unable to locate the address or place you specified. Please make sure it is a valid location.');
                        $('#geoErrorMessage').stop(true, true).show();
                    }
                }
            });
        }
    },
    calValCoder: {
        clear: function ()
        {
            $('#calValSiteType').val('-1').trigger('change');
        },
        showLocation: function ()
        {
            var type = $('#calValSiteList').val() | 0;
            if (type <= 0) {
                alert("You must select a valid Type and Cal/Val Site.");

                return;
            }

            // Add the coordinates
            var calValSiteOption = $('#calValSiteList').find('option:selected');
            EE.maps.coordinates.add(new L.LatLng(calValSiteOption.data('latitude'), calValSiteOption.data('longitude')));

            // Center the map on the AOI polygon
            EE.maps.centerMap();
            
            EE.maps.calValCoder.clear();
        }
    },
    circleCoder: {
        clear: function ()
        {
            $('#centerLat').val('');
            $('#centerLng').val('');
            $('#circleRadius').val('');
            $('#unitType').val('m');
        },
        showLocation: function ()
        {
            var distance = parseFloat($('#circleRadius').val());
            var unitType = $('#unitType').val();
            var result = validateDialogInput($('#centerLat').val(),$('#centerLng').val(),'dd');

            if (!result.valid) {
                alert("Error: " + result.message);
                return;
            } else if (!isNumber($('#circleRadius').val())) {
                alert("Error: Invalid radius input. Must contain only digits.");
                return;
            }

            if (unitType == 'km') {
                distance *= 1000;
            } else if (unitType == 'mi') {
                var METERS_PER_MILE = 1609.344;
                distance *= METERS_PER_MILE;
            }

            var centerPoint = new L.LatLng(parseFloat($('#centerLat').val()), parseFloat($('#centerLng').val()));
            
            //Create a circle - we don't need to do the math as long as we add it to the map so it gets the correct projection information
            var circle = new L.Circle(centerPoint, {
                stroke: false,
                fill: false,
                radius: distance
            }).addTo(EE.maps.map);

            //Get the bounds for the longitude, we can use the latitude from the center point
            var outerPoint = new L.LatLng(centerPoint.lat, circle.getBounds().getNorthEast().lng);
            circle.remove();

            // Clear out the existing coordinates
            EE.maps.coordinates.clear();

            // Add the new points
            EE.maps.coordinates.add(centerPoint);
            EE.maps.coordinates.add(outerPoint);

            // Center the map on the AOI polygon
            EE.maps.centerMap();
            
            //Clear out the UI
            EE.maps.circleCoder.updateLocation(centerPoint, distance, unitType);
        },
        updateLocation: function(center, radius, unitType)
        {
            
            if (center !== undefined && center !== null) {
                var latitude = center.lat.toFixed(EE.coordinatePrecision);
                $('#centerLat').val(center.lat);
                
                var longitude = center.lng.toFixed(EE.coordinatePrecision);
                $('#centerLng').val(center.lng);

                if (EE.maps.settings.getFormat() == 'dms') {
                    latitude = convertDecToDMS(latitude, 'lat', true);
                    longitude = convertDecToDMS(longitude, 'lng', true);
                }
                
                if (radius > 0) {
                    if (unitType == null) {
                        if (radius > 1000) {
                            radius /= 1000;
                            $('#unitType').val('km');
                        } else {
                            $('#unitType').val('m');
                        }
                    } else if (unitType == 'km') {
                        radius /= 1000;
                        $('#unitType').val('km');
                    } else if (unitType == 'mi') {
                        radius /= 1609.344;
                        $('#unitType').val('mi');
                    } else {
                        $('#unitType').val('m');
                    }
                    $('#circleRadius').val(radius);
                }
            }
        }
    },
    displayCoderResult: function (coordinates)
    {
        EE.maps.coordinates.clear();

        $('#googleResults').slideUp(EE.resultsSlideSpeed);
        $('#geoErrorMessage').slideUp();

        for (var coordinate in coordinates)
        {
            EE.maps.coordinates.add(new L.LatLng(coordinates[coordinate][0], coordinates[coordinate][1]));
        }

        EE.maps.centerMap();
    },
    centerOnFootprintAndBrowse: function ()
    {
        if ($('#optionAutoCenter').prop('checked')) {
            var bounds = new L.LatLngBounds();
            for (var index in EE.maps.overlays.footprints) {
                if (EE.maps.map.hasLayer(EE.maps.overlays.footprints[index]) === true) {
                	if (EE.maps.overlays.footprints[index].fpType == 'point') {
                		bounds.extend(EE.maps.overlays.footprints[index].getLatLng());
                	} else {
	                    bounds.extend(EE.maps.overlays.footprints[index].getBounds());
                        }
                }
            }

            for (var index in EE.maps.overlays.browse) {
                if (EE.maps.map.hasLayer(EE.maps.overlays.browse[index]) === true) {
                    bounds.extend(EE.maps.overlays.browse[index].bounds);
                }
            }

            if (bounds.isValid()) {
                EE.maps.map.fitBounds(bounds);
            }
        }

        if ($('#aoiOverlaysOrder').val() === "BelowSceneOverlay" && (EE.maps.coordinateList.length > 2)) {
            EE.maps.map.getPane('aoiPane').style.zIndex = 401;
        } else {
            EE.maps.map.getPane('aoiPane').style.zIndex = 449;
        }
    }
};
