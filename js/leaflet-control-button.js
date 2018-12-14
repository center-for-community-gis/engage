/*
 * L.Control.Button
 * A map control which fires some callback specified in the constructor options
 * Great for arbitrary buttons not covered by any existing control
 */
L.Control.Button = L.Control.extend({
    options: {
        position: 'topright',
        callback: function () {},
        tooltip: "",
        iconClass: ''
    },
    initialize: function(options) {
        L.setOptions(this, options);
    },
    onAdd: function (map) {
        // add a linkage to the map, since we'll be managing map layers
        this.map = map;
        this.active = false;

        // create our button, inserting whatever CSS class we were given which presumably sets up an icon or some such
        // and then binding the click to whatever callback they passed in
        this.controlDiv           = L.DomUtil.create('div', 'leaflet-bar leaflet-control-button');
        this.controlDiv.control   = this;
        this.controlDiv.title     = this.options.tooltip;
        this.controlDiv.innerHTML = '<a href="#">' + this.options.iconClass + '</a>';
        L.DomEvent
            .addListener(this.controlDiv, 'mousedown', L.DomEvent.stopPropagation)
            .addListener(this.controlDiv, 'click', L.DomEvent.stopPropagation)
            .addListener(this.controlDiv, 'click', L.DomEvent.preventDefault)
            .addListener(this.controlDiv, 'click', this.options.callback);

        // done!
        return this.controlDiv;
    }
});