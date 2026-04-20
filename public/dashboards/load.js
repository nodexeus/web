const callback = (nextHost) => {
  console.log("NETDATA successfully loaded charts", nextHost)
  NETDATA.options.current.stop_updates_when_focus_is_lost = false;
  NETDATA.options.current.update_only_visible = false;
  NETDATA.themes.slate.easypiechart_track = "#363938";
  NETDATA.options.current.destroy_on_hide = false;

  // Set the server default to ensure API requests use the correct host
  const fullHost = `https://${nextHost}`;
  NETDATA.serverDefault = fullHost;
  NETDATA.options.current.server_default = fullHost;
  NETDATA.options.current.base_url = fullHost;
  
  // Override the chart URL construction
  NETDATA.options.current.chart_url = function(chart) {
    return `${fullHost}/api/v1/chart?chart=${chart}`;
  };

  onLoad(nextHost);
};

function loadScript() {
  // Get the name parameter from URL (which contains the host's displayName)
  const params = new Proxy(new URLSearchParams(window.location.search), {
    get: (searchParams, prop) => searchParams.get(prop),
  });
  
  const { name, id } = params;
  const host = name; // Use the name parameter as host
  const netdataUrl = `https://${host}`;
  var url = `${netdataUrl}/dashboard.js`;
  var script = document.createElement( "script" )
  script.type = "text/javascript";

  if(script.readyState) { 
    script.onreadystatechange = function() {
      if ( script.readyState === "loaded" || script.readyState === "complete" ) {
        script.onreadystatechange = null;
        callback(host);
      }
    };
  } else {
    script.onload = function() {
      callback(host);
    };
  }

  script.src = url;
  script.onerror = () => {  
    console.error("NETDATA failed to load from name")

    var nextScript = document.createElement( "script" )
    nextScript.type = "text/javascript";

    const nextHost = netdataUrl

    nextScript.src = `${nextHost}/dashboard.js`;
    nextScript.onerror = () => console.error("NETDATA failed to load from id");

    if(nextScript.readyState) { 
      nextScript.onreadystatechange = function() {
        if ( nextScript.readyState === "loaded" || nextScript.readyState === "complete" ) {
          nextScript.onreadystatechange = null;
          callback(nextHost);
        }
      };
    } else {
      nextScript.onload = function() {
        callback(nextHost);
      };
    }
    
    document.body.appendChild( nextScript );
  };
  document.body.appendChild( script );
}

loadScript();