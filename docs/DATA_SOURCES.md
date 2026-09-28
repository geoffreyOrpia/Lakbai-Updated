# LakBai data-source policy

LakBai combines bundled tourism content with open geographic data. The goal is to keep
every claim proportional to the evidence available to the project.

## Tourism-source levels

LakBai records the source type and scope for reviewed destination information.
Preferred sources are:

1. official city, municipal, provincial, national-government, or tourism-office pages;
2. authoritative specialist records, when directly relevant;
3. OpenStreetMap for mapped geographic geometry and tags;
4. reputable secondary sources only when stronger primary material is unavailable.

A destination may combine multiple sources because identity, route geometry, visitor
rules, and operational details can come from different publishers.

## Online source review is not field verification

The current project does not claim that Internet-researched destinations have been
physically inspected by the LakBai team. Destination pages explicitly identify the
current review as online source review and show the review date.

The following should not be inferred merely because a destination is source-reviewed:

- current entrance fee;
- current opening hours;
- current ferry or public-transport timetable;
- current road or trail condition;
- current facility availability;
- current accessibility;
- temporary closures;
- current weather, tide, or hazard conditions.

Unknown or conflicting information remains unknown instead of being guessed.

## Freshness

Operational information becomes stale faster than stable geographic identity.
LakBai therefore treats changing facts conservatively and asks users to reconfirm them
when the app does not have current structured evidence.

Historical official pages can still be useful for attraction identity and project
history, but historical operating details are not presented as current facts.

## Conflicting sources

When public sources conflict, LakBai should record the conflict rather than select a
value without enough evidence. Panabo's historical official pages, for example,
describe different total mangrove-boardwalk lengths; LakBai therefore navigates only
the independently source-matched OpenStreetMap segment and does not claim a current
total facility length.

## OpenStreetMap

OpenStreetMap-derived roads, paths, points, and other geographic information remain
subject to the OpenStreetMap/ODbL attribution requirements:
https://www.openstreetmap.org/copyright

OSM existence does not by itself prove that a road is legally accessible, physically
passable for a specific vehicle, safe, or currently open. LakBai's router applies its
own conservative access logic, but real-world conditions still require judgment and
field confirmation.
