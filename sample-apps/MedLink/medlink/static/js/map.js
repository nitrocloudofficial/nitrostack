const mapDiv = document.getElementById("map");

if (mapDiv) {

    const map = L.map("map").setView([13.0827, 80.2707], 11);

    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            attribution: "&copy; OpenStreetMap"
        }
    ).addTo(map);

    const bounds = [];

    if (navigator.geolocation) {

        navigator.geolocation.getCurrentPosition(function(position){

            const lat = position.coords.latitude;
            const lng = position.coords.longitude;

            L.marker([lat,lng])

                .addTo(map)

                .bindPopup("<b>Your Location</b>");

            bounds.push([lat,lng]);

        });

    }

    if(typeof pharmacyData !== "undefined"){

        pharmacyData.forEach(function(item){
                            const popup = `

                <b>${item.pharmacy}</b><br>

                ${item.address}<br>

                ${item.city}<br><br>

                <b>${item.medicine}</b><br>

                Price : ₹${item.price}<br>

                Stock : ${item.quantity}<br><br>

                <a
                target="_blank"
                href="https://www.google.com/maps/dir/?api=1&destination=${item.latitude},${item.longitude}">

                🧭 Get Directions

                </a>

                `;
                                

            L.marker([

                item.latitude,

                item.longitude

            ])

            .addTo(map)

            .bindPopup(popup);

            bounds.push([

                item.latitude,

                item.longitude

            ]);

        });

    }

    if(bounds.length>0){

        map.fitBounds(bounds,{

            padding:[50,50]

        });

    }

}