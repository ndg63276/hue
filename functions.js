var huelights = {};
var user_info = {};

function gethost() {
	var to_return = { "hueid": "", "huehost": ""};
	$.ajax({
		url: "https://discovery.meethue.com/",
		type: "GET",
		async: false,
		success: function (json) {
			console.log(json);
			if (json.length == 1 && "internalipaddress" in json[0]) {
				hueaddress = json[0]["internalipaddress"];
				hueid = json[0]["id"];
				document.getElementById("hueaddress").innerHTML = "Hub found at "+hueaddress;
				huehost = "https://"+hueaddress;
				to_return = { "hueid": hueid, "huehost": huehost};
			} else {
				document.getElementById("hueaddress").innerHTML = "Hub not found";
			}
		}
	})
	return to_return;
}

function request_user(tries) {
	console.log(tries);
	$.ajax({
		url: user_info["huehost"]+"/api",
		type: "POST",
		data: JSON.stringify({"devicetype":"my_hue_app#iphone peter"}),
		dataType: "json",
		async: false,
		success: function (json) {
			if ("success" in json[0]) {
				user_info["hueuser"] = json[0]["success"]["username"];
			}
			if ("error" in json[0] && json[0]["error"]["type"] == 101) {
				document.getElementById("hueuser").innerHTML = "Press the button on your Hue hub to authenticate...";
			}
		}
	})
	if (user_info["hueuser"] != "") {
		document.getElementById("hueuser").classList.add("hidden");
		address_text = document.getElementById("hueaddress").innerHTML;
		document.getElementById("hueaddress").innerHTML = address_text.replace("found", "authenticated");
		setCookie("hueuser", user_info["hueuser"], 365*24);
		getinfo();
	}
	maxTries = 10;
	if (tries >= maxTries) {
		document.getElementById("hueuser").innerHTML = "Hub not authenticated";
		document.getElementById("getuser").classList.remove("hidden");
	}
	if (user_info["hueuser"] == "" && tries < maxTries) {
		setTimeout(request_user, 3000, tries+1);
	}
}

function getuser() {
	document.getElementById("getuser").classList.add("hidden");
	if (user_info["huehost"] == "") {
		document.getElementById("hueaddress").innerHTML = "No Hue hub found";
		return;
	}
	user_info["hueuser"] = getCookie("hueuser");
	if (user_info["hueuser"] != "") {
		address_text = document.getElementById("hueaddress").innerHTML;
		document.getElementById("hueaddress").innerHTML = address_text.replace("found", "authenticated");
		document.getElementById("hueuser").classList.add("hidden");
		getinfo();
		return;
	}
	console.log("getting user");
	if (user_info["hueuser"] == "") {
		request_user(0);
	}
	return;
}

function getinfo() {
	console.log("getting info");
	$.ajax({
		url: user_info["huehost"]+"/api/"+user_info["hueuser"]+"/lights",
		type: "GET",
		async: false,
		success: function (json) {
			huelights = json;
			console.log(huelights);
			redraw_devices(huelights);
		}
	})
}

function redraw_devices(huelights) {
	var switches = document.getElementById("switches");
	switches.innerHTML = "";
	var tbl = document.createElement("table");
	var tbdy = document.createElement("tbody");
	for (light in huelights) {
		light_on = huelights[light]["state"]["on"];
		reachable = huelights[light]["state"]["reachable"];
		var tr = document.createElement("tr");
		var td = document.createElement("td");
		var light_name = huelights[light]["name"];
		var text = document.createTextNode(light_name);
		td.appendChild(text);
		tr.appendChild(td);
		var td1 = document.createElement("td");
		var but = document.createElement("button");
		but.innerHTML = "Off";
		but.onclick = function () { off(this) };
		but.id = "off_"+light;
		if ( (!reachable) || (!light_on) ) { but.classList.add("ui-disabled") };
		td1.appendChild(but);
		tr.appendChild(td1);
		var td2 = document.createElement("td");
		var but2 = document.createElement("button");
		but2.innerHTML = "On";
		but2.onclick = function () { on(this) };
		but2.id = "on_"+light;
		if ( (!reachable) || light_on ) { but2.classList.add("ui-disabled") };
		td2.appendChild(but2);
		tr.appendChild(td2);
		if ( "bri" in huelights[light]["state"] ) {
			var td3 = document.createElement("td");
			var inp = document.createElement("input");
			inp.type = "range";
			inp.min = 1;
			inp.max = 254;
			inp.value = huelights[light]["state"]["bri"];
			inp.onchange = function () { slider(this) };
			inp.id = "slider_"+light;
			if ( (!reachable) || (!light_on) ) { inp.classList.add("ui-disabled") };
			td3.appendChild(inp);
			tr.appendChild(td3);
		}
		if ( "hue" in huelights[light]["state"] ) {
			var td4 = document.createElement("td");
			var inp2 = document.createElement("input");
			h = 360 * huelights[light]["state"]["hue"] / 65535;
			s = huelights[light]["state"]["sat"] / 2.54;
			v = 100;
			inp2.value = "hsv("+h+", "+s+", "+v+")";
			inp2.id = "color_"+light;
			if ( (!reachable) || (!light_on) ) { inp2.classList.add("color_disabled") };
			td4.appendChild(inp2);
			tr.appendChild(td4);
		}
		tbdy.appendChild(tr);
	}
	tbl.appendChild(tbdy);
	switches.appendChild(tbl);
	setUpColors();
}

function on(element) {
	light = element.id.replace("on_", "");
	$.ajax({
		url: user_info["huehost"]+"/api/"+user_info["hueuser"]+"/lights/"+light+"/state",
		type: "PUT",
		data: JSON.stringify({"on": true}),
		dataType: "json",
		async: false,
		success: function (json) {
			console.log(json);
		}
	})
	getinfo();
}

function off(element) {
	light = element.id.replace("off_", "");
	$.ajax({
		url: user_info["huehost"]+"/api/"+user_info["hueuser"]+"/lights/"+light+"/state",
		type: "PUT",
		data: JSON.stringify({"on": false}),
		dataType: "json",
		async: false,
		success: function (json) {
			console.log(json);
		}
	})
	getinfo();
}

function slider(element) {
	light = element.id.replace("slider_", "");
	val = element.value;
	var data = {"bri": parseInt(val)}
	console.log(data);
	$.ajax({
		url: user_info["huehost"]+"/api/"+user_info["hueuser"]+"/lights/"+light+"/state",
		type: "PUT",
		data: JSON.stringify(data),
		dataType: "json",
		async: false,
		success: function (json) {
			console.log(json);
		}
	})
	getinfo();
}

function changeColor(element) {
	light = element.id.replace("color_", "");
	var t = $("#"+element.id).spectrum("get");
	hsv = t.toHsv();
	h = parseInt(65535 * hsv["h"] / 360);
	s = parseInt(254 * hsv["s"]);
	v = parseInt(254 * hsv["v"]);
	var data = {"hue": h, "sat": s};
	console.log(data);
	$.ajax({
		url: user_info["huehost"]+"/api/"+user_info["hueuser"]+"/lights/"+light+"/state",
		type: "PUT",
		data: JSON.stringify(data),
		dataType: "json",
		async: false,
		success: function (json) {
			console.log(json);
		}
	})
	getinfo();
}

function setUpColors() {
	$("[id^=color_]").spectrum({
		type: "color",
		hideAfterPaletteSelect: true,
		showInitial: true,
		showAlpha: false,
		allowEmpty: false,
		change: function() {
			changeColor(this)
		}
	});
	$(".color_disabled").spectrum("disable");
}
