window.addEventListener("scroll",()=>{

const nav=document.querySelector(".navbar");

if(window.scrollY>70){

nav.classList.add("scrolled");

}else{

nav.classList.remove("scrolled");

}

});

document.querySelectorAll(".chips span").forEach(chip=>{

chip.onclick=()=>{

document.querySelector(".search-box input").value=chip.innerText;

};

});

const counters=document.querySelectorAll(".counter");

const speed=200;

counters.forEach(counter=>{

const update=()=>{

const target=+counter.getAttribute("data-target");

const count=+counter.innerText;

const increment=target/speed;

if(count<target){

counter.innerText=Math.ceil(count+increment);

setTimeout(update,10);

}else{

counter.innerText=target.toLocaleString();

}

};

update();

});