L.TileLayer.WMS.DMID = L.TileLayer.extend({
    initialize: function (imageUrl, latlngs, options) {
        this._url = imageUrl;
        this._latlngs = latlngs;
        this._bounds = L.latLngBounds();
        this._crossesAM = false;

        //Loop through the coordinates and see if this scene is crossing the antimeridian
        for (var i=0 ; i < latlngs.length ; i++) {
            this._bounds.extend(latlngs[i]);
            
            if (AntimeridianUtils.isCrossMeridian(latlngs[i], latlngs[(i + 1 === latlngs.length ? 0 : i + 1)])) {
                this._crossesAM = true;
            }
        }

        options.bounds = this._bounds;
        options.tileSize = 256;
        options.pane = 'browseOverlayPane';

        L.setOptions(this, options);
    },
    getTileUrl: function(coords)
    {
        // setup tile width and height according to the options
        var size = this.getTileSize();
        
        //This gives us the center point of the tile
        //We can't let the map object run this because the new zoom level (if zooming) is not set, so it will give bad coordinates
        var upperLeft = this._map.options.crs.pointToLatLng(coords.scaleBy(size), coords.z);
        var lowerRight = this._map.options.crs.pointToLatLng((new L.Point(coords.x + 1, coords.y + 1)).scaleBy(size), coords.z);
        
        //If we are on the east side of the world and we're crossing the anti-meridian we need to unwrap the coordinates
        if (this._crossesAM && upperLeft.lng > 0) {
            upperLeft.lng -= 360; 
            lowerRight.lng -= 360;
        }

        // set parameters needed for GetFeatureInfo WMS request
        var nw = this._map.options.crs.project(upperLeft);
        var se = this._map.options.crs.project(lowerRight);

        return this._url + '&srs=EPSG:3857&format=image/png&transparent=true&version=1.1.1&height=' + size.y +  '&width=' + size.x + '&bbox=' + nw.x + "," + se.y + "," + se.x + "," + nw.y;
    }
});

L.tileLayer.wms.dmid = function(imageUrl, latlngs, options) {
    if (latlngs.length === 0) {
        console.log('Tried adding a WMS layer without latlngs');
        return null;
    }
    
    if (options === undefined) {
        options = {};
    }
    
    return new L.TileLayer.WMS.DMID(imageUrl, latlngs, options);
};
