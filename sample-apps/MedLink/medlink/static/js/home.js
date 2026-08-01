const counters = document.querySelectorAll(".counter");

counters.forEach(counter => {

    const target = Number(counter.dataset.target);

    let count = 0;

    const speed = target / 80;

    function updateCounter(){

        if(count < target){

            count += speed;

            counter.innerText = Math.ceil(count).toLocaleString();

            requestAnimationFrame(updateCounter);

        }

        else{

            counter.innerText = target.toLocaleString();

        }

    }

    updateCounter();

});