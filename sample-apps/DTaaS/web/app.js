document
.getElementById("create")
.onclick = async () => {

    const prompt =
        document
        .getElementById("prompt")
        .value;

    const res =
        await fetch("/create-twin", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                prompt
            })

        });
    const data =
        await res.json();

    document
        .getElementById("output")
        .textContent =
        JSON.stringify(data, null, 2);

};