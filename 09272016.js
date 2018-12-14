var MAP;
var PEOPLE_MARKERS_ALL, PEOPLE_MARKERS_VISIBLE;
var BASEMAPS = {};
var OVERLAYS = {};

// the list of dates which we can browse,
// the one that's currently selected,
// and Today so we can diifferentiate calls that are in progress from those that are in the past (false/demo data, no real call-start call-end dates & times)
var AVAILABLE_DATES = [
    '20160927',
	'20160926',
	'20160325',
];
var SELECTED_DATE;
var TODAY = '20160927';

var CSV_TRANSLATIONS = {
    'team': {
        'Sales': 'sales',
        'Prospect': 'prospect',
        'Proctor': 'proctor',
        'Marketing': 'marketing',
        'Education': 'education',
        'Excutive': 'executive',
        'Product Development': 'rd',
    },
    'status': {
        'Available': 'available',
        'Online but unavailable': 'unavailable',
        'In a session': 'insession',
        'Offline': 'offline',
    },
};

var CONNECTIONS_STYLE = {
    weight: 5,
    opacity: 0.5,
    color: '#41a1e0',
    steps: 50
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

$(document).ready(function () {
    initMap();
    initCategoryPanels();
    initCalendar();
    initLayerPicker();

    // and kick it off by selecting whatever the highest date is
    $('#calendar select').trigger('change');
});

function initLayerPicker() {
    // the layer picker has custom actions depending on what was toggled
    // some toggle tile layers, some toggle featuregroup layers, ...
    $('#layerpicker input[type="checkbox"]').change(function () {
        var checked   = $(this).is(':checked');
        var layername = $(this).prop('value');
        switch (layername) {
            case 'connections':
            case 'hospitals':
            case 'obesity':
                checked ? MAP.addLayer(OVERLAYS[layername]) : MAP.removeLayer(OVERLAYS[layername]);
                break;
            default:
                throw "initLayerPicker() unexpected layer checkbox";
                break;
        }
    });

    $('#layerpicker input[type="radio"]').click(function () {
        var which = $(this).val();
        Object.keys(BASEMAPS).forEach(function (layername) {
            which == layername ? MAP.addLayer(BASEMAPS[layername]) : MAP.removeLayer(BASEMAPS[layername]);
        });
    });
}

function initMap() {
    // the basic map
    // and a choice of two basemaps so they can decide which one they like
    MAP = new L.Map('map', {
        zoomControl: false,
        center: [37.0902, -95.7129],
        zoom: 4,
        minZoom: 4,
        maxZoom:12
    });

    BASEMAPS['darkmatter'] = L.tileLayer('http://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',{ zIndex:1, attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>' }).addTo(MAP);
    BASEMAPS['positron']   = L.tileLayer('http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',{ zIndex:1, attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>' });


    // the obesity layer
    $.getJSON("obesitystates.geojson", function(obesityData) {
        zIndex: 10,
        OVERLAYS['obesity'] = L.geoJson(obesityData, {
            style: function(feature) {
                var fillColor = "#f7f7f7";
                if      (feature.properties.Percent >= 35) fillColor = "#b36336";
                else if (feature.properties.Percent >= 30) fillColor = "#cc8d68";
                else if (feature.properties.Percent >= 25) fillColor = "#e0b9a2";
                else if (feature.properties.Percent >= 20) fillColor = "#f2ebe6";
                return { color: "#fff", weight: 1, fillColor: fillColor, fillOpacity: 0.5 };
            },
            onEachFeature: function( feature, layer ){
                layer.bindPopup( "<h1>" + feature.properties.State + "</h1><br/><h2>" + feature.properties.Percent + " Percent</h2><br/><h2>" + feature.properties.ninetyfiveperccon + " - 95% Confidence Interval</h2>");
            }
        })
    });
	
	/* the hospitals layer
	var layerUrl = 'https://greeninfo.carto.com/api/v2/viz/32a160ec-6d84-11e6-a56a-0ecd1babdde5/viz.json';

    OVERLAYS['hospitals'] = cartodb.createLayer(MAP, layerUrl)
     .on('done', function(layer) {
      layer.setZIndex(101);
    }).on('error', function() {
      //log the error
    });*/
	
    //the hospitals layer
    OVERLAYS['hospitals'] = L.tileLayer('https://api.mapbox.com/styles/v1/tsinn/cis8y6vnt001m2xt60jeu2lo1/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoidHNpbm4iLCJhIjoiSzNFbzBmdyJ9.-Q5jOj1mY7z9x6mSIVEEiQ', { zIndex:100 });

    // the reset button and done button and zoom button
    new L.Control.Zoom({
        position: 'bottomleft'
    }).addTo(MAP);
    new L.Control.Button({
        position: 'bottomleft',
        callback: function () {
            // a button to click Reload for them and reload the page
            document.location.href = document.location.href;
        },
        tooltip: "Reset and start over",
        iconClass: '<i class="glyphicon glyphicon-repeat"</i>'
    }).addTo(MAP);
    new L.Control.Button({
        position: 'bottomleft',
		callback: function () {
            // a button to click Reload for them and reload the page
            window.location.href = "#";
        },
        tooltip: "Return to demonstration",
        iconClass: '<i class="glyphicon glyphicon-chevron-left"</i>'
    }).addTo(MAP);
	
    // the empty feature group for the people markers
    PEOPLE_MARKERS_ALL = L.featureGroup([]).addTo(MAP);
    PEOPLE_MARKERS_VISIBLE = L.featureGroup([]).addTo(MAP);

    // great-circle lines for the various call interconnections represented in the CSV
    OVERLAYS['connections'] = L.featureGroup([]);
}

function initCategoryPanels() {
    // clicking a category item shows/hides the list of people in the category, itself a panel
    $('#categorypicker div[data-category]').click(function () {
        var which   = $(this).attr('data-category');
        var $panels = $('div.categoryinfo');
        var $panel  = $panels.filter('[data-category="'+ which +'"]');
        if ($panel.is(':visible')) {
            $panels.hide(); // is visible: hide all panels  (should only be the one, but ya know...)
        }
        else {
            $panels.hide(); // is not visible: show it and hide any others, trigger resize to position it
            $panel.show();
            $(window).resize();
        }
    });

    // each of the category panels also has a toggle button to toggle people-markers in that category
    $('div.categoryinfo input[type="checkbox"]').change(function () {
        updateMarkersOnMap();
    });    

    // clicking a person entry in any of the category sections, triggers a click on their marker
    // but it's not that simple of course: they may have the layer un-checked, and we'd want to correct that
    $('div.categoryinfo ul').on('click', 'li', function () {
        var id     = $(this).attr('data-person-id');
        var $check = $(this).closest('div.categoryinfo').find('input[type="checkbox"]');

        // close all the category panels, so as to maximize the map view
        // may want to not do this after all, as it interrupts the browsing of the list of people... which behavior is less annoying to the fewest number of people?
        $('div.categoryinfo').hide();

        if ($check.is(':checked')) {
            clickMarkerByPersonId(id);
        }
        else {
            $check.prop('checked',true).trigger('change');
            setTimeout(function () {
                clickMarkerByPersonId(id);
            }, 125);
        }
    });
}

function initCalendar() {
    // populate the calendar picker so they can choose a date
    // then pick the latest date available
    var $picker = $('#calendar select').change(function () {
        SELECTED_DATE = $(this).val();
        loadCallsByDate(SELECTED_DATE);
    });

    AVAILABLE_DATES.sort();
    AVAILABLE_DATES.reverse();
    AVAILABLE_DATES.forEach(function (yyyymmdd) {
        var datestring = new Date();
        datestring.setYear(parseInt(yyyymmdd.substr(0,4)));
        datestring.setMonth(parseInt(yyyymmdd.substr(4,2))-1);
        datestring.setDate(parseInt(yyyymmdd.substr(6,2)));
        datestring = datestring.toDateString();

        $('<option></option>').prop('value',yyyymmdd).text(datestring).appendTo($picker);
    });
}

$(window).resize(function () {
    // if we have any of the categoryinfo popups visible, position them to the #categorypicker link that opened them
    var $panel = $('div.categoryinfo:visible');
    if ($panel.length) {
        var category = $panel.attr('data-category');
        var button = $('#categorypicker div[data-category='+category+']');
        var left = button.offset().left + 2;
        $panel.offset({ left:left, top:42 });
    }
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// WARNING: the data structure here used is wholly untenable for production: call data are attributes inside each user's record, as to whether they engaged in up to 3 calls today
//          and the call-IDs are not unique between these "sessions"  It's just a demo! in the real world we would need Call separated out from People, then related back to which People were on which Calls...
// WARNING: for real data there would be overlap significant in markers e.g. five people with the exact same latlng of Chicago, IL
//          so marker clustering would need to happen
function loadCallsByDate(yyyymmdd) {
    // fetch the call info for this date: a CSV file
    // then empty the current map content and load it with the new content
    var url = 'csv/' + yyyymmdd + '.csv';
    $.get(url, {}, function (csv) {
        var people = $.csv.toObjects(csv);

        // empty the existing map markers, and people listings by category
        PEOPLE_MARKERS_ALL.clearLayers();
        PEOPLE_MARKERS_VISIBLE.clearLayers();
        $('div.categoryinfo ul').empty();

        // from the new list of people, load the new universe of markers into the map and into the listings
        people.forEach(function (person) {
            if (! person.latitude || ! person.longitude) return; // bad coords = can't map, skip it
            if (! CSV_TRANSLATIONS.team[person.team])      { console.error("Person " + person.id + " has unknown team: " + person.team); return; }
            if (! CSV_TRANSLATIONS.status[person.status])  { console.error("Person " + person.id + " has unknown status: " + person.status); return; }
            // console.log(person);

            // data massage: they screwed up the two demo CSVs and gave them different fields
            // rename and add nulls for various things so they all follow the one structure that has "up to three" calls embedded into it
            if (typeof person.call_numbe !== 'undefined') {
                person.call1_numb = person.call_numbe;
                person.initiate_1 = person.initiated_;
                person.call2_numb = 0;
                person.initiate_2 = 0;
                person.call3_numb = 0;
                person.initiate_3 = 0;

                delete(person.call_numbe);
                delete(person.initiated_);
            }

            // data massage: correct some field types
            person.id         = parseInt(person.id);
            person.latitude   = parseFloat(person.latitude);
            person.longitude  = parseFloat(person.longitude);
            person.call1_numb = parseInt(person.call1_numb);
            person.initiate_1 = parseInt(person.initiate_1);
            person.call2_numb = parseInt(person.call2_numb); // not used at all
            person.initiate_2 = parseInt(person.initiate_2); // not used at all
            person.call3_numb = parseInt(person.call3_numb); // not used at all
            person.initiate_3 = parseInt(person.initiate_3); // not used at all

            // make up their icon:
            // if in the past: icon is based on their team
            // if today: their team and their chat status, but of course we need to massage around their words not matching to the CSV content
            var icon_url = 'icon/ico_past-' + CSV_TRANSLATIONS.team[person.team] + '.png';
            if (SELECTED_DATE == TODAY) icon_url = 'icon/ico_' + CSV_TRANSLATIONS.status[person.status] + '-' + CSV_TRANSLATIONS.team[person.team] + '.png';

            var icon = {
                iconUrl: icon_url,
                iconSize: [ 50, 58 ],
                iconAnchor: [ 25, 58 ],
                popupAnchor: [ 0, -50 ]
            };

            // make up a tooltip title for the marker
            var title = person.name + ', ' + person.role + ', (' + person.status +')';

            // make up the HTML for their popup; goes with a bunch of CSS as well to give sharp corners, edge-to-edge color, etc.
            // for styling, see div.leaflet-popup-content
            var html = ''

            // depending on whether they're in session or available, and whether the session is in the past (big hack here, non-production!!!)
            // give them a bar to call them, join the call, or view the call history
            switch (CSV_TRANSLATIONS.status[person.status]) {
                case 'available':
                    if (SELECTED_DATE == TODAY) {
                        html += '<a target="_blank" href="' + '#' + '"><h1 class="session-available"><img class="infowindow-header-icon" src="./icon/startacallnow.png" /> Start a Call Now</h1></a>';
                    }
                    break;
                case 'insession':
                    if (SELECTED_DATE == TODAY) {
                        html += '<a target="_blank" href="' + '#' + '"><h1 class="session-join"><img class="infowindow-header-icon" src="./icon/jointhissession.png" /> Join This Session</h1></a>';
                    }
                    else {
                        html += '<a target="_blank" href="' + '#' + '"><h1 class="session-past"><img class="infowindow-header-icon" src="./icon/viewpastsession.png" /> View Session</h1></a>';
                    }
                    break;
            }

            html += '<img src="'+ person.picture_ur + ' " />'
            + '<h2>' + (person.name ? person.name : '&nbsp;') + '</h2>'
            + '<h3>' + (person.role ? person.role : '&nbsp;') + '</h3>'
            + '<h4>' + (person.institutio ? person.institutio : '&nbsp;') + '</h3>'
            + '<br />'
            + '<div>' + '<i class="glyphicon glyphicon-map-marker"></i>' + ' ' + person.city + ' , ' + person.state + '</div>'
            + '<div>' + '<i class="glyphicon glyphicon-earphone"></i>' + ' ' + person.phone + '</div>'
            + '<div>' + '<i class="glyphicon glyphicon-send"></i>' + ' ' + person.email + '</div>';

            // create the marker and give it its attributes for later reference
            L.marker([ person.latitude, person.longitude ], {
                icon: L.icon(icon),
                title: title,
                attributes: person
            }).bindPopup(html).addTo(PEOPLE_MARKERS_ALL);

            // add it to the listing in the appropriate category-info panel
            var $listing = $('div.categoryinfo[data-category="' + CSV_TRANSLATIONS.team[person.team] + '"] ul');
            var $li = $('<li></li>').attr('data-person-id',person.id);
            $('<img />').prop('src',icon.iconUrl).prop('title',person.status).appendTo($li);

            var $rhs = $('<div class=""details></div>').appendTo($li);
            $('<div class="name"></div>').text(person.name ? person.name : ' ').appendTo($rhs);
            $('<div class="role"></div>').text(person.role ? person.role : ' ').appendTo($rhs);
            $('<div class="organization"></div>').text(person.institutio ? person.institutio : ' ').appendTo($rhs);
            $('<div class="location"></div>').text(person.city + ', ' + person.state).appendTo($rhs);
            $li.appendTo($listing);
        });

        // call the update function to match the on-map people-markers to the checked categories
        updateMarkersOnMap();
    });
}

function updateMarkersOnMap() {
    // collect an assoc of the checked category checkboxes
    var showteams = {};
    $('div.categoryinfo input[type="checkbox"]:checked').each(function () {
        var cat = $(this).closest('div.categoryinfo').attr('data-category');
        showteams[cat] = true;
    });

    // clear the visible markers, reload with the relevant ones from the All Markers
    // a simple match of the person's team being on the list we generated above
    PEOPLE_MARKERS_VISIBLE.clearLayers();
    PEOPLE_MARKERS_ALL.eachLayer(function (marker) {
        var team = CSV_TRANSLATIONS.team[marker.options.attributes.team];
        if (showteams[team]) {
            marker.addTo(PEOPLE_MARKERS_VISIBLE);
        }
    });

    // clear and reload the interconnection lines, now that some markers are gone
    // go with a poor-performance brute-force solution, since we have 2 hours and a fixed set of 17 points:
    // loop over all markers; if they are an origin then loop over all markers for destinations
    OVERLAYS['connections'].clearLayers();
    var markerpairs = [];

    PEOPLE_MARKERS_VISIBLE.eachLayer(function (sourcemarker) {
        var person = sourcemarker.options.attributes;

        if (person.call1_numb && person.id == person.initiate_1) {
            PEOPLE_MARKERS_VISIBLE.eachLayer(function (targetmarker) {
                if (person.id == targetmarker.options.attributes.id) return;
                if (targetmarker.options.attributes.call1_numb == person.call1_numb || targetmarker.options.attributes.call2_numb == person.call1_numb || targetmarker.options.attributes.call3_numb == person.call1_numb) {
                    markerpairs.push([ sourcemarker, targetmarker ]);
                }
            });
        }

        /*
        if (person.call2_numb && person.id == person.initiate_2) {
            PEOPLE_MARKERS_VISIBLE.eachLayer(function (targetmarker) {
                if (person.id == targetmarker.options.attributes.id) return;
                if (targetmarker.options.attributes.call1_numb == person.call2_numb || targetmarker.options.attributes.call2_numb == person.call2_numb || targetmarker.options.attributes.call3_numb == person.call3_numb) {
                    markerpairs.push([ sourcemarker, targetmarker ]);
                }
            });
        }

        if (person.call3_numb && person.id == person.initiate_3) {
            PEOPLE_MARKERS_VISIBLE.eachLayer(function (targetmarker) {
                if (person.id == targetmarker.options.attributes.id) return;
                if (targetmarker.options.attributes.call1_numb == person.call3_numb || targetmarker.options.attributes.call2_numb == person.call2_numb || targetmarker.options.attributes.call3_numb == person.call3_numb) {
                    markerpairs.push([ sourcemarker, targetmarker ]);
                }
            });
        }
        */
    });

    markerpairs.forEach(function (markerpair) {
        L.geodesic([[ markerpair[0].getLatLng(), markerpair[1].getLatLng() ]], CONNECTIONS_STYLE).addTo(OVERLAYS['connections']);
    });
}

function clickMarkerByPersonId(id) {
    PEOPLE_MARKERS_VISIBLE.eachLayer(function (marker) {
        if (marker.options.attributes.id != id) return;

        // find the latlng of the marker's position minus 100px at the current zoom and center the map on that location
        var southpixelshift = 100;
        var point = MAP.latLngToLayerPoint( marker.getLatLng() );
        var latlng = MAP.layerPointToLatLng(L.point(point.x, point.y-southpixelshift));
        MAP.panTo(latlng);

        // now click the marker so as to open its infowindow
        marker.fire('click');
    });
}
