PROJECT WORKSPACE

To preview locally, open Terminal in this folder and run:

  python3 -m http.server 8080

Open http://localhost:8080/ in a browser. The planners use JavaScript
modules and should be opened through HTTP.

For static hosting, publish this folder with index.html at the site root.
The Site Planning app loads its existing Three.js dependency from jsDelivr.

Tech Riders lists the included Snug video rider. To add another document,
put it in riders/ and add its title, project, URL and format to the riders
array in index.html. Choose team access for the hosted site before publishing
internal documents.

Planner changes use the apps' existing browser storage. Shared presets
require shared storage and have not been configured.
