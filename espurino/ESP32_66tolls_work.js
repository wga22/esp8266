const HTTP = require("http");
const WIFI = require("Wifi");
const SURLAPI = 'https://shoulditakei66.today/';
function onInit()
{
	console.log("main");
	loadTolls();
}

function loadTolls()
{
	//getting weather now, so allow another process to get weather
	HTTP.get((SURLAPI), function(res) 
	{
		res.on('data', function(wunderString) {   loadTolls.val += wunderString;   });
		res.on('close', function(fLoaded) 
		{
			var bw2WashDiv = loadTolls.val.indexOf('59');
			console.log("Connection to tolls closed len:" + loadTolls.val.length + " toll loc:" + bw2WashDiv);
			console.log(loadTolls.val);
			if(bw2WashDiv > 20)
			{
				var sDivStr = loadTolls.val.slice(bw2WashDiv, bw2WashDiv+30);	//<h1 data-reactid="59">$0.00</h1>
				var nStart = sDivStr.indexOf(">");
				var nStop = sDivStr.indexOf("<");
				if(nStart > 0 && nStop>nStart)
				{
					loadTolls.output = sDivStr.slice(nStart+1, nStop);
				}
				else
				{
					console.log("issue getting output string " + nStart + " " + nStop);
					loadTolls.output = "issue getting output string " + nStart + " " + nStop;	
				}
			}
			else
			{
				loadTolls.output = "ERR42 \n toll not found ("+loadTolls.val.length+")";
			}
			loadTolls.val = "";
		});
		res.on('error', function(e){console.log("error getting wunderground details");});	//TODO: test, and handle by saving values?
	});
}
loadTolls.val = "";
loadTolls.obj = null;
loadTolls.output = "initialize";


/*
const SURLAPI = 'https://i66toll.firebaseio.com/eb/belt/washington/tolls.json?orderBy=%22$key%22&limitToLast=1';
const HTTP = require("http");
//ESP32.enableBLE(false);

function onInit()
{
	//console.log("main");
	//loadTolls();
}

var options = {
    host: 'i66toll.firebaseio.com', // host name
    port: 443,            // (optional) port, defaults to 80
    path: '/eb/belt/washington/tolls.json',           // path sent to server
    method: 'GET',       // HTTP command sent to server (must be uppercase 'GET', 'POST', etc)
    protocol: 'https:',   // optional protocol - https: or http:
    headers: { orderBy : "%22$key%22", limitToLast : 1 } // (optional) HTTP headers
  };

function loadTolls()
{
	//getting weather now, so allow another process to get weather
  
	HTTP.get(options, function(res) 
	{
		res.on('data', function(wunderString)
        {
          loadTolls.val = wunderString;
          console.log(wunderString);
          memUsage();
        });
		res.on('close', function(fLoaded)
		{
          memUsage();
		});
		res.on('error', function(e){console.log("error getting URL details");});	//TODO: test, and handle by saving values?
	});
}

function memUsage()
{
  console.log(process.memory().usage);
}
memUsage();
*/
