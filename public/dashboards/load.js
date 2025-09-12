const callback = (nextHost) => {
  console.log("NETDATA successfully loaded charts", nextHost)
  console.log("NETDATA object:", NETDATA);
  
  NETDATA.options.current.stop_updates_when_focus_is_lost = false;
  NETDATA.options.current.update_only_visible = false;
  NETDATA.themes.slate.easypiechart_track = "#363938";
  NETDATA.options.current.destroy_on_hide = false;

  // Set the server default to ensure API requests use the correct host
  const fullHost = `https://${nextHost}`;
  console.log("Setting fullHost to:", fullHost);
  
  NETDATA.serverDefault = fullHost;
  NETDATA.options.current.server_default = fullHost;
  NETDATA.options.current.base_url = fullHost;

  console.log("NETDATA.xss:", NETDATA.xss);
  console.log("NETDATA.xss.request:", NETDATA.xss ? NETDATA.xss.request : 'undefined');

  // Hook into XMLHttpRequest to intercept all HTTP requests
  const originalOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    console.log("XMLHttpRequest intercepted:", method, url);
    // If URL starts with /api/, prepend our target host
    if (typeof url === 'string' && url.startsWith('/api/')) {
      url = fullHost + url;
      console.log("Rewritten XMLHttpRequest URL:", url);
    }
    return originalOpen.call(this, method, url, ...args);
  };

  // Also hook fetch if used
  if (window.fetch) {
    const originalFetch = window.fetch;
    window.fetch = function(url, ...args) {
      console.log("Fetch intercepted:", url);
      if (typeof url === 'string' && url.startsWith('/api/')) {
        url = fullHost + url;
        console.log("Rewritten Fetch URL:", url);
      }
      return originalFetch.call(this, url, ...args);
    };
  }

  console.log("About to call onLoad with:", nextHost);
  onLoad(nextHost);
  console.log("onLoad completed");
  
  // Force netdata to start after a short delay
  setTimeout(() => {
    console.log("Attempting to start NETDATA");
    if (NETDATA && typeof NETDATA.start === 'function') {
      NETDATA.start();
      console.log("NETDATA.start() called");
    } else {
      console.log("NETDATA.start not available, trying other methods");
      console.log("Available NETDATA methods:", Object.keys(NETDATA).filter(k => typeof NETDATA[k] === 'function'));
    }
  }, 1000);
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
          callback(nextHost.replace('https://', ''));
        }
      };
    } else {
      nextScript.onload = function() {
        callback(nextHost.replace('https://', ''));
      };
    }
    
    document.body.appendChild( nextScript );
  };
  document.body.appendChild( script );
}

loadScript();