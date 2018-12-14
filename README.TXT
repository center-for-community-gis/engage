Quick demo for Center for Community GIS
August 2016    To be archived after presentation.

There are two dates in the "Calendar", each correspnding to a CSV of people and their call history that day.
Each person has their own attribute data (name, city, etc) and also data "call numbers" indicating participation in a conference call.
The latter is used to draw interconnections between people who participated in calls, e.g. person #13 initiated call #7, so all
people on call #7 get a line drawn from person 13 to themselves with the Connections display.

The programming here is for a one-off demo, and not production quality.

*   The CSVs are false data, and also not internally consistent. The call data itself is mixed in with the user details,
    e.g. call start and end times, and the two CSVs have different fields. This was a placeholder until the real data source
    can be nailed down, e.g. some JSON feed from a call service?

*   The panels showing people in each category, are not sensitive to the number of entries and the size of the browser window.
    As such, on small screens it will definitely collide with the bottom and simply be cut off.

*   The interconnection calculation is not necesarily very fast, as it loops over all markers within each looping over all
    markers. (N * N cost) This should be done in a more efficient manner involving fewer passes over the dataset.

*   Call data should be separated out from user data. And this stuff should be JSON and not CSV anyway.

TO-DO items

* Display of hospitals as a static base layer, TBD since we don't have it in tile format and the GeoJSOn is too big to handle (5000 points)

