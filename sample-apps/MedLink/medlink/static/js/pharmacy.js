const pharmacyMap=document.getElementById("pharmacyMap");

if(pharmacyMap){

const map=L.map("pharmacyMap").setView([13.0827,80.2707],14);

L.tileLayer(

'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',

{

maxZoom:19

}

).addTo(map);

const marker=L.marker([13.0827,80.2707]).addTo(map);

marker.bindPopup(

"<b>Apollo Pharmacy</b><br>Open Now"

);

}