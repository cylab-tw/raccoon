# Plugins Configuration
The every plugin(middleware) must have a properties listed below:

property name | type | description
---------|----------|---------
 enable | boolean | enabled/disable the plugin
 before | boolean | Use middleware before/after the router
 routers | object[] | Array of routers that you want to add middleware
 routers.path | string | The path of the router that you want to add middleware
 routers.method | string | The API method of this router