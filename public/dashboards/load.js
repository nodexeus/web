// Use the params already declared in node.js
const { name } = params;
const targetHost = `https://${name}`;

console.log("Early setup - Target host:", targetHost);

// Set up XMLHttpRequest interception BEFORE netdata loads
const originalOpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function(method, url, ...args) {
  console.log("XMLHttpRequest intercepted:", method, url);
  // If URL starts with /api/, prepend our target host
  if (typeof url === 'string' && url.startsWith('/api/')) {
    const newUrl = targetHost + url;
    console.log("Rewritten XMLHttpRequest URL from", url, "to", newUrl);
    return originalOpen.call(this, method, newUrl, ...args);
  }
  return originalOpen.call(this, method, url, ...args);
};

// Also hook fetch if used
if (window.fetch) {
  const originalFetch = window.fetch;
  window.fetch = function(url, ...args) {
    console.log("Fetch intercepted:", url);
    if (typeof url === 'string' && url.startsWith('/api/')) {
      const newUrl = targetHost + url;
      console.log("Rewritten Fetch URL from", url, "to", newUrl);
      return originalFetch.call(this, newUrl, ...args);
    }
    return originalFetch.call(this, url, ...args);
  };
}

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

  console.log("About to call onLoad with:", nextHost);
  onLoad(nextHost);
  console.log("onLoad completed");
};

function loadScript() {
  // Use the name parameter from the already parsed params
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